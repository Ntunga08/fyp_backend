import { Router } from 'express'
import * as SchoolController from '../controllers/school.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router: Router = Router()

// All routes require authentication
router.use(requireAuth)

// ─── All roles ────────────────────────────────────────────────────────────────

// Any logged-in user views their own school
router.get('/my', SchoolController.getMySchool)

// ─── Admin / Principal ────────────────────────────────────────────────────────

// View all schools
router.get(
  '/',
  requireRole('ADMIN', 'PRINCIPAL'),
  SchoolController.getAll
)

// View single school
router.get(
  '/:id',
  requireRole('ADMIN', 'PRINCIPAL'),
  SchoolController.getById
)

// View school stats (dashboard data)
router.get(
  '/:id/stats',
  requireRole('ADMIN', 'PRINCIPAL'),
  SchoolController.getStats
)

// ─── Admin only ───────────────────────────────────────────────────────────────

// Create a new school
router.post(
  '/',
  requireRole('ADMIN'),
  SchoolController.create
)

// Update school details / settings
router.put(
  '/:id',
  requireRole('ADMIN'),
  SchoolController.update
)

// Deactivate school
router.put(
  '/:id/deactivate',
  requireRole('ADMIN'),
  SchoolController.deactivate
)

// Reactivate school
router.put(
  '/:id/reactivate',
  requireRole('ADMIN'),
  SchoolController.reactivate
)

export default router