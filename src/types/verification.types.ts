import { FaceVerificationStatus } from '@prisma/client'

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface TriggerVerificationDTO {
  lessonId: number
}

export interface SubmitVerificationDTO {
  verificationId: number
  imageBase64:    string   // base64 encoded face image from client
}

// ─── Query Filters ────────────────────────────────────────────────────────────

export interface FaceVerificationFilters {
  teacherId?: number
  lessonId?:  number
  status?:    FaceVerificationStatus
  startDate?: string
  endDate?:   string
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface FaceVerificationResponse {
  id:         number
  status:     FaceVerificationStatus
  verifiedAt: Date | null
  createdAt:  Date
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
}

//Summary 

export interface FaceVerificationSummary {
  teacherId:   number
  teacherName: string
  total:       number
  verified:    number
  failed:      number
  pending:     number
  passRate:    string
}