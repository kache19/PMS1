import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

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
export const exportToPDF = (
  data: Record<string, any>[],
  title: string,
  columns: { key: string; header: string }[],
  options?: { totalItems?: number; totalValue?: number; subtitle?: string }
): void => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let yPos = 20;
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, margin, yPos);
    yPos += 8;
    
    // Add subtitle if provided
    if (options?.subtitle) {
      doc.setFontSize(12);
      doc.text(options.subtitle, margin, yPos);
      yPos += 6;
    }
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
    doc.setTextColor(0);
    yPos += 10;
    
    // Calculate column widths
    const colCount = columns.length;
    const colWidth = (pageWidth - 2 * margin) / colCount;
    
    // Draw header row
    doc.setFillColor(41, 128, 185);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    
    columns.forEach((col, index) => {
      doc.text(col.header, margin + (index * colWidth) + 2, yPos + 5);
    });
    yPos += 8;
    
    // Draw data rows
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    
    const maxY = pageHeight - 20;
    
    data.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (yPos > maxY) {
        doc.addPage();
        yPos = 20;
        
        // Redraw header on new page
        doc.setFillColor(41, 128, 185);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
        doc.setTextColor(255);
        doc.setFont(undefined, 'bold');
        
        columns.forEach((col, index) => {
          doc.text(col.header, margin + (index * colWidth) + 2, yPos + 5);
        });
        yPos += 8;
        doc.setTextColor(0);
        doc.setFont(undefined, 'normal');
      }
      
      // Alternate row colors
      if (rowIndex % 2 === 1) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');
      }
      
      columns.forEach((col, index) => {
        const value = row[col.key];
        const cellValue = value === undefined || value === null ? '' : String(value);
        // Truncate text if too long
        const truncatedValue = cellValue.length > (colWidth / 2.5) 
          ? cellValue.substring(0, Math.floor(colWidth / 2.5)) + '...' 
          : cellValue;
        doc.text(truncatedValue, margin + (index * colWidth) + 2, yPos + 4);
      });
      
      yPos += 6;
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
