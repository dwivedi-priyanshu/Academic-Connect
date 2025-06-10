
'use client';

import React from 'react'; // Ensure React is imported for React.Fragment
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentClassPerformanceDetails, SubjectMark, Subject } from '@/types'; // Added Subject type
import { BarChart2, Info, Users, Percent, TrendingUp, TrendingDown, CheckSquare, XSquare, Building, UserX, BadgePercent } from 'lucide-react'; // Added UserX for absent, BadgePercent for Pass %
import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchAllMarksForClassAction } from '@/actions/marks-actions';
import { fetchSubjectsByDepartmentAndSemesterAction } from '@/actions/admin-actions'; // For dynamic subjects
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { DEPARTMENTS } from '@/lib/subjects'; 
import { Label } from '@/components/ui/label';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];

interface SubjectPerformanceSummary {
  passedCount: number;
  failedCount: number;
  marksEnteredCount: number;
  absentCount: number;
  passPercentage: string;
}

export default function ClassPerformancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [classPerformanceData, setClassPerformanceData] = useState<StudentClassPerformanceDetails[]>([]);
  const [subjectsForSelectedSemester, setSubjectsForSelectedSemester] = useState<Subject[]>([]); // State for dynamic subjects
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);


  // Fetch subjects when department and semester change
  useEffect(() => {
    if (selectedDepartment && selectedSemester) {
      setIsLoading(true);
      fetchSubjectsByDepartmentAndSemesterAction(selectedDepartment, parseInt(selectedSemester))
        .then(data => {
          setSubjectsForSelectedSemester(data);
          if (data.length === 0) {
            toast({ title: "No Subjects Defined", description: `No subjects found for ${selectedDepartment} - Semester ${selectedSemester} in Subject Management.`, variant: "default" });
          }
        })
        .catch(err => {
          console.error("Error fetching subjects for class performance:", err);
          toast({ title: "Error Loading Subjects", description: (err as Error).message || "Could not load subjects for the selected class.", variant: "destructive" });
          setSubjectsForSelectedSemester([]);
        })
        .finally(() => setIsLoading(false)); // Potentially defer this if marks loading starts
    } else {
      setSubjectsForSelectedSemester([]);
    }
  }, [selectedDepartment, selectedSemester, toast]);


  useEffect(() => {
    if (user && user.role === 'Faculty' && selectedDepartment && selectedSemester && selectedSection && subjectsForSelectedSemester.length > 0) {
      setIsLoading(true);
      setInitialLoadAttempted(true);
      fetchAllMarksForClassAction(parseInt(selectedSemester), selectedSection, selectedDepartment)
        .then(data => {
          setClassPerformanceData(data);
          if (data.length === 0 && subjectsForSelectedSemester.length > 0) { // Check if subjects were expected
            toast({ title: "No Student Data", description: "No active students found for the selected class, or no marks entered for the defined subjects.", variant: "default" });
          }
        })
        .catch(err => {
          console.error("Error fetching class performance:", err);
          toast({ title: "Error Loading Performance Data", description: (err as Error).message || "Could not load class performance data.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    } else if (selectedDepartment && selectedSemester && selectedSection && subjectsForSelectedSemester.length === 0 && !isLoading) {
      // If selections are made but no subjects are defined (and not currently loading subjects), clear performance data
      setClassPerformanceData([]);
      setInitialLoadAttempted(true); // Mark that an attempt was made
    } else {
      setClassPerformanceData([]);
      setInitialLoadAttempted(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDepartment, selectedSemester, selectedSection, subjectsForSelectedSemester, toast]); // Added subjectsForSelectedSemester

  const performanceSummaryBySubject = useMemo(() => {
    const summary: Record<string, SubjectPerformanceSummary> = {};
    if (classPerformanceData.length === 0 || subjectsForSelectedSemester.length === 0) {
      return summary;
    }
    
    const totalStudentsInClass = classPerformanceData.length;

    subjectsForSelectedSemester.forEach(subject => {
      let passedCount = 0;
      let failedCount = 0;
      let marksEnteredCount = 0;
      
      classPerformanceData.forEach(studentData => {
        const mark = studentData.marksBySubject[subject.subjectCode];
        const ia1Present = typeof mark?.ia1_50 === 'number';
        const ia2Present = typeof mark?.ia2_50 === 'number';

        if (ia1Present || ia2Present) { // Student is considered to have appeared if at least one IA mark is present
            marksEnteredCount++;
            const ia1 = mark?.ia1_50 ?? 0;
            const ia2 = mark?.ia2_50 ?? 0;
            const totalIA = ia1 + ia2;
            if (totalIA >= 20) { // Assuming passing threshold for IAs total is 20
                passedCount++;
            } else {
                failedCount++;
            }
        }
      });
      
      const absentCount = totalStudentsInClass - marksEnteredCount;
      const totalAppeared = marksEnteredCount;
      const passPercentage = totalAppeared > 0 ? ((passedCount / totalAppeared) * 100).toFixed(1) + '%' : 'N/A';

      summary[subject.subjectCode] = { 
        passedCount, 
        failedCount, 
        marksEnteredCount,
        absentCount,
        passPercentage
      };
    });
    return summary;
  }, [classPerformanceData, subjectsForSelectedSemester]);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  const selectionMade = !!(selectedDepartment && selectedSemester && selectedSection);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><BarChart2 className="mr-2 h-8 w-8 text-primary" /> Class Performance</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>Choose department, semester, and section to view performance details. Subjects listed are based on Admin's Subject Management.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="department" className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground"/>Department</Label>
            <Select value={selectedDepartment} onValueChange={(value) => {setSelectedDepartment(value); setSelectedSemester(''); setSelectedSection(''); setClassPerformanceData([]); setSubjectsForSelectedSemester([]);}}>
              <SelectTrigger id="department"><SelectValue placeholder="Select Department" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="semester">Semester</Label>
            <Select value={selectedSemester} onValueChange={(value) => {setSelectedSemester(value); setSelectedSection(''); setClassPerformanceData([]); setSubjectsForSelectedSemester([]);}} disabled={!selectedDepartment}>
              <SelectTrigger id="semester"><SelectValue placeholder="Select Semester" /></SelectTrigger>
              <SelectContent>
                {SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="section">Section</Label>
            <Select value={selectedSection} onValueChange={(v) => {setSelectedSection(v); setClassPerformanceData([]);}} disabled={!selectedSemester}>
              <SelectTrigger id="section"><SelectValue placeholder="Select Section" /></SelectTrigger>
              <SelectContent>
                {SECTIONS.map(sec => <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Performance for {selectedDepartment} - Semester {selectedSemester}, Section {selectedSection}</CardTitle>
            <CardDescription>
              Showing IAT1 & IAT2 marks. Summary counts students with IA total &ge; 20 as Passed (out of appeared).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} cols={subjectsForSelectedSemester.length * 2 + 2} />
            ) : initialLoadAttempted && subjectsForSelectedSemester.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No subjects defined for this department and semester in Subject Management. Please contact an administrator.</p>
            ) : initialLoadAttempted && classPerformanceData.length === 0 && subjectsForSelectedSemester.length > 0 ? (
              <p className="text-center py-8 text-muted-foreground">No student data found for this selection. Ensure students are enrolled and marks are entered for the defined subjects.</p>
            ) : classPerformanceData.length > 0 && subjectsForSelectedSemester.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10">Student Name</TableHead>
                        <TableHead className="sticky left-[150px] bg-card z-10 md:left-[200px]">USN</TableHead>
                        {subjectsForSelectedSemester.map(subject => (
                          <React.Fragment key={subject.subjectCode}>
                            <TableHead className="text-center min-w-[160px]">{subject.subjectName} ({subject.subjectCode}) - IA1</TableHead>
                            <TableHead className="text-center min-w-[80px]">IA2</TableHead>
                          </React.Fragment>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classPerformanceData.map(studentData => (
                        <TableRow key={studentData.profile.userId}>
                          <TableCell className="font-medium sticky left-0 bg-card z-10 w-[150px] md:w-[200px] truncate">{studentData.profile.fullName}</TableCell>
                          <TableCell className="sticky left-[150px] bg-card z-10 md:left-[200px] w-[120px]">{studentData.profile.admissionId}</TableCell>
                          {subjectsForSelectedSemester.map(subject => (
                            <React.Fragment key={`${studentData.profile.userId}-${subject.subjectCode}`}>
                              <TableCell className="text-center">{studentData.marksBySubject[subject.subjectCode]?.ia1_50 ?? 'N/A'}</TableCell>
                              <TableCell className="text-center">{studentData.marksBySubject[subject.subjectCode]?.ia2_50 ?? 'N/A'}</TableCell>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Card className="mt-6">
                  <CardHeader><CardTitle className="text-lg">Summary of Performance</CardTitle></CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">Total Students Registered for Class: {classPerformanceData.length}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjectsForSelectedSemester.map(subject => {
                            const summary = performanceSummaryBySubject[subject.subjectCode];
                            if (!summary) return ( // Should not happen if logic is correct, but for safety
                                <Card key={subject.subjectCode} className="bg-muted/30">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{subject.subjectName} ({subject.subjectCode})</CardTitle></CardHeader>
                                    <CardContent><p className="text-xs text-muted-foreground">Summary not available.</p></CardContent>
                                </Card>
                            );
                            return (
                                <Card key={subject.subjectCode} className="bg-muted/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">{subject.subjectName} ({subject.subjectCode})</CardTitle>
                                    <CardDescription className="text-xs">{summary.marksEnteredCount} students with IA marks (Appeared)</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <p className="text-xs flex items-center"><CheckSquare className="h-4 w-4 mr-1 text-success" />Passed (IA Total &ge; 20): {summary.passedCount}</p>
                                    <p className="text-xs flex items-center"><XSquare className="h-4 w-4 mr-1 text-destructive" />Failed (IA Total &lt; 20): {summary.failedCount}</p>
                                    <p className="text-xs flex items-center"><UserX className="h-4 w-4 mr-1 text-orange-500" />Absent: {summary.absentCount}</p>
                                    <p className="text-xs font-semibold flex items-center"><BadgePercent className="h-4 w-4 mr-1 text-blue-500" />Pass % (of Appeared): {summary.passPercentage}</p>
                                </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : initialLoadAttempted && <p className="text-center py-8 text-muted-foreground">No student data or subjects to display for this selection.</p>}
          </CardContent>
        </Card>
      )}

      {!selectionMade && !isLoading && (
        <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
          <Info className="h-5 w-5 text-accent" />
          <AlertTitle>Select Class to View Performance</AlertTitle>
          <AlertDescription>Please select department, semester, and section above to load the class performance details.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}


const TableSkeleton = ({ rows, cols }: { rows: number, cols: number }) => (
  <Table>
    <TableHeader>
      <TableRow>
        {[...Array(cols)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(rows)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(cols)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);


    