import { Router } from 'express'
import * as AuthController from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router: Router = Router()

console.log(" Auth routes file loaded")
console.log("AuthController:", Object.keys(AuthController))

// Public routes

router.post('/register', AuthController.register)
router.post('/login', AuthController.login)


// Protected routes

router.get('/me', requireAuth, AuthController.getMe)
router.get('/pending', requireAuth, AuthController.getPendingUsers)
router.get('/school-users', requireAuth, AuthController.getSchoolUsers)
router.get('/users', requireAuth, AuthController.getSchoolUsers)  // Alias for frontend compatibility
router.put('/approve/:userId', requireAuth, AuthController.approveUser)
router.put('/reject/:userId', requireAuth, AuthController.rejectUser)


export default router