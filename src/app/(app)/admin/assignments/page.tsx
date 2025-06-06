
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { FacultySubjectAssignment, MoocCoordinatorAssignment, User } from '@/types';
import { Briefcase, BookUser, PlusCircle, Trash2, Settings2, UserCheck, ShieldCheck } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchAllActiveFacultyAction } from '@/actions/faculty-actions';
import { 
  addFacultySubjectAssignmentAction, 
  fetchAllFacultySubjectAssignmentsWithNamesAction,
  deleteFacultySubjectAssignmentAction,
  assignMoocCoordinatorAction,
  fetchAllMoocCoordinatorAssignmentsWithFacultyNamesAction,
  deleteMoocCoordinatorAssignmentAction
} from '@/actions/admin-actions';
import { Skeleton } from '@/components/ui/skeleton';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
const ALL_SUBJECTS_BY_SEMESTER: Record<string, { code: string, name: string }[]> = {
  "1": [{ code: "MA101", name: "Applied Mathematics I" }, { code: "PH102", name: "Engineering Physics" }],
  "2": [{ code: "MA201", name: "Applied Mathematics II" }, { code: "CH202", name: "Engineering Chemistry" }],
  "3": [{ code: "CS301", name: "Data Structures" }, { code: "CS302", name: "Discrete Mathematics" }, { code: "EC303", name: "Analog Electronics" }, { code: "CS304", name: "Digital Design & Comp Org"}],
  "4": [
    { code: "BCS401", name: "Analysis and Design of Algorithms" }, { code: "BCS402", name: "Microcontrollers" },
    { code: "BCS403", name: "Database Management System" }, { code: "BCS405A", name: "Discrete Mathematical Structures" },
    { code: "BCS405B", name: "Graph Theory" }, { code: "BIS402", name: "Advanced Java" },
    { code: "BBOC407", name: "Biology for Engineers" }, { code: "BUHK408", name: "Universal Human Values" }
  ],
  "5": [{ code: "CS501", name: "Database Management" }, { code: "CS502", name: "Computer Networks" }],
  "6": [{ code: "CS601", name: "Compiler Design" }, { code: "CS602", name: "Software Engineering" }],
  "7": [{ code: "CS701", name: "Artificial Intelligence" }, { code: "CS702", name: "Cryptography" }],
  "8": [{ code: "CS801", name: "Project Work" }, { code: "CS802", name: "Professional Elective" }],
};

