// Report Export Service for Accounting Reports
// Generates professional PDF and Excel reports with charts

import { OfficerTrainingCost, Invoice, PaymentBatch, Vendor } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval } from 'date-fns';

export type DateRangeType = 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ReportFilters {
  dateRange: DateRangeType;
  customStartDate?: string;
  customEndDate?: string;
  costTypes?: string[];
  paymentStatuses?: string[];
  departments?: string[];
}

export interface SpendingByDepartment {
  department: string;
  amount: number;
  percentage: number;
}

export interface SpendingByCostType {
  costType: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  monthLabel: string;
  amount: number;
  count: number;
}

export interface OfficerCostSummary {
  userId: string;
  userName: string;
  userBadge: string;
  department: string;
  totalCost: number;
  pendingCost: number;
  approvedCost: number;
  paidCost: number;
  requestCount: number;
}

export interface ReportData {
  title: string;
  generatedAt: string;
  dateRange: string;
  fiscalYear: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  budgetUtilization: number;
  spendingByDepartment: SpendingByDepartment[];
  spendingByCostType: SpendingByCostType[];
  monthlyTrends: MonthlyTrend[];
  officerSummaries: OfficerCostSummary[];
  costEntries: OfficerTrainingCost[];
  invoices: Invoice[];
  paymentBatches: PaymentBatch[];
}

