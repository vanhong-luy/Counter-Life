import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateStatement(account, transactions, dateRange = 'Last 30 Days') {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(0, 50, 125); // #00327D
  doc.text('Equinox Bank', 14, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(67, 70, 83); // #434653
  doc.text('Account Statement', 14, 30);
  
  // Account Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Account: ${account.name}`, 14, 45);
  if (account.accountNumber) doc.text(`Number: ${account.accountNumber}`, 14, 50);
  else doc.text(`ID: ${account.id}`, 14, 50);
  
  doc.text(`Period: ${dateRange}`, 14, 55);
  doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 60);

  // Table Data
  const tableColumn = ["Date", "Description", "Ref", "Status", "Amount"];
  const tableRows = [];

  transactions.forEach(tx => {
    const txData = [
      tx.date,
      tx.merchant,
      tx.ref,
      tx.status,
      tx.amount
    ];
    tableRows.push(txData);
  });

  // Table styling
  autoTable(doc, {
    startY: 70,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [0, 50, 125] },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 250] }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`Statement_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
