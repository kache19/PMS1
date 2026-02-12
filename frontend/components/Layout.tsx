
import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Activity, 
  Settings, 
  LogOut, 
  Menu,
  Stethoscope,
  Banknote,
  Store,
  MapPin,
  Users,
  Lock,
  ClipboardCheck,
  Archive,
  UserPlus
} from 'lucide-react';
import { Staff, UserRole, Branch } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentBranchId: string;
  setCurrentBranchId: (id: string) => void;
  currentUser: Staff | null;
  onLogout: () => void;
  branches: Branch[];
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  currentBranchId, 
  setCurrentBranchId, 
  currentUser, 
  onLogout,
  branches 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Role-Based Access Control Map
  const rolePermissions: Record<UserRole, string[]> = {
    [UserRole.SUPER_ADMIN]: ['dashboard', 'approvals', 'pos', 'inventory', 'clinical', 'finance', 'staff', 'branches', 'reports', 'archive', 'settings', 'entities'],
    [UserRole.BRANCH_MANAGER]: ['dashboard', 'pos', 'inventory', 'clinical', 'finance', 'staff', 'reports', 'archive', 'entities'],
    [UserRole.PHARMACIST]: ['dashboard', 'inventory', 'clinical', 'entities'],
    [UserRole.DISPENSER]: ['dashboard', 'pos', 'clinical', 'entities'],
    [UserRole.STOREKEEPER]: ['dashboard', 'inventory', 'entities'],
    [UserRole.INVENTORY_CONTROLLER]: ['dashboard', 'inventory', 'reports', 'entities'],
    [UserRole.ACCOUNTANT]: ['dashboard', 'finance', 'reports', 'archive', 'entities'],
    [UserRole.AUDITOR]: ['dashboard', 'inventory', 'clinical', 'finance', 'reports', 'archive', 'entities']
  };

  const userPerms = currentUser ? rolePermissions[currentUser.role] : [];

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'approvals', label: 'Approvals', icon: ClipboardCheck },
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'clinical', label: 'Clinical & Rx', icon: Stethoscope },
    { id: 'finance', label: 'Finance', icon: Banknote },
    { id: 'entities', label: 'Customers & Suppliers', icon: UserPlus },
    { id: 'staff', label: 'Staff & Roles', icon: Users },
    { id: 'branches', label: 'Branches', icon: Store },
    { id: 'reports', label: 'Reports', icon: Activity },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const menuItems = allMenuItems.filter(item => userPerms.includes(item.id));
  const activeBranch = branches.find(b => b.id === currentBranchId);
  const isHeadOffice = activeBranch?.isHeadOffice || currentBranchId === 'HEAD_OFFICE';
  const activeBranchName = activeBranch?.name || (isHeadOffice ? 'Head Office' : 'Unknown Branch');
  const activeBranchLocation = activeBranch?.location || (isHeadOffice ? 'Central Office' : 'Location not available');
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  return (
    <div id="app-layout" className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top Header Bar for Desktop */}
      <header className="hidden md:flex items-center justify-between px-2 lg:px-4 py-2 bg-white border-b border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="flex items-center gap-1 lg:gap-2">
            <Store size={14} className="text-teal-600" />
            <div>
              <p className="text-xs lg:text-sm font-semibold text-slate-800">{activeBranchName}</p>
              <p className="text-xs text-slate-500 hidden lg:block">{activeBranchLocation}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs lg:text-sm font-medium text-slate-800">{currentUser?.name}</p>
            <p className="text-xs text-slate-500 capitalize hidden lg:block">{currentUser?.role.replace('_', ' ').toLowerCase()}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white uppercase text-xs">
            {currentUser?.name.charAt(0)}
          </div>
          <button onClick={onLogout} className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:flex flex-col w-48 bg-teal-900 text-white shadow-xl no-print">
        <div className="p-3 border-b border-teal-800">
          <h1 className="text-lg font-bold tracking-tight">PMS<span className="text-teal-400">.</span></h1>
          <p className="text-xs text-teal-300 mt-0.5">Pharmacy Mgmt</p>
        </div>

        {/* Branch Switcher (Only for Super Admin) */}
        <div className="px-2 pt-3 pb-2">
           <label className="text-xs text-teal-400 uppercase font-semibold tracking-wider mb-1 block">
             Context
           </label>
           
           {isSuperAdmin || currentUser?.role === UserRole.AUDITOR ? (
             <div className="relative">
               <Store size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-teal-200" />
               <select 
                 value={currentBranchId}
                 onChange={(e) => setCurrentBranchId(e.target.value)}
                 className="w-full pl-7 pr-2 py-1 bg-teal-800 border border-teal-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
               >
                 {branches.map(branch => (
                   <option key={branch.id} value={branch.id}>
                     {branch.name}
                   </option>
                 ))}
               </select>
             </div>
           ) : (
             <div className="flex items-center gap-1 p-1.5 bg-teal-800 rounded-lg text-xs text-teal-100 border border-teal-700">
                <Lock size={10} className="text-teal-400" />
                <span className="truncate">{activeBranchName}</span>
             </div>
           )}

           {!isHeadOffice && (
             <div className="mt-1 flex items-center text-xs text-teal-300 px-0.5">
               <MapPin size={10} className="mr-1" />
               <span className="truncate text-xs">{branches.find(b => b.id === currentBranchId)?.location}</span>
             </div>
           )}
        </div>
        
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center w-full px-2 py-1.5 rounded-lg transition-all duration-200 text-sm ${
                activeTab === item.id 
                  ? 'bg-teal-700 text-white shadow-md transform scale-[1.02]' 
                  : 'text-teal-100 hover:bg-teal-800 hover:text-white'
              }`}
            >
              <item.icon size={14} className="mr-2" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User info removed from sidebar - now in top header */}
      </aside>

      {/* Mobile Header & Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:flex-1">
        <header className="lg:hidden flex items-center justify-between p-2 bg-teal-900 text-white shadow-md z-20 no-print">
          <div>
            <h1 className="text-base font-bold">PMS</h1>
            <p className="text-xs text-teal-300">{activeBranchName}</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu size={18} />
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="lg:hidden absolute inset-0 z-30 bg-teal-900/95 backdrop-blur-sm p-4 animate-in fade-in slide-in-from-top-10 no-print">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">
                <LogOut size={18} className="rotate-180" />
              </button>
            </div>
            {/* Mobile Branch Switcher */}
            {isSuperAdmin && (
            <div className="mb-4">
               <label className="text-xs text-teal-300 block mb-1">Switch Branch</label>
               <select 
                 value={currentBranchId}
                 onChange={(e) => {
                   setCurrentBranchId(e.target.value);
                   setIsMobileMenuOpen(false);
                 }}
                 className="w-full p-2 bg-teal-800 text-white rounded-lg border border-teal-700 text-sm"
               >
                 {branches.map(branch => (
                   <option key={branch.id} value={branch.id}>{branch.name}</option>
                 ))}
               </select>
            </div>
            )}
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-3 py-2 rounded-lg text-sm ${
                    activeTab === item.id ? 'bg-teal-700 text-white' : 'text-teal-100'
                  }`}
                >
                  <item.icon size={16} className="mr-2" />
                  {item.label}
                </button>
              ))}
              <button onClick={onLogout} className="flex items-center w-full px-3 py-2 rounded-lg text-sm text-teal-100 mt-4 border-t border-teal-800 pt-3">
                  <LogOut size={16} className="mr-2" /> Logout
              </button>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 scroll-smooth">
          <div className="max-w-7xl mx-auto p-2 md:p-3 lg:p-4">
             {/* Context Banner */}
             <div className="mb-3 flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-slate-200 no-print">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Context:</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${isHeadOffice ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                    {activeBranchName} {!isHeadOffice ? `(${activeBranchLocation})` : ''}
                  </span>
                  {!isSuperAdmin && <Lock size={10} className="text-slate-400" />}
                </div>
                <div className="text-xs text-slate-400 hidden sm:block">
                   {currentUser?.username}
                </div>
             </div>
            {children}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
};

export default Layout;
