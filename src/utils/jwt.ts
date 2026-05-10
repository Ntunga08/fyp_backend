import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types/auth.types'

const SECRET = process.env.JWT_SECRET as string
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

if (!SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables')
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions)
}

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET) as JwtPayload
}