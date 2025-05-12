'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile } from '@/types';
import { Save, Edit, UserCircle, CalendarDays, Phone, MapPin, Building, Users, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

const initialProfileData: StudentProfile = {
  userId: '',
  admissionId: 'N/A',
  fullName: 'N/A',
  dateOfBirth: '',
  contactNumber: 'N/A',
  address: 'N/A',
  department: 'N/A',
  year: 0,
  section: 'N/A',
  parentName: 'N/A',
  parentContact: 'N/A',
};

// Mock function to fetch profile data
const fetchProfileData = async (userId: string): Promise<StudentProfile> => {
  console.log("Fetching profile for", userId);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real app, fetch from backend. For now, return mock data or stored data.
  const storedProfile = localStorage.getItem(`profile-${userId}`);
  if (storedProfile) {
    return JSON.parse(storedProfile);
  }
  return { ...initialProfileData, userId, fullName: userId === 'student123' ? 'John Doe' : 'Faculty Member', admissionId: 'S12345' };
};

// Mock function to save profile data
const saveProfileData = async (profile: StudentProfile): Promise<boolean> => {
  console.log("Saving profile", profile);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  localStorage.setItem(`profile-${profile.userId}`, JSON.stringify(profile));
  return true; // Simulate success
};


export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile>(initialProfileData);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfileData(user.id).then(data => {
        setProfile(data);
        setIsLoading(false);
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: name === 'year' ? parseInt(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await saveProfileData(profile);
    if (success) {
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated.", variant: "default", className: "bg-success text-success-foreground" });
      setIsEditing(false);
    } else {
      toast({ title: "Update Failed", description: "Could not update your profile. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (isLoading && !profile.userId) { // Check if profile has been loaded at all
    return <p>Loading profile...</p>; // Or a skeleton loader
  }
  
  if (!user) {
     return <p>User not found. Please log in.</p>;
  }

  const canEdit = user.role === 'Student'; // Only students can edit their own profile for now.

  const profileFields = [
    { name: 'fullName', label: 'Full Name', icon: UserCircle, type: 'text', required: true },
    { name: 'admissionId', label: 'Admission ID', icon: Briefcase, type: 'text', required: true, disabled: true }, // Typically not editable by student
    { name: 'dateOfBirth', label: 'Date of Birth', icon: CalendarDays, type: 'date', required: true },
    { name: 'contactNumber', label: 'Contact Number', icon: Phone, type: 'tel', required: true },
    { name: 'address', label: 'Address', icon: MapPin, type: 'text', required: true },
    { name: 'department', label: 'Department', icon: Building, type: 'text', required: true },
    { name: 'year', label: 'Year of Study', icon: Users, type: 'number', required: true },
    { name: 'section', label: 'Section', icon: Users, type: 'text', required: true },
    { name: 'parentName', label: "Parent's Name", icon: UserCircle, type: 'text', required: true },
    { name: 'parentContact', label: "Parent's Contact", icon: Phone, type: 'tel', required: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><UserCircle className="mr-2 h-8 w-8 text-primary" /> User Profile</h1>
        {canEdit && (
          <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "secondary" : "default"}>
            {isEditing ? 'Cancel' : <><Edit className="mr-2 h-4 w-4" /> Edit Profile</>}
          </Button>
        )}
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center space-x-4 bg-muted/30 p-6 rounded-t-lg">
            <Image 
              src={user.avatar || "https://picsum.photos/seed/avatar/100/100"} 
              alt={user.name} 
              width={80} 
              height={80} 
              className="rounded-full border-2 border-primary shadow-md"
              data-ai-hint="person face"
            />
            <div>
                <CardTitle className="text-2xl">{profile.fullName || user.name}</CardTitle>
                <CardDescription>{user.email} | Role: {user.role}</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profileFields.map(field => (
                <div key={field.name} className="space-y-1">
                  <Label htmlFor={field.name} className="flex items-center text-sm font-medium text-muted-foreground">
                    <field.icon className="mr-2 h-4 w-4" /> {field.label} {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {isEditing && canEdit ? (
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      value={(profile as any)[field.name] || ''}
                      onChange={handleInputChange}
                      required={field.required}
                      disabled={field.disabled || isLoading}
                      className="bg-background"
                    />
                  ) : (
                    <p className="text-md p-2 border-b min-h-[40px]">{(profile as any)[field.name] || 'N/A'}</p>
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
