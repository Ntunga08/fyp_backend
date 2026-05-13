import { Router } from 'express'
import * as LeaveController from '../controllers/leave.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router: Router = Router()

// All routes require authentication
router.use(requireAuth)

// ─── Teacher routes ───────────────────────────────────────────────────────────

// Apply for leave
router.post(
  '/',
  requireRole('TEACHER'),
  LeaveController.apply
)

// View own leave history
router.get(
  '/my',
  requireRole('TEACHER'),
  LeaveController.getMyLeaves
)

// Cancel own PENDING leave request
router.delete(
  '/:id',
  requireRole('TEACHER'),
  LeaveController.cancel
)

// ─── Admin / Principal routes ─────────────────────────────────────────────────

// View pending leave requests only (must be before /:id)
router.get(
  '/pending',
  requireRole('ADMIN', 'PRINCIPAL'),
  LeaveController.getPending
)

// View single leave request
router.get(
  '/:id',
  requireRole('ADMIN', 'PRINCIPAL'),
  LeaveController.getById
)

// View all leave requests (filterable)
router.get(
  '/',
  requireRole('ADMIN', 'PRINCIPAL'),
  LeaveController.getAll
)

// Approve leave → auto marks absent + generates missed lessons
router.put(
  '/:id/approve',
  requireRole('ADMIN', 'PRINCIPAL'),
  LeaveController.approve
)

// Reject leave with optional note
router.put(
  '/:id/reject',
  requireRole('ADMIN', 'PRINCIPAL'),
  LeaveController.reject
)

export default router