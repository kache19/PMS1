import React, { useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Truck,
  Plus,
  X,
  Search,
  KeyRound,
  Send,
  RefreshCcw,
  FilePlus,
  History,
  Loader,
  DollarSign,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Copy,
  Share2,
  Eye,
  RotateCcw,
  ShoppingCart,
  ClipboardList,
  Tag,
  Archive,
  ArchiveRestore,
  PackagePlus,
  PackageMinus,
  Layers,
  BarChart3,
  Download,
  FileText,
  Copy as DuplicateIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { StockTransfer, Product, BranchInventoryItem, BatchStatus, StockRequisition, Staff, Branch, Sale, UserRole, Entity, Shipment, DrugBatch, Invoice } from '../types';
import { useNotifications } from './NotificationContext';
import { api, API_URL } from '../services/api';
import { exportToExcel, exportToPDF } from '../services/exportService';
import { getBranchDisplayName as formatBranchDisplayName } from '../utils/branchDisplay';
import { generateBatchNumber } from '../utils/batchNumber';

// Add safe format helpers to prevent calling toLocaleString on undefined
const fmtNumber = (v?: number | null) => {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return '0';
  try { return Number(v).toLocaleString(); } catch { return String(v); }
};

const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  try { return d.toLocaleDateString(); } catch { return v; }
};

const fmtCurrency = (v?: number | null) => {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return '0';
  try {
    return Number(v).toLocaleString();
  } catch { return '0'; }
};

const normalizeShipmentStatus = (status?: string) => {
  const value = (status || '').toUpperCase();
  if (value === 'PENDING') return 'PENDING';
  if (value === 'APPROVED') return 'APPROVED';
  if (value === 'REJECTED') return 'REJECTED';
  if (value === 'IN_TRANSIT') return 'IN_TRANSIT';
  if (value === 'DELIVERED') return 'DELIVERED';
  return 'PENDING';
};

const normalizeTransferStatus = (status?: string) => String(status || '').toUpperCase().replace(/\s+/g, '_');
const normalizeIdKey = (value?: string | null) => String(value || '').trim().toUpperCase();
const normalizeBranchId = (value: unknown) => String(value ?? '').trim();
const branchIdVariants = (value: unknown) => {
  const raw = normalizeBranchId(value).toUpperCase();
  if (!raw) return [];
  const variants = new Set<string>([raw]);
  const prefixed = raw.match(/^BR0*(\d+)$/);
  if (prefixed) variants.add(String(Number(prefixed[1])));
  if (/^\d+$/.test(raw)) variants.add(`BR${raw.padStart(3, '0')}`);
  return Array.from(variants);
};
const branchIdsMatch = (a: unknown, b: unknown) => {
  const aVariants = branchIdVariants(a);
  const bVariants = new Set(branchIdVariants(b));
  return aVariants.some((id) => bVariants.has(id));
};

interface ExtendedProduct extends Product {
  customPrice?: number;
}

interface InventoryProps {
    currentBranchId: string;
    inventory: Record<string, BranchInventoryItem[]>;
    setInventory: React.Dispatch<React.SetStateAction<Record<string, BranchInventoryItem[]>>>;
    transfers: StockTransfer[];
    setTransfers: React.Dispatch<React.SetStateAction<StockTransfer[]>>;
    sales: Sale[];
    currentUser?: Staff | null;
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    onAddStock?: (data: {
      branchId: string,
      productId: string,
      batchNumber: string,
      expiryDate: string,
      quantity: number,
      supplierId?: string,
      supplierName?: string,
      costPrice?: number,
      sellingPrice?: number
    }) => Promise<void> | void;
    onAddStockBulk?: (data: {
      branchId: string,
      supplierId?: string,
      supplierName?: string,
      restockStatus?: string,
      items: Array<{
        productId: string,
        batchNumber: string,
        expiryDate: string,
        quantity: number,
        costPrice?: number,
        sellingPrice?: number
      }>
    }) => Promise<void> | void;
    onAddProduct?: (product: Product) => void;
    onUpdateProduct?: (product: Product) => void;
    onCreateTransfer?: (transfer: StockTransfer) => void;
    branches?: Branch[];
}

interface NewStockForm {
  productId: string;
  name: string;
  genericName: string;
  category: string;
  costPrice: string;
  price: string;
  unit: string;
  minStock: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  supplierId?: string;
  supplierName?: string;
}

interface RestockEntry {
  productId: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  sellingPrice: number;
  supplierId?: string;
  supplierName?: string;
}

interface RestockExistingForm {
  items: RestockEntry[];
  supplierId: string;
  supplierName: string;
  isNewSupplier: boolean;
  newSupplierName: string;
}

interface NewShipmentForm {
  targetBranchId: string;
  notes: string;
  items: any[];
}

interface ShipmentItem {
  productId: string;
  quantity: string;
}

