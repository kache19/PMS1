// Utility to open a custom print window with provided HTML
export function openCustomPrint(html: string, title = 'Print') {
  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            body { margin: 0; background: #fff; }
            #custom-print-root { width: 100vw; background: #fff; }
          }
        </style>
      </head>
      <body>
        <div id="custom-print-root">${html}</div>
        <script>window.onload = function() { window.print(); window.onafterprint = window.close; };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
