import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import TrainingList from '@/components/TrainingList';
import MyRequests from '@/components/MyRequests';
import Profile from '@/components/Profile';
import Approvals from '@/components/Approvals';
import AdminPanel from '@/components/AdminPanel';
import EmailComposer from '@/components/EmailComposer';
import ImportData from '@/components/ImportData';
import Accounting from '@/components/Accounting';
import ReportingDashboard from '@/components/ReportingDashboard';
import InternalTrainingForm from '@/components/InternalTrainingForm';
import ExternalTrainingForm from '@/components/ExternalTrainingForm';
import TrainingRequestFilter from '@/components/TrainingRequestFilter';




const MainApp: React.FC = () => {
  const { isAuthenticated, user, allUsers } = useAuth();
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState('dashboard');




  if (!isAuthenticated) {
    return <LoginPage onLogin={() => {}} />;
  }




  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      case 'training':
        return <TrainingList />;
      case 'internal-training':
        return <InternalTrainingForm />;
      case 'external-training':
        return <ExternalTrainingForm />;
      case 'requests':
        return <MyRequests />;
      case 'profile':
        return <Profile />;
      case 'approvals':
        return <Approvals />;
      case 'admin':
        return <AdminPanel />;
      case 'email':
        return <EmailComposer />;
      case 'import':
        return <ImportData />;
      case 'accounting':
