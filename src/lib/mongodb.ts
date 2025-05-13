import { MongoClient, Db } from 'mongodb';

// It is STRONGLY recommended to move this connection string to an environment variable (e.g., .env.local)
// and access it via process.env.MONGODB_URI.
// Hardcoding sensitive information like this is a security risk.
const MONGODB_URI = "mongodb+srv://priyanshudwivedi435:Priy1979@str.m1hahwj.mongodb.net/?retryWrites=true&w=majority";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'academic_connect'; // Default DB name if not set

if (!MONGODB_URI) {
  // This check remains in case the hardcoded string is removed later in favor of environment variables.
  throw new Error('Please define the MONGODB_URI environment variable or provide it directly in the code (not recommended for production).');
}

let client: MongoClient | null = null;
let db: Db | null = null;

interface ConnectToDatabaseResult {
  client: MongoClient;
  db: Db;
}

export async function connectToDatabase(): Promise<ConnectToDatabaseResult> {
  if (client && db) {
    return { client, db };
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
      // @ts-ignore
      if (!global._mongoClientPromise) {
        client = new MongoClient(MONGODB_URI!);
         // @ts-ignore
        global._mongoClientPromise = client.connect();
      }
       // @ts-ignore
      client = await global._mongoClientPromise;
    } else {
      // In production mode, it's best to not use a global variable.
      client = new MongoClient(MONGODB_URI!);
      await client.connect();
    }
    
    db = client.db(MONGODB_DB_NAME);
    console.log('Successfully connected to MongoDB.');
    return { client, db };
  } catch (e) {
    console.error('Failed to connect to MongoDB', e);
    throw e;
  }
}
