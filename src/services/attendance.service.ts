import prisma from '../config/prisma'
import {
  haversineDistance,
  resolveAttendanceStatus,
  getTodayAsDay,
} from '../utils/geolocation'
import { isHoliday } from './holiday.service'
import type {
  CheckInDTO,
  AttendanceFilters,
  AttendanceResponse,
  AttendanceSummary,
} from '../types/attendance.types.js'

// Shared teacher select 
const teacherSelect = {
  id: true,
  name: true,
  email: true,
}

const toLocalStartOfDay = (value: string | Date): Date => {
  const date = typeof value === 'string' ? new Date(value) : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const toLocalEndOfDay = (value: string | Date): Date => {
  const date = typeof value === 'string' ? new Date(value) : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

//  Check In

export const checkIn = async (
  teacherId: number,
  dto: CheckInDTO
): Promise<AttendanceResponse> => {
  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { id: true, schoolId: true, isActive: true },
  })

  if (!teacher) {
    throw new Error('Teacher not found')
  }

  if (!teacher.isActive) {
    throw new Error('Account is deactivated. Contact your administrator')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Block weekends
  const day = getTodayAsDay()
  if (!day) {
    throw new Error('Check-in is only available on weekdays (Mon – Fri)')
  }

  const holiday = await isHoliday(teacher.schoolId, today)
  if (holiday.isHoliday) {
    throw new Error(
      holiday.name
        ? `Check-in blocked. Today is a school holiday: ${holiday.name}`
        : 'Check-in blocked. Today is a school holiday'
    )
  }

  // Block duplicate check-in
  const existing = await prisma.attendance.findUnique({
    where: {
      teacherId_date: {
        teacherId,
        date: today,
      },
    },
  })

  if (existing) {
    throw new Error('You have already checked in today')
  }

  // Validate teacher is within school premises
  const school = await prisma.school.findUnique({
    where: { id: teacher.schoolId },
    select: { latitude: true, longitude: true, radiusMetres: true },
  })

  if (!school) {
    throw new Error('School configuration not found')
  }

  // Check against AllowedLocations first; fall back to school coords if none configured
  const allowedLocations = await prisma.allowedLocation.findMany({
    where: { schoolId: teacher.schoolId, isActive: true },
  })

  let distance = 0
  let locationName = 'school'

  if (allowedLocations.length > 0) {
    // Find the closest allowed location
    let nearest = { distance: Infinity, name: '' }
    let withinAny = false

    for (const loc of allowedLocations) {
      const d = haversineDistance(dto.latitude, dto.longitude, loc.latitude, loc.longitude)
      if (d <= loc.radiusMetres) {
        withinAny = true
        distance = d
        locationName = loc.name
        break
      }
      if (d < nearest.distance) {
        nearest = { distance: d, name: loc.name }
      }
    }

    if (!withinAny) {
      throw new Error(
        `Check-in rejected. You are ${nearest.distance.toFixed(0)}m from ${nearest.name}. You must be within an allowed school location`
      )
    }
  } else {
    // No AllowedLocations configured — use school centre point
    distance = haversineDistance(dto.latitude, dto.longitude, school.latitude, school.longitude)
    locationName = 'school'

    if (distance > school.radiusMetres) {
      throw new Error(
        `Check-in rejected. You are ${distance.toFixed(0)}m from school. Must be within ${school.radiusMetres}m`
      )
    }
  }

  // Determine PRESENT or LATE
  const now    = new Date()
  const status = resolveAttendanceStatus(now)

  const record = await prisma.attendance.create({
    data: {
      teacherId,
      date: today,
      timeIn: now,
      latitude: dto.latitude,
      longitude: dto.longitude,
      status,
    },
    include: { teacher: { select: teacherSelect } },
  })

  return { ...record, distanceFromSchool: distance } as AttendanceResponse
}

//Get today's status for the logged-in teacher

export const getMyToday = async (teacherId: number): Promise<AttendanceResponse | null> => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const record = await prisma.attendance.findUnique({
    where: { teacherId_date: { teacherId, date: today } },
    include: { teacher: { select: teacherSelect } },
  })

  if (!record) return null
  return { ...record, distanceFromSchool: 0 } as AttendanceResponse
}

