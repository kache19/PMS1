import React from 'react';

interface PrintLayoutProps {
  title: string;
  children: React.ReactNode;
}

// PrintLayout: A single-page, print-optimized layout
const PrintLayout: React.FC<PrintLayoutProps> = ({ title, children }) => (
  <div style={{
    width: '800px',
    margin: '0 auto',
    padding: '32px',
    fontFamily: 'Arial, sans-serif',
    background: '#fff',
    color: '#222',
    boxShadow: '0 0 0 #fff',
    pageBreakInside: 'avoid',
  }}>
    <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{title}</h2>
    <div>{children}</div>
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #custom-print-root, #custom-print-root * { visibility: visible !important; }
        #custom-print-root { position: absolute; left: 0; top: 0; width: 100vw; background: #fff; }
        html, body { background: #fff !important; }
      }
    `}</style>
  </div>
);

export default PrintLayout;
