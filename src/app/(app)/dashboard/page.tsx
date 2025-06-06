
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, BookOpen, CheckSquare, ClipboardList, Edit3, FileText, LayoutDashboard, ShieldCheck, Users, UserCircle, Bell, BarChart as BarChartIcon, PieChart } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { fetchStudentMarksAction } from '@/actions/student-data-actions';
import type { SubjectMark } from '@/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useToast } from "@/hooks/use-toast";


const chartConfig = {
  ia1: { label: "IAT 1 (Max 50)", color: "hsl(var(--chart-1))" },
  ia2: { label: "IAT 2 (Max 50)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const StudentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [marksForChart, setMarksForChart] = useState<SubjectMark[]>([]);
  const [isLoadingMarks, setIsLoadingMarks] = useState(true);
  const [selectedSemesterForChart, setSelectedSemesterForChart] = useState<string>("1"); // Default to sem 1
  const semestersForSelector = ["1", "2", "3", "4", "5", "6", "7", "8"];

  useEffect(() => {
    if (user && user.role === 'Student') {
      setIsLoadingMarks(true);
      const semesterNumber = parseInt(selectedSemesterForChart, 10);
      
      fetchStudentMarksAction(user.id, semesterNumber)
        .then(data => {
          setMarksForChart(data);
          setIsLoadingMarks(false);
        })
        .catch(error => {
           console.error("Failed to fetch marks for chart:", error);
           toast({ title: "Error", description: "Could not load marks for the chart.", variant: "destructive" });
           setIsLoadingMarks(false);
        });
    } else {
      setIsLoadingMarks(false); 
    }
  }, [user, selectedSemesterForChart, toast]);

  const marksChartData = useMemo(() => {
    if (!marksForChart || marksForChart.length === 0) return [];
    return marksForChart.map(mark => ({
      subjectName: mark.subjectName.length > 15 ? `${mark.subjectName.substring(0,15)}...` : mark.subjectName, // Truncate long names
      subjectCode: mark.subjectCode,
      ia1: mark.ia1_50,
      ia2: mark.ia2_50,
    })).filter(mark => mark.ia1 !== null || mark.ia2 !== null); // Only include subjects with at least one IA mark
  }, [marksForChart]);


  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCircle className="text-primary" /> My Profile</CardTitle>
            <CardDescription>View and update your personal and academic information.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/profile">Go to Profile <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="text-primary" /> My Marks</CardTitle>
            <CardDescription>Check your internal assessment and assignment marks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/academics/marks">View Marks <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="text-primary" /> My Projects</CardTitle>
            <CardDescription>Submit and track your mini-project progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/academics/projects">Manage Projects <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="text-primary" /> My MOOCs</CardTitle>
            <CardDescription>Upload and manage your MOOC certifications.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/academics/moocs">Manage MOOCs <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg mt-8 col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2"><BarChartIcon className="text-primary" /> Internal Assessment Performance</CardTitle>
                <CardDescription>IAT 1 vs IAT 2 marks for Semester {selectedSemesterForChart}.</CardDescription>
            </div>
            <div className="w-48">
              <Select value={selectedSemesterForChart} onValueChange={setSelectedSemesterForChart}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  {semestersForSelector.map(sem => (
                    <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </CardHeader>
        <CardContent className="pl-2 pr-6">
          {isLoadingMarks ? (
            <div className="h-[350px] w-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
            </div>
          ) : marksChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <BarChart accessibilityLayer data={marksChartData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="subjectCode" // Using subject code for brevity on X-axis
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  // tickFormatter={(value) => value.length > 10 ? `${value.substring(0,10)}...` : value} // Handled in useMemo now
                />
                <YAxis tickLine={false} axisLine={false} domain={[0, 50]}/>
                <Tooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent 
                            indicator="dot"
                            formatter={(value, name, props) => {
                                const { subjectName } = props.payload;
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-medium">{subjectName} ({props.payload.subjectCode})</span>
                                    <span className="text-muted-foreground">
                                      {name === 'ia1' ? chartConfig.ia1.label : chartConfig.ia2.label}: {value}
                                    </span>
                                  </div>
                                );
                            }}
                        />
                    }
                />
                <Legend />
                <Bar dataKey="ia1" fill="var(--color-ia1)" radius={4} barSize={30} />
                <Bar dataKey="ia2" fill="var(--color-ia2)" radius={4} barSize={30} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground">
              <PieChart className="h-12 w-12 mb-2" />
              <p className="text-lg">No IA marks available for Semester {selectedSemesterForChart}.</p>
              <p>Marks will appear here once entered by your faculty.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}


const FacultyDashboard = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="text-primary" /> Student Profiles</CardTitle>
        <CardDescription>View and manage student information.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/students">View Students <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Edit3 className="text-primary" /> Marks Entry</CardTitle>
        <CardDescription>Input IA and assignment marks for students.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/marks-entry">Enter Marks <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CheckSquare className="text-primary" /> Approvals</CardTitle>
        <CardDescription>Review and approve project and MOOC submissions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/approvals">Manage Approvals <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
     <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChartIcon className="text-primary" /> Performance Analysis</CardTitle>
        <CardDescription>Analyze student marks and class performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/performance-analysis">View Analysis <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  </div>
);

const AdminDashboard = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary" /> User Management</CardTitle>
        <CardDescription>Manage roles and access for all users.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/admin/users">Manage Users <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><LayoutDashboard className="text-primary" /> Assignments</CardTitle>
            <CardDescription>Manage faculty-subject and MOOC coordinator assignments.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild variant="outline">
                <Link href="/admin/assignments">Manage Assignments <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </CardContent>
    </Card>
  </div>
);


export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-10">
            <LayoutDashboard className="w-16 h-16 mb-4 text-muted animate-pulse" />
            <h2 className="text-2xl font-semibold mb-2 text-muted-foreground">Loading Dashboard...</h2>
            <p className="text-muted-foreground">Please wait while we prepare your dashboard.</p>
        </div>
    );
  }

  const renderDashboardContent = () => {
    switch (user.role) {
      case 'Student':
        return <StudentDashboard />;
      case 'Faculty':
        return <FacultyDashboard />;
      case 'Admin':
        return <AdminDashboard />;
      default:
        return <p>Invalid user role.</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <span className="text-sm text-muted-foreground">Welcome back, {user.name}!</span>
      </div>

      <Alert className="bg-accent/20 border-accent text-accent-foreground">
        <Bell className="h-5 w-5 text-accent" />
        <AlertTitle className="font-semibold">Announcements!</AlertTitle>
        <AlertDescription>
          The deadline for mini-project submissions is approaching. Please submit by DD/MM/YYYY.
        </AlertDescription>
      </Alert>
      
      {renderDashboardContent()}
    </div>
  );
}

