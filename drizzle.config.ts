import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/database/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    // Path to your SQLite file
    url: process.env.DB_FILE_NAME ?? './app.db',
  },
});
