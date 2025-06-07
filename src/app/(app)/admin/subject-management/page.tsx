
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { Subject } from '@/types';
import { BookCopy, PlusCircle, Trash2, ShieldCheck, Building } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { 
  fetchSubjectsByDepartmentAndSemesterAction, 
  addSubjectAction, 
  deleteSubjectAction 
} from '@/actions/admin-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { DEPARTMENTS } from '@/lib/subjects';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function AdminSubjectManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCredits, setNewSubjectCredits] = useState<string>(''); // Stored as string for input
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  const loadSubjects = useCallback(async () => {
    if (!selectedDepartment || !selectedSemester) {
      setSubjects([]);
      return;
    }
    setIsLoadingSubjects(true);
    try {
      const fetchedSubjects = await fetchSubjectsByDepartmentAndSemesterAction(selectedDepartment, parseInt(selectedSemester));
      setSubjects(fetchedSubjects);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load subjects.", variant: "destructive" });
      setSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  }, [selectedDepartment, selectedSemester, toast]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment || !selectedSemester || !newSubjectCode.trim() || !newSubjectName.trim() || !newSubjectCredits.trim()) {
      toast({ title: "Missing Information", description: "Please fill all subject details and select department/semester.", variant: "destructive" });
      return;
    }
    const creditsNum = parseInt(newSubjectCredits);
    if (isNaN(creditsNum) || creditsNum <= 0) {
      toast({ title: "Invalid Credits", description: "Credits must be a positive number.", variant: "destructive" });
      return;
    }

    setIsAddingSubject(true);
    try {
      const addedSubject = await addSubjectAction(
        selectedDepartment,
        parseInt(selectedSemester),
        newSubjectCode.trim().toUpperCase(),
        newSubjectName.trim(),
        creditsNum
      );
      setSubjects(prev => [...prev, addedSubject]);
      toast({ title: "Success", description: `Subject "${addedSubject.subjectName}" added.`, className: "bg-success text-success-foreground" });
      setNewSubjectCode('');
      setNewSubjectName('');
      setNewSubjectCredits('');
    } catch (error) {
      toast({ title: "Error Adding Subject", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsAddingSubject(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to delete the subject "${subjectName}"? This might affect existing faculty assignments if not updated.`)) return;
    setIsLoadingSubjects(true); // Use general loading for table update
    try {
      await deleteSubjectAction(subjectId);
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
      toast({ title: "Success", description: `Subject "${subjectName}" deleted.`, variant: "destructive" });
    } catch (error) {
      toast({ title: "Error Deleting Subject", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingSubjects(false);
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

  const TableSkeleton = () => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead><Skeleton className="h-6 w-1/3"/></TableHead>
                <TableHead><Skeleton className="h-6 w-2/3"/></TableHead>
                <TableHead><Skeleton className="h-6 w-1/6"/></TableHead>
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
      <h1 className="text-3xl font-bold flex items-center"><BookCopy className="mr-2 h-8 w-8 text-primary" /> Subject Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>Define Subjects for Departments and Semesters</CardTitle>
          <CardDescription>Manage the official list of subjects offered, including their codes, names, and credits.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="departmentSelect">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger id="departmentSelect"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="semesterSelect">Semester</Label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester} disabled={!selectedDepartment}>
                <SelectTrigger id="semesterSelect"><SelectValue placeholder="Select Semester" /></SelectTrigger>
                <SelectContent>{SEMESTERS.map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {selectedDepartment && selectedSemester && (
            <form onSubmit={handleAddSubject} className="space-y-4 border p-4 rounded-md bg-muted/30">
              <h3 className="text-lg font-medium">Add New Subject for {selectedDepartment} - Sem {selectedSemester}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="newSubjectCode">Subject Code</Label>
                  <Input id="newSubjectCode" value={newSubjectCode} onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())} placeholder="e.g., CS301" required />
                </div>
                <div>
                  <Label htmlFor="newSubjectName">Subject Name</Label>
                  <Input id="newSubjectName" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="e.g., Data Structures" required />
                </div>
                <div>
                  <Label htmlFor="newSubjectCredits">Credits</Label>
                  <Input id="newSubjectCredits" type="number" value={newSubjectCredits} onChange={(e) => setNewSubjectCredits(e.target.value)} placeholder="e.g., 4" min="1" required />
                </div>
              </div>
              <Button type="submit" disabled={isAddingSubject}>
                <PlusCircle className="mr-2 h-4 w-4" /> {isAddingSubject ? 'Adding...' : 'Add Subject'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>
                Subjects for {selectedDepartment ? `${selectedDepartment} ` : 'Selected Department '}{selectedSemester ? `- Semester ${selectedSemester}` : selectedDepartment ? '- Select Semester' : ''}
            </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSubjects ? <TableSkeleton /> : 
           !selectedDepartment || !selectedSemester ? <p className="text-muted-foreground">Please select a department and semester to view or add subjects.</p> :
           subjects.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Credits</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {subjects.map(subject => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-mono">{subject.subjectCode}</TableCell>
                    <TableCell>{subject.subjectName}</TableCell>
                    <TableCell className="text-center">{subject.credits}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject.id, subject.subjectName)} disabled={isLoadingSubjects}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-muted-foreground">No subjects defined for this department and semester yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
