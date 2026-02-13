import { supabase } from './supabase';
import { notificationService } from './database';

export type NotificationCategory = 
  | 'pending_approval'
  | 'training_deadline'
  | 'certificate_expiration'
  | 'budget_warning'
  | 'request_status'
  | 'system';

export interface NotificationGeneratorResult {
  created: number;
  errors: string[];
}

// Generate notifications for pending approvals
export async function generatePendingApprovalNotifications(
  supervisorIds: string[]
): Promise<NotificationGeneratorResult> {
  const result: NotificationGeneratorResult = { created: 0, errors: [] };

  try {
    // Get pending requests for supervisors
    const { data: pendingRequests, error } = await supabase
      .from('training_requests')
      .select('id, status')
      .in('status', ['submitted', 'supervisor_review']);

    if (error) {
      result.errors.push(`Error fetching pending requests: ${error.message}`);
      return result;
    }

    // Create notifications for each supervisor
    for (const supervisorId of supervisorIds) {
      const pendingCount = pendingRequests?.length || 0;
      
      if (pendingCount > 0) {
        // Check if we already sent a notification today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', supervisorId)
          .eq('title', 'Pending Approvals')
          .gte('created_at', today)
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          const notification = await notificationService.create({
            userId: supervisorId,
            title: 'Pending Approvals',
            message: `You have ${pendingCount} training request${pendingCount > 1 ? 's' : ''} awaiting your review.`,
            type: 'warning',
            link: 'request-filter',
          });

          if (notification) {
            result.created++;
          }
        }
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
  }

  return result;
}

// Generate notifications for upcoming training deadlines
export async function generateTrainingDeadlineNotifications(): Promise<NotificationGeneratorResult> {
  const result: NotificationGeneratorResult = { created: 0, errors: [] };

  try {
    // Get training courses happening in the next 7 days
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const { data: upcomingTrainings, error: trainingError } = await supabase
      .from('training_courses')
      .select('id, title, date')
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', nextWeek.toISOString().split('T')[0]);

    if (trainingError) {
      result.errors.push(`Error fetching trainings: ${trainingError.message}`);
      return result;
    }

    if (!upcomingTrainings || upcomingTrainings.length === 0) {
      return result;
    }

    // Get approved requests for these trainings
    for (const training of upcomingTrainings) {
      const { data: approvedRequests, error: requestError } = await supabase
        .from('training_requests')
        .select('user_id')
        .eq('training_id', training.id)
        .eq('status', 'approved');

      if (requestError) {
        result.errors.push(`Error fetching requests for training ${training.id}: ${requestError.message}`);
        continue;
      }

      const trainingDate = new Date(training.date);
      const daysUntil = Math.ceil((trainingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      for (const request of approvedRequests || []) {
        // Check if notification already exists
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', request.user_id)
          .like('message', `%${training.title}%`)
          .like('title', '%Training Reminder%')
          .gte('created_at', new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          const notification = await notificationService.create({
            userId: request.user_id,
            title: 'Training Reminder',
            message: `Your training "${training.title}" is scheduled in ${daysUntil} day${daysUntil > 1 ? 's' : ''} on ${trainingDate.toLocaleDateString()}.`,
            type: 'info',
            link: 'training',
          });

          if (notification) {
            result.created++;
          }
        }
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
  }

  return result;
}

// Generate notifications for certificate expirations
export async function generateCertificateExpirationNotifications(): Promise<NotificationGeneratorResult> {
  const result: NotificationGeneratorResult = { created: 0, errors: [] };

  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Get certificates expiring in the next 30-60 days
    const { data: expiringCertificates, error } = await supabase
      .from('certificates')
      .select('id, user_id, training_title, expiration_date')
      .eq('cert_status', 'active')
      .not('expiration_date', 'is', null)
      .gte('expiration_date', today.toISOString().split('T')[0])
      .lte('expiration_date', sixtyDaysFromNow.toISOString().split('T')[0]);

    if (error) {
      result.errors.push(`Error fetching certificates: ${error.message}`);
      return result;
    }

    for (const cert of expiringCertificates || []) {
      const expirationDate = new Date(cert.expiration_date);
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine notification type based on urgency
      const notificationType = daysUntilExpiration <= 30 ? 'warning' : 'info';
      const urgencyText = daysUntilExpiration <= 7 ? 'URGENT: ' : daysUntilExpiration <= 30 ? 'Reminder: ' : '';

      // Check if notification already exists this week
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', cert.user_id)
        .like('message', `%${cert.training_title}%`)
        .like('title', '%Certificate%')
        .gte('created_at', weekAgo.toISOString())
        .limit(1);

      if (!existingNotification || existingNotification.length === 0) {
        const notification = await notificationService.create({
          userId: cert.user_id,
          title: `${urgencyText}Certificate Expiring`,
          message: `Your certificate for "${cert.training_title}" expires in ${daysUntilExpiration} day${daysUntilExpiration > 1 ? 's' : ''} on ${expirationDate.toLocaleDateString()}.`,
          type: notificationType,
          link: 'profile',
        });

        if (notification) {
          result.created++;
        }
      }
    }

    // Also check for already expired certificates
    const { data: expiredCertificates, error: expiredError } = await supabase
      .from('certificates')
      .select('id, user_id, training_title, expiration_date')
      .eq('cert_status', 'active')
      .not('expiration_date', 'is', null)
      .lt('expiration_date', today.toISOString().split('T')[0]);

    if (!expiredError && expiredCertificates) {
      for (const cert of expiredCertificates) {
        // Update certificate status to expired
        await supabase
          .from('certificates')
          .update({ cert_status: 'expired' })
          .eq('id', cert.id);

        // Check if notification already exists
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', cert.user_id)
          .like('message', `%${cert.training_title}%expired%`)
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          const notification = await notificationService.create({
            userId: cert.user_id,
            title: 'Certificate Expired',
            message: `Your certificate for "${cert.training_title}" has expired. Please renew it as soon as possible.`,
            type: 'error',
            link: 'profile',
          });

          if (notification) {
            result.created++;
          }
        }
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
  }

  return result;
}

// Generate notifications for budget warnings
export async function generateBudgetWarningNotifications(
  accountingUserIds: string[]
): Promise<NotificationGeneratorResult> {
  const result: NotificationGeneratorResult = { created: 0, errors: [] };

  try {
    // Get budget settings
    const { data: budgetSettings, error: budgetError } = await supabase
      .from('budget_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const totalBudget = budgetSettings?.total_budget || 150000;
    const fiscalYear = budgetSettings?.fiscal_year || new Date().getFullYear().toString();

    // Get total spent
    const { data: costs, error: costsError } = await supabase
      .from('officer_training_costs')
      .select('cost_amount')
      .eq('fiscal_year', fiscalYear);

    if (costsError) {
      result.errors.push(`Error fetching costs: ${costsError.message}`);
      return result;
    }

    const totalSpent = costs?.reduce((sum, cost) => sum + Number(cost.cost_amount), 0) || 0;
    const percentUsed = (totalSpent / totalBudget) * 100;

    // Generate warnings at different thresholds
    let warningLevel: 'info' | 'warning' | 'error' | null = null;
    let warningMessage = '';

    if (percentUsed >= 100) {
      warningLevel = 'error';
      warningMessage = `CRITICAL: Training budget for FY${fiscalYear} has been exceeded! Current spending: $${totalSpent.toLocaleString()} of $${totalBudget.toLocaleString()} (${percentUsed.toFixed(1)}%)`;
    } else if (percentUsed >= 90) {
      warningLevel = 'error';
      warningMessage = `WARNING: Training budget for FY${fiscalYear} is at ${percentUsed.toFixed(1)}%. Only $${(totalBudget - totalSpent).toLocaleString()} remaining.`;
    } else if (percentUsed >= 75) {
      warningLevel = 'warning';
      warningMessage = `Budget Alert: Training budget for FY${fiscalYear} is at ${percentUsed.toFixed(1)}%. $${(totalBudget - totalSpent).toLocaleString()} remaining.`;
    }

    if (warningLevel) {
      const today = new Date().toISOString().split('T')[0];

      for (const userId of accountingUserIds) {
        // Check if we already sent a budget notification today
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .like('title', '%Budget%')
          .gte('created_at', today)
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          const notification = await notificationService.create({
            userId,
            title: 'Budget Warning',
            message: warningMessage,
            type: warningLevel,
            link: 'accounting',
          });

          if (notification) {
            result.created++;
          }
        }
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
  }

  return result;
}

// Generate notification for request status change
export async function generateRequestStatusNotification(
  userId: string,
  requestTitle: string,
  oldStatus: string,
  newStatus: string,
  notes?: string
): Promise<boolean> {
  try {
    let title = 'Request Status Updated';
    let message = '';
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';

    switch (newStatus) {
      case 'supervisor_review':
        title = 'Request Under Review';
        message = `Your request for "${requestTitle}" is now being reviewed by your supervisor.`;
        type = 'info';
        break;
      case 'admin_approval':
        title = 'Request Forwarded';
        message = `Your request for "${requestTitle}" has been forwarded to administration for final approval.`;
        type = 'info';
        break;
      case 'approved':
        title = 'Request Approved';
        message = `Great news! Your request for "${requestTitle}" has been approved.`;
        type = 'success';
        break;
      case 'denied':
        title = 'Request Denied';
        message = `Your request for "${requestTitle}" has been denied.${notes ? ` Reason: ${notes}` : ''}`;
        type = 'error';
        break;
      case 'scheduled':
        title = 'Training Scheduled';
        message = `Your training "${requestTitle}" has been scheduled.${notes ? ` Date: ${notes}` : ''}`;
        type = 'success';
        break;
      case 'completed':
        title = 'Training Completed';
        message = `Congratulations! You have completed "${requestTitle}".`;
        type = 'success';
        break;
      default:
        message = `Your request for "${requestTitle}" status has been updated to ${newStatus}.`;
    }

    const notification = await notificationService.create({
      userId,
      title,
      message,
      type,
      link: 'requests',
    });

    return !!notification;
  } catch (err) {
    console.error('Error generating request status notification:', err);
    return false;
  }
}

// Run all notification generators
export async function runAllNotificationGenerators(
  supervisorIds: string[],
  accountingUserIds: string[]
): Promise<{
  pendingApprovals: NotificationGeneratorResult;
  trainingDeadlines: NotificationGeneratorResult;
  certificateExpirations: NotificationGeneratorResult;
  budgetWarnings: NotificationGeneratorResult;
}> {
  const [pendingApprovals, trainingDeadlines, certificateExpirations, budgetWarnings] = await Promise.all([
    generatePendingApprovalNotifications(supervisorIds),
    generateTrainingDeadlineNotifications(),
    generateCertificateExpirationNotifications(),
    generateBudgetWarningNotifications(accountingUserIds),
  ]);

  return {
    pendingApprovals,
    trainingDeadlines,
    certificateExpirations,
    budgetWarnings,
  };
}

// Delete old notifications (older than 30 days)
export async function cleanupOldNotifications(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('read', true)
    .lt('created_at', thirtyDaysAgo.toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up notifications:', error);
    return 0;
  }

  return data?.length || 0;
}
