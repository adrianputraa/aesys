import { defineConfig } from "drizzle-kit"

// drizzle-kit config for the *config* database (SQLite).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file)
  } catch {
    // file may not exist — ignore
  }
}

// App config database — SQLite (operational/local config).
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/config/schema.ts",
  out: "./drizzle/config",
  dbCredentials: {
    url: process.env.CONFIG_DATABASE_URL ?? "./.data/config.db",
  },
  casing: "snake_case",
  strict: true,
  verbose: true,
})
