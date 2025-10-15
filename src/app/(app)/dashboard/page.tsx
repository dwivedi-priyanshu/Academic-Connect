
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, CheckSquare, ClipboardList, Edit3, FileText, LayoutDashboard, ShieldCheck, Users, UserCircle, BarChart2, Settings2, LibraryBig, UserSearch, Archive, BookCopy, Briefcase, Rocket, Presentation, Award, Video, Workflow } from 'lucide-react';
import Link from 'next/link';

const StudentDashboard = () => {
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
            <CardTitle className="flex items-center gap-2"><FileText className="text-primary" /> My Mini-Projects</CardTitle>
            <CardDescription>Submit and track your mini-project progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/academics/projects">Manage Mini-Projects <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="text-primary" /> My Internships</CardTitle>
            <CardDescription>Track your internship applications and progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/academics/internship">Manage Internships <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Rocket className="text-primary" /> Major Project</CardTitle>
            <CardDescription>Manage your final year major project submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/academics/major-project">Manage Major Project <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Presentation className="text-primary" /> Technical Seminar</CardTitle>
            <CardDescription>Submit and track your technical seminar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/academics/technical-seminar">Manage Seminar <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


const FacultyDashboard = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
     <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserSearch className="text-primary" /> Student Search</CardTitle>
        <CardDescription>Search and view detailed student profiles and marks.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/student-search">Search Students <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
        <CardTitle className="flex items-center gap-2"><BarChart2 className="text-primary" /> Class Performance</CardTitle>
        <CardDescription>View marks and performance statistics for classes.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/class-performance">View Performance <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
        <CardTitle className="flex items-center gap-2"><LibraryBig className="text-primary" /> Project Repository</CardTitle>
        <CardDescription>Browse all approved mini-projects.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/approved-projects">View Projects <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Archive className="text-primary" /> MOOC Repository</CardTitle>
        <CardDescription>Browse approved MOOCs for your coordinated semesters.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/mooc-repository">View MOOCs <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Video className="text-primary" /> Flipped Class Report</CardTitle>
        <CardDescription>Create and download a report for a flipped classroom session.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/flipped-classroom">Create Report <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Workflow className="text-primary" /> Workshop Report</CardTitle>
        <CardDescription>Generate a detailed report for a conducted workshop.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/faculty/workshop-report">Create Report <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
            <CardTitle className="flex items-center gap-2"><Settings2 className="text-primary" /> Assignments</CardTitle>
            <CardDescription>Manage faculty-subject and MOOC coordinator assignments.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild variant="outline">
                <Link href="/admin/assignments">Manage Assignments <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </CardContent>
    </Card>
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookCopy className="text-primary" /> Subject Management</CardTitle>
            <CardDescription>Define and manage subjects for departments and semesters.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild variant="outline">
                <Link href="/admin/subject-management">Manage Subjects <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
      
      {renderDashboardContent()}
    </div>
  );
}
