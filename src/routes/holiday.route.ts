import { Router } from 'express'
import * as HolidayController from '../controllers/holiday.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// ─── All roles ────────────────────────────────────────────────────────────────

// Any user: view holidays for their own school
router.get('/my', HolidayController.getMySchoolHolidays)

// Check if a specific date is a holiday (used by attendance check-in)
// GET /api/holidays/check?schoolId=1&date=2025-12-25
router.get('/check', HolidayController.checkDate)

// View upcoming holidays for a school
// GET /api/holidays/upcoming/:schoolId?days=30
router.get('/upcoming/:schoolId', HolidayController.getUpcoming)

// ─── Admin / Principal ────────────────────────────────────────────────────────

// View all holidays (filterable)
router.get(
  '/',
  requireRole('ADMIN', 'PRINCIPAL'),
  HolidayController.getAll
)

// View single holiday
router.get(
  '/:id',
  requireRole('ADMIN', 'PRINCIPAL'),
  HolidayController.getById
)

//  Admin only 

// Create single holiday
router.post(
  '/',
  requireRole('ADMIN'),
  HolidayController.create
)

// Auto-create Tanzania public holidays for a year
// POST /api/holidays/bulk/:schoolId  body: { year: 2025 }
router.post(
  '/bulk/:schoolId',
  requireRole('ADMIN'),
  HolidayController.bulkCreate
)

// Update holiday
router.put(
  '/:id',
  requireRole('ADMIN'),
  HolidayController.update
)

// Delete holiday
router.delete(
  '/:id',
  requireRole('ADMIN'),
  HolidayController.remove
)

export default router