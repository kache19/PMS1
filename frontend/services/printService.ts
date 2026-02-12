import jsPDF from 'jspdf';

export interface CompanySettings {
  companyName: string;
  tinNumber: string;
  vrnNumber?: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
}

export interface InvoiceData {
  id: string;
  customerName: string;
  dateIssued: string;
  dueDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paymentMethod?: string;
}

export interface ReceiptData {
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  date: string;
  branchName: string;
}

export interface ReportData {
  title: string;
  branchName: string;
  dateRange: string;
  data: any[];
  summary?: any;
}

class PrintService {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 2; // Minimal margin for maximum space
    this.currentY = this.margin;
  }

  private resetDocument() {
    this.doc = new jsPDF();
    this.currentY = this.margin;
  }

  private addHeader(companySettings: CompanySettings) {
    const centerX = this.pageWidth / 2;

    // Company Logo (if available, we'll use a placeholder for now)
    if (companySettings.logo) {
      // In a real implementation, you'd load the image
      // this.doc.addImage(companySettings.logo, 'JPEG', centerX - 15, this.currentY, 30, 30);
      this.currentY += 35;
    }

    // Company Name
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(companySettings.companyName, centerX, this.currentY, { align: 'center' });
    this.currentY += 8;

    // Company Details
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`TIN: ${companySettings.tinNumber}${companySettings.vrnNumber ? ` | VRN: ${companySettings.vrnNumber}` : ''}`, centerX, this.currentY, { align: 'center' });
    this.currentY += 5;
    this.doc.text(companySettings.address, centerX, this.currentY, { align: 'center' });
    this.currentY += 5;
    this.doc.text(`Tel: ${companySettings.phone} | Email: ${companySettings.email}`, centerX, this.currentY, { align: 'center' });
    this.currentY += 15;
  }

  private addLine() {
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  private checkPageBreak(minSpace: number = 50) {
    // Prevent page breaks to keep everything on one page
  }

  generateInvoicePDF(invoice: InvoiceData, companySettings: CompanySettings): void {
    this.resetDocument();

    this.addHeader(companySettings);

    // Invoice Type
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    const invoiceType = invoice.status === 'PAID' ? 'TAX INVOICE' : 'PROFORMA INVOICE';
    this.doc.text(invoiceType, this.margin, this.currentY);
    this.currentY += 10;

    // Invoice Details
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Invoice #: ${invoice.id}`, this.margin, this.currentY);
    this.doc.text(`Date Issued: ${invoice.dateIssued}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 5;
    this.doc.text(`Due Date: ${invoice.dueDate}`, this.margin, this.currentY);
    if (invoice.paymentMethod) {
      this.doc.text(`Payment Method: ${invoice.paymentMethod}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    }
    this.currentY += 10;

    // Bill To
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill To:', this.pageWidth - this.margin - 60, this.currentY, { align: 'right' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(invoice.customerName, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 5;
    this.doc.text(`Customer ID: ${invoice.customerName.split(' ').join('').toUpperCase()}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 10;

    this.addLine();

    // Items Table Header
    const tableStartY = this.currentY;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Item Description', this.margin, this.currentY);
    this.doc.text('Qty', this.pageWidth - 80, this.currentY);
    this.doc.text('Unit Price', this.pageWidth - 50, this.currentY);
    this.doc.text('Total', this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 5;

    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 5;

    // Items
    this.doc.setFont('helvetica', 'normal');
    invoice.items.forEach(item => {
      this.checkPageBreak(20);
      this.doc.text(item.name, this.margin, this.currentY);
      this.doc.text(item.quantity.toString(), this.pageWidth - 80, this.currentY);
      this.doc.text(item.price.toLocaleString(), this.pageWidth - 50, this.currentY);
      this.doc.text((item.price * item.quantity).toLocaleString(), this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += 5;
    });

    this.currentY += 5;
    this.addLine();

    // Totals
    const totalsX = this.pageWidth - 80;
    this.doc.text('Amount:', totalsX, this.currentY);
    this.doc.text(invoice.totalAmount.toLocaleString(), this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 8;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Grand Total:', totalsX, this.currentY);
    this.doc.text(`${invoice.totalAmount.toLocaleString()} TZS`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text('Amount Paid:', totalsX, this.currentY);
    this.doc.text(`- ${invoice.paidAmount.toLocaleString()}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 5;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Balance Due:', totalsX, this.currentY);
    this.doc.text(`${(invoice.totalAmount - invoice.paidAmount).toLocaleString()} TZS`, this.pageWidth - this.margin, this.currentY, { align: 'right' });

    // Status
    if (invoice.status === 'PAID') {
      this.currentY += 20;
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('PAID IN FULL', this.pageWidth / 2, this.currentY, { align: 'center' });
    }

    // Footer
    this.currentY = this.pageHeight - 40;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Thank you for your business!', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 4;
    this.doc.text('This is a computer-generated invoice and does not require a signature.', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 4;
    this.doc.text(`For inquiries, contact us at ${companySettings.phone}`, this.pageWidth / 2, this.currentY, { align: 'center' });

    // Download the PDF
    this.doc.save(`Invoice_${invoice.id}.pdf`);
  }

  generateReceiptPDF(receipt: ReceiptData, companySettings: CompanySettings): void {
    this.resetDocument();

    this.addHeader(companySettings);

    // Receipt Title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SALE RECEIPT', this.margin, this.currentY);
    this.currentY += 10;

    // Receipt Details
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Date: ${receipt.date}`, this.margin, this.currentY);
    this.doc.text(`Branch: ${receipt.branchName}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 5;
    this.doc.text(`Customer: ${receipt.customerName}`, this.margin, this.currentY);
    this.currentY += 10;

    this.addLine();

    // Items Table Header
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Item', this.margin, this.currentY);
    this.doc.text('Qty', this.pageWidth - 80, this.currentY);
    this.doc.text('Price', this.pageWidth - 50, this.currentY);
    this.doc.text('Total', this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 5;

    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 5;

    // Items
    this.doc.setFont('helvetica', 'normal');
    receipt.items.forEach(item => {
      this.checkPageBreak(15);
      this.doc.text(item.name, this.margin, this.currentY);
      this.doc.text(item.quantity.toString(), this.pageWidth - 80, this.currentY);
      this.doc.text(item.price.toLocaleString(), this.pageWidth - 50, this.currentY);
      this.doc.text((item.price * item.quantity).toLocaleString(), this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += 5;
    });

    this.currentY += 5;
    this.addLine();

    // Total
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('TOTAL', this.pageWidth - 80, this.currentY);
    this.doc.text(`${receipt.total.toLocaleString()} TZS`, this.pageWidth - this.margin, this.currentY, { align: 'right' });

    // Footer
    this.currentY = this.pageHeight - 30;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Thank you for your business!', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 4;
    this.doc.text('Sale completed and inventory updated.', this.pageWidth / 2, this.currentY, { align: 'center' });

    // Download the PDF
    this.doc.save(`Receipt_${Date.now()}.pdf`);
  }

  generateReportPDF(report: ReportData, companySettings: CompanySettings): void {
    this.resetDocument();

    this.addHeader(companySettings);

    // Report Title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(report.title, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 10;

    // Report Details
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Branch: ${report.branchName}`, this.margin, this.currentY);
    this.doc.text(`Generated: ${new Date().toLocaleDateString()}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    this.currentY += 5;
    this.doc.text(`Period: ${report.dateRange}`, this.margin, this.currentY);
    this.currentY += 15;

    // Summary if available
    if (report.summary) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Summary:', this.margin, this.currentY);
      this.currentY += 8;

      this.doc.setFont('helvetica', 'normal');
      Object.entries(report.summary).forEach(([key, value]) => {
        this.checkPageBreak(10);
        this.doc.text(`${key}: ${value}`, this.margin + 10, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 10;
    }

    this.addLine();

    // Data Table (simplified - in real implementation, you'd format based on data structure)
    if (report.data && report.data.length > 0) {
      const headers = Object.keys(report.data[0]);
      this.doc.setFont('helvetica', 'bold');

      // Table headers
      headers.forEach((header, index) => {
        const x = this.margin + (index * 40);
        if (x < this.pageWidth - this.margin) {
          this.doc.text(header, x, this.currentY);
        }
      });
      this.currentY += 5;

      this.doc.setLineWidth(0.3);
      this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
      this.currentY += 5;

      // Table data (limited to fit on one page)
      this.doc.setFont('helvetica', 'normal');
      const maxRows = 25; // Limit rows to fit on one page
      report.data.slice(0, maxRows).forEach((row) => {
        this.checkPageBreak(15);
        headers.forEach((header, colIndex) => {
          const x = this.margin + (colIndex * 40);
          const value = row[header]?.toString() || '';
          if (x < this.pageWidth - this.margin) {
            this.doc.text(value.substring(0, 8), x, this.currentY); // Truncate long values
          }
        });
        this.currentY += 5;
      });

      if (report.data.length > maxRows) {
        this.currentY += 5;
        this.doc.setFont('helvetica', 'italic');
        this.doc.setFontSize(8);
        this.doc.text(`... and ${report.data.length - maxRows} more rows (truncated to fit on one page)`, this.margin, this.currentY);
      }
    }

    // Download the PDF
    const filename = `${report.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    this.doc.save(filename);
  }
}

export const printService = new PrintService();