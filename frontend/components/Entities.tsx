import React, { useState, useEffect, useCallback } from 'react';
import { Entity, EntityType, EntityStatus } from '../types';
import { api } from '../services/api';

interface EntitiesProps {
  onSelectCustomer?: (customer: Entity) => void;
  onSelectSupplier?: (supplier: Entity) => void;
  mode?: 'selection' | 'management';
}

const PAYMENT_TERM_OPTIONS = ['CASH', 'MOBILE', 'BANK'] as const;

export default function Entities({ onSelectCustomer, onSelectSupplier, mode = 'management' }: EntitiesProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<EntityType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<EntityStatus | 'ALL'>('ACTIVE');
  const [showModal, setShowModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState<Partial<Entity>>({
    name: '',
    type: 'CUSTOMER',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Tanzania',
    tin: '',
    vatNumber: '',
    contactPerson: '',
    contactPhone: '',
    paymentTerms: 'CASH',
    creditLimit: 0,
    discountPercentage: 0,
    taxExempt: false,
    notes: '',
    status: 'ACTIVE'
  });

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const params: { type?: string; status?: string } = {};
      if (filterType !== 'ALL') params.type = filterType;
      if (mode === 'selection') {
        params.status = 'ACTIVE';
      } else if (filterStatus !== 'ALL') {
        params.status = filterStatus;
      }

      const data = await api.getEntities(params);
      setEntities(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, mode]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const filteredEntities = entities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.tin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const summary = filteredEntities.reduce(
    (acc, entity) => {
      acc.total += 1;
      if (entity.type === 'CUSTOMER') acc.customers += 1;
      if (entity.type === 'SUPPLIER') acc.suppliers += 1;
      if (entity.type === 'BOTH') acc.both += 1;
      return acc;
    },
    { total: 0, customers: 0, suppliers: 0, both: 0 }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingEntity) {
        await api.updateEntity(editingEntity.id, formData);
      } else {
        await api.createEntity(formData);
      }
      
      setShowModal(false);
      setEditingEntity(null);
      resetForm();
      fetchEntities();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this entity?')) return;
    
    try {
      await api.deleteEntity(id);
      fetchEntities();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData(entity);
    setShowModal(true);
  };

  const handleSelect = (entity: Entity) => {
    if (mode === 'selection') {
      if (entity.type === 'CUSTOMER' || entity.type === 'BOTH') {
        onSelectCustomer?.(entity);
      }
      if (entity.type === 'SUPPLIER' || entity.type === 'BOTH') {
        onSelectSupplier?.(entity);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'CUSTOMER',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Tanzania',
      tin: '',
      vatNumber: '',
      contactPerson: '',
      contactPhone: '',
      paymentTerms: 'CASH',
      creditLimit: 0,
      discountPercentage: 0,
      taxExempt: false,
      notes: '',
      status: 'ACTIVE'
    });
  };

  const openNewModal = () => {
    resetForm();
    setEditingEntity(null);
    setShowModal(true);
  };

  const getTypeBadgeColor = (type: EntityType) => {
    switch (type) {
      case 'CUSTOMER': return 'bg-blue-100 text-blue-800';
      case 'SUPPLIER': return 'bg-green-100 text-green-800';
      case 'BOTH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentTermsBadgeColor = (paymentTerms?: string) => {
    switch (String(paymentTerms || '').toUpperCase()) {
      case 'CASH': return 'bg-emerald-100 text-emerald-800';
      case 'MOBILE': return 'bg-blue-100 text-blue-800';
      case 'BANK': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {mode === 'selection' ? 'Select Entity' : 'Customers & Suppliers'}
        </h2>
        {mode === 'management' && (
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add New Entity
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, TIN, contact, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as EntityType | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="ALL">All Types</option>
          <option value="CUSTOMER">Customers Only</option>
          <option value="SUPPLIER">Suppliers Only</option>
          <option value="BOTH">Both</option>
        </select>
        {mode === 'management' && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as EntityStatus | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-800">{summary.total}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs text-blue-600">Customers</p>
          <p className="text-xl font-bold text-blue-800">{summary.customers}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs text-green-600">Suppliers</p>
          <p className="text-xl font-bold text-green-800">{summary.suppliers}</p>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
          <p className="text-xs text-purple-600">Both</p>
          <p className="text-xl font-bold text-purple-800">{summary.both}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && entities.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading entities...</p>
        </div>
      )}

      {/* Entities Table */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b">City</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b">Payment Terms</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b">Credit Limit</th>
                {mode === 'management' && (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 border-b">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((entity) => (
                <tr 
                  key={entity.id} 
                  className={`hover:bg-gray-50 ${mode === 'selection' ? 'cursor-pointer' : ''}`}
                  onClick={() => handleSelect(entity)}
                >
                  <td className="px-4 py-3 border-b">
                    <div>
                      <p className="font-medium text-gray-800">{entity.name}</p>
                      {entity.contactPerson && (
                        <p className="text-sm text-gray-500">Contact: {entity.contactPerson}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(entity.type)}`}>
                      {entity.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="text-sm">
                      {entity.phone && <p>{entity.phone}</p>}
                      {entity.email && <p className="text-gray-500">{entity.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b text-sm">{entity.city || '-'}</td>
                  <td className="px-4 py-3 border-b text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentTermsBadgeColor(entity.paymentTerms)}`}>
                      {entity.paymentTerms || 'CASH'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b text-sm">
                    {entity.creditLimit > 0 ? `TZS ${entity.creditLimit.toLocaleString()}` : '-'}
                  </td>
                  {mode === 'management' && (
                    <td className="px-4 py-3 border-b">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(entity); }}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entity.id); }}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredEntities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No entities found. {mode === 'management' && 'Click "Add New Entity" to create one.'}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-3 md:p-4 lg:p-6 w-full max-w-full sm:max-w-md md:max-w-2xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base md:text-lg lg:text-xl font-bold mb-3 md:mb-4">
              {editingEntity ? 'Edit Entity' : 'Add New Entity'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as EntityType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="SUPPLIER">Supplier</option>
                    <option value="BOTH">Both (Customer & Supplier)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIN</label>
                  <input
                    type="text"
                    value={formData.tin}
                    onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PAYMENT_TERM_OPTIONS.map((term) => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (TZS)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="taxExempt"
                    checked={formData.taxExempt}
                    onChange={(e) => setFormData({ ...formData, taxExempt: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="taxExempt" className="text-sm font-medium text-gray-700">Tax Exempt</label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingEntity(null); resetForm(); }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingEntity ? 'Update Entity' : 'Create Entity')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
