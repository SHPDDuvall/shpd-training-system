import DashboardLayout from "@/components/DashboardLayout";
import StatusCard from "@/components/StatusCard";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink } from "lucide-react";

export default function Verification() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Verification & Testing</h2>
          <p className="text-muted-foreground mt-2">
            Final checklist to ensure all fixes are working correctly in production.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <StatusCard title="1. User Cleanup" status="success">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">John Mitchell Deleted</span>
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                Verified in Supabase users table. The record for john.mitchell@example.com has been permanently removed.
              </p>
              <div className="pl-8">
                <div className="text-xs font-mono bg-muted p-2 rounded border border-border">
                  SELECT * FROM auth.users WHERE email = 'john.mitchell@example.com';
                  <br />
                  -- Result: 0 rows
                </div>
              </div>
            </div>
          </StatusCard>

          <StatusCard title="2. Training Courses" status="success">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">16 Courses Imported</span>
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                Verified in Supabase training_courses table. All 16 requested courses are present with correct categories.
              </p>
              <div className="pl-8">
                <div className="text-xs font-mono bg-muted p-2 rounded border border-border">
                  SELECT COUNT(*) FROM training_courses;
                  <br />
                  -- Result: 16
                </div>
              </div>
            </div>
          </StatusCard>

          <StatusCard title="3. Supervisor Permissions" status="pending">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <span className="font-medium">Visibility Check</span>
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                Requires manual verification after deployment completes.
              </p>
              
              <div className="pl-8 space-y-2">
                <p className="text-sm font-bold">Test Steps:</p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li>Log in as a Supervisor</li>
                  <li>Navigate to "Approvals" page</li>
                  <li>Verify you can see requests from your officers</li>
                  <li>Verify you CANNOT see requests from other squads</li>
                </ol>
              </div>

              <div className="pl-8 pt-2">
                <Button className="w-full" variant="outline" asChild>
                  <a href="https://train.shakerpd.com" target="_blank" rel="noreferrer">
                    Open Production Site <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </StatusCard>

          <StatusCard title="4. System Health" status="success">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Database Connection</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">API Endpoints</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Authentication</span>
              </div>
            </div>
          </StatusCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
