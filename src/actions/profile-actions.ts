
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { USERS_COLLECTION, STUDENT_PROFILES_COLLECTION } from '@/lib/constants';
import type { User, StudentProfile, UserRole, UserStatus } from '@/types';
import type { Collection } from 'mongodb';
import { ObjectId } from 'mongodb';

async function getUsersCollection(): Promise<Collection<User>> {
  const { db } = await connectToDatabase();
  return db.collection<User>(USERS_COLLECTION);
}

async function getStudentProfilesCollection(): Promise<Collection<StudentProfile>> {
  const { db } = await connectToDatabase();
  return db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);
}

export async function fetchUserProfileDataAction(userId: string): Promise<User | null> {
  try {
    const usersCollection = await getUsersCollection();
    const userDoc = await usersCollection.findOne({ id: userId }); 
    if (!userDoc) return null;
    return { ...userDoc, id: userDoc.id || userDoc._id?.toHexString() } as User;
  } catch (error) {
    console.error('Error fetching user profile data:', error);
    throw new Error('Failed to fetch user profile data.');
  }
}

export async function fetchStudentFullProfileDataAction(userId: string): Promise<StudentProfile | null> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const profileDoc = await studentProfilesCollection.findOne({ userId: userId });
    if (!profileDoc) return null;
    return { ...profileDoc, id: profileDoc._id.toHexString() } as unknown as StudentProfile;
  } catch (error) {
    console.error('Error fetching student detailed profile data:', error);
    throw new Error('Failed to fetch student detailed profile data.');
  }
}


export async function saveStudentProfileDataAction(profileData: StudentProfile): Promise<boolean> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const { id, userId, ...dataToSave } = profileData;
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

export async function saveUserGeneralDataAction(userData: Partial<User> & { id: string }): Promise<boolean> {
     try {
        const usersCollection = await getUsersCollection();
        const { id, status, ...dataToUpdate } = userData; // Exclude status from general update
        const result = await usersCollection.updateOne(
            { id: userData.id }, 
            { $set: dataToUpdate }, // Update specific fields like name, email, avatar
            { upsert: false } 
        );
        return result.modifiedCount === 1;
    } catch (error) {
        console.error('Error saving user general data:', error);
        throw new Error('Failed to save user data.');
    }
}

export async function updateUserStatusAction(userId: string, newStatus: UserStatus): Promise<boolean> {
  try {
    const usersCollection = await getUsersCollection();
    const result = await usersCollection.updateOne(
      { id: userId },
      { $set: { status: newStatus } }
    );
    return result.modifiedCount === 1;
  } catch (error) {
    console.error(`Error updating status for user ${userId}:`, error);
    throw new Error('Failed to update user status.');
  }
}


export async function fetchStudentsForFacultyAction(
  facultyId: string, 
  filters?: { year?: number; section?: string; department?: string; }
): Promise<StudentProfile[]> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const query: any = {}; 
    if (filters?.department) query.department = filters.department;
    if (filters?.year) query.year = filters.year; 
    if (filters?.section) query.section = filters.section;

    const studentsCursor = studentProfilesCollection.find(query);
    const studentsArray = await studentsCursor.toArray();
    return studentsArray.map(s => ({ ...s, id: s._id.toHexString() } as unknown as StudentProfile));
  } catch (error) {
    console.error('Error fetching students for faculty:', error);
    throw new Error('Failed to fetch students.');
  }
}

export async function fetchAllUsersAction(filters?: { role?: UserRole, status?: UserStatus }): Promise<User[]> {
  try {
    const usersCollection = await getUsersCollection();
    const query: any = {};
    if (filters?.role) query.role = filters.role;
    if (filters?.status) query.status = filters.status;

    const usersArray = await usersCollection.find(query).toArray();
    return usersArray.map(u => ({ ...u, id: u.id || u._id?.toHexString() }) as User);
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw new Error('Failed to fetch all users.');
  }
}

// This function is typically used for seeding or initial setup by an admin.
// Registration from UI should use `registerUserAction` from `auth-actions.ts`.
export async function createUserAction(
  userData: Pick<User, 'email' | 'name' | 'role'> & { passwordPlainText: string }, // Added password
  studentProfileDetails?: Partial<Omit<StudentProfile, 'userId' | 'id' | '_id' | 'fullName'>> & { fullName?: string }
): Promise<{ user: User; studentProfile?: StudentProfile } | null> {
  const usersCollection = await getUsersCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();

  const existingUser = await usersCollection.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    console.warn(`User with email ${userData.email} already exists during createUserAction (seed/admin).`);
    return null; 
  }

  const userObjectId = new ObjectId();
  // For this admin/seed creation, default status to Active. UI registration will use PendingApproval.
  const initialStatus: UserStatus = 'Active'; 

  const userDocumentToInsert = {
    _id: userObjectId,
    id: userObjectId.toHexString(),
    email: userData.email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    password: userData.passwordPlainText, // Storing plain text password - INSECURE for production
    avatar: `https://picsum.photos/seed/${userObjectId.toHexString()}/100/100`,
    status: initialStatus, 
  };

  await usersCollection.insertOne(userDocumentToInsert as any); // Cast to any for password
  
  const createdUser: User = {
    id: userDocumentToInsert.id,
    email: userDocumentToInsert.email,
    name: userDocumentToInsert.name,
    role: userDocumentToInsert.role,
    avatar: userDocumentToInsert.avatar,
    status: userDocumentToInsert.status,
  };

  let createdStudentProfile: StudentProfile | undefined = undefined;

  if (userData.role === 'Student') {
    const studentProfileObjectId = new ObjectId();
    const studentProfileDocumentToInsert = {
      _id: studentProfileObjectId,
      userId: createdUser.id,
      admissionId: studentProfileDetails?.admissionId || `DEFAULT${Date.now().toString().slice(-4)}`,
      fullName: studentProfileDetails?.fullName || createdUser.name,
      dateOfBirth: studentProfileDetails?.dateOfBirth || 'N/A',
      contactNumber: studentProfileDetails?.contactNumber || 'N/A',
      address: studentProfileDetails?.address || 'N/A',
      department: studentProfileDetails?.department || 'Not Specified',
      year: studentProfileDetails?.year || 1,
      section: studentProfileDetails?.section || 'N/A',
      parentName: studentProfileDetails?.parentName || 'N/A',
      parentContact: studentProfileDetails?.parentContact || 'N/A',
    };
    await studentProfilesCollection.insertOne(studentProfileDocumentToInsert as any);

    const { _id, ...restOfProfileDoc } = studentProfileDocumentToInsert;
    createdStudentProfile = {
      ...restOfProfileDoc,
      id: studentProfileObjectId.toHexString(),
    } as StudentProfile;
  }

  return { user: createdUser, studentProfile: createdStudentProfile };
}
