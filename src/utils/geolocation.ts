/**
 * Geolocation Utilities for EduTrack
 * Uses the Haversine formula to calculate distance between two GPS coordinates.
 * School coordinates and allowed radius are pulled from environment variables.
 */

// ─── School config from .env ──────────────────────────────────────────────────

export const SCHOOL_COORDS = {
  latitude: parseFloat(process.env.SCHOOL_LATITUDE || process.env.SCHOOL_LAT || '0'),
  longitude: parseFloat(process.env.SCHOOL_LONGITUDE || process.env.SCHOOL_LNG || '0'),
}

// Default radius: 100 metres — admin can adjust via .env
export const SCHOOL_RADIUS_METRES = parseFloat(
  process.env.SCHOOL_RADIUS_METRES || process.env.SCHOOL_RADIUS_METERS || '100'
)

// Cut-off time after which check-in is marked as LATE (24h format)
export const LATE_CUTOFF_HOUR   = parseInt(process.env.LATE_CUTOFF_HOUR   || '8')
export const LATE_CUTOFF_MINUTE = parseInt(process.env.LATE_CUTOFF_MINUTE || '15')

//Haversine Formula
// Returns distance in metres between two GPS coordinates

export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6_371_000  // Earth radius in metres

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c)  // metres, rounded
}

//Check if teacher is within school boundary 

export const isWithinSchoolRadius = (
  teacherLat: number,
  teacherLon: number
): { valid: boolean; distance: number } => {
  const distance = haversineDistance(
    SCHOOL_COORDS.latitude,
    SCHOOL_COORDS.longitude,
    teacherLat,
    teacherLon
  )

  return {
    valid: distance <= SCHOOL_RADIUS_METRES,
    distance,
  }
}

// Determine attendance status based on check-in time

export const resolveAttendanceStatus = (checkInTime: Date): 'PRESENT' | 'LATE' => {
  const hour   = checkInTime.getHours()
  const minute = checkInTime.getMinutes()

  const isLate =
    hour > LATE_CUTOFF_HOUR ||
    (hour === LATE_CUTOFF_HOUR && minute > LATE_CUTOFF_MINUTE)

  return isLate ? 'LATE' : 'PRESENT'
}

// Get current day as Prisma Day enum 

export const getTodayAsDay = ():
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | null => {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  const today = days[new Date().getDay()]

  if (today === 'SUNDAY' || today === 'SATURDAY') return null
  return today as any
}