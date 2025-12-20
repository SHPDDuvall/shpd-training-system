import React, { useState, useEffect } from 'react';
import { TrainingOpportunity, User } from '@/types';
import { trainingService, attendanceService, TrainingAttendance, AttendanceStatus } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import {
  SearchIcon,
  CalendarIcon,
  XIcon,
  CheckIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
  GripIcon,
  ClockIcon,
  LocationIcon,
  ClipboardCheckIcon,
  UserCheckIcon,
  UserXIcon,
  MinusCircleIcon,
  UsersIcon,
} from '@/components/icons/Icons';

interface TrainingCalendarViewProps {
  trainings: TrainingOpportunity[];
  filteredTraining: TrainingOpportunity[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  trainingViewMode: 'list' | 'calendar';
  setTrainingViewMode: (mode: 'list' | 'calendar') => void;
  currentMonth: number;
  setCurrentMonth: (month: number) => void;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  showDayModal: boolean;
  setShowDayModal: (show: boolean) => void;
  draggedTraining: TrainingOpportunity | null;
  setDraggedTraining: (training: TrainingOpportunity | null) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  formatDate: (date: string) => string;
  handleOpenEditTrainingModal: (training: TrainingOpportunity) => void;
  handleOpenDeleteTrainingModal: (training: TrainingOpportunity) => void;
  setShowAddTrainingModal: (show: boolean) => void;
  trainingService: typeof trainingService;
  loadTrainings: () => Promise<void>;
}

const TrainingCalendarView: React.FC<TrainingCalendarViewProps> = ({
  trainings,
  filteredTraining,
  searchQuery,
  setSearchQuery,
  trainingViewMode,
  setTrainingViewMode,
  currentMonth,
  setCurrentMonth,
  currentYear,
  setCurrentYear,
  selectedDate,
  setSelectedDate,
  showDayModal,
  setShowDayModal,
  formatDate,
  handleOpenEditTrainingModal,
  handleOpenDeleteTrainingModal,
  setShowAddTrainingModal,
  loadTrainings,
}) => {
  const { user, allUsers } = useAuth();
  
  // Attendance Modal States
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedTrainingForAttendance, setSelectedTrainingForAttendance] = useState<TrainingOpportunity | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<TrainingAttendance[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState('');
  const [attendanceError, setAttendanceError] = useState('');
  
  // Local attendance state for editing
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getTrainingsForDate = (dateString: string) => {
    return trainings.filter(t => t.date === dateString);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (dateString: string) => {
    setSelectedDate(dateString);
    setShowDayModal(true);
  };

  const handleDragStart = (e: React.DragEvent, training: TrainingOpportunity) => {
    e.dataTransfer.setData('trainingId', training.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dateString: string) => {
    e.preventDefault();
    const trainingId = e.dataTransfer.getData('trainingId');
    if (trainingId) {
      await trainingService.update(trainingId, { date: dateString });
      await loadTrainings();
    }
  };

  // Attendance Functions
  const handleOpenAttendanceModal = async (training: TrainingOpportunity) => {
    setSelectedTrainingForAttendance(training);
    setShowAttendanceModal(true);
    setIsLoadingAttendance(true);
    setAttendanceError('');
    setAttendanceSuccess('');
    
    try {
      const records = await attendanceService.getByTraining(training.id);
      setAttendanceRecords(records);
      
      // Initialize local state
      const statusMap: Record<string, AttendanceStatus> = {};
      const notesMap: Record<string, string> = {};
      records.forEach(r => {
        statusMap[r.userId] = r.attendanceStatus;
        notesMap[r.userId] = r.notes || '';
      });
      setLocalAttendance(statusMap);
      setLocalNotes(notesMap);
    } catch (error) {
      setAttendanceError('Failed to load attendance records');
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const handleCloseAttendanceModal = () => {
    setShowAttendanceModal(false);
    setSelectedTrainingForAttendance(null);
    setAttendanceRecords([]);
    setLocalAttendance({});
    setLocalNotes({});
    setAttendanceSearchQuery('');
    setAttendanceError('');
    setAttendanceSuccess('');
  };

  const handleAttendanceChange = (userId: string, status: AttendanceStatus) => {
    setLocalAttendance(prev => ({ ...prev, [userId]: status }));
  };

  const handleNotesChange = (userId: string, notes: string) => {
    setLocalNotes(prev => ({ ...prev, [userId]: notes }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedTrainingForAttendance || !user) return;
    
    setIsSavingAttendance(true);
    setAttendanceError('');
    setAttendanceSuccess('');
    
    try {
      const updates = Object.entries(localAttendance).map(([userId, status]) => ({
        trainingId: selectedTrainingForAttendance.id,
        userId,
        attendanceStatus: status,
        notes: localNotes[userId] || undefined,
        markedBy: user.id,
      }));
      
      for (const update of updates) {
        await attendanceService.upsert(update);
      }
      
      // Reload attendance records
      const records = await attendanceService.getByTraining(selectedTrainingForAttendance.id);
      setAttendanceRecords(records);
      
      setAttendanceSuccess('Attendance saved successfully!');
      setTimeout(() => setAttendanceSuccess(''), 3000);
    } catch (error) {
      setAttendanceError('Failed to save attendance. Please try again.');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleMarkAllPresent = () => {
    const newAttendance: Record<string, AttendanceStatus> = {};
    allUsers.forEach(u => {
      newAttendance[u.id] = 'present';
    });
    setLocalAttendance(newAttendance);
  };

  const handleMarkAllAbsent = () => {
    const newAttendance: Record<string, AttendanceStatus> = {};
    allUsers.forEach(u => {
      newAttendance[u.id] = 'absent';
    });
    setLocalAttendance(newAttendance);
  };

  const handleExportAttendanceCSV = () => {
    if (!selectedTrainingForAttendance) return;
    
    const headers = ['Badge Number', 'Name', 'Department', 'Rank', 'Status', 'Check-In Time', 'Notes', 'Marked By', 'Marked At'];
    
    const rows = allUsers.map(u => {
      const record = attendanceRecords.find(r => r.userId === u.id);
      const status = localAttendance[u.id] || record?.attendanceStatus || 'pending';
      
      return [
        u.badgeNumber,
        `${u.firstName} ${u.lastName}`,
        u.department,
        u.rank,
        status,
        record?.checkInTime ? new Date(record.checkInTime).toLocaleString() : '',
        localNotes[u.id] || record?.notes || '',
        record?.markedByName || '',
        record?.markedAt ? new Date(record.markedAt).toLocaleString() : '',
      ].map(field => `"${field}"`).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedTrainingForAttendance.title.replace(/\s+/g, '_')}_${selectedTrainingForAttendance.date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsersForAttendance = allUsers.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
    u.badgeNumber.includes(attendanceSearchQuery) ||
    u.department.toLowerCase().includes(attendanceSearchQuery.toLowerCase())
  );

  const getAttendanceSummary = () => {
    const total = allUsers.length;
    let present = 0, absent = 0, excused = 0, pending = 0;
    
    allUsers.forEach(u => {
      const status = localAttendance[u.id] || 'pending';
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'excused') excused++;
      else pending++;
    });
    
    return { total, present, absent, excused, pending };
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Day headers
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={`header-${i}`} className="p-2 text-center text-sm font-semibold text-slate-600 border-b border-slate-200">
          {dayNames[i]}
        </div>
      );
    }

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 min-h-[100px] bg-slate-50 border-b border-r border-slate-200" />
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTrainings = getTrainingsForDate(dateString);
      const isToday = new Date().toISOString().split('T')[0] === dateString;

      days.push(
        <div
          key={day}
          className={`p-2 min-h-[100px] border-b border-r border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors ${
            isToday ? 'bg-amber-50' : ''
          }`}
          onClick={() => handleDateClick(dateString)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, dateString)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-amber-600' : 'text-slate-700'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayTrainings.slice(0, 3).map(training => (
              <div
                key={training.id}
                draggable
                onDragStart={(e) => handleDragStart(e, training)}
                className={`text-xs p-1 rounded truncate cursor-move ${
                  training.mandatory
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}
                title={training.title}
              >
                {training.title}
              </div>
            ))}
            {dayTrainings.length > 3 && (
              <div className="text-xs text-slate-500">+{dayTrainings.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search training courses..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setTrainingViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                trainingViewMode === 'list'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <ListIcon size={16} />
              List
            </button>
            <button
              onClick={() => setTrainingViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                trainingViewMode === 'calendar'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <CalendarIcon size={16} />
              Calendar
            </button>
          </div>
          <button
            onClick={() => setShowAddTrainingModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
          >
            <PlusIcon size={20} />
            Add Training
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {trainingViewMode === 'calendar' && (
        <div className="bg-white rounded-lg border border-slate-200">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <h3 className="text-lg font-semibold text-slate-800">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
              <span className="text-xs text-slate-600">Mandatory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
              <span className="text-xs text-slate-600">Optional</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <GripIcon size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500">Drag to reschedule</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {renderCalendar()}
          </div>
        </div>
      )}

      {/* List View */}
      {trainingViewMode === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Course</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Category</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Instructor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Capacity</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTraining.map((training) => (
                <tr key={training.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={training.image}
                        alt={training.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium text-slate-800">{training.title}</div>
                        <div className="text-sm text-slate-500">{training.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      {training.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(training.date)}</td>
                  <td className="py-3 px-4 text-slate-600">{training.instructor}</td>
                  <td className="py-3 px-4 text-slate-600">{training.enrolled}/{training.capacity}</td>
                  <td className="py-3 px-4">
                    {training.mandatory ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        Mandatory
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        Optional
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenAttendanceModal(training)}
                        className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Attendance"
                      >
                        <ClipboardCheckIcon size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenEditTrainingModal(training)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteTrainingModal(training)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTraining.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No training courses found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Day Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {formatDate(selectedDate)}
              </h2>
              <button
                onClick={() => setShowDayModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {getTrainingsForDate(selectedDate).length > 0 ? (
                getTrainingsForDate(selectedDate).map(training => (
                  <div
                    key={training.id}
                    className={`p-4 rounded-lg border ${
                      training.mandatory
                        ? 'bg-red-50 border-red-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800">{training.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                          <ClockIcon size={14} />
                          {training.time} • {training.duration}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                          <LocationIcon size={14} />
                          {training.location}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setShowDayModal(false);
                            handleOpenAttendanceModal(training);
                          }}
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Attendance"
                        >
                          <ClipboardCheckIcon size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setShowDayModal(false);
                            handleOpenEditTrainingModal(training);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          <EditIcon size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No training scheduled for this day
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedTrainingForAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Attendance Tracking</h2>
                <p className="text-sm text-slate-500">{selectedTrainingForAttendance.title} • {formatDate(selectedTrainingForAttendance.date)}</p>
              </div>
              <button
                onClick={handleCloseAttendanceModal}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Summary Stats */}
            {!isLoadingAttendance && (
              <div className="grid grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-700">{getAttendanceSummary().total}</div>
                  <div className="text-xs text-slate-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{getAttendanceSummary().present}</div>
                  <div className="text-xs text-slate-500">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{getAttendanceSummary().absent}</div>
                  <div className="text-xs text-slate-500">Absent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{getAttendanceSummary().excused}</div>
                  <div className="text-xs text-slate-500">Excused</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-400">{getAttendanceSummary().pending}</div>
                  <div className="text-xs text-slate-500">Pending</div>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-200">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={attendanceSearchQuery}
                  onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                  placeholder="Search personnel..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <UserCheckIcon size={16} />
                  All Present
                </button>
                <button
                  onClick={handleMarkAllAbsent}
                  className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <UserXIcon size={16} />
                  All Absent
                </button>
                <button
                  onClick={handleExportAttendanceCSV}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <DownloadIcon size={16} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Feedback Messages */}
            {attendanceError && (
              <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {attendanceError}
              </div>
            )}
            {attendanceSuccess && (
              <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <CheckIcon size={18} />
                {attendanceSuccess}
              </div>
            )}

            {/* Roster Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingAttendance ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">Personnel</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">Badge</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">Department</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-slate-600">Status</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-slate-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsersForAttendance.map((u) => {
                      const status = localAttendance[u.id] || 'pending';
                      return (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {u.avatar ? (
                                <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-medium">
                                  {u.firstName[0]}{u.lastName[0]}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-slate-800 text-sm">{u.rank} {u.firstName} {u.lastName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-sm">#{u.badgeNumber}</td>
                          <td className="py-3 px-3 text-slate-600 text-sm">{u.department}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleAttendanceChange(u.id, 'present')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  status === 'present'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600'
                                }`}
                                title="Present"
                              >
                                <UserCheckIcon size={16} />
                              </button>
                              <button
                                onClick={() => handleAttendanceChange(u.id, 'absent')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  status === 'absent'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600'
                                }`}
                                title="Absent"
                              >
                                <UserXIcon size={16} />
                              </button>
                              <button
                                onClick={() => handleAttendanceChange(u.id, 'excused')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  status === 'excused'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600'
                                }`}
                                title="Excused"
                              >
                                <MinusCircleIcon size={16} />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={localNotes[u.id] || ''}
                              onChange={(e) => handleNotesChange(u.id, e.target.value)}
                              placeholder="Add notes..."
                              className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handleCloseAttendanceModal}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isSavingAttendance ? (
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
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingCalendarView;
