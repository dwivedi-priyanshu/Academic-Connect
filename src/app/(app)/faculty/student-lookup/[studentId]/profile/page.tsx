
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile, SubjectMark } from '@/types';
import { UserCircle, CalendarDays, Phone, MapPin, Building, Users as UsersIcon, Briefcase, ArrowLeft, ClipboardList, BookOpen, Droplet, Fingerprint, Tag, Flag, Award, Users2, ClipboardCheck, BarChart2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { fetchStudentFullProfileDataAction } from '@/actions/profile-actions';
import { fetchStudentMarksAction } from '@/actions/student-data-actions';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Percent } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function FacultyViewStudentDetailedProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string; 
  const { toast } = useToast();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [selectedMarksSemester, setSelectedMarksSemester] = useState<string>("");
  const [marksForSemester, setMarksForSemester] = useState<SubjectMark[]>([]);
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);

  useEffect(() => {
    if (user && user.role === 'Faculty' && studentId) {
      setIsLoadingProfile(true);
      fetchStudentFullProfileDataAction(studentId).then(data => {
        setProfile(data);
        if (data) {
            setSelectedMarksSemester(String(data.currentSemester)); 
        }
        setIsLoadingProfile(false);
      }).catch(err => {
        console.error("Error fetching student profile:", err);
        toast({title: "Error", description: "Could not load student profile.", variant: "destructive"});
        setIsLoadingProfile(false);
      });
    } else {
      setIsLoadingProfile(false); 
    }
  }, [user, studentId, toast]);

  useEffect(() => {
    if (studentId && selectedMarksSemester) {
        setIsLoadingMarks(true);
        fetchStudentMarksAction(studentId, parseInt(selectedMarksSemester))
            .then(data => setMarksForSemester(data))
            .catch(err => {
                console.error("Error fetching student marks:", err);
                toast({title: "Error", description: "Could not load marks for the selected semester.", variant: "destructive"})
            })
            .finally(() => setIsLoadingMarks(false));
    }
  }, [studentId, selectedMarksSemester, toast]);


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  if (isLoadingProfile && !profile) {
    return <ProfilePageSkeleton />;
  }

  if (!profile) {
    return <p>Student profile not found.</p>;
  }

  const profileSections = {
    'Account & Academic': [
      { name: 'fullName', label: 'Full Name', icon: UserCircle },
      { name: 'admissionId', label: 'Admission ID (USN)', icon: Briefcase },
      { name: 'department', label: 'Department', icon: Building },
      { name: 'year', label: 'Year of Study', icon: UsersIcon },
      { name: 'currentSemester', label: 'Current Semester', icon: ClipboardCheck },
      { name: 'section', label: 'Section', icon: UsersIcon },
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
  
  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/faculty/student-lookup')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student Lookup
      </Button>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><UserCircle className="mr-2 h-8 w-8 text-primary" /> Student Details</h1>
      </div>
      <Card className="lg:col-span-2 shadow-lg">
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30 p-6 rounded-t-lg">
            <Image 
            src={profile.avatar || `https://placehold.co/80x80.png?text=${profile.fullName.substring(0,1)}`} 
            alt={profile.fullName} 
            data-ai-hint="person face"
            width={80} 
            height={80} 
            className="rounded-full border-2 border-primary shadow-md"
            />
            <div>
                <CardTitle className="text-2xl">{profile.fullName}</CardTitle>
                <CardDescription>{profile.admissionId} | Dept: {profile.department || 'N/A'} | Year: {profile.year || 'N/A'} | Sem: {profile.currentSemester || 'N/A'} | Sec: {profile.section || 'N/A'}</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none">
              <TabsTrigger value="profile" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Profile Details</TabsTrigger>
              <TabsTrigger value="marks" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Academic Marks</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="p-6">
              <div className="space-y-6">
                {Object.entries(profileSections).map(([sectionTitle, fields]) => (
                  <div key={sectionTitle}>
                    <h3 className="text-xl font-semibold mb-3 text-primary border-b pb-1.5">{sectionTitle}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {fields.map(field => {
                        return (
                          <div key={field.name} className="space-y-1">
                            <Label htmlFor={field.name} className="flex items-center text-sm font-medium text-muted-foreground">
                              <field.icon className="mr-2 h-4 w-4" /> {field.label}
                            </Label>
                            <p className="text-md p-2 border-b min-h-[40px] bg-muted/20 rounded-sm">
                                {field.name === 'currentSemester' && (profile as any)[field.name]
                                ? `Semester ${(profile as any)[field.name]}`
                                : field.type === 'date' && (profile as any)[field.name] 
                                    ? new Date((profile as any)[field.name]).toLocaleDateString() 
                                    : (profile as any)[field.name] || <span className="italic text-muted-foreground/70">N/A</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="marks" className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-primary">Marks for Semester {selectedMarksSemester}</h3>
                    <div className="w-48">
                        <Select value={selectedMarksSemester} onValueChange={setSelectedMarksSemester}>
                            <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                            <SelectContent>
                            {SEMESTERS.map(sem => (
                                <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {isLoadingMarks ? (
                     <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={`marks-skel-${i}`} className="flex items-center space-x-4 p-2 border-b">
                            <Skeleton className="h-8 w-1/4" /> <Skeleton className="h-8 w-1/6" /> 
                            <Skeleton className="h-8 w-1/6" /> <Skeleton className="h-8 w-1/6" /> 
                            <Skeleton className="h-8 w-1/6" /> <Skeleton className="h-8 w-1/6" />
                            </div>
                        ))}
                    </div>
                ) : marksForSemester.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-[300px]">Subject Name</TableHead>
                            <TableHead>Subject Code</TableHead>
                            <TableHead className="text-center">IA 1 (Max 50)</TableHead>
                            <TableHead className="text-center">IA 2 (Max 50)</TableHead>
                            <TableHead className="text-center">Assign 1 (Max 20)</TableHead>
                            <TableHead className="text-center">Assign 2 (Max 20)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {marksForSemester.map((mark) => (
                            <TableRow key={mark.id}>
                                <TableCell className="font-medium">{mark.subjectName}</TableCell>
                                <TableCell>{mark.subjectCode}</TableCell>
                                <TableCell className="text-center">{mark.ia1_50 ?? 'N/A'}</TableCell>
                                <TableCell className="text-center">{mark.ia2_50 ?? 'N/A'}</TableCell>
                                <TableCell className="text-center">{mark.assignment1_20 ?? 'N/A'}</TableCell>
                                <TableCell className="text-center">{mark.assignment2_20 ?? 'N/A'}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Percent className="mx-auto h-12 w-12 mb-4" />
                        <p className="text-lg">No marks available for Semester {selectedMarksSemester} for this student.</p>
                    </div>
                )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

const ProfilePageSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-40 mb-4" /> 
    <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" /> 
    </div>
    <Card className="lg:col-span-2 shadow-lg">
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30 p-6 rounded-t-lg">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div>
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-5 w-64" />
            </div>
        </CardHeader>
        <CardContent className="p-0">
             <Skeleton className="h-10 w-full rounded-none" /> 
             <div className="p-6 space-y-6">
                {[...Array(3)].map((_, sectionIndex) => (
                    <div key={`section-skel-${sectionIndex}`}>
                        <Skeleton className="h-6 w-1/3 mb-3" /> 
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {[...Array(4)].map((_, fieldIndex) => ( 
                            <div key={`field-skel-${sectionIndex}-${fieldIndex}`} className="space-y-1">
                            <Skeleton className="h-4 w-24 mb-1" /> 
                            <Skeleton className="h-10 w-full" /> 
                            </div>
                        ))}
                        </div>
                    </div>
                ))}
             </div>
        </CardContent>
    </Card>
  </div>
);
    

    