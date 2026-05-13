import { Router } from 'express'
import * as AttendanceController from '../controllers/attendance.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router: Router = Router()

// All routes require authentication
router.use(requireAuth)

//Teacher routes

// Teacher checks in with GPS coordinates
router.post('/checkin', requireRole('TEACHER'), AttendanceController.checkIn)

// Teacher checks own status for today
router.get('/today', requireRole('TEACHER'), AttendanceController.getMyToday)

// Teacher views own attendance history
router.get('/my', requireRole('TEACHER'), AttendanceController.getMyHistory)

//Admin / Principal routes 
// View all attendance records (filterable)
router.get('/', requireRole('ADMIN', 'PRINCIPAL'), AttendanceController.getAll)

// Get today's attendance for a school
router.get('/school/:schoolId/today', requireRole('ADMIN', 'PRINCIPAL'), AttendanceController.getSchoolToday)

// Get weekly attendance for a school
router.get('/school/:schoolId/weekly', requireRole('ADMIN', 'PRINCIPAL'), AttendanceController.getSchoolWeekly)

// Summary stats per teacher
router.get('/summary', requireRole('ADMIN', 'PRINCIPAL'), AttendanceController.getSummary)

// Manually mark a teacher absent
router.post('/absent', requireRole('ADMIN'), AttendanceController.markAbsent)

export default router