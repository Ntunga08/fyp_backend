import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// console.log("PRISMA DATABASE_URL:", process.env.DATABASE_URL);
// console.log("TYPE:", typeof process.env.DATABASE_URL);

//const parsed = new URL(process.env.DATABASE_URL!);

// console.log("HOST:", parsed.hostname);
// console.log("PORT:", parsed.port);
// console.log("USER:", parsed.username);
// console.log("PASSWORD:", parsed.password);
// console.log("DB:", parsed.pathname);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// SSL is required for remote databases (Render, Supabase, etc.)
// Local Docker connections (localhost) don't need it
const isRemote = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')

const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma ?? new PrismaClient({
  adapter,
});

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;