import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign, Users, Store } from 'lucide-react';
import { api } from '../services/api';
import { BranchInventoryItem, Sale, Expense, Branch, Product } from '../types';
import { getBranchDisplayName } from '../utils/branchDisplay';
import { runWithPreservedWindowScroll } from '../utils/scrollStability';

const COLORS = ['#0f766e', '#14b8a6', '#5eead4', '#ccfbf1'];

// Safely access properties for charts
const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <div className="bg-white p-2 md:p-3 lg:p-4 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs lg:text-sm font-medium text-slate-500 mb-0.5">{title}</p>
        <h3 className="text-lg lg:text-xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
    <div className="mt-2 flex items-center text-xs">
      <span className="text-emerald-600 font-medium flex items-center">
        <TrendingUp size={12} className="mr-0.5" />
        {subtext}
      </span>
      <span className="text-slate-400 ml-1 hidden md:inline">vs last month</span>
    </div>
  </div>
);

interface DashboardProps {
  currentBranchId: string;
  inventory: Record<string, BranchInventoryItem[]>;
  sales: Sale[];
  expenses: Expense[];
  onViewInventory: () => void;
  onCreateRequisition?: (requisition: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentBranchId, inventory, sales: initialSales, expenses: initialExpenses, onViewInventory, onCreateRequisition }) => {
      const handleReorder = (productName: string, branchId: string) => {
        const headOffice = branches.find((b) => b.isHeadOffice);
        const headOfficeId = headOffice?.id || 'HEAD_OFFICE';
        const headOfficeName = headOffice ? getBranchDisplayName(branches, headOffice.id, headOffice.name) : 'Head Office 👑';
        // Show reorder confirmation or navigate to create requisition
        const confirmed = window.confirm(
          `Create a reorder request for "${productName}" to ${headOfficeName}?`
        );
    
        if (confirmed && onCreateRequisition) {
          const product = products.find(p => p.name === productName);
          if (product) {
            // Create a stock requisition request
            const requisition = {
              id: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              branchId: branchId,
              targetBranchId: headOfficeId,
              requestDate: new Date().toISOString().split('T')[0],
              requestedBy: 'SYSTEM',
              status: 'PENDING' as const,
              priority: 'URGENT' as const,
              items: [{
                productId: product.id,
                productName: product.name,
                currentStock: 0,
                requestedQty: Math.max(10, product.minStockLevel * 2) // Request at least 2x minimum stock
              }]
            };
            onCreateRequisition(requisition);
          }
        }
      };
     const [branches, setBranches] = useState<Branch[]>([]);
     const [products, setProducts] = useState<Product[]>([]);
     const [sales, setSales] = useState<Sale[]>(initialSales);
     const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
     const [financialSummary, setFinancialSummary] = useState({ totalSales: 0, totalProfit: 0, totalExpenses: 0, totalInvoiced: 0, totalReceived: 0, netIncome: 0 });

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const [branchesData, productsData] = await Promise.all([
            api.getBranches(),
            api.getProducts()
          ]);
          if (mounted) {
            setBranches(branchesData || []);
            setProducts(productsData || []);
          }
        } catch (err) {
          console.error('Failed to load branches/products', err);
        }
      })();
      return () => { mounted = false; };
    }, []);

    // Branch info
    const currentBranch = branches.find(b => b.id === currentBranchId);
    const activeBranchName = currentBranch
      ? getBranchDisplayName(branches, currentBranch.id, currentBranch.name)
      : 'Unknown';
    const activeBranchLocation = currentBranch?.location || '';
    const isHeadOffice = currentBranch?.isHeadOffice || false;

    // Real-time data fetching
    useEffect(() => {
      const fetchRealTimeData = async () => {
        try {
          const [salesData, expensesData] = await Promise.all([
            api.getSales().catch(() => []),
            api.getExpenses().catch(() => [])
          ]);
          setSales(salesData);
          setExpenses(expensesData);
        } catch (err) {
          console.error('Failed to fetch real-time data', err);
        }
      };

      // Fetch immediately
      fetchRealTimeData();

      // Set up interval for real-time updates (every 30 seconds)
      const interval = setInterval(() => {
        void runWithPreservedWindowScroll(() => fetchRealTimeData());
      }, 30000);

      return () => clearInterval(interval);
    }, []);

 // Fetch financial summary
    useEffect(() => {
      const fetchSummary = async () => {
        try {
          const params = isHeadOffice ? {} : { branchId: currentBranchId };
          const summary = await api.getFinancialSummary(params);
          setFinancialSummary(summary);
        } catch (err) {
          console.error('Failed to fetch financial summary', err);
        }
      };
      fetchSummary();
    }, [currentBranchId, isHeadOffice]);

  // DYNAMIC CALCULATIONS
  const dashboardStats = useMemo(() => {
      // 1. Filter Data by Branch
      const filteredSales = sales.filter(s => isHeadOffice || s.branchId === currentBranchId);
      const filteredExpenses = expenses.filter(e => isHeadOffice || e.branchId === currentBranchId);

      // 2. Calculate Totals
      const revenue = filteredSales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      const grossProfit = filteredSales.reduce((acc, curr) => acc + (curr.profit || 0), 0);
      const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const netProfit = grossProfit - totalExpenses;
      const transactions = filteredSales.length;

      return { revenue, netProfit, transactions };
  }, [sales, expenses, currentBranchId, isHeadOffice]);

  // DYNAMIC CHART DATA
  const chartData = useMemo(() => {
      const filteredSales = sales.filter(s => isHeadOffice || s.branchId === currentBranchId);
      
      // Group by Day (Last 7 Days)
      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
      });

      return last7Days.map(dateStr => {
          const daySales = filteredSales.filter(s => s.date.startsWith(dateStr));
          const dailyRevenue = daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
          const dailyCount = daySales.length;
          const dateObj = new Date(dateStr);
          return {
              name: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
              sales: dailyCount * 10, // scaling for visual if needed, or just use revenue
              revenue: dailyRevenue
          };
      });
  }, [sales, currentBranchId, isHeadOffice]);

  // BRANCH DISTRIBUTION DATA (For Head Office)
  const branchPerformance = useMemo(() => {
      if (!isHeadOffice) return [];
      const branchRevenueMap: Record<string, number> = {};
      sales.forEach(s => {
          if (s.branchId) {
            branchRevenueMap[s.branchId] = (branchRevenueMap[s.branchId] || 0) + (s.totalAmount || 0);
          }
      });

      return Object.entries(branchRevenueMap).map(([bId, val]) => ({
          name: getBranchDisplayName(branches, bId, bId),
          value: val
      }));
  }, [sales, isHeadOffice, branches]);


  // DYNAMIC STOCK ALERTS - Check products only for the active branch (including head office)
  let lowStockCount = 0;
  const criticalItems: {name: string, stock: number, branch: string; branchId: string}[] = [];
  const branchesToCheck = [currentBranchId];

  branchesToCheck.forEach(bId => {
      const stockList = inventory[bId] || [];
      
      // Check each product in the system
      products.forEach(productDef => {
          const inventoryItem = stockList.find(i => i.productId === productDef.id);
          // Calculate ACTIVE stock only (0 if no inventory record exists)
          const activeStock = inventoryItem && inventoryItem.batches 
              ? inventoryItem.batches.filter(b => b.status === 'ACTIVE').reduce((sum, b) => sum + b.quantity, 0) 
              : 0;
          
          // Include pending incoming from transfers
          const pendingIncoming = inventoryItem?.pendingIncoming || 0;
          const totalAvailableStock = activeStock + pendingIncoming;

          // Check if completely OUT OF STOCK (0 units available)
          if (totalAvailableStock === 0) {
              lowStockCount++;
              if (criticalItems.length < 5) {
                  criticalItems.push({
                      name: productDef.name,
                      stock: totalAvailableStock,
                      branch: getBranchDisplayName(branches, bId, String(bId)),
                      branchId: String(bId)
                  });
              }
          }
      });
  });


  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-slate-900">{isHeadOffice ? 'Head Office Overview' : `${activeBranchName} Overview`}</h2>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5 lg:mt-1">
          {isHeadOffice 
            ? 'Real-time aggregated insights across all branches.' 
            : `Monitoring performance for ${activeBranchName} only.`
          }
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
        <StatCard
          title="Total Revenue (All Time)"
          value={`TZS ${(financialSummary.totalSales / 1000000).toFixed(2)}M`}
          subtext="From Database"
          icon={DollarSign}
          color="bg-emerald-600"
        />
        <StatCard
          title="Transactions"
          value={dashboardStats.transactions.toLocaleString()}
          subtext="Processed"
          icon={Users}
          color="bg-blue-600"
        />
        <StatCard
          title="Out of Stock"
          value={`${lowStockCount} Items`}
          subtext="Zero Units"
          icon={AlertTriangle}
          color="bg-amber-500"
        />
        <StatCard
          title="Net Profit"
          value={`TZS ${(financialSummary.netIncome / 1000000).toFixed(2)}M`}
          subtext="Rev - Cost - Exp"
          icon={TrendingUp}
          color="bg-teal-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        
        {/* Main Sales Chart */}
        <div className="lg:col-span-2 bg-white p-2 md:p-3 lg:p-4 rounded-lg shadow-sm border border-slate-100">
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-slate-800 mb-2 md:mb-4">
             {isHeadOffice ? 'Global Sales Analytics (7 Days)' : 'Branch Sales Analytics (7 Days)'}
          </h3>
          <div className="h-48 md:h-64 lg:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f766e', fontWeight: 600 }}
                    formatter={(value: number) => [`TZS ${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Distribution (Only visible for Head Office) */}
        {isHeadOffice ? (
        <div className="bg-white p-2 md:p-3 lg:p-4 rounded-lg shadow-sm border border-slate-100">
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-slate-800 mb-2 md:mb-4">Revenue by Branch</h3>
          <div className="h-40 md:h-48 lg:h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={branchPerformance}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {branchPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `TZS ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="text-xl md:text-2xl font-bold text-teal-800">{branchPerformance.length}</span>
                <p className="text-xs text-slate-500 uppercase">Branches</p>
              </div>
            </div>
          </div>
          <div className="mt-2 md:mt-4 space-y-1 md:space-y-2">
            {branchPerformance.map((branch, index) => (
              <div key={branch.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-slate-600">{branch.name}</span>
                </div>
                <span className="font-medium text-slate-900">{(branch.value / 1000000).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>
        ) : (
          <div className="bg-white p-3 md:p-4 lg:p-6 rounded-lg shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
             <div className="p-2 md:p-3 bg-teal-50 rounded-full mb-2 md:mb-3">
               <Store size={24} className="text-teal-600" />
             </div>
             <h3 className="text-base md:text-lg font-bold text-slate-800 mb-1">{activeBranchName}</h3>
             <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">Performance is solid. Keep monitoring stock levels.</p>
             <button onClick={onViewInventory} className="text-teal-600 font-bold hover:underline text-xs md:text-sm">Manage Stock</button>
          </div>
        )}
      </div>

      {/* Low Stock Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-2 md:p-3 lg:p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-slate-800">
             {isHeadOffice ? 'Critical Stock Alerts (Real-time)' : 'Branch Stock Alerts'}
          </h3>
          <button onClick={onViewInventory} className="text-teal-600 text-xs md:text-sm font-medium hover:underline">View All Inventory</button>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
            <tr>
              <th className="px-2 md:px-4 py-2 md:py-3">Product Name</th>
              <th className="px-2 md:px-4 py-2 md:py-3 hidden sm:table-cell">Branch</th>
              <th className="px-2 md:px-4 py-2 md:py-3">Active Stock</th>
              <th className="px-2 md:px-4 py-2 md:py-3 hidden md:table-cell">Status</th>
              <th className="px-2 md:px-4 py-2 md:py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {criticalItems.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-2 md:px-4 py-3 md:py-4 text-center text-slate-400 italic text-xs">No low stock items detected.</td>
                </tr>
            ) : (
                criticalItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-2 md:px-4 py-2 md:py-3 font-medium text-slate-800 text-xs md:text-sm">{item.name}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 hidden sm:table-cell text-xs">{item.branch}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-red-600 font-bold text-xs md:text-sm">{item.stock} Units</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 hidden md:table-cell"><span className="text-xs bg-red-100 text-red-700 px-1 md:px-2 py-0.5 md:py-1 rounded font-bold">OUT</span></td>
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        <button
                          onClick={() => handleReorder(item.name, item.branchId || currentBranchId)}
                          className="text-teal-600 hover:text-teal-800 hover:underline font-medium cursor-pointer transition-colors text-xs md:text-sm"
                        >
                          Reorder
                        </button>
                      </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
