import React, { useState, useEffect } from 'react';
import { FileText, X, Printer, Wallet } from 'lucide-react';
import { Invoice } from '../types';
import { api } from '../services/api';

interface InvoicePreviewModalProps {
  showPreviewModal: boolean;
  setShowPreviewModal: (show: boolean) => void;
  selectedInvoice: Invoice | null;
  handlePrintInvoice: () => void;
  openPaymentModal: (invoice: Invoice) => void;
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  showPreviewModal,
  setShowPreviewModal,
  selectedInvoice,
  handlePrintInvoice,
  openPaymentModal
}) => {
  const [companySettings, setCompanySettings] = useState({
    companyName: 'PMS Pharmacy',
    tinNumber: '123-456-789',
    vrnNumber: '400-999-111',
    address: 'Bagamoyo Road, Dar es Salaam, Tanzania',
    phone: '+255 700 123 456',
    email: 'info@pms-pharmacy.tz',
    logo: '/backend_php/uploads/logos/logo.png'
  });

  // Load company settings on mount
  useEffect(() => {
    const loadCompanySettings = async () => {
      try {
        const settings = await api.getSettings();
        if (settings && settings.length > 0) {
          setCompanySettings({
            companyName: settings.find((s: any) => s.settingKey === 'companyName')?.settingValue || companySettings.companyName,
            tinNumber: settings.find((s: any) => s.settingKey === 'tinNumber')?.settingValue || companySettings.tinNumber,
            vrnNumber: settings.find((s: any) => s.settingKey === 'vrnNumber')?.settingValue || companySettings.vrnNumber,
            address: settings.find((s: any) => s.settingKey === 'address')?.settingValue || companySettings.address,
            phone: settings.find((s: any) => s.settingKey === 'phone')?.settingValue || companySettings.phone,
            email: settings.find((s: any) => s.settingKey === 'email')?.settingValue || companySettings.email,
            logo: settings.find((s: any) => s.settingKey === 'logo')?.settingValue || companySettings.logo
          });
        }
      } catch (error) {
        console.error('Failed to load company settings:', error);
        // Keep default values if settings can't be loaded
      }
    };

    loadCompanySettings();
  }, []);

  if (!showPreviewModal || !selectedInvoice) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <FileText size={18} className="text-blue-400"/> Invoice Preview
          </h3>
          <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="bg-white border border-slate-200 p-8 shadow-sm text-sm max-w-4xl mx-auto">
            {/* Invoice Header */}
            <div className="mb-8">
              {/* Logo and Company Info */}
              <div className="text-center mb-6">
                <img src={companySettings.logo} alt={`${companySettings.companyName} Logo`} className="h-20 w-auto mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wider mb-2">
                  {companySettings.companyName}
                </h1>
                <div className="text-slate-600 text-sm space-y-1">
                  <p>TIN: {companySettings.tinNumber} | VRN: {companySettings.vrnNumber}</p>
                  <p>{companySettings.address}</p>
                  <p>Tel: {companySettings.phone} | Email: {companySettings.email}</p>
                </div>
              </div>

              {/* Invoice Type and Details */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    {selectedInvoice.status === 'PAID' ? 'TAX INVOICE' : 'PROFORMA INVOICE'}
                  </h2>
                  <div className="space-y-2">
                    <p className="text-slate-700"><span className="font-semibold">Invoice #:</span> {selectedInvoice.id}</p>
                    <p className="text-slate-700"><span className="font-semibold">Date Issued:</span> {selectedInvoice.dateIssued}</p>
                    <p className="text-slate-700"><span className="font-semibold">Due Date:</span> {selectedInvoice.dueDate}</p>
                    {selectedInvoice.paymentMethod && (
                      <p className="text-slate-700"><span className="font-semibold">Payment Method:</span> {selectedInvoice.paymentMethod}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-1">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-bold text-slate-900 mb-2">Bill To:</h3>
                    <p className="text-lg font-semibold text-slate-800">{selectedInvoice.customerName}</p>
                    <p className="text-slate-600 text-sm mt-2">Customer ID: {selectedInvoice.customerName.split(' ').join('').toUpperCase()}</p>
                  </div>
                  <div className="mt-4">
                    <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${
                      selectedInvoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      Status: {selectedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left mb-6">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 pl-2">Item Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right pr-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? selectedInvoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 pl-2 font-medium">{item.name}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{item.price.toLocaleString()}</td>
                    <td className="py-3 text-right pr-2">{(item.price * item.quantity).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-4 pl-2 text-slate-500 italic">
                      {selectedInvoice.description || 'Consolidated Invoice Items'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                {Boolean(selectedInvoice.includeVAT) ? (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span>{(selectedInvoice.totalAmount / 1.18).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>VAT (18%):</span>
                      <span>{(selectedInvoice.totalAmount - (selectedInvoice.totalAmount / 1.18)).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-500">
                    <span>Amount:</span>
                    <span>{selectedInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl text-slate-900 border-t border-slate-200 pt-3">
                  <span>Grand Total:</span>
                  <span>{selectedInvoice.totalAmount.toLocaleString()} TZS</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium pt-1">
                  <span>Amount Paid:</span>
                  <span>- {selectedInvoice.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t border-slate-100 pt-2">
                  <span>Balance Due:</span>
                  <span>{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toLocaleString()} TZS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={() => setShowPreviewModal(false)}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg border border-slate-200"
          >
            Close
          </button>
          <button
            onClick={handlePrintInvoice}
            className="px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 flex items-center gap-2"
          >
            <Printer size={16} /> Print
          </button>
          {selectedInvoice.status !== 'PAID' && (
            <button
              onClick={() => { setShowPreviewModal(false); openPaymentModal(selectedInvoice); }}
              className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md flex items-center gap-2"
            >
              <Wallet size={16} /> Process Payment
            </button>
          )}
        </div>
      </div>

      {/* Print Template - Hidden on screen, visible when printing */}
      <div className="print-only" style={{ display: 'none' }}>
        <style>
          {`
          @media print {
            .print-only {
              display: block !important;
            }
            .no-print {
              display: none !important;
            }
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              size: A4;
              margin: 1cm;
            }
          }
          `}
        </style>
        <div className="max-w-4xl mx-auto border border-black p-8 text-black">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={companySettings.logo} alt={`${companySettings.companyName} Logo`} className="h-20 w-auto mx-auto mb-4" />
            <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{companySettings.companyName}</h1>
            <div className="text-sm space-y-1">
              <p>TIN: {companySettings.tinNumber} | VRN: {companySettings.vrnNumber}</p>
              <p>{companySettings.address}</p>
              <p>Tel: {companySettings.phone} | Email: {companySettings.email}</p>
            </div>
          </div>

          <hr className="border-black my-6" />
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4">{selectedInvoice.status === 'PAID' ? 'TAX INVOICE' : 'PROFORMA INVOICE'}</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-semibold">Invoice #:</span> {selectedInvoice.id}</p>
                <p><span className="font-semibold">Date Issued:</span> {selectedInvoice.dateIssued}</p>
                <p><span className="font-semibold">Due Date:</span> {selectedInvoice.dueDate}</p>
                {selectedInvoice.paymentMethod && (
                  <p><span className="font-semibold">Payment Method:</span> {selectedInvoice.paymentMethod}</p>
                )}
              </div>
            </div>
            <div className="text-right flex-1">
              <div className="border border-black p-4 inline-block">
                <h3 className="font-bold mb-2">Bill To:</h3>
                <p className="text-lg font-semibold">{selectedInvoice.customerName}</p>
                <p className="text-sm mt-2">Customer ID: {selectedInvoice.customerName.split(' ').join('').toUpperCase()}</p>
              </div>
              <div className="mt-4 text-right">
                <span className={`inline-block px-4 py-2 border border-black text-sm font-bold ${selectedInvoice.status === 'PAID' ? 'bg-gray-100' : ''}`}>
                  Status: {selectedInvoice.status}
                </span>
              </div>
            </div>
          </div>
          <hr className="border-black my-6" />
          <table className="w-full text-left mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-3 px-2 text-left font-bold">Item Description</th>
                <th className="py-3 px-2 text-center font-bold">Qty</th>
                <th className="py-3 px-2 text-right font-bold">Unit Price</th>
                <th className="py-3 px-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoice.items && selectedInvoice.items.length > 0 ? selectedInvoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-300">
                  <td className="py-3 px-2 font-medium">{item.name}</td>
                  <td className="py-3 px-2 text-center">{item.quantity}</td>
                  <td className="py-3 px-2 text-right">{item.price.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right font-semibold">{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-6 px-2 text-center font-medium">Consolidated Invoice Items</td>
                </tr>
              )}
            </tbody>
          </table>
          <hr className="border-black my-6" />
          <div className="flex justify-end">
            <div className="w-80 space-y-3 text-sm">
              {Boolean(selectedInvoice.includeVAT) ? (
                <>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{(selectedInvoice.totalAmount / 1.18).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (18%):</span>
                    <span>{(selectedInvoice.totalAmount - (selectedInvoice.totalAmount / 1.18)).toFixed(0)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>{selectedInvoice.totalAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-black pt-3">
                <span>Grand Total:</span>
                <span>{selectedInvoice.totalAmount.toLocaleString()} TZS</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Amount Paid:</span>
                <span>- {selectedInvoice.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-black pt-2">
                <span>Balance Due:</span>
                <span>{((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)).toLocaleString()} TZS</span>
              </div>
            </div>
          </div>
          {selectedInvoice.status === 'PAID' && (
            <div className="mt-6 text-center border-2 border-black p-3 font-bold text-lg">PAID IN FULL</div>
          )}
          <div className="mt-12 text-center text-sm border-t border-black pt-6">
            <p className="font-semibold">Thank you for your business!</p>
            <p className="mt-2 text-xs">This is a computer-generated invoice and does not require a signature.</p>
            <p className="mt-1 text-xs">For inquiries, contact us at {companySettings.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
