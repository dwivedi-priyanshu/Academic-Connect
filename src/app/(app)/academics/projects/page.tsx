
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { MiniProject, SubmissionStatus } from '@/types';
import { FileText, UploadCloud, PlusCircle, Edit2, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FileUploadInput } from '@/components/core/FileUploadInput';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fetchStudentProjectsAction, saveStudentProjectAction, deleteStudentProjectAction } from '@/actions/academic-submission-actions';

const initialProjectState: Omit<MiniProject, '_id' | 'submittedDate' | 'status'> & {id?: string} = {
  studentId: '', title: '', description: '', pptUrl: undefined, reportUrl: undefined, subject: ''
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<MiniProject[]>([]);
  const [currentProject, setCurrentProject] = useState<Omit<MiniProject, '_id' | 'submittedDate' | 'status'> & {id?: string; status?: SubmissionStatus}>(initialProjectState);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);

  const availableSubjects = ["Artificial Intelligence", "Web Technologies", "Data Science", "Machine Learning", "Cyber Security", "Robotics"];

  useEffect(() => {
    if (user && user.role === 'Student') {
      setCurrentProject(prev => ({ ...prev, studentId: user.id }));
      setIsLoading(true);
      fetchStudentProjectsAction(user.id).then(data => {
        setProjects(data);
        setIsLoading(false);
      }).catch(err => {
        console.error("Error fetching projects:", err);
        toast({ title: "Error", description: "Could not load your project submissions.", variant: "destructive" });
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setCurrentProject(prev => ({ ...prev, subject: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    const projectToSave: Omit<MiniProject, '_id' | 'submittedDate' | 'status'> & {id?: string; status?: SubmissionStatus} = {
      ...currentProject,
      pptUrl: pptFile ? pptFile.name : currentProject.pptUrl,
      reportUrl: reportFile ? reportFile.name : currentProject.reportUrl,
    };
    
    // If new or pending, files should not be set. This logic is handled by form display.
    // Server action will handle setting status and submittedDate for new projects.

    try {
      const savedProject = await saveStudentProjectAction(projectToSave, user.id);
      
      if (currentProject.id === 'new' || !currentProject.id) {
        setProjects(prev => [...prev, savedProject]);
        toast({ title: "Project Proposal Submitted", description: `"${savedProject.title}" has been submitted for approval.`, className: "bg-success text-success-foreground" });
      } else {
        setProjects(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
        const message = currentProject.status === 'Approved' ? 'Files uploaded and project updated.' : 'Project details updated.';
        toast({ title: "Project Updated", description: `"${savedProject.title}": ${message}`, className: "bg-success text-success-foreground" });
      }

      setCurrentProject({ ...initialProjectState, studentId: user.id });
      setPptFile(null);
      setReportFile(null);
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error submitting project:", error);
      toast({ title: "Submission Error", description: (error as Error).message || "Could not submit project.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (project: MiniProject) => {
    setCurrentProject(project);
    setPptFile(null);
    setReportFile(null);
    setIsFormVisible(true);
  };

  const handleDelete = async (projectId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

    setIsLoading(true); // General loading for delete
    try {
      await deleteStudentProjectAction(projectId, user.id);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({ title: "Project Deleted", description: "The project has been successfully deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ title: "Deletion Error", description: (error as Error).message || "Could not delete project.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
    if (!isFormVisible && user) { 
      setCurrentProject({ ...initialProjectState, studentId: user.id, status: 'Pending' });
      setPptFile(null);
      setReportFile(null);
    }
  };

  const StatusBadge = ({ status }: { status: SubmissionStatus }) => {
    let IconComponent = Clock;
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    let className = "";

    if (status === 'Approved') {
      IconComponent = CheckCircle;
      variant = "default";
      className = "bg-success text-success-foreground hover:bg-success/90";
    } else if (status === 'Rejected') {
      IconComponent = XCircle;
      variant = "destructive";
    } else { 
      IconComponent = Clock;
      variant = "default";
      className = "bg-warning text-warning-foreground hover:bg-warning/90";
    }
    return (
      <Badge variant={variant} className={className}>
        <IconComponent className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getFormTitle = () => {
    if (currentProject.id === 'new' || !currentProject.id) return 'Submit New Project Proposal';
    if (currentProject.status === 'Approved') return 'Upload Project Files';
    return 'Edit Project Details';
  }

  const getFormDescription = () => {
     if (currentProject.id === 'new' || !currentProject.id) return 'Submit your project title, subject, and description for approval. File uploads will be enabled after approval.';
     if (currentProject.status === 'Approved') return 'Your project proposal has been approved. Please upload your PPT and Report files.';
     return 'Edit the details of your pending or rejected project submission.';
  }

  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Submitting...';
    if (currentProject.id === 'new' || !currentProject.id) return 'Submit Proposal';
    if (currentProject.status === 'Approved') return 'Upload Files & Save';
    return 'Update Details';
  };

  if (!user || user.role !== 'Student') {
    return <p>This page is for students to manage their projects.</p>;
  }

  const projectIsApproved = currentProject.status === 'Approved';
  const isNewProject = currentProject.id === 'new' || !currentProject.id;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><FileText className="mr-2 h-8 w-8 text-primary" /> My Mini-Projects</h1>
        <Button onClick={toggleFormVisibility} disabled={isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" /> {isFormVisible ? 'Close Form' : 'Add New Project'}
        </Button>
      </div>

      {isFormVisible && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{getFormTitle()}</CardTitle>
            <CardDescription>{getFormDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={currentProject.title}
                    onChange={handleInputChange}
                    required
                    className="bg-background"
                    disabled={projectIsApproved || isSubmitting}
                  />
                </div>
                 <div className="space-y-1">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    name="subject"
                    value={currentProject.subject}
                    onValueChange={handleSelectChange}
                    required
                    disabled={projectIsApproved || isSubmitting}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={currentProject.description}
                  onChange={handleInputChange}
                  required
                  className="bg-background"
                  disabled={projectIsApproved || isSubmitting}
                />
              </div>

              {projectIsApproved && !isNewProject && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4 border-dashed">
                  <FileUploadInput
                    id="pptFile"
                    label="Upload PPT (PDF)"
                    onFileChange={setPptFile}
                    accept=".pdf"
                    currentFile={currentProject.pptUrl}
                    disabled={isSubmitting}
                  />
                  <FileUploadInput
                    id="reportFile"
                    label="Upload Report (PDF)"
                    onFileChange={setReportFile}
                    accept=".pdf"
                    currentFile={currentProject.reportUrl}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <Button type="submit" disabled={isSubmitting || (projectIsApproved && !pptFile && !reportFile && !currentProject.pptUrl && !currentProject.reportUrl)} className="w-full md:w-auto">
                <UploadCloud className="mr-2 h-4 w-4" /> {getSubmitButtonText()}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Submitted Projects</CardTitle>
          <CardDescription>List of your mini-project submissions and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                {[...Array(2)].map((_, i) => ( <div key={i} className="p-4 border rounded-lg animate-pulse bg-muted/50"><div className="h-5 w-3/4 bg-muted rounded mb-2"></div><div className="h-4 w-1/2 bg-muted rounded"></div></div>))}
            </div>
          ) : projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map(proj => (
                <Card key={proj.id} className="bg-background hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">{proj.title}</CardTitle>
                    <StatusBadge status={proj.status} />
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1 pb-3">
                    <p><strong>Subject:</strong> {proj.subject}</p>
                    <p><strong>Description:</strong> {proj.description}</p>
                    <p><strong>Submitted:</strong> {format(new Date(proj.submittedDate), "PPP")}</p>
                    {proj.pptUrl && <p><strong>PPT:</strong> {proj.pptUrl}</p>}
                    {proj.reportUrl && <p><strong>Report:</strong> {proj.reportUrl}</p>}
                    {proj.status === 'Approved' && (!proj.pptUrl || !proj.reportUrl) &&
                      <p className="text-warning-foreground font-medium">Action Required: Please upload project files.</p>
                    }
                    {proj.remarks && proj.status === 'Rejected' && <p className="text-destructive"><strong>Remarks:</strong> {proj.remarks}</p>}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-0 pb-3 px-6">
                    {(proj.status === 'Pending' || proj.status === 'Rejected' || proj.status === 'Approved') && (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(proj)} disabled={isLoading || isSubmitting}>
                        <Edit2 className="mr-1 h-3 w-3" />
                        {proj.status === 'Approved' ? 'Upload Files' : 'Edit Details'}
                      </Button>
                    )}
                    {proj.status === 'Pending' && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(proj.id)} disabled={isLoading || isSubmitting}>
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No projects submitted yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

