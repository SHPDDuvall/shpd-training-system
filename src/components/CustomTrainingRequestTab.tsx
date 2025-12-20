import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendSubmissionNotification } from '@/lib/emailService';
import { User, ApprovalRank, CustomTrainingRequest, CustomFormField, CustomFieldType, CustomFieldValue, CustomFieldOption } from '@/types';
import {
  PlusIcon,
  XIcon,
  CheckIcon,
  CalendarIcon,
  LocationIcon,
  ClockIcon,
  HierarchyIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  AccountingIcon,
  SettingsIcon,
  RefreshIcon,
  EmailIcon,
} from '@/components/icons/Icons';
import ApprovalRanksSettings from './ApprovalRanksSettings';

const DEFAULT_APPROVAL_RANKS: ApprovalRank[] = ['Sergeant', 'Lieutenant', 'Commander', 'Chief'];

const trainingTypes = [
  { value: 'individual', label: 'Individual Training' },
  { value: 'group', label: 'Group Training' },
  { value: 'department', label: 'Department-Wide Training' },
];

const fieldTypes: { value: CustomFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text Input', icon: 'Aa' },
  { value: 'textarea', label: 'Text Area', icon: '¶' },
  { value: 'number', label: 'Number', icon: '#' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'dropdown', label: 'Dropdown', icon: '▼' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑' },
  { value: 'email', label: 'Email', icon: '@' },
  { value: 'phone', label: 'Phone', icon: '☎' },
  { value: 'url', label: 'URL', icon: '🔗' },
];

// Database field type (snake_case)
interface DbCustomFormField {
  id: string;
  name: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  placeholder: string | null;
  help_text: string | null;
  options: CustomFieldOption[] | null;
  validation: Record<string, unknown> | null;
  order: number;
  active: boolean;
  created_at: string;
}

// Database request type (snake_case)
interface DbCustomTrainingRequest {
  id: string;
  user_id: string;
  user_name: string | null;
  user_badge: string | null;
  training_title: string;
  training_description: string;
  training_type: string;
  requested_date: string;
  duration: string;
  location: string;
  estimated_cost: number;
  justification: string;
  target_ranks: ApprovalRank[];
  approval_chain: ApprovalRank[];
  current_approval_level: number;
  status: CustomTrainingRequest['status'];
  submitted_date: string;
  notes: string | null;
  custom_field_values: CustomFieldValue[];
  created_at: string;
  updated_at: string;
}

// Convert database field to app field (snake_case to camelCase)
const dbToAppField = (dbField: DbCustomFormField): CustomFormField => ({
  id: dbField.id,
  name: dbField.name,
  label: dbField.label,
  type: dbField.type,
  required: dbField.required,
  placeholder: dbField.placeholder || undefined,
  helpText: dbField.help_text || undefined,
  options: dbField.options || undefined,
  validation: dbField.validation as CustomFormField['validation'],
  order: dbField.order,
  active: dbField.active,
  createdAt: dbField.created_at,
});

// Convert app field to database field (camelCase to snake_case)
const appToDbField = (appField: Partial<CustomFormField>): Partial<DbCustomFormField> => ({
  name: appField.name,
  label: appField.label,
  type: appField.type,
  required: appField.required,
  placeholder: appField.placeholder || null,
  help_text: appField.helpText || null,
  options: appField.options || null,
  validation: appField.validation || null,
  order: appField.order,
  active: appField.active,
});

// Convert database request to app request (snake_case to camelCase)
const dbToAppRequest = (dbRequest: DbCustomTrainingRequest): CustomTrainingRequest & { customFields?: CustomFieldValue[] } => ({
  id: dbRequest.id,
  userId: dbRequest.user_id,
  userName: dbRequest.user_name || undefined,
  userBadge: dbRequest.user_badge || undefined,
  trainingTitle: dbRequest.training_title,
  trainingDescription: dbRequest.training_description,
  trainingType: dbRequest.training_type as 'individual' | 'group' | 'department',
  requestedDate: dbRequest.requested_date,
  duration: dbRequest.duration,
  location: dbRequest.location,
  estimatedCost: dbRequest.estimated_cost,
  justification: dbRequest.justification,
  targetRanks: dbRequest.target_ranks,
  approvalChain: dbRequest.approval_chain,
  currentApprovalLevel: dbRequest.current_approval_level,
  status: dbRequest.status,
  submittedDate: dbRequest.submitted_date,
  notes: dbRequest.notes || undefined,
  createdAt: dbRequest.created_at,
  customFields: dbRequest.custom_field_values,
});

// Convert app request to database request (camelCase to snake_case)
const appToDbRequest = (appRequest: Partial<CustomTrainingRequest & { customFields?: CustomFieldValue[] }>): Partial<DbCustomTrainingRequest> => ({
  user_id: appRequest.userId,
  user_name: appRequest.userName || null,
  user_badge: appRequest.userBadge || null,
  training_title: appRequest.trainingTitle,
  training_description: appRequest.trainingDescription,
  training_type: appRequest.trainingType,
  requested_date: appRequest.requestedDate,
  duration: appRequest.duration,
  location: appRequest.location,
  estimated_cost: appRequest.estimatedCost,
  justification: appRequest.justification,
  target_ranks: appRequest.targetRanks,
  approval_chain: appRequest.approvalChain,
  current_approval_level: appRequest.currentApprovalLevel,
  status: appRequest.status,
  submitted_date: appRequest.submittedDate,
  notes: appRequest.notes || null,
  custom_field_values: appRequest.customFields || [],
});

const CustomTrainingRequestTab: React.FC = () => {
  const { user, allUsers } = useAuth();
  const [approvalRanks, setApprovalRanks] = useState<ApprovalRank[]>(DEFAULT_APPROVAL_RANKS);
  const [showRanksSettings, setShowRanksSettings] = useState(false);
  const [requests, setRequests] = useState<(CustomTrainingRequest & { customFields?: CustomFieldValue[] })[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Fields Management
  const [customFields, setCustomFields] = useState<CustomFormField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showFieldManager, setShowFieldManager] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<CustomFormField | null>(null);
  const [isSavingField, setIsSavingField] = useState(false);
  
  // New field form state
  const [newField, setNewField] = useState<Partial<CustomFormField>>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    helpText: '',
    options: [],
    active: true,
  });
  const [newOption, setNewOption] = useState('');

  // Fetch custom fields, requests, and approval ranks from database on mount
  useEffect(() => {
    fetchCustomFields();
    fetchRequests();
    fetchApprovalRanks();
  }, []);

  const fetchApprovalRanks = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'approval_ranks')
        .single();

      if (data && data.setting_value) {
        setApprovalRanks(JSON.parse(data.setting_value));
      }
    } catch (err) {
      console.error('Error loading approval ranks:', err);
      // Keep default ranks if loading fails
    }
  };

  const fetchCustomFields = async () => {
    setIsLoadingFields(true);
    setFieldError(null);
    
    try {
      const { data, error } = await supabase
        .from('custom_form_fields')
        .select('*')
        .order('order', { ascending: true });
      
      if (error) {
        console.error('Error fetching custom fields:', error);
        setFieldError('Failed to load custom fields. Please try again.');
        return;
      }
      
      const appFields = (data as DbCustomFormField[]).map(dbToAppField);
      setCustomFields(appFields);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      setFieldError('Failed to load custom fields. Please try again.');
    } finally {
      setIsLoadingFields(false);
    }
  };

  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    setRequestError(null);
    
    try {
      const { data, error } = await supabase
        .from('custom_training_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching requests:', error);
        setRequestError('Failed to load training requests. Please try again.');
        return;
      }
      
      const appRequests = (data as DbCustomTrainingRequest[]).map(dbToAppRequest);
      setRequests(appRequests);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setRequestError('Failed to load training requests. Please try again.');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    trainingTitle: '',
    trainingDescription: '',
    trainingType: 'individual' as 'individual' | 'group' | 'department',
    requestedDate: '',
    duration: '',
    location: '',
    estimatedCost: 0,
    justification: '',
    targetRanks: [] as ApprovalRank[],
    approvalChain: [] as ApprovalRank[],
    notes: '',
  });
  
  // Custom field values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>({});

  // Initialize custom field values when form opens
  useEffect(() => {
    if (showForm) {
      const initialValues: Record<string, string | number | boolean> = {};
      customFields.filter(f => f.active).forEach(field => {
        if (field.type === 'checkbox') {
          initialValues[field.id] = field.defaultValue as boolean || false;
        } else if (field.type === 'number') {
          initialValues[field.id] = field.defaultValue as number || 0;
        } else {
          initialValues[field.id] = field.defaultValue as string || '';
        }
      });
      setCustomFieldValues(initialValues);
    }
  }, [showForm, customFields]);

  // Get users by rank for display
  const getUsersByRank = (rank: string): User[] => {
    return allUsers.filter(u => 
      u.rank.toLowerCase().includes(rank.toLowerCase())
    );
  };

  const handleToggleTargetRank = (rank: ApprovalRank) => {
    setFormData(prev => ({
      ...prev,
      targetRanks: prev.targetRanks.includes(rank)
        ? prev.targetRanks.filter(r => r !== rank)
        : [...prev.targetRanks, rank],
    }));
  };

  const handleToggleApprovalRank = (rank: ApprovalRank) => {
    setFormData(prev => {
      const newChain = prev.approvalChain.includes(rank)
        ? prev.approvalChain.filter(r => r !== rank)
        : [...prev.approvalChain, rank];
      
      // Sort by hierarchy: Sergeant -> Lieutenant -> Commander -> Chief
      const sortOrder: Record<ApprovalRank, number> = {
        'Sergeant': 1,
        'Lieutenant': 2,
        'Commander': 3,
        'Chief': 4,
      };
      
      return {
        ...prev,
        approvalChain: newChain.sort((a, b) => sortOrder[a] - sortOrder[b]),
      };
    });
  };

  // Map rank to status
  const rankToStatus: Record<ApprovalRank, CustomTrainingRequest['status']> = {
    'Sergeant': 'sergeant_review',
    'Lieutenant': 'lieutenant_review',
    'Commander': 'commander_review',
    'Chief': 'chief_approval',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setRequestError(null);

    // Prepare custom field values for storage
    const customFieldData: CustomFieldValue[] = customFields
      .filter(f => f.active)
      .map(field => ({
        fieldId: field.id,
        fieldName: field.name,
        fieldLabel: field.label,
        value: customFieldValues[field.id],
      }));

    // Determine initial status based on first approver in chain
    const firstApprover = formData.approvalChain[0];
    const initialStatus = firstApprover ? rankToStatus[firstApprover] : 'submitted';

    const newRequest = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userBadge: user.badgeNumber,
      trainingTitle: formData.trainingTitle,
      trainingDescription: formData.trainingDescription,
      trainingType: formData.trainingType,
      requestedDate: formData.requestedDate,
      duration: formData.duration,
      location: formData.location,
      estimatedCost: formData.estimatedCost,
      justification: formData.justification,
      targetRanks: formData.targetRanks,
      approvalChain: formData.approvalChain,
      currentApprovalLevel: 0,
      status: initialStatus,
      submittedDate: new Date().toISOString().split('T')[0],
      notes: formData.notes,
      customFields: customFieldData,
    };

    try {

      const dbRequest = appToDbRequest(newRequest);
      
      const { data, error } = await supabase
        .from('custom_training_requests')
        .insert([dbRequest])
        .select()
        .single();
      
      if (error) {
        console.error('Error submitting request:', error);
        setRequestError('Failed to submit request. Please try again.');
        setIsSubmitting(false);
        return;
      }
      
      const appRequest = dbToAppRequest(data as DbCustomTrainingRequest);
      setRequests(prev => [appRequest, ...prev]);
      
      // Send email notification to the first approver
      try {
        await sendSubmissionNotification(appRequest, allUsers);
        console.log('Submission notification sent successfully');
      } catch (emailError) {
        console.error('Error sending submission notification:', emailError);
        // Don't fail the submission if email fails
      }
      
      resetForm();
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err) {
      console.error('Error submitting request:', err);
      setRequestError('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    
    setRequestError(null);
    
    try {
      const { error } = await supabase
        .from('custom_training_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) {
        console.error('Error deleting request:', error);
        setRequestError('Failed to delete request. Please try again.');
        return;
      }
      
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Error deleting request:', err);
      setRequestError('Failed to delete request. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      trainingTitle: '',
      trainingDescription: '',
      trainingType: 'individual',
      requestedDate: '',
      duration: '',
      location: '',
      estimatedCost: 0,
      justification: '',
      targetRanks: [],
      approvalChain: [],
      notes: '',
    });
    setCustomFieldValues({});
    setShowForm(false);
  };

  // Custom Field Management Functions - Now using database
  const handleAddField = async () => {
    if (!newField.name || !newField.label) return;
    
    setIsSavingField(true);
    setFieldError(null);
    
    try {
      // Prepare options - stringify for JSON column
      const optionsValue = newField.options && newField.options.length > 0 
        ? JSON.stringify(newField.options) 
        : null;
      
      const dbField = {
        name: newField.name.toLowerCase().replace(/\s+/g, '_'),
        label: newField.label,
        type: newField.type || 'text',
        required: newField.required || false,
        placeholder: newField.placeholder || null,
        help_text: newField.helpText || null,
        options: optionsValue,
        validation: null,
        order: customFields.length,
        active: true,
      };
      
      const { data, error } = await supabase
        .from('custom_form_fields')
        .insert([dbField])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding field:', error);
        setFieldError(`Failed to add field: ${error.message}`);
        return;
      }
      
      const appField = dbToAppField(data as DbCustomFormField);
      setCustomFields(prev => [...prev, appField]);
      resetNewField();
      setShowAddField(false);
    } catch (err) {
      console.error('Error adding field:', err);
      setFieldError('Failed to add field. Please try again.');
    } finally {
      setIsSavingField(false);
    }
  };


  const handleUpdateField = async () => {
    if (!editingField || !newField.name || !newField.label) return;
    
    setIsSavingField(true);
    setFieldError(null);
    
    try {
      // Prepare options - stringify for JSON column
      const optionsValue = newField.options && newField.options.length > 0 
        ? JSON.stringify(newField.options) 
        : null;
      
      const dbField = {
        name: newField.name.toLowerCase().replace(/\s+/g, '_'),
        label: newField.label,
        type: newField.type || 'text',
        required: newField.required || false,
        placeholder: newField.placeholder || null,
        help_text: newField.helpText || null,
        options: optionsValue,
      };
      
      const { error } = await supabase
        .from('custom_form_fields')
        .update(dbField)
        .eq('id', editingField.id);
      
      if (error) {
        console.error('Error updating field:', error);
        setFieldError(`Failed to update field: ${error.message}`);
        return;
      }
      
      setCustomFields(prev => prev.map(f => 
        f.id === editingField.id 
          ? {
              ...f,
              name: newField.name!.toLowerCase().replace(/\s+/g, '_'),
              label: newField.label!,
              type: newField.type || 'text',
              required: newField.required || false,
              placeholder: newField.placeholder || '',
              helpText: newField.helpText || '',
              options: newField.options || [],
            }
          : f
      ));
      resetNewField();
      setEditingField(null);
      setShowAddField(false);
    } catch (err) {
      console.error('Error updating field:', err);
      setFieldError('Failed to update field. Please try again.');
    } finally {
      setIsSavingField(false);
    }
  };


  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    
    setFieldError(null);
    
    try {
      const { error } = await supabase
        .from('custom_form_fields')
        .delete()
        .eq('id', fieldId);
      
      if (error) {
        console.error('Error deleting field:', error);
        setFieldError('Failed to delete field. Please try again.');
        return;
      }
      
      setCustomFields(prev => prev.filter(f => f.id !== fieldId));
    } catch (err) {
      console.error('Error deleting field:', err);
      setFieldError('Failed to delete field. Please try again.');
    }
  };

  const handleToggleFieldActive = async (fieldId: string) => {
    const field = customFields.find(f => f.id === fieldId);
    if (!field) return;
    
    setFieldError(null);
    
    try {
      const { error } = await supabase
        .from('custom_form_fields')
        .update({ active: !field.active })
        .eq('id', fieldId);
      
      if (error) {
        console.error('Error toggling field:', error);
        setFieldError('Failed to update field. Please try again.');
        return;
      }
      
      setCustomFields(prev => prev.map(f => 
        f.id === fieldId ? { ...f, active: !f.active } : f
      ));
    } catch (err) {
      console.error('Error toggling field:', err);
      setFieldError('Failed to update field. Please try again.');
    }
  };

  const handleEditField = (field: CustomFormField) => {
    setEditingField(field);
    setNewField({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder,
      helpText: field.helpText,
      options: field.options || [],
    });
    setShowAddField(true);
  };

  const resetNewField = () => {
    setNewField({
      name: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      helpText: '',
      options: [],
      active: true,
    });
    setNewOption('');
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    setNewField(prev => ({
      ...prev,
      options: [...(prev.options || []), { value: newOption.toLowerCase().replace(/\s+/g, '_'), label: newOption }],
    }));
    setNewOption('');
  };

  const handleRemoveOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || [],
    }));
  };

  const moveField = async (fieldId: string, direction: 'up' | 'down') => {
    const index = customFields.findIndex(f => f.id === fieldId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === customFields.length - 1) return;
    
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const currentField = customFields[index];
    const swapField = customFields[swapIndex];
    
    setFieldError(null);
    
    try {
      // Update both fields' order in the database
      const { error: error1 } = await supabase
        .from('custom_form_fields')
        .update({ order: swapIndex })
        .eq('id', currentField.id);
      
      const { error: error2 } = await supabase
        .from('custom_form_fields')
        .update({ order: index })
        .eq('id', swapField.id);
      
      if (error1 || error2) {
        console.error('Error reordering fields:', error1 || error2);
        setFieldError('Failed to reorder fields. Please try again.');
        return;
      }
      
      // Update local state
      const newFields = [...customFields];
      [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
      setCustomFields(newFields.map((f, i) => ({ ...f, order: i })));
    } catch (err) {
      console.error('Error reordering fields:', err);
      setFieldError('Failed to reorder fields. Please try again.');
    }
  };

  // Render custom field input
  const renderCustomFieldInput = (field: CustomFormField) => {
    const value = customFieldValues[field.id];
    
    const baseInputClass = "w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors";
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type}
            value={value as string || ''}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClass}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value as number || ''}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: parseFloat(e.target.value) || 0 }))}
            placeholder={field.placeholder}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClass}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value as string || ''}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            required={field.required}
            className={baseInputClass}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value as string || ''}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            className={`${baseInputClass} resize-none`}
          />
        );
      
      case 'dropdown':
        return (
          <select
            value={value as string || ''}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            required={field.required}
            className={baseInputClass}
          >
            <option value="">Select an option...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean || false}
              onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.checked }))}
              className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-slate-700">{field.placeholder || 'Yes'}</span>
          </label>
        );
      
      default:
        return null;
    }
  };

  const getStatusBadge = (status: CustomTrainingRequest['status']) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-blue-100 text-blue-700',
      sergeant_review: 'bg-amber-100 text-amber-700',
      lieutenant_review: 'bg-orange-100 text-orange-700',
      commander_review: 'bg-purple-100 text-purple-700',
      chief_approval: 'bg-indigo-100 text-indigo-700',
      approved: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      completed: 'bg-slate-100 text-slate-700',
    };
    const labels: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      sergeant_review: 'Sergeant Review',
      lieutenant_review: 'Lieutenant Review',
      commander_review: 'Commander Review',
      chief_approval: 'Chief Approval',
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

  const filteredRequests = requests.filter(r =>
    r.trainingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCustomFields = customFields.filter(f => f.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Custom Training Requests</h2>
          <p className="text-slate-600 mt-1">Create specialized training requests with custom approval chains</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRanksSettings(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-lg transition-colors"
            title="Configure approval ranks"
          >
            <HierarchyIcon size={20} />
            Approval Ranks
          </button>
          <button
            onClick={() => setShowFieldManager(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            <SettingsIcon size={20} />
            Manage Fields
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
          >
            <PlusIcon size={20} />
            New Custom Request
          </button>
        </div>
      </div>

      {/* Error Message */}
      {requestError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <XIcon size={18} />
          {requestError}
          <button 
            onClick={() => setRequestError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Search and Refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <button
          onClick={fetchRequests}
          disabled={isLoadingRequests}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshIcon size={18} className={isLoadingRequests ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Field Manager Modal */}
      {showFieldManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Manage Custom Fields</h2>
                <p className="text-slate-600 mt-1">Add, edit, or remove custom fields from the request form</p>
              </div>
              <button
                onClick={() => {
                  setShowFieldManager(false);
                  setShowAddField(false);
                  setEditingField(null);
                  resetNewField();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Error Message */}
              {fieldError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                  <XIcon size={18} />
                  {fieldError}
                  <button 
                    onClick={() => setFieldError(null)}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              )}

              {/* Add Field Button */}
              <button
                onClick={() => {
                  resetNewField();
                  setEditingField(null);
                  setShowAddField(true);
                }}
                className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 hover:border-amber-500 text-slate-600 hover:text-amber-600 font-medium rounded-lg transition-colors"
              >
                <PlusIcon size={20} />
                Add New Field
              </button>

              {/* Add/Edit Field Form */}
              {showAddField && (
                <div className="mb-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="font-semibold text-slate-800 mb-4">
                    {editingField ? 'Edit Field' : 'Add New Field'}
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Field Label <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newField.label || ''}
                        onChange={(e) => setNewField(prev => ({ 
                          ...prev, 
                          label: e.target.value,
                          name: prev.name || e.target.value.toLowerCase().replace(/\s+/g, '_'),
                        }))}
                        placeholder="e.g., Certification Number"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Field Name (ID) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newField.name || ''}
                        onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., certification_number"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Field Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {fieldTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setNewField(prev => ({ ...prev, type: type.value }))}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors flex flex-col items-center gap-1 ${
                            newField.type === type.value
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <span className="text-lg">{type.icon}</span>
                          <span className="text-xs">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Placeholder Text
                      </label>
                      <input
                        type="text"
                        value={newField.placeholder || ''}
                        onChange={(e) => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
                        placeholder="Enter placeholder text..."
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Help Text
                      </label>
                      <input
                        type="text"
                        value={newField.helpText || ''}
                        onChange={(e) => setNewField(prev => ({ ...prev, helpText: e.target.value }))}
                        placeholder="Additional instructions..."
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  {newField.type === 'dropdown' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Dropdown Options
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          placeholder="Add an option..."
                          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                        />
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {newField.options && newField.options.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {newField.options.map((opt, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm"
                            >
                              {opt.label}
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <XIcon size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newField.required || false}
                        onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Required field</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddField(false);
                        setEditingField(null);
                        resetNewField();
                      }}
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={editingField ? handleUpdateField : handleAddField}
                      disabled={!newField.name || !newField.label || isSavingField}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      {isSavingField ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingField ? 'Update Field' : 'Add Field'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Fields List */}
              {isLoadingFields ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Loading custom fields...</p>
                </div>
              ) : customFields.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <SettingsIcon className="mx-auto mb-4 text-slate-300" size={48} />
                  <p className="font-medium">No custom fields yet</p>
                  <p className="text-sm">Add fields to customize your training request form</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customFields.map((field, index) => (
                    <div
                      key={field.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        field.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveField(field.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveField(field.id, 'down')}
                          disabled={index === customFields.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{field.label}</span>
                          {field.required && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">Required</span>
                          )}
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded capitalize">{field.type}</span>
                        </div>
                        <p className="text-sm text-slate-500">{field.name}</p>
                        {field.helpText && (
                          <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFieldActive(field.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            field.active 
                              ? 'text-green-600 hover:bg-green-50' 
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={field.active ? 'Disable field' : 'Enable field'}
                        >
                          {field.active ? (
                            <CheckIcon size={18} />
                          ) : (
                            <XIcon size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditField(field)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-600">
                  {customFields.filter(f => f.active).length} active fields, {customFields.filter(f => !f.active).length} disabled
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={fetchCustomFields}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => {
                      setShowFieldManager(false);
                      setShowAddField(false);
                      setEditingField(null);
                      resetNewField();
                    }}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">New Custom Training Request</h2>
                <p className="text-slate-600 mt-1">Create a specialized training request with custom approval chain</p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Training Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Training Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.trainingTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, trainingTitle: e.target.value }))}
                  placeholder="Enter training title"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Training Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.trainingDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, trainingDescription: e.target.value }))}
                  placeholder="Describe the training objectives and content"
                  rows={3}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              {/* Training Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Training Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {trainingTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, trainingType: type.value as typeof formData.trainingType }))}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        formData.trainingType === type.value
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date, Duration, Location */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Requested Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="date"
                      value={formData.requestedDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, requestedDate: e.target.value }))}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., 4 hours"
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
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Training location"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Estimated Cost */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estimated Cost
                </label>
                <div className="relative">
                  <AccountingIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* Custom Fields Section */}
              {activeCustomFields.length > 0 && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <SettingsIcon size={20} className="text-amber-500" />
                    Additional Information
                  </h3>
                  <div className="space-y-4">
                    {activeCustomFields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {renderCustomFieldInput(field)}
                        {field.helpText && (
                          <p className="mt-1 text-xs text-slate-500">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Ranks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Audience (Ranks) <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-slate-500 mb-3">Select which ranks this training is intended for</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {approvalRanks.map((rank) => (
                    <button
                      key={rank}
                      type="button"
                      onClick={() => handleToggleTargetRank(rank)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        formData.targetRanks.includes(rank)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {formData.targetRanks.includes(rank) && <CheckIcon size={16} />}
                      {rank}
                    </button>
                  ))}
                </div>
              </div>

              {/* Approval Chain */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Approval Chain <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-slate-500 mb-3">Select the approval chain for this request (will be sorted by hierarchy)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {approvalRanks.map((rank) => (
                    <button
                      key={rank}
                      type="button"
                      onClick={() => handleToggleApprovalRank(rank)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        formData.approvalChain.includes(rank)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {formData.approvalChain.includes(rank) && (
                        <span className="w-5 h-5 bg-purple-500 text-white rounded-full text-xs flex items-center justify-center">
                          {formData.approvalChain.indexOf(rank) + 1}
                        </span>
                      )}
                      {rank}
                    </button>
                  ))}
                </div>
                {formData.approvalChain.length > 0 && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium text-purple-800 mb-2">
                      <HierarchyIcon size={18} />
                      Approval Flow
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {formData.approvalChain.map((rank, index) => (
                        <React.Fragment key={rank}>
                          <span className="px-3 py-1 bg-white border border-purple-300 rounded-full text-sm text-purple-700">
                            {index + 1}. {rank}
                          </span>
                          {index < formData.approvalChain.length - 1 && (
                            <span className="text-purple-400">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Justification */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  placeholder="Explain why this training is needed and its expected benefits"
                  rows={3}
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
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information..."
                  rows={2}
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
                  disabled={isSubmitting || formData.approvalChain.length === 0 || formData.targetRanks.length === 0}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckIcon size={18} />
                      Submit Request
                    </>
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
          <h3 className="font-semibold text-slate-800">Custom Training Requests</h3>
        </div>
        
        {isLoadingRequests ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading training requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <HierarchyIcon className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-800">No custom requests yet</h3>
            <p className="text-slate-600 mt-1">Create your first custom training request</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-800">{request.trainingTitle}</h4>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{request.trainingDescription}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={16} className="text-slate-400" />
                        {formatDate(request.requestedDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon size={16} className="text-slate-400" />
                        {request.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <LocationIcon size={16} className="text-slate-400" />
                        {request.location}
                      </div>
                      {request.estimatedCost > 0 && (
                        <div className="flex items-center gap-1">
                          <AccountingIcon size={16} className="text-slate-400" />
                          ${request.estimatedCost.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-slate-500">Target:</span>
                      {request.targetRanks.map((rank) => (
                        <span key={rank} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {rank}
                        </span>
                      ))}
                      <span className="text-xs text-slate-500 ml-2">Approval:</span>
                      {request.approvalChain.map((rank, index) => (
                        <span key={rank} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {index + 1}. {rank}
                        </span>
                      ))}
                    </div>
                    {/* Display custom field values if present */}
                    {request.customFields && request.customFields.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-2">Custom Fields:</p>
                        <div className="flex flex-wrap gap-2">
                          {request.customFields.map((field) => (
                            <span key={field.fieldId} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                              <span className="font-medium">{field.fieldLabel}:</span> {String(field.value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                      <EditIcon size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteRequest(request.id)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <CheckIcon size={20} />
          <span className="font-medium">Custom training request submitted!</span>
        </div>
      )}

      {/* Approval Ranks Settings Modal */}
      {showRanksSettings && (
        <ApprovalRanksSettings
          onClose={() => setShowRanksSettings(false)}
          onSave={(newRanks) => {
            setApprovalRanks(newRanks);
            setShowRanksSettings(false);
          }}
        />
      )}
    </div>
  );
};

export default CustomTrainingRequestTab;
