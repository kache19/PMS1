const fs = require('fs');

const content = fs.readFileSync('frontend/components/Inventory.tsx', 'utf8');
const lines = content.split('\n');

// Find the line with "Add New Product" followed by </button>
let insertIndex = -1;
for (let i = 0; i < lines.length - 1; i++) {
    const line1 = lines[i].trim();
    const line2 = lines[i+1].trim();

    // Look for the button content and closing tag
    if (line1.includes('Add New Product') && line2 === '</button>') {
        insertIndex = i + 1;
        console.log('Found pattern at lines', i+1, 'and', i+2);
        break;
    }
}

if (insertIndex > 0) {
    const exportPDF = '                  <button';
    const exportPDFBlock = `                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold shadow-lg"
                    title="Export to PDF"
                  >
                    <FileText size={20} /> Export PDF
                  </button>`;

    const exportExcelBlock = `                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold shadow-lg"
                    title="Export to Excel"
                  >
                    <BarChart3 size={20} /> Export Excel
                  </button>`;

    lines.splice(insertIndex, 0, exportPDFBlock, exportExcelBlock);
    fs.writeFileSync('frontend/components/Inventory.tsx', lines.join('\n'));
    console.log('Export buttons added at line', insertIndex + 1);
} else {
    console.log('Pattern not found');
}
