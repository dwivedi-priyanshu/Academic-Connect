
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile } from '@/types';
import { UserCircle, CalendarDays, Phone, MapPin, Building, Users, Briefcase, ArrowLeft, ClipboardList, FileText, BookOpen, Droplet, Fingerprint, Tag, Flag, Award, Users2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { fetchStudentFullProfileDataAction } from '@/actions/profile-actions';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';


export default function FacultyViewStudentProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const { toast } = useToast();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'Faculty' && studentId) {
      setIsLoading(true);
      fetchStudentFullProfileDataAction(studentId).then(data => {
        setProfile(data);
        setIsLoading(false);
      }).catch(err => {
        console.error("Error fetching student profile:", err);
        toast({title: "Error", description: "Could not load student profile.", variant: "destructive"});
        setIsLoading(false);
      });
    } else {
      setIsLoading(false); 
    }
  }, [user, studentId, toast]);

  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30 p-6 rounded-t-lg">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div>
                    <Skeleton className="h-7 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {[...Array(18)].map((_, i) => ( // Increased array size for more skeleton fields
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-1 shadow-lg h-fit">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
               <Skeleton className="h-10 w-full mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <p>Student profile not found.</p>;
  }

  const profileSections = {
    'Account & Academic': [
      { name: 'fullName', label: 'Full Name', icon: UserCircle },
      { name: 'admissionId', label: 'Admission ID (USN)', icon: Briefcase },
      { name: 'department', label: 'Department', icon: Building },
      { name: 'year', label: 'Year of Study', icon: Users },
      { name: 'section', label: 'Section', icon: Users },
    ],
    'Personal Details': [
      { name: 'dateOfBirth', label: 'Date of Birth', icon: CalendarDays, type: 'date' },
      { name: 'gender', label: 'Gender', icon: Users2 },
      { name: 'bloodGroup', label: 'Blood Group', icon: Droplet },
      { name: 'aadharNumber', label: 'Aadhar Number', icon: Fingerprint },
      { name: 'category', label: 'Category', icon: Tag },
      { name: 'religion', label: 'Religion', icon: BookOpen }, 
      { name: 'nationality', label: 'Nationality', icon: Flag },
    ],
    'Contact Information': [
      { name: 'contactNumber', label: 'Contact Number', icon: Phone },
      { name: 'address', label: 'Address', icon: MapPin },
      // Email is displayed in the header
    ],
    'Guardian Information': [
      { name: 'fatherName', label: "Father's Name", icon: UserCircle },
      { name: 'motherName', label: "Mother's Name", icon: UserCircle },
      { name: 'parentName', label: "Parent's/Guardian's Name (If different)", icon: UserCircle },
      { name: 'parentContact', label: "Parent's/Guardian's Contact", icon: Phone },
    ],
    'Academic History': [
      { name: 'sslcMarks', label: 'SSLC/10th Marks', icon: Award },
      { name: 'pucMarks', label: 'PUC/12th Marks', icon: Award },
    ],
  };
  
  const quickLinks = [
    // { label: "View Marks", href: `/faculty/students/${studentId}/marks`, icon: ClipboardList },
    // { label: "View Projects", href: `/faculty/students/${studentId}/projects`, icon: FileText },
    // { label: "View MOOCs", href: `/faculty/students/${studentId}/moocs`, icon: BookOpen },
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
                  {/* Display email from User object, assuming student user has email */}
                  {/* This might require fetching User object separately or including it in StudentProfile if not already */}
                  {/* For now, we'll assume student.email exists if it's part of User fetched for AuthContext */}
                  {/* <CardDescription>Email: {user?.email} </CardDescription> */}
              </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {Object.entries(profileSections).map(([sectionTitle, fields]) => (
              <div key={sectionTitle}>
                <h3 className="text-xl font-semibold mb-3 text-primary border-b pb-1.5">{sectionTitle}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {fields.map(field => (
                    <div key={field.name} className="space-y-1">
                      <Label className="flex items-center text-sm font-medium text-muted-foreground">
                        <field.icon className="mr-2 h-4 w-4" /> {field.label}
                      </Label>
                      <p className="text-md p-2 border-b min-h-[30px] bg-muted/10 rounded-sm">
                        {field.type === 'date' && (profile as any)[field.name] 
                          ? new Date((profile as any)[field.name]).toLocaleDateString() 
                          : (profile as any)[field.name] || <span className="italic text-muted-foreground/70">N/A</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 shadow-lg h-fit">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Access student's academic records (coming soon).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map(link => (
              <Button key={link.label} variant="outline" className="w-full justify-start" asChild disabled>
                <Link href={link.href}>
                  <link.icon className="mr-2 h-4 w-4" /> {link.label}
                </Link>
              </Button>
            ))}
            <Button variant="default" className="w-full justify-start mt-2" disabled>
                Enter Marks (Contextual - TBD)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

