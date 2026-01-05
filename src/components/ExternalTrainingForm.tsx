import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { externalTrainingService, notificationService } from '@/lib/database';
import { ExternalTrainingRequest } from '@/types';
import {
  CalendarIcon,
  LocationIcon,
  AccountingIcon,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  ExternalLinkIcon,
  DocumentIcon,
} from '@/components/icons/Icons';

const ExternalTrainingForm: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<ExternalTrainingRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Form state
  const [eventName, setEventName] = useState('');
  const [organization, setOrganization] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [costEstimate, setCostEstimate] = useState('');
  const [justification, setJustification] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userRequests = await externalTrainingService.getByUser(user.id);
      setRequests(userRequests);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== EXTERNAL TRAINING SUBMIT ===');
    console.log('Form values:', { eventName, organization, startDate, endDate, location, justification, costEstimate, notes });
    console.log('User:', user?.id);
    
    if (!user || !eventName || !organization || !startDate || !endDate || !location || !justification) {
      console.log('Validation failed:', { user: !!user, eventName: !!eventName, organization: !!organization, startDate: !!startDate, endDate: !!endDate, location: !!location, justification: !!justification });
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequest = await externalTrainingService.create({
        userId: user.id,
        eventName,
        organization,
        startDate,
        endDate,
        location,
        costEstimate: parseFloat(costEstimate) || 0,
        justification,
        notes,
      });

      if (newRequest) {
        // Create notification
        await notificationService.create({
          userId: user.id,
          title: 'External Training Request Submitted',
          message: `Your request for "${eventName}" has been submitted for approval.`,
          type: 'success',
          link: '/external-training',
        });

        setRequests(prev => [newRequest, ...prev]);
        resetForm();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEventName('');
    setOrganization('');
    setStartDate('');
    setEndDate('');
    setLocation('');
    setCostEstimate('');
    setJustification('');
    setNotes('');
    setShowForm(false);
  };

  const getStatusBadge = (status: ExternalTrainingRequest['status']) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-blue-100 text-blue-700',
      supervisor_review: 'bg-amber-100 text-amber-700',
      admin_approval: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      completed: 'bg-slate-100 text-slate-700',
    };
    const labels: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      supervisor_review: 'Supervisor Review',
      admin_approval: 'Admin Approval',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
          <h1 className="text-2xl font-bold text-slate-800">External Training Request</h1>
          <p className="text-slate-600 mt-1">Request attendance at conferences, seminars, and external training</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
        >
          <PlusIcon size={20} />
          New Request
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">New External Training Request</h2>
                <p className="text-slate-600 mt-1">Request attendance at an external conference or seminar</p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <CloseIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Event Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Conference/Seminar name"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hosting Organization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Organization hosting the event"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      min={startDate}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Location and Cost */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <LocationIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State or Virtual"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Estimated Cost
                  </label>
                  <div className="relative">
                    <AccountingIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="number"
                      value={costEstimate}
                      onChange={(e) => setCostEstimate(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Include registration, travel, and lodging</p>
                </div>
              </div>

              {/* Justification */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={4}
                  placeholder="Explain why this training is beneficial and how it relates to your duties..."
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional information..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">My External Training Requests</h2>
        </div>
        
        {requests.length === 0 ? (
          <div className="p-12 text-center">
            <ExternalLinkIcon className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-800">No requests yet</h3>
            <p className="text-slate-600 mt-1">Create your first external training request</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {requests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-800">{request.eventName}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{request.organization}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={16} className="text-slate-400" />
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <LocationIcon size={16} className="text-slate-400" />
                        {request.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <AccountingIcon size={16} className="text-slate-400" />
                        {formatCurrency(request.costEstimate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-slate-500">
                      Submitted: {formatDate(request.submittedDate)}
                    </div>
                    <button
                      onClick={() => {/* View details */}}
                      className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                    >
                      <DocumentIcon size={16} />
                      View Details
                    </button>
                  </div>
                </div>
                {request.justification && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 mb-1">Justification:</p>
                    <p className="text-sm text-slate-700 line-clamp-2">{request.justification}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <CheckIcon size={20} />
          <span className="font-medium">External training request submitted!</span>
        </div>
      )}
    </div>
  );
};

export default ExternalTrainingForm;
