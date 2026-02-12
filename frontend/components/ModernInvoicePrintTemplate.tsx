import React from 'react';
import PrintLayout from './PrintLayout';

interface ModernInvoicePrintTemplateProps {
  title?: string;
  invoice: {
    id: string;
    dateIssued: string;
    client: {
      name: string;
      address: string;
      email: string;
      phone: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentTerms: string;
    paymentMethod: string;
  };
  companySettings: {
    companyName: string;
    tinNumber?: string;
    address: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}

const ModernInvoicePrintTemplate: React.FC<ModernInvoicePrintTemplateProps> = ({ title = 'INVOICE', invoice, companySettings }) => (
  <PrintLayout title={title}>
    {/* Header Section */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 20, borderBottom: '3px solid #4a90e2', marginBottom: 30 }}>
      <div style={{ flex: 1 }}>
        <div style={{
          width: 80,
          height: 60,
          background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          marginBottom: 10,
          fontSize: 24
        }}>
          {companySettings.logo ? <img src={companySettings.logo} alt="Logo" style={{ width: '100%', height: '100%', borderRadius: 8 }} /> : 'HMC'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 }}>{companySettings.companyName}</div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
          {companySettings.address && <div><b>Address:</b> {companySettings.address}</div>}
          {companySettings.email && <div><b>Email:</b> {companySettings.email}</div>}
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 12, color: '#333' }}>
        <div style={{ marginBottom: 4 }}><b>Client:</b> {invoice.client.name}</div>
        <div style={{ marginBottom: 4 }}><b>Phone:</b> {invoice.client.phone}</div>
        <div><b>Email:</b> {invoice.client.email}</div>
      </div>
    </div>

    {/* Invoice Header Bar */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#4a90e2', color: 'white', padding: '15px 20px', marginBottom: 25, fontWeight: 'bold' }}>
      <div style={{ fontSize: 24 }}>INVOICE</div>
      <div style={{ textAlign: 'right', fontSize: 13 }}>
        <div style={{ marginBottom: 4 }}>#{invoice.id}</div>
        <div>Date: {invoice.dateIssued}</div>
      </div>
    </div>

    {/* Items Table */}
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 25, fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#e8f0f9', borderTop: '2px solid #4a90e2', borderBottom: '2px solid #4a90e2' }}>
          <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', color: '#1a1a1a' }}>DESCRIPTION</th>
          <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', color: '#1a1a1a' }}>QTY</th>
          <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', color: '#1a1a1a' }}>PRICE</th>
          <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', color: '#1a1a1a' }}>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items && invoice.items.length > 0 ? invoice.items.map((item, idx) => (
          <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0', background: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
            <td style={{ padding: '12px 10px', fontWeight: 500 }}>#{String(idx + 1).padStart(2, '0')} {item.description}</td>
            <td style={{ padding: '12px 10px', textAlign: 'right' }}>{item.quantity}</td>
            <td style={{ padding: '12px 10px', textAlign: 'right' }}>TZS {item.price.toFixed(2)}</td>
            <td style={{ padding: '12px 10px', textAlign: 'right' }}>TZS {item.total.toFixed(2)}</td>
          </tr>
        )) : null}
      </tbody>
    </table>

    {/* Totals Section */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 30 }}>
      <div style={{ width: 250, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px', borderBottom: '1px solid #ddd', color: '#555' }}>
          <span>SUBTOTAL</span>
          <span>TZS {invoice.subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px', borderBottom: '2px solid #1a1a1a', color: '#555' }}>
          <span>TAX</span>
          <span>TZS {invoice.tax.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', fontWeight: 'bold', fontSize: 16 }}>
          <span>TOTAL</span>
          <span>TZS {invoice.total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    {/* Thank You Statement */}
    <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13, borderTop: '1px solid #222', paddingTop: 16 }}>
      <div>Thank you for choosing MALENYA PHARMACEUTICAL COMPANY. We hope to work with you in near future.</div>
      <div style={{ fontWeight: 'bold', marginTop: 8 }}>{companySettings.companyName}</div>
    </div>
  </PrintLayout>
);

export default ModernInvoicePrintTemplate;
