'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import type { MoocCourse, SubmissionStatus } from '@/types';
import { BookOpen, UploadCloud, PlusCircle, Edit2, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FileUploadInput } from '@/components/core/FileUploadInput';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Mock data for MOOCs
const MOCK_MOOCS: MoocCourse[] = [
  { id: 'mooc1', studentId: 'student123', courseName: 'Python for Everybody', platform: 'Coursera', startDate: new Date(2023, 8, 1).toISOString(), endDate: new Date(2023, 10, 30).toISOString(), certificateUrl: 'python_cert.pdf', creditsEarned: 3, submittedDate: new Date(2023,11,1).toISOString(), status: 'Approved' },
  { id: 'mooc2', studentId: 'student123', courseName: 'Introduction to Machine Learning', platform: 'Udacity', startDate: new Date(2024, 0, 15).toISOString(), endDate: new Date(2024, 3, 15).toISOString(), certificateUrl: 'ml_cert.pdf', creditsEarned: 4, submittedDate: new Date(2024,3,16).toISOString(), status: 'Pending' },
];

// Mock API functions
const fetchStudentMoocs = async (studentId: string): Promise<MoocCourse[]> => {
  console.log(`Fetching MOOCs for student ${studentId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const stored = localStorage.getItem(`moocs-${studentId}`);
  return stored ? JSON.parse(stored) : MOCK_MOOCS.filter(m => m.studentId === studentId);
};

const saveStudentMooc = async (mooc: MoocCourse, studentId: string): Promise<MoocCourse> => {
  console.log('Saving MOOC:', mooc);
  await new Promise(resolve => setTimeout(resolve, 1000));
  const moocs = await fetchStudentMoocs(studentId);
  let updatedMoocs;
  if (mooc.id && mooc.id !== 'new') {
    updatedMoocs = moocs.map(m => m.id === mooc.id ? mooc : m);
  } else {
    const newMooc = { ...mooc, id: `mooc${Date.now()}`, studentId, submittedDate: new Date().toISOString(), status: 'Pending' as SubmissionStatus };
    updatedMoocs = [...moocs, newMooc];
    mooc = newMooc;
  }
  localStorage.setItem(`moocs-${studentId}`, JSON.stringify(updatedMoocs));
  return mooc;
};

const deleteStudentMooc = async (moocId: string, studentId: string): Promise<boolean> => {
  console.log(`Deleting MOOC ${moocId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const moocs = await fetchStudentMoocs(studentId);
  const updatedMoocs = moocs.filter(m => m.id !== moocId);
  localStorage.setItem(`moocs-${studentId}`, JSON.stringify(updatedMoocs));
  return true;
};

const initialMoocState: MoocCourse = {
  id: 'new', studentId: '', courseName: '', platform: '', startDate: '', endDate: '', certificateUrl: undefined, creditsEarned: 0, submittedDate: '', status: 'Pending'
};

export default function MoocsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [moocs, setMoocs] = useState<MoocCourse[]>([]);
  const [currentMooc, setCurrentMooc] = useState<MoocCourse>(initialMoocState);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  useEffect(() => {
    if (user && user.role === 'Student') {
      initialMoocState.studentId = user.id;
      setCurrentMooc(initialMoocState);
      fetchStudentMoocs(user.id).then(data => {
        setMoocs(data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setCurrentMooc(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    const moocToSave = {
      ...currentMooc,
      certificateUrl: certificateFile ? certificateFile.name : currentMooc.certificateUrl,
    };
    
    const savedMooc = await saveStudentMooc(moocToSave, user.id);
    
    if (currentMooc.id === 'new') {
      setMoocs(prev => [...prev, savedMooc]);
      toast({ title: "MOOC Submitted", description: `"${savedMooc.courseName}" has been submitted.`, className: "bg-success text-success-foreground" });
    } else {
      setMoocs(prev => prev.map(m => m.id === savedMooc.id ? savedMooc : m));
      toast({ title: "MOOC Updated", description: `"${savedMooc.courseName}" has been updated.`, className: "bg-success text-success-foreground" });
    }
    
    setCurrentMooc(initialMoocState);
    setCertificateFile(null);
    setIsFormVisible(false);
    setIsLoading(false);
  };

  const handleEdit = (mooc: MoocCourse) => {
    setCurrentMooc({
      ...mooc,
      startDate: mooc.startDate ? format(new Date(mooc.startDate), 'yyyy-MM-dd') : '',
      endDate: mooc.endDate ? format(new Date(mooc.endDate), 'yyyy-MM-dd') : ''
    });
    setCertificateFile(null);
    setIsFormVisible(true);
  };
  
  const handleDelete = async (moocId: string) => {
    if (!user) return;
     if (!confirm("Are you sure you want to delete this MOOC submission? This action cannot be undone.")) return;

    setIsLoading(true);
    await deleteStudentMooc(moocId, user.id);
    setMoocs(prev => prev.filter(m => m.id !== moocId));
    toast({ title: "MOOC Deleted", description: "The MOOC submission has been successfully deleted.", variant: "destructive" });
    setIsLoading(false);
  };
  
  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
    if (!isFormVisible) { // Opening form for new MOOC
      setCurrentMooc(initialMoocState);
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

  if (!user || user.role !== 'Student') {
    return <p>This page is for students to manage their MOOC submissions.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><BookOpen className="mr-2 h-8 w-8 text-primary" /> My MOOCs</h1>
        <Button onClick={toggleFormVisibility}>
          <PlusCircle className="mr-2 h-4 w-4" /> {isFormVisible ? 'Close Form' : 'Add New MOOC'}
        </Button>
      </div>

      {isFormVisible && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{currentMooc.id === 'new' ? 'Submit New MOOC' : 'Edit MOOC'}</CardTitle>
            <CardDescription>Fill in the details of your MOOC.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="courseName">Course Name</Label>
                  <Input id="courseName" name="courseName" value={currentMooc.courseName} onChange={handleInputChange} required className="bg-background" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="platform">Platform (e.g., Coursera, NPTEL)</Label>
                  <Input id="platform" name="platform" value={currentMooc.platform} onChange={handleInputChange} required className="bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" name="startDate" type="date" value={currentMooc.startDate} onChange={handleInputChange} required className="bg-background" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" name="endDate" type="date" value={currentMooc.endDate} onChange={handleInputChange} required className="bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="creditsEarned">Credits Earned (Optional)</Label>
                  <Input id="creditsEarned" name="creditsEarned" type="number" value={currentMooc.creditsEarned || ''} onChange={handleInputChange} className="bg-background" />
                </div>
                 <FileUploadInput
                  id="certificateFile"
                  label="Upload Certificate (PDF)"
                  onFileChange={setCertificateFile}
                  accept=".pdf"
                  currentFile={currentMooc.certificateUrl}
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                <UploadCloud className="mr-2 h-4 w-4" /> {isLoading ? 'Submitting...' : (currentMooc.id === 'new' ? 'Submit MOOC' : 'Update MOOC')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Submitted MOOCs</CardTitle>
          <CardDescription>List of your MOOC submissions and their status.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading && moocs.length === 0 ? (
             <div className="space-y-2">
                {[...Array(2)].map((_, i) => ( <div key={i} className="p-4 border rounded-lg animate-pulse bg-muted/50"><div className="h-5 w-3/4 bg-muted rounded mb-2"></div><div className="h-4 w-1/2 bg-muted rounded"></div></div>))}
            </div>
          ) : moocs.length > 0 ? (
            <div className="space-y-4">
              {moocs.map(mooc => (
                <Card key={mooc.id} className="bg-background hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">{mooc.courseName}</CardTitle>
                    <StatusBadge status={mooc.status} />
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1 pb-3">
                    <p><strong>Platform:</strong> {mooc.platform}</p>
                    <p><strong>Duration:</strong> {format(new Date(mooc.startDate), "PP")} - {format(new Date(mooc.endDate), "PP")}</p>
                    {mooc.creditsEarned && <p><strong>Credits:</strong> {mooc.creditsEarned}</p>}
                    {mooc.certificateUrl && <p><strong>Certificate:</strong> {mooc.certificateUrl}</p>}
                    {mooc.remarks && mooc.status === 'Rejected' && <p className="text-destructive"><strong>Remarks:</strong> {mooc.remarks}</p>}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-0 pb-3 px-6">
                     {mooc.status === 'Pending' && (
                       <>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(mooc)} disabled={isLoading}>
                          <Edit2 className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(mooc.id)} disabled={isLoading}>
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                       </>
                     )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No MOOCs submitted yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
