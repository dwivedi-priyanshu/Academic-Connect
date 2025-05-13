
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

export async function fetchUserProfileDataAction(userId: string): Promise<User | null> {
  try {
    const usersCollection = await getUsersCollection();
    // Prefer fetching by ObjectId if userId is a valid ObjectId string
    const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    const userDoc = await usersCollection.findOne(query as any); 
    
    if (!userDoc) return null;
    
    const idStr = userDoc._id.toHexString();
    const { _id, password, ...rest } = userDoc; // Exclude original _id and password
    return { ...rest, id: idStr, _id: idStr } as User; // Ensure _id is string
  } catch (error) {
    console.error('Error fetching user profile data:', error);
    throw new Error('Failed to fetch user profile data.');
  }
}

export async function fetchStudentFullProfileDataAction(userId: string): Promise<StudentProfile | null> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    // Assuming userId in student_profiles collection refers to User's string ID
    const profileDoc = await studentProfilesCollection.findOne({ userId: userId });
    
    if (!profileDoc) return null;
    
    const idStr = profileDoc._id.toHexString();
    const { _id, ...rest } = profileDoc;
    return { ...rest, id: idStr, _id: idStr } as unknown as StudentProfile; // Ensure _id is string
  } catch (error) {
    console.error('Error fetching student detailed profile data:', error);
    throw new Error('Failed to fetch student detailed profile data.');
  }
}


export async function saveStudentProfileDataAction(profileData: StudentProfile): Promise<boolean> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const { id, userId, _id, ...dataToSave } = profileData; // Remove id, _id from dataToSave
    
    // Use userId for querying, as 'id' on StudentProfile is its own _id.toHexString()
    const filter = { userId: userId }; 
    // If upserting based on _id (profile's own id), ensure it's an ObjectId
    // const filter = { _id: new ObjectId(id) }; 
    
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
        const { id, status, _id, password, ...dataToUpdate } = userData; // Exclude sensitive/internal fields
        
        const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: id };
        const result = await usersCollection.updateOne(
            filter as any, 
            { $set: dataToUpdate }, 
            { upsert: false } 
        );
        return result.modifiedCount === 1;
    } catch (error) {
        console.error('Error saving user general data:', error);
        throw new Error('Failed to save user data.');
    }
}

export async function updateUserStatusAction(userId: string, newStatus: UserStatus, admissionId?: string): Promise<boolean> {
  try {
    const usersCollection = await getUsersCollection();
    const studentProfilesCollection = await getStudentProfilesCollection();

    const userFilter = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    
    const userToUpdate = await usersCollection.findOne(userFilter as any);
    if (!userToUpdate) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const userUpdateResult = await usersCollection.updateOne(
      userFilter as any,
      { $set: { status: newStatus } }
    );

    // If student is being activated and admissionId is provided, update their profile
    if (userToUpdate.role === 'Student' && newStatus === 'Active' && admissionId) {
      const studentProfileUpdateResult = await studentProfilesCollection.updateOne(
        { userId: userId }, // Find student profile by their user ID
        { $set: { admissionId: admissionId.toUpperCase() } }
      );
      if (studentProfileUpdateResult.matchedCount === 0) {
        console.warn(`No student profile found for user ${userId} to update admissionId.`);
        // Depending on desired behavior, you might want to throw an error or handle this
      }
      // Return true if user status was updated, even if profile update didn't match (though it should)
      return userUpdateResult.modifiedCount === 1;
    }

    return userUpdateResult.modifiedCount === 1;
  } catch (error) {
    console.error(`Error updating status for user ${userId}:`, error);
    throw new Error('Failed to update user status.');
  }
}


export async function fetchStudentsForFacultyAction(
  facultyId: string, // facultyId might be used later for authorization/filtering by assigned classes
  filters?: { year?: number; section?: string; department?: string; }
): Promise<StudentProfile[]> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const query: Filter<StudentProfile> = {}; 
    
    if (filters?.department) query.department = filters.department;
    if (filters?.year) query.year = filters.year; 
    if (filters?.section) query.section = filters.section;

    // Ensure only students with 'Active' user status are fetched
    const usersCollection = await getUsersCollection();
    const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1 }).toArray();
    const activeStudentUserIds = activeStudentUsers.map(u => u.id);

    query.userId = { $in: activeStudentUserIds };


    const studentsArray = await studentProfilesCollection.find(query).toArray();
    return studentsArray.map(s => {
        const idStr = s._id.toHexString();
        const { _id, ...rest } = s;
        return { ...rest, id: idStr, _id: idStr } as unknown as StudentProfile; 
    });
  } catch (error) {
    console.error('Error fetching students for faculty:', error);
    throw new Error('Failed to fetch students.');
  }
}

export async function fetchAllUsersAction(filters?: { role?: UserRole, status?: UserStatus }): Promise<User[]> {
  try {
    const usersCollection = await getUsersCollection();
    const query: Filter<User> = {};
    if (filters?.role) query.role = filters.role;
    if (filters?.status) query.status = filters.status;

    const usersArray = await usersCollection.find(query).toArray();
    return usersArray.map(u => {
        const idStr = u._id.toHexString();
        const { _id, password, ...rest } = u; 
        return { ...rest, id: idStr, _id: idStr } as User; 
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw new Error('Failed to fetch all users.');
  }
}

export async function createUserAction(
  userData: Pick<User, 'email' | 'name' | 'role'> & { passwordPlainText: string },
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
  const userIdStr = userObjectId.toHexString();
  // When admin creates, status is Active. When user registers, status is PendingApproval.
  // This action is now also used by registerUserAction, so default status should reflect registration flow.
  // For direct admin creation (e.g. seeding), status might be overridden.
  // Let's assume this createUserAction is for *admin creating users* -> Active.
  // registerUserAction handles its own status logic.
  const initialStatus: UserStatus = (userData.role === 'Admin' || userData.role === 'Faculty') ? 'Active' : 'PendingApproval'; 


  const userDocumentToInsert = {
    _id: userObjectId,
    id: userIdStr,
    email: userData.email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    password: userData.passwordPlainText,
    avatar: `https://picsum.photos/seed/${userIdStr}/100/100`,
    status: initialStatus, 
  };

  await usersCollection.insertOne(userDocumentToInsert as any);
  
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
    const studentProfileDocumentToInsert = {
      _id: studentProfileObjectId,
      id: studentProfileIdStr, 
      userId: createdUser.id,
      // Admin assigns Admission ID upon approval, so it's initially blank or placeholder.
      admissionId: studentProfileDetails?.admissionId || "", // Or "PENDING_ASSIGNMENT"
      fullName: studentProfileDetails?.fullName || createdUser.name,
      dateOfBirth: studentProfileDetails?.dateOfBirth || '', // Changed to empty string
      contactNumber: studentProfileDetails?.contactNumber || '', // Changed to empty string
      address: studentProfileDetails?.address || '', // Changed to empty string
      department: studentProfileDetails?.department || 'Not Specified',
      year: studentProfileDetails?.year || 1,
      section: studentProfileDetails?.section || 'N/A',
      parentName: studentProfileDetails?.parentName || '', // Changed to empty string
      parentContact: studentProfileDetails?.parentContact || '', // Changed to empty string
    };
    await studentProfilesCollection.insertOne(studentProfileDocumentToInsert as any);

    const { _id, ...restOfProfileDoc } = studentProfileDocumentToInsert; 
    createdStudentProfile = {
      ...restOfProfileDoc, 
      _id: studentProfileIdStr, 
    } as StudentProfile;
  }

  return { user: createdUser, studentProfile: createdStudentProfile };
}
