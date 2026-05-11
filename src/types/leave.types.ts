import { LeaveStatus } from '@prisma/client'

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface CreateLeaveDTO {
  startDate: string   // ISO date e.g. "2025-05-10"
  endDate:   string
  reason:    string
}

export interface ReviewLeaveDTO {
  reviewNote?: string
}

// ─── Query Filters ────────────────────────────────────────────────────────────

export interface LeaveFilters {
  teacherId?:  number
  status?:     LeaveStatus
  startDate?:  string
  endDate?:    string
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface LeaveResponse {
  id:         number
  startDate:  Date
  endDate:    Date
  reason:     string
  status:     LeaveStatus
  reviewNote: string | null
  reviewedAt: Date | null
  createdAt:  Date
  updatedAt:  Date
  teacher: {
    id:    number
    name:  string
    email: string
    phone: string | null
  }
  reviewer: {
    id:   number
    name: string
  } | null
  daysRequested: number
}