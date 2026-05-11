
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

console.log(" authRoutes imported:", typeof authRoutes);
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
console.log(" Registering routes...");
app.use("/api/auth",        authRoutes);
console.log(" Auth routes registered");
app.use("/api/attendance",  attendanceRoutes);
console.log(" Attendance routes registered");
app.use("/api/schools",     schoolRoutes);
console.log(" School routes registered");
app.use("/api/holidays",    holidayRoutes);
console.log(" Holiday routes registered");
app.use("/api/leave",       leaveRoutes);
console.log(" Leave routes registered");
app.use("/api/notifications", notificationRoutes);
console.log(" Notification routes registered");
app.use("/api/timetable",   timetableRoutes);
console.log(" Timetable routes registered");
app.use("/api/lessons",     lessonRoutes);
app.use("/api/substitutes", substituteRoutes);
console.log(" Substitute routes registered");
app.use("/api/reports",     reportRoutes);
console.log(" Report routes registered");

// ── 404 Handler ───────────────────────────────────────────────────────────────
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