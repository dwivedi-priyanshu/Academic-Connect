'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { USERS_COLLECTION, STUDENT_PROFILES_COLLECTION } from '@/lib/constants';
import type { User, UserRole, StudentProfile } from '@/types';
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


/**
 * Attempts to log in a user by finding a match for email and role.
 * Checks user status; only 'Active' users can log in.
 * NOTE: Password check is currently a plain text comparison.
 * In a real production app, this MUST be replaced with secure password hashing and verification.
 */
export async function loginUserAction(email: string, passwordPlainText: string, role: UserRole): Promise<User | { error: string } | null> {
  try {
    console.log(`Attempting login for email: ${email}, role: ${role}`);

    // Hardcoded admin login bypass
    if (email.toLowerCase() === 'admin@gmail.com' && passwordPlainText === 'password' && role === 'Admin') {
      console.log('Hardcoded admin login successful.');
      const adminId = 'hardcoded-admin-id';
      return {
        id: adminId,
        _id: adminId, // Ensure _id is also string
        email: 'admin@gmail.com',
        name: 'Admin User (Hardcoded)',
        role: 'Admin',
        avatar: `https://picsum.photos/seed/hardcoded-admin/100/100`,
        status: 'Active',
      } as User;
    }
    
    const usersCollection = await getUsersCollection();
    
    const userDocument = await usersCollection.findOne({ email: email.toLowerCase(), role: role });

    if (userDocument) {
      // IMPORTANT: Basic password check. Replace with hashed password verification in production.
      if (userDocument.password !== passwordPlainText) {
        console.log('Password mismatch for user:', email);
        return { error: 'Invalid credentials.' };
      }

      if (userDocument.status !== 'Active') {
        console.log(`User ${email} status is ${userDocument.status}. Login denied.`);
        if (userDocument.status === 'PendingApproval') {
            return { error: 'Your account is pending admin approval.' };
        }
        return { error: 'Your account is not active. Please contact support.' };
      }

      console.log('User found and active:', userDocument._id, userDocument.role);
      const idStr = userDocument._id.toHexString();
      const { _id, password, ...restOfUser } = userDocument; // Exclude original _id and password

      return {
        ...restOfUser,
        id: idStr,
        _id: idStr, // Ensure _id passed to client is string
      } as User;
    }
    console.log('User not found or role mismatch for:', email, role);
    return null;
  } catch (error) {
    console.error('Error during login user action:', error);
    return { error: 'Login failed due to a server error.' };
  }
}

/**
 * Fetches user details for an active session using userId.
 */
export async function fetchUserForSessionAction(userId: string): Promise<User | null> {
  try {
    // Handle hardcoded admin session
    if (userId === 'hardcoded-admin-id') {
      return {
        id: 'hardcoded-admin-id',
        _id: 'hardcoded-admin-id',
        email: 'admin@gmail.com',
        name: 'Admin User (Hardcoded)',
        role: 'Admin',
        avatar: `https://picsum.photos/seed/hardcoded-admin/100/100`,
        status: 'Active',
      } as User;
    }

    const usersCollection = await getUsersCollection();
    let userDocument: User | null = null;
    if (ObjectId.isValid(userId)) {
        userDocument = await usersCollection.findOne({ _id: new ObjectId(userId) });
    } else {
        // This case might be problematic if id field is not indexed or consistently used.
        // For session restoration, relying on _id (ObjectId string) is safer.
        console.warn(`User ID ${userId} is not a valid ObjectId. Attempting to find by string id field.`);
        userDocument = await usersCollection.findOne({ id: userId } as any);
    }


    if (userDocument) {
      if (userDocument.status !== 'Active') {
        console.log(`Session user ${userId} is not active (status: ${userDocument.status}). Invalidating session.`);
        return null; 
      }
       const idStr = userDocument._id.toHexString();
       const { _id, password, ...restOfUser } = userDocument; // Exclude original _id and password
      return { 
        ...restOfUser,
        id: idStr,
        _id: idStr, // Ensure _id passed to client is string
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user for session:', error);
    throw new Error('Failed to fetch session user data.');
  }
}

/**
 * Registers a new user.
 * New users (Student/Faculty) are set to 'PendingApproval' status.
 * Admin users are set to 'Active' status immediately (if created via this action, usually admins are seeded).
 * NOTE: Stores password in plain text. This MUST be changed to use hashing in production.
 */
export async function registerUserAction(
  userData: Pick<User, 'email' | 'name' | 'role'> & { passwordPlainText: string }
): Promise<{ user?: User; studentProfile?: StudentProfile; error?: string } | null> {
  const usersCollection = await getUsersCollection();
  const studentProfilesCollection = await getStudentProfilesCollection();

  const existingUser = await usersCollection.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    return { error: `User with email ${userData.email} already exists.` };
  }

  const userObjectId = new ObjectId();
  const userStatus = (userData.role === 'Admin') ? 'Active' : 'PendingApproval';
  const userIdStr = userObjectId.toHexString();

  const userDocumentToInsert = {
    _id: userObjectId,
    id: userIdStr, 
    email: userData.email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    password: userData.passwordPlainText, 
    avatar: `https://picsum.photos/seed/${userIdStr}/100/100`,
    status: userStatus,
  };

  await usersCollection.insertOne(userDocumentToInsert as any); 
  
  // Construct user without the password field for returning
  const createdUser: User = {
    id: userIdStr,
    _id: userIdStr, // Ensure _id is string
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
      admissionId: `TEMP-${Date.now().toString().slice(-6)}`, 
      fullName: createdUser.name,
      dateOfBirth: '', 
      contactNumber: '', 
      address: '', 
      department: 'Not Assigned',
      year: 1,
      section: 'N/A',
      parentName: '', 
      parentContact: '', 
    };
    await studentProfilesCollection.insertOne(studentProfileDocumentToInsert as any);

    const { _id, ...restOfStudentProfile } = studentProfileDocumentToInsert;
    createdStudentProfile = {
      ...restOfStudentProfile,
      id: studentProfileIdStr, // Already string
      _id: studentProfileIdStr, // Ensure _id is string
    } as StudentProfile;
  }

  return { user: createdUser, studentProfile: createdStudentProfile };
}
