import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService } from '@/lib/database';
import { TrainingOpportunity } from '@/types';
import {
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon,
  LocationIcon,
  UsersIcon,
  CheckIcon,
  AlertIcon,
  StarIcon,
} from '@/components/icons/Icons';

const trainingCategories = [
  'All',
  'Tactical',
  'Firearms',
  'Communication',
  'Mental Health',
  'Vehicle Operations',
  'Legal',
  'Specialized',
  'Medical',
  'Investigation',
  'Community',
  'Administrative',
  'Leadership',
];

const TrainingList: React.FC = () => {
  const { user, userRequests, addRequest } = useAuth();
  const [trainings, setTrainings] = useState<TrainingOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showMandatoryOnly, setShowMandatoryOnly] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingOpportunity | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    setIsLoading(true);
    try {
      const data = await trainingService.getAll();
      setTrainings(data);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTraining = trainings.filter((training) => {
    const matchesSearch = training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || training.category === selectedCategory;
    const matchesMandatory = !showMandatoryOnly || training.mandatory;
    return matchesSearch && matchesCategory && matchesMandatory;
  });

  const hasRequested = (trainingId: string) => {
    return userRequests.some(r => r.trainingId === trainingId && r.status !== 'denied');
  };

  const isFull = (training: TrainingOpportunity) => {
    return training.enrolled >= training.capacity;
  };

  const handleRequestTraining = async () => {
    if (!selectedTraining || !user) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequest = await addRequest(selectedTraining.id, requestNotes);
      
      if (newRequest) {
        setShowRequestModal(false);
        setSelectedTraining(null);
        setRequestNotes('');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        
        // Increment enrolled count locally
        setTrainings(prev => prev.map(t => 
          t.id === selectedTraining.id 
            ? { ...t, enrolled: t.enrolled + 1 }
            : t
        ));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Available Training</h1>
        <p className="text-slate-600 mt-1">Browse and request training opportunities</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search training courses..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <FilterIcon className="text-slate-400" size={20} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-white"
            >
              {trainingCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Mandatory Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMandatoryOnly}
              onChange={(e) => setShowMandatoryOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-slate-600">Mandatory only</span>
          </label>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Showing {filteredTraining.length} of {trainings.length} courses
        </p>
      </div>

      {/* Training Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTraining.map((training) => {
          const requested = hasRequested(training.id);
          const full = isFull(training);

          return (
            <div
              key={training.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img
                  src={training.image}
                  alt={training.title}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  {training.mandatory && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
                      Mandatory
                    </span>
                  )}
                  <span className="px-2 py-1 bg-slate-800/80 text-white text-xs font-medium rounded">
                    {training.category}
                  </span>
                </div>
                {full && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <span className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg">
                      Class Full
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="font-semibold text-slate-800 text-lg mb-2">{training.title}</h3>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">{training.description}</p>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-slate-400" />
                    <span>{formatDate(training.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon size={16} className="text-slate-400" />
                    <span>{training.time} ({training.duration})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LocationIcon size={16} className="text-slate-400" />
                    <span className="truncate">{training.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UsersIcon size={16} className="text-slate-400" />
                    <span>{training.enrolled}/{training.capacity} enrolled</span>
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          training.enrolled >= training.capacity ? 'bg-red-500' :
                          training.enrolled >= training.capacity * 0.8 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(training.enrolled / training.capacity) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    <StarIcon size={16} />
                    <span className="text-sm font-medium">{training.credits} Credits</span>
                  </div>

                  {requested ? (
                    <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg flex items-center gap-1">
                      <CheckIcon size={16} />
                      Requested
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedTraining(training);
                        setShowRequestModal(true);
                      }}
                      disabled={full}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Request Training
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTraining.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <SearchIcon className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-800">No training found</h3>
          <p className="text-slate-600 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedTraining && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Request Training</h2>
              <p className="text-slate-600 mt-1">Submit your request for approval</p>
            </div>

            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <img
                  src={selectedTraining.image}
                  alt={selectedTraining.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div>
                  <h3 className="font-semibold text-slate-800">{selectedTraining.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{formatDate(selectedTraining.date)}</p>
                  <p className="text-sm text-slate-600">{selectedTraining.time}</p>
                </div>
              </div>

              {selectedTraining.prerequisites.length > 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-800 flex items-center gap-2">
                    <AlertIcon size={18} />
                    Prerequisites
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {selectedTraining.prerequisites.map((prereq, idx) => (
                      <li key={idx} className="text-sm text-amber-700">• {prereq}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any relevant notes for your supervisor..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedTraining(null);
                  setRequestNotes('');
                }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestTraining}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <CheckIcon size={20} />
          <span className="font-medium">Training request submitted successfully!</span>
        </div>
      )}
    </div>
  );
};

export default TrainingList;
