import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { mockUsers, mockTrainingOpportunities, mockTrainingRequests } from '@/data/mockData';
import {
  BarChartIcon,
  PieChartIcon,
  DownloadIcon,
  RefreshIcon,
  WarningIcon,
  UsersIcon,
  TrainingIcon,
  CertificateIcon,
  AccountingIcon,
  FilterIcon,
  CalendarIcon,
  TrendingUpIcon,
  TargetIcon,
  AwardIcon,
  ChevronDownIcon,
} from '@/components/icons/Icons';

// Mock certificate data for expiration tracking
const mockCertificates = [
  { id: 'c1', userId: '3', userName: 'Michael Chen', badgeNumber: '3078', trainingTitle: 'Firearms Qualification', expirationDate: '2025-01-15', status: 'expiring_soon' },
  { id: 'c2', userId: '5', userName: 'David Williams', badgeNumber: '5023', trainingTitle: 'First Aid & CPR', expirationDate: '2025-01-20', status: 'expiring_soon' },
  { id: 'c3', userId: '6', userName: 'Jessica Martinez', badgeNumber: '6034', trainingTitle: 'De-escalation Techniques', expirationDate: '2024-12-20', status: 'expired' },
  { id: 'c4', userId: '8', userName: 'Amanda Davis', badgeNumber: '8067', trainingTitle: 'K-9 Handler Certification', expirationDate: '2025-02-28', status: 'active' },
  { id: 'c5', userId: '9', userName: 'James Wilson', badgeNumber: '9078', trainingTitle: 'Defensive Driving', expirationDate: '2024-12-10', status: 'expired' },
  { id: 'c6', userId: '10', userName: 'Lisa Anderson', badgeNumber: '1089', trainingTitle: 'Legal Updates 2024', expirationDate: '2025-01-05', status: 'expiring_soon' },
];

// Mock budget data
const mockBudgetData = {
  totalBudget: 250000,
  allocated: 187500,
  spent: 142300,
  remaining: 107700,
  byCategory: [
    { category: 'Tactical', allocated: 45000, spent: 38500 },
    { category: 'Firearms', allocated: 35000, spent: 32000 },
    { category: 'Communication', allocated: 25000, spent: 18500 },
    { category: 'Medical', allocated: 20000, spent: 15200 },
    { category: 'Legal', allocated: 15000, spent: 12800 },
    { category: 'Leadership', allocated: 22500, spent: 14300 },
    { category: 'Investigation', allocated: 25000, spent: 11000 },
    { category: 'Domestic Violence', allocated: 0, spent: 0 },
    { category: 'Officer Trauma & Wellness', allocated: 0, spent: 0 },
    { category: 'Vehicle Dynamics', allocated: 0, spent: 0 },
    { category: 'Report Writing', allocated: 0, spent: 0 },
  ],
  monthlySpending: [
    { month: 'Jul', amount: 18500 },
    { month: 'Aug', amount: 22300 },
    { month: 'Sep', amount: 19800 },
    { month: 'Oct', amount: 25600 },
    { month: 'Nov', amount: 28100 },
    { month: 'Dec', amount: 28000 },
  ],
};

const ReportingDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('year');
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'certificates' | 'budget'>('overview');
  const [budgetData, setBudgetData] = useState(mockBudgetData);
  const [isLoadingBudget, setIsLoadingBudget] = useState(false);

  // Fetch budget data from database
  const fetchBudgetData = async () => {
    setIsLoadingBudget(true);
    try {
      const { data, error } = await supabase
        .from('training_budgets')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculate totals
        const totalAllocated = data.reduce((sum, cat) => sum + (cat.allocated || 0), 0);
        const totalSpent = data.reduce((sum, cat) => sum + (cat.spent || 0), 0);
        const totalRemaining = totalAllocated - totalSpent;

        // Format data for display
        const byCategory = data.map(cat => ({
          category: cat.category,
          allocated: cat.allocated || 0,
          spent: cat.spent || 0,
        }));

        setBudgetData({
          totalBudget: totalAllocated + totalRemaining,
          allocated: totalAllocated,
          spent: totalSpent,
          remaining: totalRemaining,
          byCategory,
          monthlySpending: budgetData.monthlySpending, // Keep mock monthly data for now
        });
      }
    } catch (error) {
      console.error('Error fetching budget data:', error);
      // Keep using mock data on error
    } finally {
      setIsLoadingBudget(false);
    }
  };

  // Fetch budget data on mount
  useEffect(() => {
    fetchBudgetData();
  }, []);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = [...new Set(mockUsers.map(u => u.department))];
    return ['All', ...depts];
  }, []);

  // Filter users by department
  const filteredUsers = useMemo(() => {
    if (selectedDepartment === 'All') return mockUsers.filter(u => u.role !== 'accounting');
    return mockUsers.filter(u => u.department === selectedDepartment && u.role !== 'accounting');
  }, [selectedDepartment]);

  // Training completion statistics by department
  const departmentStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; pending: number; approved: number }> = {};
    
    mockUsers.filter(u => u.role !== 'accounting').forEach(user => {
      if (!stats[user.department]) {
        stats[user.department] = { total: 0, completed: 0, pending: 0, approved: 0 };
      }
      stats[user.department].total++;
    });

    mockTrainingRequests.forEach(req => {
      const user = mockUsers.find(u => u.id === req.userId);
      if (user && stats[user.department]) {
        if (req.status === 'completed') stats[user.department].completed++;
        else if (req.status === 'approved' || req.status === 'scheduled') stats[user.department].approved++;
        else if (req.status !== 'denied') stats[user.department].pending++;
      }
    });

    return Object.entries(stats).map(([dept, data]) => ({
      department: dept,
      ...data,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  }, []);

  // Mandatory training compliance
  const mandatoryTraining = useMemo(() => {
    return mockTrainingOpportunities.filter(t => t.mandatory);
  }, []);

  const complianceData = useMemo(() => {
    const officers = filteredUsers.filter(u => u.role === 'officer' || u.role === 'supervisor');
    
    return mandatoryTraining.map(training => {
      const completedRequests = mockTrainingRequests.filter(
        r => r.trainingId === training.id && (r.status === 'completed' || r.status === 'approved' || r.status === 'scheduled')
      );
      const completedUserIds = completedRequests.map(r => r.userId);
      const compliantOfficers = officers.filter(o => completedUserIds.includes(o.id));
      
      return {
        training: training.title,
        category: training.category,
        totalOfficers: officers.length,
        compliant: compliantOfficers.length,
        nonCompliant: officers.length - compliantOfficers.length,
        complianceRate: officers.length > 0 ? Math.round((compliantOfficers.length / officers.length) * 100) : 0,
        nonCompliantOfficers: officers.filter(o => !completedUserIds.includes(o.id)),
      };
    });
  }, [filteredUsers, mandatoryTraining]);

  // Certificate expiration alerts
  const expirationAlerts = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return mockCertificates.map(cert => {
      const expDate = new Date(cert.expirationDate);
      let status: 'expired' | 'expiring_soon' | 'active' = 'active';
      let daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (expDate < now) {
        status = 'expired';
      } else if (expDate <= thirtyDaysFromNow) {
        status = 'expiring_soon';
      }
      
      return {
        ...cert,
        status,
        daysUntilExpiration,
      };
    }).sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
  }, []);

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (reportType: string) => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let content = '';
    const date = new Date().toLocaleDateString();

    if (reportType === 'department') {
      content = `
        <h1>Department Training Statistics Report</h1>
        <p>Generated: ${date}</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <tr style="background: #1e293b; color: white;">
            <th>Department</th>
            <th>Total Personnel</th>
            <th>Completed</th>
            <th>Approved</th>
            <th>Pending</th>
            <th>Completion Rate</th>
          </tr>
          ${departmentStats.map(d => `
            <tr>
              <td>${d.department}</td>
              <td>${d.total}</td>
              <td>${d.completed}</td>
              <td>${d.approved}</td>
              <td>${d.pending}</td>
              <td>${d.completionRate}%</td>
            </tr>
          `).join('')}
        </table>
      `;
    } else if (reportType === 'compliance') {
      content = `
        <h1>Mandatory Training Compliance Report</h1>
        <p>Generated: ${date}</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <tr style="background: #1e293b; color: white;">
            <th>Training</th>
            <th>Category</th>
            <th>Total Officers</th>
            <th>Compliant</th>
            <th>Non-Compliant</th>
            <th>Compliance Rate</th>
          </tr>
          ${complianceData.map(c => `
            <tr>
              <td>${c.training}</td>
              <td>${c.category}</td>
              <td>${c.totalOfficers}</td>
              <td>${c.compliant}</td>
              <td>${c.nonCompliant}</td>
              <td>${c.complianceRate}%</td>
            </tr>
          `).join('')}
        </table>
      `;
    } else if (reportType === 'certificates') {
      content = `
        <h1>Certificate Expiration Report</h1>
        <p>Generated: ${date}</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <tr style="background: #1e293b; color: white;">
            <th>Officer</th>
            <th>Badge #</th>
            <th>Certificate</th>
            <th>Expiration Date</th>
            <th>Status</th>
          </tr>
          ${expirationAlerts.map(c => `
            <tr style="background: ${c.status === 'expired' ? '#fee2e2' : c.status === 'expiring_soon' ? '#fef3c7' : 'white'};">
              <td>${c.userName}</td>
              <td>${c.badgeNumber}</td>
              <td>${c.trainingTitle}</td>
              <td>${c.expirationDate}</td>
              <td>${c.status === 'expired' ? 'EXPIRED' : c.status === 'expiring_soon' ? 'Expiring Soon' : 'Active'}</td>
            </tr>
          `).join('')}
        </table>
      `;
    } else if (reportType === 'budget') {
      content = `
        <h1>Budget Utilization Report</h1>
        <p>Generated: ${date}</p>
        <h2>Summary</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 50%;">
          <tr><td><strong>Total Budget</strong></td><td>$${budgetData.totalBudget.toLocaleString()}</td></tr>
          <tr><td><strong>Allocated</strong></td><td>$${budgetData.allocated.toLocaleString()}</td></tr>
          <tr><td><strong>Spent</strong></td><td>$${budgetData.spent.toLocaleString()}</td></tr>
          <tr><td><strong>Remaining</strong></td><td>$${budgetData.remaining.toLocaleString()}</td></tr>
        </table>
        <h2>By Category</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <tr style="background: #1e293b; color: white;">
            <th>Category</th>
            <th>Allocated</th>
            <th>Spent</th>
            <th>Remaining</th>
            <th>Utilization</th>
          </tr>
          ${budgetData.byCategory.map(c => `
            <tr>
              <td>${c.category}</td>
              <td>$${c.allocated.toLocaleString()}</td>
              <td>$${c.spent.toLocaleString()}</td>
              <td>$${(c.allocated - c.spent).toLocaleString()}</td>
              <td>${Math.round((c.spent / c.allocated) * 100)}%</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SHPD Training Report</title>

          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e293b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
            h2 { color: #475569; margin-top: 30px; }
            table { margin-top: 20px; }
            th { text-align: left; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalOfficers = mockUsers.filter(u => u.role !== 'accounting').length;
    const totalRequests = mockTrainingRequests.length;
    const completedRequests = mockTrainingRequests.filter(r => r.status === 'completed').length;
    const pendingRequests = mockTrainingRequests.filter(r => !['completed', 'denied'].includes(r.status)).length;
    const expiredCerts = expirationAlerts.filter(c => c.status === 'expired').length;
    const expiringCerts = expirationAlerts.filter(c => c.status === 'expiring_soon').length;
    const avgComplianceRate = complianceData.length > 0 
      ? Math.round(complianceData.reduce((sum, c) => sum + c.complianceRate, 0) / complianceData.length)
      : 0;
    
    return {
      totalOfficers,
      totalRequests,
      completedRequests,
      pendingRequests,
      expiredCerts,
      expiringCerts,
      avgComplianceRate,
      budgetUtilization: Math.round((budgetData.spent / budgetData.totalBudget) * 100),
    };
  }, [expirationAlerts, complianceData, budgetData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reporting Dashboard</h1>
          <p className="text-slate-600">Comprehensive training analytics and reports for department leadership</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBudgetData()}
            disabled={isLoadingBudget}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshIcon size={18} className={isLoadingBudget ? 'animate-spin' : ''} />
            {isLoadingBudget ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FilterIcon size={18} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>
          <div className="relative">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="appearance-none pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{summaryStats.totalOfficers}</p>
              <p className="text-xs text-slate-500">Total Personnel</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TargetIcon className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{summaryStats.avgComplianceRate}%</p>
              <p className="text-xs text-slate-500">Avg Compliance</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <WarningIcon className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{summaryStats.expiredCerts + summaryStats.expiringCerts}</p>
              <p className="text-xs text-slate-500">Cert Alerts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <AccountingIcon className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{summaryStats.budgetUtilization}%</p>
              <p className="text-xs text-slate-500">Budget Used</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Department Overview', icon: BarChartIcon },
              { id: 'compliance', label: 'Compliance Rates', icon: TargetIcon },
              { id: 'certificates', label: 'Certificate Alerts', icon: CertificateIcon },
              { id: 'budget', label: 'Budget Utilization', icon: AccountingIcon },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Department Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Training Completion by Department</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToCSV(departmentStats, 'department_stats')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <DownloadIcon size={16} />
                    CSV
                  </button>
                  <button
                    onClick={() => exportToPDF('department')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <DownloadIcon size={16} />
                    PDF
                  </button>
                </div>
              </div>

              {/* Chart visualization */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Completion Rates</h4>
                  <div className="space-y-3">
                    {departmentStats.map(dept => (
                      <div key={dept.department} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 truncate">{dept.department}</span>
                          <span className="font-medium text-slate-800">{dept.completionRate}%</span>
                        </div>
                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              dept.completionRate >= 80 ? 'bg-green-500' :
                              dept.completionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${dept.completionRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Personnel</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Completed</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Approved</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentStats.map(dept => (
                        <tr key={dept.department} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-800">{dept.department}</td>
                          <td className="py-3 px-4 text-sm text-slate-600 text-center">{dept.total}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              {dept.completed}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                              {dept.approved}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                              {dept.pending}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Mandatory Training Compliance</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToCSV(complianceData.map(c => ({
                      training: c.training,
                      category: c.category,
                      totalOfficers: c.totalOfficers,
                      compliant: c.compliant,
                      nonCompliant: c.nonCompliant,
                      complianceRate: `${c.complianceRate}%`,
                    })), 'compliance_report')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <DownloadIcon size={16} />
                    CSV
                  </button>
                  <button
                    onClick={() => exportToPDF('compliance')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <DownloadIcon size={16} />
                    PDF
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {complianceData.map(item => (
                  <div key={item.training} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            item.complianceRate >= 80 ? 'bg-green-100' :
                            item.complianceRate >= 50 ? 'bg-amber-100' : 'bg-red-100'
                          }`}>
                            <TrainingIcon className={`${
                              item.complianceRate >= 80 ? 'text-green-600' :
                              item.complianceRate >= 50 ? 'text-amber-600' : 'text-red-600'
                            }`} size={20} />
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-800">{item.training}</h4>
                            <p className="text-sm text-slate-500">{item.category}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-800">{item.complianceRate}%</p>
                          <p className="text-xs text-slate-500">Compliance</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-green-600">{item.compliant}</p>
                          <p className="text-xs text-slate-500">Compliant</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-red-600">{item.nonCompliant}</p>
                          <p className="text-xs text-slate-500">Non-Compliant</p>
                        </div>
                      </div>
                    </div>
                    {item.nonCompliant > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-700 mb-2">Non-Compliant Officers:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.nonCompliantOfficers.slice(0, 5).map(officer => (
                            <span key={officer.id} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                              {officer.firstName} {officer.lastName} (#{officer.badgeNumber})
                            </span>
                          ))}
                          {item.nonCompliantOfficers.length > 5 && (
                            <span className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded-full">
                              +{item.nonCompliantOfficers.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Certificate Expiration Alerts</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToCSV(expirationAlerts.map(c => ({
                      officer: c.userName,
                      badge: c.badgeNumber,
                      certificate: c.trainingTitle,
                      expirationDate: c.expirationDate,
                      status: c.status,
                      daysRemaining: c.daysUntilExpiration,
                    })), 'certificate_alerts')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <DownloadIcon size={16} />
                    CSV
                  </button>
                  <button
                    onClick={() => exportToPDF('certificates')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <DownloadIcon size={16} />
                    PDF
                  </button>
                </div>
              </div>

              {/* Alert Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {expirationAlerts.filter(c => c.status === 'expired').length}
                  </p>
                  <p className="text-sm text-red-700">Expired</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">
                    {expirationAlerts.filter(c => c.status === 'expiring_soon').length}
                  </p>
                  <p className="text-sm text-amber-700">Expiring Soon</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {expirationAlerts.filter(c => c.status === 'active').length}
                  </p>
                  <p className="text-sm text-green-700">Active</p>
                </div>
              </div>

              {/* Alerts Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Officer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Badge #</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Certificate</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Expiration</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expirationAlerts.map(cert => (
                      <tr key={cert.id} className={`border-b border-slate-100 ${
                        cert.status === 'expired' ? 'bg-red-50' :
                        cert.status === 'expiring_soon' ? 'bg-amber-50' : ''
                      }`}>
                        <td className="py-3 px-4 text-sm text-slate-800 font-medium">{cert.userName}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{cert.badgeNumber}</td>
                        <td className="py-3 px-4 text-sm text-slate-800">{cert.trainingTitle}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(cert.expirationDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            cert.status === 'expired' ? 'bg-red-100 text-red-700' :
                            cert.status === 'expiring_soon' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {cert.status === 'expired' ? 'Expired' :
                             cert.status === 'expiring_soon' ? 'Expiring Soon' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`font-medium ${
                            cert.daysUntilExpiration < 0 ? 'text-red-600' :
                            cert.daysUntilExpiration <= 30 ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {cert.daysUntilExpiration < 0 
                              ? `${Math.abs(cert.daysUntilExpiration)} days ago`
                              : `${cert.daysUntilExpiration} days`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Budget Tab */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Budget Utilization</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToCSV(budgetData.byCategory.map(c => ({
                      category: c.category,
                      allocated: `$${c.allocated.toLocaleString()}`,
                      spent: `$${c.spent.toLocaleString()}`,
                      remaining: `$${(c.allocated - c.spent).toLocaleString()}`,
                      utilization: `${Math.round((c.spent / c.allocated) * 100)}%`,
                    })), 'budget_report')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <DownloadIcon size={16} />
                    CSV
                  </button>
                  <button
                    onClick={() => exportToPDF('budget')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <DownloadIcon size={16} />
                    PDF
                  </button>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-xl p-4 text-white">
                  <p className="text-sm text-slate-300">Total Budget</p>
                  <p className="text-2xl font-bold">${budgetData.totalBudget.toLocaleString()}</p>
                </div>
                <div className="bg-blue-500 rounded-xl p-4 text-white">
                  <p className="text-sm text-blue-100">Allocated</p>
                  <p className="text-2xl font-bold">${budgetData.allocated.toLocaleString()}</p>
                </div>
                <div className="bg-amber-500 rounded-xl p-4 text-white">
                  <p className="text-sm text-amber-100">Spent</p>
                  <p className="text-2xl font-bold">${budgetData.spent.toLocaleString()}</p>
                </div>
                <div className="bg-green-500 rounded-xl p-4 text-white">
                  <p className="text-sm text-green-100">Remaining</p>
                  <p className="text-2xl font-bold">${budgetData.remaining.toLocaleString()}</p>
                </div>
              </div>

              {/* Budget by Category */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Utilization by Category</h4>
                  <div className="space-y-3">
                    {budgetData.byCategory.map(cat => {
                      const utilization = Math.round((cat.spent / cat.allocated) * 100);
                      return (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">{cat.category}</span>
                            <span className="font-medium text-slate-800">
                              ${cat.spent.toLocaleString()} / ${cat.allocated.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                utilization >= 90 ? 'bg-red-500' :
                                utilization >= 70 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Spending Trend */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Monthly Spending Trend</h4>
                  <div className="flex items-end justify-between h-48 gap-2">
                    {budgetData.monthlySpending.map((month, idx) => {
                      const maxAmount = Math.max(...budgetData.monthlySpending.map(m => m.amount));
                      const height = (month.amount / maxAmount) * 100;
                      return (
                        <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex flex-col items-center justify-end h-40">
                            <span className="text-xs text-slate-600 mb-1">
                              ${(month.amount / 1000).toFixed(0)}k
                            </span>
                            <div
                              className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg transition-all duration-500"
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{month.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Category Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Allocated</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Spent</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Remaining</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetData.byCategory.map(cat => {
                      const utilization = Math.round((cat.spent / cat.allocated) * 100);
                      const remaining = cat.allocated - cat.spent;
                      return (
                        <tr key={cat.category} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-800 font-medium">{cat.category}</td>
                          <td className="py-3 px-4 text-sm text-slate-600 text-right">
                            ${cat.allocated.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 text-right">
                            ${cat.spent.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            <span className={remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                              ${remaining.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              utilization >= 90 ? 'bg-red-100 text-red-700' :
                              utilization >= 70 ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {utilization}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-semibold">
                      <td className="py-3 px-4 text-sm text-slate-800">Total</td>
                      <td className="py-3 px-4 text-sm text-slate-800 text-right">
                        ${budgetData.allocated.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800 text-right">
                        ${budgetData.spent.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-green-600 text-right">
                        ${(budgetData.allocated - budgetData.spent).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                          {Math.round((budgetData.spent / budgetData.allocated) * 100)}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportingDashboard;
