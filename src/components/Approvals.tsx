import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendApprovalNotification, sendDenialNotification, sendGeneralEmail } from '@/lib/emailService';
import { trainingService, certificateService, notificationService, externalTrainingService, requestService } from '@/lib/database';
import { TrainingRequest, TrainingOpportunity, CustomTrainingRequest, ApprovalRank, CustomFieldValue, isSubmittedWithin30Days, getDaysUntilTraining } from '@/types';
import { generateRequestStatusNotification } from '@/lib/notificationGenerator';
import {
  CheckIcon,
  XIcon,
  ClockIcon,
  CalendarIcon,
  AlertIcon,
  SearchIcon,
  CertificateIcon,
  LocationIcon,
  UsersIcon,
  HierarchyIcon,
  AccountingIcon,
  RefreshIcon,
  EmailIcon,
  BellIcon,
} from '@/components/icons/Icons';

// Database request type (snake_case)
interface DbCustomTrainingRequest {
  id: string;

  user_id: string;
  user_name: string | null;
  user_badge: string | null;
  training_title: string;
  training_description: string;
  training_type: string;
  requested_date: string;
  duration: string;
  location: string;
  estimated_cost: number;
  justification: string;
  target_ranks: ApprovalRank[];
  approval_chain: ApprovalRank[];
  current_approval_level: number;
  status: CustomTrainingRequest['status'];
  submitted_date: string;
  notes: string | null;
  custom_field_values: CustomFieldValue[];
  sergeant_id?: string | null;
  sergeant_name?: string | null;
  sergeant_approval_date?: string | null;
  sergeant_notes?: string | null;
  lieutenant_id?: string | null;
  lieutenant_name?: string | null;
  lieutenant_approval_date?: string | null;
  lieutenant_notes?: string | null;
  commander_id?: string | null;
  commander_name?: string | null;
  commander_approval_date?: string | null;
  commander_notes?: string | null;
  chief_id?: string | null;
  chief_name?: string | null;
  chief_approval_date?: string | null;
  chief_notes?: string | null;
  denial_reason?: string | null;
  created_at: string;
  updated_at: string;
}

// Convert database request to app request
const dbToAppRequest = (dbRequest: DbCustomTrainingRequest): CustomTrainingRequest & { customFields?: CustomFieldValue[] } => ({
  id: dbRequest.id,
  userId: dbRequest.user_id,
  userName: dbRequest.user_name || undefined,
  userBadge: dbRequest.user_badge || undefined,
  trainingTitle: dbRequest.training_title,
  trainingDescription: dbRequest.training_description,
  trainingType: dbRequest.training_type as 'individual' | 'group' | 'department',
  requestedDate: dbRequest.requested_date,
  duration: dbRequest.duration,
  location: dbRequest.location,
  estimatedCost: dbRequest.estimated_cost,
  justification: dbRequest.justification,
  targetRanks: dbRequest.target_ranks,
  approvalChain: dbRequest.approval_chain,
  currentApprovalLevel: dbRequest.current_approval_level,
  status: dbRequest.status,
  submittedDate: dbRequest.submitted_date,
  notes: dbRequest.notes || undefined,
  sergeantId: dbRequest.sergeant_id || undefined,
  sergeantName: dbRequest.sergeant_name || undefined,
  sergeantApprovalDate: dbRequest.sergeant_approval_date || undefined,
  sergeantNotes: dbRequest.sergeant_notes || undefined,
  lieutenantId: dbRequest.lieutenant_id || undefined,
  lieutenantName: dbRequest.lieutenant_name || undefined,
  lieutenantApprovalDate: dbRequest.lieutenant_approval_date || undefined,
  lieutenantNotes: dbRequest.lieutenant_notes || undefined,
  commanderId: dbRequest.commander_id || undefined,
  commanderName: dbRequest.commander_name || undefined,
  commanderApprovalDate: dbRequest.commander_approval_date || undefined,
  commanderNotes: dbRequest.commander_notes || undefined,
  chiefId: dbRequest.chief_id || undefined,
  chiefName: dbRequest.chief_name || undefined,
  chiefApprovalDate: dbRequest.chief_approval_date || undefined,
  chiefNotes: dbRequest.chief_notes || undefined,
  denialReason: dbRequest.denial_reason || undefined,
  createdAt: dbRequest.created_at,
  updatedAt: dbRequest.updated_at,
  customFields: dbRequest.custom_field_values,
});

// Map rank to status
const rankToStatus: Record<ApprovalRank, CustomTrainingRequest['status']> = {
  'Sergeant': 'sergeant_review',
  'Lieutenant': 'lieutenant_review',
  'Commander': 'commander_review',
  'Chief': 'chief_approval',
};

