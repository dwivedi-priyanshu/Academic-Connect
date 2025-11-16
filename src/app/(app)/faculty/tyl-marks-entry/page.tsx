
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark, StudentProfile, FacultySubjectAssignment } from '@/types';
import { Edit3, Save, BarChart, Info, Users, PlusCircle, Trash2 } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchStudentProfilesForMarksEntry, saveMultipleStudentMarksAction } from '@/actions/marks-actions';
import { fetchFacultyAssignmentsForClassAction } from '@/actions/faculty-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

import { isTYLSubject } from '@/lib/tyl-config';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];

interface StudentMarksEntryData {
  profile: StudentProfile;
  marks: SubjectMark;
}

export default function TYLMarksEntryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  
  const [assignedSubjectsForClass, setAssignedSubjectsForClass] = useState<{ code: string, name: string }[]>([]);
  const [isLoadingAssignedSubjects, setIsLoadingAssignedSubjects] = useState(false);
  
  const [studentsMarksEntries, setStudentsMarksEntries] = useState<StudentMarksEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);

  useEffect(() => {
    // When semester or section changes, reset subject and student list, then fetch assigned subjects
    setSelectedSubject(null);
    setStudentsMarksEntries([]);
    setInitialLoadAttempted(false);
    setAssignedSubjectsForClass([]);

    if (user && selectedSemester && selectedSection) {
      setIsLoadingAssignedSubjects(true);
      fetchFacultyAssignmentsForClassAction(user.id, parseInt(selectedSemester), selectedSection)
        .then(assignments => {
          // Filter only TYL subjects
          const tylSubjects = assignments
            .filter(a => isTYLSubject(a.subjectCode))
            .map(a => ({ code: a.subjectCode, name: a.subjectName }));
          setAssignedSubjectsForClass(tylSubjects);
          if (tylSubjects.length === 0) {
            toast({ title: "No TYL Subjects Assigned", description: "You are not assigned to teach any TYL subjects for the selected semester and section.", variant: "default" });
          }
        })
        .catch(err => {
          console.error("Error fetching assigned subjects:", err);
          toast({ title: "Error", description: "Could not load your assigned TYL subjects.", variant: "destructive" });
        })
        .finally(() => setIsLoadingAssignedSubjects(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedSemester, selectedSection, toast]);

  useEffect(() => {
     setStudentsMarksEntries([]);
     setInitialLoadAttempted(false);
  }, [selectedSubject])


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
            // TYL subjects don't have assignments
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
            toast({title: "No Students Found", description: "No active students found for this class/section with matching current semester. Ensure student profiles are up-to-date.", variant: "default"});
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


  const handleMarkChange = (studentUserId: string, field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50'>, value: string) => {
    const numericValue = value === '' || value === null || isNaN(parseFloat(value)) ? null : parseFloat(value);
    const maxValues: Record<string, number> = { ia1_50: 50, ia2_50: 50 };

    if (numericValue !== null && (numericValue < 0 || (maxValues[field] !== undefined && numericValue > maxValues[field]))) {
      toast({ title: "Invalid Mark", description: `Mark for ${field.replace('_', ' ').replace('ia', 'IA')} must be between 0 and ${maxValues[field]}.`, variant: "destructive" });
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
    const newStudentId = `temp-${Date.now()}`; 
    const newEntry: StudentMarksEntryData = {
      profile: { 
        id: newStudentId, 
        _id: newStudentId,
        userId: newStudentId, 
        admissionId: '', 
        fullName: '', 
        dateOfBirth: '', 
        contactNumber: '', 
        address: '', 
        department: 'Not Specified', 
        year: Math.ceil(parseInt(selectedSemester)/2),
        currentSemester: parseInt(selectedSemester),
        section: selectedSection, 
        parentName: '', 
        parentContact: '',
        fatherName: '',
        motherName: '',
        gender: '',
        bloodGroup: '',
        aadharNumber: '',
        category: '',
        religion: '',
        nationality: '',
        sslcMarks: '',
        pucMarks: '',
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
        // TYL subjects don't have assignments
        assignment1_20: null,
        assignment2_20: null,
      }
    };
    setStudentsMarksEntries(prev => [...prev, newEntry]);
  };

  const handleRemoveStudentRow = (studentUserId: string) => {
    setStudentsMarksEntries(prev => prev.filter(entry => entry.profile.userId !== studentUserId));
  };

  // Student names are auto-fetched from database, so we don't need this handler for TYL
  // But keeping it for USN updates if needed for manually added students
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
    const marksToSave = studentsMarksEntries.filter(entry => {
      if (entry.profile.userId.startsWith('temp-')) { 
        if (entry.marks.usn.trim() === '' || entry.marks.studentName.trim() === ''){
            toast({title: "Validation Error", description: `USN and Name are required for new student: ${entry.marks.studentName || entry.marks.usn || 'Unnamed Row'}. Row skipped.`, variant: "destructive"})
            return false;
        }
      }
      return true; 
    }).map(entry => entry.marks);

    if (marksToSave.length === 0) {
        toast({ title: "No Valid Marks to Save", description: "Please ensure USN and Name are filled for all manually added students, or no changes were made.", variant: "default" });
        setIsSaving(false);
        return;
    }
    
    try {
      const result = await saveMultipleStudentMarksAction(marksToSave, user.id);
      if (result.success) {
        toast({ title: "Changes Saved", description: result.message, className: "bg-success text-success-foreground" });
        loadStudentsAndMarks(); 
      } else {
        toast({ title: "Save Failed", description: result.message || "Could not save marks.", variant: "destructive" });
         if (result.errors) {
            console.error("Save errors:", result.errors);
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
    if (marksList.length === 0) return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', totalAvg: 'N/A' };
    
    const validForCalc = marksList.filter(m => m.ia1_50 !== null || m.ia2_50 !== null);
    const totalStudentsInList = studentsMarksEntries.length;
    
    if (validForCalc.length === 0 && totalStudentsInList > 0) {
        return { count: totalStudentsInList, avgIA1: 'N/A', avgIA2: 'N/A', totalAvg: 'N/A' };
    }
    if (totalStudentsInList === 0) {
        return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', totalAvg: 'N/A' };
    }

    const sum = (field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50'>) => 
        validForCalc.reduce((acc, m) => acc + (typeof m[field] === 'number' ? m[field] as number : 0), 0);
    
    const numValid = (field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50'>) => 
        validForCalc.filter(m => typeof m[field] === 'number').length;

    const avgIA1 = numValid('ia1_50') > 0 ? sum('ia1_50') / numValid('ia1_50') : 0;
    const avgIA2 = numValid('ia2_50') > 0 ? sum('ia2_50') / numValid('ia2_50') : 0;
    const totalAvg = (avgIA1 + avgIA2).toFixed(2);

    return {
        count: totalStudentsInList,
        avgIA1: numValid('ia1_50') > 0 ? avgIA1.toFixed(2) : 'N/A',
        avgIA2: numValid('ia2_50') > 0 ? avgIA2.toFixed(2) : 'N/A',
        totalAvg: (avgIA1 > 0 || avgIA2 > 0) ? totalAvg : 'N/A',
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
      <h1 className="text-3xl font-bold flex items-center"><Edit3 className="mr-2 h-8 w-8 text-primary" /> TYL Marks Entry</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class and TYL Subject</CardTitle>
          <CardDescription>Choose the semester, section, and TYL subject (from your assigned list) to enter or view marks. Students must have the correct 'Current Semester' & 'Section' in their profile to appear.</CardDescription>
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
            <Label htmlFor="subject">TYL Subject</Label>
            <Select
              value={selectedSubject?.code || ""}
              onValueChange={(code) => setSelectedSubject(assignedSubjectsForClass.find(s => s.code === code) || null)}
              disabled={!selectedSection || isLoadingAssignedSubjects || assignedSubjectsForClass.length === 0}
            >
              <SelectTrigger id="subject">
                <SelectValue placeholder={isLoadingAssignedSubjects ? "Loading subjects..." : (assignedSubjectsForClass.length === 0 && selectedSection ? "No TYL subjects assigned" : "Select TYL Subject")} />
              </SelectTrigger>
              <SelectContent>
                {assignedSubjectsForClass.length > 0 ? (
                    assignedSubjectsForClass.map(sub => <SelectItem key={sub.code} value={sub.code}>{sub.name} ({sub.code})</SelectItem>)
                ) : (
                    <SelectItem value="-" disabled>
                      {isLoadingAssignedSubjects ? "Loading..." : (selectedSemester && selectedSection ? "No TYL subjects assigned for this class" : "Select semester & section first")}
                    </SelectItem>
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
                      <TableHead className="w-[250px] sticky left-[180px] bg-card z-10">Student Name</TableHead>
                      <TableHead className="text-center w-28">IA 1 (50)</TableHead>
                      <TableHead className="text-center w-28">IA 2 (50)</TableHead>
                      <TableHead className="text-center w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsMarksEntries.map((entry) => (
                      <TableRow key={entry.profile.userId}>
                        <TableCell className="font-mono text-xs sticky left-0 bg-card z-10 px-1 py-1 w-[180px]">
                           <Input
                                type="text"
                                className="w-full text-xs bg-background h-9"
                                value={entry.marks.usn}
                                onChange={(e) => handleStudentDetailChange(entry.profile.userId, 'admissionId', e.target.value.toUpperCase())}
                                disabled={isSaving || !entry.profile.userId.startsWith('temp-')} 
                                placeholder="Enter USN"
                            />
                        </TableCell>
                        <TableCell className="font-medium sticky left-[180px] bg-card z-10 px-1 py-1 w-[250px]">
                           {/* Student name is auto-fetched from database - read-only */}
                           <div className="w-full text-sm bg-muted/50 h-9 flex items-center px-3 rounded-md border border-transparent">
                             {entry.marks.studentName || entry.profile.fullName || 'N/A'}
                           </div>
                        </TableCell>
                        {(['ia1_50', 'ia2_50'] as const).map(field => (
                          <TableCell key={field} className="px-1 py-1">
                            <Input
                              type="number"
                              className="w-24 text-center mx-auto bg-background h-9 text-sm"
                              value={entry.marks?.[field] === null || entry.marks?.[field] === undefined ? '' : String(entry.marks?.[field])}
                              onChange={(e) => handleMarkChange(entry.profile.userId, field, e.target.value)}
                              min="0"
                              max="50"
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
                        <p>Ensure student profiles have the correct 'Current Semester' & 'Section' matching your selection, and are 'Active'.</p>
                        <p>You can also add students manually using the button above (USN required for saving).</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
                            <p className="text-sm text-muted-foreground">Total Avg</p>
                            <p className="text-2xl font-bold">{calculateSummary.totalAvg}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
       )}

       {!selectionMade && !isLoading && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Select Class to Begin</AlertTitle>
            <AlertDescription>Please select a semester, section, and one of your assigned TYL subjects above to view or enter marks.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}

