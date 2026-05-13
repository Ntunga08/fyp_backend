import { Router } from 'express'
import * as SettingsController from '../controllers/settings.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router: Router = Router()

// ─── All routes require authentication ───────────────────────────────────────

router.use(requireAuth)

// ─── Profile Management ───────────────────────────────────────────────────────

// Get current user's profile
router.get('/profile', SettingsController.getProfile)

// Update profile information (name, phone, email)
router.put('/profile', SettingsController.updateProfile)

// ─── Password Management ──────────────────────────────────────────────────────

// Change password
router.put('/password', SettingsController.changePassword)

// ─── Account Management ───────────────────────────────────────────────────────

// Deactivate account (soft delete)
router.delete('/account', SettingsController.deactivateAccount)

export default router
