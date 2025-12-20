import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TrainingRequest, ChainOfCommandStep } from '@/types';
import {
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  AlertIcon,
  ChevronRightIcon,
  RequestIcon,
} from '@/components/icons/Icons';

const MyRequests: React.FC = () => {
  const { userRequests } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<TrainingRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredRequests = filterStatus === 'all'
    ? userRequests
    : userRequests.filter(r => r.status === filterStatus);

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
          <h1 className="text-2xl font-bold text-slate-800">My Requests</h1>
          <p className="text-slate-600 mt-1">Track and manage your training requests</p>
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
          <div className="text-2xl font-bold text-slate-800">{userRequests.length}</div>
          <div className="text-sm text-slate-600">Total Requests</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-blue-600">
            {userRequests.filter(r => ['submitted', 'supervisor_review', 'admin_approval'].includes(r.status)).length}
          </div>
          <div className="text-sm text-slate-600">Pending</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-green-600">
            {userRequests.filter(r => r.status === 'approved' || r.status === 'scheduled').length}
          </div>
          <div className="text-sm text-slate-600">Approved</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-2xl font-bold text-amber-600">
            {userRequests.filter(r => r.status === 'completed').length}
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

      {/* Request Detail Modal */}
      {selectedRequest && (
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
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 mb-4">Approval Timeline</h3>
                <div className="space-y-4">
                  {getChainOfCommand(selectedRequest).map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.status === 'approved' ? 'bg-green-100 text-green-600' :
                          step.status === 'denied' ? 'bg-red-100 text-red-600' :
                          step.status === 'current' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {step.status === 'approved' ? <CheckIcon size={16} /> :
                           step.status === 'denied' ? <XIcon size={16} /> :
                           step.status === 'current' ? <ClockIcon size={16} /> :
                           <span className="w-2 h-2 bg-slate-300 rounded-full" />}
                        </div>
                        {index < 3 && (
                          <div className={`w-0.5 h-12 ${
                            step.status === 'approved' ? 'bg-green-200' :
                            step.status === 'denied' ? 'bg-red-200' :
                            'bg-slate-200'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="font-medium text-slate-800">{step.role}</div>
                        <div className="text-sm text-slate-600">{step.name}</div>
                        {step.timestamp && (
                          <div className="text-xs text-slate-400 mt-1">
                            {formatDate(step.timestamp)}
                          </div>
                        )}
                        {step.notes && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-sm text-red-700">
                            {step.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                  {selectedRequest.notes && (
                    <div className="pt-2 border-t border-slate-200">
                      <dt className="text-slate-600 mb-1">Notes</dt>
                      <dd className="text-slate-800">{selectedRequest.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
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
