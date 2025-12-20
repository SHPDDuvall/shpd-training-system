import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService, attendanceService, requestService, AttendanceStatus, TrainingAttendance } from '@/lib/database';
import { TrainingOpportunity, TrainingRequest, User } from '@/types';
import {
  SearchIcon,
  CalendarIcon,
  UsersIcon,
  CheckIcon,
  XIcon,
  DownloadIcon,
  ClockIcon,
  LocationIcon,
  ChevronLeftIcon,
  UserCheckIcon,
  UserXIcon,
  MinusCircleIcon,
  ClipboardCheckIcon,
  FilterIcon,
} from '@/components/icons/Icons';

interface AttendanceTrackingProps {
  trainings: TrainingOpportunity[];
  allUsers: User[];
}

const AttendanceTracking: React.FC<AttendanceTrackingProps> = ({ trainings, allUsers }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTraining, setSelectedTraining] = useState<TrainingOpportunity | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<TrainingAttendance[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<{ userId: string; userName: string; userBadge: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past' | 'today'>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent' | 'excused' | 'pending'>('all');

  // Attendance state for the roster
  const [rosterAttendance, setRosterAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [rosterNotes, setRosterNotes] = useState<Record<string, string>>({});

  // Filter trainings
  const filteredTrainings = trainings.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    const trainingDate = new Date(t.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let matchesDate = true;
    if (dateFilter === 'upcoming') {
      matchesDate = trainingDate >= today;
    } else if (dateFilter === 'past') {
      matchesDate = trainingDate < today;
    } else if (dateFilter === 'today') {
      matchesDate = trainingDate.toDateString() === today.toDateString();
    }

    return matchesSearch && matchesDate;
  });

  // Load attendance when training is selected
  useEffect(() => {
    if (selectedTraining) {
      loadAttendanceData();
    }
  }, [selectedTraining]);

  const loadAttendanceData = async () => {
    if (!selectedTraining) return;

    setIsLoading(true);
    try {
      // Get attendance records for this training
      const records = await attendanceService.getByTraining(selectedTraining.id);
      setAttendanceRecords(records);

      // Get enrolled users from training requests
      const allRequests = await requestService.getAll();
      const enrolledRequests = allRequests.filter(
        r => r.trainingId === selectedTraining.id && 
        (r.status === 'approved' || r.status === 'scheduled' || r.status === 'completed')
      );

      const enrolled = enrolledRequests.map(r => ({
        userId: r.userId,
        userName: r.userName,
        userBadge: r.userBadge,
      }));
      setEnrolledUsers(enrolled);

      // Initialize roster attendance state
      const attendanceMap: Record<string, AttendanceStatus> = {};
      const notesMap: Record<string, string> = {};

      enrolled.forEach(e => {
        const record = records.find(r => r.userId === e.userId);
        attendanceMap[e.userId] = record?.attendanceStatus || 'pending';
        notesMap[e.userId] = record?.notes || '';
      });

      setRosterAttendance(attendanceMap);
      setRosterNotes(notesMap);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendanceChange = (userId: string, status: AttendanceStatus) => {
    setRosterAttendance(prev => ({ ...prev, [userId]: status }));
  };

  const handleNotesChange = (userId: string, notes: string) => {
    setRosterNotes(prev => ({ ...prev, [userId]: notes }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedTraining || !user) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      for (const userId of Object.keys(rosterAttendance)) {
        await attendanceService.upsert({
          trainingId: selectedTraining.id,
          userId,
          attendanceStatus: rosterAttendance[userId],
          notes: rosterNotes[userId] || undefined,
          markedBy: user.id,
        });
      }

      setSaveSuccess(true);
      await loadAttendanceData();

      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAllPresent = () => {
    const newAttendance: Record<string, AttendanceStatus> = {};
    enrolledUsers.forEach(u => {
      newAttendance[u.userId] = 'present';
    });
    setRosterAttendance(newAttendance);
  };

  const handleMarkAllAbsent = () => {
    const newAttendance: Record<string, AttendanceStatus> = {};
    enrolledUsers.forEach(u => {
      newAttendance[u.userId] = 'absent';
    });
    setRosterAttendance(newAttendance);
  };

  const exportAttendanceToCSV = () => {
    if (!selectedTraining) return;

    const headers = ['Badge Number', 'Name', 'Status', 'Notes', 'Marked By', 'Marked At'];
    
    const rows = enrolledUsers.map(u => {
      const record = attendanceRecords.find(r => r.userId === u.userId);
      return [
        u.userBadge,
        u.userName,
        rosterAttendance[u.userId] || 'pending',
        rosterNotes[u.userId] || '',
        record?.markedByName || '',
        record?.markedAt ? new Date(record.markedAt).toLocaleString() : '',
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [
      `Training: ${selectedTraining.title}`,
      `Date: ${formatDate(selectedTraining.date)}`,
      `Instructor: ${selectedTraining.instructor}`,
      `Location: ${selectedTraining.location}`,
      '',
      headers.join(','),
      ...rows,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedTraining.title.replace(/\s+/g, '_')}_${selectedTraining.date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllAttendanceReport = async () => {
    const allAttendance = await attendanceService.getAll();

    const headers = ['Training', 'Date', 'Badge Number', 'Name', 'Status', 'Notes', 'Marked By', 'Marked At'];
    
    const rows = allAttendance.map(record => {
      const training = trainings.find(t => t.id === record.trainingId);
      return [
        training?.title || 'Unknown',
        training?.date || '',
        record.userBadge || '',
        record.userName || '',
        record.attendanceStatus,
        record.notes || '',
        record.markedByName || '',
        record.markedAt ? new Date(record.markedAt).toLocaleString() : '',
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [
      'Attendance Report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      headers.join(','),
      ...rows,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAttendanceSummary = () => {
    const values = Object.values(rosterAttendance);
    return {
      total: values.length,
      present: values.filter(v => v === 'present').length,
      absent: values.filter(v => v === 'absent').length,
      excused: values.filter(v => v === 'excused').length,
      pending: values.filter(v => v === 'pending').length,
    };
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-200';
      case 'absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'excused': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <UserCheckIcon size={16} className="text-green-600" />;
      case 'absent': return <UserXIcon size={16} className="text-red-600" />;
      case 'excused': return <MinusCircleIcon size={16} className="text-amber-600" />;
      default: return <ClockIcon size={16} className="text-slate-400" />;
    }
  };

  // Filter enrolled users based on attendance status
  const filteredEnrolledUsers = enrolledUsers.filter(u => {
    if (attendanceFilter === 'all') return true;
    return rosterAttendance[u.userId] === attendanceFilter;
  });

  if (selectedTraining) {
    const summary = getAttendanceSummary();

    return (
      <div className="space-y-6">
        {/* Back Button and Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedTraining(null)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon size={20} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800">{selectedTraining.title}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <CalendarIcon size={14} />
                {formatDate(selectedTraining.date)}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon size={14} />
                {selectedTraining.time}
              </span>
              <span className="flex items-center gap-1">
                <LocationIcon size={14} />
                {selectedTraining.location}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-2xl font-bold text-slate-700">{summary.total}</div>
            <div className="text-xs text-slate-500">Total Enrolled</div>
          </div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summary.present}</div>
            <div className="text-xs text-green-600">Present</div>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
            <div className="text-xs text-red-600">Absent</div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{summary.excused}</div>
            <div className="text-xs text-amber-600">Excused</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-2xl font-bold text-slate-500">{summary.pending}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg transition-colors"
            >
              Mark All Present
            </button>
            <button
              onClick={handleMarkAllAbsent}
              className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors"
            >
              Mark All Absent
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as typeof attendanceFilter)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
              <option value="pending">Pending</option>
            </select>
            <button
              onClick={exportAttendanceToCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <DownloadIcon size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckIcon size={18} />
            Attendance saved successfully!
          </div>
        )}

        {/* Roster Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : enrolledUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg">
            <UsersIcon size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No enrolled users</p>
            <p className="text-sm mt-1">No users have been approved for this training session.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Personnel</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Badge</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Attendance</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrolledUsers.map((enrolledUser) => {
                    const userDetails = allUsers.find(u => u.id === enrolledUser.userId);
                    const currentStatus = rosterAttendance[enrolledUser.userId] || 'pending';

                    return (
                      <tr key={enrolledUser.userId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {userDetails?.avatar ? (
                              <img
                                src={userDetails.avatar}
                                alt={enrolledUser.userName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm">
                                {enrolledUser.userName.split(' ').map(n => n[0]).join('')}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-slate-800">{enrolledUser.userName}</div>
                              {userDetails && (
                                <div className="text-xs text-slate-500">{userDetails.rank} • {userDetails.department}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">#{enrolledUser.userBadge}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleAttendanceChange(enrolledUser.userId, 'present')}
                              className={`p-2 rounded-lg border transition-colors ${
                                currentStatus === 'present'
                                  ? 'bg-green-100 border-green-300 text-green-700'
                                  : 'bg-white border-slate-200 text-slate-400 hover:bg-green-50 hover:border-green-200 hover:text-green-600'
                              }`}
                              title="Present"
                            >
                              <UserCheckIcon size={18} />
                            </button>
                            <button
                              onClick={() => handleAttendanceChange(enrolledUser.userId, 'absent')}
                              className={`p-2 rounded-lg border transition-colors ${
                                currentStatus === 'absent'
                                  ? 'bg-red-100 border-red-300 text-red-700'
                                  : 'bg-white border-slate-200 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                              }`}
                              title="Absent"
                            >
                              <UserXIcon size={18} />
                            </button>
                            <button
                              onClick={() => handleAttendanceChange(enrolledUser.userId, 'excused')}
                              className={`p-2 rounded-lg border transition-colors ${
                                currentStatus === 'excused'
                                  ? 'bg-amber-100 border-amber-300 text-amber-700'
                                  : 'bg-white border-slate-200 text-slate-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
                              }`}
                              title="Excused"
                            >
                              <MinusCircleIcon size={18} />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={rosterNotes[enrolledUser.userId] || ''}
                            onChange={(e) => handleNotesChange(enrolledUser.userId, e.target.value)}
                            placeholder="Add notes..."
                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Save Button */}
        {enrolledUsers.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon size={18} />
                  Save Attendance
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Attendance Tracking</h2>
          <p className="text-sm text-slate-500">Select a training session to manage attendance</p>
        </div>
        <button
          onClick={exportAllAttendanceReport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <DownloadIcon size={18} />
          Export Full Report
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search training sessions..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
      </div>

      {/* Training List */}
      <div className="grid gap-4">
        {filteredTrainings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg">
            <CalendarIcon size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No training sessions found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredTrainings.map((training) => {
            const trainingDate = new Date(training.date);
            const isPast = trainingDate < new Date();

            return (
              <div
                key={training.id}
                onClick={() => setSelectedTraining(training)}
                className="p-4 bg-white border border-slate-200 rounded-lg hover:border-amber-300 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={training.image}
                    alt={training.title}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-800">{training.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{training.instructor}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPast && (
                          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                            Past
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          training.mandatory
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {training.mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={14} />
                        {formatDate(training.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon size={14} />
                        {training.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <LocationIcon size={14} />
                        {training.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersIcon size={14} />
                        {training.enrolled}/{training.capacity}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ClipboardCheckIcon size={24} className="text-amber-500" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AttendanceTracking;
