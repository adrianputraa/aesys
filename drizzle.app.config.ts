import { defineConfig } from "drizzle-kit"

// Load env without extra deps (Node 20.12+/22). Next loads these at runtime;
// drizzle-kit runs outside Next, so load them here for `push`/`migrate`/`studio`.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file)
  } catch {
    // file may not exist — ignore
  }
}

// App database — PostgreSQL (primary application data + auth).
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/app/schema.ts",
  out: "./drizzle/app",
  dbCredentials: {
    url: process.env.APP_DATABASE_URL ?? "",
  },
  casing: "snake_case",
  strict: true,
  verbose: true,
})
