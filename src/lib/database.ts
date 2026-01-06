import { supabase } from './supabase';
import { 
  User, 
  TrainingOpportunity, 
  TrainingRequest, 
  Notification,
  Certificate,
  Document,
  AccountingLog,
  OfficerTrainingCost,
  InternalTrainingRequest,
  ExternalTrainingRequest,
  Vendor,
  Invoice,
  PaymentBatch,
  InvoiceStatus,
  PaymentBatchStatus
} from '@/types';



// User operations
export const userService = {

  async login(badgeNumber: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('badge_number', badgeNumber)
      .eq('password_hash', password)
      .single();

    if (error || !data) return null;

    return mapUserFromDb(data);
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapUserFromDb(data);
  },

  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('last_name');

    if (error || !data) return [];
    return data.map(mapUserFromDb);
  },

  async getBySupervisor(supervisorId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('supervisor_id', supervisorId);

    if (error || !data) return [];
    return data.map(mapUserFromDb);
  },

  async create(userData: {
    badgeNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    role: User['role'];
    department: string;
    rank: string;
    phone?: string;
    hireDate?: string;
    supervisorId?: string;
    password?: string;
    platoon?: string;
  }): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        badge_number: userData.badgeNumber,
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        rank: userData.rank,
        phone: userData.phone || '',
        hire_date: userData.hireDate || new Date().toISOString().split('T')[0],
        supervisor_id: userData.supervisorId || null,
        password_hash: userData.password || userData.badgeNumber, // Default password is badge number
        avatar: '',
        platoon: userData.platoon || '',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating user:', error?.message || error);
      // Check if it's a unique constraint violation
      if (error?.code === '23505') {
        console.error('Duplicate entry detected - badge number or email already exists');
      }
      return null;
    }
    return mapUserFromDb(data);
  },

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const dbUpdates: Record<string, unknown> = {};
    // Use !== undefined to allow empty strings to be set
    if (updates.badgeNumber !== undefined) dbUpdates.badge_number = updates.badgeNumber;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.rank !== undefined) dbUpdates.rank = updates.rank;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.supervisorId !== undefined) dbUpdates.supervisor_id = updates.supervisorId || null;
    if (updates.hireDate !== undefined) dbUpdates.hire_date = updates.hireDate;
    if (updates.platoon !== undefined) dbUpdates.platoon = updates.platoon;
    dbUpdates.updated_at = new Date().toISOString();

    console.log('Updating user with ID:', id);
    console.log('Updates to apply:', dbUpdates);
    
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating user:', error?.message || error);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);
      console.error('Error hint:', error?.hint);
      return null;
    }
    console.log('User updated successfully:', data);
    return mapUserFromDb(data);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    return !error;
  },

  async resetPassword(id: string, newPassword: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: newPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return !error;
  },
};



// Training course operations
export const trainingService = {
  async getAll(): Promise<TrainingOpportunity[]> {
    const { data, error } = await supabase
      .from('training_courses')
      .select('*')
      .order('date');

    if (error || !data) return [];
    return data.map(mapTrainingFromDb);
  },

  async getById(id: string): Promise<TrainingOpportunity | null> {
    const { data, error } = await supabase
      .from('training_courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapTrainingFromDb(data);
  },

  async getByCategory(category: string): Promise<TrainingOpportunity[]> {
    const { data, error } = await supabase
      .from('training_courses')
      .select('*')
      .eq('category', category)
      .order('date');

    if (error || !data) return [];
    return data.map(mapTrainingFromDb);
  },

  async getMandatory(): Promise<TrainingOpportunity[]> {
    const { data, error } = await supabase
      .from('training_courses')
      .select('*')
      .eq('mandatory', true)
      .order('date');

    if (error || !data) return [];
    return data.map(mapTrainingFromDb);
  },

  async create(training: Omit<TrainingOpportunity, 'id'>): Promise<TrainingOpportunity | null> {
    const dbData = {
      title: training.title,
      description: training.description,
      category: training.category,
      date: training.date,
      time: training.time,
      duration: training.duration,
      location: training.location,
      instructor: training.instructor,
      capacity: training.capacity,
      enrolled: training.enrolled || 0,
      prerequisites: training.prerequisites || [],
      image: training.image,
      credits: training.credits,
      mandatory: training.mandatory,
    };

    const { data, error } = await supabase
      .from('training_courses')
      .insert(dbData)
      .select()
      .single();

    if (error || !data) return null;
    return mapTrainingFromDb(data);
  },

  async update(id: string, updates: Partial<TrainingOpportunity>): Promise<TrainingOpportunity | null> {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.time) dbUpdates.time = updates.time;
    if (updates.duration) dbUpdates.duration = updates.duration;
    if (updates.location) dbUpdates.location = updates.location;
    if (updates.instructor) dbUpdates.instructor = updates.instructor;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.enrolled !== undefined) dbUpdates.enrolled = updates.enrolled;
    if (updates.prerequisites) dbUpdates.prerequisites = updates.prerequisites;
    if (updates.image) dbUpdates.image = updates.image;
    if (updates.credits !== undefined) dbUpdates.credits = updates.credits;
    if (updates.mandatory !== undefined) dbUpdates.mandatory = updates.mandatory;

    const { data, error } = await supabase
      .from('training_courses')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapTrainingFromDb(data);
  },

  async incrementEnrolled(id: string): Promise<void> {
    const { data: current } = await supabase
      .from('training_courses')
      .select('enrolled')
      .eq('id', id)
      .single();

    if (current) {
      await supabase
        .from('training_courses')
        .update({ enrolled: current.enrolled + 1 })
        .eq('id', id);
    }
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('training_courses')
      .delete()
      .eq('id', id);

    return !error;
  },
};

