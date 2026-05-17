import { Router } from 'express'
import * as TimetableController from '../controllers/timetable.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router: Router = Router()

router.use(requireAuth)

// ─── Named routes (must come before /:id) ────────────────────────────────────

// Teacher: own weekly schedule — ?grouped=true for day-grouped + summary view
router.get('/my-schedule', requireRole('TEACHER'), TimetableController.getMySchedule)

// Teacher: own slots for a specific day
router.get('/day/:day', requireRole('TEACHER'), TimetableController.getByDay)

// All roles: read-only school-wide timetable — ?day=MONDAY&className=Form+3A
router.get('/school', requireRole('TEACHER', 'ADMIN', 'PRINCIPAL'), TimetableController.getSchoolTimetable)

// ─── Admin / Principal management routes ─────────────────────────────────────

// All slots in school — ?day=&className=&teacherId=
router.get('/', requireRole('ADMIN', 'PRINCIPAL'), TimetableController.getAll)

// Create a new slot
router.post('/', requireRole('ADMIN', 'PRINCIPAL'), TimetableController.create)

// ─── Parameterised routes (after named routes) ────────────────────────────────

router.get('/:id',    requireRole('ADMIN', 'PRINCIPAL'), TimetableController.getById)
router.put('/:id',    requireRole('ADMIN', 'PRINCIPAL'), TimetableController.update)
router.delete('/:id', requireRole('ADMIN'),              TimetableController.remove)

export default router
