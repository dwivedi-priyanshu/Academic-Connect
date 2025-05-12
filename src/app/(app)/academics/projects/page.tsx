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

// Mock data for projects
const MOCK_PROJECTS: MiniProject[] = [
  { id: 'proj1', studentId: 'student123', title: 'AI Chatbot for FAQ', description: 'A chatbot to answer frequently asked questions using NLP.', pptUrl: 'chatbot_ppt.pdf', reportUrl: 'chatbot_report.pdf', submittedDate: new Date(2023, 10, 15).toISOString(), status: 'Approved', subject: 'Artificial Intelligence' },
  { id: 'proj2', studentId: 'student123', title: 'E-commerce Website', description: 'A full-stack e-commerce platform with payment gateway integration.', pptUrl: undefined, reportUrl: undefined, submittedDate: new Date(2024, 2, 1).toISOString(), status: 'Pending', subject: 'Web Technologies' },
  // Add another approved project for testing file uploads
  { id: 'proj4', studentId: 'student123', title: 'Data Visualization Dashboard', description: 'Dashboard for visualizing sales data.', pptUrl: undefined, reportUrl: undefined, submittedDate: new Date(2024, 4, 1).toISOString(), status: 'Approved', subject: 'Data Science' },

];

// Mock API functions
const fetchStudentProjects = async (studentId: string): Promise<MiniProject[]> => {
  console.log(`Fetching projects for student ${studentId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const stored = localStorage.getItem(`projects-${studentId}`);
  // Ensure mock data gets into local storage if it's empty
   if (!stored) {
      const initialData = MOCK_PROJECTS.filter(p => p.studentId === studentId);
      localStorage.setItem(`projects-${studentId}`, JSON.stringify(initialData));
      return initialData;
   }
  return JSON.parse(stored);
};

const saveStudentProject = async (project: MiniProject, studentId: string): Promise<MiniProject> => {
  console.log('Saving project:', project);
  await new Promise(resolve => setTimeout(resolve, 1000));
  const projects = await fetchStudentProjects(studentId);
  let updatedProjects;
  if (project.id && project.id !== 'new') {
    updatedProjects = projects.map(p => p.id === project.id ? project : p);
  } else {
    const newProject = { ...project, id: `proj${Date.now()}`, studentId, submittedDate: new Date().toISOString(), status: 'Pending' as SubmissionStatus };
    updatedProjects = [...projects, newProject];
    project = newProject; // Return the newly created project with ID
  }
  localStorage.setItem(`projects-${studentId}`, JSON.stringify(updatedProjects));
  return project;
};

const deleteStudentProject = async (projectId: string, studentId: string): Promise<boolean> => {
  console.log(`Deleting project ${projectId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const projects = await fetchStudentProjects(studentId);
  const updatedProjects = projects.filter(p => p.id !== projectId);
  localStorage.setItem(`projects-${studentId}`, JSON.stringify(updatedProjects));
  return true;
};


const initialProjectState: MiniProject = {
  id: 'new', studentId: '', title: '', description: '', pptUrl: undefined, reportUrl: undefined, submittedDate: '', status: 'Pending', subject: ''
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<MiniProject[]>([]);
  const [currentProject, setCurrentProject] = useState<MiniProject>(initialProjectState);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);

  // Available subjects (could come from backend)
  const availableSubjects = ["Artificial Intelligence", "Web Technologies", "Data Science", "Machine Learning", "Cyber Security", "Robotics"];


  useEffect(() => {
    if (user && user.role === 'Student') {
      initialProjectState.studentId = user.id; // Set studentId for new projects
      setCurrentProject(initialProjectState);
      fetchStudentProjects(user.id).then(data => {
        setProjects(data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setCurrentProject(prev => ({ ...prev, subject: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    // Only include file URLs if files were actually uploaded in this submission/edit (i.e., project is Approved)
    const projectToSave = {
      ...currentProject,
      // Only set/update file names if the project is approved AND a new file was selected
      pptUrl: currentProject.status === 'Approved' && pptFile ? pptFile.name : currentProject.pptUrl,
      reportUrl: currentProject.status === 'Approved' && reportFile ? reportFile.name : currentProject.reportUrl,
    };

    // Prevent file uploads for new/pending projects
    if (projectToSave.id === 'new' || projectToSave.status === 'Pending') {
        projectToSave.pptUrl = undefined;
        projectToSave.reportUrl = undefined;
    }

    const savedProject = await saveStudentProject(projectToSave, user.id);

    if (currentProject.id === 'new') {
      setProjects(prev => [...prev, savedProject]);
      toast({ title: "Project Proposal Submitted", description: `"${savedProject.title}" has been submitted for approval.`, className: "bg-success text-success-foreground" });
    } else {
      setProjects(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
      const message = currentProject.status === 'Approved' ? 'Files uploaded and project updated.' : 'Project details updated.';
      toast({ title: "Project Updated", description: `"${savedProject.title}": ${message}`, className: "bg-success text-success-foreground" });
    }

    setCurrentProject(initialProjectState); // Reset form
    setPptFile(null);
    setReportFile(null);
    setIsFormVisible(false);
    setIsLoading(false);
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

    setIsLoading(true);
    await deleteStudentProject(projectId, user.id);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    toast({ title: "Project Deleted", description: "The project has been successfully deleted.", variant: "destructive" });
    setIsLoading(false);
  };

  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
    if (!isFormVisible) { // Opening form for new project
      setCurrentProject(initialProjectState);
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
    } else { // Pending
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
    if (currentProject.id === 'new') return 'Submit New Project Proposal';
    if (currentProject.status === 'Approved') return 'Upload Project Files';
    return 'Edit Project Details';
  }

  const getFormDescription = () => {
     if (currentProject.id === 'new') return 'Submit your project title, subject, and description for approval. File uploads will be enabled after approval.';
     if (currentProject.status === 'Approved') return 'Your project proposal has been approved. Please upload your PPT and Report files.';
     return 'Edit the details of your pending or rejected project submission.';
  }

  const getSubmitButtonText = () => {
    if (isLoading) return 'Submitting...';
    if (currentProject.id === 'new') return 'Submit Proposal';
    if (currentProject.status === 'Approved') return 'Upload Files & Save';
    return 'Update Details';
  };

  if (!user || user.role !== 'Student') {
    return <p>This page is for students to manage their projects.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><FileText className="mr-2 h-8 w-8 text-primary" /> My Mini-Projects</h1>
        <Button onClick={toggleFormVisibility}>
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
                    disabled={currentProject.status === 'Approved'} // Cannot edit title after approval
                  />
                </div>
                 <div className="space-y-1">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    name="subject"
                    value={currentProject.subject}
                    onValueChange={handleSelectChange}
                    required
                    disabled={currentProject.status === 'Approved'} // Cannot edit subject after approval
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
                  disabled={currentProject.status === 'Approved'} // Cannot edit description after approval
                />
              </div>

              {/* Conditionally show file uploads only when editing an approved project */}
              {currentProject.id !== 'new' && currentProject.status === 'Approved' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4 border-dashed">
                  <FileUploadInput
                    id="pptFile"
                    label="Upload PPT (PDF)"
                    onFileChange={setPptFile}
                    accept=".pdf"
                    currentFile={currentProject.pptUrl}
                  />
                  <FileUploadInput
                    id="reportFile"
                    label="Upload Report (PDF)"
                    onFileChange={setReportFile}
                    accept=".pdf"
                    currentFile={currentProject.reportUrl}
                  />
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
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
          {isLoading && projects.length === 0 ? (
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
                    {/* Edit button logic:
                        - If Pending/Rejected: Edit Details
                        - If Approved: Upload Files
                    */}
                    {(proj.status === 'Pending' || proj.status === 'Rejected' || proj.status === 'Approved') && (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(proj)} disabled={isLoading}>
                        <Edit2 className="mr-1 h-3 w-3" />
                        {proj.status === 'Approved' ? 'Upload Files' : 'Edit Details'}
                      </Button>
                    )}
                    {/* Allow delete only if Pending */}
                    {proj.status === 'Pending' && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(proj.id)} disabled={isLoading}>
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
