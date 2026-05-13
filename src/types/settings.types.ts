// ─── Settings Types ───────────────────────────────────────────────────────────

export interface UpdateProfileDTO {
  name?: string
  phone?: string
  email?: string
}

export interface ChangePasswordDTO {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ProfileResponse {
  id: number
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  schoolId: number | null
  isActive: boolean
  createdAt: Date
  school?: {
    id: number
    name: string
    address: string | null
  } | null
}
