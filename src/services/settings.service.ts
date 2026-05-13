import prisma from '../config/prisma.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import type {
  UpdateProfileDTO,
  ChangePasswordDTO,
  ProfileResponse,
} from '../types/settings.types.js'

// ─── Get User Profile ─────────────────────────────────────────────────────────

export const getProfile = async (userId: number): Promise<ProfileResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      schoolId: true,
      isActive: true,
      createdAt: true,
      school: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user as ProfileResponse
}

// ─── Update Profile Information ───────────────────────────────────────────────

export const updateProfile = async (
  userId: number,
  dto: UpdateProfileDTO
): Promise<ProfileResponse> => {
  // Validate at least one field is being updated
  if (!dto.name && !dto.phone && !dto.email) {
    throw new Error('At least one field must be provided for update')
  }

  // Check if email is being changed and if it's already in use
  if (dto.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: dto.email,
        NOT: { id: userId },
      },
    })

    if (existingUser) {
      throw new Error('Email already in use by another account')
    }
  }

  // Build update data object
  const updateData: any = {}
  if (dto.name) updateData.name = dto.name.trim()
  if (dto.phone) updateData.phone = dto.phone.trim()
  if (dto.email) updateData.email = dto.email.trim().toLowerCase()

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      schoolId: true,
      isActive: true,
      createdAt: true,
      school: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  })

  return updated as ProfileResponse
}

// ─── Change Password ──────────────────────────────────────────────────────────

export const changePassword = async (
  userId: number,
  dto: ChangePasswordDTO
): Promise<void> => {
  // Validate passwords match
  if (dto.newPassword !== dto.confirmPassword) {
    throw new Error('New passwords do not match')
  }

  // Validate password strength
  if (dto.newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }

  // Prevent using same password
  if (dto.currentPassword === dto.newPassword) {
    throw new Error('New password must be different from current password')
  }

  // Get current user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Verify current password
  const isValid = await comparePassword(dto.currentPassword, user.password)
  if (!isValid) {
    throw new Error('Current password is incorrect')
  }

  // Hash new password
  const hashedPassword = await hashPassword(dto.newPassword)

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })
}

// ─── Deactivate Account ───────────────────────────────────────────────────────

export const deactivateAccount = async (userId: number): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (!user.isActive) {
    throw new Error('Account is already deactivated')
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  })
}