// Helper function to fetch training requests with related data
async function fetchRequestsWithRelations(query: ReturnType<typeof supabase.from>): Promise<TrainingRequest[]> {
  const { data: requests, error } = await query;
  
  if (error || !requests || requests.length === 0) {
    console.log('Request fetch error or no data:', error);
    return [];
  }

  // Get unique user IDs and training IDs
  const userIds = [...new Set(requests.map((r: Record<string, unknown>) => r.user_id).filter(Boolean))];
  const trainingIds = [...new Set(requests.map((r: Record<string, unknown>) => r.training_id).filter(Boolean))];
  const supervisorIds = [...new Set(requests.map((r: Record<string, unknown>) => r.supervisor_id).filter(Boolean))];
  const adminIds = [...new Set(requests.map((r: Record<string, unknown>) => r.admin_id).filter(Boolean))];

  // Fetch users
  const { data: users } = userIds.length > 0 
    ? await supabase.from('users').select('id, badge_number, first_name, last_name').in('id', userIds)
    : { data: [] };
  
  // Fetch trainings
  const { data: trainings } = trainingIds.length > 0
    ? await supabase.from('training_courses').select('id, title').in('id', trainingIds)
    : { data: [] };

  // Fetch supervisors
  const { data: supervisors } = supervisorIds.length > 0
    ? await supabase.from('users').select('id, first_name, last_name').in('id', supervisorIds)
    : { data: [] };

  // Fetch admins
  const { data: admins } = adminIds.length > 0
    ? await supabase.from('users').select('id, first_name, last_name').in('id', adminIds)
    : { data: [] };

  // Create lookup maps
  const userMap = new Map((users || []).map((u: Record<string, unknown>) => [u.id, u]));
  const trainingMap = new Map((trainings || []).map((t: Record<string, unknown>) => [t.id, t]));
  const supervisorMap = new Map((supervisors || []).map((s: Record<string, unknown>) => [s.id, s]));
  const adminMap = new Map((admins || []).map((a: Record<string, unknown>) => [a.id, a]));

  // Combine data
  const combinedData = requests.map((r: Record<string, unknown>) => ({
    ...r,
    user: userMap.get(r.user_id) || null,
    training: trainingMap.get(r.training_id) || null,
    supervisor: supervisorMap.get(r.supervisor_id) || null,
    admin: adminMap.get(r.admin_id) || null,
  }));

  return combinedData.map(mapRequestFromDb);
}

// Training request operations
export const requestService = {
  async getAll(): Promise<TrainingRequest[]> {
    const query = supabase
      .from('training_requests')
      .select('*')
      .order('created_at', { ascending: false });

    return fetchRequestsWithRelations(query);
  },

  async getByUser(userId: string): Promise<TrainingRequest[]> {
    const query = supabase
      .from('training_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return fetchRequestsWithRelations(query);
  },

  async getByStatus(status: string): Promise<TrainingRequest[]> {
    const query = supabase
      .from('training_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    return fetchRequestsWithRelations(query);
  },

  async getPendingForSupervisor(): Promise<TrainingRequest[]> {
    const query = supabase
      .from('training_requests')
      .select('*')
      .in('status', ['submitted', 'supervisor_review'])
      .order('created_at', { ascending: false });

    return fetchRequestsWithRelations(query);
  },

  async getPendingForAdmin(): Promise<TrainingRequest[]> {
    const query = supabase
      .from('training_requests')
      .select('*')
      .eq('status', 'admin_approval')
      .order('created_at', { ascending: false });

    return fetchRequestsWithRelations(query);
  },

  async create(request: {
    trainingId: string;
    userId: string;
    notes?: string;
  }): Promise<TrainingRequest | null> {
    
    // First, fetch the training course to get the course name
    const { data: courseData } = await supabase
      .from('training_courses')
      .select('title, category')
      .eq('id', request.trainingId)
      .single();
    
    const courseName = courseData?.title || 'Unknown Course';
    // Use 'internal' as default training type (database constraint only allows: internal, external)
    const trainingType = 'internal';

    
    // Insert the request with course_name and training_type
    const { data: insertData, error: insertError } = await supabase
      .from('training_requests')
      .insert({
        training_id: request.trainingId,
        user_id: request.userId,
        status: 'pending',
        course_name: courseName,
        training_type: trainingType,
        notes: request.notes || null,
      })
      .select('*')
      .single();

    if (insertError || !insertData) {
      return null;
    }

    // Fetch the user data separately
    const { data: userData } = await supabase
      .from('users')
      .select('id, badge_number, first_name, last_name')
      .eq('id', request.userId)
      .single();

    // Fetch the training data separately
    const { data: trainingData } = await supabase
      .from('training_courses')
      .select('id, title')
      .eq('id', request.trainingId)
      .single();

    // Combine the data
    const combinedData = {
      ...insertData,
      user: userData || null,
      training: trainingData || null,
      supervisor: null,
      admin: null,
    };

    return mapRequestFromDb(combinedData);
  },

  async updateStatus(
    id: string,
    status: TrainingRequest['status'],
    updatedBy: { id: string; role: string },
    notes?: string
  ): Promise<TrainingRequest | null> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'supervisor_review' || status === 'admin_approval') {
      updates.supervisor_id = updatedBy.id;
      updates.supervisor_approval_date = new Date().toISOString().split('T')[0];
    }

    if (status === 'approved' || status === 'denied') {
      updates.admin_id = updatedBy.id;
      updates.admin_approval_date = new Date().toISOString().split('T')[0];
      if (status === 'denied' && notes) {
        updates.denial_reason = notes;
      }
    }

    if (status === 'scheduled' && notes) {
      updates.scheduled_date = notes;
    }

    // First update the request
    const { data: updateData, error: updateError } = await supabase
      .from('training_requests')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updateData) return null;

    // Fetch related data separately
    const { data: userData } = await supabase
      .from('users')
      .select('id, badge_number, first_name, last_name')
      .eq('id', updateData.user_id)
      .single();

    const { data: trainingData } = await supabase
      .from('training_courses')
      .select('id, title')
      .eq('id', updateData.training_id)
      .single();

    const { data: supervisorData } = updateData.supervisor_id
      ? await supabase.from('users').select('id, first_name, last_name').eq('id', updateData.supervisor_id).single()
      : { data: null };

    const { data: adminData } = updateData.admin_id
      ? await supabase.from('users').select('id, first_name, last_name').eq('id', updateData.admin_id).single()
      : { data: null };

    const combinedData = {
      ...updateData,
      user: userData || null,
      training: trainingData || null,
      supervisor: supervisorData || null,
      admin: adminData || null,
    };

    return mapRequestFromDb(combinedData);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('training_requests')
      .delete()
      .eq('id', id);

    return !error;
  },

  // Subscribe to real-time changes
  subscribeToChanges(callback: (payload: unknown) => void) {
    return supabase
      .channel('training_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_requests' },
        callback
      )
      .subscribe();
  },
};

// Notification operations
export const notificationService = {
  async getByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapNotificationFromDb);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return 0;
    return count || 0;
  },

  async create(notification: {
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
  }): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link || null,
        read: false,
      })
      .select()
      .single();

    if (error || !data) return null;
    return mapNotificationFromDb(data);
  },

  async markAsRead(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    return !error;
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    return !error;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    return !error;
  },

  // Subscribe to real-time changes
  subscribeToChanges(userId: string, callback: (payload: unknown) => void) {
    return supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },
};

