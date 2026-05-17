import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import * as SystemController from '../controllers/system.controller.js'

const router = Router()

// All system routes require auth + SUPER_ADMIN role
router.use(requireAuth)
router.use(requireRole('SUPER_ADMIN'))

// ─── Platform stats ───────────────────────────────────────────────────────────
router.get('/stats', SystemController.getPlatformStats)

// ─── School management ────────────────────────────────────────────────────────
router.get('/schools',                   SystemController.getAllSchools)
router.post('/schools',                  SystemController.createSchool)
router.get('/schools/:id',               SystemController.getSchoolById)
router.patch('/schools/:id/activate',    SystemController.activateSchool)
router.patch('/schools/:id/deactivate',  SystemController.deactivateSchool)

// ─── Super admin accounts ─────────────────────────────────────────────────────
router.get('/admins', SystemController.getSuperAdmins)

export default router
