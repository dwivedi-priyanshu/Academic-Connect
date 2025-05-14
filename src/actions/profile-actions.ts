

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
    console.log(`[ProfileActions] Fetching students for faculty ${facultyId} with filters:`, JSON.stringify(filters));
    const studentProfilesCollection = await getStudentProfilesCollection();
    const query: Filter<StudentProfile> = {}; 
    
    if (filters?.department) query.department = filters.department;
    if (filters?.year) query.year = filters.year; 
    if (filters?.section) query.section = filters.section;

    const usersCollection = await getUsersCollection();
    // Fetch users and project both _id and id to be safe, though 'id' (string) is primary.
    const activeStudentUsers = await usersCollection.find({ role: 'Student', status: 'Active' }).project({ id: 1, _id: 1 }).toArray();
    
    console.log(`[ProfileActions] Found ${activeStudentUsers.length} total 'Active' student user accounts in the system.`);
    
    const activeStudentUserIds = activeStudentUsers
        .map(u => u.id || u._id?.toHexString()) // Prefer string 'id', fallback to hex of '_id'
        .filter(id => typeof id === 'string' && id.trim() !== ''); // Ensure IDs are valid strings

    if(activeStudentUserIds.length === 0) {
        console.log("[ProfileActions] No 'Active' student user accounts resulted in valid IDs. Returning empty list.");
        return []; 
    }
    console.log("[ProfileActions] Active student user string IDs for profile query:", activeStudentUserIds);

    query.userId = { $in: activeStudentUserIds };
    console.log("[ProfileActions] Final query for student_profiles:", JSON.stringify(query));


    const studentsArray = await studentProfilesCollection.find(query).toArray();
    console.log(`[ProfileActions] Found ${studentsArray.length} student profiles matching the final query.`);
    
    return studentsArray.map(s => {
        const idStr = s._id.toHexString();
        const { _id, ...rest } = s;
        // Ensure userId from profile is what we expect (it should be string already as it's set from User.id)
        return { ...rest, id: idStr, _id: idStr, userId: s.userId } as StudentProfile; 
    });
  } catch (error) {
    console.error('[ProfileActions] Error fetching students for faculty:', error);
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
  studentProfileDetails?: Partial<Omit<StudentProfile, 'userId' | 'id' | '_id' | 'fullName'>> & { fullName?: string, admissionId?: string, avatar?: string; }
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
  
  const initialStatus: UserStatus = (userData.role === 'Student') ? 'PendingApproval' : 'Active';


  const userDocumentToInsert: Omit<User, 'id'> & { _id: ObjectId, password?: string } = {
    _id: userObjectId,
    email: userData.email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    password: userData.passwordPlainText, 
    avatar: studentProfileDetails?.avatar || `https://placehold.co/100x100.png?text=${userData.name.substring(0,1)}`, 
    status: initialStatus, 
  };
  (userDocumentToInsert as User).id = userIdStr; // Explicitly add string id field

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
    
    const studentProfileDocumentToInsert: Omit<StudentProfile, 'id' | '_id'> & { _id: ObjectId, id:string; avatar?: string; } = {
      _id: studentProfileObjectId,
      id: studentProfileIdStr, // Add string id
      userId: createdUser.id, 
      admissionId: studentProfileDetails?.admissionId || `TEMP-${Date.now().toString().slice(-6)}`, 
      fullName: studentProfileDetails?.fullName || createdUser.name,
      avatar: studentProfileDetails?.avatar || createdUser.avatar, // Carry over avatar
      dateOfBirth: studentProfileDetails?.dateOfBirth || '', 
      contactNumber: studentProfileDetails?.contactNumber || '', 
      address: studentProfileDetails?.address || '', 
      department: studentProfileDetails?.department || 'Not Specified',
      year: studentProfileDetails?.year || 1,
      section: studentProfileDetails?.section || 'N/A',
      parentName: studentProfileDetails?.parentName || '', 
      parentContact: studentProfileDetails?.parentContact || '', 
      // Initialize new StudentProfile fields
      fatherName: studentProfileDetails?.fatherName || '',
      motherName: studentProfileDetails?.motherName || '',
      gender: studentProfileDetails?.gender || '',
      bloodGroup: studentProfileDetails?.bloodGroup || '',
      aadharNumber: studentProfileDetails?.aadharNumber || '',
      category: studentProfileDetails?.category || '',
      religion: studentProfileDetails?.religion || '',
      nationality: studentProfileDetails?.nationality || '',
      sslcMarks: studentProfileDetails?.sslcMarks || '',
      pucMarks: studentProfileDetails?.pucMarks || '',
    };

    const profileInsertResult = await studentProfilesCollection.insertOne(studentProfileDocumentToInsert as StudentProfile);
    if(!profileInsertResult.insertedId){
        throw new Error("Failed to insert student profile into database.");
    }
    
    const { _id, ...restOfProfileDoc } = studentProfileDocumentToInsert; 
    createdStudentProfile = {
      ...restOfProfileDoc, 
      id: studentProfileIdStr, // Ensure string id is primary
      _id: studentProfileIdStr, 
    } as StudentProfile;
  }

  return { user: createdUser, studentProfile: createdStudentProfile };
}