// Certificate operations
export const certificateService = {
  async getByUser(userId: string): Promise<Certificate[]> {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('completion_date', { ascending: false });

    if (error || !data) return [];
    return data.map(mapCertificateFromDb);
  },

  async getById(id: string): Promise<Certificate | null> {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapCertificateFromDb(data);
  },

  async getAll(): Promise<Certificate[]> {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('completion_date', { ascending: false });

    if (error || !data) return [];
    return data.map(mapCertificateFromDb);
  },

  async create(certificate: {
    userId: string;
    trainingId?: string;
    requestId?: string;
    trainingTitle: string;
    completionDate: string;
    creditsEarned: number;
    instructorName: string;
    instructorSignature?: string;
    expirationDate?: string;
  }): Promise<Certificate | null> {
    // Generate unique certificate number
    const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        user_id: certificate.userId,
        training_id: certificate.trainingId || null,
        request_id: certificate.requestId || null,
        certificate_number: certNumber,
        training_title: certificate.trainingTitle,
        completion_date: certificate.completionDate,
        credits_earned: certificate.creditsEarned,
        instructor_name: certificate.instructorName,
        instructor_signature: certificate.instructorSignature || null,
        expiration_date: certificate.expirationDate || null,
        cert_status: 'active',
      })
      .select()
      .single();

    if (error || !data) return null;
    return mapCertificateFromDb(data);
  },

  async updatePdfUrl(id: string, pdfUrl: string): Promise<boolean> {
    const { error } = await supabase
      .from('certificates')
      .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
      .eq('id', id);

    return !error;
  },

  async updateStatus(id: string, status: Certificate['status']): Promise<boolean> {
    const { error } = await supabase
      .from('certificates')
      .update({ cert_status: status, updated_at: new Date().toISOString() })
      .eq('id', id);

    return !error;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', id);

    return !error;
  },
};

// Document operations
export const documentService = {
  async getByUser(userId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapDocumentFromDb);
  },

  async getAll(): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapDocumentFromDb);
  },

  async create(document: {
    userId: string;
    uploadedBy: string;
    documentType: Document['documentType'];
    title: string;
    description?: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    issueDate?: string;
    expirationDate?: string;
    issuingAuthority?: string;
  }): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: document.userId,
        uploaded_by: document.uploadedBy,
        document_type: document.documentType,
        title: document.title,
        description: document.description || null,
        file_name: document.fileName,
        file_url: document.fileUrl,
        file_size: document.fileSize || null,
        mime_type: document.mimeType || null,
        issue_date: document.issueDate || null,
        expiration_date: document.expirationDate || null,
        issuing_authority: document.issuingAuthority || null,
        verified: false,
      })
      .select()
      .single();

    if (error || !data) return null;
    return mapDocumentFromDb(data);
  },

  async verify(id: string, verifiedBy: string): Promise<boolean> {
    const { error } = await supabase
      .from('documents')
      .update({
        verified: true,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    return !error;
  },

  async uploadFile(file: File, path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error || !data) return null;

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },
};

