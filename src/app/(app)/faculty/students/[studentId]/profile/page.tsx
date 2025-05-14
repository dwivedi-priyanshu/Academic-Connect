
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile } from '@/types';
import { UserCircle, CalendarDays, Phone, MapPin, Building, Users as UsersIcon, Briefcase, ArrowLeft, ClipboardList, FileText, BookOpen, Droplet, Fingerprint, Tag, Flag, Award, Users2, ClipboardCheck, Edit, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { fetchStudentFullProfileDataAction, saveStudentProfileDataAction } from '@/actions/profile-actions';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export default function FacultyViewStudentProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string; // This is the student's User ID
  const { toast } = useToast();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [editableProfile, setEditableProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && user.role === 'Faculty' && studentId) {
      setIsLoading(true);
      fetchStudentFullProfileDataAction(studentId).then(data => {
        setProfile(data);
        setEditableProfile(data ? { ...data } : null); // Initialize editable profile
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableProfile(prev => {
      if (!prev) return null;
      const updatedValue = (name === 'year' || name === 'currentSemester') ? parseInt(value) || 1 : value;
      return { ...prev, [name]: updatedValue };
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setEditableProfile(prev => {
      if (!prev) return null;
      if (name === 'currentSemester' || name === 'year') {
        return { ...prev, [name]: parseInt(value) || 1 };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editableProfile) return;
    setIsSaving(true);
    try {
      const success = await saveStudentProfileDataAction(editableProfile);
      if (success) {
        setProfile({ ...editableProfile }); // Update the main profile state
        toast({ title: "Profile Updated", description: `${editableProfile.fullName}'s academic details updated.`, className: "bg-success text-success-foreground"});
        setIsEditing(false);
      } else {
        toast({ title: "Update Failed", description: "Could not update student profile.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error saving student profile:", error);
      toast({ title: "Save Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  if (!user || user.role !== 'Faculty') {
    return <p>Access denied. This page is for faculty members only.</p>;
  }

  if (isLoading && !profile) {
    return (
      <div className="space-y-6">
        <Button variant="outline" disabled className="mb-4 opacity-50">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List
        </Button>
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64" /> {/* Title skeleton */}
            <Skeleton className="h-10 w-32" /> {/* Edit button skeleton */}
        </div>
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
                {[...Array(18)].map((_, i) => ( 
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

  // Define which fields are editable by faculty
  const facultyEditableFields: string[] = ['department', 'year', 'currentSemester', 'section'];

  const profileSections = {
    'Account & Academic': [
      { name: 'fullName', label: 'Full Name', icon: UserCircle, facultyEditable: false },
      { name: 'admissionId', label: 'Admission ID (USN)', icon: Briefcase, facultyEditable: false },
      { name: 'department', label: 'Department', icon: Building, facultyEditable: true, type: 'text', required: true },
      { name: 'year', label: 'Year of Study', icon: UsersIcon, facultyEditable: true, type: 'number', min: 1, max: 4, required: true },
      { name: 'currentSemester', label: 'Current Semester', icon: ClipboardCheck, facultyEditable: true, type: 'select', options: Array.from({length: 8}, (_, i) => String(i + 1)), required: true },
      { name: 'section', label: 'Section', icon: UsersIcon, facultyEditable: true, type: 'text', required: true },
    ],
    'Personal Details': [
      { name: 'dateOfBirth', label: 'Date of Birth', icon: CalendarDays, type: 'date', facultyEditable: false },
      { name: 'gender', label: 'Gender', icon: Users2, facultyEditable: false },
      { name: 'bloodGroup', label: 'Blood Group', icon: Droplet, facultyEditable: false },
      { name: 'aadharNumber', label: 'Aadhar Number', icon: Fingerprint, facultyEditable: false },
      { name: 'category', label: 'Category', icon: Tag, facultyEditable: false },
      { name: 'religion', label: 'Religion', icon: BookOpen, facultyEditable: false }, 
      { name: 'nationality', label: 'Nationality', icon: Flag, facultyEditable: false },
    ],
    'Contact Information': [
      { name: 'contactNumber', label: 'Contact Number', icon: Phone, facultyEditable: false },
      { name: 'address', label: 'Address', icon: MapPin, facultyEditable: false },
      // Email might be part of User object, not StudentProfile directly. For now, we assume it's not directly editable here by faculty.
    ],
    'Guardian Information': [
      { name: 'fatherName', label: "Father's Name", icon: UserCircle, facultyEditable: false },
      { name: 'motherName', label: "Mother's Name", icon: UserCircle, facultyEditable: false },
      { name: 'parentName', label: "Parent's/Guardian's Name (If different)", icon: UserCircle, facultyEditable: false },
      { name: 'parentContact', label: "Parent's/Guardian's Contact", icon: Phone, facultyEditable: false },
    ],
    'Academic History': [
      { name: 'sslcMarks', label: 'SSLC/10th Marks', icon: Award, facultyEditable: false },
      { name: 'pucMarks', label: 'PUC/12th Marks', icon: Award, facultyEditable: false },
    ],
  };
  
  const quickLinks = [
    // { label: "View Marks", href: `/faculty/students/${studentId}/marks`, icon: ClipboardList },
    // { label: "View Projects", href: `/faculty/students/${studentId}/projects`, icon: FileText },
    // { label: "View MOOCs", href: `/faculty/students/${studentId}/moocs`, icon: BookOpen },
  ];

  const sourceProfile = isEditing ? editableProfile : profile;


  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List
      </Button>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><UserCircle className="mr-2 h-8 w-8 text-primary" /> Student Profile</h1>
        <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "secondary" : "default"} disabled={isSaving}>
          {isEditing ? 'Cancel' : <><Edit className="mr-2 h-4 w-4" /> Edit Academic Details</>}
        </Button>
      </div>
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <CardContent className="p-6 space-y-6">
            {Object.entries(profileSections).map(([sectionTitle, fields]) => (
              <div key={sectionTitle}>
                <h3 className="text-xl font-semibold mb-3 text-primary border-b pb-1.5">{sectionTitle}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {fields.map(field => {
                    const canEditThisField = isEditing && field.facultyEditable;
                    return (
                      <div key={field.name} className="space-y-1">
                        <Label htmlFor={field.name} className="flex items-center text-sm font-medium text-muted-foreground">
                          <field.icon className="mr-2 h-4 w-4" /> {field.label} {field.required && canEditThisField && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {canEditThisField && sourceProfile ? (
                           field.type === 'select' && field.options ? (
                            <Select
                                name={field.name}
                                value={(sourceProfile as any)?.[field.name]?.toString() || ''}
                                onValueChange={(value) => handleSelectChange(field.name, value)}
                                disabled={isSaving}
                            >
                                <SelectTrigger id={field.name} className="bg-background">
                                <SelectValue placeholder={`Select ${field.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                {field.options.map(option => (
                                    <SelectItem key={option} value={option}>{field.name === 'currentSemester' ? `Semester ${option}` : option}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                           ) : (
                            <Input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                value={(sourceProfile as any)?.[field.name] || ''}
                                onChange={handleInputChange}
                                required={field.required}
                                min={field.min}
                                max={field.max}
                                disabled={isSaving}
                                className="bg-background"
                            />
                           )
                        ) : (
                          <p className="text-md p-2 border-b min-h-[40px] bg-muted/20 rounded-sm">
                            {field.name === 'currentSemester' && (profile as any)[field.name]
                              ? `Semester ${(profile as any)[field.name]}`
                              : field.type === 'date' && (profile as any)[field.name] 
                                ? new Date((profile as any)[field.name]).toLocaleDateString() 
                                : (profile as any)[field.name] || <span className="italic text-muted-foreground/70">N/A</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
             {isEditing && (
              <div className="flex justify-end pt-4 border-t mt-6">
                <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving..." : "Save Academic Details"}
                </Button>
              </div>
            )}
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
                View Marks (Contextual - TBD)
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
    </div>
  );
}

    