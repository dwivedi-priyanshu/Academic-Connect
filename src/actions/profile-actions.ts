
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { USERS_COLLECTION, STUDENT_PROFILES_COLLECTION } from '@/lib/constants';
import type { User, StudentProfile, UserRole, UserStatus } from '@/types';
import type { Collection, Filter } from 'mongodb';
import { ObjectId } from 'mongodb';

async function getUsersCollection(): Promise<Collection<User>> {
  const { db } = await connectToDatabase();
  return db.collection<User>(USERS_COLLECTION);
}

async function getStudentProfilesCollection(): Promise<Collection<StudentProfile>> {
  const { db } = await connectToDatabase();
  return db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);
}

/**
 * Fetches a user's profile data.
 * @param userId The ID of the user to fetch.
 * @returns The user object or null if not found.
 */
export async function fetchUserProfileDataAction(userId: string): Promise<User | null> {
  try {
    const usersCollection = await getUsersCollection();
    const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    const userDoc = await usersCollection.findOne(query as Filter<User>); 
    
    if (!userDoc) return null;
    
    const idStr = userDoc._id.toHexString();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, password, ...rest } = userDoc; 
    return { ...rest, id: idStr, _id: idStr };
  } catch (error) {
    console.error('Error fetching user profile data:', error);
    throw new Error('Failed to fetch user profile data.');
  }
}

/**
 * Fetches a student's full profile data including academic details.
 * @param userId The User ID of the student.
 * @returns The student profile object or null if not found.
 */
export async function fetchStudentFullProfileDataAction(userId: string): Promise<StudentProfile | null> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const profileDoc = await studentProfilesCollection.findOne({ userId: userId });
    
    if (!profileDoc) return null;
    
    const idStr = profileDoc._id.toHexString();
     // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...rest } = profileDoc;
    return { ...rest, id: idStr, _id: idStr, userId: profileDoc.userId } as StudentProfile;
  } catch (error) {
    console.error('Error fetching student detailed profile data:', error);
    throw new Error('Failed to fetch student detailed profile data.');
  }
}

/**
 * Saves a student's profile data.
 * @param profileData The student profile data to save.
 * @returns True if the save was successful, false otherwise.
 */
export async function saveStudentProfileDataAction(profileData: StudentProfile): Promise<boolean> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
     // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, userId, _id, ...dataToSave } = profileData; 
    
    const filter = { userId: userId }; 
    
    const updateDoc = { $set: dataToSave };

    const result = await studentProfilesCollection.updateOne(
      filter,
      updateDoc,
      { upsert: true } 
    );
    return result.modifiedCount === 1 || result.upsertedCount === 1;
  } catch (error) {
    console.error('Error saving student profile data:', error);
    throw new Error('Failed to save student profile data.');
  }
}

/**
 * Saves general user data (e.g., name, avatar).
 * @param userData Partial user data including the user ID.
 * @returns True if the save was successful, false otherwise.
 */
export async function saveUserGeneralDataAction(userData: Partial<User> & { id: string }): Promise<boolean> {
     try {
        const usersCollection = await getUsersCollection();
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, status, _id, password, role, ...dataToUpdate } = userData; // Exclude sensitive/internal/non-editable fields
        
        const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: id };
        const result = await usersCollection.updateOne(
            filter as Filter<User>, 
            { $set: dataToUpdate }, 
            { upsert: false } 
        );
        return result.modifiedCount === 1;
    } catch (error) {
        console.error('Error saving user general data:', error);
        throw new Error('Failed to save user data.');
    }
}

/**
 * Updates a user's status. If the user is a student and is being activated,
 * their admission ID (USN) in their student profile can also be updated.
 * @param userId The ID of the user to update.
 * @param newStatus The new status for the user.
 * @param admissionId Optional. The admission ID (USN) to set for a student being activated.
 * @returns True if the user status was updated, false otherwise.
 */
export async function updateUserStatusAction(userId: string, newStatus: UserStatus, admissionId?: string): Promise<boolean> {
  try {
    const usersCollection = await getUsersCollection();
    const studentProfilesCollection = await getStudentProfilesCollection();

    const userFilter = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    
    const userToUpdate = await usersCollection.findOne(userFilter as Filter<User>);
    if (!userToUpdate) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const userUpdateResult = await usersCollection.updateOne(
      userFilter as Filter<User>,
      { $set: { status: newStatus } }
    );

    // If student is being activated and admissionId is provided, update their profile
    if (userToUpdate.role === 'Student' && newStatus === 'Active' && admissionId) {
      const studentProfileUpdateResult = await studentProfilesCollection.updateOne(
        { userId: userToUpdate.id }, // Find student profile by their user ID (User.id)
        { $set: { admissionId: admissionId.toUpperCase() } }
      );
      if (studentProfileUpdateResult.matchedCount === 0) {
        console.warn(`No student profile found for user ${userToUpdate.id} to update admissionId. This might happen if profile creation failed during registration.`);
        // Depending on desired behavior, you might want to throw an error or ensure profile exists
        // For now, we consider user status update success as primary.
      }
      return userUpdateResult.modifiedCount === 1;
    }

    return userUpdateResult.modifiedCount === 1;
  } catch (error) {
    console.error(`Error updating status for user ${userId}:`, error);
    throw new Error('Failed to update user status.');
  }
}