export default function AdminAssignmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [facultyList, setFacultyList] = useState<User[]>([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true);

  // Subject Assignment State
  const [subjectAssignments, setSubjectAssignments] = useState<FacultySubjectAssignment[]>([]);
  const [isLoadingSubAssign, setIsLoadingSubAssign] = useState(true);
  const [selectedFacultySub, setSelectedFacultySub] = useState('');
  const [selectedSemesterSub, setSelectedSemesterSub] = useState('');
  const [selectedSectionSub, setSelectedSectionSub] = useState('');
  const [selectedSubjectInfo, setSelectedSubjectInfo] = useState<{ code: string; name: string } | null>(null);
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // MOOC Coordinator State
  const [moocAssignments, setMoocAssignments] = useState<MoocCoordinatorAssignment[]>([]);
  const [isLoadingMoocAssign, setIsLoadingMoocAssign] = useState(true);
  const [selectedFacultyMooc, setSelectedFacultyMooc] = useState('');
  const [selectedSemesterMooc, setSelectedSemesterMooc] = useState('');
  const [isSubmittingMooc, setIsSubmittingMooc] = useState(false);

  const availableSubjectsForSemester = selectedSemesterSub ? ALL_SUBJECTS_BY_SEMESTER[selectedSemesterSub] || [] : [];

  const loadInitialData = useCallback(async () => {
    setIsLoadingFaculty(true);
    setIsLoadingSubAssign(true);
    setIsLoadingMoocAssign(true);
    try {
      const [faculty, subAssigns, moocAssigns] = await Promise.all([
        fetchAllActiveFacultyAction(),
        fetchAllFacultySubjectAssignmentsWithNamesAction(),
        fetchAllMoocCoordinatorAssignmentsWithFacultyNamesAction()
      ]);
      setFacultyList(faculty);
      setSubjectAssignments(subAssigns);
      setMoocAssignments(moocAssigns);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load initial assignment data.", variant: "destructive" });
    } finally {
      setIsLoadingFaculty(false);
      setIsLoadingSubAssign(false);
      setIsLoadingMoocAssign(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadInitialData();
    }
  }, [user, loadInitialData]);

  // Subject Assignment Handlers
  const handleAddSubjectAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultySub || !selectedSubjectInfo || !selectedSemesterSub || !selectedSectionSub) {
      toast({ title: "Missing Information", description: "Please select faculty, subject, semester, and section.", variant: "destructive" });
      return;
    }
    setIsSubmittingSub(true);
    try {
      const newAssignment = await addFacultySubjectAssignmentAction({
        facultyId: selectedFacultySub,
        subjectCode: selectedSubjectInfo.code,
        subjectName: selectedSubjectInfo.name,
        semester: parseInt(selectedSemesterSub),
        section: selectedSectionSub,
      });
      setSubjectAssignments(prev => [...prev, newAssignment]);
      toast({ title: "Success", description: "Subject assignment added.", className: "bg-success text-success-foreground" });
      // Reset form
      setSelectedFacultySub('');
      setSelectedSubjectInfo(null);
      setSelectedSemesterSub('');
      setSelectedSectionSub('');
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleDeleteSubjectAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this subject assignment?")) return;
    setIsLoadingSubAssign(true); // Use general loading for table
    try {
      await deleteFacultySubjectAssignmentAction(assignmentId);
      setSubjectAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast({ title: "Success", description: "Subject assignment deleted.", variant: "destructive" });
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingSubAssign(false);
    }
  };

  // MOOC Coordinator Handlers
  const handleAssignMoocCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyMooc || !selectedSemesterMooc) {
      toast({ title: "Missing Information", description: "Please select faculty and semester.", variant: "destructive" });
      return;
    }
    setIsSubmittingMooc(true);
    try {
      const newOrUpdatedAssignment = await assignMoocCoordinatorAction(selectedFacultyMooc, parseInt(selectedSemesterMooc));
      // Refresh the list to reflect potential upsert
      setMoocAssignments(prev => {
        const existingIndex = prev.findIndex(a => a.semester === newOrUpdatedAssignment.semester);
        if (existingIndex > -1) {
          const updatedList = [...prev];
          updatedList[existingIndex] = newOrUpdatedAssignment;
          return updatedList;
        }
        return [...prev, newOrUpdatedAssignment].sort((a,b) => a.semester - b.semester);
      });
      toast({ title: "Success", description: `Faculty assigned as MOOC coordinator for Semester ${selectedSemesterMooc}.`, className: "bg-success text-success-foreground" });
      setSelectedFacultyMooc('');
      setSelectedSemesterMooc('');
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmittingMooc(false);
    }
  };

  const handleDeleteMoocAssignment = async (assignmentId: string) => {
     if (!confirm("Are you sure you want to remove this MOOC coordinator assignment?")) return;
    setIsLoadingMoocAssign(true);
    try {
      await deleteMoocCoordinatorAssignmentAction(assignmentId);
      setMoocAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast({ title: "Success", description: "MOOC coordinator assignment removed.", variant: "destructive" });
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingMoocAssign(false);
    }
  };


  if (user?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10">
        <ShieldCheck className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">This page is for administrators only.</p>
      </div>
    );
  }
  
  const FormSkeleton = () => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
    </div>
  );

  const TableSkeleton = () => (
    <Table>
        <TableHeader><TableRow><Skeleton className="h-6 w-1/4" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-6 w-1/4" /></TableRow></TableHeader>
        <TableBody>
            {[...Array(3)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-5 w-full"/></TableCell><TableCell><Skeleton className="h-5 w-full"/></TableCell><TableCell><Skeleton className="h-5 w-full"/></TableCell><TableCell><Skeleton className="h-5 w-16"/></TableCell></TableRow>))}
        </TableBody>
    </Table>
  );


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><Settings2 className="mr-2 h-8 w-8 text-primary" /> Manage Assignments</h1>

      <Tabs defaultValue="subjectAssignments">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2">
          <TabsTrigger value="subjectAssignments"><Briefcase className="mr-2" />Subject Assignments</TabsTrigger>
          <TabsTrigger value="moocCoordinators"><BookUser className="mr-2" />MOOC Coordinators</TabsTrigger>
        </TabsList>

        {/* Subject Assignments Tab */}
        <TabsContent value="subjectAssignments">
          <Card>
            <CardHeader>
              <CardTitle>Assign Subject to Faculty</CardTitle>
              <CardDescription>Map faculty members to specific subjects, semesters, and sections they will teach.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFaculty ? <FormSkeleton /> : (
                <form onSubmit={handleAddSubjectAssignment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="facultySub">Faculty</Label>
                      <Select value={selectedFacultySub} onValueChange={setSelectedFacultySub} required>
                        <SelectTrigger id="facultySub"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                        <SelectContent>
                          {facultyList.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="semesterSub">Semester</Label>
                      <Select value={selectedSemesterSub} onValueChange={v => {setSelectedSemesterSub(v); setSelectedSubjectInfo(null);}} required>
                        <SelectTrigger id="semesterSub"><SelectValue placeholder="Select Semester" /></SelectTrigger>
                        <SelectContent>{SEMESTERS.map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                     <div>
                      <Label htmlFor="subjectSub">Subject</Label>
                      <Select 
                        value={selectedSubjectInfo?.code || ''} 
                        onValueChange={code => setSelectedSubjectInfo(availableSubjectsForSemester.find(s => s.code === code) || null)} 
                        required 
                        disabled={!selectedSemesterSub || availableSubjectsForSemester.length === 0}
                      >
                        <SelectTrigger id="subjectSub">
                            <SelectValue placeholder={selectedSemesterSub && availableSubjectsForSemester.length === 0 ? "No subjects for sem" : "Select Subject"} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSubjectsForSemester.map(s => <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sectionSub">Section</Label>
                      <Select value={selectedSectionSub} onValueChange={setSelectedSectionSub} required>
                        <SelectTrigger id="sectionSub"><SelectValue placeholder="Select Section" /></SelectTrigger>
                        <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>Sec {s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmittingSub || isLoadingFaculty}>
                    <PlusCircle className="mr-2" /> {isSubmittingSub ? 'Assigning...' : 'Assign Subject'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle>Current Subject Assignments</CardTitle></CardHeader>
            <CardContent>
              {isLoadingSubAssign ? <TableSkeleton /> : subjectAssignments.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Faculty</TableHead><TableHead>Subject</TableHead><TableHead>Class (Sem-Sec)</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {subjectAssignments.map(assign => (
                      <TableRow key={assign.id}>
                        <TableCell>{assign.facultyName}</TableCell>
                        <TableCell>{assign.subjectName} ({assign.subjectCode})</TableCell>
                        <TableCell>Sem {assign.semester} - Sec {assign.section}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSubjectAssignment(assign.id)} disabled={isLoadingSubAssign}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-muted-foreground">No subject assignments found.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOOC Coordinator Assignments Tab */}
        <TabsContent value="moocCoordinators">
          <Card>
            <CardHeader>
              <CardTitle>Assign MOOC Semester Coordinator</CardTitle>
              <CardDescription>Assign one faculty member per semester to coordinate MOOC approvals. Re-assigning to a semester will update the existing coordinator.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFaculty ? <FormSkeleton /> : (
                 <form onSubmit={handleAssignMoocCoordinator} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="facultyMooc">Faculty</Label>
                            <Select value={selectedFacultyMooc} onValueChange={setSelectedFacultyMooc} required>
                                <SelectTrigger id="facultyMooc"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                                <SelectContent>{facultyList.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="semesterMooc">Semester</Label>
                            <Select value={selectedSemesterMooc} onValueChange={setSelectedSemesterMooc} required>
                                <SelectTrigger id="semesterMooc"><SelectValue placeholder="Select Semester" /></SelectTrigger>
                                <SelectContent>{SEMESTERS.map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                     <Button type="submit" disabled={isSubmittingMooc || isLoadingFaculty}>
                        <UserCheck className="mr-2" /> {isSubmittingMooc ? 'Assigning...' : 'Assign Coordinator'}
                    </Button>
                 </form>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle>Current MOOC Semester Coordinators</CardTitle></CardHeader>
            <CardContent>
               {isLoadingMoocAssign ? <TableSkeleton /> : moocAssignments.length > 0 ? (
                <Table>
                    <TableHeader><TableRow><TableHead>Semester</TableHead><TableHead>Coordinator</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {moocAssignments.map(assign => (
                            <TableRow key={assign.id}>
                                <TableCell>Semester {assign.semester}</TableCell>
                                <TableCell>{assign.facultyName}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMoocAssignment(assign.id)} disabled={isLoadingMoocAssign}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
               ) : <p className="text-muted-foreground">No MOOC coordinators assigned.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

