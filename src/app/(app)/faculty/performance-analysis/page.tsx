'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark } from '@/types';
import { BarChart, Info, Users, Percent, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchMarksFromStorage } from '@/actions/marks-upload'; // Import fetch action
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

// Mock Data (same as marks-entry)
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
const SUBJECTS_BY_SEMESTER: Record<string, { code: string, name: string }[]> = {
  "1": [{ code: "MA101", name: "Applied Mathematics I" }, { code: "PH102", name: "Engineering Physics" }],
  "2": [{ code: "MA201", name: "Applied Mathematics II" }, { code: "CH202", name: "Engineering Chemistry" }],
  "3": [{ code: "CS201", name: "Data Structures" }, { code: "CS202", name: "Discrete Mathematics" }, { code: "MA201", name: "Probability & Statistics" }, { code: "DDCO", name: "Digital Design & Comp Org"}],
  // Add more semesters and subjects
};

// Function to calculate detailed summary statistics
const calculateDetailedSummary = (marks: SubjectMark[]) => {
    if (!marks || marks.length === 0) {
        return { count: 0, averages: {}, passPercentages: {}, highPerformers: 0, lowPerformers: 0 };
    }
    const validMarks = marks.filter(m => m.ia1_50 !== null || m.ia2_50 !== null || m.assignment1_20 !== null || m.assignment2_20 !== null);
    const count = validMarks.length;

    const fields: (keyof SubjectMark)[] = ['ia1_50', 'ia2_50', 'assignment1_20', 'assignment2_20'];
    const maxMarks: Record<string, number> = { 'ia1_50': 50, 'ia2_50': 50, 'assignment1_20': 20, 'assignment2_20': 20 };
    const passMarksThresholdFactor = 0.4; // e.g., 40% to pass

    const averages: Record<string, string> = {};
    const passPercentages: Record<string, string> = {};

    fields.forEach(field => {
        const marksList = validMarks.map(m => m[field]).filter(mark => mark !== null) as number[];
        if (marksList.length > 0) {
            const sum = marksList.reduce((acc, curr) => acc + curr, 0);
            averages[field] = (sum / marksList.length).toFixed(2);

            const max = maxMarks[field];
            const passMark = max * passMarksThresholdFactor;
            const passedCount = marksList.filter(mark => mark >= passMark).length;
            passPercentages[field] = ((passedCount / marksList.length) * 100).toFixed(1) + '%';
        } else {
            averages[field] = 'N/A';
            passPercentages[field] = 'N/A';
        }
    });

    // Example: Define high/low performers based on average IA marks (simplified)
    const iaAvgList = validMarks.map(m => ((m.ia1_50 || 0) + (m.ia2_50 || 0)) / 2).filter(avg => !isNaN(avg));
    const overallAvgIA = iaAvgList.length > 0 ? (iaAvgList.reduce((a,b) => a + b, 0) / iaAvgList.length) : 0;
    const highPerformers = iaAvgList.filter(avg => avg >= overallAvgIA * 1.2).length; // Arbitrary: 20% above avg
    const lowPerformers = iaAvgList.filter(avg => avg < overallAvgIA * 0.8).length; // Arbitrary: 20% below avg

    return {
        count,
        averages,
        passPercentages,
        highPerformers,
        lowPerformers
    };
};

