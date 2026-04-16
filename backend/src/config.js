import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3001),
  allowedOrigin: process.env.ALLOWED_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  apiSecret: process.env.API_SECRET || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'deepeconometrics',
    user: process.env.DB_USER || 'deepeconometrics',
    password: process.env.DB_PASSWORD || '',
  },
  generatedFilesDir: path.resolve(__dirname, '../generated-files'),
};