import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'academic_connect'; // Default DB name if not set

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
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
