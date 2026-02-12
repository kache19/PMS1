
import React, { useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Receipt,
  FileText, Plus, X, Printer, Store, Wallet, Building, CheckCircle, FilePlus, User, Eye, Archive, XCircle, Download, FileBarChart, Truck
} from 'lucide-react';
import { Invoice, PaymentMethod, Expense, Sale, Branch, Staff, UserRole, SystemSetting } from '../types';
import { api } from '../services/api';
import { printService } from '../services/printService';
import { openCustomPrint } from '../services/printUtils';
import InvoiceModal from './InvoiceModal';
import ExpenseModal from './ExpenseModal';
import InvoicePreviewModal from './InvoicePreviewModal';
import PaymentModal from './PaymentModal.tsx';
import ReportPrintTemplate from './ReportPrintTemplate';

const PAYMENT_METHODS_DATA = [
  { name: 'Cash', value: 4500000 },
  { name: 'M-Pesa / Tigo', value: 3500000 },
  { name: 'Insurance (NHIF/AAR)', value: 2500000 },
  { name: 'Credit', value: 500000 },
];

const COLORS = ['#0f766e', '#14b8a6', '#f59e0b', '#64748b'];

interface FinanceProps {
     currentBranchId: string;
     invoices: Invoice[];
     expenses: Expense[];
     sales: Sale[];
     onProcessPayment: (invoice: Invoice) => void;
     onCreateExpense: (expense: Expense) => void;
     onActionExpense?: (id: number, action: 'Approved' | 'Rejected') => void;
     onArchiveItem?: (type: 'invoice' | 'expense', id: string | number) => void;
     branches?: Branch[];
     currentUser?: Staff | null;
     settings?: SystemSetting[];
}

