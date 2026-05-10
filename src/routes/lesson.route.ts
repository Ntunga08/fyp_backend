import { Router } from 'express'
import * as LessonController from '../controllers/lesson.controller'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router: Router = Router()

// All routes require authentication
router.use(requireAuth)

// ─── Teacher routes ───────────────────────────────────────────────────────────

// Record a conducted lesson
router.post('/', requireRole('TEACHER'), LessonController.recordLesson)

// View own lessons for today
router.get('/today', requireRole('TEACHER'), LessonController.getMyToday)

// View own lesson history (filterable)
router.get('/my', requireRole('TEACHER'), LessonController.getMyLessons)

// Update own lesson notes
router.put('/:id', requireRole('TEACHER', 'ADMIN'), LessonController.update)

// ─── Admin / Principal routes ─────────────────────────────────────────────────

// View all lessons (filterable)
router.get('/', requireRole('ADMIN', 'PRINCIPAL'), LessonController.getAll)

// Get single lesson
router.get('/inconsistencies', requireRole('ADMIN', 'PRINCIPAL'), LessonController.getInconsistencies)

// Manually generate MISSED lessons for a past date
router.post('/generate-missed', requireRole('ADMIN'), LessonController.generateMissed)

// Get single lesson by id
router.get('/:id', requireRole('ADMIN', 'PRINCIPAL'), LessonController.getById)

export default router   