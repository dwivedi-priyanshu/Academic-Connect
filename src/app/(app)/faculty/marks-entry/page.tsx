
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark, StudentProfile } from '@/types';
import { Edit3, Save, BarChart, Info, Users, PlusCircle } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchStudentProfilesForMarksEntry, saveMultipleStudentMarksAction } from '@/actions/marks-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
const SUBJECTS_BY_SEMESTER: Record<string, { code: string, name: string }[]> = {
  "1": [{ code: "MA101", name: "Applied Mathematics I" }, { code: "PH102", name: "Engineering Physics" }],
  "2": [{ code: "MA201", name: "Applied Mathematics II" }, { code: "CH202", name: "Engineering Chemistry" }],
  "3": [{ code: "CS201", name: "Data Structures" }, { code: "CS202", name: "Discrete Mathematics" }, { code: "MA201", name: "Probability & Statistics" }, { code: "DDCO", name: "Digital Design & Comp Org"}],
  "4": [{ code: "CS401", name: "Algorithms" }, { code: "CS402", name: "Operating Systems" }],
  // Add more semesters and subjects
};

interface StudentWithMarks extends StudentProfile {
  marks?: Partial<SubjectMark>; // Marks for the current subject
}


export default function MarksEntryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  const [subjectsForSemester, setSubjectsForSemester] = useState<{ code: string, name: string }[]>([]);
  
  const [studentsForEntry, setStudentsForEntry] = useState<StudentWithMarks[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);

  useEffect(() => {
    setSubjectsForSemester(SUBJECTS_BY_SEMESTER[selectedSemester] || []);
    setSelectedSubject(null);
    setStudentsForEntry([]);
    setInitialLoadAttempted(false);
  }, [selectedSemester]);

  useEffect(() => {
     setStudentsForEntry([]);
     setInitialLoadAttempted(false);
  }, [selectedSection, selectedSubject])


  const loadStudentsAndMarks = useCallback(async () => {
    if (user && selectedSemester && selectedSection && selectedSubject) {
      setIsLoading(true);
      setInitialLoadAttempted(true);
      try {
        const data = await fetchStudentProfilesForMarksEntry(
          parseInt(selectedSemester),
          selectedSection,
          selectedSubject.code,
          user.id
        );
        
        setStudentsForEntry(data.map(item => ({
          ...item.profile,
          // Initialize marks structure if not present or ensure all fields are there
          marks: item.marks ? {
            studentId: item.profile.userId, // Ensure studentId is set from profile
            usn: item.profile.admissionId,
            studentName: item.profile.fullName,
            subjectCode: selectedSubject.code,
            subjectName: selectedSubject.name,
            semester: parseInt(selectedSemester),
            ia1_50: item.marks.ia1_50 ?? null,
            ia2_50: item.marks.ia2_50 ?? null,
            assignment1_20: item.marks.assignment1_20 ?? null,
            assignment2_20: item.marks.assignment2_20 ?? null,
          } : {
            studentId: item.profile.userId,
            usn: item.profile.admissionId,
            studentName: item.profile.fullName,
            subjectCode: selectedSubject.code,
            subjectName: selectedSubject.name,
            semester: parseInt(selectedSemester),
            ia1_50: null, ia2_50: null, assignment1_20: null, assignment2_20: null
          }
        })));
        if (data.length === 0) {
            toast({title: "No Students", description: "No students found for this class/section combination.", variant: "default"});
        }
      } catch (error) {
        console.error("Error fetching students/marks:", error);
        toast({ title: "Error", description: "Could not load student data.", variant: "destructive" });
        setStudentsForEntry([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, selectedSemester, selectedSection, selectedSubject, toast]);

  useEffect(() => {
    if (selectedSemester && selectedSection && selectedSubject && user) {
        loadStudentsAndMarks();
    } else {
        setStudentsForEntry([]);
        setInitialLoadAttempted(false);
    }
  }, [loadStudentsAndMarks, selectedSemester, selectedSection, selectedSubject, user]);


  const handleMarkChange = (studentUserId: string, field: keyof SubjectMark, value: string) => {
    const numericValue = value === '' || value === null || isNaN(parseFloat(value)) ? null : parseFloat(value);
    const maxValues: Record<string, number> = { ia1_50: 50, ia2_50: 50, assignment1_20: 20, assignment2_20: 20 };

    if (numericValue !== null && (numericValue < 0 || (maxValues[field] !== undefined && numericValue > maxValues[field]))) {
      toast({ title: "Invalid Mark", description: `Mark must be between 0 and ${maxValues[field]}.`, variant: "destructive" });
      return; // Or revert UI change
    }

    setStudentsForEntry(prev =>
      prev.map(student =>
        student.userId === studentUserId
          ? { ...student, marks: { ...(student.marks as SubjectMark), [field]: numericValue } }
          : student
      )
    );
  };

  const handleSaveChanges = async () => {
    if (!user || !selectedSemester || !selectedSection || !selectedSubject || studentsForEntry.length === 0) {
      toast({ title: "Cannot Save", description: "No data or selection incomplete.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const marksToSave: SubjectMark[] = studentsForEntry
      .map(s => s.marks as SubjectMark) // Cast as SubjectMark, assuming structure is correct
      .filter(m => m && (m.ia1_50 !== null || m.ia2_50 !== null || m.assignment1_20 !== null || m.assignment2_20 !== null)); // Only save if at least one mark is entered

    if (marksToSave.length === 0) {
        toast({ title: "No Marks to Save", description: "No marks have been entered or changed.", variant: "default" });
        setIsSaving(false);
        return;
    }
    
    // Ensure all required fields for SubjectMark are present
     const validatedMarksToSave = marksToSave.map(m => ({
        id: `${m.studentId}-${m.subjectCode}-${m.semester}`, // Ensure ID is correctly formed
        _id: `${m.studentId}-${m.subjectCode}-${m.semester}`,
        ...m,
        // Ensure these are properly populated from the student's profile data / selection
        studentId: m.studentId,
        usn: studentsForEntry.find(s => s.userId === m.studentId)?.admissionId || 'N/A',
        studentName: studentsForEntry.find(s => s.userId === m.studentId)?.fullName || 'N/A',
        subjectCode: selectedSubject!.code,
        subjectName: selectedSubject!.name,
        semester: parseInt(selectedSemester),
    }));


    try {
      const result = await saveMultipleStudentMarksAction(validatedMarksToSave, user.id);
      if (result.success) {
        toast({ title: "Changes Saved", description: result.message, className: "bg-success text-success-foreground" });
        loadStudentsAndMarks(); // Refresh data
      } else {
        toast({ title: "Save Failed", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error saving marks:", error);
      toast({ title: "Save Error", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const calculateSummary = useMemo(() => {
    const marksList = studentsForEntry.map(s => s.marks).filter(Boolean) as SubjectMark[];
    if (marksList.length === 0) return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    
    const validForCalc = marksList.filter(m => m.ia1_50 !== null || m.ia2_50 !== null || m.assignment1_20 !== null || m.assignment2_20 !== null);
    const count = validForCalc.length;
    if (count === 0) return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };

    const sum = (field: keyof SubjectMark) => validForCalc.reduce((acc, m) => acc + (typeof m[field] === 'number' ? m[field] as number : 0), 0);
    const numValid = (field: keyof SubjectMark) => validForCalc.filter(m => typeof m[field] === 'number').length;

    return {
        count: studentsForEntry.length, // Total students in list
        avgIA1: numValid('ia1_50') > 0 ? (sum('ia1_50') / numValid('ia1_50')).toFixed(2) : 'N/A',
        avgIA2: numValid('ia2_50') > 0 ? (sum('ia2_50') / numValid('ia2_50')).toFixed(2) : 'N/A',
        avgAssign1: numValid('assignment1_20') > 0 ? (sum('assignment1_20') / numValid('assignment1_20')).toFixed(2) : 'N/A',
        avgAssign2: numValid('assignment2_20') > 0 ? (sum('assignment2_20') / numValid('assignment2_20')).toFixed(2) : 'N/A',
    };
  }, [studentsForEntry]);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  const selectionMade = !!(selectedSemester && selectedSection && selectedSubject);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><Edit3 className="mr-2 h-8 w-8 text-primary" /> Marks Entry</h1>

      {/* Step 1: Selection */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class and Subject</CardTitle>
          <CardDescription>Choose the semester, section, and subject to enter or view marks.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="semester">Semester</Label>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger id="semester"><SelectValue placeholder="Select Semester" /></SelectTrigger>
              <SelectContent>
                {SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="section">Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedSemester}>
              <SelectTrigger id="section"><SelectValue placeholder="Select Section" /></SelectTrigger>
              <SelectContent>
                {SECTIONS.map(sec => <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="subject">Subject</Label>
            <Select
              value={selectedSubject?.code || ""}
              onValueChange={(code) => setSelectedSubject(subjectsForSemester.find(s => s.code === code) || null)}
              disabled={!selectedSection || subjectsForSemester.length === 0}
            >
              <SelectTrigger id="subject"><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>
                {subjectsForSemester.length > 0 ? (
                    subjectsForSemester.map(sub => <SelectItem key={sub.code} value={sub.code}>{sub.name} ({sub.code})</SelectItem>)
                ) : (
                    <SelectItem value="-" disabled>No subjects for this semester</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Display & Edit Marks Table */}
       {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Enter Marks for {selectedSubject?.name} - Section {selectedSection}</CardTitle>
            <CardDescription>Input marks for each student. Click 'Save All Marks' when done.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="space-y-2">
                    <p className="text-center text-muted-foreground py-4">Loading student data...</p>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                 </div>
            ) : studentsForEntry.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">USN</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center w-28">IA 1 (50)</TableHead>
                      <TableHead className="text-center w-28">IA 2 (50)</TableHead>
                      <TableHead className="text-center w-32">Assign 1 (20)</TableHead>
                      <TableHead className="text-center w-32">Assign 2 (20)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForEntry.map((student) => (
                      <TableRow key={student.userId}>
                        <TableCell className="font-mono text-xs">{student.admissionId}</TableCell>
                        <TableCell className="font-medium">{student.fullName}</TableCell>
                        {(['ia1_50', 'ia2_50', 'assignment1_20', 'assignment2_20'] as const).map(field => (
                          <TableCell key={field} className="px-1 py-1">
                            <Input
                              type="number"
                              className="w-24 text-center mx-auto bg-background h-9 text-sm"
                              value={student.marks?.[field] === null || student.marks?.[field] === undefined ? '' : String(student.marks?.[field])}
                              onChange={(e) => handleMarkChange(student.userId, field, e.target.value)}
                              min="0"
                              max={field.includes('50') ? "50" : "20"}
                              disabled={isSaving}
                              placeholder="N/A"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
                    <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save All Marks'}
                  </Button>
                </div>
              </div>
            ) : (
                 initialLoadAttempted && (
                    <p className="text-center py-8 text-muted-foreground">
                        No students found for this selection, or marks data is still loading.
                    </p>
                 )
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Performance Summary */}
      {selectionMade && !isLoading && studentsForEntry.length > 0 && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary" /> Performance Summary</CardTitle>
                    <CardDescription>Overall statistics for {selectedSubject?.name} - Section {selectedSection}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Students</p>
                            <p className="text-2xl font-bold">{calculateSummary.count}</p>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. IA 1</p>
                            <p className="text-2xl font-bold">{calculateSummary.avgIA1}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. IA 2</p>
                            <p className="text-2xl font-bold">{calculateSummary.avgIA2}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. Assign 1</p>
                            <p className="text-2xl font-bold">{calculateSummary.avgAssign1}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. Assign 2</p>
                            <p className="text-2xl font-bold">{calculateSummary.avgAssign2}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
       )}

      {/* Initial state message */}
       {!selectionMade && !isLoading && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Select Class to Begin</AlertTitle>
            <AlertDescription>Please select a semester, section, and subject above to view or enter marks.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}
