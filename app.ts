
import express from "express";
import type { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";

// Routes (uncomment as you build each one)
import authRoutes from "./src/routes/auth.route.js";
import attendanceRoutes from "./src/routes/attendance.route.js";
import schoolRoutes from "./src/routes/school.route.js";
import holidayRoutes from "./src/routes/holiday.route.js";
import leaveRoutes from "./src/routes/leave.route.js";
import notificationRoutes from "./src/routes/notification.route.js";
import timetableRoutes from "./src/routes/timetable.route.js";
import lessonRoutes from "./src/routes/lesson.route.js";
import substituteRoutes from "./src/routes/substitute.route.js";
import reportRoutes from "./src/routes/report.route.js";
import settingsRoutes from "./src/routes/settings.route.js";
import locationVerificationRoutes from "./src/routes/location-verification.route.js";
import systemRoutes from "./src/routes/system.route.js";
import * as SchoolController from "./src/controllers/school.controller.js";
import publicRoutes from "./src/routes/public.route.js";
import prisma from "./src/config/prisma.js";

// import attendanceRoutes from "./routes/attendance.routes";
// import timetableRoutes  from "./routes/timetable.routes";
// import lessonRoutes     from "./routes/lesson.routes";
// import substituteRoutes from "./routes/substitute.routes";
// import reportRoutes     from "./routes/report.routes";

const app: Application = express();

//Global Middleware
const ALLOWED_ORIGINS = [
  'https://ntunga08.github.io',   // production frontend
  'http://localhost:5173',         // local dev (Vite)
  'http://localhost:3001',         // local dev (alt port)
]

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    const err = new Error(`CORS: origin "${origin}" is not allowed`) as any
    err.status = 403
    callback(err)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // logs every request in terminal

//Health Check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "EduTrack API is running ",
    version: "1.0.0",
  });
});

// API Routes 

// Public endpoint - Get schools list (no auth required)
app.get("/api/public/schools", async (_req: Request, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: schools.length,
      data: schools,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public routes (no auth)
console.log(" Public routes imported:", typeof publicRoutes);
app.use("/api/public", publicRoutes);
console.log(" Public routes registered");

app.use("/api/auth",        authRoutes);
app.use("/api/attendance",  attendanceRoutes);

// Register public school endpoint BEFORE the protected school routes
app.get("/api/schools/public/list", SchoolController.getPublicSchools);

app.use("/api/schools",     schoolRoutes);
app.use("/api/holidays",    holidayRoutes);
app.use("/api/leaves",      leaveRoutes);  // Changed from /api/leave to /api/leaves
app.use("/api/notifications", notificationRoutes);
app.use("/api/timetables",  timetableRoutes);  // Changed from /api/timetable to /api/timetables
app.use("/api/lessons",     lessonRoutes);
app.use("/api/substitutes", substituteRoutes);
app.use("/api/reports",     reportRoutes);
app.use("/api/settings",    settingsRoutes);
app.use("/api/location-verifications", locationVerificationRoutes);
app.use("/api/system",                systemRoutes);

//404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500
  if (status !== 500) {
    res.status(status).json({ success: false, message: err.message })
    return
  }
  console.error("❌ Error:", err.message)
  res.status(500).json({ success: false, message: "Internal Server Error" })
})

export default app;