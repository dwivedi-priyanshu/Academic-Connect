
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile, User } from '@/types';
import { Save, Edit, UserCircle, CalendarDays, Phone, MapPin, Building, Users, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { fetchStudentFullProfileDataAction, saveStudentProfileDataAction, fetchUserProfileDataAction, saveUserGeneralDataAction } from '@/actions/profile-actions';
import { Skeleton } from '@/components/ui/skeleton';

const initialStudentProfileData: StudentProfile = {
  userId: '', admissionId: '', fullName: '', dateOfBirth: '', contactNumber: '', address: '', department: '', year: 0, section: '', parentName: '', parentContact: '',
};

export default function ProfilePage() {
  const { user, login } = useAuth(); // login might be needed to refresh user state
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
            if (!studentProfile) { // If no profile in DB, create one from User context
              studentProfile = {
                ...initialStudentProfileData,
                userId: user.id,
                fullName: user.name,
                // admissionId might need to be sourced elsewhere or prompted
              };
            }
            setProfileData(studentProfile);
          } else { // Faculty or Admin
            const generalProfile = await fetchUserProfileDataAction(user.id);
            setProfileData(generalProfile || user); // Fallback to context user if DB fetch fails
          }
        } catch (error) {
          console.error("Error loading profile:", error);
          toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" });
          setProfileData(user); // Fallback to context user
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData || !user) return;
    setIsLoading(true); // Using general isLoading for save operation
    
    try {
      let success = false;
      if (user.role === 'Student' && 'userId' in profileData) { // StudentProfile
        success = await saveStudentProfileDataAction(profileData as StudentProfile);
      } else { // User (Faculty/Admin) - only basic fields like name, avatar for now
        success = await saveUserGeneralDataAction(profileData as User);
      }

      if (success) {
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated.", variant: "default", className: "bg-success text-success-foreground" });
        setIsEditing(false);
        // Optionally refresh user context if name/avatar changed
        if (user.role !== 'Student' && 'name' in profileData && 'avatar' in profileData) {
          login(user.role); // Re-login to update context - simple refresh strategy
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

  const canEdit = user.role === 'Student' || user.role === 'Faculty'; // Allow faculty to edit basic info too

  const studentProfileFields = [
    { name: 'fullName', label: 'Full Name', icon: UserCircle, type: 'text', required: true },
    { name: 'admissionId', label: 'Admission ID', icon: Briefcase, type: 'text', required: true, disabled: true },
    { name: 'dateOfBirth', label: 'Date of Birth', icon: CalendarDays, type: 'date', required: true },
    { name: 'contactNumber', label: 'Contact Number', icon: Phone, type: 'tel', required: true },
    { name: 'address', label: 'Address', icon: MapPin, type: 'text', required: true },
    { name: 'department', label: 'Department', icon: Building, type: 'text', required: true, disabled: true },
    { name: 'year', label: 'Year of Study', icon: Users, type: 'number', required: true, disabled: true },
    { name: 'section', label: 'Section', icon: Users, type: 'text', required: true, disabled: true },
    { name: 'parentName', label: "Parent's Name", icon: UserCircle, type: 'text', required: true },
    { name: 'parentContact', label: "Parent's Contact", icon: Phone, type: 'tel', required: true },
  ];

  const facultyProfileFields = [ // Simplified for faculty
     { name: 'fullName', label: 'Full Name', icon: UserCircle, type: 'text', required: true },
     // Add other faculty-specific editable fields if any, e.g., contactNumber if added to User type for faculty
  ];
  
  const currentFields = user.role === 'Student' ? studentProfileFields : facultyProfileFields;
  const currentProfileIsStudent = user.role === 'Student' && profileData && 'userId' in profileData;


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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(currentFields.length)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = profileData && 'fullName' in profileData ? profileData.fullName : user.name;
  const displayEmail = profileData && 'email' in profileData ? profileData.email : user.email;


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
            </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentFields.map(field => (
                <div key={field.name} className="space-y-1">
                  <Label htmlFor={field.name} className="flex items-center text-sm font-medium text-muted-foreground">
                    <field.icon className="mr-2 h-4 w-4" /> {field.label} {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {isEditing && canEdit ? (
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      value={(profileData as any)?.[field.name] || ''}
                      onChange={handleInputChange}
                      required={field.required}
                      // Disable fields for student profile that are system-managed or faculty managed
                      disabled={field.disabled || isLoading || (currentProfileIsStudent && field.disabled)}
                      className="bg-background"
                    />
                  ) : (
                    <p className="text-md p-2 border-b min-h-[40px]">{(profileData as any)?.[field.name] || 'N/A'}</p>
                  )}
                </div>
              ))}
            </div>
            {isEditing && canEdit && (
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
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
