
'use client';

import React from 'react'; // Added missing React import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentClassPerformanceDetails, SubjectMark } from '@/types';
import { BarChart2, Info, Users, Percent, TrendingUp, TrendingDown, CheckSquare, XSquare } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchAllMarksForClassAction } from '@/actions/marks-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { ALL_SUBJECTS_BY_SEMESTER } from '@/lib/subjects';
import { Label } from '@/components/ui/label';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];

interface SubjectPerformanceSummary {
  passedCount: number;
  failedCount: number;
  marksEnteredCount: number;
}

export default function ClassPerformancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [classPerformanceData, setClassPerformanceData] = useState<StudentClassPerformanceDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);

  const subjectsForSelectedSemester = useMemo(() => {
    return selectedSemester ? ALL_SUBJECTS_BY_SEMESTER[selectedSemester] || [] : [];
  }, [selectedSemester]);

  useEffect(() => {
    if (user && user.role === 'Faculty' && selectedSemester && selectedSection) {
      setIsLoading(true);
      setInitialLoadAttempted(true);
      fetchAllMarksForClassAction(parseInt(selectedSemester), selectedSection)
        .then(data => {
          setClassPerformanceData(data);
          if (data.length === 0) {
            toast({ title: "No Students Found", description: "No active students found for the selected class, or no marks entered.", variant: "default" });
          }
        })
        .catch(err => {
          console.error("Error fetching class performance:", err);
          toast({ title: "Error Loading Data", description: (err as Error).message || "Could not load class performance data.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    } else {
      setClassPerformanceData([]);
      setInitialLoadAttempted(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedSemester, selectedSection, toast]);

  const performanceSummaryBySubject = useMemo(() => {
    const summary: Record<string, SubjectPerformanceSummary> = {};
    if (classPerformanceData.length === 0 || subjectsForSelectedSemester.length === 0) {
      return summary;
    }

    subjectsForSelectedSemester.forEach(subject => {
      summary[subject.code] = { passedCount: 0, failedCount: 0, marksEnteredCount: 0 };
      classPerformanceData.forEach(studentData => {
        const mark = studentData.marksBySubject[subject.code];
        if (mark && (typeof mark.ia1_50 === 'number' || typeof mark.ia2_50 === 'number')) {
            summary[subject.code].marksEnteredCount++;
            const ia1 = typeof mark.ia1_50 === 'number' ? mark.ia1_50 : 0;
            const ia2 = typeof mark.ia2_50 === 'number' ? mark.ia2_50 : 0;
            const totalIA = ia1 + ia2;
            if (totalIA >= 20) { // Assuming pass mark is 20 for sum of two IAs (50+50 scaled or direct)
                summary[subject.code].passedCount++;
            } else {
                summary[subject.code].failedCount++;
            }
        }
      });
    });
    return summary;
  }, [classPerformanceData, subjectsForSelectedSemester]);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  const selectionMade = !!(selectedSemester && selectedSection);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><BarChart2 className="mr-2 h-8 w-8 text-primary" /> Class Performance</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>Choose semester and section to view performance details.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Performance for Semester {selectedSemester}, Section {selectedSection}</CardTitle>
            <CardDescription>
              Showing IAT1 & IAT2 marks. Summary counts students with IA total &ge; 20 as Passed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} cols={subjectsForSelectedSemester.length * 2 + 2} />
            ) : initialLoadAttempted && classPerformanceData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No student data found for this selection. Ensure students are enrolled and marks are entered.</p>
            ) : classPerformanceData.length > 0 && subjectsForSelectedSemester.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10">Student Name</TableHead>
                        <TableHead className="sticky left-[150px] bg-card z-10 md:left-[200px]">USN</TableHead>
                        {subjectsForSelectedSemester.map(subject => (
                          <React.Fragment key={subject.code}>
                            <TableHead className="text-center min-w-[160px]">{subject.name} ({subject.code}) - IA1</TableHead>
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
                            <React.Fragment key={`${studentData.profile.userId}-${subject.code}`}>
                              <TableCell className="text-center">{studentData.marksBySubject[subject.code]?.ia1_50 ?? 'N/A'}</TableCell>
                              <TableCell className="text-center">{studentData.marksBySubject[subject.code]?.ia2_50 ?? 'N/A'}</TableCell>
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
                    <p className="mb-4 text-sm text-muted-foreground">Total Students in Class: {classPerformanceData.length}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjectsForSelectedSemester.map(subject => {
                            const summary = performanceSummaryBySubject[subject.code];
                            if (!summary || summary.marksEnteredCount === 0) return (
                                <Card key={subject.code} className="bg-muted/30">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{subject.name} ({subject.code})</CardTitle></CardHeader>
                                    <CardContent><p className="text-xs text-muted-foreground">No IA marks entered.</p></CardContent>
                                </Card>
                            );
                            return (
                                <Card key={subject.code} className="bg-muted/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">{subject.name} ({subject.code})</CardTitle>
                                    <CardDescription className="text-xs">{summary.marksEnteredCount} students with IA marks</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <p className="text-xs flex items-center"><CheckSquare className="h-4 w-4 mr-1 text-success" />Passed (IA Total &ge; 20): {summary.passedCount}</p>
                                    <p className="text-xs flex items-center"><XSquare className="h-4 w-4 mr-1 text-destructive" />Failed (IA Total &lt; 20): {summary.failedCount}</p>
                                </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : initialLoadAttempted && <p className="text-center py-8 text-muted-foreground">No subjects defined for the selected semester, or no student data found.</p>}
          </CardContent>
        </Card>
      )}

      {!selectionMade && !isLoading && (
        <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
          <Info className="h-5 w-5 text-accent" />
          <AlertTitle>Select Class to View Performance</AlertTitle>
          <AlertDescription>Please select a semester and section above to load the class performance details.</AlertDescription>
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

