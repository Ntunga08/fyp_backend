import { Day } from '@prisma/client'

//  Request Bodies

export interface CreateTimetableDTO {
  teacherId: number
  subject: string
  class: string
  day: Day
  timeSlot: string  // e.g. "08:00-09:00"
  room?: string
}

export interface UpdateTimetableDTO {
  teacherId?: number
  subject?: string
  class?: string
  day?: Day
  timeSlot?: string
  room?: string
}

// Query Filters 

export interface TimetableFilters {
  teacherId?: number
  day?: Day
  class?: string
}

// Response

export interface TimetableResponse {
  id: number
  subject: string
  class: string
  day: Day
  timeSlot: string
  room: string | null
  createdAt: Date
  teacher: {
    id: number
    name: string
    email: string
  }
}