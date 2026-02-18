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
  EyeIcon,
  AlertIcon,
} from '@/components/icons/Icons';
import { externalTrainingService, internalTrainingService, notificationService } from '@/lib/database';
import { sendGeneralEmail, sendApproverNotification } from '@/lib/emailService';

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
  
  // View Details modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<CombinedRequest | null>(null);
  const [userDocuments, setUserDocuments] = useState<{id: string; title: string; fileName: string; fileUrl: string; documentType: string}[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  // Approval action states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'deny' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [nextApproverId, setNextApproverId] = useState<string>('');
  
  // Edit request modal states
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editRequestData, setEditRequestData] = useState<Record<string, any>>({});
  
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
          attachments: r.attachments as any[] | undefined,
          supportingDocuments: r.supporting_documents as any[] | undefined,
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
          certificateFileUrl: r.certificate_file_url as string | undefined,
          fileName: r.file_name as string | undefined,
          sourceFile: r.sourcefile as string | undefined,
          attachments: r.attachments as any[] | undefined,
          supportingDocuments: r.supporting_documents as any[] | undefined,
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
    // Handle dates in YYYY-MM-DD format to avoid timezone issues
    if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    // Handle ISO date strings with time component
    if (dateString && dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
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
    return allUsers.filter(u => u.role === 'supervisor' || u.role === 'administrator' || u.role === 'training_coordinator');
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
  
  // Check if user can approve/deny this request
  // ALL supervisors, administrators, training coordinators, and chiefs can approve ANY request
  const canApproveRequest = (request: CombinedRequest): boolean => {
    if (!user) return false;
    
    // Admins, Training Coordinators, and Chiefs can always approve
    if (user.role === 'administrator' || user.role === 'training_coordinator' || user.rank === 'Chief') {
      return true;
    }
    
    // ALL supervisors can approve ANY request
    if (user.role === 'supervisor') {
      return true;
    }
    
    // Check if user is the assigned supervisor (for non-supervisor roles)
    if (request.supervisorId === user.id) {
      return true;
    }
    
    // Check if user is assigned to any step in the approval chain
    const originalData = request.originalData as any;
    if (originalData.step1Id === user.id || 
        originalData.step2Id === user.id || 
        originalData.step3Id === user.id || 
        originalData.step4Id === user.id || 
        originalData.step5Id === user.id) {
      return true;
    }
    
    return false;
  };
  
  // Check if user can edit this request
  // ALL supervisors, administrators, and training coordinators can edit requests
  const canEditRequest = (request: CombinedRequest): boolean => {
    if (!user) return false;
    
    // Owner can edit if status is pending/submitted
    if (request.userId === user.id && (request.status === 'pending' || request.status === 'submitted')) {
      return true;
    }
    
    // Admins and Training Coordinators can always edit
    if (user.role === 'administrator' || user.role === 'training_coordinator') {
      return true;
    }
    
    // ALL supervisors can edit requests they can approve
    if (user.role === 'supervisor') {
      return true;
    }
    
    return false;
  };
  
  // Handle approval action
  const handleApprovalAction = (action: 'approve' | 'deny') => {
    setApprovalAction(action);
    setApprovalNotes('');
    setNextApproverId('');
    setShowApprovalModal(true);
  };
  
  // Confirm approval action
  const confirmApprovalAction = async () => {
    if (!viewingRequest || !user || !approvalAction) return;
    
    setIsProcessingApproval(true);
    try {
      let newStatus: string;
      
      if (approvalAction === 'approve') {
        // Determine next status based on current status and role
        if (user.role === 'administrator' || user.role === 'training_coordinator' || user.rank === 'Chief') {
          newStatus = 'approved';
        } else if (viewingRequest.status === 'pending' || viewingRequest.status === 'submitted') {
          newStatus = 'supervisor_review';
        } else if (viewingRequest.status === 'supervisor_review') {
          newStatus = 'admin_approval';
        } else if (viewingRequest.status === 'admin_approval') {
          newStatus = 'approved';
        } else {
          newStatus = 'approved';
        }
      } else {
        newStatus = 'denied';
      }
      
      // Determine which table to update
      let tableName = '';
      if (viewingRequest.type === 'external') {
        tableName = 'external_training_requests';
      } else if (viewingRequest.type === 'internal') {
        tableName = 'internal_training_requests';
      } else {
        tableName = 'training_requests';
      }
      
      // Build update data
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      
      if (approvalAction === 'deny') {
        updateData.denial_reason = approvalNotes || 'No reason provided';
      } else {
        updateData.notes = approvalNotes || null;
      }
      
      // Add approval tracking based on current status
      if (approvalAction === 'approve') {
        if (viewingRequest.status === 'pending' || viewingRequest.status === 'submitted') {
          updateData.step1_approval_date = new Date().toISOString();
          updateData.supervisor_approval_date = new Date().toISOString();
          // Set next approver (step 2) if selected
          if (nextApproverId) {
            updateData.step2_id = nextApproverId;
          }
        } else if (viewingRequest.status === 'supervisor_review') {
          updateData.step2_approval_date = new Date().toISOString();
          // Set next approver (step 3) if selected
          if (nextApproverId) {
            updateData.step3_id = nextApproverId;
          }
        } else if (viewingRequest.status === 'admin_approval') {
          updateData.step3_approval_date = new Date().toISOString();
          // Set next approver (step 4) if selected
          if (nextApproverId) {
            updateData.step4_id = nextApproverId;
          }
        }
      }
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', viewingRequest.id);
      
      if (error) throw error;
      
      // Send email notification for denial
      if (approvalAction === 'deny') {
        const requester = allUsers.find(u => u.id === viewingRequest.userId);
        if (requester && requester.email) {
          try {
            await sendGeneralEmail({
              type: 'general',
              recipientEmail: requester.email,
              recipientName: `${requester.firstName} ${requester.lastName}`,
              subject: `Training Request Denied: ${viewingRequest.title}`,
              body: `Your training request for "${viewingRequest.title}" has been denied.\n\nReason: ${approvalNotes || 'No reason provided'}\n\nDenied by: ${user.firstName} ${user.lastName}\n\nIf you have questions about this decision, please contact your supervisor.`,
              senderName: 'Training Management System',
            });
          } catch (emailError) {
            console.error('Failed to send denial email:', emailError);
          }
        }
      }
      
      // Create notification for requester
      try {
        await notificationService.create({
          userId: viewingRequest.userId,
          title: approvalAction === 'approve' ? 'Request Approved' : 'Request Denied',
          message: approvalAction === 'approve' 
            ? `Your training request for "${viewingRequest.title}" has been ${newStatus === 'approved' ? 'fully approved' : 'forwarded to the next approver'}.`
            : `Your training request for "${viewingRequest.title}" has been denied. Reason: ${approvalNotes || 'No reason provided'}`,
          type: approvalAction === 'approve' ? 'approval' : 'denial',
          relatedId: viewingRequest.id,
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
      
      // Close modals and show success
      setShowApprovalModal(false);
      setShowDetailsModal(false);
      setViewingRequest(null);
      setApprovalNotes('');
      
      setToastMessage(approvalAction === 'approve' 
        ? (newStatus === 'approved' ? 'Request fully approved!' : 'Request approved and forwarded to next approver!')
        : 'Request denied');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error processing approval:', err);
      setToastMessage('Failed to process action. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsProcessingApproval(false);
    }
  };
  
  // Open edit request modal
  const openEditRequestModal = () => {
    if (!viewingRequest) return;
    
    const originalData = viewingRequest.originalData as any;
    setEditRequestData({
      title: viewingRequest.title,
      location: viewingRequest.location || originalData.location || '',
      trainingDate: viewingRequest.trainingDate || originalData.startDate || originalData.trainingDate || '',
      justification: originalData.justification || '',
      notes: originalData.notes || '',
      costEstimate: originalData.costEstimate || 0,
    });
    setShowEditRequestModal(true);
  };
  
  // Save edited request
  const saveEditedRequest = async () => {
    if (!viewingRequest) return;
    
    setIsSaving(true);
    try {
      let tableName = '';
      let updateData: Record<string, any> = {};
      
      if (viewingRequest.type === 'external') {
        tableName = 'external_training_requests';
        updateData = {
          event_name: editRequestData.title,
          location: editRequestData.location,
          start_date: editRequestData.trainingDate,
          justification: editRequestData.justification,
          notes: editRequestData.notes,
          cost_estimate: editRequestData.costEstimate,
          updated_at: new Date().toISOString(),
        };
      } else if (viewingRequest.type === 'internal') {
        tableName = 'internal_training_requests';
        updateData = {
          course_name: editRequestData.title,
          location: editRequestData.location,
          training_date: editRequestData.trainingDate,
          notes: editRequestData.notes,
          updated_at: new Date().toISOString(),
        };
      } else {
        tableName = 'training_requests';
        updateData = {
          training_title: editRequestData.title,
          scheduled_date: editRequestData.trainingDate,
          notes: editRequestData.notes,
          updated_at: new Date().toISOString(),
        };
      }
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', viewingRequest.id);
      
      if (error) throw error;
      
      setShowEditRequestModal(false);
      setShowDetailsModal(false);
      setViewingRequest(null);
      
      setToastMessage('Request updated successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      await fetchData();
    } catch (err) {
      console.error('Error saving request:', err);
      setToastMessage('Failed to save changes. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
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
                  {/* Action buttons */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {/* View Details button */}
                    <button
                      onClick={async () => {
                        setViewingRequest(request);
                        setShowDetailsModal(true);
                        setIsLoadingDocuments(true);
                        setUserDocuments([]);
                        
                        // Fetch documents from the documents table for this user
                        try {
                          const { data: docs, error } = await supabase
                            .from('documents')
                            .select('id, title, file_name, file_url, document_type')
                            .eq('user_id', request.userId)
                            .order('created_at', { ascending: false });
                          
                          if (docs && !error) {
                            setUserDocuments(docs.map((d: any) => ({
                              id: d.id,
                              title: d.title || 'Untitled',
                              fileName: d.file_name || 'Unknown file',
                              fileUrl: d.file_url,
                              documentType: d.document_type || 'Document'
                            })));
                          }
                        } catch (err) {
                          console.error('Error fetching documents:', err);
                        } finally {
                          setIsLoadingDocuments(false);
                        }
                      }}
                      className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                      title="View full request details"
                    >
                      <EyeIcon size={16} />
                      View Details
                    </button>
                    {/* Edit button for admins */}
                    {(user?.role === 'administrator' || user?.role === 'supervisor') && (
                      <button
                        onClick={() => openEditModal(request)}
                        className="px-3 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1"
                        title="Edit supervisor assignment"
                      >
                        <EditIcon size={16} />
                        Assign Approver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* View Details Modal */}
      {showDetailsModal && viewingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Request Details</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {viewingRequest.type.charAt(0).toUpperCase() + viewingRequest.type.slice(1)} Training Request
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setViewingRequest(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XIcon size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Training Title:</span>
                    <p className="font-medium text-slate-800">{viewingRequest.title}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>
                    <p className="font-medium">{getStatusBadge(viewingRequest.status)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Submitted By:</span>
                    <p className="font-medium text-slate-800">{viewingRequest.userName} (#{viewingRequest.userBadge})</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Submitted Date:</span>
                    <p className="font-medium text-slate-800">{formatDate(viewingRequest.submittedDate)}</p>
                  </div>
                  {viewingRequest.trainingDate && (
                    <div>
                      <span className="text-slate-500">Training Date:</span>
                      <p className="font-medium text-slate-800">{formatDate(viewingRequest.trainingDate)}</p>
                    </div>
                  )}
                  {viewingRequest.location && (
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="font-medium text-slate-800">{viewingRequest.location}</p>
                    </div>
                  )}
                  {viewingRequest.supervisorName && (
                    <div>
                      <span className="text-slate-500">Assigned Approver:</span>
                      <p className="font-medium text-slate-800">{viewingRequest.supervisorName}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* External Training Specific Details */}
              {viewingRequest.type === 'external' && (() => {
                const extData = viewingRequest.originalData as ExternalTrainingRequest;
                return (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3">External Training Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Organization:</span>
                        <p className="font-medium text-slate-800">{extData.organization}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Event Name:</span>
                        <p className="font-medium text-slate-800">{extData.eventName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Start Date:</span>
                        <p className="font-medium text-slate-800">{formatDate(extData.startDate)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">End Date:</span>
                        <p className="font-medium text-slate-800">{formatDate(extData.endDate)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Cost Estimate:</span>
                        <p className="font-medium text-slate-800">${extData.costEstimate?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                    {extData.justification && (
                      <div className="mt-4">
                        <span className="text-slate-500">Justification:</span>
                        <p className="font-medium text-slate-800 mt-1 whitespace-pre-wrap">{extData.justification}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Internal Training Specific Details */}
              {viewingRequest.type === 'internal' && (() => {
                const intData = viewingRequest.originalData as InternalTrainingRequest;
                return (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3">Internal Training Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Course Name:</span>
                        <p className="font-medium text-slate-800">{intData.courseName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Instructor:</span>
                        <p className="font-medium text-slate-800">{intData.instructor}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Training Date:</span>
                        <p className="font-medium text-slate-800">{formatDate(intData.trainingDate)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Location:</span>
                        <p className="font-medium text-slate-800">{intData.location}</p>
                      </div>
                    </div>
                    {intData.attendees && intData.attendees.length > 0 && (
                      <div className="mt-4">
                        <span className="text-slate-500">Attendees:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {intData.attendees.map((attendeeId, idx) => {
                            const attendee = allUsers.find(u => u.id === attendeeId);
                            return (
                              <span key={idx} className="px-2 py-1 bg-white rounded text-sm text-slate-700">
                                {attendee ? `${attendee.firstName} ${attendee.lastName}` : attendeeId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Notes */}
              {(() => {
                const originalData = viewingRequest.originalData as any;
                return originalData.notes ? (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3">Notes</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{originalData.notes}</p>
                  </div>
                ) : null;
              })()}
              
              {/* Denial Reason */}
              {(() => {
                const originalData = viewingRequest.originalData as any;
                return originalData.denialReason ? (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-3">Denial Reason</h4>
                    <p className="text-sm text-red-700 whitespace-pre-wrap">{originalData.denialReason}</p>
                  </div>
                ) : null;
              })()}
              
              {/* Documents/Attachments */}
              {(() => {
                const originalData = viewingRequest.originalData as any;
                const requestDocuments: {name: string; url: string; type?: string}[] = [];
                
                // Collect documents from request data
                if (originalData.certificateFileUrl) {
                  requestDocuments.push({ name: originalData.fileName || 'Certificate', url: originalData.certificateFileUrl, type: 'Certificate' });
                }
                if (originalData.certificate_file_url) {
                  requestDocuments.push({ name: originalData.file_name || 'Certificate', url: originalData.certificate_file_url, type: 'Certificate' });
                }
                if (originalData.sourceFile) {
                  requestDocuments.push({ name: 'Source Document', url: originalData.sourceFile, type: 'Source' });
                }
                if (originalData.sourcefile) {
                  requestDocuments.push({ name: 'Source Document', url: originalData.sourcefile, type: 'Source' });
                }
                if (originalData.documents && Array.isArray(originalData.documents)) {
                  originalData.documents.forEach((doc: any, idx: number) => {
                    // Handle different document formats
                    let url = '';
                    if (typeof doc === 'string') {
                      url = doc;
                    } else if (doc.url) {
                      url = doc.url;
                    } else if (doc.fileUrl) {
                      url = doc.fileUrl;
                    } else if (doc.file_url) {
                      url = doc.file_url;
                    }
                    
                    if (url) {
                      requestDocuments.push({ 
                        name: doc.name || doc.fileName || doc.file_name || `Document ${idx + 1}`, 
                        url: url 
                      });
                    }
                  });
                }
                if (originalData.attachments && Array.isArray(originalData.attachments)) {
                  originalData.attachments.forEach((doc: any, idx: number) => {
                    // Handle different attachment formats
                    let url = '';
                    if (typeof doc === 'string') {
                      url = doc;
                    } else if (doc.url) {
                      url = doc.url;
                    } else if (doc.fileUrl) {
                      url = doc.fileUrl;
                    } else if (doc.file_url) {
                      url = doc.file_url;
                    }
                    
                    if (url) {
                      requestDocuments.push({ 
                        name: doc.name || doc.fileName || doc.file_name || `Attachment ${idx + 1}`, 
                        url: url 
                      });
                    }
                  });
                }
                if (originalData.supportingDocuments && Array.isArray(originalData.supportingDocuments)) {
                  originalData.supportingDocuments.forEach((doc: any, idx: number) => {
                    // Handle different document formats
                    let url = '';
                    if (typeof doc === 'string') {
                      url = doc;
                    } else if (doc.url) {
                      url = doc.url;
                    } else if (doc.fileUrl) {
                      url = doc.fileUrl;
                    } else if (doc.file_url) {
                      url = doc.file_url;
                    }
                    
                    if (url) {
                      requestDocuments.push({ 
                        name: doc.name || doc.fileName || doc.file_name || `Supporting Document ${idx + 1}`, 
                        url: url 
                      });
                    }
                  });
                }
                if (originalData.supporting_documents && Array.isArray(originalData.supporting_documents)) {
                  originalData.supporting_documents.forEach((doc: any, idx: number) => {
                    // Handle different document formats
                    let url = '';
                    if (typeof doc === 'string') {
                      url = doc;
                    } else if (doc.url) {
                      url = doc.url;
                    } else if (doc.fileUrl) {
                      url = doc.fileUrl;
                    } else if (doc.file_url) {
                      url = doc.file_url;
                    }
                    
                    if (url) {
                      requestDocuments.push({ 
                        name: doc.name || doc.fileName || doc.file_name || `Supporting Document ${idx + 1}`, 
                        url: url 
                      });
                    }
                  });
                }
                
                const totalDocs = requestDocuments.length + userDocuments.length;
                
                return (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3">
                      Documents & Attachments {isLoadingDocuments ? '(Loading...)' : `(${totalDocs})`}
                    </h4>
                    
                    {isLoadingDocuments ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <RefreshIcon size={16} className="animate-spin" />
                        Loading documents...
                      </div>
                    ) : totalDocs === 0 ? (
                      <p className="text-sm text-slate-500">No documents attached to this request.</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Request-specific documents */}
                        {requestDocuments.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase mb-2">Request Documents</p>
                            <div className="space-y-2">
                              {requestDocuments.map((doc, idx) => (
                                <a
                                  key={`req-${idx}`}
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <DownloadIcon size={16} />
                                  {doc.name}
                                  {doc.type && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{doc.type}</span>}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* User's uploaded documents from documents table */}
                        {userDocuments.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase mb-2">User Uploaded Documents</p>
                            <div className="space-y-2">
                              {userDocuments.map((doc) => (
                                <a
                                  key={doc.id}
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <DownloadIcon size={16} />
                                  {doc.title || doc.fileName}
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{doc.documentType}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {/* Action Buttons */}
            <div className="p-6 border-t border-slate-200 sticky bottom-0 bg-white">
              {/* Show approval buttons if user can approve and request is not already approved/denied */}
              {canApproveRequest(viewingRequest) && !['approved', 'denied', 'completed'].includes(viewingRequest.status) ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Approve Button */}
                  <button
                    onClick={() => handleApprovalAction('approve')}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckIcon size={20} />
                    Approve
                  </button>
                  
                  {/* Deny Button */}
                  <button
                    onClick={() => handleApprovalAction('deny')}
                    className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <XIcon size={20} />
                    Deny
                  </button>
                  
                  {/* Edit Request Button */}
                  {canEditRequest(viewingRequest) && (
                    <button
                      onClick={openEditRequestModal}
                      className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <EditIcon size={20} />
                      Edit Request
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setViewingRequest(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
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
      
      {/* Approval Confirmation Modal */}
      {showApprovalModal && viewingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {approvalAction === 'approve' ? 'Approve Request' : 'Deny Request'}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {approvalAction === 'approve' 
                  ? 'Add any notes and confirm approval' 
                  : 'Please provide a reason for denial'}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-800">{viewingRequest.title}</div>
                <div className="text-sm text-slate-600 mt-1">
                  Submitted by: {viewingRequest.userName} (#{viewingRequest.userBadge})
                </div>
              </div>
              
              {/* Next Approver Dropdown - Show for both approve and deny */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {approvalAction === 'approve' ? 'Select Next Approver' : 'Forward to Another Approver (Optional)'}
                </label>
                  <select
                    value={nextApproverId}
                    onChange={(e) => setNextApproverId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  >
                    <option value="">-- Select Next Approver --</option>
                    {allUsers
                      .filter(u => (u.role === 'supervisor' || u.role === 'administrator' || u.role === 'training_coordinator') && u.id !== user?.id && u.id !== viewingRequest?.userId)
                      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.lastName}, {u.firstName} - {u.rank || u.role}
                        </option>
                      ))}
                  </select>
                <p className="text-xs text-slate-500 mt-1">
                  {approvalAction === 'approve' 
                    ? 'Select who should review this request next' 
                    : 'Optionally forward to another approver before final denial'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {approvalAction === 'approve' ? 'Notes (optional)' : 'Reason for Denial'}
                  {approvalAction === 'deny' && <span className="text-red-500"> *</span>}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                  placeholder={approvalAction === 'approve' ? 'Add any notes...' : 'Enter reason for denial...'}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalAction(null);
                  setApprovalNotes('');
                  setNextApproverId('');
                }}
                className="px-4 py-2 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                disabled={isProcessingApproval}
              >
                Cancel
              </button>
              <button
                onClick={confirmApprovalAction}
                disabled={isProcessingApproval || (approvalAction === 'deny' && !approvalNotes.trim())}
                className={`px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  approvalAction === 'approve' 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isProcessingApproval ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {approvalAction === 'approve' ? <CheckIcon size={16} /> : <XIcon size={16} />}
                    {approvalAction === 'approve' ? 'Confirm Approval' : 'Confirm Denial'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Request Modal */}
      {showEditRequestModal && viewingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Edit Request</h3>
              <p className="text-sm text-slate-600 mt-1">Modify the request details</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editRequestData.title || ''}
                  onChange={(e) => setEditRequestData({...editRequestData, title: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              {viewingRequest.type === 'external' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={editRequestData.location || ''}
                      onChange={(e) => setEditRequestData({...editRequestData, location: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Training Date</label>
                    <input
                      type="date"
                      value={editRequestData.trainingDate?.split('T')[0] || ''}
                      onChange={(e) => setEditRequestData({...editRequestData, trainingDate: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cost Estimate ($)</label>
                    <input
                      type="number"
                      value={editRequestData.costEstimate || 0}
                      onChange={(e) => setEditRequestData({...editRequestData, costEstimate: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Justification</label>
                    <textarea
                      value={editRequestData.justification || ''}
                      onChange={(e) => setEditRequestData({...editRequestData, justification: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                </>
              )}
              
              {viewingRequest.type === 'internal' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={editRequestData.location || ''}
                      onChange={(e) => setEditRequestData({...editRequestData, location: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Training Date</label>
                    <input
                      type="date"
                      value={editRequestData.trainingDate?.split('T')[0] || ''}
                      onChange={(e) => setEditRequestData({...editRequestData, trainingDate: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={editRequestData.notes || ''}
                  onChange={(e) => setEditRequestData({...editRequestData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="Add any notes..."
                />
              </div>
              
              {/* Existing Attachments */}
              {viewingRequest.originalData?.attachments && viewingRequest.originalData.attachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Current Attachments</label>
                  <div className="space-y-2">
                    {viewingRequest.originalData.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="text-sm text-slate-700">{attachment.name || attachment.fileName || `Attachment ${index + 1}`}</span>
                        </div>
                        {attachment.url && (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 text-sm"
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Upload New Attachments */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Add Supporting Documents</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setEditRequestData({...editRequestData, newAttachments: files});
                    }}
                    className="hidden"
                    id="edit-attachment-upload"
                  />
                  <label htmlFor="edit-attachment-upload" className="cursor-pointer">
                    <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-slate-600">Click to upload files</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG, XLS, XLSX</p>
                  </label>
                </div>
                {editRequestData.newAttachments && editRequestData.newAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-slate-700">Files to upload:</p>
                    {editRequestData.newAttachments.map((file: File, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newFiles = editRequestData.newAttachments.filter((_: any, i: number) => i !== index);
                            setEditRequestData({...editRequestData, newAttachments: newFiles});
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditRequestModal(false);
                  setEditRequestData({});
                }}
                className="px-4 py-2 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={saveEditedRequest}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-[70] animate-slide-up">
          <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
            toastMessage.includes('denied') || toastMessage.includes('Failed')
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
          }`}>
            {toastMessage.includes('denied') || toastMessage.includes('Failed') ? (
              <XIcon size={20} />
            ) : (
              <CheckIcon size={20} />
            )}
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingRequestFilter;