// Map status to rank
const statusToRank: Record<string, ApprovalRank> = {
  'sergeant_review': 'Sergeant',
  'lieutenant_review': 'Lieutenant',
  'commander_review': 'Commander',
  'chief_approval': 'Chief',
};

const Approvals: React.FC = () => {
  const { user, allRequests, allUsers, updateRequestStatus, refreshRequests } = useAuth();

  const [trainings, setTrainings] = useState<TrainingOpportunity[]>([]);
  const [customRequests, setCustomRequests] = useState<(CustomTrainingRequest & { customFields?: CustomFieldValue[] })[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(true);
  const [customError, setCustomError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TrainingRequest | null>(null);
  const [selectedCustomRequest, setSelectedCustomRequest] = useState<(CustomTrainingRequest & { customFields?: CustomFieldValue[] }) | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCustomActionModal, setShowCustomActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deny'>('approve');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    status: string;
    notes: string;
    supervisorApprovalDate: string;
    commanderApprovalDate: string;
    chiefApprovalDate: string;
    scheduledDate: string;
    denialReason: string;
    trainingCoordinatorId: string;
    shiftCommanderId: string;
    chiefId: string;
  }>({
    status: '',
    notes: '',
    supervisorApprovalDate: '',
    commanderApprovalDate: '',
    chiefApprovalDate: '',
    scheduledDate: '',
    denialReason: '',
    trainingCoordinatorId: '',
    shiftCommanderId: '',
    chiefId: '',
  });

  useEffect(() => {
    loadTrainings();
    fetchCustomRequests();
  }, []);

  const loadTrainings = async () => {
    const data = await trainingService.getAll();
    setTrainings(data);
  };

  const fetchCustomRequests = async () => {
    setIsLoadingCustom(true);
    setCustomError(null);
    
    try {
      const { data, error } = await supabase
        .from('custom_training_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching custom requests:', error);
        setCustomError('Failed to load custom training requests.');
        return;
      }
      
      const appRequests = (data as DbCustomTrainingRequest[]).map(dbToAppRequest);
      setCustomRequests(appRequests);
    } catch (err) {
      console.error('Error fetching custom requests:', err);
      setCustomError('Failed to load custom training requests.');
    } finally {
      setIsLoadingCustom(false);
    }
  };

  // Get the user's rank from their profile
  const getUserRank = (): ApprovalRank | null => {
    if (!user) return null;
    const rank = user.rank;
    if (rank.includes('Sergeant')) return 'Sergeant';
    if (rank.includes('Lieutenant')) return 'Lieutenant';
    if (rank.includes('Commander')) return 'Commander';
    if (rank.includes('Chief')) return 'Chief';
    return null;
  };

  // Check if user can approve a custom request
  const canApproveCustomRequest = (request: CustomTrainingRequest): boolean => {
    if (!user) return false;
    const userRank = getUserRank();
    if (!userRank) return false;
    
    // Check if user is an administrator (can approve any level)
    if (user.role === 'administrator' || user.role === 'training_coordinator') return true;
    
    // Check if the request is at the user's approval level
    const currentApprovalRank = request.approvalChain[request.currentApprovalLevel];
    return currentApprovalRank === userRank;
  };

  // Filter custom requests that need the current user's approval
  const pendingCustomRequests = customRequests.filter(r => {
    // Only show requests that are not approved, denied, or completed
    if (['approved', 'denied', 'completed', 'draft'].includes(r.status)) return false;
    
    return canApproveCustomRequest(r);
  });

  // Filter standard requests based on user role
  const pendingRequests = allRequests.filter(r => {
    if (user?.role === 'supervisor') {
      // Get the user who submitted the request
      const requestingUser = allUsers.find(u => u.id === r.userId);
      // Show requests from officers this supervisor oversees
      const isMySupervisee = requestingUser?.supervisorId === user.id;
      const isInSupervisorStatus = r.status === 'submitted' || r.status === 'supervisor_review';
      return isMySupervisee && isInSupervisorStatus;
    }
    if (user?.role === 'administrator' || user?.role === 'training_coordinator') {
      // Administrators and Training Coordinators see ALL pending requests at any status
      return r.status !== 'approved' && r.status !== 'denied' && r.status !== 'completed';
    }
    return false;
  });

  const filteredRequests = pendingRequests.filter(r =>
    r.trainingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.userBadge.includes(searchQuery)
  );

  const filteredCustomRequests = pendingCustomRequests.filter(r =>
    r.trainingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.userName && r.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.userBadge && r.userBadge.includes(searchQuery))
  );

  const getUserById = (id: string) => allUsers.find(u => u.id === id);
  const getTrainingById = (id: string) => trainings.find(t => t.id === id);

  const handleAction = (request: TrainingRequest, type: 'approve' | 'deny') => {
    setSelectedRequest(request);
    setActionType(type);
    setActionNotes('');
    setShowActionModal(true);
  };

  const handleEdit = (request: TrainingRequest) => {
    setSelectedRequest(request);
    const originalData = (request as any).originalData || {};
    setEditFormData({
      status: request.status,
      notes: request.notes || '',
      supervisorApprovalDate: request.supervisorApprovalDate || originalData.supervisor_approval_date || '',
      commanderApprovalDate: originalData.commander_approval_date || '',
      chiefApprovalDate: originalData.chief_approval_date || '',
      scheduledDate: request.scheduledDate || '',
      denialReason: request.denialReason || '',
      trainingCoordinatorId: originalData.supervisor_id || originalData.training_coordinator_id || '',
      shiftCommanderId: originalData.commander_id || originalData.shift_commander_id || '',
      chiefId: originalData.chief_id || '',
    });
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedRequest || !user) return;

    // Validate that same person is not assigned to multiple steps
    const hasDuplicateAssignment = 
      (editFormData.trainingCoordinatorId && editFormData.shiftCommanderId && editFormData.trainingCoordinatorId === editFormData.shiftCommanderId) ||
      (editFormData.trainingCoordinatorId && editFormData.chiefId && editFormData.trainingCoordinatorId === editFormData.chiefId) ||
      (editFormData.shiftCommanderId && editFormData.chiefId && editFormData.shiftCommanderId === editFormData.chiefId);

    if (hasDuplicateAssignment) {
      setToastMessage('Error: The same person cannot be assigned to multiple steps in the chain of command.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
      return;
    }

    setIsProcessing(true);
    try {
      // Check if this is an external training request
      const hasEventName = 'eventName' in selectedRequest;
      const hasExternalFields = 'eventLocation' in selectedRequest || 'eventDate' in selectedRequest || 'estimatedCost' in selectedRequest;
      const isExternalRequest = hasEventName || hasExternalFields;

      // Get approver names
      const trainingCoordinator = allUsers.find(u => u.id === editFormData.trainingCoordinatorId);
      const shiftCommander = allUsers.find(u => u.id === editFormData.shiftCommanderId);
      const chief = allUsers.find(u => u.id === editFormData.chiefId);

      const updateData: Record<string, unknown> = {
        status: editFormData.status,
        notes: editFormData.notes || null,
        denial_reason: editFormData.denialReason || null,
        scheduled_date: editFormData.scheduledDate || null,
        supervisor_approval_date: editFormData.supervisorApprovalDate || null,
        commander_approval_date: editFormData.commanderApprovalDate || null,
        chief_approval_date: editFormData.chiefApprovalDate || null,
        // Approver assignments
        supervisor_id: editFormData.trainingCoordinatorId || null,
        supervisor_name: trainingCoordinator ? `${trainingCoordinator.firstName} ${trainingCoordinator.lastName}` : null,
        commander_id: editFormData.shiftCommanderId || null,
        commander_name: shiftCommander ? `${shiftCommander.firstName} ${shiftCommander.lastName}` : null,
        chief_id: editFormData.chiefId || null,
        chief_name: chief ? `${chief.firstName} ${chief.lastName}` : null,
        updated_at: new Date().toISOString(),
      };

      if (isExternalRequest) {
        const { error } = await supabase
          .from('external_training_requests')
          .update(updateData)
          .eq('id', selectedRequest.id);

        if (error) {
          console.error('Error updating external request:', error);
          setToastMessage('Failed to update request. Please try again.');
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
          return;
        }
      } else {
        const { error } = await supabase
          .from('internal_training_requests')
          .update(updateData)
          .eq('id', selectedRequest.id);

        if (error) {
          console.error('Error updating internal request:', error);
          setToastMessage('Failed to update request. Please try again.');
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
          return;
        }
      }

      // Also update the main training_requests table if it exists
      // This ensures the Chain of Command tracker and other views stay in sync
      await supabase
        .from('training_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      setShowEditModal(false);
      setSelectedRequest(null);
      setToastMessage('Request updated successfully!');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Refresh requests
      await refreshRequests();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomAction = (request: CustomTrainingRequest & { customFields?: CustomFieldValue[] }, type: 'approve' | 'deny') => {
    setSelectedCustomRequest(request);
    setActionType(type);
    setActionNotes('');
    setShowCustomActionModal(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest || !user) {
      return;
    }

    setIsProcessing(true);
    try {
      let newStatus: TrainingRequest['status'];
      
      if (actionType === 'approve') {
        if (user.role === 'supervisor') {
          newStatus = 'admin_approval';
        } else {
          // Administrator and Training Coordinator can fully approve
          newStatus = 'approved';
        }
      } else {
        newStatus = 'denied';
      }

      // Check if this is an external training request
      // External requests have eventName property, internal requests have trainingId pointing to a training_courses record
      const hasEventName = 'eventName' in selectedRequest;
      const hasExternalFields = 'eventLocation' in selectedRequest || 'eventDate' in selectedRequest || 'estimatedCost' in selectedRequest;
      const isExternalRequest = hasEventName || hasExternalFields;
      
      if (isExternalRequest) {
        // Directly update external training request
        await externalTrainingService.updateStatus(selectedRequest.id, newStatus, { id: user.id, role: user.role }, actionNotes);
      } else {
        // Use the regular update for internal training requests
        await updateRequestStatus(selectedRequest.id, newStatus, actionNotes);
      }
      
      // Send email notification for denial
      if (actionType === 'deny') {
        const requester = allUsers.find(u => u.id === selectedRequest.userId);
        if (requester && requester.email) {
          try {
            await sendGeneralEmail({
              type: 'general',
              recipientEmail: requester.email,
              recipientName: `${requester.firstName} ${requester.lastName}`,
              subject: `Training Request Denied: ${selectedRequest.trainingTitle}`,
              body: `Your training request for "${selectedRequest.trainingTitle}" has been denied.\n\nReason: ${actionNotes || 'No reason provided'}\n\nDenied by: ${user.firstName} ${user.lastName}\n\nIf you have questions about this decision, please contact your supervisor.`,
              senderName: 'Training Management System',
            });
          } catch (emailError) {
            console.error('Failed to send denial email:', emailError);
          }
        }
      }
      
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionNotes('');
      
      setToastMessage(actionType === 'approve' ? 'Request approved successfully!' : 'Request denied');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Refresh requests
      await refreshRequests();
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmCustomAction = async () => {
    if (!selectedCustomRequest || !user) return;

    setIsProcessing(true);
    try {
      const userRank = getUserRank();
      const currentLevel = selectedCustomRequest.currentApprovalLevel;
      const approvalChain = selectedCustomRequest.approvalChain;
      const isLastApprover = currentLevel === approvalChain.length - 1;
      
      let updateData: Record<string, unknown> = {};
      
      if (actionType === 'approve') {
        // Determine the rank-specific fields to update
        const rankFieldPrefix = userRank?.toLowerCase() || '';
        updateData[`${rankFieldPrefix}_id`] = user.id;
        updateData[`${rankFieldPrefix}_name`] = `${user.firstName} ${user.lastName}`;
        updateData[`${rankFieldPrefix}_approval_date`] = new Date().toISOString();
        updateData[`${rankFieldPrefix}_notes`] = actionNotes || null;
        
        if (isLastApprover) {
          // This is the final approval
          updateData.status = 'approved';
          updateData.current_approval_level = currentLevel + 1;
        } else {
          // Move to next approver
          const nextRank = approvalChain[currentLevel + 1];
          updateData.status = rankToStatus[nextRank];
          updateData.current_approval_level = currentLevel + 1;
        }
      } else {
        // Denied
        const rankFieldPrefix = userRank?.toLowerCase() || '';
        updateData[`${rankFieldPrefix}_id`] = user.id;
        updateData[`${rankFieldPrefix}_name`] = `${user.firstName} ${user.lastName}`;
        updateData[`${rankFieldPrefix}_approval_date`] = new Date().toISOString();
        updateData[`${rankFieldPrefix}_notes`] = actionNotes || null;
        updateData.status = 'denied';
        updateData.denial_reason = actionNotes || 'No reason provided';
      }
      
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('custom_training_requests')
        .update(updateData)
        .eq('id', selectedCustomRequest.id);
      
      if (error) {
        console.error('Error updating custom request:', error);
        setCustomError('Failed to update request. Please try again.');
        return;
      }
      
      // Send email notifications
      try {
        if (actionType === 'approve') {
          await sendApprovalNotification(
            selectedCustomRequest,
            allUsers,
            user,
            userRank || 'Sergeant',
            isLastApprover,
            actionNotes
          );
          console.log('Approval notification sent successfully');
        } else {
          await sendDenialNotification(
            selectedCustomRequest,
            allUsers,
            user,
            userRank || 'Sergeant',
            actionNotes || 'No reason provided'
          );
          console.log('Denial notification sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the approval if email fails
      }
      
      setShowCustomActionModal(false);
      setSelectedCustomRequest(null);
      setActionNotes('');
      
      setToastMessage(actionType === 'approve' 
        ? (isLastApprover ? 'Request fully approved! Requester notified.' : 'Request approved and forwarded to next approver!') 
        : 'Request denied. Requester notified.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Refresh custom requests
      await fetchCustomRequests();
    } finally {
      setIsProcessing(false);
    }
  };


  const handleBatchApprove = async () => {
    setIsProcessing(true);
    try {
      for (const request of filteredRequests) {
        const newStatus = user?.role === 'supervisor' ? 'admin_approval' : 'approved';
        await updateRequestStatus(request.id, newStatus);
      }
      setToastMessage(`${filteredRequests.length} requests approved!`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      await refreshRequests();
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: CustomTrainingRequest['status']) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-blue-100 text-blue-700',
      sergeant_review: 'bg-amber-100 text-amber-700',
      lieutenant_review: 'bg-orange-100 text-orange-700',
      commander_review: 'bg-purple-100 text-purple-700',
      chief_approval: 'bg-indigo-100 text-indigo-700',
      approved: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      completed: 'bg-slate-100 text-slate-700',
    };
    const labels: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      sergeant_review: 'Sergeant Review',
      lieutenant_review: 'Lieutenant Review',
      commander_review: 'Commander Review',
      chief_approval: 'Chief Approval',
      approved: 'Approved',
      denied: 'Denied',
      completed: 'Completed',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getApprovalProgress = (request: CustomTrainingRequest) => {
    const totalSteps = request.approvalChain.length;
    const currentStep = request.currentApprovalLevel;
    
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <HierarchyIcon size={14} />
          Approval Progress ({currentStep}/{totalSteps})
        </div>
        <div className="flex items-center gap-1">
          {request.approvalChain.map((rank, index) => {
            let bgColor = 'bg-slate-200';
            let textColor = 'text-slate-500';
            
            if (index < currentStep) {
              bgColor = 'bg-green-500';
              textColor = 'text-white';
            } else if (index === currentStep && request.status !== 'approved' && request.status !== 'denied') {
              bgColor = 'bg-amber-500';
              textColor = 'text-white';
            }
            
            return (
              <React.Fragment key={rank}>
                <div className={`px-2 py-1 rounded text-xs font-medium ${bgColor} ${textColor}`}>
                  {rank}
                </div>
                {index < request.approvalChain.length - 1 && (
                  <div className={`w-4 h-0.5 ${index < currentStep ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const totalPending = filteredRequests.length + filteredCustomRequests.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pending Approvals</h1>
          <p className="text-slate-600 mt-1">
            {user?.role === 'supervisor' 
              ? 'Review and forward requests to administration' 
              : user?.role === 'administrator'
              ? 'Final approval for training requests'
              : `Review requests as ${getUserRank() || user?.rank}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refreshRequests();
              fetchCustomRequests();
            }}
            disabled={isProcessing || isLoadingCustom}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RefreshIcon size={18} className={isLoadingCustom ? 'animate-spin' : ''} />
            Refresh
          </button>
          {activeTab === 'standard' && filteredRequests.length > 0 && (
            <button
              onClick={handleBatchApprove}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckIcon size={18} />
              )}
              Approve All ({filteredRequests.length})
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('standard')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'standard'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Standard Requests
          {filteredRequests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
              {filteredRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'custom'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Custom Training Requests
          {filteredCustomRequests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
              {filteredCustomRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, badge number, or training..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Error Message */}
      {customError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <XIcon size={18} />
          {customError}
          <button 
            onClick={() => setCustomError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Standard Requests Tab */}
      {activeTab === 'standard' && (
        <>
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <CheckIcon className="mx-auto text-green-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-slate-800">All caught up!</h3>
              <p className="text-slate-600 mt-1">No pending standard requests require your approval</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const requester = getUserById(request.userId);
                const training = getTrainingById(request.trainingId);

                return (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        {/* Training Info */}
                        <div className="flex gap-4 flex-1">
                          {training && (
                            <img
                              src={training.image}
                              alt={training.title}
                              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800 text-lg">{request.trainingTitle}</h3>
                              {/* 30-Day Advance Submission Indicator */}
                              {training && (
                                isSubmittedWithin30Days(request.submittedDate, training.date) ? (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700" title="Submitted 30+ days in advance">
                                    ✓ 30+ Days
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700" title={`Submitted ${getDaysUntilTraining(request.submittedDate, training.date)} days before training`}>
                                    ⚠ {getDaysUntilTraining(request.submittedDate, training.date)} Days
                                  </span>
                                )
                              )}
                            </div>
                            {training && (
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon size={14} />
                                  {formatDate(training.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ClockIcon size={14} />
                                  {training.duration}
                                </span>
                                {training.mandatory && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                    Mandatory
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Requester Info */}
                        {requester && (
                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg lg:w-64">
                            <img
                              src={requester.avatar}
                              alt={`${requester.firstName} ${requester.lastName}`}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium text-slate-800">
                                {requester.rank} {requester.firstName} {requester.lastName}
                              </div>
                              <div className="text-sm text-slate-500">
                                Badge #{requester.badgeNumber} • {requester.department}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Request Notes */}
                      {request.notes && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                          <p className="text-sm text-amber-800">
                            <strong>Note:</strong> {request.notes}
                          </p>
                        </div>
                      )}

                      {/* Prerequisites Warning */}
                      {training && training.prerequisites.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertIcon className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                              <p className="text-sm font-medium text-blue-800">Prerequisites Required:</p>
                              <ul className="text-sm text-blue-700 mt-1">
                                {training.prerequisites.map((prereq, idx) => (
                                  <li key={idx}>• {prereq}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleAction(request, 'approve')}
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckIcon size={18} />
                          {user?.role === 'supervisor' ? 'Forward to Admin' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(request, 'deny')}
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <XIcon size={18} />
                          Deny
                        </button>
                        {(user?.role === 'administrator' || user?.role === 'training_coordinator') && (
                          <button
                            onClick={() => handleEdit(request)}
                            disabled={isProcessing}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Edit Request
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
                      <span>Submitted {formatDate(request.submittedDate)}</span>
                      <span className="capitalize">{request.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Custom Training Requests Tab */}
      {activeTab === 'custom' && (
        <>
          {isLoadingCustom ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading custom training requests...</p>
            </div>
          ) : filteredCustomRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <CheckIcon className="mx-auto text-green-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-slate-800">All caught up!</h3>
              <p className="text-slate-600 mt-1">No pending custom training requests require your approval</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomRequests.map((request) => {
                const requester = getUserById(request.userId);

                return (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        {/* Training Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-800 text-lg">{request.trainingTitle}</h3>
                            {getStatusBadge(request.status)}
                            {/* 30-Day Advance Submission Indicator */}
                            {isSubmittedWithin30Days(request.submittedDate, request.requestedDate) ? (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700" title="Submitted 30+ days in advance">
                                ✓ 30+ Days
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700" title={`Submitted ${getDaysUntilTraining(request.submittedDate, request.requestedDate)} days before training`}>
                                ⚠ {getDaysUntilTraining(request.submittedDate, request.requestedDate)} Days
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{request.trainingDescription}</p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <CalendarIcon size={14} />
                              {formatDate(request.requestedDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon size={14} />
                              {request.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <LocationIcon size={14} />
                              {request.location}
                            </span>
                            {request.estimatedCost > 0 && (
                              <span className="flex items-center gap-1">
                                <AccountingIcon size={14} />
                                ${request.estimatedCost.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Target Ranks */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-xs text-slate-500">Target Audience:</span>
                            {request.targetRanks.map((rank) => (
                              <span key={rank} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {rank}
                              </span>
                            ))}
                          </div>

                          {/* Approval Progress */}
                          {getApprovalProgress(request)}
                        </div>

                        {/* Requester Info */}
                        {requester && (
                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg lg:w-64">
                            <img
                              src={requester.avatar}
                              alt={`${requester.firstName} ${requester.lastName}`}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium text-slate-800">
                                {requester.rank} {requester.firstName} {requester.lastName}
                              </div>
                              <div className="text-sm text-slate-500">
                                Badge #{requester.badgeNumber} • {requester.department}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Justification */}
                      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-700">
                          <strong>Justification:</strong> {request.justification}
                        </p>
                      </div>

                      {/* Request Notes */}
                      {request.notes && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                          <p className="text-sm text-amber-800">
                            <strong>Note:</strong> {request.notes}
                          </p>
                        </div>
                      )}

                      {/* Custom Field Values */}
                      {request.customFields && request.customFields.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-xs text-blue-600 font-medium mb-2">Additional Information:</p>
                          <div className="flex flex-wrap gap-2">
                            {request.customFields.map((field) => (
                              <span key={field.fieldId} className="px-2 py-1 bg-white text-slate-700 text-xs rounded border border-blue-200">
                                <span className="font-medium">{field.fieldLabel}:</span> {String(field.value)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Previous Approvals */}
                      {(request.sergeantName || request.lieutenantName || request.commanderName || request.chiefName) && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                          <p className="text-xs text-green-600 font-medium mb-2">Previous Approvals:</p>
                          <div className="space-y-1">
                            {request.sergeantName && (
                              <p className="text-sm text-green-700">
                                <CheckIcon size={14} className="inline mr-1" />
                                Sergeant: {request.sergeantName} ({formatDate(request.sergeantApprovalDate || '')})
                                {request.sergeantNotes && <span className="text-green-600"> - {request.sergeantNotes}</span>}
                              </p>
                            )}
                            {request.lieutenantName && (
                              <p className="text-sm text-green-700">
                                <CheckIcon size={14} className="inline mr-1" />
                                Lieutenant: {request.lieutenantName} ({formatDate(request.lieutenantApprovalDate || '')})
                                {request.lieutenantNotes && <span className="text-green-600"> - {request.lieutenantNotes}</span>}
                              </p>
                            )}
                            {request.commanderName && (
                              <p className="text-sm text-green-700">
                                <CheckIcon size={14} className="inline mr-1" />
                                Commander: {request.commanderName} ({formatDate(request.commanderApprovalDate || '')})
                                {request.commanderNotes && <span className="text-green-600"> - {request.commanderNotes}</span>}
                              </p>
                            )}
                            {request.chiefName && (
                              <p className="text-sm text-green-700">
                                <CheckIcon size={14} className="inline mr-1" />
                                Chief: {request.chiefName} ({formatDate(request.chiefApprovalDate || '')})
                                {request.chiefNotes && <span className="text-green-600"> - {request.chiefNotes}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleCustomAction(request, 'approve')}
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckIcon size={18} />
                          {request.currentApprovalLevel === request.approvalChain.length - 1 
                            ? 'Final Approve' 
                            : `Approve & Forward to ${request.approvalChain[request.currentApprovalLevel + 1]}`}
                        </button>
                        <button
                          onClick={() => handleCustomAction(request, 'deny')}
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <XIcon size={18} />
                          Deny
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
                      <span>Submitted {formatDate(request.submittedDate)}</span>
                      <span className="flex items-center gap-2">
                        <span className="capitalize">{request.trainingType} Training</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Standard Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className={`p-6 border-b ${actionType === 'approve' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <h2 className={`text-xl font-bold ${actionType === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
                {actionType === 'approve' ? 'Approve Request' : 'Deny Request'}
              </h2>
              <p className={`mt-1 ${actionType === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                {selectedRequest.trainingTitle}
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {actionType === 'approve' ? 'Notes (Optional)' : 'Reason for Denial (Required)'}
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                placeholder={actionType === 'approve' ? 'Add any notes...' : 'Please provide a reason for denial...'}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                required={actionType === 'deny'}
              />
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedRequest(null);
                  setActionNotes('');
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { console.log('BUTTON CLICKED - calling confirmAction'); setIsProcessing(true); confirmAction(); }}
                disabled={(actionType === 'deny' && !actionNotes.trim()) || isProcessing}
                className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  `Confirm ${actionType === 'approve' ? 'Approval' : 'Denial'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Training Action Modal */}
      {showCustomActionModal && selectedCustomRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className={`p-6 border-b ${actionType === 'approve' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <h2 className={`text-xl font-bold ${actionType === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
                {actionType === 'approve' ? 'Approve Custom Training Request' : 'Deny Custom Training Request'}
              </h2>
              <p className={`mt-1 ${actionType === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                {selectedCustomRequest.trainingTitle}
              </p>
              {actionType === 'approve' && (
                <p className={`mt-2 text-sm ${actionType === 'approve' ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedCustomRequest.currentApprovalLevel === selectedCustomRequest.approvalChain.length - 1
                    ? 'This is the final approval. The request will be fully approved.'
                    : `After approval, this will be forwarded to ${selectedCustomRequest.approvalChain[selectedCustomRequest.currentApprovalLevel + 1]} for review.`}
                </p>
              )}
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {actionType === 'approve' ? 'Notes (Optional)' : 'Reason for Denial (Required)'}
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                placeholder={actionType === 'approve' ? 'Add any notes for the record...' : 'Please provide a reason for denial...'}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                required={actionType === 'deny'}
              />
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setShowCustomActionModal(false);
                  setSelectedCustomRequest(null);
                  setActionNotes('');
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmCustomAction}
                disabled={(actionType === 'deny' && !actionNotes.trim()) || isProcessing}
                className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  `Confirm ${actionType === 'approve' ? 'Approval' : 'Denial'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-blue-200 bg-blue-50">
              <h2 className="text-xl font-bold text-blue-800">Edit Training Request</h2>
              <p className="mt-1 text-blue-700">{selectedRequest.trainingTitle}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="submitted">Submitted</option>
                  <option value="supervisor_review">Training Coordinator Review</option>
                  <option value="admin_approval">Shift Commander Review</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Approval Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Training Coordinator Approval Date</label>
                  <input
                    type="date"
                    value={editFormData.supervisorApprovalDate ? editFormData.supervisorApprovalDate.split('T')[0] : ''}
                    onChange={(e) => setEditFormData({ ...editFormData, supervisorApprovalDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Shift Commander Approval Date</label>
                  <input
                    type="date"
                    value={editFormData.commanderApprovalDate ? editFormData.commanderApprovalDate.split('T')[0] : ''}
                    onChange={(e) => setEditFormData({ ...editFormData, commanderApprovalDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Chief Approval Date</label>
                  <input
                    type="date"
                    value={editFormData.chiefApprovalDate ? editFormData.chiefApprovalDate.split('T')[0] : ''}
                    onChange={(e) => setEditFormData({ ...editFormData, chiefApprovalDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Approver Assignments */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="text-sm font-semibold text-amber-800 mb-3">Chain of Command Assignments</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Training Coordinator</label>
                    <select
                      value={editFormData.trainingCoordinatorId}
                      onChange={(e) => setEditFormData({ ...editFormData, trainingCoordinatorId: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        editFormData.trainingCoordinatorId && 
                        (editFormData.trainingCoordinatorId === editFormData.shiftCommanderId || 
                         editFormData.trainingCoordinatorId === editFormData.chiefId)
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-300'
                      }`}
                    >
                      <option value="">Select Training Coordinator</option>
                      {allUsers
                        .filter(u => u.role === 'training_coordinator' || u.role === 'admin' || u.role === 'supervisor')
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.badgeNumber})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Shift Commander</label>
                    <select
                      value={editFormData.shiftCommanderId}
                      onChange={(e) => setEditFormData({ ...editFormData, shiftCommanderId: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        editFormData.shiftCommanderId && 
                        (editFormData.shiftCommanderId === editFormData.trainingCoordinatorId || 
                         editFormData.shiftCommanderId === editFormData.chiefId)
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-300'
                      }`}
                    >
                      <option value="">Select Shift Commander</option>
                      {allUsers
                        .filter(u => u.role === 'commander' || u.role === 'admin' || u.role === 'supervisor')
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.badgeNumber})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Chief</label>
                    <select
                      value={editFormData.chiefId}
                      onChange={(e) => setEditFormData({ ...editFormData, chiefId: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        editFormData.chiefId && 
                        (editFormData.chiefId === editFormData.trainingCoordinatorId || 
                         editFormData.chiefId === editFormData.shiftCommanderId)
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-300'
                      }`}
                    >
                      <option value="">Select Chief</option>
                      {allUsers
                        .filter(u => u.role === 'chief' || u.role === 'admin')
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.badgeNumber})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                {/* Duplicate assignment warning */}
                {(editFormData.trainingCoordinatorId && editFormData.shiftCommanderId && editFormData.trainingCoordinatorId === editFormData.shiftCommanderId) ||
                 (editFormData.trainingCoordinatorId && editFormData.chiefId && editFormData.trainingCoordinatorId === editFormData.chiefId) ||
                 (editFormData.shiftCommanderId && editFormData.chiefId && editFormData.shiftCommanderId === editFormData.chiefId) ? (
                  <p className="mt-2 text-sm text-red-600 font-medium">
                    ⚠️ Warning: The same person cannot be assigned to multiple steps in the chain of command.
                  </p>
                ) : null}
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Scheduled Date</label>
                <input
                  type="date"
                  value={editFormData.scheduledDate ? editFormData.scheduledDate.split('T')[0] : ''}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduledDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={3}
                  placeholder="Add any notes..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Denial Reason */}
              {editFormData.status === 'denied' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Denial Reason</label>
                  <textarea
                    value={editFormData.denialReason}
                    onChange={(e) => setEditFormData({ ...editFormData, denialReason: e.target.value })}
                    rows={3}
                    placeholder="Provide a reason for denial..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 ${
          toastMessage.includes('denied') ? 'bg-red-600' : 'bg-green-600'
        } text-white`}>
          <CheckIcon size={20} />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Approvals;
