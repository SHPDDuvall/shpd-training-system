
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { userService, externalTrainingService } from '@/lib/database';
import {
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  WarningIcon,
  FilterIcon,
  DownloadIcon,
  RefreshIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrainingIcon,
  CertificateIcon,
  EyeIcon,
} from '@/components/icons/Icons';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  badgeNumber: string;
  department: string;
  rank: string;
  email: string;
}

interface TrainingRecord {
  id: string;
  userId: string;
  eventName: string;
  organization: string;
  startDate: string;
  endDate: string;
  status: string;
  trainingCompleted: boolean;
  trainingCompletedDate: string | null;
  supervisorOverviewCompleted: boolean;
  supervisorOverviewDate: string | null;
  certificateSubmitted: boolean;
  certificateSubmittedDate: string | null;
  certificateFileUrl: string | null;
  isCpt: boolean;
  cptHours: number;
}

interface StaffTrainingStatus {
  staff: StaffMember;
  trainings: TrainingRecord[];
  completionStatus: 'complete' | 'incomplete' | 'no_training';
  completedCount: number;
  pendingCount: number;
  totalCount: number;
  cptCompletedHours: number;
  cptRemainingHours: number;
  cptProgress: number;
  isCptComplete: boolean;
}

const CPT_REQUIRED_HOURS = 40; // Example: 40 CPT hours required

