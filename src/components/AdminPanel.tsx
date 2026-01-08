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

  const formatDate = (dateString: string) => {    return new Date(dateString + \'T00:00:00Z\').toLocaleDateString(\'en-US\', {      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Selection handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
    setShowBulkActionsMenu(false);
  };

  // Get selected users data
  const getSelectedUsersData = () => {
    return allUsers.filter(u => selectedUsers.has(u.id));
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    setIsBulkProcessing(true);
    setBulkOperationError('');
    setBulkOperationSuccess('');

    try {
      const selectedUsersList = getSelectedUsersData();
      let successCount = 0;
      let failCount = 0;

      for (const user of selectedUsersList) {
        const result = await deleteUser(user.id);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount === 0) {
        setBulkOperationSuccess(`Successfully deleted ${successCount} user(s).`);
        setTimeout(() => {
          setShowBulkDeleteModal(false);
          setBulkOperationSuccess('');
          clearSelection();
        }, 1500);
      } else {
        setBulkOperationError(`Deleted ${successCount} user(s), but ${failCount} failed.`);
      }

      await refreshUsers();
    } catch (error) {
      setBulkOperationError('An error occurred during bulk delete.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk role change handler
  const handleBulkRoleChange = async () => {
    setIsBulkProcessing(true);
    setBulkOperationError('');
    setBulkOperationSuccess('');

    try {
      const selectedUsersList = getSelectedUsersData();
      let successCount = 0;
      let failCount = 0;

      for (const user of selectedUsersList) {
        const result = await updateUser(user.id, { role: bulkRole });
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount === 0) {
        setBulkOperationSuccess(`Successfully updated role for ${successCount} user(s).`);
        setTimeout(() => {
          setShowBulkRoleModal(false);
          setBulkOperationSuccess('');
          clearSelection();
        }, 1500);
      } else {
        setBulkOperationError(`Updated ${successCount} user(s), but ${failCount} failed.`);
      }

      await refreshUsers();
    } catch (error) {
      setBulkOperationError('An error occurred during bulk role update.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk department change handler
  const handleBulkDepartmentChange = async () => {
    if (!bulkDepartment.trim()) {
      setBulkOperationError('Please enter a department name.');
      return;
    }

    setIsBulkProcessing(true);
    setBulkOperationError('');
    setBulkOperationSuccess('');

    try {
      const selectedUsersList = getSelectedUsersData();
      let successCount = 0;
      let failCount = 0;

      for (const user of selectedUsersList) {
        const result = await updateUser(user.id, { department: bulkDepartment.trim() });
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount === 0) {
        setBulkOperationSuccess(`Successfully updated department for ${successCount} user(s).`);
        setTimeout(() => {
          setShowBulkDepartmentModal(false);
          setBulkOperationSuccess('');
          setBulkDepartment('');
          clearSelection();
        }, 1500);
      } else {
        setBulkOperationError(`Updated ${successCount} user(s), but ${failCount} failed.`);
      }

      await refreshUsers();
    } catch (error) {
      setBulkOperationError('An error occurred during bulk department update.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export selected users to CSV
  const handleExportSelected = () => {
    const selectedUsersList = getSelectedUsersData();
    
    const headers = ['Badge Number', 'First Name', 'Last Name', 'Email', 'Role', 'Rank', 'Department', 'Phone', 'Supervisor ID'];
    const csvContent = [
      headers.join(','),
      ...selectedUsersList.map(user => [
        user.badgeNumber,
        user.firstName,
        user.lastName,
        user.email,
        user.role,
        user.rank,
        user.department,
        user.phone || '',
        user.supervisorId || '',
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowBulkActionsMenu(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setCreateUserError('');
    setCreateUserSuccess(false);

    try {
      if (!newUser.badgeNumber || !newUser.firstName || !newUser.lastName || !newUser.email) {
        setCreateUserError('Please fill in all required fields (Badge Number, First Name, Last Name, Email)');
        setIsCreatingUser(false);
        return;
      }

      const result = await createUser({
        ...newUser,
        password: newUser.password || newUser.badgeNumber,
      });

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
        await refreshUsers();
        setTimeout(() => {
          setShowAddUserModal(false);
          setCreateUserSuccess(false);
        }, 1500);
      } else {
        setCreateUserError('Failed to create user. Badge number or email may already exist.');
      }
    } catch (error) {
      setCreateUserError('An error occurred while creating the user.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      badgeNumber: user.badgeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
      rank: user.rank,
      phone: user.phone || '',
      supervisorId: user.supervisorId || '',
      hireDate: user.hireDate || '',
      platoon: user.platoon || '' as Platoon,
    });
    // Reset avatar states
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setShowRemoveAvatarConfirm(false);
    setUpdateUserError('');
    setUpdateUserSuccess(false);
    setShowEditUserModal(true);
  };


  // Avatar handlers for Edit User Modal
  const handleEditAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUpdateUserError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUpdateUserError('Image must be less than 5MB');
        return;
      }
      setEditAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadEditAvatar = async () => {
    if (!editAvatarFile || !editingUser) return;

    setIsUploadingEditAvatar(true);
    setUpdateUserError('');
    try {
      // Upload file to storage
      const filePath = `avatars/${editingUser.id}/${Date.now()}_${editAvatarFile.name}`;
      const avatarUrl = await documentService.uploadFile(editAvatarFile, filePath);
      
      if (!avatarUrl) {
        throw new Error('Failed to upload avatar');
      }

      // Update user's avatar
      const result = await updateUser(editingUser.id, { avatar: avatarUrl });
      
      if (result) {
        // Update local state
        setEditingUser({ ...editingUser, avatar: avatarUrl });
        setEditAvatarFile(null);
        setEditAvatarPreview(null);
        await refreshUsers();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUpdateUserError('Failed to upload profile photo');
    } finally {
      setIsUploadingEditAvatar(false);
    }
  };

  const handleRemoveEditAvatar = async () => {
    if (!editingUser) return;

    setIsUploadingEditAvatar(true);
    setUpdateUserError('');
    try {
      const result = await updateUser(editingUser.id, { avatar: '' });
      
      if (result) {
        // Update local state
        setEditingUser({ ...editingUser, avatar: '' });
        setShowRemoveAvatarConfirm(false);
        await refreshUsers();
      } else {
        throw new Error('Failed to remove avatar');
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      setUpdateUserError('Failed to remove profile photo');
    } finally {
      setIsUploadingEditAvatar(false);
    }
  };


  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsUpdatingUser(true);
    setUpdateUserError('');
    setUpdateUserSuccess(false);

    try {
      if (!editUserForm.badgeNumber || !editUserForm.firstName || !editUserForm.lastName || !editUserForm.email) {
        setUpdateUserError('Please fill in all required fields');
        setIsUpdatingUser(false);
        return;
      }

      const result = await updateUser(editingUser.id, editUserForm);

      if (result) {
        setUpdateUserSuccess(true);
        await refreshUsers();
        setTimeout(() => {
          setShowEditUserModal(false);
          setUpdateUserSuccess(false);
          setEditingUser(null);
        }, 1500);
      } else {
        setUpdateUserError('Failed to update user. Please try again.');
      }
    } catch (error) {
      setUpdateUserError('An error occurred while updating the user.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleOpenResetPasswordModal = (user: User) => {
    setResetPasswordUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordError('');
    setResetPasswordSuccess(false);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    
    setIsResettingPassword(true);
    setResetPasswordError('');
    setResetPasswordSuccess(false);

    try {
      if (!newPassword) {
        setResetPasswordError('Please enter a new password');
        setIsResettingPassword(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setResetPasswordError('Passwords do not match');
        setIsResettingPassword(false);
        return;
      }

      if (newPassword.length < 4) {
        setResetPasswordError('Password must be at least 4 characters');
        setIsResettingPassword(false);
        return;
      }

      const result = await resetUserPassword(resetPasswordUser.id, newPassword);

      if (result) {
        setResetPasswordSuccess(true);
        setTimeout(() => {
          setShowResetPasswordModal(false);
          setResetPasswordSuccess(false);
          setResetPasswordUser(null);
        }, 1500);
      } else {
        setResetPasswordError('Failed to reset password. Please try again.');
      }
    } catch (error) {
      setResetPasswordError('An error occurred while resetting the password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleOpenDeleteConfirm = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    
    setIsDeletingUser(true);
    try {
      const result = await deleteUser(deletingUser.id);
      if (result) {
        await refreshUsers();
        setShowDeleteConfirm(false);
        setDeletingUser(null);
      }
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Training Handlers
  const handleCreateTraining = async (e: React.FormEvent) => {
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
        credits: newTraining.credits,
        mandatory: newTraining.mandatory,
        prerequisites: prerequisitesArray,
        image: imageUrl || 'https://d64gsuwffb70l.cloudfront.net/6940ef621ce90c17a6f6ce0a_1765863895272_3ccab1a6.jpg',
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
        });
        setTrainingImageFile(null);
        setTrainingImagePreview(null);
        await loadTrainings();
        setTimeout(() => {
          setShowAddTrainingModal(false);
          setTrainingSuccess(false);
        }, 1500);
      } else {
        setTrainingError('Failed to create training course. Please try again.');
      }
    } catch (error) {
      setTrainingError('An error occurred while creating the training course.');
    } finally {
      setIsProcessingTraining(false);
    }
  };

  const handleOpenEditTrainingModal = (training: TrainingOpportunity) => {
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
      prerequisites: training.prerequisites.join(', '),
      image: training.image,
    });
    setTrainingError('');
    setTrainingSuccess(false);
    setShowEditTrainingModal(true);
  };

  const handleUpdateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTraining) return;

    setIsProcessingTraining(true);
    setTrainingError('');
    setTrainingSuccess(false);

    try {
      if (!editTrainingForm.title || !editTrainingForm.category || !editTrainingForm.instructor || !editTrainingForm.date || !editTrainingForm.duration || !editTrainingForm.location) {
        setTrainingError('Please fill in all required fields');
        setIsProcessingTraining(false);
        return;
      }

      let imageUrl = editTrainingForm.image;

      // Upload image if selected
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
        title: editTrainingForm.title,
        description: editTrainingForm.description,
        category: editTrainingForm.category,
        instructor: editTrainingForm.instructor,
        date: editTrainingForm.date,
        time: editTrainingForm.time,
        duration: editTrainingForm.duration,
        location: editTrainingForm.location,
        capacity: editTrainingForm.capacity,
        credits: editTrainingForm.credits,
        mandatory: editTrainingForm.mandatory,
        prerequisites: prerequisitesArray,
        image: imageUrl,
      });

      if (result) {
        setTrainingSuccess(true);
        setTimeout(() => {
          setShowEditTrainingModal(false);
          setTrainingSuccess(false);
          setEditingTraining(null);
          setTrainingImageFile(null);
          setTrainingImagePreview(null);
          loadTrainings();
        }, 1500);
      } else {
        setTrainingError('Failed to update training course. Please try again.');
      }
    } catch (error) {
      setTrainingError('An error occurred while updating the training course.');
    } finally {
      setIsProcessingTraining(false);
    }
  };

  const handleOpenDeleteTrainingModal = (training: TrainingOpportunity) => {
    setDeletingTraining(training);
    setShowDeleteTrainingModal(true);
  };

  const handleDeleteTraining = async () => {
    if (!deletingTraining) return;

    setIsProcessingTraining(true);
    try {
      const result = await trainingService.delete(deletingTraining.id);
      if (result) {
        await loadTrainings();
        setShowDeleteTrainingModal(false);
        setDeletingTraining(null);
      }
    } finally {
      setIsProcessingTraining(false);
    }
  };

  const supervisors = allUsers.filter(u => u.role === 'supervisor' || u.role === 'administrator');

  // Get unique departments for suggestions
  const uniqueDepartments = [...new Set(allUsers.map(u => u.department))].filter(Boolean);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: AdminIcon },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'training', label: 'Training', icon: TrainingIcon },
    { id: 'custom', label: 'Custom Requests', icon: CustomRequestIcon },
    { id: 'budget', label: 'Budget Management', icon: AccountingIcon },
  ];



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
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Controls</h1>
        <p className="text-slate-600 mt-1">Manage users, training, and system settings</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
                  <div className="text-sm text-blue-700 mt-1">Total Personnel</div>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600">{stats.totalTraining}</div>
                  <div className="text-sm text-purple-700 mt-1">Training Courses</div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="text-3xl font-bold text-amber-600">{stats.pendingRequests}</div>
                  <div className="text-sm text-amber-700 mt-1">Pending Requests</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                  <div className="text-3xl font-bold text-green-600">{stats.approvedRequests}</div>
                  <div className="text-sm text-green-700 mt-1">Approved</div>
                </div>
                <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                  <div className="text-3xl font-bold text-cyan-600">{stats.completedTraining}</div>
                  <div className="text-sm text-cyan-700 mt-1">Completed</div>
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <div className="text-3xl font-bold text-red-600">{stats.deniedRequests}</div>
                  <div className="text-sm text-red-700 mt-1">Denied</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Recent Requests</h3>
                <div className="space-y-3">
                  {allRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">{request.trainingTitle}</div>
                        <div className="text-sm text-slate-500">{request.userName} • {formatDate(request.submittedDate)}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        request.status === 'denied' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {allRequests.length === 0 && (
                    <div className="p-4 text-center text-slate-500">No requests yet</div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setShowAddUserModal(true)}
                    className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
                  >
                    <UsersIcon className="text-slate-600 mb-2" size={24} />
                    <div className="font-medium text-slate-800">Add New User</div>
                    <div className="text-sm text-slate-500">Create personnel account</div>
                  </button>
                  <button 
                    onClick={() => setShowAddTrainingModal(true)}
                    className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
                  >
                    <TrainingIcon className="text-slate-600 mb-2" size={24} />
                    <div className="font-medium text-slate-800">Create Training</div>
                    <div className="text-sm text-slate-500">Add new course</div>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('training');
                      setTrainingViewMode('calendar');
                    }}
                    className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
                  >
                    <CalendarIcon className="text-slate-600 mb-2" size={24} />
                    <div className="font-medium text-slate-800">Schedule Training</div>
                    <div className="text-sm text-slate-500">Manage calendar</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search and Add User */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by name, badge, or department..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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

              {/* Bulk Actions Bar */}
              {selectedUsers.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-amber-800">
                      {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-amber-600 hover:text-amber-800 underline"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowBulkActionsMenu(!showBulkActionsMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Bulk Actions
                      <ChevronDownIcon size={16} />
                    </button>
                    
                    {showBulkActionsMenu && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowBulkActionsMenu(false);
                              setShowBulkRoleModal(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <EditIcon size={18} className="text-slate-500" />
                            Change Role
                          </button>
                          <button
                            onClick={() => {
                              setShowBulkActionsMenu(false);
                              setShowBulkDepartmentModal(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <UsersIcon size={18} className="text-slate-500" />
                            Change Department
                          </button>
                          <button
                            onClick={handleExportSelected}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <DownloadIcon size={18} className="text-slate-500" />
                            Export Selected
                          </button>
                          <div className="border-t border-slate-200 my-1"></div>
                          <button
                            onClick={() => {
                              setShowBulkActionsMenu(false);
                              setShowBulkDeleteModal(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <TrashIcon size={18} />
                            Delete Selected
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 w-12">
                        <input
                          type="checkbox"
                          checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Personnel</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Badge</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Department</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50 ${
                          selectedUsers.has(user.id) ? 'bg-amber-50' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={`${user.firstName} ${user.lastName}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                                {user.firstName[0]}{user.lastName[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-slate-800">
                                {user.rank} {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-slate-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">#{user.badgeNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{user.department}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                            user.role === 'administrator' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'supervisor' ? 'bg-blue-100 text-blue-700' :
                            user.role === 'training_coordinator' ? 'bg-amber-100 text-amber-700' :
                            user.role === 'accounting' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {user.role === 'training_coordinator' ? 'Training Coordinator' : user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <EditIcon size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenResetPasswordModal(user)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <KeyIcon size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteConfirm(user)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No users found matching your search.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <TrainingCalendarView
              trainings={trainings}
              filteredTraining={filteredTraining}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              trainingViewMode={trainingViewMode}
              setTrainingViewMode={setTrainingViewMode}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              currentYear={currentYear}
              setCurrentYear={setCurrentYear}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              showDayModal={showDayModal}
              setShowDayModal={setShowDayModal}
              draggedTraining={draggedTraining}
              setDraggedTraining={setDraggedTraining}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              formatDate={formatDate}
              handleOpenEditTrainingModal={handleOpenEditTrainingModal}
              handleOpenDeleteTrainingModal={handleOpenDeleteTrainingModal}
              setShowAddTrainingModal={setShowAddTrainingModal}
            />
          )}

          {activeTab === 'custom' && (
            <CustomTrainingRequestTab />
          )}

          {activeTab === 'budget' && (
            <BudgetManagement />
          )}

        </div>
      </div>


      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Add New User</h2>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setCreateUserError('');
                  setCreateUserSuccess(false);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createUserError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {createUserError}
                </div>
              )}

              {createUserSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckIcon size={18} />
                  User created successfully!
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Badge Number *
                  </label>
                  <input
                    type="text"
                    value={newUser.badgeNumber}
                    onChange={(e) => setNewUser(prev => ({ ...prev, badgeNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., 1234"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., j.doe@pd.gov"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="officer">Officer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="administrator">Administrator</option>
                    <option value="training_coordinator">Training Coordinator</option>
                    <option value="accounting">Accounting</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rank
                  </label>
                  <input
                    type="text"
                    value={newUser.rank}
                    onChange={(e) => setNewUser(prev => ({ ...prev, rank: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., Officer, Sergeant, Captain"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newUser.department}
                    onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., Patrol Division"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hire Date
                  </label>
                  <input
                    type="date"
                    value={newUser.hireDate}
                    onChange={(e) => setNewUser(prev => ({ ...prev, hireDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Supervisor
                  </label>
                  <select
                    value={newUser.supervisorId}
                    onChange={(e) => setNewUser(prev => ({ ...prev, supervisorId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">No supervisor</option>
                    {supervisors.map(sup => (
                      <option key={sup.id} value={sup.id}>
                        {sup.rank} {sup.firstName} {sup.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Platoon / Shift
                </label>
                <select
                  value={newUser.platoon}
                  onChange={(e) => setNewUser(prev => ({ ...prev, platoon: e.target.value as Platoon }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {PLATOON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Leave blank to use badge number as password"
                />
                <p className="mt-1 text-xs text-slate-500">
                  If left blank, the badge number will be used as the initial password.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setCreateUserError('');
                    setCreateUserSuccess(false);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isCreatingUser ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusIcon size={18} />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Edit User - {editingUser.firstName} {editingUser.lastName}</h2>
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                  setUpdateUserError('');
                  setUpdateUserSuccess(false);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {updateUserError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {updateUserError}
                </div>
              )}

              {updateUserSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckIcon size={18} />
                  User updated successfully!
                </div>
              )}

              {/* Badge Number Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Badge Number *
                </label>
                <input
                  type="text"
                  value={editUserForm.badgeNumber}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, badgeNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Enter badge number"
                />
              </div>

              {/* Profile Photo Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  {/* Current Avatar or Preview */}
                  <div className="relative group">
                    {editAvatarPreview ? (
                      <img
                        src={editAvatarPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-amber-500"
                      />
                    ) : editingUser.avatar ? (
                      <img
                        src={editingUser.avatar}
                        alt={`${editingUser.firstName} ${editingUser.lastName}`}
                        className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 text-xl font-bold">
                        {editingUser.firstName[0]}{editingUser.lastName[0]}
                      </div>
                    )}
                    {/* Hover overlay for change */}
                    <button
                      type="button"
                      onClick={() => editAvatarInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <CameraIcon className="text-white" size={24} />
                    </button>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={editAvatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditAvatarFileChange}
                    className="hidden"
                  />

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    {editAvatarPreview ? (
                      <>
                        <button
                          type="button"
                          onClick={handleUploadEditAvatar}
                          disabled={isUploadingEditAvatar}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isUploadingEditAvatar ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <CheckIcon size={14} />
                              Save Photo
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditAvatarFile(null);
                            setEditAvatarPreview(null);
                          }}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-sm font-medium rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => editAvatarInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          {editingUser.avatar ? 'Change Photo' : 'Upload Photo'}
                        </button>
                        {editingUser.avatar && (
                          <button
                            type="button"
                            onClick={() => setShowRemoveAvatarConfirm(true)}
                            className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            <TrashIcon size={14} />
                            Remove
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Supported formats: JPG, PNG, GIF. Max size: 5MB
                </p>
              </div>

              {/* Remove Avatar Confirmation */}
              {showRemoveAvatarConfirm && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <TrashIcon size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-red-800">Remove profile photo?</div>
                      <div className="text-sm text-red-700 mt-1">
                        This will remove the current profile photo for this user.
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={handleRemoveEditAvatar}
                          disabled={isUploadingEditAvatar}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isUploadingEditAvatar ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Removing...
                            </>
                          ) : (
                            'Remove Photo'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRemoveAvatarConfirm(false)}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-sm font-medium rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={editUserForm.firstName}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={editUserForm.lastName}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="officer">Officer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="administrator">Administrator</option>
                    <option value="training_coordinator">Training Coordinator</option>
                    <option value="accounting">Accounting</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rank
                  </label>
                  <input
                    type="text"
                    value={editUserForm.rank}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, rank: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editUserForm.department}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Supervisor
                </label>
                <select
                  value={editUserForm.supervisorId}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, supervisorId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">No supervisor</option>
                  {supervisors.filter(s => s.id !== editingUser.id).map(sup => (
                    <option key={sup.id} value={sup.id}>
                      {sup.rank} {sup.firstName} {sup.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={editUserForm.hireDate ? editUserForm.hireDate.split('T')[0] : ''}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, hireDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Platoon / Shift
                </label>
                <select
                  value={editUserForm.platoon}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, platoon: e.target.value as Platoon }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {PLATOON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUserModal(false);
                    setEditingUser(null);
                    setUpdateUserError('');
                    setUpdateUserSuccess(false);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUpdatingUser ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Reset Password</h2>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordUser(null);
                  setResetPasswordError('');
                  setResetPasswordSuccess(false);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {resetPasswordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {resetPasswordError}
                </div>
              )}

              {resetPasswordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckIcon size={18} />
                  Password reset successfully!
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-sm text-slate-600">
                  Resetting password for: <span className="font-medium">{resetPasswordUser.firstName} {resetPasswordUser.lastName}</span> (#{resetPasswordUser.badgeNumber})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetPasswordUser(null);
                    setResetPasswordError('');
                    setResetPasswordSuccess(false);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isResettingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <KeyIcon size={18} />
                      Reset Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Delete User</h2>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingUser(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrashIcon size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800">Are you sure you want to delete this user?</div>
                    <div className="text-sm text-red-700 mt-1">
                      This will permanently delete <span className="font-medium">{deletingUser.firstName} {deletingUser.lastName}</span> (#{deletingUser.badgeNumber}). This action cannot be undone.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingUser(null);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeletingUser}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isDeletingUser ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon size={18} />
                      Delete User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Delete Multiple Users</h2>
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setBulkOperationError('');
                  setBulkOperationSuccess('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {bulkOperationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {bulkOperationError}
                </div>
              )}

              {bulkOperationSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckIcon size={18} />
                  {bulkOperationSuccess}
                </div>
              )}

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrashIcon size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800">
                      Are you sure you want to delete {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}?
                    </div>
                    <div className="text-sm text-red-700 mt-1">
                      This action cannot be undone. All selected users will be permanently removed from the system.
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto">
                <div className="text-sm font-medium text-slate-700 mb-2">Users to be deleted:</div>
                <div className="space-y-1">
                  {getSelectedUsersData().map(user => (
                    <div key={user.id} className="text-sm text-slate-600 py-1 px-2 bg-slate-50 rounded">
                      {user.rank} {user.firstName} {user.lastName} (#{user.badgeNumber})
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkDeleteModal(false);
                    setBulkOperationError('');
                    setBulkOperationSuccess('');
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkProcessing}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isBulkProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon size={18} />
                      Delete {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Change Role Modal */}
      {showBulkRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Change Role for Multiple Users</h2>
              <button
                onClick={() => {
                  setShowBulkRoleModal(false);
                  setBulkOperationError('');
                  setBulkOperationSuccess('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {bulkOperationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {bulkOperationError}
                </div>
              )}

              {bulkOperationSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckIcon size={18} />
                  {bulkOperationSuccess}
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-sm text-amber-800">
                  <span className="font-medium">{selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}</span> will be updated with the new role.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Role
                </label>
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value as User['role'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="officer">Officer</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="administrator">Administrator</option>
                  <option value="training_coordinator">Training Coordinator</option>
                  <option value="accounting">Accounting</option>
                </select>
              </div>

              <div className="max-h-32 overflow-y-auto">
                <div className="text-sm font-medium text-slate-700 mb-2">Affected users:</div>
                <div className="flex flex-wrap gap-1">
                  {getSelectedUsersData().map(user => (
                    <span key={user.id} className="text-xs text-slate-600 py-0.5 px-2 bg-slate-100 rounded-full">
                      {user.firstName} {user.lastName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkRoleModal(false);
                    setBulkOperationError('');
                    setBulkOperationSuccess('');
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkRoleChange}
                  disabled={isBulkProcessing}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isBulkProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckIcon size={18} />
                      Update Role
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Change Department Modal */}
      {showBulkDepartmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Change Department for Multiple Users</h2>
              <button
                onClick={() => {
                  setShowBulkDepartmentModal(false);
                  setBulkOperationError('');
                  setBulkOperationSuccess('');
                  setBulkDepartment('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {bulkOperationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {bulkOperationError}
                </div>
              )}

              {bulkOperationSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckIcon size={18} />
                  {bulkOperationSuccess}
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-sm text-amber-800">
                  <span className="font-medium">{selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}</span> will be moved to the new department.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Department
                </label>
                <input
                  type="text"
                  value={bulkDepartment}
                  onChange={(e) => setBulkDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Enter department name"
                  list="department-suggestions"
                />
                <datalist id="department-suggestions">
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </div>

              <div className="max-h-32 overflow-y-auto">
                <div className="text-sm font-medium text-slate-700 mb-2">Affected users:</div>
                <div className="flex flex-wrap gap-1">
                  {getSelectedUsersData().map(user => (
                    <span key={user.id} className="text-xs text-slate-600 py-0.5 px-2 bg-slate-100 rounded-full">
                      {user.firstName} {user.lastName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkDepartmentModal(false);
                    setBulkOperationError('');
                    setBulkOperationSuccess('');
                    setBulkDepartment('');
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDepartmentChange}
                  disabled={isBulkProcessing || !bulkDepartment.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isBulkProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckIcon size={18} />
                      Update Department
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Training Modal */}
      {showAddTrainingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Add New Training Course</h2>
              <button
                onClick={() => {
                  setShowAddTrainingModal(false);
                  setTrainingError('');
                  setTrainingSuccess(false);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateTraining} className="p-6 space-y-4">
              {trainingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {trainingError}
                </div>
              )}

              {trainingSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckIcon size={18} />
                  Training course created successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={newTraining.title}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., Advanced Tactical Response"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTraining.description}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={3}
                  placeholder="Describe the training course..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newTraining.category}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  >
                    {trainingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Instructor *
                  </label>
                  <input
                    type="text"
                    value={newTraining.instructor}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, instructor: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., Lt. Robert Johnson"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newTraining.date}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={newTraining.time}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., 08:00 AM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={newTraining.duration}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., 8 hours"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={newTraining.location}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., Training Academy - Room 201"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={newTraining.capacity}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, capacity: parseInt(e.target.value) || 20 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    value={newTraining.credits}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, credits: parseInt(e.target.value) || 4 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prerequisites (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTraining.prerequisites}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, prerequisites: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., Basic Firearms Certification, Physical Fitness Test"
                />
                            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Image
                  </label>
                  <div className="space-y-3">
                    {/* Image Preview */}
                    {(trainingImagePreview || newTraining.image) && (
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={trainingImagePreview || newTraining.image} 
                          alt="Training Preview" 
                          className="w-full h-full object-cover"
                        />
                        {trainingImagePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setTrainingImageFile(null);
                              setTrainingImagePreview(null);
                              if (trainingImageInputRef.current) {
                                trainingImageInputRef.current.value = '';
                              }
                            }}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 text-gray-600"
                            title="Remove selected image"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}

                    {/* File Input */}
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => trainingImageInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={isUploadingTrainingImage}
                      >
                        {isUploadingTrainingImage ? 'Uploading...' : 'Upload Image'}
                      </button>
                      <span className="text-sm text-gray-500">or</span>
                      <input
                        type="url"
                        value={newTraining.image}
                        onChange={(e) => setNewTraining({ ...newTraining, image: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Paste image URL"
                        disabled={!!trainingImageFile}
                      />
                      <input
                        type="file"
                        ref={trainingImageInputRef}
                        onChange={handleTrainingImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Upload an image file or paste a URL. Supported formats: JPG, PNG, GIF.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mandatory"
                  checked={newTraining.mandatory}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, mandatory: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="mandatory" className="text-sm font-medium text-slate-700">
                  This is a mandatory training course
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTrainingModal(false);
                    setTrainingError('');
                    setTrainingSuccess(false);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingTraining}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isProcessingTraining ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusIcon size={18} />
                      Create Training
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Training Modal */}
      {showEditTrainingModal && editingTraining && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Edit Training Course</h2>
              <button
                onClick={() => {
                  setShowEditTrainingModal(false);
                  setEditingTraining(null);
                  setTrainingError('');
                  setTrainingSuccess(false);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateTraining} className="p-6 space-y-4">
              {trainingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {trainingError}
                </div>
              )}

              {trainingSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckIcon size={18} />
                  Training course updated successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={editTrainingForm.title}
                  onChange={(e) => setEditTrainingForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editTrainingForm.description}
                  onChange={(e) => setEditTrainingForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={editTrainingForm.category}
                    onChange={(e) => setEditTrainingForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  >
                    {trainingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Instructor *
                  </label>
                  <input
                    type="text"
                    value={editTrainingForm.instructor}
                    onChange={(e) => setEditTrainingForm(prev => ({ ...prev, instructor: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Image
                  </label>
                  <div className="space-y-3">
                    {/* Image Preview */}
                    {(trainingImagePreview || editTrainingForm.image) && (
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={trainingImagePreview || editTrainingForm.image} 
                          alt="Training Preview" 
                          className="w-full h-full object-cover"
                        />
                        {trainingImagePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setTrainingImageFile(null);
                              setTrainingImagePreview(null);
                              if (trainingImageInputRef.current) {
                                trainingImageInputRef.current.value = '';
                              }
                            }}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 text-gray-600"
                            title="Remove selected image"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}

                    {/* File Input */}
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => trainingImageInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={isUploadingTrainingImage}
                      >
                        {isUploadingTrainingImage ? 'Uploading...' : 'Upload Image'}
                      </button>
                      <span className="text-sm text-gray-500">or</span>
                      <input
                        type="url"
                        value={editTrainingForm.image}
                        onChange={(e) => setEditTrainingForm({ ...editTrainingForm, image: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Paste image URL"
                        disabled={!!trainingImageFile}
                      />
                      <input
                        type="file"
                        ref={trainingImageInputRef}
                        onChange={handleTrainingImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Upload an image file or paste a URL. Supported formats: JPG, PNG, GIF.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={editTrainingForm.time}
                    onChange={(e) => setEditTrainingForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={editTrainingForm.duration}
                    onChange={(e) => setEditTrainingForm(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={editTrainingForm.location}
                  onChange={(e) => setEditTrainingForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={editTrainingForm.capacity}
                    onChange={(e) => setEditTrainingForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 20 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    value={editTrainingForm.credits}
                    onChange={(e) => setEditTrainingForm(prev => ({ ...prev, credits: parseInt(e.target.value) || 4 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prerequisites (comma-separated)
                </label>
                <input
                  type="text"
                  value={editTrainingForm.prerequisites}
                  onChange={(e) => setEditTrainingForm(prev => ({ ...prev, prerequisites: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={editTrainingForm.image}
                  onChange={(e) => setEditTrainingForm(prev => ({ ...prev, image: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-mandatory"
                  checked={editTrainingForm.mandatory}
                  onChange={(e) => setEditTrainingForm(prev => ({ ...prev, mandatory: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="edit-mandatory" className="text-sm font-medium text-slate-700">
                  This is a mandatory training course
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTrainingModal(false);
                    setEditingTraining(null);
                    setTrainingError('');
                    setTrainingSuccess(false);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingTraining}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isProcessingTraining ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Training Confirmation Modal */}
      {showDeleteTrainingModal && deletingTraining && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Delete Training Course</h2>
              <button
                onClick={() => {
                  setShowDeleteTrainingModal(false);
                  setDeletingTraining(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrashIcon size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800">Are you sure you want to delete this training course?</div>
                    <div className="text-sm text-red-700 mt-1">
                      This will permanently delete <span className="font-medium">"{deletingTraining.title}"</span>. This action cannot be undone.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={deletingTraining.image}
                    alt={deletingTraining.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <div className="font-medium text-slate-800">{deletingTraining.title}</div>
                    <div className="text-sm text-slate-500">{deletingTraining.category} • {deletingTraining.instructor}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteTrainingModal(false);
                    setDeletingTraining(null);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTraining}
                  disabled={isProcessingTraining}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isProcessingTraining ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon size={18} />
                      Delete Training
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close bulk actions menu */}
      {showBulkActionsMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowBulkActionsMenu(false)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
