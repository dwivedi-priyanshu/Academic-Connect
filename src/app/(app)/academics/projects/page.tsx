
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { MiniProject, SubmissionStatus, User, StudentProfile } from '@/types';
import { FileText, UploadCloud, PlusCircle, Edit2, Trash2, CheckCircle, XCircle, Clock, UserCheck, CalendarDays, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FileUploadInput } from '@/components/core/FileUploadInput';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fetchStudentProjectsAction, saveStudentProjectAction, deleteStudentProjectAction } from '@/actions/academic-submission-actions';
import { fetchAllActiveFacultyAction } from '@/actions/faculty-actions';
import { fetchStudentFullProfileDataAction } from '@/actions/profile-actions';
import { Skeleton } from '@/components/ui/skeleton';

const initialProjectState: Omit<MiniProject, '_id' | 'submittedDate' | 'status' | 'submissionSemester' | 'pptUrl' | 'reportUrl'> & {id?: string, pptUrl?: string | undefined, reportUrl?: string | undefined} = {
  studentId: '', title: '', description: '', pptUrl: undefined, reportUrl: undefined, subject: '', guideId: undefined
};

const SEMESTERS = Array.from({ length: 8 }, (_, i) => String(i + 1));
const AVAILABLE_SUBJECTS = ["Artificial Intelligence", "Web Technologies", "Data Science", "Machine Learning", "Cyber Security", "Robotics", "IoT", "Cloud Computing", "Blockchain"];


