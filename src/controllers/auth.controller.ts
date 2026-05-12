import type { Request, Response } from 'express'
import * as AuthService from '../services/auth.service.js'
import type { RegisterDTO, LoginDTO } from '../types/auth.types.js'

//register 
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: RegisterDTO = req.body

    // Validate required fields
    if (!dto.name || !dto.email || !dto.password || !dto.role) {
      res.status(400).json({
        success: false,
        message: 'name, email, password and role are required',
      })
      return
    }

    // schoolId is required for TEACHER and PRINCIPAL, but optional for ADMIN
    if (dto.role !== 'ADMIN' && dto.schoolId === undefined) {
      res.status(400).json({
        success: false,
        message: 'schoolId is required for teachers and principals',
      })
      return
    }

    const result = await AuthService.register(dto)

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: result,
    })
  } catch (error: any) {
    const isConflict = error.message === 'Email already in use'
    res.status(isConflict ? 409 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

//login

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: LoginDTO = req.body
    const result = await AuthService.login(dto)

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    })
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message,
    })
  }
}

// GET /auth/me  (protected) 

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId
    const user = await AuthService.getMe(userId)

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    })
  }
}


// GET /auth/pending - Get pending users for approval (ADMIN/PRINCIPAL only)
export const getPendingUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user
    
    // Get user's school
    const currentUser = await AuthService.getMe(user.userId)
    
    if (!currentUser.schoolId) {
      res.status(400).json({
        success: false,
        message: 'User is not associated with a school',
      })
      return
    }

    const pendingUsers = await AuthService.getPendingUsers(currentUser.schoolId)

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// PUT /auth/approve/:userId - Approve a pending user (ADMIN/PRINCIPAL only)
export const approveUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.userId)
    const approvedBy = (req as any).user.userId

    const approved = await AuthService.approveUser(userId, approvedBy)

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: approved,
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

// PUT /auth/reject/:userId - Reject a pending user (ADMIN/PRINCIPAL only)
export const rejectUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.userId)
    const rejectedBy = (req as any).user.userId

    const rejected = await AuthService.rejectUser(userId, rejectedBy)

    res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: rejected,
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

// GET /auth/school-users - Get all users in the school (ADMIN/PRINCIPAL only)
export const getSchoolUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user
    const { status } = req.query
    
    // Get user's school
    const currentUser = await AuthService.getMe(user.userId)
    
    if (!currentUser.schoolId) {
      res.status(400).json({
        success: false,
        message: 'User is not associated with a school',
      })
      return
    }

    const users = await AuthService.getSchoolUsers(
      currentUser.schoolId,
      status as string | undefined
    )

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
