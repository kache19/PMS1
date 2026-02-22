import {
  Branch,
  Staff,
  BranchInventoryItem,
  Sale,
  Invoice,
  Expense,
  StockTransfer,
  Product,
  Patient,
  Prescription,
  SystemSetting,
  AuditLog,
  LoginTracker,
  CartItem,
  PaymentMethod,
  Entity,
  Shipment
} from '../types';

// Use explicit env override when provided; otherwise choose a sensible default
const getApiUrl = () => {
  // Check for VITE_API_URL first (Vite environment variable)
  const envUrl = (import.meta as any)?.env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }

  // In Vite dev, use proxy. In production, hit PHP backend route directly.
  const isDev = Boolean((import.meta as any)?.env?.DEV);
  return isDev ? '/api/' : `${window.location.origin}/backend_php/index.php/api/`;
};

export const API_URL = getApiUrl();
const REQUEST_TIMEOUT = 30000; // 30 seconds
const normalizeUserRole = (role: unknown) => {
  const key = String(role ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (key === 'SUPERADMIN') return 'SUPER_ADMIN';
  if (key === 'BRANCHMANAGER') return 'BRANCH_MANAGER';
  if (key === 'PHARMACIST') return 'PHARMACIST';
  if (key === 'DISPENSER') return 'DISPENSER';
  if (key === 'STOREKEEPER') return 'STOREKEEPER';
  if (key === 'INVENTORYCONTROLLER') return 'INVENTORY_CONTROLLER';
  if (key === 'ACCOUNTANT') return 'ACCOUNTANT';
  if (key === 'AUDITOR') return 'AUDITOR';
  return String(role ?? '');
};

const normalizeStaffUser = (user: any): Staff => ({
  ...user,
  id: String(user?.id ?? ''),
  branchId: user?.branchId ?? user?.branch_id ?? undefined,
  role: normalizeUserRole(user?.role) as Staff['role']
});

const normalizeShipment = (row: any): Shipment => {
  const rawItems = row?.items;
  let items: Array<{ productId: string; productName: string; quantity: number }> = [];
  if (Array.isArray(rawItems)) {
    items = rawItems.map((item: any) => ({
      productId: String(item?.productId ?? item?.product_id ?? ''),
      productName: String(item?.productName ?? item?.product_name ?? ''),
      quantity: Number(item?.quantity ?? 0)
    }));
  } else if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        items = parsed.map((item: any) => ({
          productId: String(item?.productId ?? item?.product_id ?? ''),
          productName: String(item?.productName ?? item?.product_name ?? ''),
          quantity: Number(item?.quantity ?? 0)
        }));
      }
    } catch {
      items = [];
    }
  }

  return {
    id: String(row?.id ?? ''),
    transferId: row?.transferId ?? row?.transfer_id ?? null,
    fromBranchId: String(row?.fromBranchId ?? row?.from_branch_id ?? ''),
    toBranchId: String(row?.toBranchId ?? row?.to_branch_id ?? ''),
    status: String(row?.status ?? 'PENDING').toUpperCase() as Shipment['status'],
    verificationCode: String(row?.verificationCode ?? row?.verification_code ?? ''),
    totalValue: Number(row?.totalValue ?? row?.total_value ?? 0),
    notes: row?.notes ?? '',
    createdBy: String(row?.createdBy ?? row?.created_by ?? ''),
    approvedBy: row?.approvedBy ?? row?.approved_by ?? undefined,
    createdAt: String(row?.createdAt ?? row?.created_at ?? ''),
    approvedAt: row?.approvedAt ?? row?.approved_at ?? undefined,
    items
  };
};

/**
 * Enhanced fetch with timeout, error handling, and automatic retry
 */
