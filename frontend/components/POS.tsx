import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  // ShieldCheck removed
  Printer,
  CheckCircle,
  AlertOctagon,
  Send,
  FileText,
  X,
  AlertTriangle,
  Eye,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  FilePlus,
  Users
} from 'lucide-react';
import { Product, CartItem, PaymentMethod, BranchInventoryItem, Invoice, Branch, Entity } from '../types';
// Drug interaction checks removed per request
import { api } from '../services/api';
import { useNotifications } from './NotificationContext';
import { openCustomPrint } from '../services/printUtils';
import { renderToStaticMarkup } from 'react-dom/server';
import InvoicePreviewModal from './InvoicePreviewModal';
import InvoiceModal from './InvoiceModal';
import PaymentModal from './PaymentModal';
import ModernInvoicePrintTemplate from './ModernInvoicePrintTemplate';
import Entities from './Entities';

interface POSProps {
  currentBranchId: string;
  inventory: Record<string, BranchInventoryItem[]>;
  onCreateInvoice: (invoice: Invoice) => void;
  products: Product[];
}

const POS: React.FC<POSProps> = ({ currentBranchId, inventory, onCreateInvoice, products }) => {
  const { showSuccess, showError } = useNotifications();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickQty, setQuickQty] = useState<number>(1);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
   const [previewMode, setPreviewMode] = useState(false);
   const [customerName, setCustomerName] = useState('');
   const [customerPhone, setCustomerPhone] = useState('');
   const [selectedCustomer, setSelectedCustomer] = useState<Entity | null>(null);
   const [showCustomerSelector, setShowCustomerSelector] = useState(false);
   const [savedCustomers, setSavedCustomers] = useState<Entity[]>([]);
   // interaction warnings removed
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductPanelCollapsed, setIsProductPanelCollapsed] = useState(false);
  const [companyLogo, setCompanyLogo] = useState('');
  const [localInventory, setLocalInventory] = useState<Record<string, BranchInventoryItem[]>>(inventory);
  
  // Preview Modal State (same as Finance)
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Company settings state
  const [companySettings, setCompanySettings] = useState({
    companyName: 'PMS Pharmacy',
    tinNumber: '123-456-789',
    vrnNumber: '400-999-111',
    address: 'Bagamoyo Road, Dar es Salaam, Tanzania',
    phone: '+255 700 123 456',
    email: 'info@pms-pharmacy.tz',
    logo: '/backend_php/uploads/logos/logo.png'
  });

  // Load branches, logo and company settings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [branchesData, settingsData] = await Promise.all([
          api.getBranches(),
          api.getSettings()
        ]);
        setBranches(branchesData || []);
        
        const logoSetting = settingsData.find(s => s.settingKey === 'logo');
        setCompanyLogo(logoSetting?.settingValue || '/backend_php/uploads/logos/logo.png');
        
        // Load saved customers
        await loadSavedCustomers();
        
        // Load company settings for invoice template
        if (settingsData && settingsData.length > 0) {
          setCompanySettings({
            companyName: settingsData.find((s: any) => s.settingKey === 'companyName')?.settingValue || 'PMS Pharmacy',
            tinNumber: settingsData.find((s: any) => s.settingKey === 'tinNumber')?.settingValue || '123-456-789',
            vrnNumber: settingsData.find((s: any) => s.settingKey === 'vrnNumber')?.settingValue || '400-999-111',
            address: settingsData.find((s: any) => s.settingKey === 'address')?.settingValue || 'Bagamoyo Road, Dar es Salaam, Tanzania',
            phone: settingsData.find((s: any) => s.settingKey === 'phone')?.settingValue || '+255 700 123 456',
            email: settingsData.find((s: any) => s.settingKey === 'email')?.settingValue || 'info@pms-pharmacy.tz',
            logo: logoSetting?.settingValue || '/backend_php/uploads/logos/logo.png'
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Load saved customers
  const loadSavedCustomers = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      console.log('[POS] Loading customers, token exists:', !!token);
      
      // Use the API service to get customers
      const customers = await api.getEntities({ type: 'CUSTOMER', status: 'ACTIVE' });
      console.log('[POS] Customers loaded:', customers);
      setSavedCustomers(customers || []);
    } catch (error) {
      console.error('[POS] Failed to load customers:', error);
      // Don't show error toast for this - it's not critical
      setSavedCustomers([]);
    }
  };

  const currentBranch = branches.find(b => b.id === currentBranchId);
  const isHeadOffice = currentBranch?.isHeadOffice || currentBranchId === 'HEAD_OFFICE';
  const isMainBranch = currentBranchId === 'BR003' || isHeadOffice; // Allow main branch (BR003) to have POS access
  const branchName = currentBranch?.name || 'Unknown Branch';

  // Merge Products with Branch Specific Inventory
  const availableProducts: Product[] = products.map(p => {
    const branchStockList = inventory[currentBranchId] || [];
    const inventoryItem = branchStockList.find(i => i.productId === p.id);
    const customPrice = inventoryItem?.customPrice;

    const baseStock = inventoryItem ? inventoryItem.quantity : 0;
    const pendingIncoming = inventoryItem?.pendingIncoming || 0;
    const totalStock = baseStock + pendingIncoming;

    return {
      ...p,
      price: customPrice || p.price,
      totalStock: totalStock,
      baseStock: baseStock,
      pendingIncoming: pendingIncoming
    } as any;
  });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = 0; // VAT removed system-wide
  const total = subtotal;


  const addToCart = (product: Product) => {
    const qtyToAdd = quickQty > 0 ? quickQty : 1;
    const currentQtyInCart = cart.find(i => i.id === product.id)?.quantity || 0;

    // Enforce availability based on baseStock
    if (currentQtyInCart + qtyToAdd > (product as any).baseStock) {
      showError(
        'Insufficient Stock',
        `Available: ${(product as any).baseStock}, Requested: ${currentQtyInCart + qtyToAdd}`
      );
      return;
    }

    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p =>
          p.id === product.id ? { ...p, quantity: p.quantity + qtyToAdd } : p
        );
      }
      return [...prev, { ...product, quantity: qtyToAdd, selectedBatch: 'BATCH-AUTO', discount: 0 }];
    });

    setQuickQty(1);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQty: number) => {
    if (isNaN(newQty) || newQty < 0) return;

    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;

      const product = availableProducts.find(p => p.id === id);
      if (!product) return prev;

      // Enforce against baseStock
      const base = (product as any).baseStock || 0;
      if (newQty > base) {
        showError(
          'Insufficient Stock',
          `Limit is ${base} units for ${product.name}`
        );
        return prev;
      }

      if (newQty === 0) return prev.filter(i => i.id !== id);

      return prev.map(p => p.id === id ? { ...p, quantity: newQty } : p);
    });
  };

  // Keep the original handleCreateInvoice for backwards compatibility
  const handleCreateInvoice = async () => {
    await handleCreateInvoiceFromPOS();
  };

  // Modern invoice print using same template as Finance
  const handlePrintProforma = () => {
    // Transform cart data to match ModernInvoicePrintTemplate interface
    const invoiceData = {
      id: `POS-${Date.now().toString().slice(-6)}`,
      dateIssued: new Date().toISOString().split('T')[0],
      client: {
        name: customerName,
        address: '-',
        email: '-',
        phone: customerPhone || '-'
      },
      items: cart.map((item, idx) => ({
        description: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      subtotal: total,
      tax: 0,
      total: total,
      paymentTerms: 'Payment due upon receipt.',
      paymentMethod: 'Cash'
    };

    const companyData = {
      companyName: companySettings.companyName,
      tinNumber: companySettings.tinNumber,
      address: companySettings.address,
      phone: companySettings.phone,
      email: companySettings.email,
      logo: companySettings.logo
    };

    // Generate HTML using the same template as Finance with PROFORMA INVOICE title
    const html = renderToStaticMarkup(
      <ModernInvoicePrintTemplate title="PROFORMA INVOICE" invoice={invoiceData} companySettings={companyData} />
    );

    openCustomPrint(html, 'Proforma Invoice Print');
  };

  // Preview invoice using the same modal as Finance
  const handlePreviewInvoice = async () => {
    if (!customerName.trim()) {
      showError('Validation Error', 'Please enter a customer name.');
      return;
    }

    // Create a temporary invoice for preview
    const tempInvoice: Invoice = {
      id: `PREVIEW-${Date.now().toString().slice(-6)}`,
      branchId: currentBranchId,
      customerName: customerName,
      customerPhone: customerPhone || undefined,
      dateIssued: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalAmount: total,
      paidAmount: 0,
      status: 'UNPAID',
      description: 'Invoice from POS',
      source: 'POS',
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice || 0,
        selectedBatch: item.selectedBatch || 'AUTO'
      })),
      payments: []
    };

    setPreviewInvoice(tempInvoice);
    setShowPreviewModal(true);
  };

  // Handle create invoice from POS (creates actual invoice)
  const handleCreateInvoiceFromPOS = async () => {
    if (!customerName.trim()) {
      showError('Validation Error', 'Please enter a customer name.');
      return;
    }

    const invoiceData: Partial<Invoice> = {
      // Backend will generate ID in format INV-BR###-YYYY-0001 if not provided
      branchId: currentBranchId,
      customerName: customerName,
      customerPhone: customerPhone || undefined,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice || 0,
        selectedBatch: item.selectedBatch || 'AUTO'
      })),
      totalAmount: total,
      paidAmount: 0,
      status: 'UNPAID',
      description: 'Invoice from POS',
      source: 'POS',
      dateIssued: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payments: []
    };

    try {
      const createdInvoice = await onCreateInvoice(invoiceData as Invoice);
      
      setCustomerModalOpen(false);
      setPreviewMode(false);
      showSuccess(
        'Invoice Created',
        `Invoice #${createdInvoice?.id || invoiceData.id} sent to Finance for payment.`
      );
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
    } catch (error) {
      console.error('POS: Failed to create invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice. Please try again.';
      showError('Invoice Creation Failed', errorMessage);
    }
  };

  // Only show products with stock available for sale
  const filteredProducts = availableProducts.filter(p =>
    ((p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.genericName.toLowerCase().includes(searchTerm.toLowerCase())) && (p.baseStock || 0) > 0)
  );


  // Allow POS in all valid branch contexts
  if (false) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 bg-amber-50 rounded-full mb-4">
          <AlertOctagon size={48} className="text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">POS Unavailable</h2>
        <p className="text-slate-500 max-w-md mb-6">
          Point of Sale operations require a valid branch context. Please switch to a branch using the selector in the sidebar.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <ShoppingCart className="animate-spin mx-auto mb-4 text-teal-600" size={32} />
          <p>Loading POS system...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="h-full min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[calc(100vh-12rem)] no-print">
        {/* Product Selection */}
        <div className={`flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-0 transition-all duration-300 ${
          isProductPanelCollapsed ? 'w-16' : 'flex-1'
        }`}>
          <div className="p-4 border-b border-slate-100 flex gap-4 items-center">
            {!isProductPanelCollapsed && (
              <>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Scan Barcode or Search Product..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-center"
                      value={quickQty}
                      onChange={(e) => setQuickQty(parseInt(e.target.value) || 0)}
                      aria-label="Quick add quantity"
                    />
                  </div>
                </div>
              </>
            )}
            <button
              onClick={() => setIsProductPanelCollapsed(!isProductPanelCollapsed)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title={isProductPanelCollapsed ? "Expand product panel" : "Collapse product panel"}
            >
              {isProductPanelCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {!isProductPanelCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p>No products available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.totalStock === 0}
                      className={`flex flex-col text-left p-4 rounded-xl border transition-all group ${
                        product.totalStock === 0
                          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 hover:border-teal-500 hover:bg-teal-50'
                      }`}
                    >
                      <div className="flex justify-between w-full mb-2">
                        <span className="text-xs font-bold text-teal-600 bg-teal-100 px-2 py-1 rounded-md">
                          {product.unit}
                        </span>
                        <div className="flex gap-1">
                          {product.totalStock === 0 && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">Out</span>
                          )}
                          {product.requiresPrescription && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">Rx</span>
                          )}
                        </div>
                      </div>
                      <h3 className={`font-bold mb-1 group-hover:text-teal-700 text-sm line-clamp-2 ${
                        product.totalStock === 0 ? 'text-slate-600' : 'text-slate-800'
                      }`}>
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-1">{product.genericName}</p>
                      <div className="mt-auto pt-2 border-t border-slate-100 w-full flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${
                            product.totalStock === 0 ? 'text-slate-500' : 'text-slate-900'
                          }`}>
                            {(product.price || 0).toLocaleString()} TZS
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">Stock: {product.baseStock}</span>
                            {product.pendingIncoming > 0 && (
                              <span className="text-[10px] text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full font-bold">+{product.pendingIncoming} incoming</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart & Checkout */}
        <div className={`flex flex-col bg-white rounded-2xl shadow-xl border border-slate-100 min-h-0 relative ${
          isProductPanelCollapsed ? 'flex-1' : 'w-full lg:w-96'
        }`}>
          <div className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <FileText className="mr-2" size={20} />
                Order
              </h2>
              <p className="text-xs text-teal-600 font-bold mt-1">Location: {branchName}</p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-slate-400 hover:text-rose-500"
                title="Clear Cart"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart size={48} className="mb-4 opacity-50" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                      <p className="text-xs text-slate-500">{(item.price || 0).toLocaleString()} per unit</p>
                    </div>
                    <span className="font-bold text-slate-900">
                      {((item.price || 0) * item.quantity).toLocaleString()
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                        aria-label={`Decrease quantity for ${item.name}`}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        className="w-12 text-center text-sm font-bold border-none focus:ring-0 p-0"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                        aria-label={`Quantity for ${item.name}`}
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                        aria-label={`Increase quantity for ${item.name}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-600 p-2"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* AI Warning Section */}
          {/* Interaction warnings removed */}

          {/* Totals & Action */}
          <div className="p-6 border-t border-slate-100 bg-white rounded-b-2xl sticky bottom-0 z-10">
              <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString()} TZS</span>
              </div>
              <div className="flex justify-between font-bold text-xl text-teal-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{total.toLocaleString()} TZS</span>
              </div>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => {
                setPreviewMode(false);
                setCustomerModalOpen(true);
              }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2"
            >
              <Send size={18} /> Create Invoice
            </button>
            <p className="text-xs text-center text-slate-500 mt-2">
              Invoice will be sent to Finance for payment.
            </p>
          </div>
        </div>
      </div>

      {/* Customer Name Modal (simplified) */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 text-center relative">
              <h3 className="text-xl font-bold text-slate-900">Sale Details</h3>
              <p className="text-slate-500 text-sm">Enter customer information</p>
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                aria-label="Close sale details modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Saved Customers Dropdown */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Users size={16} />
                  Select Saved Customer
                </label>
                <select
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = savedCustomers.find(c => c.id === e.target.value);
                    if (customer) {
                      setSelectedCustomer(customer);
                      setCustomerName(customer.name);
                      setCustomerPhone(customer.phone || '');
                    }
                  }}
                >
                  <option value="">-- Walk-in Customer --</option>
                  {savedCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Manual Entry */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Walk-in Client, John Doe"
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Customer Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +255 700 123 456"
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              
              {/* Selected Customer Info */}
              {selectedCustomer && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Selected Customer:</p>
                  <p className="font-bold text-blue-900">{selectedCustomer.name}</p>
                  {selectedCustomer.discountPercentage > 0 && (
                    <p className="text-sm text-blue-600">
                      Discount: {selectedCustomer.discountPercentage}%
                    </p>
                  )}
                  {selectedCustomer.creditLimit > 0 && (
                    <p className="text-sm text-blue-600">
                      Credit Limit: TZS {selectedCustomer.creditLimit.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="px-4 py-2 text-slate-500 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePreviewInvoice}
                className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2"
              >
                <Eye size={16} /> Preview Invoice
              </button>
              <button
                onClick={handleCreateInvoiceFromPOS}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2"
              >
                <Send size={16} /> Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal (same as Finance) */}
      <InvoicePreviewModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        selectedInvoice={previewInvoice}
        handlePrintInvoice={() => {
          setShowPreviewModal(false);
          if (previewInvoice) {
            const customerInfo = {
              name: previewInvoice.customerName,
              address: '',
              email: previewInvoice.customerEmail || '',
              phone: previewInvoice.customerPhone || ''
            };
            const invoiceData = {
              id: previewInvoice.id,
              dateIssued: previewInvoice.dateIssued || '',
              client: customerInfo,
              items: (previewInvoice.items || []).map(item => ({
                description: item.name || 'Item',
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
              })),
              subtotal: previewInvoice.totalAmount || 0,
              tax: 0,
              total: previewInvoice.totalAmount || 0,
              paymentTerms: previewInvoice.description || 'Payment due upon receipt',
              paymentMethod: previewInvoice.paymentMethod || 'Cash'
            };
            const companyData = {
              companyName: companySettings.companyName,
              tinNumber: companySettings.tinNumber,
              address: companySettings.address,
              phone: companySettings.phone,
              email: companySettings.email,
              logo: companySettings.logo
            };
            const html = renderToStaticMarkup(
              <ModernInvoicePrintTemplate invoice={invoiceData} companySettings={companyData} />
            );
            openCustomPrint(html, 'Invoice Print');
          }
        }}
        openPaymentModal={(invoice) => {
          setSelectedInvoice(invoice);
          setShowPaymentModal(true);
        }}
      />

      {/* Print Template - Proforma Invoice */}
      <div className="print-only">
        <div className="max-w-xl mx-auto border border-black p-8 text-black">
          <div className="text-center mb-6">
            {companyLogo && <img src={companyLogo} alt="Company Logo" className="w-16 h-16 mx-auto mb-4 object-contain" />}
            <h1 className="text-2xl font-bold uppercase">PMS Pharmacy</h1>
            <p>TIN: 123-456-789 | VRN: 40-001234</p>
            <p>Bagamoyo Road, Dar es Salaam</p>
            <p>Branch: {branchName}</p>
          </div>
          <hr className="border-black my-4" />
          <div className="flex justify-between font-bold text-lg mb-2">
            <span>SALE RECEIPT</span>
          </div>
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Customer: {customerName}</p>
          <hr className="border-black my-4" />
          <table className="w-full text-left mb-6">
            <thead>
              <tr className="border-b border-black">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{(item.price || 0).toLocaleString()}</td>
                  <td className="py-2 text-right">{((item.price || 0) * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="border-black my-4" />
          <div className="flex justify-between font-bold text-xl">
            <span>TOTAL</span>
            <span>{total.toLocaleString()} TZS</span>
          </div>
          <div className="mt-8 text-center text-sm">
            <p>Thank you for your business!</p>
            <p>Sale completed and inventory updated.</p>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed bottom-8 right-8 bg-green-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in duration-300 z-50 no-print">
          <CheckCircle className="text-green-400" />
          <div>
            <h4 className="font-bold">Sale Completed</h4>
            <p className="text-sm text-green-100">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in duration-300 z-50 no-print">
          <AlertTriangle className="text-white" />
          <div>
            <h4 className="font-bold">Stock Alert</h4>
            <p className="text-sm text-rose-100">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal (same as Finance) */}
      <InvoicePreviewModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        selectedInvoice={previewInvoice}
        handlePrintInvoice={() => {
          setShowPreviewModal(false);
          if (previewInvoice) {
            const customerInfo = {
              name: previewInvoice.customerName,
              address: '',
              email: previewInvoice.customerEmail || '',
              phone: previewInvoice.customerPhone || ''
            };
            const invoiceData = {
              id: previewInvoice.id,
              dateIssued: previewInvoice.dateIssued || '',
              client: customerInfo,
              items: (previewInvoice.items || []).map(item => ({
                description: item.name || 'Item',
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
              })),
              subtotal: previewInvoice.totalAmount || 0,
              tax: 0,
              total: previewInvoice.totalAmount || 0,
              paymentTerms: previewInvoice.description || 'Payment due upon receipt',
              paymentMethod: previewInvoice.paymentMethod || 'Cash'
            };
            const companyData = {
              companyName: companySettings.companyName,
              tinNumber: companySettings.tinNumber,
              address: companySettings.address,
              phone: companySettings.phone,
              email: companySettings.email,
              logo: companySettings.logo
            };
            const html = renderToStaticMarkup(
              <ModernInvoicePrintTemplate invoice={invoiceData} companySettings={companyData} />
            );
            openCustomPrint(html, 'Invoice Print');
          }
        }}
        openPaymentModal={(invoice) => {
          setSelectedInvoice(invoice);
          setShowPaymentModal(true);
        }}
      />
    </div>
  );
};

export default POS;
