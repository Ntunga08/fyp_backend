//Request Bodies 

export interface AssignSubstituteDTO {
  lessonId:           number
  substituteTeacherId: number
  reason?:            string
}

export interface RecordSubstituteLessonDTO {
  notes?: string
}

//Query Filters 
export interface SubstituteFilters {
  originalTeacherId?:   number
  substituteTeacherId?: number
  date?:                string
  startDate?:           string
  endDate?:             string
}

// Response 
export interface SubstituteResponse {
  id:        number
  date:      Date
  reason:    string | null
  createdAt: Date
  originalTeacher: {
    id:    number
    name:  string
    email: string
  }
  substituteTeacher: {
    id:    number
    name:  string
    email: string
  }
  lesson: {
    id:      number
    status:  string
    notes:   string | null
    timetable: {
      subject:  string
      class:    string
      day:      string
      timeSlot: string
      room:     string | null
    }
  }
}