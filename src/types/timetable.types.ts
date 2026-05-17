import { Day } from '@prisma/client'

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface CreateTimetableDTO {
  teacherId?: number
  teacher?:   string
  subject:    string
  className:  string
  day:        Day
  startTime:  string
  endTime:    string
  room?:      string
}

export interface UpdateTimetableDTO {
  teacherId?: number
  teacher?:   string
  subject?:   string
  className?: string
  day?:       Day
  startTime?: string
  endTime?:   string
  room?:      string
}

// ─── Query Filters ────────────────────────────────────────────────────────────

export interface TimetableFilters {
  teacherId?: number
  day?:       Day
  className?: string
  schoolId?:  number
}

// ─── Flat slot (used in management and my-schedule flat list) ─────────────────

export interface TimetableSlotResponse {
  id:        string
  day:       Day
  startTime: string
  endTime:   string
  subject:   string
  className: string
  teacher:   string
  teacherId: number
  room:      string
}

// ─── Day-grouped slot (used in schedule views) ───────────────────────────────

export interface DaySlots {
  day:   Day
  slots: TimetableSlotResponse[]
}

// ─── My schedule response (teacher's personal view) ──────────────────────────

export interface MyScheduleResponse {
  teacherName:       string
  subjects:          string[]
  totalSlotsPerWeek: number
  schedule:          DaySlots[]
}

// ─── School timetable response (general view) ─────────────────────────────────

export interface SchoolTimetableResponse {
  schoolName: string
  filters:    { day?: string; className?: string }
  schedule:   DaySlots[]
}
