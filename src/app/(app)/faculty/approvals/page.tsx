'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { MiniProject, MoocCourse, SubmissionStatus } from '@/types';
import { CheckSquare, CheckCircle, XCircle, Clock, Download, Eye, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

// Mock data - In a real app, this would be fetched for the logged-in faculty
let MOCK_PROJECT_APPROVALS: MiniProject[] = [
  { id: 'proj2', studentId: 'student123', subject: 'Web Technologies', title: 'E-commerce Website', description: 'A full-stack e-commerce platform.', pptUrl: 'ecommerce_ppt.pdf', reportUrl: 'ecommerce_report.pdf', submittedDate: new Date(2024, 2, 1).toISOString(), status: 'Pending' },
  { id: 'proj3', studentId: 'student002', subject: 'Robotics', title: 'Automated Robotic Arm', description: 'A 6-axis robotic arm for pick and place.', pptUrl: 'robot_ppt.pdf', reportUrl: 'robot_report.pdf', submittedDate: new Date(2024, 2, 5).toISOString(), status: 'Pending' },
];

let MOCK_MOOC_APPROVALS: MoocCourse[] = [
  { id: 'mooc2', studentId: 'student123', courseName: 'Introduction to Machine Learning', platform: 'Udacity', startDate: new Date(2024,0,15).toISOString(), endDate: new Date(2024,3,15).toISOString(), certificateUrl: 'ml_cert.pdf', creditsEarned: 4, submittedDate: new Date(2024,3,16).toISOString(), status: 'Pending' },
  { id: 'mooc3', studentId: 'student002', courseName: 'Data Science with Python', platform: 'DataCamp', startDate: new Date(2024,1,1).toISOString(), endDate: new Date(2024,4,1).toISOString(), certificateUrl: 'ds_cert.pdf', creditsEarned: 3, submittedDate: new Date(2024,4,2).toISOString(), status: 'Pending' },
];

// Mock API functions
const fetchPendingSubmissions = async (facultyId: string): Promise<{ projects: MiniProject[], moocs: MoocCourse[] }> => {
  console.log(`Fetching pending submissions for faculty ${facultyId}`);
  await new Promise(resolve => setTimeout(resolve, 700));
  // In a real app, filter by faculty's students or department
  return { 
    projects: MOCK_PROJECT_APPROVALS.filter(p => p.status === 'Pending'), 
    moocs: MOCK_MOOC_APPROVALS.filter(m => m.status === 'Pending') 
  };
};

const updateSubmissionStatus = async (submissionId: string, type: 'project' | 'mooc', status: SubmissionStatus, remarks: string, facultyId: string): Promise<boolean> => {
  console.log(`Updating ${type} ${submissionId} to ${status} with remarks: "${remarks}" by faculty ${facultyId}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (type === 'project') {
    MOCK_PROJECT_APPROVALS = MOCK_PROJECT_APPROVALS.map(p => 
      p.id === submissionId ? { ...p, status, remarks, facultyId } : p
    );
  } else {
    MOCK_MOOC_APPROVALS = MOCK_MOOC_APPROVALS.map(m =>
      m.id === submissionId ? { ...m, status, remarks, facultyId } : m
    );
  }
  // Also update student's local storage if applicable
  // For this demo, we're just updating the mock approval list.
  // A real app would update the central database.
  localStorage.setItem(`faculty-project-approvals`, JSON.stringify(MOCK_PROJECT_APPROVALS));
  localStorage.setItem(`faculty-mooc-approvals`, JSON.stringify(MOCK_MOOC_APPROVALS));

  // This part would update the student's actual item. This is a bit tricky to mock without a shared state/backend.
  // For now, this indicates a successful update for faculty view. Student view might not reflect immediately in this mock.
  return true;
};


export default function ApprovalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingProjects, setPendingProjects] = useState<MiniProject[]>([]);
  const [pendingMoocs, setPendingMoocs] = useState<MoocCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [currentSubmission, setCurrentSubmission] = useState<{id: string, type: 'project' | 'mooc', title: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user && user.role === 'Faculty') {
      fetchPendingSubmissions(user.id).then(data => {
        setPendingProjects(data.projects);
        setPendingMoocs(data.moocs);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleAction = (submissionId: string, type: 'project' | 'mooc', title: string) => {
    setCurrentSubmission({ id: submissionId, type, title });
    setRemarks(""); // Reset remarks for new modal
    setIsModalOpen(true);
  };

  const submitDecision = async (status: SubmissionStatus) => {
    if (!user || !currentSubmission) return;
    setIsLoading(true);
    setIsModalOpen(false);

    const success = await updateSubmissionStatus(currentSubmission.id, currentSubmission.type, status, remarks, user.id);
    
    if (success) {
      toast({ title: "Submission Updated", description: `${currentSubmission.type === 'project' ? 'Project' : 'MOOC'} "${currentSubmission.title}" status updated to ${status}.`, className: "bg-success text-success-foreground" });
      // Refresh list
      fetchPendingSubmissions(user.id).then(data => {
        setPendingProjects(data.projects);
        setPendingMoocs(data.moocs);
      });
    } else {
      toast({ title: "Update Failed", description: "Could not update submission status.", variant: "destructive" });
    }
    setCurrentSubmission(null);
    setIsLoading(false);
  };

  const renderSubmissionCard = (item: MiniProject | MoocCourse, type: 'project' | 'mooc') => {
    const title = type === 'project' ? (item as MiniProject).title : (item as MoocCourse).courseName;
    const details = type === 'project' ? [
      `Subject: ${(item as MiniProject).subject}`,
      `Description: ${(item as MiniProject).description}`,
      `PPT: ${(item as MiniProject).pptUrl || 'N/A'}`,
      `Report: ${(item as MiniProject).reportUrl || 'N/A'}`,
    ] : [
      `Platform: ${(item as MoocCourse).platform}`,
      `Duration: ${format(new Date((item as MoocCourse).startDate), "PP")} - ${format(new Date((item as MoocCourse).endDate), "PP")}`,
      `Certificate: ${(item as MoocCourse).certificateUrl || 'N/A'}`,
      `Credits: ${(item as MoocCourse).creditsEarned || 'N/A'}`,
    ];

    return (
      <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="default" className="bg-warning text-warning-foreground"><Clock className="mr-1 h-3 w-3"/>Pending</Badge>
          </div>
          <CardDescription>Student ID: {item.studentId} | Submitted: {format(new Date(item.submittedDate), "PPP")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {details.map((detail, i) => <p key={i}>{detail}</p>)}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            {/* Mock download/view buttons */}
            {(item as any).pptUrl && <Button variant="outline" size="sm" onClick={() => alert(`Viewing ${(item as any).pptUrl}`)}><Eye className="mr-1 h-3 w-3"/> View PPT</Button>}
            {(item as any).reportUrl && <Button variant="outline" size="sm" onClick={() => alert(`Viewing ${(item as any).reportUrl}`)}><Eye className="mr-1 h-3 w-3"/> View Report</Button>}
            {(item as any).certificateUrl && <Button variant="outline" size="sm" onClick={() => alert(`Viewing ${(item as any).certificateUrl}`)}><Download className="mr-1 h-3 w-3"/> View Cert.</Button>}
            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleAction(item.id, type, title)}>
                <CheckCircle className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleAction(item.id, type, title)}>
                <XCircle className="mr-1 h-4 w-4" /> Reject
            </Button>
        </CardFooter>
      </Card>
    );
  };

  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><CheckSquare className="mr-2 h-8 w-8 text-primary" /> Submission Approvals</h1>
      
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2">
          <TabsTrigger value="projects">Mini-Projects ({pendingProjects.length})</TabsTrigger>
          <TabsTrigger value="moocs">MOOCs ({pendingMoocs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="projects">
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>Pending Mini-Project Approvals</CardTitle>
              <CardDescription>Review and approve or reject student mini-project submissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <p>Loading project submissions...</p> : 
               pendingProjects.length > 0 ? pendingProjects.map(proj => renderSubmissionCard(proj, 'project')) : <p className="text-muted-foreground">No pending project approvals.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="moocs">
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>Pending MOOC Approvals</CardTitle>
              <CardDescription>Review and approve or reject student MOOC submissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <p>Loading MOOC submissions...</p> :
               pendingMoocs.length > 0 ? pendingMoocs.map(mooc => renderSubmissionCard(mooc, 'mooc')) : <p className="text-muted-foreground">No pending MOOC approvals.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Action for: {currentSubmission?.title}</DialogTitle>
            <DialogDescription>
              Provide remarks for your decision (optional for approval, recommended for rejection).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="remarks" className="text-right col-span-1">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="col-span-3 bg-background"
                placeholder="e.g., Project meets all requirements / Needs more detailed report."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => submitDecision('Rejected')} disabled={isLoading}>
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => submitDecision('Approved')} disabled={isLoading}>
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
