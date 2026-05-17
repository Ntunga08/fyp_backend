

import app from "./app.js";
import prisma from "./src/config/prisma.js";
import env from "./src/config/env.js";

import dotenv from "dotenv";
dotenv.config();

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected — PostgreSQL is reachable");

    // Start HTTP server 
    app.listen(env.PORT, () => {
      console.log(`EduTrack server running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error(" Database connection failed:", error);
    console.error(
      " Make sure PostgreSQL is running and DATABASE_URL in .env is correct"
    );
    process.exit(1); // kill the process — no point running without a DB
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("\n Prisma disconnected. Server stopped.");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();