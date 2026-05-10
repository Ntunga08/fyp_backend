import { AttendanceStatus } from '@prisma/client'

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface CheckInDTO {
  latitude: number
  longitude: number
}

// ─── Query Filters ────────────────────────────────────────────────────────────

export interface AttendanceFilters {
  teacherId?: number
  status?: AttendanceStatus
  date?: string        // ISO date string e.g. "2025-05-10"
  startDate?: string
  endDate?: string
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface AttendanceResponse {
  id: number
  date: Date
  timeIn: Date
  latitude: number
  longitude: number
  status: AttendanceStatus
  distanceFromSchool: number   // metres — useful for audit
  createdAt: Date
  teacher: {
    id: number
    name: string
    email: string
  }
}

export interface AttendanceSummary {
  teacherId: number
  teacherName: string
  totalDays: number
  present: number
  late: number
  absent: number
  attendanceRate: string       // e.g. "87.50%"
}