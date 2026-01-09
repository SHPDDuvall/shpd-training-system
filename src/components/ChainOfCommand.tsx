import React from 'react';
import { TrainingRequest, User } from '@/types';
import { CheckCircle2, Circle, Clock, XCircle, ChevronRight } from 'lucide-react';

interface ChainOfCommandProps {
  request: TrainingRequest;
  allUsers: User[];
}

const ChainOfCommand: React.FC<ChainOfCommandProps> = ({ request, allUsers }) => {
  const getUserById = (id: string) => {
    return allUsers.find(u => u.id === id);
  };

  const getApprovalChain = (request: TrainingRequest) => {
    const requester = getUserById(request.userId);
    
    // Determine current step based on status and approval dates
    const isDenied = request.status === 'denied';
    const isApproved = request.status === 'approved' || request.status === 'scheduled' || request.status === 'completed';
    
    // Step 1: Request Submitted - always completed if request exists
    const step1Status = 'completed';
    
    // Helper to determine status for each approval step
    const getStepStatus = (currentStepDate?: string, prevStepDate?: string) => {
      if (isDenied && prevStepDate && !currentStepDate) return 'denied';
      if (currentStepDate) return 'completed';
      if (prevStepDate && !currentStepDate) return 'current';
      return 'pending';
    };

    // Special case for the first approval step
    const step2Status = getStepStatus(request.step1ApprovalDate, request.submittedDate);
    const step3Status = getStepStatus(request.step2ApprovalDate, request.step1ApprovalDate);
    const step4Status = getStepStatus(request.step3ApprovalDate, request.step2ApprovalDate);
    const step5Status = getStepStatus(request.step4ApprovalDate, request.step3ApprovalDate);
    const step6Status = getStepStatus(request.step5ApprovalDate, request.step4ApprovalDate);
    
    // Final scheduling step
    let schedulingStatus: 'pending' | 'current' | 'completed' | 'denied' = 'pending';
    if (request.scheduledDate) {
      schedulingStatus = 'completed';
    } else if (isApproved || request.step5ApprovalDate) {
      schedulingStatus = 'current';
    }

    const chain = [
      {
        step: 1,
        title: 'Request Submitted',
        person: requester,
        status: step1Status,
        date: request.submittedDate,
        description: `${requester?.firstName || 'Officer'} ${requester?.lastName || ''} submitted training request`,
      },
      {
        step: 2,
        title: request.step1Title || 'Step 1 Review',
        person: request.step1Id ? getUserById(request.step1Id) : null,
        status: step2Status,
        date: request.step1ApprovalDate,
        description: step2Status === 'completed' ? `Approved by ${request.step1Name}` : `Pending ${request.step1Title || 'Step 1'} review`,
      },
      {
        step: 3,
        title: request.step2Title || 'Step 2 Review',
        person: request.step2Id ? getUserById(request.step2Id) : null,
        status: step3Status,
        date: request.step2ApprovalDate,
        description: step3Status === 'completed' ? `Approved by ${request.step2Name}` : `Pending ${request.step2Title || 'Step 2'} review`,
      },
      {
        step: 4,
        title: request.step3Title || 'Step 3 Review',
        person: request.step3Id ? getUserById(request.step3Id) : null,
        status: step4Status,
        date: request.step3ApprovalDate,
        description: step4Status === 'completed' ? `Approved by ${request.step3Name}` : `Pending ${request.step3Title || 'Step 3'} review`,
      },
      {
        step: 5,
        title: request.step4Title || 'Step 4 Review',
        person: request.step4Id ? getUserById(request.step4Id) : null,
        status: step5Status,
        date: request.step4ApprovalDate,
        description: step5Status === 'completed' ? `Approved by ${request.step4Name}` : `Pending ${request.step4Title || 'Step 4'} review`,
      },
      {
        step: 6,
        title: request.step5Title || 'Step 5 Review',
        person: request.step5Id ? getUserById(request.step5Id) : null,
        status: step6Status,
        date: request.step5ApprovalDate,
        description: step6Status === 'completed' ? `Approved by ${request.step5Name}` : `Pending ${request.step5Title || 'Step 5'} review`,
      },
      {
        step: 7,
        title: 'Training Scheduled',
        person: null,
        status: schedulingStatus,
        date: request.scheduledDate,
        description: schedulingStatus === 'completed' ? 'Training has been scheduled' : 'Waiting to be scheduled',
      },
    ];

    // Filter out steps that are not assigned and are still pending
    // But always keep step 1 (submitted) and step 7 (scheduled)
    return chain.filter(item => 
      item.step === 1 || 
      item.step === 7 || 
      item.person !== null || 
      item.status !== 'pending'
    );
  };

  const chain = getApprovalChain(request);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'current':
        return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
      case 'denied':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Circle className="w-6 h-6 text-slate-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'current':
        return 'bg-blue-50 border-blue-200 ring-2 ring-blue-100';
      case 'denied':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Approval Chain of Command</h3>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-slate-600">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-slate-600">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            <span className="text-slate-600">Pending</span>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200 -z-10 ml-px"></div>

        <div className="space-y-8">
          {chain.map((item, index) => (
            <div key={index} className="relative flex gap-6">
              <div className="flex-shrink-0 bg-white rounded-full p-0.5">
                {getStatusIcon(item.status)}
              </div>
              
              <div className={`flex-grow p-4 rounded-xl border transition-all ${getStatusColor(item.status)}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step {index + 1}</span>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <h4 className="font-bold text-slate-800">{item.title}</h4>
                  </div>
                  {item.date && (
                    <span className="text-xs font-medium text-slate-500 bg-white/50 px-2 py-1 rounded-md border border-slate-200">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {item.person ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shadow-sm">
                        {item.person.firstName[0]}{item.person.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {item.person.firstName} {item.person.lastName}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">{item.person.rank || item.person.role}</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 italic text-sm">
                      <Circle className="w-4 h-4" />
                      <span>{item.description}</span>
                    </div>
                  )}
                </div>

                {item.person && (
                  <p className="mt-3 text-xs text-slate-600 bg-white/30 p-2 rounded-lg border border-slate-100 italic">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {request.denialReason && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl">
          <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Reason for Denial
          </h4>
          <p className="text-sm text-red-700 italic">"{request.denialReason}"</p>
        </div>
      )}
    </div>
  );
};

export default ChainOfCommand;
