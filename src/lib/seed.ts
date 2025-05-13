
'use server'; // Required for actions, though this is a script, actions are imported.

import type { MongoClient } from 'mongodb';
import { createUserAction } from '@/actions/profile-actions';
import { connectToDatabase } from './mongodb';
import { USERS_COLLECTION } from './constants'; // Import USERS_COLLECTION

async function seedDatabase() {
  let mongoClientInstance: MongoClient | null = null;
  try {
    const { client: connectedClient, db } = await connectToDatabase(); // Get db instance
    mongoClientInstance = connectedClient;
    console.log('Connected to database for seeding.');

    const usersCollection = db.collection(USERS_COLLECTION);

    // --- Seed Student User ---
    const studentEmail = 'teststudent@gmail.com';
    const studentName = 'Test Student';
    const studentRole = 'Student';

    console.log(`Attempting to create student: ${studentName} (${studentEmail}) with role ${studentRole}`);
    const existingStudent = await usersCollection.findOne({ email: studentEmail.toLowerCase() });

    if (existingStudent) {
      console.log(`Student with email ${studentEmail} already exists. Skipping creation.`);
    } else {
      const studentResult = await createUserAction(
        { email: studentEmail, name: studentName, role: studentRole },
        {
          admissionId: `TEST${Date.now().toString().slice(-7)}`, 
          fullName: studentName, 
          department: 'Computer Science', 
          year: 3, 
          section: 'A', 
        }
      );

      if (studentResult && studentResult.user) {
        console.log(`Student ${studentResult.user.name} created successfully with ID: ${studentResult.user.id}`);
        if (studentResult.studentProfile) {
          console.log(`Student profile created successfully with ID: ${studentResult.studentProfile.id}`);
        }
      } else {
        console.log(`Student with email ${studentEmail} might already exist or creation failed.`);
      }
    }

    // --- Seed Admin User ---
    const adminEmail = 'admin@example.com';
    const adminName = 'Admin User';
    const adminRole = 'Admin';

    console.log(`Attempting to create admin: ${adminName} (${adminEmail}) with role ${adminRole}`);
    const existingAdmin = await usersCollection.findOne({ email: adminEmail.toLowerCase() });

    if (existingAdmin) {
      console.log(`Admin with email ${adminEmail} already exists. Skipping creation.`);
    } else {
      const adminResult = await createUserAction({
        email: adminEmail,
        name: adminName,
        role: adminRole,
      }); // No studentProfileDetails for Admin

      if (adminResult && adminResult.user) {
        console.log(`Admin ${adminResult.user.name} created successfully with ID: ${adminResult.user.id}`);
      } else {
        console.log(`Admin with email ${adminEmail} might already exist or creation failed.`);
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
