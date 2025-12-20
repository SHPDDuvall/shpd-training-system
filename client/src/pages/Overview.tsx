import DashboardLayout from "@/components/DashboardLayout";
import StatusCard from "@/components/StatusCard";
import { 
  CheckCircle2, 
  Clock, 
  Database, 
  GitCommit, 
  Server, 
  Shield, 
  Users 
} from "lucide-react";

export default function Overview() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mission Control</h2>
          <p className="text-muted-foreground mt-2">
            System status overview for Shaker Heights Police Training System deployment.
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatusCard 
            title="System Status" 
            status="success"
            icon={<Server />}
          >
            <div className="text-2xl font-bold">Operational</div>
            <p className="text-xs text-muted-foreground mt-1">All systems nominal</p>
          </StatusCard>
          
          <StatusCard 
            title="Database Users" 
            status="success"
            icon={<Users />}
          >
            <div className="text-2xl font-bold">73</div>
            <p className="text-xs text-muted-foreground mt-1">-1 (John Mitchell deleted)</p>
          </StatusCard>
          
          <StatusCard 
            title="Training Courses" 
            status="success"
            icon={<Database />}
          >
            <div className="text-2xl font-bold">16</div>
            <p className="text-xs text-muted-foreground mt-1">Courses imported successfully</p>
          </StatusCard>
          
          <StatusCard 
            title="Latest Deploy" 
            status="pending"
            icon={<GitCommit />}
          >
            <div className="text-2xl font-bold font-mono">ec8ee52</div>
            <p className="text-xs text-muted-foreground mt-1">Supervisor permission fix</p>
          </StatusCard>
        </div>

        {/* Recent Activity & Status */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <StatusCard title="Deployment Timeline" className="h-full">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                
                {/* Item 1 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-sm">Vercel Deployment</div>
                      <time className="font-mono text-xs text-muted-foreground">Pending</time>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Triggered via deploy hook. Job ID: 4zllZ9zKXrxDfcOJ9ZzU
                    </div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-sm">Courses Imported</div>
                      <time className="font-mono text-xs text-muted-foreground">Done</time>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      16 training courses imported into Supabase database.
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-sm">Permissions Fixed</div>
                      <time className="font-mono text-xs text-muted-foreground">Done</time>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Supervisor visibility logic updated in Approvals.tsx.
                    </div>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-sm">User Cleanup</div>
                      <time className="font-mono text-xs text-muted-foreground">Done</time>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Deleted John Mitchell from users table.
                    </div>
                  </div>
                </div>

              </div>
            </StatusCard>
          </div>

          <div className="col-span-3 space-y-4">
            <StatusCard title="System Health" status="success">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database Connection</span>
                  <span className="text-xs font-mono text-green-500">CONNECTED</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-full" />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Latency</span>
                  <span className="text-xs font-mono text-green-500">45ms</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[95%]" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Deployment Status</span>
                  <span className="text-xs font-mono text-blue-500">BUILDING</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[60%] animate-pulse" />
                </div>
              </div>
            </StatusCard>

            <StatusCard title="Quick Actions" status="neutral">
              <div className="grid grid-cols-2 gap-2">
                <button className="p-2 text-xs border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                  View Logs
                </button>
                <button className="p-2 text-xs border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                  Check DB
                </button>
                <button className="p-2 text-xs border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                  Verify API
                </button>
                <button className="p-2 text-xs border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                  Redeploy
                </button>
              </div>
            </StatusCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
