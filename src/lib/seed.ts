

'use server'; 

import type { MongoClient } from 'mongodb';
import { createUserAction } from '@/actions/profile-actions';
import { connectToDatabase } from './mongodb';
import { USERS_COLLECTION, STUDENT_PROFILES_COLLECTION } from './constants'; 
import type { StudentProfile } from '@/types';

async function seedDatabase() {
  let mongoClientInstance: MongoClient | null = null;
  try {
    const { client: connectedClient, db } = await connectToDatabase(); 
    mongoClientInstance = connectedClient;
    console.log('Connected to database for seeding.');

    const usersCollection = db.collection(USERS_COLLECTION);
    const studentProfilesCollection = db.collection<StudentProfile>(STUDENT_PROFILES_COLLECTION);


    // --- Seed Student User ---
    const studentEmail = 'teststudent@gmail.com';
    const studentName = 'Test Student';
    const studentRole = 'Student';
    const studentPassword = 'password'; // Plain text password for seeding

    console.log(`Attempting to create student: ${studentName} (${studentEmail}) with role ${studentRole}`);
    let existingStudent = await usersCollection.findOne({ email: studentEmail.toLowerCase() });

    if (existingStudent) {
      console.log(`Student with email ${studentEmail} already exists. Verifying/updating status to Active.`);
      await usersCollection.updateOne(
        { _id: existingStudent._id },
        { $set: { status: 'Active', password: studentPassword, name: studentName, role: studentRole } } 
      );
      console.log(`Student ${studentName} user data updated/verified.`);

      // Ensure student profile exists and update it
      const studentProfileUpdateData: Partial<StudentProfile> = {
          admissionId: `TEST${Date.now().toString().slice(-7)}`, 
          fullName: studentName, 
          department: 'Computer Science', 
          year: 3, 
          section: 'A',
          dateOfBirth: '2002-05-15',
          contactNumber: '9876543210',
          address: '123 Test Street, Test City',
          parentName: 'Test Parent',
          parentContact: '9012345678',
          fatherName: 'Test Father',
          motherName: 'Test Mother',
          gender: 'Male',
          bloodGroup: 'O+',
          aadharNumber: '123456789012',
          category: 'GM',
          religion: 'Hindu',
          nationality: 'Indian',
          sslcMarks: '90%',
          pucMarks: '85%',
      };
      const profileUpdateResult = await studentProfilesCollection.updateOne(
        { userId: existingStudent.id },
        { $set: studentProfileUpdateData },
        { upsert: true }
      );
      if (profileUpdateResult.upsertedCount > 0) {
        console.log(`Student profile created for ${studentName}.`);
      } else if (profileUpdateResult.modifiedCount > 0) {
        console.log(`Student profile updated for ${studentName}.`);
      } else {
        console.log(`Student profile for ${studentName} found and no changes made, or update failed silently.`);
      }


    } else {
      const studentResult = await createUserAction(
        { email: studentEmail, name: studentName, role: studentRole, passwordPlainText: studentPassword },
        {
          admissionId: `TEST${Date.now().toString().slice(-7)}`, 
          fullName: studentName, 
          department: 'Computer Science', 
          year: 3, 
          section: 'A',
          dateOfBirth: '2002-05-15',
          contactNumber: '9876543210',
          address: '123 Test Street, Test City',
          parentName: 'Test Parent',
          parentContact: '9012345678',
          fatherName: 'Test Father',
          motherName: 'Test Mother',
          gender: 'Male',
          bloodGroup: 'O+',
          aadharNumber: '123456789012',
          category: 'GM',
          religion: 'Hindu',
          nationality: 'Indian',
          sslcMarks: '90%',
          pucMarks: '85%',
        }
      );

      if (studentResult && studentResult.user) {
        console.log(`Student ${studentResult.user.name} created successfully with ID: ${studentResult.user.id} and status ${studentResult.user.status}`);
        if (studentResult.studentProfile) {
          console.log(`Student profile created successfully with ID: ${studentResult.studentProfile.id}`);
        }
         // Ensure status is Active after creation for seeded user
        await usersCollection.updateOne(
            { _id: new ObjectId(studentResult.user.id) },
            { $set: { status: 'Active' } }
        );
        console.log(`Student ${studentResult.user.name} status explicitly set to Active.`);

      } else {
        console.log(`Student with email ${studentEmail} might already exist or creation failed.`);
      }
    }

    // --- Seed Admin User ---
    const adminEmail = 'admin@example.com';
    const adminName = 'Admin User Example';
    const adminRole = 'Admin';
    const adminPassword = 'password'; // Plain text password for seeding

    console.log(`Attempting to create admin: ${adminName} (${adminEmail}) with role ${adminRole}`);
    const existingAdmin = await usersCollection.findOne({ email: adminEmail.toLowerCase() });

    if (existingAdmin) {
      console.log(`Admin with email ${adminEmail} already exists. Verifying/updating status to Active.`);
      await usersCollection.updateOne(
        { _id: existingAdmin._id },
        { $set: { status: 'Active', password: adminPassword, name: adminName, role: adminRole } } 
      );
      console.log(`Admin ${adminName} data updated/verified.`);
    } else {
      const adminResult = await createUserAction({
        email: adminEmail,
        name: adminName,
        role: adminRole,
        passwordPlainText: adminPassword,
      }); 

      if (adminResult && adminResult.user) {
        console.log(`Admin ${adminResult.user.name} created successfully with ID: ${adminResult.user.id} and status ${adminResult.user.status}`);
         // Ensure status is Active after creation for seeded user
        await usersCollection.updateOne(
            { _id: new ObjectId(adminResult.user.id) },
            { $set: { status: 'Active' } }
        );
        console.log(`Admin ${adminResult.user.name} status explicitly set to Active.`);

      } else {
        console.log(`Admin with email ${adminEmail} might already exist or creation failed.`);
      }
    }
    
    // --- Seed Faculty User ---
    const facultyEmail = 'testfaculty@example.com';
    const facultyName = 'Test Faculty';
    const facultyRole = 'Faculty';
    const facultyPassword = 'password';

    console.log(`Attempting to create faculty: ${facultyName} (${facultyEmail}) with role ${facultyRole}`);
    const existingFaculty = await usersCollection.findOne({ email: facultyEmail.toLowerCase() });
    if (existingFaculty) {
        console.log(`Faculty with email ${facultyEmail} already exists. Verifying/updating status to Active.`);
        await usersCollection.updateOne(
            { _id: existingFaculty._id },
            { $set: { status: 'Active', password: facultyPassword, name: facultyName, role: facultyRole } }
        );
        console.log(`Faculty ${facultyName} data updated/verified.`);
    } else {
        const facultyResult = await createUserAction({
            email: facultyEmail,
            name: facultyName,
            role: facultyRole,
            passwordPlainText: facultyPassword,
        });
        if (facultyResult && facultyResult.user) {
            console.log(`Faculty ${facultyResult.user.name} created successfully with ID: ${facultyResult.user.id} and status ${facultyResult.user.status}`);
            await usersCollection.updateOne( // Ensure active
                { _id: new ObjectId(facultyResult.user.id) },
                { $set: { status: 'Active' } }
            );
            console.log(`Faculty ${facultyResult.user.name} status explicitly set to Active.`);
        } else {
            console.log(`Faculty with email ${facultyEmail} might already exist or creation failed.`);
        }
    }


  } catch (error) {
    console.error('Error during database seeding:', error);
    if (mongoClientInstance) {
      await mongoClientInstance.close();
      console.log('MongoDB connection closed due to error.');
    }
    process.exit(1); 
  } finally {
    if (mongoClientInstance) {
      await mongoClientInstance.close();
      console.log('MongoDB connection closed.');
    }
    console.log('Seeding process finished.');
  }
}

if (require.main === module) {
  seedDatabase().then(() => {
    console.log('Seed script completed successfully.');
    process.exit(0); 
  }).catch(err => {
    console.error("Unhandled error during seed script execution:", err);
    process.exit(1);
  });
}

export default seedDatabase;