// Accounting operations
export const accountingService = {
  async logAccess(log: {
    userId: string;
    actionType: AccountingLog['actionType'];
    targetUserId?: string;
    targetRequestId?: string;
    description?: string;
  }): Promise<boolean> {
    const { error } = await supabase
      .from('accounting_logs')
      .insert({
        user_id: log.userId,
        action_type: log.actionType,
        target_user_id: log.targetUserId || null,
        target_request_id: log.targetRequestId || null,
        description: log.description || null,
      });

    return !error;
  },

  async getLogs(limit: number = 100): Promise<AccountingLog[]> {
    const { data, error } = await supabase
      .from('accounting_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(mapAccountingLogFromDb);
  },

  async getOfficerCosts(userId?: string): Promise<OfficerTrainingCost[]> {
    // Get manual cost entries
    let query = supabase
      .from('officer_training_costs')
      .select(`
        *,
        user:users!officer_training_costs_user_id_fkey(id, badge_number, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: manualCosts, error } = await query;
    const costs = manualCosts ? manualCosts.map(mapOfficerCostFromDb) : [];

    // Get external training requests and convert to cost entries
    const externalRequests = await externalTrainingService.getAll();
    const externalCosts: OfficerTrainingCost[] = externalRequests
      .filter(req => userId ? req.userId === userId : true)
      .map(req => ({
        id: `ext-${req.id}`,
        userId: req.userId,
        userName: req.userName || 'Unknown',
        userBadge: req.userBadge || '',
        requestId: req.id,
        trainingId: req.id,
        trainingTitle: req.eventName,
        costAmount: req.costEstimate,
        costType: 'training' as const,
        budgetCode: '',
        fiscalYear: new Date(req.submittedDate).getFullYear().toString(),
        paymentStatus: req.status === 'approved' ? 'approved' as const : req.status === 'completed' ? 'paid' as const : 'pending' as const,
        notes: req.notes || '',
        createdAt: req.submittedDate,
        updatedAt: req.submittedDate,
      }));

    // Combine manual costs and external training costs
    return [...costs, ...externalCosts];
  },

  async createCost(cost: {
    userId: string;
    requestId?: string;
    trainingId?: string;
    trainingTitle: string;
    costAmount: number;
    costType: OfficerTrainingCost['costType'];
    budgetCode?: string;
    fiscalYear?: string;
    notes?: string;
  }): Promise<OfficerTrainingCost | null> {
    const { data, error } = await supabase
      .from('officer_training_costs')
      .insert({
        user_id: cost.userId,
        request_id: cost.requestId || null,
        training_id: cost.trainingId || null,
        training_title: cost.trainingTitle,
        cost_amount: cost.costAmount,
        cost_type: cost.costType,
        budget_code: cost.budgetCode || null,
        fiscal_year: cost.fiscalYear || new Date().getFullYear().toString(),
        payment_status: 'pending',
        notes: cost.notes || null,
      })
      .select(`
        *,
        user:users!officer_training_costs_user_id_fkey(id, badge_number, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapOfficerCostFromDb(data);
  },

  async updateCost(
    id: string,
    updates: {
      trainingTitle?: string;
      costAmount?: number;
      costType?: OfficerTrainingCost['costType'];
      budgetCode?: string;
      fiscalYear?: string;
      paymentStatus?: OfficerTrainingCost['paymentStatus'];
      notes?: string;
      approvedBy?: string;
    }
  ): Promise<OfficerTrainingCost | null> {
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.trainingTitle !== undefined) dbUpdates.training_title = updates.trainingTitle;
    if (updates.costAmount !== undefined) dbUpdates.cost_amount = updates.costAmount;
    if (updates.costType !== undefined) dbUpdates.cost_type = updates.costType;
    if (updates.budgetCode !== undefined) dbUpdates.budget_code = updates.budgetCode;
    if (updates.fiscalYear !== undefined) dbUpdates.fiscal_year = updates.fiscalYear;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    
    if (updates.approvedBy && (updates.paymentStatus === 'approved' || updates.paymentStatus === 'paid')) {
      dbUpdates.approved_by = updates.approvedBy;
      dbUpdates.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('officer_training_costs')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        user:users!officer_training_costs_user_id_fkey(id, badge_number, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapOfficerCostFromDb(data);
  },

  async updateCostStatus(
    id: string,
    status: OfficerTrainingCost['paymentStatus'],
    approvedBy?: string
  ): Promise<boolean> {
    const updates: Record<string, unknown> = {
      payment_status: status,
      updated_at: new Date().toISOString(),
    };

    if (approvedBy && (status === 'approved' || status === 'paid')) {
      updates.approved_by = approvedBy;
      updates.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('officer_training_costs')
      .update(updates)
      .eq('id', id);

    return !error;
  },

  async deleteCost(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('officer_training_costs')
      .delete()
      .eq('id', id);

    return !error;
  },

  async getCostSummaryByUser(): Promise<{ userId: string; userName: string; userBadge: string; totalCost: number; pendingCost: number; paidCost: number }[]> {
    const costs = await this.getOfficerCosts();
    
    const summary: Record<string, { userId: string; userName: string; userBadge: string; totalCost: number; pendingCost: number; paidCost: number }> = {};
    
    costs.forEach(cost => {
      if (!summary[cost.userId]) {
        summary[cost.userId] = {
          userId: cost.userId,
          userName: cost.userName || 'Unknown',
          userBadge: cost.userBadge || '',
          totalCost: 0,
          pendingCost: 0,
          paidCost: 0,
        };
      }
      
      summary[cost.userId].totalCost += cost.costAmount;
      if (cost.paymentStatus === 'pending' || cost.paymentStatus === 'approved') {
        summary[cost.userId].pendingCost += cost.costAmount;
      } else if (cost.paymentStatus === 'paid') {
        summary[cost.userId].paidCost += cost.costAmount;
      }
    });
    
    return Object.values(summary);
  },

  async getBudgetSettings(): Promise<{ totalBudget: number; fiscalYear: string } | null> {
    const { data, error } = await supabase
      .from('budget_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return { totalBudget: 150000, fiscalYear: new Date().getFullYear().toString() };
    return {
      totalBudget: Number(data.total_budget) || 150000,
      fiscalYear: data.fiscal_year as string || new Date().getFullYear().toString(),
    };
  },

  async updateBudgetSettings(settings: { totalBudget: number; fiscalYear: string }): Promise<boolean> {
    const { error } = await supabase
      .from('budget_settings')
      .upsert({
        fiscal_year: settings.fiscalYear,
        total_budget: settings.totalBudget,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fiscal_year' });

    return !error;
  },
};

// Helper functions to map database records to TypeScript types
function mapUserFromDb(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    badgeNumber: data.badge_number as string,
    firstName: data.first_name as string,
    lastName: data.last_name as string,
    email: data.email as string,
    role: data.role as User['role'],
    department: data.department as string,
    rank: data.rank as string,
    avatar: data.avatar as string || '',
    phone: data.phone as string || '',
    hireDate: data.hire_date as string || '',
    supervisorId: data.supervisor_id as string | undefined,
    platoon: (data.platoon as string) || '',
  };
}

function mapTrainingFromDb(data: Record<string, unknown>): TrainingOpportunity {
  return {
    id: data.id as string,
    title: data.title as string,
    description: data.description as string || '',
    category: data.category as string,
    date: data.date as string,
    time: data.time as string,
    duration: data.duration as string,
    location: data.location as string,
    instructor: data.instructor as string,
    capacity: data.capacity as number,
    enrolled: data.enrolled as number,
    prerequisites: (data.prerequisites as string[]) || [],
    image: data.image as string || '',
    credits: data.credits as number,
    mandatory: data.mandatory as boolean,
  };
}

function mapRequestFromDb(data: Record<string, unknown>): TrainingRequest {
  const user = data.user as Record<string, unknown> | null;
  const training = data.training as Record<string, unknown> | null;
  const supervisor = data.supervisor as Record<string, unknown> | null;
  const admin = data.admin as Record<string, unknown> | null;

  // Extract badge number with multiple fallbacks
  const userBadge = user?.badge_number as string || 
                    (user as any)?.badgeNumber as string || 
                    data.user_badge as string || 
                    '';

  return {
    id: data.id as string,
    trainingId: data.training_id as string,
    trainingTitle: training?.title as string || '',
    userId: data.user_id as string,
    userName: user ? `${user.first_name} ${user.last_name}` : '',
    userBadge: userBadge,
    status: data.status as TrainingRequest['status'],
    submittedDate: (data.submitted_date || data.created_at) as string,
    supervisorId: data.supervisor_id as string | undefined,
    supervisorName: supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : undefined,
    supervisorApprovalDate: data.supervisor_approval_date as string | undefined,
    adminId: data.admin_id as string | undefined,
    adminName: admin ? `${admin.first_name} ${admin.last_name}` : undefined,
    adminApprovalDate: data.admin_approval_date as string | undefined,
    scheduledDate: data.scheduled_date as string | undefined,
    notes: data.notes as string || '',
    denialReason: data.denial_reason as string | undefined,
  };
}

function mapNotificationFromDb(data: Record<string, unknown>): Notification {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    title: data.title as string,
    message: data.message as string,
    type: data.type as Notification['type'],
    read: data.read as boolean,
    createdAt: data.created_at as string,
    link: data.link as string | undefined,
  };
}

function mapCertificateFromDb(data: Record<string, unknown>): Certificate {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    trainingId: data.training_id as string | undefined,
    requestId: data.request_id as string | undefined,
    certificateNumber: data.certificate_number as string,
    trainingTitle: data.training_title as string,
    completionDate: data.completion_date as string,
    creditsEarned: Number(data.credits_earned) || 0,
    instructorName: data.instructor_name as string,
    instructorSignature: data.instructor_signature as string | undefined,
    issuedDate: data.issued_date as string,
    expirationDate: data.expiration_date as string | undefined,
    status: data.cert_status as Certificate['status'],
    pdfUrl: data.pdf_url as string | undefined,
  };
}

function mapDocumentFromDb(data: Record<string, unknown>): Document {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    uploadedBy: data.uploaded_by as string,
    documentType: data.document_type as Document['documentType'],
    title: data.title as string,
    description: data.description as string | undefined,
    fileName: data.file_name as string,
    fileUrl: data.file_url as string,
    fileSize: data.file_size as number | undefined,
    mimeType: data.mime_type as string | undefined,
    issueDate: data.issue_date as string | undefined,
    expirationDate: data.expiration_date as string | undefined,
    issuingAuthority: data.issuing_authority as string | undefined,
    verified: data.verified as boolean,
    verifiedBy: data.verified_by as string | undefined,
    verifiedAt: data.verified_at as string | undefined,
    createdAt: data.created_at as string,
  };
}

function mapAccountingLogFromDb(data: Record<string, unknown>): AccountingLog {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    actionType: data.action_type as AccountingLog['actionType'],
    targetUserId: data.target_user_id as string | undefined,
    targetRequestId: data.target_request_id as string | undefined,
    description: data.description as string | undefined,
    ipAddress: data.ip_address as string | undefined,
    createdAt: data.created_at as string,
  };
}

function mapOfficerCostFromDb(data: Record<string, unknown>): OfficerTrainingCost {
  const user = data.user as Record<string, unknown> | null;
  
  // Extract badge number with fallbacks
  const userBadge = user?.badge_number as string || 
                    (user as any)?.badgeNumber as string || 
                    data.user_badge as string || 
                    undefined;
  
  return {
    id: data.id as string,
    userId: data.user_id as string,
    userName: user ? `${user.first_name} ${user.last_name}` : undefined,
    userBadge: userBadge,
    requestId: data.request_id as string | undefined,
    trainingId: data.training_id as string | undefined,
    trainingTitle: data.training_title as string,
    costAmount: Number(data.cost_amount) || 0,
    costType: data.cost_type as OfficerTrainingCost['costType'],
    budgetCode: data.budget_code as string | undefined,
    fiscalYear: data.fiscal_year as string | undefined,
    paymentStatus: data.payment_status as OfficerTrainingCost['paymentStatus'],
    approvedBy: data.approved_by as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: data.created_at as string,
  };
}


export const internalTrainingService = {
  async getAll(): Promise<InternalTrainingRequest[]> {
    const { data, error } = await supabase
      .from('internal_training_requests')
      .select(`
        *,
        user:users!user_id(id, badge_number, first_name, last_name),
        supervisor:users!supervisor_id(id, first_name, last_name),
        admin:users!admin_id(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapInternalTrainingFromDb);
  },

  async getByUser(userId: string): Promise<InternalTrainingRequest[]> {
    const { data, error } = await supabase
      .from('internal_training_requests')
      .select(`
        *,
        user:users!user_id(id, badge_number, first_name, last_name),
        supervisor:users!supervisor_id(id, first_name, last_name),
        admin:users!admin_id(id, first_name, last_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapInternalTrainingFromDb);
  },

  async create(request: {
    userId: string;
    courseName: string;
    trainingDate: string;
    location: string;
    instructor: string;
    attendees: string[];
    notes?: string;
    supervisorId?: string;
  }): Promise<InternalTrainingRequest | null> {
    const insertData: Record<string, unknown> = {
      user_id: request.userId,
      course_name: request.courseName,
      training_date: request.trainingDate,
      location: request.location,
      instructor: request.instructor,
      attendees: request.attendees,
      status: 'submitted',
      submitted_date: new Date().toISOString().split('T')[0],
      notes: request.notes || null,
    };
    
    // Add supervisor_id if provided
    if (request.supervisorId) {
      insertData.supervisor_id = request.supervisorId;
    }
    
    const { data, error } = await supabase
      .from('internal_training_requests')
      .insert(insertData)
      .select(`
        *,
        user:users!user_id(id, badge_number, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapInternalTrainingFromDb(data);
  },

  async updateStatus(
    id: string,
    status: InternalTrainingRequest['status'],
    updatedBy: { id: string; role: string },
    notes?: string
  ): Promise<InternalTrainingRequest | null> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'supervisor_review' || status === 'admin_approval') {
      updates.supervisor_id = updatedBy.id;
      updates.supervisor_approval_date = new Date().toISOString().split('T')[0];
    }

    if (status === 'approved' || status === 'denied') {
      updates.admin_id = updatedBy.id;
      updates.admin_approval_date = new Date().toISOString().split('T')[0];
      if (status === 'denied' && notes) {
        updates.denial_reason = notes;
      }
    }

    const { data, error } = await supabase
      .from('internal_training_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:users!user_id(id, badge_number, first_name, last_name),
        supervisor:users!supervisor_id(id, first_name, last_name),
        admin:users!admin_id(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapInternalTrainingFromDb(data);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('internal_training_requests')
      .delete()
      .eq('id', id);

    return !error;
  },
};

// External Training Request operations
export const externalTrainingService = {
  async getAll(): Promise<ExternalTrainingRequest[]> {
    const { data, error } = await supabase
      .from('external_training_requests')
      .select(`
        *,
        user:users!user_id(id, badge_number, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching external training requests:', error);
      return [];
    }
    return data.map(mapExternalTrainingFromDb);
  },

  async getByUser(userId: string): Promise<ExternalTrainingRequest[]> {
    const { data, error } = await supabase
      .from('external_training_requests')
      .select(`
        *,
        user:users!user_id(id, badge_number, first_name, last_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching external training requests for user:', error);
      return [];
    }
    return data.map(mapExternalTrainingFromDb);
  },

  async create(request: {
    userId: string;
    eventName: string;
    organization: string;
    startDate: string;
    endDate: string;
    location: string;
    costEstimate: number;
    justification: string;
    notes?: string;
    supervisorId?: string;
  }): Promise<ExternalTrainingRequest | null> {
    const insertData: Record<string, unknown> = {
      user_id: request.userId,
      event_name: request.eventName,
      organization: request.organization,
      start_date: request.startDate,
      end_date: request.endDate,
      location: request.location,
      cost_estimate: request.costEstimate,
      justification: request.justification,
      status: 'pending',
      submitted_date: new Date().toISOString().split('T')[0],
      notes: request.notes || null,
    };
    
    // Add supervisor_id if provided
    if (request.supervisorId) {
      insertData.supervisor_id = request.supervisorId;
    }
    
    const { data, error } = await supabase
      .from('external_training_requests')
      .insert(insertData)
      .select(`
        *,
        user:users!user_id(id, badge_number, first_name, last_name)
      `)
      .single();

    if (error || !data) {
      return null;
    }
    return mapExternalTrainingFromDb(data);
  },

  async updateStatus(
    id: string,
    status: ExternalTrainingRequest['status'],
    updatedBy: { id: string; role: string },
    notes?: string
  ): Promise<ExternalTrainingRequest | null> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'supervisor_review' || status === 'admin_approval') {
      updates.supervisor_id = updatedBy.id;
      updates.supervisor_approval_date = new Date().toISOString().split('T')[0];
    }

    if (status === 'approved' || status === 'denied') {
      updates.admin_id = updatedBy.id;
      updates.admin_approval_date = new Date().toISOString().split('T')[0];
      if (status === 'denied' && notes) {
        updates.denial_reason = notes;
      }
    }

    const { data, error } = await supabase
      .from('external_training_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:users!user_id(id, badge_number, first_name, last_name),
        supervisor:users!supervisor_id(id, first_name, last_name),
        admin:users!admin_id(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapExternalTrainingFromDb(data);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('external_training_requests')
      .delete()
      .eq('id', id);

    return !error;
  },
};

// Helper function to map internal training request from DB
function mapInternalTrainingFromDb(data: Record<string, unknown>): InternalTrainingRequest {
  const user = data.user as Record<string, unknown> | null;
  const supervisor = data.supervisor as Record<string, unknown> | null;
  const admin = data.admin as Record<string, unknown> | null;

  // Extract badge number with fallbacks
  const userBadge = user?.badge_number as string || 
                    (user as any)?.badgeNumber as string || 
                    data.user_badge as string || 
                    undefined;

  return {
    id: data.id as string,
    userId: data.user_id as string,
    userName: user ? `${user.first_name} ${user.last_name}` : undefined,
    userBadge: userBadge,
    courseName: data.course_name as string,
    trainingDate: data.training_date as string,
    location: data.location as string,
    instructor: data.instructor as string,
    attendees: (data.attendees as string[]) || [],
    status: data.status as InternalTrainingRequest['status'],
    submittedDate: (data.submitted_date || data.created_at) as string,
    supervisorId: data.supervisor_id as string | undefined,
    supervisorName: supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : undefined,
    supervisorApprovalDate: data.supervisor_approval_date as string | undefined,
    adminId: data.admin_id as string | undefined,
    adminName: admin ? `${admin.first_name} ${admin.last_name}` : undefined,
    adminApprovalDate: data.admin_approval_date as string | undefined,
    notes: data.notes as string | undefined,
    denialReason: data.denial_reason as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string | undefined,
  };
}

// Helper function to map external training request from DB
function mapExternalTrainingFromDb(data: Record<string, unknown>): ExternalTrainingRequest {
  const user = data.user as Record<string, unknown> | null;
  const supervisor = data.supervisor as Record<string, unknown> | null;
  const admin = data.admin as Record<string, unknown> | null;

  // Extract badge number with fallbacks
  const userBadge = user?.badge_number as string || 
                    (user as any)?.badgeNumber as string || 
                    data.user_badge as string || 
                    undefined;

  return {
    id: data.id as string,
    userId: data.user_id as string,
    userName: user ? `${user.first_name} ${user.last_name}` : undefined,
    userBadge: userBadge,
    eventName: data.event_name as string,
    organization: data.organization as string,
    startDate: data.start_date as string,
    endDate: data.end_date as string,
    location: data.location as string,
    costEstimate: Number(data.cost_estimate) || 0,
    justification: data.justification as string,
    status: data.status as ExternalTrainingRequest['status'],
    submittedDate: (data.submitted_date || data.created_at) as string,
    supervisorId: data.supervisor_id as string | undefined,
    supervisorName: supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : undefined,
    supervisorApprovalDate: data.supervisor_approval_date as string | undefined,
    adminId: data.admin_id as string | undefined,
    adminName: admin ? `${admin.first_name} ${admin.last_name}` : undefined,
    adminApprovalDate: data.admin_approval_date as string | undefined,
    notes: data.notes as string | undefined,
    denialReason: data.denial_reason as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string | undefined,
  };
}

// Training Attendance types
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'pending';

export interface TrainingAttendance {
  id: string;
  trainingId: string;
  userId: string;
  userName?: string;
  userBadge?: string;
  attendanceStatus: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  markedBy?: string;
  markedByName?: string;
  markedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// Training Attendance operations
export const attendanceService = {
  async getByTraining(trainingId: string): Promise<TrainingAttendance[]> {
    const { data, error } = await supabase
      .from('training_attendance')
      .select(`
        *,
        user:users!training_attendance_user_id_fkey(id, badge_number, first_name, last_name),
        marker:users!training_attendance_marked_by_fkey(id, first_name, last_name)
      `)
      .eq('training_id', trainingId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map(mapAttendanceFromDb);
  },

  async getByUser(userId: string): Promise<TrainingAttendance[]> {
    const { data, error } = await supabase
      .from('training_attendance')
      .select(`
        *,
        user:users!training_attendance_user_id_fkey(id, badge_number, first_name, last_name),
        marker:users!training_attendance_marked_by_fkey(id, first_name, last_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapAttendanceFromDb);
  },

  async getAll(): Promise<TrainingAttendance[]> {
    const { data, error } = await supabase
      .from('training_attendance')
      .select(`
        *,
        user:users!training_attendance_user_id_fkey(id, badge_number, first_name, last_name),
        marker:users!training_attendance_marked_by_fkey(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapAttendanceFromDb);
  },

  async create(attendance: {
    trainingId: string;
    userId: string;
    attendanceStatus?: AttendanceStatus;
    notes?: string;
    markedBy?: string;
  }): Promise<TrainingAttendance | null> {
    const { data, error } = await supabase
      .from('training_attendance')
      .insert({
        training_id: attendance.trainingId,
        user_id: attendance.userId,
        attendance_status: attendance.attendanceStatus || 'pending',
        notes: attendance.notes || null,
        marked_by: attendance.markedBy || null,
        marked_at: attendance.markedBy ? new Date().toISOString() : null,
      })
      .select(`
        *,
        user:users!training_attendance_user_id_fkey(id, badge_number, first_name, last_name),
        marker:users!training_attendance_marked_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapAttendanceFromDb(data);
  },

  async upsert(attendance: {
    trainingId: string;
    userId: string;
    attendanceStatus: AttendanceStatus;
    notes?: string;
    markedBy: string;
    checkInTime?: string;
    checkOutTime?: string;
  }): Promise<TrainingAttendance | null> {
    const { data, error } = await supabase
      .from('training_attendance')
      .upsert({
        training_id: attendance.trainingId,
        user_id: attendance.userId,
        attendance_status: attendance.attendanceStatus,
        notes: attendance.notes || null,
        marked_by: attendance.markedBy,
        marked_at: new Date().toISOString(),
        check_in_time: attendance.checkInTime || null,
        check_out_time: attendance.checkOutTime || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'training_id,user_id'
      })
      .select(`
        *,
        user:users!training_attendance_user_id_fkey(id, badge_number, first_name, last_name),
        marker:users!training_attendance_marked_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapAttendanceFromDb(data);
  },

  async updateStatus(
    id: string,
    status: AttendanceStatus,
    markedBy: string,
    notes?: string
  ): Promise<TrainingAttendance | null> {
    const updates: Record<string, unknown> = {
      attendance_status: status,
      marked_by: markedBy,
      marked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (status === 'present') {
      updates.check_in_time = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('training_attendance')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:users!training_attendance_user_id_fkey(id, badge_number, first_name, last_name),
        marker:users!training_attendance_marked_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapAttendanceFromDb(data);
  },

  async bulkUpdateStatus(
    trainingId: string,
    userIds: string[],
    status: AttendanceStatus,
    markedBy: string
  ): Promise<boolean> {
    const updates = userIds.map(userId => ({
      training_id: trainingId,
      user_id: userId,
      attendance_status: status,
      marked_by: markedBy,
      marked_at: new Date().toISOString(),
      check_in_time: status === 'present' ? new Date().toISOString() : null,
    }));

    const { error } = await supabase
      .from('training_attendance')
      .upsert(updates, { onConflict: 'training_id,user_id' });

    return !error;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('training_attendance')
      .delete()
      .eq('id', id);

    return !error;
  },

  async getAttendanceSummary(trainingId: string): Promise<{
    total: number;
    present: number;
    absent: number;
    excused: number;
    pending: number;
  }> {
    const attendance = await this.getByTraining(trainingId);
    
    return {
      total: attendance.length,
      present: attendance.filter(a => a.attendanceStatus === 'present').length,
      absent: attendance.filter(a => a.attendanceStatus === 'absent').length,
      excused: attendance.filter(a => a.attendanceStatus === 'excused').length,
      pending: attendance.filter(a => a.attendanceStatus === 'pending').length,
    };
  },
};

// Helper function to map attendance from DB
function mapAttendanceFromDb(data: Record<string, unknown>): TrainingAttendance {
  const user = data.user as Record<string, unknown> | null;
  const marker = data.marker as Record<string, unknown> | null;

  // Extract badge number with fallbacks
  const userBadge = user?.badge_number as string || 
                    (user as any)?.badgeNumber as string || 
                    data.user_badge as string || 
                    undefined;

  return {
    id: data.id as string,
    trainingId: data.training_id as string,
    userId: data.user_id as string,
    userName: user ? `${user.first_name} ${user.last_name}` : undefined,
    userBadge: userBadge,
    attendanceStatus: data.attendance_status as AttendanceStatus,
    checkInTime: data.check_in_time as string | undefined,
    checkOutTime: data.check_out_time as string | undefined,
    notes: data.notes as string | undefined,
    markedBy: data.marked_by as string | undefined,
    markedByName: marker ? `${marker.first_name} ${marker.last_name}` : undefined,
    markedAt: data.marked_at as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string | undefined,
  };
}


// Vendor operations
export const vendorService = {
  async getAll(): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');

    if (error || !data) return [];
    return data.map(mapVendorFromDb);
  },

  async getActive(): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error || !data) return [];
    return data.map(mapVendorFromDb);
  },

  async getById(id: string): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapVendorFromDb(data);
  },

  async create(vendor: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    paymentTerms?: string;
    taxId?: string;
    notes?: string;
  }): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name: vendor.name,
        contact_name: vendor.contactName || null,
        email: vendor.email || null,
        phone: vendor.phone || null,
        address: vendor.address || null,
        payment_terms: vendor.paymentTerms || 'Net 30',
        tax_id: vendor.taxId || null,
        notes: vendor.notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !data) return null;
    return mapVendorFromDb(data);
  },

  async update(id: string, updates: Partial<Vendor>): Promise<Vendor | null> {
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.paymentTerms !== undefined) dbUpdates.payment_terms = updates.paymentTerms;
    if (updates.taxId !== undefined) dbUpdates.tax_id = updates.taxId;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('vendors')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return mapVendorFromDb(data);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    return !error;
  },
};

// Invoice operations
export const invoiceService = {
  async getAll(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapInvoiceFromDb);
  },

  async getByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapInvoiceFromDb);
  },

  async getByVendor(vendorId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapInvoiceFromDb);
  },

  async getByCostEntry(costEntryId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .eq('cost_entry_id', costEntryId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapInvoiceFromDb);
  },

  async getUnbatched(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .is('payment_batch_id', null)
      .in('status', ['approved'])
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapInvoiceFromDb);
  },

  async getById(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapInvoiceFromDb(data);
  },

  async create(invoice: {
    invoiceNumber: string;
    vendorId?: string;
    costEntryId?: string;
    amount: number;
    invoiceDate: string;
    dueDate?: string;
    description?: string;
    notes?: string;
    createdBy: string;
  }): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoice.invoiceNumber,
        vendor_id: invoice.vendorId || null,
        cost_entry_id: invoice.costEntryId || null,
        amount: invoice.amount,
        invoice_date: invoice.invoiceDate,
        due_date: invoice.dueDate || null,
        description: invoice.description || null,
        notes: invoice.notes || null,
        created_by: invoice.createdBy,
        status: 'pending',
      })
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapInvoiceFromDb(data);
  },

  async update(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.invoiceNumber !== undefined) dbUpdates.invoice_number = updates.invoiceNumber;
    if (updates.vendorId !== undefined) dbUpdates.vendor_id = updates.vendorId;
    if (updates.costEntryId !== undefined) dbUpdates.cost_entry_id = updates.costEntryId;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.invoiceDate !== undefined) dbUpdates.invoice_date = updates.invoiceDate;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.fileUrl !== undefined) dbUpdates.file_url = updates.fileUrl;
    if (updates.fileName !== undefined) dbUpdates.file_name = updates.fileName;

    const { data, error } = await supabase
      .from('invoices')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapInvoiceFromDb(data);
  },

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    processedBy?: string
  ): Promise<Invoice | null> {
    const dbUpdates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'received') {
      dbUpdates.received_date = new Date().toISOString().split('T')[0];
    }
    if (status === 'processing' || status === 'approved' || status === 'paid' || status === 'rejected') {
      dbUpdates.processed_date = new Date().toISOString().split('T')[0];
      if (processedBy) {
        dbUpdates.processed_by = processedBy;
      }
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapInvoiceFromDb(data);
  },

  async attachFile(id: string, fileUrl: string, fileName: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .update({
        file_url: fileUrl,
        file_name: fileName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  },

  async assignToBatch(invoiceIds: string[], batchId: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .update({
        payment_batch_id: batchId,
        updated_at: new Date().toISOString(),
      })
      .in('id', invoiceIds);

    return !error;
  },

  async removeFromBatch(invoiceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .update({
        payment_batch_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    return !error;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    return !error;
  },

  async uploadInvoiceFile(file: File, invoiceId: string): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `invoice_${invoiceId}_${Date.now()}.${fileExt}`;
    const filePath = `invoices/${fileName}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error || !data) return null;

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },
};

// Payment Batch operations
export const paymentBatchService = {
  async getAll(): Promise<PaymentBatch[]> {
    const { data, error } = await supabase
      .from('payment_batches')
      .select(`
        *,
        creator:users!payment_batches_created_by_fkey(id, first_name, last_name),
        approver:users!payment_batches_approved_by_fkey(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapPaymentBatchFromDb);
  },

  async getByStatus(status: PaymentBatchStatus): Promise<PaymentBatch[]> {
    const { data, error } = await supabase
      .from('payment_batches')
      .select(`
        *,
        creator:users!payment_batches_created_by_fkey(id, first_name, last_name),
        approver:users!payment_batches_approved_by_fkey(id, first_name, last_name)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapPaymentBatchFromDb);
  },

  async getById(id: string): Promise<PaymentBatch | null> {
    const { data, error } = await supabase
      .from('payment_batches')
      .select(`
        *,
        creator:users!payment_batches_created_by_fkey(id, first_name, last_name),
        approver:users!payment_batches_approved_by_fkey(id, first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapPaymentBatchFromDb(data);
  },

  async getWithInvoices(id: string): Promise<PaymentBatch | null> {
    const batch = await this.getById(id);
    if (!batch) return null;

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vendor:vendors(id, name),
        cost_entry:officer_training_costs(id, training_title),
        creator:users!invoices_created_by_fkey(id, first_name, last_name),
        processor:users!invoices_processed_by_fkey(id, first_name, last_name)
      `)
      .eq('payment_batch_id', id)
      .order('created_at', { ascending: false });

    if (!error && invoices) {
      batch.invoices = invoices.map(mapInvoiceFromDb);
    }

    return batch;
  },

  async create(batch: {
    batchDate: string;
    notes?: string;
    createdBy: string;
  }): Promise<PaymentBatch | null> {
    // Generate batch number
    const batchNumber = `PB-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabase
      .from('payment_batches')
      .insert({
        batch_number: batchNumber,
        batch_date: batch.batchDate,
        notes: batch.notes || null,
        created_by: batch.createdBy,
        status: 'draft',
        total_amount: 0,
        invoice_count: 0,
      })
      .select(`
        *,
        creator:users!payment_batches_created_by_fkey(id, first_name, last_name),
        approver:users!payment_batches_approved_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;
    return mapPaymentBatchFromDb(data);
  },

  async updateTotals(id: string): Promise<boolean> {
    // Calculate totals from invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('amount')
      .eq('payment_batch_id', id);

    if (invoiceError) return false;

    const totalAmount = invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
    const invoiceCount = invoices?.length || 0;

    const { error } = await supabase
      .from('payment_batches')
      .update({
        total_amount: totalAmount,
        invoice_count: invoiceCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  },

  async updateStatus(
    id: string,
    status: PaymentBatchStatus,
    approvedBy?: string
  ): Promise<PaymentBatch | null> {
    const dbUpdates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'submitted') {
      dbUpdates.submitted_date = new Date().toISOString().split('T')[0];
    }
    if (status === 'approved') {
      dbUpdates.approved_date = new Date().toISOString().split('T')[0];
      if (approvedBy) {
        dbUpdates.approved_by = approvedBy;
      }
    }
    if (status === 'processed' || status === 'completed') {
      dbUpdates.processed_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('payment_batches')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        creator:users!payment_batches_created_by_fkey(id, first_name, last_name),
        approver:users!payment_batches_approved_by_fkey(id, first_name, last_name)
      `)
      .single();

    if (error || !data) return null;

    // If batch is completed, mark all invoices as paid
    if (status === 'completed') {
      await supabase
        .from('invoices')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('payment_batch_id', id);
    }

    return mapPaymentBatchFromDb(data);
  },

  async delete(id: string): Promise<boolean> {
    // First remove batch reference from invoices
    await supabase
      .from('invoices')
      .update({ payment_batch_id: null })
      .eq('payment_batch_id', id);

    const { error } = await supabase
      .from('payment_batches')
      .delete()
      .eq('id', id);

    return !error;
  },
};

// Helper functions for new types
function mapVendorFromDb(data: Record<string, unknown>): Vendor {
  return {
    id: data.id as string,
    name: data.name as string,
    contactName: data.contact_name as string | undefined,
    email: data.email as string | undefined,
    phone: data.phone as string | undefined,
    address: data.address as string | undefined,
    paymentTerms: data.payment_terms as string || 'Net 30',
    taxId: data.tax_id as string | undefined,
    notes: data.notes as string | undefined,
    isActive: data.is_active as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string | undefined,
  };
}

function mapInvoiceFromDb(data: Record<string, unknown>): Invoice {
  const vendor = data.vendor as Record<string, unknown> | null;
  const costEntry = data.cost_entry as Record<string, unknown> | null;
  const creator = data.creator as Record<string, unknown> | null;
  const processor = data.processor as Record<string, unknown> | null;

  return {
    id: data.id as string,
    invoiceNumber: data.invoice_number as string,
    vendorId: data.vendor_id as string | undefined,
    vendorName: vendor?.name as string | undefined,
    costEntryId: data.cost_entry_id as string | undefined,
    costEntryTitle: costEntry?.training_title as string | undefined,
    amount: Number(data.amount) || 0,
    invoiceDate: data.invoice_date as string,
    dueDate: data.due_date as string | undefined,
    receivedDate: data.received_date as string | undefined,
    processedDate: data.processed_date as string | undefined,
    status: data.status as InvoiceStatus,
    fileUrl: data.file_url as string | undefined,
    fileName: data.file_name as string | undefined,
    description: data.description as string | undefined,
    paymentBatchId: data.payment_batch_id as string | undefined,
    notes: data.notes as string | undefined,
    createdBy: data.created_by as string | undefined,
    createdByName: creator ? `${creator.first_name} ${creator.last_name}` : undefined,
    processedBy: data.processed_by as string | undefined,
    processedByName: processor ? `${processor.first_name} ${processor.last_name}` : undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string | undefined,
  };
}

function mapPaymentBatchFromDb(data: Record<string, unknown>): PaymentBatch {
  const creator = data.creator as Record<string, unknown> | null;
  const approver = data.approver as Record<string, unknown> | null;

  return {
    id: data.id as string,
    batchNumber: data.batch_number as string,
    batchDate: data.batch_date as string,
    totalAmount: Number(data.total_amount) || 0,
    invoiceCount: Number(data.invoice_count) || 0,
    status: data.status as PaymentBatchStatus,
    submittedDate: data.submitted_date as string | undefined,
    approvedDate: data.approved_date as string | undefined,
    processedDate: data.processed_date as string | undefined,
    notes: data.notes as string | undefined,
    createdBy: data.created_by as string | undefined,
    createdByName: creator ? `${creator.first_name} ${creator.last_name}` : undefined,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: approver ? `${approver.first_name} ${approver.last_name}` : undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string | undefined,
  };
}
