/**
 * Database Configuration and Connection
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

if (!MONGO_URI) {
  throw new Error('MONGO_URI environment variable is not defined');
}

if (!DB_NAME) {
  throw new Error('DB_NAME environment variable is not defined');
}

// Construct full connection URI with database name
// Handles standard MongoDB URIs, Atlas mongodb+srv URIs, and Azure Cosmos DB URIs with query parameters
const getConnectionUri = () => {
  if (!MONGO_URI) return '';
  
  // Separate path from query parameters (e.g. ?ssl=true&replicaSet=globaldb)
  const queryIndex = MONGO_URI.indexOf('?');
  const pathPart = queryIndex !== -1 ? MONGO_URI.substring(0, queryIndex) : MONGO_URI;
  const queryPart = queryIndex !== -1 ? MONGO_URI.substring(queryIndex) : '';

  const cleanPath = pathPart.endsWith('/') ? pathPart.slice(0, -1) : pathPart;
  const uriParts = cleanPath.split('/');

  // If path already has a db name (e.g. mongodb://host:port/dbname)
  if (uriParts.length > 3 && uriParts[3]) {
    return MONGO_URI;
  }

  // Otherwise, insert /${DB_NAME} before query parameters
  return `${cleanPath}/${DB_NAME}${queryPart}`;
};

const CONNECTION_URI = getConnectionUri();

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    const conn = await mongoose.connect(CONNECTION_URI, {
      dbName: DB_NAME,
      maxIdleTimeMS: 120000, // Keeps connection alive on Azure Cosmos DB / cloud firewalls
    });
    console.log(`✅ Database connected: ${conn.connection.host}`);
    console.log(`📊 Database name: ${conn.connection.name || DB_NAME}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB database
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
    throw error;
  }
}

export { connectDatabase, disconnectDatabase };
export default connectDatabase;

