'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark, StudentProfile } from '@/types';
import { Edit3, Save, BarChart, Info, Users, PlusCircle, Trash2 } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchStudentProfilesForMarksEntry, saveMultipleStudentMarksAction } from '@/actions/marks-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
// This subject list should ideally be fetched from a database or a more centralized configuration
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

// Interface for the data structure used in the form for each student
interface StudentMarksEntryData {
  profile: StudentProfile;
  marks: SubjectMark;
}

export default function MarksEntryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  const [subjectsForSemester, setSubjectsForSemester] = useState<{ code: string, name: string }[]>([]);
  
  const [studentsMarksEntries, setStudentsMarksEntries] = useState<StudentMarksEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);

  useEffect(() => {
    setSubjectsForSemester(SUBJECTS_BY_SEMESTER[selectedSemester] || []);
    setSelectedSubject(null);
    setStudentsMarksEntries([]);
    setInitialLoadAttempted(false);
  }, [selectedSemester]);

  useEffect(() => {
     setStudentsMarksEntries([]);
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
        
        const transformedData: StudentMarksEntryData[] = data.map(item => {
          const baseMarks: SubjectMark = {
            id: `${item.profile.userId}-${selectedSubject!.code}-${selectedSemester}`,
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
            profile: item.profile,
            marks: item.marks ? { ...baseMarks, ...item.marks } : baseMarks,
          };
        });
        
        setStudentsMarksEntries(transformedData);

        if (transformedData.length === 0) {
            toast({title: "No Students Found", description: "No active students found for this class/section. Ensure student accounts are 'Active' and have assigned USNs.", variant: "default"});
        }
      } catch (error) {
        console.error("Error fetching students/marks:", error);
        toast({ title: "Error Loading Data", description: (error as Error).message || "Could not load student data. Please check selections or try again.", variant: "destructive" });
        setStudentsMarksEntries([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setStudentsMarksEntries([]);
      setInitialLoadAttempted(false);
    }
  }, [user, selectedSemester, selectedSection, selectedSubject, toast]);

  useEffect(() => {
    if (selectedSemester && selectedSection && selectedSubject && user) {
        loadStudentsAndMarks();
    } else {
        setStudentsMarksEntries([]);
        setInitialLoadAttempted(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemester, selectedSection, selectedSubject, user]);


  const handleMarkChange = (studentUserId: string, field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50' | 'assignment1_20' | 'assignment2_20'>, value: string) => {
    const numericValue = value === '' || value === null || isNaN(parseFloat(value)) ? null : parseFloat(value);
    const maxValues: Record<string, number> = { ia1_50: 50, ia2_50: 50, assignment1_20: 20, assignment2_20: 20 };

    if (numericValue !== null && (numericValue < 0 || (maxValues[field] !== undefined && numericValue > maxValues[field]))) {
      toast({ title: "Invalid Mark", description: `Mark for ${field.replace('_', ' ').replace('ia', 'IA').replace('assignment', 'Assignment')} must be between 0 and ${maxValues[field]}.`, variant: "destructive" });
      return; 
    }

    setStudentsMarksEntries(prev =>
      prev.map(entry =>
        entry.profile.userId === studentUserId
          ? { ...entry, marks: { ...entry.marks, [field]: numericValue } }
          : entry
      )
    );
  };

  const handleAddStudentRow = () => {
    if (!selectedSemester || !selectedSection || !selectedSubject) {
      toast({ title: "Selection Required", description: "Please select semester, section, and subject first.", variant: "destructive"});
      return;
    }
    const newStudentId = `temp-${Date.now()}`; // Temporary unique ID for new row
    const newEntry: StudentMarksEntryData = {
      profile: { 
        // This is a placeholder profile. A real implementation might involve searching for an existing student.
        // For now, it allows manual USN and name entry.
        // Ensure all StudentProfile fields are technically present, even if blank or default.
        id: newStudentId, 
        _id: newStudentId,
        userId: newStudentId, // This will be the key for this row
        admissionId: '', 
        fullName: '', 
        dateOfBirth: '', 
        contactNumber: '', 
        address: '', 
        department: 'Not Specified', 
        year: Math.ceil(parseInt(selectedSemester)/2),
        section: selectedSection, 
        parentName: '', 
        parentContact: '',
      },
      marks: {
        id: `${newStudentId}-${selectedSubject.code}-${selectedSemester}`,
        _id: `${newStudentId}-${selectedSubject.code}-${selectedSemester}`,
        studentId: newStudentId,
        usn: '',
        studentName: '',
        subjectCode: selectedSubject.code,
        subjectName: selectedSubject.name,
        semester: parseInt(selectedSemester),
        ia1_50: null,
        ia2_50: null,
        assignment1_20: null,
        assignment2_20: null,
      }
    };
    setStudentsMarksEntries(prev => [...prev, newEntry]);
  };

  const handleRemoveStudentRow = (studentUserId: string) => {
    setStudentsMarksEntries(prev => prev.filter(entry => entry.profile.userId !== studentUserId));
  };

  const handleStudentDetailChange = (studentUserId: string, field: 'admissionId' | 'fullName', value: string) => {
     setStudentsMarksEntries(prev => 
      prev.map(entry => {
        if (entry.profile.userId === studentUserId) {
          return {
            ...entry,
            profile: { ...entry.profile, [field]: value },
            marks: { ...entry.marks, [field === 'admissionId' ? 'usn' : 'studentName']: value }
          };
        }
        return entry;
      })
    );
  };

  const handleSaveChanges = async () => {
    if (!user || !selectedSemester || !selectedSection || !selectedSubject || studentsMarksEntries.length === 0) {
      toast({ title: "Cannot Save", description: "No data to save or selection incomplete.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    // Filter out rows where USN or Student Name is empty for newly added rows
    // And validate existing student rows
    const marksToSave = studentsMarksEntries.filter(entry => {
      if (entry.profile.userId.startsWith('temp-')) { // New row
        return entry.marks.usn.trim() !== '' && entry.marks.studentName.trim() !== '';
      }
      return true; // Existing student, assume valid for now
    }).map(entry => entry.marks);

    if (marksToSave.length === 0) {
        toast({ title: "No Valid Marks to Save", description: "Please ensure USN and Name are filled for all manually added students.", variant: "default" });
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
         if (result.errors) {
            console.error("Save errors:", result.errors);
            // Potentially display more detailed errors
        }
      }
    } catch (error: any) {
      console.error("Error saving marks:", error);
      toast({ title: "Save Error", description: `An unexpected error occurred: ${error.message || "Please try again."}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const calculateSummary = useMemo(() => {
    const marksList = studentsMarksEntries.map(s => s.marks);
    if (marksList.length === 0) return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    
    const validForCalc = marksList.filter(m => m.ia1_50 !== null || m.ia2_50 !== null || m.assignment1_20 !== null || m.assignment2_20 !== null);
    const totalStudentsInList = studentsMarksEntries.length;
    
    if (validForCalc.length === 0 && totalStudentsInList > 0) {
        return { count: totalStudentsInList, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    }
    if (totalStudentsInList === 0) {
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
  }, [studentsMarksEntries]);

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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class and Subject</CardTitle>
          <CardDescription>Choose the semester, section, and subject to enter or view marks. Students must be 'Active' and have an assigned USN to appear, or you can add them manually.</CardDescription>
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

       {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Enter Marks: {selectedSubject?.name} ({selectedSubject?.code}) - Sem {selectedSemester}, Sec {selectedSection}</CardTitle>
                <CardDescription>Input marks for each student. Click 'Save All Marks' when done. Ensure USNs and Names are correct.</CardDescription>
              </div>
              <Button onClick={handleAddStudentRow} variant="outline" size="sm" disabled={isSaving || isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Student Row
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="space-y-2">
                    <p className="text-center text-muted-foreground py-4">Loading student data...</p>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                 </div>
            ) : studentsMarksEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px] sticky left-0 bg-card z-10">USN</TableHead>
                      <TableHead className="w-[200px] sticky left-[180px] bg-card z-10">Student Name</TableHead>
                      <TableHead className="text-center w-28">IA 1 (50)</TableHead>
                      <TableHead className="text-center w-28">IA 2 (50)</TableHead>
                      <TableHead className="text-center w-32">Assign 1 (20)</TableHead>
                      <TableHead className="text-center w-32">Assign 2 (20)</TableHead>
                      <TableHead className="text-center w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsMarksEntries.map((entry) => (
                      <TableRow key={entry.profile.userId}>
                        <TableCell className="font-mono text-xs sticky left-0 bg-card z-10 px-1 py-1">
                           <Input
                                type="text"
                                className="w-full text-xs bg-background h-9"
                                value={entry.marks.usn}
                                onChange={(e) => handleStudentDetailChange(entry.profile.userId, 'admissionId', e.target.value.toUpperCase())}
                                disabled={isSaving || !entry.profile.userId.startsWith('temp-')} // Disable if not a new temp row
                                placeholder="Enter USN"
                            />
                        </TableCell>
                        <TableCell className="font-medium sticky left-[180px] bg-card z-10 px-1 py-1">
                           <Input
                                type="text"
                                className="w-full text-sm bg-background h-9"
                                value={entry.marks.studentName}
                                onChange={(e) => handleStudentDetailChange(entry.profile.userId, 'fullName', e.target.value)}
                                disabled={isSaving || !entry.profile.userId.startsWith('temp-')}
                                placeholder="Enter Name"
                            />
                        </TableCell>
                        {(['ia1_50', 'ia2_50', 'assignment1_20', 'assignment2_20'] as const).map(field => (
                          <TableCell key={field} className="px-1 py-1">
                            <Input
                              type="number"
                              className="w-24 text-center mx-auto bg-background h-9 text-sm"
                              value={entry.marks?.[field] === null || entry.marks?.[field] === undefined ? '' : String(entry.marks?.[field])}
                              onChange={(e) => handleMarkChange(entry.profile.userId, field, e.target.value)}
                              min="0"
                              max={field.includes('50') ? "50" : "20"}
                              disabled={isSaving}
                              placeholder="N/A"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center px-1 py-1">
                          {entry.profile.userId.startsWith('temp-') && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveStudentRow(entry.profile.userId)} disabled={isSaving}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
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
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="mx-auto h-12 w-12 mb-4" />
                        <p className="text-lg">No active students loaded for this selection.</p>
                        <p>You can add students manually using the button above or check if students are approved with USNs.</p>
                    </div>
                 )
            )}
          </CardContent>
        </Card>
      )}

      {selectionMade && !isLoading && studentsMarksEntries.length > 0 && (
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