/**
 * Fetches student profiles for faculty, optionally filtered by year, section, or department.
 * Only returns students whose user accounts are 'Active'.
 * @param facultyId The ID of the faculty member (currently unused for filtering logic but available for future use).
 * @param filters Optional filters for department, year, and section.
 * @returns An array of student profiles.
 */
export async function fetchStudentsForFacultyAction(
  facultyId: string, 
  filters?: { year?: number; section?: string; department?: string; }
): Promise<StudentProfile[]> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const query: Filter<StudentProfile> = {}; 
    
    if (filters?.department) query.department = filters.department;
    if (filters?.year) query.year = filters.year; 
    if (filters?.section) query.section = filters.section;

    const usersCollection = await getUsersCollection();
    const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
    const activeStudentUserIds = activeStudentUsers.map(u => u.id);

    if(activeStudentUserIds.length === 0) return []; // No active students, so no profiles to fetch

    query.userId = { $in: activeStudentUserIds };


    const studentsArray = await studentProfilesCollection.find(query).toArray();
    return studentsArray.map(s => {
        const idStr = s._id.toHexString();
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = s;
        return { ...rest, id: idStr, _id: idStr, userId: s.userId } as StudentProfile; 
    });
  } catch (error) {
    console.error('Error fetching students for faculty:', error);
    throw new Error('Failed to fetch students.');
  }
}

/**
 * Fetches all users, optionally filtered by role and status.
 * @param filters Optional filters for role and status.
 * @returns An array of user objects (without passwords).
 */
export async function fetchAllUsersAction(filters?: { role?: UserRole, status?: UserStatus }): Promise<User[]> {
  try {
    const usersCollection = await getUsersCollection();
    const query: Filter<User> = {};
    if (filters?.role) query.role = filters.role;
    if (filters?.status) query.status = filters.status;

    const usersArray = await usersCollection.find(query).toArray();
    return usersArray.map(u => {
        const idStr = u._id.toHexString();
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, password, ...rest } = u; 
        return { ...rest, id: idStr, _id: idStr }; 
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw new Error('Failed to fetch all users.');
  }
}

/**
 * Creates a new user and, if the user is a student, their corresponding student profile.
 * This function is typically used by administrators or seeding scripts.
 * For user registration, see `registerUserAction` in `auth-actions.ts`.
 * @param userData User details including email, name, role, and plain text password.
 * @param studentProfileDetails Optional details for creating a student profile if the role is 'Student'.
 * @returns An object containing the created user and student profile (if applicable), or null if user creation failed (e.g., email exists).
 */
export async function createUserAction(
  userData: Pick<User, 'email' | 'name' | 'role'> & { passwordPlainText: string },
  studentProfileDetails?: Partial<Omit<StudentProfile, 'userId' | 'id' | '_id' | 'fullName'>> & { fullName?: string, admissionId?: string }
): Promise<{ user: User; studentProfile?: StudentProfile } | null> {
  const usersCollection = await getUsersCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();

  const existingUser = await usersCollection.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    console.warn(`User with email ${userData.email} already exists during createUserAction.`);
    return null; 
  }

  const userObjectId = new ObjectId();
  const userIdStr = userObjectId.toHexString();
  
  // Status determined by role: Admins/Faculty are 'Active', Students are 'PendingApproval' by default.
  // This action is used by seeding and potentially admin creation tools.
  // registerUserAction in auth-actions.ts specifically sets 'PendingApproval' for Students/Faculty.
  // For this createUserAction, if it's seeding an admin or faculty, they're active. Students pending.
  const initialStatus: UserStatus = (userData.role === 'Student') ? 'PendingApproval' : 'Active';


  const userDocumentToInsert: Omit<User, 'id'> & { _id: ObjectId, password?: string } = {
    _id: userObjectId,
    // id: userIdStr, // 'id' field is not part of the User document schema directly, it's derived from _id
    email: userData.email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    password: userData.passwordPlainText, // Store plain text password, ensure hashing in real app
    avatar: `https://picsum.photos/seed/${userIdStr}/100/100`,
    status: initialStatus, 
  };

  const insertResult = await usersCollection.insertOne(userDocumentToInsert as User);
  if (!insertResult.insertedId) {
    throw new Error("Failed to insert user into database.");
  }
  
  const createdUser: User = {
    id: userIdStr,
    _id: userIdStr, 
    email: userDocumentToInsert.email,
    name: userDocumentToInsert.name,
    role: userDocumentToInsert.role,
    avatar: userDocumentToInsert.avatar,
    status: userDocumentToInsert.status,
  };

  let createdStudentProfile: StudentProfile | undefined = undefined;

  if (userData.role === 'Student') {
    const studentProfileObjectId = new ObjectId();
    const studentProfileIdStr = studentProfileObjectId.toHexString();
    
    const studentProfileDocumentToInsert: Omit<StudentProfile, 'id'> & { _id: ObjectId } = {
      _id: studentProfileObjectId,
      // id: studentProfileIdStr, // 'id' not part of schema, derived from _id
      userId: createdUser.id, // Link to User.id
      admissionId: studentProfileDetails?.admissionId || "", // Admin assigns proper ID upon approval if not provided
      fullName: studentProfileDetails?.fullName || createdUser.name,
      dateOfBirth: studentProfileDetails?.dateOfBirth || '', 
      contactNumber: studentProfileDetails?.contactNumber || '', 
      address: studentProfileDetails?.address || '', 
      department: studentProfileDetails?.department || 'Not Specified',
      year: studentProfileDetails?.year || 1,
      section: studentProfileDetails?.section || 'N/A',
      parentName: studentProfileDetails?.parentName || '', 
      parentContact: studentProfileDetails?.parentContact || '', 
    };

    const profileInsertResult = await studentProfilesCollection.insertOne(studentProfileDocumentToInsert as StudentProfile);
    if(!profileInsertResult.insertedId){
        // Potentially roll back user creation or log critical error
        throw new Error("Failed to insert student profile into database.");
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...restOfProfileDoc } = studentProfileDocumentToInsert; 
    createdStudentProfile = {
      ...restOfProfileDoc, 
      id: studentProfileIdStr,
      _id: studentProfileIdStr, 
    } as StudentProfile;
  }

  return { user: createdUser, studentProfile: createdStudentProfile };
}