const Finance: React.FC<FinanceProps> = ({ currentBranchId, invoices: propInvoices = [], expenses: propExpenses = [], sales: propSales = [], onProcessPayment, onCreateExpense, onActionExpense, onArchiveItem, branches = [], currentUser, settings = [] }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'expenses' | 'sales'>('overview');

   // Modal State
   const [showInvoiceModal, setShowInvoiceModal] = useState(false);
   const [showPaymentModal, setShowPaymentModal] = useState(false);
   const [showExpenseModal, setShowExpenseModal] = useState(false);
   const [showPreviewModal, setShowPreviewModal] = useState(false); // New Preview Modal
   const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

   // Search and Filter State
   const [invoiceSearch, setInvoiceSearch] = useState('');
   const [expenseSearch, setExpenseSearch] = useState('');
   const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'PAID' | 'PARTIAL' | 'UNPAID'>('all');
   const [expenseStatusFilter, setExpenseStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');

   // Sales Report State
   const [salesStartDate, setSalesStartDate] = useState('');
   const [salesEndDate, setSalesEndDate] = useState('');
   const [salesCustomerSearch, setSalesCustomerSearch] = useState('');
   const [salesSortBy, setSalesSortBy] = useState<'date' | 'name' | 'time'>('date');
   const [salesSortOrder, setSalesSortOrder] = useState<'asc' | 'desc'>('desc');
   const [showSalesPreview, setShowSalesPreview] = useState(false);
   const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

   // Data State - loaded from API
   const [invoices, setInvoices] = useState<Invoice[]>(propInvoices);
   const [expenses, setExpenses] = useState<Expense[]>(propExpenses);
   const [sales, setSales] = useState<Sale[]>(propSales);
   const [isLoading, setIsLoading] = useState(true);

  const currentBranch = branches.find(b => b.id === currentBranchId);
  const isHeadOffice = currentBranch?.isHeadOffice || currentBranchId === 'HEAD_OFFICE';
  const branchName = currentBranch?.name || 'All Branches';

  // Form States
  const [newInvoice, setNewInvoice] = useState({ customer: '', phone: '', amount: '', description: '', due: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', discount: '', receipt: '', method: PaymentMethod.CASH });
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: 'Utilities',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    branchId: isHeadOffice ? (branches.find(b => !b.isHeadOffice)?.id || '') : currentBranchId
  });

  // Helper functions to get company info from settings
  const getCompanyInfo = () => {
    const companyName = settings.find(s => s.settingKey === 'companyName')?.settingValue || 'PMS Pharmacy Ltd';
    const tinNumber = settings.find(s => s.settingKey === 'tinNumber')?.settingValue || '123-456-789';
    const vrnNumber = settings.find(s => s.settingKey === 'vrnNumber')?.settingValue || '400-999-111';
    const address = settings.find(s => s.settingKey === 'address')?.settingValue || 'Bagamoyo Road, Dar es Salaam';
    const phone = settings.find(s => s.settingKey === 'phone')?.settingValue || '+255 700 123 456';
    const email = settings.find(s => s.settingKey === 'email')?.settingValue || 'info@pms.co.tz';
    const logo = settings.find(s => s.settingKey === 'logo')?.settingValue || '/pharmacy-logo.png';

    return { companyName, tinNumber, vrnNumber, address, phone, email, logo };
  };

  // Load data from API on mount and poll for updates
   React.useEffect(() => {
     const loadFinanceData = async (isInitialLoad = false) => {
       if (isInitialLoad) setIsLoading(true);
       try {
         const [invoicesData, expensesData, salesData] = await Promise.all([
           api.getInvoices(),
           api.getExpenses(),
           api.getSales()
         ]);

         setInvoices(invoicesData || []);
         setExpenses(expensesData || []);
         setSales(salesData || []);
       } catch (error) {
         console.error('Failed to load finance data:', error);
         // Keep prop data as fallback
         setInvoices(propInvoices);
         setExpenses(propExpenses);
         setSales(propSales);
       } finally {
         if (isInitialLoad) setIsLoading(false);
       }
     };

     // Initial load
     loadFinanceData(true);

     // Set up polling every 30 seconds
     const intervalId = setInterval(() => loadFinanceData(false), 30000);

     // Cleanup interval on unmount or branch change
     return () => clearInterval(intervalId);
   }, [currentBranchId]); // Reload when branch changes

  // Filter Data Logic
  const filteredInvoices = isHeadOffice ? invoices : invoices.filter(i => i.branchId === currentBranchId);
  const filteredExpenses = isHeadOffice ? expenses : expenses.filter(e => e.branchId === currentBranchId);
  const filteredSales = isHeadOffice ? sales : sales.filter(s => s.branchId === currentBranchId);

  // Search and Filter Logic
  const searchedInvoices = filteredInvoices.filter(inv =>
    inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.description.toLowerCase().includes(invoiceSearch.toLowerCase())
  ).filter(inv => invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter);

  const searchedExpenses = filteredExpenses.filter(exp =>
    exp.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
    exp.category.toLowerCase().includes(expenseSearch.toLowerCase())
  ).filter(exp => expenseStatusFilter === 'all' || exp.status === expenseStatusFilter);

  // Filtered and sorted sales for report
  const reportSales = useMemo(() => {
    let filtered = filteredSales;

    // Customer name filtering
    if (salesCustomerSearch) {
      filtered = filtered.filter(s =>
        s.customerName?.toLowerCase().includes(salesCustomerSearch.toLowerCase())
      );
    }

    // Date filtering
    if (salesStartDate) {
      filtered = filtered.filter(s => new Date(s.date) >= new Date(salesStartDate));
    }
    if (salesEndDate) {
      filtered = filtered.filter(s => new Date(s.date) <= new Date(salesEndDate + 'T23:59:59'));
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (salesSortBy) {
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'name':
          aVal = a.customerName || '';
          bVal = b.customerName || '';
          break;
        case 'time':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        default:
          aVal = a.date;
          bVal = b.date;
      }

      if (aVal < bVal) return salesSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return salesSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [filteredSales, salesCustomerSearch, salesStartDate, salesEndDate, salesSortBy, salesSortOrder]);

  // Permission Logic for Expense Approval
  const canApproveExpenses = (expense: Expense) => {
    if (!currentUser) return false;

    // SUPER_ADMIN can approve all expenses
    if (currentUser.role === UserRole.SUPER_ADMIN) return true;

    // ACCOUNTANT can approve all expenses
    if (currentUser.role === UserRole.ACCOUNTANT) return true;

    // BRANCH_MANAGER can approve expenses from their branch
    if (currentUser.role === UserRole.BRANCH_MANAGER && expense.branchId === currentUser.branchId) return true;

    return false;
  };

  const canViewExpenseDetails = () => {
    if (!currentUser) return false;
    return [UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT, UserRole.BRANCH_MANAGER].includes(currentUser.role);
  };

  // DYNAMIC CALCULATIONS
  const stats = useMemo(() => {
    const revenue = filteredSales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const profit = filteredSales.reduce((acc, curr) => acc + curr.profit, 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = profit - totalExpenses;
    const receivables = filteredInvoices.reduce((acc, i) => {
      const totalDiscount = i.payments.reduce((sum, p) => sum + (p.discount || 0), 0);
      return acc + (i.totalAmount - i.paidAmount - totalDiscount);
    }, 0);

    return { revenue, netProfit, totalExpenses, receivables };
  }, [filteredSales, filteredExpenses, filteredInvoices]);


  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportInvoices = () => {
    const exportData = filteredInvoices.map(inv => ({
      'Invoice ID': inv.id,
      'Customer': inv.customerName,
      'Total Amount': inv.totalAmount,
      'Paid Amount': inv.paidAmount,
      'Balance': (() => {
        const totalDiscount = inv.payments.reduce((sum, p) => sum + (p.discount || 0), 0);
        return inv.status === 'PAID' ? 0 : inv.totalAmount - inv.paidAmount - totalDiscount;
      })(),
      'Status': inv.status,
      'Date Issued': inv.dateIssued,
      'Due Date': inv.dueDate,
      'Description': inv.description
    }));
    exportToCSV(exportData, `invoices_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportExpenses = () => {
    const exportData = filteredExpenses.map(exp => ({
      'Description': exp.description,
      'Category': exp.category,
      'Amount': exp.amount,
      'Date': exp.date,
      'Status': exp.status,
      'Branch': branches.find(b => b.id === exp.branchId)?.name || 'Unknown'
    }));
    exportToCSV(exportData, `expenses_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportSales = () => {
    const exportData = reportSales.map((s: Sale) => ({
      ID: s.id,
      Date: s.date,
      Time: new Date(s.date).toLocaleTimeString(),
      Customer_Name: s.customerName,
      Total_Amount: s.totalAmount,
      Profit: s.profit,
      Payment_Method: s.paymentMethod,
      Branch: branches.find(b => b.id === s.branchId)?.name || s.branchId
    }));

    // Append summary row
    if (exportData.length > 0) {
      exportData.push({});
      const totalAmount = reportSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalProfit = reportSales.reduce((sum, s) => sum + s.profit, 0);
      exportData.push({
        ID: 'TOTAL_SUMMARY',
        Total_Amount: totalAmount,
        Profit: totalProfit,
        Branch: isHeadOffice ? 'All Branches' : branches.find(b => b.id === currentBranchId)?.name || 'Current Branch'
      });
    }
    exportToCSV(exportData, `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Print sales report
  const handlePrintSalesReport = () => {
    const reportData = {
      title: 'Sales Report',
      branchName,
      dateRange: salesStartDate && salesEndDate ? `${salesStartDate} to ${salesEndDate}` : 'All Time',
      data: reportSales.map(s => ({
        'Sale ID': s.id,
        'Date': new Date(s.date).toLocaleDateString(),
        'Time': new Date(s.date).toLocaleTimeString(),
        'Customer': s.customerName || 'Walk-in',
        'Amount': s.totalAmount.toLocaleString() + ' TZS',
        'Profit': s.profit.toLocaleString() + ' TZS',
        'Payment Method': s.paymentMethod
      })),
      summary: {
        'Total Sales': reportSales.length.toString(),
        'Total Revenue': reportSales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString() + ' TZS',
        'Total Profit': reportSales.reduce((sum, s) => sum + s.profit, 0).toLocaleString() + ' TZS'
      }
    };
    const companySettings = {
      companyName: 'PMS Pharmacy',
      tinNumber: '123-456-789',
      address: 'Bagamoyo Road, Dar es Salaam, Tanzania',
      phone: '+255 700 123 456',
      email: 'info@pms-pharmacy.tz',
      logo: '/backend_php/uploads/logos/logo.png'
    };
    const html = renderToStaticMarkup(
      <ReportPrintTemplate report={reportData} companySettings={companySettings} />
    );
    openCustomPrint(html, 'Sales Report Print');
  };

  // Income Vs Expense Chart Data
  const incomeVsExpenseData = useMemo(() => {
      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
      });

      return last7Days.map(dateStr => {
          // Use paid invoice amounts as income
          const dayIncome = filteredInvoices
              .filter(inv => inv.status === 'PAID' && inv.dateIssued.startsWith(dateStr))
              .reduce((sum, inv) => sum + inv.paidAmount, 0);
          const dayExpenses = filteredExpenses.filter(e => e.date.startsWith(dateStr));
          
          return {
              name: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              sales: dayIncome,
              expense: dayExpenses.reduce((sum, e) => sum + e.amount, 0)
          };
      });
  }, [filteredInvoices, filteredExpenses]);

  const handleCreateInvoice = async () => {
    if(!newInvoice.customer || !newInvoice.amount) return;

    try {
      const invoiceData: Partial<Invoice> = {
        branchId: isHeadOffice ? 'BR001' : currentBranchId, // Default to BR001 if HO creates
        customerName: newInvoice.customer,
        customerPhone: newInvoice.phone,
        dateIssued: new Date().toISOString().split('T')[0],
        dueDate: newInvoice.due || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        totalAmount: parseFloat(newInvoice.amount),
        paidAmount: 0,
        status: 'UNPAID' as Invoice['status'],
        description: newInvoice.description || 'General Supplies',
        source: 'MANUAL',
        items: [],
        payments: []
      };

      const createdInvoice = await api.createInvoice(invoiceData);
      setInvoices(prev => [createdInvoice, ...prev]);

      if (onProcessPayment) {
        onProcessPayment(createdInvoice); // Notify parent component
      }

      setShowInvoiceModal(false);
      setNewInvoice({ customer: '', phone: '', amount: '', description: '', due: '' });
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw new Error('Failed to create invoice. Please check your connection and try again.');
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const totalDiscount = invoice.payments.reduce((sum, p) => sum + (p.discount || 0), 0);
    const remaining = invoice.totalAmount - invoice.paidAmount - totalDiscount;
    // Generate a unique receipt number automatically
    const generatedReceipt = `TRA-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    
    setNewPayment({
        amount: remaining.toString(), // Auto-fill remaining balance
        discount: '0',
        receipt: generatedReceipt,
        method: PaymentMethod.CASH
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if(!selectedInvoice || !newPayment.amount || !newPayment.receipt) return;

    try {
      const amount = parseFloat(newPayment.amount);
      const discountPercent = parseFloat(newPayment.discount) || 0;
      const discountAmount = (amount * discountPercent) / 100;
      const effectiveAmount = amount - discountAmount;

      // Call backend API to record payment
      const paymentData = {
        invoiceId: selectedInvoice.id,
        amount: amount,
        discount: discountAmount,
        discountPercent: discountPercent,
        method: newPayment.method,
        receiptNumber: newPayment.receipt
      };

      await api.request('finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      // Refresh invoices from backend to get updated data
      const updatedInvoices = await api.getInvoices();
      setInvoices(updatedInvoices);

      // Find the updated invoice
      const updatedInvoice = updatedInvoices.find(inv => inv.id === selectedInvoice.id);
      if (updatedInvoice) {
        onProcessPayment(updatedInvoice); // This triggers inventory deduction in App.tsx if fully paid
      }

      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setNewPayment({ amount: '', discount: '', receipt: '', method: PaymentMethod.CASH });
    } catch (error) {
      console.error('Failed to record payment:', error);
      throw new Error('Failed to record payment. Please check your connection and try again.');
    }
  };

  const handleRecordExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;

    try {
      const expenseData: Partial<Expense> = {
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
        status: 'Pending',
        branchId: newExpense.branchId
      };

      const createdExpense = await api.createExpense(expenseData);
      setExpenses(prev => [createdExpense, ...prev]);

      if (onCreateExpense) {
        onCreateExpense(createdExpense);
      }

      setShowExpenseModal(false);
      setNewExpense({
        description: '',
        category: 'Utilities',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        branchId: isHeadOffice ? (branches.find(b => !b.isHeadOffice)?.id || '') : currentBranchId
      });
    } catch (error) {
      console.error('Failed to create expense:', error);
      throw new Error('Failed to create expense. Please check your connection and try again.');
    }
  };

  const handleViewInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowPreviewModal(true);
  };


  const handleExpenseAction = (id: number, action: 'Approved' | 'Rejected') => {
      // This will be passed as onActionExpense prop from App.tsx
      // For now, we'll implement a basic version that shows an alert
      alert(`${action} expense #${id}`);
  };

  return (
    <div className="space-y-8">
      {/* Screen-Only Content */}
      <div className="no-print space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Finance & Accounting</h2>
            <p className="text-slate-500 mt-1">
              {isHeadOffice ? 'Global Financial Overview' : `Financials for ${branches.find(b => b.id === currentBranchId)?.name || 'Current Branch'}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'overview' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'invoices' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Invoicing & POS
            </button>
            <button 
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'expenses' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'sales' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Sales Report
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Gross Revenue" value={`TZS ${(stats.revenue / 1000000).toFixed(2)}M`} subtext="All Time" icon={DollarSign} color="bg-emerald-600" />
                <StatCard title="Net Profit" value={`TZS ${(stats.netProfit / 1000000).toFixed(2)}M`} subtext="After Tax & Exp" icon={TrendingUp} color="bg-teal-600" />
                <StatCard title="Total Expenses" value={`TZS ${(stats.totalExpenses / 1000000).toFixed(2)}M`} subtext={`${filteredExpenses.length} Transactions`} icon={TrendingDown} color="bg-rose-500" />
                <StatCard title="Outstanding Invoices" value={`TZS ${(stats.receivables/1000000).toFixed(2)}M`} subtext="Receivables" icon={FileText} color="bg-blue-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Income vs Expense Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Income vs Expenses (7 Days)</h3>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeVsExpenseData} barGap={0}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value/1000}k`} />
                        <Tooltip 
                            cursor={{fill: '#f1f5f9'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`TZS ${value.toLocaleString()}`, '']}
                        />
                        <Bar dataKey="sales" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Payment Breakdown</h3>
                  <div className="h-60 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={PAYMENT_METHODS_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {PAYMENT_METHODS_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `TZS ${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-slate-800">100%</span>
                        <p className="text-xs text-slate-500 uppercase">Mix</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}

        {activeTab === 'invoices' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
               <h3 className="text-lg font-bold text-slate-800">Invoices & Receivables</h3>
               <div className="flex flex-col sm:flex-row gap-3">
                 {/* Search Input */}
                 <div className="relative">
                   <input
                     type="text"
                     placeholder="Search invoices..."
                     value={invoiceSearch}
                     onChange={(e) => setInvoiceSearch(e.target.value)}
                     className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                   />
                   <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                 </div>

                 {/* Status Filter */}
                 <select
                   value={invoiceStatusFilter}
                   onChange={(e) => setInvoiceStatusFilter(e.target.value as any)}
                   className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                   aria-label="Filter invoices by status"
                 >
                   <option value="all">All Status</option>
                   <option value="PAID">Paid</option>
                   <option value="PARTIAL">Partial</option>
                   <option value="UNPAID">Unpaid</option>
                 </select>

                 <button
                   onClick={() => setShowInvoiceModal(true)}
                   className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm shadow-md shadow-teal-600/20"
                 >
                   <FilePlus size={16} /> Create Manual Invoice
                 </button>
               </div>
             </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Invoice ID</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Origin</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Branch</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Paid / Balance</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-2 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {searchedInvoices.map((inv) => {
                          const totalDiscount = inv.payments.reduce((sum, p) => sum + (p.discount || 0), 0);
                          const balance = inv.status === 'PAID' ? 0 : inv.totalAmount - inv.paidAmount - totalDiscount;
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-sm text-slate-600">{inv.id}</td>
                                <td className="px-6 py-4">
                                    {inv.source === 'POS' ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                                            <Store size={10} /> POS
                                        </span>
                                    ) : inv.source === 'SHIPMENT' ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit">
                                            <Truck size={10} /> Shipment
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                                            <FileText size={10} /> Manual
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">{branches.find(b => b.id === inv.branchId)?.name || 'Unknown'}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800 text-sm">{inv.customerName}</div>
                                    <div className="text-xs text-slate-500">{inv.description}</div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">TZS {inv.totalAmount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-emerald-600 font-medium">{inv.paidAmount.toLocaleString()}</span>
                                        {balance > 0 && <span className="text-rose-500 text-xs">Bal: {balance.toLocaleString()}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`px-2 py-1 rounded text-xs font-bold whitespace-pre-line ${
                                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                        inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                        'bg-rose-100 text-rose-700'
                                    }`}>
                                        {(() => {
                                            if (inv.status === 'PAID' && inv.paidAmount < inv.totalAmount) {
                                                const percent = ((inv.totalAmount - inv.paidAmount) / inv.totalAmount) * 100;
                                                return `PAID\nDISCOUNT ${percent.toFixed(0)}%`;
                                            }
                                            return inv.status;
                                        })()}
                                    </div>
                                </td>
                                <td className="px-2 py-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                                          <button
                                              onClick={() => handleViewInvoice(inv)}
                                              className="text-slate-500 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded"
                                              title="View Invoice"
                                          >
                                              <Eye size={16} />
                                          </button>
                                        {inv.status !== 'PAID' ? (
                                          <button
                                            onClick={() => openPaymentModal(inv)}
                                            className="text-teal-600 hover:text-teal-800 font-bold text-xs bg-teal-50 px-2 py-1 rounded hover:bg-teal-100 flex items-center gap-1 transition-colors whitespace-nowrap"
                                          >
                                              <Wallet size={12} /> Pay Now
                                          </button>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-start sm:items-center">
                                                <span className="text-slate-400 text-xs flex items-center gap-1 px-2">
                                                    <CheckCircle size={12} /> Paid
                                                </span>
                                                {onArchiveItem && (
                                                    <button
                                                        onClick={() => onArchiveItem('invoice', inv.id)}
                                                        className="text-slate-400 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded"
                                                        title="Archive"
                                                    >
                                                        <Archive size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                          )
                          })}
                    </tbody>
                </table>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                 <h3 className="text-lg font-bold text-slate-800">Operational Expenses</h3>
                 <div className="flex flex-col sm:flex-row gap-3">
                   {/* Search Input */}
                   <div className="relative">
                     <input
                       type="text"
                       placeholder="Search expenses..."
                       value={expenseSearch}
                       onChange={(e) => setExpenseSearch(e.target.value)}
                       className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                     />
                     <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                   </div>

                   {/* Status Filter */}
                   <select
                     value={expenseStatusFilter}
                     onChange={(e) => setExpenseStatusFilter(e.target.value as any)}
                     className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                     aria-label="Filter expenses by status"
                   >
                     <option value="all">All Status</option>
                     <option value="Pending">Pending</option>
                     <option value="Approved">Approved</option>
                     <option value="Rejected">Rejected</option>
                   </select>

                   <button
                     onClick={() => setShowExpenseModal(true)}
                     className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium text-sm shadow-md shadow-rose-600/20"
                   >
                     <Plus size={16} /> Record Expense
                   </button>
                 </div>
               </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Description</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Branch</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase min-w-[200px]">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {searchedExpenses.map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-medium text-slate-800">{exp.description}</td>
                                  <td className="px-6 py-4 text-sm text-slate-600">{exp.category}</td>
                                  <td className="px-6 py-4 text-xs text-slate-500">{branches.find(b => b.id === exp.branchId)?.name || 'Unknown'}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800">TZS {exp.amount.toLocaleString()}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        exp.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                                        exp.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                                        'bg-amber-100 text-amber-700'
                                      }`}>
                                          {exp.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-1 flex-wrap">
                                          {exp.status === 'Pending' && canApproveExpenses(exp) && (
                                              <>
                                                  <button
                                                      onClick={() => handleExpenseAction(exp.id, 'Approved')}
                                                      className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                                      title="Approve Expense"
                                                  >
                                                      <CheckCircle size={16} />
                                                  </button>
                                                  <button
                                                      onClick={() => handleExpenseAction(exp.id, 'Rejected')}
                                                      className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                                                      title="Reject Expense"
                                                  >
                                                      <XCircle size={16} />
                                                  </button>
                                              </>
                                          )}
                                          {canViewExpenseDetails() && (
                                              <button
                                                  onClick={() => {
                                                      // Show expense details modal
                                                      alert(`Expense Details:\n\nDescription: ${exp.description}\nCategory: ${exp.category}\nAmount: TZS ${exp.amount.toLocaleString()}\nDate: ${exp.date}\nBranch: ${branches.find(b => b.id === exp.branchId)?.name || 'Unknown'}\nStatus: ${exp.status}`);
                                                  }}
                                                  className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                  title="View Details"
                                              >
                                                  <Eye size={16} />
                                              </button>
                                          )}
                                          {/* Additional Actions for Super Admin and Accountant (Finance) */}
                                          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ACCOUNTANT || true) && ( // TEMP: Show for all users for testing
                                              <>
                                                  <button
                                                      onClick={() => {
                                                          // Export individual expense
                                                          const expenseData = [{
                                                              'Description': exp.description,
                                                              'Category': exp.category,
                                                              'Amount': exp.amount,
                                                              'Date': exp.date,
                                                              'Status': exp.status,
                                                              'Branch': branches.find(b => b.id === exp.branchId)?.name || 'Unknown'
                                                          }];
                                                          exportToCSV(expenseData, `expense_${exp.id}_${new Date().toISOString().split('T')[0]}.csv`);
                                                      }}
                                                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-sm"
                                                      title="Export Expense (Super Admin & Finance)"
                                                  >
                                                      <FileText size={14} />
                                                  </button>
                                                  {currentUser?.role === UserRole.SUPER_ADMIN && exp.status === 'Pending' && (
                                                      <button
                                                          onClick={() => {
                                                              if (window.confirm(`Are you sure you want to delete this expense?\n\nDescription: ${exp.description}\nAmount: TZS ${exp.amount.toLocaleString()}\n\nThis action cannot be undone.`)) {
                                                                  // For now, we'll show an alert. In a real app, this would call an API
                                                                  alert(`Expense #${exp.id} would be deleted. (API integration needed)`);
                                                              }
                                                          }}
                                                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                                          title="Delete Expense (Super Admin Only)"
                                                      >
                                                          <X size={14} />
                                                      </button>
                                                  )}
                                                  <button
                                                      onClick={() => onArchiveItem && onArchiveItem('expense', exp.id)}
                                                      className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                                                      title="Archive Expense (Super Admin & Finance)"
                                                  >
                                                      <Archive size={14} />
                                                  </button>
                                              </>
                                          )}
                                          {['Approved', 'Rejected'].includes(exp.status) && onArchiveItem && (
                                              <button
                                                  onClick={() => onArchiveItem('expense', exp.id)}
                                                  className="text-slate-400 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded"
                                                  title="Archive"
                                              >
                                                  <Archive size={16} />
                                              </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredExpenses.length === 0 && (
                              <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-500">No expenses recorded for this view.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sales Report Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
              <h3 className="text-lg font-bold text-slate-800">Sales Report</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Customer Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={salesCustomerSearch}
                    onChange={(e) => setSalesCustomerSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Date Filters */}
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="End Date"
                  />
                </div>

                {/* Sort Options */}
                <select
                  value={salesSortBy}
                  onChange={(e) => setSalesSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  aria-label="Sort sales by"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="time">Sort by Time</option>
                </select>

                <select
                  value={salesSortOrder}
                  onChange={(e) => setSalesSortOrder(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  aria-label="Sort order"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>

                <button
                  onClick={handlePrintSalesReport}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm shadow-sm transition-colors"
                >
                  <Download size={16} /> Export PDF
                </button>
                <button
                  onClick={handleExportSales}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm shadow-sm transition-colors"
                >
                  <FileBarChart size={16} /> Export Excel
                </button>
              </div>
            </div>

            {/* Sales Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Sales</p>
                <h3 className="text-2xl font-bold text-slate-800">{reportSales.length}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
                <h3 className="text-2xl font-bold text-slate-800">{reportSales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()} TZS</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Profit</p>
                <h3 className="text-2xl font-bold text-slate-800">{reportSales.reduce((sum, s) => sum + s.profit, 0).toLocaleString()} TZS</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Avg Sale</p>
                <h3 className="text-2xl font-bold text-slate-800">{reportSales.length > 0 ? (reportSales.reduce((sum, s) => sum + s.totalAmount, 0) / reportSales.length).toFixed(0) : 0} TZS</h3>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Sale ID</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Time</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Profit</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Payment</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{sale.id}</td>
                        <td className="px-6 py-4 text-slate-600">{new Date(sale.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-600">{new Date(sale.date).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 text-slate-800 font-medium">{sale.customerName}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{sale.totalAmount.toLocaleString()} TZS</td>
                        <td className="px-6 py-4 text-emerald-600 font-medium">{sale.profit.toLocaleString()} TZS</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowSalesPreview(true);
                            }}
                            className="text-teal-600 hover:text-teal-800 p-1.5 hover:bg-teal-50 rounded"
                            title="Preview Sale"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportSales.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No sales found for the selected criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <InvoiceModal
        showInvoiceModal={showInvoiceModal}
        setShowInvoiceModal={setShowInvoiceModal}
        newInvoice={newInvoice}
        setNewInvoice={setNewInvoice}
        handleCreateInvoice={handleCreateInvoice}
      />

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Record Payment</h3>
                <p className="text-sm text-slate-500 mb-4">For Invoice #{selectedInvoice.id}</p>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Receipt Number (System Generated)</label>
                        <div className="relative">
                            <Receipt size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input 
                              type="text" 
                              className="w-full pl-9 p-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed" 
                              placeholder="Auto-generated"
                              value={newPayment.receipt}
                              readOnly
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Payment Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-400 text-sm">TZS</span>
                            <input
                              type="number"
                              className="w-full pl-9 p-2 border border-slate-300 rounded-lg font-bold"
                              placeholder="0.00"
                              value={newPayment.amount}
                              onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Discount (%)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-400 text-sm">%</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-full pl-9 p-2 border border-slate-300 rounded-lg"
                              placeholder="0.0"
                              value={newPayment.discount}
                              onChange={e => setNewPayment({...newPayment, discount: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Amount Deducted</label>
                        <div className="relative">
                            <div className="w-full pl-3 p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-bold text-center">
                                {`${((parseFloat(newPayment.amount) || 0) * (parseFloat(newPayment.discount) || 0) / 100).toFixed(2)} TZS`}
                            </div>
                        </div>
                    </div>
                    <div>
                         <label className="text-sm font-medium text-slate-700" id="payment-method-label">Payment Method</label>
                         <select
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            value={newPayment.method}
                            onChange={(e) => setNewPayment({...newPayment, method: e.target.value as PaymentMethod})}
                            aria-labelledby="payment-method-label"
                         >
                            <option value={PaymentMethod.CASH}>Cash</option>
                            <option value={PaymentMethod.MOBILE_MONEY}>Mobile Money</option>
                            <option value={PaymentMethod.INSURANCE}>Insurance</option>
                         </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                    <button onClick={handleRecordPayment} className="px-4 py-2 bg-teal-600 text-white rounded-lg">Save Payment</button>
                </div>
            </div>
        </div>
      )}

      <InvoicePreviewModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        selectedInvoice={selectedInvoice}
        handlePrintInvoice={() => {
          // Close modal first
          setShowPreviewModal(false);
          // Generate and print invoice
          if (selectedInvoice) {
            const customerInfo = {
              name: selectedInvoice.customerName,
              address: '',
              email: selectedInvoice.customerEmail || '',
              phone: selectedInvoice.customerPhone || ''
            };
            const invoiceData = {
              id: selectedInvoice.id,
              dateIssued: selectedInvoice.dateIssued || '',
              client: customerInfo,
              items: (selectedInvoice.items || []).map(item => ({
                description: item.name || 'Item',
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
              })),
              subtotal: selectedInvoice.totalAmount || 0,
              tax: 0,
              total: selectedInvoice.totalAmount || 0,
              paymentTerms: selectedInvoice.description || 'Payment due upon receipt',
              paymentMethod: selectedInvoice.paymentMethod || 'Cash'
            };
            const companySettings = {
              companyName: settings.find(s => s.settingKey === 'companyName')?.settingValue || 'PMS Pharmacy',
              logo: settings.find(s => s.settingKey === 'logo')?.settingValue || '/backend_php/uploads/logos/logo.png',
              address: settings.find(s => s.settingKey === 'address')?.settingValue || 'Bagamoyo Road, Dar es Salaam, Tanzania'
            };
            import('react-dom/server').then(({ renderToStaticMarkup }) => {
              import('../components/ModernInvoicePrintTemplate').then(({ default: ModernInvoicePrintTemplate }) => {
                const html = renderToStaticMarkup(
                  <ModernInvoicePrintTemplate invoice={invoiceData} companySettings={companySettings} />
                );
                openCustomPrint(html, 'Invoice Print');
              });
            });
          }
        }}
        openPaymentModal={openPaymentModal}
      />

      <ExpenseModal
        showExpenseModal={showExpenseModal}
        setShowExpenseModal={setShowExpenseModal}
        newExpense={newExpense}
        setNewExpense={setNewExpense}
        handleRecordExpense={handleRecordExpense}
      />

      {/* Sales Preview Modal */}
      {showSalesPreview && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-lg w-full max-w-full sm:max-w-md md:max-w-2xl lg:max-w-2xl max-h-[90vh] overflow-y-auto m-2 md:m-4">
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Sale Details - {selectedSale.id}</h3>
                <button
                  onClick={() => setShowSalesPreview(false)}
                  className="text-slate-400 hover:text-slate-600"
                  title="Close"
                  aria-label="Close preview"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Date</label>
                  <p className="text-slate-900">{new Date(selectedSale.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Time</label>
                  <p className="text-slate-900">{new Date(selectedSale.date).toLocaleTimeString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Customer</label>
                  <p className="text-slate-900">{selectedSale.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Payment Method</label>
                  <p className="text-slate-900">{selectedSale.paymentMethod}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Total Amount</label>
                  <p className="text-slate-900 font-bold">{selectedSale.totalAmount.toLocaleString()} TZS</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Profit</label>
                  <p className="text-emerald-600 font-bold">{selectedSale.profit.toLocaleString()} TZS</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Items</label>
                <div className="mt-2 space-y-2">
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-slate-900">{(item.price * item.quantity).toLocaleString()} TZS</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-xl font-bold text-slate-800 break-words">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} flex-shrink-0`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <span className="text-slate-400">{subtext}</span>
    </div>
  </div>
);

export default Finance;
