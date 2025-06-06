
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  UserCircle,
  ClipboardList,
  FileText,
  BookOpen,
  Users,
  Edit3,
  CheckSquare,
  ShieldCheck,
  LayoutDashboard,
  GraduationCap,
  BarChart2, 
  Settings2, 
  LibraryBig,
  UserSearch 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../core/Logo';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: ('Student' | 'Faculty' | 'Admin')[];
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Student', 'Faculty', 'Admin'], exact: true },
  { href: '/profile', label: 'Profile', icon: UserCircle, roles: ['Student', 'Faculty', 'Admin'] }, 
  // Student specific
  { href: '/academics/marks', label: 'My Marks', icon: ClipboardList, roles: ['Student'] },
  { href: '/academics/projects', label: 'My Projects', icon: FileText, roles: ['Student'] },
  { href: '/academics/moocs', label: 'My MOOCs', icon: BookOpen, roles: ['Student'] },
  // Faculty specific
  // { href: '/faculty/students', label: 'Student List', icon: Users, roles: ['Faculty'] }, // Removed as per request
  { href: '/faculty/student-lookup', label: 'Student Lookup', icon: UserSearch, roles: ['Faculty'] },
  { href: '/faculty/marks-entry', label: 'Marks Entry', icon: Edit3, roles: ['Faculty'] },
  { href: '/faculty/class-performance', label: 'Class Performance', icon: BarChart2, roles: ['Faculty'] },
  { href: '/faculty/approvals', label: 'Approvals', icon: CheckSquare, roles: ['Faculty'] },
  { href: '/faculty/approved-projects', label: 'Project Repository', icon: LibraryBig, roles: ['Faculty'] },
  // Admin specific
  { href: '/admin/users', label: 'User Management', icon: ShieldCheck, roles: ['Admin'] },
  { href: '/admin/assignments', label: 'Assignments', icon: Settings2, roles: ['Admin'] }, 
];

export function AppSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground sm:flex">
      <div className="flex h-14 items-center border-b px-6 bg-sidebar">
        <Logo iconSize={28} textSize="text-xl" />
      </div>
      <ScrollArea className="flex-1">
        <nav className="grid items-start px-4 py-4 text-sm font-medium">
          {filteredNavItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive ? 'bg-sidebar-accent text-sidebar-primary font-semibold' : 'text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
