import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService, accountingService, vendorService, invoiceService, paymentBatchService } from '@/lib/database';
import { TrainingOpportunity, OfficerTrainingCost, User, Vendor, Invoice, PaymentBatch, InvoiceStatus, PaymentBatchStatus } from '@/types';
import {
  AccountingIcon,
  CalendarIcon,
  SearchIcon,
  UsersIcon,
  ProfileIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  CloseIcon,
  CheckIcon,
} from '@/components/icons/Icons';
import AccountingReportsTab from '@/components/AccountingReportsTab';
import { exportPaymentBatchReport } from '@/lib/reportExportService';

// File Upload Icon
const UploadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17,8 12,3 7,8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// Document Icon
const DocumentIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

// Building Icon for Vendors
const BuildingIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="2" />
    <line x1="14" y1="22" x2="14" y2="2" />
  </svg>
);

// Package Icon for Batches
const PackageIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

// Chart Icon for Reports
const ChartIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);


interface EditCostModalProps {
  cost: OfficerTrainingCost | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<OfficerTrainingCost>) => void;
  allUsers: User[];
}

const EditCostModal: React.FC<EditCostModalProps> = ({ cost, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    trainingTitle: '',
    costAmount: 0,
    costType: 'training' as OfficerTrainingCost['costType'],
    budgetCode: '',
    fiscalYear: new Date().getFullYear().toString(),
    paymentStatus: 'pending' as OfficerTrainingCost['paymentStatus'],
    notes: '',
  });

  useEffect(() => {
    if (cost) {
      setFormData({
        trainingTitle: cost.trainingTitle,
        costAmount: cost.costAmount,
        costType: cost.costType,
        budgetCode: cost.budgetCode || '',
        fiscalYear: cost.fiscalYear || new Date().getFullYear().toString(),
        paymentStatus: cost.paymentStatus,
        notes: cost.notes || '',
      });
    }
  }, [cost]);

  if (!isOpen || !cost) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(cost.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Edit Cost Entry</h2>
          <p className="text-sm text-slate-500 mt-1">Update cost details for {cost.userName}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Training Title</label>
            <input
              type="text"
              value={formData.trainingTitle}
              onChange={(e) => setFormData({ ...formData, trainingTitle: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost Amount</label>
              <input
                type="number"
                value={formData.costAmount}
                onChange={(e) => setFormData({ ...formData, costAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost Type</label>
              <select
                value={formData.costType}
                onChange={(e) => setFormData({ ...formData, costType: e.target.value as OfficerTrainingCost['costType'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="training">Training</option>
                <option value="travel">Travel</option>
                <option value="materials">Materials</option>
                <option value="overtime">Overtime</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget Code</label>
              <input
                type="text"
                value={formData.budgetCode}
                onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., TR-2025-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fiscal Year</label>
              <input
                type="text"
                value={formData.fiscalYear}
                onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
            <select
              value={formData.paymentStatus}
              onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as OfficerTrainingCost['paymentStatus'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={3}
              placeholder="Add any notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cost: {
    userId: string;
    trainingTitle: string;
    costAmount: number;
    costType: OfficerTrainingCost['costType'];
    budgetCode?: string;
    fiscalYear?: string;
    notes?: string;
  }) => void;
  allUsers: User[];
}

const AddCostModal: React.FC<AddCostModalProps> = ({ isOpen, onClose, onSave, allUsers }) => {
  const [formData, setFormData] = useState({
    userId: '',
    trainingTitle: '',
    costAmount: 0,
    costType: 'training' as OfficerTrainingCost['costType'],
    budgetCode: '',
    fiscalYear: new Date().getFullYear().toString(),
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      alert('Please select an officer');
      return;
    }
    onSave(formData);
    setFormData({
      userId: '',
      trainingTitle: '',
      costAmount: 0,
      costType: 'training',
      budgetCode: '',
      fiscalYear: new Date().getFullYear().toString(),
      notes: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Add New Cost Entry</h2>
          <p className="text-sm text-slate-500 mt-1">Create a new training cost record</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Officer</label>
            <select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            >
              <option value="">Select an officer...</option>
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.badgeNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Training Title</label>
            <input
              type="text"
              value={formData.trainingTitle}
              onChange={(e) => setFormData({ ...formData, trainingTitle: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost Amount</label>
              <input
                type="number"
                value={formData.costAmount}
                onChange={(e) => setFormData({ ...formData, costAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost Type</label>
              <select
                value={formData.costType}
                onChange={(e) => setFormData({ ...formData, costType: e.target.value as OfficerTrainingCost['costType'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="training">Training</option>
                <option value="travel">Travel</option>
                <option value="materials">Materials</option>
                <option value="overtime">Overtime</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget Code</label>
              <input
                type="text"
                value={formData.budgetCode}
                onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., TR-2025-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fiscal Year</label>
              <input
                type="text"
                value={formData.fiscalYear}
                onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={3}
              placeholder="Add any notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
              Add Cost Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  currentFiscalYear: string;
  onSave: (budget: number, fiscalYear: string) => void;
}

const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({ isOpen, onClose, currentBudget, currentFiscalYear, onSave }) => {
  const [budget, setBudget] = useState(currentBudget);
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear);

  useEffect(() => {
    setBudget(currentBudget);
    setFiscalYear(currentFiscalYear);
  }, [currentBudget, currentFiscalYear]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(budget, fiscalYear);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Budget Settings</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min="0"
                step="1000"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fiscal Year</label>
            <input
              type="text"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invoice Modal
interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  vendors: Vendor[];
  costEntries: OfficerTrainingCost[];
  onSave: (invoice: Partial<Invoice> & { invoiceNumber: string; amount: number; invoiceDate: string }) => void;
  userId: string;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, invoice, vendors, costEntries, onSave, userId }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    vendorId: '',
    costEntryId: '',
    amount: 0,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    description: '',
    notes: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (invoice) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        vendorId: invoice.vendorId || '',
        costEntryId: invoice.costEntryId || '',
        amount: invoice.amount,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate || '',
        description: invoice.description || '',
        notes: invoice.notes || '',
      });
    } else {
      setFormData({
        invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
        vendorId: '',
        costEntryId: '',
        amount: 0,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        description: '',
        notes: '',
      });
    }
    setFile(null);
  }, [invoice, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let fileUrl = invoice?.fileUrl;
    let fileName = invoice?.fileName;
    
    if (file && invoice?.id) {
      const uploadedUrl = await invoiceService.uploadInvoiceFile(file, invoice.id);
      if (uploadedUrl) {
        fileUrl = uploadedUrl;
        fileName = file.name;
      }
    }
    
    onSave({
      ...formData,
      fileUrl,
      fileName,
      createdBy: userId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{invoice ? 'Edit Invoice' : 'Add Invoice'}</h2>
            <p className="text-sm text-slate-500 mt-1">Enter invoice details and attach receipt</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <CloseIcon size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number *</label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Link to Cost Entry</label>
              <select
                value={formData.costEntryId}
                onChange={(e) => setFormData({ ...formData, costEntryId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select cost entry...</option>
                {costEntries.map((c) => (
                  <option key={c.id} value={c.id}>{c.trainingTitle} - ${c.costAmount}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date *</label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Brief description of the invoice"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Attach Invoice/Receipt</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <UploadIcon size={32} className="mx-auto text-slate-400 mb-2" />
              {file ? (
                <p className="text-sm text-slate-700">{file.name}</p>
              ) : invoice?.fileName ? (
                <p className="text-sm text-slate-700">Current: {invoice.fileName}</p>
              ) : (
                <p className="text-sm text-slate-500">Click to upload PDF, JPG, or PNG</p>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
              {invoice ? 'Update Invoice' : 'Add Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Vendor Modal
interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor?: Vendor | null;
  onSave: (vendor: Partial<Vendor> & { name: string }) => void;
}

const VendorModal: React.FC<VendorModalProps> = ({ isOpen, onClose, vendor, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: 'Net 30',
    taxId: '',
    notes: '',
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        contactName: vendor.contactName || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        paymentTerms: vendor.paymentTerms || 'Net 30',
        taxId: vendor.taxId || '',
        notes: vendor.notes || '',
      });
    } else {
      setFormData({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        paymentTerms: 'Net 30',
        taxId: '',
        notes: '',
      });
    }
  }, [vendor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">{vendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID</label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
              {vendor ? 'Update Vendor' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Payment Batch Modal
interface PaymentBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  unbatchedInvoices: Invoice[];
  onCreateBatch: (invoiceIds: string[], notes: string) => void;
}

const PaymentBatchModal: React.FC<PaymentBatchModalProps> = ({ isOpen, onClose, unbatchedInvoices, onCreateBatch }) => {
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedInvoices([]);
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleInvoice = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedInvoices.length === unbatchedInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(unbatchedInvoices.map(i => i.id));
    }
  };

  const totalAmount = unbatchedInvoices
    .filter(i => selectedInvoices.includes(i.id))
    .reduce((sum, i) => sum + i.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInvoices.length === 0) {
      alert('Please select at least one invoice');
      return;
    }
    onCreateBatch(selectedInvoices, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Create Payment Batch</h2>
          <p className="text-sm text-slate-500 mt-1">Select approved invoices to include in this batch</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {unbatchedInvoices.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  {selectedInvoices.length === unbatchedInvoices.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-slate-500">
                  {selectedInvoices.length} selected
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-64 overflow-y-auto">
                {unbatchedInvoices.map((invoice) => (
                  <label
                    key={invoice.id}
                    className={`flex items-center p-3 cursor-pointer hover:bg-slate-50 ${
                      selectedInvoices.includes(invoice.id) ? 'bg-amber-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => toggleInvoice(invoice.id)}
                      className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-slate-800">{invoice.invoiceNumber}</div>
                      <div className="text-sm text-slate-500">{invoice.vendorName || 'No vendor'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-slate-800">${invoice.amount.toFixed(2)}</div>
                      <div className="text-xs text-slate-500">{invoice.invoiceDate}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Batch Total:</span>
                  <span className="text-xl font-bold text-slate-800">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No approved invoices available for batching.
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Batch Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={2}
              placeholder="Optional notes for this payment batch..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={selectedInvoices.length === 0}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Batch ({selectedInvoices.length} invoices)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Accounting: React.FC = () => {
  const { user, allUsers } = useAuth();
  const [trainings, setTrainings] = useState<TrainingOpportunity[]>([]);
  const [officerCosts, setOfficerCosts] = useState<OfficerTrainingCost[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'costs' | 'invoices' | 'vendors' | 'batches' | 'reports'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal states
  const [editCostModalOpen, setEditCostModalOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState<OfficerTrainingCost | null>(null);
  const [addCostModalOpen, setAddCostModalOpen] = useState(false);
  const [budgetSettingsModalOpen, setBudgetSettingsModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [totalBudget, setTotalBudget] = useState(150000);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadData();
    if (user) {
      accountingService.logAccess({
        userId: user.id,
        actionType: 'view',
        description: 'Accessed accounting dashboard',
      });
    }
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [trainingData, costData, budgetSettings, invoiceData, vendorData, batchData] = await Promise.all([
        trainingService.getAll(),
        accountingService.getOfficerCosts(),
        accountingService.getBudgetSettings(),
        invoiceService.getAll(),
        vendorService.getActive(),
        paymentBatchService.getAll(),
      ]);
      setTrainings(trainingData);
      setOfficerCosts(costData);
      setInvoices(invoiceData);
      setVendors(vendorData);
      setPaymentBatches(batchData);
      if (budgetSettings) {
        setTotalBudget(budgetSettings.totalBudget);
        setFiscalYear(budgetSettings.fiscalYear);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getOfficerCostSummary = () => {
    const summary: Record<string, { 
      userId: string; 
      userName: string; 
      userBadge: string;
      totalCost: number; 
      pendingCost: number; 
      approvedCost: number;
      paidCost: number;
      requestCount: number;
    }> = {};

    officerCosts.forEach(cost => {
      if (!summary[cost.userId]) {
        summary[cost.userId] = {
          userId: cost.userId,
          userName: cost.userName || 'Unknown',
          userBadge: cost.userBadge || '',
          totalCost: 0,
          pendingCost: 0,
          approvedCost: 0,
          paidCost: 0,
          requestCount: 0,
        };
      }
      
      summary[cost.userId].requestCount++;
      summary[cost.userId].totalCost += cost.costAmount;
      
      if (cost.paymentStatus === 'pending') {
        summary[cost.userId].pendingCost += cost.costAmount;
      } else if (cost.paymentStatus === 'approved') {
        summary[cost.userId].approvedCost += cost.costAmount;
      } else if (cost.paymentStatus === 'paid') {
        summary[cost.userId].paidCost += cost.costAmount;
      }
    });

    return Object.values(summary);
  };

  const officerSummary = getOfficerCostSummary();

  const filteredOfficers = officerSummary.filter(o =>
    o.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.userBadge.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOfficerCosts = officerCosts.filter(c => {
    const matchesSearch = c.trainingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (c.budgetCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || c.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (i.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const totalSpent = officerCosts.reduce((sum, c) => sum + c.costAmount, 0);
  const pendingCosts = officerCosts.filter(c => c.paymentStatus === 'pending').reduce((sum, c) => sum + c.costAmount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      received: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      paid: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-blue-100 text-blue-700',
      processed: 'bg-cyan-100 text-cyan-700',
      completed: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const handleExport = (format: string) => {
    if (user) {
      accountingService.logAccess({
        userId: user.id,
        actionType: 'export',
        description: `Exported ${activeTab} data as ${format}`,
      });
    }
    alert(`Exporting ${activeTab} data as ${format}...`);
  };

  const handleEditCost = (cost: OfficerTrainingCost) => {
    setSelectedCost(cost);
    setEditCostModalOpen(true);
  };

  const handleSaveCost = async (id: string, updates: Partial<OfficerTrainingCost>) => {
    if (!user) return;
    
    const result = await accountingService.updateCost(id, {
      trainingTitle: updates.trainingTitle,
      costAmount: updates.costAmount,
      costType: updates.costType,
      budgetCode: updates.budgetCode,
      fiscalYear: updates.fiscalYear,
      paymentStatus: updates.paymentStatus,
      notes: updates.notes,
      approvedBy: updates.paymentStatus === 'approved' || updates.paymentStatus === 'paid' ? user.id : undefined,
    });

    if (result) {
      accountingService.logAccess({
        userId: user.id,
        actionType: 'modify',
        targetRequestId: id,
        description: `Modified cost entry: ${updates.trainingTitle}`,
      });
      loadData();
    }
  };

  const handleAddCost = async (cost: {
    userId: string;
    trainingTitle: string;
    costAmount: number;
    costType: OfficerTrainingCost['costType'];
    budgetCode?: string;
    fiscalYear?: string;
    notes?: string;
  }) => {
    if (!user) return;
    
    const result = await accountingService.createCost(cost);
    
    if (result) {
      accountingService.logAccess({
        userId: user.id,
        actionType: 'modify',
        description: `Created new cost entry: ${cost.trainingTitle}`,
      });
      loadData();
    }
  };

  const handleDeleteCost = async (id: string, title: string) => {
    if (!user) return;
    
    if (!confirm(`Are you sure you want to delete the cost entry "${title}"?`)) return;
    
    const success = await accountingService.deleteCost(id);
    
    if (success) {
      accountingService.logAccess({
        userId: user.id,
        actionType: 'modify',
        targetRequestId: id,
        description: `Deleted cost entry: ${title}`,
      });
      loadData();
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: OfficerTrainingCost['paymentStatus']) => {
    if (!user) return;
    
    const success = await accountingService.updateCostStatus(id, newStatus, user.id);
    
    if (success) {
      accountingService.logAccess({
        userId: user.id,
        actionType: newStatus === 'approved' ? 'approve' : newStatus === 'rejected' ? 'reject' : 'modify',
        targetRequestId: id,
        description: `Changed payment status to ${newStatus}`,
      });
      loadData();
    }
  };

  const handleSaveBudgetSettings = async (budget: number, year: string) => {
    if (!user) return;
    
    const success = await accountingService.updateBudgetSettings({ totalBudget: budget, fiscalYear: year });
    
    if (success) {
      setTotalBudget(budget);
      setFiscalYear(year);
      accountingService.logAccess({
        userId: user.id,
        actionType: 'modify',
        description: `Updated budget settings: $${budget} for FY ${year}`,
      });
    }
  };

  // Invoice handlers
  const handleSaveInvoice = async (invoiceData: Partial<Invoice> & { invoiceNumber: string; amount: number; invoiceDate: string }) => {
    if (!user) return;
    
    if (selectedInvoice) {
      const result = await invoiceService.update(selectedInvoice.id, invoiceData);
      if (result) {
        accountingService.logAccess({
          userId: user.id,
          actionType: 'modify',
          description: `Updated invoice: ${invoiceData.invoiceNumber}`,
        });
      }
    } else {
      const result = await invoiceService.create({
        ...invoiceData,
        createdBy: user.id,
      });
      if (result) {
        accountingService.logAccess({
          userId: user.id,
          actionType: 'modify',
          description: `Created invoice: ${invoiceData.invoiceNumber}`,
        });
      }
    }
    loadData();
  };

  const handleInvoiceStatusChange = async (id: string, status: InvoiceStatus) => {
    if (!user) return;
    
    const result = await invoiceService.updateStatus(id, status, user.id);
    if (result) {
      accountingService.logAccess({
        userId: user.id,
        actionType: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'modify',
        description: `Changed invoice status to ${status}`,
      });
      loadData();
    }
  };

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!user) return;
    if (!confirm(`Delete invoice ${invoiceNumber}?`)) return;
    
    const success = await invoiceService.delete(id);
    if (success) {
      accountingService.logAccess({
        userId: user.id,
        actionType: 'modify',
        description: `Deleted invoice: ${invoiceNumber}`,
      });
      loadData();
    }
  };

  // Vendor handlers
  const handleSaveVendor = async (vendorData: Partial<Vendor> & { name: string }) => {
    if (!user) return;
    
    if (selectedVendor) {
      await vendorService.update(selectedVendor.id, vendorData);
    } else {
      await vendorService.create(vendorData);
    }
    loadData();
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    if (!confirm(`Delete vendor ${name}?`)) return;
    await vendorService.delete(id);
    loadData();
  };

  // Payment batch handlers
  const handleCreateBatch = async (invoiceIds: string[], notes: string) => {
    if (!user) return;
    
    const batch = await paymentBatchService.create({
      batchDate: new Date().toISOString().split('T')[0],
      notes,
      createdBy: user.id,
    });
    
    if (batch) {
      await invoiceService.assignToBatch(invoiceIds, batch.id);
      await paymentBatchService.updateTotals(batch.id);
      accountingService.logAccess({
        userId: user.id,
        actionType: 'modify',
        description: `Created payment batch with ${invoiceIds.length} invoices`,
      });
      loadData();
    }
  };

  const handleBatchStatusChange = async (id: string, status: PaymentBatchStatus) => {
    if (!user) return;
    
    const result = await paymentBatchService.updateStatus(id, status, user.id);
    if (result) {
      accountingService.logAccess({
        userId: user.id,
        actionType: status === 'approved' ? 'approve' : 'modify',
        description: `Changed batch status to ${status}`,
      });
      loadData();
    }
  };

  const unbatchedInvoices = invoices.filter(i => !i.paymentBatchId && i.status === 'approved');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: AccountingIcon },
    { id: 'costs', label: 'Cost Entries', icon: AccountingIcon },
    { id: 'invoices', label: 'Invoices', icon: DocumentIcon },
    { id: 'vendors', label: 'Vendors', icon: BuildingIcon },
    { id: 'batches', label: 'Payment Batches', icon: PackageIcon },
    { id: 'reports', label: 'Reports', icon: DownloadIcon },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Accounting & Invoices</h1>
          <p className="text-slate-600 mt-1">Training budget, invoices, and payment management</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBudgetSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
          >
            <AccountingIcon size={18} />
            Budget
          </button>
          <button
            onClick={() => setAddCostModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium transition-colors"
          >
            <PlusIcon size={18} />
            Add Cost
          </button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Total Budget</div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalBudget)}</div>
          <div className="text-xs text-slate-400 mt-1">FY {fiscalYear}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Total Spent</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSpent)}</div>
          <div className="text-xs text-slate-400 mt-1">{((totalSpent / totalBudget) * 100).toFixed(1)}% used</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingCosts)}</div>
          <div className="text-xs text-slate-400 mt-1">Awaiting approval</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Invoices</div>
          <div className="text-2xl font-bold text-blue-600">{invoices.length}</div>
          <div className="text-xs text-slate-400 mt-1">{invoices.filter(i => i.status === 'pending').length} pending</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Remaining</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalBudget - totalSpent)}</div>
          <div className="text-xs text-slate-400 mt-1">Available</div>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">Budget Utilization</h3>
          <span className="text-sm text-slate-500">{((totalSpent / totalBudget) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              (totalSpent / totalBudget) > 0.9 ? 'bg-red-500' : 
              (totalSpent / totalBudget) > 0.75 ? 'bg-amber-500' : 
              'bg-gradient-to-r from-green-500 to-green-400'
            }`}
            style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Spending by Cost Type</h3>
                <div className="space-y-3">
                  {['training', 'travel', 'materials', 'overtime', 'other'].map((type) => {
                    const amount = officerCosts.filter(c => c.costType === type).reduce((sum, c) => sum + c.costAmount, 0);
                    const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600 capitalize">{type}</span>
                          <span className="text-sm font-medium text-slate-800">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-4">Recent Cost Entries</h3>
                <div className="space-y-2">
                  {officerCosts.slice(0, 5).map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">{cost.trainingTitle}</div>
                        <div className="text-sm text-slate-500">{cost.userName} • {formatDate(cost.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-800">{formatCurrency(cost.costAmount)}</div>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(cost.paymentStatus)}`}>
                          {cost.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cost Entries Tab */}
          {activeTab === 'costs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search costs..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Training</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Officer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Type</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOfficerCosts.map((cost) => (
                      <tr key={cost.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{cost.trainingTitle}</div>
                          <div className="text-sm text-slate-500">{formatDate(cost.createdAt)}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{cost.userName}</td>
                        <td className="py-3 px-4 text-slate-600 capitalize">{cost.costType}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(cost.costAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={cost.paymentStatus}
                            onChange={(e) => handleQuickStatusChange(cost.id, e.target.value as OfficerTrainingCost['paymentStatus'])}
                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(cost.paymentStatus)} border-0 cursor-pointer`}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="paid">Paid</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditCost(cost)} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded">
                              <EditIcon size={16} />
                            </button>
                            <button onClick={() => handleDeleteCost(cost.id, cost.trainingTitle)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded">
                              <TrashIcon size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOfficerCosts.length === 0 && (
                  <div className="text-center py-12 text-slate-500">No cost entries found.</div>
                )}
              </div>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search invoices..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="processing">Processing</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <button
                  onClick={() => { setSelectedInvoice(null); setInvoiceModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
                >
                  <PlusIcon size={18} />
                  Add Invoice
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Invoice #</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Vendor</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">File</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-slate-500">{invoice.description || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{invoice.vendorName || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(invoice.invoiceDate)}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(invoice.amount)}</td>
                        <td className="py-3 px-4 text-center">
                          {invoice.fileUrl ? (
                            <a href={invoice.fileUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700">
                              <DocumentIcon size={18} className="mx-auto" />
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={invoice.status}
                            onChange={(e) => handleInvoiceStatusChange(invoice.id, e.target.value as InvoiceStatus)}
                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(invoice.status)} border-0 cursor-pointer`}
                          >
                            <option value="pending">Pending</option>
                            <option value="received">Received</option>
                            <option value="processing">Processing</option>
                            <option value="approved">Approved</option>
                            <option value="paid">Paid</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setSelectedInvoice(invoice); setInvoiceModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded">
                              <EditIcon size={16} />
                            </button>
                            <button onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded">
                              <TrashIcon size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12 text-slate-500">No invoices found.</div>
                )}
              </div>
            </div>
          )}

          {/* Vendors Tab */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vendors..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={() => { setSelectedVendor(null); setVendorModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
                >
                  <PlusIcon size={18} />
                  Add Vendor
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVendors.map((vendor) => (
                  <div key={vendor.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-800">{vendor.name}</h4>
                        <p className="text-sm text-slate-500">{vendor.contactName || 'No contact'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setSelectedVendor(vendor); setVendorModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded">
                          <EditIcon size={16} />
                        </button>
                        <button onClick={() => handleDeleteVendor(vendor.id, vendor.name)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded">
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {vendor.email && <p className="text-slate-600">{vendor.email}</p>}
                      {vendor.phone && <p className="text-slate-600">{vendor.phone}</p>}
                      <p className="text-slate-500">Terms: {vendor.paymentTerms}</p>
                    </div>
                  </div>
                ))}
              </div>
              {filteredVendors.length === 0 && (
                <div className="text-center py-12 text-slate-500">No vendors found.</div>
              )}
            </div>
          )}

          {/* Payment Batches Tab */}
          {activeTab === 'batches' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  {unbatchedInvoices.length} approved invoice(s) ready for batching
                </div>
                <button
                  onClick={() => setBatchModalOpen(true)}
                  disabled={unbatchedInvoices.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon size={18} />
                  Create Batch
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Batch #</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Invoices</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Total</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentBatches.map((batch) => (
                      <tr key={batch.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{batch.batchNumber}</div>
                          <div className="text-sm text-slate-500">{batch.createdByName}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(batch.batchDate)}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{batch.invoiceCount}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(batch.totalAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={batch.status}
                            onChange={(e) => handleBatchStatusChange(batch.id, e.target.value as PaymentBatchStatus)}
                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(batch.status)} border-0 cursor-pointer`}
                          >
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="processed">Processed</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleExport('PDF')}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Export Report"
                          >
                            <DownloadIcon size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paymentBatches.length === 0 && (
                  <div className="text-center py-12 text-slate-500">No payment batches created yet.</div>
                )}
              </div>
            </div>
          )}

          {/* Reports Tab - Using the new AccountingReportsTab component */}
          {activeTab === 'reports' && (
            <AccountingReportsTab
              officerCosts={officerCosts}
              invoices={invoices}
              paymentBatches={paymentBatches}
              allUsers={allUsers}
              totalBudget={totalBudget}
              fiscalYear={fiscalYear}
              onLogAccess={(action) => {
                if (user) {
                  accountingService.logAccess({
                    userId: user.id,
                    actionType: 'export',
                    description: action,
                  });
                }
              }}
            />
          )}
        </div>
      </div>


      {/* Modals */}
      <EditCostModal
        cost={selectedCost}
        isOpen={editCostModalOpen}
        onClose={() => { setEditCostModalOpen(false); setSelectedCost(null); }}
        onSave={handleSaveCost}
        allUsers={allUsers}
      />

      <AddCostModal
        isOpen={addCostModalOpen}
        onClose={() => setAddCostModalOpen(false)}
        onSave={handleAddCost}
        allUsers={allUsers}
      />

      <BudgetSettingsModal
        isOpen={budgetSettingsModalOpen}
        onClose={() => setBudgetSettingsModalOpen(false)}
        currentBudget={totalBudget}
        currentFiscalYear={fiscalYear}
        onSave={handleSaveBudgetSettings}
      />

      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => { setInvoiceModalOpen(false); setSelectedInvoice(null); }}
        invoice={selectedInvoice}
        vendors={vendors}
        costEntries={officerCosts}
        onSave={handleSaveInvoice}
        userId={user?.id || ''}
      />

      <VendorModal
        isOpen={vendorModalOpen}
        onClose={() => { setVendorModalOpen(false); setSelectedVendor(null); }}
        vendor={selectedVendor}
        onSave={handleSaveVendor}
      />

      <PaymentBatchModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        unbatchedInvoices={unbatchedInvoices}
        onCreateBatch={handleCreateBatch}
      />
    </div>
  );
};

export default Accounting;
