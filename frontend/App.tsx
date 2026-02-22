import React, { useState, useEffect, useRef } from 'react';
import { Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Finance from './components/Finance';
import Branches from './components/Branches';
import Staff from './components/Staff';
import Clinical from './components/Clinical';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Approvals from './components/Approvals';
import Archive from './components/Archive';
import Entities from './components/Entities';
import { NotificationProvider, NotificationContainer, useNotifications } from './components/NotificationContext';
import { Staff as StaffType, UserRole, BranchInventoryItem, StockTransfer, Sale, Invoice, CartItem, PaymentMethod, StockReleaseRequest, StockRequisition, DisposalRequest, Expense, Branch, Product, SystemSetting } from './types';
import { api } from './services/api';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full text-center p-8">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-6">
              The application encountered an unexpected error. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-slate-500">Error Details</summary>
                <pre className="text-xs bg-slate-100 p-2 rounded mt-2 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const isGithubPagesDemo = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  const [currentUser, setCurrentUser] = useState<StaffType | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentBranchId, setCurrentBranchId] = useState('HEAD_OFFICE');
  const [isLoading, setIsLoading] = useState(false); // ✅ CHANGED: Start as false, not true

  // Global State for Data Consistency
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Record<string, BranchInventoryItem[]>>({});
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [disposalRequests, setDisposalRequests] = useState<DisposalRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const lastActivityRef = useRef<number>(Date.now());
  const isRefreshingTokenRef = useRef<boolean>(false);
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
  const normalizeRole = (role: unknown) => {
    const key = String(role ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (key === 'SUPERADMIN') return UserRole.SUPER_ADMIN;
    if (key === 'BRANCHMANAGER') return UserRole.BRANCH_MANAGER;
    if (key === 'PHARMACIST') return UserRole.PHARMACIST;
    if (key === 'DISPENSER') return UserRole.DISPENSER;
    if (key === 'STOREKEEPER') return UserRole.STOREKEEPER;
    if (key === 'INVENTORYCONTROLLER') return UserRole.INVENTORY_CONTROLLER;
    if (key === 'ACCOUNTANT') return UserRole.ACCOUNTANT;
    if (key === 'AUDITOR') return UserRole.AUDITOR;
    return role as UserRole;
  };
  const normalizeStaffUser = (user: any): StaffType => ({
    ...user,
    role: normalizeRole(user?.role),
    branchId: user?.branchId ?? user?.branch_id ?? ''
  });
  const findBranchById = (allBranches: Branch[], branchId: unknown) =>
    allBranches.find((branch) => branchIdsMatch(branch.id, branchId));
  const resolveBranchContext = (user: StaffType, allBranches: Branch[]): string => {
    if (user.role === UserRole.SUPER_ADMIN) {
      return allBranches.find((b) => b.isHeadOffice)?.id || 'HEAD_OFFICE';
    }
    const matchedBranch = findBranchById(allBranches, user.branchId);
    if (matchedBranch) return matchedBranch.id;
    return normalizeBranchId(user.branchId) || 'HEAD_OFFICE';
  };

  const getStoredToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const isDemoSession = () => localStorage.getItem('pmsDemoMode') === '1';
  const isTokenExpired = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return true;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      const exp = Number(payload?.exp || 0);
      if (!exp) return true;
      return (exp * 1000) <= Date.now();
    } catch {
      return true;
    }
  };

  const clearClientSession = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setCurrentBranchId('HEAD_OFFICE');
    setProducts([]);
    setInventory({});
    setTransfers([]);
    setSales([]);
    setInvoices([]);
    setExpenses([]);
    setDisposalRequests([]);
    setBranches([]);
    setStaffList([]);
    setSettings([]);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('pmsDemoMode');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
  };

  // ✅ NEW: Check if user was previously logged in (from localStorage) and validate token
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        const savedToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        if (savedUser && savedToken) {
          const user = normalizeStaffUser(JSON.parse(savedUser));
          if (isGithubPagesDemo && isDemoSession()) {
            setCurrentUser(user);
            setCurrentBranchId(user.branchId || 'HEAD_OFFICE');
            return;
          }

          // Validate token by making a test API call
          try {
            await api.getProducts(); // Test with a protected endpoint
            setCurrentUser(user);
            // Load data first to get branches, then set branch ID
            const loadedBranches = await loadData(user);
            setCurrentBranchId(resolveBranchContext(user, loadedBranches));
          } catch (error) {
            // Token is invalid, clear session and redirect to login
            console.error('Token validation failed:', error);
            clearClientSession();
            // Don't redirect here, let the app show login form
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        clearClientSession();
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const onAuthExpired = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>)?.detail?.message || 'Session expired. Please login again.';
      clearClientSession();
      showWarning('Session Expired', message);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pms:auth-expired', onAuthExpired as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pms:auth-expired', onAuthExpired as EventListener);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const enforceAuthGuard = () => {
      const token = getStoredToken();
      if (!token || isTokenExpired(token)) {
        clearClientSession();
        showWarning('Session Expired', 'Please login to continue.');
      }
    };

    enforceAuthGuard();
    const interval = window.setInterval(enforceAuthGuard, 15000);
    return () => window.clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const decodeJwtExpMs = (token: string): number => {
      try {
        const parts = token.split('.');
        if (parts.length < 2) return 0;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));
        const exp = Number(payload?.exp || 0);
        return exp > 0 ? exp * 1000 : 0;
      } catch {
        return 0;
      }
    };

    const getSessionTimeoutMs = () => {
      const rawValue = settings.find(s => s.settingKey === 'sessionTimeout')?.settingValue;
      const minutes = Number(rawValue || 15);
      return Math.max(1, minutes) * 60 * 1000;
    };

    const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh when <= 5 min left
    const TOKEN_CHECK_INTERVAL_MS = 60 * 1000; // check every 1 minute

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((name) => window.addEventListener(name, updateActivity, { passive: true }));

    const interval = window.setInterval(async () => {
      const now = Date.now();
      const idleMs = now - lastActivityRef.current;
      const sessionTimeoutMs = getSessionTimeoutMs();
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      if (!token) return;

      // End session only when user is idle beyond timeout.
      if (idleMs >= sessionTimeoutMs) {
        clearClientSession();
        showWarning('Session Timeout', 'You were logged out due to inactivity.');
        return;
      }

      const expMs = decodeJwtExpMs(token);
      if (!expMs) return;
      const remainingMs = expMs - now;
      if (remainingMs > TOKEN_REFRESH_THRESHOLD_MS || isRefreshingTokenRef.current) return;

      try {
        isRefreshingTokenRef.current = true;
        const response = await api.refreshToken();
        if (response?.token) {
          if (localStorage.getItem('authToken')) {
            localStorage.setItem('authToken', response.token);
          } else if (sessionStorage.getItem('authToken')) {
            sessionStorage.setItem('authToken', response.token);
          } else {
            localStorage.setItem('authToken', response.token);
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
      } finally {
        isRefreshingTokenRef.current = false;
      }
    }, TOKEN_CHECK_INTERVAL_MS);

    return () => {
      events.forEach((name) => window.removeEventListener(name, updateActivity));
      window.clearInterval(interval);
    };
  }, [currentUser, settings]);

  // ✅ NEW: Separate function to load data (only call AFTER login)
  const loadData = async (sessionUser?: StaffType | null): Promise<Branch[]> => {
    setIsLoading(true);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Data loading timeout - showing app anyway');
      setIsLoading(false);
      showWarning('Loading Timeout', 'Some data may not be fully loaded. Please refresh if you encounter issues.');
    }, 30000); // 30 second timeout

    try {
      // Load branches first
      let branchesData: Branch[] = [];
      try {
        branchesData = await api.getBranches();
        if (branchesData.length === 0 && sessionUser?.branchId) {
          const fallbackBranch = await api.getBranch(String(sessionUser.branchId));
          if (fallbackBranch) branchesData = [fallbackBranch];
        }
        setBranches(branchesData);
      } catch (error) {
        console.error('Failed to load branches:', error);
        if (sessionUser?.branchId) {
          const fallbackBranch = await api.getBranch(String(sessionUser.branchId)).catch(() => null);
          branchesData = fallbackBranch ? [fallbackBranch] : [];
          setBranches(branchesData);
        } else {
          showWarning('Warning', 'Could not load branch data. Some features may be limited.');
          branchesData = [];
          setBranches([]);
        }
      }

      // Load inventory data with pricing for all branches
      let inventoryData: Record<string, BranchInventoryItem[]> = {};
      try {
        inventoryData = await loadInventoryData(branchesData);
        setInventory(inventoryData);
      } catch (error) {
        console.error('Failed to load inventory:', error);
        inventoryData = {};
        setInventory({});
      }

      // Load remaining data in parallel with individual error handling
      const loadPromises = [
        api.getProducts().catch(() => []),
        api.getStaff().catch(() => []),
        api.getTransfers().catch(() => []),
        api.getInvoices().catch(() => []),
        api.getExpenses().catch(() => []),
        api.getDisposalRequests().catch(() => []),
        api.getSettings().catch(() => [])
      ];

      const [productsData, staffData, transfersData, invoicesData, expensesData, disposalData, settingsData] = await Promise.all(loadPromises);

      setProducts(productsData);
      setStaffList(staffData); // ✅ FIXED: Was setStaff, should be setStaffList
      setTransfers(transfersData);
      setInvoices(invoicesData);
      setExpenses(expensesData);
      setDisposalRequests(disposalData);
      setSettings(settingsData);

      // Show success message only if all critical data loaded
      if (branchesData.length > 0 && productsData.length >= 0) {
        showSuccess('Data Loaded', 'System data has been loaded successfully.');
      }

      clearTimeout(timeoutId);
      return branchesData;
    } catch (error) {
      console.error('Failed to load data:', error);
      showError('Data Load Error', 'Could not load system data from database. Please check your connection.');
      clearTimeout(timeoutId);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Load inventory data with pricing for all branches
  const loadInventoryData = async (branchesData: Branch[]) => {
    const inventoryMap: Record<string, BranchInventoryItem[]> = {};

    // Load inventory for each branch to get pricing data
    for (const branch of branchesData) {
      try {
        const branchInventory = await api.getBranchInventory(branch.id);
        inventoryMap[branch.id] = branchInventory;
      } catch (error) {
        console.error(`Failed to load inventory for branch ${branch.id}:`, error);
        inventoryMap[branch.id] = [];
      }
    }

    return inventoryMap;
  };

  // Automatic Expiry Check - Creates Disposal Requests
  useEffect(() => {
    if (Object.keys(inventory).length === 0 || products.length === 0) return;

    const checkExpiry = () => {
      const today = new Date().toISOString().split('T')[0];
      let hasUpdates = false;
      const updatedInventory = { ...inventory };
      const newDisposalRequests: DisposalRequest[] = [];

      Object.keys(updatedInventory).forEach(branchId => {
        updatedInventory[branchId] = updatedInventory[branchId].map(item => {
          let itemUpdated = false;
          const updatedBatches = item.batches.map(batch => {
              if (batch.expiryDate < today && batch.status === 'ACTIVE') {
                  hasUpdates = true;
                  itemUpdated = true;

                  // Create disposal request for expired batch
                  const product = products.find(p => p.id === item.productId);
                  if (product) {
                    const disposalRequest: DisposalRequest = {
                      id: `DISPOSAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      branchId: branchId,
                      requestedBy: 'SYSTEM', // Auto-generated by system
                      date: today,
                      status: 'PENDING',
                      items: [{
                        productId: item.productId,
                        productName: product.name,
                        batchNumber: batch.batchNumber,
                        quantity: batch.quantity,
                        reason: 'Expired Stock'
                      }]
                    };
                    newDisposalRequests.push(disposalRequest);
                  }

                  return { ...batch, status: 'EXPIRED' as const };
              }
              return batch;
          });
          return itemUpdated ? { ...item, batches: updatedBatches } : item;
        });
      });

      if (hasUpdates) {
          setInventory(updatedInventory);
      }

      // Add new disposal requests if any were created
      if (newDisposalRequests.length > 0) {
          setDisposalRequests(prev => [...prev, ...newDisposalRequests]);

          // Show notification about expired stock
          showWarning('Expired Stock Alert',
            `${newDisposalRequests.length} batch(es) have expired and are pending disposal approval.`
          );
      }
    };

    checkExpiry();
  }, [inventory, products]);

  // ✅ UPDATED: Handle Login and Load Data
  const handleLogin = async (user: StaffType, token?: string) => {
    const normalizedUser = normalizeStaffUser(user);
    setCurrentUser(normalizedUser);

    // Save to localStorage for persistence
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    if (token) {
      localStorage.setItem('authToken', token); // Save the actual JWT token
    }

    // Load data after login, then resolve branch using loaded branches.
    const loadedBranches = await loadData(normalizedUser);
    setCurrentBranchId(resolveBranchContext(normalizedUser, loadedBranches));

    // Set active tab based on role and permissions
    const roleToDefaultTab: Record<UserRole, string> = {
      [UserRole.SUPER_ADMIN]: 'dashboard',
      [UserRole.BRANCH_MANAGER]: 'dashboard',
      [UserRole.PHARMACIST]: 'clinical',
      [UserRole.DISPENSER]: 'pos',
      [UserRole.STOREKEEPER]: 'inventory',
      [UserRole.INVENTORY_CONTROLLER]: 'inventory',
      [UserRole.ACCOUNTANT]: 'finance',
      [UserRole.AUDITOR]: 'reports'
    };

    setActiveTab(roleToDefaultTab[normalizedUser.role] || 'dashboard');
  };

  const handleLogout = () => {
    clearClientSession();
  };

  // --- PERSISTENCE HANDLERS ---

  const handleAddProduct = async (newProduct: Product) => {
      setProducts(prev => [...prev, newProduct]);
      try {
          await api.createProduct(newProduct);
          showSuccess('Product Added', `${newProduct.name} has been added successfully.`);
      } catch (error) {
          console.error('Failed to add product:', error);
          setProducts(prev => prev.filter(p => p.id !== newProduct.id));
          showError('Failed to Save Product', 'Product was not saved to database. Please try again.');
          throw error;
      }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
      const previousProducts = products;
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));

      try {
          await api.updateProduct(updatedProduct.id, {
              name: updatedProduct.name,
              genericName: updatedProduct.genericName,
              category: updatedProduct.category,
              costPrice: updatedProduct.costPrice,
              price: updatedProduct.price,
              unit: updatedProduct.unit,
              minStockLevel: updatedProduct.minStockLevel,
              requiresPrescription: updatedProduct.requiresPrescription
          });
          showSuccess('Product Updated', `${updatedProduct.name} has been updated successfully.`);
      } catch (error) {
          console.error('Failed to update product:', error);
          setProducts(previousProducts);
          showError('Failed to Update Product', 'Product changes were not saved to database. Please try again.');
          throw error;
      }
  };

  const handleAddStock = async (data: {
      branchId: string,
      productId: string,
      batchNumber: string,
      expiryDate: string,
      quantity: number,
      supplierId?: string,
      supplierName?: string,
      restockStatus?: string,
      lastRestockDate?: string,
      costPrice?: number,
      sellingPrice?: number
  }) => {
      const previousInventory = inventory;
      
      // Add restock info if not provided
      const restockStatus = data.restockStatus || 'RECEIVED';
      const lastRestockDate = data.lastRestockDate || new Date().toISOString();
      setInventory(prev => {
         const branchInventory = [...(prev[data.branchId] || [])];
         const existingItemIndex = branchInventory.findIndex(i => i.productId === data.productId);

         const newBatch = {
             batchNumber: data.batchNumber,
             expiryDate: data.expiryDate,
             quantity: data.quantity,
             status: 'ACTIVE' as const,
             supplierName: data.supplierName,
             supplierId: data.supplierId
         };

         if (existingItemIndex >= 0) {
             const prevQty = branchInventory[existingItemIndex].quantity;
             branchInventory[existingItemIndex].batches.push(newBatch);
             branchInventory[existingItemIndex].quantity += data.quantity;
             // Mark as RESTOCKED if stock was low or zero before
             if (prevQty <= 0) {
                 branchInventory[existingItemIndex].restockStatus = 'RESTOCKED';
                 branchInventory[existingItemIndex].lastRestockDate = new Date().toISOString();
             }
         } else {
             branchInventory.push({
                 productId: data.productId,
                 quantity: data.quantity,
                 batches: [newBatch],
                 restockStatus: 'RESTOCKED',
                 lastRestockDate: new Date().toISOString()
             });
         }
         return { ...prev, [data.branchId]: branchInventory };
      });

      try {
             await api.addStock({ ...data, restockStatus, lastRestockDate });
             // Refetch inventory from server to ensure DB quantity is accurate
             const updatedInventory = await api.getInventory(data.branchId);
             setInventory(prev => ({ ...prev, ...updatedInventory }));
             showSuccess('Stock Added', `${data.quantity} units added to inventory.`);
       } catch (error) {
          console.error('Failed to add stock:', error);
          setInventory(previousInventory);
          throw error;
      }
  };

  const handleAddStockBulk = async (data: {
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
  }) => {
      try {
          await api.addStockBulk(data);
          const updatedInventory = await api.getInventory(data.branchId);
          setInventory(prev => ({ ...prev, ...updatedInventory }));
          showSuccess('Stock Added', `${data.items.length} item(s) restocked successfully.`);
      } catch (error) {
          console.error('Failed to add stock in bulk:', error);
          throw error;
      }
  };

  const handleCreateInvoice = async (newInvoice: Invoice) => {
    try {
      const createdInvoice = await api.createInvoice(newInvoice);
      // Return the created invoice (with ID from backend)
      // Backend generates IDs in format INV-BR###-YYYY-0001, so this should always be present
      const invoiceWithId = createdInvoice?.id 
        ? createdInvoice 
        : { ...newInvoice, id: newInvoice.id || `INV-BR000-${new Date().getFullYear()}-${Math.random().toString().substr(2, 4)}` };
      setInvoices(prev => [invoiceWithId, ...prev]);
      return invoiceWithId;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw error;
    }
  };

  const handleCreateTransfer = async (newTransfer: StockTransfer) => {
    setTransfers(prev => [newTransfer, ...prev]);

    try {
      await api.createTransfer(newTransfer);
    } catch (error) {
      console.error('Failed to create transfer:', error);
      setTransfers(prev => prev.filter(t => t.id !== newTransfer.id));
      throw error;
    }
  };

  const handleInvoicePayment = async (updatedInvoice: Invoice) => {
      // Check if invoice is already paid to prevent duplicate processing
      const existingInvoice = invoices.find(inv => inv.id === updatedInvoice.id);
      if (existingInvoice?.status === 'PAID') {
          console.warn('Invoice already paid, skipping duplicate processing', updatedInvoice.id);
          return;
      }

      const paymentMethod = updatedInvoice.payments[updatedInvoice.payments.length - 1]?.method;
      setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? { ...updatedInvoice, paymentMethod } : inv));

      if (updatedInvoice.status === 'PAID' && updatedInvoice.items && updatedInvoice.items.length > 0) {
          const branchId = updatedInvoice.branchId;

          setInventory(prev => {
            const branchStock = [...(prev[branchId] || [])];

            updatedInvoice.items?.forEach(cartItem => {
                const index = branchStock.findIndex(i => i.productId === cartItem.id);
                if (index !== -1) {
                    branchStock[index].quantity = Math.max(0, branchStock[index].quantity - cartItem.quantity);

                    let remainingToDeduct = cartItem.quantity;
                    const updatedBatches = branchStock[index].batches.map(batch => {
                         if (remainingToDeduct <= 0 || batch.status !== 'ACTIVE') return batch;

                         if (batch.quantity >= remainingToDeduct) {
                             const newBatchQty = batch.quantity - remainingToDeduct;
                             remainingToDeduct = 0;
                             return { ...batch, quantity: newBatchQty };
                         } else {
                             remainingToDeduct -= batch.quantity;
                             return { ...batch, quantity: 0 };
                         }
                    }).filter(b => b.quantity > 0);

                    branchStock[index].batches = updatedBatches;
                }
            });

            return { ...prev, [branchId]: branchStock };
        });

        const itemsToRecord: CartItem[] = updatedInvoice.items || [];
        const saleRecord: Sale = {
            id: `SALE-${updatedInvoice.id}`,
            date: new Date().toISOString(),
            branchId: updatedInvoice.branchId,
            items: itemsToRecord,
            totalAmount: updatedInvoice.totalAmount,
            totalCost: itemsToRecord.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0),
            profit: updatedInvoice.totalAmount - itemsToRecord.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0),
            paymentMethod: updatedInvoice.payments[updatedInvoice.payments.length - 1]?.method || PaymentMethod.CASH,
            customerName: updatedInvoice.customerName,
            status: 'COMPLETED'
        };

        try {
            await api.createSale(saleRecord);
            setSales(prev => [saleRecord, ...prev]);

        } catch (error) {
            console.error('Failed to record sale/payment:', error);
            showError('Warning', 'Sale recorded locally but may not be synced to backend. Please check inventory manually.');
        }
      }

      try {
          const updatedInvoices = await api.getInvoices();
          setInvoices(updatedInvoices);
      } catch (error) {
          console.error('Failed to refresh invoice data:', error);
      }
  };

  const handleCreateExpense = (exp: Expense) => {
      setExpenses(prev => [exp, ...prev]);
      api.createExpense(exp);
  };

  const handleExpenseAction = async (id: string | number, action: 'Approved' | 'Rejected') => {
      const numericId = Number(id);
      const previousExpenses = expenses;
      setExpenses(prev => prev.map(e => e.id === numericId ? { ...e, status: action } : e));

      try {
          await api.updateExpense(String(numericId), { status: action });
          showSuccess('Expense Updated', `Expense has been ${action.toLowerCase()} successfully.`);
      } catch (error) {
          console.error('Failed to update expense:', error);
          setExpenses(previousExpenses);
          showError('Update Failed', 'There was an error updating the expense. Please try again.');
      }
  };

  const handleDisposalAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
      const previousDisposals = disposalRequests;
      setDisposalRequests(prev => prev.map(d => d.id === id ? { ...d, status: action } : d));

      try {
          await api.approveDisposalRequest(id);
          showSuccess('Disposal Request Updated', `Disposal request has been ${action.toLowerCase()} successfully.`);

          // If approved, update inventory to remove the disposed stock
          if (action === 'APPROVED') {
              const disposal = disposalRequests.find(d => d.id === id);
              if (disposal) {
                  setInventory(prev => {
                      const updatedInventory = { ...prev };
                      disposal.items.forEach(item => {
                          if (updatedInventory[disposal.branchId]) {
                              updatedInventory[disposal.branchId] = updatedInventory[disposal.branchId].map(invItem => {
                                  if (invItem.productId === item.productId) {
                                      // Remove the disposed batch
                                      const updatedBatches = invItem.batches.filter(batch =>
                                          batch.batchNumber !== item.batchNumber
                                      );
                                      return { ...invItem, batches: updatedBatches, quantity: updatedBatches.reduce((sum, b) => sum + b.quantity, 0) };
                                  }
                                  return invItem;
                              }).filter(invItem => invItem.quantity > 0); // Remove items with no stock
                          }
                      });
                      return updatedInventory;
                  });
              }
          }
      } catch (error) {
          console.error('Failed to update disposal request:', error);
          setDisposalRequests(previousDisposals);
          showError('Update Failed', 'There was an error updating the disposal request. Please try again.');
      }
  };

  const handleAddStaff = async (newStaff: StaffType) => {
      setStaffList(prev => [newStaff, ...prev]);
      try {
          await api.createStaff(newStaff);
          showSuccess('Staff Added', `${newStaff.name} has been added successfully.`);
      } catch (error) {
        console.error('Failed to add staff:', error);
        setStaffList(prev => prev.filter(s => s.id !== newStaff.id));
        // Error notification removed as per user request
        throw error;
      }
  };

  const handleAddBranch = async (newBranch: Branch) => {
      setBranches(prev => [...prev, newBranch]);
      try {
          await api.request('/branches', {
              method: 'POST',
              body: JSON.stringify(newBranch)
          });
      } catch (error) {
          console.error('Failed to add branch:', error);
          setBranches(prev => prev.filter(b => b.id !== newBranch.id));
          throw error;
      }
  };

  const handleUpdateStaff = async (updatedStaff: StaffType) => {
      const previousStaffList = staffList;
      setStaffList(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));

      try {
          await api.updateStaff(updatedStaff.id, {
              name: updatedStaff.name,
              role: updatedStaff.role,
              branchId: updatedStaff.branchId,
              email: updatedStaff.email,
              phone: updatedStaff.phone,
              status: updatedStaff.status,
              password: updatedStaff.password
          });

          const updatedBranches = await api.getBranches();
          setBranches(updatedBranches);

          showSuccess('Staff Updated', `${updatedStaff.name}'s information has been saved successfully.`);
      } catch (error) {
          console.error('Failed to update staff:', error);
          setStaffList(previousStaffList);
          showError('Update Failed', 'There was an error saving the staff changes. Please try again.');
          throw error;
      }
  };

  // --- ARCHIVE LOGIC ---
  const handleToggleArchive = (type: 'invoice' | 'expense', id: string | number) => {
      if (currentUser?.role === UserRole.AUDITOR) {
          showWarning('Read-only Access', 'AUDITOR cannot modify archived records.');
          return;
      }
      if (type === 'invoice') {
          const inv = invoices.find(i => i.id === id);
          if (inv) {
              const newVal = !inv.archived;
              setInvoices(prev => prev.map(i => i.id === id ? { ...i, archived: newVal } : i));
              api.request(`/${type}/${id}/archive`, {
                  method: 'PATCH',
                  body: JSON.stringify({ archived: newVal })
              });
          }
      } else {
          const exp = expenses.find(e => e.id === id);
          if (exp) {
              const newVal = !exp.archived;
              setExpenses(prev => prev.map(e => e.id === id ? { ...e, archived: newVal } : e));
              api.request(`/${type}/${id}/archive`, {
                  method: 'PATCH',
                  body: JSON.stringify({ archived: newVal })
              });
          }
      }
  };

  const handleAutoArchive = (months: number) => {
      if (currentUser?.role === UserRole.AUDITOR) {
          showWarning('Read-only Access', 'AUDITOR cannot run archive operations.');
          return;
      }
      const thresholdDate = new Date();
      thresholdDate.setMonth(thresholdDate.getMonth() - months);
      const thresholdStr = thresholdDate.toISOString().split('T')[0];
      let count = 0;

      setInvoices(prev => prev.map(inv => {
          if (inv.status === 'PAID' && inv.dateIssued < thresholdStr && !inv.archived) {
              count++;
              api.request(`/invoice/${inv.id}/archive`, {
                  method: 'PATCH',
                  body: JSON.stringify({ archived: true })
              });
              return { ...inv, archived: true };
          }
          return inv;
      }));

      setExpenses(prev => prev.map(exp => {
          if (['Approved', 'Rejected'].includes(exp.status) && exp.date < thresholdStr && !exp.archived) {
              count++;
              api.request(`/expense/${exp.id}/archive`, {
                  method: 'PATCH',
                  body: JSON.stringify({ archived: true })
              });
              return { ...exp, archived: true };
          }
          return exp;
      }));

      showSuccess('Auto-Archive Complete', `${count} items have been moved to archive.`);
  };

  const authToken = getStoredToken();
  const authenticatedUser = currentUser;
  const hasValidSession = Boolean(authenticatedUser && authToken && !isTokenExpired(authToken));

  // ✅ Show Login if no authenticated session
  if (!hasValidSession) {
    return <Login onLogin={handleLogin} />;
  }

  // Show loading while fetching data after login
  if (isLoading) {
      return (
          <div className="h-screen flex items-center justify-center bg-slate-900 text-white flex-col">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Loading PMS Data...</p>
          </div>
      )
  }

  if (!authenticatedUser) {
    return <Login onLogin={handleLogin} />;
  }

  const usersBranch = findBranchById(branches, authenticatedUser.branchId);
  const branchRequiredRoles = [UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT, UserRole.PHARMACIST, UserRole.DISPENSER, UserRole.STOREKEEPER, UserRole.INVENTORY_CONTROLLER];

  if (authenticatedUser.role !== UserRole.SUPER_ADMIN && usersBranch?.status === 'INACTIVE') {
    // Branch is inactive
  } else if (authenticatedUser.role !== UserRole.SUPER_ADMIN && !usersBranch && branchRequiredRoles.includes(authenticatedUser.role)) {
    // For branch-required roles, if branch not found, allow access (perhaps branch was deleted)
  } else if (authenticatedUser.role !== UserRole.SUPER_ADMIN && !usersBranch) {
    // For other roles, deny if branch not found
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border border-slate-200">
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
                  <div className="flex items-center justify-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg mb-4">
                       <AlertTriangle size={18} />
                       <span className="font-bold">{usersBranch ? 'Branch Inactive' : 'Branch Not Found'}</span>
                  </div>
                  <p className="text-slate-500 mb-8">
                      Your assigned branch could not be found. Please contact your administrator.
                  </p>
                  <button 
                    onClick={handleLogout} 
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
                  >
                      Return to Login
                  </button>
              </div>
          </div>
      );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentBranchId={currentBranchId} inventory={inventory} sales={sales} expenses={expenses} onViewInventory={() => setActiveTab('inventory')} />;
      case 'approvals':
          return <Approvals
            releaseRequests={[]}
            onApproveRelease={() => {}}
            requisitions={[]}
            onActionRequisition={() => {}}
            disposalRequests={disposalRequests}
            onApproveDisposal={(req) => handleDisposalAction(req.id, 'APPROVED')}
            expenses={expenses}
            onActionExpense={handleExpenseAction}
            onApproveTransfer={() => {}}
          />;
      case 'pos':
        return <POS currentBranchId={currentBranchId} inventory={inventory} onCreateInvoice={handleCreateInvoice} products={products} />;
      case 'inventory':
        return (
            <Inventory
                currentBranchId={currentBranchId}
                inventory={inventory}
                setInventory={setInventory}
                transfers={transfers}
                setTransfers={setTransfers}
                sales={sales}
                currentUser={currentUser}
                products={products}
                setProducts={setProducts}
                branches={branches}
                onAddStock={handleAddStock}
                onAddStockBulk={handleAddStockBulk}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onCreateTransfer={handleCreateTransfer}
            />
        );
      case 'finance':
        return (
            <Finance
                currentBranchId={currentBranchId}
                invoices={invoices.filter(i => !i.archived)}
                expenses={expenses.filter(e => !e.archived)}
                sales={sales}
                onProcessPayment={handleInvoicePayment}
                onCreateExpense={handleCreateExpense}
                onArchiveItem={(type, id) => handleToggleArchive(type, id)}
                branches={branches}
                currentUser={currentUser}
                settings={settings}
            />
        );
      case 'staff':
        return <Staff currentBranchId={currentBranchId} branches={branches} staffList={staffList} currentUser={currentUser} onAddStaff={handleAddStaff} onUpdateStaff={handleUpdateStaff} />;
      case 'branches':
        return <Branches branches={branches} onUpdateBranches={setBranches} onAddBranch={handleAddBranch} staff={staffList} currentUser={currentUser || undefined} />;
      case 'entities':
        return <Entities mode="management" />;
      case 'clinical':
        return <Clinical currentBranchId={currentBranchId} />;
      case 'reports':
        return <Reports currentBranchId={currentBranchId} inventory={inventory} sales={sales} expenses={expenses} currentUser={currentUser} />;
      case 'archive':
        return (
            <Archive 
                currentBranchId={currentBranchId} 
                invoices={invoices} 
                expenses={expenses}
                currentUser={currentUser}
                onRestore={(type, id) => handleToggleArchive(type, id)}
                onAutoArchive={handleAutoArchive}
            />
        );
      case 'settings':
        return (
          <Settings 
            currentBranchId={currentBranchId} 
            inventory={inventory}
            sales={sales}
            expenses={expenses}
            invoices={invoices}
          />
        );
      default:
        return <Dashboard currentBranchId={currentBranchId} inventory={inventory} sales={sales} expenses={expenses} onViewInventory={() => setActiveTab('inventory')} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentBranchId={currentBranchId}
      setCurrentBranchId={setCurrentBranchId}
      currentUser={currentUser}
      onLogout={handleLogout}
      branches={branches}
    >
      {renderContent()}
      <NotificationContainer />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;
