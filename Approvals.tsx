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
import type { Branch, Expense, StockTransfer } from "../types";

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

interface DisposalRequest {
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
    reason: 'EXPIRED' | 'DAMAGED' | 'OBSOLETE' | 'OTHER';
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
}) => {
  const { showSuccess, showError } = useNotifications();
  const [activeTab, setActiveTab] = useState<'expenses' | 'stock' | 'shipments' | 'release' | 'disposal'>('expenses');
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // State for data fetched from API
  const [requisitions, setRequisitions] = useState<StockRequisition[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [releaseRequests, setReleaseRequests] = useState<StockReleaseRequest[]>([]);
  const [disposalRequests, setDisposalRequests] = useState<DisposalRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Modal state
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<StockRequisition | null>(null);

  // Load data from API
  const loadApprovalData = async () => {
    setIsLoading(true);
    try {
      const [branchesData, requisitionsData, shipmentsData, releaseData, disposalData, expensesData, userData] = await Promise.all([
        api.getBranches(),
        api.getRequisitions(),
        api.getShipments(),
        api.getReleaseRequests(),
        api.getDisposalRequests(),
        api.getExpenses(),
        Promise.resolve(api.getCurrentUser())
      ]);

      setBranches(branchesData || []);
      setRequisitions(requisitionsData || []);
      setShipments(shipmentsData || []);
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
      if (mounted) loadApprovalData();
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const pendingExpenses = expenses.filter((e: any) => e.status === 'Pending');
  const pendingRequisitions = requisitions.filter(r => r.status === 'PENDING');
  const pendingShipments = shipments.filter((s: any) => s.status === 'PENDING');
  const pendingRelease = releaseRequests.filter(r => r.status === 'PENDING');
  const pendingDisposal = disposalRequests.filter(r => r.status === 'PENDING');


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
      // For approval, first approve, then open shipment modal
      try {
        await api.updateRequisitionStatus(id, action, currentUser?.id);

        // Find the requisition and open shipment modal
        const req = requisitions.find(r => r.id === id);
        if (req) {
          setSelectedRequisition(req);
          setShipmentModalOpen(true);
        }

        showSuccess(
          'Requisition Approved',
          'Now customize the shipment quantities.'
        );
      } catch (error) {
        console.error('Failed to approve requisition:', error);
        showError(
          'Approval Failed',
          'There was an error approving the requisition. Please try again.'
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

  const handleShipmentApproval = async (shipmentId: string) => {
    try {
      await api.updateShipment(shipmentId, { status: 'APPROVED' });

      setShipments(prev => prev.filter(s => s.id !== shipmentId));
      showSuccess(
        'Shipment Approved',
        'Shipment has been approved and stock transferred successfully.'
      );
    } catch (error) {
      console.error('Failed to approve shipment:', error);
      showError(
        'Approval Failed',
        'There was an error approving the shipment. Please try again.'
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
            onClick={() => setActiveTab('shipments')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'shipments'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
          >
            <Truck size={16} /> Shipments
            {pendingShipments.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingShipments.length}
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
                          {branches.find(b => b.id === expense.branchId)?.name ||
                            'Unknown'}
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
                            {branches.find(b => b.id === req.branchId)?.name ||
                              'Unknown'}
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
                          Approve & Initiate Shipment <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">
                        Requested Items
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {req.items.map((item, i) => (
                          <div
                            key={i}
                            className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-slate-700">
                                {item.productName}
                              </div>
                              <div className="text-xs text-slate-400">
                                Current Stock: {item.currentStock}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-teal-600">
                              {item.requestedQty}{' '}
                              <span className="text-xs text-slate-400 font-normal">
                                units
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'shipments' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck size={18} className="text-teal-600" /> Pending Shipments
              </h3>
            </div>
            {pendingShipments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-20 text-teal-600" />
                <p>No pending shipments to approve.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingShipments.map((shipment: any) => (
                  <div key={shipment.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          Shipment {shipment.id}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          From: {branches.find(b => b.id === shipment.from_branch_id)?.name || 'Unknown'} →
                          To: {branches.find(b => b.id === shipment.to_branch_id)?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-500">
                          Created: {new Date(shipment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleShipmentApproval(shipment.id)}
                        className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md flex items-center gap-2 transition-colors"
                        type="button"
                      >
                        <CheckCircle size={16} /> Approve Shipment
                      </button>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <p className="text-sm text-slate-600">
                        <strong>Notes:</strong> {shipment.notes || 'No notes'}
                      </p>
                      <p className="text-sm text-slate-600 mt-2">
                        <strong>Total Value:</strong> {shipment.total_value || 0} TZS
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                          {branches.find(b => b.id === req.branchId)?.name ||
                            'Unknown'}
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
                          {branches.find(b => b.id === req.branchId)?.name ||
                            'Unknown'}
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