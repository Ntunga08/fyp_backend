// ─── Query Params ─────────────────────────────────────────────────────────────

export interface ReportDateRange {
  startDate: string
  endDate:   string
}

export interface TeacherReportParams extends ReportDateRange {
  teacherId?: number
}

// ─── Daily Report ─────────────────────────────────────────────────────────────

export interface DailyReportEntry {
  teacher: {
    id:    number
    name:  string
    email: string
  }
  attendance: {
    status:   string
    timeIn:   Date | null
    location: { latitude: number; longitude: number } | null
  }
  lessons: {
    total:      number
    conducted:  number
    missed:     number
    substituted: number
    details: {
      subject:  string
      class:    string
      timeSlot: string
      status:   string
    }[]
  }
  faceVerifications: {
    total:    number
    verified: number
    failed:   number
    pending:  number
  }
  inconsistencies: string[]
}

export interface DailyReport {
  date:        string
  generatedAt: Date
  summary: {
    totalTeachers:     number
    present:           number
    absent:            number
    late:              number
    lessonsScheduled:  number
    lessonsConducted:  number
    lessonsMissed:     number
    lessonsSubstituted: number
    attendanceRate:    string
    lessonDeliveryRate: string
  }
  entries: DailyReportEntry[]
}

// ─── Weekly / Monthly Report ──────────────────────────────────────────────────

export interface PeriodReportEntry {
  teacher: {
    id:    number
    name:  string
    email: string
  }
  attendance: {
    totalDays:       number
    present:         number
    late:            number
    absent:          number
    attendanceRate:  string
  }
  lessons: {
    scheduled:       number
    conducted:       number
    missed:          number
    substituted:     number
    deliveryRate:    string
  }
  faceVerifications: {
    total:    number
    verified: number
    failed:   number
    passRate: string
  }
  substitutes: {
    timesAbsent:   number
    timesCovered:  number
    timesAsSubstitute: number
  }
}

export interface PeriodReport {
  period:      string
  startDate:   string
  endDate:     string
  generatedAt: Date
  summary: {
    totalTeachers:       number
    avgAttendanceRate:   string
    avgDeliveryRate:     string
    totalMissedLessons:  number
    totalSubstitutions:  number
    totalInconsistencies: number
  }
  entries: PeriodReportEntry[]
}

// ─── Teacher Performance Report ───────────────────────────────────────────────

export interface TeacherPerformanceReport {
  teacher: {
    id:    number
    name:  string
    email: string
    phone: string | null
  }
  period:      string
  generatedAt: Date
  attendance: {
    totalDays:      number
    present:        number
    late:           number
    absent:         number
    attendanceRate: string
    checkInTimes:   { date: string; time: string; status: string }[]
  }
  lessons: {
    scheduled:    number
    conducted:    number
    missed:       number
    substituted:  number
    deliveryRate: string
    bySubject:    { subject: string; conducted: number; missed: number }[]
  }
  faceVerifications: {
    total:    number
    verified: number
    failed:   number
    passRate: string
  }
  substitutes: {
    timesAbsent:        number
    coverageRate:       string
    asSubstituteCount:  number
  }
  flags: string[]
}

// ─── Inconsistency Report ─────────────────────────────────────────────────────

export interface InconsistencyReport {
  generatedAt: Date
  date:        string
  totalFlags:  number
  flags: {
    teacherId:   number
    teacherName: string
    type:        'CHECKED_IN_NO_LESSON' | 'ABSENT_NO_SUBSTITUTE' | 'FAILED_FACE_VERIFICATION'
    detail:      string
  }[]
}