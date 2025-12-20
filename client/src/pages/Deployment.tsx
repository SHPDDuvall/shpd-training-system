import DashboardLayout from "@/components/DashboardLayout";
import StatusCard from "@/components/StatusCard";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  GitCommit, 
  Globe, 
  Terminal 
} from "lucide-react";

export default function Deployment() {
  const logs = [
    { time: "22:45:12", type: "info", msg: "Deployment triggered via webhook" },
    { time: "22:45:13", type: "info", msg: "Fetching source from GitHub (branch: main)" },
    { time: "22:45:15", type: "info", msg: "Building frontend assets..." },
    { time: "22:45:45", type: "success", msg: "Build completed successfully" },
    { time: "22:45:46", type: "info", msg: "Deploying to Edge Network..." },
    { time: "22:46:01", type: "success", msg: "Deployment complete: https://train.shakerpd.com" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Deployment Status</h2>
            <p className="text-muted-foreground mt-2">
              Live deployment pipeline and environment status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500 hover:bg-blue-600">
              <div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
              Building
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <StatusCard title="Environment" status="neutral">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-muted">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">Production</div>
                <div className="text-xs text-muted-foreground">train.shakerpd.com</div>
              </div>
            </div>
          </StatusCard>

          <StatusCard title="Source" status="neutral">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-muted">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">main</div>
                <div className="text-xs text-muted-foreground">SHPDDuvall/training-system-shaker</div>
              </div>
            </div>
          </StatusCard>

          <StatusCard title="Latest Commit" status="success">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-green-500/10 text-green-500">
                <GitCommit className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold font-mono">ec8ee52</div>
                <div className="text-xs text-muted-foreground">Fix supervisor permissions</div>
              </div>
            </div>
          </StatusCard>
        </div>

        <StatusCard title="Deployment Logs" className="font-mono text-sm" icon={<Terminal />}>
          <div className="bg-black/50 rounded-md p-4 space-y-2 h-64 overflow-y-auto border border-border">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-muted-foreground select-none">{log.time}</span>
                <span className={
                  log.type === 'success' ? 'text-green-500' : 
                  log.type === 'error' ? 'text-red-500' : 
                  'text-blue-400'
                }>
                  [{log.type.toUpperCase()}]
                </span>
                <span className="text-foreground/90">{log.msg}</span>
              </div>
            ))}
            <div className="flex gap-3 animate-pulse">
              <span className="text-muted-foreground">22:46:05</span>
              <span className="text-blue-400">[INFO]</span>
              <span className="text-foreground/90">Verifying health checks...</span>
            </div>
          </div>
        </StatusCard>
      </div>
    </DashboardLayout>
  );
}
