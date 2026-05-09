
import app from "./app";
import prisma from "./src/config/prisma";
import env from "./src/config/env";

async function main() {
  try {
    // ── Test database connection ─────────────────────────────────────────────
    // $queryRaw sends a simple "SELECT 1" to PostgreSQL.
    // If it fails, Prisma throws and we catch it below.
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected — PostgreSQL is reachable");

    // ── Start HTTP server ────────────────────────────────────────────────────
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

// ── Graceful Shutdown
// When you stop the server (Ctrl+C), disconnect Prisma cleanly
// so no connections are left hanging in PostgreSQL
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