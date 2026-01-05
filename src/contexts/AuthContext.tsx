import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, Notification, TrainingRequest } from '@/types';
import { userService, notificationService, requestService, externalTrainingService } from '@/lib/database';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (badgeNumber: string, password: string) => Promise<boolean>;
  logout: () => void;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  userRequests: TrainingRequest[];
  allRequests: TrainingRequest[];
  addRequest: (trainingId: string, notes?: string) => Promise<TrainingRequest | null>;
  updateRequestStatus: (requestId: string, status: TrainingRequest['status'], notes?: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  allUsers: User[];
  refreshUsers: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  createUser: (userData: {
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
  }) => Promise<User | null>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User | null>;
  updateCurrentUser: (updates: Partial<User>) => Promise<User | null>;
  resetUserPassword: (id: string, newPassword: string) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userRequests, setUserRequests] = useState<TrainingRequest[]>([]);
  const [allRequests, setAllRequests] = useState<TrainingRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Load all users on mount
  useEffect(() => {
    const loadUsers = async () => {
      const users = await userService.getAll();
      setAllUsers(users);
    };
    loadUsers();
  }, []);

  // Load user data when authenticated
  useEffect(() => {
    if (user) {
      loadUserData();
      setupRealtimeSubscriptions();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user) return;

    // Load notifications
    const userNotifications = await notificationService.getByUser(user.id);
    setNotifications(userNotifications);

    // Load user's requests (both internal and external)
    const internalRequests = await requestService.getByUser(user.id);
    const externalRequests = await externalTrainingService.getByUser(user.id);
    // Map external requests to TrainingRequest format
    const mappedExternalRequests = externalRequests.map(ext => ({
      ...ext,
      trainingId: ext.id,
      trainingTitle: ext.eventName || 'External Training',
      userName: ext.userName || '',
      userBadge: ext.userBadge || ''
    }));
    const combinedRequests = [...internalRequests, ...mappedExternalRequests];
    setUserRequests(combinedRequests);

    // Load all requests for supervisors/admins
    if (user.role === 'supervisor' || user.role === 'administrator') {
      const allInternal = await requestService.getAll();
      const allExternal = await externalTrainingService.getAll();
      // Map external requests to TrainingRequest format
      const mappedAllExternal = allExternal.map(ext => ({
        ...ext,
        trainingId: ext.id,
        trainingTitle: ext.eventName || 'External Training',
        userName: ext.userName || '',
        userBadge: ext.userBadge || ''
      }));
      const allCombined = [...allInternal, ...mappedAllExternal];
      setAllRequests(allCombined);
    } else {
      setAllRequests(combinedRequests);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to notification changes
    const notificationChannel = notificationService.subscribeToChanges(user.id, (payload: unknown) => {
      const p = payload as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> };
      if (p.eventType === 'INSERT') {
        setNotifications(prev => [{
          id: p.new.id as string,
          userId: p.new.user_id as string,
          title: p.new.title as string,
          message: p.new.message as string,
          type: p.new.type as Notification['type'],
          read: p.new.read as boolean,
          createdAt: p.new.created_at as string,
          link: p.new.link as string | undefined,
        }, ...prev]);
      } else if (p.eventType === 'UPDATE') {
        setNotifications(prev => prev.map(n => 
          n.id === p.new.id ? { ...n, read: p.new.read as boolean } : n
        ));
      }
    });

    // Subscribe to request changes
    const requestChannel = requestService.subscribeToChanges(async () => {
      // Reload requests when changes occur
      await refreshRequests();
    });

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(requestChannel);
    };
  };

  const login = useCallback(async (badgeNumber: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const foundUser = await userService.login(badgeNumber, password);
      if (foundUser) {
        setUser(foundUser);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setNotifications([]);
    setUserRequests([]);
    setAllRequests([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, [user]);

  const addRequest = useCallback(async (trainingId: string, notes?: string): Promise<TrainingRequest | null> => {
    if (!user) {
      return null;
    }

    const newRequest = await requestService.create({
      trainingId,
      userId: user.id,
      notes,
    });

    if (newRequest) {
      setUserRequests(prev => [newRequest, ...prev]);
      setAllRequests(prev => [newRequest, ...prev]);

      // Create notification for user
      await notificationService.create({
        userId: user.id,
        title: 'Request Submitted',
        message: `Your request for ${newRequest.trainingTitle} has been submitted.`,
        type: 'success',
        link: '/requests',
      });
    }

    return newRequest;
  }, [user]);

  const updateRequestStatus = useCallback(async (
    requestId: string, 
    status: TrainingRequest['status'],
    notes?: string
  ) => {
    if (!user) return;

    const updatedRequest = await requestService.updateStatus(
      requestId,
      status,
      { id: user.id, role: user.role },
      notes
    );

    if (updatedRequest) {
      // Update local state
      setUserRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
      setAllRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));

      // Create notification for the request owner
      const notificationType = status === 'approved' ? 'success' : 
                              status === 'denied' ? 'error' : 'info';
      const notificationTitle = status === 'approved' ? 'Request Approved' :
                                status === 'denied' ? 'Request Denied' :
                                status === 'admin_approval' ? 'Request Forwarded' :
                                'Request Status Updated';
      const notificationMessage = status === 'approved' 
        ? `Your request for ${updatedRequest.trainingTitle} has been approved!`
        : status === 'denied'
        ? `Your request for ${updatedRequest.trainingTitle} has been denied. Reason: ${notes || 'No reason provided'}`
        : status === 'admin_approval'
        ? `Your request for ${updatedRequest.trainingTitle} has been forwarded to administration for final approval.`
        : `Your request for ${updatedRequest.trainingTitle} status has been updated to ${status}.`;

      await notificationService.create({
        userId: updatedRequest.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        link: '/requests',
      });
    }
  }, [user]);

  const refreshRequests = useCallback(async () => {
    if (!user) return;

    const internalRequests = await requestService.getByUser(user.id);
    const externalRequests = await externalTrainingService.getByUser(user.id);
    // Map external requests to TrainingRequest format
    const mappedExternalRequests = externalRequests.map(ext => ({
      ...ext,
      trainingId: ext.id,
      trainingTitle: ext.eventName || 'External Training',
      userName: ext.userName || '',
      userBadge: ext.userBadge || ''
    }));
    const combinedRequests = [...internalRequests, ...mappedExternalRequests];
    setUserRequests(combinedRequests);

    if (user.role === 'supervisor' || user.role === 'administrator') {
      const allInternal = await requestService.getAll();
      const allExternal = await externalTrainingService.getAll();
      // Map external requests to TrainingRequest format
      const mappedAllExternal = allExternal.map(ext => ({
        ...ext,
        trainingId: ext.id,
        trainingTitle: ext.eventName || 'External Training',
        userName: ext.userName || '',
        userBadge: ext.userBadge || ''
      }));
      const allCombined = [...allInternal, ...mappedAllExternal];
      setAllRequests(allCombined);
    } else {
      setAllRequests(combinedRequests);
    }
  }, [user]);
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    const userNotifications = await notificationService.getByUser(user.id);
    setNotifications(userNotifications);
  }, [user]);

  const refreshUsers = useCallback(async () => {
    const users = await userService.getAll();
    setAllUsers(users);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    if (!user) return;
    const updatedUser = await userService.getById(user.id);
    if (updatedUser) {
      setUser(updatedUser);
    }
  }, [user]);

  const createUser = useCallback(async (userData: {
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
  }): Promise<User | null> => {
    const newUser = await userService.create(userData);
    if (newUser) {
      setAllUsers(prev => [...prev, newUser]);
    }
    return newUser;
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<User>): Promise<User | null> => {
    const updatedUser = await userService.update(id, updates);
    if (updatedUser) {
      setAllUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
    }
    return updatedUser;
  }, []);

  const updateCurrentUser = useCallback(async (updates: Partial<User>): Promise<User | null> => {
    if (!user) return null;
    const updatedUser = await userService.update(user.id, updates);
    if (updatedUser) {
      setUser(updatedUser);
      setAllUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    }
    return updatedUser;
  }, [user]);

  const resetUserPassword = useCallback(async (id: string, newPassword: string): Promise<boolean> => {
    return await userService.resetPassword(id, newPassword);
  }, []);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    const success = await userService.delete(id);
    if (success) {
      setAllUsers(prev => prev.filter(u => u.id !== id));
    }
    return success;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      userRequests,
      allRequests,
      addRequest,
      updateRequestStatus,
      refreshRequests,
      refreshNotifications,
      allUsers,
      refreshUsers,
      refreshCurrentUser,
      createUser,
      updateUser,
      updateCurrentUser,
      resetUserPassword,
      deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
