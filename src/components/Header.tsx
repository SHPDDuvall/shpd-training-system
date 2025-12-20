import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BellIcon, 
  MenuIcon, 
  SearchIcon, 
  ApprovalIcon,
  CalendarIcon,
  CertificateIcon,
  AccountingIcon,
  AlertIcon,
  CheckIcon
} from '@/components/icons/Icons';
import { Notification } from '@/types';
import NotificationsPanel from './NotificationsPanel';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, sidebarOpen }) => {
  const { user, notifications, unreadCount, markAsRead, markAllAsRead } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (notification: Notification) => {
    const title = notification.title.toLowerCase();
    
    if (title.includes('approval') || title.includes('approved') || title.includes('denied') || title.includes('review') || title.includes('forwarded')) {
      return <ApprovalIcon size={16} />;
    }
    if (title.includes('training') || title.includes('scheduled') || title.includes('deadline') || title.includes('reminder') || title.includes('completed')) {
      return <CalendarIcon size={16} />;
    }
    if (title.includes('certificate') || title.includes('expir')) {
      return <CertificateIcon size={16} />;
    }
    if (title.includes('budget') || title.includes('cost') || title.includes('payment')) {
      return <AccountingIcon size={16} />;
    }
    if (notification.type === 'warning' || notification.type === 'error') {
      return <AlertIcon size={16} />;
    }
    return <BellIcon size={16} />;
  };

  const getNotificationColor = (type: Notification['type']) => {
    const colors = {
      info: 'bg-blue-100 text-blue-600',
      success: 'bg-green-100 text-green-600',
      warning: 'bg-amber-100 text-amber-600',
      error: 'bg-red-100 text-red-600',
    };
    return colors[type];
  };

  const getNotificationBorderColor = (type: Notification['type']) => {
    const colors = {
      info: 'border-l-blue-500',
      success: 'border-l-green-500',
      warning: 'border-l-amber-500',
      error: 'border-l-red-500',
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

  // Get recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);

  // Group notifications by type for summary
  const notificationSummary = {
    pending: notifications.filter(n => n.title.toLowerCase().includes('pending') && !n.read).length,
    warnings: notifications.filter(n => (n.type === 'warning' || n.type === 'error') && !n.read).length,
    success: notifications.filter(n => n.type === 'success' && !n.read).length,
  };

  return (
    <>
      <header className={`fixed top-0 right-0 h-16 bg-white border-b border-slate-200 z-30 transition-all duration-300 ${
        sidebarOpen ? 'left-64' : 'left-20'
      } lg:left-20 ${sidebarOpen ? 'lg:left-64' : ''}`}>
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <MenuIcon size={24} />
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex items-center relative">
              <SearchIcon className="absolute left-3 text-slate-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search training, requests..."
                className="w-64 lg:w-80 pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <BellIcon size={24} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <BellIcon className="text-amber-600" size={16} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">Notifications</h3>
                          <p className="text-xs text-slate-500">{unreadCount} unread</p>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
                        >
                          <CheckIcon size={14} />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Quick Summary */}
                    {unreadCount > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        {notificationSummary.pending > 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {notificationSummary.pending} pending
                          </span>
                        )}
                        {notificationSummary.warnings > 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            {notificationSummary.warnings} warnings
                          </span>
                        )}
                        {notificationSummary.success > 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            {notificationSummary.success} success
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {recentNotifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <BellIcon className="text-slate-400" size={24} />
                        </div>
                        <p className="text-slate-500 text-sm">No notifications yet</p>
                        <p className="text-slate-400 text-xs mt-1">We'll notify you when something happens</p>
                      </div>
                    ) : (
                      recentNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.link) {
                              window.location.href = notification.link;
                            }
                          }}
                          className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${
                            !notification.read ? 'bg-amber-50/50' : 'border-l-transparent'
                          } ${!notification.read ? getNotificationBorderColor(notification.type) : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                              {getNotificationIcon(notification)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm ${!notification.read ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-400 mt-1.5">
                                {formatTime(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-3 border-t border-slate-200 bg-slate-50">
                    <button 
                      onClick={() => {
                        setShowNotifications(false);
                        setShowNotificationsPanel(true);
                      }}
                      className="w-full py-2 text-sm text-slate-700 hover:text-slate-900 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      View All Notifications
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-slate-800">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                </div>
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm border-2 border-white shadow">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Full Notifications Panel */}
      <NotificationsPanel 
        isOpen={showNotificationsPanel} 
        onClose={() => setShowNotificationsPanel(false)} 
      />
    </>
  );
};

export default Header;
