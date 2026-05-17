// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface AssignSubstituteDTO {
  lessonId:            number
  substituteTeacherId: number
  reason?:             string
}

export interface RecordSubstituteLessonDTO {
  notes?: string
}

// ─── Query Filters ────────────────────────────────────────────────────────────

export interface SubstituteFilters {
  originalTeacherId?:   number
  substituteTeacherId?: number
  schoolId?:            number
  date?:                string
  startDate?:           string
  endDate?:             string
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface SubstituteTeacherInfo {
  id:    number
  name:  string
  email: string
}

export interface SubstituteLessonInfo {
  id:           number
  subject:      string
  className:    string
  day:          string
  startTime:    string
  endTime:      string
  room:         string
  lessonStatus: string
  notes:        string | null
}

export interface SubstituteResponse {
  id:          number
  date:        string                // "YYYY-MM-DD"
  summary:     string                // "David Mwita covering for Hashim Juma"
  coveringFor: SubstituteTeacherInfo // original teacher who is absent
  coveredBy:   SubstituteTeacherInfo // substitute doing the covering
  lesson:      SubstituteLessonInfo
  reason:      string | null
  createdAt:   string
}
