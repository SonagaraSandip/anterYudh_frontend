/**
 * Dynamic asynchronous loaders for heavy Excel generation libraries (~1MB bundle savings)
 */
const getExcelJS = async () => {
  const mod = await import('exceljs');
  return mod.default || mod;
};

const getFileSaver = async () => {
  const mod = await import('file-saver');
  return mod.saveAs || mod.default?.saveAs || mod.default;
};

/**
 * Format date to YYYY-MM-DD string
 */
const formatDateStr = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toISOString().split('T')[0];
  } catch {
    return String(dateVal);
  }
};

/**
 * Format date & time to readable string
 */
const formatDateTimeStr = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateVal);
  }
};

/**
 * Auto-fit column widths with padding
 */
const applyAutoColWidths = (worksheet, minWidth = 14, maxWidth = 45) => {
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value;
      const strVal = val !== null && val !== undefined ? String(val) : '';
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    });
    column.width = Math.min(Math.max(maxLen + 4, minWidth), maxWidth);
  });
};

/**
 * Common Header Styling for Excel Sheets (Frozen, Dark Slate, White Bold Text)
 */
const applyHeaderStyle = (row, bgArgb = 'FF0F172A') => {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgArgb }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: false
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });
};

/**
 * Apply borders, center alignment, and alternating stripes to standard data rows
 */
