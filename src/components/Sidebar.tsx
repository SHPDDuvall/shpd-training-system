import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DashboardIcon,
  TrainingIcon,
  RequestIcon,
  ProfileIcon,
  AdminIcon,
  EmailIcon,
  AccountingIcon,
  LogoutIcon,
  ApprovalIcon,
  ImportIcon,
  ChevronLeftIcon,
  BadgeIcon,
  CertificateIcon,
  ReportIcon,
  InternalTrainingIcon,
  ExternalTrainingIcon,
  FilterIcon,
} from '@/components/icons/Icons';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string; size?: number }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'training', label: 'Available Training', icon: TrainingIcon },
  { id: 'internal-training', label: 'Internal Training', icon: InternalTrainingIcon },
  { id: 'external-training', label: 'External Training', icon: ExternalTrainingIcon },
  { id: 'requests', label: 'My Requests', icon: RequestIcon },
  { id: 'profile', label: 'My Profile', icon: ProfileIcon },
];

const supervisorItems: NavItem[] = [
  // Pending Approvals removed - functionality now in View Details
];

const adminItems: NavItem[] = [
  { id: 'admin', label: 'Admin Controls', icon: AdminIcon, roles: ['administrator', 'training_coordinator'] },
  { id: 'request-filter', label: 'Request Filter', icon: FilterIcon, roles: ['administrator', 'supervisor', 'training_coordinator'] },
  { id: 'reports', label: 'Reports Dashboard', icon: ReportIcon, roles: ['administrator', 'supervisor', 'training_coordinator'] },
  { id: 'email', label: 'Email Center', icon: EmailIcon, roles: ['administrator', 'supervisor', 'training_coordinator'] },
  { id: 'import', label: 'Import Data', icon: ImportIcon, roles: ['administrator', 'training_coordinator'] },
];

const accountingItems: NavItem[] = [
  { id: 'accounting', label: 'Accounting', icon: AccountingIcon, roles: ['administrator', 'training_coordinator'] },
];

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isOpen,
  onToggle,
}) => {
  const { user, logout } = useAuth();

  const hasAccess = (roles?: string[]) => {
    if (!roles) return true;
    if (!user) return false;
    return roles.includes(user.role);
  };

  const renderNavItem = (item: NavItem) => {
    if (!hasAccess(item.roles)) return null;

    const Icon = item.icon;
    const isActive = currentView === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onViewChange(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {isOpen && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  const renderSection = (title: string, items: NavItem[]) => {
    const visibleItems = items.filter((item) => hasAccess(item.roles));
    if (visibleItems.length === 0) return null;

    return (
      <div className="mt-6">
        {isOpen && (
          <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {title}
          </h3>
        )}
        <div className="space-y-1">{visibleItems.map(renderNavItem)}</div>
      </div>
    );
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-slate-800 transition-all duration-300 z-40 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {isOpen && (
            <div className="flex items-center gap-2">
              <BadgeIcon className="w-8 h-8 text-blue-500" />
              <span className="font-bold text-white">SHPD Training</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ChevronLeftIcon
              className={`w-5 h-5 transition-transform ${!isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">{navItems.map(renderNavItem)}</div>
          {renderSection('Supervisor', supervisorItems)}
          {renderSection('Administration', adminItems)}
          {renderSection('Finance', accountingItems)}
        </nav>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-slate-700">
          {isOpen && user && (
            <div className="mb-3 px-3 py-2 bg-slate-700 rounded-lg">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogoutIcon className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
