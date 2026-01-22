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
  { id: 'approvals', label: 'Pending Approvals', icon: ApprovalIcon, roles: ['supervisor', 'administrator', 'training_coordinator'] },
];


const adminItems: NavItem[] = [
  { id: 'admin', label: 'Admin Controls', icon: AdminIcon, roles: ['administrator', 'training_coordinator'] },
  { id: 'request-filter', label: 'Request Filter', icon: FilterIcon, roles: ['administrator', 'supervisor', 'training_coordinator'] },
  { id: 'reports', label: 'Reports Dashboard', icon: ReportIcon, roles: ['administrator', 'supervisor', 'training_coordinator'] },
  { id: 'email', label: 'Email Center', icon: EmailIcon, roles: ['administrator', 'supervisor', 'training_coordinator'] },
  { id: 'import', label: 'Import Data', icon: ImportIcon, roles: ['administrator', 'training_coordinator'] },
];




const accountingItems: NavItem[] = [
  { id: 'accounting', label: 'Accounting Access', icon: AccountingIcon, roles: ['accounting', 'administrator'] },
];




const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen, onToggle }) => {
  const { user, logout } = useAuth();


  const hasAccess = (roles?: string[]) => {