//  Get own attendance history 
export const getMyHistory = async (
  teacherId: number,
  filters: AttendanceFilters
): Promise<AttendanceResponse[]> => {
  const where = buildWhereClause({ ...filters, teacherId })

  const records = await prisma.attendance.findMany({
    where,
    include: { teacher: { select: teacherSelect } },
    orderBy: { date: 'desc' },
  })

  return records.map((record) => ({ ...record, distanceFromSchool: 0 })) as AttendanceResponse[]
}

// Admin: get all attendance (filterable) 

export const getAll = async (
  filters: AttendanceFilters
): Promise<AttendanceResponse[]> => {
  const where = buildWhereClause(filters)

  const records = await prisma.attendance.findMany({
    where,
    include: { teacher: { select: teacherSelect } },
    orderBy: [{ date: 'desc' }, { timeIn: 'asc' }],
  })

  return records.map((record) => ({ ...record, distanceFromSchool: 0 })) as AttendanceResponse[]
}

// Admin: get attendance summary per teacher 


export const getSummary = async (
  filters: AttendanceFilters
): Promise<AttendanceSummary[]> => {
  const where = buildWhereClause(filters)

  // Get all teachers
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER', isActive: true },
    select: { id: true, name: true },
  })

  const summaries: AttendanceSummary[] = []

  for (const teacher of teachers) {
    const records = await prisma.attendance.findMany({
      where: { ...where, teacherId: teacher.id },
    })

    const present = records.filter((record) => record.status === 'PRESENT').length
    const late    = records.filter((record) => record.status === 'LATE').length
    const absent  = records.filter((record) => record.status === 'ABSENT').length
    const total   = records.length

    summaries.push({
      teacherId: teacher.id,
      teacherName: teacher.name,
      totalDays: total,
      present,
      late,
      absent,
      attendanceRate: total > 0
        ? (((present + late) / total) * 100).toFixed(2) + '%'
        : '0.00%',
    })
  }

  return summaries
}

//Admin: manually mark a teacher absent 
// Used for end-of-day job or manual override

export const markAbsent = async (
  teacherId: number,
  date: Date
): Promise<AttendanceResponse> => {
  const normalizedDate = new Date(date)
  normalizedDate.setHours(0, 0, 0, 0)

  // Check if already checked in
  const existing = await prisma.attendance.findUnique({
    where: { teacherId_date: { teacherId, date: normalizedDate } },
  })

  if (existing) {
    throw new Error('Teacher already has an attendance record for this date')
  }

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } })
  if (!teacher || teacher.role !== 'TEACHER') {
    throw new Error('Teacher not found')
  }

  const record = await prisma.attendance.create({
    data: {
      teacherId,
      date: normalizedDate,
      timeIn: normalizedDate,   // placeholder for absent
      latitude: 0,
      longitude: 0,
      status: 'ABSENT',
    },
    include: { teacher: { select: teacherSelect } },
  })

  return { ...record, distanceFromSchool: 0 } as AttendanceResponse
}

// Helper: build Prisma where clause from filters 
const buildWhereClause = (filters: AttendanceFilters) => {
  const where: any = {}

  if (filters.teacherId) where.teacherId = filters.teacherId
  if (filters.status)    where.status    = filters.status

  if (filters.date) {
    where.date = toLocalStartOfDay(filters.date)
  }

  if (filters.startDate || filters.endDate) {
    where.date = {}
    if (filters.startDate) where.date.gte = toLocalStartOfDay(filters.startDate)
    if (filters.endDate)   where.date.lte = toLocalEndOfDay(filters.endDate)
  }

  return where
}