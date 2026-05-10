import { Router } from 'express'
import * as SubstituteController from '../controllers/substitute.controller'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router: Router = Router()

// All routes require authentication
router.use(requireAuth)

// Teacher routes
// Substitute teacher: view lessons they are assigned to cover
router.get(
  '/my-assignments',
  requireRole('TEACHER'),
  SubstituteController.getMyAssignments
)

// Original teacher: view who covered their lessons
router.get(
  '/my-lessons',
  requireRole('TEACHER'),
  SubstituteController.getMyLessonSubstitutes
)

// Substitute teacher records notes for the covered lesson
router.put(
  '/:id/record',
  requireRole('TEACHER'),
  SubstituteController.recordSubstituteLesson
)

//  Admin / Principal routes 
// View all substitute records (filterable)
router.get(
  '/',
  requireRole('ADMIN', 'PRINCIPAL'),
  SubstituteController.getAll
)

// View single substitute record
router.get(
  '/:id',
  requireRole('ADMIN', 'PRINCIPAL'),
  SubstituteController.getById
)

//  Admin only routes 
// Assign substitute teacher to a MISSED lesson
router.post(
  '/',
  requireRole('ADMIN'),
  SubstituteController.assign
)

// Unassign substitute — reverts lesson to MISSED
router.delete(
  '/:id',
  requireRole('ADMIN'),
  SubstituteController.unassign
)

export default router