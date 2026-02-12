/**
 * Test Shipment Component
 * Use this to create test shipments and verify invoice creation
 */

import React, { useState } from 'react';
import { api } from '../services/api';

interface ShipmentResult {
  success: boolean;
  shipmentId?: string;
  invoiceId?: string;
  error?: string;
}

export default function TestShipment() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShipmentResult | null>(null);
  const [customerName, setCustomerName] = useState('Malenya Sayuni Medics');

  const createTestShipment = async () => {
    setLoading(true);
    setResult(null);

    try {
      const products = [
        { id: '1', name: 'Paracetamol 500mg', quantity: 100, price: 5000 },
        { id: '2', name: 'Amoxicillin 250mg', quantity: 50, price: 8000 },
        { id: '3', name: 'ORS Sachets', quantity: 200, price: 2000 },
        { id: '4', name: 'Ciprofloxacin 500mg', quantity: 30, price: 12000 },
        { id: '5', name: 'Metformin 500mg', quantity: 60, price: 6500 },
      ];

      const response = await api.createCustomerShipment({
        customerName,
        branchId: '1',
        products,
        notes: `Test shipment created at ${new Date().toISOString()}`
      });

      setResult({
        success: true,
        shipmentId: (response as any).shipmentId,
        invoiceId: (response as any).invoiceId
      });
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Test Shipment Creation</h2>
      
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Customer Name</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded"
          placeholder="Enter customer name"
        />
      </div>

      <button
        onClick={createTestShipment}
        disabled={loading}
        className={`px-4 py-2 rounded ${
          loading 
            ? 'bg-gray-500 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700'
        } text-white`}
      >
        {loading ? 'Creating...' : 'Create Test Shipment'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-900' : 'bg-red-900'}`}>
          {result.success ? (
            <>
              <h3 className="text-green-400 font-bold">Shipment Created Successfully!</h3>
              <p className="text-white mt-2">
                <strong>Shipment ID:</strong> {result.shipmentId}
              </p>
              <p className="text-white">
                <strong>Invoice ID:</strong> {result.invoiceId}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-red-400 font-bold">Failed to Create Shipment</h3>
              <p className="text-white mt-2">{result.error}</p>
            </>
          )}
        </div>
      )}

      <div className="mt-4 text-gray-400 text-sm">
        <p>This will:</p>
        <ol className="list-decimal list-inside ml-2">
          <li>Create or use existing customer</li>
          <li>Create a shipment with sample products</li>
          <li>Automatically generate an invoice</li>
        </ol>
      </div>
    </div>
  );
}
