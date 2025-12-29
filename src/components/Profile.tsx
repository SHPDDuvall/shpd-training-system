import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Certificate, Document as DocType } from '@/types';
import { certificateService, documentService } from '@/lib/database';
import CertificateGenerator from '@/components/CertificateGenerator';
import {
  ProfileIcon,
  EmailIcon,
  BadgeIcon,
  CalendarIcon,
  BellIcon,
  CheckIcon,
  LockIcon,
  AlertIcon,
  CertificateIcon,
  DocumentIcon,
  DownloadIcon,
  UploadIcon,
  VerifiedIcon,
  ExternalLinkIcon,
  TrashIcon,
  CameraIcon,
  XIcon,
} from '@/components/icons/Icons';

const Profile: React.FC = () => {
  const { user, userRequests, updateCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'certificates' | 'documents' | 'notifications' | 'security'>('profile');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Certificate states
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  
  // Document upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<DocType['documentType']>('certificate');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadIssueDate, setUploadIssueDate] = useState('');
  const [uploadExpDate, setUploadExpDate] = useState('');
  const [uploadAuthority, setUploadAuthority] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Avatar states
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showDeleteAvatarConfirm, setShowDeleteAvatarConfirm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Form states
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [trainingReminders, setTrainingReminders] = useState(true);
  const [approvalAlerts, setApprovalAlerts] = useState(true);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      loadCertificates();
      loadDocuments();
    }
  }, [user]);

  const loadCertificates = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await certificateService.getByUser(user.id);
      setCertificates(data);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!user) return;
    try {
      const data = await documentService.getByUser(user.id);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  if (!user) return null;

  const completedTraining = userRequests.filter(r => r.status === 'completed');
  const pendingRequests = userRequests.filter(r => 
    ['submitted', 'supervisor_review', 'admin_approval'].includes(r.status)
  );

  const totalCredits = certificates.reduce((sum, cert) => sum + cert.creditsEarned, 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCurrentUser({ email, phone });
      showToast('Profile updated successfully!');
    } catch (error) {
      showToast('Failed to update profile');
    }
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Notification preferences saved!');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      // Verify current password by attempting to login
      const { supabase } = await import('@/lib/supabase');
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!users || users.password_hash !== currentPassword) {
        setPasswordError('Current password is incorrect');
        return;
      }

      // Update password
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', user.id);

      if (error) throw error;

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Failed to change password. Please try again.');
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // Avatar handlers
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setShowAvatarModal(true);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;

    setIsUploadingAvatar(true);
    try {
      // Upload file to storage
      const filePath = `avatars/${user.id}/${Date.now()}_${avatarFile.name}`;
      const avatarUrl = await documentService.uploadFile(avatarFile, filePath);
      
      if (!avatarUrl) {
        throw new Error('Failed to upload avatar');
      }

      // Update user's avatar
      const result = await updateCurrentUser({ avatar: avatarUrl });
      
      if (result) {
        showToast('Profile photo updated successfully!');
        setShowAvatarModal(false);
        setAvatarFile(null);
        setAvatarPreview(null);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showToast('Failed to upload profile photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setIsUploadingAvatar(true);
    try {
      const result = await updateCurrentUser({ avatar: '' });
      
      if (result) {
        showToast('Profile photo removed successfully!');
        setShowDeleteAvatarConfirm(false);
      } else {
        throw new Error('Failed to remove avatar');
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      showToast('Failed to remove profile photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !user) return;

    setIsUploading(true);
    try {
      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${uploadFile.name}`;
      const fileUrl = await documentService.uploadFile(uploadFile, filePath);
      
      if (!fileUrl) {
        throw new Error('Failed to upload file');
      }

      // Create document record
      await documentService.create({
        userId: user.id,
        uploadedBy: user.id,
        documentType: uploadType,
        title: uploadTitle,
        description: uploadDescription || undefined,
        fileName: uploadFile.name,
        fileUrl,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
        issueDate: uploadIssueDate || undefined,
        expirationDate: uploadExpDate || undefined,
        issuingAuthority: uploadAuthority || undefined,
      });

      // Reset form and reload
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadIssueDate('');
      setUploadExpDate('');
      setUploadAuthority('');
      await loadDocuments();
      showToast('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      showToast('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await documentService.delete(docId);
      await loadDocuments();
      showToast('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: Certificate['status']) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      revoked: 'bg-slate-100 text-slate-700',
    };
    return colors[status];
  };

  const getDocTypeColor = (type: DocType['documentType']) => {
    const colors: Record<string, string> = {
      certificate: 'bg-amber-100 text-amber-700',
      training_record: 'bg-blue-100 text-blue-700',
      qualification: 'bg-green-100 text-green-700',
      license: 'bg-purple-100 text-purple-700',
      other: 'bg-slate-100 text-slate-700',
    };
    return colors[type] || colors.other;
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: ProfileIcon },
    { id: 'certificates', label: 'Certificates', icon: CertificateIcon },
    { id: 'documents', label: 'Documents', icon: DocumentIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security', icon: LockIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-600 mt-1">Manage your account, certificates, and documents</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar with edit functionality */}
            <div className="relative group">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-600 border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl font-bold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              )}
              {/* Edit overlay */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <CameraIcon className="text-white" size={24} />
              </button>
              {/* Hidden file input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              {/* Edit/Remove buttons */}
              {user.avatar && (
                <button
                  onClick={() => setShowDeleteAvatarConfirm(true)}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
                  title="Remove photo"
                >
                  <TrashIcon size={14} />
                </button>
              )}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-white">
                {user.rank} {user.firstName} {user.lastName}
              </h2>
              <p className="text-slate-300 mt-1">{user.department}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3">
                <span className="px-3 py-1 bg-amber-500 text-slate-900 text-sm font-medium rounded-full">
                  Badge #{user.badgeNumber}
                </span>
                <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full capitalize">
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                {user.avatar ? 'Change photo' : 'Add photo'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{completedTraining.length}</div>
            <div className="text-sm text-slate-500">Completed</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{certificates.length}</div>
            <div className="text-sm text-slate-500">Certificates</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{totalCredits}</div>
            <div className="text-sm text-slate-500">Total Credits</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{pendingRequests.length}</div>
            <div className="text-sm text-slate-500">Pending</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
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

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={user.firstName}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={user.lastName}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <EmailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Badge Number
                  </label>
                  <div className="relative">
                    <BadgeIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={user.badgeNumber}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Hire Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={formatDate(user.hireDate)}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'certificates' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-700">{certificates.filter(c => c.status === 'active').length}</div>
                  <div className="text-sm text-green-600">Active Certificates</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-700">{totalCredits}</div>
                  <div className="text-sm text-amber-600">Total Credits Earned</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-700">{certificates.filter(c => c.status === 'expired').length}</div>
                  <div className="text-sm text-red-600">Expired</div>
                </div>
              </div>

              {/* Certificates List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : certificates.length === 0 ? (
                <div className="text-center py-12">
                  <CertificateIcon className="mx-auto text-slate-300" size={48} />
                  <p className="text-slate-500 mt-4">No certificates earned yet</p>
                  <p className="text-sm text-slate-400">Complete training courses to earn certificates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-slate-800">{cert.trainingTitle}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(cert.status)}`}>
                              {cert.status}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Certificate #:</span>
                              <span className="ml-1 text-slate-700 font-mono text-xs">{cert.certificateNumber}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Completed:</span>
                              <span className="ml-1 text-slate-700">{formatShortDate(cert.completionDate)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Credits:</span>
                              <span className="ml-1 text-slate-700 font-medium">{cert.creditsEarned}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Instructor:</span>
                              <span className="ml-1 text-slate-700">{cert.instructorName}</span>
                            </div>
                          </div>
                          {cert.expirationDate && (
                            <div className="mt-2 text-sm">
                              <span className="text-slate-500">Expires:</span>
                              <span className={`ml-1 ${new Date(cert.expirationDate) < new Date() ? 'text-red-600' : 'text-slate-700'}`}>
                                {formatShortDate(cert.expirationDate)}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedCertificate(cert)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                        >
                          <DownloadIcon size={16} />
                          View Certificate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-800">My Documents</h3>
                  <p className="text-sm text-slate-500">Upload and manage your certificates and documents</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  <UploadIcon size={18} />
                  Upload Document
                </button>
              </div>

              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <DocumentIcon className="mx-auto text-slate-300" size={48} />
                  <p className="text-slate-500 mt-4">No documents uploaded yet</p>
                  <p className="text-sm text-slate-400">Upload certificates, licenses, or other documents</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-slate-800">{doc.title}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getDocTypeColor(doc.documentType)}`}>
                              {doc.documentType.replace('_', ' ')}
                            </span>
                            {doc.verified && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                <VerifiedIcon size={12} />
                                Verified
                              </span>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-slate-600 mt-1">{doc.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                            <span>File: {doc.fileName}</span>
                            {doc.issueDate && <span>Issued: {formatShortDate(doc.issueDate)}</span>}
                            {doc.expirationDate && (
                              <span className={new Date(doc.expirationDate) < new Date() ? 'text-red-600' : ''}>
                                Expires: {formatShortDate(doc.expirationDate)}
                              </span>
                            )}
                            {doc.issuingAuthority && <span>Authority: {doc.issuingAuthority}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <ExternalLinkIcon size={18} />
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveNotifications} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-slate-800">Email Notifications</h4>
                    <p className="text-sm text-slate-500">Receive updates via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-slate-800">Push Notifications</h4>
                    <p className="text-sm text-slate-500">Receive in-app notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={(e) => setPushNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-slate-800">Training Reminders</h4>
                    <p className="text-sm text-slate-500">Get reminded about upcoming training</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trainingReminders}
                      onChange={(e) => setTrainingReminders(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-slate-800">Approval Alerts</h4>
                    <p className="text-sm text-slate-500">Notify when requests are approved/denied</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalAlerts}
                      onChange={(e) => setApprovalAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password Change Form */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h3>
                  
                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                      <div className="flex items-start gap-2">
                        <AlertIcon className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                        <p className="text-sm text-red-700">{passwordError}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Current Password *
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter current password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        New Password *
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new password (min. 4 characters)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Change Password
                  </button>
                </div>
              </form>

              <div className="border-t border-slate-200 pt-6"></div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-800">Last Login</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    {new Date().toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-800">Account Status</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-800">Access Level</h4>
                  <p className="text-sm text-slate-600 mt-1 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Generator Modal */}
      {selectedCertificate && (
        <CertificateGenerator
          certificate={selectedCertificate}
          officerName={`${user.rank} ${user.firstName} ${user.lastName}`}
          badgeNumber={user.badgeNumber}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Update Profile Photo</h3>
              <button
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Preview */}
              {avatarPreview && (
                <div className="flex justify-center">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-slate-200"
                  />
                </div>
              )}

              <p className="text-sm text-slate-600 text-center">
                {avatarFile?.name}
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAvatarModal(false);
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadAvatar}
                  disabled={isUploadingAvatar}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploadingAvatar ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Save Photo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Avatar Confirmation Modal */}
      {showDeleteAvatarConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Remove Profile Photo</h3>
              <button
                onClick={() => setShowDeleteAvatarConfirm(false)}
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
                    <div className="font-medium text-red-800">Are you sure?</div>
                    <div className="text-sm text-red-700 mt-1">
                      This will remove your current profile photo. You can upload a new one at any time.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteAvatarConfirm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploadingAvatar ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Removing...
                    </>
                  ) : (
                    'Remove Photo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">Upload Document</h3>
              <p className="text-sm text-slate-500 mt-1">Upload certificates, licenses, or other documents</p>
            </div>
            
            <form onSubmit={handleUploadDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., CPR Certification"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Document Type *
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as DocType['documentType'])}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="certificate">Certificate</option>
                  <option value="training_record">Training Record</option>
                  <option value="qualification">Qualification</option>
                  <option value="license">License</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={uploadIssueDate}
                    onChange={(e) => setUploadIssueDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={uploadExpDate}
                    onChange={(e) => setUploadExpDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Issuing Authority
                </label>
                <input
                  type="text"
                  value={uploadAuthority}
                  onChange={(e) => setUploadAuthority(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., American Red Cross"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  File *
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    required
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <UploadIcon className="mx-auto text-slate-400" size={32} />
                    <p className="mt-2 text-sm text-slate-600">
                      {uploadFile ? uploadFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOC up to 10MB</p>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !uploadTitle}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <CheckIcon size={20} />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Profile;
