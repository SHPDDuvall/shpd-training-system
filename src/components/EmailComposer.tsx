import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { EmailTemplate, EmailAttachment } from '@/types';
import {
  EmailIcon,
  UsersIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
  AlertIcon,
  SettingsIcon,
  RefreshIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from '@/components/icons/Icons';

// Attachment icon component
const AttachmentIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

// File type icon component
const FileIcon = ({ type, size = 24 }: { type: string; size?: number }) => {
  const isPdf = type === 'application/pdf';
  const isImage = type.startsWith('image/');
  const isDoc = type.includes('document') || type.includes('word');
  
  if (isPdf) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"/>
        <path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"/>
      </svg>
    );
  }
  
  if (isImage) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    );
  }
  
  if (isDoc) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <line x1="10" y1="9" x2="8" y2="9"/>
      </svg>
    );
  }
  
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
};

// Upload icon component
const UploadIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

interface EmailSettings {
  // SMTP Configuration
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSecure: boolean;
  smtpEnabled: boolean;
  // Sender Information
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  emailSignature: string;
  // Notification Preferences
  notifyOnApproval: boolean;
  notifyOnDenial: boolean;
  notifyOnSubmission: boolean;
  notifyOnCertExpiry: boolean;
  notifyOnTrainingReminder: boolean;
  reminderDaysBefore: number;
  certExpiryDaysBefore: number;
}