export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<MiniProject[]>([]);
  const [currentProject, setCurrentProject] = useState<Omit<MiniProject, '_id' | 'submittedDate' | 'status' | 'submissionSemester' | 'pptUrl' | 'reportUrl'> & {id?: string; status?: SubmissionStatus; pptUrl?: string | undefined, reportUrl?: string | undefined}>(initialProjectState);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [facultyList, setFacultyList] = useState<User[]>([]);

  const [studentCurrentSemester, setStudentCurrentSemester] = useState<number | null>(null);
  const [selectedSemesterView, setSelectedSemesterView] = useState<string>('loading-placeholder');


  useEffect(() => {
    if (user && user.role === 'Student') {
      setIsLoading(true);
      fetchStudentFullProfileDataAction(user.id)
        .then(profile => {
          if (profile) {
            setStudentCurrentSemester(profile.currentSemester);
            setSelectedSemesterView(String(profile.currentSemester));
          } else {
            toast({title: "Error", description: "Could not load your profile data.", variant: "destructive"});
            setSelectedSemesterView("1");
          }
        })
        .catch(err => {
          console.error("Error fetching student profile:", err);
          toast({title: "Error", description: "Could not load profile to determine current semester.", variant: "destructive"});
          setSelectedSemesterView("1");
        });

      fetchAllActiveFacultyAction().then(setFacultyList).catch(err => {
        console.error("Error fetching faculty list:", err);
        toast({ title: "Error", description: "Could not load faculty list for guide selection.", variant: "destructive" });
      });
    } else {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && user.role === 'Student' && selectedSemesterView && selectedSemesterView !== 'loading-placeholder') {
      setIsLoading(true);
      const semesterToFetch = parseInt(selectedSemesterView, 10);
      fetchStudentProjectsAction(user.id, semesterToFetch)
        .then(data => {
          setProjects(data);
        })
        .catch(err => {
          console.error("Error fetching projects:", err);
          toast({ title: "Error", description: "Could not load your project submissions for the selected semester.", variant: "destructive" });
        })
        .finally(() => {
            setIsLoading(false);
        });
    } else if (!user || user.role !== 'Student') {
        setIsLoading(false);
    }
  }, [user, selectedSemesterView, toast]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: 'subject' | 'guideId', value: string) => {
    setCurrentProject(prev => ({ ...prev, [name]: value || undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !studentCurrentSemester) return;

    const isNew = !currentProject.id || currentProject.id === 'new';
    if (parseInt(selectedSemesterView) !== studentCurrentSemester && isNew) {
        toast({ title: "Action Denied", description: "You can only add new projects for your current semester.", variant: "destructive"});
        return;
    }
    
    if (isNew && !currentProject.guideId) {
        toast({ title: "Guide Required", description: "Please select a faculty guide for your new project proposal.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('id', currentProject.id || 'new');
    formData.append('title', currentProject.title);
    formData.append('description', currentProject.description);
    formData.append('subject', currentProject.subject);
    if (currentProject.guideId) formData.append('guideId', currentProject.guideId);
    
    if (currentProject.pptUrl) formData.append('existingPptUrl', currentProject.pptUrl);
    if (currentProject.reportUrl) formData.append('existingReportUrl', currentProject.reportUrl);

    if (pptFile) formData.append('pptFile', pptFile);
    if (reportFile) formData.append('reportFile', reportFile);

    try {
      const savedProject = await saveStudentProjectAction(formData, user.id);

      if (savedProject.submissionSemester === parseInt(selectedSemesterView)) {
        setProjects(prev => {
            if (isNew) {
                return [...prev, savedProject];
            }
            return prev.map(p => p.id === savedProject.id ? savedProject : p);
        });
      } else {
        toast({title: "Submission Recorded", description: `"${savedProject.title}" was submitted for Semester ${savedProject.submissionSemester}. You are currently viewing Semester ${selectedSemesterView}.`});
      }

      const toastTitle = isNew ? "Project Proposal Submitted" : "Project Updated";
      let toastDescription = `"${savedProject.title}" has been ${isNew ? 'submitted for approval' : 'updated'}.`;
      if (!isNew && currentProject.status === 'Approved') {
        toastDescription = `Files uploaded/updated for "${savedProject.title}".`;
      }

      toast({ title: toastTitle, description: toastDescription, className: "bg-success text-success-foreground" });

      setCurrentProject({ ...initialProjectState, studentId: user.id, status: 'Pending' });
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
    if (!studentCurrentSemester || project.submissionSemester !== studentCurrentSemester) {
        toast({ title: "Action Denied", description: "You can only edit projects from your current semester. Viewing details.", variant: "default"});
    }
    setCurrentProject(project);
    setPptFile(null);
    setReportFile(null);
    setIsFormVisible(true);
  };

  const handleDelete = async (project: MiniProject) => {
    if (!user || !studentCurrentSemester) return;
     if (project.submissionSemester !== studentCurrentSemester || project.status === 'Approved') {
        toast({ title: "Deletion Denied", description: "Only pending/rejected projects from your current semester can be deleted.", variant: "destructive"});
        return;
    }
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

    setIsSubmitting(true);
    try {
      await deleteStudentProjectAction(project.id, user.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      toast({ title: "Project Deleted", description: "The project has been successfully deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ title: "Deletion Error", description: (error as Error).message || "Could not delete project.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFormVisibility = () => {
     if (!isFormVisible && (!studentCurrentSemester || parseInt(selectedSemesterView) !== studentCurrentSemester)) {
        toast({ title: "Action Denied", description: "You can only add new projects for your current semester. Please select your current semester to add a project.", variant: "default"});
        return;
    }
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

  const canInteractWithFormForCurrentSemester = studentCurrentSemester !== null && parseInt(selectedSemesterView) === studentCurrentSemester;
  const isNewProjectInForm = !currentProject.id || currentProject.id === 'new';
  const isApprovedProjectInForm = currentProject.status === 'Approved';
  const isPendingOrRejectedInForm = currentProject.status === 'Pending' || currentProject.status === 'Rejected';

  const getFormTitle = () => {
    if (!isFormVisible) return '';
    if (!canInteractWithFormForCurrentSemester) return 'View Project Details';
    if (isNewProjectInForm) return 'Submit New Project Proposal';
    if (isApprovedProjectInForm) return 'Upload/Update Project Files';
    if (isPendingOrRejectedInForm) return 'Edit Project Details';
    return 'View Project Details'; 
  }

  const getFormDescription = () => {
     if (!isFormVisible) return '';
     if (!canInteractWithFormForCurrentSemester) return 'Viewing details for a past semester project (read-only).';
     if (isNewProjectInForm) return 'Submit your project title, subject, description, and select a guide for approval. File uploads will be enabled after approval.';
     if (isApprovedProjectInForm) return 'Your project proposal has been approved. Please upload/update your PPT and Report files.';
     if (isPendingOrRejectedInForm) return 'Edit the details of your pending or rejected project submission.';
     return 'Viewing project details.';
  }

  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Submitting...';
    if (isNewProjectInForm) return 'Submit Proposal';
    if (isApprovedProjectInForm) return 'Save Files';
    return 'Update Details';
  };

  const formIsReadOnly = isFormVisible && !canInteractWithFormForCurrentSemester;
  const detailsAreReadOnly = formIsReadOnly || (canInteractWithFormForCurrentSemester && isApprovedProjectInForm);


  if (!user || user.role !== 'Student') {
    return <p>This page is for students to manage their projects.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><FileText className="mr-2 h-8 w-8 text-primary" /> My Mini-Projects</h1>
        <div className="flex items-center gap-4">
            <div className="w-48">
                <Label htmlFor="semester-view-project" className="sr-only">View Semester</Label>
                <Select value={selectedSemesterView} onValueChange={setSelectedSemesterView} disabled={isLoading || isSubmitting}>
                    <SelectTrigger id="semester-view-project">
                         <SelectValue placeholder={selectedSemesterView === 'loading-placeholder' ? "Loading sem..." : "Select Semester"} />
                    </SelectTrigger>
                    <SelectContent>
                        {selectedSemesterView === 'loading-placeholder' ? <SelectItem value="loading-placeholder" disabled>Loading...</SelectItem> :
                         SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem} {studentCurrentSemester === parseInt(sem) ? "(Current)" : ""}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={toggleFormVisibility} disabled={isSubmitting || isLoading || (!canInteractWithFormForCurrentSemester && !isFormVisible) }>
            <PlusCircle className="mr-2 h-4 w-4" /> {isFormVisible ? 'Close Form' : 'Add New Project'}
            </Button>
        </div>
      </div>

      {isFormVisible && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{getFormTitle()}</CardTitle>
            <CardDescription>
                {getFormDescription()}
                {!canInteractWithFormForCurrentSemester && isNewProjectInForm && <span className="block text-destructive text-sm mt-1">You must select your current semester to add a new project.</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Details Section: Title, Subject, Description, Guide */}
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
                    disabled={detailsAreReadOnly || isSubmitting}
                  />
                </div>
                 <div className="space-y-1">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    name="subject"
                    value={currentProject.subject}
                    onValueChange={(value) => handleSelectChange('subject', value)}
                    required
                    disabled={detailsAreReadOnly || isSubmitting}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_SUBJECTS.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
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
                  disabled={detailsAreReadOnly || isSubmitting}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="guideId">
                    Select Guide <span className="text-destructive">{isNewProjectInForm && canInteractWithFormForCurrentSemester ? '*' : ''}</span>
                </Label>
                <Select
                    name="guideId"
                    value={currentProject.guideId || ''}
                    onValueChange={(value) => handleSelectChange('guideId', value)}
                    required={isNewProjectInForm && canInteractWithFormForCurrentSemester}
                    disabled={detailsAreReadOnly || (!isNewProjectInForm && !!currentProject.guideId) || isSubmitting}
                >
                    <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a faculty guide" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Faculty Members</SelectLabel>
                        {facultyList.length > 0 ? facultyList.map(faculty => (
                        <SelectItem key={faculty.id} value={faculty.id}>
                            {faculty.name}
                        </SelectItem>
                        )) : <SelectItem value="-" disabled>No faculty available</SelectItem>}
                    </SelectGroup>
                    </SelectContent>
                </Select>
                {currentProject.guideId && !isNewProjectInForm && <p className="text-xs text-muted-foreground mt-1">Guide selection is locked for existing submissions.</p>}
                </div>


              {/* File Uploads Section - only if approved and for current semester, or if not approved but for current semester */}
              {canInteractWithFormForCurrentSemester && (isApprovedProjectInForm || isPendingOrRejectedInForm || isNewProjectInForm) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4 border-dashed">
                  <FileUploadInput
                    id="pptFile"
                    label="Upload PPT (PDF)"
                    onFileChange={setPptFile}
                    accept=".pdf"
                    currentFile={currentProject.pptUrl}
                    disabled={formIsReadOnly || isSubmitting}
                  />
                  <FileUploadInput
                    id="reportFile"
                    label="Upload Report (PDF)"
                    onFileChange={setReportFile}
                    accept=".pdf"
                    currentFile={currentProject.reportUrl}
                    disabled={formIsReadOnly || isSubmitting}
                  />
                </div>
              )}

              {/* Submit Button Logic */}
              {canInteractWithFormForCurrentSemester && (isNewProjectInForm || isPendingOrRejectedInForm || isApprovedProjectInForm) && (
                 <Button type="submit" disabled={isSubmitting || formIsReadOnly} className="w-full md:w-auto">
                    <UploadCloud className="mr-2 h-4 w-4" /> {getSubmitButtonText()}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Submitted Projects for Semester {selectedSemesterView === 'loading-placeholder' ? 'N/A' : selectedSemesterView}</CardTitle>
          <CardDescription>List of your mini-project submissions and their status for the selected semester.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && studentCurrentSemester === null ? (
             <div className="text-center py-4"><Skeleton className="h-8 w-1/2 mx-auto mb-2" /><Skeleton className="h-6 w-3/4 mx-auto" /></div>
          ) : isLoading ? (
             <div className="space-y-2">
                {[...Array(2)].map((_, i) => ( <div key={i} className="p-4 border rounded-lg animate-pulse bg-muted/50"><div className="h-5 w-3/4 bg-muted rounded mb-2"></div><div className="h-4 w-1/2 bg-muted rounded"></div></div>))}
            </div>
          ) : projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map(proj => {
                const isCurrentSemProject = studentCurrentSemester !== null && proj.submissionSemester === studentCurrentSemester;
                const canEditThisProject = isCurrentSemProject && (proj.status === 'Pending' || proj.status === 'Rejected' || proj.status === 'Approved');
                const canDeleteThisProject = isCurrentSemProject && (proj.status === 'Pending' || proj.status === 'Rejected');

                return(
                <Card key={proj.id} className="bg-background hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">{proj.title}</CardTitle>
                    <StatusBadge status={proj.status} />
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1 pb-3">
                    <p><strong>Subject:</strong> {proj.subject}</p>
                    <p><strong>Description:</strong> {proj.description}</p>
                    <p><strong>Submitted:</strong> {format(new Date(proj.submittedDate), "PPP")}</p>
                    {proj.guideId && <p><strong>Guide:</strong> {facultyList.find(f => f.id === proj.guideId)?.name || 'N/A'}</p>}
                    {proj.pptUrl && (
                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary hover:underline">
                            <a href={proj.pptUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-1 h-3 w-3"/> View PPT
                            </a>
                        </Button>
                    )}
                    {proj.reportUrl && (
                         <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary hover:underline ml-2">
                            <a href={proj.reportUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-1 h-3 w-3"/> View Report
                            </a>
                        </Button>
                    )}
                    {proj.status === 'Approved' && (!proj.pptUrl || !proj.reportUrl) && isCurrentSemProject &&
                      <p className="text-warning-foreground font-medium mt-1">Action Required: Please upload project files.</p>
                    }
                    {proj.remarks && (proj.status === 'Rejected' || proj.status === 'Approved') && <p className={proj.status === 'Rejected' ? "text-destructive" : "text-muted-foreground"}><strong>Faculty Remarks:</strong> {proj.remarks}</p>}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-0 pb-3 px-6">
                    {canEditThisProject && (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(proj)} disabled={isLoading || isSubmitting}>
                        <Edit2 className="mr-1 h-3 w-3" />
                         {proj.status === 'Approved' ? 'Upload/Update Files' : 'Edit Details'}
                      </Button>
                    )}
                    {proj.submissionSemester !== studentCurrentSemester && (
                         <Button variant="outline" size="sm" onClick={() => handleEdit(proj)} disabled={isLoading || isSubmitting}>
                            <CalendarDays className="mr-1 h-3 w-3" /> View Details
                        </Button>
                    )}
                    {canDeleteThisProject && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(proj)} disabled={isLoading || isSubmitting}>
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    )}
                    {!isCurrentSemProject && !canEditThisProject && proj.status !== 'Approved' && (
                        <p className="text-xs text-muted-foreground">Viewing past semester submission (read-only).</p>
                    )}
                     {isCurrentSemProject && !canEditThisProject && proj.status !== 'Approved' && ( 
                        <p className="text-xs text-muted-foreground">Actions locked for this project.</p>
                     )}
                  </CardFooter>
                </Card>
              );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
                <CalendarDays className="h-5 w-5" /> No projects submitted for Semester {selectedSemesterView === 'loading-placeholder' ? 'N/A' : selectedSemesterView}.
                 {studentCurrentSemester !== null && parseInt(selectedSemesterView) === studentCurrentSemester &&
                    <Button size="sm" variant="outline" onClick={toggleFormVisibility} disabled={isLoading || isSubmitting}>Add New Project</Button>
                }
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
