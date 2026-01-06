import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService, certificateService } from '@/lib/database';
import { TrainingOpportunity, Certificate } from '@/types';
import {
  TrainingIcon,
  RequestIcon,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  AlertIcon,
  ChevronRightIcon,
  StarIcon,
  ReportIcon,
  BarChartIcon,
  BellIcon,
  CertificateIcon,
  RefreshIcon,
} from '@/components/icons/Icons';
import { 
  runAllNotificationGenerators 
} from '@/lib/notificationGenerator';

const heroImage = '/municipal-court-building.png?v=2';

interface DashboardProps {
  onViewChange: (view: string) => void;
}


const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { user, userRequests, allRequests, allUsers, refreshNotifications, unreadCount } = useAuth();
  const [trainings, setTrainings] = useState<TrainingOpportunity[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingNotifications, setIsGeneratingNotifications] = useState(false);
  const [expiringCertificates, setExpiringCertificates] = useState<Certificate[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [trainingData, certData] = await Promise.all([
        trainingService.getAll(),
        user ? certificateService.getByUser(user.id) : Promise.resolve([])
      ]);
      setTrainings(trainingData);
      setCertificates(certData);
      
      // Check for expiring certificates (within 60 days)
      const now = new Date();
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const expiring = certData.filter(cert => {
        if (!cert.expirationDate) return false;
        const expDate = new Date(cert.expirationDate);
        return expDate > now && expDate <= sixtyDaysFromNow;
      });
      setExpiringCertificates(expiring);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNotifications = async () => {
    if (!user) return;
    
    setIsGeneratingNotifications(true);
    try {
      const supervisorIds = allUsers
        .filter(u => u.role === 'supervisor' || u.role === 'administrator' || u.role === 'training_coordinator')
        .map(u => u.id);
      
      const accountingIds = allUsers
        .filter(u => u.role === 'accounting' || u.role === 'administrator')
        .map(u => u.id);

      await runAllNotificationGenerators(supervisorIds, accountingIds);
      await refreshNotifications();
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setIsGeneratingNotifications(false);
    }
  };

  const pendingRequests = userRequests.filter(r => 
    ['submitted', 'supervisor_review', 'admin_approval'].includes(r.status)
  ).length;

  const approvedRequests = userRequests.filter(r => r.status === 'approved').length;
  const completedTraining = userRequests.filter(r => r.status === 'completed').length;

  const upcomingTraining = trainings
    .filter(t => new Date(t.date) > new Date())
    .slice(0, 4);

  const mandatoryTraining = trainings.filter(t => t.mandatory);

  const pendingApprovals = user?.role === 'supervisor' || user?.role === 'administrator' || user?.role === 'training_coordinator'
    ? allRequests.filter(r => 
        (user.role === 'supervisor' && (r.status === 'submitted' || r.status === 'supervisor_review')) ||
        (user.role === 'administrator' && r.status === 'admin_approval') ||
        (user.role === 'training_coordinator' && r.status !== 'approved' && r.status !== 'denied' && r.status !== 'completed')
      ).length
    : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-700',
      supervisor_review: 'bg-amber-100 text-amber-700',
      admin_approval: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      scheduled: 'bg-cyan-100 text-cyan-700',
      completed: 'bg-slate-100 text-slate-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
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

  const getDaysUntilExpiration = (expirationDate: string) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    return Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden">
        <img
          src={heroImage}
          alt="Training Academy"
          className="w-full h-48 md:h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6 md:p-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-md">
              Stay on top of your professional development. Track your training requests and explore new opportunities.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => onViewChange('training')}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
              >
                Browse Training
                <ChevronRightIcon size={18} />
              </button>
              {unreadCount > 0 && (
                <span className="px-3 py-1.5 bg-red-500/90 text-white text-sm font-medium rounded-lg flex items-center gap-2">
                  <BellIcon size={16} />
                  {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="text-blue-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-slate-800">{pendingRequests}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Pending Requests</h3>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckIcon className="text-green-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-slate-800">{approvedRequests}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Approved</h3>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <StarIcon className="text-amber-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-slate-800">{completedTraining}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Completed</h3>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrainingIcon className="text-purple-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-slate-800">{trainings.length}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Available Courses</h3>
        </div>
      </div>

      {/* Certificate Expiration Warning */}
      {expiringCertificates.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CertificateIcon className="text-orange-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800">Certificate Expiration Warning</h3>
              <p className="text-sm text-orange-700 mt-1">
                You have {expiringCertificates.length} certificate{expiringCertificates.length > 1 ? 's' : ''} expiring soon:
              </p>
              <div className="mt-2 space-y-1">
                {expiringCertificates.slice(0, 3).map(cert => {
                  const daysLeft = getDaysUntilExpiration(cert.expirationDate!);
                  return (
                    <div key={cert.id} className="flex items-center justify-between text-sm">
                      <span className="text-orange-800">{cert.trainingTitle}</span>
                      <span className={`font-medium ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 30 ? 'text-orange-600' : 'text-amber-600'}`}>
                        {daysLeft} days left
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => onViewChange('profile')}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm"
            >
              View All
            </button>
          </div>
        </div>
      )}

      {/* Supervisor/Admin Alert */}
      {pendingApprovals > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertIcon className="text-amber-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">Pending Approvals</h3>
              <p className="text-sm text-amber-700">You have {pendingApprovals} request(s) awaiting your review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(user?.role === 'supervisor' || user?.role === 'administrator' || user?.role === 'training_coordinator') && (
              <button
                onClick={handleGenerateNotifications}
                disabled={isGeneratingNotifications}
                className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium rounded-lg transition-colors flex items-center gap-1.5 text-sm"
              >
                <RefreshIcon size={14} className={isGeneratingNotifications ? 'animate-spin' : ''} />
                Check Alerts
              </button>
            )}
            <button
              onClick={() => onViewChange('approvals')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
            >
              Review Now
            </button>
          </div>
        </div>
      )}


      {/* Reports Quick Access for Supervisors/Admins */}
      {(user?.role === 'supervisor' || user?.role === 'administrator' || user?.role === 'training_coordinator') && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <BarChartIcon className="text-slate-900" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Reports Dashboard</h3>
              <p className="text-slate-300 text-sm">View training statistics, compliance rates, and budget utilization</p>
            </div>
          </div>
          <button
            onClick={() => onViewChange('reports')}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition-colors inline-flex items-center gap-2 justify-center"
          >
            <ReportIcon size={18} />
            View Reports
          </button>
        </div>
      )}



      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Training */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Upcoming Training</h2>
            <button
              onClick={() => onViewChange('training')}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              View All
            </button>
          </div>
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingTraining.map((training) => (
                <div key={training.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4">
                    <img
                      src={training.image}
                      alt={training.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">{training.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarIcon size={14} />
                          {formatDate(training.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon size={14} />
                          {training.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          training.mandatory ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {training.mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {training.enrolled}/{training.capacity} enrolled
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingTraining.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No upcoming training available
                </div>
              )}
            </div>
          )}
        </div>

        {/* My Recent Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">My Recent Requests</h2>
            <button
              onClick={() => onViewChange('requests')}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {userRequests.length === 0 ? (
              <div className="p-8 text-center">
                <RequestIcon className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-500">No requests yet</p>
                <button
                  onClick={() => onViewChange('training')}
                  className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Browse available training
                </button>
              </div>
            ) : (
              userRequests.slice(0, 4).map((request) => (
                <div key={request.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-slate-800 truncate">{request.trainingTitle}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Submitted {formatDate(request.submittedDate)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Training Alert */}
      {mandatoryTraining.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertIcon className="text-red-500" size={20} />
              Mandatory Training Requirements
            </h2>
          </div>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mandatoryTraining.slice(0, 6).map((training) => (
              <div
                key={training.id}
                className="p-4 bg-red-50 border border-red-100 rounded-lg"
              >
                <h3 className="font-medium text-slate-800">{training.title}</h3>
                <p className="text-sm text-slate-600 mt-1">Due: {formatDate(training.date)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-red-600 font-medium">Required</span>
                  <button
                    onClick={() => onViewChange('training')}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
