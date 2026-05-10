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


export default router