import { LessonStatus } from '@prisma/client'

// Request Bodies
export interface RecordLessonDTO {
  timetableId: number
  notes?: string
}

export interface UpdateLessonDTO {
  status?: LessonStatus
  notes?: string
}

// Query Filters 

export interface LessonFilters {
  teacherId?: number
  status?: LessonStatus
  date?: string
  startDate?: string
  endDate?: string
  timetableId?: number
}

// Responses

export interface LessonResponse {
  id: number
  date: Date
  status: LessonStatus
  notes: string | null
  createdAt: Date
  teacher: {
    id: number
    name: string
    email: string
  }
  timetable: {
    id: number
    subject: string
    class: string
    day: string
    timeSlot: string
    room: string | null
  }
}

// ─── Inconsistency flag ───────────────────────────────────────────────────────

export interface LessonInconsistency {
  teacherId: number
  teacherName: string
  date: Date
  timetableId: number
  subject: string
  class: string
  timeSlot: string
  issue: 'CHECKED_IN_NO_LESSON' | 'LESSON_NO_CHECKIN' | 'MISSED'
}