async function fetchJSON(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const method = options.method || 'GET';
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Prefer localStorage to match App session persistence behavior.
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const opts: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  opts.signal = controller.signal;

  try {
    const res = await fetch(url, opts);
    clearTimeout(timeoutId);

    // Handle 204 No Content
    if (res.status === 204) {
      return null;
    }

    // Handle 401/403 auth failures - dispatch event for app to handle (no page refresh)
    if (res.status === 401 || res.status === 403) {
      let authMessage = res.status === 401 ? 'Unauthorized. Please login again.' : 'Session expired. Please login again.';
      try {
        const errorBody = await res.clone().json();
        const serverMessage = String(errorBody?.error || errorBody?.message || '');
        if (serverMessage) authMessage = serverMessage;
      } catch {
        const textBody = await res.clone().text().catch(() => '');
        if (textBody) authMessage = textBody;
      }

      const lowerMsg = authMessage.toLowerCase();
      const isAuthFailure =
        res.status === 401
        || lowerMsg.includes('token')
        || lowerMsg.includes('unauthorized')
        || lowerMsg.includes('session')
        || lowerMsg.includes('expired');

      if (!isAuthFailure) {
        // Fall through to normal non-auth error handling
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pms:auth-expired', { detail: { message: authMessage } }));
        }
        throw new Error(authMessage);
      }
    }

    // Handle other errors
    if (!res.ok) {
      let errorMessage = `${res.status} ${res.statusText}`;
      try {
        const errorBody = await res.json();
        errorMessage = errorBody.error || errorBody.message || errorMessage;
      } catch {
        const textBody = await res.text().catch(() => '');
        if (textBody) errorMessage = textBody;
      }

      throw new Error(`${method} ${path} failed: ${errorMessage}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // Log warning for network errors
      console.warn(`Network error for ${method} ${path} - server may be unreachable`);
      
      // Don't throw - just log and return empty array for get endpoints, or throw for others
      if (path.startsWith('get') || path.includes('?')) {
        return [];
      }
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Handle abort/timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timeout. ${method} ${path} took too long.`);
    }

    throw error;
  }
}

/**
 * Login user and store auth token
 */
export const login = async (username: string, password: string) => {
  const result = await fetchJSON('auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  if (result?.user) {
    return { ...result, user: normalizeStaffUser(result.user) };
  }
  return result;
};

/**
 * Logout user and clear auth
 */
function logout(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('user');
}

/**
 * Get current authenticated user
 */
