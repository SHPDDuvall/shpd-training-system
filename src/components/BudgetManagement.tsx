import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AccountingIcon, RefreshIcon, CheckIcon, EditIcon } from '@/components/icons/Icons';

interface BudgetCategory {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  fiscal_year: number;
}

const BudgetManagement: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ allocated: number; spent: number }>({ allocated: 0, spent: 0 });

  // Load budgets from database
  const loadBudgets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_budgets')
        .select('*')
        .eq('fiscal_year', new Date().getFullYear())
        .order('category');

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error loading budgets:', error);
      alert('Failed to load budgets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  // Start editing a budget
  const startEdit = (budget: BudgetCategory) => {
    setEditingId(budget.id);
    setEditValues({
      allocated: budget.allocated,
      spent: budget.spent,
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ allocated: 0, spent: 0 });
  };

  // Save budget changes
  const saveBudget = async (id: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('training_budgets')
        .update({
          allocated: editValues.allocated,
          spent: editValues.spent,
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setBudgets(budgets.map(b => 
        b.id === id 
          ? { ...b, allocated: editValues.allocated, spent: editValues.spent }
          : b
      ));

      setEditingId(null);
      alert('Budget updated successfully!');
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totals = budgets.reduce(
    (acc, budget) => ({
      allocated: acc.allocated + Number(budget.allocated),
      spent: acc.spent + Number(budget.spent),
    }),
    { allocated: 0, spent: 0 }
  );

  const totalRemaining = totals.allocated - totals.spent;
  const overallUtilization = totals.allocated > 0 ? (totals.spent / totals.allocated) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AccountingIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Budget Management</h2>
            <p className="text-sm text-gray-600">Manage training budget allocations for fiscal year {new Date().getFullYear()}</p>
          </div>
        </div>
        <button
          onClick={loadBudgets}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Allocated</div>
          <div className="text-2xl font-bold text-blue-900">${totals.allocated.toLocaleString()}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">Total Spent</div>
          <div className="text-2xl font-bold text-green-900">${totals.spent.toLocaleString()}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Remaining</div>
          <div className="text-2xl font-bold text-purple-900">${totalRemaining.toLocaleString()}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="text-sm text-orange-600 font-medium">Utilization</div>
          <div className="text-2xl font-bold text-orange-900">{overallUtilization.toFixed(1)}%</div>
        </div>
      </div>

      {/* Budget Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading budgets...
                  </td>
                </tr>
              ) : budgets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No budget data available
                  </td>
                </tr>
              ) : (
                budgets.map((budget) => {
                  const remaining = Number(budget.allocated) - Number(budget.spent);
                  const utilization = budget.allocated > 0 ? (Number(budget.spent) / Number(budget.allocated)) * 100 : 0;
                  const isEditing = editingId === budget.id;

                  return (
                    <tr key={budget.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{budget.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.allocated}
                            onChange={(e) => setEditValues({ ...editValues, allocated: Number(e.target.value) })}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            min="0"
                            step="100"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">${Number(budget.allocated).toLocaleString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.spent}
                            onChange={(e) => setEditValues({ ...editValues, spent: Number(e.target.value) })}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            min="0"
                            step="100"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">${Number(budget.spent).toLocaleString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${remaining.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className={`text-sm font-medium ${utilization > 90 ? 'text-red-600' : utilization > 75 ? 'text-orange-600' : 'text-green-600'}`}>
                            {utilization.toFixed(1)}%
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${utilization > 90 ? 'bg-red-600' : utilization > 75 ? 'bg-orange-600' : 'bg-green-600'}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => saveBudget(budget.id)}
                              disabled={saving}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-1"
                            >
                              <CheckIcon className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(budget)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1 mx-auto"
                          >
                            <EditIcon className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How to Use Budget Management</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Click <strong>Edit</strong> to modify the allocated and spent amounts for any category</li>
          <li>Enter the new values and click <strong>Save</strong> to update the budget</li>
          <li>The remaining amount and utilization percentage are calculated automatically</li>
          <li>Budget changes are reflected immediately in the Reports Dashboard</li>
          <li>All amounts are in US dollars and tracked for the current fiscal year</li>
        </ul>
      </div>
    </div>
  );
};

export default BudgetManagement;
