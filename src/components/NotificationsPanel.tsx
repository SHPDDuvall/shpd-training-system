import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types';
import { 
  BellIcon, 
  CheckIcon, 
  TrashIcon, 
  FilterIcon,
  ApprovalIcon,
  CalendarIcon,
  CertificateIcon,
  AccountingIcon,
  AlertIcon,
  RefreshIcon
} from '@/components/icons/Icons';
import { notificationService } from '@/lib/database';
import { 
  runAllNotificationGenerators,
  cleanupOldNotifications 
} from '@/lib/notificationGenerator';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type NotificationFilter = 'all' | 'unread' | 'info' | 'success' | 'warning' | 'error';

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { user, notifications, markAsRead, markAllAsRead, refreshNotifications, allUsers } = useAuth();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
  }, [isOpen, refreshNotifications]);

  const getNotificationIcon = (notification: Notification) => {
    const title = notification.title.toLowerCase();
    
    if (title.includes('approval') || title.includes('approved') || title.includes('denied') || title.includes('review')) {
      return <ApprovalIcon size={18} />;
    }
    if (title.includes('training') || title.includes('scheduled') || title.includes('deadline') || title.includes('reminder')) {
      return <CalendarIcon size={18} />;
    }
    if (title.includes('certificate') || title.includes('expir')) {
      return <CertificateIcon size={18} />;
    }
    if (title.includes('budget') || title.includes('cost') || title.includes('payment')) {
      return <AccountingIcon size={18} />;
    }
    if (notification.type === 'warning' || notification.type === 'error') {
      return <AlertIcon size={18} />;
    }
    return <BellIcon size={18} />;
  };

  const getNotificationColor = (type: Notification['type']) => {
    const colors = {
      info: 'bg-blue-100 text-blue-600 border-blue-200',
      success: 'bg-green-100 text-green-600 border-green-200',
      warning: 'bg-amber-100 text-amber-600 border-amber-200',
      error: 'bg-red-100 text-red-600 border-red-200',
    };
    return colors[type];
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const handleDeleteNotification = async (id: string) => {
    await notificationService.delete(id);
    refreshNotifications();
    setDeleteConfirm(null);
  };

  const handleGenerateNotifications = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      // Get supervisor and accounting user IDs
      const supervisorIds = allUsers
        .filter(u => u.role === 'supervisor' || u.role === 'administrator')
        .map(u => u.id);
      
      const accountingIds = allUsers
        .filter(u => u.role === 'accounting' || u.role === 'administrator')
        .map(u => u.id);

      await runAllNotificationGenerators(supervisorIds, accountingIds);
      await refreshNotifications();
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCleanupNotifications = async () => {
    const deleted = await cleanupOldNotifications();
    console.log(`Cleaned up ${deleted} old notifications`);
    refreshNotifications();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <BellIcon className="text-amber-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Notifications</h2>
                <p className="text-sm text-slate-500">
                  {notifications.filter(n => !n.read).length} unread
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Actions */}
          <div className="px-4 pb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(user?.role === 'administrator' || user?.role === 'supervisor') && (
                <button
                  onClick={handleGenerateNotifications}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  <RefreshIcon size={14} className={isGenerating ? 'animate-spin' : ''} />
                  {isGenerating ? 'Checking...' : 'Check Now'}
                </button>
              )}
              {notifications.filter(n => !n.read).length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <CheckIcon size={14} />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                filter === 'all' 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                filter === 'unread' 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                filter === 'warning' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Warnings
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                filter === 'error' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                filter === 'success' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Success
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto h-[calc(100vh-200px)]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <BellIcon className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">No notifications</h3>
              <p className="text-sm text-slate-500 text-center">
                {filter === 'all' 
                  ? "You're all caught up! Check back later for updates."
                  : `No ${filter} notifications found.`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${
                    !notification.read ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 text-sm">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        {notification.link && (
                          <a
                            href={notification.link}
                            onClick={() => {
                              markAsRead(notification.id);
                              onClose();
                            }}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                          >
                            View Details
                          </a>
                        )}
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            Mark as read
                          </button>
                        )}
                        {deleteConfirm === notification.id ? (
                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(notification.id)}
                            className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
            <button
              onClick={handleCleanupNotifications}
              className="w-full py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              Clear old notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
