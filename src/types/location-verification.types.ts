import { LocationVerificationStatus } from '@prisma/client'

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface TriggerLocationVerificationDTO {
  lessonId: number
}

export interface SubmitLocationVerificationDTO {
  verificationId: number
  latitude:       number
  longitude:      number
}

// ─── Allowed Location Management ──────────────────────────────────────────────

export interface CreateAllowedLocationDTO {
  schoolId:     number
  name:         string
  latitude:     number
  longitude:    number
  radiusMetres: number
}

export interface UpdateAllowedLocationDTO {
  name?:         string
  latitude?:     number
  longitude?:    number
  radiusMetres?: number
  isActive?:     boolean
}

// ─── Query Filters ────────────────────────────────────────────────────────────

export interface LocationVerificationFilters {
  teacherId?: number
  lessonId?:  number
  status?:    LocationVerificationStatus
  startDate?: string
  endDate?:   string
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface LocationVerificationResponse {
  id:              number
  status:          LocationVerificationStatus
  submittedLat:    number | null
  submittedLng:    number | null
  distanceMetres:  number | null
  verifiedAt:      Date | null
  createdAt:       Date
  teacher: {
    id:    number
    name:  string
    email: string
  }
  lesson: {
    id:     number
    date:   Date
    status: string
    timetable: {
      subject:  string
      class:    string
      day:      string
      timeSlot: string
    }
  }
  allowedLocation: {
    id:           number
    name:         string
    latitude:     number
    longitude:    number
    radiusMetres: number
  } | null
}

export interface LocationVerificationSummary {
  teacherId:   number
  teacherName: string
  total:       number
  verified:    number
  failed:      number
  pending:     number
  passRate:    string
}

export interface AllowedLocationResponse {
  id:           number
  schoolId:     number
  name:         string
  latitude:     number
  longitude:    number
  radiusMetres: number
  isActive:     boolean
  createdAt:    Date
  updatedAt:    Date
}