const Inventory: React.FC<InventoryProps> = ({
    currentBranchId,
    inventory,
    setInventory,
    transfers,
    setTransfers,
    sales,
    currentUser,
    products,
    setProducts,
    branches = [],
    onAddStock,
    onAddStockBulk,
    onAddProduct,
    onUpdateProduct,
    onCreateTransfer
}) => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const refreshShipments = React.useCallback(async () => {
    try {
      const fetchedShipments = await api.getShipments();
      setShipments(fetchedShipments);
    } catch (error) {
      console.error('Failed to refresh shipments:', error);
    }
  }, []);
  const refreshRequisitions = React.useCallback(async () => {
    try {
      const fetchedRequisitions = await api.getRequisitions();
      setRequestHistory(Array.isArray(fetchedRequisitions) ? fetchedRequisitions : []);
    } catch (error) {
      console.error('Failed to refresh requisitions:', error);
    } finally {
      setIsLoadingRequestHistory(false);
    }
  }, []);

  // Fetch products and inventory if not provided
  React.useEffect(() => {
    const loadData = async () => {
      try {
        if (products.length === 0) {
          const fetchedProducts = await api.getProducts();
          setProducts(fetchedProducts);
        }
        if (Object.keys(inventory).length === 0 || !inventory[currentBranchId]) {
          const fetchedInventory = await api.getInventory(currentBranchId);
          setInventory(prev => ({ ...prev, ...fetchedInventory }));
        }
        if (transfers.length === 0) {
          const fetchedTransfers = await api.getTransfers();
          setTransfers(fetchedTransfers);
        }
        // Load shipments
        await refreshShipments();
        // Load requisition history for status tracking
        await refreshRequisitions();
        // Load saved entities that can be used as restock source names
        const fetchedEntities = await api.getEntities({ status: 'ACTIVE' });
        setSuppliers(
          fetchedEntities.filter(
            (entity) => entity.type === 'SUPPLIER' || entity.type === 'CUSTOMER' || entity.type === 'BOTH'
          )
        );
      } catch (error) {
        console.error('Failed to load inventory data:', error);
        showError('Data Load Error', 'Failed to load inventory data. Please refresh the page.');
      }
    };

    loadData();
  }, [currentBranchId, products.length, Object.keys(inventory).length, transfers.length, setProducts, setInventory, setTransfers, showError, refreshShipments, refreshRequisitions]);
  const [activeTab, setActiveTab] = useState<'stock' | 'transfers'>('stock');
  const [collapseCompletedIncoming, setCollapseCompletedIncoming] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [restockExistingForm, setRestockExistingForm] = useState<RestockExistingForm>({
    items: [],
    supplierId: '',
    supplierName: '',
    isNewSupplier: false,
    newSupplierName: ''
  });
  const [currentRestockItem, setCurrentRestockItem] = useState<Partial<RestockEntry>>({
    productId: '',
    quantity: 0,
    batchNumber: '',
    expiryDate: '',
    costPrice: 0,
    sellingPrice: 0
  });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTransferId, setRejectTransferId] = useState<string | null>(null);
  const [rejectStep, setRejectStep] = useState<'KEEPER' | 'CONTROLLER'>('KEEPER');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectingTransfer, setIsRejectingTransfer] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'KEEPER' | 'CONTROLLER'>('KEEPER');
  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [hasReviewedShipmentContents, setHasReviewedShipmentContents] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isSyncingMSD, setIsSyncingMSD] = useState(false);
  const [showTransferSuccessModal, setShowTransferSuccessModal] = useState(false);
  const [createdTransfer, setCreatedTransfer] = useState<StockTransfer | null>(null);
  const [createdShipmentMeta, setCreatedShipmentMeta] = useState<{ shipmentId?: string; invoiceId?: string } | null>(null);
  const [showViewCodesModal, setShowViewCodesModal] = useState(false);
  const [selectedTransferForCodes, setSelectedTransferForCodes] = useState<StockTransfer | null>(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportData, setBulkImportData] = useState<any[]>([]);
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([]);
  const [bulkImportDuplicates, setBulkImportDuplicates] = useState<any[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'replace' | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [shipmentSearchQuery, setShipmentSearchQuery] = useState('');
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  const [shipmentDirectionFilter, setShipmentDirectionFilter] = useState<'ALL' | 'INCOMING' | 'OUTGOING' | 'NETWORK'>('ALL');
  const [shipmentSortBy, setShipmentSortBy] = useState<'NEWEST' | 'OLDEST' | 'VALUE_HIGH' | 'VALUE_LOW' | 'ITEMS_HIGH' | 'ITEMS_LOW'>('NEWEST');
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<any>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceModalData, setPriceModalData] = useState<{ product: any; newPrice: string } | null>(null);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showEditGenericModal, setShowEditGenericModal] = useState(false);
  const [showEditCostModal, setShowEditCostModal] = useState(false);
  const [showEditMinStockModal, setShowEditMinStockModal] = useState(false);
  const [editModalData, setEditModalData] = useState<{ product: any; field: string; value: string } | null>(null);
  const [showRestockInvoicesModal, setShowRestockInvoicesModal] = useState(false);
  const [restockInvoices, setRestockInvoices] = useState<Invoice[]>([]);
  const [isLoadingRestockInvoices, setIsLoadingRestockInvoices] = useState(false);

  // Auto-dismiss shipment success popup so success feedback never blocks the user.
  React.useEffect(() => {
    if (!showTransferSuccessModal || !createdTransfer) return;
    const timeoutId = window.setTimeout(() => {
      setShowTransferSuccessModal(false);
      setCreatedTransfer(null);
      setCreatedShipmentMeta(null);
    }, 2500);
    return () => window.clearTimeout(timeoutId);
  }, [showTransferSuccessModal, createdTransfer]);

  const [newStock, setNewStock] = useState<NewStockForm>({
    productId: '',
    name: '',
    genericName: '',
    category: 'General',
    costPrice: '',
    price: '',
    unit: 'Box',
    minStock: '10',
    batchNumber: '',
    expiryDate: '',
    quantity: ''
  });

  const [newShipment, setNewShipment] = useState<NewShipmentForm>({
    targetBranchId: '',
    notes: '',
    items: []
  });

  const [requisitionItems, setRequisitionItems] = useState<any[]>([]);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  const [isLoadingRequestHistory, setIsLoadingRequestHistory] = useState(true);
  const [currentItem, setCurrentItem] = useState<ShipmentItem>({
    productId: '',
    quantity: ''
  });

  const findBranchById = (branchId: unknown) =>
    branches.find((b) => branchIdsMatch(b.id, branchId));
  const getBranchDisplayName = (branchId: unknown, fallback = 'Unknown Branch') =>
    formatBranchDisplayName(branches, String(branchId || ''), fallback);
  const currentBranch = findBranchById(currentBranchId);
  const isHeadOffice = currentBranch?.isHeadOffice || currentBranchId === 'HEAD_OFFICE';
  const branchName = currentBranch ? getBranchDisplayName(currentBranch.id, 'Unknown') : 'Unknown';
  const branchStockList = inventory[currentBranchId] || [];

  const savedRestockSources = useMemo(
    () =>
      suppliers
        .filter((entity) => entity.type === 'SUPPLIER' || entity.type === 'CUSTOMER' || entity.type === 'BOTH')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers]
  );

  React.useEffect(() => {
    if (activeTab !== 'transfers') return;
    const refreshTransferData = async () => {
      try {
        const [latestTransfers] = await Promise.all([
          api.getTransfers(),
          refreshShipments()
        ]);
        setTransfers(latestTransfers);
      } catch (error) {
        console.error('Failed to refresh transfer tab data:', error);
      }
    };
    refreshTransferData();
  }, [activeTab, setTransfers, refreshShipments]);

  const handleMsdSync = () => {
    setIsSyncingMSD(true);
    setTimeout(() => {
        setProducts((prev: Product[]) => prev.map(p => {
              if (Math.random() > 0.7) {
                  return { ...p, costPrice: Math.floor(p.costPrice * (1 + (Math.random() * 0.1 - 0.05))) };
              }
              return p;
         }));
         setIsSyncingMSD(false);
         showSuccess("MSD Sync Complete", "Updated catalog from National Medical Store.");
     }, 2500);
  };

  // Export inventory to Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredInventory.map((item) => {
        const product = products.find(p => p.id === item.id);
        return {
          'Product ID': item.id,
          'Product Name': product?.name || 'Unknown',
          'Category': product?.category || 'General',
          'Quantity': item.quantity,
          'Unit': product?.unit || 'Box',
          'Cost Price': product?.costPrice || 0,
          'Selling Price': product?.price || 0,
          'Min Stock': product?.minStockLevel || 0,
        };
      });

      exportToExcel(exportData, `Inventory_${new Date().toISOString().split('T')[0]}`);
      showSuccess('Export Completed', 'Inventory data exported to Excel successfully.');
    } catch (error) {
      console.error('Export failed:', error);
      showError('Export Failed', 'Failed to export inventory data. Please try again.');
    }
  };

  // Export inventory to PDF
  const handleExportPDF = async () => {
    try {
      const exportData = filteredInventory.map((item, index) => {
        const product = products.find(p => p.id === item.id);
        return {
          productId: index + 1,
          name: product?.name || 'Unknown',
          category: product?.category || 'General',
          quantity: item.quantity,
          price: product?.price || 0,
        };
      });

      const columns = [
        { key: 'productId', header: 'ID' },
        { key: 'name', header: 'Product' },
        { key: 'category', header: 'Category' },
        { key: 'quantity', header: 'Qty' },
        { key: 'price', header: 'Price' }
      ];

      const totalValue = filteredInventory.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + (item.quantity * (product?.price || 0));
      }, 0);

      const settings = await api.getSettings().catch(() => []);
      const getSetting = (key: string, fallback = '') =>
        settings.find((s: any) => s.settingKey === key)?.settingValue || fallback;
      const rawLogo = getSetting('logo', '/companyLogo.jpeg');
      const logo = rawLogo.startsWith('http') || rawLogo.startsWith('data:')
        ? rawLogo
        : `${window.location.origin}${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`;

      await exportToPDF(exportData, 'Inventory Report', columns, {
        totalItems: filteredInventory.length,
        totalValue: totalValue,
        subtitle: isHeadOffice ? 'Global Stock Overview' : `Branch: ${branchName}`,
        printedFromBranch: branchName,
        company: {
          companyName: getSetting('companyName', 'Malenya Pharmaceuticals'),
          address: getSetting('address', ''),
          phone: getSetting('phone', ''),
          email: getSetting('email', ''),
          tinNumber: getSetting('tinNumber', ''),
          vrnNumber: getSetting('vrnNumber', ''),
          logo
        }
      });
      showSuccess('Export Completed', 'Inventory report exported to PDF successfully.');
    } catch (error) {
      console.error('PDF export failed:', error);
      showError('Export Failed', 'Failed to export inventory PDF. Please try again.');
    }
  };

  const getAuthToken = () =>
    localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

  const handleOpenRestockInvoices = async () => {
    setIsLoadingRestockInvoices(true);
    setShowRestockInvoicesModal(true);
    try {
      const invoices = await api.getInvoices();
      const filtered = (invoices || []).filter((inv) => String(inv.source || '').toUpperCase() === 'RESTOCK');
      setRestockInvoices(filtered);
    } catch (error) {
      console.error('Failed to load restock invoices:', error);
      showError('Load Failed', 'Unable to load restock invoices.');
      setRestockInvoices([]);
    } finally {
      setIsLoadingRestockInvoices(false);
    }
  };

  const handleViewRestockInvoice = async (invoiceId: string) => {
    try {
      const url = `${API_URL}finance/invoices/${encodeURIComponent(invoiceId)}/html`;
      const token = getAuthToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error(`Failed to open invoice (${res.status})`);
      }
      const html = await res.text();
      const popup = window.open('', '_blank');
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }
      const sanitizedHtml = html.replace(/Payment Terms & Conditions/gi, '');
      popup.document.open();
      popup.document.write(sanitizedHtml);
      popup.document.close();
      popup.addEventListener('load', () => {
        try {
          const doc = popup.document;
          const toolbar = doc.createElement('div');
          toolbar.style.position = 'sticky';
          toolbar.style.top = '0';
          toolbar.style.zIndex = '9999';
          toolbar.style.display = 'flex';
          toolbar.style.justifyContent = 'flex-end';
          toolbar.style.gap = '8px';
          toolbar.style.padding = '10px 16px';
          toolbar.style.background = '#f8fafc';
          toolbar.style.borderBottom = '1px solid #e2e8f0';
          toolbar.style.fontFamily = 'Arial, sans-serif';

          const printBtn = doc.createElement('button');
          printBtn.textContent = 'Print';
          printBtn.style.background = '#0f766e';
          printBtn.style.color = '#fff';
          printBtn.style.border = 'none';
          printBtn.style.borderRadius = '6px';
          printBtn.style.padding = '8px 14px';
          printBtn.style.cursor = 'pointer';
          printBtn.onclick = () => popup.print();

          toolbar.appendChild(printBtn);
          doc.body.insertBefore(toolbar, doc.body.firstChild);
        } catch (e) {
          console.error('Failed to attach print toolbar:', e);
        }
      });
    } catch (error) {
      console.error('Failed to view invoice:', error);
      showError('View Failed', (error as Error)?.message || 'Unable to open invoice.');
    }
  };

  const handleDownloadRestockInvoice = async (invoiceId: string) => {
    try {
      const url = `${API_URL}finance/invoices/${encodeURIComponent(invoiceId)}/pdf`;
      const token = getAuthToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error(`Failed to download invoice (${res.status})`);
      }
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const disposition = res.headers.get('content-disposition') || '';
      const fileNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const defaultExt = contentType.includes('pdf') ? 'pdf' : 'html';
      const fallbackName = `${invoiceId}.${defaultExt}`;
      const fileName = fileNameMatch?.[1] || fallbackName;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download invoice:', error);
      showError('Download Failed', (error as Error)?.message || 'Unable to download invoice.');
    }
  };

  const handleShareRestockInvoice = async (invoiceId: string) => {
    const url = `${API_URL}finance/invoices/${encodeURIComponent(invoiceId)}/html`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Restock Invoice ${invoiceId}`,
          text: `Restock Invoice ${invoiceId}`,
          url
        });
        return;
      }
      try {
        await navigator.clipboard.writeText(`Restock Invoice ${invoiceId}: ${url}`);
        showSuccess('Copied', 'Invoice share link copied to clipboard.');
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = `Restock Invoice ${invoiceId}: ${url}`;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccess('Copied', 'Invoice share link copied to clipboard.');
      }
    } catch (error) {
      console.error('Failed to share invoice:', error);
      showError('Share Failed', 'Unable to share invoice.');
    }
  };

  const handleAddStock = async () => {
     if (addMode === 'EXISTING') {
       // Handle multiple items restock
       if (restockExistingForm.items.length === 0) {
         showError("No Items", "Please add at least one product to restock.");
         return;
       }

       const supplierName = restockExistingForm.isNewSupplier ? restockExistingForm.newSupplierName : restockExistingForm.supplierName;
       let supplierId = restockExistingForm.supplierId;

       if (restockExistingForm.isNewSupplier && !restockExistingForm.newSupplierName?.trim()) {
         showError("Missing Supplier Name", "Please enter a supplier name.");
         return;
       }

       try {
         // Create new supplier if needed
         if (restockExistingForm.isNewSupplier && restockExistingForm.newSupplierName?.trim()) {
           try {
             const newSupplier = await api.createEntity({
               name: restockExistingForm.newSupplierName.trim(),
               type: 'SUPPLIER',
               creditLimit: 0,
               currentBalance: 0,
               discountPercentage: 0,
               taxExempt: false,
               status: 'ACTIVE'
             });
             supplierId = newSupplier.id;
             // Add to saved source list without duplicates
             setSuppliers(prev => {
               if (prev.some(entity => entity.id === newSupplier.id)) return prev;
               return [...prev, newSupplier];
             });
           } catch (error) {
             console.error('Error creating supplier:', error);
             showWarning("Supplier Not Saved", "The items will be added but the supplier was not saved for future use. You can create it manually in the Entities section.");
           }
         }

         const normalizedItems = restockExistingForm.items.map((item) => ({
           ...item,
           batchNumber: item.batchNumber || generateBatchNumber(),
           expiryDate: item.expiryDate || ''
         }));

         // Submit all items together when bulk callback exists (single combined invoice on backend).
         if (onAddStockBulk) {
           await onAddStockBulk({
             branchId: currentBranchId,
             supplierId: supplierId || '',
             supplierName: supplierName || '',
             restockStatus: 'RECEIVED',
             items: normalizedItems.map(item => ({
               productId: item.productId,
               batchNumber: item.batchNumber,
               expiryDate: item.expiryDate,
               quantity: item.quantity,
               costPrice: item.costPrice,
               sellingPrice: item.sellingPrice
             }))
           });
         } else {
           for (const item of normalizedItems) {
             const payload = {
               branchId: currentBranchId,
               productId: item.productId,
               batchNumber: item.batchNumber,
               expiryDate: item.expiryDate,
               quantity: item.quantity,
               costPrice: item.costPrice,
               sellingPrice: item.sellingPrice,
               supplierId: supplierId || '',
               supplierName: supplierName || ''
             };
             if (onAddStock) {
               await onAddStock(payload);
             }
           }
         }

         for (const item of normalizedItems) {
           setProducts(prev => prev.map(p =>
             p.id === item.productId
               ? { ...p, costPrice: item.costPrice, price: item.sellingPrice }
               : p
           ));

           setInventory(prev => {
             const branchInventory = prev[currentBranchId] || [];
             const existingItemIndex = branchInventory.findIndex(i => i.productId === item.productId);

             const newBatch = {
               batchNumber: item.batchNumber,
               expiryDate: item.expiryDate,
               quantity: item.quantity,
               status: 'ACTIVE' as BatchStatus
             };

             let updatedList = [...branchInventory];
             if (existingItemIndex >= 0) {
               updatedList[existingItemIndex] = {
                 ...updatedList[existingItemIndex],
                 batches: [...(updatedList[existingItemIndex].batches || []), newBatch],
                 quantity: (updatedList[existingItemIndex].quantity || 0) + item.quantity
               };
             } else {
               updatedList.push({
                 productId: item.productId,
                 quantity: item.quantity,
                 batches: [newBatch]
               });
             }
             return { ...prev, [currentBranchId]: updatedList };
           });
         }

         const results = normalizedItems.map(item => ({ productId: item.productId, quantity: item.quantity }));

         const itemSummary = results.map(r => {
           const product = products.find(p => p.id === r.productId);
           return `${r.quantity} units of ${product?.name || 'Product'}`;
         }).join(', ');

         showSuccess(
           "Stock Added Successfully",
           `Added: ${itemSummary}${supplierName ? ` from ${supplierName}` : ''}`
         );

         // Reset form
         setNewStock({
           productId: '', name: '', genericName: '', category: 'General',
           costPrice: '', price: '', unit: 'Box', minStock: '10',
           batchNumber: '', expiryDate: '', quantity: ''
         });
         setRestockExistingForm({
           items: [],
           supplierId: '',
           supplierName: '',
           isNewSupplier: false,
           newSupplierName: ''
         });
         setCurrentRestockItem({
           productId: '',
           quantity: 0,
           batchNumber: '',
           expiryDate: '',
           costPrice: 0,
           sellingPrice: 0
         });
         setAddMode('EXISTING');
         setShowAddModal(false);
       } catch (error) {
         console.error('Error adding stock (server):', error);
         const status = (error as any)?.status || (error as any)?.response?.status || null;
         if (status === 404) {
           showError("API Route Not Found", "POST /inventory/addStock returned 404. Check backend route or base URL.");
         } else {
           showError("Failed to Add Stock", `Server error: ${(error as Error).message || 'Unknown error'}`);
         }
         showWarning("Partial Update", "Some items may have been updated locally even though the server returned an error.");
         
         setNewStock({
           productId: '', name: '', genericName: '', category: 'General',
           costPrice: '', price: '', unit: 'Box', minStock: '10',
           batchNumber: '', expiryDate: '', quantity: ''
         });
         setRestockExistingForm({
           items: [],
           supplierId: '',
           supplierName: '',
           isNewSupplier: false,
           newSupplierName: ''
         });
         setAddMode('EXISTING');
         setShowAddModal(false);
       }
     } else {
       // Handle new product creation (existing logic)
       const qty = parseInt(newStock.quantity);
       const isNew = addMode === 'NEW';
       const productId = isNew ? `P-${Date.now()}` : newStock.productId;

       // Input validation
       if (!newStock.quantity || qty <= 0 || isNaN(qty)) {
           showError("Invalid Quantity", "Please enter a valid quantity greater than 0.");
           return;
       }

       if (!isNew && !newStock.productId) {
           showError("Missing Product", "Please select a product to restock.");
           return;
       }

       if (isNew) {
           if (!newStock.name?.trim()) {
               showError("Missing Name", "Please provide a product name.");
               return;
           }
           if (!newStock.price || parseFloat(newStock.price) <= 0) {
               showError("Invalid Price", "Please provide a valid selling price.");
               return;
           }
           if (parseFloat(newStock.costPrice) < 0) {
               showError("Invalid Cost", "Cost price cannot be negative.");
               return;
           }
           const newProd: Product = {
               id: productId,
               name: newStock.name.trim(),
               genericName: newStock.genericName?.trim() || '',
               category: newStock.category,
               costPrice: parseFloat(newStock.costPrice) || 0,
               price: parseFloat(newStock.price) || 0,
               unit: newStock.unit,
               minStockLevel: newStock.minStock ? parseInt(newStock.minStock) : 0,
               totalStock: 0,
               requiresPrescription: false,
               batches: []
           };

           try {
               if (onAddProduct) {
                   await onAddProduct(newProd);
               } else {
                   setProducts((prev: Product[]) => [...prev, newProd]);
               }
           } catch (error) {
               console.error('Error creating product:', error);
               showError("Failed to Create Product", "There was an error creating the new product.");
               return;
           }
       }

       // prepare batch data used for both local update and server
       const batchNumber = newStock.batchNumber?.trim() || generateBatchNumber();
       const expiryDate = newStock.expiryDate || '';
       const payload = {
           branchId: currentBranchId,
           productId,
           batchNumber,
           expiryDate,
           quantity: qty
       };

       // helper to update local inventory (used on success or server-fallback)
       const applyLocalInventoryUpdate = () => {
           setInventory(prev => {
               const branchInventory = prev[currentBranchId] || [];
               const existingItemIndex = branchInventory.findIndex(i => i.productId === productId);

               const newBatch = {
                   batchNumber,
                   expiryDate,
                   quantity: qty,
                   status: 'ACTIVE' as BatchStatus
               };

               let updatedList = [...branchInventory];
               if (existingItemIndex >= 0) {
                   updatedList[existingItemIndex] = {
                       ...updatedList[existingItemIndex],
                       batches: [...(updatedList[existingItemIndex].batches || []), newBatch],
                       quantity: (updatedList[existingItemIndex].quantity || 0) + qty
                   };
               } else {
                   updatedList.push({
                       productId,
                       quantity: qty,
                       batches: [newBatch]
                   });
               }
               return { ...prev, [currentBranchId]: updatedList };
           });
       };

       try {
           if (onAddStock) {
               // call user-provided API handler and allow it to throw on non-2xx
               await onAddStock(payload);
           }

           // always apply local update so UI reflects change immediately
           applyLocalInventoryUpdate();

           const prodName = isNew ? newStock.name : products.find(p => p.id === productId)?.name || 'Product';
           showSuccess("Stock Added Successfully", `${qty} units of ${prodName} added to inventory.`);

           // Reset form
           setNewStock({
              productId: '', name: '', genericName: '', category: 'General',
              costPrice: '', price: '', unit: 'Box', minStock: '10',
              batchNumber: '', expiryDate: '', quantity: ''
           });
           setAddMode('EXISTING');
           setShowAddModal(false);
       } catch (error) {
           console.error('Error adding stock (server):', error);

           // detect common HTTP 404 from fetch/XHR wrappers (may vary by implementation)
           const status = (error as any)?.status || (error as any)?.response?.status || null;
           if (status === 404) {
               showError("API Route Not Found", "POST /inventory/addStock returned 404. Check backend route or base URL.");
           } else {
               showError("Failed to Add Stock", `Server error: ${(error as Error).message || 'Unknown error'}`);
           }

           // fallback: apply local update so restock still works in UI
           applyLocalInventoryUpdate();
           showWarning("Local Update Applied", "Inventory updated locally — server was not updated.");
           
           // reset form and keep modal closed (consistent with success flow)
           setNewStock({
              productId: '', name: '', genericName: '', category: 'General',
              costPrice: '', price: '', unit: 'Box', minStock: '10',
              batchNumber: '', expiryDate: '', quantity: ''
           });
           setAddMode('EXISTING');
           setShowAddModal(false);
       }
     }
  };

  const handleDispatch = async () => {
       if (!newShipment.targetBranchId) {
           showError("Missing Destination", "Please select a target branch.");
           return;
       }
       if (newShipment.items.length === 0) {
           showError("Empty Shipment", "Please add at least one item to the shipment.");
           return;
       }

       // Validate quantities
       const invalidItems = newShipment.items.filter(item => item.quantity <= 0);
       if (invalidItems.length > 0) {
           showError("Invalid Quantities", "All items must have quantities greater than 0.");
           return;
       }

       try {
           const shipmentItems = newShipment.items.map(item => {
               const product = products.find(p => p.id === item.productId);
               return {
                   productId: item.productId,
                   productName: item.productName || product?.name || '',
                   quantity: Number(item.quantity) || 0,
                   batchNumber: item.batchNumber || '',
                   expiryDate: item.expiryDate || '',
                   price: Number(item.price) || Number(product?.price) || 0
               };
           });

           const totalValue = shipmentItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

           const response = await api.createDirectShipment({
               fromBranchId: currentBranchId,
               toBranchId: newShipment.targetBranchId,
               status: 'PENDING',
               notes: newShipment.notes?.trim() || '',
               items: shipmentItems,
               totalValue
           });

           // Refresh transfers and shipments from backend so lists stay in sync.
           const [updatedTransfers, refreshedShipments] = await Promise.all([
             api.getTransfers(),
             api.getShipments()
           ]);
           setTransfers(updatedTransfers);
           setShipments(refreshedShipments);

           const transferSummary: StockTransfer = {
               id: response?.shipment?.transferId || '',
               sourceBranchId: currentBranchId,
               targetBranchId: newShipment.targetBranchId,
               dateSent: new Date().toISOString().split('T')[0],
               items: newShipment.items,
               status: 'IN_TRANSIT',
               notes: newShipment.notes?.trim() || ''
           };

           setCreatedTransfer(transferSummary);
           setCreatedShipmentMeta({
               shipmentId: response?.shipment?.id,
               invoiceId: response?.invoice?.id
           });
           setShowTransferModal(false);
           setShowTransferSuccessModal(true);
           // Reset form
           setNewShipment({
               targetBranchId: '',
               notes: '',
               items: []
           });
       } catch (error) {
           console.error('Failed to create transfer:', error);
           let errorMessage = "There was an error saving the shipment data. Please try again.";
           if (error instanceof Error && error.message) {
               const match = error.message.match(/failed:\s*(.*)$/i);
               errorMessage = (match?.[1] || error.message).trim();
           }
           showError("Failed to Create Shipment", errorMessage);
       }
  };

  const addItemToRequisition = () => {
      if (!currentItem.productId || !currentItem.quantity) {
          showError("Missing Fields", "Please select a product and enter quantity.");
          return;
      }

      const quantity = parseInt(currentItem.quantity);
      if (quantity <= 0) {
          showError("Invalid Quantity", "Quantity must be greater than 0.");
          return;
      }

      const selectedProduct = products.find(p => p.id === currentItem.productId);
      if (!selectedProduct) {
          showError("Product Not Found", "Selected product could not be found.");
          return;
      }

      // Check if product is already in the list
      if (requisitionItems.some(item => item.productId === currentItem.productId)) {
          showError("Duplicate Product", "This product is already in your requisition list.");
          return;
      }

      const branchItem = branchStockList.find(inv => inv.productId === currentItem.productId);
      const currentStock = branchItem?.quantity || 0;

      const newItem = {
          productId: currentItem.productId,
          productName: selectedProduct.name,
          quantityRequested: quantity,
          currentStock: currentStock,
          unit: selectedProduct.unit,
          unitPrice: selectedProduct.price,
          notes: `Current stock: ${currentStock} ${selectedProduct.unit}`
      };

      setRequisitionItems([...requisitionItems, newItem]);
      setCurrentItem({ productId: '', quantity: '' });
      showSuccess("Item Added", `${selectedProduct.name} added to requisition.`);
  };

  const removeItemFromRequisition = (productId: string) => {
      setRequisitionItems(requisitionItems.filter(item => item.productId !== productId));
  };

  const handleRequestStock = async () => {
      if (requisitionItems.length === 0) {
          showError("Empty Requisition", "Please add at least one item to your requisition.");
          return;
      }

      // Determine priority based on items
      const hasUrgentItems = requisitionItems.some(item => item.currentStock === 0);
      const priority = hasUrgentItems ? 'URGENT' : 'NORMAL';
      const headOfficeBranch = branches.find((b) => b.isHeadOffice);
      const headOfficeBranchId = headOfficeBranch?.id || 'HEAD_OFFICE';
      const headOfficeName = headOfficeBranch
        ? getBranchDisplayName(headOfficeBranch.id, headOfficeBranch.name)
        : 'Head Office 👑';

      // Create requisition payload - store requesting branch
      const requisitionData = {
        id: `REQ-${Date.now()}`,
        branchId: currentBranchId,
        targetBranchId: headOfficeBranchId,
        requestedBy: currentUser?.id || 'Unknown',
        items: requisitionItems.map(item => ({
          productId: item.productId,
          quantityRequested: item.quantityRequested,
          notes: item.notes
        })),
        notes: `Stock requisition with ${requisitionItems.length} items`,
        priority: priority
      };

      try {
          // Send to backend
          const requisitionResponse = await api.request('/requisitions', {
              method: 'POST',
              body: JSON.stringify(requisitionData)
          });

          const totalItems = requisitionItems.reduce((sum, item) => sum + item.quantityRequested, 0);
          const totalValue = requisitionItems.reduce((sum, item) => sum + (item.quantityRequested * item.unitPrice), 0);

          showSuccess("Stock Requisition Submitted",
              `Requisition with ${requisitionItems.length} items (${totalItems} units total, estimated value: ${fmtCurrency(totalValue)} TZS) has been sent to ${headOfficeName} for approval.`,
              8000
          );
          if (requisitionResponse?.invoiceId) {
              showInfo('Requisition Invoice', `Invoice ${requisitionResponse.invoiceId} created automatically.`);
          }

          setShowRequestModal(false);
          setRequisitionItems([]);
          setCurrentItem({ productId: '', quantity: '' });
          setIsLoadingRequestHistory(true);
          await refreshRequisitions();
      } catch (error) {
          console.error('Failed to submit requisition:', error);
          showError("Submission Failed", "There was an error submitting your requisition. Please try again.");
      }
  };

  const handleVerifyTransfer = async () => {
      if ((verifyStep === 'KEEPER' && !canKeeperVerify) || (verifyStep === 'CONTROLLER' && !canControllerVerify)) {
          setVerifyError('You are not allowed to verify this shipment.');
          showError('Access Denied', 'You are not allowed to verify this shipment.');
          return;
      }
      if (!activeTransferId) {
          setVerifyError('Missing transfer ID.');
          showError('Verification Failed', 'Missing transfer ID.');
          return;
      }
      if (!activeTransferForVerification) {
          setVerifyError('Unable to load shipment contents for this transfer.');
          showError('Verification Failed', 'Unable to load shipment contents for this transfer. Please refresh and try again.');
          return;
      }
      if (!hasReviewedShipmentContents) {
          setVerifyError('Please review shipment contents before verifying.');
          showError('Review Required', 'Please review shipment contents before verifying.');
          return;
      }

      try {
          let verifiedTransfer: StockTransfer | null = null;
          if (verifyStep === 'KEEPER') {
              verifiedTransfer = await api.verifyTransferByStoreKeeper(activeTransferId);
          } else if (verifyStep === 'CONTROLLER') {
              verifiedTransfer = await api.verifyTransferByController(activeTransferId);
          }

          const [updatedTransfers, refreshedInventory, refreshedShipments] = await Promise.all([
              api.getTransfers(),
              api.getInventory(currentBranchId),
              api.getShipments()
          ]);

          setTransfers(prev => {
              const base = updatedTransfers.length > 0 ? updatedTransfers : prev;
              if (!verifiedTransfer?.id) return base;
              const idx = base.findIndex(t => t.id === verifiedTransfer!.id);
              if (idx >= 0) {
                  const next = [...base];
                  next[idx] = { ...next[idx], ...verifiedTransfer };
                  return next;
              }
              return [verifiedTransfer, ...base];
          });
          setInventory(prev => ({ ...prev, ...refreshedInventory }));
          setShipments(prev => {
              const base = refreshedShipments.length > 0 ? refreshedShipments : prev;
              if (!verifiedTransfer?.id) return base;
              return base.map(shipment => {
                  const sameTransfer = normalizeIdKey(shipment.transferId || shipment.id) === normalizeIdKey(verifiedTransfer!.id);
                  if (!sameTransfer) return shipment;
                  return {
                      ...shipment,
                      // Keep shipment status model valid while transfer drives workflow step.
                      status: verifiedTransfer!.status === 'COMPLETED' ? 'DELIVERED' : shipment.status,
                      items: (shipment.items && shipment.items.length > 0)
                        ? shipment.items
                        : (verifiedTransfer!.items || []).map(item => ({
                            productId: item.productId,
                            productName: item.productName || products.find(p => p.id === item.productId)?.name || 'Unknown Product',
                            quantity: Number(item.quantity || 0)
                          }))
                  };
              });
          });

          setVerifyError('');
          setShowVerifyModal(false);
          setHasReviewedShipmentContents(false);

          if (verifyStep === 'KEEPER') {
              showSuccess("Keeper Verification Successful", "Shipment confirmed. Awaiting controller verification.");
          } else {
              showSuccess("Controller Verification Complete", "Stock has been fully verified.");
          }
      } catch (error) {
          console.error('Transfer verification failed:', error);
          const message = error instanceof Error ? error.message : 'Failed to verify transfer.';
          setVerifyError(message);
          showError('Verification Failed', message);
      }
   };

  const openRejectTransferModal = (transferId: string, step: 'KEEPER' | 'CONTROLLER') => {
      setRejectTransferId(transferId.trim());
      setRejectStep(step);
      setRejectReason('');
      setShowRejectModal(true);
  };

  const handleRejectTransfer = async () => {
      if ((rejectStep === 'KEEPER' && !canKeeperVerify) || (rejectStep === 'CONTROLLER' && !canControllerVerify)) {
          showError('Access Denied', 'You are not allowed to reject this shipment.');
          return;
      }
      if (!rejectTransferId) {
          showError('Rejection Failed', 'Missing transfer ID.');
          return;
      }
      setIsRejectingTransfer(true);
      try {
          const rejectedTransfer = await api.rejectTransfer(rejectTransferId, { step: rejectStep, reason: rejectReason.trim() });
          const [updatedTransfers, refreshedShipments] = await Promise.all([
              api.getTransfers(),
              api.getShipments()
          ]);

          setTransfers(prev => {
              const base = updatedTransfers.length > 0 ? updatedTransfers : prev;
              if (!rejectedTransfer?.id) return base;
              return base.map(t => normalizeIdKey(t.id) === normalizeIdKey(rejectedTransfer.id) ? { ...t, ...rejectedTransfer } : t);
          });
          if (refreshedShipments.length > 0) {
              setShipments(refreshedShipments);
          }

          setShowRejectModal(false);
          setRejectTransferId(null);
          setRejectReason('');
          showWarning('Shipment Rejected', `Transfer ${rejectTransferId} has been rejected.`);
      } catch (error) {
          console.error('Failed to reject transfer:', error);
          const message = error instanceof Error ? error.message : 'Failed to reject transfer.';
          showError('Rejection Failed', message);
      } finally {
          setIsRejectingTransfer(false);
      }
  };

  const parseCSV = (csvText: string): any[] => {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) return [];

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                  inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                  values.push(current.trim());
                  current = '';
              } else {
                  current += char;
              }
          }
          values.push(current.trim()); // Add the last value

          if (values.length === headers.length) {
              const row: any = {};
              headers.forEach((header, index) => {
                  row[header] = values[index];
              });
              data.push(row);
          }
      }
      return data;
  };

  const validateImportData = (data: any[]): { errors: string[], duplicates: any[] } => {
      const errors: string[] = [];
      const duplicates: any[] = [];
      const requiredFields = ['name', 'price'];

      data.forEach((row, index) => {
          const rowNum = index + 2; // +2 because of 0-index and header

          // Check required fields
          requiredFields.forEach(field => {
              if (!row[field] || row[field].trim() === '') {
                  errors.push(`Row ${rowNum}: Missing required field '${field}'`);
              }
          });

          // Validate price
          if (row.price) {
              const price = parseFloat(row.price);
              if (isNaN(price) || price <= 0) {
                  errors.push(`Row ${rowNum}: Invalid price '${row.price}' - must be a positive number`);
              }
          }

          // Validate cost price if provided
          if (row.costprice || row['cost price'] || row['cost_price']) {
              const costPrice = parseFloat(row.costprice || row['cost price'] || row['cost_price']);
              if (!isNaN(costPrice) && costPrice < 0) {
                  errors.push(`Row ${rowNum}: Cost price cannot be negative`);
              }
          }

          // Validate min stock if provided
          if (row.minstock || row['min stock'] || row['min_stock']) {
              const minStock = parseInt(row.minstock || row['min stock'] || row['min_stock']);
              if (!isNaN(minStock) && minStock < 0) {
                  errors.push(`Row ${rowNum}: Minimum stock cannot be negative`);
              }
          }

          // Check for duplicates
          if (row.name && row.name.trim()) {
              const existingProduct = products.find(p =>
                  p.name.toLowerCase().trim() === row.name.toLowerCase().trim()
              );
              if (existingProduct) {
                  duplicates.push({
                      rowIndex: index,
                      rowNum: rowNum,
                      productName: row.name.trim(),
                      existingProduct: existingProduct
                  });
              }
          }
      });

      return { errors, duplicates };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.csv')) {
          showError("Invalid File", "Please select a CSV file.");
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          const csvText = e.target?.result as string;
          const data = parseCSV(csvText);
          const { errors, duplicates } = validateImportData(data);

          setBulkImportFile(file);
          setBulkImportData(data);
          setBulkImportErrors(errors);
          setBulkImportDuplicates(duplicates);
          setDuplicateAction(null); // Reset duplicate action
      };
      reader.readAsText(file);
  };

  const handleBulkImport = async () => {
      if (bulkImportErrors.length > 0) {
          showError("Validation Errors", "Please fix the errors before importing.");
          return;
      }

      if (bulkImportData.length === 0) {
          showError("No Data", "No valid data found to import.");
          return;
      }

      // Check if we have duplicates and no action chosen
      if (bulkImportDuplicates.length > 0 && !duplicateAction) {
          showError("Duplicate Products Found", "Please choose how to handle duplicate products.");
          return;
      }

      setIsImporting(true);

      try {
          // Prepare products for bulk import
          const productsToImport: Partial<Product>[] = bulkImportData.map((row, index) => {
              // Check if this is a duplicate and handle according to user choice
              const isDuplicate = bulkImportDuplicates.some(d => d.rowIndex === index);
              if (isDuplicate && duplicateAction === 'skip') {
                  return null; // Skip
              }

              return {
                  id: isDuplicate && duplicateAction === 'replace'
                      ? bulkImportDuplicates.find(d => d.rowIndex === index)!.existingProduct.id
                      : `P-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`, // Generate unique ID
                  name: row.name.trim(),
                  genericName: (row.genericname || row['generic name'] || row['generic_name'] || '').trim(),
                  category: (row.category || 'General').trim(),
                  costPrice: parseFloat(row.costprice || row['cost price'] || row['cost_price'] || '0') || 0,
                  price: parseFloat(row.price),
                  unit: (row.unit || 'Box').trim(),
                  minStockLevel: parseInt(row.minstock || row['min stock'] || row['min_stock'] || '10') || 10,
                  totalStock: 0,
                  requiresPrescription: (row.requiresprescription || row['requires prescription'] || row['requires_prescription'] || 'false').toLowerCase() === 'true',
                  batches: []
              };
          }).filter(p => p !== null) as Partial<Product>[];

          // Use bulk import API
          const result = await api.bulkImportProducts(productsToImport);

          let message = `Imported ${result.results.successful} products successfully`;
          if (result.results.failed > 0) message += `, ${result.results.failed} failed`;
          if (bulkImportDuplicates.length > 0 && duplicateAction === 'skip') {
              const skipped = bulkImportDuplicates.length;
              message += `, ${skipped} skipped (duplicates)`;
          }

          showSuccess("Bulk Import Complete", message);

          // Refresh products list
          const updatedProducts = await api.getProducts();
          setProducts(updatedProducts);

          // Reset modal
          setShowBulkImportModal(false);
          setBulkImportFile(null);
          setBulkImportData([]);
          setBulkImportErrors([]);
          setBulkImportDuplicates([]);
          setDuplicateAction(null);

      } catch (error) {
          showError("Import Failed", "An error occurred during bulk import.");
      } finally {
          setIsImporting(false);
      }
  };

   // Merge Product Data with Branch Inventory Data
   const mergedInventory = useMemo(() => {
     return products.map(p => {
       const branchItem = branchStockList.find(i => i.productId === p.id);
       const totalQty = branchItem ? branchItem.quantity : 0;
       const branchPrice = branchItem?.customPrice || p.price;
       const batches = branchItem?.batches || [];

       const assetValue = totalQty * p.costPrice;
       const retailValue = totalQty * branchPrice;

       return { ...p, quantity: totalQty, branchPrice, batches, assetValue, retailValue };
     });
   }, [products, branchStockList, inventory, currentBranchId]);

   const normalizedUserRole = String(currentUser?.role || '').toUpperCase().replace(/\s+/g, '_');
   const isSuperAdmin = normalizedUserRole === UserRole.SUPER_ADMIN;
   const isBranchManager = normalizedUserRole === UserRole.BRANCH_MANAGER;
   const isStoreKeeperRole = normalizedUserRole === UserRole.STOREKEEPER || normalizedUserRole === 'STORE_KEEPER';
   const isInventoryControllerRole = normalizedUserRole === UserRole.INVENTORY_CONTROLLER;
   const effectiveBranchId = String(isSuperAdmin ? currentBranchId : (currentUser?.branchId || currentBranchId));
   const canKeeperVerify = isStoreKeeperRole;
   const canControllerVerify = isInventoryControllerRole;
   const incomingTransfers = isSuperAdmin
     ? transfers
     : transfers.filter(t => branchIdsMatch(t.targetBranchId, effectiveBranchId));
   const incomingTransferWorkflowStatus = React.useCallback((transfer: StockTransfer) => {
     const transferStatus = normalizeTransferStatus(transfer.status);
     const keeperVerified = Boolean(transfer.verifiedBy?.storeKeeper);
     const controllerVerified = Boolean(transfer.verifiedBy?.inventoryController);
     return controllerVerified || transferStatus === 'COMPLETED'
       ? 'COMPLETED'
       : keeperVerified
         ? 'RECEIVED_KEEPER'
         : transferStatus;
   }, []);
   const activeIncomingTransfers = useMemo(
     () => incomingTransfers.filter((transfer) => incomingTransferWorkflowStatus(transfer) !== 'COMPLETED'),
     [incomingTransfers, incomingTransferWorkflowStatus]
   );
   const newUnverifiedIncomingTransfers = useMemo(
     () => incomingTransfers.filter((transfer) => {
       const transferStatus = normalizeTransferStatus(transfer.status);
       const keeperVerified = Boolean(transfer.verifiedBy?.storeKeeper);
       const controllerVerified = Boolean(transfer.verifiedBy?.inventoryController);
       return transferStatus !== 'COMPLETED' && transferStatus !== 'REJECTED' && (!keeperVerified || !controllerVerified);
     }),
     [incomingTransfers]
   );
   const shouldShowNewTransferIndicator =
     (isStoreKeeperRole || isInventoryControllerRole) && newUnverifiedIncomingTransfers.length > 0;
   const completedIncomingTransfers = useMemo(
     () => incomingTransfers.filter((transfer) => incomingTransferWorkflowStatus(transfer) === 'COMPLETED'),
     [incomingTransfers, incomingTransferWorkflowStatus]
   );
   const outgoingTransfers = isSuperAdmin
     ? []
     : transfers.filter(t => branchIdsMatch(t.sourceBranchId, effectiveBranchId));
   const managedShipmentsBase = useMemo(() => {
	     return shipments
	       .filter(s => {
	         const isIncoming = branchIdsMatch(s.toBranchId, effectiveBranchId);
	         const isOutgoing = branchIdsMatch(s.fromBranchId, effectiveBranchId);
	         return isIncoming || isOutgoing || isSuperAdmin;
	       })
	       .map(s => {
	         const isIncoming = branchIdsMatch(s.toBranchId, effectiveBranchId);
	         const isOutgoing = branchIdsMatch(s.fromBranchId, effectiveBranchId);
	         const direction = isIncoming ? 'INCOMING' : isOutgoing ? 'OUTGOING' : 'NETWORK';
	         const normalizedStatus = normalizeShipmentStatus(s.status);
	         const relatedTransfer = transfers.find(t => normalizeIdKey(t.id) === normalizeIdKey(s.transferId || s.id)) || null;
	         const shipmentItems = Array.isArray(s.items) ? s.items : [];
	         const fallbackTransferItems = Array.isArray(relatedTransfer?.items)
	           ? relatedTransfer.items.map((item: any) => ({
	               productId: item?.productId || '',
	               productName:
	                 item?.productName
	                 || products.find(p => p.id === item?.productId)?.name
	                 || 'Unknown Product',
	               quantity: Number(item?.quantity || 0)
	             }))
	           : [];
	         const items = shipmentItems.length > 0 ? shipmentItems : fallbackTransferItems;
	         const totalQuantity = items.reduce((sum, item) => sum + (item?.quantity || 0), 0);
	         const fromBranchName = getBranchDisplayName(s.fromBranchId);
	         const toBranchName = getBranchDisplayName(s.toBranchId);
         const createdAtTs = s.createdAt ? new Date(s.createdAt).getTime() : 0;
         return {
           shipment: s,
           items,
           totalQuantity,
           normalizedStatus,
           direction,
           fromBranchName,
           toBranchName,
           createdAtTs,
           relatedTransfer
         };
       });
	   }, [shipments, effectiveBranchId, isSuperAdmin, branches, transfers, products]);
   const managedShipments = useMemo(() => {
     const query = shipmentSearchQuery.trim().toLowerCase();
     const filtered = managedShipmentsBase.filter(entry => {
       const matchesStatus = shipmentStatusFilter === 'ALL' || entry.normalizedStatus === shipmentStatusFilter;
       const matchesDirection = shipmentDirectionFilter === 'ALL' || entry.direction === shipmentDirectionFilter;
       const matchesQuery = !query
         || entry.shipment.id.toLowerCase().includes(query)
         || (entry.shipment.notes || '').toLowerCase().includes(query)
         || entry.fromBranchName.toLowerCase().includes(query)
         || entry.toBranchName.toLowerCase().includes(query)
         || entry.items.some(item => (item?.productName || '').toLowerCase().includes(query));
       return matchesStatus && matchesDirection && matchesQuery;
     });

     filtered.sort((a, b) => {
       if (shipmentSortBy === 'NEWEST') {
         const recentCutoff = Date.now() - (3 * 24 * 60 * 60 * 1000);
         const isAttentionNeeded = (entry: typeof filtered[number]) => {
           const transfer = entry.relatedTransfer;
           const transferStatus = normalizeTransferStatus(transfer?.status || entry.shipment.status);
           const keeperVerified = Boolean(transfer?.verifiedBy?.storeKeeper);
           const controllerVerified = Boolean(transfer?.verifiedBy?.inventoryController);
           return (
             transferStatus === 'IN_TRANSIT'
             || transferStatus === 'RECEIVED_KEEPER'
             || !keeperVerified
             || !controllerVerified
           );
         };
         const getPriorityBucket = (entry: typeof filtered[number]) => {
           if (entry.createdAtTs >= recentCutoff) return 0;
           if (isAttentionNeeded(entry)) return 1;
           return 2;
         };
         const aBucket = getPriorityBucket(a);
         const bBucket = getPriorityBucket(b);
         if (aBucket !== bBucket) return aBucket - bBucket;
         return b.createdAtTs - a.createdAtTs;
       }
       if (shipmentSortBy === 'OLDEST') return a.createdAtTs - b.createdAtTs;
       if (shipmentSortBy === 'VALUE_HIGH') return (b.shipment.totalValue || 0) - (a.shipment.totalValue || 0);
       if (shipmentSortBy === 'VALUE_LOW') return (a.shipment.totalValue || 0) - (b.shipment.totalValue || 0);
       if (shipmentSortBy === 'ITEMS_HIGH') return b.totalQuantity - a.totalQuantity;
       if (shipmentSortBy === 'ITEMS_LOW') return a.totalQuantity - b.totalQuantity;
       return b.createdAtTs - a.createdAtTs;
     });

     return filtered;
   }, [managedShipmentsBase, shipmentSearchQuery, shipmentStatusFilter, shipmentDirectionFilter, shipmentSortBy]);
   const transfersById = useMemo(() => {
     const map = new Map<string, StockTransfer>();
     transfers.forEach((transfer) => {
       map.set(normalizeIdKey(transfer.id), transfer);
     });
     return map;
   }, [transfers]);
  const managedShipmentSummary = useMemo(() => {
     return managedShipments.reduce(
       (acc, entry) => {
         acc.total += 1;
         acc.totalValue += entry.shipment.totalValue || 0;
         if (entry.normalizedStatus === 'PENDING') acc.pending += 1;
         if (entry.normalizedStatus === 'APPROVED') acc.approved += 1;
         if (entry.normalizedStatus === 'IN_TRANSIT') acc.inTransit += 1;
         if (entry.normalizedStatus === 'DELIVERED') acc.delivered += 1;
         if (entry.normalizedStatus === 'REJECTED') acc.rejected += 1;
         return acc;
       },
       { total: 0, pending: 0, approved: 0, inTransit: 0, delivered: 0, rejected: 0, totalValue: 0 }
     );
  }, [managedShipments]);
  const activeTransferForVerification = useMemo(() => {
    if (!activeTransferId) return null;
    return transfers.find(t => normalizeIdKey(t.id) === normalizeIdKey(activeTransferId)) || null;
  }, [activeTransferId, transfers]);
  const totalAssetValue = mergedInventory.reduce((acc, i) => acc + (i.assetValue || 0), 0);
  const totalRetailValue = mergedInventory.reduce((acc, i) => acc + (i.retailValue || 0), 0);
  const openVerifyModal = (transferId: string, step: 'KEEPER' | 'CONTROLLER') => {
    setActiveTransferId(transferId.trim());
    setVerifyStep(step);
    setHasReviewedShipmentContents(false);
    setShowVerifyModal(true);
  };

   // Filtered inventory based on search and filters
   const filteredInventory = useMemo(() => {
     return mergedInventory.filter(item => {
       const matchesSearch = searchQuery === '' ||
         item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.category.toLowerCase().includes(searchQuery.toLowerCase());

       const matchesCategory = categoryFilter === '' || item.category === categoryFilter;

       let matchesStock = true;
       if (stockFilter === 'low') {
         matchesStock = item.quantity <= item.minStockLevel;
       } else if (stockFilter === 'normal') {
         matchesStock = item.quantity > item.minStockLevel && item.quantity <= item.minStockLevel * 2;
       } else if (stockFilter === 'high') {
         matchesStock = item.quantity > item.minStockLevel * 2;
       }

       return matchesSearch && matchesCategory && matchesStock;
     });
   }, [mergedInventory, searchQuery, categoryFilter, stockFilter]);

   return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Inventory Management</h2>
          <p className="text-sm md:text-base text-slate-500 mt-1">
             {isHeadOffice ? 'Global Stock Overview' : `Managing stock for ${branchName}`}
           </p>
         </div>
         <div className="flex gap-2 flex-wrap w-full md:w-auto">
             {isHeadOffice ? (
                 <>
                 <button
                   onClick={() => setShowAddModal(true)}
                   className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-700 font-semibold shadow-lg"
                 >
                   <Plus size={18} /> Add New Product
                 </button>
                 <div className="relative w-full sm:w-auto">
                   <button
                     onClick={() => setShowTransferModal(true)}
                     className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 font-semibold shadow-lg relative"
                     title="Create new shipment (Ctrl+Shift+S)"
                   >
                     <Truck size={18} />
                     New Shipment
                    {shouldShowNewTransferIndicator && (
                      <span
                        className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"
                        title="New unverified shipments"
                      />
                    )}
                   </button>

                   {/* Quick Actions Dropdown */}
                   <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[200px] z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                     <button
                       onClick={() => setShowTransferModal(true)}
                       className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3 text-sm"
                     >
                       <Truck size={16} className="text-blue-600" />
                       <div>
                         <div className="font-medium text-slate-800">New Shipment</div>
                         <div className="text-xs text-slate-500">Create transfer to branch</div>
                       </div>
                     </button>
                     <button
                       onClick={() => showInfo("Bulk Transfer", "Bulk transfer functionality will be implemented soon.")}
                       className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3 text-sm"
                     >
                       <Layers size={16} className="text-emerald-600" />
                       <div>
                         <div className="font-medium text-slate-800">Bulk Transfer</div>
                         <div className="text-xs text-slate-500">Transfer multiple items</div>
                       </div>
                     </button>
                     <button
                       onClick={() => showInfo("Scheduled Transfer", "Scheduled transfers will be implemented soon.")}
                       className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3 text-sm"
                     >
                       <History size={16} className="text-purple-600" />
                       <div>
                         <div className="font-medium text-slate-800">Scheduled</div>
                         <div className="text-xs text-slate-500">Plan future transfers</div>
                       </div>
                     </button>
                   </div>
                 </div>
                 <button
                   onClick={() => setShowBulkImportModal(true)}
                   className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-600 text-white text-sm rounded-xl hover:bg-slate-700 font-semibold shadow-lg"
                 >
                   <Download size={18} /> Bulk Import
                 </button>
                 {currentUser?.role === 'SUPER_ADMIN' && (
                   <button
                     onClick={async () => {
                       if (window.confirm('Are you sure you want to clear ALL products from the database? This action cannot be undone and will also clear all related inventory, sales, and transfer data.')) {
                         try {
                           const result = await api.clearAllProducts();
                           setProducts([]);
                           setInventory({});
                           showSuccess('All Products Cleared', `Successfully cleared ${result.deletedCount} products and all related data from the database.`);
                         } catch (error) {
                           console.error('Failed to clear products:', error);
                           showError('Clear Failed', 'There was an error clearing the products. Please try again.');
                         }
                       }
                     }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 font-semibold shadow-lg"
                    title="Clear all products (Super Admin only)"
                  >
                    <Archive size={18} /> Clear All Products
                  </button>
                 )}
                 </>
             ) : (
                 <>
                 <button
                   onClick={() => setShowRequestModal(true)}
                   className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 font-semibold shadow-lg"
                 >
                   <FilePlus size={18} /> Request Stock
                 </button>
                 <button
                   onClick={() => showInfo("Quick Stock Entry", "Quick stock entry modal will be implemented soon.")}
                   className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 font-semibold shadow-lg"
                 >
                   <PackagePlus size={18} /> Quick Add
                 </button>
                 <button
                   onClick={handleMsdSync}
                   disabled={isSyncingMSD}
                   className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm rounded-xl hover:bg-slate-50 font-semibold disabled:opacity-70"
                 >
                   {isSyncingMSD ? <Loader className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
                   Sync MSD
                 </button>
                 </>
             )}
         </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-full">
                  <Package size={20} />
              </div>
              <div>
                  <p className="text-xs text-slate-500 font-medium">Total SKU Count</p>
                  <h3 className="text-xl font-bold text-slate-900">{products.length}</h3>
                  <p className="text-xs text-slate-400">Active products</p>
              </div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <DollarSign size={20} />
              </div>
              <div>
                  <p className="text-xs text-slate-500 font-medium">Total Asset Value</p>
                  <h3 className="text-xl font-bold text-slate-900">{fmtCurrency(totalAssetValue)} TZS</h3>
                  <p className="text-xs text-slate-400">Cost Basis</p>
              </div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                  <TrendingUp size={20} />
              </div>
              <div>
                  <p className="text-xs text-slate-500 font-medium">Projected Revenue</p>
                  <h3 className="text-xl font-bold text-slate-900">{fmtCurrency(totalRetailValue)} TZS</h3>
                  <p className="text-xs text-slate-400">Retail Basis</p>
              </div>
          </div>
           <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                  <AlertTriangle size={20} />
              </div>
              <div>
                  <p className="text-xs text-slate-500 font-medium">Low Stock Alerts</p>
                  <h3 className="text-xl font-bold text-slate-900">{mergedInventory.filter(i => i.quantity <= i.minStockLevel).length}</h3>
                  <p className="text-xs text-slate-400">Need attention</p>
              </div>
          </div>
       </div>

       <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
           <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'stock' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
               <Package size={16} /> Current Stock
           </button>
           <button
              onClick={() => setActiveTab('transfers')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'transfers' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
               <Truck size={16} /> Transfers
              {shouldShowNewTransferIndicator && <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" title="New unverified shipments" />}
           </button>
           <button
              onClick={() => showInfo("Analytics", "Inventory analytics will be implemented soon.")}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap text-slate-500 hover:text-slate-700`}
           >
               <TrendingUp size={16} /> Analytics
           </button>
           <button
              onClick={handleExportPDF}
              className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap text-slate-500 hover:text-slate-700"
              title="Export to PDF"
           >
               <FileText size={16} /> Export PDF
           </button>
           <button
              onClick={handleExportExcel}
              className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap text-slate-500 hover:text-slate-700"
              title="Export to Excel"
           >
               <BarChart3 size={16} /> Export Excel
           </button>
           <button
              onClick={handleOpenRestockInvoices}
              className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap text-slate-500 hover:text-slate-700"
              title="View Restock Invoices"
           >
               <FilePlus size={16} /> Restock Invoices
           </button>
       </div>

       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {activeTab === 'stock' && (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                   {!isHeadOffice && (
                     <div className="p-4 border-b border-slate-100 bg-slate-50">
                       <div className="flex items-center justify-between mb-3">
                         <h3 className="font-bold text-slate-800">Request Stock Status</h3>
                         <button
                           onClick={refreshRequisitions}
                           className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                         >
                           Refresh
                         </button>
                       </div>
                       {isLoadingRequestHistory ? (
                         <p className="text-sm text-slate-500">Loading requests...</p>
                       ) : requestHistory.length === 0 ? (
                         <p className="text-sm text-slate-500">No submitted stock requests yet.</p>
                       ) : (
                         <div className="space-y-2 max-h-48 overflow-y-auto">
                           {requestHistory.map((req) => {
                             const status = String(req?.status || 'PENDING').toUpperCase();
                             const statusClass =
                               status === 'APPROVED'
                                 ? 'bg-emerald-100 text-emerald-700'
                                 : status === 'REJECTED'
                                   ? 'bg-red-100 text-red-700'
                                   : 'bg-amber-100 text-amber-700';
                             const requestedAt = req?.requestDate || req?.created_at || '';
                             const itemCount = Array.isArray(req?.items) ? req.items.length : Number(req?.total_items || 0);
                             return (
                               <div key={req.id} className="bg-white border border-slate-200 rounded-lg p-3">
                                 <div className="flex items-center justify-between gap-3">
                                   <div>
                                     <p className="text-sm font-semibold text-slate-800">{req.id}</p>
                                     <p className="text-xs text-slate-500">
                                       {itemCount} item(s) • {requestedAt ? new Date(requestedAt).toLocaleString() : 'No date'}
                                     </p>
                                   </div>
                                   <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusClass}`}>
                                     {status}
                                   </span>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   )}
                   {/* Table Controls */}
                   <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50">
                       <div className="flex items-center justify-between">
                           <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-4">
                               <div className="flex items-center gap-2 w-full lg:w-auto">
                                   <Search size={16} className="text-slate-400" />
                                   <input
                                       type="text"
                                       placeholder="Search products..."
                                       value={searchQuery}
                                       onChange={(e) => setSearchQuery(e.target.value)}
                                       className="w-full lg:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                   />
                               </div>
                               <select
                                   value={categoryFilter}
                                   onChange={(e) => setCategoryFilter(e.target.value)}
                                   className="w-full lg:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                               >
                                   <option value="">All Categories</option>
                                   {[...new Set(products.map(p => p.category))].map(cat => (
                                       <option key={cat} value={cat}>{cat}</option>
                                   ))}
                               </select>
                               <select
                                   value={stockFilter}
                                   onChange={(e) => setStockFilter(e.target.value)}
                                   className="w-full lg:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                               >
                                   <option value="">All Stock Levels</option>
                                   <option value="low">Low Stock</option>
                                   <option value="normal">Normal</option>
                                   <option value="high">High Stock</option>
                               </select>
                           </div>
                       </div>
                   </div>

                   <div className="overflow-x-auto">
                   <table className="w-full min-w-[920px] text-left">
                       <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                           <tr>
                               <th className="px-4 py-3 text-center">
                                   <input type="checkbox" className="rounded border-slate-300" />
                               </th>
                               <th className="px-4 py-3">Product Details</th>
                               <th className="px-4 py-3 text-center">Unit</th>
                               <th className="px-4 py-3 text-center">Stock Status</th>
                               <th className="px-4 py-3">Pricing</th>
                               <th className="px-4 py-3 text-center">Evaluation</th>
                               <th className="px-4 py-3 text-center">Actions</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {filteredInventory.map(item => (
                               <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 text-center">
                                      <input type="checkbox" className="rounded border-slate-300" />
                                  </td>

                                  {/* Product Information */}
                                  <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                                              <Package size={18} className="text-teal-600" />
                                          </div>
                                          <div>
                                              <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                                              <div className="text-xs text-slate-400">{item.genericName}</div>
                                              <div className="text-xs text-slate-500">{item.category}</div>
                                          </div>
                                      </div>
                                  </td>

                                  {/* Unit of Measure */}
                                  <td className="px-4 py-3 text-center">
                                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                          {item.unit}
                                      </span>
                                  </td>

                                  {/* Current Stock */}
                                  <td className="px-4 py-3 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                          {item.quantity <= item.minStockLevel ? (
                                              <div className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded-full text-xs">
                                                  <AlertTriangle size={10} />
                                                  {item.quantity}
                                              </div>
                                          ) : (
                                              <div className="font-bold text-slate-700 text-sm">{item.quantity}</div>
                                          )}
                                          <div className="text-xs text-slate-400">Min: {item.minStockLevel}</div>
                                      </div>
                                  </td>

                                  {/* Pricing Information */}
                                  <td className="px-4 py-3">
                                      <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-500">Cost:</span>
                                              <span className="font-mono text-xs text-slate-600">{fmtNumber(item.costPrice)}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-500">Sell:</span>
                                              <span className="font-bold text-teal-700 text-sm">{fmtNumber(item.branchPrice)}</span>
                                              {item.branchPrice !== item.price && (
                                                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">Custom</span>
                                              )}
                                          </div>
                                      </div>
                                  </td>

                                  {/* Evaluation Column */}
                                  <td className="px-4 py-3 text-center">
                                      <div className="space-y-1">
                                          <div className="text-xs text-slate-500 font-medium">Asset Value</div>
                                          <div className="font-bold text-slate-700">{fmtCurrency(item.assetValue)} TZS</div>
                                          <div className="text-xs text-slate-500 font-medium">Est. Revenue</div>
                                          <div className="font-bold text-emerald-600">{fmtCurrency(item.retailValue)} TZS</div>
                                      </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="px-4 py-3 text-center">
                                      <div className="flex items-center justify-center gap-1 relative group">
                                          {/* View Details Button */}
                                          <button
                                              onClick={() => {
                                                  setSelectedProductForDetails(item);
                                                  setShowProductDetailsModal(true);
                                              }}
                                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                              title="View Details"
                                          >
                                              <Eye size={16} />
                                          </button>

                                          {/* Set Price Button */}
                                          {isSuperAdmin && (
                                              <button
                                                  onClick={() => {
                                                      setPriceModalData({ product: item, newPrice: item.branchPrice?.toString() || '' });
                                                      setShowPriceModal(true);
                                                  }}
                                                  className="p-2 text-teal-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                  title="Set Selling Price"
                                              >
                                                  <Tag size={16} />
                                              </button>
                                          )}

                                          {/* Add Stock Button */}
                                          {(isSuperAdmin || isBranchManager || isStoreKeeperRole) && (
                                              <button
                                                  onClick={() => {
                                                      // Reset form first
                                                      setNewStock({
                                                          productId: item.id,
                                                          name: '',
                                                          genericName: '',
                                                          category: 'General',
                                                          costPrice: '',
                                                          price: '',
                                                          unit: 'Box',
                                                          minStock: '10',
                                                          batchNumber: '',
                                                          expiryDate: '',
                                                          quantity: ''
                                                      });
                                                      setAddMode('EXISTING');
                                                      setShowAddModal(true);
                                                  }}
                                                  className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                  title="Add Stock"
                                              >
                                                  <PackagePlus size={16} />
                                              </button>
                                          )}

                                          {/* Edit Cost Button */}
                                          {currentUser?.role === 'SUPER_ADMIN' && (
                                              <button
                                                  onClick={() => {
                                                      setEditModalData({ product: item, field: 'costPrice', value: item.costPrice?.toString() || '' });
                                                      setShowEditCostModal(true);
                                                  }}
                                                  className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                  title="Edit Cost Price"
                                              >
                                                  <DollarSign size={16} />
                                              </button>
                                          )}

                                          {/* Edit Min Stock Button */}
                                          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'BRANCH_MANAGER') && (
                                              <button
                                                  onClick={() => {
                                                      setEditModalData({ product: item, field: 'minStockLevel', value: (item.minStockLevel || 0).toString() });
                                                      setShowEditMinStockModal(true);
                                                  }}
                                                  className="p-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                  title="Edit Min Stock"
                                              >
                                                  <AlertTriangle size={16} />
                                              </button>
                                          )}

                                      </div>
                                  </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
                   </div>
               </div>
           )}

           {activeTab === 'transfers' && (
               <div className="grid grid-cols-1 gap-6">
                   {/* Incoming Shipments */}
                   <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                       <div className="p-4 border-b border-slate-100 bg-slate-50">
                           <h3 className="font-bold text-slate-800 flex items-center gap-2">
                               <Truck size={18} className="text-blue-600" /> Incoming Shipments
                           </h3>
                       </div>
                       <div className="divide-y divide-slate-100">
                           {incomingTransfers.length === 0 ? (
                               <div className="p-8 text-center text-slate-400">No incoming shipments.</div>
                           ) : (
                               <>
                                   {activeIncomingTransfers.map(t => {
                                       const transferStatus = normalizeTransferStatus(t.status);
                                       const keeperVerified = Boolean(t.verifiedBy?.storeKeeper);
                                       const controllerVerified = Boolean(t.verifiedBy?.inventoryController);
                                       const workflowStatus = incomingTransferWorkflowStatus(t);
                                       const targetBranchMatches = branchIdsMatch(t.targetBranchId, effectiveBranchId);
                                       return (
                                       <div key={t.id} className="p-4 sm:p-5">
                                           <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4 gap-3">
                                               <div>
                                                   <h4 className="font-bold text-base text-slate-800">{t.id}</h4>
                                                   <p className="text-sm text-slate-500">From: {getBranchDisplayName(t.sourceBranchId)}</p>
                                                   <p className="text-sm text-slate-500">Date: {t.dateSent}</p>
                                               </div>
                                               <div className="text-left sm:text-right flex flex-col gap-2">
                                                   <span className={`px-3 py-1 rounded-full text-xs font-bold ${workflowStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : workflowStatus === 'RECEIVED_KEEPER' ? 'bg-amber-100 text-amber-700' : workflowStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                       {workflowStatus.replace('_', ' ')}
                                                   </span>
                                                   <button
                                                       onClick={() => { setSelectedTransferForCodes(t); setShowViewCodesModal(true); }}
                                                       className="px-3 py-1 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700"
                                                   >
                                                       View Details
                                                   </button>
                                               </div>
                                           </div>

                                           {workflowStatus === 'REJECTED' ? (
                                               <div className="bg-red-50 p-3 sm:p-4 rounded-xl border border-red-200 mt-4">
                                                   <h5 className="font-bold text-red-700 text-sm">Shipment Rejected</h5>
                                                   <p className="text-xs text-red-600 mt-1">This transfer was rejected at receiving branch verification level.</p>
                                               </div>
                                           ) : (
                                           <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 mt-4">
                                               <h5 className="font-bold text-slate-700 text-sm mb-3">Verification Required</h5>
                                               <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
                                                   <div className={`flex-1 flex items-center gap-3 p-3 rounded-lg border ${!keeperVerified ? 'bg-white border-blue-200' : 'bg-slate-100 border-slate-200 opacity-50'}`}>
                                                       <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
                                                       <div>
                                                           <p className="font-bold text-sm">Store Keeper</p>
                                                           <p className="text-xs text-slate-500">Confirm Physical Receipt</p>
                                                       </div>
                                                       {keeperVerified ? (
                                                           <CheckCircle size={18} className="ml-auto text-emerald-500" />
                                                       ) : transferStatus !== 'COMPLETED' && canKeeperVerify && (isSuperAdmin || targetBranchMatches) ? (
                                                           <div className="ml-auto flex items-center gap-1.5">
                                                               <button onClick={() => openVerifyModal(t.id, 'KEEPER')} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">
                                                                   Verify
                                                               </button>
                                                               <button onClick={() => openRejectTransferModal(t.id, 'KEEPER')} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700">
                                                                   Reject
                                                               </button>
                                                           </div>
                                                       ) : (
                                                           <div className="ml-auto w-4 h-4" />
                                                       )}
                                                   </div>

                                                   <ArrowRight className="text-slate-300 hidden lg:block" />

                                                   <div className={`flex-1 flex items-center gap-3 p-3 rounded-lg border ${keeperVerified ? 'bg-white border-teal-200' : 'bg-slate-100 border-slate-200 opacity-50'}`}>
                                                       <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">2</div>
                                                       <div>
                                                           <p className="font-bold text-sm">Inventory Controller</p>
                                                           <p className="text-xs text-slate-500">Quality Check & Make Available for POS</p>
                                                       </div>
                                                       {controllerVerified ? (
                                                           <CheckCircle size={18} className="ml-auto text-emerald-500" />
                                                       ) : keeperVerified && canControllerVerify && (isSuperAdmin || targetBranchMatches) ? (
                                                           <div className="ml-auto flex items-center gap-1.5">
                                                               <button onClick={() => openVerifyModal(t.id, 'CONTROLLER')} className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700">
                                                                   Verify & Release
                                                               </button>
                                                               <button onClick={() => openRejectTransferModal(t.id, 'CONTROLLER')} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700">
                                                                   Reject
                                                               </button>
                                                           </div>
                                                       ) : (
                                                           <div className="ml-auto w-4 h-4" />
                                                       )}
                                                   </div>
                                               </div>
                                           </div>
                                           )}
                                       </div>
                                   );
                                   })}

                                   {completedIncomingTransfers.length > 0 && (
                                       <div className="p-4 sm:p-5 bg-emerald-50/40">
                                           <button
                                               type="button"
                                               onClick={() => setCollapseCompletedIncoming((prev) => !prev)}
                                               className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition-colors"
                                           >
                                               <span className="font-semibold text-sm">
                                                   Completed Transfers ({completedIncomingTransfers.length})
                                               </span>
                                               {collapseCompletedIncoming ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                           </button>
                                           {!collapseCompletedIncoming && (
                                               <div className="mt-3 space-y-3">
                                                   {completedIncomingTransfers.map((t) => (
                                                       <div key={t.id} className="p-4 rounded-xl border border-emerald-200 bg-white">
                                                           <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                                                               <div>
                                                                   <h4 className="font-bold text-base text-slate-800">{t.id}</h4>
                                                                   <p className="text-sm text-slate-500">From: {getBranchDisplayName(t.sourceBranchId)}</p>
                                                                   <p className="text-sm text-slate-500">Date: {t.dateSent}</p>
                                                               </div>
                                                               <div className="text-left sm:text-right flex flex-col gap-2">
                                                                   <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                                       COMPLETED
                                                                   </span>
                                                                   <button
                                                                       onClick={() => { setSelectedTransferForCodes(t); setShowViewCodesModal(true); }}
                                                                       className="px-3 py-1 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700"
                                                                   >
                                                                       View Details
                                                                   </button>
                                                               </div>
                                                           </div>
                                                       </div>
                                                   ))}
                                               </div>
                                           )}
                                       </div>
                                   )}
                               </>
                           )}
                       </div>
                   </div>

                   {/* Outgoing Shipments (for Head Office and branches that sent transfers) */}
                   {outgoingTransfers.length > 0 && (
                       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                           <div className="p-4 border-b border-slate-100 bg-slate-50">
                               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                   <Truck size={18} className="text-emerald-600" /> Outgoing Shipments
                               </h3>
                           </div>
                           <div className="divide-y divide-slate-100">
                               {outgoingTransfers.map(t => (
                                   <div key={t.id} className="p-4 sm:p-5">
                                       <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4 gap-3">
                                           <div>
                                               <h4 className="font-bold text-base text-slate-800">{t.id}</h4>
                                               <p className="text-sm text-slate-500">To: {getBranchDisplayName(t.targetBranchId)}</p>
                                               <p className="text-sm text-slate-500">Date: {t.dateSent}</p>
                                           </div>
                                           <div className="text-left sm:text-right flex flex-col gap-2">
                                               <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : t.status === 'RECEIVED_KEEPER' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                   {t.status.replace('_', ' ')}
                                               </span>
                                               <button
                                                   onClick={() => { setSelectedTransferForCodes(t); setShowViewCodesModal(true); }}
                                                   className="px-3 py-1 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700"
                                               >
                                                   View Details
                                               </button>
                                           </div>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}

               </div>
           )}
       </div>

       {/* Add Stock Modal */}
       {showAddModal && (
         <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-slate-900">Add Stock</h3>
                     <button onClick={() => {
                         setShowAddModal(false);
                         setNewStock({
                             productId: '', name: '', genericName: '', category: 'General',
                             costPrice: '', price: '', unit: 'Box', minStock: '10',
                             batchNumber: '', expiryDate: '', quantity: ''
                         });
                         setRestockExistingForm({
                           items: [],
                           supplierId: '',
                           supplierName: '',
                           isNewSupplier: false,
                           newSupplierName: ''
                         });
                         setCurrentRestockItem({
                           productId: '',
                           quantity: 0,
                           batchNumber: '',
                           expiryDate: '',
                           costPrice: 0,
                           sellingPrice: 0
                         });
                     }}><X size={24} className="text-slate-400" /></button>
                 </div>

                 <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                     <button
                         onClick={() => {
                           setAddMode('EXISTING');
                           setRestockExistingForm({
                             items: [],
                             supplierId: '',
                             supplierName: '',
                             isNewSupplier: false,
                             newSupplierName: ''
                           });
                         }}
                         className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${addMode === 'EXISTING' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                         Restock Existing
                     </button>
                     <button
                         onClick={() => setAddMode('NEW')}
                         className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${addMode === 'NEW' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                         Create New Product
                     </button>
                 </div>

                 {addMode === 'EXISTING' ? (
                   <div className="space-y-4">
                     {/* Supplier Selection */}
                     <div className="space-y-2">
                       <label className="block text-sm font-bold text-slate-700">Supplier / Customer (Optional)</label>
                       {!restockExistingForm.isNewSupplier ? (
                         <>
                           <select
                             className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                             value={restockExistingForm.supplierId}
                             onChange={(e) => {
                               const supplier = savedRestockSources.find(s => s.id === e.target.value);
                               setRestockExistingForm({
                                 ...restockExistingForm,
                                 supplierId: e.target.value,
                                 supplierName: supplier?.name || ''
                               });
                             }}
                           >
                             <option value="">Select Saved Supplier/Customer</option>
                             {savedRestockSources.map(s => (
                               <option key={s.id} value={s.id}>
                                 {s.name} ({s.type})
                               </option>
                             ))}
                           </select>
                           <button
                             onClick={() => setRestockExistingForm({...restockExistingForm, isNewSupplier: true})}
                             className="w-full text-center p-3 border-2 border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 font-semibold"
                           >
                             + Add New Supplier Name
                           </button>
                         </>
                       ) : (
                         <>
                           <input
                             type="text"
                             className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                             placeholder="New Supplier Name"
                             value={restockExistingForm.newSupplierName}
                             onChange={(e) => setRestockExistingForm({...restockExistingForm, newSupplierName: e.target.value})}
                           />
                           <button
                             onClick={() => setRestockExistingForm({...restockExistingForm, isNewSupplier: false, newSupplierName: ''})}
                             className="w-full p-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                           >
                             Use Saved Supplier/Customer Instead
                           </button>
                         </>
                       )}
                     </div>

                     {/* Add Product Item */}
                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                       <h4 className="font-bold text-slate-900">Add Products</h4>
                       
                       <select
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                         value={currentRestockItem.productId || ''}
                         onChange={(e) => {
                           const selectedProduct = products.find(p => p.id === e.target.value);
                           setCurrentRestockItem({
                             ...currentRestockItem,
                             productId: e.target.value,
                             costPrice: selectedProduct ? selectedProduct.costPrice : (currentRestockItem.costPrice || 0),
                             sellingPrice: selectedProduct ? selectedProduct.price : (currentRestockItem.sellingPrice || 0)
                           });
                         }}
                       >
                         <option value="">Select Product *</option>
                         {products.map(p => (
                           <option key={p.id} value={p.id}>
                             {p.name} (Current: {mergedInventory.find(i => i.id === p.id)?.quantity || 0} units)
                           </option>
                         ))}
                       </select>

                       <div className="grid grid-cols-2 gap-3">
                         <input
                           type="text"
                           className="p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                           placeholder="Batch Number"
                           value={currentRestockItem.batchNumber || ''}
                           onChange={(e) => setCurrentRestockItem({...currentRestockItem, batchNumber: e.target.value})}
                         />
                         <input
                           type="date"
                           className="p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                           value={currentRestockItem.expiryDate || ''}
                           onChange={(e) => setCurrentRestockItem({...currentRestockItem, expiryDate: e.target.value})}
                         />
                       </div>

                       <input
                         type="number"
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                         placeholder="Quantity *"
                         min="1"
                         value={currentRestockItem.quantity || ''}
                         onChange={(e) => setCurrentRestockItem({...currentRestockItem, quantity: parseInt(e.target.value) || 0})}
                       />

                       <div className="grid grid-cols-2 gap-3">
                         <input
                           type="number"
                           className="p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                           placeholder="Buying Price *"
                           min="0"
                           step="0.01"
                           value={currentRestockItem.costPrice ?? ''}
                           onChange={(e) => setCurrentRestockItem({...currentRestockItem, costPrice: Number(e.target.value) || 0})}
                         />
                         <input
                           type="number"
                           className="p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                           placeholder="Selling Price *"
                           min="0"
                           step="0.01"
                           value={currentRestockItem.sellingPrice ?? ''}
                           onChange={(e) => setCurrentRestockItem({...currentRestockItem, sellingPrice: Number(e.target.value) || 0})}
                         />
                       </div>

                       <button
                         onClick={() => {
                           if (!currentRestockItem.productId || !currentRestockItem.quantity || currentRestockItem.quantity <= 0) {
                             showError('Missing Fields', 'Please select a product and enter a quantity.');
                             return;
                           }
                           if (currentRestockItem.costPrice === undefined || Number(currentRestockItem.costPrice) < 0) {
                             showError('Invalid Buying Price', 'Please enter a valid buying price (0 or more).');
                             return;
                           }
                           if (currentRestockItem.sellingPrice === undefined || Number(currentRestockItem.sellingPrice) <= 0) {
                             showError('Invalid Selling Price', 'Please enter a valid selling price greater than 0.');
                             return;
                           }
                           const batchNumber = currentRestockItem.batchNumber || generateBatchNumber();
                           const expiryDate = currentRestockItem.expiryDate || '';
                           setRestockExistingForm({
                             ...restockExistingForm,
                             items: (() => {
                               const nextItems = [...restockExistingForm.items];
                               const existingIndex = nextItems.findIndex(
                                 (item) =>
                                   item.productId === currentRestockItem.productId &&
                                   item.batchNumber === batchNumber &&
                                   (item.expiryDate || '') === expiryDate
                               );
                               if (existingIndex >= 0) {
                                 nextItems[existingIndex] = {
                                   ...nextItems[existingIndex],
                                   quantity: nextItems[existingIndex].quantity + (currentRestockItem.quantity || 0),
                                   costPrice: Number(currentRestockItem.costPrice) || 0,
                                   sellingPrice: Number(currentRestockItem.sellingPrice) || 0
                                 };
                               } else {
                                 nextItems.push({
                                   productId: currentRestockItem.productId,
                                   quantity: currentRestockItem.quantity,
                                   batchNumber,
                                   expiryDate,
                                   costPrice: Number(currentRestockItem.costPrice) || 0,
                                   sellingPrice: Number(currentRestockItem.sellingPrice) || 0
                                 });
                               }
                               return nextItems;
                             })()
                           });
                           setCurrentRestockItem({
                             productId: '',
                             quantity: 0,
                             batchNumber: '',
                             expiryDate: '',
                             costPrice: 0,
                             sellingPrice: 0
                           });
                         }}
                         className="w-full p-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700"
                       >
                         + Add Product
                       </button>
                     </div>

                     {/* Added Items List */}
                     {restockExistingForm.items.length > 0 && (
                       <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-2">
                         <h4 className="font-bold text-blue-900">Items to Restock ({restockExistingForm.items.length})</h4>
                         <div className="space-y-2 max-h-48 overflow-y-auto">
                           {restockExistingForm.items.map((item, idx) => {
                             const product = products.find(p => p.id === item.productId);
                             return (
                               <div key={idx} className="bg-white p-3 rounded-lg flex justify-between items-start border border-blue-100">
                                 <div className="flex-1">
                                   <p className="font-semibold text-slate-900">{product?.name}</p>
                                   <p className="text-xs text-slate-600">Batch: {item.batchNumber} | Qty: {item.quantity} | Expiry: {item.expiryDate || 'N/A'}</p>
                                   <p className="text-xs text-slate-600">Buy: {fmtCurrency(item.costPrice)} | Sell: {fmtCurrency(item.sellingPrice)}</p>
                                 </div>
                                 <button
                                   onClick={() => {
                                     setRestockExistingForm({
                                       ...restockExistingForm,
                                       items: restockExistingForm.items.filter((_, i) => i !== idx)
                                     });
                                   }}
                                   className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded hover:bg-red-200"
                                 >
                                   Remove
                                 </button>
                               </div>
                             );
                           })}
                         </div>
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="space-y-4">
                     <input 
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                       placeholder="Product Name *" 
                       value={newStock.name} 
                       onChange={e => setNewStock({...newStock, name: e.target.value})} 
                     />
                     <input 
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                       placeholder="Generic Name" 
                       value={newStock.genericName} 
                       onChange={e => setNewStock({...newStock, genericName: e.target.value})} 
                     />
                     <div className="grid grid-cols-2 gap-4">
                       <input 
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                         placeholder="Category" 
                         value={newStock.category} 
                         onChange={e => setNewStock({...newStock, category: e.target.value})} 
                       />
                       <input 
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                         placeholder="Unit" 
                         value={newStock.unit} 
                         onChange={e => setNewStock({...newStock, unit: e.target.value})} 
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <input 
                         type="number" 
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                         placeholder="Cost Price *" 
                         value={newStock.costPrice} 
                         onChange={e => setNewStock({...newStock, costPrice: e.target.value})} 
                       />
                       <input 
                         type="number" 
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                         placeholder="Selling Price *" 
                         value={newStock.price} 
                         onChange={e => setNewStock({...newStock, price: e.target.value})} 
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <input 
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                         placeholder="Batch Number" 
                         value={newStock.batchNumber} 
                         onChange={e => setNewStock({...newStock, batchNumber: e.target.value})} 
                       />
                       <input 
                         type="date" 
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" 
                         value={newStock.expiryDate} 
                         onChange={e => setNewStock({...newStock, expiryDate: e.target.value})} 
                       />
                     </div>
                     <input 
                       type="number" 
                       className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-bold" 
                       placeholder="Quantity to Add *" 
                       min="1"
                       value={newStock.quantity} 
                       onChange={e => setNewStock({...newStock, quantity: e.target.value})} 
                     />
                   </div>
                 )}

                 <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                     <button 
                         onClick={() => {
                             setShowAddModal(false);
                             setNewStock({
                                 productId: '', name: '', genericName: '', category: 'General',
                                 costPrice: '', price: '', unit: 'Box', minStock: '10',
                                 batchNumber: '', expiryDate: '', quantity: ''
                             });
                             setRestockExistingForm({
                               items: [],
                               supplierId: '',
                               supplierName: '',
                               isNewSupplier: false,
                               newSupplierName: ''
                             });
                         }} 
                         className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                     >
                         Cancel
                     </button>
                     <button
                         onClick={handleAddStock}
                         disabled={addMode === 'EXISTING' ? restockExistingForm.items.length === 0 : !newStock.name || !newStock.price || !newStock.quantity}
                         className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         {addMode === 'EXISTING' ? 'Restock' : 'Create Product'}
                     </button>
                 </div>
               </div>
           </div>
       )}

       {/* Transfer Modal */}
       {showTransferModal && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2 sm:p-4">
               <div className="bg-white rounded-2xl w-full max-w-3xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-lg sm:text-xl font-bold text-slate-900">Create New Shipment</h3>
                       <button onClick={() => {
                           setShowTransferModal(false);
                           setNewShipment({ targetBranchId: '', notes: '', items: [] });
                       }} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={24} className="text-slate-400" /></button>
                   </div>

                   <div className="space-y-4">
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Select Target Branch</label>
                           <select
                               className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                               value={newShipment.targetBranchId}
                               onChange={(e) => setNewShipment({...newShipment, targetBranchId: e.target.value})}
                           >
                               <option value="">-- Choose Branch --</option>
                               {branches.filter(b => !branchIdsMatch(b.id, currentBranchId)).map(b => (
                                   <option key={b.id} value={b.id}>{getBranchDisplayName(b.id, b.name)}</option>
                               ))}
                           </select>
                       </div>

                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                           <h4 className="text-sm font-bold text-slate-700 mb-3">Add Items to Shipment</h4>
                           <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_auto] gap-2 mb-4 items-start sm:items-end">
                               <select
                                   className="w-full min-w-0 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                   value={currentItem.productId}
                                   onChange={(e) => setCurrentItem({...currentItem, productId: e.target.value})}
                               >
                                   <option value="">Select Product</option>
                                   {products.map(p => (
                                       <option key={p.id} value={p.id}>
                                           {p.name} (Stock: {branchStockList.find(inv => inv.productId === p.id)?.quantity || 0})
                                       </option>
                                   ))}
                               </select>
                               <input
                                   type="number"
                                   className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                   placeholder="Qty"
                                   min="1"
                                   value={currentItem.quantity}
                                   onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                               />
                               <button
                                   onClick={() => {
                                       if(!currentItem.productId || !currentItem.quantity) {
                                           showError("Missing Fields", "Select product and enter quantity.");
                                           return;
                                       }
                                       const qty = parseInt(currentItem.quantity);
                                       if (qty <= 0) {
                                           showError("Invalid Quantity", "Quantity must be greater than 0.");
                                           return;
                                       }
                                       const prod = products.find(p => p.id === currentItem.productId);
                                       const branchItem = branchStockList.find(i => i.productId === currentItem.productId);
                                       const availableQty = branchItem?.quantity || 0;
                                       if (qty > availableQty) {
                                           showError("Insufficient Stock", `Only ${availableQty} units available.`);
                                           return;
                                       }
                                       setNewShipment({
                                           ...newShipment,
                                           items: [...newShipment.items, {
                                               productId: currentItem.productId,
                                               productName: prod?.name,
                                               quantity: qty,
                                               batchNumber: generateBatchNumber(),
                                               expiryDate: '2025-12-31'
                                           }]
                                       });
                                       setCurrentItem({ productId: '', quantity: '' });
                                       showSuccess("Item Added", `${prod?.name} added to shipment.`);
                                   }}
                                   className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700"
                               >
                                   Add
                               </button>
                           </div>

                           <div className="space-y-2">
                               {newShipment.items.length === 0 ? (
                                   <p className="text-sm text-slate-400 text-center py-4">No items added yet</p>
                               ) : (
                                   newShipment.items.map((item, idx) => (
                                       <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white p-3 border border-slate-200 rounded text-sm">
                                           <div>
                                               <p className="font-bold text-slate-800">{item.productName}</p>
                                               <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                                           </div>
                                           <button
                                               onClick={() => {
                                                   setNewShipment({
                                                       ...newShipment,
                                                       items: newShipment.items.filter((_, i) => i !== idx)
                                                   });
                                                   showSuccess("Item Removed", "Item removed from shipment.");
                                               }}
                                               className="self-end sm:self-auto p-2 text-red-600 hover:bg-red-50 rounded"
                                           >
                                               <X size={16} />
                                           </button>
                                       </div>
                                   ))
                               )}
                           </div>
                       </div>

                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Notes (Optional)</label>
                           <textarea
                               className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                               placeholder="Add shipment notes..."
                               rows={3}
                               value={newShipment.notes}
                               onChange={(e) => setNewShipment({...newShipment, notes: e.target.value})}
                           ></textarea>
                       </div>
                   </div>
                   <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t pt-4 sticky bottom-0 bg-white">
                       <button
                           onClick={() => {
                               setShowTransferModal(false);
                               setNewShipment({ targetBranchId: '', notes: '', items: [] });
                           }}
                           className="w-full sm:w-auto px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                       >
                           Cancel
                       </button>
                       <button
                           onClick={handleDispatch}
                           disabled={!newShipment.targetBranchId || newShipment.items.length === 0}
                           className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           Dispatch Shipment
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Enhanced Request Modal */}
       {showRequestModal && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                              <ClipboardList size={20} className="text-blue-600" />
                          </div>
                          Multi-Product Stock Requisition
                      </h3>
                      <button
                          onClick={() => setShowRequestModal(false)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                          <X size={24} />
                      </button>
                  </div>

                  <div className="space-y-6">
                      {/* Branch Info */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                          <h4 className="font-bold text-blue-900 mb-2">Request Details</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                  <p className="text-blue-700">Requesting Branch</p>
                                  <p className="font-bold text-blue-900">{branchName}</p>
                              </div>
                              <div>
                                  <p className="text-blue-700">Request Date</p>
                                  <p className="font-bold text-blue-900">{new Date().toLocaleDateString()}</p>
                              </div>
                          </div>
                      </div>

                      {/* Add Item Section */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                          <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                              <Plus size={18} className="text-blue-600" />
                              Add Product to Requisition
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              {/* Product Selection */}
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">
                                      Select Product
                                  </label>
                                  <select
                                     className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                     value={currentItem.productId}
                                     onChange={(e) => setCurrentItem({...currentItem, productId: e.target.value})}
                                  >
                                      <option value="">-- Choose a product --</option>
                                      {products
                                          .filter(p => {
                                              const branchItem = branchStockList.find(inv => inv.productId === p.id);
                                              return !branchItem || branchItem.quantity <= p.minStockLevel;
                                          })
                                          .filter(p => !requisitionItems.some(item => item.productId === p.id)) // Exclude already added products
                                          .sort((a, b) => a.name.localeCompare(b.name))
                                          .map(p => {
                                              const branchItem = branchStockList.find(inv => inv.productId === p.id);
                                              const currentStock = branchItem?.quantity || 0;
                                              const isLowStock = currentStock <= p.minStockLevel;

                                              return (
                                                  <option key={p.id} value={p.id}>
                                                      {p.name} {p.genericName ? `(${p.genericName})` : ''} - Current: {currentStock} {p.unit}
                                                      {isLowStock ? ' ⚠️ LOW STOCK' : ''}
                                                  </option>
                                              );
                                          })}
                                  </select>
                              </div>

                              {/* Quantity Input */}
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">
                                      Quantity Needed
                                  </label>
                                  <div className="relative">
                                      <Package size={14} className="absolute left-3 top-3 text-slate-400" />
                                      <input
                                         type="number"
                                         className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                         placeholder="Enter quantity"
                                         min="1"
                                         value={currentItem.quantity}
                                         onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                                      />
                                  </div>
                              </div>
                          </div>

                          {/* Product Preview */}
                          {currentItem.productId && (() => {
                              const selectedProduct = products.find(p => p.id === currentItem.productId);
                              const branchItem = branchStockList.find(inv => inv.productId === currentItem.productId);
                              const currentStock = branchItem?.quantity || 0;
                              const requestedQty = parseInt(currentItem.quantity) || 0;
                              const estimatedValue = (selectedProduct?.price || 0) * requestedQty;

                              return (
                                  <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3">
                                      <div className="flex justify-between items-start mb-2">
                                          <div>
                                              <h6 className="font-bold text-slate-900 text-sm">{selectedProduct?.name}</h6>
                                              <p className="text-xs text-slate-500">Current stock: {currentStock} {selectedProduct?.unit}</p>
                                          </div>
                                          {currentItem.quantity && (
                                              <div className="text-right">
                                                  <p className="text-sm font-bold text-blue-600">{fmtCurrency(estimatedValue)} TZS</p>
                                                  <p className="text-xs text-slate-500">Est. value</p>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })()}

                          <button
                              onClick={addItemToRequisition}
                              disabled={!currentItem.productId || !currentItem.quantity || parseInt(currentItem.quantity) <= 0}
                              className="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                              <Plus size={16} />
                              Add to Requisition
                          </button>
                      </div>

                      {/* Requisition Items List */}
                      {requisitionItems.length > 0 && (
                          <div className="mb-6">
                              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <ClipboardList size={18} className="text-emerald-600" />
                                  Requisition Items ({requisitionItems.length})
                              </h4>
                              <div className="space-y-3">
                                  {requisitionItems.map((item, index) => (
                                      <div key={item.productId} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                                          <div className="flex-1">
                                              <h5 className="font-bold text-slate-900 text-sm">{item.productName}</h5>
                                              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                                  <span>Current: {item.currentStock} {item.unit}</span>
                                                  <span>Requested: {item.quantityRequested} {item.unit}</span>
                                                  <span className="font-medium text-blue-600">{fmtCurrency(item.quantityRequested * item.unitPrice)} TZS</span>
                                              </div>
                                          </div>
                                          <button
                                              onClick={() => removeItemFromRequisition(item.productId)}
                                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                              title="Remove item"
                                          >
                                              <X size={16} />
                                          </button>
                                      </div>
                                  ))}
                              </div>

                              {/* Total Summary */}
                              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div>
                                          <p className="text-emerald-700 font-medium">Total Items</p>
                                          <p className="text-xl font-bold text-emerald-900">{requisitionItems.reduce((sum, item) => sum + item.quantityRequested, 0)}</p>
                                      </div>
                                      <div>
                                          <p className="text-emerald-700 font-medium">Total Products</p>
                                          <p className="text-xl font-bold text-emerald-900">{requisitionItems.length}</p>
                                      </div>
                                      <div>
                                          <p className="text-emerald-700 font-medium">Estimated Value</p>
                                          <p className="text-xl font-bold text-emerald-900">{fmtCurrency(requisitionItems.reduce((sum, item) => sum + (item.quantityRequested * item.unitPrice), 0))} TZS</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                     <button
                         onClick={() => {
                             setShowRequestModal(false);
                             setRequisitionItems([]);
                             setCurrentItem({ productId: '', quantity: '' });
                         }}
                         className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                     >
                         Cancel
                     </button>
                     <button
                         onClick={handleRequestStock}
                         disabled={requisitionItems.length === 0}
                         className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                     >
                         <Send size={16} />
                         Submit Requisition ({requisitionItems.length} items)
                     </button>
                 </div>
               </div>
           </div>
       )}

       {/* Verification Modal */}
       {showVerifyModal && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-lg p-6">
                   <div className="text-center mb-6">
                       <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                           <CheckCircle size={32} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900">Confirm Verification</h3>
                       <p className="text-sm text-slate-500">
                           {verifyStep === 'KEEPER'
                               ? 'Store Keeper: Confirm you have physically received this shipment?'
                               : 'Inventory Controller: Confirm quality check and make stock available for sale?'
                           }
                       </p>
                   </div>

                   <div className="bg-slate-50 p-4 rounded-lg mb-6">
                       <p className="text-sm text-slate-700">
                           <strong>Transfer ID:</strong> {activeTransferId}
                       </p>
                       <p className="text-sm text-slate-700 mt-1">
                           <strong>Action:</strong> {verifyStep === 'KEEPER' ? 'Confirm Receipt' : 'Verify & Release Stock'}
                       </p>
                   </div>

                   <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                       <p className="text-sm font-bold text-slate-800 mb-2">
                           Shipment Contents ({activeTransferForVerification?.items?.length || 0} item(s))
                       </p>
                       {activeTransferForVerification?.items?.length ? (
                           <div className="max-h-44 overflow-y-auto space-y-2">
                               {activeTransferForVerification.items.map((item, idx) => (
                                   <div key={`${item.productId}-${idx}`} className="flex justify-between text-sm border-b border-slate-100 pb-1">
                                       <span className="text-slate-700 truncate pr-3">{item.productName}</span>
                                       <span className="font-semibold text-slate-900 whitespace-nowrap">{fmtNumber(item.quantity)} units</span>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                               No shipment items found for this transfer. Verify only if this is expected.
                           </p>
                       )}
                   </div>

                   <label className="flex items-start gap-2 text-sm text-slate-700 mb-6">
                       <input
                           type="checkbox"
                           checked={hasReviewedShipmentContents}
                           onChange={(e) => setHasReviewedShipmentContents(e.target.checked)}
                           className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                       />
                       <span>I have reviewed the shipment contents above before verifying.</span>
                   </label>

                   <div className="flex gap-2">
                       <button
                           onClick={() => { setShowVerifyModal(false); setVerificationCode(''); setVerifyError(''); setHasReviewedShipmentContents(false); }}
                           className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200"
                       >
                           Cancel
                       </button>
                       <button
                           onClick={handleVerifyTransfer}
                           disabled={!hasReviewedShipmentContents}
                           className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           Confirm & Verify
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Reject Transfer Modal */}
       {showRejectModal && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-lg p-6">
                   <div className="text-center mb-5">
                       <h3 className="text-xl font-bold text-slate-900">Reject Shipment</h3>
                       <p className="text-sm text-slate-500 mt-1">
                           {rejectStep === 'KEEPER' ? 'Store Keeper' : 'Inventory Controller'} rejection for transfer #{rejectTransferId}
                       </p>
                   </div>

                   <label className="block text-sm font-bold text-slate-700 mb-2">Reason (optional)</label>
                   <textarea
                       value={rejectReason}
                       onChange={(e) => setRejectReason(e.target.value)}
                       rows={4}
                       className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                       placeholder="Write reason for rejecting this shipment..."
                   />

                   <div className="flex gap-2 mt-5">
                       <button
                           onClick={() => {
                               if (isRejectingTransfer) return;
                               setShowRejectModal(false);
                               setRejectTransferId(null);
                               setRejectReason('');
                           }}
                           className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200"
                       >
                           Cancel
                       </button>
                       <button
                           onClick={handleRejectTransfer}
                           disabled={isRejectingTransfer}
                           className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                       >
                           {isRejectingTransfer ? 'Rejecting...' : 'Confirm Reject'}
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Transfer Success Modal */}
       {showTransferSuccessModal && createdTransfer && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md p-6">
                   <div className="text-center mb-6">
                       <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                           <CheckCircle size={32} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900">Shipment Created Successfully</h3>
                       <p className="text-sm text-slate-500 mt-2">
                           Transfer #{createdTransfer.id} dispatched to {getBranchDisplayName(createdTransfer.targetBranchId)}
                       </p>
                       {createdShipmentMeta?.shipmentId && (
                           <p className="text-xs text-slate-500 mt-1">
                               Shipment #{createdShipmentMeta.shipmentId} created
                           </p>
                       )}
                   </div>

                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                       <h4 className="text-sm font-bold text-slate-700 mb-3">Transfer Details</h4>
                       <div className="space-y-2">
                           <div className="flex justify-between">
                               <span className="text-slate-600">Transfer ID:</span>
                               <span className="font-mono text-slate-900">{createdTransfer.id}</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="text-slate-600">From:</span>
                               <span className="text-slate-900">{getBranchDisplayName(createdTransfer.sourceBranchId, createdTransfer.sourceBranchId)}</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="text-slate-600">To:</span>
                               <span className="text-slate-900">{getBranchDisplayName(createdTransfer.targetBranchId, createdTransfer.targetBranchId)}</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="text-slate-600">Items:</span>
                               <span className="text-slate-900">{createdTransfer.items.length} products</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="text-slate-600">Status:</span>
                               <span className="text-blue-600 font-medium">{createdTransfer.status}</span>
                           </div>
                           {createdShipmentMeta?.invoiceId && (
                               <div className="flex justify-between">
                                   <span className="text-slate-600">Invoice ID:</span>
                                   <span className="font-mono text-emerald-700">{createdShipmentMeta.invoiceId}</span>
                               </div>
                           )}
                       </div>
                   </div>

                   <button
                       onClick={() => {
                           setShowTransferSuccessModal(false);
                           setCreatedTransfer(null);
                           setCreatedShipmentMeta(null);
                       }}
                       className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                   >
                       Done
                   </button>
               </div>
           </div>
       )}

       {/* View Details Modal */}
       {showViewCodesModal && selectedTransferForCodes && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
                   {(() => {
                       const transferStatus = normalizeTransferStatus(selectedTransferForCodes.status);
                       const keeperVerified = Boolean(selectedTransferForCodes.verifiedBy?.storeKeeper);
                       const controllerVerified = Boolean(selectedTransferForCodes.verifiedBy?.inventoryController);
                       const workflowStatus =
                         controllerVerified || transferStatus === 'COMPLETED'
                           ? 'COMPLETED'
                           : keeperVerified
                             ? 'RECEIVED_KEEPER'
                             : transferStatus;
                       const statusLabel =
                         workflowStatus === 'RECEIVED_KEEPER'
                           ? 'RECEIVED BY STORE KEEPER'
                           : workflowStatus;
                       const detailItems = (selectedTransferForCodes.items || []).map((item) => ({
                           ...item,
                           productName: item.productName || products.find(p => p.id === item.productId)?.name || item.productId || 'Unknown Product'
                       }));

                       return (
                           <>
                   <div className="text-center mb-6">
                       <h3 className="text-xl font-bold text-slate-900">Transfer Verification Details</h3>
                       <p className="text-sm text-slate-500 mt-2">Transfer #{selectedTransferForCodes.id}</p>
                   </div>

                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                           <div>
                               <p className="text-slate-500">From</p>
                               <p className="font-semibold text-slate-800">{getBranchDisplayName(selectedTransferForCodes.sourceBranchId, selectedTransferForCodes.sourceBranchId)}</p>
                           </div>
                           <div>
                               <p className="text-slate-500">To</p>
                               <p className="font-semibold text-slate-800">{getBranchDisplayName(selectedTransferForCodes.targetBranchId, selectedTransferForCodes.targetBranchId)}</p>
                           </div>
                           <div>
                               <p className="text-slate-500">Date Sent</p>
                               <p className="font-semibold text-slate-800">{fmtDate(selectedTransferForCodes.dateSent)}</p>
                           </div>
                           <div>
                               <p className="text-slate-500">Current Status</p>
                               <span className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                   workflowStatus === 'COMPLETED'
                                     ? 'bg-emerald-100 text-emerald-700'
                                     : workflowStatus === 'RECEIVED_KEEPER'
                                       ? 'bg-amber-100 text-amber-700'
                                       : 'bg-blue-100 text-blue-700'
                               }`}>
                                   {statusLabel.replace('_', ' ')}
                               </span>
                           </div>
                       </div>
                   </div>

                   <div className="bg-white border border-slate-200 rounded-xl mb-6 overflow-hidden">
                       <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                           <h5 className="font-bold text-slate-700">
                               Shipment Products ({detailItems.length})
                           </h5>
                           <p className="text-xs text-slate-500 mt-1">
                               Products to be received or already received for this transfer.
                           </p>
                       </div>
                       {detailItems.length === 0 ? (
                           <div className="p-4 text-sm text-slate-500">No products found for this transfer.</div>
                       ) : (
                           <div className="max-h-64 overflow-y-auto">
                               <table className="w-full text-sm">
                                   <thead className="bg-white sticky top-0 z-10">
                                       <tr className="text-left border-b border-slate-200">
                                           <th className="px-4 py-2.5 font-semibold text-slate-600">Product</th>
                                           <th className="px-4 py-2.5 font-semibold text-slate-600">Qty</th>
                                           <th className="px-4 py-2.5 font-semibold text-slate-600">Batch</th>
                                           <th className="px-4 py-2.5 font-semibold text-slate-600">Expiry</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       {detailItems.map((item, idx) => (
                                           <tr key={`${item.productId}-${idx}`} className="border-b border-slate-100 last:border-0">
                                               <td className="px-4 py-2.5 text-slate-800">{item.productName}</td>
                                               <td className="px-4 py-2.5 text-slate-700 font-semibold">{fmtNumber(item.quantity)}</td>
                                               <td className="px-4 py-2.5 text-slate-600">{item.batchNumber || 'N/A'}</td>
                                               <td className="px-4 py-2.5 text-slate-600">{item.expiryDate ? fmtDate(item.expiryDate) : 'N/A'}</td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           </div>
                       )}
                   </div>

                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
                       <h5 className="font-bold text-slate-700 mb-3">Verification Status</h5>

                       <div className="space-y-3">
                           <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                               <div>
                                   <p className="text-sm font-medium text-slate-900">Store Keeper Verification</p>
                                   {selectedTransferForCodes.verifiedBy?.storeKeeper ? (
                                       <div className="text-xs text-green-600 mt-1">
                                           ✓ Verified by {selectedTransferForCodes.verifiedBy.storeKeeper.userName} on {new Date(selectedTransferForCodes.verifiedBy.storeKeeper.timestamp).toLocaleString()}
                                       </div>
                                   ) : (
                                       <p className="text-xs text-slate-500 mt-1">Not yet verified</p>
                                   )}
                               </div>
                               {selectedTransferForCodes.verifiedBy?.storeKeeper && (
                                   <CheckCircle size={20} className="text-green-500" />
                               )}
                           </div>

                           <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                               <div>
                                   <p className="text-sm font-medium text-slate-900">Inventory Controller Verification</p>
                                   {selectedTransferForCodes.verifiedBy?.inventoryController ? (
                                       <div className="text-xs text-green-600 mt-1">
                                           ✓ Verified by {selectedTransferForCodes.verifiedBy.inventoryController.userName} on {new Date(selectedTransferForCodes.verifiedBy.inventoryController.timestamp).toLocaleString()}
                                       </div>
                                   ) : (
                                       <p className="text-xs text-slate-500 mt-1">Not yet verified</p>
                                   )}
                               </div>
                               {selectedTransferForCodes.verifiedBy?.inventoryController && (
                                   <CheckCircle size={20} className="text-green-500" />
                               )}
                           </div>
                       </div>
                   </div>

                   <button
                       onClick={() => {
                           setShowViewCodesModal(false);
                           setSelectedTransferForCodes(null);
                       }}
                       className="w-full py-3 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700"
                   >
                       Close
                   </button>
                           </>
                       );
                   })()}
               </div>
           </div>
       )}

       {/* Bulk Import Modal */}
       {showBulkImportModal && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-slate-900">Bulk Import Products</h3>
                       <button onClick={() => {
                           setShowBulkImportModal(false);
                           setBulkImportFile(null);
                           setBulkImportData([]);
                           setBulkImportErrors([]);
                           setBulkImportDuplicates([]);
                           setDuplicateAction(null);
                       }}><X size={24} className="text-slate-400" /></button>
                   </div>

                   <div className="space-y-6">
                       {/* File Upload Section */}
                       <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
                           <Download size={48} className="text-slate-400 mx-auto mb-4" />
                           <h4 className="text-lg font-bold text-slate-700 mb-2">Upload CSV File</h4>
                           <p className="text-sm text-slate-500 mb-4">
                               Select a CSV file with product data. Required columns: name, price
                           </p>
                           <input
                               type="file"
                               accept=".csv"
                               onChange={handleFileUpload}
                               className="hidden"
                               id="bulk-import-file"
                           />
                           <label
                               htmlFor="bulk-import-file"
                               className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer"
                           >
                               <Download size={16} /> Choose File
                           </label>
                           {bulkImportFile && (
                               <p className="text-sm text-teal-600 mt-2">Selected: {bulkImportFile.name}</p>
                           )}
                       </div>

                       {/* CSV Format Help */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <h5 className="font-bold text-slate-700 mb-2">CSV Format</h5>
                           <p className="text-sm text-slate-600 mb-2">Your CSV should have these columns (case-insensitive):</p>
                           <div className="text-xs font-mono bg-white p-2 rounded border">
                               name*, price*, genericname, category, costprice, unit, minstock, requiresprescription
                           </div>
                           <p className="text-xs text-slate-500 mt-1">* Required fields</p>
                       </div>

                       {/* Preview and Validation */}
                       {bulkImportData.length > 0 && (
                           <div className="bg-white border border-slate-200 rounded-xl p-4">
                               <h5 className="font-bold text-slate-700 mb-3">Import Preview</h5>

                               {/* Errors */}
                               {bulkImportErrors.length > 0 && (
                                   <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                       <h6 className="font-bold text-red-700 mb-2">Validation Errors:</h6>
                                       <ul className="text-sm text-red-600 space-y-1">
                                           {bulkImportErrors.map((error, idx) => (
                                               <li key={idx}>• {error}</li>
                                           ))}
                                       </ul>
                                   </div>
                               )}

                               {/* Duplicates */}
                               {bulkImportDuplicates.length > 0 && (
                                   <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                       <h6 className="font-bold text-amber-700 mb-2">Duplicate Products Found:</h6>
                                       <p className="text-sm text-amber-600 mb-3">
                                           {bulkImportDuplicates.length} product(s) already exist in the database.
                                           Choose how to handle them:
                                       </p>
                                       <div className="flex gap-4 mb-3">
                                           <label className="flex items-center gap-2">
                                               <input
                                                   type="radio"
                                                   name="duplicateAction"
                                                   value="skip"
                                                   checked={duplicateAction === 'skip'}
                                                   onChange={(e) => setDuplicateAction(e.target.value as 'skip')}
                                                   className="text-teal-600"
                                               />
                                               <span className="text-sm text-slate-700">Skip duplicates</span>
                                           </label>
                                           <label className="flex items-center gap-2">
                                               <input
                                                   type="radio"
                                                   name="duplicateAction"
                                                   value="replace"
                                                   checked={duplicateAction === 'replace'}
                                                   onChange={(e) => setDuplicateAction(e.target.value as 'replace')}
                                                   className="text-teal-600"
                                               />
                                               <span className="text-sm text-slate-700">Replace existing</span>
                                           </label>
                                       </div>
                                       <div className="max-h-32 overflow-y-auto">
                                           <ul className="text-xs text-amber-600 space-y-1">
                                               {bulkImportDuplicates.map((dup, idx) => (
                                                   <li key={idx}>
                                                       • Row {dup.rowNum}: "{dup.productName}" (existing ID: {dup.existingProduct.id})
                                                   </li>
                                               ))}
                                           </ul>
                                       </div>
                                   </div>
                               )}

                               {/* Data Preview */}
                               <div className="overflow-x-auto">
                                   <table className="w-full text-left text-sm">
                                       <thead className="bg-slate-50">
                                           <tr>
                                               <th className="px-3 py-2 font-bold text-slate-700">Name</th>
                                               <th className="px-3 py-2 font-bold text-slate-700">Price</th>
                                               <th className="px-3 py-2 font-bold text-slate-700">Category</th>
                                               <th className="px-3 py-2 font-bold text-slate-700">Unit</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                           {bulkImportData.slice(0, 5).map((row, idx) => (
                                               <tr key={idx} className="hover:bg-slate-50">
                                                   <td className="px-3 py-2">{row.name}</td>
                                                   <td className="px-3 py-2">{row.price}</td>
                                                   <td className="px-3 py-2">{row.category || 'General'}</td>
                                                   <td className="px-3 py-2">{row.unit || 'Box'}</td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                                   {bulkImportData.length > 5 && (
                                       <p className="text-xs text-slate-500 mt-2">
                                           ... and {bulkImportData.length - 5} more rows
                                       </p>
                                   )}
                               </div>

                               <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                   <p className="text-sm text-blue-700">
                                       Ready to import <strong>{bulkImportData.length}</strong> products
                                       {bulkImportErrors.length > 0 && (
                                           <span className="text-red-600 ml-2">
                                               ({bulkImportErrors.length} errors to fix)
                                           </span>
                                       )}
                                   </p>
                               </div>
                           </div>
                       )}
                   </div>

                   <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                       <button
                           onClick={() => {
                               setShowBulkImportModal(false);
                               setBulkImportFile(null);
                               setBulkImportData([]);
                               setBulkImportErrors([]);
                               setBulkImportDuplicates([]);
                               setDuplicateAction(null);
                           }}
                           className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                           disabled={isImporting}
                       >
                           Cancel
                       </button>
                       <button
                           onClick={handleBulkImport}
                           disabled={bulkImportData.length === 0 || bulkImportErrors.length > 0 || (bulkImportDuplicates.length > 0 && !duplicateAction) || isImporting}
                           className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                       >
                           {isImporting ? (
                               <>
                                   <Loader className="animate-spin" size={16} />
                                   Importing...
                               </>
                           ) : (
                               <>
                                   <Download size={16} />
                                   Import {bulkImportData.length} Products
                               </>
                           )}
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Professional Product Details Modal */}
       {showProductDetailsModal && selectedProductForDetails && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                           <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                               <Package size={24} className="text-teal-600" />
                           </div>
                           Product Details
                       </h3>
                       <button
                           onClick={() => {
                               setShowProductDetailsModal(false);
                               setSelectedProductForDetails(null);
                           }}
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                       >
                           <X size={24} />
                       </button>
                   </div>

                   <div className="space-y-6">
                       {/* Product Header */}
                       <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-6 rounded-xl border border-teal-100">
                           <div className="flex items-start justify-between">
                               <div>
                                   <h4 className="text-2xl font-bold text-slate-900 mb-2">{selectedProductForDetails.name}</h4>
                                   <p className="text-lg text-slate-600 mb-1">{selectedProductForDetails.genericName}</p>
                                   <div className="flex items-center gap-4">
                                       <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                                           {selectedProductForDetails.category}
                                       </span>
                                       <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                                           {selectedProductForDetails.unit}
                                       </span>
                                       {selectedProductForDetails.requiresPrescription && (
                                           <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                               Prescription Required
                                           </span>
                                       )}
                                   </div>
                               </div>
                               <div className="text-right">
                                   <div className="text-3xl font-bold text-slate-900">{selectedProductForDetails.id}</div>
                                   <div className="text-sm text-slate-500">Product ID</div>
                               </div>
                           </div>
                       </div>

                       {/* Key Metrics Grid */}
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                           <div className="bg-white p-4 rounded-xl border border-slate-200">
                               <div className="flex items-center gap-3 mb-2">
                                   <div className="p-2 bg-blue-50 rounded-lg">
                                       <Package size={16} className="text-blue-600" />
                                   </div>
                                   <div>
                                       <p className="text-sm text-slate-500 font-medium">Current Stock</p>
                                       <p className="text-xl font-bold text-slate-900">{selectedProductForDetails.quantity}</p>
                                   </div>
                               </div>
                           </div>

                           <div className="bg-white p-4 rounded-xl border border-slate-200">
                               <div className="flex items-center gap-3 mb-2">
                                   <div className="p-2 bg-amber-50 rounded-lg">
                                       <AlertTriangle size={16} className="text-amber-600" />
                                   </div>
                                   <div>
                                       <p className="text-sm text-slate-500 font-medium">Min Stock Level</p>
                                       <p className="text-xl font-bold text-slate-900">{selectedProductForDetails.minStockLevel}</p>
                                   </div>
                               </div>
                           </div>

                           <div className="bg-white p-4 rounded-xl border border-slate-200">
                               <div className="flex items-center gap-3 mb-2">
                                   <div className="p-2 bg-green-50 rounded-lg">
                                       <DollarSign size={16} className="text-green-600" />
                                   </div>
                                   <div>
                                       <p className="text-sm text-slate-500 font-medium">Cost Price</p>
                                       <p className="text-xl font-bold text-slate-900">{fmtCurrency(selectedProductForDetails.costPrice)} TZS</p>
                                   </div>
                               </div>
                           </div>

                           <div className="bg-white p-4 rounded-xl border border-slate-200">
                               <div className="flex items-center gap-3 mb-2">
                                   <div className="p-2 bg-emerald-50 rounded-lg">
                                       <TrendingUp size={16} className="text-emerald-600" />
                                   </div>
                                   <div>
                                       <p className="text-sm text-slate-500 font-medium">Selling Price</p>
                                       <p className="text-xl font-bold text-slate-900">{fmtCurrency(selectedProductForDetails.branchPrice)} TZS</p>
                                       {selectedProductForDetails.branchPrice !== selectedProductForDetails.price && (
                                           <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Custom Price</span>
                                       )}
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* Financial Analysis */}
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <div className="bg-white p-6 rounded-xl border border-slate-200">
                               <h5 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                   <BarChart3 size={20} className="text-teal-600" />
                                   Financial Analysis
                               </h5>
                               <div className="space-y-4">
                                   <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                       <span className="text-slate-600 font-medium">Asset Value (Cost Basis)</span>
                                       <span className="text-xl font-bold text-slate-900">{fmtCurrency(selectedProductForDetails.assetValue)} TZS</span>
                                   </div>
                                   <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                       <span className="text-emerald-700 font-medium">Estimated Revenue</span>
                                       <span className="text-xl font-bold text-emerald-900">{fmtCurrency(selectedProductForDetails.retailValue)} TZS</span>
                                   </div>
                                   <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                       <span className="text-blue-700 font-medium">Gross Margin</span>
                                       <span className="text-xl font-bold text-blue-900">
                                           {selectedProductForDetails.costPrice > 0
                                               ? (((selectedProductForDetails.branchPrice - selectedProductForDetails.costPrice) / selectedProductForDetails.costPrice) * 100).toFixed(1)
                                               : '0'
                                           }%
                                       </span>
                                   </div>
                               </div>
                           </div>

                           <div className="bg-white p-6 rounded-xl border border-slate-200">
                               <h5 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                   <Layers size={20} className="text-purple-600" />
                                   Stock Status
                               </h5>
                               <div className="space-y-4">
                                   <div className="flex justify-between items-center">
                                       <span className="text-slate-600">Stock Level</span>
                                       <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                           selectedProductForDetails.quantity <= selectedProductForDetails.minStockLevel
                                               ? 'bg-red-100 text-red-700'
                                               : selectedProductForDetails.quantity <= selectedProductForDetails.minStockLevel * 2
                                               ? 'bg-amber-100 text-amber-700'
                                               : 'bg-green-100 text-green-700'
                                       }`}>
                                           {selectedProductForDetails.quantity <= selectedProductForDetails.minStockLevel
                                               ? 'Low Stock'
                                               : selectedProductForDetails.quantity <= selectedProductForDetails.minStockLevel * 2
                                               ? 'Normal'
                                               : 'High Stock'
                                           }
                                       </span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <span className="text-slate-600">Total Batches</span>
                                       <span className="font-bold text-slate-900">{selectedProductForDetails.batches?.length || 0}</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <span className="text-slate-600">Active Batches</span>
                                       <span className="font-bold text-slate-900">
                                           {selectedProductForDetails.batches?.filter((b: DrugBatch) => b.status === 'ACTIVE').length || 0}
                                       </span>
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* Product History */}
                       <div className="bg-white p-6 rounded-xl border border-slate-200">
                           <h5 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                               <History size={20} className="text-purple-600" />
                               Product History & Activity
                           </h5>

                           {/* Recent Sales Activity */}
                           <div className="mb-6">
                               <h6 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                   <ShoppingCart size={16} className="text-green-600" />
                                   Recent Sales (Last 30 Days)
                               </h6>
                               <div className="bg-slate-50 rounded-lg p-4">
                                   {(() => {
                                       // Filter sales that include this product
                                       const productSales = sales
                                           .filter(sale =>
                                               sale.items && sale.items.some(item => item.id === selectedProductForDetails.id) &&
                                               new Date(sale.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                                           )
                                           .slice(0, 5); // Show last 5 sales

                                       if (productSales.length === 0) {
                                           return (
                                               <p className="text-sm text-slate-500 text-center py-4">
                                                   No recent sales activity for this product
                                               </p>
                                           );
                                       }

                                       return (
                                           <div className="space-y-3">
                                               {productSales.map((sale, idx) => {
                                                   const productItem = sale.items.find(item => item.id === selectedProductForDetails.id);
                                                   return (
                                                       <div key={idx} className="flex justify-between items-center p-3 bg-white rounded border border-slate-200">
                                                           <div>
                                                               <p className="text-sm font-medium text-slate-900">
                                                                   Sale #{sale.id.slice(-6)}
                                                               </p>
                                                               <p className="text-xs text-slate-500">
                                                                   {new Date(sale.date).toLocaleDateString()} • {productItem?.quantity} units
                                                               </p>
                                                           </div>
                                                           <div className="text-right">
                                                               <p className="text-sm font-bold text-slate-900">
                                                                   {fmtCurrency(productItem ? productItem.quantity * productItem.price : 0)} TZS
                                                               </p>
                                                               <p className="text-xs text-slate-500">
                                                                   {sale.customerName || 'Walk-in Customer'}
                                                               </p>
                                                           </div>
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       );
                                   })()}
                               </div>
                           </div>

                           {/* Stock Movement History */}
                           <div className="mb-6">
                               <h6 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                   <Truck size={16} className="text-blue-600" />
                                   Stock Movements
                               </h6>
                               <div className="bg-slate-50 rounded-lg p-4">
                                   {(() => {
                                       // Filter transfers that include this product
                                       const productTransfers = transfers
                                           .filter(transfer =>
                                               transfer.items && transfer.items.some(item => item.productId === selectedProductForDetails.id)
                                           )
                                           .slice(0, 5); // Show last 5 transfers

                                       if (productTransfers.length === 0 && (!selectedProductForDetails.batches || selectedProductForDetails.batches.length === 0)) {
                                           return (
                                               <p className="text-sm text-slate-500 text-center py-4">
                                                   No stock movement history available
                                               </p>
                                           );
                                       }

                                       const historyItems: { type: string; date: string; description: string; details: string; icon: React.ComponentType<any>; color: string; }[] = [];

                                       // Add transfer history
                                       productTransfers.forEach(transfer => {
                                           const productItem = transfer.items.find(item => item.productId === selectedProductForDetails.id);
                                           if (productItem) {
                                               historyItems.push({
                                                   type: 'transfer',
                                                   date: transfer.dateSent,
                                                   description: `${transfer.status === 'COMPLETED' ? 'Received' : 'Transferred'} ${productItem.quantity} units`,
                                                   details: `From ${transfer.sourceBranchId} → ${transfer.targetBranchId}`,
                                                   icon: Truck,
                                                   color: transfer.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'
                                               });
                                           }
                                       });

                                       // Add batch creation history (simulated)
                                       selectedProductForDetails.batches?.forEach((batch: DrugBatch) => {
                                           historyItems.push({
                                               type: 'stock_addition',
                                               date: batch.expiryDate, // Using expiry as approximate date
                                               description: `Added batch ${batch.batchNumber}`,
                                               details: `${batch.quantity} units • Expires ${fmtDate(batch.expiryDate)}`,
                                               icon: PackagePlus,
                                               color: 'text-emerald-600'
                                           });
                                       });

                                       // Sort by date (most recent first)
                                       historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                       return (
                                           <div className="space-y-3">
                                               {historyItems.slice(0, 5).map((item, idx) => {
                                                   const IconComponent = item.icon;
                                                   return (
                                                       <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded border border-slate-200">
                                                           <div className={`p-2 rounded-lg bg-slate-100 ${item.color}`}>
                                                               <IconComponent size={14} />
                                                           </div>
                                                           <div className="flex-1">
                                                               <p className="text-sm font-medium text-slate-900">
                                                                   {item.description}
                                                               </p>
                                                               <p className="text-xs text-slate-500">
                                                                   {item.details}
                                                               </p>
                                                               <p className="text-xs text-slate-400">
                                                                   {fmtDate(item.date)}
                                                               </p>
                                                           </div>
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       );
                                   })()}
                               </div>
                           </div>

                           {/* Price Change History */}
                           <div>
                               <h6 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                   <Tag size={16} className="text-amber-600" />
                                   Pricing Information
                               </h6>
                               <div className="bg-slate-50 rounded-lg p-4">
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div className="bg-white p-3 rounded border border-slate-200">
                                           <p className="text-xs text-slate-500 mb-1">Current Selling Price</p>
                                           <p className="text-lg font-bold text-slate-900">{fmtCurrency(selectedProductForDetails.branchPrice)} TZS</p>
                                           {selectedProductForDetails.branchPrice !== selectedProductForDetails.price && (
                                               <p className="text-xs text-blue-600 mt-1">Custom pricing applied</p>
                                           )}
                                       </div>
                                       <div className="bg-white p-3 rounded border border-slate-200">
                                           <p className="text-xs text-slate-500 mb-1">Cost Price</p>
                                           <p className="text-lg font-bold text-slate-900">{fmtCurrency(selectedProductForDetails.costPrice)} TZS</p>
                                           <p className="text-xs text-slate-500 mt-1">
                                               Margin: {selectedProductForDetails.costPrice > 0
                                                   ? (((selectedProductForDetails.branchPrice - selectedProductForDetails.costPrice) / selectedProductForDetails.costPrice) * 100).toFixed(1)
                                                   : '0'
                                               }%
                                           </p>
                                       </div>
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* Batch Details */}
                       {selectedProductForDetails.batches && selectedProductForDetails.batches.length > 0 && (
                           <div className="bg-white p-6 rounded-xl border border-slate-200">
                               <h5 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                   <Layers size={20} className="text-indigo-600" />
                                   Batch Information
                               </h5>
                               <div className="overflow-x-auto">
                                   <table className="w-full text-left">
                                       <thead className="bg-slate-50">
                                           <tr>
                                               <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Batch Number</th>
                                               <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Expiry Date</th>
                                               <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Quantity</th>
                                               <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                           {selectedProductForDetails.batches.map((batch: any, idx: number) => (
                                               <tr key={idx} className="hover:bg-slate-50">
                                                   <td className="px-4 py-3 font-mono text-sm text-slate-600">{batch.batchNumber}</td>
                                                   <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(batch.expiryDate)}</td>
                                                   <td className="px-4 py-3 font-bold text-slate-900">{batch.quantity}</td>
                                                   <td className="px-4 py-3">
                                                       <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                           batch.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                           batch.status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                                                           batch.status === 'ON_HOLD' ? 'bg-amber-100 text-amber-700' :
                                                           'bg-slate-100 text-slate-700'
                                                       }`}>
                                                           {batch.status}
                                                       </span>
                                                   </td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                           </div>
                       )}

                       {/* Action Buttons */}
                       <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                           <button
                               onClick={() => {
                                   setShowProductDetailsModal(false);
                                   setSelectedProductForDetails(null);
                               }}
                               className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                           >
                               Close
                           </button>
                           <button
                               onClick={() => {
                                   navigator.clipboard.writeText(
                                       `Product: ${selectedProductForDetails.name}\n` +
                                       `ID: ${selectedProductForDetails.id}\n` +
                                       `Stock: ${selectedProductForDetails.quantity}\n` +
                                       `Price: ${fmtCurrency(selectedProductForDetails.branchPrice)} TZS`
                                   );
                                   // Could add a toast notification here
                               }}
                               className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium flex items-center gap-2"
                           >
                               <Copy size={16} />
                               Copy Summary
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Professional Price Setting Modal */}
       {showPriceModal && priceModalData && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md p-6">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                           <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                               <Tag size={20} className="text-teal-600" />
                           </div>
                           Set Selling Price
                       </h3>
                       <button
                           onClick={() => {
                               setShowPriceModal(false);
                               setPriceModalData(null);
                           }}
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                       >
                           <X size={24} />
                       </button>
                   </div>

                   <div className="space-y-6">
                       {/* Product Info */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <h4 className="font-bold text-slate-900 mb-2">{priceModalData.product.name}</h4>
                           <p className="text-sm text-slate-600 mb-3">{priceModalData.product.genericName}</p>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                               <div>
                                   <p className="text-slate-500">Current Price</p>
                                   <p className="font-bold text-slate-900">{fmtCurrency(priceModalData.product.branchPrice)} TZS</p>
                               </div>
                               <div>
                                   <p className="text-slate-500">Cost Price</p>
                                   <p className="font-bold text-slate-900">{fmtCurrency(priceModalData.product.costPrice)} TZS</p>
                               </div>
                           </div>
                       </div>

                       {/* Price Input */}
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">
                               New Selling Price (TZS)
                           </label>
                           <div className="relative">
                               <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                               <input
                                   type="number"
                                   step="0.01"
                                   min="0"
                                   className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-bold text-lg"
                                   placeholder="0.00"
                                   value={priceModalData.newPrice}
                                   onChange={(e) => setPriceModalData({...priceModalData, newPrice: e.target.value})}
                               />
                           </div>
                       </div>

                       {/* Margin Preview */}
                       {priceModalData.newPrice && !isNaN(Number(priceModalData.newPrice)) && Number(priceModalData.newPrice) > 0 && (
                           <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
                               <h5 className="font-bold text-teal-900 mb-3">Margin Analysis</h5>
                               <div className="grid grid-cols-2 gap-4 text-sm">
                                   <div>
                                       <p className="text-teal-700">New Price</p>
                                       <p className="font-bold text-teal-900">{fmtCurrency(Number(priceModalData.newPrice))} TZS</p>
                                   </div>
                                   <div>
                                       <p className="text-teal-700">Gross Margin</p>
                                       <p className={`font-bold ${Number(priceModalData.newPrice) > priceModalData.product.costPrice ? 'text-green-600' : 'text-red-600'}`}>
                                           {priceModalData.product.costPrice > 0
                                               ? (((Number(priceModalData.newPrice) - priceModalData.product.costPrice) / priceModalData.product.costPrice) * 100).toFixed(1)
                                               : '0'
                                           }%
                                       </p>
                                   </div>
                               </div>
                               {Number(priceModalData.newPrice) <= priceModalData.product.costPrice && (
                                   <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                                       ⚠️ Warning: Selling price is below cost price
                                   </div>
                               )}
                           </div>
                       )}

                       {/* Action Buttons */}
                       <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                           <button
                               onClick={() => {
                                   setShowPriceModal(false);
                                   setPriceModalData(null);
                               }}
                               className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                           >
                               Cancel
                           </button>
                           <button
                               onClick={async () => {
                                   const newPrice = Number(priceModalData.newPrice);
                                   if (!priceModalData.newPrice || isNaN(newPrice) || newPrice <= 0) {
                                       showError("Invalid Price", "Please enter a valid price greater than 0.");
                                       return;
                                   }

                                   // Update inventory with new custom price via API

                                   try {
                                       // Update inventory with new custom price via API
                                       await api.updateInventoryItem(currentBranchId, priceModalData.product.id, { customPrice: newPrice });

                                       // Update local state to reflect the change immediately
                                       setInventory(prev => {
                                           const branchInv = prev[currentBranchId] || [];
                                           const existingIdx = branchInv.findIndex(inv => inv.productId === priceModalData.product.id);

                                           if (existingIdx >= 0) {
                                               const updated = [...branchInv];
                                               updated[existingIdx] = {
                                                   ...updated[existingIdx],
                                                   customPrice: newPrice
                                               };
                                               return { ...prev, [currentBranchId]: updated };
                                           } else {
                                               return {
                                                   ...prev,
                                                   [currentBranchId]: [...branchInv, {
                                                       productId: priceModalData.product.id,
                                                       quantity: priceModalData.product.quantity,
                                                       batches: priceModalData.product.batches,
                                                       customPrice: newPrice
                                                   }]
                                               };
                                           }
                                       });

                                       showSuccess("Price Updated", `Price for ${priceModalData.product.name} set to ${fmtCurrency(newPrice)} TZS`, 5000);
                                       setShowPriceModal(false);
                                       setPriceModalData(null);
                                   } catch (error) {
                                       console.error('Failed to update price:', error);
                                       showError("Update Failed", "Failed to update the price. Please try again.");
                                   }
                               }}
                               className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                               disabled={!priceModalData.newPrice || isNaN(Number(priceModalData.newPrice)) || Number(priceModalData.newPrice) <= 0}
                           >
                               Update Price
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Professional Edit Name Modal */}
       {showEditNameModal && editModalData && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md p-6">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                               <Tag size={20} className="text-blue-600" />
                           </div>
                           Edit Product Name
                       </h3>
                       <button
                           onClick={() => {
                               setShowEditNameModal(false);
                               setEditModalData(null);
                           }}
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                       >
                           <X size={24} />
                       </button>
                   </div>

                   <div className="space-y-6">
                       {/* Product Info */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <h4 className="font-bold text-slate-900 mb-2">{editModalData.product.name}</h4>
                           <p className="text-sm text-slate-600">ID: {editModalData.product.id}</p>
                       </div>

                       {/* Name Input */}
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">
                               New Product Name
                           </label>
                           <input
                               type="text"
                               className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                               placeholder="Enter product name"
                               value={editModalData.value}
                               onChange={(e) => setEditModalData({...editModalData, value: e.target.value})}
                               maxLength={100}
                           />
                           <p className="text-xs text-slate-500 mt-1">
                               {editModalData.value.length}/100 characters
                           </p>
                       </div>

                       {/* Action Buttons */}
                       <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                           <button
                               onClick={() => {
                                   setShowEditNameModal(false);
                                   setEditModalData(null);
                               }}
                               className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                           >
                               Cancel
                           </button>
                           <button
                               onClick={async () => {
                                   const newName = editModalData.value.trim();
                                   if (!newName) {
                                       showError("Invalid Name", "Product name cannot be empty.");
                                       return;
                                   }

                                   const updatedProduct = { ...editModalData.product, name: newName };

                                   try {
                                       if (onUpdateProduct) {
                                           await onUpdateProduct(updatedProduct);
                                       } else {
                                           // Fallback to local update if no callback provided
                                           setProducts((prev: Product[]) => prev.map(p =>
                                               p.id === editModalData.product.id
                                                   ? updatedProduct
                                                   : p
                                           ));
                                           showSuccess("Product Name Updated", `Changed to: ${newName}`, 5000);
                                       }
                                       setShowEditNameModal(false);
                                       setEditModalData(null);
                                   } catch (error) {
                                       // Error handling is done in the callback
                                   }
                               }}
                               className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                               disabled={!editModalData.value.trim() || editModalData.value.trim() === editModalData.product.name}
                           >
                               Update Name
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Professional Edit Generic Name Modal */}
       {showEditGenericModal && editModalData && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md p-6">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                           <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                               <FilePlus size={20} className="text-purple-600" />
                           </div>
                           Edit Generic Name
                       </h3>
                       <button
                           onClick={() => {
                               setShowEditGenericModal(false);
                               setEditModalData(null);
                           }}
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                       >
                           <X size={24} />
                       </button>
                   </div>

                   <div className="space-y-6">
                       {/* Product Info */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <h4 className="font-bold text-slate-900 mb-2">{editModalData.product.name}</h4>
                           <p className="text-sm text-slate-600">Current Generic: {editModalData.product.genericName || 'Not set'}</p>
                       </div>

                       {/* Generic Name Input */}
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">
                               Generic Name (Optional)
                           </label>
                           <input
                               type="text"
                               className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                               placeholder="Enter generic name"
                               value={editModalData.value}
                               onChange={(e) => setEditModalData({...editModalData, value: e.target.value})}
                               maxLength={100}
                           />
                           <p className="text-xs text-slate-500 mt-1">
                               Leave empty to remove generic name • {editModalData.value.length}/100 characters
                           </p>
                       </div>

                       {/* Action Buttons */}
                       <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                           <button
                               onClick={() => {
                                   setShowEditGenericModal(false);
                                   setEditModalData(null);
                               }}
                               className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                           >
                               Cancel
                           </button>
                           <button
                               onClick={async () => {
                                   const newGeneric = editModalData.value.trim();
                                   const updatedProduct = { ...editModalData.product, genericName: newGeneric };

                                   try {
                                       if (onUpdateProduct) {
                                           await onUpdateProduct(updatedProduct);
                                       } else {
                                           // Fallback to local update if no callback provided
                                           setProducts((prev: Product[]) => prev.map(p =>
                                               p.id === editModalData.product.id
                                                   ? updatedProduct
                                                   : p
                                           ));
                                           showSuccess("Generic Name Updated", newGeneric ? `Changed to: ${newGeneric}` : "Generic name removed", 5000);
                                       }
                                       setShowEditGenericModal(false);
                                       setEditModalData(null);
                                   } catch (error) {
                                       // Error handling is done in the callback
                                   }
                               }}
                               className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                           >
                               Update Generic Name
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Professional Edit Cost Price Modal */}
       {showEditCostModal && editModalData && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md p-6">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                           <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                               <DollarSign size={20} className="text-green-600" />
                           </div>
                           Edit Cost Price
                       </h3>
                       <button
                           onClick={() => {
                               setShowEditCostModal(false);
                               setEditModalData(null);
                           }}
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                       >
                           <X size={24} />
                       </button>
                   </div>

                   <div className="space-y-6">
                       {/* Product Info */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <h4 className="font-bold text-slate-900 mb-2">{editModalData.product.name}</h4>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                               <div>
                                   <p className="text-slate-500">Current Cost</p>
                                   <p className="font-bold text-slate-900">{fmtCurrency(editModalData.product.costPrice)} TZS</p>
                               </div>
                               <div>
                                   <p className="text-slate-500">Selling Price</p>
                                   <p className="font-bold text-slate-900">{fmtCurrency(editModalData.product.branchPrice)} TZS</p>
                               </div>
                           </div>
                       </div>

                       {/* Cost Price Input */}
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">
                               New Cost Price (TZS)
                           </label>
                           <div className="relative">
                               <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                               <input
                                   type="number"
                                   step="0.01"
                                   min="0"
                                   className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-bold text-lg"
                                   placeholder="0.00"
                                   value={editModalData.value}
                                   onChange={(e) => setEditModalData({...editModalData, value: e.target.value})}
                               />
                           </div>
                       </div>

                       {/* Margin Preview */}
                       {editModalData.value && !isNaN(Number(editModalData.value)) && Number(editModalData.value) >= 0 && (
                           <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                               <h5 className="font-bold text-green-900 mb-3">Updated Margin Analysis</h5>
                               <div className="grid grid-cols-2 gap-4 text-sm">
                                   <div>
                                       <p className="text-green-700">New Cost Price</p>
                                       <p className="font-bold text-green-900">{fmtCurrency(Number(editModalData.value))} TZS</p>
                                   </div>
                                   <div>
                                       <p className="text-green-700">New Margin</p>
                                       <p className={`font-bold ${editModalData.product.branchPrice > Number(editModalData.value) ? 'text-green-600' : 'text-red-600'}`}>
                                           {editModalData.product.branchPrice > Number(editModalData.value)
                                               ? (((editModalData.product.branchPrice - Number(editModalData.value)) / Number(editModalData.value)) * 100).toFixed(1)
                                               : '0'
                                           }%
                                       </p>
                                   </div>
                               </div>
                               {editModalData.product.branchPrice <= Number(editModalData.value) && (
                                   <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                                       ⚠️ Warning: Cost price equals or exceeds selling price
                                   </div>
                               )}
                           </div>
                       )}

                       {/* Action Buttons */}
                       <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                           <button
                               onClick={() => {
                                   setShowEditCostModal(false);
                                   setEditModalData(null);
                               }}
                               className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                           >
                               Cancel
                           </button>
                           <button
                               onClick={async () => {
                                   console.log('Edit Cost Price: Starting update process');
                                   const newCost = Number(editModalData.value);
                                   if (isNaN(newCost) || newCost < 0) {
                                       showError("Invalid Price", "Cost price must be a valid positive number.");
                                       return;
                                   }

                                   const updatedProduct = { ...editModalData.product, costPrice: newCost };
                                   console.log('Edit Cost Price: Updated product object', updatedProduct);

                                   try {
                                       if (onUpdateProduct) {
                                           console.log('Edit Cost Price: Calling onUpdateProduct');
                                           await onUpdateProduct(updatedProduct);
                                           console.log('Edit Cost Price: onUpdateProduct completed successfully');
                                       } else {
                                           console.log('Edit Cost Price: Using fallback local update');
                                           // Fallback to local update if no callback provided
                                           setProducts((prev: Product[]) => prev.map(p =>
                                               p.id === editModalData.product.id
                                                   ? updatedProduct
                                                   : p
                                           ));
                                           showSuccess("Cost Price Updated", `Changed to: ${fmtCurrency(newCost)} TZS`, 5000);
                                       }
                                       setShowEditCostModal(false);
                                       setEditModalData(null);
                                   } catch (error) {
                                       console.error('Edit Cost Price: Error occurred', error);
                                       // Error handling is done in the callback
                                   }
                               }}
                               className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                               disabled={!editModalData.value || isNaN(Number(editModalData.value)) || Number(editModalData.value) < 0}
                           >
                               Update Cost Price
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Professional Edit Min Stock Modal */}
       {showEditMinStockModal && editModalData && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl w-full max-w-md p-6">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                           <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                               <AlertTriangle size={20} className="text-orange-600" />
                           </div>
                           Edit Minimum Stock Level
                       </h3>
                       <button
                           onClick={() => {
                               setShowEditMinStockModal(false);
                               setEditModalData(null);
                           }}
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                       >
                           <X size={24} />
                       </button>
                   </div>

                   <div className="space-y-6">
                       {/* Product Info */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <h4 className="font-bold text-slate-900 mb-2">{editModalData.product.name}</h4>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                               <div>
                                   <p className="text-slate-500">Current Stock</p>
                                   <p className="font-bold text-slate-900">{editModalData.product.quantity} units</p>
                               </div>
                               <div>
                                   <p className="text-slate-500">Current Min Stock</p>
                                   <p className="font-bold text-slate-900">{editModalData.product.minStockLevel || 0} units</p>
                               </div>
                           </div>
                       </div>

                       {/* Min Stock Input */}
                       <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">
                               New Minimum Stock Level
                           </label>
                           <div className="relative">
                               <AlertTriangle size={16} className="absolute left-3 top-3 text-slate-400" />
                               <input
                                   type="number"
                                   min="0"
                                   className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-bold text-lg"
                                   placeholder="0"
                                   value={editModalData.value}
                                   onChange={(e) => setEditModalData({...editModalData, value: e.target.value})}
                               />
                           </div>
                           <p className="text-xs text-slate-500 mt-1">Set to 0 to disable low stock alerts for this product</p>
                       </div>

                       {/* Stock Status Preview */}
                       {editModalData.value && !isNaN(Number(editModalData.value)) && Number(editModalData.value) >= 0 && (
                           <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                               <h5 className="font-bold text-orange-900 mb-3">Stock Status Preview</h5>
                               <div className="space-y-2 text-sm">
                                   <div className="flex justify-between">
                                       <span className="text-orange-700">New Min Stock Level:</span>
                                       <span className="font-bold text-orange-900">{editModalData.value} units</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span className="text-orange-700">Current Stock:</span>
                                       <span className="font-bold text-slate-900">{editModalData.product.quantity} units</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span className="text-orange-700">Status after update:</span>
                                       <span className={`px-2 py-1 rounded text-xs font-medium ${
                                           editModalData.product.quantity <= Number(editModalData.value)
                                               ? 'bg-red-100 text-red-700'
                                               : editModalData.product.quantity <= Number(editModalData.value) * 2
                                               ? 'bg-amber-100 text-amber-700'
                                               : 'bg-green-100 text-green-700'
                                       }`}>
                                           {editModalData.product.quantity <= Number(editModalData.value)
                                               ? 'Low Stock'
                                               : editModalData.product.quantity <= Number(editModalData.value) * 2
                                               ? 'Normal'
                                               : 'High Stock'
                                           }
                                       </span>
                                   </div>
                               </div>
                           </div>
                       )}

                       {/* Action Buttons */}
                       <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                           <button
                               onClick={() => {
                                   setShowEditMinStockModal(false);
                                   setEditModalData(null);
                               }}
                               className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                           >
                               Cancel
                           </button>
                           <button
                               onClick={async () => {
                                   console.log('Edit Min Stock: Starting update process');
                                   const newMinStock = Number(editModalData.value);
                                   if (isNaN(newMinStock) || newMinStock < 0) {
                                       showError("Invalid Value", "Minimum stock must be a valid number (0 or greater).");
                                       return;
                                   }

                                   const updatedProduct = { ...editModalData.product, minStockLevel: newMinStock };
                                   console.log('Edit Min Stock: Updated product object', updatedProduct);

                                   try {
                                       if (onUpdateProduct) {
                                           console.log('Edit Min Stock: Calling onUpdateProduct');
                                           await onUpdateProduct(updatedProduct);
                                           console.log('Edit Min Stock: onUpdateProduct completed successfully');
                                       } else {
                                           console.log('Edit Min Stock: Using fallback local update');
                                           // Fallback to local update if no callback provided
                                           setProducts((prev: Product[]) => prev.map(p =>
                                               p.id === editModalData.product.id
                                                   ? updatedProduct
                                                   : p
                                           ));
                                           showSuccess("Min Stock Updated", `Minimum stock for ${editModalData.product.name} set to ${newMinStock} units`, 5000);
                                       }
                                       setShowEditMinStockModal(false);
                                       setEditModalData(null);
                                   } catch (error) {
                                       console.error('Edit Min Stock: Error occurred', error);
                                       // Error handling is done in the callback
                                   }
                               }}
                               className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                               disabled={!editModalData.value || isNaN(Number(editModalData.value)) || Number(editModalData.value) < 0}
                           >
                               Update Min Stock
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {showRestockInvoicesModal && (
         <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
             <div className="flex items-center justify-between p-4 border-b border-slate-200">
               <h3 className="text-lg font-bold text-slate-900">Restock Invoices</h3>
               <button
                 onClick={() => setShowRestockInvoicesModal(false)}
                 className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
               >
                 <X size={20} />
               </button>
             </div>

             <div className="p-4 overflow-auto">
               {isLoadingRestockInvoices ? (
                 <p className="text-sm text-slate-500">Loading restock invoices...</p>
               ) : restockInvoices.length === 0 ? (
                 <p className="text-sm text-slate-500">No restock invoices found.</p>
               ) : (
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                       <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Invoice</th>
                       <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Customer/Supplier</th>
                       <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                       <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Date</th>
                       <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {restockInvoices.map((inv) => (
                       <tr key={inv.id} className="hover:bg-slate-50">
                         <td className="px-3 py-3">
                           <p className="font-semibold text-slate-900">{inv.id}</p>
                           <p className="text-xs text-slate-500">{inv.status}</p>
                         </td>
                         <td className="px-3 py-3 text-sm text-slate-700">{inv.customerName || 'Inventory Restock'}</td>
                         <td className="px-3 py-3 font-semibold text-slate-900">{fmtCurrency(inv.totalAmount)} TZS</td>
                         <td className="px-3 py-3 text-sm text-slate-600">{inv.dateIssued ? new Date(inv.dateIssued).toLocaleString() : 'N/A'}</td>
                         <td className="px-3 py-3">
                           <div className="flex items-center gap-2">
                             <button
                               onClick={() => handleViewRestockInvoice(inv.id)}
                               className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1"
                             >
                               <Eye size={14} /> View
                             </button>
                             <button
                               onClick={() => handleDownloadRestockInvoice(inv.id)}
                               className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                             >
                               <Download size={14} /> Download
                             </button>
                             <button
                               onClick={() => handleShareRestockInvoice(inv.id)}
                               className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-violet-50 text-violet-700 hover:bg-violet-100 flex items-center gap-1"
                             >
                               <Share2 size={14} /> Share
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
             </div>
           </div>
         </div>
       )}

     </div>
   );
};

export default Inventory;


