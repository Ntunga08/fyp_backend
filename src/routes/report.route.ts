import { Router } from 'express'
import * as ReportController from '../controllers/report.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Teacher routes

// Teacher views their own performance report
// GET /api/reports/my?startDate=2025-05-01&endDate=2025-05-31
router.get('/my', requireRole('TEACHER'), ReportController.myReport)

// Admin / Principal routes

// Daily report — all teachers for a specific date
// GET /api/reports/daily?date=2025-05-10
router.get(
  '/daily',
  requireRole('ADMIN', 'PRINCIPAL'),
  ReportController.daily
)

// Weekly report — date range summary
// GET /api/reports/weekly?startDate=2025-05-05&endDate=2025-05-09
router.get(
  '/weekly',
  requireRole('ADMIN', 'PRINCIPAL'),
  ReportController.weekly
)

// Monthly report — full month summary
// GET /api/reports/monthly?startDate=2025-05-01&endDate=2025-05-31
router.get(
  '/monthly',
  requireRole('ADMIN', 'PRINCIPAL'),
  ReportController.monthly
)

// Individual teacher performance report
// GET /api/reports/teacher?teacherId=1&startDate=2025-05-01&endDate=2025-05-31
router.get(
  '/teacher',
  requireRole('ADMIN', 'PRINCIPAL'),
  ReportController.teacherPerformance
)

// Inconsistency flags for a specific date
// GET /api/reports/inconsistencies?date=2025-05-10
router.get(
  '/inconsistencies',
  requireRole('ADMIN', 'PRINCIPAL'),
  ReportController.inconsistencies
)

export default router