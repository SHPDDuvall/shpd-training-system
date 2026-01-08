import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService, documentService } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { TrainingOpportunity, User, Platoon, PLATOON_OPTIONS } from '@/types';
import TrainingCalendarView from '@/components/TrainingCalendarView';
import AttendanceTracking from '@/components/AttendanceTracking';
import CustomTrainingRequestTab from '@/components/CustomTrainingRequestTab';
import BudgetManagement from '@/components/BudgetManagement';
import {
  AdminIcon,
  UsersIcon,
  TrainingIcon,
  SearchIcon,
  CalendarIcon,
  XIcon,
  CheckIcon,
  PlusIcon,
  EditIcon,
  KeyIcon,
  TrashIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
  GripIcon,
  ClockIcon,
  LocationIcon,
  ClipboardCheckIcon,
  CameraIcon,
  CustomRequestIcon,
  AccountingIcon,
} from '@/components/icons/Icons';


const trainingCategories = [
  'Tactical',
  'Firearms',
  'Communication',
  'Mental Health',
  'Vehicle Operations',
  'Legal',
  'Specialized',
  'Medical',
  'Investigation',
  'Community',
  'Administrative',
  'Leadership',
];


const AdminPanel: React.FC = () => {
  const { allRequests, allUsers, createUser, refreshUsers, updateUser, resetUserPassword, deleteUser } = useAuth();
  const [trainings, setTrainings] = useState<TrainingOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'training' | 'attendance' | 'custom' | 'budget'>('overview');

  const [searchQuery, setSearchQuery] = useState('');
  
  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState(false);

  
  // Edit User Modal State
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [updateUserError, setUpdateUserError] = useState('');
  const [updateUserSuccess, setUpdateUserSuccess] = useState(false);
  
  // Edit User Avatar State
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [isUploadingEditAvatar, setIsUploadingEditAvatar] = useState(false);
  const [showRemoveAvatarConfirm, setShowRemoveAvatarConfirm] = useState(false);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  // Training Image Upload State
  const [trainingImageFile, setTrainingImageFile] = useState<File | null>(null);
  const [trainingImagePreview, setTrainingImagePreview] = useState<string | null>(null);
  const [isUploadingTrainingImage, setIsUploadingTrainingImage] = useState(false);
  const trainingImageInputRef = useRef<HTMLInputElement>(null);
  
  // Reset Password Modal State
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  
  // Delete User Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Bulk Selection State
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActionsMenu, setShowBulkActionsMenu] = useState(false);
  
  // Bulk Action Modals State
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkRoleModal, setShowBulkRoleModal] = useState(false);
  const [showBulkDepartmentModal, setShowBulkDepartmentModal] = useState(false);
  const [bulkRole, setBulkRole] = useState<User['role']>('officer');
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkOperationError, setBulkOperationError] = useState('');
  const [bulkOperationSuccess, setBulkOperationSuccess] = useState('');

  // Training Modal States
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [showEditTrainingModal, setShowEditTrainingModal] = useState(false);
  const [showDeleteTrainingModal, setShowDeleteTrainingModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingOpportunity | null>(null);
  const [deletingTraining, setDeletingTraining] = useState<TrainingOpportunity | null>(null);
  const [isProcessingTraining, setIsProcessingTraining] = useState(false);
  const [trainingError, setTrainingError] = useState('');
  const [trainingSuccess, setTrainingSuccess] = useState(false);

  // Calendar View States
  const [trainingViewMode, setTrainingViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [draggedTraining, setDraggedTraining] = useState<TrainingOpportunity | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  
  // New user form state
  const [newUser, setNewUser] = useState({
    badgeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'officer' as User['role'],
    department: '',
    rank: '',
    phone: '',
    hireDate: '',
    supervisorId: '',
    password: '',
    platoon: '' as Platoon,
  });

  // Edit user form state
  const [editUserForm, setEditUserForm] = useState({
    badgeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'officer' as User['role'],
    department: '',
    rank: '',
    phone: '',
    supervisorId: '',
    hireDate: '',
    platoon: '' as Platoon,
  });

  // New training form state
  const [newTraining, setNewTraining] = useState({
    title: '',
    description: '',
    category: 'Tactical',
    instructor: '',
    date: '',
    time: '08:00 AM',
    duration: '',
    location: '',
    capacity: 20,
    credits: 4,
    mandatory: false,
    prerequisites: '',
    image: 'https://d64gsuwffb70l.cloudfront.net/6940ef621ce90c17a6f6ce0a_1765863895272_3ccab1a6.jpg',
  });

  // Handle training image selection (force rebuild)
  const handleTrainingImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTrainingImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setTrainingImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload training image
  const uploadTrainingImage = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingTrainingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('training-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('training-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploadingTrainingImage(false);
    }
  };

  // Edit training form state
  const [editTrainingForm, setEditTrainingForm] = useState({
    title: '',
    description: '',
    category: 'Tactical',
    instructor: '',
    date: '',
    time: '08:00 AM',
    duration: '',
    location: '',
    capacity: 20,
    credits: 4,
    mandatory: false,
    prerequisites: '',
    image: '',
  });

  useEffect(() => {
    loadTrainings();
  }, []);

  // Clear selection when search changes
  useEffect(() => {
    setSelectedUsers(new Set());
  }, [searchQuery]);

  const loadTrainings = async () => {
    setIsLoading(true);
    try {
      const data = await trainingService.getAll();
      setTrainings(data);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalUsers: allUsers.length,
    totalTraining: trainings.length,
    pendingRequests: allRequests.filter(r => ['submitted', 'supervisor_review', 'admin_approval'].includes(r.status)).length,
    approvedRequests: allRequests.filter(r => r.status === 'approved' || r.status === 'scheduled').length,
    completedTraining: allRequests.filter(r => r.status === 'completed').length,
    deniedRequests: allRequests.filter(r => r.status === 'denied').length,
  };

  const filteredUsers = allUsers.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.badgeNumber.includes(searchQuery) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTraining = trainings.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.instructor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Selection handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(userId)) {
        newSelection.delete(userId);
      } else {
        newSelection.add(userId);
      }
      return newSelection;
    });
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  // Add user handlers
  const handleAddUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setCreateUserError('');
    setCreateUserSuccess(false);

    try {
      const result = await createUser(newUser);
      if (result) {
        setCreateUserSuccess(true);
        setNewUser({
          badgeNumber: '',
          firstName: '',
          lastName: '',
          email: '',
          role: 'officer',
          department: '',
          rank: '',
          phone: '',
          hireDate: '',
          supervisorId: '',
          password: '',
          platoon: '' as Platoon,
        });
        setTimeout(() => {
          setShowAddUserModal(false);
          setCreateUserSuccess(false);
        }, 2000);
      } else {
        setCreateUserError('Failed to create user. Badge number or email may already exist.');
      }
    } catch (error) {
      setCreateUserError('An unexpected error occurred.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Edit user handlers
  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      badgeNumber: user.badgeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
      rank: user.rank,
      phone: user.phone,
      supervisorId: user.supervisorId || '',
      hireDate: user.hireDate || '',
      platoon: user.platoon || '' as Platoon,
    });
    setEditAvatarFile(null);
    setEditAvatarPreview(user.avatar || null);
    setShowEditUserModal(true);
  };

  const handleEditUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditUserForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingUser(true);
    setUpdateUserError('');
    setUpdateUserSuccess(false);

    try {
      let avatarUrl = editingUser.avatar;

      if (editAvatarFile) {
        setIsUploadingEditAvatar(true);
        const fileExt = editAvatarFile.name.split('.').pop();
        const fileName = `${editingUser.id}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-profiles')
          .upload(filePath, editAvatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('user-profiles').getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
        setIsUploadingEditAvatar(false);
      }

      const result = await updateUser(editingUser.id, { ...editUserForm, avatar: avatarUrl });
      if (result) {
        setUpdateUserSuccess(true);
        setTimeout(() => {
          setShowEditUserModal(false);
          setUpdateUserSuccess(false);
        }, 2000);
      } else {
        setUpdateUserError('Failed to update user.');
      }
    } catch (error) {
      setUpdateUserError('An unexpected error occurred.');
    } finally {
      setIsUpdatingUser(false);
    }
  };
  
  const handleRemoveAvatar = async () => {
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      const result = await updateUser(editingUser.id, { avatar: '' });
      if (result) {
        setEditAvatarPreview(null);
        if (editingUser) {
          setEditingUser({ ...editingUser, avatar: '' });
        }
      }
    } finally {
      setIsUpdatingUser(false);
      setShowRemoveAvatarConfirm(false);
    }
  };

  // Reset password handlers
  const openResetPasswordModal = (user: User) => {
    setResetPasswordUser(user);
    setShowResetPasswordModal(true);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordError('');
    setResetPasswordSuccess(false);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || newPassword !== confirmPassword || !newPassword) {
      setResetPasswordError('Passwords do not match or are empty.');
      return;
    }

    setIsResettingPassword(true);
    setResetPasswordError('');
    setResetPasswordSuccess(false);

    try {
      const success = await resetUserPassword(resetPasswordUser.id, newPassword);
      if (success) {
        setResetPasswordSuccess(true);
        setTimeout(() => {
          setShowResetPasswordModal(false);
        }, 2000);
      } else {
        setResetPasswordError('Failed to reset password.');
      }
    } catch (error) {
      setResetPasswordError('An unexpected error occurred.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Delete user handlers
  const openDeleteConfirm = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeletingUser(true);
    try {
      await deleteUser(deletingUser.id);
      setShowDeleteConfirm(false);
      setDeletingUser(null);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    setIsBulkProcessing(true);
    setBulkOperationError('');
    setBulkOperationSuccess('');
    try {
      for (const userId of selectedUsers) {
        await deleteUser(userId);
      }
      setBulkOperationSuccess(`${selectedUsers.size} users deleted successfully.`);
      setSelectedUsers(new Set());
    } catch (error) {
      setBulkOperationError('Error deleting users.');
    } finally {
      setIsBulkProcessing(false);
      setShowBulkDeleteModal(false);
    }
  };

  const handleBulkRoleChange = async () => {
    setIsBulkProcessing(true);
    setBulkOperationError('');
    setBulkOperationSuccess('');
    try {
      for (const userId of selectedUsers) {
        await updateUser(userId, { role: bulkRole });
      }
      setBulkOperationSuccess(`Role updated for ${selectedUsers.size} users.`);
      setSelectedUsers(new Set());
    } catch (error) {
      setBulkOperationError('Error updating roles.');
    } finally {
      setIsBulkProcessing(false);
      setShowBulkRoleModal(false);
    }
  };

  const handleBulkDepartmentChange = async () => {
    setIsBulkProcessing(true);
    setBulkOperationError('');
    setBulkOperationSuccess('');
    try {
      for (const userId of selectedUsers) {
        await updateUser(userId, { department: bulkDepartment });
      }
      setBulkOperationSuccess(`Department updated for ${selectedUsers.size} users.`);
      setSelectedUsers(new Set());
    } catch (error) {
      setBulkOperationError('Error updating departments.');
    } finally {
      setIsBulkProcessing(false);
      setShowBulkDepartmentModal(false);
    }
  };

  // Training handlers
  const handleAddTrainingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = (e.target as HTMLInputElement).checked;

    setNewTraining(prev => ({ 
      ...prev, 
      [name]: isCheckbox ? checked : value 
    }));
  };

  const handleAddTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingTraining(true);
    setTrainingError('');
    setTrainingSuccess(false);

    try {
      if (!newTraining.title || !newTraining.category || !newTraining.instructor || !newTraining.date || !newTraining.duration || !newTraining.location) {
        setTrainingError('Please fill in all required fields');
        setIsProcessingTraining(false);
        return;
      }

      let imageUrl = newTraining.image;

      // Upload image if selected
      if (trainingImageFile) {
        const uploadedUrl = await uploadTrainingImage(trainingImageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      const prerequisitesArray = newTraining.prerequisites
        ? newTraining.prerequisites.split(',').map(p => p.trim()).filter(p => p)
        : [];

      const result = await trainingService.create({
        title: newTraining.title,
        description: newTraining.description,
        category: newTraining.category,
        instructor: newTraining.instructor,
        date: newTraining.date,
        time: newTraining.time,
        duration: newTraining.duration,
        location: newTraining.location,
        capacity: newTraining.capacity,
        enrolled: 0,
        prerequisites: prerequisitesArray,
        image: imageUrl,
        credits: newTraining.credits,
        mandatory: newTraining.mandatory,
      });

      if (result) {
        setTrainingSuccess(true);
        setTrainings(prev => [...prev, result]);
        setNewTraining({
          title: '',
          description: '',
          category: 'Tactical',
          instructor: '',
          date: '',
          time: '08:00 AM',
          duration: '',
          location: '',
          capacity: 20,
          credits: 4,
          mandatory: false,
          prerequisites: '',
          image: 'https://d64gsuwffb70l.cloudfront.net/6940ef621ce90c17a6f6ce0a_1765863895272_3ccab1a6.jpg',
        });
        setTrainingImageFile(null);
        setTrainingImagePreview(null);
        setTimeout(() => {
          setShowAddTrainingModal(false);
          setTrainingSuccess(false);
        }, 2000);
      } else {
        setTrainingError('Failed to create training.');
      }
    } catch (error) {
      setTrainingError('An unexpected error occurred.');
    } finally {
      setIsProcessingTraining(false);
    }
  };

  const openEditTrainingModal = (training: TrainingOpportunity) => {
    setEditingTraining(training);
    setEditTrainingForm({
      title: training.title,
      description: training.description,
      category: training.category,
      instructor: training.instructor,
      date: training.date,
      time: training.time,
      duration: training.duration,
      location: training.location,
      capacity: training.capacity,
      credits: training.credits,
      mandatory: training.mandatory,
      prerequisites: Array.isArray(training.prerequisites) ? training.prerequisites.join(', ') : '',
      image: training.image,
    });
    setTrainingImageFile(null);
    setTrainingImagePreview(training.image);
    setShowEditTrainingModal(true);
  };

  const handleEditTrainingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = (e.target as HTMLInputElement).checked;

    setEditTrainingForm(prev => ({ 
      ...prev, 
      [name]: isCheckbox ? checked : value 
    }));
  };

  const handleUpdateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTraining) return;

    setIsProcessingTraining(true);
    setTrainingError('');
    setTrainingSuccess(false);

    try {
      let imageUrl = editTrainingForm.image;

      if (trainingImageFile) {
        const uploadedUrl = await uploadTrainingImage(trainingImageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      const prerequisitesArray = editTrainingForm.prerequisites
        ? editTrainingForm.prerequisites.split(',').map(p => p.trim()).filter(p => p)
        : [];

      const result = await trainingService.update(editingTraining.id, {
        ...editTrainingForm,
        prerequisites: prerequisitesArray,
        image: imageUrl,
      });

      if (result) {
        setTrainingSuccess(true);
        setTrainings(prev => prev.map(t => t.id === editingTraining.id ? result : t));
        setTimeout(() => {
          setShowEditTrainingModal(false);
          setTrainingSuccess(false);
        }, 2000);
      } else {
        setTrainingError('Failed to update training.');
      }
    } catch (error) {
      setTrainingError('An unexpected error occurred.');
    } finally {
      setIsProcessingTraining(false);
    }
  };

  const openDeleteTrainingModal = (training: TrainingOpportunity) => {
    setDeletingTraining(training);
    setShowDeleteTrainingModal(true);
  };

  const handleDeleteTraining = async () => {
    if (!deletingTraining) return;

    setIsProcessingTraining(true);
    try {
      await trainingService.delete(deletingTraining.id);
      setTrainings(prev => prev.filter(t => t.id !== deletingTraining.id));
      setShowDeleteTrainingModal(false);
      setDeletingTraining(null);
    } finally {
      setIsProcessingTraining(false);
    }
  };

  // Calendar handlers
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setShowDayModal(true);
  };

  const handleMonthChange = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(y => y + 1);
      } else {
        setCurrentMonth(m => m + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(y => y - 1);
      } else {
        setCurrentMonth(m => m - 1);
      }
    }
  };

  const handleDrop = async (item: TrainingOpportunity, newDate: string) => {
    try {
      const updatedTraining = await trainingService.update(item.id, { date: newDate });
      if (updatedTraining) {
        setTrainings(prev => prev.map(t => t.id === item.id ? updatedTraining : t));
      }
    } catch (error) {
      console.error("Failed to update training date on drop", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const supervisors = allUsers.filter(u => u.role === 'supervisor' || u.role === 'administrator');

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Admin Controls</h1>
          <p className="text-slate-600 mt-1">Manage users, training, and system settings</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard icon={<UsersIcon />} title="Total Users" value={stats.totalUsers} />
          <StatCard icon={<TrainingIcon />} title="Total Courses" value={stats.totalTraining} />
          <StatCard icon={<ClockIcon />} title="Pending" value={stats.pendingRequests} color="blue" />
          <StatCard icon={<CheckIcon />} title="Approved" value={stats.approvedRequests} color="green" />
          <StatCard icon={<ClipboardCheckIcon />} title="Completed" value={stats.completedTraining} color="slate" />
          <StatCard icon={<XIcon />} title="Denied" value={stats.deniedRequests} color="red" />
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
            <TabButton name="overview" activeTab={activeTab} setActiveTab={setActiveTab} icon={<AdminIcon />}>Overview</TabButton>
            <TabButton name="users" activeTab={activeTab} setActiveTab={setActiveTab} icon={<UsersIcon />}>User Management</TabButton>
            <TabButton name="training" activeTab={activeTab} setActiveTab={setActiveTab} icon={<TrainingIcon />}>Training Management</TabButton>
            <TabButton name="attendance" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ClipboardCheckIcon />}>Attendance Tracking</TabButton>
            <TabButton name="custom" activeTab={activeTab} setActiveTab={setActiveTab} icon={<CustomRequestIcon />}>Custom Requests</TabButton>
            <TabButton name="budget" activeTab={activeTab} setActiveTab={setActiveTab} icon={<AccountingIcon />}>Budget & Accounting</TabButton>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  {allRequests.slice(0, 5).map(request => (
                    <div key={request.id} className="flex items-center space-x-4 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <img className="h-10 w-10 rounded-full object-cover" src={request.user?.avatar || 'https://via.placeholder.com/150'} alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {request.user?.firstName} {request.user?.lastName}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          Requested "{request.training?.title || request.courseName}"
                        </p>
                      </div>
                      <div className="text-sm text-slate-500 text-right">
                        <p>{new Date(request.createdAt).toLocaleDateString()}</p>
                        <StatusBadge status={request.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Upcoming Training</h2>
                <div className="space-y-4">
                  {trainings.filter(t => new Date(t.date) >= new Date()).slice(0, 5).map(training => (
                    <div key={training.id} className="flex items-center space-x-4 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-shrink-0 h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{training.title}</p>
                        <p className="text-sm text-slate-500 truncate">{training.location}</p>
                      </div>
                      <div className="text-sm text-slate-500 text-right font-medium">
                        {formatDate(training.date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              {/* User Management Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">User Management</h2>
                  <p className="text-slate-600 mt-1">Total {allUsers.length} users</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                  >
                    <PlusIcon size={20} />
                    Add User
                  </button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm font-medium text-amber-800">{selectedUsers.size} users selected</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowBulkRoleModal(true)} className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50">Change Role</button>
                    <button onClick={() => setShowBulkDepartmentModal(true)} className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50">Change Department</button>
                    <button onClick={() => setShowBulkDeleteModal(true)} className="px-3 py-1.5 text-sm bg-red-100 text-red-700 border border-red-200 rounded-md hover:bg-red-200">Delete</button>
                  </div>
                </div>
              )}

              {/* User Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                    <tr>
                      <th scope="col" className="p-4">
                        <div className="flex items-center">
                          <input 
                            id="checkbox-all-users"
                            type="checkbox" 
                            className="w-4 h-4 text-amber-600 bg-slate-100 border-slate-300 rounded focus:ring-amber-500"
                            checked={selectedUsers.size > 0 && selectedUsers.size === filteredUsers.length}
                            onChange={handleSelectAllUsers}
                          />
                          <label htmlFor="checkbox-all-users" className="sr-only">checkbox</label>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3">User</th>
                      <th scope="col" className="px-6 py-3">Badge #</th>
                      <th scope="col" className="px-6 py-3">Department</th>
                      <th scope="col" className="px-6 py-3">Rank</th>
                      <th scope="col" className="px-6 py-3">Role</th>
                      <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="bg-white border-b hover:bg-slate-50">
                        <td className="w-4 p-4">
                          <div className="flex items-center">
                            <input 
                              id={`checkbox-user-${user.id}`}
                              type="checkbox" 
                              className="w-4 h-4 text-amber-600 bg-slate-100 border-slate-300 rounded focus:ring-amber-500"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                            />
                            <label htmlFor={`checkbox-user-${user.id}`} className="sr-only">checkbox</label>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img className="h-10 w-10 rounded-full object-cover" src={user.avatar || 'https://via.placeholder.com/150'} alt={`${user.firstName} ${user.lastName}`} />
                            <div>
                              <div className="font-semibold text-slate-800">{user.firstName} {user.lastName}</div>
                              <div className="text-slate-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{user.badgeNumber}</td>
                        <td className="px-6 py-4">{user.department}</td>
                        <td className="px-6 py-4">{user.rank || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${{
                            officer: 'bg-blue-100 text-blue-800',
                            supervisor: 'bg-purple-100 text-purple-800',
                            training_coordinator: 'bg-amber-100 text-amber-800',
                            administrator: 'bg-green-100 text-green-800',
                          }[user.role]}`}>
                            {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button onClick={() => openEditUserModal(user)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><EditIcon size={18} /></button>
                            <button onClick={() => openResetPasswordModal(user)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><KeyIcon size={18} /></button>
                            <button onClick={() => openDeleteConfirm(user)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><TrashIcon size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <div>
              {/* Training Management Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Training Management</h2>
                  <p className="text-slate-600 mt-1">Total {trainings.length} courses</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search courses..."
                      className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div className="p-1 bg-slate-100 rounded-lg">
                    <button 
                      onClick={() => setTrainingViewMode('list')} 
                      className={`px-2 py-1 rounded-md ${trainingViewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>
                      <ListIcon className="text-slate-600" />
                    </button>
                    <button 
                      onClick={() => setTrainingViewMode('calendar')} 
                      className={`px-2 py-1 rounded-md ${trainingViewMode === 'calendar' ? 'bg-white shadow-sm' : ''}`}>
                      <GripIcon className="text-slate-600" />
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

              {trainingViewMode === 'list' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-3">Course</th>
                        <th scope="col" className="px-6 py-3">Category</th>
                        <th scope="col" className="px-6 py-3">Date</th>
                        <th scope="col" className="px-6 py-3">Instructor</th>
                        <th scope="col" className="px-6 py-3">Enrolled</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTraining.map(training => (
                        <tr key={training.id} className="bg-white border-b hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{training.title}</td>
                          <td className="px-6 py-4">{training.category}</td>
                          <td className="px-6 py-4">{formatDate(training.date)}</td>
                          <td className="px-6 py-4">{training.instructor}</td>
                          <td className="px-6 py-4">{training.enrolled} / {training.capacity}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${training.mandatory ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                              {training.mandatory ? 'Mandatory' : 'Optional'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button onClick={() => openEditTrainingModal(training)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><EditIcon size={18} /></button>
                              <button onClick={() => openDeleteTrainingModal(training)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><TrashIcon size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <TrainingCalendarView 
                  trainings={trainings}
                  onDateClick={handleDateClick}
                  onEventDrop={handleDrop}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  onMonthChange={handleMonthChange}
                />
              )}
            </div>
          )}

          {activeTab === 'attendance' && <AttendanceTracking trainings={trainings} allUsers={allUsers} />}
          {activeTab === 'custom' && <CustomTrainingRequestTab />}
          {activeTab === 'budget' && <BudgetManagement />}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateUser}>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Add New User</h2>
                <button type="button" onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><XIcon /></button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                  <input type="text" name="firstName" value={newUser.firstName} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                  <input type="text" name="lastName" value={newUser.lastName} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Badge Number *</label>
                  <input type="text" name="badgeNumber" value={newUser.badgeNumber} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                  <input type="email" name="email" value={newUser.email} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" name="password" value={newUser.password} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Default: Badge Number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="tel" name="phone" value={newUser.phone} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input type="text" name="department" value={newUser.department} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rank</label>
                  <input type="text" name="rank" value={newUser.rank} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                  <select name="role" value={newUser.role} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" required>
                    <option value="officer">Officer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="training_coordinator">Training Coordinator</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supervisor</label>
                  <select name="supervisorId" value={newUser.supervisorId} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="">None</option>
                    {supervisors.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                  <input type="date" name="hireDate" value={newUser.hireDate} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Platoon</label>
                  <select name="platoon" value={newUser.platoon} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="">Not Applicable</option>
                    {PLATOON_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-4">
                {createUserError && <p className="text-sm text-red-500">{createUserError}</p>}
                {createUserSuccess && <p className="text-sm text-green-500 flex items-center gap-2"><CheckIcon /> User created successfully!</p>}
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg">Cancel</button>
                <button type="submit" disabled={isCreatingUser} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:bg-amber-300">
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdateUser}>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Edit User: {editingUser.firstName} {editingUser.lastName}</h2>
                <button type="button" onClick={() => setShowEditUserModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><XIcon /></button>
              </div>
              <div className="p-6 flex flex-col lg:flex-row gap-8">
                {/* Avatar Section */}
                <div className="flex-shrink-0 lg:w-1/3">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Profile Picture</h3>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-40 h-40 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                      {editAvatarPreview ? (
                        <img src={editAvatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                      ) : (
                        <UsersIcon className="text-slate-400" size={80} />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editAvatarInputRef.current?.click()} className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50">Change</button>
                      <input 
                        type="file" 
                        ref={editAvatarInputRef} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setEditAvatarFile(e.target.files[0]);
                            setEditAvatarPreview(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                        className="hidden" 
                        accept="image/*"
                      />
                      {editingUser.avatar && (
                        <button type="button" onClick={() => setShowRemoveAvatarConfirm(true)} className="px-4 py-2 text-sm bg-red-100 text-red-700 border border-red-200 rounded-md hover:bg-red-200">Remove</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                    <input type="text" name="firstName" value={editUserForm.firstName} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                    <input type="text" name="lastName" value={editUserForm.lastName} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Badge Number *</label>
                    <input type="text" name="badgeNumber" value={editUserForm.badgeNumber} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                    <input type="email" name="email" value={editUserForm.email} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input type="tel" name="phone" value={editUserForm.phone} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <input type="text" name="department" value={editUserForm.department} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rank</label>
                    <input type="text" name="rank" value={editUserForm.rank} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                    <select name="role" value={editUserForm.role} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" required>
                      <option value="officer">Officer</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="training_coordinator">Training Coordinator</option>
                      <option value="administrator">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Supervisor</label>
                    <select name="supervisorId" value={editUserForm.supervisorId} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                      <option value="">None</option>
                      {supervisors.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                    <input type="date" name="hireDate" value={editUserForm.hireDate} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Platoon</label>
                    <select name="platoon" value={editUserForm.platoon} onChange={handleEditUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                      <option value="">Not Applicable</option>
                      {PLATOON_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-4">
                {updateUserError && <p className="text-sm text-red-500">{updateUserError}</p>}
                {updateUserSuccess && <p className="text-sm text-green-500 flex items-center gap-2"><CheckIcon /> User updated successfully!</p>}
                <button type="button" onClick={() => setShowEditUserModal(false)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg">Cancel</button>
                <button type="submit" disabled={isUpdatingUser || isUploadingEditAvatar} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:bg-amber-300">
                  {isUpdatingUser ? 'Saving...' : (isUploadingEditAvatar ? 'Uploading...' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Training Modal */}
      {showAddTrainingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleAddTraining}>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Add New Training</h2>
                <button type="button" onClick={() => setShowAddTrainingModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><XIcon /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Image */}
                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="w-full aspect-video rounded-lg bg-slate-100 mb-4 overflow-hidden flex items-center justify-center">
                    {trainingImagePreview ? (
                      <img src={trainingImagePreview} alt="Training preview" className="w-full h-full object-cover" />
                    ) : (
                      <CameraIcon className="text-slate-400" size={48} />
                    )}
                  </div>
                  <button type="button" onClick={() => trainingImageInputRef.current?.click()} className="w-full px-4 py-2 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50">Upload Image</button>
                  <input 
                    type="file" 
                    ref={trainingImageInputRef} 
                    onChange={handleTrainingImageSelect}
                    className="hidden" 
                    accept="image/*"
                  />
                </div>

                {/* Right Column: Form Fields */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                    <input type="text" name="title" value={newTraining.title} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea name="description" value={newTraining.description} onChange={handleAddTrainingInputChange} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <select name="category" value={newTraining.category} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" required>
                      {trainingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instructor *</label>
                    <input type="text" name="instructor" value={newTraining.instructor} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                    <input type="date" name="date" value={newTraining.date} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
                    <input type="text" name="time" value={newTraining.time} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration *</label>
                    <input type="text" name="duration" value={newTraining.duration} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required placeholder="e.g., 8 hours" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
                    <input type="text" name="location" value={newTraining.location} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                    <input type="number" name="capacity" value={newTraining.capacity} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Credits</label>
                    <input type="number" name="credits" value={newTraining.credits} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prerequisites</label>
                    <input type="text" name="prerequisites" value={newTraining.prerequisites} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Comma-separated, e.g., CPR Certified" />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input type="checkbox" name="mandatory" id="mandatory-add" checked={newTraining.mandatory} onChange={handleAddTrainingInputChange} className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500" />
                    <label htmlFor="mandatory-add" className="text-sm font-medium text-slate-700">This training is mandatory</label>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-4">
                {trainingError && <p className="text-sm text-red-500">{trainingError}</p>}
                {trainingSuccess && <p className="text-sm text-green-500 flex items-center gap-2"><CheckIcon /> Training created successfully!</p>}
                <button type="button" onClick={() => setShowAddTrainingModal(false)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg">Cancel</button>
                <button type="submit" disabled={isProcessingTraining} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:bg-amber-300">
                  {isProcessingTraining ? 'Creating...' : 'Create Training'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Training Modal */}
      {showEditTrainingModal && editingTraining && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdateTraining}>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Edit Training</h2>
                <button type="button" onClick={() => setShowEditTrainingModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><XIcon /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Image */}
                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="w-full aspect-video rounded-lg bg-slate-100 mb-4 overflow-hidden flex items-center justify-center">
                    {trainingImagePreview ? (
                      <img src={trainingImagePreview} alt="Training preview" className="w-full h-full object-cover" />
                    ) : (
                      <CameraIcon className="text-slate-400" size={48} />
                    )}
                  </div>
                  <button type="button" onClick={() => trainingImageInputRef.current?.click()} className="w-full px-4 py-2 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50">Change Image</button>
                  <input 
                    type="file" 
                    ref={trainingImageInputRef} 
                    onChange={handleTrainingImageSelect}
                    className="hidden" 
                    accept="image/*"
                  />
                </div>

                {/* Right Column: Form Fields */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                    <input type="text" name="title" value={editTrainingForm.title} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea name="description" value={editTrainingForm.description} onChange={handleEditTrainingInputChange} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <select name="category" value={editTrainingForm.category} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" required>
                      {trainingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instructor *</label>
                    <input type="text" name="instructor" value={editTrainingForm.instructor} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                    <input type="date" name="date" value={editTrainingForm.date} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
                    <input type="text" name="time" value={editTrainingForm.time} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration *</label>
                    <input type="text" name="duration" value={editTrainingForm.duration} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
                    <input type="text" name="location" value={editTrainingForm.location} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                    <input type="number" name="capacity" value={editTrainingForm.capacity} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Credits</label>
                    <input type="number" name="credits" value={editTrainingForm.credits} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prerequisites</label>
                    <input type="text" name="prerequisites" value={editTrainingForm.prerequisites} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Comma-separated" />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input type="checkbox" name="mandatory" id="mandatory-edit" checked={editTrainingForm.mandatory} onChange={handleEditTrainingInputChange} className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500" />
                    <label htmlFor="mandatory-edit" className="text-sm font-medium text-slate-700">This training is mandatory</label>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-4">
                {trainingError && <p className="text-sm text-red-500">{trainingError}</p>}
                {trainingSuccess && <p className="text-sm text-green-500 flex items-center gap-2"><CheckIcon /> Training updated successfully!</p>}
                <button type="button" onClick={() => setShowEditTrainingModal(false)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg">Cancel</button>
                <button type="submit" disabled={isProcessingTraining} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:bg-amber-300">
                  {isProcessingTraining ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Training Modal */}
      {showDeleteTrainingModal && deletingTraining && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center">
                <TrashIcon className="text-red-600" size={32} />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-800">Delete Training</h2>
              <p className="mt-2 text-slate-600">Are you sure you want to delete "{deletingTraining.title}"? This action cannot be undone.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex justify-center gap-4">
              <button onClick={() => setShowDeleteTrainingModal(false)} className="px-6 py-2.5 bg-slate-200 text-slate-700 font-medium rounded-lg">Cancel</button>
              <button onClick={handleDeleteTraining} disabled={isProcessingTraining} className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg disabled:bg-red-400">
                {isProcessingTraining ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteConfirm && deletingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center">
                <UsersIcon className="text-red-600" size={32} />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-800">Delete User</h2>
              <p className="mt-2 text-slate-600">Are you sure you want to delete {deletingUser.firstName} {deletingUser.lastName}? This will permanently remove their account and data.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex justify-center gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2.5 bg-slate-200 text-slate-700 font-medium rounded-lg">Cancel</button>
              <button onClick={handleDeleteUser} disabled={isDeletingUser} className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg disabled:bg-red-400">
                {isDeletingUser ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800">Reset Password</h2>
              <p className="mt-1 text-slate-600">for {resetPasswordUser.firstName} {resetPasswordUser.lastName}</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              {resetPasswordError && <p className="text-sm text-red-500 mt-2">{resetPasswordError}</p>}
              {resetPasswordSuccess && <p className="text-sm text-green-500 mt-2">Password reset successfully!</p>}
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex justify-end gap-4">
              <button onClick={() => setShowResetPasswordModal(false)} className="px-4 py-2.5 bg-slate-200 text-slate-700 font-medium rounded-lg">Cancel</button>
              <button onClick={handleResetPassword} disabled={isResettingPassword} className="px-4 py-2.5 bg-amber-500 text-white font-medium rounded-lg disabled:bg-amber-300">
                {isResettingPassword ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Modals */}
      {showBulkDeleteModal && (
        <Modal title="Confirm Bulk Deletion" onClose={() => setShowBulkDeleteModal(false)} onConfirm={handleBulkDelete} loading={isBulkProcessing}>
          Are you sure you want to delete {selectedUsers.size} selected users? This action is irreversible.
        </Modal>
      )}
      {showBulkRoleModal && (
        <Modal title="Change Role for Users" onClose={() => setShowBulkRoleModal(false)} onConfirm={handleBulkRoleChange} loading={isBulkProcessing}>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Role</label>
          <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value as User['role'])} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
            <option value="officer">Officer</option>
            <option value="supervisor">Supervisor</option>
            <option value="training_coordinator">Training Coordinator</option>
            <option value="administrator">Administrator</option>
          </select>
        </Modal>
      )}
      {showBulkDepartmentModal && (
        <Modal title="Change Department for Users" onClose={() => setShowBulkDepartmentModal(false)} onConfirm={handleBulkDepartmentChange} loading={isBulkProcessing}>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Department</label>
          <input type="text" value={bulkDepartment} onChange={(e) => setBulkDepartment(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
        </Modal>
      )}
      
      {/* Calendar Day Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">{formatDate(selectedDate)}</h2>
              <button onClick={() => setShowDayModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><XIcon /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {trainings.filter(t => t.date === selectedDate).map(training => (
                <div key={training.id} className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold text-slate-800">{training.title}</h3>
                  <p className="text-sm text-slate-600">{training.time} - {training.location}</p>
                  <div className="mt-2 text-xs text-slate-500">{training.enrolled}/{training.capacity} enrolled</div>
                </div>
              ))}
              {trainings.filter(t => t.date === selectedDate).length === 0 && (
                <p className="text-slate-600">No training scheduled for this day.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove Avatar Confirmation Modal */}
      {showRemoveAvatarConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-slate-800">Remove Avatar</h2>
              <p className="mt-2 text-slate-600">Are you sure you want to remove the avatar? This will reset it to the default.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex justify-center gap-4">
              <button onClick={() => setShowRemoveAvatarConfirm(false)} className="px-6 py-2.5 bg-slate-200 text-slate-700 font-medium rounded-lg">Cancel</button>
              <button onClick={handleRemoveAvatar} className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: number | string; color?: string }> = ({ icon, title, value, color = 'amber' }) => {
  const colors: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center space-x-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ name: string; activeTab: string; setActiveTab: (tab: any) => void; icon: React.ReactNode; children: React.ReactNode }> = ({ name, activeTab, setActiveTab, icon, children }) => (
  <button
    onClick={() => setActiveTab(name)}
    className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
      activeTab === name
        ? 'border-amber-500 text-amber-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`}
  >
    {icon}
    {children}
  </button>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    submitted: 'bg-blue-100 text-blue-700',
    supervisor_review: 'bg-amber-100 text-amber-700',
    admin_approval: 'bg-purple-100 text-purple-700',
    approved: 'bg-green-100 text-green-700',
    scheduled: 'bg-cyan-100 text-cyan-700',
    denied: 'bg-red-100 text-red-700',
    completed: 'bg-slate-100 text-slate-700',
  };
  const label = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
      {label}
    </span>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; onConfirm: () => void; loading: boolean; children: React.ReactNode }> = ({ title, onClose, onConfirm, loading, children }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl max-w-md w-full">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <div className="mt-4 text-slate-600">{children}</div>
      </div>
      <div className="p-6 bg-slate-50 rounded-b-2xl flex justify-end gap-4">
        <button onClick={onClose} className="px-4 py-2.5 bg-slate-200 text-slate-700 font-medium rounded-lg">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className="px-4 py-2.5 bg-amber-500 text-white font-medium rounded-lg disabled:bg-amber-300">
          {loading ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
);

export default AdminPanel;