const applyRowBorders = (row, isAlt = false) => {
  row.height = 22;
  row.eachCell((cell) => {
    if (!cell.fill || cell.fill.type !== 'pattern') {
      if (isAlt) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
};

/**
 * Apply highlighted Total / Summary footer row styling
 */
const applyTotalRowStyle = (row, bgArgb = 'FFF1F5F9') => {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FF0F172A' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgArgb }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF64748B' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
};

const isSamePerson = (p1, p2) =>
  String(p1 || '').trim().toLowerCase() === String(p2 || '').trim().toLowerCase();

// =========================================================================
// 1. IPO DATA EXCEL EXPORT (Matrix Grid with Colors & Visual Accents)
// =========================================================================
export const exportIposToExcel = async (ipos = []) => {
  if (!Array.isArray(ipos) || ipos.length === 0) {
    alert('No IPO data available to export.');
    return;
  }

  // 1. Collect all unique persons in clean order
  let savedPersons = [];
  try {
    const raw = localStorage.getItem('antaryudh_demat_persons');
    if (raw) savedPersons = JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse saved Demat persons:', err);
  }

  const personMap = new Map();
  const addPerson = (name) => {
    if (name && typeof name === 'string' && name.trim()) {
      const key = name.trim().toLowerCase();
      if (!personMap.has(key)) {
        personMap.set(key, name.trim());
      }
    }
  };

  if (Array.isArray(savedPersons)) {
    savedPersons.forEach(addPerson);
  }
  ipos.forEach((ipo) => {
    (ipo.applications || []).forEach((app) => {
      addPerson(app.personName);
    });
  });

  const allPersons = Array.from(personMap.values());

  const ExcelJS = await getExcelJS();
  const saveAs = await getFileSaver();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AntarYudh Financial Suite';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // SHEET 1: IPO Demat Matrix (Horizontal Grid Layout)
  // -------------------------------------------------------------
  const wsMatrix = workbook.addWorksheet('IPO Demat Matrix', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  // Setup Column Headers
  const matrixHeaders = [
    { header: 'IPO Name', key: 'ipoName', width: 24 },
    { header: 'Application Date', key: 'date', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Lot Cost (₹)', key: 'lotCost', width: 15 }
  ];

  allPersons.forEach((personName) => {
    matrixHeaders.push({
      header: personName,
      key: `p_${personName}`,
      width: Math.max(personName.length + 5, 14)
    });
  });

  matrixHeaders.push(
    { header: 'Total Applied', key: 'totalApplied', width: 14 },
    { header: 'Total Allotted', key: 'totalAllotted', width: 14 },
    { header: 'Total Invested (₹)', key: 'totalInvested', width: 18 },
    { header: 'Realized P&L (₹)', key: 'profitLoss', width: 18 },
    { header: 'ROI (%)', key: 'roi', width: 13 },
    { header: 'IPO Remarks / Notes', key: 'notes', width: 30 }
  );

  wsMatrix.columns = matrixHeaders;
  applyHeaderStyle(wsMatrix.getRow(1), 'FF0F172A'); // Dark Slate/Navy

  let sumApplied = 0;
  let sumAllotted = 0;
  let sumInvested = 0;
  let sumProfitLoss = 0;

  // Add Data Rows
  ipos.forEach((ipo, rowIdx) => {
    const ipoName = ipo.ipoName || 'Unnamed IPO';
    const lotCost = parseFloat(ipo.lotCost) || 0;
    const ipoProfitLoss = parseFloat(ipo.profitLoss) || 0;
    const ipoStatus = (ipo.status || 'applied').toUpperCase();
    const ipoDate = formatDateStr(ipo.createdAt);
    const applications = Array.isArray(ipo.applications) ? ipo.applications : [];

    const rowData = {
      ipoName,
      date: ipoDate,
      status: ipoStatus,
      lotCost: lotCost
    };

    let appliedCount = 0;
    let allottedCount = 0;

    allPersons.forEach((personName) => {
      const app = applications.find((a) => isSamePerson(a.personName, personName));
      let cellStatus = '—';
      if (app) {
        const isApplied = Boolean(app.applied);
        const isAllotted = Boolean(app.allotted);
        if (isAllotted) {
          cellStatus = 'ALLOTTED';
          allottedCount += 1;
          appliedCount += 1;
        } else if (isApplied) {
          cellStatus = 'Applied';
          appliedCount += 1;
        } else {
          cellStatus = '—';
        }
      }
      rowData[`p_${personName}`] = cellStatus;
    });

    const totalInvested = allottedCount > 0 ? allottedCount * lotCost : appliedCount * lotCost;
    const roiPercent = totalInvested > 0 ? ((ipoProfitLoss / totalInvested) * 100).toFixed(2) + '%' : '0.00%';

    sumApplied += appliedCount;
    sumAllotted += allottedCount;
    sumInvested += totalInvested;
    sumProfitLoss += ipoProfitLoss;

    rowData.totalApplied = appliedCount;
    rowData.totalAllotted = allottedCount;
    rowData.totalInvested = totalInvested;
    rowData.profitLoss = ipoProfitLoss;
    rowData.roi = roiPercent;
    rowData.notes = ipo.notes || '';

    const addedRow = wsMatrix.addRow(rowData);
    applyRowBorders(addedRow, rowIdx % 2 === 1);

    // Color Styles for Cells
    const statusCell = addedRow.getCell('status');
    statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
    if (ipoStatus === 'ALLOTTED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      statusCell.font = { bold: true, color: { argb: 'FF065F46' } };
    } else if (ipoStatus === 'APPLIED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      statusCell.font = { bold: true, color: { argb: 'FF92400E' } };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      statusCell.font = { bold: true, color: { argb: 'FF475569' } };
    }

    // Person Columns Styling
    allPersons.forEach((personName) => {
      const pCell = addedRow.getCell(`p_${personName}`);
      const val = String(pCell.value || '');
      pCell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (val === 'ALLOTTED') {
        pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        pCell.font = { bold: true, color: { argb: 'FF065F46' } };
      } else if (val === 'Applied') {
        pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
        pCell.font = { bold: true, color: { argb: 'FF0369A1' } };
      } else {
        pCell.font = { color: { argb: 'FF94A3B8' } };
      }
    });

    // P&L and ROI Styling
    const plCell = addedRow.getCell('profitLoss');
    const roiCell = addedRow.getCell('roi');
    plCell.alignment = { vertical: 'middle', horizontal: 'center' };
    roiCell.alignment = { vertical: 'middle', horizontal: 'center' };

    if (ipoProfitLoss > 0) {
      plCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      plCell.font = { bold: true, color: { argb: 'FF15803D' } };
      roiCell.font = { bold: true, color: { argb: 'FF15803D' } };
    } else if (ipoProfitLoss < 0) {
      plCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
      plCell.font = { bold: true, color: { argb: 'FFE11D48' } };
      roiCell.font = { bold: true, color: { argb: 'FFE11D48' } };
    } else {
      plCell.font = { color: { argb: 'FF64748B' } };
    }
  });

  // Add Bottom Total Row
  const totalRowData = {
    ipoName: 'PORTFOLIO TOTAL',
    date: '—',
    status: `${ipos.length} IPOs`,
    lotCost: '—',
    totalApplied: sumApplied,
    totalAllotted: sumAllotted,
    totalInvested: sumInvested,
    profitLoss: sumProfitLoss,
    roi: sumInvested > 0 ? ((sumProfitLoss / sumInvested) * 100).toFixed(2) + '%' : '0.00%',
    notes: 'Aggregated Matrix Totals'
  };
  allPersons.forEach((personName) => {
    totalRowData[`p_${personName}`] = '—';
  });

  const matrixTotalRow = wsMatrix.addRow(totalRowData);
  applyTotalRowStyle(matrixTotalRow);
  if (sumProfitLoss > 0) {
    matrixTotalRow.getCell('profitLoss').font = { bold: true, color: { argb: 'FF15803D' } };
  } else if (sumProfitLoss < 0) {
    matrixTotalRow.getCell('profitLoss').font = { bold: true, color: { argb: 'FFE11D48' } };
  }

  applyAutoColWidths(wsMatrix, 12, 45);

  // -------------------------------------------------------------
  // SHEET 2: Performance Summary KPI Sheet
  // -------------------------------------------------------------
  const wsSummary = workbook.addWorksheet('Performance Summary', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsSummary.columns = [
    { header: 'Portfolio Metric', key: 'metric', width: 34 },
    { header: 'Performance Value', key: 'value', width: 24 }
  ];
  applyHeaderStyle(wsSummary.getRow(1), 'FF1E1B4B');

  const allotmentRate =
    sumApplied > 0 ? ((sumAllotted / sumApplied) * 100).toFixed(1) + '%' : '0.0%';
  const overallRoi =
    sumInvested > 0 ? ((sumProfitLoss / sumInvested) * 100).toFixed(2) + '%' : '0.00%';

  const summaryData = [
    { metric: 'Total Logged IPO Opportunities', value: ipos.length },
    { metric: 'Total Demat Applications Filed', value: sumApplied },
    { metric: 'Total Demats Allotted', value: sumAllotted },
    { metric: 'Allotment Success Rate (%)', value: allotmentRate },
    { metric: 'Total Invested Capital (₹)', value: sumInvested },
    { metric: 'Total Realized Profit / Loss (₹)', value: sumProfitLoss },
    { metric: 'Overall Realized ROI (%)', value: overallRoi }
  ];

  summaryData.forEach((item, idx) => {
    const row = wsSummary.addRow(item);
    applyRowBorders(row, idx % 2 === 1);
    row.getCell('metric').font = { bold: true, color: { argb: 'FF1E293B' } };
    const vCell = row.getCell('value');

    if (item.metric.includes('Profit / Loss')) {
      if (sumProfitLoss > 0) {
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        vCell.font = { bold: true, color: { argb: 'FF065F46' }, size: 12 };
      } else if (sumProfitLoss < 0) {
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        vCell.font = { bold: true, color: { argb: 'FFE11D48' }, size: 12 };
      }
    }
  });

  applyAutoColWidths(wsSummary, 20, 45);

  // Generate and Download Excel File
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `AntarYudh_IPO_Report_${dateStamp}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, filename);
};

// =========================================================================
// 2. EXPENSES & CASHFLOW EXCEL EXPORT (Ledger, Category & Cashflow Breakdown)
// =========================================================================
export const exportExpensesToExcel = async (transactions = [], activeMonth = 'all') => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    alert('No cashflow transactions available to export.');
    return;
  }

  const ExcelJS = await getExcelJS();
  const saveAs = await getFileSaver();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AntarYudh Financial Suite';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // SHEET 1: Detailed Expense & Income Ledger
  // -------------------------------------------------------------
  const wsLedger = workbook.addWorksheet('Cashflow Ledger', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsLedger.columns = [
    { header: 'Tx ID', key: 'id', width: 14 },
    { header: 'Date & Time', key: 'date', width: 22 },
    { header: 'Flow Type', key: 'type', width: 15 },
    { header: 'Description / Title', key: 'title', width: 28 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Amount (₹)', key: 'amount', width: 18 },
    { header: 'Payment Mode', key: 'paymentMode', width: 16 },
    { header: 'Notes / Purpose', key: 'notes', width: 30 }
  ];
  applyHeaderStyle(wsLedger.getRow(1), 'FF881337'); // Rose Dark Header

  let totalOutflow = 0;
  let totalInflow = 0;

  transactions.forEach((t, idx) => {
    const isIncome = t.type === 'income';
    const amt = parseFloat(t.amount) || 0;
    if (isIncome) {
      totalInflow += amt;
    } else {
      totalOutflow += amt;
    }

    const row = wsLedger.addRow({
      id: t.id,
      date: formatDateTimeStr(t.transactionDate),
      type: isIncome ? 'INCOME' : 'EXPENSE',
      title: t.title || 'Untitled',
      category: t.category || 'General',
      amount: amt,
      paymentMode: t.paymentMode || 'UPI',
      notes: t.notes || ''
    });

    applyRowBorders(row, idx % 2 === 1);

    // Color code Type & Amount
    const typeCell = row.getCell('type');
    const amtCell = row.getCell('amount');

    if (isIncome) {
      typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      typeCell.font = { bold: true, color: { argb: 'FF065F46' } };
      amtCell.font = { bold: true, color: { argb: 'FF15803D' } };
    } else {
      typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
      typeCell.font = { bold: true, color: { argb: 'FFE11D48' } };
      amtCell.font = { bold: true, color: { argb: 'FFE11D48' } };
    }
  });

  // Bottom Summary Row
  const netSavings = totalInflow - totalOutflow;
  const ledgerTotalRow = wsLedger.addRow({
    id: 'TOTALS',
    date: `Records: ${transactions.length}`,
    type: netSavings >= 0 ? 'NET SURPLUS' : 'NET DEFICIT',
    title: `Inflow: +₹${totalInflow.toLocaleString('en-IN')}`,
    category: `Outflow: -₹${totalOutflow.toLocaleString('en-IN')}`,
    amount: netSavings,
    paymentMode: '—',
    notes: `Savings: ${totalInflow > 0 ? ((netSavings / totalInflow) * 100).toFixed(1) + '%' : '0%'}`
  });
  applyTotalRowStyle(ledgerTotalRow);
  if (netSavings >= 0) {
    ledgerTotalRow.getCell('amount').font = { bold: true, color: { argb: 'FF15803D' } };
  } else {
    ledgerTotalRow.getCell('amount').font = { bold: true, color: { argb: 'FFE11D48' } };
  }

  applyAutoColWidths(wsLedger, 14, 45);

  // -------------------------------------------------------------
  // SHEET 2: Category Breakdown
  // -------------------------------------------------------------
  const wsCategories = workbook.addWorksheet('Category Breakdown', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsCategories.columns = [
    { header: 'Category Name', key: 'category', width: 26 },
    { header: 'Expense Outflow (₹)', key: 'expense', width: 22 },
    { header: 'Income Inflow (₹)', key: 'income', width: 22 },
    { header: 'Net Balance (₹)', key: 'net', width: 20 },
    { header: 'Share of Outflow (%)', key: 'share', width: 20 },
    { header: 'Transactions Count', key: 'count', width: 20 }
  ];
  applyHeaderStyle(wsCategories.getRow(1), 'FF1E293B');

  const categoryMap = new Map();
  transactions.forEach((t) => {
    const cat = t.category || 'General';
    const isIncome = t.type === 'income';
    const amt = parseFloat(t.amount) || 0;

    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { expense: 0, income: 0, count: 0 });
    }
    const cur = categoryMap.get(cat);
    if (isIncome) cur.income += amt;
    else cur.expense += amt;
    cur.count += 1;
  });

  const categoryList = Array.from(categoryMap.entries()).sort((a, b) => b[1].expense - a[1].expense);

  categoryList.forEach(([catName, stats], idx) => {
    const net = stats.income - stats.expense;
    const share = totalOutflow > 0 ? ((stats.expense / totalOutflow) * 100).toFixed(1) + '%' : '0.0%';

    const row = wsCategories.addRow({
      category: catName,
      expense: stats.expense,
      income: stats.income,
      net: net,
      share: share,
      count: stats.count
    });
    applyRowBorders(row, idx % 2 === 1);
    row.getCell('category').font = { bold: true, color: { argb: 'FF1E293B' } };

    if (stats.expense > 0) {
      row.getCell('expense').font = { bold: true, color: { argb: 'FFE11D48' } };
    }
    if (stats.income > 0) {
      row.getCell('income').font = { bold: true, color: { argb: 'FF15803D' } };
    }
  });

  const catTotalRow = wsCategories.addRow({
    category: 'ALL CATEGORIES TOTAL',
    expense: totalOutflow,
    income: totalInflow,
    net: netSavings,
    share: '100.0%',
    count: transactions.length
  });
  applyTotalRowStyle(catTotalRow);
  catTotalRow.getCell('expense').font = { bold: true, color: { argb: 'FFE11D48' } };
  catTotalRow.getCell('income').font = { bold: true, color: { argb: 'FF15803D' } };

  applyAutoColWidths(wsCategories, 16, 40);

  // -------------------------------------------------------------
  // SHEET 3: Monthly Cashflow Trend
  // -------------------------------------------------------------
  const wsMonthly = workbook.addWorksheet('Monthly Cashflow Trend', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsMonthly.columns = [
    { header: 'Month (YYYY-MM)', key: 'month', width: 22 },
    { header: 'Total Outflow (₹)', key: 'expense', width: 22 },
    { header: 'Total Inflow (₹)', key: 'income', width: 22 },
    { header: 'Net Savings (₹)', key: 'net', width: 22 },
    { header: 'Savings Rate (%)', key: 'savingsRate', width: 20 },
    { header: 'Total Entries', key: 'count', width: 16 }
  ];
  applyHeaderStyle(wsMonthly.getRow(1), 'FF312E81'); // Indigo Header

  const monthMap = new Map();
  transactions.forEach((t) => {
    let mKey = 'Unknown';
    if (t.transactionDate) {
      try {
        const d = new Date(t.transactionDate);
        if (!isNaN(d.getTime())) {
          mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      } catch {
        // Ignore date parse errors and keep 'Unknown'
      }
    }
    if (!monthMap.has(mKey)) {
      monthMap.set(mKey, { expense: 0, income: 0, count: 0 });
    }
    const cur = monthMap.get(mKey);
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'income') cur.income += amt;
    else cur.expense += amt;
    cur.count += 1;
  });

  const monthEntries = Array.from(monthMap.entries()).sort().reverse();
  monthEntries.forEach(([mKey, stats], idx) => {
    const net = stats.income - stats.expense;
    const rate = stats.income > 0 ? ((net / stats.income) * 100).toFixed(1) + '%' : '0.0%';

    const row = wsMonthly.addRow({
      month: mKey,
      expense: stats.expense,
      income: stats.income,
      net: net,
      savingsRate: rate,
      count: stats.count
    });
    applyRowBorders(row, idx % 2 === 1);
    row.getCell('month').font = { bold: true, color: { argb: 'FF1E293B' } };

    const netCell = row.getCell('net');
    if (net >= 0) {
      netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      netCell.font = { bold: true, color: { argb: 'FF15803D' } };
    } else {
      netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
      netCell.font = { bold: true, color: { argb: 'FFE11D48' } };
    }
  });

  const monthTotalRow = wsMonthly.addRow({
    month: 'PORTFOLIO CASHFLOW TOTAL',
    expense: totalOutflow,
    income: totalInflow,
    net: netSavings,
    savingsRate: totalInflow > 0 ? ((netSavings / totalInflow) * 100).toFixed(1) + '%' : '0.0%',
    count: transactions.length
  });
  applyTotalRowStyle(monthTotalRow);

  applyAutoColWidths(wsMonthly, 16, 40);

  // Generate and Download Excel File
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `AntarYudh_Expense_Report_${activeMonth !== 'all' ? activeMonth + '_' : ''}${dateStamp}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, filename);
};

// =========================================================================
// 3. TRADING JOURNAL EXCEL EXPORT (Multi-Sheet, Colored P&L, Execution Legs)
// =========================================================================

/**
 * Calculate single/multi-leg metrics for a trade
 */
const calculateTradeDetails = (trade) => {
  const rawTx = Array.isArray(trade.transactions) ? trade.transactions : [];

  if (rawTx.length > 0) {
    const buyLegs = rawTx.filter((l) => l.type === 'BUY');
    const sellLegs = rawTx.filter((l) => l.type === 'SELL');

    const totalBuyQty = buyLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
    const totalBuyCost = buyLegs.reduce(
      (acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0),
      0
    );
    const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : (parseFloat(trade.buyPrice) || 0);

    const totalSellQty = sellLegs.reduce((acc, l) => acc + (parseInt(l.quantity, 10) || 0), 0);
    const totalSellRevenue = sellLegs.reduce(
      (acc, l) => acc + (parseFloat(l.price) || 0) * (parseInt(l.quantity, 10) || 0),
      0
    );
    const avgSellPrice = totalSellQty > 0 ? totalSellRevenue / totalSellQty : null;

    const remainingQty = Math.max(0, totalBuyQty - totalSellQty);
    const totalBuyCharges = buyLegs.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);
    const totalSellCharges = sellLegs.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);
    const totalCharges = rawTx.reduce((acc, l) => acc + (parseFloat(l.charges) || 0), 0);

    const hasSells = totalSellQty > 0;
    const isFullyClosed = totalBuyQty > 0 && totalSellQty >= totalBuyQty;
    const isPartial = totalSellQty > 0 && totalSellQty < totalBuyQty;
    const status = isFullyClosed ? 'CLOSED' : isPartial ? 'PARTIAL' : 'OPEN';

    const costBasisOfSold = totalSellQty * avgBuyPrice;
    const soldRatio = totalBuyQty > 0 ? Math.min(1, totalSellQty / totalBuyQty) : 0;
    const realizedBuyCharges = totalBuyCharges * soldRatio;
    const realizedCharges = totalSellCharges + realizedBuyCharges;

    const isMtf = trade.tradeType === 'mtf';
    const totalInvested = avgBuyPrice * totalBuyQty;
    const mtfFundedAmount = parseFloat(trade.mtfFundedAmount) || (isMtf ? totalInvested * 0.75 : 0);

    const bDateStr = buyLegs[0]?.date || trade.buyDate;
    const sDateStr = sellLegs[sellLegs.length - 1]?.date || trade.sellDate;
    const holdingDays = calcHoldingDays(bDateStr, sDateStr, status);
    const mtfInterest = isMtf && holdingDays ? Number(((mtfFundedAmount * soldRatio * 0.1495 / 365) * holdingDays).toFixed(2)) : 0;

    const returnsInr = hasSells ? totalSellRevenue - costBasisOfSold - realizedCharges - mtfInterest : null;
    const returnsPercent = hasSells && costBasisOfSold > 0 ? (returnsInr / costBasisOfSold) * 100 : 0;

    const buyDate = buyLegs[0]?.date || trade.buyDate;
    const sellDate = sellLegs[sellLegs.length - 1]?.date || trade.sellDate;

    return {
      buyDate,
      avgBuyPrice: Number(avgBuyPrice.toFixed(2)),
      totalBuyQty,
      invested: Number(totalInvested.toFixed(2)),
      sellDate: sellDate ? sellDate : '',
      avgSellPrice: avgSellPrice !== null ? Number(avgSellPrice.toFixed(2)) : '',
      totalSellQty,
      remainingQty,
      status,
      realizedValue: hasSells ? Number(totalSellRevenue.toFixed(2)) : '',
      charges: Number((isFullyClosed ? totalCharges : (hasSells ? realizedCharges : totalBuyCharges)).toFixed(2)),
      isMtf,
      mtfFundedAmount: Number(mtfFundedAmount.toFixed(2)),
      mtfInterest,
      returnsInr: returnsInr !== null ? Number(returnsInr.toFixed(2)) : '',
      returnsPercent: hasSells ? Number(returnsPercent.toFixed(2)) : '',
      rawTx
    };
  }

  // Simple Single-Leg Trade
  const buyP = parseFloat(trade.buyPrice) || 0;
  const qty = parseInt(trade.quantity, 10) || 0;
  const sellP = trade.sellPrice ? parseFloat(trade.sellPrice) : null;
  const charges = parseFloat(trade.charges) || 0;
  const isClosed = sellP !== null && Boolean(trade.sellDate);
  const invested = buyP * qty;
  const sellVal = isClosed ? sellP * qty : 0;

  const isMtf = trade.tradeType === 'mtf';
  const mtfFundedAmount = parseFloat(trade.mtfFundedAmount) || (isMtf ? invested * 0.75 : 0);
  const holdingDays = calcHoldingDays(trade.buyDate, trade.sellDate, isClosed ? 'CLOSED' : 'OPEN');
  const mtfInterest = isMtf && holdingDays ? Number(((mtfFundedAmount * 0.1495 / 365) * holdingDays).toFixed(2)) : 0;

  const returnsInr = isClosed ? sellVal - invested - charges - mtfInterest : null;
  const returnsPercent = isClosed && invested > 0 ? (returnsInr / invested) * 100 : 0;

  return {
    buyDate: trade.buyDate,
    avgBuyPrice: buyP,
    totalBuyQty: qty,
    invested: Number(invested.toFixed(2)),
    sellDate: trade.sellDate || '',
    avgSellPrice: sellP !== null ? sellP : '',
    totalSellQty: isClosed ? qty : 0,
    remainingQty: isClosed ? 0 : qty,
    status: isClosed ? 'CLOSED' : 'OPEN',
    realizedValue: isClosed ? Number(sellVal.toFixed(2)) : '',
    charges: charges,
    isMtf,
    mtfFundedAmount: Number(mtfFundedAmount.toFixed(2)),
    mtfInterest,
    returnsInr: returnsInr !== null ? Number(returnsInr.toFixed(2)) : '',
    returnsPercent: isClosed ? Number(returnsPercent.toFixed(2)) : '',
    rawTx: []
  };
};

/**
 * Calculate Holding Duration in Days
 */
const calcHoldingDays = (buyDateStr, sellDateStr, status) => {
  if (!buyDateStr) return '';
  try {
    const b = new Date(buyDateStr);
    const s = (status === 'CLOSED' || status === 'PARTIAL') && sellDateStr ? new Date(sellDateStr) : new Date();
    if (isNaN(b.getTime()) || isNaN(s.getTime())) return '';
    return Math.max(0, Math.round((s.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
  } catch {
    return '';
  }
};

export const exportTradesToExcel = async (trades = []) => {
  if (!Array.isArray(trades) || trades.length === 0) {
    alert('No trading records available to export.');
    return;
  }

  const ExcelJS = await getExcelJS();
  const saveAs = await getFileSaver();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AntarYudh Financial Suite';
  workbook.created = new Date();

  const stockTrades = trades.filter((t) => t.tradeType === 'stock' || (!t.tradeType && t.tradeType !== 'intraday' && t.tradeType !== 'mtf'));
  const intradayTrades = trades.filter((t) => t.tradeType === 'intraday');
  const mtfTrades = trades.filter((t) => t.tradeType === 'mtf');

  // -------------------------------------------------------------
  // SHEET 1: Stock & Swing Trades
  // -------------------------------------------------------------
  const wsStock = workbook.addWorksheet('Stock & Swing Trades', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsStock.columns = [
    { header: 'Trade ID', key: 'id', width: 12 },
    { header: 'Asset / Symbol', key: 'asset', width: 20 },
    { header: 'Entry Date', key: 'entryDate', width: 14 },
    { header: 'Avg Entry (₹)', key: 'avgBuyPrice', width: 15 },
    { header: 'Total Buy Qty', key: 'buyQty', width: 14 },
    { header: 'Total Capital (₹)', key: 'invested', width: 16 },
    { header: 'Exit Date', key: 'exitDate', width: 14 },
    { header: 'Avg Exit (₹)', key: 'avgSellPrice', width: 15 },
    { header: 'Sold Qty', key: 'sellQty', width: 12 },
    { header: 'Open Qty', key: 'openQty', width: 12 },
    { header: 'Position Status', key: 'status', width: 15 },
    { header: 'Holding (Days)', key: 'holdingDays', width: 14 },
    { header: 'Realized Value (₹)', key: 'realizedVal', width: 18 },
    { header: 'Charges (₹)', key: 'charges', width: 13 },
    { header: 'Net Realized P&L (₹)', key: 'netPl', width: 20 },
    { header: 'Net Return (%)', key: 'netRoi', width: 15 },
    { header: 'Strategy / Decision', key: 'decision', width: 20 },
    { header: 'Notes & Psychology', key: 'notes', width: 28 }
  ];
  applyHeaderStyle(wsStock.getRow(1), 'FF0F172A');

  let stockTotalCapital = 0;
  let stockTotalPl = 0;
  let stockTotalCharges = 0;

  stockTrades.forEach((t, idx) => {
    const m = calculateTradeDetails(t);
    const holdingDays = calcHoldingDays(m.buyDate, m.sellDate, m.status);

    stockTotalCapital += m.invested || 0;
    stockTotalCharges += m.charges || 0;
    if (m.returnsInr !== '' && m.returnsInr !== null) {
      stockTotalPl += m.returnsInr;
    }

    const rowData = {
      id: t.id,
      asset: t.assetName || 'Unknown',
      entryDate: formatDateStr(m.buyDate),
      avgBuyPrice: m.avgBuyPrice,
      buyQty: m.totalBuyQty,
      invested: m.invested,
      exitDate: formatDateStr(m.sellDate),
      avgSellPrice: m.avgSellPrice,
      sellQty: m.totalSellQty,
      openQty: m.remainingQty,
      status: m.status,
      holdingDays: holdingDays,
      realizedVal: m.realizedValue,
      charges: m.charges,
      netPl: m.returnsInr,
      netRoi: m.returnsPercent !== '' ? `${m.returnsPercent}%` : '',
      decision: t.tradeDecision || 'Self',
      notes: t.notes || ''
    };

    const addedRow = wsStock.addRow(rowData);
    applyRowBorders(addedRow, idx % 2 === 1);

    const statusCell = addedRow.getCell('status');
    if (m.status === 'CLOSED') {
      if (m.returnsInr > 0) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        statusCell.font = { bold: true, color: { argb: 'FF065F46' } };
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        statusCell.font = { bold: true, color: { argb: 'FFE11D48' } };
      }
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      statusCell.font = { bold: true, color: { argb: 'FF92400E' } };
    }

    const plCell = addedRow.getCell('netPl');
    const roiCell = addedRow.getCell('netRoi');

    if (m.returnsInr !== '' && m.returnsInr !== null) {
      if (m.returnsInr > 0) {
        plCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        plCell.font = { bold: true, color: { argb: 'FF15803D' } };
        roiCell.font = { bold: true, color: { argb: 'FF15803D' } };
      } else if (m.returnsInr < 0) {
        plCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        plCell.font = { bold: true, color: { argb: 'FFE11D48' } };
        roiCell.font = { bold: true, color: { argb: 'FFE11D48' } };
      }
    }
  });

  const stockTotalRow = wsStock.addRow({
    id: 'TOTALS',
    asset: `Trades: ${stockTrades.length}`,
    entryDate: '—',
    avgBuyPrice: '—',
    buyQty: '—',
    invested: Number(stockTotalCapital.toFixed(2)),
    exitDate: '—',
    avgSellPrice: '—',
    sellQty: '—',
    openQty: '—',
    status: '—',
    holdingDays: '—',
    realizedVal: '—',
    charges: Number(stockTotalCharges.toFixed(2)),
    netPl: Number(stockTotalPl.toFixed(2)),
    netRoi: stockTotalCapital > 0 ? ((stockTotalPl / stockTotalCapital) * 100).toFixed(2) + '%' : '0.00%',
    decision: '—',
    notes: 'Aggregated Stock P&L'
  });
  applyTotalRowStyle(stockTotalRow);
  if (stockTotalPl > 0) {
    stockTotalRow.getCell('netPl').font = { bold: true, color: { argb: 'FF15803D' } };
  } else if (stockTotalPl < 0) {
    stockTotalRow.getCell('netPl').font = { bold: true, color: { argb: 'FFE11D48' } };
  }

  applyAutoColWidths(wsStock, 12, 40);

  // -------------------------------------------------------------
  // SHEET 2: Intraday Trades
  // -------------------------------------------------------------
  const wsIntraday = workbook.addWorksheet('Intraday Trades', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsIntraday.columns = [
    { header: 'Trade ID', key: 'id', width: 12 },
    { header: 'Asset / Index', key: 'asset', width: 20 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Entry Price (₹)', key: 'buyPrice', width: 15 },
    { header: 'Qty', key: 'qty', width: 10 },
    { header: 'Trade Capital (₹)', key: 'invested', width: 16 },
    { header: 'Exit Price (₹)', key: 'sellPrice', width: 15 },
    { header: 'Position Status', key: 'status', width: 15 },
    { header: 'Charges (₹)', key: 'charges', width: 13 },
    { header: 'Net P&L (₹)', key: 'netPl', width: 18 },
    { header: 'Net Return (%)', key: 'netRoi', width: 15 },
    { header: 'Setup / Decision', key: 'decision', width: 20 },
    { header: 'Notes', key: 'notes', width: 28 }
  ];
  applyHeaderStyle(wsIntraday.getRow(1), 'FF1E293B');

  let intradayTotalCapital = 0;
  let intradayTotalPl = 0;
  let intradayTotalCharges = 0;

  intradayTrades.forEach((t, idx) => {
    const m = calculateTradeDetails(t);
    intradayTotalCapital += m.invested || 0;
    intradayTotalCharges += m.charges || 0;
    if (m.returnsInr !== '' && m.returnsInr !== null) {
      intradayTotalPl += m.returnsInr;
    }

    const rowData = {
      id: t.id,
      asset: t.assetName || 'Unknown',
      date: formatDateStr(m.buyDate),
      buyPrice: m.avgBuyPrice,
      qty: m.totalBuyQty,
      invested: m.invested,
      sellPrice: m.avgSellPrice,
      status: m.status,
      charges: m.charges,
      netPl: m.returnsInr,
      netRoi: m.returnsPercent !== '' ? `${m.returnsPercent}%` : '',
      decision: t.tradeDecision || 'Self',
      notes: t.notes || ''
    };

    const addedRow = wsIntraday.addRow(rowData);
    applyRowBorders(addedRow, idx % 2 === 1);

    const plCell = addedRow.getCell('netPl');
    const roiCell = addedRow.getCell('netRoi');

    if (m.returnsInr !== '' && m.returnsInr !== null) {
      if (m.returnsInr > 0) {
        plCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        plCell.font = { bold: true, color: { argb: 'FF15803D' } };
        roiCell.font = { bold: true, color: { argb: 'FF15803D' } };
      } else if (m.returnsInr < 0) {
        plCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        plCell.font = { bold: true, color: { argb: 'FFE11D48' } };
        roiCell.font = { bold: true, color: { argb: 'FFE11D48' } };
      }
    }
  });

  const intradayTotalRow = wsIntraday.addRow({
    id: 'TOTALS',
    asset: `Trades: ${intradayTrades.length}`,
    date: '—',
    buyPrice: '—',
    qty: '—',
    invested: Number(intradayTotalCapital.toFixed(2)),
    sellPrice: '—',
    status: '—',
    charges: Number(intradayTotalCharges.toFixed(2)),
    netPl: Number(intradayTotalPl.toFixed(2)),
    netRoi: intradayTotalCapital > 0 ? ((intradayTotalPl / intradayTotalCapital) * 100).toFixed(2) + '%' : '0.00%',
    decision: '—',
    notes: 'Aggregated Intraday P&L'
  });
  applyTotalRowStyle(intradayTotalRow);
  if (intradayTotalPl > 0) {
    intradayTotalRow.getCell('netPl').font = { bold: true, color: { argb: 'FF15803D' } };
  } else if (intradayTotalPl < 0) {
    intradayTotalRow.getCell('netPl').font = { bold: true, color: { argb: 'FFE11D48' } };
  }

  applyAutoColWidths(wsIntraday, 12, 40);

  // -------------------------------------------------------------
  // SHEET 3: MTF Margin Trades (Margin Trade Facility)
  // -------------------------------------------------------------
  const wsMtf = workbook.addWorksheet('MTF Margin Trades', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsMtf.columns = [
    { header: 'Trade ID', key: 'id', width: 12 },
    { header: 'Asset / Symbol', key: 'asset', width: 20 },
    { header: 'Entry Date', key: 'entryDate', width: 14 },
    { header: 'Avg Entry (₹)', key: 'avgBuyPrice', width: 15 },
    { header: 'Total Buy Qty', key: 'buyQty', width: 14 },
    { header: 'Total Value (₹)', key: 'invested', width: 16 },
    { header: 'Funded Capital (₹)', key: 'funded', width: 18 },
    { header: 'Exit Date', key: 'exitDate', width: 14 },
    { header: 'Avg Exit (₹)', key: 'avgSellPrice', width: 15 },
    { header: 'Sold Qty', key: 'sellQty', width: 12 },
    { header: 'Position Status', key: 'status', width: 15 },
    { header: 'Hold (Days)', key: 'holdingDays', width: 13 },
    { header: 'Brokerage & Tax (₹)', key: 'charges', width: 18 },
    { header: 'MTF Interest @ 14.95% (₹)', key: 'interest', width: 22 },
    { header: 'Net Realized P&L (₹)', key: 'netPl', width: 20 },
    { header: 'Net Return (%)', key: 'netRoi', width: 15 },
    { header: 'Decision / Notes', key: 'notes', width: 28 }
  ];
  applyHeaderStyle(wsMtf.getRow(1), 'FF581C87');

  let mtfTotalCapital = 0;
  let mtfTotalFunded = 0;
  let mtfTotalPl = 0;
  let mtfTotalCharges = 0;
  let mtfTotalInterest = 0;

  mtfTrades.forEach((t, idx) => {
    const m = calculateTradeDetails(t);
    const holdingDays = calcHoldingDays(m.buyDate, m.sellDate, m.status);

    mtfTotalCapital += m.invested || 0;
    mtfTotalFunded += m.mtfFundedAmount || 0;
    mtfTotalCharges += m.charges || 0;
    mtfTotalInterest += m.mtfInterest || 0;
    if (m.returnsInr !== '' && m.returnsInr !== null) {
      mtfTotalPl += m.returnsInr;
    }

    const rowData = {
      id: t.id,
      asset: t.assetName || 'Unknown',
      entryDate: formatDateStr(m.buyDate),
      avgBuyPrice: m.avgBuyPrice,
      buyQty: m.totalBuyQty,
      invested: m.invested,
      funded: m.mtfFundedAmount,
      exitDate: formatDateStr(m.sellDate),
      avgSellPrice: m.avgSellPrice,
      sellQty: m.totalSellQty,
      status: m.status,
      holdingDays: holdingDays,
      charges: m.charges,
      interest: m.mtfInterest,
      netPl: m.returnsInr,
      netRoi: m.returnsPercent !== '' ? `${m.returnsPercent}%` : '',
      notes: t.notes || t.tradeDecision || 'MTF Trade'
    };

    const addedRow = wsMtf.addRow(rowData);
    applyRowBorders(addedRow, idx % 2 === 1);

    const plCell = addedRow.getCell('netPl');
    const roiCell = addedRow.getCell('netRoi');

    if (m.returnsInr !== '' && m.returnsInr !== null) {
      if (m.returnsInr > 0) {
        plCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
        plCell.font = { bold: true, color: { argb: 'FF15803D' } };
        roiCell.font = { bold: true, color: { argb: 'FF15803D' } };
      } else if (m.returnsInr < 0) {
        plCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        plCell.font = { bold: true, color: { argb: 'FFE11D48' } };
        roiCell.font = { bold: true, color: { argb: 'FFE11D48' } };
      }
    }
  });

  const mtfTotalRow = wsMtf.addRow({
    id: 'TOTALS',
    asset: `Trades: ${mtfTrades.length}`,
    entryDate: '—',
    avgBuyPrice: '—',
    buyQty: '—',
    invested: Number(mtfTotalCapital.toFixed(2)),
    funded: Number(mtfTotalFunded.toFixed(2)),
    exitDate: '—',
    avgSellPrice: '—',
    sellQty: '—',
    status: '—',
    holdingDays: '—',
    charges: Number(mtfTotalCharges.toFixed(2)),
    interest: Number(mtfTotalInterest.toFixed(2)),
    netPl: Number(mtfTotalPl.toFixed(2)),
    netRoi: mtfTotalCapital > 0 ? ((mtfTotalPl / mtfTotalCapital) * 100).toFixed(2) + '%' : '0.00%',
    notes: 'Aggregated MTF P&L'
  });
  applyTotalRowStyle(mtfTotalRow);
  if (mtfTotalPl > 0) {
    mtfTotalRow.getCell('netPl').font = { bold: true, color: { argb: 'FF15803D' } };
  } else if (mtfTotalPl < 0) {
    mtfTotalRow.getCell('netPl').font = { bold: true, color: { argb: 'FFE11D48' } };
  }

  applyAutoColWidths(wsMtf, 12, 40);

  // -------------------------------------------------------------
  // SHEET 4: Multi-Leg Execution History Breakdown
  // -------------------------------------------------------------
  const wsExecutions = workbook.addWorksheet('Execution Legs Breakdown', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsExecutions.columns = [
    { header: 'Parent Trade ID', key: 'tradeId', width: 16 },
    { header: 'Asset Name', key: 'asset', width: 20 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Leg #', key: 'legNum', width: 10 },
    { header: 'Action', key: 'action', width: 12 },
    { header: 'Execution Date', key: 'date', width: 15 },
    { header: 'Execution Price (₹)', key: 'price', width: 18 },
    { header: 'Quantity', key: 'qty', width: 12 },
    { header: 'Total Value (₹)', key: 'totalVal', width: 18 },
    { header: 'Charges (₹)', key: 'charges', width: 14 },
    { header: 'Leg Execution Notes', key: 'notes', width: 30 }
  ];
  applyHeaderStyle(wsExecutions.getRow(1), 'FF312E81');

  let legCount = 0;
  trades.forEach((t) => {
    const rawTx = Array.isArray(t.transactions) ? t.transactions : [];
    if (rawTx.length > 0) {
      rawTx.forEach((leg, idx) => {
        const p = parseFloat(leg.price) || 0;
        const q = parseInt(leg.quantity, 10) || 0;
        const row = wsExecutions.addRow({
          tradeId: t.id,
          asset: t.assetName,
          type: (t.tradeType || 'stock').toUpperCase(),
          legNum: idx + 1,
          action: (leg.type || 'BUY').toUpperCase(),
          date: formatDateStr(leg.date),
          price: p,
          qty: q,
          totalVal: Number((p * q).toFixed(2)),
          charges: parseFloat(leg.charges) || 0,
          notes: leg.notes || ''
        });
        applyRowBorders(row, legCount % 2 === 1);
        legCount++;

        const actionCell = row.getCell('action');
        if (leg.type === 'BUY') {
          actionCell.font = { bold: true, color: { argb: 'FF2563EB' } };
        } else {
          actionCell.font = { bold: true, color: { argb: 'FFD97706' } };
        }
      });
    } else {
      const buyP = parseFloat(t.buyPrice) || 0;
      const qty = parseInt(t.quantity, 10) || 0;
      const r1 = wsExecutions.addRow({
        tradeId: t.id,
        asset: t.assetName,
        type: (t.tradeType || 'stock').toUpperCase(),
        legNum: 1,
        action: 'BUY',
        date: formatDateStr(t.buyDate),
        price: buyP,
        qty: qty,
        totalVal: Number((buyP * qty).toFixed(2)),
        charges: parseFloat(t.charges) || 0,
        notes: 'Initial Buy Entry'
      });
      applyRowBorders(r1, legCount % 2 === 1);
      r1.getCell('action').font = { bold: true, color: { argb: 'FF2563EB' } };
      legCount++;

      if (t.sellPrice && t.sellDate) {
        const sellP = parseFloat(t.sellPrice) || 0;
        const r2 = wsExecutions.addRow({
          tradeId: t.id,
          asset: t.assetName,
          type: (t.tradeType || 'stock').toUpperCase(),
          legNum: 2,
          action: 'SELL',
          date: formatDateStr(t.sellDate),
          price: sellP,
          qty: qty,
          totalVal: Number((sellP * qty).toFixed(2)),
          charges: 0,
          notes: 'Full Exit'
        });
        applyRowBorders(r2, legCount % 2 === 1);
        r2.getCell('action').font = { bold: true, color: { argb: 'FFD97706' } };
        legCount++;
      }
    }
  });

  applyAutoColWidths(wsExecutions, 12, 40);

  // -------------------------------------------------------------
  // SHEET 5: Performance Summary Sheet
  // -------------------------------------------------------------
  const wsSummary = workbook.addWorksheet('Performance Summary', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
  });

  wsSummary.columns = [
    { header: 'Performance Metric', key: 'metric', width: 34 },
    { header: 'Journal Value', key: 'value', width: 24 }
  ];
  applyHeaderStyle(wsSummary.getRow(1), 'FF0F172A');

  let totalClosedTrades = 0;
  let totalWinningTrades = 0;

  trades.forEach((t) => {
    const m = calculateTradeDetails(t);
    if (m.returnsInr !== '' && m.returnsInr !== null) {
      totalClosedTrades += 1;
      if (m.returnsInr > 0) totalWinningTrades += 1;
    }
  });

  const totalNetPl = stockTotalPl + intradayTotalPl + mtfTotalPl;
  const totalInvestedCapital = stockTotalCapital + intradayTotalCapital + mtfTotalCapital;
  const winRate = totalClosedTrades > 0 ? ((totalWinningTrades / totalClosedTrades) * 100).toFixed(1) + '%' : '0%';

  const summaryData = [
    { metric: 'Total Logged Trades', value: trades.length },
    { metric: 'Stock / Delivery Trades Count', value: stockTrades.length },
    { metric: 'Intraday Trades Count', value: intradayTrades.length },
    { metric: 'MTF Margin Trades Count', value: mtfTrades.length },
    { metric: 'Closed / Realized Trades', value: totalClosedTrades },
    { metric: 'Winning Trades Count', value: totalWinningTrades },
    { metric: 'Journal Win Rate (%)', value: winRate },
    { metric: 'Total Invested Capital (₹)', value: Number(totalInvestedCapital.toFixed(2)) },
    { metric: 'Realized Stock P&L (₹)', value: Number(stockTotalPl.toFixed(2)) },
    { metric: 'Realized Intraday P&L (₹)', value: Number(intradayTotalPl.toFixed(2)) },
    { metric: 'Realized MTF P&L (₹)', value: Number(mtfTotalPl.toFixed(2)) },
    { metric: 'Total Net Trading P&L (₹)', value: Number(totalNetPl.toFixed(2)) },
    { metric: 'Total MTF Interest Paid @ 14.95% (₹)', value: Number(mtfTotalInterest.toFixed(2)) },
    { metric: 'Total Brokerage & Taxes (₹)', value: Number((stockTotalCharges + intradayTotalCharges + mtfTotalCharges).toFixed(2)) }
  ];

  summaryData.forEach((item, idx) => {
    const row = wsSummary.addRow(item);
    applyRowBorders(row, idx % 2 === 1);
    row.getCell('metric').font = { bold: true, color: { argb: 'FF1E293B' } };
    const vCell = row.getCell('value');

    if (item.metric.includes('Net Trading P&L')) {
      if (totalNetPl > 0) {
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        vCell.font = { bold: true, color: { argb: 'FF065F46' }, size: 12 };
      } else if (totalNetPl < 0) {
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        vCell.font = { bold: true, color: { argb: 'FFE11D48' }, size: 12 };
      }
    }
  });

  applyAutoColWidths(wsSummary, 20, 45);

  // Generate and Download Excel File
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `AntarYudh_Trading_Journal_${dateStamp}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, filename);
};
