import React, { useEffect, useState } from "react";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  DollarSign,
  Package,
  Calendar,
  AlertOctagon,
  ArrowRight,
  Filter,
  Unlock,
  Trash2,
  Loader,
  Truck
} from 'lucide-react';
import { api } from "../services/api";
import { useNotifications } from "./NotificationContext";
import ShipmentModal from "./ShipmentModal";
import type { Branch, Expense, StockTransfer, Product, DisposalRequest } from "../types";
import { getBranchDisplayName as formatBranchName } from '../utils/branchDisplay';
import { runWithPreservedWindowScroll } from '../utils/scrollStability';

// Type Definitions
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

interface StockReleaseRequest {
  id: string;
  branchId: string;
  date: string;
  requestedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  items: {
    productName: string;
    productId: string;
    batchNumber: string;
    quantity: number;
  }[];
}

interface ApprovalsProps {
  releaseRequests?: StockReleaseRequest[];
  onApproveRelease?: (req: StockReleaseRequest) => void;
  requisitions?: StockRequisition[];
  onActionRequisition?: (id: string, action: 'APPROVED' | 'REJECTED') => void;
  disposalRequests?: DisposalRequest[];
  onApproveDisposal?: (req: DisposalRequest) => void;
  expenses?: Expense[];
  onActionExpense?: (id: string | number, action: 'Approved' | 'Rejected') => void;
  onApproveTransfer?: (transferId: string) => void;
}

