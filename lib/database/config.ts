import 'dotenv/config';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const database = new Database(process.env.DB_FILE_NAME!);
export const db = drizzle(database, { schema });