interface EmailLog {
  id: string;
  sentAt: string;
  type: string;
  subject: string;
  recipients: string[];
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  attachmentCount?: number;
}

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Default templates
const defaultTemplates: EmailTemplate[] = [
  {
    id: 'default-1',
    name: 'Training Approval Notification',
    subject: 'Training Request Approved - {{training_title}}',
    body: `Dear {{name}},

Your training request for "{{training_title}}" has been approved.

Training Details:
- Training: {{training_title}}
- Date: {{date}}

Please ensure you complete any prerequisites before attending.

Best regards,
{{sender_name}}`,
    category: 'approval',
    description: 'Sent when a training request is approved',
    placeholders: ['name', 'training_title', 'date', 'sender_name'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    name: 'Training Denial Notification',
    subject: 'Training Request Denied - {{training_title}}',
    body: `Dear {{name}},

We regret to inform you that your training request for "{{training_title}}" has been denied.

If you have questions about this decision, please contact your supervisor.

Best regards,
{{sender_name}}`,
    category: 'approval',
    description: 'Sent when a training request is denied',
    placeholders: ['name', 'training_title', 'sender_name'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-3',
    name: 'Training Reminder',
    subject: 'Reminder: Upcoming Training - {{training_title}}',
    body: `Dear {{name}},

This is a reminder that you have an upcoming training session:

Training: {{training_title}}
Date: {{date}}

Please ensure you are prepared and arrive on time.

Best regards,
{{sender_name}}`,
    category: 'reminder',
    description: 'Reminder for upcoming training sessions',
    placeholders: ['name', 'training_title', 'date', 'sender_name'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-4',
    name: 'Certificate Expiration Warning',
    subject: 'Certificate Expiring Soon - Action Required',
    body: `Dear {{name}},

Your certification is expiring soon. Please take action to renew your certification before the expiration date.

Officer: {{name}}
Badge: {{badge_number}}
Department: {{department}}

Please contact the training department if you need assistance with renewal.

Best regards,
{{sender_name}}`,
    category: 'notification',
    description: 'Warning about expiring certifications',
    placeholders: ['name', 'badge_number', 'department', 'sender_name'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-5',
    name: 'General Announcement',
    subject: '{{subject}}',
    body: `Dear {{name}},

{{message}}

Best regards,
{{sender_name}}
{{sender_email}}`,
    category: 'general',
    description: 'General announcement template',
    placeholders: ['name', 'subject', 'message', 'sender_name', 'sender_email'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-6',
    name: 'Welcome New Officer',
    subject: 'Welcome to the Department - {{first_name}}!',
    body: `Dear {{name}},

Welcome to the department! We are excited to have you join our team.

Your Details:
- Name: {{rank}} {{first_name}} {{last_name}}
- Badge Number: {{badge_number}}
- Department: {{department}}
- Email: {{email}}

Please complete your onboarding training as soon as possible. If you have any questions, don't hesitate to reach out.

Best regards,
{{sender_name}}`,
    category: 'notification',
    description: 'Welcome email for new officers',
    placeholders: ['name', 'first_name', 'last_name', 'rank', 'badge_number', 'department', 'email', 'sender_name'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

// Available placeholders
const availablePlaceholders = [
  { key: 'name', description: 'Full name (First Last)' },
  { key: 'first_name', description: 'First name only' },
  { key: 'last_name', description: 'Last name only' },
  { key: 'email', description: 'Email address' },
  { key: 'badge_number', description: 'Badge number' },
  { key: 'rank', description: 'Rank/Title' },
  { key: 'department', description: 'Department name' },
  { key: 'date', description: 'Current date' },
  { key: 'training_title', description: 'Training title' },
  { key: 'sender_name', description: 'Sender\'s name' },
  { key: 'sender_email', description: 'Sender\'s email' },
];

const templateCategories = [
  { value: 'approval', label: 'Approval' },
  { value: 'notification', label: 'Notification' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'general', label: 'General' },
  { value: 'custom', label: 'Custom' },
];

const EmailComposer: React.FC = () => {
  const { user, allUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'settings' | 'logs'>('compose');
  const [emailType, setEmailType] = useState<'single' | 'mass'>('single');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [isSending, setIsSending] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState('');

  // Attachment states
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template states
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'custom' as EmailTemplate['category'],
    description: '',
  });
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Email settings state
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSecure: true,
    smtpEnabled: false,
    fromName: 'Training Management System',
    fromEmail: 'noreply@yourdomain.com',
    replyToEmail: user?.email || '',
    emailSignature: '',
    notifyOnApproval: true,
    notifyOnDenial: true,
    notifyOnSubmission: true,
    notifyOnCertExpiry: true,
    notifyOnTrainingReminder: true,
    reminderDaysBefore: 7,
    certExpiryDaysBefore: 30,
  });

  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  const departments = [...new Set(allUsers.map(u => u.department))];
  const roles = ['officer', 'supervisor', 'administrator', 'training_coordinator', 'accounting', 'staff'];

  // Calculate total attachment size
  const totalAttachmentSize = attachments.reduce((sum, a) => sum + a.size, 0);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files);
    
    for (const file of filesToUpload) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setErrorMessage(`File type not allowed: ${file.name}. Allowed types: PDF, images, Word, Excel, text files.`);
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 4000);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`File too large: ${file.name}. Maximum size is 10MB per file.`);
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 4000);
        return;
      }
    }

    const newTotalSize = totalAttachmentSize + filesToUpload.reduce((sum, f) => sum + f.size, 0);
    if (newTotalSize > MAX_TOTAL_SIZE) {
      setErrorMessage('Total attachment size exceeds 25MB limit.');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 4000);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedAttachments: EmailAttachment[] = [];
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `email-attachments/${fileName}`;

        const { error } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        uploadedAttachments.push({
          id: `attachment-${Date.now()}-${i}`,
          filename: file.name,
          url: urlData.publicUrl,
          contentType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });

        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      }

      setAttachments(prev => [...prev, ...uploadedAttachments]);
    } catch (err) {
      console.error('Error uploading files:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload files');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 4000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Load email settings and templates from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('emailSettings');
    if (savedSettings) {
      setEmailSettings(JSON.parse(savedSettings));
    }
    
    const savedLogs = localStorage.getItem('emailLogs');
    if (savedLogs) {
      setEmailLogs(JSON.parse(savedLogs));
    }

    const savedTemplates = localStorage.getItem('emailTemplates');
    if (savedTemplates) {
      const parsedTemplates = JSON.parse(savedTemplates);
      const customTemplates = parsedTemplates.filter((t: EmailTemplate) => !t.isDefault);
      setTemplates([...defaultTemplates, ...customTemplates]);
    } else {
      setTemplates(defaultTemplates);
    }
  }, []);

  // Save templates to localStorage when they change
  useEffect(() => {
    const customTemplates = templates.filter(t => !t.isDefault);
    localStorage.setItem('emailTemplates', JSON.stringify(customTemplates));
  }, [templates]);



  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.badgeNumber.includes(searchQuery);
    const matchesDepartment = filterDepartment === 'all' || u.department === filterDepartment;
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(templateSearchQuery.toLowerCase());
    const matchesCategory = templateCategoryFilter === 'all' || t.category === templateCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedRecipients(filteredUsers.map(u => u.id));
  };

  const clearAll = () => {
    setSelectedRecipients([]);
  };

  const selectByDepartment = (department: string) => {
    const deptUsers = allUsers.filter(u => u.department === department).map(u => u.id);
    setSelectedRecipients(prev => [...new Set([...prev, ...deptUsers])]);
  };

  // Replace placeholders in text
  const replacePlaceholders = (text: string, recipientId?: string): string => {
    let result = text;
    
    // Get recipient data if provided
    const recipient = recipientId ? allUsers.find(u => u.id === recipientId) : null;
    
    // Replace recipient-specific placeholders
    if (recipient) {
      result = result.replace(/\{\{name\}\}/g, `${recipient.firstName} ${recipient.lastName}`);
      result = result.replace(/\{\{first_name\}\}/g, recipient.firstName);
      result = result.replace(/\{\{last_name\}\}/g, recipient.lastName);
      result = result.replace(/\{\{email\}\}/g, recipient.email);
      result = result.replace(/\{\{badge_number\}\}/g, recipient.badgeNumber);
      result = result.replace(/\{\{rank\}\}/g, recipient.rank);
      result = result.replace(/\{\{department\}\}/g, recipient.department);
    } else if (selectedRecipients.length === 1) {
      // Use first selected recipient for preview
      const firstRecipient = allUsers.find(u => u.id === selectedRecipients[0]);
      if (firstRecipient) {
        result = result.replace(/\{\{name\}\}/g, `${firstRecipient.firstName} ${firstRecipient.lastName}`);
        result = result.replace(/\{\{first_name\}\}/g, firstRecipient.firstName);
        result = result.replace(/\{\{last_name\}\}/g, firstRecipient.lastName);
        result = result.replace(/\{\{email\}\}/g, firstRecipient.email);
        result = result.replace(/\{\{badge_number\}\}/g, firstRecipient.badgeNumber);
        result = result.replace(/\{\{rank\}\}/g, firstRecipient.rank);
        result = result.replace(/\{\{department\}\}/g, firstRecipient.department);
      }
    }
    
    // Replace sender placeholders
    if (user) {
      result = result.replace(/\{\{sender_name\}\}/g, `${user.rank} ${user.firstName} ${user.lastName}`);
      result = result.replace(/\{\{sender_email\}\}/g, user.email);
    }
    
    // Replace date placeholder
    result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
    
    return result;
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (!templateId) {
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Replace placeholders with actual values
      const processedSubject = replacePlaceholders(template.subject);
      const processedBody = replacePlaceholders(template.body);
      
      setSubject(processedSubject);
      setBody(processedBody);
    }
  };

  // Extract placeholders from text
  const extractPlaceholders = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const placeholders: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }
    return placeholders;
  };

  // Handle template form submission
  const handleSaveTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) {
      setErrorMessage('Please fill in all required fields');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
      return;
    }

    const placeholders = [
      ...extractPlaceholders(templateForm.subject),
      ...extractPlaceholders(templateForm.body),
    ].filter((v, i, a) => a.indexOf(v) === i);

    if (editingTemplate) {
      // Update existing template
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id
          ? {
              ...t,
              name: templateForm.name,
              subject: templateForm.subject,
              body: templateForm.body,
              category: templateForm.category,
              description: templateForm.description,
              placeholders,
              updatedAt: new Date().toISOString(),
            }
          : t
      ));
    } else {
      // Create new template
      const newTemplate: EmailTemplate = {
        id: `custom-${Date.now()}`,
        name: templateForm.name,
        subject: templateForm.subject,
        body: templateForm.body,
        category: templateForm.category,
        description: templateForm.description,
        placeholders,
        isDefault: false,
        createdBy: user?.id,
        createdByName: user ? `${user.firstName} ${user.lastName}` : undefined,
        createdAt: new Date().toISOString(),
      };
      setTemplates(prev => [...prev, newTemplate]);
    }

    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      subject: '',
      body: '',
      category: 'custom',
      description: '',
    });
    
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // Handle template edit
  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      description: template.description || '',
    });
    setShowTemplateModal(true);
  };

  // Handle template delete
  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    setShowDeleteConfirm(null);
  };

  // Insert placeholder at cursor position
  const insertPlaceholder = (placeholder: string, field: 'subject' | 'body') => {
    const text = `{{${placeholder}}}`;
    if (field === 'subject') {
      setTemplateForm(prev => ({
        ...prev,
        subject: prev.subject + text,
      }));
    } else {
      setTemplateForm(prev => ({
        ...prev,
        body: prev.body + text,
      }));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRecipients.length === 0) {
      setErrorMessage('Please select at least one recipient');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Please enter a subject');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Please enter a message');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
      return;
    }

    setIsSending(true);
    
    try {
      const selectedUsersList = getSelectedUsers();
      const recipientEmails = selectedUsersList.map(u => u.email);
      
      // Add signature to body if configured
      let fullBody = body;
      if (emailSettings.emailSignature) {
        fullBody += `\n\n---\n${emailSettings.emailSignature}`;
      }
      
      // Build SMTP configuration object
      const smtpConfig = emailSettings.smtpEnabled ? {
        smtpEnabled: emailSettings.smtpEnabled,
        smtpHost: emailSettings.smtpHost,
        smtpPort: emailSettings.smtpPort,
        smtpUsername: emailSettings.smtpUsername,
        smtpPassword: emailSettings.smtpPassword,
        smtpSecure: emailSettings.smtpSecure,
        fromEmail: emailSettings.fromEmail,
        fromName: emailSettings.fromName,
      } : undefined;
      
      const { data, error } = await supabase.functions.invoke('send-approval-email', {
        body: {
          type: emailType === 'mass' ? 'mass' : 'general',
          recipientEmail: recipientEmails,
          subject,
          body: fullBody,
          senderName: `${user?.rank} ${user?.firstName} ${user?.lastName}`,
          senderEmail: user?.email,
          smtp: smtpConfig,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log the email
      const newLog: EmailLog = {
        id: Date.now().toString(),
        sentAt: new Date().toISOString(),
        type: emailType,
        subject,
        recipients: selectedUsersList.map(u => `${u.firstName} ${u.lastName}`),
        status: data?.success ? 'sent' : 'failed',
        error: data?.success ? undefined : (data?.message || 'Some emails may have failed'),
      };
      
      const updatedLogs = [newLog, ...emailLogs].slice(0, 100); // Keep last 100 logs
      setEmailLogs(updatedLogs);
      localStorage.setItem('emailLogs', JSON.stringify(updatedLogs));

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Reset form
      setSelectedRecipients([]);
      setSubject('');
      setBody('');
      setSelectedTemplateId('');
    } catch (err) {
      console.error('Error sending email:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send email');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    } finally {
      setIsSending(false);
    }
  };


  const handleSaveSettings = () => {
    setIsSavingSettings(true);
    setTestEmailMessage('');
    
    // Save to localStorage
    localStorage.setItem('emailSettings', JSON.stringify(emailSettings));
    
    setTimeout(() => {
      setIsSavingSettings(false);
      setTestEmailMessage('settings_saved');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 500);
  };

  const handleSendTestEmail = async () => {
    if (!user?.email) {
      setErrorMessage('No email address found for current user');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
      return;
    }

    setIsSendingTestEmail(true);
    setTestEmailMessage('');

    try {
      // Build test email body
      let testBody = `Hello ${user.firstName},\n\nThis is a test email from the Training Management System to verify that your email configuration is working correctly.\n\nIf you received this email, your email settings are properly configured and working.`;
      
      if (emailSettings.emailSignature) {
        testBody += `\n\n---\n${emailSettings.emailSignature}`;
      }

      // Build SMTP configuration object for test email
      const smtpConfig = emailSettings.smtpEnabled ? {
        smtpEnabled: emailSettings.smtpEnabled,
        smtpHost: emailSettings.smtpHost,
        smtpPort: emailSettings.smtpPort,
        smtpUsername: emailSettings.smtpUsername,
        smtpPassword: emailSettings.smtpPassword,
        smtpSecure: emailSettings.smtpSecure,
        fromEmail: emailSettings.fromEmail,
        fromName: emailSettings.fromName,
      } : undefined;

      const { data, error } = await supabase.functions.invoke('send-approval-email', {
        body: {
          type: 'general',
          recipientEmail: [user.email],
          subject: 'Test Email - Training Management System',
          body: testBody,
          senderName: emailSettings.fromName || 'Training Management System',
          senderEmail: emailSettings.replyToEmail || user.email,
          smtp: smtpConfig,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        // Log the test email
        const newLog: EmailLog = {
          id: Date.now().toString(),
          sentAt: new Date().toISOString(),
          type: 'test',
          subject: 'Test Email - Training Management System',
          recipients: [`${user.firstName} ${user.lastName}`],
          status: 'sent',
        };
        
        const updatedLogs = [newLog, ...emailLogs].slice(0, 100);
        setEmailLogs(updatedLogs);
        localStorage.setItem('emailLogs', JSON.stringify(updatedLogs));

        setTestEmailMessage('test_success');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      } else {
        throw new Error(data?.error || data?.message || 'Failed to send test email');
      }
    } catch (err) {
      console.error('Error sending test email:', err);
      setTestEmailMessage('test_error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send test email. Please check your email configuration.');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setIsSendingTestEmail(false);
    }
  };


  const getSelectedUsers = () => {
    return allUsers.filter(u => selectedRecipients.includes(u.id));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const clearLogs = () => {
    setEmailLogs([]);
    localStorage.removeItem('emailLogs');
  };

  // Template icon component
  const TemplateIcon = ({ size = 18 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Email Center</h1>
          <p className="text-slate-600 mt-1">Compose emails, manage templates, and configure settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('compose')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'compose'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <EmailIcon size={18} />
              Compose Email
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <TemplateIcon size={18} />
              Templates
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <SettingsIcon size={18} />
              Email Settings
            </div>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshIcon size={18} />
              Email Logs
            </div>
          </button>
        </nav>
      </div>

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Email Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSend} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Email Type Toggle */}
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailType('single')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      emailType === 'single'
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Single Recipient
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailType('mass')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      emailType === 'mass'
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Mass Email
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Template Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Use Template (Optional)
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    <option value="">-- Select a template --</option>
                    {templateCategories.map(cat => {
                      const categoryTemplates = templates.filter(t => t.category === cat.value);
                      if (categoryTemplates.length === 0) return null;
                      return (
                        <optgroup key={cat.value} label={cat.label}>
                          {categoryTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  {selectedTemplateId && (
                    <p className="mt-1 text-xs text-slate-500">
                      Placeholders will be replaced with recipient data when sending
                    </p>
                  )}
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Recipients ({selectedRecipients.length} selected)
                  </label>
                  <div
                    onClick={() => setShowRecipientPicker(true)}
                    className="min-h-[48px] p-3 border border-slate-300 rounded-lg cursor-pointer hover:border-amber-500 transition-colors"
                  >
                    {selectedRecipients.length === 0 ? (
                      <span className="text-slate-400">Click to select recipients...</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {getSelectedUsers().slice(0, 5).map(u => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm"
                          >
                            {u.firstName} {u.lastName}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRecipient(u.id);
                              }}
                              className="hover:text-amber-600"
                            >
                              <XIcon size={14} />
                            </button>
                          </span>
                        ))}
                        {selectedRecipients.length > 5 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-sm">
                            +{selectedRecipients.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                </div>

                {/* Attachments Section */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Attachments
                    {attachments.length > 0 && (
                      <span className="ml-2 text-slate-500 font-normal">
                        ({attachments.length} file{attachments.length !== 1 ? 's' : ''}, {formatFileSize(totalAttachmentSize)})
                      </span>
                    )}
                  </label>
                  
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
                    />
                    
                    {isUploading ? (
                      <div className="space-y-2">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-slate-600">Uploading... {Math.round(uploadProgress)}%</p>
                        <div className="w-48 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadIcon size={32} />
                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-medium text-amber-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          PDF, Word, Excel, images up to 10MB each (25MB total)
                        </p>
                      </>
                    )}
                  </div>

                  {/* Attachment Previews */}
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map(attachment => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <FileIcon type={attachment.contentType} size={24} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                          {attachment.contentType.startsWith('image/') && (
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(attachment.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove attachment"
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signature Preview */}
                {emailSettings.emailSignature && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Signature will be added:</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{emailSettings.emailSignature}</p>
                  </div>
                )}

                {/* Send Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSending || isUploading}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <EmailIcon size={18} />
                    )}
                    Send {emailType === 'mass' ? 'Mass ' : ''}Email
                    {attachments.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                        {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                </div>

            </form>
          </div>

          {/* Quick Select */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-4">Quick Select</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left"
                >
                  Select All Personnel
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-4">Select by Department</h3>
              <div className="space-y-2">
                {departments.map(dept => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => selectByDepartment(dept)}
                    className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left"
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {emailType === 'mass' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertIcon className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-medium text-amber-800">Mass Email Notice</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Mass emails will be sent to all selected recipients. Please review before sending.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Header with Create Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <select
                value={templateCategoryFilter}
                onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Categories</option>
                {templateCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({
                  name: '',
                  subject: '',
                  body: '',
                  category: 'custom',
                  description: '',
                });
                setShowTemplateModal(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusIcon size={18} />
              Create Template
            </button>
          </div>

          {/* Templates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{template.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                        template.category === 'approval' ? 'bg-green-100 text-green-700' :
                        template.category === 'notification' ? 'bg-blue-100 text-blue-700' :
                        template.category === 'reminder' ? 'bg-yellow-100 text-yellow-700' :
                        template.category === 'general' ? 'bg-slate-100 text-slate-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                      </span>
                      {template.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ml-1 bg-amber-100 text-amber-700">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">{template.description}</p>
                  )}
                  
                  <div className="text-sm text-slate-600 mb-3">
                    <p className="font-medium truncate">Subject: {template.subject}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.placeholders.slice(0, 4).map(p => (
                      <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {`{{${p}}}`}
                      </span>
                    ))}
                    {template.placeholders.length > 4 && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        +{template.placeholders.length - 4} more
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      {template.isDefault ? 'System template' : `Created ${new Date(template.createdAt).toLocaleDateString()}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="Edit template"
                      >
                        <EditIcon size={16} />
                      </button>
                      {!template.isDefault && (
                        <button
                          onClick={() => setShowDeleteConfirm(template.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete template"
                        >
                          <TrashIcon size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <TemplateIcon size={48} />
              <h3 className="mt-4 text-lg font-medium text-slate-800">No templates found</h3>
              <p className="text-slate-500 mt-1">
                {templateSearchQuery || templateCategoryFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first email template to get started'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Email Configuration</h2>
              <p className="text-sm text-slate-500 mt-1">Configure email sender information and notification preferences</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* SMTP Server Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M6 8h.01M10 8h.01M6 12h.01M10 12h.01M14 12h.01M6 16h.01M10 16h.01M14 16h.01M18 16h.01" />
                    </svg>
                    SMTP Server Configuration
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-slate-600">Enable SMTP</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={emailSettings.smtpEnabled}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </div>
                  </label>
                </div>
                
                <div className={`space-y-4 ${!emailSettings.smtpEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={emailSettings.smtpHost}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="smtp.example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        value={emailSettings.smtpPort}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="587"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        SMTP Username
                      </label>
                      <input
                        type="text"
                        value={emailSettings.smtpUsername}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpUsername: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="username@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        SMTP Password
                      </label>
                      <div className="relative">
                        <input
                          type={showSmtpPassword ? 'text' : 'password'}
                          value={emailSettings.smtpPassword}
                          onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showSmtpPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailSettings.smtpSecure}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpSecure: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm text-slate-700">Use TLS/SSL encryption</span>
                    </label>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500">
                      <strong>Common SMTP Settings:</strong><br />
                      • Gmail: smtp.gmail.com, Port 587 (TLS) or 465 (SSL)<br />
                      • Outlook: smtp-mail.outlook.com, Port 587<br />
                      • Yahoo: smtp.mail.yahoo.com, Port 587 or 465<br />
                      • Custom: Check with your email provider
                    </p>
                  </div>
                </div>
              </div>

              {/* Sender Information */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="font-medium text-slate-800 flex items-center gap-2">
                  <EmailIcon size={18} className="text-amber-500" />
                  Sender Information
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      From Name
                    </label>
                    <input
                      type="text"
                      value={emailSettings.fromName}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Training Management System"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      value={emailSettings.fromEmail}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Reply-To Email
                  </label>
                  <input
                    type="email"
                    value={emailSettings.replyToEmail}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, replyToEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Signature
                  </label>
                  <textarea
                    value={emailSettings.emailSignature}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, emailSignature: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                    placeholder="Enter your email signature..."
                  />
                </div>
              </div>


              {/* Notification Preferences */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="font-medium text-slate-800 flex items-center gap-2">
                  <AlertIcon size={18} className="text-amber-500" />
                  Automatic Notification Settings
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailSettings.notifyOnSubmission}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, notifyOnSubmission: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-medium text-slate-700">New Request Submissions</p>
                      <p className="text-sm text-slate-500">Notify approvers when new requests are submitted</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailSettings.notifyOnApproval}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, notifyOnApproval: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-medium text-slate-700">Request Approvals</p>
                      <p className="text-sm text-slate-500">Notify requesters and next approvers when requests are approved</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailSettings.notifyOnDenial}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, notifyOnDenial: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-medium text-slate-700">Request Denials</p>
                      <p className="text-sm text-slate-500">Notify requesters when their requests are denied</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailSettings.notifyOnCertExpiry}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, notifyOnCertExpiry: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-medium text-slate-700">Certificate Expiration Warnings</p>
                      <p className="text-sm text-slate-500">Notify users when their certificates are about to expire</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailSettings.notifyOnTrainingReminder}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, notifyOnTrainingReminder: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-medium text-slate-700">Training Reminders</p>
                      <p className="text-sm text-slate-500">Send reminders for upcoming training sessions</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Timing Settings */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="font-medium text-slate-800 flex items-center gap-2">
                  <SettingsIcon size={18} className="text-amber-500" />
                  Notification Timing
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Training Reminder (days before)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={emailSettings.reminderDaysBefore}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, reminderDaysBefore: parseInt(e.target.value) || 7 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Certificate Expiry Warning (days before)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={emailSettings.certExpiryDaysBefore}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, certExpiryDaysBefore: parseInt(e.target.value) || 30 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* API Configuration Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <AlertIcon size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800">Email Service Configuration</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {emailSettings.smtpEnabled ? (
                        <>
                          <strong>SMTP is enabled.</strong> Emails will be sent using your configured SMTP server ({emailSettings.smtpHost || 'not configured'}).
                        </>
                      ) : (
                        <>
                          This system uses Resend for email delivery by default. To enable actual email sending, ensure the 
                          <code className="mx-1 px-1.5 py-0.5 bg-blue-100 rounded text-xs">RESEND_API_KEY</code> 
                          environment variable is configured in your Supabase edge function settings.
                        </>
                      )}
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      {emailSettings.smtpEnabled 
                        ? 'Make sure to save your settings and test the configuration before sending emails.'
                        : 'Alternatively, enable SMTP above to use your own email server.'}
                    </p>
                  </div>
                </div>
              </div>


              {/* Test Email Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="font-medium text-slate-800 flex items-center gap-2">
                  <EmailIcon size={18} className="text-amber-500" />
                  Test Email Configuration
                </h3>
                
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-4">
                    Send a test email to your email address (<span className="font-medium">{user?.email}</span>) to verify that the email configuration is working correctly.
                  </p>
                  
                  {/* Test Email Result Messages */}
                  {testEmailMessage === 'test_success' && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                      <CheckIcon size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Test email sent successfully!</p>
                        <p className="text-sm text-green-700 mt-1">
                          Check your inbox at <span className="font-medium">{user?.email}</span> to confirm delivery.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {testEmailMessage === 'test_error' && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <XIcon size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Failed to send test email</p>
                        <p className="text-sm text-red-700 mt-1">
                          Please check that the RESEND_API_KEY is properly configured in your Supabase edge function settings.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleSendTestEmail}
                    disabled={isSendingTestEmail || !user?.email}
                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isSendingTestEmail ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending Test Email...
                      </>
                    ) : (
                      <>
                        <EmailIcon size={18} />
                        Send Test Email
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSavingSettings ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckIcon size={18} />
                  )}
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Email History</h2>
              <p className="text-sm text-slate-500">View sent emails and their status</p>
            </div>
            {emailLogs.length > 0 && (
              <button
                onClick={clearLogs}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Clear History
              </button>
            )}
          </div>
          
          {emailLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <EmailIcon size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No emails sent yet</h3>
              <p className="text-slate-500">Your email history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {emailLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          log.status === 'sent' 
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{log.type}</span>
                      </div>
                      <h4 className="font-medium text-slate-800 truncate">{log.subject}</h4>
                      <p className="text-sm text-slate-500 mt-1">
                        To: {log.recipients.slice(0, 3).join(', ')}
                        {log.recipients.length > 3 && ` +${log.recipients.length - 3} more`}
                      </p>
                      {log.error && (
                        <p className="text-sm text-red-600 mt-1">{log.error}</p>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(log.sentAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recipient Picker Modal */}
      {showRecipientPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Select Recipients</h2>
              <button
                onClick={() => setShowRecipientPicker(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or badge..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                >
                  <option value="all">All Roles</option>
                  {roles.map(role => (
                    <option key={role} value={role} className="capitalize">{role}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredUsers.map(u => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRecipients.includes(u.id)
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(u.id)}
                      onChange={() => toggleRecipient(u.id)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <img
                      src={u.avatar}
                      alt={`${u.firstName} ${u.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">
                        {u.rank} {u.firstName} {u.lastName}
                      </div>
                      <div className="text-sm text-slate-500 truncate">{u.email}</div>
                    </div>
                    <span className="text-xs text-slate-500">#{u.badgeNumber}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {selectedRecipients.length} selected
              </span>
              <button
                onClick={() => setShowRecipientPicker(false)}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g., Training Approval Notice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value as EmailTemplate['category'] }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    {templateCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Brief description of when to use this template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Email subject line with {{placeholders}}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
                  rows={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none font-mono text-sm"
                  placeholder="Email body with {{placeholders}}"
                />
              </div>

              {/* Available Placeholders */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-3">Available Placeholders</h4>
                <p className="text-xs text-slate-500 mb-3">Click to insert into subject or body</p>
                <div className="flex flex-wrap gap-2">
                  {availablePlaceholders.map(p => (
                    <div key={p.key} className="group relative">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => insertPlaceholder(p.key, 'subject')}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-l text-xs font-mono hover:bg-amber-50 hover:border-amber-300 transition-colors"
                          title={`Add to subject: ${p.description}`}
                        >
                          {`{{${p.key}}}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertPlaceholder(p.key, 'body')}
                          className="px-1.5 py-1 bg-white border border-l-0 border-slate-200 rounded-r text-xs hover:bg-amber-50 hover:border-amber-300 transition-colors"
                          title="Add to body"
                        >
                          <PlusIcon size={12} />
                        </button>
                      </div>
                      <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {p.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckIcon size={18} />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Template?</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTemplate(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
          <CheckIcon size={20} />
          <span className="font-medium">
            {testEmailMessage === 'test_success' ? 'Test email sent successfully!' : 
             testEmailMessage === 'settings_saved' ? 'Settings saved successfully!' : 
             activeTab === 'templates' ? (editingTemplate ? 'Template updated!' : 'Template created!') :
             'Email sent successfully!'}
          </span>
        </div>

      )}

      {/* Error Toast */}
      {showErrorToast && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
          <XIcon size={20} />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default EmailComposer;