const Approvals: React.FC<ApprovalsProps> = ({
  releaseRequests: propReleaseRequests = [],
  onApproveRelease,
  requisitions: propRequisitions = [],
  onActionRequisition,
  disposalRequests: propDisposalRequests = [],
  onApproveDisposal,
  expenses: propExpenses = [],
  onActionExpense,
  onApproveTransfer,
}) => {
  const { showSuccess, showError } = useNotifications();
  const [activeTab, setActiveTab] = useState<'expenses' | 'stock' | 'transfers' | 'release' | 'disposal'>('expenses');
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // State for data fetched from API
  const [requisitions, setRequisitions] = useState<StockRequisition[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [releaseRequests, setReleaseRequests] = useState<StockReleaseRequest[]>([]);
  const [disposalRequests, setDisposalRequests] = useState<DisposalRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Preview modal state (same as Inventory preview)
  const [showViewCodesModal, setShowViewCodesModal] = useState(false);
  const [selectedTransferForCodes, setSelectedTransferForCodes] = useState<any | null>(null);

  // Modal state
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<StockRequisition | null>(null);

  const loadApprovalData = async () => {
    setIsLoading(true);
    try {
      const [branchesData, productsData, requisitionsData, /* shipmentsData removed */ transfersData, releaseData, disposalData, expensesData, userData] = await Promise.all([
        api.getBranches(),
        api.getProducts(),
        api.getRequisitions(),
        api.getTransfers(),
        api.getReleaseRequests(),
        api.getDisposalRequests(),
        api.getExpenses(),
        Promise.resolve(api.getCurrentUser())
      ]);

      setBranches(branchesData || []);
      setProducts(productsData || []);
      setRequisitions(requisitionsData || []);
      setTransfers(transfersData || []);
      setReleaseRequests(releaseData || []);
      setDisposalRequests(disposalData || []);
      setExpenses((expensesData || []).filter((e: any) => e.status === 'Pending'));
      setCurrentUser(userData);
    } catch (error) {
      console.error('Failed to load approval data:', error);
      showError('Load Error', 'Failed to load approval data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data from API on mount and poll for updates
  useEffect(() => {
    let mounted = true;

    loadApprovalData();

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      if (mounted) {
        void runWithPreservedWindowScroll(() => loadApprovalData());
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const pendingExpenses = expenses.filter((e: any) => e.status === 'Pending');
  const pendingRequisitions = requisitions.filter(r => r.status === 'PENDING');
  const pendingRelease = releaseRequests.filter(r => r.status === 'PENDING');
  const pendingDisposal = disposalRequests.filter(r => r.status === 'PENDING');

  // Determine transfers in the same manner as Inventory tab (incoming/outgoing)
  const userBranchId = currentUser?.branchId || (currentUser?.isHeadOffice ? 'HEAD_OFFICE' : null);
  const incomingTransfers = transfers.filter((t: any) => t.targetBranchId === userBranchId);
  const outgoingTransfers = transfers.filter((t: any) => t.sourceBranchId === userBranchId);

  const fmtDate = (v?: string | null) => {
    if (!v) return '—';
    try { return new Date(v).toLocaleDateString(); } catch { return v; }
  };

  const getBranchDisplayName = (branchId?: string) =>
    formatBranchName(branches, branchId, 'Unknown');


  // Approval action handlers
  const handleExpenseApproval = async (
    id: string | number,
    action: 'Approved' | 'Rejected'
  ) => {
    try {
      // Try to update via API if method exists
      if (api.updateExpense) {
        const expenseToUpdate = expenses.find(e => e.id === id);
        if (expenseToUpdate) {
          await api.updateExpense(String(id), {
            ...expenseToUpdate,
            status: action
          });
        }
      }

      setExpenses(prev => prev.filter(e => e.id !== id));
      showSuccess(
        'Expense Updated',
        `Expense has been ${action.toLowerCase()} successfully.`
      );

      if (onActionExpense) {
        onActionExpense(id, action);
      }
    } catch (error) {
      console.error('Failed to update expense:', error);
      showError(
        'Update Failed',
        'There was an error updating the expense. Please try again.'
      );
    }
  };

  const handleRequisitionAction = async (
    id: string,
    action: 'APPROVED' | 'REJECTED'
  ) => {
    if (action === 'REJECTED') {
      try {
        // Call API to update requisition status
        await api.updateRequisitionStatus(id, action, currentUser?.id);

        // Update local state
        setRequisitions(prev => prev.filter(r => r.id !== id));

        showSuccess(
          'Requisition Updated',
          'Requisition has been rejected successfully.'
        );

        if (onActionRequisition) {
          onActionRequisition(id, action);
        }
      } catch (error) {
        console.error('Failed to update requisition:', error);
        showError(
          'Update Failed',
          'There was an error updating the requisition. Please try again.'
        );
      }
    } else if (action === 'APPROVED') {
      // For approval, directly open shipment modal without changing status first
      try {
        // Find the requisition and open shipment modal
        const req = requisitions.find(r => r.id === id);
        if (req) {
          setSelectedRequisition(req);
          setShipmentModalOpen(true);
        }

        showSuccess(
          'Initiating Shipment',
          'Customizing shipment quantities for this requisition.'
        );
      } catch (error) {
        console.error('Failed to initiate shipment:', error);
        showError(
          'Failed to Initiate Shipment',
          'There was an error initiating the shipment. Please try again.'
        );
      }
    }
  };

  const handleShipmentSuccess = () => {
    // Close modal and refresh data
    setShipmentModalOpen(false);
    setSelectedRequisition(null);

    // Refresh requisitions
    loadApprovalData();

    showSuccess(
      'Shipment Initiated',
      'Shipment has been initiated successfully.'
    );
  };

  const handleReleaseApproval = async (req: StockReleaseRequest) => {
    try {
      // TODO: Add API endpoint for release requests
      // if (api.approveReleaseRequest) {
      //   await api.approveReleaseRequest(req.id);
      // }

      setReleaseRequests(prev => prev.filter(r => r.id !== req.id));
      showSuccess(
        'Release Request Approved',
        `Request ${req.id} approved. Stock is now visible in POS.`
      );

      if (onApproveRelease) {
        onApproveRelease(req);
      }
    } catch (error) {
      console.error('Failed to approve release request:', error);
      showError(
        'Approval Failed',
        'There was an error approving the release request. Please try again.'
      );
    }
  };

  // Shipments approval removed from Approvals hub UI

  const handleTransferApproval = async (transferId: string) => {
    try {
      await api.approveTransfer(transferId);

      // Update local state based on user role
      const newStatus = currentUser?.role === 'STOREKEEPER' ? 'RECEIVED_KEEPER' : 'COMPLETED';
      setTransfers(prev => newStatus === 'COMPLETED'
        ? prev.filter(t => t.id !== transferId)
        : prev.map(t => t.id === transferId ? {...t, status: newStatus} : t)
      );

      showSuccess(
        'Transfer Approved',
        'Transfer has been approved and stock moved successfully.'
      );
      // Notify parent to refresh inventory
      if (onApproveTransfer) onApproveTransfer(transferId);
    } catch (error) {
      console.error('Failed to approve transfer:', error);
      showError(
        'Approval Failed',
        'There was an error approving the transfer. Please try again.'
      );
    }
  };

  const handleDisposalApproval = async (req: DisposalRequest) => {
    try {
      // TODO: Add API endpoint for disposal requests
      // if (api.approveDisposalRequest) {
      //   await api.approveDisposalRequest(req.id);
      // }

      setDisposalRequests(prev => prev.filter(r => r.id !== req.id));
      showSuccess(
        'Disposal Request Approved',
        `Request ${req.id} has been approved and stock permanently removed.`
      );

      if (onApproveDisposal) {
        onApproveDisposal(req);
      }
    } catch (error) {
      console.error('Failed to approve disposal request:', error);
      showError(
        'Approval Failed',
        'There was an error approving the disposal request. Please try again.'
      );
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Approvals Hub</h2>
          <p className="text-slate-500 mt-1">
            Centralized authorization for branch operations.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'expenses'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
          >
            <DollarSign size={16} /> Expense
            {pendingExpenses.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingExpenses.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'stock'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
          >
            <Package size={16} /> Requisitions
            {pendingRequisitions.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingRequisitions.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('release')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'release'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
          >
            <Unlock size={16} /> Release
            {pendingRelease.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingRelease.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'transfers'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
          >
            <Truck size={16} /> Transfers
            {(incomingTransfers.length + outgoingTransfers.length) > 0 && (
              <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {incomingTransfers.length + outgoingTransfers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('disposal')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'disposal'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
          >
            <Trash2 size={16} /> Disposals
            {pendingDisposal.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingDisposal.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Loader className="animate-spin text-teal-600 mr-3" size={32} />
            <span className="text-slate-600">Loading approval data...</span>
          </div>
        ) : activeTab === 'expenses' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <DollarSign size={18} className="text-teal-600" /> Pending
                Expenses
              </h3>
              <button
                className="text-xs font-medium text-slate-500 flex items-center gap-1 hover:text-slate-700"
                type="button"
              >
                <Filter size={12} /> Filter
              </button>
            </div>
            {pendingExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-20 text-teal-600" />
                <p>All expenses have been reviewed. Good job!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Request Date</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingExpenses.map((expense: any) => (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} /> {expense.date}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {getBranchDisplayName(expense.branchId)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                          {expense.description}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                          {typeof expense.amount === 'number'
                            ? expense.amount.toLocaleString()
                            : expense.amount}{' '}
                          TZS
                        </td>
                        <td className="px-6 py-4 flex justify-center gap-2">
                          <button
                            onClick={() =>
                              handleExpenseApproval(expense.id, 'Approved')
                            }
                            className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                            title="Approve"
                            type="button"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() =>
                              handleExpenseApproval(expense.id, 'Rejected')
                            }
                            className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                            title="Reject"
                            type="button"
                          >
                            <XCircle size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'stock' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package size={18} className="text-teal-600" /> Pending Stock
                Requisitions
              </h3>
              <p className="text-xs text-slate-500">Main Branch Stock Confirmation</p>
            </div>
            {pendingRequisitions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-20 text-teal-600" />
                <p>No pending stock requests from branches.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingRequisitions.map(req => (
                  <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-full ${
                            req.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          <AlertOctagon size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            {getBranchDisplayName(req.branchId)}
                            {req.priority === 'URGENT' && (
                              <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded animate-pulse">
                                URGENT
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                            <Calendar size={14} /> {req.requestDate}
                            <span className="text-slate-300">|</span>
                            Requested by{' '}
                            <span className="font-medium text-slate-700">
                              {req.requestedBy}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleRequisitionAction(req.id, 'REJECTED')
                          }
                          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-medium text-sm transition-colors"
                          type="button"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() =>
                            handleRequisitionAction(req.id, 'APPROVED')
                          }
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold text-sm shadow-md flex items-center gap-2 transition-colors"
                          type="button"
                        >
                          Initiate Shipment <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                      <div>
                        <h5 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
                          <Package size={14} /> Main Branch Stock Status
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {req.items.map((item, i) => {
                            // Check if item has enough stock in main branch
                            const hasEnoughStock = item.currentStock >= item.requestedQty;
                            const stockPercentage = item.currentStock > 0 ? Math.min(100, (item.currentStock / (item.requestedQty || 1)) * 100) : 0;

                            return (
                              <div
                                key={i}
                                className={`bg-white p-4 rounded-lg border-2 transition-colors ${
                                  hasEnoughStock
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-red-200 bg-red-50'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <div className="font-bold text-slate-800">
                                      {item.productName}
                                    </div>
                                    <div className={`text-xs font-semibold mt-1 ${
                                      hasEnoughStock ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {hasEnoughStock ? '✓ Stock Available' : '✗ Insufficient Stock'}
                                    </div>
                                  </div>
                                  {hasEnoughStock ? (
                                    <CheckCircle size={20} className="text-green-600" />
                                  ) : (
                                    <XCircle size={20} className="text-red-600" />
                                  )}
                                </div>
                                <div className="mt-3 space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Main Branch:</span>
                                    <span className="font-bold text-slate-800">{item.currentStock} units</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Requested:</span>
                                    <span className="font-bold text-slate-800">{item.requestedQty} units</span>
                                  </div>
                                  {!hasEnoughStock && (
                                    <div className="flex justify-between text-xs pt-1 border-t border-red-200 mt-1">
                                      <span className="text-red-600">Shortage:</span>
                                      <span className="font-bold text-red-700">{item.requestedQty - item.currentStock} units</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      hasEnoughStock ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${stockPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-200">
                        <h5 className="text-xs font-bold text-slate-600 uppercase mb-3">
                          Requested Summary
                        </h5>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Total Items:</span>
                          <span className="font-bold text-slate-800">{req.items.length}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-slate-600">Total Quantity:</span>
                          <span className="font-bold text-slate-800">{req.items.reduce((sum, item) => sum + item.requestedQty, 0)} units</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'transfers' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck size={18} className="text-blue-600" /> Pending Stock
                Transfers
              </h3>
              <p className="text-xs text-slate-500">
                {currentUser?.isHeadOffice ? 'View Transfers' : 'View Inter-Branch Stock Transfers'}
              </p>
            </div>
            {/* Render incoming/outgoing similar to Inventory but read-only previews */}
            <div className="divide-y divide-slate-100">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800">Incoming Transfers</h4>
              </div>
              {incomingTransfers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No incoming transfers.</div>
              ) : (
                incomingTransfers.map((transfer: any) => (
                  <div key={transfer.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{transfer.id}</h4>
                        <p className="text-sm text-slate-500 mt-1">
                          From: {getBranchDisplayName(transfer.sourceBranchId)} →
                          To: {getBranchDisplayName(transfer.targetBranchId)}
                        </p>
                        <p className="text-sm text-slate-500">Date: {new Date(transfer.dateSent).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${transfer.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {transfer.status}
                        </span>
                        <button
                          onClick={() => { setSelectedTransferForCodes(transfer); setShowViewCodesModal(true); }}
                          className="px-3 py-1 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-blue-900 border-b border-blue-200">
                            <th className="pb-2 font-bold">Product Name</th>
                            <th className="pb-2 font-bold">Batch Number</th>
                            <th className="pb-2 text-right font-bold">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transfer.items.map((item: any, i: number) => (
                            <tr key={i}>
                              <td className="py-2 text-blue-900 font-medium">{item.productName}</td>
                              <td className="py-2 text-blue-800 font-mono">{item.batchNumber}</td>
                              <td className="py-2 text-right font-bold text-blue-900">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}

              {/* Outgoing */}
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800">Outgoing Transfers</h4>
              </div>
              {outgoingTransfers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No outgoing transfers.</div>
              ) : (
                outgoingTransfers.map((transfer: any) => (
                  <div key={transfer.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{transfer.id}</h4>
                        <p className="text-sm text-slate-500 mt-1">
                          From: {getBranchDisplayName(transfer.sourceBranchId)} →
                          To: {getBranchDisplayName(transfer.targetBranchId)}
                        </p>
                        <p className="text-sm text-slate-500">Date: {new Date(transfer.dateSent).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${transfer.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {transfer.status}
                        </span>
                        <button
                          onClick={() => { setSelectedTransferForCodes(transfer); setShowViewCodesModal(true); }}
                          className="px-3 py-1 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-slate-900 border-b border-slate-200">
                            <th className="pb-2 font-bold">Product Name</th>
                            <th className="pb-2 font-bold">Batch Number</th>
                            <th className="pb-2 text-right font-bold">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transfer.items.map((item: any, i: number) => (
                            <tr key={i}>
                              <td className="py-2 text-slate-900 font-medium">{item.productName}</td>
                              <td className="py-2 text-slate-800 font-mono">{item.batchNumber}</td>
                              <td className="py-2 text-right font-bold text-slate-900">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'release' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Unlock size={18} className="text-amber-600" /> Pending Stock
                Release Requests
              </h3>
              <p className="text-xs text-slate-500">
                Authorize Quarantined Stock for Sale
              </p>
            </div>
            {pendingRelease.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-20 text-teal-600" />
                <p>No release requests. All active stock is authorized.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingRelease.map(req => (
                  <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {getBranchDisplayName(req.branchId)}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          Requested by {req.requestedBy} on {req.date}
                        </p>
                      </div>
                      <button
                        onClick={() => handleReleaseApproval(req)}
                        className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md flex items-center gap-2 transition-colors"
                        type="button"
                      >
                        <CheckCircle size={16} /> Approve Release
                      </button>
                    </div>
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-amber-900 border-b border-amber-200">
                            <th className="pb-2 font-bold">Product Name</th>
                            <th className="pb-2 font-bold">Batch Number</th>
                            <th className="pb-2 text-right font-bold">
                              Qty to Release
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {req.items.map((item, i) => (
                            <tr key={i}>
                              <td className="py-2 text-amber-900 font-medium">
                                {item.productName}
                              </td>
                              <td className="py-2 text-amber-800 font-mono">
                                {item.batchNumber}
                              </td>
                              <td className="py-2 text-right font-bold text-amber-900">
                                {item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-rose-50">
              <h3 className="font-bold text-rose-800 flex items-center gap-2">
                <Trash2 size={18} /> Pending Stock Disposal Requests
              </h3>
              <p className="text-xs text-rose-600">
                Authorize Permanent Removal of Stock
              </p>
            </div>
            {pendingDisposal.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-20 text-rose-600" />
                <p>No disposal requests pending.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingDisposal.map(req => (
                  <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {getBranchDisplayName(req.branchId)}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          Requested by {req.requestedBy} on {req.date}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDisposalApproval(req)}
                        className="px-6 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 shadow-md flex items-center gap-2 transition-colors"
                        type="button"
                      >
                        <CheckCircle size={16} /> Authorize Destruction
                      </button>
                    </div>
                    <div className="bg-rose-50 rounded-xl border border-rose-100 p-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-rose-900 border-b border-rose-200">
                            <th className="pb-2 font-bold">Product Name</th>
                            <th className="pb-2 font-bold">Batch Number</th>
                            <th className="pb-2 font-bold">Reason</th>
                            <th className="pb-2 text-right font-bold">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {req.items.map((item, i) => (
                            <tr key={i}>
                              <td className="py-2 text-rose-900 font-medium">
                                {item.productName}
                              </td>
                              <td className="py-2 text-rose-800 font-mono">
                                {item.batchNumber}
                              </td>
                              <td className="py-2 text-rose-700">{item.reason}</td>
                              <td className="py-2 text-right font-bold text-rose-900">
                                {item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showViewCodesModal && selectedTransferForCodes && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-full sm:max-w-md md:max-w-2xl lg:max-w-2xl p-3 md:p-4 lg:p-6 max-h-[90vh] overflow-y-auto m-2 md:m-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Transfer Details</h3>
              <p className="text-sm text-slate-500 mt-2">Transfer #{selectedTransferForCodes.id}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <h5 className="font-bold text-slate-700 mb-3">Transfer Information</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">From Branch</p>
                  <p className="font-medium text-slate-900">{getBranchDisplayName(selectedTransferForCodes.sourceBranchId)}</p>
                </div>
                <div>
                  <p className="text-slate-500">To Branch</p>
                  <p className="font-medium text-slate-900">{getBranchDisplayName(selectedTransferForCodes.targetBranchId)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Date Sent</p>
                  <p className="font-medium text-slate-900">{fmtDate(selectedTransferForCodes.dateSent)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedTransferForCodes.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    selectedTransferForCodes.status === 'RECEIVED_KEEPER' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedTransferForCodes.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <h5 className="font-bold text-slate-700 mb-3">Items in Transit</h5>
              <div className="space-y-3">
                {selectedTransferForCodes.items && selectedTransferForCodes.items.length > 0 ? (
                  selectedTransferForCodes.items.map((item: any, idx: number) => {
                    const product = (products || []).find((p: any) => p.id === item.productId);
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{product?.name || item.productName || item.productId}</p>
                          <p className="text-xs text-slate-500">Batch: {item.batchNumber} • Expires: {fmtDate(item.expiryDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{item.quantity} units</p>
                          <p className="text-xs text-slate-500">{product?.unit || 'units'}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No items found in this transfer</p>
                )}
              </div>
              {selectedTransferForCodes.items && selectedTransferForCodes.items.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-700">Total Items:</span>
                    <span className="font-bold text-slate-900">{selectedTransferForCodes.items.reduce((sum: any, item: any) => sum + (item.quantity || 0), 0)} units</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <h5 className="font-bold text-slate-700 mb-3">Verification Status</h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Store Keeper Verification</p>
                    {(selectedTransferForCodes.status === 'RECEIVED_KEEPER' || selectedTransferForCodes.status === 'COMPLETED') ? (
                      <div className="text-xs text-green-600 mt-1">✓ Store keeper verification completed</div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">Not yet verified</p>
                    )}
                  </div>
                  {(selectedTransferForCodes.status === 'RECEIVED_KEEPER' || selectedTransferForCodes.status === 'COMPLETED') && (
                    <CheckCircle size={20} className="text-green-500" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Inventory Controller Verification</p>
                    {selectedTransferForCodes.status === 'COMPLETED' ? (
                      <div className="text-xs text-green-600 mt-1">✓ Inventory controller verification completed</div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">Not yet verified</p>
                    )}
                  </div>
                  {selectedTransferForCodes.status === 'COMPLETED' && (
                    <CheckCircle size={20} className="text-green-500" />
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => { setShowViewCodesModal(false); setSelectedTransferForCodes(null); }}
              className="w-full py-3 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ShipmentModal
        isOpen={shipmentModalOpen}
        onClose={() => setShipmentModalOpen(false)}
        requisition={selectedRequisition}
        branches={branches}
        onSuccess={handleShipmentSuccess}
      />
    </div>
  );
};

export default Approvals;
