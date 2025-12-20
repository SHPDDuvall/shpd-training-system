import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusIcon, TrashIcon, CheckIcon, XIcon, SettingsIcon } from './icons/Icons';

interface ApprovalRanksSettingsProps {
  onClose: () => void;
  onSave: (ranks: string[]) => void;
}

const DEFAULT_RANKS = ['Sergeant', 'Lieutenant', 'Commander', 'Chief'];

const ApprovalRanksSettings: React.FC<ApprovalRanksSettingsProps> = ({ onClose, onSave }) => {
  const [ranks, setRanks] = useState<string[]>(DEFAULT_RANKS);
  const [newRank, setNewRank] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRanks();
  }, []);

  const loadRanks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'approval_ranks')
        .single();

      if (data && data.setting_value) {
        setRanks(JSON.parse(data.setting_value));
      }
    } catch (err) {
      console.error('Error loading ranks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRank = () => {
    if (newRank.trim() && !ranks.includes(newRank.trim())) {
      setRanks([...ranks, newRank.trim()]);
      setNewRank('');
    }
  };

  const handleRemoveRank = (rank: string) => {
    if (ranks.length > 1) {
      setRanks(ranks.filter(r => r !== rank));
    } else {
      alert('You must have at least one rank in the approval chain.');
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newRanks = [...ranks];
      [newRanks[index - 1], newRanks[index]] = [newRanks[index], newRanks[index - 1]];
      setRanks(newRanks);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < ranks.length - 1) {
      const newRanks = [...ranks];
      [newRanks[index], newRanks[index + 1]] = [newRanks[index + 1], newRanks[index]];
      setRanks(newRanks);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'approval_ranks',
          setting_value: JSON.stringify(ranks),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      onSave(ranks);
      onClose();
    } catch (err) {
      console.error('Error saving ranks:', err);
      alert('Failed to save approval ranks. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default ranks (Sergeant, Lieutenant, Commander, Chief)?')) {
      setRanks(DEFAULT_RANKS);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <SettingsIcon className="text-purple-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Approval Ranks Settings</h2>
                <p className="text-sm text-slate-600 mt-1">Customize available ranks for approval chains</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <XIcon size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Current Ranks */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Current Approval Ranks</h3>
            <div className="space-y-2">
              {ranks.map((rank, index) => (
                <div
                  key={rank}
                  className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="flex-1 font-medium text-slate-800">{rank}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === ranks.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleRemoveRank(rank)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Remove rank"
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Rank */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Rank</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRank}
                onChange={(e) => setNewRank(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRank()}
                placeholder="Enter rank name (e.g., Captain, Deputy Chief)"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                onClick={handleAddRank}
                disabled={!newRank.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PlusIcon size={18} />
                Add
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> These ranks will be available as options when creating custom training requests. 
              Requestors will select which ranks need to approve their request using checkboxes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || ranks.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckIcon size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalRanksSettings;
