import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface CompanyHeaderOptions {
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  tinNumber?: string;
  vrnNumber?: string;
  logo?: string;
}

interface ExportPDFOptions {
  totalItems?: number;
  totalProducts?: number;
  totalValue?: number;
  subtitle?: string;
  printedFromBranch?: string;
  company?: CompanyHeaderOptions;
}

const loadImageAsDataUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUrl, { cache: 'no-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Export data to Excel file
 * @param data Array of objects to export
 * @param filename Filename without extension
 */
export const exportToExcel = (data: Record<string, any>[], filename: string): void => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Auto-width columns based on content
    const maxWidth = 50;
    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...data.map((row) => String(row[key] || '').length)
        ) + 2,
        maxWidth
      ),
    }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error('Failed to export to Excel');
  }
};

/**
 * Export data to PDF file
 * @param data Array of objects to export
 * @param title Document title
 * @param columns Column definitions with key and header
 * @param options Optional summary data to display at the bottom
 */
export const exportToPDF = async (
  data: Record<string, any>[],
  title: string,
  columns: { key: string; header: string }[],
  options?: ExportPDFOptions
): Promise<void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 14;

    const company = options?.company || {};
    const resolvedCompanyName = company.companyName || 'Malenya Pharmaceuticals';
    const resolvedAddress = company.address || '';
    const resolvedPhone = company.phone || '';
    const resolvedEmail = company.email || '';
    const resolvedTin = company.tinNumber || '';
    const resolvedVrn = company.vrnNumber || '';

    const generatedAt = new Date().toLocaleString();
    const totalProducts = options?.totalProducts ?? options?.totalItems ?? data.length;
    const totalValueText = options?.totalValue !== undefined
      ? options.totalValue.toLocaleString()
      : '0';
    const firstLine = (text: string, width: number) => {
      const lines = doc.splitTextToSize(text, width);
      if (Array.isArray(lines)) return String(lines[0] ?? '');
      return String(lines ?? '');
    };

    // Logo box
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(margin + 4, yPos + 4, 22, 22, 2, 2, 'F');

    if (company.logo) {
      const logoData = await loadImageAsDataUrl(company.logo);
      if (logoData) {
        const imageFormat = logoData.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoData, imageFormat, margin + 5, yPos + 5, 20, 20);
      } else {
        doc.setFontSize(9);
        doc.setTextColor(15, 118, 110);
        doc.text('LOGO', margin + 9, yPos + 17);
      }
    } else {
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text('LOGO', margin + 9, yPos + 17);
    }

    // Company details
    const companyAreaX = margin + 30;
    const companyAreaW = 98;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(resolvedCompanyName, companyAreaX, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (resolvedAddress) {
      const addressLine = firstLine(resolvedAddress, companyAreaW);
      doc.text(String(addressLine), companyAreaX, yPos + 15);
    }
    if (resolvedPhone || resolvedEmail) {
      const contactText = [resolvedPhone ? `Tel: ${resolvedPhone}` : '', resolvedEmail ? `Email: ${resolvedEmail}` : ''].filter(Boolean).join(' | ');
      const contactLine = firstLine(contactText, companyAreaW);
      doc.text(String(contactLine), companyAreaX, yPos + 20);
    }
    if (resolvedTin || resolvedVrn) {
      doc.text([resolvedTin ? `TIN: ${resolvedTin}` : '', resolvedVrn ? `VRN: ${resolvedVrn}` : ''].filter(Boolean).join(' | '), companyAreaX, yPos + 25);
    }

    // Report metadata on right (structured, borderless)
    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, pageWidth - margin - 4, yPos + 9, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    const metaLabelX = pageWidth - margin - 64;
    const metaValueX = pageWidth - margin - 4;
    doc.text('Generated:', metaLabelX, yPos + 14);
    doc.text(generatedAt, metaValueX, yPos + 14, { align: 'right' });
    if (options?.printedFromBranch) {
      const printedFrom = firstLine(options.printedFromBranch, 40);
      doc.text('Printed From:', metaLabelX, yPos + 19);
      doc.text(String(printedFrom), metaValueX, yPos + 19, { align: 'right' });
    }
    if (options?.subtitle) {
      const subtitleLine = firstLine(options.subtitle, 40);
      doc.text('Scope:', metaLabelX, yPos + 24);
      doc.text(String(subtitleLine), metaValueX, yPos + 24, { align: 'right' });
    }
    doc.text('Rows:', metaLabelX, yPos + 29);
    doc.text(String(data.length), metaValueX, yPos + 29, { align: 'right' });

    // Header divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, yPos + 34, pageWidth - margin, yPos + 34);

    // Inventory stats cards
    yPos += 43;
    const cardGap = 3;
    const cardWidth = (contentWidth - cardGap * 2) / 3;
    const cardHeight = 16;
    const stats = [
      { label: 'Total Products', value: String(totalProducts), fill: [239, 246, 255], text: [30, 64, 175] },
      { label: 'Total Value (TZS)', value: totalValueText, fill: [236, 253, 245], text: [22, 101, 52] },
      { label: 'Rows Exported', value: String(data.length), fill: [248, 250, 252], text: [51, 65, 85] }
    ];

    stats.forEach((stat, index) => {
      const x = margin + index * (cardWidth + cardGap);
      doc.setFillColor(stat.fill[0], stat.fill[1], stat.fill[2]);
      doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text(stat.label, x + 2, yPos + 5);
      doc.setTextColor(stat.text[0], stat.text[1], stat.text[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const value = firstLine(stat.value, cardWidth - 4);
      doc.text(String(value), x + 2, yPos + 11.5);
      doc.setFont('helvetica', 'normal');
    });

    yPos += 21;
    
    // Calculate column widths with weighted distribution (gives product name more room)
    const getColumnWeight = (column: { key: string; header: string }) => {
      const key = `${column.key} ${column.header}`.toLowerCase();
      if (key.includes('name') || key.includes('product')) return 2.4;
      if (key.includes('category')) return 1.4;
      if (key.includes('qty') || key.includes('quantity')) return 1.0;
      if (key.includes('price') || key.includes('value') || key.includes('amount')) return 1.2;
      if (key.includes('id')) return 0.8;
      return 1.0;
    };
    const weights = columns.map(getColumnWeight);
    const weightTotal = weights.reduce((sum, w) => sum + w, 0);
    const colWidths = weights.map((w) => (contentWidth * w) / weightTotal);
    
    // Draw header row
    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    
    let xCursor = margin;
    columns.forEach((col, index) => {
      doc.text(col.header, xCursor + 2, yPos + 5);
      xCursor += colWidths[index];
    });
    yPos += 8;
    
    // Draw data rows
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    
    const maxY = pageHeight - 20;
    
    data.forEach((row, rowIndex) => {
      const cellLines = columns.map((col, index) => {
        const value = row[col.key];
        const cellValue = value === undefined || value === null ? '' : String(value);
        const lines = doc.splitTextToSize(cellValue, Math.max(6, colWidths[index] - 4));
        return Array.isArray(lines) ? lines : [String(lines)];
      });
      const lineCount = Math.max(...cellLines.map((lines) => lines.length), 1);
      const rowHeight = Math.max(6, (lineCount * 3.8) + 2);

      // Check if we need a new page
      if (yPos + rowHeight > maxY) {
        doc.addPage();
        yPos = 14;

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`${title} - continued`, margin, yPos);
        yPos += 4;
        
        // Redraw header on new page
        doc.setFillColor(41, 128, 185);
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setTextColor(255);
        doc.setFont('helvetica', 'bold');
        
        let headerX = margin;
        columns.forEach((col, index) => {
          doc.text(col.header, headerX + 2, yPos + 5);
          headerX += colWidths[index];
        });
        yPos += 8;
        doc.setTextColor(0);
        doc.setFont('helvetica', 'normal');
      }
      
      // Alternate row colors
      if (rowIndex % 2 === 1) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
      }

      doc.setFontSize(8.5);
      let rowX = margin;
      cellLines.forEach((lines, index) => {
        const displayLines = lines.slice(0, 4);
        displayLines.forEach((line, lineIndex) => {
          doc.text(String(line), rowX + 2, yPos + 4 + (lineIndex * 3.8));
        });
        // indicate overflow when more than 4 lines
        if (lines.length > 4) {
          doc.text('...', rowX + 2, yPos + 4 + (3 * 3.8));
        }
        rowX += colWidths[index];
      });

      yPos += rowHeight;
    });
    
    // Add summary if provided
    yPos += 5;
    doc.setFontSize(11);
    if (options?.totalItems !== undefined) {
      doc.text(`Total Items: ${options.totalItems}`, margin, yPos);
    }
    if (options?.totalValue !== undefined) {
      const xPos = options.totalItems !== undefined ? margin + 50 : margin;
      doc.text(`Total Value: ${options.totalValue.toLocaleString()}`, xPos, yPos);
    }
    
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error('Failed to export to PDF');
  }
};
