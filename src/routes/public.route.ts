import { Router } from 'express'
import * as SchoolController from '../controllers/school.controller.js'

const router: Router = Router()

// Public routes - NO AUTH REQUIRED

// Get list of schools for registration
router.get('/schools', SchoolController.getPublicSchools)

export default router