const StaffTrainingOverview: React.FC = () => {
  const { user } = useAuth();
  const [staffData, setStaffData] = useState<StaffTrainingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'department'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch staff and training data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const users = await userService.getAll();
      
      // Fetch all external training requests with completion status
      const { data: trainingData, error } = await supabase
        .from('external_training_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching training data:', error);
        return;
      }

      // Map training data to staff
      const staffTrainingMap = new Map<string, TrainingRecord[]>();
      
      (trainingData || []).forEach((training: any) => {
        const record: TrainingRecord = {
          id: training.id,
          userId: training.user_id,
          eventName: training.event_name,
          organization: training.organization,
          startDate: training.start_date,
          endDate: training.end_date,
          status: training.status,
          trainingCompleted: training.training_completed || false,
          trainingCompletedDate: training.training_completed_date,
          supervisorOverviewCompleted: training.supervisor_overview_completed || false,
          supervisorOverviewDate: training.supervisor_overview_date,
          certificateSubmitted: training.certificate_submitted || false,
          certificateSubmittedDate: training.certificate_submitted_date,
          certificateFileUrl: training.certificate_file_url,
          isCpt: training.is_cpt || false,
          cptHours: training.cpt_hours || 0,
        };

        const existing = staffTrainingMap.get(training.user_id) || [];
        existing.push(record);
        staffTrainingMap.set(training.user_id, existing);
      });

      // Create staff training status for each user
      const staffStatuses: StaffTrainingStatus[] = users
        .filter(u => u.role !== 'accounting') // Exclude accounting users
        .map(u => {
          const trainings = staffTrainingMap.get(u.id) || [];
          const completedCount = trainings.filter(t => 
            t.trainingCompleted && t.supervisorOverviewCompleted && t.certificateSubmitted
          ).length;
          const pendingCount = trainings.filter(t => 
            !t.trainingCompleted || !t.supervisorOverviewCompleted || !t.certificateSubmitted
          ).length;

          const cptCompletedHours = trainings
            .filter(t => t.isCpt && t.trainingCompleted && t.certificateSubmitted)
            .reduce((sum, t) => sum + t.cptHours, 0);
          const cptRemainingHours = Math.max(0, CPT_REQUIRED_HOURS - cptCompletedHours);
          const cptProgress = Math.min(100, (cptCompletedHours / CPT_REQUIRED_HOURS) * 100);
          const isCptComplete = cptCompletedHours >= CPT_REQUIRED_HOURS;

          let completionStatus: 'complete' | 'incomplete' | 'no_training' = 'no_training';
          if (trainings.length > 0) {
            completionStatus = pendingCount === 0 ? 'complete' : 'incomplete';
          }

          return {
            staff: {
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              badgeNumber: u.badgeNumber,
              department: u.department,
              rank: u.rank || '',
              email: u.email,
            },
            trainings,
            completionStatus,
            completedCount,
            pendingCount,
            totalCount: trainings.length,
            cptCompletedHours,
            cptRemainingHours,
            cptProgress,
            isCptComplete,
          };
        });

      setStaffData(staffStatuses);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments
  const departments = useMemo(() => {
    const depts = [...new Set(staffData.map(s => s.staff.department))];
    return ['All', ...depts.filter(Boolean)];
  }, [staffData]);

  // Filter and sort staff data
  const filteredStaffData = useMemo(() => {
    let filtered = staffData;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.staff.firstName.toLowerCase().includes(term) ||
        s.staff.lastName.toLowerCase().includes(term) ||
        s.staff.badgeNumber.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (departmentFilter !== 'All') {
      filtered = filtered.filter(s => s.staff.department === departmentFilter);
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(s => s.completionStatus === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = `${a.staff.lastName} ${a.staff.firstName}`.localeCompare(
            `${b.staff.lastName} ${b.staff.firstName}`
          );
          break;
        case 'status':
          const statusOrder = { complete: 0, incomplete: 1, no_training: 2 };
          comparison = statusOrder[a.completionStatus] - statusOrder[b.completionStatus];
          break;
        case 'department':
          comparison = (a.staff.department || '').localeCompare(b.staff.department || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [staffData, searchTerm, departmentFilter, statusFilter, sortBy, sortOrder]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = staffData.length;
    const complete = staffData.filter(s => s.completionStatus === 'complete').length;
    const incomplete = staffData.filter(s => s.completionStatus === 'incomplete').length;
    const noTraining = staffData.filter(s => s.completionStatus === 'no_training').length;
    return { total, complete, incomplete, noTraining };
  }, [staffData]);

  const toggleExpanded = (staffId: string) => {
    setExpandedStaff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  // Update training completion status
  const updateTrainingStatus = async (
    trainingId: string,
    field: 'training_completed' | 'supervisor_overview_completed' | 'certificate_submitted',
    value: boolean
  ) => {
    try {
      const updates: Record<string, any> = {
        [field]: value,
        updated_at: new Date().toISOString(),
      };

      // Add date field if marking as complete
      if (value) {
        const dateField = field.replace('_completed', '_date').replace('_submitted', '_submitted_date');
        if (field === 'certificate_submitted') {
          updates.certificate_submitted_date = new Date().toISOString().split('T')[0];
        } else {
          updates[`${field.replace('_completed', '')}_date`] = new Date().toISOString().split('T')[0];
        }
      }

      const { error } = await supabase
        .from('external_training_requests')
        .update(updates)
        .eq('id', trainingId);

      if (error) {
        console.error('Error updating training status:', error);
        return;
      }

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error updating training status:', error);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Badge', 'Department', 'Rank', 'Status', 'Total Trainings', 'Completed', 'Pending', 'CPT Completed Hours', 'CPT Remaining Hours', 'CPT Complete'];
    const rows = filteredStaffData.map(s => [
      `${s.staff.lastName}, ${s.staff.firstName}`,
      s.staff.badgeNumber,
      s.staff.department,
      s.staff.rank,
      s.completionStatus === 'complete' ? 'All Complete' :
        s.completionStatus === 'incomplete' ? 'Items Pending' : 'No Training',
      s.totalCount,
      s.completedCount,
      s.pendingCount,
      s.cptCompletedHours,
      s.cptRemainingHours,
      s.isCptComplete ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_training_overview_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: 'complete' | 'incomplete' | 'no_training') => {
    switch (status) {
      case 'complete':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'incomplete':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'no_training':
        return <WarningIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Staff Training Overview</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Staff Monitored</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <UsersIcon className="w-10 h-10 text-blue-400" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">All Training Complete</p>
            <p className="text-3xl font-bold text-gray-900">{stats.complete}</p>
          </div>
          <CheckCircleIcon className="w-10 h-10 text-green-400" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Training Incomplete</p>
            <p className="text-3xl font-bold text-gray-900">{stats.incomplete}</p>
          </div>
          <XCircleIcon className="w-10 h-10 text-red-400" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">No Training Records</p>
            <p className="text-3xl font-bold text-gray-900">{stats.noTraining}</p>
          </div>
          <WarningIcon className="w-10 h-10 text-yellow-400" />
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-1/3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff by name or badge..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-2/3 justify-end">
            <div className="w-full md:w-auto">
              <label htmlFor="departmentFilter" className="sr-only">Filter by Department</label>
              <select
                id="departmentFilter"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-auto">
              <label htmlFor="statusFilter" className="sr-only">Filter by Status</label>
              <select
                id="statusFilter"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="complete">All Complete</option>
                <option value="incomplete">Items Pending</option>
                <option value="no_training">No Training Records</option>
              </select>
            </div>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DownloadIcon className="-ml-1 mr-2 h-5 w-5" />
              Export CSV
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshIcon className="-ml-1 mr-2 h-5 w-5" />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Staff Training Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading staff training data...</div>
        ) : filteredStaffData.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No staff training records found matching your criteria.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="flex items-center" onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Staff Member
                    {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUpIcon className="ml-1 w-4 h-4" /> : <ChevronDownIcon className="ml-1 w-4 h-4" />)}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Badge #</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="flex items-center" onClick={() => { setSortBy('department'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Department
                    {sortBy === 'department' && (sortOrder === 'asc' ? <ChevronUpIcon className="ml-1 w-4 h-4" /> : <ChevronDownIcon className="ml-1 w-4 h-4" />)}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="flex items-center" onClick={() => { setSortBy('status'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Overall Status
                    {sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUpIcon className="ml-1 w-4 h-4" /> : <ChevronDownIcon className="ml-1 w-4 h-4" />)}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPT Progress</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Expand</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaffData.map((staffStatus) => (
                <React.Fragment key={staffStatus.staff.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {staffStatus.staff.firstName} {staffStatus.staff.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staffStatus.staff.badgeNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staffStatus.staff.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                      {getStatusIcon(staffStatus.completionStatus)}
                      <span className="ml-2">
                        {staffStatus.completionStatus === 'complete' && 'All Complete'}
                        {staffStatus.completionStatus === 'incomplete' && 'Items Pending'}
                        {staffStatus.completionStatus === 'no_training' && 'No Training Records'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${staffStatus.cptProgress}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-600">{staffStatus.cptCompletedHours} / {CPT_REQUIRED_HOURS} hours {staffStatus.isCptComplete && '(Complete)'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleExpanded(staffStatus.staff.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {expandedStaff.has(staffStatus.staff.id) ? 'Collapse' : 'Expand'}
                      </button>
                    </td>
                  </tr>
                  {expandedStaff.has(staffStatus.staff.id) && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <div className="bg-gray-50 p-4 border-t border-gray-200">
                          <h4 className="text-lg font-medium text-gray-900 mb-3">Training Details for {staffStatus.staff.firstName} {staffStatus.staff.lastName}</h4>
                          {staffStatus.trainings.length === 0 ? (
                            <p className="text-sm text-gray-500">No training records for this staff member.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Completed</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor Review</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Submitted</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPT Hours</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {staffStatus.trainings.map(training => (
                                    <tr key={training.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{training.eventName}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{training.startDate} - {training.endDate}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <input
                                          type="checkbox"
                                          checked={training.trainingCompleted}
                                          onChange={(e) => updateTrainingStatus(training.id, 'training_completed', e.target.checked)}
                                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        {training.trainingCompleted && training.trainingCompletedDate && <span className="ml-2 text-xs text-gray-500">({training.trainingCompletedDate})</span>}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <input
                                          type="checkbox"
                                          checked={training.supervisorOverviewCompleted}
                                          onChange={(e) => updateTrainingStatus(training.id, 'supervisor_overview_completed', e.target.checked)}
                                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        {training.supervisorOverviewCompleted && training.supervisorOverviewDate && <span className="ml-2 text-xs text-gray-500">({training.supervisorOverviewDate})</span>}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <input
                                          type="checkbox"
                                          checked={training.certificateSubmitted}
                                          onChange={(e) => updateTrainingStatus(training.id, 'certificate_submitted', e.target.checked)}
                                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        {training.certificateSubmitted && training.certificateSubmittedDate && <span className="ml-2 text-xs text-gray-500">({training.certificateSubmittedDate})</span>}
                                        {training.certificateFileUrl && (
                                          <a href={training.certificateFileUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:text-blue-800">
                                            <EyeIcon className="w-4 h-4 inline-block" /> View
                                          </a>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {training.isCpt ? training.cptHours : 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {/* Add actions like view/edit specific training if needed */}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StaffTrainingOverview;
