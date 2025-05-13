
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, BookOpen, CheckSquare, ClipboardList, Edit3, FileText, LayoutDashboard, ShieldCheck, Users, UserCircle, Bell } from 'lucide-react';
import Link from 'next/link';
// Removed: import Image from 'next/image';

// Placeholder components for role-specific dashboards
const StudentDashboard = () => (
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
);

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
     <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LayoutDashboard className="text-primary" /> System Overview</CardTitle>
        <CardDescription>Monitor platform activity and statistics.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">System statistics and monitoring tools would appear here.</p>
        {/* Image removed from here */}
      </CardContent>
    </Card>
  </div>
);


export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return <p>Loading user data...</p>; // Or a skeleton loader
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
