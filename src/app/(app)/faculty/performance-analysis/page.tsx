
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark } from '@/types';
import { BarChart as BarChartIcon, Info, Users, Percent, TrendingUp, TrendingDown, CheckSquare } from 'lucide-react'; 
import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchMarksFromStorage } from '@/actions/marks-actions'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';


// Standardized Subject List (matches marks-entry page)
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


// Function to calculate detailed summary statistics
const calculateDetailedSummary = (marks: SubjectMark[]) => {
    if (!marks || marks.length === 0) {
        return { count: 0, averages: {}, passPercentages: {}, highPerformers: 0, lowPerformers: 0, distribution: {} };
    }
    const validMarks = marks.filter(m =>
        m.ia1_50 !== null ||
        m.ia2_50 !== null ||
        m.assignment1_20 !== null ||
        m.assignment2_20 !== null
    );
    const count = validMarks.length;
    if (count === 0) {
         return { count: 0, averages: {}, passPercentages: {}, highPerformers: 0, lowPerformers: 0, distribution: {} };
    }

    const fields: (keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50' | 'assignment1_20' | 'assignment2_20'>)[] = ['ia1_50', 'ia2_50', 'assignment1_20', 'assignment2_20'];
    const maxMarks: Record<string, number> = { 'ia1_50': 50, 'ia2_50': 50, 'assignment1_20': 20, 'assignment2_20': 20 };
    const passMarksThresholdFactor = 0.4; 

    const averages: Record<string, string> = {};
    const passPercentages: Record<string, string> = {};
    const distribution: Record<string, Record<string, number>> = {};


    fields.forEach(field => {
        const marksList = validMarks.map(m => m[field]).filter(mark => typeof mark === 'number') as number[];
        
        // Calculate distribution for each assessment type
        distribution[field] = {};
        const max = maxMarks[field];
        const ranges = [[0, 0.2*max], [0.2*max + 0.01, 0.4*max], [0.4*max + 0.01, 0.6*max], [0.6*max + 0.01, 0.8*max], [0.8*max + 0.01, max]];
        ranges.forEach((range, idx) => {
            const rangeLabel = `${Math.floor(range[0])}-${Math.ceil(range[1])}`;
            distribution[field][rangeLabel] = marksList.filter(mark => mark >= range[0] && mark <= range[1]).length;
        });
        
        if (marksList.length > 0) {
            const sum = marksList.reduce((acc, curr) => acc + curr, 0);
            averages[field] = (sum / marksList.length).toFixed(2);
            const passMark = max * passMarksThresholdFactor;
            const passedCount = marksList.filter(mark => mark >= passMark).length;
            passPercentages[field] = ((passedCount / marksList.length) * 100).toFixed(1) + '%';
        } else {
            averages[field] = 'N/A';
            passPercentages[field] = 'N/A';
        }
    });

    const iaAvgList = validMarks.map(m => {
        const ia1 = typeof m.ia1_50 === 'number' ? m.ia1_50 : 0;
        const ia2 = typeof m.ia2_50 === 'number' ? m.ia2_50 : 0;
        const numValidIAs = (typeof m.ia1_50 === 'number' ? 1 : 0) + (typeof m.ia2_50 === 'number' ? 1 : 0);
        return numValidIAs > 0 ? (ia1 + ia2) / numValidIAs : null; 
    }).filter(avg => avg !== null) as number[];

    let highPerformers = 0;
    let lowPerformers = 0;
    if (iaAvgList.length > 0) {
        const overallAvgIA = iaAvgList.reduce((a,b) => a + b, 0) / iaAvgList.length;
        highPerformers = iaAvgList.filter(avg => avg >= overallAvgIA * 1.2).length; 
        lowPerformers = iaAvgList.filter(avg => avg < overallAvgIA * 0.8).length; 
    }

    return {
        count,
        averages,
        passPercentages,
        highPerformers,
        lowPerformers,
        distribution
    };
};

const chartConfig = {
  averageScore: {
    label: "Average Score",
    color: "hsl(var(--chart-1))",
  },
  maxMarks: {
    label: "Max Marks",
    color: "hsl(var(--chart-2))",
  },
  passPercentage: {
    label: "Pass %",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;


export default function PerformanceAnalysisPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  const [subjectsForSemester, setSubjectsForSemester] = useState<{ code: string, name: string }[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<ReturnType<typeof calculateDetailedSummary> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    setSubjectsForSemester(SUBJECTS_BY_SEMESTER[selectedSemester] || []);
    setSelectedSubject(null);
    setAnalysisSummary(null); 
  }, [selectedSemester]);

   useEffect(() => {
     setAnalysisSummary(null);
   }, [selectedSection, selectedSubject]);


  useEffect(() => {
    const loadPerformanceData = async () => {
      if (selectedSemester && selectedSection && selectedSubject && user) {
        setIsLoading(true);
        setInitialLoadComplete(false);
        setAnalysisSummary(null); 
        try {
          const marks = await fetchMarksFromStorage(
              parseInt(selectedSemester),
              selectedSection,
              selectedSubject.code
          );
           setInitialLoadComplete(true); 
          if (marks.length > 0) {
            const summary = calculateDetailedSummary(marks);
            setAnalysisSummary(summary);
          } else {
             toast({ title: "No Data", description: "No marks data found for this selection. Ensure marks have been entered for this class/subject.", variant: "default" });
          }
        } catch (error) {
            console.error("Error fetching marks for analysis:", error);
            toast({ title: "Error", description: (error as Error).message || "Could not fetch marks data.", variant: "destructive" });
            setInitialLoadComplete(true); 
        } finally {
             setIsLoading(false);
        }
      } else {
           setIsLoading(false);
           setInitialLoadComplete(false); 
           setAnalysisSummary(null);
      }
    };
    loadPerformanceData();
  }, [selectedSemester, selectedSection, selectedSubject, user, toast]);

  const averageScoresChartData = useMemo(() => {
    if (!analysisSummary?.averages) return [];
    const data = [];
    const maxMarksMap: Record<string, number> = { ia1_50: 50, ia2_50: 50, assignment1_20: 20, assignment2_20: 20 };
    const labels: Record<string, string> = { ia1_50: "IA 1", ia2_50: "IA 2", assignment1_20: "Assign 1", assignment2_20: "Assign 2" };

    for (const key in analysisSummary.averages) {
      if (analysisSummary.averages[key] !== 'N/A') {
        data.push({
          name: labels[key as keyof typeof labels] || key,
          "Average Score": parseFloat(analysisSummary.averages[key]),
          "Max Marks": maxMarksMap[key as keyof typeof maxMarksMap],
        });
      }
    }
    return data;
  }, [analysisSummary]);

  const passPercentageChartData = useMemo(() => {
    if (!analysisSummary?.passPercentages) return [];
    const data = [];
    const labels: Record<string, string> = { ia1_50: "IA 1", ia2_50: "IA 2", assignment1_20: "Assign 1", assignment2_20: "Assign 2" };

    for (const key in analysisSummary.passPercentages) {
      if (analysisSummary.passPercentages[key] !== 'N/A') {
        data.push({
          name: labels[key as keyof typeof labels] || key,
          "Pass %": parseFloat(analysisSummary.passPercentages[key].replace('%','')),
        });
      }
    }
    return data;
  }, [analysisSummary]);
  
  const distributionChartData = useMemo(() => {
    if (!analysisSummary?.distribution) return [];
    const assessmentLabels: Record<string, string> = { ia1_50: "IA 1", ia2_50: "IA 2", assignment1_20: "Assign 1", assignment2_20: "Assign 2" };
    
    return Object.entries(assessmentLabels).map(([fieldKey, assessmentName]) => {
        const dist = analysisSummary.distribution[fieldKey] || {};
        return {
            assessment: assessmentName,
            data: Object.entries(dist).map(([range, count]) => ({ range, count }))
        };
    }).filter(item => item.data.length > 0);
  }, [analysisSummary]);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  const selectionMade = !!(selectedSemester && selectedSection && selectedSubject);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><BarChartIcon className="mr-2 h-8 w-8 text-primary" /> Performance Analysis</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class and Subject</CardTitle>
          <CardDescription>Choose the semester, section, and subject to analyze performance.</CardDescription>
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
                    <SelectItem value="-" disabled>No subjects found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Analysis for {selectedSubject?.name} ({selectedSubject?.code}) - Sem {selectedSemester}, Sec {selectedSection}</CardTitle>
            <CardDescription>Overview of student performance based on entered marks.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
                 </div>
            ) : analysisSummary && analysisSummary.count > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <Card className="bg-muted/30">
                   <CardHeader className="pb-2">
                     <CardTitle className="text-base font-medium flex items-center justify-between">
                       Total Students <Users className="h-4 w-4 text-muted-foreground" />
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{analysisSummary.count}</div>
                     <p className="text-xs text-muted-foreground">students with recorded marks</p>
                   </CardContent>
                 </Card>
                 {Object.entries(analysisSummary.averages).map(([key, avg]) => (
                   <Card key={key} className="bg-muted/30">
                     <CardHeader className="pb-2">
                       <CardTitle className="text-base font-medium flex items-center justify-between">
                         Avg. {key.replace('_50', ' (50)').replace('_20', ' (20)').replace('ia', 'IA ').replace('assignment', 'Assign ')}
                         <Percent className="h-4 w-4 text-muted-foreground" />
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                        <div className="text-2xl font-bold">{avg}</div>
                        <p className="text-xs text-muted-foreground">average score</p>
                     </CardContent>
                   </Card>
                 ))}
                 {Object.entries(analysisSummary.passPercentages).map(([key, passRate]) => (
                   <Card key={`pass-${key}`} className="bg-muted/30">
                     <CardHeader className="pb-2">
                       <CardTitle className="text-base font-medium flex items-center justify-between">
                         Pass % ({key.replace('_50', '').replace('_20', '').replace('ia', 'IA ').replace('assignment', 'Assign ')})
                          <CheckSquare className="h-4 w-4 text-muted-foreground" />
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                        <div className="text-2xl font-bold">{passRate}</div>
                         <p className="text-xs text-muted-foreground">passing threshold (40%)</p>
                     </CardContent>
                   </Card>
                 ))}
                  <Card className="bg-success/10">
                   <CardHeader className="pb-2">
                     <CardTitle className="text-base font-medium flex items-center justify-between">
                       High Performers <TrendingUp className="h-4 w-4 text-success" />
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{analysisSummary.highPerformers}</div>
                     <p className="text-xs text-success/80">students significantly above avg. IA</p>
                   </CardContent>
                 </Card>
                 <Card className="bg-destructive/10">
                   <CardHeader className="pb-2">
                     <CardTitle className="text-base font-medium flex items-center justify-between">
                       Low Performers <TrendingDown className="h-4 w-4 text-destructive" />
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{analysisSummary.lowPerformers}</div>
                     <p className="text-xs text-destructive/80">students significantly below avg. IA</p>
                   </CardContent>
                 </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                  {averageScoresChartData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Average Scores by Assessment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                          <BarChart data={averageScoresChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} domain={[0, 50]}/>
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend content={<ChartLegendContent />} />
                            <Bar dataKey="Average Score" fill="var(--color-averageScore)" radius={4} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}

                  {passPercentageChartData.length > 0 && (
                     <Card>
                      <CardHeader>
                        <CardTitle>Pass Percentage by Assessment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                          <BarChart data={passPercentageChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} domain={[0, 100]} unit="%"/>
                            <Tooltip content={<ChartTooltipContent />} />
                             <Legend content={<ChartLegendContent />} />
                            <Bar dataKey="Pass %" fill="var(--color-passPercentage)" radius={4} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                {distributionChartData.length > 0 && (
                    <div className="mt-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Marks Distribution by Assessment</CardTitle>
                                <CardDescription>Number of students in different mark ranges for each assessment.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {distributionChartData.map(assessment => (
                                    <div key={assessment.assessment}>
                                        <h3 className="font-semibold text-center mb-2">{assessment.assessment}</h3>
                                        <ChartContainer config={{
                                            count: { label: "Students", color: "hsl(var(--chart-1))" }
                                        }} className="h-[250px] w-full">
                                            <BarChart data={assessment.data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                                                <YAxis dataKey="range" type="category" tickLine={false} axisLine={false} width={80} />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                                            </BarChart>
                                        </ChartContainer>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}


              </>
            ) : (
               initialLoadComplete && ( 
                  <p className="text-center py-8 text-muted-foreground">No performance data available for this selection. Ensure marks have been entered.</p>
               )
            )}
          </CardContent>
        </Card>
      )}

       {!selectionMade && !isLoading && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Select Class for Analysis</AlertTitle>
            <AlertDescription>Please select a semester, section, and subject above to view the performance analysis.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}

