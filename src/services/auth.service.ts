import prisma from '../config/prisma.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { signToken } from '../utils/jwt.js'
import {
  teacherRegisteredEmail,
  accountApprovedEmail,
  accountRejectedEmail,
} from '../utils/email.js'
import type { RegisterDTO, LoginDTO, AuthResponse, SafeUser } from '../types/auth.types.js'

//Strip password from user object

const sanitizeUser = (user: any): SafeUser => {
  const { password, updatedAt, ...safe } = user
  return safe
}

// Register

export const register = async (dto: RegisterDTO): Promise<AuthResponse> => {
  // SUPER_ADMIN has no school — everyone else must belong to one
  if ((dto.role as string) === 'SUPER_ADMIN' && dto.schoolId !== undefined) {
    throw new Error('SUPER_ADMIN must not be associated with any school')
  }
  if ((dto.role as string) !== 'SUPER_ADMIN' && dto.schoolId === undefined) {
    throw new Error('schoolId is required for school staff')
  }

  const existing = await prisma.user.findUnique({
    where: { email: dto.email },
  })

  if (existing) {
    throw new Error('Email already in use')
  }

  const hashed = await hashPassword(dto.password)

  // SUPER_ADMIN and ADMIN and PRINCIPAL are auto-approved; TEACHER needs approval
  const status = dto.role === 'TEACHER' ? 'PENDING' : 'ACTIVE'

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: dto.role,
      status: status,
      schoolId: dto.schoolId ?? null,
      phone: dto.phone ?? null,
    },
  })

  // Notify all active admins/principals in the school when a teacher registers
  if (dto.role === 'TEACHER' && user.schoolId) {
    const school = await prisma.school.findUnique({ where: { id: user.schoolId } })
    const admins = await prisma.user.findMany({
      where: {
        schoolId: user.schoolId,
        role:     { in: ['ADMIN', 'PRINCIPAL'] },
        status:   'ACTIVE',
        isActive: true,
      },
      select: { name: true, email: true },
    })

    const schoolName = school?.name ?? 'your school'
    for (const admin of admins) {
      void teacherRegisteredEmail({
        adminEmail:   admin.email,
        adminName:    admin.name,
        teacherName:  user.name,
        teacherEmail: user.email,
        schoolName,
      })
    }
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role, schoolId: user.schoolId ?? null })

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

  // Check if account is pending approval
  if (user.status === 'PENDING') {
    throw new Error('Your account is pending approval by the school administrator')
  }

  if (user.status === 'REJECTED') {
    throw new Error('Your account registration was rejected. Contact your school administrator')
  }

  if (user.status === 'SUSPENDED') {
    throw new Error('Your account has been suspended. Contact your school administrator')
  }

  const isMatch = await comparePassword(dto.password, user.password)

  if (!isMatch) {
    throw new Error('Invalid email or password')
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role, schoolId: user.schoolId ?? null })

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


// Get pending users (for admin approval)
export const getPendingUsers = async (schoolId: number): Promise<SafeUser[]> => {
  const users = await prisma.user.findMany({
    where: {
      schoolId: schoolId,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  })

  return users.map(sanitizeUser)
}

// Approve user
export const approveUser = async (userId: number, approvedBy: number): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (user.status !== 'PENDING') {
    throw new Error('User is not pending approval')
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: 'ACTIVE' },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: approvedBy,
      action: 'APPROVED_USER',
      entity: 'User',
      entityId: userId,
      details: JSON.stringify({ userName: user.name, userEmail: user.email }),
    },
  })

  // Email the teacher
  if (user.schoolId) {
    const school = await prisma.school.findUnique({ where: { id: user.schoolId } })
    void accountApprovedEmail({
      teacherEmail: user.email,
      teacherName:  user.name,
      schoolName:   school?.name ?? 'your school',
    })
  }

  return sanitizeUser(updated)
}

// Reject user
export const rejectUser = async (userId: number, rejectedBy: number): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (user.status !== 'PENDING') {
    throw new Error('User is not pending approval')
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: 'REJECTED' },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: rejectedBy,
      action: 'REJECTED_USER',
      entity: 'User',
      entityId: userId,
      details: JSON.stringify({ userName: user.name, userEmail: user.email }),
    },
  })

  // Email the teacher
  if (user.schoolId) {
    const school = await prisma.school.findUnique({ where: { id: user.schoolId } })
    void accountRejectedEmail({
      teacherEmail: user.email,
      teacherName:  user.name,
      schoolName:   school?.name ?? 'your school',
    })
  }

  return sanitizeUser(updated)
}

// Get all users in a school (for admin)
export const getSchoolUsers = async (schoolId: number, status?: string, role?: string): Promise<SafeUser[]> => {
  const where: any = { schoolId }
  
  if (status) {
    where.status = status
  }
  
  if (role) {
    where.role = role
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: 'asc' },  // Changed to sort by name for teacher dropdown
  })

  return users.map(sanitizeUser)
}
