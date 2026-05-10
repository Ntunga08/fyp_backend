import prisma from '../config/prisma.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { signToken } from '../utils/jwt.js'
import type { RegisterDTO, LoginDTO, AuthResponse, SafeUser } from '../types/auth.types.js'

//Strip password from user object

const sanitizeUser = (user: any): SafeUser => {
  const { password, updatedAt, ...safe } = user
  return safe
}

// Register

export const register = async (dto: RegisterDTO): Promise<AuthResponse> => {
  const existing = await prisma.user.findUnique({
    where: { email: dto.email },
  })

  if (existing) {
    throw new Error('Email already in use')
  }

  const hashed = await hashPassword(dto.password)

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: dto.role,
      phone: dto.phone ?? null,
    },
  })

  const token = signToken({ userId: user.id, email: user.email, role: user.role })

  return { token, user: sanitizeUser(user) }
}

// Login
export const login = async (dto: LoginDTO): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
  })

  if (!user) {
    throw new Error('Invalid email or password')
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated. Contact your administrator')
  }

  const isMatch = await comparePassword(dto.password, user.password)

  if (!isMatch) {
    throw new Error('Invalid email or password')
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role })

  return { token, user: sanitizeUser(user) }
}

//  Get current user by ID 

export const getMe = async (userId: number): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return sanitizeUser(user)
}