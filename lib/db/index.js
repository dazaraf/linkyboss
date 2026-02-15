import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

// Use a placeholder URL during build when DATABASE_URL is not set.
// The neon driver will only be invoked at request time, so actual queries
// require a valid DATABASE_URL at runtime.
const connectionString = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
