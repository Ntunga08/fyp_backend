import { Router } from 'express'
import * as TimetableController from '../controllers/timetable.controller'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router: Router = Router()

// All timetable routes require authentication
router.use(requireAuth)

//Teacher routes

// Teacher views their own full timetable
router.get('/my', requireRole('TEACHER'), TimetableController.getMyTimetable)

// Teacher views their schedule for a specific day (used at check-in time)
router.get('/day/:day', requireRole('TEACHER'), TimetableController.getByDay)

// Admin / Principal routes 

// View all slots — filterable by ?teacherId=&day=&class=
router.get('/', requireRole('ADMIN', 'PRINCIPAL'), TimetableController.getAll)

// Create a new slot
router.post('/', requireRole('ADMIN', 'PRINCIPAL'), TimetableController.create)

// Get single slot
router.get('/:id', requireRole('ADMIN', 'PRINCIPAL'), TimetableController.getById)

// Update a slot
router.put('/:id', requireRole('ADMIN', 'PRINCIPAL'), TimetableController.update)

// Delete a slot
router.delete('/:id', requireRole('ADMIN'), TimetableController.remove)

export default router