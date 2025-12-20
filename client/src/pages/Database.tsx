import DashboardLayout from "@/components/DashboardLayout";
import StatusCard from "@/components/StatusCard";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Database() {
  const courses = [
    { id: "1", title: "Use of Force Training", category: "Operational", status: "Active" },
    { id: "2", title: "Crisis Intervention Team (CIT)", category: "Specialized", status: "Active" },
    { id: "3", title: "Implicit Bias Training", category: "Mandatory", status: "Active" },
    { id: "4", title: "Active Shooter Response", category: "Tactical", status: "Active" },
    { id: "5", title: "Community Policing Strategies", category: "Community", status: "Active" },
    { id: "6", title: "Report Writing Excellence", category: "Administrative", status: "Active" },
    { id: "7", title: "Traffic Stop Procedures", category: "Operational", status: "Active" },
    { id: "8", title: "Evidence Collection", category: "Investigative", status: "Active" },
    { id: "9", title: "Interview Techniques", category: "Investigative", status: "Active" },
    { id: "10", title: "Firearms Qualification", category: "Tactical", status: "Active" },
    { id: "11", title: "Defensive Tactics Refresher", category: "Tactical", status: "Active" },
    { id: "12", title: "Emergency Vehicle Operations", category: "Operational", status: "Active" },
    { id: "13", title: "Domestic Violence Response", category: "Specialized", status: "Active" },
    { id: "14", title: "Drug Recognition Expert", category: "Specialized", status: "Active" },
    { id: "15", title: "Leadership Development", category: "Professional", status: "Active" },
    { id: "16", title: "Ethics and Standards", category: "Mandatory", status: "Active" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Database Status</h2>
            <p className="text-muted-foreground mt-2">
              Live view of training_courses table and user records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Synced
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard title="Total Records" status="neutral">
            <div className="text-3xl font-bold">16</div>
            <p className="text-xs text-muted-foreground">Training Courses</p>
          </StatusCard>
          <StatusCard title="Last Update" status="neutral">
            <div className="text-3xl font-bold font-mono">Just now</div>
            <p className="text-xs text-muted-foreground">Via CSV Import</p>
          </StatusCard>
          <StatusCard title="Table Status" status="success">
            <div className="text-3xl font-bold text-green-500">Healthy</div>
            <p className="text-xs text-muted-foreground">Schema Validated</p>
          </StatusCard>
        </div>

        <StatusCard title="Training Courses Table" className="p-0">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search courses..." 
                className="pl-9 bg-background/50"
              />
            </div>
          </div>
          <div className="rounded-md border border-border m-4 mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {course.id.padStart(4, '0')}
                    </TableCell>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {course.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                        {course.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </StatusCard>
      </div>
    </DashboardLayout>
  );
}
