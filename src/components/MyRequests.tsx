import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TrainingRequest, ChainOfCommandStep, User } from '@/types';
import ChainOfCommand from '@/components/ChainOfCommand';
import {
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  AlertIcon,
  ChevronRightIcon,
  RequestIcon,
  EditIcon,
} from '@/components/icons/Icons';

const MyRequests: React.FC = () => {
  const { user, userRequests, allRequests, allUsers, updateRequest } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<TrainingRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<any>({});
  const [supervisors, setSupervisors] = useState<User[]>([]);
  
  // Resubmit form state
  const [resubmitForm, setResubmitForm] = useState<any>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (allUsers) {
      const availableSupervisors = allUsers.filter(u => 
        u.role === 'supervisor' || u.role === 'administrator' || u.role === 'training_coordinator'
      );
      setSupervisors(availableSupervisors);
    }
  }, [allUsers]);

  const handleEditClick = () => {
    if (!selectedRequest) return;
    
    const isExternal = (selectedRequest as any).eventName !== undefined;
    
    if (isExternal) {
      setEditForm({
        eventName: (selectedRequest as any).eventName,
        organization: (selectedRequest as any).organization,
        startDate: (selectedRequest as any).startDate,
        endDate: (selectedRequest as any).endDate,
        location: selectedRequest.location,
        costEstimate: (selectedRequest as any).costEstimate,
        justification: (selectedRequest as any).justification,
        notes: selectedRequest.notes,
        supervisorId: selectedRequest.supervisorId,
      });
    } else {
      setEditForm({
        courseName: (selectedRequest as any).courseName,
        trainingDate: (selectedRequest as any).trainingDate,
        location: selectedRequest.location,
        instructor: (selectedRequest as any).instructor,
        attendees: (selectedRequest as any).attendees || [],
        notes: selectedRequest.notes,
        supervisorId: selectedRequest.supervisorId,
      });
    }
    setIsEditing(true);
  };

  const handleResubmitClick = () => {
    if (!selectedRequest) return;
    
    const isExternal = (selectedRequest as any).eventName !== undefined;
    
    if (isExternal) {
      setResubmitForm({
        eventName: (selectedRequest as any).eventName,
        organization: (selectedRequest as any).organization,
        startDate: (selectedRequest as any).startDate,
        endDate: (selectedRequest as any).endDate,
        location: selectedRequest.location,
        costEstimate: (selectedRequest as any).costEstimate,
        justification: (selectedRequest as any).justification,
        notes: '',
        supervisorId: selectedRequest.supervisorId,
        resubmissionReason: '',
      });
    } else {
      setResubmitForm({
        courseName: (selectedRequest as any).courseName,
        trainingDate: (selectedRequest as any).trainingDate,
        location: selectedRequest.location,
        instructor: (selectedRequest as any).instructor,
        attendees: (selectedRequest as any).attendees || [],
        notes: '',
        supervisorId: selectedRequest.supervisorId,
        resubmissionReason: '',
      });
    }
    setAttachments([]);
    setIsResubmitting(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      const success = await updateRequest(selectedRequest.id, editForm);
      if (success) {
        setIsEditing(false);
        setSelectedRequest(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      // Create attachment names list for storage
      const attachmentNames = attachments.map(f => f.name);
      
      // Update the request with new data and reset status
      const resubmitData = {
        ...resubmitForm,
        status: 'submitted',
        denialReason: null,
        supervisorApprovalDate: null,
        adminApprovalDate: null,
        resubmittedDate: new Date().toISOString().split('T')[0],
        resubmissionReason: resubmitForm.resubmissionReason,
        attachments: attachmentNames,
        previousDenialReason: selectedRequest.denialReason,
      };
      
      const success = await updateRequest(selectedRequest.id, resubmitData);
      if (success) {
        setIsResubmitting(false);
        setSelectedRequest(null);
        setAttachments([]);
        alert('Request has been resubmitted successfully!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdminOrCoordinator = user?.role === 'administrator' || user?.role === 'training_coordinator';
  const displayRequests = isAdminOrCoordinator ? allRequests : userRequests;

  const filteredRequests = filterStatus === 'all'
    ? displayRequests
    : displayRequests.filter(r => r.status === filterStatus);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-700 border-blue-200',
      supervisor_review: 'bg-amber-100 text-amber-700 border-amber-200',
      admin_approval: 'bg-purple-100 text-purple-700 border-purple-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      denied: 'bg-red-100 text-red-700 border-red-200',
      scheduled: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      completed: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      submitted: 'Submitted',
      supervisor_review: 'Supervisor Review',
      admin_approval: 'Admin Review',
      approved: 'Approved',
      denied: 'Denied',
      scheduled: 'Scheduled',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getChainOfCommand = (request: TrainingRequest): ChainOfCommandStep[] => {
    const steps: ChainOfCommandStep[] = [
      {
        role: 'Submitted',
        name: request.userName,
        status: 'approved',
        timestamp: request.submittedDate,
      },
      {
        role: 'Supervisor Review',
        name: request.supervisorName || 'Pending Assignment',
        status: request.supervisorApprovalDate ? 'approved' : 
                request.status === 'supervisor_review' ? 'current' :
                request.status === 'submitted' ? 'pending' : 'approved',
        timestamp: request.supervisorApprovalDate,
      },
      {
        role: 'Admin Approval',
        name: request.adminName || 'Pending Assignment',
        status: request.adminApprovalDate ? (request.status === 'denied' ? 'denied' : 'approved') :
                request.status === 'admin_approval' ? 'current' :
                ['submitted', 'supervisor_review'].includes(request.status) ? 'pending' : 
                request.status === 'denied' ? 'denied' : 'approved',
        timestamp: request.adminApprovalDate,
        notes: request.denialReason,
      },
      {
        role: 'Scheduled',
        name: request.scheduledDate ? `Training Date: ${formatDate(request.scheduledDate)}` : 'Awaiting Schedule',
        status: request.scheduledDate ? 'approved' : 
                ['approved', 'scheduled', 'completed'].includes(request.status) ? 'current' : 'pending',
        timestamp: request.scheduledDate,
      },
    ];
    return steps;
  };

  const statusOptions = [
    { value: 'all', label: 'All Requests' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'supervisor_review', label: 'Supervisor Review' },
    { value: 'admin_approval', label: 'Admin Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isAdminOrCoordinator ? 'All Training Requests' : 'My Requests'}
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdminOrCoordinator 
              ? 'Monitor and manage all department training requests' 
              : 'Track and manage your training requests'}
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-slate-800">{displayRequests.length}</div>
          <div className="text-sm text-slate-600">Total Requests</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-blue-600">
            {displayRequests.filter(r => ['submitted', 'supervisor_review', 'admin_approval'].includes(r.status)).length}
          </div>
          <div className="text-sm text-slate-600">Pending</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-green-600">
            {displayRequests.filter(r => r.status === 'approved' || r.status === 'scheduled').length}
          </div>
          <div className="text-sm text-slate-600">Approved</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-amber-600">
            {displayRequests.filter(r => r.status === 'completed').length}
          </div>
          <div className="text-sm text-slate-600">Completed</div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <RequestIcon className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-800">No requests found</h3>
            <p className="text-slate-600 mt-1">
              {filterStatus === 'all' 
                ? "You haven't submitted any training requests yet"
                : `No requests with status "${getStatusLabel(filterStatus)}"`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-800 truncate">{request.trainingTitle}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={14} />
                        Submitted {formatDate(request.submittedDate)}
                      </span>
                      {request.scheduledDate && (
                        <span className="flex items-center gap-1">
                          <ClockIcon size={14} />
                          Scheduled {formatDate(request.scheduledDate)}
                        </span>
                      )}
                    </div>
                    {request.notes && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-1">
                        Note: {request.notes}
                      </p>
                    )}
                  </div>
                  <ChevronRightIcon className="text-slate-400 flex-shrink-0" size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Edit Training Request</h2>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {(selectedRequest as any).eventName !== undefined ? (
                // External Training Fields
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.eventName}
                      onChange={e => setEditForm({...editForm, eventName: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                    <input
                      type="text"
                      required
                      value={editForm.organization}
                      onChange={e => setEditForm({...editForm, organization: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        value={editForm.startDate}
                        onChange={e => setEditForm({...editForm, startDate: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                      <input
                        type="date"
                        required
                        value={editForm.endDate}
                        onChange={e => setEditForm({...editForm, endDate: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost</label>
                    <input
                      type="number"
                      required
                      value={editForm.costEstimate}
                      onChange={e => setEditForm({...editForm, costEstimate: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Justification</label>
                    <textarea
                      required
                      rows={3}
                      value={editForm.justification}
                      onChange={e => setEditForm({...editForm, justification: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </>
              ) : (
                // Internal Training Fields
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Course Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.courseName}
                      onChange={e => setEditForm({...editForm, courseName: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Training Date</label>
                    <input
                      type="date"
                      required
                      value={editForm.trainingDate}
                      onChange={e => setEditForm({...editForm, trainingDate: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instructor</label>
                    <input
                      type="text"
                      required
                      value={editForm.instructor}
                      onChange={e => setEditForm({...editForm, instructor: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </>
              )}
              
              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={editForm.location}
                  onChange={e => setEditForm({...editForm, location: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supervisor/Approver</label>
                <select
                  required
                  value={editForm.supervisorId}
                  onChange={e => setEditForm({...editForm, supervisorId: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Approver</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {isResubmitting && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Resubmit Training Request</h2>
                <p className="text-sm text-slate-600 mt-1">Update your request and add any supporting documents</p>
              </div>
              <button onClick={() => setIsResubmitting(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>
            
            {/* Previous Denial Reason */}
            {selectedRequest.denialReason && (
              <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-1">Previous Denial Reason:</h4>
                <p className="text-sm text-red-700">{selectedRequest.denialReason}</p>
              </div>
            )}
            
            <form onSubmit={handleResubmit} className="p-6 space-y-4">
              {(selectedRequest as any).eventName !== undefined ? (
                // External Training Fields
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
                    <input
                      type="text"
                      required
                      value={resubmitForm.eventName}
                      onChange={e => setResubmitForm({...resubmitForm, eventName: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                    <input
                      type="text"
                      required
                      value={resubmitForm.organization}
                      onChange={e => setResubmitForm({...resubmitForm, organization: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        value={resubmitForm.startDate}
                        onChange={e => setResubmitForm({...resubmitForm, startDate: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                      <input
                        type="date"
                        required
                        value={resubmitForm.endDate}
                        onChange={e => setResubmitForm({...resubmitForm, endDate: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost</label>
                    <input
                      type="number"
                      required
                      value={resubmitForm.costEstimate}
                      onChange={e => setResubmitForm({...resubmitForm, costEstimate: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Justification</label>
                    <textarea
                      required
                      rows={3}
                      value={resubmitForm.justification}
                      onChange={e => setResubmitForm({...resubmitForm, justification: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </>
              ) : (
                // Internal Training Fields
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Course Name</label>
                    <input
                      type="text"
                      required
                      value={resubmitForm.courseName}
                      onChange={e => setResubmitForm({...resubmitForm, courseName: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Training Date</label>
                    <input
                      type="date"
                      required
                      value={resubmitForm.trainingDate}
                      onChange={e => setResubmitForm({...resubmitForm, trainingDate: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instructor</label>
                    <input
                      type="text"
                      required
                      value={resubmitForm.instructor}
                      onChange={e => setResubmitForm({...resubmitForm, instructor: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </>
              )}
              
              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={resubmitForm.location}
                  onChange={e => setResubmitForm({...resubmitForm, location: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supervisor/Approver</label>
                <select
                  required
                  value={resubmitForm.supervisorId}
                  onChange={e => setResubmitForm({...resubmitForm, supervisorId: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Approver</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                  ))}
                </select>
              </div>
              
              {/* Resubmission Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason for Resubmission <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain what changes you've made to address the denial reason..."
                  value={resubmitForm.resubmissionReason}
                  onChange={e => setResubmitForm({...resubmitForm, resubmissionReason: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Supporting Documents (Optional)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Upload any documents that support your resubmission (e.g., certificates, approvals, justifications)
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-amber-500 hover:text-amber-600 transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Click to upload files
                  </span>
                </button>
                
                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <XIcon size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  value={resubmitForm.notes}
                  onChange={e => setResubmitForm({...resubmitForm, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsResubmitting(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Resubmitting...' : 'Resubmit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && !isEditing && !isResubmitting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedRequest.trainingTitle}</h2>
                  <p className="text-slate-600 mt-1">Request ID: {selectedRequest.id}</p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XIcon size={20} className="text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3 mb-6">
                <span className={`px-4 py-2 rounded-lg text-sm font-medium border ${getStatusColor(selectedRequest.status)}`}>
                  {getStatusLabel(selectedRequest.status)}
                </span>
                {selectedRequest.denialReason && (
                  <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>Denial Reason:</strong> {selectedRequest.denialReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Chain of Command Timeline */}
              <div className="mb-8">
                <ChainOfCommand request={selectedRequest} allUsers={allUsers} />
              </div>

              {/* Request Details */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Request Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Submitted By</dt>
                    <dd className="text-slate-800 font-medium">{selectedRequest.userName} (#{selectedRequest.userBadge})</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Submitted Date</dt>
                    <dd className="text-slate-800">{formatDate(selectedRequest.submittedDate)}</dd>
                  </div>
                  {selectedRequest.scheduledDate && (
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Scheduled Date</dt>
                      <dd className="text-slate-800">{formatDate(selectedRequest.scheduledDate)}</dd>
                    </div>
                  )}
                  {(selectedRequest as any).resubmittedDate && (
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Resubmitted Date</dt>
                      <dd className="text-slate-800">{formatDate((selectedRequest as any).resubmittedDate)}</dd>
                    </div>
                  )}
                  {(selectedRequest as any).resubmissionReason && (
                    <div className="pt-2 border-t border-slate-200">
                      <dt className="text-slate-600 mb-1">Resubmission Reason</dt>
                      <dd className="text-slate-800">{(selectedRequest as any).resubmissionReason}</dd>
                    </div>
                  )}
                  {(selectedRequest as any).attachments && (selectedRequest as any).attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <dt className="text-slate-600 mb-1">Attachments</dt>
                      <dd className="text-slate-800">
                        {(selectedRequest as any).attachments.map((name: string, i: number) => (
                          <span key={i} className="inline-block mr-2 mb-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {name}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {selectedRequest.notes && (
                    <div className="pt-2 border-t border-slate-200">
                      <dt className="text-slate-600 mb-1">Notes</dt>
                      <dd className="text-slate-800">{selectedRequest.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              {/* Edit button for submitted requests */}
              {selectedRequest.status === 'submitted' && selectedRequest.userId === user?.id && (
                <button
                  onClick={handleEditClick}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  <EditIcon size={18} />
                  Edit Request
                </button>
              )}
              
              {/* Resubmit button for denied requests - available to ALL users */}
              {/* Resubmit button available to ALL users for denied requests */}
              {selectedRequest.status === 'denied' && (
                <button
                  onClick={handleResubmitClick}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resubmit Request
                </button>
              )}
              
              <button
                onClick={() => setSelectedRequest(null)}
                className={`${(selectedRequest.status === 'submitted' || selectedRequest.status === 'denied') && selectedRequest.userId === user?.id ? 'flex-1' : 'w-full'} px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;
