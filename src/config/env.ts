import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/melo-tv',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
};
