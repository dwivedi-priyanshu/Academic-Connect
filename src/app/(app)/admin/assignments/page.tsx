
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { FacultySubjectAssignment, MoocCoordinatorAssignment, User, Subject } from '@/types';
import { Briefcase, BookUser, PlusCircle, Trash2, Settings2, UserCheck, ShieldCheck, Building } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchAllActiveFacultyAction } from '@/actions/faculty-actions';
import { 
  addFacultySubjectAssignmentAction, 
  fetchAllFacultySubjectAssignmentsWithNamesAction,
  deleteFacultySubjectAssignmentAction,
  assignMoocCoordinatorAction,
  fetchAllMoocCoordinatorAssignmentsWithFacultyNamesAction,
  deleteMoocCoordinatorAssignmentAction,
  fetchSubjectsByDepartmentAndSemesterAction // New action
} from '@/actions/admin-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { DEPARTMENTS } from '@/lib/subjects'; // Import DEPARTMENTS

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
// ALL_SUBJECTS_BY_SEMESTER is removed as subjects are now dynamic

export default function AdminAssignmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [facultyList, setFacultyList] = useState<User[]>([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true);

  // Subject Assignment State
  const [subjectAssignments, setSubjectAssignments] = useState<FacultySubjectAssignment[]>([]);
  const [isLoadingSubAssign, setIsLoadingSubAssign] = useState(true);
  const [selectedFacultySub, setSelectedFacultySub] = useState('');
  const [selectedDepartmentSub, setSelectedDepartmentSub] = useState(''); // New state for department
  const [selectedSemesterSub, setSelectedSemesterSub] = useState('');
  const [selectedSectionSub, setSelectedSectionSub] = useState('');
  const [availableSubjectsForAssignment, setAvailableSubjectsForAssignment] = useState<Subject[]>([]); // For dynamic subjects
  const [isLoadingAvailableSubjects, setIsLoadingAvailableSubjects] = useState(false);
  const [selectedSubjectInfo, setSelectedSubjectInfo] = useState<{ code: string; name: string } | null>(null);
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // MOOC Coordinator State
  const [moocAssignments, setMoocAssignments] = useState<MoocCoordinatorAssignment[]>([]);
  const [isLoadingMoocAssign, setIsLoadingMoocAssign] = useState(true);
  const [selectedFacultyMooc, setSelectedFacultyMooc] = useState('');
  const [selectedSemesterMooc, setSelectedSemesterMooc] = useState('');
  const [isSubmittingMooc, setIsSubmittingMooc] = useState(false);


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

  // Effect to load subjects for assignment when department or semester changes
  useEffect(() => {
    if (selectedDepartmentSub && selectedSemesterSub) {
      setIsLoadingAvailableSubjects(true);
      fetchSubjectsByDepartmentAndSemesterAction(selectedDepartmentSub, parseInt(selectedSemesterSub))
        .then(subjects => {
          setAvailableSubjectsForAssignment(subjects);
          setSelectedSubjectInfo(null); // Reset selected subject
        })
        .catch(err => {
          toast({ title: "Error", description: "Could not load subjects for the selected department/semester.", variant: "destructive" });
          setAvailableSubjectsForAssignment([]);
        })
        .finally(() => setIsLoadingAvailableSubjects(false));
    } else {
      setAvailableSubjectsForAssignment([]);
      setSelectedSubjectInfo(null);
    }
  }, [selectedDepartmentSub, selectedSemesterSub, toast]);


  // Subject Assignment Handlers
  const handleAddSubjectAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultySub || !selectedSubjectInfo || !selectedSemesterSub || !selectedSectionSub || !selectedDepartmentSub) {
      toast({ title: "Missing Information", description: "Please select faculty, department, semester, subject, and section.", variant: "destructive" });
      return;
    }
    setIsSubmittingSub(true);
    try {
      const newAssignment = await addFacultySubjectAssignmentAction({
        facultyId: selectedFacultySub,
        subjectCode: selectedSubjectInfo.code,
        subjectName: selectedSubjectInfo.name, // Subject name is from the selected Subject object
        semester: parseInt(selectedSemesterSub),
        section: selectedSectionSub,
        // department is implicitly part of the subject selection now, not stored in FacultySubjectAssignment directly
      });
      setSubjectAssignments(prev => [...prev, newAssignment]);
      toast({ title: "Success", description: "Subject assignment added.", className: "bg-success text-success-foreground" });
      setSelectedFacultySub('');
      setSelectedSubjectInfo(null);
      // Keep department, semester, section for potentially more assignments to same class
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleDeleteSubjectAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this subject assignment?")) return;
    setIsLoadingSubAssign(true); 
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
    </div>
  );

  const TableSkeleton = () => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead><Skeleton className="h-6 w-full"/></TableHead>
                <TableHead><Skeleton className="h-6 w-full"/></TableHead>
                <TableHead><Skeleton className="h-6 w-full"/></TableHead>
                <TableHead className="text-right"><Skeleton className="h-6 w-16 ml-auto"/></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                    <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                    <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto"/></TableCell>
                </TableRow>
            ))}
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

        <TabsContent value="subjectAssignments">
          <Card>
            <CardHeader>
              <CardTitle>Assign Subject to Faculty</CardTitle>
              <CardDescription>Map faculty members to specific subjects, semesters, and sections they will teach. Subjects are based on definitions in Subject Management.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFaculty ? <FormSkeleton /> : (
                <form onSubmit={handleAddSubjectAssignment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                      <Label htmlFor="departmentSub" className="flex items-center"><Building className="mr-1 h-3 w-3 text-muted-foreground"/>Department</Label>
                      <Select value={selectedDepartmentSub} onValueChange={v => {setSelectedDepartmentSub(v); setSelectedSemesterSub(''); setSelectedSubjectInfo(null);}} required>
                        <SelectTrigger id="departmentSub"><SelectValue placeholder="Select Department" /></SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="semesterSub">Semester</Label>
                      <Select value={selectedSemesterSub} onValueChange={v => {setSelectedSemesterSub(v); setSelectedSubjectInfo(null);}} required disabled={!selectedDepartmentSub}>
                        <SelectTrigger id="semesterSub"><SelectValue placeholder="Select Semester" /></SelectTrigger>
                        <SelectContent>{SEMESTERS.map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                     <div>
                      <Label htmlFor="subjectSub">Subject</Label>
                      <Select 
                        value={selectedSubjectInfo?.code || ''} 
                        onValueChange={code => {
                            const subject = availableSubjectsForAssignment.find(s => s.subjectCode === code);
                            setSelectedSubjectInfo(subject ? { code: subject.subjectCode, name: subject.subjectName } : null);
                        }} 
                        required 
                        disabled={!selectedSemesterSub || isLoadingAvailableSubjects || availableSubjectsForAssignment.length === 0}
                      >
                        <SelectTrigger id="subjectSub">
                            <SelectValue placeholder={
                                isLoadingAvailableSubjects ? "Loading subjects..." :
                                (selectedDepartmentSub && selectedSemesterSub && availableSubjectsForAssignment.length === 0 ? "No subjects for dept/sem" : "Select Subject")
                            } />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSubjectsForAssignment.map(s => <SelectItem key={s.subjectCode} value={s.subjectCode}>{s.subjectName} ({s.subjectCode})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sectionSub">Section</Label>
                      <Select value={selectedSectionSub} onValueChange={setSelectedSectionSub} required disabled={!selectedSemesterSub}>
                        <SelectTrigger id="sectionSub"><SelectValue placeholder="Select Section" /></SelectTrigger>
                        <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>Sec {s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmittingSub || isLoadingFaculty || isLoadingAvailableSubjects}>
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
