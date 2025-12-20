import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DashboardIcon,
  TrainingIcon,
  RequestIcon,
  ChainIcon,
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
  { id: 'chain', label: 'Chain of Command', icon: ChainIcon },
  { id: 'profile', label: 'My Profile', icon: ProfileIcon },
];

const supervisorItems: NavItem[] = [
  { id: 'approvals', label: 'Pending Approvals', icon: ApprovalIcon, roles: ['supervisor', 'administrator'] },
];

const adminItems: NavItem[] = [
  { id: 'admin', label: 'Admin Controls', icon: AdminIcon, roles: ['administrator'] },
  { id: 'reports', label: 'Reports Dashboard', icon: ReportIcon, roles: ['administrator', 'supervisor'] },
  { id: 'email', label: 'Email Center', icon: EmailIcon, roles: ['administrator', 'supervisor'] },
  { id: 'import', label: 'Import Data', icon: ImportIcon, roles: ['administrator'] },
];


const accountingItems: NavItem[] = [
  { id: 'accounting', label: 'Accounting Access', icon: AccountingIcon, roles: ['accounting', 'administrator'] },
];


const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen, onToggle }) => {
  const { user, logout } = useAuth();

  const hasAccess = (roles?: string[]) => {
    if (!roles || !user) return true;
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
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-amber-500 text-slate-900 font-semibold shadow-md'
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`}
      >
        <Icon size={20} />
        <span className={`${isOpen ? 'opacity-100' : 'opacity-0 w-0'} transition-all duration-200 whitespace-nowrap`}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-800 z-50 transition-all duration-300 flex flex-col ${
          isOpen ? 'w-64' : 'w-20'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://d64gsuwffb70l.cloudfront.net/68e12fc2c4a3a6a769b60461_1765897849387_330bdaab.png" 
                alt="SHPD Logo" 
                className="w-10 h-10 object-contain flex-shrink-0"
              />
              <span className={`font-bold text-white ${isOpen ? 'opacity-100' : 'opacity-0 w-0'} transition-all duration-200 whitespace-nowrap`}>
                SHPD Training
              </span>
            </div>

            <button
              onClick={onToggle}
              className="hidden lg:flex p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ChevronLeftIcon className={`transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} size={20} />
            </button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className={`p-4 border-b border-slate-700 ${isOpen ? '' : 'flex justify-center'}`}>
            <div className="flex items-center gap-3">
              <img
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className={`${isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'} transition-all duration-200`}>
                <div className="text-white font-medium text-sm whitespace-nowrap">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-slate-400 text-xs whitespace-nowrap">
                  {user.rank} • #{user.badgeNumber}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navItems.map(renderNavItem)}
          </div>

          {/* Supervisor Section */}
          {(user?.role === 'supervisor' || user?.role === 'administrator') && (
            <div className="pt-4 mt-4 border-t border-slate-700 space-y-1">
              {isOpen && <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Supervisor</div>}
              {supervisorItems.map(renderNavItem)}
            </div>
          )}

          {/* Admin Section */}
          {(user?.role === 'administrator' || user?.role === 'supervisor') && (
            <div className="pt-4 mt-4 border-t border-slate-700 space-y-1">
              {isOpen && <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Administration</div>}
              {adminItems.map(renderNavItem)}
            </div>
          )}

          {/* Accounting Section */}
          {(user?.role === 'accounting' || user?.role === 'administrator') && (
            <div className="pt-4 mt-4 border-t border-slate-700 space-y-1">
              {isOpen && <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Finance</div>}
              {accountingItems.map(renderNavItem)}
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <LogoutIcon size={20} />
            <span className={`${isOpen ? 'opacity-100' : 'opacity-0 w-0'} transition-all duration-200 whitespace-nowrap`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
