
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { MiniProject, MoocCourseWithStudentInfo, SubmissionStatus, MoocCoordinatorAssignment } from '@/types';
import { CheckSquare, CheckCircle, XCircle, Clock, Download, Eye, ShieldAlert, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { fetchPendingSubmissionsAction, updateSubmissionStatusAction } from '@/actions/academic-submission-actions';
import { fetchMoocCoordinatorAssignmentsForFaculty } from '@/actions/faculty-actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function ApprovalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingProjects, setPendingProjects] = useState<MiniProject[]>([]);
  const [pendingMoocs, setPendingMoocs] = useState<MoocCourseWithStudentInfo[]>([]);
  const [facultyMoocCoordinationSemesters, setFacultyMoocCoordinationSemesters] = useState<number[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [currentSubmission, setCurrentSubmission] = useState<{id: string, type: 'project' | 'mooc', title: string, studentSemester?: number, guideId?: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<SubmissionStatus | null>(null);


  const loadData = async () => {
    if (user && user.role === 'Faculty') {
      setIsLoading(true);
      try {
        const [pendingData, coordinationAssignments] = await Promise.all([
          fetchPendingSubmissionsAction(user.id),
          fetchMoocCoordinatorAssignmentsForFaculty(user.id)
        ]);
        setPendingProjects(pendingData.projects);
        setPendingMoocs(pendingData.moocs);
        setFacultyMoocCoordinationSemesters(coordinationAssignments.map(a => a.semester));
      } catch (error) {
        console.error("Error loading data for approvals page:", error);
        toast({ title: "Error", description: "Could not load pending submissions or coordinator assignments.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user && user.role === 'Faculty') {
      loadData();
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast]);

  const handleAction = (item: MiniProject | MoocCourseWithStudentInfo, type: 'project' | 'mooc', decStatus: SubmissionStatus) => {
    const title = type === 'project' ? (item as MiniProject).title : (item as MoocCourseWithStudentInfo).courseName;
    const studentSemester = type === 'mooc' ? (item as MoocCourseWithStudentInfo).studentSemester : undefined;
    const guideId = type === 'project' ? (item as MiniProject).guideId : undefined;

    setCurrentSubmission({ id: item.id, type, title, studentSemester, guideId });
    setActionType(decStatus); 
    setRemarks("");
    setIsModalOpen(true);
  };

  const submitDecision = async () => {
    if (!user || !currentSubmission || !actionType) return;
    setIsSubmittingDecision(true);
    
    try {
      await updateSubmissionStatusAction(currentSubmission.id, currentSubmission.type, actionType, remarks, user.id);
      toast({ title: "Submission Updated", description: `${currentSubmission.type === 'project' ? 'Project' : 'MOOC'} "${currentSubmission.title}" status updated to ${actionType}.`, className: "bg-success text-success-foreground" });
      await loadData(); // Refresh list
      setIsModalOpen(false); 
    } catch (error) {
        toast({ title: "Update Failed", description: (error as Error).message || "Could not update submission status.", variant: "destructive" });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const renderSubmissionCard = (item: MiniProject | MoocCourseWithStudentInfo, type: 'project' | 'mooc') => {
    const title = type === 'project' ? (item as MiniProject).title : (item as MoocCourseWithStudentInfo).courseName;
    const studentIdentifier = type === 'project' 
        ? `Student ID: ${(item as MiniProject).studentId}` 
        : `Student: ${(item as MoocCourseWithStudentInfo).studentName} (Sem ${(item as MoocCourseWithStudentInfo).studentSemester || 'N/A'})`;

    const details = type === 'project' ? [
      `Subject: ${(item as MiniProject).subject}`,
      `Description: ${(item as MiniProject).description}`,
      `PPT: ${(item as MiniProject).pptUrl || 'N/A'}`, 
      `Report: ${(item as MiniProject).reportUrl || 'N/A'}`,
      `Assigned Guide: ${(item as MiniProject).guideId ? `Faculty ID: ${(item as MiniProject).guideId}` : 'Not Assigned Yet'}`,
    ] : [
      `Platform: ${(item as MoocCourseWithStudentInfo).platform}`,
      `Duration: ${format(new Date((item as MoocCourseWithStudentInfo).startDate), "PP")} - ${format(new Date((item as MoocCourseWithStudentInfo).endDate), "PP")}`,
      `Certificate: ${(item as MoocCourseWithStudentInfo).certificateUrl || 'N/A'}`,
      `Credits: ${(item as MoocCourseWithStudentInfo).creditsEarned ?? 'N/A'}`, 
    ];

    let actionDisabled = false;
    let actionTooltipMessage = "";

    if (type === 'project' && user) {
        const projectItem = item as MiniProject;
        if (!projectItem.guideId) {
            actionDisabled = true;
            actionTooltipMessage = "Action disabled: No guide assigned to this project.";
        } else if (projectItem.guideId !== user.id) {
            actionDisabled = true;
            actionTooltipMessage = "Action restricted: You are not the assigned guide for this project.";
        }
    } else if (type === 'mooc' && user) {
        const moocItem = item as MoocCourseWithStudentInfo;
        if (!moocItem.studentSemester) {
             actionDisabled = true;
             actionTooltipMessage = "Action unavailable: Student's semester information is missing.";
        } else if (!facultyMoocCoordinationSemesters.includes(moocItem.studentSemester)) {
            actionDisabled = true;
            actionTooltipMessage = `Action restricted: You are not the MOOC coordinator for Semester ${moocItem.studentSemester}.`;
        }
    }


    const actionButtons = (
        <div className="flex justify-end gap-2">
            <Button 
                size="sm" 
                className="bg-success hover:bg-success/90 text-success-foreground" 
                onClick={() => handleAction(item, type, 'Approved')} 
                disabled={isSubmittingDecision || actionDisabled}
            >
                <CheckCircle className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => handleAction(item, type, 'Rejected')} 
                disabled={isSubmittingDecision || actionDisabled}
            >
                <XCircle className="mr-1 h-4 w-4" /> Reject
            </Button>
        </div>
    );

    return (
      <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="default" className="bg-warning text-warning-foreground"><Clock className="mr-1 h-3 w-3"/>Pending</Badge>
          </div>
          <CardDescription>{studentIdentifier} | Submitted: {format(new Date(item.submittedDate), "PPP")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {details.map((detail, i) => <p key={i}>{detail}</p>)}
           {actionDisabled && (
                <p className="text-xs text-destructive mt-2 flex items-center"><ShieldAlert className="inline mr-1 h-4 w-4"/> {actionTooltipMessage}</p>
            )}
        </CardContent>
        <CardFooter>
            {actionDisabled ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex justify-end gap-2 w-full">
                                <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" disabled={true}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button>
                                <Button variant="destructive" size="sm" disabled={true}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-destructive text-destructive-foreground max-w-xs">
                            <p><ShieldAlert className="inline mr-1 h-4 w-4"/>{actionTooltipMessage}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                actionButtons
            )}
             {type === 'mooc' && (item as MoocCourseWithStudentInfo).certificateUrl && 
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => alert(`Viewing Certificate: ${(item as MoocCourseWithStudentInfo).certificateUrl}`)}>
                    <Download className="mr-1 h-3 w-3"/> View Cert.
                </Button>
             }
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
              <CardDescription>Review projects. Action permitted only if you are the assigned guide.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <p>Loading project submissions...</p> : 
               pendingProjects.length > 0 ? pendingProjects.map(proj => renderSubmissionCard(proj, 'project')) : 
               <p className="text-muted-foreground p-4 border rounded-md flex items-center gap-2"><Info className="h-5 w-5"/>No pending project approvals, or you are not assigned as a guide to any pending projects.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="moocs">
          <Card className="shadow-none border-0">
            <CardHeader>
              <CardTitle>Pending MOOC Approvals</CardTitle>
              <CardDescription>Review MOOCs. Action permitted only if you are the MOOC Coordinator for the student's current semester.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <p>Loading MOOC submissions...</p> :
               pendingMoocs.length > 0 ? pendingMoocs.map(mooc => renderSubmissionCard(mooc, 'mooc')) : 
               <p className="text-muted-foreground p-4 border rounded-md flex items-center gap-2"><Info className="h-5 w-5"/>No pending MOOC approvals, or you are not assigned as coordinator for any relevant student semesters.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
          if (isSubmittingDecision && !isOpen) return; 
          setIsModalOpen(isOpen);
          if (!isOpen) { 
            setCurrentSubmission(null);
            setActionType(null);
            setRemarks("");
          }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType} for: {currentSubmission?.title}</DialogTitle>
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
                disabled={isSubmittingDecision}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmittingDecision}>Cancel</Button>
            <Button 
              onClick={submitDecision} 
              disabled={isSubmittingDecision || (actionType === 'Rejected' && !remarks.trim())} 
              className={actionType === 'Approved' ? "bg-success hover:bg-success/90 text-success-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
            >
              {actionType === 'Approved' ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
              {isSubmittingDecision ? 'Submitting...' : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

