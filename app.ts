
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
app.use(cors());
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
app.use("/api/leave",       leaveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/timetable",   timetableRoutes);
app.use("/api/lessons",     lessonRoutes);
app.use("/api/substitutes", substituteRoutes);
app.use("/api/reports",     reportRoutes);

//404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;