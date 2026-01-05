import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { internalTrainingService, userService, notificationService } from '@/lib/database';
import { sendGeneralEmail } from '@/lib/emailService';
import { InternalTrainingRequest, User } from '@/types';
import {
  CalendarIcon,
  LocationIcon,
  UsersIcon,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  TrainingIcon,
} from '@/components/icons/Icons';

const InternalTrainingForm: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<InternalTrainingRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Form state
  const [courseName, setCourseName] = useState('');
  const [trainingDate, setTrainingDate] = useState('');
  const [location, setLocation] = useState('');
  const [instructor, setInstructor] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [userRequests, users] = await Promise.all([
        internalTrainingService.getByUser(user.id),
        userService.getAll(),
      ]);
      setRequests(userRequests);
      setAllUsers(users);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !courseName || !trainingDate || !location || !instructor) return;

    setIsSubmitting(true);
    try {
      const newRequest = await internalTrainingService.create({
        userId: user.id,
        courseName,
        trainingDate,
        location,
        instructor,
        attendees: selectedAttendees,
        notes,
      });

      if (newRequest) {
        // Create notification
        await notificationService.create({
          userId: user.id,
          title: 'Internal Training Request Submitted',
          message: `Your request for "${courseName}" has been submitted for approval.`,
          type: 'success',
          link: '/internal-training',
        });

        // Send email notification to supervisors/admins
        try {
          const approvers = allUsers.filter(u => 
            u.role === 'supervisor' || u.role === 'administrator'
          );
          
          for (const approver of approvers) {
            await sendGeneralEmail({
              type: 'general',
              recipientEmail: approver.email,
              recipientName: `${approver.firstName} ${approver.lastName}`,
              subject: `New Internal Training Request: ${courseName}`,
              body: `A new internal training request has been submitted and requires your review.\n\nRequester: ${user.firstName} ${user.lastName}\nCourse: ${courseName}\nDate: ${trainingDate}\nLocation: ${location}\nInstructor: ${instructor}\nAttendees: ${selectedAttendees.length} selected\n\nPlease log in to the Training Management System to review this request.`,
              senderName: 'SHPD Training System',
            });
          }
          console.log('Email notifications sent to approvers');
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
        }

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
    setCourseName('');
    setTrainingDate('');
    setLocation('');
    setInstructor('');
    setSelectedAttendees([]);
    setNotes('');
    setShowForm(false);
  };

  const toggleAttendee = (userId: string) => {
    setSelectedAttendees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusBadge = (status: InternalTrainingRequest['status']) => {
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
          <h1 className="text-2xl font-bold text-slate-800">Internal Training Request</h1>
          <p className="text-slate-600 mt-1">Request department-hosted training sessions</p>
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
                <h2 className="text-xl font-bold text-slate-800">New Internal Training Request</h2>
                <p className="text-slate-600 mt-1">Request a department-hosted training session</p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <CloseIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Course Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Enter course name"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Date and Location */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Training Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="date"
                      value={trainingDate}
                      onChange={(e) => setTrainingDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
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
                      placeholder="Training location"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Instructor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="Instructor name"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Attendees */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Attendees
                </label>
                <div className="border border-slate-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {allUsers.map((u) => (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedAttendees.includes(u.id)
                            ? 'bg-amber-50 border border-amber-200'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAttendees.includes(u.id)}
                          onChange={() => toggleAttendee(u.id)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        <div className="flex items-center gap-2">
                          <img
                            src={u.avatar || '/placeholder.svg'}
                            alt={`${u.firstName} ${u.lastName}`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-xs text-slate-500">#{u.badgeNumber}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                {selectedAttendees.length > 0 && (
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedAttendees.length} attendee(s) selected
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
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
          <h2 className="font-semibold text-slate-800">My Internal Training Requests</h2>
        </div>
        
        {requests.length === 0 ? (
          <div className="p-12 text-center">
            <TrainingIcon className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-800">No requests yet</h3>
            <p className="text-slate-600 mt-1">Create your first internal training request</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {requests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-800">{request.courseName}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={16} className="text-slate-400" />
                        {formatDate(request.trainingDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <LocationIcon size={16} className="text-slate-400" />
                        {request.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <UsersIcon size={16} className="text-slate-400" />
                        {request.attendees.length} attendee(s)
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Instructor: {request.instructor}
                    </p>
                  </div>
                  <div className="text-sm text-slate-500">
                    Submitted: {formatDate(request.submittedDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <CheckIcon size={20} />
          <span className="font-medium">Internal training request submitted!</span>
        </div>
      )}
    </div>
  );
};

export default InternalTrainingForm;
