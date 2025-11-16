
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
import { getTYLPassingMarks, TYL_CATEGORIES } from '@/lib/tyl-config';

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
  const [rawMarksData, setRawMarksData] = useState<Array<{ profile: StudentProfile; marks: SubjectMark[] }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load analysis data based on type
  useEffect(() => {
    const loadAnalysisData = async () => {
      if (analysisType === 'raw') {
        // For raw marks, semester is optional - if not selected, show all semesters
        // This allows viewing all historical marks even after students are promoted
        setIsLoading(true);
        try {
          const data = await fetchRawTYLMarksAction({
            department: selectedDepartment || undefined,
            section: selectedSection || undefined,
            year: selectedYear ? parseInt(selectedYear) : undefined,
            semester: selectedSemester ? parseInt(selectedSemester) : undefined,
            // Don't filter by subjectCode - we want all TYL marks
            // Note: fetchRawTYLMarksAction will always fetch all semesters regardless of semester filter
            // to show complete historical data
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
        // All analysis types now show all marks across all semesters for each student
        setIsLoading(true);
        try {
          let data: TYLAnalysisData[] = [];
          
          if (analysisType === 'department') {
            // Load for all departments - shows all marks across all semesters
            for (const dept of DEPARTMENTS) {
              const result = await calculateTYLAnalysisAction({
                department: dept,
                semester: selectedSemester ? parseInt(selectedSemester) : undefined,
              });
              data.push(result);
            }
          } else if (analysisType === 'section') {
            // Load for all sections of selected department - shows all marks across all semesters
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
            // Load for all years/batches - shows all marks across all semesters
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
  }, [analysisType, selectedDepartment, selectedSection, selectedYear, selectedSemester, toast]);

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
              <TableHead className="sticky left-0 bg-card z-10 min-w-[200px]">
                {analysisType === 'department' ? 'Department' : analysisType === 'section' ? 'Section' : 'Year'}
              </TableHead>
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
                <TableCell className="font-medium sticky left-0 bg-card z-10 min-w-[200px]">
                  {analysisType === 'section' 
                    ? (data.section || 'N/A')
                    : analysisType === 'batch'
                    ? (`Year ${data.year}` || 'N/A')
                    : (data.department || 'N/A')}
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

  // Calculate Level Reached for a subject category
  const calculateLevelReached = (marks: SubjectMark[], subjectCodes: string[]): number => {
    // Get marks for this category, sorted by level (only levels with marks entered)
    const categoryMarks = subjectCodes
      .map(code => {
        const mark = marks.find(m => {
          const mCode = m.subjectCode.toLowerCase();
          // Handle exact match or base code match (e.g., 'a1' matches 'a1' or 'a1-xxx')
          const baseCode = code.toLowerCase();
          return mCode === baseCode || mCode.startsWith(baseCode + '-') || mCode.startsWith(baseCode);
        });
        if (!mark) return null;
        
        // Check if marks are actually entered (not null)
        const hasMarks = mark.ia1_50 !== null || mark.ia2_50 !== null;
        if (!hasMarks) return null;
        
        return { code, mark, level: parseInt(code.slice(1)) };
      })
      .filter((item): item is { code: string; mark: SubjectMark; level: number } => item !== null)
      .sort((a, b) => a.level - b.level);

    // If no marks entered for this category, Level Reached = 0
    if (categoryMarks.length === 0) return 0;

    // Check if student passed all levels sequentially from the lowest to highest entered
    let levelReached = 0;
    for (const { mark, level } of categoryMarks) {
      const total = (mark.ia1_50 || 0) + (mark.ia2_50 || 0);
      const passingMarks = getTYLPassingMarks(mark.subjectCode);
      
      if (total >= passingMarks) {
        // Student passed this level
        levelReached = level;
      } else {
        // If any lower level fails, Level Reached = 0 (even if upper levels passed)
        return 0;
      }
    }

    // If all entered levels are passed, return the highest level reached
    return levelReached;
  };

  // Render raw marks table in Excel format
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

    // Get all unique students
    const studentsMap = new Map<string, { profile: StudentProfile; marks: SubjectMark[] }>();
    rawMarksData.forEach(({ profile, marks }) => {
      const studentId = profile.userId || profile.id;
      if (!studentsMap.has(studentId)) {
        studentsMap.set(studentId, { profile, marks: [] });
      }
      studentsMap.get(studentId)!.marks.push(...marks);
    });

    const students = Array.from(studentsMap.values());

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">USN</TableHead>
              <TableHead className="sticky left-[120px] bg-card z-10">Student Name</TableHead>
              
              {/* Language Subjects */}
              {TYL_LANGUAGE_SUBJECTS.map(sub => (
                <TableHead key={sub} className="text-center bg-green-50 dark:bg-green-950/20">
                  {sub.toUpperCase()}
                </TableHead>
              ))}
              
              {/* Aptitude Subjects */}
              {TYL_APTITUDE_SUBJECTS.map(sub => (
                <TableHead key={sub} className="text-center bg-teal-50 dark:bg-teal-950/20">
                  {sub.toUpperCase()}
                </TableHead>
              ))}
              
              {/* Soft Skills Subjects */}
              {TYL_SOFT_SKILLS_SUBJECTS.map(sub => (
                <TableHead key={sub} className="text-center bg-yellow-50 dark:bg-yellow-950/20">
                  {sub.toUpperCase()}
                </TableHead>
              ))}
              
              {/* Programming Subjects */}
              {TYL_PROGRAMMING_SUBJECTS.map(sub => (
                <TableHead key={sub} className="text-center bg-blue-50 dark:bg-blue-950/20">
                  {sub.toUpperCase()}
                </TableHead>
              ))}
              
              {/* Core Subjects */}
              {TYL_CORE_SUBJECTS.map(sub => (
                <TableHead key={sub} className="text-center bg-purple-50 dark:bg-purple-950/20">
                  {sub.toUpperCase()}
                </TableHead>
              ))}
              
              {/* Level Reached Columns */}
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950/20">Lx</TableHead>
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950/20">Ax</TableHead>
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950/20">Sx</TableHead>
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950/20">Px</TableHead>
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950/20">Cx</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student, idx) => {
              const marksMap = new Map<string, SubjectMark>();
              student.marks.forEach(mark => {
                const code = mark.subjectCode.toLowerCase();
                marksMap.set(code, mark);
              });

              // Calculate Level Reached for each category
              const lx = calculateLevelReached(student.marks, TYL_CATEGORIES.language);
              const ax = calculateLevelReached(student.marks, TYL_CATEGORIES.aptitude);
              const sx = calculateLevelReached(student.marks, TYL_CATEGORIES['soft skills']);
              const px = calculateLevelReached(student.marks, TYL_CATEGORIES.programming);
              const cx = calculateLevelReached(student.marks, TYL_CATEGORIES.core);

              const getMarkForSubject = (code: string): number | null => {
                const mark = marksMap.get(code.toLowerCase());
                if (!mark) return null;
                const ia1 = mark.ia1_50 ?? 0;
                const ia2 = mark.ia2_50 ?? 0;
                return ia1 + ia2;
              };

              return (
                <TableRow key={idx}>
                  <TableCell className="font-mono sticky left-0 bg-card z-10">
                    {student.profile.admissionId || 'N/A'}
                  </TableCell>
                  <TableCell className="sticky left-[120px] bg-card z-10">
                    {student.profile.fullName || 'N/A'}
                  </TableCell>
                  
                  {/* Language marks */}
                  {TYL_LANGUAGE_SUBJECTS.map(sub => {
                    const mark = getMarkForSubject(sub);
                    return (
                      <TableCell key={sub} className="text-center bg-green-50/50 dark:bg-green-950/10">
                        {mark !== null ? mark : ''}
                      </TableCell>
                    );
                  })}
                  
                  {/* Aptitude marks */}
                  {TYL_APTITUDE_SUBJECTS.map(sub => {
                    const mark = getMarkForSubject(sub);
                    return (
                      <TableCell key={sub} className="text-center bg-teal-50/50 dark:bg-teal-950/10">
                        {mark !== null ? mark : ''}
                      </TableCell>
                    );
                  })}
                  
                  {/* Soft Skills marks */}
                  {TYL_SOFT_SKILLS_SUBJECTS.map(sub => {
                    const mark = getMarkForSubject(sub);
                    return (
                      <TableCell key={sub} className="text-center bg-yellow-50/50 dark:bg-yellow-950/10">
                        {mark !== null ? mark : ''}
                      </TableCell>
                    );
                  })}
                  
                  {/* Programming marks */}
                  {TYL_PROGRAMMING_SUBJECTS.map(sub => {
                    const mark = getMarkForSubject(sub);
                    return (
                      <TableCell key={sub} className="text-center bg-blue-50/50 dark:bg-blue-950/10">
                        {mark !== null ? mark : ''}
                      </TableCell>
                    );
                  })}
                  
                  {/* Core marks */}
                  {TYL_CORE_SUBJECTS.map(sub => {
                    const mark = getMarkForSubject(sub);
                    return (
                      <TableCell key={sub} className="text-center bg-purple-50/50 dark:bg-purple-950/10">
                        {mark !== null ? mark : ''}
                      </TableCell>
                    );
                  })}
                  
                  {/* Level Reached */}
                  <TableCell className="text-center bg-cyan-50 dark:bg-cyan-950/20 font-semibold">{lx}</TableCell>
                  <TableCell className="text-center bg-cyan-50 dark:bg-cyan-950/20 font-semibold">{ax}</TableCell>
                  <TableCell className="text-center bg-cyan-50 dark:bg-cyan-950/20 font-semibold">{sx}</TableCell>
                  <TableCell className="text-center bg-cyan-50 dark:bg-cyan-950/20 font-semibold">{px}</TableCell>
                  <TableCell className="text-center bg-cyan-50 dark:bg-cyan-950/20 font-semibold">{cx}</TableCell>
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
        <CardContent className="p-0">
          <Tabs value={analysisType} onValueChange={(value) => {
            setAnalysisType(value as 'department' | 'section' | 'batch' | 'raw');
            setAnalysisData([]);
            setRawMarksData([]);
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
              <TabsTrigger 
                value="department" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <Building className="mr-2 h-4 w-4" />
                Department
              </TabsTrigger>
              <TabsTrigger 
                value="section" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <Users className="mr-2 h-4 w-4" />
                Section
              </TabsTrigger>
              <TabsTrigger 
                value="batch" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Batch/Year
              </TabsTrigger>
              <TabsTrigger 
                value="raw" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <FileText className="mr-2 h-4 w-4" />
                Raw Marks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="department" className="p-6 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  Analysis shows <strong>all marks across all semesters</strong> for each student, 
                  allowing you to see complete historical data even after students have been promoted.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </TabsContent>

            <TabsContent value="section" className="p-6 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  Analysis shows <strong>all marks across all semesters</strong> for each student, 
                  allowing you to see complete historical data even after students have been promoted.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Department <span className="text-destructive">*</span></Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment} required>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedDepartment}>
                    <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map(sec => <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
            </TabsContent>

            <TabsContent value="batch" className="p-6 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  Analysis shows <strong>all marks across all semesters</strong> for each student, 
                  allowing you to see complete historical data even after students have been promoted.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Department <span className="text-destructive">*</span></Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment} required>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!selectedDepartment}>
                    <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                    <SelectContent>
                      {YEARS.map(year => <SelectItem key={year} value={year}>Year {year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
            </TabsContent>

            <TabsContent value="raw" className="p-6 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  Raw marks view shows <strong>all marks across all semesters</strong> for each student, 
                  allowing you to see complete historical data even after students have been promoted.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select value={selectedDepartment || 'all'} onValueChange={(value) => setSelectedDepartment(value === 'all' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label>Year</Label>
                  <Select value={selectedYear || 'all'} onValueChange={(value) => setSelectedYear(value === 'all' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {YEARS.map(year => <SelectItem key={year} value={year}>Year {year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Semester (Optional - shows all if not selected)</Label>
                  <Select value={selectedSemester || 'all'} onValueChange={(value) => setSelectedSemester(value === 'all' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="All Semesters" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {analysisType === 'department' && <><Building className="h-5 w-5" /> Department-wise TYL Analysis</>}
            {analysisType === 'section' && <><Users className="h-5 w-5" /> Section-wise TYL Analysis</>}
            {analysisType === 'batch' && <><Calendar className="h-5 w-5" /> Batch-wise/Year-wise TYL Analysis</>}
            {analysisType === 'raw' && <><FileText className="h-5 w-5" /> Raw TYL Marks</>}
          </CardTitle>
          <CardDescription>
            {analysisType === 'raw' 
              ? 'View raw marks for all TYL subjects. Each row shows one student with their marks across all TYL subjects. Level Reached columns show the highest level passed for each category.'
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
