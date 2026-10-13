import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateReceipt(type, details) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [120, 200] // Receipt-like size
  });
  
  // Header
  doc.setFontSize(16);
  doc.setTextColor(0, 50, 125); // #00327D
  doc.text('Equinox Bank', 60, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(67, 70, 83); // #434653
  doc.text(`Transaction Receipt`, 60, 28, { align: 'center' });
  
  // Divider
  doc.setDrawColor(226, 226, 235);
  doc.line(10, 35, 110, 35);
  
  // Title
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74); // #16A34A (Green)
  doc.text(`${type} Successful`, 60, 45, { align: 'center' });

  // Timestamp
  doc.setFontSize(9);
  doc.setTextColor(115, 119, 132);
  doc.text(`${new Date().toLocaleString()}`, 60, 52, { align: 'center' });

  // Table Data
  const tableData = Object.entries(details).map(([key, value]) => [key, value]);

  // Table styling
  autoTable(doc, {
    startY: 65,
    body: tableData,
    theme: 'plain',
    styles: { 
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { textColor: [115, 119, 132], fontStyle: 'normal' }, // Label
      1: { textColor: [25, 27, 34], fontStyle: 'bold', halign: 'right' } // Value
    },
    margin: { left: 10, right: 10 }
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY || 100;
  
  doc.setDrawColor(226, 226, 235);
  doc.line(10, finalY + 10, 110, finalY + 10);
  
  doc.setFontSize(8);
  doc.setTextColor(115, 119, 132);
  doc.text('Thank you for banking with Equinox.', 60, finalY + 20, { align: 'center' });
  
  doc.save(`Receipt_${details['Reference Number'] || Date.now()}.pdf`);
}
