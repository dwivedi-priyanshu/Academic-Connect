'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile } from '@/types';
import { UserCircle, CalendarDays, Phone, MapPin, Building, Users, Briefcase, ArrowLeft, ClipboardList, FileText, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

// Mock student data (same as in student list, but could be fetched by ID)
const MOCK_STUDENTS_DATA: StudentProfile[] = [
  { userId: 'student001', admissionId: 'S001', fullName: 'Alice Wonderland', dateOfBirth: '2002-05-10', contactNumber: '555-0101', address: '123 Rabbit Hole Lane', department: 'Computer Science', year: 2, section: 'A', parentName: 'Queen of Hearts', parentContact: '555-0102' },
  { userId: 'student002', admissionId: 'S002', fullName: 'Bob The Builder', dateOfBirth: '2001-11-20', contactNumber: '555-0103', address: '456 Construction Site', department: 'Mechanical Engineering', year: 3, section: 'B', parentName: 'Wendy', parentContact: '555-0104' },
  { userId: 'student003', admissionId: 'S003', fullName: 'Charlie Brown', dateOfBirth: '2003-02-15', contactNumber: '555-0105', address: '789 Peanut Street', department: 'Electronics Engineering', year: 1, section: 'A', parentName: 'Mr. Brown', parentContact: '555-0106' },
  { userId: 'student004', admissionId: 'S004', fullName: 'Diana Prince', dateOfBirth: '2000-08-01', contactNumber: '555-0107', address: 'Themyscira Island', department: 'Civil Engineering', year: 4, section: 'C', parentName: 'Hippolyta', parentContact: '555-0108' },
  { userId: 'student005', admissionId: 'S005', fullName: 'Edward Scissorhands', dateOfBirth: '2002-12-25', contactNumber: '555-0109', address: 'Gothic Mansion Hilltop', department: 'Computer Science', year: 2, section: 'B', parentName: 'The Inventor', parentContact: '555-0110' },
];

// Mock function to fetch a specific student's profile data
const fetchStudentProfileById = async (studentId: string): Promise<StudentProfile | null> => {
  console.log("Fetching profile for student ID:", studentId);
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real app, fetch from backend.
  const storedProfile = localStorage.getItem(`profile-${studentId}`);
  if (storedProfile) return JSON.parse(storedProfile);
  
  const student = MOCK_STUDENTS_DATA.find(s => s.userId === studentId);
  return student || null;
};

export default function FacultyViewStudentProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'Faculty' && studentId) {
      fetchStudentProfileById(studentId).then(data => {
        setProfile(data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false); // Not a faculty or no studentId
    }
  }, [user, studentId]);

  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  if (isLoading) {
    return <p>Loading student profile...</p>; // Or a skeleton loader
  }

  if (!profile) {
    return <p>Student profile not found.</p>;
  }

  const profileFields = [
    { name: 'fullName', label: 'Full Name', icon: UserCircle },
    { name: 'admissionId', label: 'Admission ID', icon: Briefcase },
    { name: 'dateOfBirth', label: 'Date of Birth', icon: CalendarDays, type: 'date' },
    { name: 'contactNumber', label: 'Contact Number', icon: Phone },
    { name: 'address', label: 'Address', icon: MapPin },
    { name: 'department', label: 'Department', icon: Building },
    { name: 'year', label: 'Year of Study', icon: Users },
    { name: 'section', label: 'Section', icon: Users },
    { name: 'parentName', label: "Parent's Name", icon: UserCircle },
    { name: 'parentContact', label: "Parent's Contact", icon: Phone },
  ];
  
  const quickLinks = [
    { label: "View Marks", href: `/faculty/students/${studentId}/marks`, icon: ClipboardList },
    { label: "View Projects", href: `/faculty/students/${studentId}/projects`, icon: FileText },
    { label: "View MOOCs", href: `/faculty/students/${studentId}/moocs`, icon: BookOpen },
  ];


  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List
      </Button>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><UserCircle className="mr-2 h-8 w-8 text-primary" /> Student Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30 p-6 rounded-t-lg">
              <Image 
                src={`https://picsum.photos/seed/${profile.userId}/80/80`} 
                alt={profile.fullName} 
                width={80} 
                height={80} 
                className="rounded-full border-2 border-primary shadow-md"
                data-ai-hint="person face"
              />
              <div>
                  <CardTitle className="text-2xl">{profile.fullName}</CardTitle>
                  <CardDescription>{profile.admissionId} | {profile.department} - Year {profile.year}, Section {profile.section}</CardDescription>
              </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {profileFields.map(field => (
                <div key={field.name} className="space-y-1">
                  <Label className="flex items-center text-sm font-medium text-muted-foreground">
                    <field.icon className="mr-2 h-4 w-4" /> {field.label}
                  </Label>
                  <p className="text-md p-2 border-b min-h-[30px]">
                    {field.type === 'date' && (profile as any)[field.name] 
                      ? new Date((profile as any)[field.name]).toLocaleDateString() 
                      : (profile as any)[field.name] || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 shadow-lg h-fit">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Access student's academic records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map(link => (
              <Button key={link.label} variant="outline" className="w-full justify-start" asChild>
                <Link href={link.href}>
                  <link.icon className="mr-2 h-4 w-4" /> {link.label}
                </Link>
              </Button>
            ))}
            <Button variant="default" className="w-full justify-start mt-2" disabled>
                Enter Marks for this Student
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
