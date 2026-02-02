import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService, documentService, notificationService, userService } from '@/lib/database';
import { sendGeneralEmail } from '@/lib/emailService';
import { supabase } from '@/lib/supabase';
import { TrainingOpportunity, User, Platoon, PLATOON_OPTIONS } from '@/types';
import TrainingCalendarView from '@/components/TrainingCalendarView';

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
  AlertIcon,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'training' | 'custom' | 'budget'>('overview');

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
    isCpt: false,
    cptHours: 0,
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
    isCpt: false,
    cptHours: 0,
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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAddUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleEditUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditUserForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTrainingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setNewTraining(prev => ({ ...prev, [name]: val }));
  };

  const handleEditTrainingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setEditTrainingForm(prev => ({ ...prev, [name]: val }));
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
          platoon: '',
        });
        setTimeout(() => {
          setShowAddUserModal(false);
          setCreateUserSuccess(false);
        }, 1500);
      } else {
        setCreateUserError('Failed to create user. Badge number may already exist.');
      }
    } catch (error) {
      setCreateUserError('An error occurred while creating the user.');
    } finally {
      setIsCreatingUser(false);
    }
  };

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
      hireDate: user.hireDate,
      platoon: user.platoon || '',
    });
    setEditAvatarPreview(user.avatar);
    setEditAvatarFile(null);
    setShowEditUserModal(true);
    setUpdateUserError('');
    setUpdateUserSuccess(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingUser(true);
    setUpdateUserError('');
    setUpdateUserSuccess(false);

    try {
      let avatarUrl = editingUser.avatar;
      
      // Upload new avatar if selected
      if (editAvatarFile) {
        const filePath = `avatars/${editingUser.id}/${Date.now()}_${editAvatarFile.name}`;
        const uploadedUrl = await documentService.uploadFile(editAvatarFile, filePath);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const result = await updateUser(editingUser.id, {
        ...editUserForm,
        avatar: avatarUrl
      });
      
      if (result) {
        setUpdateUserSuccess(true);
        setTimeout(() => {
          setShowEditUserModal(false);
          setUpdateUserSuccess(false);
        }, 1500);
      } else {
        setUpdateUserError('Failed to update user.');
      }
    } catch (error) {
      setUpdateUserError('An error occurred while updating the user.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const openResetPasswordModal = (user: User) => {
    setResetPasswordUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPasswordModal(true);
    setResetPasswordError('');
    setResetPasswordSuccess(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    if (newPassword !== confirmPassword) {
      setResetPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setResetPasswordError('Password must be at least 4 characters');
      return;
    }

    setIsResettingPassword(true);
    setResetPasswordError('');

    try {
      const success = await resetUserPassword(resetPasswordUser.id, newPassword);
      if (success) {
        setResetPasswordSuccess(true);
        setTimeout(() => {
          setShowResetPasswordModal(false);
          setResetPasswordSuccess(false);
        }, 1500);
      } else {
        setResetPasswordError('Failed to reset password.');
      }
    } catch (error) {
      setResetPasswordError('An error occurred.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const openDeleteConfirm = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeletingUser(true);
    try {
      const success = await deleteUser(deletingUser.id);
      if (success) {
        setShowDeleteConfirm(false);
        setDeletingUser(null);
      }
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleAddTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingTraining(true);
    setTrainingError('');
    setTrainingSuccess(false);

    try {
      let imageUrl = newTraining.image;
      
      // Upload image if selected
      if (trainingImageFile) {
        const uploadedUrl = await uploadTrainingImage(trainingImageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const result = await trainingService.create({
        ...newTraining,
        image: imageUrl,
      });

      if (result) {
        setTrainingSuccess(true);
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
          isCpt: false,
          cptHours: 0,
        });
        setTrainingImageFile(null);
        setTrainingImagePreview(null);
        loadTrainings();
        setTimeout(() => {
          setShowAddTrainingModal(false);
          setTrainingSuccess(false);
        }, 1500);
      }
    } catch (error) {
      setTrainingError('An error occurred while adding the training.');
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
      prerequisites: training.prerequisites || '',
      image: training.image || '',
      isCpt: training.isCpt || false,
      cptHours: training.cptHours || 0,
    });
    setShowEditTrainingModal(true);
    setTrainingError('');
    setTrainingSuccess(false);
  };

  const handleUpdateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTraining) return;

    setIsProcessingTraining(true);
    setTrainingError('');
    setTrainingSuccess(false);

    try {
      const result = await trainingService.update(editingTraining.id, editTrainingForm);
      if (result) {
        setTrainingSuccess(true);
        loadTrainings();
        setTimeout(() => {
          setShowEditTrainingModal(false);
          setTrainingSuccess(false);
        }, 1500);
      }
    } catch (error) {
      setTrainingError('An error occurred while updating the training.');
    } finally {
      setIsProcessingTraining(false);
    }
  };

  const openDeleteTrainingConfirm = (training: TrainingOpportunity) => {
    setDeletingTraining(training);
    setShowDeleteTrainingModal(true);
  };

  const handleDeleteTraining = async () => {
    if (!deletingTraining) return;

    setIsProcessingTraining(true);
    try {
      const success = await trainingService.delete(deletingTraining.id);
      if (success) {
        loadTrainings();
        setShowDeleteTrainingModal(false);
        setDeletingTraining(null);
      }
    } finally {
      setIsProcessingTraining(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!editingUser) return;
    
    try {
      setIsUploadingEditAvatar(true);
      const result = await updateUser(editingUser.id, {
        ...editUserForm,
        avatar: ''
      });
      
      if (result) {
        setEditAvatarPreview(null);
        setEditAvatarFile(null);
        setShowRemoveAvatarConfirm(false);
        // Refresh editing user
        setEditingUser({ ...editingUser, avatar: '' });
      }
    } finally {
      setIsUploadingEditAvatar(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkProcessing(true);
    setBulkOperationError('');
    try {
      const userIds = Array.from(selectedUsers);
      let successCount = 0;
      for (const id of userIds) {
        const success = await deleteUser(id);
        if (success) successCount++;
      }
      setBulkOperationSuccess(`Successfully deleted ${successCount} users.`);
      setSelectedUsers(new Set());
      setTimeout(() => {
        setShowBulkDeleteModal(false);
        setBulkOperationSuccess('');
      }, 2000);
    } catch (error) {
      setBulkOperationError('An error occurred during bulk delete.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkRoleUpdate = async () => {
    setIsBulkProcessing(true);
    setBulkOperationError('');
    try {
      const userIds = Array.from(selectedUsers);
      let successCount = 0;
      for (const id of userIds) {
        const user = allUsers.find(u => u.id === id);
        if (user) {
          const success = await updateUser(id, { ...user, role: bulkRole });
          if (success) successCount++;
        }
      }
      setBulkOperationSuccess(`Successfully updated role for ${successCount} users.`);
      setSelectedUsers(new Set());
      setTimeout(() => {
        setShowBulkRoleModal(false);
        setBulkOperationSuccess('');
      }, 2000);
    } catch (error) {
      setBulkOperationError('An error occurred during bulk role update.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDepartmentUpdate = async () => {
    setIsBulkProcessing(true);
    setBulkOperationError('');
    try {
      const userIds = Array.from(selectedUsers);
      let successCount = 0;
      for (const id of userIds) {
        const user = allUsers.find(u => u.id === id);
        if (user) {
          const success = await updateUser(id, { ...user, department: bulkDepartment });
          if (success) successCount++;
        }
      }
      setBulkOperationSuccess(`Successfully updated department for ${successCount} users.`);
      setSelectedUsers(new Set());
      setTimeout(() => {
        setShowBulkDepartmentModal(false);
        setBulkOperationSuccess('');
      }, 2000);
    } catch (error) {
      setBulkOperationError('An error occurred during bulk department update.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const supervisors = allUsers.filter(u => ['supervisor', 'administrator', 'training_coordinator'].includes(u.role));

  if (isLoading && trainings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AdminIcon className="text-amber-500" /> Admin Control Panel
          </h1>
          <p className="text-slate-600">Manage users, training opportunities, and system settings.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'users' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('training')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'training' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Training Catalog
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'custom' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Custom Requests
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'budget' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Budget & Accounting
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UsersIcon size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Total Users</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{stats.totalUsers}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrainingIcon size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Trainings</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{stats.totalTraining}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ClockIcon size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Pending</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{stats.pendingRequests}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckIcon size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Approved</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{stats.approvedRequests}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ClipboardCheckIcon size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Completed</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{stats.completedTraining}</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg"><XIcon size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Denied</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{stats.deniedRequests}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Recently Added Users</h3>
                  <button onClick={() => setActiveTab('users')} className="text-sm text-amber-600 font-medium hover:underline">View All</button>
                </div>
                <div className="divide-y divide-slate-50">
                  {allUsers.slice(0, 5).map(user => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                        <div>
                          <div className="font-medium text-slate-800">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-slate-500">Badge #{user.badgeNumber} • {user.rank}</div>
                        </div>
                      </div>
                      <div className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full capitalize">
                        {user.role.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Training */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">New Training Opportunities</h3>
                  <button onClick={() => setActiveTab('training')} className="text-sm text-amber-600 font-medium hover:underline">View All</button>
                </div>
                <div className="divide-y divide-slate-50">
                  {trainings.slice(0, 5).map(training => (
                    <div key={training.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <TrainingIcon size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{training.title}</div>
                          <div className="text-xs text-slate-500">{formatDate(training.date)} • {training.location}</div>
                        </div>
                      </div>
                      <div className="text-xs font-medium px-2 py-1 bg-amber-50 text-amber-600 rounded-full">
                        {training.category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-800">User Directory</h3>
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                  {filteredUsers.length} Users
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedUsers.size > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowBulkActionsMenu(!showBulkActionsMenu)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Bulk Actions ({selectedUsers.size}) <ChevronDownIcon size={16} />
                    </button>
                    {showBulkActionsMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-10 py-1 overflow-hidden">
                        <button 
                          onClick={() => { setShowBulkRoleModal(true); setShowBulkActionsMenu(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <UsersIcon size={14} /> Change Role
                        </button>
                        <button 
                          onClick={() => { setShowBulkDepartmentModal(true); setShowBulkActionsMenu(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <AdminIcon size={14} /> Change Department
                        </button>
                        <div className="border-t border-slate-100 my-1"></div>
                        <button 
                          onClick={() => { setShowBulkDeleteModal(true); setShowBulkActionsMenu(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <TrashIcon size={14} /> Delete Selected
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <PlusIcon size={18} /> Add User
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={toggleAllUsers}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                      />
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Badge #</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${selectedUsers.has(user.id) ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                          <div>
                            <div className="font-medium text-slate-800">{user.firstName} {user.lastName}</div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 font-medium">{user.badgeNumber}</td>
                      <td className="p-4 text-sm text-slate-600">{user.department}</td>
                      <td className="p-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                          user.role === 'administrator' ? 'bg-purple-50 text-purple-600' :
                          user.role === 'training_coordinator' ? 'bg-blue-50 text-blue-600' :
                          user.role === 'accounting' ? 'bg-emerald-50 text-emerald-600' :
                          user.role === 'supervisor' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{user.rank}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditUserModal(user)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Edit User"
                          >
                            <EditIcon size={18} />
                          </button>
                          <button 
                            onClick={() => openResetPasswordModal(user)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Reset Password"
                          >
                            <KeyIcon size={18} />
                          </button>
                          <button 
                            onClick={() => openDeleteConfirm(user)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete User"
                          >
                            <TrashIcon size={18} />
                          </button>
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setTrainingViewMode('list')}
                  className={`p-2 rounded-md transition-all ${trainingViewMode === 'list' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ListIcon size={20} />
                </button>
                <button
                  onClick={() => setTrainingViewMode('calendar')}
                  className={`p-2 rounded-md transition-all ${trainingViewMode === 'calendar' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <CalendarIcon size={20} />
                </button>
              </div>
              <button
                onClick={() => setShowAddTrainingModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                <PlusIcon size={18} /> Add Training
              </button>
            </div>

            {trainingViewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTraining.map(training => (
                  <div key={training.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                    <div className="h-40 overflow-hidden relative">
                      <img src={training.image} alt={training.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button 
                          onClick={() => openEditTrainingModal(training)}
                          className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 hover:text-amber-600 rounded-lg shadow-sm transition-colors"
                        >
                          <EditIcon size={16} />
                        </button>
                        <button 
                          onClick={() => openDeleteTrainingConfirm(training)}
                          className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 hover:text-red-600 rounded-lg shadow-sm transition-colors"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-md uppercase tracking-wider">
                          {training.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-slate-800 mb-1 line-clamp-1">{training.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                        <div className="flex items-center gap-1"><CalendarIcon size={14} /> {formatDate(training.date)}</div>
                        <div className="flex items-center gap-1"><LocationIcon size={14} /> {training.location}</div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="text-xs text-slate-500">
                          Instructor: <span className="font-medium text-slate-700">{training.instructor}</span>
                        </div>
                        <div className="text-xs font-bold text-amber-600">
                          {training.credits} Credits
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <TrainingCalendarView 
                trainings={trainings} 
                onEditTraining={openEditTrainingModal}
                onDeleteTraining={openDeleteTrainingConfirm}
                onAddTraining={(date) => {
                  setNewTraining(prev => ({ ...prev, date }));
                  setShowAddTrainingModal(true);
                }}
              />
            )}
          </div>
        )}



        {activeTab === 'custom' && (
          <CustomTrainingRequestTab />
        )}

        {activeTab === 'budget' && (
          <BudgetManagement />
        )}
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
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Initial Password *</label>
                  <input type="password" name="password" value={newUser.password} onChange={handleAddUserInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
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
                    <option value="staff">Staff</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="accounting">Accounting</option>
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
                    {PLATOON_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
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
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdateUser}>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Edit User: {editingUser.firstName} {editingUser.lastName}</h2>
                <button type="button" onClick={() => setShowEditUserModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><XIcon /></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Avatar */}
                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="relative group">
                    <img 
                      src={editAvatarPreview || editingUser.avatar} 
                      alt="" 
                      className="w-32 h-32 rounded-full object-cover border-4 border-slate-100 shadow-md" 
                    />
                    <button 
                      type="button"
                      onClick={() => editAvatarInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-colors"
                    >
                      <CameraIcon size={16} />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={editAvatarInputRef} 
                    onChange={handleAvatarFileChange}
                    className="hidden" 
                    accept="image/*"
                  />
                  <p className="text-xs text-slate-500 mt-4 text-center">Click the camera icon to change profile photo</p>
                </div>

                {/* Right Column: Form Fields */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <option value="staff">Staff</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="accounting">Accounting</option>
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
                      {PLATOON_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
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

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <form onSubmit={handleResetPassword}>
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Reset Password</h2>
                <p className="text-sm text-slate-600 mt-1">For {resetPasswordUser.firstName} {resetPasswordUser.lastName}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                {resetPasswordError && <p className="text-sm text-red-500">{resetPasswordError}</p>}
                {resetPasswordSuccess && <p className="text-sm text-green-500">Password reset successfully!</p>}
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowResetPasswordModal(false)} className="px-4 py-2 text-slate-700 font-medium">Cancel</button>
                <button type="submit" disabled={isResettingPassword} className="px-4 py-2 bg-slate-800 text-white font-medium rounded-lg disabled:bg-slate-600">
                  {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      {showDeleteConfirm && deletingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-full"><AlertIcon size={24} /></div>
              <h2 className="text-xl font-bold">Delete User?</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete <strong>{deletingUser.firstName} {deletingUser.lastName}</strong>? This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-300"
              >
                {isDeletingUser ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-full"><AlertIcon size={24} /></div>
              <h2 className="text-xl font-bold">Bulk Delete Users?</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete <strong>{selectedUsers.size}</strong> selected users? This action cannot be undone.
            </p>
            {bulkOperationError && <p className="text-sm text-red-500 mb-4">{bulkOperationError}</p>}
            {bulkOperationSuccess && <p className="text-sm text-green-500 mb-4">{bulkOperationSuccess}</p>}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-300"
              >
                {isBulkProcessing ? 'Processing...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Role Modal */}
      {showBulkRoleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Change Role for {selectedUsers.size} Users</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Select New Role</label>
              <select 
                value={bulkRole} 
                onChange={(e) => setBulkRole(e.target.value as User['role'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="officer">Officer</option>
                <option value="staff">Staff</option>
                <option value="supervisor">Supervisor</option>
                <option value="accounting">Accounting</option>
                <option value="training_coordinator">Training Coordinator</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
            {bulkOperationError && <p className="text-sm text-red-500 mb-4">{bulkOperationError}</p>}
            {bulkOperationSuccess && <p className="text-sm text-green-500 mb-4">{bulkOperationSuccess}</p>}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowBulkRoleModal(false)}
                className="px-4 py-2 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkRoleUpdate}
                disabled={isBulkProcessing}
                className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:bg-amber-300"
              >
                {isBulkProcessing ? 'Updating...' : 'Update Roles'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Department Modal */}
      {showBulkDepartmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Change Department for {selectedUsers.size} Users</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">New Department Name</label>
              <input 
                type="text"
                value={bulkDepartment} 
                onChange={(e) => setBulkDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="e.g. Patrol, Investigations"
              />
            </div>
            {bulkOperationError && <p className="text-sm text-red-500 mb-4">{bulkOperationError}</p>}
            {bulkOperationSuccess && <p className="text-sm text-green-500 mb-4">{bulkOperationSuccess}</p>}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowBulkDepartmentModal(false)}
                className="px-4 py-2 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDepartmentUpdate}
                disabled={isBulkProcessing}
                className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:bg-amber-300"
              >
                {isBulkProcessing ? 'Updating...' : 'Update Departments'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Training Modal */}
      {showAddTrainingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleAddTraining}>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Add Training Opportunity</h2>
                <button type="button" onClick={() => setShowAddTrainingModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><XIcon /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Training Title *</label>
                    <input type="text" name="title" value={newTraining.title} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                    <textarea name="description" value={newTraining.description} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24" required></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <select name="category" value={newTraining.category} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" required>
                      {trainingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                    <input type="text" name="time" value={newTraining.time} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. 08:00 AM" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                    <input type="text" name="duration" value={newTraining.duration} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. 4 hours" />
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
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="mandatory" name="mandatory" checked={newTraining.mandatory} onChange={handleAddTrainingInputChange} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                    <label htmlFor="mandatory" className="text-sm font-medium text-slate-700">Mandatory Training</label>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="isCpt" name="isCpt" checked={newTraining.isCpt} onChange={handleAddTrainingInputChange} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                    <label htmlFor="isCpt" className="text-sm font-medium text-slate-700">CPT Hours</label>
                  </div>
                  {newTraining.isCpt && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CPT Hours</label>
                      <input type="number" name="cptHours" value={newTraining.cptHours} onChange={handleAddTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Training Image</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                      <img src={trainingImagePreview || newTraining.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button 
                      type="button"
                      onClick={() => trainingImageInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Change Image
                    </button>
                    <input 
                      type="file" 
                      ref={trainingImageInputRef} 
                      onChange={handleTrainingImageSelect}
                      className="hidden" 
                      accept="image/*"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-4">
                {trainingError && <p className="text-sm text-red-500">{trainingError}</p>}
                {trainingSuccess && <p className="text-sm text-green-500 flex items-center gap-2"><CheckIcon /> Training added successfully!</p>}
                <button type="button" onClick={() => setShowAddTrainingModal(false)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg">Cancel</button>
                <button type="submit" disabled={isProcessingTraining || isUploadingTrainingImage} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:bg-amber-300">
                  {isProcessingTraining ? 'Processing...' : (isUploadingTrainingImage ? 'Uploading...' : 'Add Training')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Training Modal */}
      {showEditTrainingModal && editingTraining && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdateTraining}>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Edit Training Opportunity</h2>
                <button type="button" onClick={() => setShowEditTrainingModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><XIcon /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Training Title *</label>
                    <input type="text" name="title" value={editTrainingForm.title} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                    <textarea name="description" value={editTrainingForm.description} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24" required></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <select name="category" value={editTrainingForm.category} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white" required>
                      {trainingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                    <input type="text" name="time" value={editTrainingForm.time} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. 08:00 AM" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                    <input type="text" name="duration" value={editTrainingForm.duration} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. 4 hours" />
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
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="edit-mandatory" name="mandatory" checked={editTrainingForm.mandatory} onChange={handleEditTrainingInputChange} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                    <label htmlFor="edit-mandatory" className="text-sm font-medium text-slate-700">Mandatory Training</label>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="edit-isCpt" name="isCpt" checked={editTrainingForm.isCpt} onChange={handleEditTrainingInputChange} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                    <label htmlFor="edit-isCpt" className="text-sm font-medium text-slate-700">CPT Hours</label>
                  </div>
                  {editTrainingForm.isCpt && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CPT Hours</label>
                      <input type="number" name="cptHours" value={editTrainingForm.cptHours} onChange={handleEditTrainingInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-4">
                {trainingError && <p className="text-sm text-red-500">{trainingError}</p>}
                {trainingSuccess && <p className="text-sm text-green-500 flex items-center gap-2"><CheckIcon /> Training updated successfully!</p>}
                <button type="button" onClick={() => setShowEditTrainingModal(false)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg">Cancel</button>
                <button type="submit" disabled={isProcessingTraining} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:bg-amber-300">
                  {isProcessingTraining ? 'Processing...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Training Confirmation */}
      {showDeleteTrainingModal && deletingTraining && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-md w-full p-6">
            <div className="flex items-center gap-4 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-full"><AlertIcon size={24} /></div>
              <h2 className="text-xl font-bold">Delete Training?</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete <strong>{deletingTraining.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteTrainingModal(false)}
                className="px-4 py-2 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteTraining}
                disabled={isProcessingTraining}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-300"
              >
                {isProcessingTraining ? 'Deleting...' : 'Delete Training'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
