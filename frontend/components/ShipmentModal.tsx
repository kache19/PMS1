import React, { useState, useEffect } from 'react';
import { X, Truck, Package, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../services/api';
import type { Branch } from '../types';

interface ShipmentItem {
  productId: string;
  productName: string;
  requestedQty: number;
  currentStock: number;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  headOfficeStock?: number;
}

interface StockRequisition {
  id: string;
  branchId: string;
  requestDate: string;
  requestedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  priority: 'NORMAL' | 'URGENT';
  items: {
    productName: string;
    productId: string;
    requestedQty: number;
    currentStock: number;
  }[];
}

interface ShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: StockRequisition | null;
  branches: Branch[];
  onSuccess: () => void;
}

interface StockValidationError {
  productId: string;
  message: string;
  severity: 'error' | 'warning';
}

const ShipmentModal: React.FC<ShipmentModalProps> = ({
  isOpen,
  onClose,
  requisition,
  branches,
  onSuccess
}) => {
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [headOfficeStock, setHeadOfficeStock] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stockValidationErrors, setStockValidationErrors] = useState<StockValidationError[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isVerifyingStock, setIsVerifyingStock] = useState(false);

  useEffect(() => {
    if (isOpen && requisition) {
      setSelectedBranch(requisition.branchId);
      // Initialize items with requested quantities
      const requestDate = new Date(requisition.requestDate);
      const expiryDate = new Date(requestDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const initialItems = requisition.items.map(item => ({
        ...item,
        quantity: item.requestedQty,
        batchNumber: `BATCH-${Date.now()}-${item.productId.slice(-4)}`,
        expiryDate: expiryDate,
        headOfficeStock: 0
      }));
      setItems(initialItems);
      setStockValidationErrors([]);
      setErrors({});

      // Fetch head office stock and verify availability
      fetchHeadOfficeStock();
    }
  }, [isOpen, requisition]);

  const fetchHeadOfficeStock = async () => {
    setIsVerifyingStock(true);
    try {
      const branchesData = await api.getBranches();
      const headOffice = branchesData.find(b => b.isHeadOffice);
      
      if (headOffice) {
        const inventory = await api.getBranchInventory(headOffice.id);
        const stockMap: Record<string, number> = {};
        inventory.forEach(item => {
          stockMap[item.productId] = item.quantity;
        });
        setHeadOfficeStock(stockMap);

        // Validate stock availability for all items
        validateStockAvailability(stockMap);
      }
    } catch (error) {
      console.error('Failed to fetch head office stock:', error);
      setStockValidationErrors([
        {
          productId: 'general',
          message: 'Failed to fetch head office stock. Please verify availability manually.',
          severity: 'warning'
        }
      ]);
    } finally {
      setIsVerifyingStock(false);
    }
  };

  const validateStockAvailability = (stockMap: Record<string, number>) => {
    const validationErrors: StockValidationError[] = [];

    if (requisition) {
      for (const item of requisition.items) {
        const availableStock = stockMap[item.productId] || 0;
        const requested = item.requestedQty;

        if (availableStock < requested) {
          validationErrors.push({
            productId: item.productId,
            message: `Insufficient stock: ${availableStock} available, ${requested} requested`,
            severity: 'error'
          });
        } else if (availableStock < requested * 1.2) {
          // Warning if stock is available but tight (less than 20% buffer)
          validationErrors.push({
            productId: item.productId,
            message: `Low stock buffer: ${availableStock} available for ${requested} requested`,
            severity: 'warning'
          });
        }
      }
    }

    setStockValidationErrors(validationErrors);
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    setItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity: Math.max(0, newQuantity) }
        : item
    ));
    // Clear error for this item
    setErrors(prev => ({ ...prev, [productId]: '' }));
  };

  const handleBatchChange = (productId: string, batchNumber: string) => {
    setItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, batchNumber }
        : item
    ));
    // Clear error for this item
    setErrors(prev => ({ ...prev, [productId]: '' }));
  };


  const handleInitiateShipment = () => {
    setShowConfirm(true);
  };

  const handleConfirmShipment = async () => {
    if (!requisition) return;

    setIsLoading(true);
    setShowConfirm(false);
    try {
      const newErrors: Record<string, string> = {};
      let hasErrors = false;

      // Validate quantities
      for (const item of items) {
        if (item.quantity <= 0) {
          newErrors[item.productId] = 'Quantity must be greater than 0';
          hasErrors = true;
        }
        if (!item.batchNumber || item.batchNumber.trim() === '') {
          newErrors[item.productId] = 'Batch number is required';
          hasErrors = true;
        }
        // Check stock availability
        const availableStock = headOfficeStock[item.productId] || 0;
        if (item.quantity > availableStock) {
          newErrors[item.productId] = `Not enough stock (available: ${availableStock})`;
          hasErrors = true;
        }
      }

      setErrors(newErrors);

      if (hasErrors) {
        setIsLoading(false);
        return;
      }

      // First, approve the requisition
      await api.updateRequisitionStatus(requisition.id, 'APPROVED');

      // Prepare items for API with stock information
      const shipmentItems = items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate || '',
        requestedQty: item.requestedQty,
        availableStock: headOfficeStock[item.productId] || 0
      }));

      // Then, initiate the shipment
      const response = await api.initiateShipment(requisition.id, shipmentItems, notes, selectedBranch);

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to initiate shipment:', error);
      
      // Extract error message - handle various error formats
      let errorMsg = 'Failed to initiate shipment. Please try again.';
      
      if (error?.message) {
        // Extract the meaningful error message from the thrown error
        // The fetchJSON function now includes API error details in the Error message
        const msgMatch = error.message.match(/failed: (.*?)$/i);
        errorMsg = msgMatch ? msgMatch[1] : error.message;
      } else if (error?.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      
      alert(`Failed to initiate transfer: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const branchName = branches.find(b => b.id === selectedBranch)?.name || 'Unknown';

  if (!isOpen || !requisition) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl w-full m-2 md:mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Truck size={24} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Initiate Shipment</h2>
              <p className="text-sm text-slate-500">Customize quantities for {branchName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close shipment modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Stock Verification Status */}
            <div className={`rounded-xl p-4 ${
              isVerifyingStock 
                ? 'bg-blue-50 border border-blue-200' 
                : stockValidationErrors.some(e => e.severity === 'error')
                ? 'bg-red-50 border border-red-200'
                : stockValidationErrors.some(e => e.severity === 'warning')
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                {isVerifyingStock && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5"></div>
                )}
                {!isVerifyingStock && stockValidationErrors.some(e => e.severity === 'error') && (
                  <XCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                )}
                {!isVerifyingStock && !stockValidationErrors.some(e => e.severity === 'error') && stockValidationErrors.some(e => e.severity === 'warning') && (
                  <AlertCircle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                )}
                {!isVerifyingStock && !stockValidationErrors.length && (
                  <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-slate-800 mb-2">
                    {isVerifyingStock ? 'Verifying Stock Availability...' : 'Stock Verification Status'}
                  </p>
                  {!isVerifyingStock && stockValidationErrors.length === 0 && (
                    <p className="text-sm text-green-700">All items have sufficient stock available</p>
                  )}
                  {!isVerifyingStock && stockValidationErrors.length > 0 && (
                    <div className="space-y-1">
                      {stockValidationErrors.map((err, idx) => (
                        <p key={idx} className={`text-sm ${err.severity === 'error' ? 'text-red-700' : 'text-yellow-700'}`}>
                          • {err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="mb-4">
                <label htmlFor="target-branch" className="block text-sm font-bold text-slate-700 mb-2">
                  Target Branch
                </label>
                <select
                  id="target-branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none"
                >
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Package size={18} />
                Shipment Items & Stock Confirmation
              </h3>
              <div className="space-y-3">
                {items.map((item) => {
                  const availableStock = headOfficeStock[item.productId] || 0;
                  const hasError = !errors[item.productId] && item.quantity > availableStock ? true : false;
                  const isOverRequested = item.quantity < item.requestedQty;

                  return (
                    <div key={item.productId} className={`bg-white p-4 rounded-lg border-2 ${
                      hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            {item.productName}
                            {item.quantity > availableStock && (
                              <XCircle size={16} className="text-red-600" />
                            )}
                            {item.quantity <= availableStock && (
                              <CheckCircle size={16} className="text-green-600" />
                            )}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            <span className="font-semibold">Main Branch Available:</span> {availableStock} units
                          </p>
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold">Requested:</span> {item.requestedQty} units
                          </p>
                        </div>
                        <div className="text-right space-y-2">
                          <div>
                            <label htmlFor={`quantity-${item.productId}`} className="block text-xs text-slate-600 mb-1">Shipment Quantity</label>
                            <input
                              id={`quantity-${item.productId}`}
                              type="number"
                              min="0"
                              max={availableStock}
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                              className={`w-24 px-3 py-2 border-2 rounded-lg text-center font-bold focus:outline-none ${
                                item.quantity > availableStock 
                                  ? 'border-red-400 focus:border-red-500 bg-red-50' 
                                  : 'border-slate-300 focus:border-teal-500'
                              }`}
                            />
                            {item.quantity > availableStock && (
                              <p className="text-xs text-red-600 mt-1">Exceeds available stock</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={`batch-${item.productId}`} className="block text-xs text-slate-600 mb-1">Batch Number</label>
                            <input
                              id={`batch-${item.productId}`}
                              type="text"
                              placeholder="Enter batch number"
                              value={item.batchNumber || ''}
                              onChange={(e) => handleBatchChange(item.productId, e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:border-teal-500 focus:outline-none"
                              required
                            />
                          </div>
                          {errors[item.productId] && (
                            <div className="text-xs text-rose-600 bg-rose-50 p-1 rounded" role="alert">
                              {errors[item.productId]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Shipment Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this shipment..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="bg-teal-50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-teal-700">Total Items</p>
                  <p className="text-2xl font-bold text-teal-800">{items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-teal-700">Destination</p>
                  <p className="font-bold text-teal-800">{branches.find(b => b.id === selectedBranch)?.name || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            disabled={isLoading || isVerifyingStock}
          >
            Cancel
          </button>
          <button
            onClick={handleInitiateShipment}
            disabled={isLoading || isVerifyingStock || Object.keys(errors).length > 0 || stockValidationErrors.some(e => e.severity === 'error')}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            title={stockValidationErrors.some(e => e.severity === 'error') ? 'Cannot proceed with stock errors' : ''}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Initiating...
              </>
            ) : isVerifyingStock ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              <>
                <Truck size={16} />
                Initiate Shipment
              </>
            )}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Confirm Shipment</h3>
            <div className="space-y-3 mb-6">
              <p className="text-slate-600">
                Are you sure you want to initiate this shipment to <span className="font-bold">{branches.find(b => b.id === selectedBranch)?.name || 'Unknown'}</span>?
              </p>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-slate-600"><span className="font-semibold">Total Items:</span> {items.reduce((sum, item) => sum + item.quantity, 0)} units</p>
                <p className="text-sm text-slate-600"><span className="font-semibold">Items:</span> {items.length}</p>
                {items.some(item => item.quantity < item.requestedQty) && (
                  <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                    ⚠️ Some items have reduced quantities from the original request
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShipment}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                disabled={isLoading}
              >
                {isLoading ? 'Initiating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentModal;