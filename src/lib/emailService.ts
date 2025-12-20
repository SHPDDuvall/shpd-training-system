import { supabase } from '@/lib/supabase';
import { CustomTrainingRequest, ApprovalRank, User } from '@/types';

export type EmailType = 'submission' | 'approval' | 'denial' | 'final_approval' | 'general' | 'mass' | 'notification';

export interface ApprovalEmailParams {
  type: EmailType;
  request: CustomTrainingRequest & { customFields?: unknown[] };
  recipientEmail: string;
  recipientName: string;
  approverName?: string;
  approverRank?: ApprovalRank;
  nextApproverRank?: ApprovalRank;
  notes?: string;
  denialReason?: string;
}

export interface GeneralEmailParams {
  type: 'general' | 'mass';
  recipientEmail: string | string[];
  recipientName?: string;
  subject: string;
  body: string;
  senderName?: string;
  senderEmail?: string;
}

export interface NotificationEmailParams {
  type: 'notification';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  notificationType: 'training_reminder' | 'certificate_expiry' | 'budget_warning' | 'pending_approval';
  details: {
    title?: string;
    date?: string;
    daysRemaining?: number;
    budgetUsed?: number;
    budgetTotal?: number;
    requestCount?: number;
  };
}

/**
 * Get email settings from localStorage
 */
export const getEmailSettings = () => {
  const savedSettings = localStorage.getItem('emailSettings');
  if (savedSettings) {
    return JSON.parse(savedSettings);
  }
  return {
    fromName: 'Training Management System',
    replyToEmail: '',
    emailSignature: '',
    notifyOnApproval: true,
    notifyOnDenial: true,
    notifyOnSubmission: true,
    notifyOnCertExpiry: true,
    notifyOnTrainingReminder: true,
    reminderDaysBefore: 7,
    certExpiryDaysBefore: 30,
  };
};

/**
 * Check if a specific notification type is enabled
 */
export const isNotificationEnabled = (type: string): boolean => {
  const settings = getEmailSettings();
  switch (type) {
    case 'submission':
      return settings.notifyOnSubmission;
    case 'approval':
    case 'final_approval':
      return settings.notifyOnApproval;
    case 'denial':
      return settings.notifyOnDenial;
    case 'certificate_expiry':
      return settings.notifyOnCertExpiry;
    case 'training_reminder':
      return settings.notifyOnTrainingReminder;
    default:
      return true;
  }
};

/**
 * Send an approval workflow email notification
 */
export const sendApprovalEmail = async (params: ApprovalEmailParams): Promise<{ success: boolean; error?: string }> => {
  // Check if this notification type is enabled
  if (!isNotificationEnabled(params.type)) {
    console.log(`Email notification type '${params.type}' is disabled in settings`);
    return { success: true };
  }

  try {
    const { type, request, recipientEmail, recipientName, approverName, approverRank, nextApproverRank, notes, denialReason } = params;

    const { data, error } = await supabase.functions.invoke('send-approval-email', {
      body: {
        type,
        requestId: request.id,
        requestTitle: request.trainingTitle,
        requestDescription: request.trainingDescription,
        requesterName: request.userName || 'Unknown',
        requesterEmail: '', // We don't need this for the current implementation
        recipientEmail,
        recipientName,
        approverName,
        approverRank,
        nextApproverRank,
        notes,
        denialReason,
        requestedDate: request.requestedDate,
        location: request.location,
        estimatedCost: request.estimatedCost,
      },
    });

    if (error) {
      console.error('Error sending approval email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true };
  } catch (err) {
    console.error('Error in sendApprovalEmail:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

/**
 * Send a general email (single or mass)
 */
export const sendGeneralEmail = async (params: GeneralEmailParams): Promise<{ success: boolean; error?: string; data?: unknown }> => {
  try {
    const { type, recipientEmail, recipientName, subject, body, senderName, senderEmail } = params;

    const { data, error } = await supabase.functions.invoke('send-approval-email', {
      body: {
        type,
        recipientEmail,
        recipientName,
        subject,
        body,
        senderName,
        senderEmail,
      },
    });

    if (error) {
      console.error('Error sending general email:', error);
      return { success: false, error: error.message };
    }

    console.log('General email sent successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error in sendGeneralEmail:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

/**
 * Send a notification email (training reminder, certificate expiry, etc.)
 */
export const sendNotificationEmail = async (params: NotificationEmailParams): Promise<{ success: boolean; error?: string }> => {
  // Check if this notification type is enabled
  if (!isNotificationEnabled(params.notificationType)) {
    console.log(`Email notification type '${params.notificationType}' is disabled in settings`);
    return { success: true };
  }

  try {
    const { recipientEmail, recipientName, subject, notificationType, details } = params;

    // Build the email body based on notification type
    let body = '';
    switch (notificationType) {
      case 'training_reminder':
        body = `This is a reminder that you have upcoming training: "${details.title}" scheduled for ${details.date}.\n\nThe training is in ${details.daysRemaining} day(s). Please ensure you are prepared and have made any necessary arrangements.`;
        break;
      case 'certificate_expiry':
        body = `Your certificate "${details.title}" will expire on ${details.date}.\n\nYou have ${details.daysRemaining} day(s) remaining before expiration. Please take action to renew your certification to maintain compliance.`;
        break;
      case 'budget_warning':
        body = `Budget Warning: The training budget has reached ${details.budgetUsed?.toFixed(0)}% of the allocated amount.\n\nCurrent usage: $${details.budgetUsed?.toLocaleString()} of $${details.budgetTotal?.toLocaleString()}\n\nPlease review pending requests and budget allocations.`;
        break;
      case 'pending_approval':
        body = `You have ${details.requestCount} pending training request(s) awaiting your approval.\n\nPlease log in to the Training Management System to review and take action on these requests.`;
        break;
    }

    const { data, error } = await supabase.functions.invoke('send-approval-email', {
      body: {
        type: 'general',
        recipientEmail,
        recipientName,
        subject,
        body,
        senderName: 'Training Management System',
      },
    });

    if (error) {
      console.error('Error sending notification email:', error);
      return { success: false, error: error.message };
    }

    console.log('Notification email sent successfully:', data);
    return { success: true };
  } catch (err) {
    console.error('Error in sendNotificationEmail:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

/**
 * Find users by rank for sending notifications
 */
export const findUsersByRank = (allUsers: User[], rank: ApprovalRank): User[] => {
  return allUsers.filter(u => u.rank.toLowerCase().includes(rank.toLowerCase()));
};

/**
 * Send submission notification to the first approver in the chain
 */
export const sendSubmissionNotification = async (
  request: CustomTrainingRequest & { customFields?: unknown[] },
  allUsers: User[]
): Promise<{ success: boolean; error?: string }> => {
  if (request.approvalChain.length === 0) {
    return { success: false, error: 'No approval chain defined' };
  }

  const firstApproverRank = request.approvalChain[0];
  const approvers = findUsersByRank(allUsers, firstApproverRank);

  if (approvers.length === 0) {
    console.warn(`No users found with rank ${firstApproverRank} to notify`);
    return { success: true }; // Don't fail the submission if no approvers found
  }

  // Send email to all users with the first approver rank
  const results = await Promise.all(
    approvers.map(approver =>
      sendApprovalEmail({
        type: 'submission',
        request,
        recipientEmail: approver.email,
        recipientName: `${approver.rank} ${approver.firstName} ${approver.lastName}`,
        nextApproverRank: firstApproverRank,
      })
    )
  );

  const allSuccessful = results.every(r => r.success);
  if (!allSuccessful) {
    const errors = results.filter(r => !r.success).map(r => r.error).join(', ');
    return { success: false, error: errors };
  }

  return { success: true };
};

/**
 * Send approval notification to the next approver or final approval to requester
 */
export const sendApprovalNotification = async (
  request: CustomTrainingRequest & { customFields?: unknown[] },
  allUsers: User[],
  approverUser: User,
  approverRank: ApprovalRank,
  isLastApprover: boolean,
  notes?: string
): Promise<{ success: boolean; error?: string }> => {
  if (isLastApprover) {
    // Send final approval notification to the requester
    const requester = allUsers.find(u => u.id === request.userId);
    if (!requester) {
      console.warn('Requester not found for final approval notification');
      return { success: true };
    }

    return sendApprovalEmail({
      type: 'final_approval',
      request,
      recipientEmail: requester.email,
      recipientName: `${requester.rank} ${requester.firstName} ${requester.lastName}`,
      approverName: `${approverUser.firstName} ${approverUser.lastName}`,
      approverRank,
      notes,
    });
  } else {
    // Send notification to the next approver in the chain
    const nextApproverIndex = request.currentApprovalLevel + 1;
    const nextApproverRank = request.approvalChain[nextApproverIndex];
    const nextApprovers = findUsersByRank(allUsers, nextApproverRank);

    if (nextApprovers.length === 0) {
      console.warn(`No users found with rank ${nextApproverRank} to notify`);
      return { success: true };
    }

    // Send email to all users with the next approver rank
    const results = await Promise.all(
      nextApprovers.map(approver =>
        sendApprovalEmail({
          type: 'approval',
          request,
          recipientEmail: approver.email,
          recipientName: `${approver.rank} ${approver.firstName} ${approver.lastName}`,
          approverName: `${approverUser.firstName} ${approverUser.lastName}`,
          approverRank,
          nextApproverRank,
          notes,
        })
      )
    );

    const allSuccessful = results.every(r => r.success);
    if (!allSuccessful) {
      const errors = results.filter(r => !r.success).map(r => r.error).join(', ');
      return { success: false, error: errors };
    }

    return { success: true };
  }
};

/**
 * Send denial notification to the requester
 */
export const sendDenialNotification = async (
  request: CustomTrainingRequest & { customFields?: unknown[] },
  allUsers: User[],
  approverUser: User,
  approverRank: ApprovalRank,
  denialReason: string
): Promise<{ success: boolean; error?: string }> => {
  const requester = allUsers.find(u => u.id === request.userId);
  if (!requester) {
    console.warn('Requester not found for denial notification');
    return { success: true };
  }

  return sendApprovalEmail({
    type: 'denial',
    request,
    recipientEmail: requester.email,
    recipientName: `${requester.rank} ${requester.firstName} ${requester.lastName}`,
    approverName: `${approverUser.firstName} ${approverUser.lastName}`,
    approverRank,
    denialReason,
  });
};

/**
 * Send training reminder emails for upcoming training
 */
export const sendTrainingReminders = async (
  trainings: Array<{ title: string; date: string; participants: Array<{ email: string; name: string }> }>,
  daysBeforeReminder: number = 7
): Promise<{ success: boolean; sentCount: number; errors: string[] }> => {
  const settings = getEmailSettings();
  if (!settings.notifyOnTrainingReminder) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let sentCount = 0;

  for (const training of trainings) {
    const trainingDate = new Date(training.date);
    const today = new Date();
    const daysRemaining = Math.ceil((trainingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= daysBeforeReminder && daysRemaining > 0) {
      for (const participant of training.participants) {
        const result = await sendNotificationEmail({
          type: 'notification',
          recipientEmail: participant.email,
          recipientName: participant.name,
          subject: `Training Reminder: ${training.title} in ${daysRemaining} day(s)`,
          notificationType: 'training_reminder',
          details: {
            title: training.title,
            date: training.date,
            daysRemaining,
          },
        });

        if (result.success) {
          sentCount++;
        } else {
          errors.push(`Failed to send reminder to ${participant.email}: ${result.error}`);
        }
      }
    }
  }

  return { success: errors.length === 0, sentCount, errors };
};

/**
 * Send certificate expiry warning emails
 */
export const sendCertificateExpiryWarnings = async (
  certificates: Array<{ title: string; expiryDate: string; userId: string; userEmail: string; userName: string }>,
  daysBeforeWarning: number = 30
): Promise<{ success: boolean; sentCount: number; errors: string[] }> => {
  const settings = getEmailSettings();
  if (!settings.notifyOnCertExpiry) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let sentCount = 0;

  for (const cert of certificates) {
    const expiryDate = new Date(cert.expiryDate);
    const today = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= daysBeforeWarning && daysRemaining > 0) {
      const result = await sendNotificationEmail({
        type: 'notification',
        recipientEmail: cert.userEmail,
        recipientName: cert.userName,
        subject: `Certificate Expiring Soon: ${cert.title}`,
        notificationType: 'certificate_expiry',
        details: {
          title: cert.title,
          date: cert.expiryDate,
          daysRemaining,
        },
      });

      if (result.success) {
        sentCount++;
      } else {
        errors.push(`Failed to send expiry warning to ${cert.userEmail}: ${result.error}`);
      }
    }
  }

  return { success: errors.length === 0, sentCount, errors };
};
