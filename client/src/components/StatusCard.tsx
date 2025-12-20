import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusCardProps {
  title: string;
  status?: "success" | "warning" | "error" | "pending" | "neutral";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export default function StatusCard({ 
  title, 
  status = "neutral", 
  icon, 
  children, 
  className,
  footer
}: StatusCardProps) {
  const statusColors = {
    success: "text-green-500 border-green-500/20 bg-green-500/5",
    warning: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    error: "text-red-500 border-red-500/20 bg-red-500/5",
    pending: "text-blue-500 border-blue-500/20 bg-blue-500/5",
    neutral: "text-muted-foreground border-border bg-card",
  };

  const statusIndicator = {
    success: "bg-green-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    pending: "bg-blue-500",
    neutral: "bg-muted-foreground",
  };

  return (
    <Card className={cn("overflow-hidden border transition-all hover:border-primary/50", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-mono uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className={cn("h-4 w-4", statusColors[status].split(" ")[0])}>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="mt-2">
          {children}
        </div>
        {footer && (
          <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground font-mono">
            {footer}
          </div>
        )}
      </CardContent>
      <div className={cn("h-1 w-full", statusIndicator[status])} />
    </Card>
  );
}
