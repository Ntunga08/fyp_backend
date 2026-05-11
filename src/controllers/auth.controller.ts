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