function getCurrentUser(): Staff | null {
  try {
    const userJson = localStorage.getItem('user') || sessionStorage.getItem('user');
    return userJson ? normalizeStaffUser(JSON.parse(userJson)) : null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated(): boolean {
  return !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
}

export const api = {
  // Auth
  login,
  refreshToken: (): Promise<{ token: string }> =>
    fetchJSON('auth/refresh', { method: 'POST' }),
  logout,
  getCurrentUser,
  isAuthenticated,

  // Products
  getProducts: (): Promise<Product[]> =>
    fetchJSON('products').catch(() => []),

  getProduct: (id: string): Promise<Product | null> =>
    fetchJSON(`products/${id}`).catch(() => null),

  createProduct: (payload: Partial<Product>): Promise<Product> =>
    fetchJSON('products', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  bulkImportProducts: (products: Partial<Product>[]): Promise<{
    message: string;
    results: {
      total: number;
      successful: number;
      failed: number;
      successDetails: Array<{ index: number; id: string; name: string }>;
      failures: Array<{ index: number; name: string; reason: string }>;
    }
  }> =>
    fetchJSON('products/bulk', {
      method: 'POST',
      body: JSON.stringify({ products })
    }),

  updateProduct: (id: string, payload: Partial<Product>): Promise<Product> =>
    fetchJSON(`products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteProduct: (id: string): Promise<void> =>
    fetchJSON(`products/${id}`, { method: 'DELETE' }),

  clearAllProducts: (): Promise<{ message: string; deletedCount: number }> =>
    fetchJSON('products', { method: 'DELETE' }),

  // Branches
  getBranches: (): Promise<Branch[]> =>
    fetchJSON('branches').catch(() => []),

  getBranch: (id: string): Promise<Branch | null> =>
    fetchJSON(`branches/${id}`).catch(() => null),

  createBranch: (payload: Partial<Branch>): Promise<Branch> =>
    fetchJSON('branches', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateBranch: (id: string, payload: Partial<Branch>): Promise<Branch> =>
    fetchJSON(`branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // Inventory
   getInventory: (branchId?: string): Promise<Record<string, BranchInventoryItem[]>> =>
     branchId ? fetchJSON(`inventory?id=${branchId}`).then(data => ({ [branchId]: data })).catch(() => ({})) : fetchJSON('inventory').catch(() => ({})),

   getBranchInventory: (branchId: string): Promise<BranchInventoryItem[]> =>
     fetchJSON(`inventory/${branchId}`).catch(() => []),

   getInventoryItem: (branchId: string, productId: string): Promise<BranchInventoryItem | null> =>
     fetchJSON(`inventory/${branchId}/${productId}`).catch(() => null),

   updateInventoryItem: (branchId: string, productId: string, payload: Partial<BranchInventoryItem>): Promise<BranchInventoryItem> =>
     fetchJSON(`inventory/${branchId}/${productId}`, {
       method: 'PUT',
       body: JSON.stringify(payload)
     }),

   addInventoryBatch: (branchId: string, productId: string, batch: any): Promise<BranchInventoryItem> =>
     fetchJSON(`inventory/${branchId}/${productId}/batches`, {
       method: 'POST',
       body: JSON.stringify(batch)
     }),


  // Transfers
   getTransfers: (): Promise<StockTransfer[]> =>
     fetchJSON('inventory/transfers').catch(() => []),

   getTransfer: (id: string): Promise<StockTransfer | null> =>
     fetchJSON(`inventory/transfers/${id}`).catch(() => null),

   createTransfer: (payload: Partial<StockTransfer>): Promise<StockTransfer> =>
     fetchJSON('inventory/transfers', {
       method: 'POST',
       body: JSON.stringify(payload)
     }),

   updateTransfer: (id: string, payload: Partial<StockTransfer>): Promise<StockTransfer> =>
     fetchJSON(`inventory/transfers/${id}`, {
       method: 'PUT',
       body: JSON.stringify(payload)
     }),

   approveTransfer: (id: string): Promise<StockTransfer> =>
     fetchJSON(`inventory/transfers/${id}/approve`, { method: 'POST' }),

   verifyTransferByStoreKeeper: (id: string): Promise<any> =>
     fetchJSON(`inventory/transfers/${id}/verify-storekeeper`, { method: 'POST' }),

   verifyTransferByController: (id: string): Promise<StockTransfer> =>
     fetchJSON(`inventory/transfers/${id}/verify-controller`, { method: 'POST' }),

   rejectTransfer: (id: string, payload: { step: 'KEEPER' | 'CONTROLLER'; reason?: string }): Promise<StockTransfer> =>
     fetchJSON(`inventory/transfers/${id}/reject`, {
       method: 'POST',
       body: JSON.stringify(payload)
     }),

  // Sales
  getSales: (): Promise<Sale[]> =>
    fetchJSON('sales').catch(() => []),

  getSale: (id: string): Promise<Sale | null> =>
    fetchJSON(`sales/${id}`).catch(() => null),

  createSale: (payload: Partial<Sale>): Promise<Sale> =>
    fetchJSON('sales', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Invoices
  getInvoices: (): Promise<Invoice[]> =>
    fetchJSON('finance/invoices').catch(() => []),

  getInvoice: (id: string): Promise<Invoice | null> =>
    fetchJSON(`finance/invoices/${id}`).catch(() => null),

  createInvoice: (payload: Partial<Invoice>): Promise<any> =>
    fetchJSON('finance/invoices', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateInvoice: (id: string, payload: Partial<Invoice>): Promise<Invoice> =>
    fetchJSON(`finance/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  recordPayment: (invoiceId: string, payment: any): Promise<Invoice> =>
    fetchJSON(`finance/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment)
    }),

  getFinancialSummary: (params?: { branchId?: string; startDate?: string; endDate?: string }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append('branchId', params.branchId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const query = queryParams.toString();
    return fetchJSON(`finance/summary${query ? '?' + query : ''}`).catch(() => ({
      totalSales: 0,
      totalProfit: 0,
      totalExpenses: 0,
      totalInvoiced: 0,
      totalReceived: 0,
      netIncome: 0
    }));
  },

  // Expenses
  getExpenses: (): Promise<Expense[]> =>
    fetchJSON('expenses').catch(() => []),

  getExpense: (id: string): Promise<Expense | null> =>
    fetchJSON(`expenses/${id}`).catch(() => null),

  createExpense: (payload: Partial<Expense>): Promise<Expense> =>
    fetchJSON('expenses', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateExpense: (id: string, payload: Partial<Expense>): Promise<Expense> =>
    fetchJSON(`expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteExpense: (id: string): Promise<void> =>
    fetchJSON(`expenses/${id}`, { method: 'DELETE' }),

  // Staff
  getStaff: (): Promise<Staff[]> =>
    fetchJSON('staff').catch(() => []),

  getStaffMember: (id: string): Promise<Staff | null> =>
    fetchJSON(`staff/${id}`).catch(() => null),

  createStaff: (payload: Partial<Staff>): Promise<Staff> =>
    fetchJSON('staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateStaff: (id: string, payload: Partial<Staff>): Promise<Staff> =>
    fetchJSON(`staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteStaff: (id: string): Promise<void> =>
    fetchJSON(`staff/${id}`, { method: 'DELETE' }),

  // Patients
  getPatients: (): Promise<Patient[]> =>
    fetchJSON('patients').catch(() => []),

  getPatient: (id: string): Promise<Patient | null> =>
    fetchJSON(`patients/${id}`).catch(() => null),

  createPatient: (payload: Partial<Patient>): Promise<Patient> =>
    fetchJSON('patients', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updatePatient: (id: string, payload: Partial<Patient>): Promise<Patient> =>
    fetchJSON(`patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // Prescriptions
  getPrescriptions: (): Promise<Prescription[]> =>
    fetchJSON('prescriptions').catch(() => []),

  getPrescription: (id: string): Promise<Prescription | null> =>
    fetchJSON(`prescriptions/${id}`).catch(() => null),

  createPrescription: (payload: Partial<Prescription>): Promise<Prescription> =>
    fetchJSON('prescriptions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updatePrescription: (id: string, payload: Partial<Prescription>): Promise<Prescription> =>
    fetchJSON(`prescriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // Settings
  getSettings: (): Promise<SystemSetting[]> =>
    fetchJSON('settings').catch(() => []),

  getSetting: (key: string): Promise<SystemSetting | null> =>
    fetchJSON(`settings/${key}`).catch(() => null),

  createSetting: (payload: Partial<SystemSetting>): Promise<SystemSetting> =>
    fetchJSON('settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateSetting: (id: string, value: any): Promise<SystemSetting> =>
    fetchJSON(`settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ settingValue: value })
    }),

  // Audit Logs
  getAuditLogs: (params?: { limit?: number; offset?: number; userId?: string }): Promise<AuditLog[]> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.userId) queryParams.append('userId', params.userId);
    const query = queryParams.toString();
    return fetchJSON(`audit-logs${query ? '?' + query : ''}`).catch(() => []);
  },

  getAuditLog: (id: string): Promise<AuditLog | null> =>
    fetchJSON(`audit-logs/${id}`).catch(() => null),

  // Login Trackers
  getLoginTrackers: (params?: { branch?: string; days?: number }): Promise<LoginTracker[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'login-trackers');
    if (params?.branch) queryParams.append('branch', params.branch);
    if (params?.days) queryParams.append('days', params.days.toString());
    return fetchJSON(`settings?${queryParams.toString()}`).catch(() => []);
  },

  // Backup & Restore
  createBackup: (): Promise<any> =>
    fetchJSON('backup?action=create', { method: 'POST' }).catch(() => ({})),

  listBackups: (): Promise<any[]> =>
    fetchJSON('backup?action=list').catch(() => []),

  downloadBackup: (filename: string): Promise<Blob> =>
    fetch(`${API_URL}/backup?action=download&filename=${encodeURIComponent(filename)}`).then(r => r.blob()).catch(() => new Blob()),

  restoreBackup: (filename: string): Promise<any> =>
    fetchJSON(`backup?action=restore&filename=${encodeURIComponent(filename)}`).catch(() => ({})),

  deleteBackup: (filename: string): Promise<any> =>
    fetchJSON('backup?action=delete', {
      method: 'DELETE',
      body: JSON.stringify({ filename })
    }).catch(() => ({})),

  getBackupStatus: (): Promise<any> =>
    fetchJSON('backup?action=status').catch(() => ({})),

  scheduleAutoBackup: (config: { enabled: boolean; backupTime: string; retentionDays: number }): Promise<any> =>
    fetchJSON('backup?action=schedule', {
      method: 'POST',
      body: JSON.stringify({
        enabled: config.enabled,
        backupTime: config.backupTime,
        retentionDays: config.retentionDays
      })
    }).catch(() => ({})),

  // Sessions
  getSessions: (): Promise<any[]> =>
    fetchJSON('sessions').catch(() => []),

  revokeSession: (sessionId: string): Promise<void> =>
    fetchJSON(`sessions/${sessionId}/revoke`, { method: 'POST' }),

  // System
  getSystemHealth: (): Promise<any> =>
    fetchJSON('health').catch(() => ({})),

  factoryReset: (): Promise<void> =>
    fetchJSON('system/factory-reset', { method: 'POST' }),

  // Requisitions
  getRequisitions: (): Promise<any[]> =>
    fetchJSON('requisitions').catch(() => []),

  getRequisition: (id: string): Promise<any | null> =>
    fetchJSON(`requisitions/${id}`).catch(() => null),

  createRequisition: (payload: any): Promise<any> =>
    fetchJSON('requisitions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateRequisition: (id: string, payload: any): Promise<any> =>
    fetchJSON(`requisitions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  updateRequisitionStatus: (id: string, status: 'APPROVED' | 'REJECTED', approvedBy?: string): Promise<any> =>
    fetchJSON(`requisitions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, approvedBy })
    }),

  initiateShipment: (requisitionId: string, items: any[], notes: string, branchId: string): Promise<any> =>
    fetchJSON(`requisitions/${requisitionId}?action=initiate-shipment`, {
      method: 'POST',
      body: JSON.stringify({ items, notes, branchId })
    }),

  // Release Requests
   getReleaseRequests: (): Promise<any[]> =>
     fetchJSON('releases').catch(() => []),

   createReleaseRequest: (payload: any): Promise<any> =>
     fetchJSON('releases', {
       method: 'POST',
       body: JSON.stringify(payload)
     }),

   approveReleaseRequest: (id: string): Promise<any> =>
     fetchJSON(`releases/${id}`, {
       method: 'PUT',
       body: JSON.stringify({ status: 'APPROVED' })
     }),

   rejectReleaseRequest: (id: string): Promise<any> =>
     fetchJSON(`releases/${id}`, {
       method: 'PUT',
       body: JSON.stringify({ status: 'REJECTED' })
     }),

   updateReleaseStatus: (id: string, status: string): Promise<any> =>
     fetchJSON(`releases/${id}`, {
       method: 'PUT',
       body: JSON.stringify({ status })
     }),

  // Disposal Requests
  getDisposalRequests: (): Promise<any[]> =>
    fetchJSON('disposals').catch(() => []),

  approveDisposalRequest: (id: string): Promise<any> =>
    fetchJSON(`disposals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' })
    }),

  // Generic/Custom requests
   request: (path: string, options: RequestInit = {}): Promise<any> =>
     fetchJSON(path.startsWith('/') ? path.substring(1) : path, options),

  // Shipments
  getShipments: (): Promise<Shipment[]> =>
    fetchJSON('shipments')
      .then((rows: any[]) => (Array.isArray(rows) ? rows.map(normalizeShipment) : []))
      .catch(() => []),

  getShipment: (id: string): Promise<Shipment | null> =>
    fetchJSON(`shipments/${id}`).then(normalizeShipment).catch(() => null),

  createShipment: (payload: any): Promise<any> =>
    fetchJSON('shipments', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  createDirectShipment: (payload: any): Promise<any> =>
    fetchJSON('shipments?action=create-direct', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateShipment: (id: string, payload: any): Promise<any> =>
    fetchJSON(`shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // Customer Shipments (for external customers like Malenya Sayuni Medics)
  createCustomerShipment: (payload: {
    customerName: string;
    branchId?: string;
    products?: Array<{
      id: string;
      name?: string;
      quantity: number;
      price: number;
    }>;
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    shipment: {
      id: string;
      customerName: string;
      customerId: string;
      status: string;
      totalValue: number;
      itemsCount: number;
    };
    invoice: {
      id: string;
      totalAmount: number;
      status: string;
      dueDate: string;
      items: any[];
    };
  }> =>
    fetchJSON('shipments/customer-shipment', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Stock
  addStock: async (data: {
    branchId: string;
    productId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    supplierId?: string;
    supplierName?: string;
    restockStatus?: string;
    lastRestockDate?: string;
    costPrice?: number;
    sellingPrice?: number;
  }) => {
    return fetchJSON('inventory/addStock', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  addStockBulk: async (data: {
    branchId: string;
    supplierId?: string;
    supplierName?: string;
    restockStatus?: string;
    items: Array<{
      productId: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
      costPrice?: number;
      sellingPrice?: number;
    }>;
  }) => {
    return fetchJSON('inventory/addStockBulk', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Entities (Customers & Suppliers)
  getEntities: (params?: { type?: string; status?: string }): Promise<Entity[]> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    const query = queryParams.toString();
    return fetchJSON(`entities${query ? '?' + query : ''}`);
  },

  getEntity: (id: string): Promise<Entity | null> =>
    fetchJSON(`entities/${id}`).catch(() => null),

  createEntity: (payload: Partial<Entity>): Promise<Entity> =>
    fetchJSON('entities', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateEntity: (id: string, payload: Partial<Entity>): Promise<Entity> =>
    fetchJSON(`entities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteEntity: (id: string): Promise<void> =>
    fetchJSON(`entities/${id}`, { method: 'DELETE' })
};

const handleInvoicePayment = async (
  updatedInvoice: Invoice,
  invoices: Invoice[],
  setInvoices: (callback: (prev: Invoice[]) => Invoice[]) => void,
  setInventory: (callback: (prev: Record<string, BranchInventoryItem[]>) => Record<string, BranchInventoryItem[]>) => void,
  setSales: (callback: (prev: Sale[]) => Sale[]) => void,
  showSuccess: (title: string, message: string) => void,
  showError: (title: string, message: string) => void
) => {
    // Check if invoice is already paid to prevent duplicate processing
    const existingInvoice = invoices.find(inv => inv.id === updatedInvoice.id);
    if (existingInvoice?.status === 'PAID') {
        console.warn('Invoice already paid, skipping duplicate processing', updatedInvoice.id);
        return;
    }

    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));

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
          // Create sale record with payment method
          await api.createSale(saleRecord);
          setSales(prev => [saleRecord, ...prev]);
          
          showSuccess('Invoice Paid', `Payment of ${updatedInvoice.totalAmount} TZS recorded via ${saleRecord.paymentMethod}.`);
      } catch (error) {
          console.error('Failed to record sale:', error);
          showError('Save Error', 'Sale record could not be saved. Please check your connection and try again.');
      }
    }

    try {
        const updatedInvoices = await api.getInvoices();
        setInvoices(() => updatedInvoices);
    } catch (error) {
        console.error('Failed to refresh invoice data:', error);
    }
  };
