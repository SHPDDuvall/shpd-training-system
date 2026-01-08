// Types for the Police Training Module

export type UserRole = 'officer' | 'supervisor' | 'administrator' | 'accounting' | 'staff' | 'training_coordinator';

export type Platoon = 'A-Days' | 'B-Nights' | 'C-Nights' | 'D-Days' | '';

export const PLATOON_OPTIONS: { value: Platoon; label: string }[] = [
  { value: '', label: 'Not Assigned' },
  { value: 'A-Days', label: 'A-Days (Perm Days)' },
  { value: 'B-Nights', label: 'B-Nights (Rotating)' },
  { value: 'C-Nights', label: 'C-Nights (Perm Nights)' },
  { value: 'D-Days', label: 'D-Days (Rotating)' },
];

export interface User {
  id: string;
  badgeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  department: string;
  rank: string;
  avatar: string;
  phone: string;
  hireDate: string;
  supervisorId?: string;
  platoon?: Platoon;
}

export interface TrainingOpportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  instructor: string;
  capacity: number;
  enrolled: number;
  prerequisites: string[];
  image: string;
  credits: number;
  mandatory: boolean;
  is_cpt?: boolean;
  cpt_hours?: number;
}

export type RequestStatus = 'submitted' | 'supervisor_review' | 'admin_approval' | 'approved' | 'denied' | 'scheduled' | 'completed';

export interface TrainingRequest {
  id: string;
  trainingId: string;
  trainingTitle: string;
  userId: string;
  userName: string;
  userBadge: string;
  status: RequestStatus;
  submittedDate: string;
  supervisorId?: string;
  supervisorName?: string;
  supervisorApprovalDate?: string;
  adminId?: string;
  adminName?: string;
  adminApprovalDate?: string;
  scheduledDate?: string;
  notes: string;
  denialReason?: string;
  submittedWithin30Days?: boolean; // Whether request was submitted at least 30 days before training date
  cptHours?: number;
  isCpt?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface ChainOfCommandStep {
  role: string;
  name: string;
  status: 'pending' | 'approved' | 'denied' | 'current';
  timestamp?: string;
  notes?: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  recipients: string[];
  sentBy: string;
  sentAt: string;
  type: 'single' | 'mass';
}

// Certificate types
export type CertificateStatus = 'active' | 'expired' | 'revoked';

export interface Certificate {
  id: string;
  userId: string;
  trainingId?: string;
  requestId?: string;
  certificateNumber: string;
  trainingTitle: string;
  completionDate: string;
  creditsEarned: number;
  instructorName: string;
  instructorSignature?: string;
  issuedDate: string;
  expirationDate?: string;
  status: CertificateStatus;
  pdfUrl?: string;
}

// Document types
export type DocumentType = 'certificate' | 'training_record' | 'qualification' | 'license' | 'other';

export interface Document {
  id: string;
  userId: string;
  uploadedBy: string;
  documentType: DocumentType;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  issueDate?: string;
  expirationDate?: string;
  issuingAuthority?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

// Accounting types
export type AccountingActionType = 'view' | 'export' | 'approve' | 'reject' | 'modify';
export type CostType = 'training' | 'travel' | 'materials' | 'overtime' | 'other';
export type PaymentStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export interface AccountingLog {
  id: string;
  userId: string;
  actionType: AccountingActionType;
  targetUserId?: string;
  targetRequestId?: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface OfficerTrainingCost {
  id: string;
  userId: string;
  userName?: string;
  userBadge?: string;
  requestId?: string;
  trainingId?: string;
  trainingTitle: string;
  costAmount: number;
  costType: CostType;
  budgetCode?: string;
  fiscalYear?: string;
  paymentStatus: PaymentStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
}

// Internal Training Request types
export type InternalTrainingStatus = 'draft' | 'submitted' | 'supervisor_review' | 'admin_approval' | 'approved' | 'denied' | 'completed';

export interface InternalTrainingRequest {
  id: string;
  userId: string;
  userName?: string;
  userBadge?: string;
  courseName: string;
  trainingDate: string;
  location: string;
  instructor: string;
  attendees: string[];
  attendeeNames?: string[];
  status: InternalTrainingStatus;
  submittedDate: string;
  supervisorId?: string;
  supervisorName?: string;
  supervisorApprovalDate?: string;
  adminId?: string;
  adminName?: string;
  adminApprovalDate?: string;
  notes?: string;
  denialReason?: string;
  createdAt: string;
  updatedAt?: string;
  submittedWithin30Days?: boolean; // Whether request was submitted at least 30 days before training date
  cptHours?: number;
  isCpt?: boolean;
}

// External Training Request types
export type ExternalTrainingStatus = 'draft' | 'submitted' | 'supervisor_review' | 'admin_approval' | 'approved' | 'denied' | 'completed';

export interface ExternalTrainingRequest {
  id: string;
  userId: string;
  userName?: string;
  userBadge?: string;
  eventName: string;
  organization: string;
  startDate: string;
  endDate: string;
  location: string;
  costEstimate: number;
  justification: string;
  status: ExternalTrainingStatus;
  submittedDate: string;
  supervisorId?: string;
  supervisorIds?: string[]; // Multiple approvers support
  supervisorName?: string;
  supervisorApprovalDate?: string;
  adminId?: string;
  adminName?: string;
  adminApprovalDate?: string;
  notes?: string;
  denialReason?: string;
  createdAt: string;
  updatedAt?: string;
  submittedWithin30Days?: boolean; // Whether request was submitted at least 30 days before training date
  cptHours?: number;
  isCpt?: boolean;
}

// Custom Training Request types
export type CustomTrainingStatus = 'draft' | 'submitted' | 'sergeant_review' | 'lieutenant_review' | 'commander_review' | 'chief_approval' | 'approved' | 'denied' | 'completed';

export type ApprovalRank = 'Sergeant' | 'Lieutenant' | 'Commander' | 'Chief';

export interface CustomTrainingRequest {
  id: string;
  userId: string;
  userName?: string;
  userBadge?: string;
  trainingTitle: string;
  trainingDescription: string;
  trainingType: 'individual' | 'group' | 'department';
  requestedDate: string;
  duration: string;
  location: string;
  estimatedCost: number;
  justification: string;
  targetRanks: ApprovalRank[];
  approvalChain: ApprovalRank[];
  currentApprovalLevel: number;
  status: CustomTrainingStatus;
  submittedDate: string;
  
  // Sergeant approval
  sergeantId?: string;
  sergeantName?: string;
  sergeantApprovalDate?: string;
  sergeantNotes?: string;
  
  // Lieutenant approval
  lieutenantId?: string;
  lieutenantName?: string;
  lieutenantApprovalDate?: string;
  lieutenantNotes?: string;
  
  // Commander approval
  commanderId?: string;
  commanderName?: string;
  commanderApprovalDate?: string;
  commanderNotes?: string;
  
  // Chief approval
  chiefId?: string;
  chiefName?: string;
  chiefApprovalDate?: string;
  chiefNotes?: string;
  
  notes?: string;
  denialReason?: string;
  createdAt: string;
  updatedAt?: string;
}

// Custom Form Field types
export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'textarea' | 'email' | 'phone' | 'url';

export interface CustomFieldOption {
  value: string;
  label: string;
}

export interface CustomFormField {
  id: string;
  name: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: CustomFieldOption[]; // For dropdown type
  defaultValue?: string | number | boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  order: number;
  active: boolean;
  createdAt: string;
}

export interface CustomFieldValue {
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  value: string | number | boolean;
}


// Vendor types
export interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms: string;
  taxId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Invoice types
export type InvoiceStatus = 'pending' | 'received' | 'processing' | 'approved' | 'paid' | 'rejected';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorId?: string;
  vendorName?: string;
  costEntryId?: string;
  costEntryTitle?: string;
  amount: number;
  invoiceDate: string;
  dueDate?: string;
  receivedDate?: string;
  processedDate?: string;
  status: InvoiceStatus;
  fileUrl?: string;
  fileName?: string;
  description?: string;
  paymentBatchId?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  processedBy?: string;
  processedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

// Payment Batch types
export type PaymentBatchStatus = 'draft' | 'pending' | 'submitted' | 'approved' | 'processed' | 'completed';

export interface PaymentBatch {
  id: string;
  batchNumber: string;
  batchDate: string;
  totalAmount: number;
  invoiceCount: number;
  status: PaymentBatchStatus;
  submittedDate?: string;
  approvedDate?: string;
  processedDate?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  invoices?: Invoice[];
  createdAt: string;
  updatedAt?: string;
}

// Email Template types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'approval' | 'notification' | 'reminder' | 'general' | 'custom';
  description?: string;
  placeholders: string[];
  isDefault: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}


// Email Attachment types
export interface EmailAttachment {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}


// Helper function to check if a request was submitted at least 30 days before training date
export function isSubmittedWithin30Days(submittedDate: string, trainingDate: string): boolean {
  const submitted = new Date(submittedDate);
  const training = new Date(trainingDate);
  const diffTime = training.getTime() - submitted.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 30;
}

// Helper function to get days until training
export function getDaysUntilTraining(submittedDate: string, trainingDate: string): number {
  const submitted = new Date(submittedDate);
  const training = new Date(trainingDate);
  const diffTime = training.getTime() - submitted.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
