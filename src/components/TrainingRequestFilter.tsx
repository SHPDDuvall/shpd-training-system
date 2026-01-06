import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  TrainingRequest, 
  ExternalTrainingRequest, 
  InternalTrainingRequest, 
  User,
  PLATOON_OPTIONS,
  isSubmittedWithin30Days,
  getDaysUntilTraining
} from '@/types';
import {
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  UsersIcon,
  DownloadIcon,
  RefreshIcon,
  CheckIcon,
  XIcon,
  ClockIcon,
  LocationIcon,
  AccountingIcon,
  ChevronDownIcon,
  EditIcon,
} from '@/components/icons/Icons';

type RequestType = 'all' | 'standard' | 'internal' | 'external';
type StatusFilter = 'all' | 'pending' | 'approved' | 'denied' | 'completed';
type TimelineFilter = 'all' | 'compliant' | 'non-compliant';

interface CombinedRequest {
  id: string;
  type: 'standard' | 'internal' | 'external';
  title: string;
  userName: string;
  userBadge: string;
  userId: string;
  userPlatoon?: string;
  status: string;
  submittedDate: string;
  trainingDate?: string;
  location?: string;
  cost?: number;
  isCompliant?: boolean;
  daysAdvance?: number;
  supervisorId?: string;
  supervisorName?: string;
  originalData: TrainingRequest | ExternalTrainingRequest | InternalTrainingRequest;
}

