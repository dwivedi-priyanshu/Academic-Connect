
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile, User } from '@/types';
import { Save, Edit, UserCircle, CalendarDays, Phone, MapPin, Building, Users, Briefcase, Droplet, Fingerprint, Tag, BookOpen, Flag, Award, Info, Users2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { fetchStudentFullProfileDataAction, saveStudentProfileDataAction, fetchUserProfileDataAction, saveUserGeneralDataAction } from '@/actions/profile-actions';
import { Skeleton } from '@/components/ui/skeleton';

const initialStudentProfileData: StudentProfile = {
  id: '', // Will be set if fetched
  userId: '', 
  admissionId: '', 
  fullName: '', 
  dateOfBirth: '', 
  contactNumber: '', 
  address: '', 
  department: '', 
  year: 0, 
  section: '', 
  parentName: '', 
  parentContact: '',
  // Initialize new fields
  fatherName: '',
  motherName: '',
  gender: '',
  bloodGroup: '',
  aadharNumber: '',
  category: '',
  religion: '',
  nationality: '',
  sslcMarks: '',
  pucMarks: '',
};

export default function ProfilePage() {
  const { user, login } = useAuth(); 
  const [profileData, setProfileData] = useState<StudentProfile | User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        setIsLoading(true);
        try {
          if (user.role === 'Student') {
            let studentProfile = await fetchStudentFullProfileDataAction(user.id);
            if (!studentProfile) { 
              studentProfile = {
                ...initialStudentProfileData,
                userId: user.id,
                fullName: user.name,
                id: '', // No ID from DB yet
              };
            }
            setProfileData(studentProfile);
          } else { 
            const generalProfile = await fetchUserProfileDataAction(user.id);
            setProfileData(generalProfile || user); 
          }
        } catch (error) {
          console.error("Error loading profile:", error);
          toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" });
          setProfileData(user); 
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadProfile();
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => {
      if (!prev) return null;
      return { ...prev, [name]: name === 'year' && 'year' in prev ? parseInt(value) || 0 : value };
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setProfileData(prev => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData || !user) return;
    setIsLoading(true); 
    
    try {
      let success = false;
      if (user.role === 'Student' && 'userId' in profileData) { 
        success = await saveStudentProfileDataAction(profileData as StudentProfile);
      } else { 
        success = await saveUserGeneralDataAction(profileData as User);
      }

      if (success) {
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated.", variant: "default", className: "bg-success text-success-foreground" });
        setIsEditing(false);
        
        if (user.role !== 'Student' && 'name' in profileData && 'avatar' in profileData) {
           // Re-fetch user data to update context if name/avatar for non-student role changed
          const updatedUser = await fetchUserForSessionAction(user.id);
          if (updatedUser) {
            // This relies on login function to update context, or a dedicated context update function
            // For simplicity, if login function can take a User object to set context:
            // login(updatedUser); // This might not be the right way if login expects credentials
            // Or more directly:
            // setUser(updatedUser); // If AuthContext exposes setUser
            // For now, a full re-login flow might be triggered or a page refresh might be needed
            // to see header changes for non-students. A better approach would be a context update fn.
            // Using the existing login() which re-fetches might be too heavy or require password.
            // A simple local update or a dedicated context update fn is better.
            // For now, let's assume user will see changes on next full load/login.
            // Or attempt to refresh parts of the user object in context if login method is robust.
          }
        }
      } else {
        toast({ title: "Update Failed", description: "Could not update your profile. Please try again.", variant: "destructive" });
      }
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({ title: "Save Error", description: (error as Error).message || "An error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  if (!user) {
     return <p>User not found. Please log in.</p>;
  }

  const canEdit = user.role === 'Student' || user.role === 'Faculty';

  const studentProfileFields = [
    // Account & Basic Info (some might be less editable by student)
    { name: 'fullName', label: 'Full Name', icon: UserCircle, type: 'text', required: true, section: 'Account' },
    { name: 'admissionId', label: 'Admission ID (USN)', icon: Briefcase, type: 'text', required: true, disabled: true, section: 'Academic' },
    { name: 'department', label: 'Department', icon: Building, type: 'text', required: true, disabled: true, section: 'Academic' },
    { name: 'year', label: 'Year of Study', icon: Users, type: 'number', required: true, disabled: true, section: 'Academic' },
    { name: 'section', label: 'Section', icon: Users, type: 'text', required: true, disabled: true, section: 'Academic' },
    
    // Personal Details
    { name: 'dateOfBirth', label: 'Date of Birth', icon: CalendarDays, type: 'date', required: true, section: 'Personal' },
    { name: 'gender', label: 'Gender', icon: Users2, type: 'select', options: ['Male', 'Female', 'Other'], section: 'Personal' },
    { name: 'bloodGroup', label: 'Blood Group', icon: Droplet, type: 'text', section: 'Personal' },
    { name: 'aadharNumber', label: 'Aadhar Number', icon: Fingerprint, type: 'text', section: 'Personal' },
    { name: 'category', label: 'Category (GM, SC, ST, etc.)', icon: Tag, type: 'text', section: 'Personal' },
    { name: 'religion', label: 'Religion', icon: BookOpen, type: 'text', section: 'Personal' },
    { name: 'nationality', label: 'Nationality', icon: Flag, type: 'text', section: 'Personal' },

    // Contact Information
    { name: 'contactNumber', label: 'Contact Number', icon: Phone, type: 'tel', required: true, section: 'Contact' },
    { name: 'address', label: 'Address', icon: MapPin, type: 'text', required: true, section: 'Contact' },
    // Email is part of User, shown in header, not part of StudentProfile form directly

    // Parent/Guardian Information
    { name: 'fatherName', label: "Father's Name", icon: UserCircle, type: 'text', section: 'Guardian' },
    { name: 'motherName', label: "Mother's Name", icon: UserCircle, type: 'text', section: 'Guardian' },
    { name: 'parentName', label: "Parent's/Guardian's Name (If different)", icon: UserCircle, type: 'text', section: 'Guardian' },
    { name: 'parentContact', label: "Parent's/Guardian's Contact", icon: Phone, type: 'tel', section: 'Guardian' },

    // Academic History
    { name: 'sslcMarks', label: 'SSLC/10th Marks (e.g., % or CGPA)', icon: Award, type: 'text', section: 'Academic History' },
    { name: 'pucMarks', label: 'PUC/12th Marks (e.g., % or CGPA)', icon: Award, type: 'text', section: 'Academic History' },
  ];

  const facultyProfileFields = [ 
     { name: 'name', label: 'Full Name', icon: UserCircle, type: 'text', required: true, section: 'Account' },
     // Faculty can edit their name via User object
  ];
  
  const currentFieldsConfig = user.role === 'Student' ? studentProfileFields : facultyProfileFields;
  const currentProfileIsStudent = user.role === 'Student' && profileData && 'userId' in profileData;

  // Group fields by section
  const groupedFields = currentFieldsConfig.reduce((acc, field) => {
    const section = field.section || 'Other';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(field);
    return acc;
  }, {} as Record<string, typeof currentFieldsConfig>);


  if (isLoading && !profileData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30 p-6 rounded-t-lg">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
             {Object.entries(groupedFields).map(([sectionTitle, fields]) => (
                <div key={sectionTitle} className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 text-primary border-b pb-2">{sectionTitle}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fields.map((field, i) => (
                      <div key={i} className="space-y-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = (currentProfileIsStudent ? (profileData as StudentProfile)?.fullName : (profileData as User)?.name) || user.name;
  const displayEmail = (profileData && 'email' in profileData ? profileData.email : user.email) || user.email;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><UserCircle className="mr-2 h-8 w-8 text-primary" /> User Profile</h1>
        {canEdit && (
          <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "secondary" : "default"} disabled={isLoading}>
            {isEditing ? 'Cancel' : <><Edit className="mr-2 h-4 w-4" /> Edit Profile</>}
          </Button>
        )}
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30 p-6 rounded-t-lg">
            <Image 
              src={(profileData && 'avatar' in profileData && profileData.avatar) || user.avatar || "https://picsum.photos/seed/avatar/100/100"} 
              alt={displayName}
              width={80} 
              height={80} 
              className="rounded-full border-2 border-primary shadow-md"
              data-ai-hint="person face"
            />
            <div>
                <CardTitle className="text-2xl">{displayName}</CardTitle>
                <CardDescription>{displayEmail} | Role: {user.role}</CardDescription>
                 {currentProfileIsStudent && <CardDescription>USN: {(profileData as StudentProfile).admissionId || 'Not Assigned'}</CardDescription>}
            </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {Object.entries(groupedFields).map(([sectionTitle, fields]) => (
              <div key={sectionTitle} className="mb-6">
                <h3 className="text-xl font-semibold mb-4 text-primary border-b pb-2">{sectionTitle}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {fields.map(field => (
                    <div key={field.name} className="space-y-1">
                      <Label htmlFor={field.name} className="flex items-center text-sm font-medium text-muted-foreground">
                        <field.icon className="mr-2 h-4 w-4" /> {field.label} {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {isEditing && canEdit ? (
                        field.type === 'select' && field.options ? (
                           <Select
                            name={field.name}
                            value={(profileData as any)?.[field.name] || ''}
                            onValueChange={(value) => handleSelectChange(field.name, value)}
                            disabled={field.disabled || isLoading}
                          >
                            <SelectTrigger id={field.name} className="bg-background">
                              <SelectValue placeholder={`Select ${field.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={field.name}
                            name={field.name}
                            type={field.type}
                            value={(profileData as any)?.[field.name] || ''}
                            onChange={handleInputChange}
                            required={field.required}
                            disabled={field.disabled || isLoading || (currentProfileIsStudent && field.disabled)}
                            className="bg-background"
                          />
                        )
                      ) : (
                        <p className="text-md p-2 border-b min-h-[40px] bg-muted/20 rounded-sm">
                           {field.type === 'date' && (profileData as any)?.[field.name]
                            ? new Date((profileData as any)[field.name]).toLocaleDateString()
                            : (profileData as any)?.[field.name] || <span className="text-muted-foreground italic">N/A</span>
                           }
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {isEditing && canEdit && (
              <div className="flex justify-end pt-4 border-t mt-6">
                <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" /> {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

