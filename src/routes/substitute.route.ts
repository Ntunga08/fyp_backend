import { Router } from 'express'
import * as SubstituteController from '../controllers/substitute.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router: Router = Router()

router.use(requireAuth)

// ─── Named routes (before /:id) ───────────────────────────────────────────────

// Teacher: lessons they are covering for another teacher
router.get('/my-assignments', requireRole('TEACHER'), SubstituteController.getMyAssignments)

// Teacher: who covered their own lessons while they were absent
router.get('/my-lessons', requireRole('TEACHER'), SubstituteController.getMyLessonSubstitutes)

// ─── Admin / Principal ────────────────────────────────────────────────────────

// All substitute records in school — ?originalTeacherId=&substituteTeacherId=&date=&startDate=&endDate=
router.get('/', requireRole('ADMIN', 'PRINCIPAL'), SubstituteController.getAll)

// Assign a substitute to a MISSED lesson
router.post('/', requireRole('ADMIN'), SubstituteController.assign)

// ─── Parameterised routes ─────────────────────────────────────────────────────

// Single record
router.get('/:id', requireRole('ADMIN', 'PRINCIPAL'), SubstituteController.getById)

// Substitute teacher records notes for their covered lesson
router.put('/:id/record', requireRole('TEACHER'), SubstituteController.recordSubstituteLesson)

// Unassign substitute — reverts lesson to MISSED
router.delete('/:id', requireRole('ADMIN', 'PRINCIPAL'), SubstituteController.unassign)

export default router