// Get date range based on type
export const getDateRange = (type: DateRangeType, customStart?: string, customEnd?: string): DateRange => {
  const now = new Date();
  
  switch (type) {
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom':
      return {
        start: customStart ? parseISO(customStart) : startOfMonth(now),
        end: customEnd ? parseISO(customEnd) : endOfMonth(now),
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

// Filter costs by date range
export const filterCostsByDateRange = (costs: OfficerTrainingCost[], dateRange: DateRange): OfficerTrainingCost[] => {
  return costs.filter(cost => {
    const costDate = parseISO(cost.createdAt);
    return isWithinInterval(costDate, { start: dateRange.start, end: dateRange.end });
  });
};

// Calculate spending by department
export const calculateSpendingByDepartment = (costs: OfficerTrainingCost[], allUsers: { id: string; department: string }[]): SpendingByDepartment[] => {
  const departmentMap = new Map<string, number>();
  
  costs.forEach(cost => {
    const user = allUsers.find(u => u.id === cost.userId);
    const department = user?.department || 'Unknown';
    departmentMap.set(department, (departmentMap.get(department) || 0) + cost.costAmount);
  });
  
  const total = Array.from(departmentMap.values()).reduce((sum, val) => sum + val, 0);
  
  return Array.from(departmentMap.entries())
    .map(([department, amount]) => ({
      department,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Calculate spending by cost type
export const calculateSpendingByCostType = (costs: OfficerTrainingCost[]): SpendingByCostType[] => {
  const typeMap = new Map<string, number>();
  
  costs.forEach(cost => {
    typeMap.set(cost.costType, (typeMap.get(cost.costType) || 0) + cost.costAmount);
  });
  
  const total = Array.from(typeMap.values()).reduce((sum, val) => sum + val, 0);
  
  return Array.from(typeMap.entries())
    .map(([costType, amount]) => ({
      costType,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Calculate monthly trends
export const calculateMonthlyTrends = (costs: OfficerTrainingCost[], dateRange: DateRange): MonthlyTrend[] => {
  const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
  
  return months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthCosts = costs.filter(cost => {
      const costDate = parseISO(cost.createdAt);
      return isWithinInterval(costDate, { start: monthStart, end: monthEnd });
    });
    
    return {
      month: format(month, 'yyyy-MM'),
      monthLabel: format(month, 'MMM yyyy'),
      amount: monthCosts.reduce((sum, c) => sum + c.costAmount, 0),
      count: monthCosts.length,
    };
  });
};

// Calculate officer summaries
export const calculateOfficerSummaries = (
  costs: OfficerTrainingCost[],
  allUsers: { id: string; firstName: string; lastName: string; badgeNumber: string; department: string }[]
): OfficerCostSummary[] => {
  const summaryMap = new Map<string, OfficerCostSummary>();
  
  costs.forEach(cost => {
    const user = allUsers.find(u => u.id === cost.userId);
    
    if (!summaryMap.has(cost.userId)) {
      summaryMap.set(cost.userId, {
        userId: cost.userId,
        userName: cost.userName || (user ? `${user.firstName} ${user.lastName}` : 'Unknown'),
        userBadge: cost.userBadge || user?.badgeNumber || '',
        department: user?.department || 'Unknown',
        totalCost: 0,
        pendingCost: 0,
        approvedCost: 0,
        paidCost: 0,
        requestCount: 0,
      });
    }
    
    const summary = summaryMap.get(cost.userId)!;
    summary.totalCost += cost.costAmount;
    summary.requestCount++;
    
    switch (cost.paymentStatus) {
      case 'pending':
        summary.pendingCost += cost.costAmount;
        break;
      case 'approved':
        summary.approvedCost += cost.costAmount;
        break;
      case 'paid':
        summary.paidCost += cost.costAmount;
        break;
    }
  });
  
  return Array.from(summaryMap.values()).sort((a, b) => b.totalCost - a.totalCost);
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Generate CSV content
const generateCSV = (headers: string[], rows: string[][]): string => {
  const escapeCSV = (value: string | number): string => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(','));
  
  return [headerRow, ...dataRows].join('\n');
};

// Export cost entries to CSV
export const exportCostEntriesToCSV = (costs: OfficerTrainingCost[]): void => {
  const headers = ['Date', 'Officer', 'Badge', 'Training', 'Cost Type', 'Amount', 'Status', 'Budget Code', 'Notes'];
  
  const rows = costs.map(cost => [
    format(parseISO(cost.createdAt), 'yyyy-MM-dd'),
    cost.userName || '',
    cost.userBadge || '',
    cost.trainingTitle,
    cost.costType,
    cost.costAmount.toFixed(2),
    cost.paymentStatus,
    cost.budgetCode || '',
    cost.notes || '',
  ]);
  
  const csv = generateCSV(headers, rows);
  downloadFile(csv, 'cost_entries.csv', 'text/csv');
};

// Export invoices to CSV
export const exportInvoicesToCSV = (invoices: Invoice[]): void => {
  const headers = ['Invoice #', 'Vendor', 'Date', 'Due Date', 'Amount', 'Status', 'Description'];
  
  const rows = invoices.map(inv => [
    inv.invoiceNumber,
    inv.vendorName || '',
    format(parseISO(inv.invoiceDate), 'yyyy-MM-dd'),
    inv.dueDate ? format(parseISO(inv.dueDate), 'yyyy-MM-dd') : '',
    inv.amount.toFixed(2),
    inv.status,
    inv.description || '',
  ]);
  
  const csv = generateCSV(headers, rows);
  downloadFile(csv, 'invoices.csv', 'text/csv');
};

// Export officer summaries to CSV
export const exportOfficerSummariesToCSV = (summaries: OfficerCostSummary[]): void => {
  const headers = ['Officer', 'Badge', 'Department', 'Total Cost', 'Pending', 'Approved', 'Paid', 'Request Count'];
  
  const rows = summaries.map(s => [
    s.userName,
    s.userBadge,
    s.department,
    s.totalCost.toFixed(2),
    s.pendingCost.toFixed(2),
    s.approvedCost.toFixed(2),
    s.paidCost.toFixed(2),
    s.requestCount.toString(),
  ]);
  
  const csv = generateCSV(headers, rows);
  downloadFile(csv, 'officer_cost_summary.csv', 'text/csv');
};

// Generate Excel XML (SpreadsheetML format)
const generateExcelXML = (sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]): string => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  
  // Styles
  xml += '  <Styles>\n';
  xml += '    <Style ss:ID="Header">\n';
  xml += '      <Font ss:Bold="1" ss:Size="11"/>\n';
  xml += '      <Interior ss:Color="#F59E0B" ss:Pattern="Solid"/>\n';
  xml += '      <Alignment ss:Horizontal="Center"/>\n';
  xml += '    </Style>\n';
  xml += '    <Style ss:ID="Currency">\n';
  xml += '      <NumberFormat ss:Format="&quot;$&quot;#,##0.00"/>\n';
  xml += '    </Style>\n';
  xml += '    <Style ss:ID="Percent">\n';
  xml += '      <NumberFormat ss:Format="0.0%"/>\n';
  xml += '    </Style>\n';
  xml += '  </Styles>\n';
  
  sheets.forEach(sheet => {
    xml += `  <Worksheet ss:Name="${sheet.name}">\n`;
    xml += '    <Table>\n';
    
    // Header row
    xml += '      <Row>\n';
    sheet.headers.forEach(header => {
      xml += `        <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(header)}</Data></Cell>\n`;
    });
    xml += '      </Row>\n';
    
    // Data rows
    sheet.rows.forEach(row => {
      xml += '      <Row>\n';
      row.forEach(cell => {
        const type = typeof cell === 'number' ? 'Number' : 'String';
        xml += `        <Cell><Data ss:Type="${type}">${escapeXML(String(cell))}</Data></Cell>\n`;
      });
      xml += '      </Row>\n';
    });
    
    xml += '    </Table>\n';
    xml += '  </Worksheet>\n';
  });
  
  xml += '</Workbook>';
  return xml;
};

const escapeXML = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Export full report to Excel
export const exportToExcel = (reportData: ReportData): void => {
  const sheets = [
    // Summary sheet
    {
      name: 'Summary',
      headers: ['Metric', 'Value'],
      rows: [
        ['Report Title', reportData.title],
        ['Generated At', reportData.generatedAt],
        ['Date Range', reportData.dateRange],
        ['Fiscal Year', reportData.fiscalYear],
        ['Total Budget', reportData.totalBudget],
        ['Total Spent', reportData.totalSpent],
        ['Remaining Budget', reportData.remainingBudget],
        ['Budget Utilization', `${reportData.budgetUtilization.toFixed(1)}%`],
      ] as (string | number)[][],
    },
    // Spending by Department
    {
      name: 'By Department',
      headers: ['Department', 'Amount', 'Percentage'],
      rows: reportData.spendingByDepartment.map(d => [
        d.department,
        d.amount,
        `${d.percentage.toFixed(1)}%`,
      ]) as (string | number)[][],
    },
    // Spending by Cost Type
    {
      name: 'By Cost Type',
      headers: ['Cost Type', 'Amount', 'Percentage'],
      rows: reportData.spendingByCostType.map(c => [
        c.costType.charAt(0).toUpperCase() + c.costType.slice(1),
        c.amount,
        `${c.percentage.toFixed(1)}%`,
      ]) as (string | number)[][],
    },
    // Monthly Trends
    {
      name: 'Monthly Trends',
      headers: ['Month', 'Amount', 'Transaction Count'],
      rows: reportData.monthlyTrends.map(m => [
        m.monthLabel,
        m.amount,
        m.count,
      ]) as (string | number)[][],
    },
    // Officer Summaries
    {
      name: 'Officer Costs',
      headers: ['Officer', 'Badge', 'Department', 'Total Cost', 'Pending', 'Approved', 'Paid', 'Requests'],
      rows: reportData.officerSummaries.map(o => [
        o.userName,
        o.userBadge,
        o.department,
        o.totalCost,
        o.pendingCost,
        o.approvedCost,
        o.paidCost,
        o.requestCount,
      ]) as (string | number)[][],
    },
    // Cost Entries
    {
      name: 'Cost Entries',
      headers: ['Date', 'Officer', 'Training', 'Type', 'Amount', 'Status'],
      rows: reportData.costEntries.map(c => [
        format(parseISO(c.createdAt), 'yyyy-MM-dd'),
        c.userName || '',
        c.trainingTitle,
        c.costType,
        c.costAmount,
        c.paymentStatus,
      ]) as (string | number)[][],
    },
  ];
  
  const xml = generateExcelXML(sheets);
  downloadFile(xml, 'accounting_report.xls', 'application/vnd.ms-excel');
};

// Generate PDF content (HTML-based for printing)
export const generatePDFContent = (reportData: ReportData): string => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportData.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; }
    .header h1 { font-size: 24px; color: #1e293b; margin-bottom: 5px; }
    .header .subtitle { font-size: 14px; color: #64748b; }
    .header .meta { font-size: 10px; color: #94a3b8; margin-top: 10px; }
    
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .summary-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card .value { font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 5px; }
    .summary-card .subtext { font-size: 9px; color: #94a3b8; margin-top: 3px; }
    
    .section { margin-bottom: 25px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #f59e0b; }
    
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f59e0b; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #fef3c7; }
    
    .chart-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px; }
    .chart { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .chart-title { font-size: 12px; font-weight: 600; margin-bottom: 10px; }
    
    .bar-chart { display: flex; flex-direction: column; gap: 8px; }
    .bar-item { display: flex; align-items: center; gap: 10px; }
    .bar-label { width: 100px; font-size: 10px; text-align: right; }
    .bar-container { flex: 1; height: 20px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .bar { height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24); border-radius: 4px; transition: width 0.3s; }
    .bar-value { width: 80px; font-size: 10px; font-weight: 600; }
    
    .progress-bar { height: 24px; background: #e2e8f0; border-radius: 12px; overflow: hidden; margin: 10px 0; }
    .progress-fill { height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; color: white; font-weight: 600; font-size: 11px; }
    .progress-fill.green { background: linear-gradient(90deg, #22c55e, #4ade80); }
    .progress-fill.amber { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .progress-fill.red { background: linear-gradient(90deg, #ef4444, #f87171); }
    
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
    
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportData.title}</h1>
    <div class="subtitle">Training Budget & Cost Analysis Report</div>
    <div class="meta">Generated: ${reportData.generatedAt} | Period: ${reportData.dateRange} | Fiscal Year: ${reportData.fiscalYear}</div>
  </div>
  
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Total Budget</div>
      <div class="value">${formatCurrency(reportData.totalBudget)}</div>
      <div class="subtext">FY ${reportData.fiscalYear}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Spent</div>
      <div class="value" style="color: #22c55e;">${formatCurrency(reportData.totalSpent)}</div>
      <div class="subtext">${reportData.budgetUtilization.toFixed(1)}% utilized</div>
    </div>
    <div class="summary-card">
      <div class="label">Remaining</div>
      <div class="value" style="color: #3b82f6;">${formatCurrency(reportData.remainingBudget)}</div>
      <div class="subtext">Available budget</div>
    </div>
    <div class="summary-card">
      <div class="label">Transactions</div>
      <div class="value">${reportData.costEntries.length}</div>
      <div class="subtext">Cost entries</div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Budget Utilization</div>
    <div class="progress-bar">
      <div class="progress-fill ${reportData.budgetUtilization > 90 ? 'red' : reportData.budgetUtilization > 75 ? 'amber' : 'green'}" style="width: ${Math.min(reportData.budgetUtilization, 100)}%;">
        ${reportData.budgetUtilization.toFixed(1)}%
      </div>
    </div>
  </div>
  
  <div class="chart-container">
    <div class="chart">
      <div class="chart-title">Spending by Cost Type</div>
      <div class="bar-chart">
        ${reportData.spendingByCostType.map(item => `
          <div class="bar-item">
            <div class="bar-label">${item.costType.charAt(0).toUpperCase() + item.costType.slice(1)}</div>
            <div class="bar-container">
              <div class="bar" style="width: ${item.percentage}%;"></div>
            </div>
            <div class="bar-value">${formatCurrency(item.amount)}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="chart">
      <div class="chart-title">Spending by Department</div>
      <div class="bar-chart">
        ${reportData.spendingByDepartment.slice(0, 5).map(item => `
          <div class="bar-item">
            <div class="bar-label">${item.department}</div>
            <div class="bar-container">
              <div class="bar" style="width: ${item.percentage}%;"></div>
            </div>
            <div class="bar-value">${formatCurrency(item.amount)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Monthly Spending Trends</div>
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th style="text-align: right;">Amount</th>
          <th style="text-align: right;">Transactions</th>
          <th style="width: 40%;">Distribution</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.monthlyTrends.map(month => {
          const maxAmount = Math.max(...reportData.monthlyTrends.map(m => m.amount));
          const barWidth = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
          return `
            <tr>
              <td>${month.monthLabel}</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(month.amount)}</td>
              <td style="text-align: right;">${month.count}</td>
              <td>
                <div style="height: 16px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: ${barWidth}%; background: linear-gradient(90deg, #f59e0b, #fbbf24); border-radius: 4px;"></div>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">Officer Cost Summary (Top 10)</div>
    <table>
      <thead>
        <tr>
          <th>Officer</th>
          <th>Badge</th>
          <th>Department</th>
          <th style="text-align: right;">Total</th>
          <th style="text-align: right;">Pending</th>
          <th style="text-align: right;">Approved</th>
          <th style="text-align: right;">Paid</th>
          <th style="text-align: center;">Requests</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.officerSummaries.slice(0, 10).map(officer => `
          <tr>
            <td>${officer.userName}</td>
            <td>${officer.userBadge}</td>
            <td>${officer.department}</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(officer.totalCost)}</td>
            <td style="text-align: right; color: #f59e0b;">${formatCurrency(officer.pendingCost)}</td>
            <td style="text-align: right; color: #22c55e;">${formatCurrency(officer.approvedCost)}</td>
            <td style="text-align: right; color: #3b82f6;">${formatCurrency(officer.paidCost)}</td>
            <td style="text-align: center;">${officer.requestCount}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">Recent Cost Entries (Last 20)</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Officer</th>
          <th>Training</th>
          <th>Type</th>
          <th style="text-align: right;">Amount</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.costEntries.slice(0, 20).map(cost => `
          <tr>
            <td>${format(parseISO(cost.createdAt), 'MMM d, yyyy')}</td>
            <td>${cost.userName || 'N/A'}</td>
            <td>${cost.trainingTitle}</td>
            <td style="text-transform: capitalize;">${cost.costType}</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(cost.costAmount)}</td>
            <td style="text-align: center;">
              <span style="padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase;
                ${cost.paymentStatus === 'paid' ? 'background: #dcfce7; color: #166534;' : 
                  cost.paymentStatus === 'approved' ? 'background: #dbeafe; color: #1e40af;' :
                  cost.paymentStatus === 'rejected' ? 'background: #fee2e2; color: #991b1b;' :
                  'background: #fef3c7; color: #92400e;'}">
                ${cost.paymentStatus}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="footer">
    <p>This report was automatically generated by the Police Training Management System.</p>
    <p>Confidential - For Internal Use Only</p>
  </div>
</body>
</html>
  `;
  
  return html;
};

// Export to PDF (opens print dialog)
export const exportToPDF = (reportData: ReportData): void => {
  const html = generatePDFContent(reportData);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
};

// Download file helper
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate payment batch report
export const exportPaymentBatchReport = (batch: PaymentBatch, invoices: Invoice[]): void => {
  const batchInvoices = invoices.filter(i => i.paymentBatchId === batch.id);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Batch ${batch.batchNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; }
    .header h1 { font-size: 22px; color: #1e293b; }
    .header .batch-number { font-size: 16px; color: #f59e0b; margin-top: 5px; }
    .header .meta { font-size: 10px; color: #94a3b8; margin-top: 10px; }
    
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
    .summary-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .summary-item .label { font-size: 10px; color: #64748b; text-transform: uppercase; }
    .summary-item .value { font-size: 18px; font-weight: 700; margin-top: 5px; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f59e0b; color: white; padding: 12px 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    
    .total-row { background: #fef3c7 !important; font-weight: 700; }
    .total-row td { border-top: 2px solid #f59e0b; }
    
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 30px; }
    .signature-line { border-top: 1px solid #1e293b; padding-top: 5px; text-align: center; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Payment Batch Report</h1>
    <div class="batch-number">${batch.batchNumber}</div>
    <div class="meta">
      Batch Date: ${format(parseISO(batch.batchDate), 'MMMM d, yyyy')} | 
      Status: ${batch.status.toUpperCase()} |
      Created by: ${batch.createdByName || 'N/A'}
    </div>
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <div class="label">Total Amount</div>
      <div class="value" style="color: #22c55e;">${formatCurrency(batch.totalAmount)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Invoice Count</div>
      <div class="value">${batch.invoiceCount}</div>
    </div>
    <div class="summary-item">
      <div class="label">Status</div>
      <div class="value" style="color: #f59e0b;">${batch.status.toUpperCase()}</div>
    </div>
  </div>
  
  <h3 style="margin-bottom: 10px;">Included Invoices</h3>
  <table>
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Vendor</th>
        <th>Invoice Date</th>
        <th>Description</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${batchInvoices.map(inv => `
        <tr>
          <td>${inv.invoiceNumber}</td>
          <td>${inv.vendorName || 'N/A'}</td>
          <td>${format(parseISO(inv.invoiceDate), 'MMM d, yyyy')}</td>
          <td>${inv.description || '-'}</td>
          <td style="text-align: right;">${formatCurrency(inv.amount)}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4" style="text-align: right;">TOTAL:</td>
        <td style="text-align: right;">${formatCurrency(batch.totalAmount)}</td>
      </tr>
    </tbody>
  </table>
  
  ${batch.notes ? `<p style="margin-top: 20px;"><strong>Notes:</strong> ${batch.notes}</p>` : ''}
  
  <div class="footer">
    <div class="signatures">
      <div>
        <div class="signature-line">Prepared By / Date</div>
      </div>
      <div>
        <div class="signature-line">Approved By / Date</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 250);
    };
  }
};

// Prepare full report data
export const prepareReportData = (
  title: string,
  costs: OfficerTrainingCost[],
  invoices: Invoice[],
  paymentBatches: PaymentBatch[],
  allUsers: { id: string; firstName: string; lastName: string; badgeNumber: string; department: string }[],
  totalBudget: number,
  fiscalYear: string,
  dateRange: DateRange
): ReportData => {
  const filteredCosts = filterCostsByDateRange(costs, dateRange);
  const totalSpent = filteredCosts.reduce((sum, c) => sum + c.costAmount, 0);
  
  return {
    title,
    generatedAt: format(new Date(), 'MMMM d, yyyy h:mm a'),
    dateRange: `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`,
    fiscalYear,
    totalBudget,
    totalSpent,
    remainingBudget: totalBudget - totalSpent,
    budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    spendingByDepartment: calculateSpendingByDepartment(filteredCosts, allUsers),
    spendingByCostType: calculateSpendingByCostType(filteredCosts),
    monthlyTrends: calculateMonthlyTrends(costs, dateRange),
    officerSummaries: calculateOfficerSummaries(filteredCosts, allUsers),
    costEntries: filteredCosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    invoices,
    paymentBatches,
  };
};
