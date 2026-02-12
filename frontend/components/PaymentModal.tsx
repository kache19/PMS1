import React from 'react';
import { Receipt } from 'lucide-react';
import { Invoice, PaymentMethod } from '../types';

interface PaymentModalProps {
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  selectedInvoice: Invoice | null;
  newPayment: { amount: string; discount: string; receipt: string; method: PaymentMethod };
  setNewPayment: (payment: any) => void;
  handleRecordPayment: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  showPaymentModal,
  setShowPaymentModal,
  selectedInvoice,
  newPayment,
  setNewPayment,
  handleRecordPayment
}) => {
  if (!showPaymentModal || !selectedInvoice) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-1">Record Payment</h3>
        <p className="text-sm text-slate-500 mb-4">For Invoice #{selectedInvoice.id}</p>
        {(() => {
          const remaining = selectedInvoice.totalAmount - selectedInvoice.paidAmount;
          const discountPercent = parseFloat(newPayment.discount) || 0;
          const discountAmount = remaining * discountPercent / 100;
          const amountToPay = remaining - discountAmount;
          return (
            <div className="p-3 bg-slate-50 rounded-lg mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span>Total Due:</span>
                <span className="font-bold">{selectedInvoice.totalAmount.toLocaleString()} tzsh</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Paid Amount:</span>
                <span>{selectedInvoice.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Remaining Balance:</span>
                <span>{remaining.toLocaleString()} tzsh</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Discount ({discountPercent}%):</span>
                <span>- {discountAmount.toFixed(2)} tzsh</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600 border-t border-slate-200 pt-2">
                <span>Amount to Pay:</span>
                <span>{amountToPay.toFixed(2)} tzsh</span>
              </div>
            </div>
          );
        })()}
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
              <span className="absolute left-3 top-3 text-slate-400 text-sm">tzsh</span>
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
                {`${((parseFloat(newPayment.amount) || 0) * (parseFloat(newPayment.discount) || 0) / 100).toFixed(2)} tzsh`}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" id="payment-method-label-modal">Payment Method</label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg"
              value={newPayment.method}
              onChange={(e) => setNewPayment({...newPayment, method: e.target.value as PaymentMethod})}
              aria-labelledby="payment-method-label-modal"
            >
              <option value={PaymentMethod.CASH}>Cash</option>
              <option value={PaymentMethod.MOBILE_MONEY}>Mobile Money</option>
              <option value={PaymentMethod.INSURANCE}>Insurance</option>
            </select>
          </div>
          {(() => {
            const paymentAmount = parseFloat(newPayment.amount) || 0;
            const discountPercent = parseFloat(newPayment.discount) || 0;
            const discountAmount = paymentAmount * discountPercent / 100;
            const effective = paymentAmount - discountAmount;
            return (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span>Payment Amount:</span>
                  <span>{newPayment.amount || '0'} tzsh</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Discount ({discountPercent}%):</span>
                  <span>- {discountAmount.toFixed(2)} tzsh</span>
                </div>
                <div className="flex justify-between mb-1 text-amber-600">
                  <span>Discounted tzsh Amount:</span>
                  <span>{effective.toFixed(2)} tzsh</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600 border-t border-slate-200 pt-2">
                  <span>Effective Amount:</span>
                  <span>{effective.toFixed(2)} tzsh</span>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
          <button onClick={handleRecordPayment} className="px-4 py-2 bg-teal-600 text-white rounded-lg">Save Payment</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;