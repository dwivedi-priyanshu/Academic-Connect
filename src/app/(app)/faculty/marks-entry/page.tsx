
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
  "3": [{ code: "CS301", name: "Data Structures" }, { code: "CS302", name: "Discrete Mathematics" }, { code: "EC303", name: "Analog Electronics" }, { code: "CS304", name: "Digital Design & Comp Org"}],
  "4": [{ code: "CS401", name: "Algorithms" }, { code: "CS402", name: "Operating Systems" }, { code: "EC403", name: "Microcontrollers"} ],
  "5": [{ code: "CS501", name: "Database Management" }, { code: "CS502", name: "Computer Networks" }],
  "6": [{ code: "CS601", name: "Compiler Design" }, { code: "CS602", name: "Software Engineering" }],
  "7": [{ code: "CS701", name: "Artificial Intelligence" }, { code: "CS702", name: "Cryptography" }],
  "8": [{ code: "CS801", name: "Project Work" }, { code: "CS802", name: "Professional Elective" }],
};

interface StudentWithMarksData extends StudentProfile {
  marks: SubjectMark; // Marks for the current subject, ensure all fields are present
}


export default function MarksEntryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  const [subjectsForSemester, setSubjectsForSemester] = useState<{ code: string, name: string }[]>([]);
  
  const [studentsForEntry, setStudentsForEntry] = useState<StudentWithMarksData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);

  useEffect(() => {
    setSubjectsForSemester(SUBJECTS_BY_SEMESTER[selectedSemester] || []);
    setSelectedSubject(null); // Reset subject when semester changes
    setStudentsForEntry([]);
    setInitialLoadAttempted(false);
  }, [selectedSemester]);

  useEffect(() => {
     // Reset students when section or subject changes before new load
     setStudentsForEntry([]);
     setInitialLoadAttempted(false);
  }, [selectedSection, selectedSubject])


  const loadStudentsAndMarks = useCallback(async () => {
    if (user && selectedSemester && selectedSection && selectedSubject) {
      setIsLoading(true);
      setInitialLoadAttempted(true); // Mark that a load has been attempted for current selections
      try {
        const data = await fetchStudentProfilesForMarksEntry(
          parseInt(selectedSemester),
          selectedSection,
          selectedSubject.code,
          user.id
        );
        
        // Transform data to ensure `marks` object is always present and fully initialized
        const transformedData: StudentWithMarksData[] = data.map(item => {
          // Ensure all required fields are present in the marks object
          const baseMarks: SubjectMark = {
            id: `${item.profile.userId}-${selectedSubject!.code}-${selectedSemester}`, // Use user ID for studentId
            _id: `${item.profile.userId}-${selectedSubject!.code}-${selectedSemester}`,
            studentId: item.profile.userId, 
            usn: item.profile.admissionId,
            studentName: item.profile.fullName,
            subjectCode: selectedSubject!.code,
            subjectName: selectedSubject!.name,
            semester: parseInt(selectedSemester),
            ia1_50: null,
            ia2_50: null,
            assignment1_20: null,
            assignment2_20: null,
          };
          return {
            ...item.profile,
            marks: item.marks ? { ...baseMarks, ...item.marks } : baseMarks,
          };
        });
        
        setStudentsForEntry(transformedData);

        if (transformedData.length === 0) {
            toast({title: "No Students Found", description: "No active students found for this class/section. Ensure student accounts are 'Active' and have assigned USNs.", variant: "default"});
        }
      } catch (error) {
        console.error("Error fetching students/marks:", error);
        toast({ title: "Error Loading Data", description: (error as Error).message || "Could not load student data. Please check selections or try again.", variant: "destructive" });
        setStudentsForEntry([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Clear data if selections are incomplete
      setStudentsForEntry([]);
      setInitialLoadAttempted(false);
    }
  }, [user, selectedSemester, selectedSection, selectedSubject, toast]);

  // Trigger loadStudentsAndMarks when selections change
  useEffect(() => {
    if (selectedSemester && selectedSection && selectedSubject && user) {
        loadStudentsAndMarks();
    } else {
        // Clear data if selections are not complete
        setStudentsForEntry([]);
        setInitialLoadAttempted(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemester, selectedSection, selectedSubject, user]); // loadStudentsAndMarks is memoized and stable


  const handleMarkChange = (studentUserId: string, field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50' | 'assignment1_20' | 'assignment2_20'>, value: string) => {
    const numericValue = value === '' || value === null || isNaN(parseFloat(value)) ? null : parseFloat(value);
    const maxValues: Record<string, number> = { ia1_50: 50, ia2_50: 50, assignment1_20: 20, assignment2_20: 20 };

    if (numericValue !== null && (numericValue < 0 || (maxValues[field] !== undefined && numericValue > maxValues[field]))) {
      toast({ title: "Invalid Mark", description: `Mark for ${field.replace('_', ' ')} must be between 0 and ${maxValues[field]}.`, variant: "destructive" });
      // Potentially revert UI change here or prevent it
      return; 
    }

    setStudentsForEntry(prev =>
      prev.map(student =>
        student.userId === studentUserId
          ? { ...student, marks: { ...student.marks, [field]: numericValue } }
          : student
      )
    );
  };

  const handleSaveChanges = async () => {
    if (!user || !selectedSemester || !selectedSection || !selectedSubject || studentsForEntry.length === 0) {
      toast({ title: "Cannot Save", description: "No data to save or selection incomplete. Please select semester, section, subject and ensure students are loaded.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    // Prepare marks for saving: ensure all required fields from StudentProfile are included in SubjectMark
    const marksToSave: SubjectMark[] = studentsForEntry.map(student => student.marks);

    if (marksToSave.length === 0) {
        toast({ title: "No Marks to Save", description: "No marks have been entered or changed for any student.", variant: "default" });
        setIsSaving(false);
        return;
    }
    
    try {
      const result = await saveMultipleStudentMarksAction(marksToSave, user.id);
      if (result.success) {
        toast({ title: "Changes Saved", description: result.message, className: "bg-success text-success-foreground" });
        loadStudentsAndMarks(); // Refresh data from DB
      } else {
        toast({ title: "Save Failed", description: result.message || "Could not save marks.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error saving marks:", error);
      toast({ title: "Save Error", description: `An unexpected error occurred: ${error.message || "Please try again."}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const calculateSummary = useMemo(() => {
    const marksList = studentsForEntry.map(s => s.marks);
    if (marksList.length === 0) return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    
    const validForCalc = marksList.filter(m => m.ia1_50 !== null || m.ia2_50 !== null || m.assignment1_20 !== null || m.assignment2_20 !== null);
    const totalStudentsInList = studentsForEntry.length; // Count of all students fetched for the class
    
    if (validForCalc.length === 0 && totalStudentsInList > 0) { // Students exist, but no marks entered yet
        return { count: totalStudentsInList, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    }
    if (totalStudentsInList === 0) { // No students fetched
        return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    }


    const sum = (field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50' | 'assignment1_20' | 'assignment2_20'>) => 
        validForCalc.reduce((acc, m) => acc + (typeof m[field] === 'number' ? m[field] as number : 0), 0);
    
    const numValid = (field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50' | 'assignment1_20' | 'assignment2_20'>) => 
        validForCalc.filter(m => typeof m[field] === 'number').length;

    return {
        count: totalStudentsInList,
        avgIA1: numValid('ia1_50') > 0 ? (sum('ia1_50') / numValid('ia1_50')).toFixed(2) : 'N/A',
        avgIA2: numValid('ia2_50') > 0 ? (sum('ia2_50') / numValid('ia2_50')).toFixed(2) : 'N/A',
        avgAssign1: numValid('assignment1_20') > 0 ? (sum('assignment1_20') / numValid('assignment1_20')).toFixed(2) : 'N/A',
        avgAssign2: numValid('assignment2_20') > 0 ? (sum('assignment2_20') / numValid('assignment2_20')).toFixed(2) : 'N/A',
    };
  }, [studentsForEntry]);


  if (!user || user.role !== 'Faculty') {
    return (
        <div className="flex flex-col items-center justify-center h-full p-10">
            <Edit3 className="w-16 h-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is for faculty members only.</p>
        </div>
    );
  }

  const selectionMade = !!(selectedSemester && selectedSection && selectedSubject);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><Edit3 className="mr-2 h-8 w-8 text-primary" /> Marks Entry</h1>

      {/* Step 1: Selection */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class and Subject</CardTitle>
          <CardDescription>Choose the semester, section, and subject to enter or view marks. Students must be 'Active' and have an assigned USN to appear.</CardDescription>
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
            <CardTitle>Enter Marks: {selectedSubject?.name} ({selectedSubject?.code}) - Sem {selectedSemester}, Sec {selectedSection}</CardTitle>
            <CardDescription>Input marks for each student. Click 'Save All Marks' when done. Ensure USNs are correct as they link marks to students.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="space-y-2">
                    <p className="text-center text-muted-foreground py-4">Loading student data...</p>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                 </div>
            ) : studentsForEntry.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px] sticky left-0 bg-card z-10">USN</TableHead>
                      <TableHead className="sticky left-[120px] bg-card z-10">Student Name</TableHead>
                      <TableHead className="text-center w-28">IA 1 (50)</TableHead>
                      <TableHead className="text-center w-28">IA 2 (50)</TableHead>
                      <TableHead className="text-center w-32">Assign 1 (20)</TableHead>
                      <TableHead className="text-center w-32">Assign 2 (20)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForEntry.map((student) => (
                      <TableRow key={student.userId}>
                        <TableCell className="font-mono text-xs sticky left-0 bg-card z-10">{student.admissionId}</TableCell>
                        <TableCell className="font-medium sticky left-[120px] bg-card z-10">{student.fullName}</TableCell>
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
                 initialLoadAttempted && ( // Show message only if load was attempted for the current selection
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="mx-auto h-12 w-12 mb-4" />
                        <p className="text-lg">No active students found for this selection.</p>
                        <p>Please ensure students are registered, approved by admin with a USN, and match the selected semester/section.</p>
                    </div>
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
                    <CardDescription>Overall statistics for {selectedSubject?.name} - Section {selectedSection}. (Based on currently displayed/entered marks)</CardDescription>
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

      {/* Initial state message or if selections are cleared */}
       {!selectionMade && !isLoading && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Select Class to Begin</AlertTitle>
            <AlertDescription>Please select a semester, section, and subject above to view or enter marks for students.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}

```
  </change>
  <