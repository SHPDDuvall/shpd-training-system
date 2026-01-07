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
}

interface StaffTrainingStatus {
  staff: StaffMember;
  trainings: TrainingRecord[];
  completionStatus: 'complete' | 'incomplete' | 'no_training';
  completedCount: number;
  pendingCount: number;
  totalCount: number;
}

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
    const headers = ['Name', 'Badge', 'Department', 'Rank', 'Status', 'Total Trainings', 'Completed', 'Pending'];
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

  const getStatusBadge = (status: 'complete' | 'incomplete' | 'no_training') => {
    switch (status) {
      case 'complete':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            All Complete
          </span>
        );
      case 'incomplete':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Items Pending
          </span>
        );
      case 'no_training':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            No Training
          </span>
        );
    }
  };

  const CompletionCheckbox: React.FC<{
    checked: boolean;
    label: string;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  }> = ({ checked, label, onChange, disabled }) => (
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span className={`text-sm ${checked ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
      {checked && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
    </label>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Training Overview</h2>
          <p className="text-gray-600">Track training completion, supervisor reviews, and certificate submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">All Complete</p>
              <p className="text-2xl font-bold text-green-600">{stats.complete}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Items Pending</p>
              <p className="text-2xl font-bold text-red-600">{stats.incomplete}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">No Training</p>
              <p className="text-2xl font-bold text-gray-500">{stats.noTraining}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <WarningIcon className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or badge number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div className="sm:w-48">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="complete">All Complete</option>
              <option value="incomplete">Items Pending</option>
              <option value="no_training">No Training</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="col-span-1">Status</div>
          <div 
            className="col-span-3 flex items-center cursor-pointer hover:text-gray-700"
            onClick={() => {
              if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              else { setSortBy('name'); setSortOrder('asc'); }
            }}
          >
            Name
            {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />)}
          </div>
          <div className="col-span-1">Badge</div>
          <div 
            className="col-span-2 flex items-center cursor-pointer hover:text-gray-700"
            onClick={() => {
              if (sortBy === 'department') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              else { setSortBy('department'); setSortOrder('asc'); }
            }}
          >
            Department
            {sortBy === 'department' && (sortOrder === 'asc' ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />)}
          </div>
          <div className="col-span-2">Trainings</div>
          <div className="col-span-2">Completion</div>
          <div className="col-span-1">Actions</div>
        </div>

        {/* Staff Rows */}
        <div className="divide-y divide-gray-200">
          {filteredStaffData.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No staff members found matching your criteria.
            </div>
          ) : (
            filteredStaffData.map((staffStatus) => (
              <div key={staffStatus.staff.id}>
                {/* Main Row */}
                <div 
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer ${
                    expandedStaff.has(staffStatus.staff.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => staffStatus.totalCount > 0 && toggleExpanded(staffStatus.staff.id)}
                >
                  <div className="col-span-1">
                    {getStatusIcon(staffStatus.completionStatus)}
                  </div>
                  <div className="col-span-3">
                    <p className="font-medium text-gray-900">
                      {staffStatus.staff.lastName}, {staffStatus.staff.firstName}
                    </p>
                    <p className="text-sm text-gray-500">{staffStatus.staff.rank}</p>
                  </div>
                  <div className="col-span-1 text-gray-600">
                    #{staffStatus.staff.badgeNumber}
                  </div>
                  <div className="col-span-2 text-gray-600">
                    {staffStatus.staff.department}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-900 font-medium">{staffStatus.totalCount}</span>
                    <span className="text-gray-500 text-sm ml-1">
                      ({staffStatus.completedCount} done, {staffStatus.pendingCount} pending)
                    </span>
                  </div>
                  <div className="col-span-2">
                    {getStatusBadge(staffStatus.completionStatus)}
                  </div>
                  <div className="col-span-1">
                    {staffStatus.totalCount > 0 && (
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        {expandedStaff.has(staffStatus.staff.id) ? (
                          <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Training Details */}
                {expandedStaff.has(staffStatus.staff.id) && staffStatus.trainings.length > 0 && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Training Records</h4>
                    <div className="space-y-3">
                      {staffStatus.trainings.map((training) => {
                        const isComplete = training.trainingCompleted && 
                          training.supervisorOverviewCompleted && 
                          training.certificateSubmitted;
                        
                        return (
                          <div 
                            key={training.id}
                            className={`p-4 rounded-lg border ${
                              isComplete ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h5 className="font-medium text-gray-900">{training.eventName}</h5>
                                <p className="text-sm text-gray-500">
                                  {training.organization} • {new Date(training.startDate).toLocaleDateString()} - {new Date(training.endDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isComplete ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                                    Complete
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircleIcon className="w-3 h-3 mr-1" />
                                    Incomplete
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Completion Checkboxes */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`training-${training.id}`}
                                  checked={training.trainingCompleted}
                                  onChange={(e) => updateTrainingStatus(training.id, 'training_completed', e.target.checked)}
                                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <label htmlFor={`training-${training.id}`} className="flex items-center">
                                  <TrainingIcon className={`w-5 h-5 mr-2 ${training.trainingCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                                  <span className={`text-sm ${training.trainingCompleted ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                    Training Completed
                                  </span>
                                </label>
                              </div>

                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`overview-${training.id}`}
                                  checked={training.supervisorOverviewCompleted}
                                  onChange={(e) => updateTrainingStatus(training.id, 'supervisor_overview_completed', e.target.checked)}
                                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <label htmlFor={`overview-${training.id}`} className="flex items-center">
                                  <EyeIcon className={`w-5 h-5 mr-2 ${training.supervisorOverviewCompleted ? 'text-green-500' : 'text-gray-400'}`} />
                                  <span className={`text-sm ${training.supervisorOverviewCompleted ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                    Supervisor Overview
                                  </span>
                                </label>
                              </div>

                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`cert-${training.id}`}
                                  checked={training.certificateSubmitted}
                                  onChange={(e) => updateTrainingStatus(training.id, 'certificate_submitted', e.target.checked)}
                                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <label htmlFor={`cert-${training.id}`} className="flex items-center">
                                  <CertificateIcon className={`w-5 h-5 mr-2 ${training.certificateSubmitted ? 'text-green-500' : 'text-gray-400'}`} />
                                  <span className={`text-sm ${training.certificateSubmitted ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                    Certificate Submitted
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">
              <strong className="text-green-600">Green</strong> - All items complete (Training, Overview, Certificate)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircleIcon className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-600">
              <strong className="text-red-600">Red</strong> - One or more items missing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <WarningIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              <strong className="text-gray-500">Gray</strong> - No training records
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffTrainingOverview;
