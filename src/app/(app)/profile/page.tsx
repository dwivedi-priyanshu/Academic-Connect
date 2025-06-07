
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile, User } from '@/types';
import { Save, Edit, UserCircle, CalendarDays, Phone, MapPin, Building, Users as UsersIcon, Briefcase, Droplet, Fingerprint, Tag, BookOpen, Flag, Award, Info, Users2, ClipboardCheck } from 'lucide-react';
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
  year: 1, 
  currentSemester: 1,
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
      const updatedValue = (name === 'year' || name === 'currentSemester') && 'year' in prev ? parseInt(value) || 1 : value;
      return { ...prev, [name]: updatedValue };
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setProfileData(prev => {
      if (!prev) return null;
      // For 'currentSemester' and 'year', ensure it's a number
      if ((name === 'currentSemester' || name === 'year') && prev && 'userId' in prev) {
        return { ...prev, [name]: parseInt(value) || 1 };
      }
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
        
        const updatedUser = await fetchUserForSessionAction(user.id);
        if (updatedUser) {
            // The login function in AuthContext should handle updating the user object in context
            // This will ensure the header avatar/name updates.
            // Forcing a re-evaluation in AuthContext by calling login with existing user,
            // but AuthContext's login expects credentials.
            // A dedicated context update function would be better.
            // For now, we can just update the 'user' object in the context.
            // This is a simplified approach for context update.
            if (login && typeof login === 'function') {
                // This is a placeholder for a proper context update method
                // Attempting to reload the user data may be better
                const refreshedUser = await fetchUserForSessionAction(user.id);
                if (refreshedUser) {
                    // This would require AuthContext to have a setUser method or similar
                    // For this example, we assume login might be able to refresh, or student reloads page
                }
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

  // studentEditable: true means student can edit this field on their own profile.
  // studentEditable: false means student cannot edit this field on their own profile (view only or admin editable).
  const profileFieldsConfig = [
    // Account & Basic Info
    { name: 'fullName', label: 'Full Name', icon: UserCircle, type: 'text', required: true, section: 'Account', studentEditable: true }, // Name editable by all users for their own profile
    { name: 'admissionId', label: 'Admission ID (USN)', icon: Briefcase, type: 'text', required: true, section: 'Academic', studentEditable: false, disabled: true }, // Always disabled for student
    { name: 'department', label: 'Department', icon: Building, type: 'text', required: true, section: 'Academic', studentEditable: false },
    { name: 'year', label: 'Year of Study', icon: UsersIcon, type: 'number', required: true, section: 'Academic', min: 1, max: 4, studentEditable: false },
    { name: 'currentSemester', label: 'Current Semester', icon: ClipboardCheck, type: 'select', options: Array.from({length: 8}, (_, i) => String(i + 1)), required: true, section: 'Academic', studentEditable: false },
    { name: 'section', label: 'Section', icon: UsersIcon, type: 'text', required: true, section: 'Academic', studentEditable: false },
    
    // Personal Details
    { name: 'dateOfBirth', label: 'Date of Birth', icon: CalendarDays, type: 'date', required: true, section: 'Personal', studentEditable: true },
    { name: 'gender', label: 'Gender', icon: Users2, type: 'select', options: ['Male', 'Female', 'Other'], section: 'Personal', studentEditable: true },
    { name: 'bloodGroup', label: 'Blood Group', icon: Droplet, type: 'text', section: 'Personal', studentEditable: true },
    { name: 'aadharNumber', label: 'Aadhar Number', icon: Fingerprint, type: 'text', section: 'Personal', studentEditable: true },
    { name: 'category', label: 'Category (GM, SC, ST, etc.)', icon: Tag, type: 'text', section: 'Personal', studentEditable: true },
    { name: 'religion', label: 'Religion', icon: BookOpen, type: 'text', section: 'Personal', studentEditable: true },
    { name: 'nationality', label: 'Nationality', icon: Flag, type: 'text', section: 'Personal', studentEditable: true },

    // Contact Information
    { name: 'contactNumber', label: 'Contact Number', icon: Phone, type: 'tel', required: true, section: 'Contact', studentEditable: true },
    { name: 'address', label: 'Address', icon: MapPin, type: 'text', required: true, section: 'Contact', studentEditable: true },

    // Parent/Guardian Information
    { name: 'fatherName', label: "Father's Name", icon: UserCircle, type: 'text', section: 'Guardian', studentEditable: true },
    { name: 'motherName', label: "Mother's Name", icon: UserCircle, type: 'text', section: 'Guardian', studentEditable: true },
    { name: 'parentName', label: "Parent's/Guardian's Name (If different)", icon: UserCircle, type: 'text', section: 'Guardian', studentEditable: true },
    { name: 'parentContact', label: "Parent's/Guardian's Contact", icon: Phone, type: 'tel', section: 'Guardian', studentEditable: true },

    // Academic History
    { name: 'sslcMarks', label: 'SSLC/10th Marks (e.g., % or CGPA)', icon: Award, type: 'text', section: 'Academic History', studentEditable: true },
    { name: 'pucMarks', label: 'PUC/12th Marks (e.g., % or CGPA)', icon: Award, type: 'text', section: 'Academic History', studentEditable: true },
  ];
  
  const currentFieldsConfig = user.role === 'Student' 
    ? profileFieldsConfig 
    : profileFieldsConfig.filter(f => f.name === 'fullName' || f.name === 'email'); // Simplified view for Faculty/Admin on their own profile

  const currentProfileIsStudent = user.role === 'Student' && profileData && 'userId' in profileData;

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
        { (user.role === 'Student' || user.role === 'Faculty' || user.role === 'Admin') && (
          <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "secondary" : "default"} disabled={isLoading}>
            {isEditing ? 'Cancel' : <><Edit className="mr-2 h-4 w-4" /> Edit Profile</>}
          </Button>
        )}
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30 p-6 rounded-t-lg">
            <Image 
              src={(profileData && 'avatar' in profileData && profileData.avatar) || user.avatar || "https://placehold.co/80x80.png?text=NA"} 
              alt={displayName}
              data-ai-hint="person face"
              width={80} 
              height={80} 
              className="rounded-full border-2 border-primary shadow-md"
            />
            <div>
                <CardTitle className="text-2xl">{displayName}</CardTitle>
                <CardDescription>{displayEmail} | Role: {user.role}</CardDescription>
                 {currentProfileIsStudent && <CardDescription>USN: {(profileData as StudentProfile).admissionId || 'Not Assigned'} | Dept: {(profileData as StudentProfile).department || 'N/A'} | Year: {(profileData as StudentProfile).year || 'N/A'} | Sem: {(profileData as StudentProfile).currentSemester || 'N/A'} | Sec: {(profileData as StudentProfile).section || 'N/A'}</CardDescription>}
            </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {Object.entries(groupedFields).map(([sectionTitle, fields]) => {
              // For faculty/admin viewing their own profile, only show "Account" section
              if (user.role !== 'Student' && sectionTitle !== 'Account') {
                return null;
              }
              return (
                <div key={sectionTitle} className="mb-6">
                  <h3 className="text-xl font-semibold mb-4 text-primary border-b pb-2">{sectionTitle}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {fields.map(field => {
                      // Determine if the field should be editable for the current user type and edit state
                      let fieldIsActuallyEditable = isEditing;
                      if (currentProfileIsStudent && !field.studentEditable) {
                          fieldIsActuallyEditable = false; // Student cannot edit this field
                      }
                      if (!currentProfileIsStudent && field.name !== 'fullName') { // Faculty/Admin can only edit their own name
                          fieldIsActuallyEditable = false;
                      }
                      
                      const finalDisabledState = !fieldIsActuallyEditable || isLoading || field.disabled;

                      return (
                        <div key={field.name} className="space-y-1">
                          <Label htmlFor={field.name} className="flex items-center text-sm font-medium text-muted-foreground">
                            <field.icon className="mr-2 h-4 w-4" /> {field.label} {field.required && fieldIsActuallyEditable && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {isEditing && fieldIsActuallyEditable ? (
                            field.type === 'select' && field.options ? (
                              <Select
                                name={field.name}
                                value={(profileData as any)?.[field.name]?.toString() || ''}
                                onValueChange={(value) => handleSelectChange(field.name, value)}
                                disabled={finalDisabledState}
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
                                value={(profileData as any)?.[field.name] || ''}
                                onChange={handleInputChange}
                                required={field.required && fieldIsActuallyEditable}
                                min={field.min}
                                max={field.max}
                                disabled={finalDisabledState}
                                className="bg-background"
                              />
                            )
                          ) : (
                            <p className="text-md p-2 border-b min-h-[40px] bg-muted/20 rounded-sm">
                              {field.name === 'currentSemester' && (profileData as any)?.[field.name] ? `Semester ${(profileData as any)[field.name]}` :
                                field.type === 'date' && (profileData as any)?.[field.name]
                                ? new Date((profileData as any)[field.name]).toLocaleDateString()
                                : (profileData as any)?.[field.name] || <span className="text-muted-foreground italic">N/A</span>
                              }
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {isEditing && (
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
    
