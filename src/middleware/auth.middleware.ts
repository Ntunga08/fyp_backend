import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import { Role } from '@prisma/client'

// ─── Extend Express Request to carry user payload ─────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId:   number
        email:    string
        role:     Role
        schoolId: number | null
      }
    }
  }
}

// ─── requireAuth: verifies JWT from Authorization header ──────────────────────

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided',
      })
      return
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided',
      })
      return
    }

    const decoded = verifyToken(token)

    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}

// requireRole: restricts route to specific roles 
// Usage: requireRole('ADMIN') or requireRole('ADMIN', 'PRINCIPAL')

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      })
      return
    }

    next()
  }
}