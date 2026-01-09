import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChainIcon,
  CheckIcon,
  ClockIcon,
  XIcon,
  CalendarIcon,
  ChevronRightIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  UserIcon,
} from '@/components/icons/Icons';
import { TrainingRequest } from '@/types';

const ChainOfCommand: React.FC = () => {
  const { allRequests, allUsers, user, updateRequestStatus, refreshRequests } = useAuth();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get requests that involve the current user or are visible based on role
  const relevantRequests = allRequests.filter(r => {
    if (user?.role === 'administrator') return true;
    if (user?.role === 'supervisor') {
      return r.supervisorId === user.id || r.userId === user.id;
    }
    return r.userId === user?.id;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
      case 'scheduled':
        return <CheckIcon size={16} className="text-green-600" />;
      case 'denied':
        return <XIcon size={16} className="text-red-600" />;
      case 'submitted':
      case 'supervisor_review':
      case 'admin_approval':
        return <ClockIcon size={16} className="text-amber-600" />;
      default:
        return <ClockIcon size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'border-blue-500 bg-blue-50',
      supervisor_review: 'border-amber-500 bg-amber-50',
      admin_approval: 'border-purple-500 bg-purple-50',
      approved: 'border-green-500 bg-green-50',
      denied: 'border-red-500 bg-red-50',
      scheduled: 'border-cyan-500 bg-cyan-50',
      completed: 'border-slate-500 bg-slate-50',
    };
    return colors[status] || 'border-slate-300 bg-slate-50';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getUserById = (id: string) => {
    return allUsers.find(u => u.id === id);
  };

  const getApprovalChain = (request: TrainingRequest) => {
    const requester = getUserById(request.userId);
    // Access extended request data from originalData if available
    const originalData = (request as any).originalData || {};
    
    // Get approvers from the request data
    const trainingCoordinator = request.supervisorId ? getUserById(request.supervisorId) : null;
    const shiftCommander = originalData.commander_id ? getUserById(originalData.commander_id) : null;
    const chief = originalData.chief_id ? getUserById(originalData.chief_id) : null;
    
    // Get approval dates
    const coordinatorApprovalDate = request.supervisorApprovalDate || originalData.supervisor_approval_date;
    const commanderApprovalDate = originalData.commander_approval_date;
    const chiefApprovalDate = originalData.chief_approval_date;
    
    // Determine current step based on status and approval dates
    const isDenied = request.status === 'denied';
    const isApproved = request.status === 'approved' || request.status === 'scheduled' || request.status === 'completed';
    
    // Step 1: Request Submitted - always completed if request exists
    const step1Status = 'completed';
    
    // Step 2: Training Coordinator Review
    let step2Status: 'pending' | 'current' | 'completed' | 'denied' = 'pending';
    if (isDenied && !coordinatorApprovalDate) {
      step2Status = 'denied';
    } else if (coordinatorApprovalDate) {
      step2Status = 'completed';
    } else if (request.status === 'submitted' || request.status === 'supervisor_review') {
      step2Status = 'current';
    }
    
    // Step 3: Shift Commander Review
    let step3Status: 'pending' | 'current' | 'completed' | 'denied' = 'pending';
    if (isDenied && coordinatorApprovalDate && !commanderApprovalDate) {
      step3Status = 'denied';
    } else if (commanderApprovalDate) {
      step3Status = 'completed';
    } else if (coordinatorApprovalDate && !commanderApprovalDate) {
      step3Status = 'current';
    }
    
    // Step 4: Chief Approval
    let step4Status: 'pending' | 'current' | 'completed' | 'denied' = 'pending';
    if (isDenied && commanderApprovalDate && !chiefApprovalDate) {
      step4Status = 'denied';
    } else if (chiefApprovalDate) {
      step4Status = 'completed';
    } else if (commanderApprovalDate && !chiefApprovalDate) {
      step4Status = 'current';
    }
    
    // Step 5: Training Scheduled
    let step5Status: 'pending' | 'current' | 'completed' | 'denied' = 'pending';
    if (request.scheduledDate) {
      step5Status = 'completed';
    } else if (isApproved || chiefApprovalDate) {
      step5Status = 'current';
    }

    const chain = [
      {
        step: 1,
        title: 'Request Submitted',
        person: requester,
        status: step1Status,
        date: request.submittedDate,
        description: `${requester?.firstName || 'Officer'} ${requester?.lastName || ''} submitted training request`,
      },
      {
        step: 2,
        title: 'Training Coordinator Review',
        person: trainingCoordinator || allUsers.find(u => u.role === 'training_coordinator'),
        status: step2Status,
        date: coordinatorApprovalDate,
        description: coordinatorApprovalDate && trainingCoordinator
          ? `Reviewed by ${trainingCoordinator.rank || ''} ${trainingCoordinator.lastName || 'Training Coordinator'}`
          : 'Awaiting Training Coordinator review',
      },
      {
        step: 3,
        title: 'Shift Commander Review',
        person: shiftCommander || allUsers.find(u => u.rank?.toLowerCase().includes('commander') || u.rank?.toLowerCase().includes('lieutenant')),
        status: step3Status,
        date: commanderApprovalDate,
        description: commanderApprovalDate && shiftCommander
          ? `Reviewed by ${shiftCommander.rank || ''} ${shiftCommander.lastName || 'Shift Commander'}`
          : 'Awaiting Shift Commander review',
      },
      {
        step: 4,
        title: 'Chief Approval',
        person: chief || allUsers.find(u => u.rank?.toLowerCase().includes('chief')),
        status: step4Status,
        date: chiefApprovalDate,
        description: chiefApprovalDate && chief
          ? isDenied 
            ? `Denied by ${chief.rank || ''} ${chief.lastName || 'Chief'}`
            : `Approved by ${chief.rank || ''} ${chief.lastName || 'Chief'}`
          : 'Awaiting Chief approval',
      },
      {
        step: 5,
        title: 'Training Scheduled',
        person: null,
        status: step5Status,
        date: request.scheduledDate,
        description: request.scheduledDate 
          ? `Training scheduled for ${formatDate(request.scheduledDate)}`
          : 'Pending scheduling',
      },
    ];

    return chain;
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequestId) return;
    
    setIsProcessing(true);
    try {
      // Update status to a "deleted" state or use actual delete
      await updateRequestStatus(selectedRequestId, 'denied', 'Request deleted by administrator');
      await refreshRequests();
      setShowDeleteConfirm(false);
      setSelectedRequestId(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedRequest = selectedRequestId 
    ? relevantRequests.find(r => r.id === selectedRequestId)
    : null;

  const isAdmin = user?.role === 'administrator';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chain of Command Tracker</h1>
          <p className="text-slate-600 mt-1">Track approval workflow for training requests</p>
        </div>
        
        {/* Admin Toolbar */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon size={18} />
              <span>Add Request</span>
            </button>
            {selectedRequest && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  <EditIcon size={18} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <TrashIcon size={18} />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Request List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Active Requests</h2>
              <p className="text-sm text-slate-500 mt-1">{relevantRequests.length} total</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {relevantRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <ChainIcon className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500">No requests to track</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Create your first request
                    </button>
                  )}
                </div>
              ) : (
                relevantRequests.map((request) => (
                  <button
                    key={request.id}
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                      selectedRequestId === request.id ? 'bg-amber-50 border-l-4 border-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-slate-800 truncate">{request.trainingTitle}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{request.userName}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusIcon(request.status)}
                          <span className="text-xs text-slate-600 capitalize">
                            {request.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <ChevronRightIcon className="text-slate-400 flex-shrink-0" size={18} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chain Visualization */}
        <div className="lg:col-span-2">
          {selectedRequest ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className={`p-6 border-b-4 ${getStatusColor(selectedRequest.status)}`}>
                <h2 className="text-xl font-bold text-slate-800">{selectedRequest.trainingTitle}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <span>Requested by: {selectedRequest.userName}</span>
                  <span>Badge: #{selectedRequest.userBadge || 'N/A'}</span>
                </div>
              </div>

              <div className="p-6">
                {/* Visual Chain */}
                <div className="relative">
                  {getApprovalChain(selectedRequest).map((step, index) => (
                    <div key={step.step} className="flex gap-4 mb-8 last:mb-0">
                      {/* Step Indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                          step.status === 'completed' ? 'border-green-500 bg-green-100' :
                          step.status === 'denied' ? 'border-red-500 bg-red-100' :
                          step.status === 'current' ? 'border-amber-500 bg-amber-100 animate-pulse' :
                          'border-slate-300 bg-slate-100'
                        }`}>
                          {step.status === 'completed' ? (
                            <CheckIcon size={24} className="text-green-600" />
                          ) : step.status === 'denied' ? (
                            <XIcon size={24} className="text-red-600" />
                          ) : step.status === 'current' ? (
                            <ClockIcon size={24} className="text-amber-600" />
                          ) : (
                            <span className="text-lg font-bold text-slate-400">{step.step}</span>
                          )}
                        </div>
                        {index < 4 && (
                          <div className={`w-0.5 h-16 ${
                            step.status === 'completed' ? 'bg-green-300' :
                            step.status === 'denied' ? 'bg-red-300' :
                            'bg-slate-200'
                          }`} />
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-800">{step.title}</h3>
                          {step.date && (
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              <CalendarIcon size={14} />
                              {formatDate(step.date)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                        
                        {step.person && (
                          <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <img
                              src={step.person.avatar}
                              alt={`${step.person.firstName} ${step.person.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium text-slate-800">
                                {step.person.rank} {step.person.firstName} {step.person.lastName}
                              </div>
                              <div className="text-xs text-slate-500">
                                {step.person.department} • Badge #{step.person.badgeNumber}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Denial Reason */}
                {selectedRequest.denialReason && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Denial Reason</h4>
                    <p className="text-red-700">{selectedRequest.denialReason}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedRequest.notes && (
                  <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <h4 className="font-semibold text-slate-800 mb-2">Request Notes</h4>
                    <p className="text-slate-600">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <ChainIcon className="mx-auto text-slate-300 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-slate-800">Select a Request</h3>
              <p className="text-slate-600 mt-1">
                Choose a request from the list to view its approval chain
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrashIcon size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Delete Request</h3>
                <p className="text-sm text-slate-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete the training request for <strong>{selectedRequest.trainingTitle}</strong> by <strong>{selectedRequest.userName}</strong>?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRequest}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Deleting...' : 'Delete Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Request Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add Training Request</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800">
                <strong>Note:</strong> This feature allows administrators to create training requests on behalf of officers. 
                You can create requests through the "Internal Training" or "External Training" pages, or use the "Admin Controls" section.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Request Modal - Placeholder */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Training Request</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800">
                <strong>Editing:</strong> {selectedRequest.trainingTitle} - {selectedRequest.userName}
              </p>
              <p className="text-amber-700 text-sm mt-2">
                Use the "Pending Approvals" page to approve, deny, or modify request status. 
                Full editing capabilities will be added in a future update.
              </p>
            </div>
            <button
              onClick={() => setShowEditModal(false)}
              className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChainOfCommand;
