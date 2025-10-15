
'use client';
import React, { useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar, type NavItem } from '@/components/layout/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { GraduationCap, LayoutDashboard, UserCircle, ClipboardList, FileText, BookOpen, Users, Edit3, CheckSquare, ShieldCheck, BarChart2, Settings2, LibraryBig, UserSearch, Archive, BookCopy, Briefcase, Rocket, Presentation, Award, Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Student', 'Faculty', 'Admin'], exact: true },
  { href: '/profile', label: 'Profile', icon: UserCircle, roles: ['Student', 'Faculty', 'Admin'] },
  { href: '/academics/marks', label: 'My Marks', icon: ClipboardList, roles: ['Student'] },
  { href: '/academics/projects', label: 'My Mini-Projects', icon: FileText, roles: ['Student'] },
  { href: '/academics/moocs', label: 'My MOOCs', icon: BookOpen, roles: ['Student'] },
  { href: '/academics/internship', label: 'My Internships', icon: Briefcase, roles: ['Student'] },
  { href: '/academics/major-project', label: 'Major Project', icon: Rocket, roles: ['Student'] },
  { href: '/academics/technical-seminar', label: 'Technical Seminar', icon: Presentation, roles: ['Student'] },
  { href: '/placement-details', label: 'Placement Details', icon: Award, roles: ['Student'] },
  { href: '/faculty/student-search', label: 'Student Search', icon: UserSearch, roles: ['Faculty'] },
  { href: '/faculty/marks-entry', label: 'Marks Entry', icon: Edit3, roles: ['Faculty'] },
  { href: '/faculty/class-performance', label: 'Class Performance', icon: BarChart2, roles: ['Faculty'] },
  { href: '/faculty/approvals', label: 'Approvals', icon: CheckSquare, roles: ['Faculty'] },
  { href: '/faculty/approved-projects', label: 'Project Repository', icon: LibraryBig, roles: ['Faculty'] },
  { href: '/faculty/mooc-repository', label: 'MOOC Repository', icon: Archive, roles: ['Faculty'] },
  { href: '/faculty/flipped-classroom', label: 'Flipped Class Report', icon: Video, roles: ['Faculty'] },
  { href: '/admin/users', label: 'User Management', icon: ShieldCheck, roles: ['Admin'] },
  { href: '/admin/assignments', label: 'Assignments', icon: Settings2, roles: ['Admin'] },
  { href: '/admin/subject-management', label: 'Subject Management', icon: BookCopy, roles: ['Admin'] },
];


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
        <GraduationCap className="h-16 w-16 text-primary animate-pulse" />
        <p className="mt-4 text-muted-foreground">Securing your session...</p>
      </div>
    );
  }

  const userSpecificNavItems = user ? allNavItems.filter(item => item.roles.includes(user.role)) : [];

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-72"> 
        <AppHeader sidebarNavItems={userSpecificNavItems} />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
        <footer className="mt-auto border-t bg-background px-6 py-4 text-center text-xs text-muted-foreground sm:text-left">
          Academic Connect &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
