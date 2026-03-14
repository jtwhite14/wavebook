import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use a placeholder during build time to avoid connection errors
const connectionString = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

// For queries - only connect if we have a real connection string
const queryClient = postgres(connectionString, {
  // Only try to connect if we have a real DATABASE_URL
  max: process.env.DATABASE_URL ? 10 : 0,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

// Export schema for convenience
export * from "./schema";
