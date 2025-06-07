
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import type { MoocCourse, SubmissionStatus, StudentProfile } from '@/types';
import { BookOpen, UploadCloud, PlusCircle, Edit2, Trash2, CheckCircle, XCircle, Clock, CalendarDays, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FileUploadInput } from '@/components/core/FileUploadInput';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fetchStudentMoocsAction, saveStudentMoocAction, deleteStudentMoocAction } from '@/actions/academic-submission-actions';
import { fetchStudentFullProfileDataAction } from '@/actions/profile-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';

const initialMoocState: Omit<MoocCourse, '_id' | 'submittedDate' | 'status' | 'submissionSemester' | 'certificateUrl'> & {id?: string, certificateUrl?: string | undefined} = {
  studentId: '', courseName: '', platform: '', startDate: '', endDate: '', certificateUrl: undefined, creditsEarned: 0
};

const SEMESTERS = Array.from({ length: 8 }, (_, i) => String(i + 1));


export default function MoocsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [moocs, setMoocs] = useState<MoocCourse[]>([]);
  const [currentMooc, setCurrentMooc] = useState<Omit<MoocCourse, '_id' | 'submittedDate' | 'status' | 'submissionSemester' | 'certificateUrl'> & {id?: string; status?: SubmissionStatus; certificateUrl?: string | undefined}>(initialMoocState);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

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
        })
        .finally(() => {
          // setIsLoading(false) is handled by the MOOCs fetch effect
        });
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && user.role === 'Student' && selectedSemesterView && selectedSemesterView !== 'loading-placeholder') {
      setIsLoading(true);
      const semesterToFetch = parseInt(selectedSemesterView, 10);
      fetchStudentMoocsAction(user.id, semesterToFetch)
        .then(data => {
          setMoocs(data);
        })
        .catch(err => {
          console.error("Error fetching MOOCs:", err);
          toast({ title: "Error", description: "Could not load your MOOC submissions for the selected semester.", variant: "destructive" });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!user || user.role !== 'Student') {
        setIsLoading(false);
    }
  }, [user, selectedSemesterView, toast]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setCurrentMooc(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !studentCurrentSemester) return;

    const isCurrentSemesterViewSelected = parseInt(selectedSemesterView) === studentCurrentSemester;
    const isNewSubmission = !currentMooc.id || currentMooc.id === 'new';

    if (isNewSubmission && !isCurrentSemesterViewSelected) {
        toast({ title: "Action Denied", description: "You can only add MOOCs for your current semester.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('id', currentMooc.id || 'new');
    formData.append('courseName', currentMooc.courseName);
    formData.append('platform', currentMooc.platform);
    formData.append('startDate', currentMooc.startDate);
    formData.append('endDate', currentMooc.endDate);
    if (currentMooc.creditsEarned !== undefined && currentMooc.creditsEarned !== null) {
        formData.append('creditsEarned', String(currentMooc.creditsEarned));
    }
    if (currentMooc.certificateUrl) {
        formData.append('existingCertificateUrl', currentMooc.certificateUrl);
    }
    if (certificateFile) {
      formData.append('certificateFile', certificateFile);
    }

    try {
      const savedMooc = await saveStudentMoocAction(formData, user.id);

      if (savedMooc.submissionSemester === parseInt(selectedSemesterView)) {
        setMoocs(prev => {
          if (isNewSubmission) {
              return [...prev, savedMooc];
          }
          return prev.map(m => m.id === savedMooc.id ? savedMooc : m);
        });
      } else {
        toast({title: "Submission Recorded", description: `"${savedMooc.courseName}" was submitted for Semester ${savedMooc.submissionSemester}. You are currently viewing Semester ${selectedSemesterView}.`});
      }

      toast({ title: isNewSubmission ? "MOOC Submitted" : "MOOC Updated", description: `"${savedMooc.courseName}" has been ${isNewSubmission ? 'submitted' : 'updated'}.`, className: "bg-success text-success-foreground" });

      setCurrentMooc({ ...initialMoocState, studentId: user.id });
      setCertificateFile(null);
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error submitting MOOC:", error);
      toast({ title: "Submission Error", description: (error as Error).message || "Could not submit MOOC.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (mooc: MoocCourse) => {
    const isCurrentSemSubmission = studentCurrentSemester !== null && mooc.submissionSemester === studentCurrentSemester;
    if (mooc.status === 'Approved' && isCurrentSemSubmission) {
        toast({ title: "Notice", description: "This MOOC is approved. You can update the certificate.", variant: "default"});
    } else if (mooc.status === 'Approved') { // Approved but not current semester
        toast({ title: "Notice", description: "This MOOC is approved (read-only for past/future semesters).", variant: "default"});
    } else if (!isCurrentSemSubmission) {
        toast({ title: "Notice", description: "Viewing MOOC from a past/future semester (read-only).", variant: "default"});
    }

    setCurrentMooc({
      ...mooc,
      startDate: mooc.startDate ? format(new Date(mooc.startDate), 'yyyy-MM-dd') : '',
      endDate: mooc.endDate ? format(new Date(mooc.endDate), 'yyyy-MM-dd') : ''
    });
    setCertificateFile(null);
    setIsFormVisible(true);
  };

  const handleDelete = async (mooc: MoocCourse) => {
    if (!user || !studentCurrentSemester) return;
    if (mooc.submissionSemester !== studentCurrentSemester || mooc.status === 'Approved') {
        toast({ title: "Deletion Denied", description: "Only pending/rejected MOOCs from your current semester can be deleted.", variant: "destructive"});
        return;
    }
    if (!confirm("Are you sure you want to delete this MOOC submission? This action cannot be undone.")) return;

    setIsSubmitting(true);
    try {
      await deleteStudentMoocAction(mooc.id, user.id);
      setMoocs(prev => prev.filter(m => m.id !== mooc.id));
      toast({ title: "MOOC Deleted", description: "The MOOC submission has been successfully deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting MOOC:", error);
      toast({ title: "Deletion Error", description: (error as Error).message || "Could not delete MOOC.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFormVisibility = () => {
    const isCurrentSemesterViewSelected = studentCurrentSemester !== null && parseInt(selectedSemesterView) === studentCurrentSemester;
    if (!isFormVisible && !isCurrentSemesterViewSelected) {
        toast({ title: "Action Denied", description: "You can only add new MOOCs for your current semester. Please select your current semester to add a MOOC.", variant: "default"});
        return;
    }
    setIsFormVisible(!isFormVisible);
    if (!isFormVisible && user) {
      setCurrentMooc({ ...initialMoocState, studentId: user.id, status: 'Pending' });
      setCertificateFile(null);
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

  if (!user || user.role !== 'Student') {
    return <p>This page is for students to manage their MOOC submissions.</p>;
  }

  const isCurrentSemesterViewSelected = studentCurrentSemester !== null && parseInt(selectedSemesterView) === studentCurrentSemester;
  const isNewMooc = !currentMooc.id || currentMooc.id === 'new';
  
  // Determine if details fields should be disabled
  const detailsFieldsDisabled = isSubmitting || (
    !isNewMooc && // For existing MOOCs
    (currentMooc.status === 'Approved' || !isCurrentSemesterViewSelected) // Disable if approved OR not current semester
  );

  // Determine if certificate upload should be disabled
  const certificateUploadDisabled = isSubmitting || (
    !isNewMooc && !isCurrentSemesterViewSelected // Disable for existing MOOCs not in current semester
  );
  
  // Submit button text and disabled state
  let submitButtonText = isNewMooc ? 'Submit MOOC' : 'Update MOOC';
  if (currentMooc.status === 'Approved' && isCurrentSemesterViewSelected && !isNewMooc) {
    submitButtonText = 'Save Certificate';
  }

  let formTitle = isNewMooc ? 'Submit New MOOC' : 'Edit MOOC Details';
  let formDescription = "Fill in the details of your MOOC.";

  if (!isNewMooc) {
    if (currentMooc.status === 'Approved' && isCurrentSemesterViewSelected) {
      formTitle = 'Upload/Update MOOC Certificate';
      formDescription = 'This MOOC is approved. You can upload or update your certificate here.';
    } else if (currentMooc.status === 'Approved' && !isCurrentSemesterViewSelected) {
      formTitle = 'View Approved MOOC';
      formDescription = 'This MOOC is approved (details are read-only).';
    } else if (!isCurrentSemesterViewSelected) {
      formTitle = 'View MOOC Details';
      formDescription = 'Viewing MOOC from a past/future semester (details are read-only).';
    }
  }

  const formSubmitDisabled = isSubmitting || 
    (isNewMooc && !isCurrentSemesterViewSelected) || // Can't submit NEW if not current sem
    (!isNewMooc && !isCurrentSemesterViewSelected && currentMooc.status !== 'Approved') || // Can't edit existing (non-approved) if not current sem
    (!isNewMooc && currentMooc.status === 'Approved' && !isCurrentSemesterViewSelected); // Can't update cert for approved if not current sem

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><BookOpen className="mr-2 h-8 w-8 text-primary" /> My MOOCs</h1>
        <div className="flex items-center gap-4">
            <div className="w-48">
                <Label htmlFor="semester-view" className="sr-only">View Semester</Label>
                <Select value={selectedSemesterView} onValueChange={setSelectedSemesterView} disabled={isLoading || isSubmitting}>
                    <SelectTrigger id="semester-view">
                         <SelectValue placeholder={selectedSemesterView === 'loading-placeholder' ? "Loading sem..." : "Select Semester"} />
                    </SelectTrigger>
                    <SelectContent>
                        {selectedSemesterView === 'loading-placeholder' ? <SelectItem value="loading-placeholder" disabled>Loading...</SelectItem> :
                         SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem} {studentCurrentSemester === parseInt(sem) ? "(Current)" : ""}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={toggleFormVisibility} disabled={isSubmitting || isLoading || (!isCurrentSemesterViewSelected && !isFormVisible) }>
              <PlusCircle className="mr-2 h-4 w-4" /> {isFormVisible ? 'Close Form' : 'Add New MOOC'}
            </Button>
        </div>
      </div>

      {isFormVisible && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{formTitle}</CardTitle>
            <CardDescription>
                {formDescription}
                 {!isCurrentSemesterViewSelected && isNewMooc && <span className="block text-destructive text-sm mt-1">You must select your current semester to add a new MOOC.</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="courseName">Course Name</Label>
                  <Input id="courseName" name="courseName" value={currentMooc.courseName} onChange={handleInputChange} required className="bg-background" disabled={detailsFieldsDisabled}/>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="platform">Platform (e.g., Coursera, NPTEL)</Label>
                  <Input id="platform" name="platform" value={currentMooc.platform} onChange={handleInputChange} required className="bg-background" disabled={detailsFieldsDisabled}/>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" name="startDate" type="date" value={currentMooc.startDate} onChange={handleInputChange} required className="bg-background" disabled={detailsFieldsDisabled}/>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" name="endDate" type="date" value={currentMooc.endDate} onChange={handleInputChange} required className="bg-background" disabled={detailsFieldsDisabled}/>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="creditsEarned">Credits Earned (Optional)</Label>
                  <Input id="creditsEarned" name="creditsEarned" type="number" value={currentMooc.creditsEarned ?? ''} onChange={handleInputChange} className="bg-background" disabled={detailsFieldsDisabled}/>
                </div>
                 <FileUploadInput
                  id="certificateFile"
                  label="Upload Certificate (PDF)"
                  onFileChange={setCertificateFile}
                  accept=".pdf"
                  currentFile={currentMooc.certificateUrl}
                  disabled={certificateUploadDisabled}
                />
              </div>
              {!((!isNewMooc && !isCurrentSemesterViewSelected && currentMooc.status !== 'Approved') || (!isNewMooc && currentMooc.status === 'Approved' && !isCurrentSemesterViewSelected)) && (
                <Button type="submit" disabled={formSubmitDisabled} className="w-full md:w-auto">
                    <UploadCloud className="mr-2 h-4 w-4" /> {isSubmitting ? 'Processing...' : submitButtonText}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Submitted MOOCs for Semester {selectedSemesterView === 'loading-placeholder' ? 'N/A' : selectedSemesterView}</CardTitle>
          <CardDescription>List of your MOOC submissions and their status for the selected semester.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading && studentCurrentSemester === null ? (
             <div className="text-center py-4"><Skeleton className="h-8 w-1/2 mx-auto mb-2" /><Skeleton className="h-6 w-3/4 mx-auto" /></div>
           ) : isLoading ? (
             <div className="space-y-2">
                {[...Array(2)].map((_, i) => ( <div key={i} className="p-4 border rounded-lg animate-pulse bg-muted/50"><div className="h-5 w-3/4 bg-muted rounded mb-2"></div><div className="h-4 w-1/2 bg-muted rounded"></div></div>))}
            </div>
          ) : moocs.length > 0 ? (
            <div className="space-y-4">
              {moocs.map(mooc => {
                const isCurrentSemSubmission = studentCurrentSemester !== null && mooc.submissionSemester === studentCurrentSemester;
                const canEditThisMooc = isCurrentSemSubmission; // Simplified: can always "edit" current sem MOOCs to open form
                const canDeleteThisMooc = isCurrentSemSubmission && (mooc.status === 'Pending' || mooc.status === 'Rejected');
                let editButtonText = "Edit Details";
                if (mooc.status === 'Approved' && isCurrentSemSubmission) {
                    editButtonText = "Update Certificate";
                } else if (!isCurrentSemSubmission) {
                    editButtonText = "View Details";
                }


                return (
                    <Card key={mooc.id} className="bg-background hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">{mooc.courseName}</CardTitle>
                        <StatusBadge status={mooc.status} />
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1 pb-3">
                        <p><strong>Platform:</strong> {mooc.platform}</p>
                        <p><strong>Duration:</strong> {format(new Date(mooc.startDate), "PP")} - {format(new Date(mooc.endDate), "PP")}</p>
                        {mooc.creditsEarned != null && <p><strong>Credits:</strong> {mooc.creditsEarned}</p>}
                        {mooc.certificateUrl && (
                          <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary hover:underline">
                            <a href={mooc.certificateUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-1 h-3 w-3"/> View Certificate
                            </a>
                          </Button>
                        )}
                        {mooc.remarks && (mooc.status === 'Rejected' || mooc.status === 'Approved') && <p className={mooc.status === 'Rejected' ? "text-destructive" : "text-muted-foreground"}><strong>Faculty Remarks:</strong> {mooc.remarks}</p>}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-0 pb-3 px-6">
                        {isCurrentSemSubmission || mooc.status === 'Approved' ? ( // Allow viewing/editing for current sem or if approved (to view)
                        <Button variant="outline" size="sm" onClick={() => handleEdit(mooc)} disabled={isSubmitting || isLoading}>
                            {mooc.status === 'Approved' && isCurrentSemSubmission ? <UploadCloud className="mr-1 h-3 w-3" /> : (isCurrentSemSubmission ? <Edit2 className="mr-1 h-3 w-3" /> : <CalendarDays className="mr-1 h-3 w-3" />)} 
                            {editButtonText}
                        </Button>
                        ) : (
                             <Button variant="outline" size="sm" onClick={() => handleEdit(mooc)} disabled={isSubmitting || isLoading}>
                                <CalendarDays className="mr-1 h-3 w-3" /> View Details
                            </Button>
                        )}
                        {canDeleteThisMooc && (
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(mooc)} disabled={isSubmitting || isLoading}>
                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                        )}
                         {(!isCurrentSemSubmission && mooc.status !== 'Approved') && (
                            <p className="text-xs text-muted-foreground">Actions locked for past semester submissions.</p>
                         )}
                    </CardFooter>
                    </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
                <CalendarDays className="h-5 w-5" /> No MOOCs submitted for Semester {selectedSemesterView === 'loading-placeholder' ? 'N/A' : selectedSemesterView}.
                {isCurrentSemesterViewSelected &&
                    <Button size="sm" variant="outline" onClick={toggleFormVisibility} disabled={isLoading || isSubmitting}>Add New MOOC</Button>
                }
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

