
import dotenv from "dotenv";
dotenv.config();

// Helper — throws immediately if a required variable is missing
function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const env = {
  // Server
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // JWT
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",

  // School geolocation — used in geo.middleware.ts
  SCHOOL_LAT: parseFloat(required("SCHOOL_LAT")),
  SCHOOL_LNG: parseFloat(required("SCHOOL_LNG")),
  SCHOOL_RADIUS_METERS: parseInt(
    process.env.SCHOOL_RADIUS_METERS || "200",
    10
  ),
};

export default env;