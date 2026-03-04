/**
 * AWS S3 Configuration
 */

import { config } from 'dotenv';

config();

export const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucketName: process.env.S3_BUCKET_NAME,
  accessPointAlias: process.env.S3_ACCESS_POINT_ALIAS,
  networkOrigin: process.env.S3_NETWORK_ORIGIN,
  bucketOwnerAccountId: process.env.S3_BUCKET_OWNER_ACCOUNT_ID,
};

// Validate required AWS configuration
if (!AWS_CONFIG.accessKeyId || !AWS_CONFIG.secretAccessKey || !AWS_CONFIG.bucketName) {
  console.warn('⚠️  AWS credentials not fully configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME in .env');
}

export default AWS_CONFIG;

