import { Router } from 'express'
import * as AuthController from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router: Router = Router()

console.log("🛣️  Auth routes file loaded")
console.log("📦 AuthController:", Object.keys(AuthController))

// Public routes

router.post('/register', AuthController.register)
console.log("✅ POST /register route added")
router.post('/login', AuthController.login)
console.log("✅ POST /login route added")

// Protected routes

router.get('/me', requireAuth, AuthController.getMe)
console.log("✅ GET /me route added")

export default router