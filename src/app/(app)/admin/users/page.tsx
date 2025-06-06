
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, UserPlus, Users, CheckCircle, XCircle, Hourglass, KeyRound, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { User, UserStatus, StudentProfile } from '@/types'; 
import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAllUsersAction, updateUserStatusAction, fetchStudentFullProfileDataAction, saveStudentProfileDataAction } from '@/actions/profile-actions';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
// A basic list of departments. This could come from a central config or DB in a larger app.
const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Electrical", "Information Science", "Biotechnology", "Aerospace"];


export default function AdminUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<UserStatus | 'all'>('all');

  const [isUsnModalOpen, setIsUsnModalOpen] = useState(false);
  const [selectedUserForApproval, setSelectedUserForApproval] = useState<User | null>(null);
  const [admissionIdInput, setAdmissionIdInput] = useState("");

  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudentUser, setEditingStudentUser] = useState<User | null>(null);
  const [editingStudentProfile, setEditingStudentProfile] = useState<Partial<StudentProfile>>({});
  const [isSavingStudentProfile, setIsSavingStudentProfile] = useState(false);


  const loadUsers = useCallback((statusFilter?: UserStatus | 'all') => {
    if (user && user.role === 'Admin') {
        setIsLoading(true);
        const filters = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
        fetchAllUsersAction(filters).then(data => {
            setAllUsers(data);
        }).catch(err => {
            console.error("Error fetching users:", err);
            toast({ title: "Error", description: "Could not load user list.", variant: "destructive" });
        }).finally(() => setIsLoading(false));
    } else {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadUsers(activeTab);
  }, [activeTab, loadUsers]); 

  const handleOpenUsnModal = (userToApprove: User) => {
    setSelectedUserForApproval(userToApprove);
    setAdmissionIdInput(""); 
    setIsUsnModalOpen(true);
  };

  const handleConfirmApprovalWithUsn = async () => {
    if (!selectedUserForApproval || !admissionIdInput.trim()) {
      toast({ title: "Error", description: "Admission ID (USN) is required.", variant: "destructive" });
      return;
    }
    setIsLoading(true); 
    setIsUsnModalOpen(false);
    try {
        const success = await updateUserStatusAction(selectedUserForApproval.id, 'Active', admissionIdInput.trim().toUpperCase());
        if (success) {
            const descriptionMessage = `The account for ${selectedUserForApproval.name} is now Active with USN: ${admissionIdInput.trim().toUpperCase()}.`;
            toast({ 
                title: "Student Approved", 
                description: descriptionMessage, 
                className: "bg-success text-success-foreground" 
            });
            loadUsers(activeTab); 
        } else {
            toast({ title: "Approval Failed", description: `Could not approve ${selectedUserForApproval.name}. The user status might not have changed, or the USN update failed.`, variant: "destructive" });
        }
    } catch (error) {
        console.error("Error approving student:", error);
        toast({ title: "Error", description: `Failed to approve student: ${(error as Error).message}`, variant: "destructive" });
    } finally {
        setSelectedUserForApproval(null);
        setAdmissionIdInput("");
        setIsLoading(false); 
    }
  };


  const handleUpdateStatus = async (targetUser: User, newStatus: UserStatus) => {
    if (targetUser.role === 'Student' && newStatus === 'Active' && targetUser.status === 'PendingApproval') {
        handleOpenUsnModal(targetUser);
        return;
    }

    setIsLoading(true); 
    try {
        const success = await updateUserStatusAction(targetUser.id, newStatus, undefined);
        if (success) {
            toast({ title: "Status Updated", description: `${targetUser.name}'s status changed to ${newStatus}.`, className: "bg-success text-success-foreground" });
            loadUsers(activeTab); 
        } else {
            toast({ title: "Update Failed", description: `Could not update status for ${targetUser.name}.`, variant: "destructive" });
        }
    } catch (error) {
        console.error("Error updating user status:", error);
        toast({ title: "Error", description: `Failed to update status: ${(error as Error).message}`, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleOpenEditStudentModal = async (studentUser: User) => {
    setEditingStudentUser(studentUser);
    setIsSavingStudentProfile(true); // Use this for loading state of the modal
    try {
      const profile = await fetchStudentFullProfileDataAction(studentUser.id);
      if (profile) {
        setEditingStudentProfile({
          id: profile.id,
          userId: profile.userId,
          admissionId: profile.admissionId,
          fullName: profile.fullName, // Keep it from profile, though user.name should match
          department: profile.department,
          year: profile.year,
          currentSemester: profile.currentSemester,
          section: profile.section,
          // Include other fields if they were intended to be editable by admin, for now focus on academic
          dateOfBirth: profile.dateOfBirth,
          contactNumber: profile.contactNumber,
          address: profile.address,
          parentName: profile.parentName,
          parentContact: profile.parentContact,
          fatherName: profile.fatherName,
          motherName: profile.motherName,
          gender: profile.gender,
          bloodGroup: profile.bloodGroup,
          aadharNumber: profile.aadharNumber,
          category: profile.category,
          religion: profile.religion,
          nationality: profile.nationality,
          sslcMarks: profile.sslcMarks,
          pucMarks: profile.pucMarks,
          avatar: profile.avatar
        });
        setIsEditStudentModalOpen(true);
      } else {
        toast({ title: "Error", description: "Could not load student profile data for editing.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch student details for editing.", variant: "destructive" });
    } finally {
      setIsSavingStudentProfile(false);
    }
  };

  const handleSaveStudentProfileChanges = async () => {
    if (!editingStudentProfile || !editingStudentProfile.id) {
        toast({ title: "Error", description: "No student profile data to save.", variant: "destructive" });
        return;
    }
    setIsSavingStudentProfile(true);
    try {
        const success = await saveStudentProfileDataAction(editingStudentProfile as StudentProfile);
        if (success) {
            toast({ title: "Profile Saved", description: `${editingStudentProfile.fullName}'s profile updated successfully.`, className: "bg-success text-success-foreground" });
            setIsEditStudentModalOpen(false);
            loadUsers(activeTab); // Refresh the list
        } else {
            toast({ title: "Save Failed", description: "Could not save student profile changes.", variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Save Error", description: `An error occurred: ${(error as Error).message}`, variant: "destructive" });
    } finally {
        setIsSavingStudentProfile(false);
    }
  };
  
  const handleEditProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingStudentProfile(prev => ({ ...prev, [name]: (name === 'year' || name === 'currentSemester') ? (parseInt(value) || undefined) : value }));
  };

  const handleEditProfileSelectChange = (name: string, value: string) => {
    setEditingStudentProfile(prev => ({ ...prev, [name]: (name === 'year' || name === 'currentSemester') ? parseInt(value) : value }));
  };


  const StatusBadge = ({ status }: { status: UserStatus }) => {
    let IconComponent = Hourglass;
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    let badgeClassName = ""; 

    switch (status) {
        case 'Active':
            IconComponent = CheckCircle;
            variant = "default"; 
            badgeClassName = "bg-success text-success-foreground hover:bg-success/90";
            break;
        case 'PendingApproval':
            IconComponent = Hourglass;
            variant = "default"; 
            badgeClassName = "bg-warning text-warning-foreground hover:bg-warning/90";
            break;
        case 'Rejected':
        case 'Disabled':
            IconComponent = XCircle;
            variant = "destructive"; 
            break;
        default:
            IconComponent = Hourglass; 
            variant = "secondary"; 
    }
    return (
      <Badge variant={variant} className={cn("capitalize", badgeClassName)}>
        <IconComponent className="mr-1 h-3 w-3" />
        {status === 'PendingApproval' ? 'Pending' : status}
      </Badge>
    );
  };


  if (!user || user.role !== 'Admin') {
    return (
         <div className="flex flex-col items-center justify-center h-full p-10">
            <ShieldCheck className="w-16 h-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is for administrators only.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><ShieldCheck className="mr-2 h-8 w-8 text-primary" /> User Management</h1>
        <Button disabled> 
          <UserPlus className="mr-2 h-4 w-4" /> Add New User (Coming Soon)
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="PendingApproval">Pending ({allUsers.filter(u=>u.status === 'PendingApproval').length})</TabsTrigger>
          <TabsTrigger value="Active">Active ({allUsers.filter(u=>u.status === 'Active').length})</TabsTrigger>
          <TabsTrigger value="Rejected">Rejected ({allUsers.filter(u=>u.status === 'Rejected').length})</TabsTrigger>
          <TabsTrigger value="Disabled">Disabled ({allUsers.filter(u=>u.status === 'Disabled').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>User List ({activeTab === 'all' ? allUsers.length : allUsers.filter(u=>u.status === activeTab).length})</CardTitle>
          <CardDescription>Manage user accounts, roles, and statuses. Students require USN assignment upon approval.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && !isUsnModalOpen && !isEditStudentModalOpen ? ( 
            <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell className="text-right space-x-1">
                                <Skeleton className="h-8 w-20 inline-block" />
                                <Skeleton className="h-8 w-20 inline-block" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[100px]">Role</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="text-right w-[280px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allUsers.map(u => (
                        <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.role}</TableCell>
                            <TableCell><StatusBadge status={u.status} /></TableCell>
                            <TableCell className="text-right space-x-1">
                                {u.status === 'PendingApproval' && (
                                    <>
                                    <Button variant="ghost" size="sm" className="text-success hover:bg-success/10 hover:text-success" onClick={() => handleUpdateStatus(u, 'Active')} disabled={isLoading}>
                                        <CheckCircle className="mr-1 h-4 w-4"/> Approve
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleUpdateStatus(u, 'Rejected')} disabled={isLoading}>
                                        <XCircle className="mr-1 h-4 w-4"/> Reject
                                    </Button>
                                    </>
                                )}
                                {u.status === 'Active' && u.id !== user?.id && ( 
                                     <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleUpdateStatus(u, 'Disabled')} disabled={isLoading}>
                                        <XCircle className="mr-1 h-4 w-4"/> Disable
                                    </Button>
                                )}
                                {(u.status === 'Rejected' || u.status === 'Disabled') && (
                                     <Button variant="ghost" size="sm" className="text-success hover:bg-success/10 hover:text-success" onClick={() => handleUpdateStatus(u, 'Active')} disabled={isLoading}>
                                        <CheckCircle className="mr-1 h-4 w-4"/> Re-Activate
                                    </Button>
                                )}
                                {u.role === 'Student' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditStudentModal(u)} disabled={isLoading}>
                                        <Edit className="mr-1 h-4 w-4"/> Edit Profile
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          )}
          {allUsers.length === 0 && !isLoading && (
            <p className="text-center py-4 text-muted-foreground">No users found for the selected filter.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isUsnModalOpen} onOpenChange={(isOpen) => {
          setIsUsnModalOpen(isOpen);
          if (!isOpen) setSelectedUserForApproval(null); 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Student &amp; Assign USN</DialogTitle>
            <DialogDescription>
              To activate the student account for <span className="font-semibold">{selectedUserForApproval?.name}</span> ({selectedUserForApproval?.email}), please assign their unique Admission ID (USN).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admissionId" className="flex items-center">
                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground"/> Admission ID (USN)
              </Label>
              <Input
                id="admissionId"
                value={admissionIdInput}
                onChange={(e) => setAdmissionIdInput(e.target.value.toUpperCase())} 
                placeholder="e.g., 1RN21CS001"
                className="bg-background"
                required
              />
              <p className="text-xs text-muted-foreground">This ID will be used to link all academic records for the student.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setIsUsnModalOpen(false); setSelectedUserForApproval(null);}} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleConfirmApprovalWithUsn} className="bg-success hover:bg-success/90 text-success-foreground" disabled={isLoading || !admissionIdInput.trim()}>
              <CheckCircle className="mr-2 h-4 w-4" /> {isLoading ? 'Processing...' : 'Approve &amp; Assign USN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Profile Dialog */}
      <Dialog open={isEditStudentModalOpen} onOpenChange={(isOpen) => {
          setIsEditStudentModalOpen(isOpen);
          if (!isOpen) {
            setEditingStudentUser(null);
            setEditingStudentProfile({});
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student Details: {editingStudentUser?.name}</DialogTitle>
            <DialogDescription>
              Update academic details for {editingStudentUser?.email}.
              USN: {editingStudentProfile.admissionId} (Cannot be changed here)
            </DialogDescription>
          </DialogHeader>
          {isSavingStudentProfile && !Object.keys(editingStudentProfile).length ? <Skeleton className="h-48 w-full"/> : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="edit-department">Department</Label>
                    <Select
                        name="department"
                        value={editingStudentProfile.department || ""}
                        onValueChange={(value) => handleEditProfileSelectChange('department', value)}
                        disabled={isSavingStudentProfile}
                    >
                        <SelectTrigger id="edit-department" className="bg-background">
                            <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                            {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="edit-year">Year</Label>
                    <Select
                        name="year"
                        value={String(editingStudentProfile.year || "")}
                        onValueChange={(value) => handleEditProfileSelectChange('year', value)}
                        disabled={isSavingStudentProfile}
                    >
                        <SelectTrigger id="edit-year" className="bg-background">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {[1, 2, 3, 4].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <Label htmlFor="edit-currentSemester">Current Semester</Label>
                    <Select
                        name="currentSemester"
                        value={String(editingStudentProfile.currentSemester || "")}
                        onValueChange={(value) => handleEditProfileSelectChange('currentSemester', value)}
                        disabled={isSavingStudentProfile}
                    >
                        <SelectTrigger id="edit-currentSemester" className="bg-background">
                            <SelectValue placeholder="Select Semester" />
                        </SelectTrigger>
                        <SelectContent>
                            {SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="edit-section">Section</Label>
                    <Select
                        name="section"
                        value={editingStudentProfile.section || ""}
                        onValueChange={(value) => handleEditProfileSelectChange('section', value)}
                        disabled={isSavingStudentProfile}
                    >
                        <SelectTrigger id="edit-section" className="bg-background">
                            <SelectValue placeholder="Select Section" />
                        </SelectTrigger>
                        <SelectContent>
                            {SECTIONS.map(sec => <SelectItem key={sec} value={sec}>{sec}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStudentModalOpen(false)} disabled={isSavingStudentProfile}>Cancel</Button>
            <Button onClick={handleSaveStudentProfileChanges} className="bg-primary hover:bg-primary/90" disabled={isSavingStudentProfile || !Object.keys(editingStudentProfile).length}>
              <Save className="mr-2 h-4 w-4" /> {isSavingStudentProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

