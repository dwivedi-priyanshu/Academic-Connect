
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { MiniProject, MoocCourse, SubmissionStatus } from '@/types';
import { CheckSquare, CheckCircle, XCircle, Clock, Download, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { fetchPendingSubmissionsAction, updateSubmissionStatusAction } from '@/actions/academic-submission-actions';


export default function ApprovalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingProjects, setPendingProjects] = useState<MiniProject[]>([]);
  const [pendingMoocs, setPendingMoocs] = useState<MoocCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [currentSubmission, setCurrentSubmission] = useState<{id: string, type: 'project' | 'mooc', title: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadPendingSubmissions = async () => {
    if (user && user.role === 'Faculty') {
      setIsLoading(true);
      try {
        const data = await fetchPendingSubmissionsAction(user.id);
        setPendingProjects(data.projects);
        setPendingMoocs(data.moocs);
      } catch (error) {
        console.error("Error fetching pending submissions:", error);
        toast({ title: "Error", description: "Could not load pending submissions.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user && user.role === 'Faculty') {
      loadPendingSubmissions();
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast]);

  const handleAction = (submissionId: string, type: 'project' | 'mooc', title: string) => {
    setCurrentSubmission({ id: submissionId, type, title });
    setRemarks("");
    setIsModalOpen(true);
  };

  const submitDecision = async (status: SubmissionStatus) => {
    if (!user || !currentSubmission) return;
    setIsSubmittingDecision(true);
    setIsModalOpen(false);

    try {
      const success = await updateSubmissionStatusAction(currentSubmission.id, currentSubmission.type, status, remarks, user.id);
      
      if (success) {
        toast({ title: "Submission Updated", description: `${currentSubmission.type === 'project' ? 'Project' : 'MOOC'} "${currentSubmission.title}" status updated to ${status}.`, className: "bg-success text-success-foreground" });
        await loadPendingSubmissions(); // Refresh list
      } else {
        toast({ title: "Update Failed", description: "Could not update submission status.", variant: "destructive" });
      }
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message || "Failed to update submission.", variant: "destructive" });
    } finally {
      setCurrentSubmission(null);
      setIsSubmittingDecision(false);
    }
  };

  const renderSubmissionCard = (item: MiniProject | MoocCourse, type: 'project' | 'mooc') => {
    const title = type === 'project' ? (item as MiniProject).title : (item as MoocCourse).courseName;
    const details = type === 'project' ? [
      `Subject: ${(item as MiniProject).subject}`,
      `Description: ${(item as MiniProject).description}`,
      `PPT: ${(item as MiniProject).pptUrl || 'N/A'}`, // Assuming file names are stored
      `Report: ${(item as MiniProject).reportUrl || 'N/A'}`,
    ] : [
      `Platform: ${(item as MoocCourse).platform}`,
      `Duration: ${format(new Date((item as MoocCourse).startDate), "PP")} - ${format(new Date((item as MoocCourse).endDate), "PP")}`,
      `Certificate: ${(item as MoocCourse).certificateUrl || 'N/A'}`, // Assuming file names are stored
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
            {/* Mock view/download buttons; in a real app, these would link to actual files */}
            {(item as any).pptUrl && <Button variant="outline" size="sm" onClick={() => alert(`Viewing PPT: ${(item as any).pptUrl}`)}><Eye className="mr-1 h-3 w-3"/> View PPT</Button>}
            {(item as any).reportUrl && <Button variant="outline" size="sm" onClick={() => alert(`Viewing Report: ${(item as any).reportUrl}`)}><Eye className="mr-1 h-3 w-3"/> View Report</Button>}
            {(item as any).certificateUrl && <Button variant="outline" size="sm" onClick={() => alert(`Viewing Certificate: ${(item as any).certificateUrl}`)}><Download className="mr-1 h-3 w-3"/> View Cert.</Button>}
            
            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleAction(item.id, type, title)} disabled={isSubmittingDecision}>
                <CheckCircle className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleAction(item.id, type, title)} disabled={isSubmittingDecision}>
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
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmittingDecision}>Cancel</Button>
            <Button variant="destructive" onClick={() => submitDecision('Rejected')} disabled={isSubmittingDecision}>
              <XCircle className="mr-2 h-4 w-4" /> {isSubmittingDecision ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => submitDecision('Approved')} disabled={isSubmittingDecision}>
              <CheckCircle className="mr-2 h-4 w-4" /> {isSubmittingDecision ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