const TrainingRequestFilter: React.FC = () => {
  const { user, allUsers } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [requestType, setRequestType] = useState<RequestType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platoonFilter, setPlatoonFilter] = useState<string>('all');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Data states
  const [standardRequests, setStandardRequests] = useState<TrainingRequest[]>([]);
  const [internalRequests, setInternalRequests] = useState<InternalTrainingRequest[]>([]);
  const [externalRequests, setExternalRequests] = useState<ExternalTrainingRequest[]>([]);
  const [trainings, setTrainings] = useState<{id: string; title: string; date: string}[]>([]);
  
  // Edit supervisor modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<CombinedRequest | null>(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch standard training requests
      const { data: standardData } = await supabase
        .from('training_requests')
        .select('*')
        .order('submitted_date', { ascending: false });
      
      if (standardData) {
        setStandardRequests(standardData.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          trainingId: r.training_id as string,
          trainingTitle: r.training_title as string,
          userId: r.user_id as string,
          userName: r.user_name as string,
          userBadge: r.user_badge as string,
          status: r.status as TrainingRequest['status'],
          submittedDate: r.submitted_date as string,
          supervisorId: r.supervisor_id as string | undefined,
          supervisorName: r.supervisor_name as string | undefined,
          supervisorApprovalDate: r.supervisor_approval_date as string | undefined,
          adminId: r.admin_id as string | undefined,
          adminName: r.admin_name as string | undefined,
          adminApprovalDate: r.admin_approval_date as string | undefined,
          scheduledDate: r.scheduled_date as string | undefined,
          notes: r.notes as string || '',
          denialReason: r.denial_reason as string | undefined,
        })));
      }
      
      // Fetch internal training requests
      const { data: internalData } = await supabase
        .from('internal_training_requests')
        .select('*')
        .order('submitted_date', { ascending: false });
      
      if (internalData) {
        setInternalRequests(internalData.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          userId: r.user_id as string,
          userName: r.user_name as string | undefined,
          userBadge: r.user_badge as string | undefined,
          courseName: r.course_name as string,
          trainingDate: r.training_date as string,
          location: r.location as string,
          instructor: r.instructor as string,
          attendees: (r.attendees as string[]) || [],
          status: r.status as InternalTrainingRequest['status'],
          submittedDate: r.submitted_date as string,
          notes: r.notes as string | undefined,
          denialReason: r.denial_reason as string | undefined,
          createdAt: r.created_at as string,
          supervisorId: r.supervisor_id as string | undefined,
        })));
      }
      
      // Fetch external training requests
      const { data: externalData } = await supabase
        .from('external_training_requests')
        .select('*')
        .order('submitted_date', { ascending: false });
      
      if (externalData) {
        setExternalRequests(externalData.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          userId: r.user_id as string,
          userName: r.user_name as string | undefined,
          userBadge: r.user_badge as string | undefined,
          eventName: r.event_name as string,
          organization: r.organization as string,
          startDate: r.start_date as string,
          endDate: r.end_date as string,
          location: r.location as string,
          costEstimate: r.cost_estimate as number,
          justification: r.justification as string,
          status: r.status as ExternalTrainingRequest['status'],
          submittedDate: r.submitted_date as string,
          notes: r.notes as string | undefined,
          denialReason: r.denial_reason as string | undefined,
          createdAt: r.created_at as string,
          supervisorId: r.supervisor_id as string | undefined,
        })));
      }
      
      // Fetch trainings for dates
      const { data: trainingData } = await supabase
        .from('training_opportunities')
        .select('id, title, date');
      
      if (trainingData) {
        setTrainings(trainingData.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          title: t.title as string,
          date: t.date as string,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  // Get user by ID
  const getUserById = (id: string): User | undefined => {
    return allUsers.find(u => u.id === id);
  };
  
  // Combine all requests into a unified format
  const combinedRequests = useMemo((): CombinedRequest[] => {
    const combined: CombinedRequest[] = [];
    
    // Add standard requests
    standardRequests.forEach(r => {
      const training = trainings.find(t => t.id === r.trainingId);
      const requestUser = getUserById(r.userId);
      const trainingDate = training?.date || r.scheduledDate;
      const isCompliant = trainingDate ? isSubmittedWithin30Days(r.submittedDate, trainingDate) : undefined;
      const daysAdvance = trainingDate ? getDaysUntilTraining(r.submittedDate, trainingDate) : undefined;
      
      combined.push({
        id: r.id,
        type: 'standard',
        title: r.trainingTitle,
        userName: r.userName || (requestUser ? `${requestUser.firstName} ${requestUser.lastName}` : 'Unknown'),
        userBadge: r.userBadge || requestUser?.badgeNumber || '',
        userId: r.userId,
        userPlatoon: requestUser?.platoon,
        status: r.status,
        submittedDate: r.submittedDate,
        trainingDate,
        isCompliant,
        daysAdvance,
        originalData: r,
      });
    });
    
    // Add internal requests
    internalRequests.forEach(r => {
      const requestUser = getUserById(r.userId);
      const supervisor = (r as any).supervisorId ? getUserById((r as any).supervisorId) : null;
      const isCompliant = isSubmittedWithin30Days(r.submittedDate, r.trainingDate);
      const daysAdvance = getDaysUntilTraining(r.submittedDate, r.trainingDate);
      
      combined.push({
        id: r.id,
        type: 'internal',
        title: r.courseName,
        userName: r.userName || (requestUser ? `${requestUser.firstName} ${requestUser.lastName}` : 'Unknown'),
        userBadge: r.userBadge || requestUser?.badgeNumber || '',
        userId: r.userId,
        userPlatoon: requestUser?.platoon,
        status: r.status,
        submittedDate: r.submittedDate,
        trainingDate: r.trainingDate,
        location: r.location,
        isCompliant,
        daysAdvance,
        supervisorId: (r as any).supervisorId,
        supervisorName: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : undefined,
        originalData: r,
      });
    });
    
    // Add external requests
    externalRequests.forEach(r => {
      const requestUser = getUserById(r.userId);
      const supervisor = (r as any).supervisorId ? getUserById((r as any).supervisorId) : null;
      const isCompliant = isSubmittedWithin30Days(r.submittedDate, r.startDate);
      const daysAdvance = getDaysUntilTraining(r.submittedDate, r.startDate);
      
      combined.push({
        id: r.id,
        type: 'external',
        title: r.eventName,
        userName: r.userName || (requestUser ? `${requestUser.firstName} ${requestUser.lastName}` : 'Unknown'),
        userBadge: r.userBadge || requestUser?.badgeNumber || '',
        userId: r.userId,
        userPlatoon: requestUser?.platoon,
        status: r.status,
        submittedDate: r.submittedDate,
        trainingDate: r.startDate,
        location: r.location,
        cost: r.costEstimate,
        isCompliant,
        daysAdvance,
        supervisorId: (r as any).supervisorId,
        supervisorName: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : undefined,
        originalData: r,
      });
    });
    
    return combined.sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
  }, [standardRequests, internalRequests, externalRequests, trainings, allUsers]);
  
  // Apply filters
  const filteredRequests = useMemo(() => {
    return combinedRequests.filter(r => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!r.title.toLowerCase().includes(query) &&
            !r.userName.toLowerCase().includes(query) &&
            !r.userBadge.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Request type filter
      if (requestType !== 'all' && r.type !== requestType) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && !['pending', 'submitted', 'supervisor_review', 'admin_approval', 'sergeant_review', 'lieutenant_review', 'commander_review', 'chief_approval'].includes(r.status)) {
          return false;
        }
        if (statusFilter === 'approved' && r.status !== 'approved') {
          return false;
        }
        if (statusFilter === 'denied' && r.status !== 'denied') {
          return false;
        }
        if (statusFilter === 'completed' && r.status !== 'completed') {
          return false;
        }
      }
      
      // Platoon filter
      if (platoonFilter !== 'all' && r.userPlatoon !== platoonFilter) {
        return false;
      }
      
      // Timeline compliance filter
      if (timelineFilter !== 'all') {
        if (r.isCompliant === undefined) return false;
        if (timelineFilter === 'compliant' && !r.isCompliant) return false;
        if (timelineFilter === 'non-compliant' && r.isCompliant) return false;
      }
      
      // Date range filter
      if (dateFrom) {
        const submittedDate = new Date(r.submittedDate);
        const fromDate = new Date(dateFrom);
        if (submittedDate < fromDate) return false;
      }
      if (dateTo) {
        const submittedDate = new Date(r.submittedDate);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (submittedDate > toDate) return false;
      }
      
      return true;
    });
  }, [combinedRequests, searchQuery, requestType, statusFilter, platoonFilter, timelineFilter, dateFrom, dateTo]);
  
  // Statistics
  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const compliant = filteredRequests.filter(r => r.isCompliant === true).length;
    const nonCompliant = filteredRequests.filter(r => r.isCompliant === false).length;
    const pending = filteredRequests.filter(r => ['submitted', 'supervisor_review', 'admin_approval', 'sergeant_review', 'lieutenant_review', 'commander_review', 'chief_approval'].includes(r.status)).length;
    const approved = filteredRequests.filter(r => r.status === 'approved').length;
    const denied = filteredRequests.filter(r => r.status === 'denied').length;
    
    return { total, compliant, nonCompliant, pending, approved, denied };
  }, [filteredRequests]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-blue-100 text-blue-700',
      supervisor_review: 'bg-amber-100 text-amber-700',
      admin_approval: 'bg-purple-100 text-purple-700',
      sergeant_review: 'bg-amber-100 text-amber-700',
      lieutenant_review: 'bg-orange-100 text-orange-700',
      commander_review: 'bg-purple-100 text-purple-700',
      chief_approval: 'bg-indigo-100 text-indigo-700',
      approved: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      completed: 'bg-slate-100 text-slate-700',
      scheduled: 'bg-cyan-100 text-cyan-700',
    };
    const labels: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      supervisor_review: 'Supervisor Review',
      admin_approval: 'Admin Approval',
      sergeant_review: 'Sergeant Review',
      lieutenant_review: 'Lieutenant Review',
      commander_review: 'Commander Review',
      chief_approval: 'Chief Approval',
      approved: 'Approved',
      denied: 'Denied',
      completed: 'Completed',
      scheduled: 'Scheduled',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
        {labels[status] || status}
      </span>
    );
  };
  
  const getTypeBadge = (type: 'standard' | 'internal' | 'external') => {
    const styles = {
      standard: 'bg-blue-50 text-blue-700 border-blue-200',
      internal: 'bg-green-50 text-green-700 border-green-200',
      external: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    const labels = {
      standard: 'Standard',
      internal: 'Internal',
      external: 'External',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };
  
  const exportToCSV = () => {
    const headers = ['Type', 'Title', 'Requester', 'Badge', 'Platoon', 'Status', 'Submitted Date', 'Training Date', '30-Day Compliant', 'Days Advance'];
    const rows = filteredRequests.map(r => [
      r.type,
      r.title,
      r.userName,
      r.userBadge,
      r.userPlatoon || '',
      r.status,
      r.submittedDate,
      r.trainingDate || '',
      r.isCompliant !== undefined ? (r.isCompliant ? 'Yes' : 'No') : '',
      r.daysAdvance !== undefined ? r.daysAdvance.toString() : '',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `training-requests-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setRequestType('all');
    setStatusFilter('all');
    setPlatoonFilter('all');
    setTimelineFilter('all');
    setDateFrom('');
    setDateTo('');
  };
  
  // Get supervisors list
  const supervisors = useMemo(() => {
    return allUsers.filter(u => u.role === 'supervisor' || u.role === 'administrator');
  }, [allUsers]);
  
  // Open edit supervisor modal
  const openEditModal = (request: CombinedRequest) => {
    setEditingRequest(request);
    setSelectedSupervisorId(request.supervisorId || '');
    setSaveError('');
    setShowEditModal(true);
  };
  
  // Save supervisor assignment
  const saveSupervisorAssignment = async () => {
    if (!editingRequest || !selectedSupervisorId) {
      setSaveError('Please select a supervisor');
      return;
    }
    
    setIsSaving(true);
    setSaveError('');
    
    try {
      let tableName = '';
      if (editingRequest.type === 'external') {
        tableName = 'external_training_requests';
      } else if (editingRequest.type === 'internal') {
        tableName = 'internal_training_requests';
      } else {
        tableName = 'training_requests';
      }
      
      const { error } = await supabase
        .from(tableName)
        .update({ supervisor_id: selectedSupervisorId })
        .eq('id', editingRequest.id);
      
      if (error) throw error;
      
      // Refresh data
      await fetchData();
      setShowEditModal(false);
      setEditingRequest(null);
    } catch (err) {
      console.error('Error saving supervisor assignment:', err);
      setSaveError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Training Request Filter</h1>
          <p className="text-slate-600 mt-1">Filter and view all training requests across the department</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RefreshIcon size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <DownloadIcon size={18} />
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-sm text-slate-600">Total Requests</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-slate-600">Pending</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-slate-600">Approved</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
          <div className="text-sm text-slate-600">Denied</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.compliant}</div>
          <div className="text-sm text-slate-600">30+ Days</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.nonCompliant}</div>
          <div className="text-sm text-slate-600">&lt;30 Days</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <FilterIcon size={20} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Filters</h2>
          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-amber-600 hover:text-amber-700"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, badge, or training title..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          
          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Request Type</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as RequestType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Types</option>
              <option value="standard">Standard Training</option>
              <option value="internal">Internal Training</option>
              <option value="external">External Training</option>
            </select>
          </div>
          
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          {/* Platoon */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Platoon/Shift</label>
            <select
              value={platoonFilter}
              onChange={(e) => setPlatoonFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Platoons</option>
              {PLATOON_OPTIONS.filter(p => p.value).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* 30-Day Compliance */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">30-Day Compliance</label>
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value as TimelineFilter)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All</option>
              <option value="compliant">Compliant (30+ days)</option>
              <option value="non-compliant">Non-Compliant (&lt;30 days)</option>
            </select>
          </div>
          
          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Submitted From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          
          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Submitted To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            Results ({filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''})
          </h2>
        </div>
        
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FilterIcon className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-800">No requests found</h3>
            <p className="text-slate-600 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredRequests.map((request) => (
              <div key={`${request.type}-${request.id}`} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getTypeBadge(request.type)}
                      <h3 className="font-semibold text-slate-800">{request.title}</h3>
                      {getStatusBadge(request.status)}
                      {request.isCompliant !== undefined && (
                        request.isCompliant ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700" title="Submitted 30+ days in advance">
                            ✓ 30+ Days
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700" title={`Submitted ${request.daysAdvance} days before training`}>
                            ⚠ {request.daysAdvance} Days
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <UsersIcon size={16} className="text-slate-400" />
                        {request.userName} (#{request.userBadge})
                      </div>
                      {request.userPlatoon && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Platoon:</span>
                          {request.userPlatoon}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={16} className="text-slate-400" />
                        Submitted: {formatDate(request.submittedDate)}
                      </div>
                      {request.trainingDate && (
                        <div className="flex items-center gap-1">
                          <ClockIcon size={16} className="text-slate-400" />
                          Training: {formatDate(request.trainingDate)}
                        </div>
                      )}
                      {request.location && (
                        <div className="flex items-center gap-1">
                          <LocationIcon size={16} className="text-slate-400" />
                          {request.location}
                        </div>
                      )}
                      {request.cost !== undefined && request.cost > 0 && (
                        <div className="flex items-center gap-1">
                          <AccountingIcon size={16} className="text-slate-400" />
                          ${request.cost.toFixed(2)}
                        </div>
                      )}
                      {/* Supervisor assignment */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Approver:</span>
                        {request.supervisorName ? (
                          <span className="text-slate-700">{request.supervisorName}</span>
                        ) : (
                          <span className="text-orange-600 italic">Not assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Edit button for admins */}
                  {(user?.role === 'administrator' || user?.role === 'supervisor') && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => openEditModal(request)}
                        className="px-3 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1"
                        title="Edit supervisor assignment"
                      >
                        <EditIcon size={16} />
                        Assign Approver
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Edit Supervisor Modal */}
      {showEditModal && editingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Assign Approver</h3>
              <p className="text-sm text-slate-600 mt-1">Select the supervisor who should review this request</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Request Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-800">{editingRequest.title}</div>
                <div className="text-sm text-slate-600 mt-1">
                  Submitted by: {editingRequest.userName} (#{editingRequest.userBadge})
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Type: {editingRequest.type.charAt(0).toUpperCase() + editingRequest.type.slice(1)} Training
                </div>
              </div>
              
              {/* Supervisor Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Supervisor/Approver <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-white"
                >
                  <option value="">Select a supervisor...</option>
                  {supervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.firstName} {supervisor.lastName} - {supervisor.rank || supervisor.role}
                    </option>
                  ))}
                </select>
              </div>
              
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {saveError}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRequest(null);
                }}
                className="px-4 py-2 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={saveSupervisorAssignment}
                disabled={isSaving || !selectedSupervisorId}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Assignment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingRequestFilter;
