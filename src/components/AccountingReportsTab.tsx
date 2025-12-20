import React, { useState, useMemo } from 'react';
import { OfficerTrainingCost, Invoice, PaymentBatch, User } from '@/types';
import {
  DownloadIcon,
  CalendarIcon,
  SearchIcon,
} from '@/components/icons/Icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  getDateRange,
  filterCostsByDateRange,
  calculateSpendingByCostType,
  calculateSpendingByDepartment,
  calculateMonthlyTrends,
  calculateOfficerSummaries,
  prepareReportData,
  exportToPDF,
  exportToExcel,
  exportCostEntriesToCSV,
  exportOfficerSummariesToCSV,
  exportInvoicesToCSV,
  DateRangeType,
} from '@/lib/reportExportService';

// Chart Icon
const ChartIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

// File Icon
const FileIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
);

// Users Icon
const UsersIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// Filter Icon
const FilterIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

interface AccountingReportsTabProps {
  officerCosts: OfficerTrainingCost[];
  invoices: Invoice[];
  paymentBatches: PaymentBatch[];
  allUsers: User[];
  totalBudget: number;
  fiscalYear: string;
  onLogAccess: (action: string) => void;
}

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const AccountingReportsTab: React.FC<AccountingReportsTabProps> = ({
  officerCosts,
  invoices,
  paymentBatches,
  allUsers,
  totalBudget,
  fiscalYear,
  onLogAccess,
}) => {
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedReportType, setSelectedReportType] = useState<'overview' | 'department' | 'officer' | 'trends'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRange(dateRangeType, customStartDate, customEndDate);
  }, [dateRangeType, customStartDate, customEndDate]);

  // Filter and calculate data
  const filteredCosts = useMemo(() => filterCostsByDateRange(officerCosts, dateRange), [officerCosts, dateRange]);
  const spendingByCostType = useMemo(() => calculateSpendingByCostType(filteredCosts), [filteredCosts]);
  const spendingByDepartment = useMemo(() => calculateSpendingByDepartment(filteredCosts, allUsers), [filteredCosts, allUsers]);
  const monthlyTrends = useMemo(() => calculateMonthlyTrends(officerCosts, dateRange), [officerCosts, dateRange]);
  const officerSummaries = useMemo(() => calculateOfficerSummaries(filteredCosts, allUsers), [filteredCosts, allUsers]);

  const totalSpent = filteredCosts.reduce((sum, c) => sum + c.costAmount, 0);
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Prepare pie chart data
  const costTypePieData = spendingByCostType.map(item => ({
    name: item.costType.charAt(0).toUpperCase() + item.costType.slice(1),
    value: item.amount,
  }));

  const departmentPieData = spendingByDepartment.slice(0, 6).map(item => ({
    name: item.department,
    value: item.amount,
  }));

  // Export handlers
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const reportData = prepareReportData(
        'Training Budget Report',
        officerCosts,
        invoices,
        paymentBatches,
        allUsers,
        totalBudget,
        fiscalYear,
        dateRange
      );
      exportToPDF(reportData);
      onLogAccess('Exported accounting report as PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const reportData = prepareReportData(
        'Training Budget Report',
        officerCosts,
        invoices,
        paymentBatches,
        allUsers,
        totalBudget,
        fiscalYear,
        dateRange
      );
      exportToExcel(reportData);
      onLogAccess('Exported accounting report as Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCostsCSV = () => {
    exportCostEntriesToCSV(filteredCosts);
    onLogAccess('Exported cost entries as CSV');
  };

  const handleExportOfficersCSV = () => {
    exportOfficerSummariesToCSV(officerSummaries);
    onLogAccess('Exported officer summaries as CSV');
  };

  const handleExportInvoicesCSV = () => {
    exportInvoicesToCSV(invoices);
    onLogAccess('Exported invoices as CSV');
  };

  const reportTypes = [
    { id: 'overview', label: 'Overview', icon: ChartIcon },
    { id: 'department', label: 'By Department', icon: UsersIcon },
    { id: 'officer', label: 'By Officer', icon: UsersIcon },
    { id: 'trends', label: 'Trends', icon: CalendarIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FilterIcon size={18} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Date Range:</span>
            </div>
            <div className="flex gap-2">
              {(['month', 'quarter', 'year', 'custom'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRangeType(range)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    dateRangeType === range
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {dateRangeType === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedReportType(type.id as typeof selectedReportType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedReportType === type.id
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <type.icon size={16} />
            {type.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Period Spending</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalSpent)}</div>
          <div className="text-xs text-slate-400 mt-1">{filteredCosts.length} transactions</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Budget Used</div>
          <div className={`text-2xl font-bold mt-1 ${budgetUtilization > 90 ? 'text-red-600' : budgetUtilization > 75 ? 'text-amber-600' : 'text-green-600'}`}>
            {budgetUtilization.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">of {formatCurrency(totalBudget)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Avg per Transaction</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {formatCurrency(filteredCosts.length > 0 ? totalSpent / filteredCosts.length : 0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">average cost</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Active Officers</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{officerSummaries.length}</div>
          <div className="text-xs text-slate-400 mt-1">with training costs</div>
        </div>
      </div>

      {/* Charts Section */}
      {selectedReportType === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Spending by Cost Type Pie Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Spending by Cost Type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costTypePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {costTypePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {spendingByCostType.map((item, index) => (
                <div key={item.costType} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 capitalize">{item.costType}:</span>
                  <span className="font-medium text-slate-800">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trend Line Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Monthly Spending Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedReportType === 'department' && (
        <div className="space-y-6">
          {/* Department Bar Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Spending by Department</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingByDepartment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} stroke="#94a3b8" width={120} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Table */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Department Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Department</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">% of Total</th>
                    <th className="py-3 px-4 text-sm font-semibold text-slate-600 w-48">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {spendingByDepartment.map((dept, index) => (
                    <tr key={dept.department} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="font-medium text-slate-800">{dept.department}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(dept.amount)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{dept.percentage.toFixed(1)}%</td>
                      <td className="py-3 px-4">
                        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${dept.percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedReportType === 'officer' && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Officer Cost Summary</h3>
            <button
              onClick={handleExportOfficersCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <DownloadIcon size={16} />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Officer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Badge</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Department</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Total</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Pending</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Approved</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Paid</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Requests</th>
                </tr>
              </thead>
              <tbody>
                {officerSummaries.slice(0, 15).map((officer) => (
                  <tr key={officer.userId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{officer.userName}</td>
                    <td className="py-3 px-4 text-slate-600">{officer.userBadge}</td>
                    <td className="py-3 px-4 text-slate-600">{officer.department}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(officer.totalCost)}</td>
                    <td className="py-3 px-4 text-right text-amber-600">{formatCurrency(officer.pendingCost)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatCurrency(officer.approvedCost)}</td>
                    <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(officer.paidCost)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                        {officer.requestCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {officerSummaries.length === 0 && (
              <div className="text-center py-12 text-slate-500">No officer data for the selected period.</div>
            )}
          </div>
        </div>
      )}

      {selectedReportType === 'trends' && (
        <div className="space-y-6">
          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Monthly Spending & Transaction Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(value: number, name: string) => [name === 'amount' ? formatCurrency(value) : value, name === 'amount' ? 'Spending' : 'Transactions']} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="amount" name="Spending" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                  <Line yAxisId="right" type="monotone" dataKey="count" name="Transactions" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Monthly Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Month</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Transactions</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Avg per Transaction</th>
                    <th className="py-3 px-4 text-sm font-semibold text-slate-600 w-48">Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrends.map((month) => {
                    const maxAmount = Math.max(...monthlyTrends.map(m => m.amount));
                    const barWidth = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                    return (
                      <tr key={month.month} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-800">{month.monthLabel}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(month.amount)}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{month.count}</td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {formatCurrency(month.count > 0 ? month.amount / month.count : 0)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Export Reports</h3>
            <p className="text-slate-300 text-sm mt-1">
              Generate professional reports with charts and detailed breakdowns
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <FileIcon size={18} />
              Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <FileIcon size={18} />
              Export Excel
            </button>
            <button
              onClick={handleExportCostsCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <DownloadIcon size={18} />
              Costs CSV
            </button>
            <button
              onClick={handleExportInvoicesCSV}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
            >
              <DownloadIcon size={18} />
              Invoices CSV
            </button>
          </div>
        </div>
      </div>

      {/* Quick Export Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={handleExportPDF}
          className="p-4 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-xl text-left transition-all group"
        >
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
            <FileIcon size={20} className="text-red-600" />
          </div>
          <div className="font-medium text-slate-800">Full PDF Report</div>
          <div className="text-sm text-slate-500 mt-1">Complete report with charts</div>
        </button>
        
        <button
          onClick={handleExportExcel}
          className="p-4 bg-white hover:bg-green-50 border border-slate-200 hover:border-green-300 rounded-xl text-left transition-all group"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
            <FileIcon size={20} className="text-green-600" />
          </div>
          <div className="font-medium text-slate-800">Excel Workbook</div>
          <div className="text-sm text-slate-500 mt-1">Multi-sheet spreadsheet</div>
        </button>
        
        <button
          onClick={handleExportOfficersCSV}
          className="p-4 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
            <UsersIcon size={20} className="text-blue-600" />
          </div>
          <div className="font-medium text-slate-800">Officer Summary</div>
          <div className="text-sm text-slate-500 mt-1">Per-officer cost breakdown</div>
        </button>
        
        <button
          onClick={handleExportCostsCSV}
          className="p-4 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition-all group"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
            <DownloadIcon size={20} className="text-amber-600" />
          </div>
          <div className="font-medium text-slate-800">Raw Cost Data</div>
          <div className="text-sm text-slate-500 mt-1">All cost entries CSV</div>
        </button>
      </div>
    </div>
  );
};

export default AccountingReportsTab;
