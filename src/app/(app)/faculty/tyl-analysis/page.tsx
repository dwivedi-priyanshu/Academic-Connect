
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark, StudentProfile } from '@/types';
import { BarChart as BarChartIcon, Info, FileText, Building, Users, Calendar } from 'lucide-react'; 
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { calculateTYLAnalysisAction, fetchRawTYLMarksAction, type TYLAnalysisData } from '@/actions/tyl-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { DEPARTMENTS } from '@/lib/subjects';
import { getTYLPassingMarks } from '@/lib/tyl-config';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
const YEARS = ["1", "2", "3", "4"];

// TYL Subject codes in order as per Excel
const TYL_APTITUDE_SUBJECTS = ['a1', 'a2', 'a3', 'a4'];
const TYL_LANGUAGE_SUBJECTS = ['l1', 'l2', 'l3', 'l4'];
const TYL_SOFT_SKILLS_SUBJECTS = ['s1', 's2', 's3', 's4'];
const TYL_PROGRAMMING_SUBJECTS = ['p1', 'p2', 'p3', 'p4'];
const TYL_CORE_SUBJECTS = ['c2', 'c3', 'c4', 'c5'];

export default function TYLAnalysisPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Analysis type selection
  const [analysisType, setAnalysisType] = useState<'department' | 'section' | 'batch' | 'raw'>('department');
  
  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
  
  // Data
  const [analysisData, setAnalysisData] = useState<TYLAnalysisData[]>([]);
  const [rawMarksData, setRawMarksData] = useState<Array<{ profile: StudentProfile; mark: SubjectMark }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load analysis data based on type
  useEffect(() => {
    const loadAnalysisData = async () => {
      if (analysisType === 'raw') {
        // Load raw marks
        if (!selectedSubjectCode) {
          setRawMarksData([]);
          return;
        }
        setIsLoading(true);
        try {
          const data = await fetchRawTYLMarksAction({
            department: selectedDepartment || undefined,
            section: selectedSection || undefined,
            year: selectedYear ? parseInt(selectedYear) : undefined,
            semester: selectedSemester ? parseInt(selectedSemester) : undefined,
            subjectCode: selectedSubjectCode,
          });
          setRawMarksData(data);
        } catch (error) {
          toast({ title: "Error", description: "Failed to load raw marks data.", variant: "destructive" });
          setRawMarksData([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Load analysis data
        setIsLoading(true);
        try {
          let data: TYLAnalysisData[] = [];
          
          if (analysisType === 'department') {
            // Load for all departments
            for (const dept of DEPARTMENTS) {
              const result = await calculateTYLAnalysisAction({
                department: dept,
                semester: selectedSemester ? parseInt(selectedSemester) : undefined,
              });
              data.push(result);
            }
          } else if (analysisType === 'section') {
            // Load for all sections of selected department
            if (!selectedDepartment) {
              setAnalysisData([]);
              setIsLoading(false);
              return;
            }
            for (const sec of SECTIONS) {
              const result = await calculateTYLAnalysisAction({
                department: selectedDepartment,
                section: sec,
                semester: selectedSemester ? parseInt(selectedSemester) : undefined,
              });
              data.push(result);
            }
          } else if (analysisType === 'batch') {
            // Load for all years/batches
            if (!selectedDepartment) {
              setAnalysisData([]);
              setIsLoading(false);
              return;
            }
            for (const year of YEARS) {
              const result = await calculateTYLAnalysisAction({
                department: selectedDepartment,
                year: parseInt(year),
                semester: selectedSemester ? parseInt(selectedSemester) : undefined,
              });
              data.push(result);
            }
          }
          
          setAnalysisData(data);
        } catch (error) {
          toast({ title: "Error", description: "Failed to load analysis data.", variant: "destructive" });
          setAnalysisData([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadAnalysisData();
  }, [analysisType, selectedDepartment, selectedSection, selectedYear, selectedSemester, selectedSubjectCode, toast]);

  if (!user || user.role !== 'Faculty') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10">
        <BarChartIcon className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">This page is for faculty members only.</p>
      </div>
    );
  }

  // Render analysis table based on Excel format
  const renderAnalysisTable = () => {
    if (isLoading) {
      return <Skeleton className="h-96 w-full" />;
    }

    if (analysisData.length === 0) {
      return (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>No analysis data available for the selected filters.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">{analysisType === 'department' ? 'Department' : analysisType === 'section' ? 'Section' : 'Year'}</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total no. of Students</TableHead>
              
              {/* Aptitude Subjects */}
              {TYL_APTITUDE_SUBJECTS.map(sub => (
                <TableHead key={sub} className="text-center">A{sub.slice(1)}</TableHead>
              ))}
              
              {/* Language Subjects */}
              {TYL_LANGUAGE_SUBJECTS.map(sub => (
                <TableHead key={sub} className="text-center">L{sub.slice(1)}</TableHead>
              ))}
              
              {/* Soft Skills Subjects */}
              {TYL_SOFT_SKILLS_SUBJECTS.map(sub => (
                <TableHead key={sub} className="text-center">S{sub.slice(1)}</TableHead>
              ))}
              
              {/* Core Subjects - simplified for now */}
              <TableHead className="text-center">C2 ODD</TableHead>
              <TableHead className="text-center">C2 FULL</TableHead>
              <TableHead className="text-center">C3 ODD</TableHead>
              <TableHead className="text-center">C3 FULL</TableHead>
              <TableHead className="text-center">C4 ODD</TableHead>
              <TableHead className="text-center">C4 FULL</TableHead>
              <TableHead className="text-center">C5 FULL</TableHead>
              
              {/* Programming Subjects */}
              <TableHead className="text-center">P1-C</TableHead>
              <TableHead className="text-center">P2 Python</TableHead>
              <TableHead className="text-center">P3 Python</TableHead>
              <TableHead className="text-center">P3 Java</TableHead>
              <TableHead className="text-center">P4 MAD/FSD</TableHead>
              <TableHead className="text-center">P4 DS</TableHead>
              
              {/* Levels Reached */}
              <TableHead className="text-center bg-yellow-100">UG LX</TableHead>
              <TableHead className="text-center bg-yellow-100">UG SX</TableHead>
              <TableHead className="text-center bg-yellow-100">UG AX</TableHead>
              <TableHead className="text-center bg-yellow-100">UG PX</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysisData.map((data, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium sticky left-0 bg-card z-10">
                  {data.department || data.section || `Year ${data.year}` || 'N/A'}
                </TableCell>
                <TableCell>{new Date().toLocaleDateString('en-GB')}</TableCell>
                <TableCell className="font-semibold">{data.totalStudents}</TableCell>
                
                {/* Aptitude counts */}
                {TYL_APTITUDE_SUBJECTS.map(sub => (
                  <TableCell key={sub} className="text-center">
                    {data.passedCounts[sub] || 0}
                  </TableCell>
                ))}
                
                {/* Language counts */}
                {TYL_LANGUAGE_SUBJECTS.map(sub => (
                  <TableCell key={sub} className="text-center">
                    {data.passedCounts[sub] || 0}
                  </TableCell>
                ))}
                
                {/* Soft Skills counts */}
                {TYL_SOFT_SKILLS_SUBJECTS.map(sub => (
                  <TableCell key={sub} className="text-center">
                    {data.passedCounts[sub] || 0}
                  </TableCell>
                ))}
                
                {/* Core counts */}
                <TableCell className="text-center">{data.passedCounts['c2-odd'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['c2-full'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['c3-odd'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['c3-full'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['c4-odd'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['c4-full'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['c5-full'] || 0}</TableCell>
                
                {/* Programming counts */}
                <TableCell className="text-center">{data.passedCounts['p1'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['p2'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['p3'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['p3'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['p4-mad/fsd'] || 0}</TableCell>
                <TableCell className="text-center">{data.passedCounts['p4-ds'] || 0}</TableCell>
                
                {/* Levels Reached */}
                <TableCell className="text-center bg-yellow-50">{data.levelsReached?.lx || 0}</TableCell>
                <TableCell className="text-center bg-yellow-50">{data.levelsReached?.sx || 0}</TableCell>
                <TableCell className="text-center bg-yellow-50">{data.levelsReached?.ax || 0}</TableCell>
                <TableCell className="text-center bg-yellow-50">{data.levelsReached?.px || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Render raw marks table
  const renderRawMarksTable = () => {
    if (isLoading) {
      return <Skeleton className="h-96 w-full" />;
    }

    if (rawMarksData.length === 0) {
      return (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>No marks data available for the selected filters.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>USN</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Subject Code</TableHead>
              <TableHead>Subject Name</TableHead>
              <TableHead className="text-center">IA 1</TableHead>
              <TableHead className="text-center">IA 2</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Passing Marks</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawMarksData.map((item, idx) => {
              const total = (item.mark.ia1_50 || 0) + (item.mark.ia2_50 || 0);
              const passingMarks = getTYLPassingMarks(item.mark.subjectCode);
              const passed = total >= passingMarks;
              
              return (
                <TableRow key={idx}>
                  <TableCell className="font-mono">{item.mark.usn || item.profile.admissionId}</TableCell>
                  <TableCell>{item.mark.studentName || item.profile.fullName}</TableCell>
                  <TableCell className="font-mono">{item.mark.subjectCode}</TableCell>
                  <TableCell>{item.mark.subjectName}</TableCell>
                  <TableCell className="text-center">{item.mark.ia1_50 ?? 'N/A'}</TableCell>
                  <TableCell className="text-center">{item.mark.ia2_50 ?? 'N/A'}</TableCell>
                  <TableCell className="text-center font-semibold">{total}</TableCell>
                  <TableCell className="text-center">{passingMarks}</TableCell>
                  <TableCell className={`text-center font-semibold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                    {passed ? 'Pass' : 'Fail'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><BarChartIcon className="mr-2 h-8 w-8 text-primary" /> TYL Analysis</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Analysis Type & Filters</CardTitle>
          <CardDescription>Select the type of analysis and apply filters to view TYL performance data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Analysis Type</Label>
            <Select value={analysisType} onValueChange={(value) => {
              setAnalysisType(value as 'department' | 'section' | 'batch' | 'raw');
              setAnalysisData([]);
              setRawMarksData([]);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">Department-wise Analysis</SelectItem>
                <SelectItem value="section">Section-wise Analysis</SelectItem>
                <SelectItem value="batch">Batch-wise/Year-wise Analysis</SelectItem>
                <SelectItem value="raw">Raw Marks View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analysisType !== 'department' && (
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {analysisType === 'section' && (
              <div className="space-y-1">
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map(sec => <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {analysisType === 'batch' && (
              <div className="space-y-1">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!selectedDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(year => <SelectItem key={year} value={year}>Year {year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {analysisType === 'raw' && (
              <>
                <div className="space-y-1">
                  <Label>Section</Label>
                  <Select value={selectedSection || 'all'} onValueChange={(value) => setSelectedSection(value === 'all' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="All Sections" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {SECTIONS.map(sec => <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>TYL Subject</Label>
                  <Select value={selectedSubjectCode} onValueChange={setSelectedSubjectCode} required>
                    <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a1">A1 - Aptitude</SelectItem>
                      <SelectItem value="a2">A2 - Aptitude</SelectItem>
                      <SelectItem value="a3">A3 - Aptitude</SelectItem>
                      <SelectItem value="a4">A4 - Aptitude</SelectItem>
                      <SelectItem value="l1">L1 - Language</SelectItem>
                      <SelectItem value="l2">L2 - Language</SelectItem>
                      <SelectItem value="l3">L3 - Language</SelectItem>
                      <SelectItem value="l4">L4 - Language</SelectItem>
                      <SelectItem value="s1">S1 - Soft Skills</SelectItem>
                      <SelectItem value="s2">S2 - Soft Skills</SelectItem>
                      <SelectItem value="s3">S3 - Soft Skills</SelectItem>
                      <SelectItem value="s4">S4 - Soft Skills</SelectItem>
                      <SelectItem value="p1">P1 - Programming (C)</SelectItem>
                      <SelectItem value="p2">P2 - Programming (Python)</SelectItem>
                      <SelectItem value="p3">P3 - Programming</SelectItem>
                      <SelectItem value="p4">P4 - Programming</SelectItem>
                      <SelectItem value="c2">C2 - Core</SelectItem>
                      <SelectItem value="c3">C3 - Core</SelectItem>
                      <SelectItem value="c4">C4 - Core</SelectItem>
                      <SelectItem value="c5">C5 - Core</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label>Semester (Optional)</Label>
              <Select value={selectedSemester || 'all'} onValueChange={(value) => setSelectedSemester(value === 'all' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder="All Semesters" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>
            {analysisType === 'department' && 'Department-wise TYL Analysis'}
            {analysisType === 'section' && 'Section-wise TYL Analysis'}
            {analysisType === 'batch' && 'Batch-wise/Year-wise TYL Analysis'}
            {analysisType === 'raw' && 'Raw TYL Marks'}
          </CardTitle>
          <CardDescription>
            {analysisType === 'raw' 
              ? 'View raw marks for students in the selected TYL subject. No calculations or analysis performed.'
              : 'Performance analysis showing number of students who passed each TYL subject category.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysisType === 'raw' ? renderRawMarksTable() : renderAnalysisTable()}
        </CardContent>
      </Card>
    </div>
  );
}
