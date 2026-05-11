//  Request Bodies 
export interface CreateSchoolDTO {
  name:             string
  address?:         string
  latitude:         number
  longitude:        number
  radiusMetres?:    number   // default 100
  lateCutoffHour?:  number   // default 8
  lateCutoffMinute?: number  // default 15
}

export interface UpdateSchoolDTO {
  name?:             string
  address?:          string
  latitude?:         number
  longitude?:        number
  radiusMetres?:     number
  lateCutoffHour?:   number
  lateCutoffMinute?: number
  isActive?:         boolean
}

// Query Filters 
export interface SchoolFilters {
  isActive?: boolean
  search?:   string   // search by name
}

// Response 

export interface SchoolResponse {
  id:               number
  name:             string
  address:          string | null
  latitude:         number
  longitude:        number
  radiusMetres:     number
  lateCutoffHour:   number
  lateCutoffMinute: number
  isActive:         boolean
  createdAt:        Date
  updatedAt:        Date
  _count?: {
    users:      number
    timetables: number
    holidays:   number
  }
}