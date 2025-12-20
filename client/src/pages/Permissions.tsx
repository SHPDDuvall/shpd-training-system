import DashboardLayout from "@/components/DashboardLayout";
import StatusCard from "@/components/StatusCard";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";

export default function Permissions() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Permission Audit</h2>
          <p className="text-muted-foreground mt-2">
            Analysis and fix verification for Supervisor access controls.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <StatusCard title="The Issue" status="error" icon={<ShieldAlert />}>
            <div className="space-y-4">
              <div className="p-4 rounded bg-red-500/10 border border-red-500/20 text-sm">
                <p className="font-bold text-red-500 mb-2">Problem Identified</p>
                <p className="text-muted-foreground">
                  Supervisors could not see requests from their own officers because the filter logic was missing a check for <code className="bg-background px-1 py-0.5 rounded text-foreground">supervisorId</code>.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground uppercase">Previous Logic (Approvals.tsx)</p>
                <pre className="p-4 rounded bg-card border border-border overflow-x-auto text-xs font-mono text-muted-foreground">
{`// OLD CODE
const filteredRequests = requests.filter(req => 
  req.status === 'submitted' || 
  req.status === 'supervisor_review'
);`}
                </pre>
              </div>
            </div>
          </StatusCard>

          <StatusCard title="The Fix" status="success" icon={<ShieldCheck />}>
            <div className="space-y-4">
              <div className="p-4 rounded bg-green-500/10 border border-green-500/20 text-sm">
                <p className="font-bold text-green-500 mb-2">Solution Applied</p>
                <p className="text-muted-foreground">
                  Added logic to explicitly check if the requesting officer's supervisor ID matches the current user's ID.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground uppercase">New Logic (Approvals.tsx)</p>
                <pre className="p-4 rounded bg-card border border-border overflow-x-auto text-xs font-mono text-green-500">
{`// NEW CODE (Commit ec8ee52)
const filteredRequests = requests.filter(req => 
  (req.status === 'submitted' || 
   req.status === 'supervisor_review') &&
  req.officer.supervisorId === currentUser.id
);`}
                </pre>
              </div>
            </div>
          </StatusCard>
        </div>

        <StatusCard title="Verification Steps" status="neutral">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded border border-border bg-card/50">
              <div className="mt-1">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-sm">1. Code Review</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Verified the logic change in <code className="text-xs bg-muted px-1 py-0.5 rounded">src/components/Approvals.tsx</code>. The condition now correctly links officers to their assigned supervisors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded border border-border bg-card/50">
              <div className="mt-1">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-sm">2. Deployment Verification</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Code pushed to GitHub main branch. Vercel deployment triggered via hook.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded border border-border bg-card/50">
              <div className="mt-1">
                <Badge variant="outline" className="text-blue-500 border-blue-500/20">Pending</Badge>
              </div>
              <div>
                <h4 className="font-bold text-sm">3. User Acceptance Testing</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Log in as a supervisor and verify visibility of officer requests.
                </p>
              </div>
            </div>
          </div>
        </StatusCard>
      </div>
    </DashboardLayout>
  );
}
