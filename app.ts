
import express from "express";
import type { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";

// Routes (uncomment as you build each one)
import authRoutes from "./src/routes/auth.route";
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
app.use("/api/auth",        authRoutes);
// app.use("/api/attendance",  attendanceRoutes);
// app.use("/api/timetable",   timetableRoutes);
// app.use("/api/lessons",     lessonRoutes);
// app.use("/api/substitutes", substituteRoutes);
// app.use("/api/reports",     reportRoutes);

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