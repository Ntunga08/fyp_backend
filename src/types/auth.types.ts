import { Role } from '@prisma/client'

//Request Bodies

export interface RegisterDTO {
  name: string
  email: string
  password: string
  role: Role
  phone?: string
}

export interface LoginDTO {
  email: string
  password: string
}

// JWT Payload 

export interface JwtPayload {
  userId: number
  email: string
  role: Role
}

//Responses

export interface AuthResponse {
  token: string
  user: SafeUser
}

export interface SafeUser {
  id: number
  name: string
  email: string
  role: Role
  phone: string | null
  isActive: boolean
  createdAt: Date
}