export default function PerformanceAnalysisPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  const [subjectsForSemester, setSubjectsForSemester] = useState<{ code: string, name: string }[]>([]);
  const [performanceData, setPerformanceData] = useState<ReturnType<typeof calculateDetailedSummary> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Update subjects when semester changes
  useEffect(() => {
    setSubjectsForSemester(SUBJECTS_BY_SEMESTER[selectedSemester] || []);
    setSelectedSubject(null);
    setPerformanceData(null); // Reset data on semester change
  }, [selectedSemester]);

  // Reset section/subject specific states when dependencies change
   useEffect(() => {
     setSelectedSubject(null);
     setPerformanceData(null);
   }, [selectedSection]);

   useEffect(() => {
     setPerformanceData(null);
   }, [selectedSubject]);


  // Fetch marks and calculate summary when selection changes
  useEffect(() => {
    const loadPerformanceData = async () => {
      if (selectedSemester && selectedSection && selectedSubject && user) {
        setIsLoading(true);
        setPerformanceData(null); // Clear previous data
        try {
          const marks = await fetchMarksFromStorage(
              parseInt(selectedSemester),
              selectedSection,
              selectedSubject.code
          );
          if (marks.length > 0) {
            const summary = calculateDetailedSummary(marks);
            setPerformanceData(summary);
          } else {
             toast({ title: "No Data", description: "No marks data found for this selection.", variant: "default" });
          }
        } catch (error) {
            console.error("Error fetching marks for analysis:", error);
            toast({ title: "Error", description: "Could not fetch marks data.", variant: "destructive" });
        } finally {
             setIsLoading(false);
        }
      }
    };
    loadPerformanceData();
  }, [selectedSemester, selectedSection, selectedSubject, user, toast]);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  const selectionMade = !!(selectedSemester && selectedSection && selectedSubject);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><BarChart className="mr-2 h-8 w-8 text-primary" /> Performance Analysis</h1>

      {/* Selection Card */}
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

      {/* Analysis Display Card */}
      {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Analysis for {selectedSubject?.name} ({selectedSubject?.code}) - Sem {selectedSemester}, Sec {selectedSection}</CardTitle>
            <CardDescription>Overview of student performance based on entered marks.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                 </div>
            ) : performanceData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Student Count */}
                 <Card className="bg-muted/30">
                   <CardHeader className="pb-2">
                     <CardTitle className="text-base font-medium flex items-center justify-between">
                       Total Students <Users className="h-4 w-4 text-muted-foreground" />
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{performanceData.count}</div>
                     <p className="text-xs text-muted-foreground">students with recorded marks</p>
                   </CardContent>
                 </Card>

                 {/* Average Scores */}
                 {Object.entries(performanceData.averages).map(([key, avg]) => (
                   <Card key={key} className="bg-muted/30">
                     <CardHeader className="pb-2">
                       <CardTitle className="text-base font-medium flex items-center justify-between">
                         Avg. {key.replace('_', ' ').replace(' ia', ' IA ').replace(' assignment', ' Assign ')}
                         <Percent className="h-4 w-4 text-muted-foreground" />
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                        <div className="text-2xl font-bold">{avg}</div>
                        <p className="text-xs text-muted-foreground">average score</p>
                     </CardContent>
                   </Card>
                 ))}

                 {/* Pass Percentages */}
                 {Object.entries(performanceData.passPercentages).map(([key, passRate]) => (
                   <Card key={`pass-${key}`} className="bg-muted/30">
                     <CardHeader className="pb-2">
                       <CardTitle className="text-base font-medium flex items-center justify-between">
                         Pass % ({key.replace('_', ' ').replace(' ia', ' IA ').replace(' assignment', ' Assign ')})
                          <CheckSquare className="h-4 w-4 text-muted-foreground" />
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                        <div className="text-2xl font-bold">{passRate}</div>
                         <p className="text-xs text-muted-foreground">passing threshold (40%)</p>
                     </CardContent>
                   </Card>
                 ))}

                 {/* High/Low Performers (Simplified) */}
                  <Card className="bg-success/10">
                   <CardHeader className="pb-2">
                     <CardTitle className="text-base font-medium flex items-center justify-between">
                       High Performers <TrendingUp className="h-4 w-4 text-success" />
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{performanceData.highPerformers}</div>
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
                     <div className="text-2xl font-bold">{performanceData.lowPerformers}</div>
                     <p className="text-xs text-destructive/80">students significantly below avg. IA</p>
                   </CardContent>
                 </Card>

              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No performance data available for this selection. Ensure marks have been uploaded.</p>
            )}
          </CardContent>
        </Card>
      )}

       {/* Initial state message */}
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
