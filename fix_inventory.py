import re

# Read the file
with open('frontend/components/Inventory.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add FileText import (already done, but check anyway)
if 'FileText,' not in content:
    content = content.replace(
        '  BarChart3,\n  Download,\n  Copy as DuplicateIcon',
        '  BarChart3,\n  Download,\n  FileText,\n  Copy as DuplicateIcon'
    )

# Step 2: Add export handler functions after handleMsdSync
export_handlers = '''

  // Export inventory to Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredInventory.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          'Product ID': item.productId,
          'Product Name': product?.name || 'Unknown',
          'Category': product?.category || 'General',
          'Quantity': item.quantity,
          'Unit': product?.unit || 'Box',
          'Cost Price': product?.costPrice || 0,
          'Selling Price': product?.price || 0,
          'Min Stock': product?.minStockLevel || 0,
        };
      });

      exportToExcel(exportData, `Inventory_${new Date().toISOString().split('T')[0]}`);
      showSuccess('Export Completed', 'Inventory data exported to Excel successfully.');
    } catch (error) {
      console.error('Export failed:', error);
      showError('Export Failed', 'Failed to export inventory data. Please try again.');
    }
  };

  // Export inventory to PDF
  const handleExportPDF = () => {
    try {
      const exportData = filteredInventory.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          name: product?.name || 'Unknown',
          category: product?.category || 'General',
          quantity: item.quantity,
          price: product?.price || 0,
        };
      });

      const columns = [
        { key: 'productId', header: 'ID' },
        { key: 'name', header: 'Product' },
        { key: 'category', header: 'Category' },
        { key: 'quantity', header: 'Qty' },
        { key: 'price', header: 'Price' }
      ];

      const totalValue = filteredInventory.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (item.quantity * (product?.price || 0));
      }, 0);

      exportToPDF(exportData, 'Inventory Report', columns, {
        totalItems: filteredInventory.length,
        totalValue: totalValue
      });
      showSuccess('Export Completed', 'Inventory report exported to PDF successfully.');
    } catch (error) {
      console.error('PDF export failed:', error);
      showError('Export Failed', 'Failed to export inventory PDF. Please try again.');
    }
  };'''

# Add handlers after handleMsdSync function
if 'handleExportExcel' not in content:
    # Find the end of handleMsdSync and insert after it
    pattern = r'(const handleMsdSync = \(\) => \{[\s\S]*?setIsSyncingMSD\(false\);\n\s+showSuccess\("MSD Sync Complete", "Updated catalog from National Medical Store\."\);\n\s+\}, 2500\);\n\s+\};)'
    match = re.search(pattern, content)
    if match:
        content = content[:match.end()] + export_handlers + content[match.end():]
        print("Added export handlers")
    else:
        print("Could not find handleMsdSync function to add handlers")

# Step 3: Add export buttons after Add New Product button
export_buttons = '''
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold shadow-lg"
                    title="Export to PDF"
                  >
                    <FileText size={20} /> Export PDF
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold shadow-lg"
                    title="Export to Excel"
                  >
                    <BarChart3 size={20} /> Export Excel
                  </button>'''

if 'Export PDF' not in content:
    # Add buttons after Add New Product button
    pattern = r'(<button\n\s+onClick=\{\(\) => setShowAddModal\(true\)\}\n\s+className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold shadow-lg"\n\s+>\n\s+<Plus size=\{20\} /> Add New Product\n\s+</button>)'
    match = re.search(pattern, content)
    if match:
        content = match.group(1) + export_buttons + content[match.end():]
        print("Added export buttons")
    else:
        print("Could not find Add New Product button")

# Write the file back
with open('frontend/components/Inventory.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
