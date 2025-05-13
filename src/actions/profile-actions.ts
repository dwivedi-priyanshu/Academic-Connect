'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { USERS_COLLECTION, STUDENT_PROFILES_COLLECTION } from '@/lib/constants';
import type { User, StudentProfile, UserRole } from '@/types';
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
    // User documents in DB have 'id' field which is a string version of _id
    const userDoc = await usersCollection.findOne({ id: userId }); 
    if (!userDoc) return null;
    // The User type expects 'id' as string, and _id is optional.
    // If userDoc comes from DB findOne, _id is ObjectId.
    // Ensure the returned object matches the User type, mapping _id if necessary.
    // For this setup, it's assumed userDoc from DB already has 'id' correctly populated or mapped.
    return { ...userDoc, id: userDoc.id || userDoc._id?.toHexString() } as User;
  } catch (error) {
    console.error('Error fetching user profile data:', error);
    throw new Error('Failed to fetch user profile data.');
  }
}

export async function fetchStudentFullProfileDataAction(userId: string): Promise<StudentProfile | null> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    // StudentProfile's main identifier for linking is userId. _id is mongo's internal.
    const profileDoc = await studentProfilesCollection.findOne({ userId: userId });
    if (!profileDoc) return null;
    // Map MongoDB's _id (ObjectId) to a string 'id' field for the StudentProfile type
    return { ...profileDoc, id: profileDoc._id.toHexString() } as unknown as StudentProfile;
  } catch (error) {
    console.error('Error fetching student detailed profile data:', error);
    throw new Error('Failed to fetch student detailed profile data.');
  }
}


export async function saveStudentProfileDataAction(profileData: StudentProfile): Promise<boolean> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    // When saving, we expect profileData.id to be the string version of _id for an existing profile.
    // For upserting based on userId, we filter by userId.
    // The actual document _id should be an ObjectId.
    
    // If profileData.id exists and is a valid ObjectId hex string, use it to target the document.
    // Otherwise, this is effectively an insert based on userId if no match.
    const { id, userId, ...dataToSave } = profileData;

    const filter = { userId: userId };
    // Ensure _id is not part of $set if it's derived or handled by MongoDB
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

export async function saveUserGeneralDataAction(userData: User): Promise<boolean> {
     try {
        const usersCollection = await getUsersCollection();
        // User data has 'id' as the string identifier. This should match the 'id' field in the DB.
        const result = await usersCollection.updateOne(
            { id: userData.id }, 
            { $set: { name: userData.name, email: userData.email, avatar: userData.avatar } },
            { upsert: false } 
        );
        return result.modifiedCount === 1;
    } catch (error) {
        console.error('Error saving user general data:', error);
        throw new Error('Failed to save user data.');
    }
}

export async function fetchStudentsForFacultyAction(
  facultyId: string, 
  filters?: { year?: number; section?: string; department?: string; }
): Promise<StudentProfile[]> {
  try {
    const studentProfilesCollection = await getStudentProfilesCollection();
    const query: any = {}; // Use 'any' for query flexibility
    if (filters?.department) query.department = filters.department;
    if (filters?.year) query.year = filters.year; // Ensure year is number
    if (filters?.section) query.section = filters.section;

    const studentsCursor = studentProfilesCollection.find(query);
    const studentsArray = await studentsCursor.toArray();
    // Map MongoDB _id to string id for each student profile
    return studentsArray.map(s => ({ ...s, id: s._id.toHexString() } as unknown as StudentProfile));
  } catch (error) {
    console.error('Error fetching students for faculty:', error);
    throw new Error('Failed to fetch students.');
  }
}

export async function fetchAllUsersAction(): Promise<User[]> {
  try {
    const usersCollection = await getUsersCollection();
    const usersArray = await usersCollection.find({}).toArray();
    // Ensure returned users match User type, mapping _id to id if necessary.
    // Assuming 'id' field is already the string representation in the DB.
    return usersArray.map(u => ({ ...u, id: u.id || u._id?.toHexString() }) as User);
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw new Error('Failed to fetch all users.');
  }
}

export async function createUserAction(
  userData: Pick<User, 'email' | 'name' | 'role'>,
  studentProfileDetails?: Partial<Omit<StudentProfile, 'userId' | 'id' | '_id' | 'fullName'>> & { fullName?: string }
): Promise<{ user: User; studentProfile?: StudentProfile } | null> {
  const usersCollection = await getUsersCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();

  const existingUser = await usersCollection.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    console.warn(`User with email ${userData.email} already exists.`);
    // throw new Error(`User with email ${userData.email} already exists.`);
    return null; // Indicate failure or that user already exists
  }

  const userObjectId = new ObjectId();
  // Document to be inserted into the 'users' collection
  const userDocumentToInsert = {
    _id: userObjectId,
    id: userObjectId.toHexString(), // String version of ObjectId, for querying by 'id'
    email: userData.email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    avatar: `https://picsum.photos/seed/${userObjectId.toHexString()}/100/100`,
  };

  await usersCollection.insertOne(userDocumentToInsert);
  
  // Construct the User object as expected by the User type (string id, no _id)
  const createdUser: User = {
    id: userDocumentToInsert.id,
    email: userDocumentToInsert.email,
    name: userDocumentToInsert.name,
    role: userDocumentToInsert.role,
    avatar: userDocumentToInsert.avatar,
  };

  let createdStudentProfile: StudentProfile | undefined = undefined;

  if (userData.role === 'Student') {
    const studentProfileObjectId = new ObjectId();
    // Document for 'student_profiles' collection
    const studentProfileDocumentToInsert = {
      _id: studentProfileObjectId,
      userId: createdUser.id, // Link to the User's string id
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
    await studentProfilesCollection.insertOne(studentProfileDocumentToInsert);

    // Construct StudentProfile object as expected by the type (string id, no _id)
    const { _id, ...restOfProfileDoc } = studentProfileDocumentToInsert;
    createdStudentProfile = {
      ...restOfProfileDoc,
      id: studentProfileObjectId.toHexString(), // The profile's own unique string ID
    } as StudentProfile;
  }

  return { user: createdUser, studentProfile: createdStudentProfile };
}