import type { Request, Response } from 'express'
import * as SettingsService from '../services/settings.service.js'
import type {
  UpdateProfileDTO,
  ChangePasswordDTO,
} from '../types/settings.types.js'

// ─── GET /api/settings/profile ────────────────────────────────────────────────
// Get current user's profile

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const profile = await SettingsService.getProfile(userId)

    res.status(200).json({
      success: true,
      data: profile,
    })
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── PUT /api/settings/profile ────────────────────────────────────────────────
// Update profile information

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const dto: UpdateProfileDTO = req.body

    // Validate input
    if (!dto.name && !dto.phone && !dto.email) {
      res.status(400).json({
        success: false,
        message: 'At least one field (name, phone, or email) must be provided',
      })
      return
    }

    // Validate email format if provided
    if (dto.email && !isValidEmail(dto.email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format',
      })
      return
    }

    // Validate phone format if provided
    if (dto.phone && !isValidPhone(dto.phone)) {
      res.status(400).json({
        success: false,
        message: 'Invalid phone format. Use format: +255XXXXXXXXX',
      })
      return
    }

    const updated = await SettingsService.updateProfile(userId, dto)

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    })
  } catch (error: any) {
    const isConflict = error.message.includes('already in use')
    res.status(isConflict ? 409 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── PUT /api/settings/password ───────────────────────────────────────────────
// Change password

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const dto: ChangePasswordDTO = req.body

    // Validate required fields
    if (!dto.currentPassword || !dto.newPassword || !dto.confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'All password fields are required',
      })
      return
    }

    await SettingsService.changePassword(userId, dto)

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error: any) {
    const isUnauthorized = error.message.includes('incorrect')
    res.status(isUnauthorized ? 401 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── DELETE /api/settings/account ─────────────────────────────────────────────
// Deactivate account

export const deactivateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    await SettingsService.deactivateAccount(userId)

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully. Contact administrator to reactivate.',
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isValidPhone = (phone: string): boolean => {
  // Tanzania phone format: +255XXXXXXXXX (12 digits total)
  const phoneRegex = /^\+255\d{9}$/
  return phoneRegex.test(phone)
}