```
  </change>
  <change>
    <file>src/app/(app)/admin/users/page.tsx</file>
    <description>Implement modal dialog for admin to assign USN/Admission ID when approving a student. Update handleUpdateStatus to trigger this modal for students. Pass the admissionId to updateUserStatusAction.</description>
    <content><![CDATA[
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, UserPlus, Users, CheckCircle, XCircle, Hourglass, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { User, UserStatus } from '@/types'; // Removed StudentProfile as it's not directly used here
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAllUsersAction, updateUserStatusAction } from '@/actions/profile-actions';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function AdminUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<UserStatus | 'all'>('all');

  const [isUsnModalOpen, setIsUsnModalOpen] = useState(false);
  const [selectedUserForApproval, setSelectedUserForApproval] = useState<User | null>(null);
  const [admissionIdInput, setAdmissionIdInput] = useState("");


  const loadUsers = (statusFilter?: UserStatus | 'all') => {
    if (user && user.role === 'Admin') {
        setIsLoading(true);
        const filters = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
        fetchAllUsersAction(filters).then(data => {
            setAllUsers(data);
            setIsLoading(false);
        }).catch(err => {
            console.error("Error fetching users:", err);
            toast({ title: "Error", description: "Could not load user list.", variant: "destructive" });
            setIsLoading(false);
        });
    } else {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]); // Removed toast from deps, as it's stable

  const handleOpenUsnModal = (userToApprove: User) => {
    setSelectedUserForApproval(userToApprove);
    setAdmissionIdInput(""); // Clear previous input
    setIsUsnModalOpen(true);
  };

  const handleConfirmApprovalWithUsn = async () => {
    if (!selectedUserForApproval || !admissionIdInput.trim()) {
      toast({ title: "Error", description: "Admission ID (USN) is required.", variant: "destructive" });
      return;
    }
    setIsLoading(true); // Indicate loading for the specific action
    setIsUsnModalOpen(false);
    try {
        const success = await updateUserStatusAction(selectedUserForApproval.id, 'Active', admissionIdInput.trim().toUpperCase());
        if (success) {
            toast({ title: "Student Approved", description: `${selectedUserForApproval.name}'s account is now Active with USN: ${admissionIdInput.trim().toUpperCase()}.`, className: "bg-success text-success-foreground" });
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
        setIsLoading(false); // Stop loading indicator
    }
  };


  const handleUpdateStatus = async (targetUser: User, newStatus: UserStatus) => {
    // If approving a 'PendingApproval' student to 'Active', trigger USN modal
    if (targetUser.role === 'Student' && newStatus === 'Active' && targetUser.status === 'PendingApproval') {
        handleOpenUsnModal(targetUser);
        return;
    }

    // For other status changes (Reject, Disable, Activate non-student or already approved student)
    setIsLoading(true); 
    try {
        // Pass undefined for admissionId if not assigning/changing it
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

  const StatusBadge = ({ status }: { status: UserStatus }) => {
    let IconComponent = Hourglass;
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    let badgeClassName = ""; 

    switch (status) {
        case 'Active':
            IconComponent = CheckCircle;
            variant = "default"; // Will use theme's default (often primary if not overridden by custom class)
            badgeClassName = "bg-success text-success-foreground hover:bg-success/90";
            break;
        case 'PendingApproval':
            IconComponent = Hourglass;
            variant = "default"; // Using default, but custom class makes it yellow
            badgeClassName = "bg-warning text-warning-foreground hover:bg-warning/90";
            break;
        case 'Rejected':
        case 'Disabled':
            IconComponent = XCircle;
            variant = "destructive"; // Uses theme's destructive
            break;
        default:
            IconComponent = Hourglass; 
            variant = "secondary"; // Uses theme's secondary
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
        <Button disabled> {/* TODO: Implement add user functionality via a modal/form */}
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
          {isLoading && !isUsnModalOpen ? ( 
            <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell className="text-right space-x-1"><Skeleton className="h-8 w-20 inline-block" /><Skeleton className="h-8 w-20 inline-block" /></TableCell>
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
                        <TableHead className="text-right w-[220px]">Actions</TableHead>
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
                                {/* Add Edit User button later if needed */}
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
          if (!isOpen) setSelectedUserForApproval(null); // Clear selection on close
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Student & Assign USN</DialogTitle>
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
                onChange={(e) => setAdmissionIdInput(e.target.value.toUpperCase())} // Standardize to uppercase
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
              <CheckCircle className="mr-2 h-4 w-4" /> {isLoading ? 'Processing...' : 'Approve & Assign USN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

```
  </change>
  <change>
    <file>src/app/(app)/faculty/marks-entry/page.tsx</file>
    <description>Refactor marks entry page to use manual form-based input instead of Excel upload. Faculty select semester, section, and subject, then get a list of students to enter/edit marks for. Marks are saved via saveMultipleStudentMarksAction.</description>
    <content><![CDATA[
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import type { SubjectMark, StudentProfile } from '@/types';
import { Edit3, Save, BarChart, Info, Users, PlusCircle } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchStudentProfilesForMarksEntry, saveMultipleStudentMarksAction } from '@/actions/marks-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B", "C", "D"];
const SUBJECTS_BY_SEMESTER: Record<string, { code: string, name: string }[]> = {
  "1": [{ code: "MA101", name: "Applied Mathematics I" }, { code: "PH102", name: "Engineering Physics" }],
  "2": [{ code: "MA201", name: "Applied Mathematics II" }, { code: "CH202", name: "Engineering Chemistry" }],
  "3": [{ code: "CS301", name: "Data Structures" }, { code: "CS302", name: "Discrete Mathematics" }, { code: "EC303", name: "Analog Electronics" }, { code: "CS304", name: "Digital Design & Comp Org"}],
  "4": [{ code: "CS401", name: "Algorithms" }, { code: "CS402", name: "Operating Systems" }, { code: "EC403", name: "Microcontrollers"} ],
  "5": [{ code: "CS501", name: "Database Management" }, { code: "CS502", name: "Computer Networks" }],
  "6": [{ code: "CS601", name: "Compiler Design" }, { code: "CS602", name: "Software Engineering" }],
  "7": [{ code: "CS701", name: "Artificial Intelligence" }, { code: "CS702", name: "Cryptography" }],
  "8": [{ code: "CS801", name: "Project Work" }, { code: "CS802", name: "Professional Elective" }],
};

interface StudentWithMarksData extends StudentProfile {
  marks: SubjectMark; // Marks for the current subject, ensure all fields are present
}


export default function MarksEntryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<{ code: string, name: string } | null>(null);
  const [subjectsForSemester, setSubjectsForSemester] = useState<{ code: string, name: string }[]>([]);
  
  const [studentsForEntry, setStudentsForEntry] = useState<StudentWithMarksData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);

  useEffect(() => {
    setSubjectsForSemester(SUBJECTS_BY_SEMESTER[selectedSemester] || []);
    setSelectedSubject(null); // Reset subject when semester changes
    setStudentsForEntry([]);
    setInitialLoadAttempted(false);
  }, [selectedSemester]);

  useEffect(() => {
     // Reset students when section or subject changes before new load
     setStudentsForEntry([]);
     setInitialLoadAttempted(false);
  }, [selectedSection, selectedSubject])


  const loadStudentsAndMarks = useCallback(async () => {
    if (user && selectedSemester && selectedSection && selectedSubject) {
      setIsLoading(true);
      setInitialLoadAttempted(true); // Mark that a load has been attempted for current selections
      try {
        const data = await fetchStudentProfilesForMarksEntry(
          parseInt(selectedSemester),
          selectedSection,
          selectedSubject.code,
          user.id
        );
        
        // Transform data to ensure `marks` object is always present and fully initialized
        const transformedData: StudentWithMarksData[] = data.map(item => {
          // Ensure all required fields are present in the marks object
          const baseMarks: SubjectMark = {
            id: `${item.profile.userId}-${selectedSubject!.code}-${selectedSemester}`, // Use user ID for studentId
            _id: `${item.profile.userId}-${selectedSubject!.code}-${selectedSemester}`,
            studentId: item.profile.userId, 
            usn: item.profile.admissionId,
            studentName: item.profile.fullName,
            subjectCode: selectedSubject!.code,
            subjectName: selectedSubject!.name,
            semester: parseInt(selectedSemester),
            ia1_50: null,
            ia2_50: null,
            assignment1_20: null,
            assignment2_20: null,
          };
          return {
            ...item.profile,
            marks: item.marks ? { ...baseMarks, ...item.marks } : baseMarks,
          };
        });
        
        setStudentsForEntry(transformedData);

        if (transformedData.length === 0) {
            toast({title: "No Students Found", description: "No active students found for this class/section. Ensure student accounts are 'Active' and have assigned USNs.", variant: "default"});
        }
      } catch (error) {
        console.error("Error fetching students/marks:", error);
        toast({ title: "Error Loading Data", description: (error as Error).message || "Could not load student data. Please check selections or try again.", variant: "destructive" });
        setStudentsForEntry([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Clear data if selections are incomplete
      setStudentsForEntry([]);
      setInitialLoadAttempted(false);
    }
  }, [user, selectedSemester, selectedSection, selectedSubject, toast]);

  // Trigger loadStudentsAndMarks when selections change
  useEffect(() => {
    if (selectedSemester && selectedSection && selectedSubject && user) {
        loadStudentsAndMarks();
    } else {
        // Clear data if selections are not complete
        setStudentsForEntry([]);
        setInitialLoadAttempted(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemester, selectedSection, selectedSubject, user]); // loadStudentsAndMarks is memoized and stable


  const handleMarkChange = (studentUserId: string, field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50' | 'assignment1_20' | 'assignment2_20'>, value: string) => {
    const numericValue = value === '' || value === null || isNaN(parseFloat(value)) ? null : parseFloat(value);
    const maxValues: Record<string, number> = { ia1_50: 50, ia2_50: 50, assignment1_20: 20, assignment2_20: 20 };

    if (numericValue !== null && (numericValue < 0 || (maxValues[field] !== undefined && numericValue > maxValues[field]))) {
      toast({ title: "Invalid Mark", description: `Mark for ${field.replace('_', ' ')} must be between 0 and ${maxValues[field]}.`, variant: "destructive" });
      // Potentially revert UI change here or prevent it
      return; 
    }

    setStudentsForEntry(prev =>
      prev.map(student =>
        student.userId === studentUserId
          ? { ...student, marks: { ...student.marks, [field]: numericValue } }
          : student
      )
    );
  };

  const handleSaveChanges = async () => {
    if (!user || !selectedSemester || !selectedSection || !selectedSubject || studentsForEntry.length === 0) {
      toast({ title: "Cannot Save", description: "No data to save or selection incomplete. Please select semester, section, subject and ensure students are loaded.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    // Prepare marks for saving: ensure all required fields from StudentProfile are included in SubjectMark
    const marksToSave: SubjectMark[] = studentsForEntry.map(student => student.marks);

    if (marksToSave.length === 0) {
        toast({ title: "No Marks to Save", description: "No marks have been entered or changed for any student.", variant: "default" });
        setIsSaving(false);
        return;
    }
    
    try {
      const result = await saveMultipleStudentMarksAction(marksToSave, user.id);
      if (result.success) {
        toast({ title: "Changes Saved", description: result.message, className: "bg-success text-success-foreground" });
        loadStudentsAndMarks(); // Refresh data from DB
      } else {
        toast({ title: "Save Failed", description: result.message || "Could not save marks.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error saving marks:", error);
      toast({ title: "Save Error", description: `An unexpected error occurred: ${error.message || "Please try again."}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const calculateSummary = useMemo(() => {
    const marksList = studentsForEntry.map(s => s.marks);
    if (marksList.length === 0) return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    
    const validForCalc = marksList.filter(m => m.ia1_50 !== null || m.ia2_50 !== null || m.assignment1_20 !== null || m.assignment2_20 !== null);
    const totalStudentsInList = studentsForEntry.length; // Count of all students fetched for the class
    
    if (validForCalc.length === 0 && totalStudentsInList > 0) { // Students exist, but no marks entered yet
        return { count: totalStudentsInList, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    }
    if (totalStudentsInList === 0) { // No students fetched
        return { count: 0, avgIA1: 'N/A', avgIA2: 'N/A', avgAssign1: 'N/A', avgAssign2: 'N/A' };
    }


    const sum = (field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50' | 'assignment1_20' | 'assignment2_20'>) => 
        validForCalc.reduce((acc, m) => acc + (typeof m[field] === 'number' ? m[field] as number : 0), 0);
    
    const numValid = (field: keyof Pick<SubjectMark, 'ia1_50' | 'ia2_50' | 'assignment1_20' | 'assignment2_20'>) => 
        validForCalc.filter(m => typeof m[field] === 'number').length;

    return {
        count: totalStudentsInList,
        avgIA1: numValid('ia1_50') > 0 ? (sum('ia1_50') / numValid('ia1_50')).toFixed(2) : 'N/A',
        avgIA2: numValid('ia2_50') > 0 ? (sum('ia2_50') / numValid('ia2_50')).toFixed(2) : 'N/A',
        avgAssign1: numValid('assignment1_20') > 0 ? (sum('assignment1_20') / numValid('assignment1_20')).toFixed(2) : 'N/A',
        avgAssign2: numValid('assignment2_20') > 0 ? (sum('assignment2_20') / numValid('assignment2_20')).toFixed(2) : 'N/A',
    };
  }, [studentsForEntry]);


  if (!user || user.role !== 'Faculty') {
    return (
        <div className="flex flex-col items-center justify-center h-full p-10">
            <Edit3 className="w-16 h-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is for faculty members only.</p>
        </div>
    );
  }

  const selectionMade = !!(selectedSemester && selectedSection && selectedSubject);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><Edit3 className="mr-2 h-8 w-8 text-primary" /> Marks Entry</h1>

      {/* Step 1: Selection */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Class and Subject</CardTitle>
          <CardDescription>Choose the semester, section, and subject to enter or view marks. Students must be 'Active' and have an assigned USN to appear.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="semester">Semester</Label>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger id="semester"><SelectValue placeholder="Select Semester" /></SelectTrigger>
              <SelectContent>
                {SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="section">Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedSemester}>
              <SelectTrigger id="section"><SelectValue placeholder="Select Section" /></SelectTrigger>
              <SelectContent>
                {SECTIONS.map(sec => <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="subject">Subject</Label>
            <Select
              value={selectedSubject?.code || ""}
              onValueChange={(code) => setSelectedSubject(subjectsForSemester.find(s => s.code === code) || null)}
              disabled={!selectedSection || subjectsForSemester.length === 0}
            >
              <SelectTrigger id="subject"><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>
                {subjectsForSemester.length > 0 ? (
                    subjectsForSemester.map(sub => <SelectItem key={sub.code} value={sub.code}>{sub.name} ({sub.code})</SelectItem>)
                ) : (
                    <SelectItem value="-" disabled>No subjects for this semester</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Display & Edit Marks Table */}
       {selectionMade && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Enter Marks: {selectedSubject?.name} ({selectedSubject?.code}) - Sem {selectedSemester}, Sec {selectedSection}</CardTitle>
            <CardDescription>Input marks for each student. Click 'Save All Marks' when done. Ensure USNs are correct as they link marks to students.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="space-y-2">
                    <p className="text-center text-muted-foreground py-4">Loading student data...</p>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                 </div>
            ) : studentsForEntry.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px] sticky left-0 bg-card z-10">USN</TableHead>
                      <TableHead className="sticky left-[120px] bg-card z-10">Student Name</TableHead>
                      <TableHead className="text-center w-28">IA 1 (50)</TableHead>
                      <TableHead className="text-center w-28">IA 2 (50)</TableHead>
                      <TableHead className="text-center w-32">Assign 1 (20)</TableHead>
                      <TableHead className="text-center w-32">Assign 2 (20)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForEntry.map((student) => (
                      <TableRow key={student.userId}>
                        <TableCell className="font-mono text-xs sticky left-0 bg-card z-10">{student.admissionId}</TableCell>
                        <TableCell className="font-medium sticky left-[120px] bg-card z-10">{student.fullName}</TableCell>
                        {(['ia1_50', 'ia2_50', 'assignment1_20', 'assignment2_20'] as const).map(field => (
                          <TableCell key={field} className="px-1 py-1">
                            <Input
                              type="number"
                              className="w-24 text-center mx-auto bg-background h-9 text-sm"
                              value={student.marks?.[field] === null || student.marks?.[field] === undefined ? '' : String(student.marks?.[field])}
                              onChange={(e) => handleMarkChange(student.userId, field, e.target.value)}
                              min="0"
                              max={field.includes('50') ? "50" : "20"}
                              disabled={isSaving}
                              placeholder="N/A"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
                    <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save All Marks'}
                  </Button>
                </div>
              </div>
            ) : (
                 initialLoadAttempted && ( // Show message only if load was attempted for the current selection
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="mx-auto h-12 w-12 mb-4" />
                        <p className="text-lg">No active students found for this selection.</p>
                        <p>Please ensure students are registered, approved by admin with a USN, and match the selected semester/section.</p>
                    </div>
                 )
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Performance Summary */}
      {selectionMade && !isLoading && studentsForEntry.length > 0 && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary" /> Performance Summary</CardTitle>
                    <CardDescription>Overall statistics for {selectedSubject?.name} - Section {selectedSection}. (Based on currently displayed/entered marks)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Students</p>
                            <p className="text-2xl font-bold">{calculateSummary.count}</p>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. IA 1</p>
                            <p className="text-2xl font-bold">{calculateSummary.avgIA1}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. IA 2</p>
                            <p className="text-2xl font-bold">{calculateSummary.avgIA2}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. Assign 1</p>
                            <p className="text-2xl font-bold">{calculateSummary.avgAssign1}</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Avg. Assign 2</p>
                            <p className="text-2xl font-bold">{calculateSummary.avgAssign2}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
       )}

      {/* Initial state message or if selections are cleared */}
       {!selectionMade && !isLoading && (
         <Alert className="mt-6 bg-accent/20 border-accent text-accent-foreground">
             <Info className="h-5 w-5 text-accent" />
            <AlertTitle>Select Class to Begin</AlertTitle>
            <AlertDescription>Please select a semester, section, and subject above to view or enter marks for students.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}

```
  </change>
  <change>
    <file>src/actions/marks-actions.ts</file>
    <description>Refactor marks actions to align with manual form-based entry. Ensure USN (admissionId) and studentId (User.id) are correctly handled. fetchStudentProfilesForMarksEntry now ensures student profiles include string IDs. saveMultipleStudentMarksAction structures data for MongoDB upsert correctly. Removed references to Excel upload specific logic.</description>
    <content><![CDATA[
'use server';

import { z } from 'zod';
import type { SubjectMark, StudentProfile } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import { MARKS_COLLECTION, STUDENT_PROFILES_COLLECTION } from '@/lib/constants';
import type { Collection, Filter } from 'mongodb';
import { ObjectId } from 'mongodb';


async function getMarksCollection(): Promise<Collection<SubjectMark>> {
  const { db } = await connectToDatabase();
  return db.collection<SubjectMark>(MARKS_COLLECTION);
}

async function getStudentProfilesCollection(): Promise<Collection<StudentProfile>> {
  const { db } = await connectToDatabase();
  return db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);
}


/**
 * Fetches student profiles for a given class (year, section) and their existing marks for a subject.
 * Only fetches students whose user status is 'Active'.
 * @param semester The semester number.
 * @param section The section identifier.
 * @param subjectCode The code of the subject for which marks are being entered/viewed.
 * @param facultyId The ID of the faculty member (for authorization or logging, not directly used in query yet).
 * @returns An array of objects, each containing a student's profile and their marks (if any) for the subject.
 */
export async function fetchStudentProfilesForMarksEntry(
  semester: number,
  section: string,
  subjectCode: string,
  facultyId: string 
): Promise<Array<{ profile: StudentProfile; marks?: SubjectMark }>> {
  try {
    console.log(`Fetching student profiles and marks for Sem: ${semester}, Sec: ${section}, Sub: ${subjectCode}, Faculty: ${facultyId}`);
    const studentProfilesCollection = await getStudentProfilesCollection();
    const marksCollection = await getMarksCollection();

    const year = Math.ceil(semester / 2);
    
    // Fetch active student profiles for the given year and section
    // It's crucial that StudentProfile.userId corresponds to User.id, which is a string (ObjectId.toHexString())
    // And StudentProfile.id is its own _id.toHexString()
    const studentProfilesCursor = studentProfilesCollection.find({ 
        year, 
        section,
        // Add a check for student.user.status === 'Active' by joining with users collection or ensuring profiles are only for active users
        // For now, assuming StudentProfile implies an associated active user if they are in a class section.
        // A more robust way would be to fetch active User IDs first, then query StudentProfile.
        // This is handled in fetchStudentsForFacultyAction, we can adapt similar logic if needed here or ensure consistency.
        // For now, let's assume profiles are for students who are generally active in the system.
        // The `fetchStudentsForFacultyAction` already filters by active users. Here we directly query profiles.
        // This means the admin must ensure students are 'Active' AND assigned to sections.
    });
    const studentProfiles = (await studentProfilesCursor.toArray()).map(p => {
        const { _id, ...rest } = p;
        return { ...rest, id: _id.toHexString(), _id: _id.toHexString(), userId: p.userId } as StudentProfile;
    });

    if (studentProfiles.length === 0) {
      return [];
    }

    const studentUserIds = studentProfiles.map(p => p.userId); // Use User.id (string)

    const marksQuery: Filter<SubjectMark> = {
      studentId: { $in: studentUserIds }, // Query by User.id
      semester: semester,
      subjectCode: subjectCode,
    };
    const existingMarksCursor = marksCollection.find(marksQuery);
    const existingMarksArray = await existingMarksCursor.toArray();
    
    const marksMap = new Map<string, SubjectMark>();
    existingMarksArray.forEach(markDoc => {
      // Ensure _id is stringified, which it should be as it's the composite key.
      // Also ensure 'id' field is present and matches _id.
      const markWithStrId = { ...markDoc, _id: String(markDoc._id), id: String(markDoc._id) } as SubjectMark;
      marksMap.set(markDoc.studentId, markWithStrId); // Key by studentId (User.id)
    });

    const result = studentProfiles.map(profile => {
      return {
        profile: profile, // profile already has string IDs
        marks: marksMap.get(profile.userId), // Get marks using User.id
      };
    });

    return result;
  } catch (error) {
    console.error("Error in fetchStudentProfilesForMarksEntry:", error);
    throw new Error("Failed to fetch student profiles or marks.");
  }
}

// Schema for validating individual mark entries before saving
const SubjectMarkInputSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"), // This is User.id
  usn: z.string().min(1, "USN is required"),
  studentName: z.string().min(1, "Student Name is required"),
  subjectCode: z.string().min(1, "Subject Code is required"),
  subjectName: z.string().min(1, "Subject Name is required"),
  semester: z.number().int().min(1).max(8),
  ia1_50: z.number().min(0).max(50).nullable().optional(),
  ia2_50: z.number().min(0).max(50).nullable().optional(),
  assignment1_20: z.number().min(0).max(20).nullable().optional(),
  assignment2_20: z.number().min(0).max(20).nullable().optional(),
  // id and _id will be derived, not part of direct input for this action
});
type SubjectMarkInput = z.infer<typeof SubjectMarkInputSchema>;

/**
 * Saves or updates marks for multiple students.
 * @param marksEntries An array of SubjectMarkInput objects.
 * @param facultyId The ID of the faculty member performing the save (for logging/auditing).
 * @returns An object indicating success, a message, and optional errors.
 */
export async function saveMultipleStudentMarksAction(
  marksEntries: SubjectMarkInput[],
  facultyId: string
): Promise<{ success: boolean; message: string; errors?: any[] }> {
  try {
    if (!marksEntries || marksEntries.length === 0) {
      return { success: false, message: "No marks data provided." };
    }
    console.log(`Saving ${marksEntries.length} student marks entries by Faculty: ${facultyId}`);

    const marksCollection = await getMarksCollection();
    const operations: any[] = []; // Array for bulkWrite operations
    const validationErrors: any[] = [];

    for (const entry of marksEntries) {
      const validation = SubjectMarkInputSchema.safeParse(entry);
      if (!validation.success) {
        console.warn("Invalid mark entry skipped:", entry, validation.error.flatten());
        validationErrors.push({ usn: entry.usn || 'Unknown USN', errors: validation.error.flatten() });
        continue; 
      }
      
      const validEntry = validation.data;
      const markId = `${validEntry.studentId}-${validEntry.subjectCode}-${validEntry.semester}`;
      
      // Construct the document for MongoDB, ensuring all assessment fields are explicitly present or null
      const markDocument: SubjectMark = {
        id: markId,
        _id: markId, // Use the composite key as MongoDB _id
        studentId: validEntry.studentId,
        usn: validEntry.usn,
        studentName: validEntry.studentName,
        subjectCode: validEntry.subjectCode,
        subjectName: validEntry.subjectName,
        semester: validEntry.semester,
        ia1_50: validEntry.ia1_50 ?? null,
        ia2_50: validEntry.ia2_50 ?? null,
        assignment1_20: validEntry.assignment1_20 ?? null,
        assignment2_20: validEntry.assignment2_20 ?? null,
        // credits field is optional and not handled in this form, can be added if needed
      };

      operations.push({
        updateOne: {
          filter: { _id: markId }, // Query by the composite _id which includes studentId
          update: { $set: markDocument },
          upsert: true,
        },
      });
    }

    if (operations.length === 0 && validationErrors.length > 0) {
      return { success: false, message: "All mark entries were invalid. No data saved.", errors: validationErrors };
    }
    if (operations.length === 0 && validationErrors.length === 0){
        return { success: true, message: "No valid marks entries to save." };
    }


    const result = await marksCollection.bulkWrite(operations);

    const successCount = result.upsertedCount + result.modifiedCount;
    console.log(`Bulk write result: Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}, Matched ${result.matchedCount}`);
    
    let message = `Successfully saved/updated ${successCount} of ${operations.length} student marks records.`;
    if (validationErrors.length > 0) {
        message += ` ${validationErrors.length} entries had validation issues and were skipped.`;
    }

    return {
      success: true,
      message: message,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
    };

  } catch (error: any) {
    console.error("Error in saveMultipleStudentMarksAction:", error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message}`,
      errors: [{ general: error.message }],
    };
  }
}


/**
 * Fetches all marks for a given subject in a specific semester and section.
 * This function is primarily used for the performance analysis page.
 * It relies on student profiles to identify students in a section.
 * @param semester The semester number.
 * @param section The section identifier.
 * @param subjectCode The code of the subject.
 * @returns An array of SubjectMark objects.
 */
export async function fetchMarksFromStorage(semester: number, section: string, subjectCode: string): Promise<SubjectMark[]> {
  console.log(`Fetching marks from DB for Performance Analysis: Sem ${semester}, Sec ${section}, Sub ${subjectCode}`);
  const marksCollection = await getMarksCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();

  const year = Math.ceil(semester / 2);

  // 1. Find students in the given year and section
  const studentProfilesCursor = studentProfilesCollection.find({ year, section });
  const studentProfiles = await studentProfilesCursor.toArray();

  if (studentProfiles.length === 0) {
    console.log(`No student profiles found for Sem ${semester}, Sec ${section}. Returning empty marks array.`);
    return [];
  }

  const studentUserIds = studentProfiles.map(p => p.userId); // These are User.id strings

  // 2. Fetch marks for these students for the given subject and semester
  const marksQuery: Filter<SubjectMark> = {
    studentId: { $in: studentUserIds }, // Query by User.id
    semester: semester,
    subjectCode: subjectCode,
  };
  
  const fetchedMarks = await marksCollection.find(marksQuery).toArray();
  
  return fetchedMarks.map(doc => {
    // _id is already a string (studentId-subjectCode-semester) and is also stored as 'id'.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...rest } = doc; 
    return { ...rest, id: String(doc._id), _id: String(doc._id) } as SubjectMark;
  });
}

```
  </change>
  <change>
    <file>src/actions/marks-upload.ts</file>
    <description>Delete marks-upload.ts as Excel upload functionality is being removed in favor of manual form-based entry.</description>
    <content><![CDATA[