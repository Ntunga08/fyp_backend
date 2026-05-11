import { Router } from 'express'
import * as NotificationController from '../controllers/notification.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// ─── All roles ────────────────────────────────────────────────────────────────

// ─── Admin only ───────────────────────────────────────────────────────────────
// IMPORTANT: Define /all BEFORE /:id to prevent route conflict

// View all notifications across all users
router.get(
  '/all',
  requireRole('ADMIN'),
  NotificationController.getAll
)

// ─── All roles ────────────────────────────────────────────────────────────────

// Get own notifications — ?isRead=false&type=MISSED_LESSON
router.get('/', NotificationController.getMyNotifications)

// Get unread count (for notification bell in UI)
router.get('/summary', NotificationController.getSummary)

// Mark all as read
router.put('/read-all', NotificationController.markAllRead)

// Clear all read notifications
router.delete('/clear-read', NotificationController.clearRead)

// Mark single notification as read
router.put('/:id/read', NotificationController.markOneRead)

// Delete single notification
router.delete('/:id', NotificationController.deleteOne)

export default router