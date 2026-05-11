// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface CreateHolidayDTO {
  schoolId:    number
  name:        string
  date:        string   // ISO date e.g. "2025-12-25"
  description?: string
}

export interface UpdateHolidayDTO {
  name?:        string
  date?:        string
  description?: string
}

// ─── Query Filters ────────────────────────────────────────────────────────────

export interface HolidayFilters {
  schoolId?:  number
  startDate?: string
  endDate?:   string
  upcoming?:  boolean   // only future holidays
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface HolidayResponse {
  id:          number
  name:        string
  date:        Date
  description: string | null
  createdAt:   Date
  school: {
    id:   number
    name: string
  }
}