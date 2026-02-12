import React from 'react';
import PrintLayout from './PrintLayout';
import { Invoice } from '../types';

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  companySettings: {
    companyName: string;
    tinNumber: string;
    vrnNumber?: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}

const InvoicePrintTemplate: React.FC<InvoicePrintTemplateProps> = ({ invoice, companySettings }) => (
  <PrintLayout title={invoice.status === 'PAID' ? 'TAX INVOICE' : 'PROFORMA INVOICE'}>
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <img src={companySettings.logo} alt="Logo" style={{ width: 80, height: 60, marginBottom: 8 }} />
      <div style={{ fontWeight: 'bold', fontSize: 22 }}>{companySettings.companyName}</div>
      <div style={{ fontSize: 12, color: '#555' }}>TIN: {companySettings.tinNumber}</div>
      <div style={{ fontSize: 12, color: '#555' }}>{companySettings.address}</div>
      <div style={{ fontSize: 12, color: '#555' }}>Tel: {companySettings.phone} | Email: {companySettings.email}</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <div><b>Invoice #:</b> {invoice.id}</div>
        <div><b>Date Issued:</b> {invoice.dateIssued}</div>
        <div><b>Due Date:</b> {invoice.dueDate}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div><b>Bill To:</b></div>
        <div>{invoice.customerName}</div>
        <div style={{ fontSize: 12 }}>Customer ID: {invoice.customerName.split(' ').join('').toUpperCase()}</div>
        <div style={{ marginTop: 8, fontWeight: 'bold', color: invoice.status === 'PAID' ? '#059669' : '#b91c1c' }}>
          Status: {invoice.status}
        </div>
      </div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #222' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>Item Description</th>
          <th style={{ textAlign: 'center', padding: 8 }}>Qty</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Unit Price</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items && invoice.items.length > 0 ? invoice.items.map((item, idx) => (
          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: 8 }}>{item.name}</td>
            <td style={{ textAlign: 'center', padding: 8 }}>{item.quantity}</td>
            <td style={{ textAlign: 'right', padding: 8 }}>TZS {item.price.toLocaleString()}</td>
            <td style={{ textAlign: 'right', padding: 8 }}>TZS {(item.price * item.quantity).toLocaleString()}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan={4} style={{ textAlign: 'center', padding: 16 }}>Consolidated Invoice Items</td>
          </tr>
        )}
      </tbody>
    </table>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <div style={{ width: 240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Amount:</span>
          <span>{invoice.totalAmount.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 18, borderTop: '1px solid #222', marginTop: 8, paddingTop: 8 }}>
          <span>Grand Total:</span>
          <span>TZS {invoice.totalAmount.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Amount Paid:</span>
          <span>- {invoice.paidAmount.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #222', marginTop: 8, paddingTop: 8 }}>
          <span>Balance Due:</span>
          <span>TZS {((invoice.totalAmount || 0) - (invoice.paidAmount || 0)).toLocaleString()}</span>
        </div>
      </div>
    </div>
    <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, borderTop: '1px solid #222', paddingTop: 16 }}>
      <div>Thank you for choosing MALENYA PHARMACEUTICAL COMPANY. We hope to work with you in near future.</div>
      <div style={{ marginTop: 10 }}>{companySettings.companyName}</div>
    </div>
  </PrintLayout>
);

export default InvoicePrintTemplate;
