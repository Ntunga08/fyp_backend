import { Router } from 'express'
import * as FaceVerificationController from '../controllers/verification.controller'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// ─── Teacher routes ───────────────────────────────────────────────────────────

// Teacher submits face image for a pending verification
router.post(
  '/submit',
  requireRole('TEACHER'),
  FaceVerificationController.submit
)

// Teacher views their own verification history
router.get(
  '/my',
  requireRole('TEACHER'),
  FaceVerificationController.getMyVerifications
)

// ─── Admin / Principal routes ─────────────────────────────────────────────────

// View all verifications (filterable)
router.get(
  '/',
  requireRole('ADMIN', 'PRINCIPAL'),
  FaceVerificationController.getAll
)

// Summary stats per teacher (pass rates)
router.get(
  '/summary',
  requireRole('ADMIN', 'PRINCIPAL'),
  FaceVerificationController.getSummary
)

// View single verification record
router.get(
  '/:id',
  requireRole('ADMIN', 'PRINCIPAL'),
  FaceVerificationController.getById
)

// ─── Admin only routes ────────────────────────────────────────────────────────

// Trigger a new face verification for a lesson
router.post(
  '/',
  requireRole('ADMIN'),
  FaceVerificationController.trigger
)

// Reset a FAILED verification so teacher can resubmit
router.put(
  '/:id/retrigger',
  requireRole('ADMIN'),
  FaceVerificationController.retrigger
)

export default router