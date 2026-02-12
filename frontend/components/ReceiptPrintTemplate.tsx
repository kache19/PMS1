import React from 'react';
import PrintLayout from './PrintLayout';

interface ReceiptPrintTemplateProps {
  receipt: {
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    date: string;
    branchName: string;
  };
  companySettings: {
    companyName: string;
    tinNumber: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}

const ReceiptPrintTemplate: React.FC<ReceiptPrintTemplateProps> = ({ receipt, companySettings }) => (
  <PrintLayout title="SALE RECEIPT">
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      {companySettings.logo && <img src={companySettings.logo} alt="Logo" style={{ width: 80, height: 60, marginBottom: 8 }} />}
      <div style={{ fontWeight: 'bold', fontSize: 22 }}>{companySettings.companyName}</div>
      <div style={{ fontSize: 12, color: '#555' }}>TIN: {companySettings.tinNumber}</div>
      <div style={{ fontSize: 12, color: '#555' }}>{companySettings.address}</div>
      <div style={{ fontSize: 12, color: '#555' }}>Branch: {receipt.branchName}</div>
      <div style={{ fontSize: 12, color: '#555' }}>Tel: {companySettings.phone} | Email: {companySettings.email}</div>
    </div>
    <div style={{ marginBottom: 12 }}>
      <div><b>Date:</b> {receipt.date}</div>
      <div><b>Customer:</b> {receipt.customerName}</div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #222' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>Item</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Qty</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Price</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {receipt.items && receipt.items.length > 0 ? receipt.items.map((item, idx) => (
          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: 8 }}>{item.name}</td>
            <td style={{ textAlign: 'right', padding: 8 }}>{item.quantity}</td>
            <td style={{ textAlign: 'right', padding: 8 }}>{item.price.toLocaleString()}</td>
            <td style={{ textAlign: 'right', padding: 8 }}>{(item.price * item.quantity).toLocaleString()}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan={4} style={{ textAlign: 'center', padding: 16 }}>No items</td>
          </tr>
        )}
      </tbody>
    </table>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <div style={{ width: 200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 16 }}>
          <span>TOTAL</span>
          <span>TZS {receipt.total.toLocaleString()}</span>
        </div>
      </div>
    </div>
    <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, borderTop: '1px solid #222', paddingTop: 16 }}>
      <div style={{ fontWeight: 'bold' }}>Thank you for your business!</div>
      <div style={{ marginTop: 4 }}>Sale completed and inventory updated.</div>
    </div>
  </PrintLayout>
);

export default ReceiptPrintTemplate;
