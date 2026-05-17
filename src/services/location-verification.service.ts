import prisma from '../config/prisma.js'
import { haversineDistance } from '../utils/geolocation.js'
import type {
  TriggerLocationVerificationDTO,
  SubmitLocationVerificationDTO,
  LocationVerificationFilters,
  LocationVerificationResponse,
  LocationVerificationSummary,
  CreateAllowedLocationDTO,
  UpdateAllowedLocationDTO,
  AllowedLocationResponse,
} from '../types/location-verification.types.js'

// Shared include 

const verificationInclude = {
  teacher: {
    select: { id: true, name: true, email: true },
  },
  lesson: {
    select: {
      id:     true,
      date:   true,
      status: true,
      timetable: {
        select: {
          subject:  true,
          class:    true,
          day:      true,
          timeSlot: true,
        },
      },
    },
  },
  allowedLocation: {
    select: {
      id:           true,
      name:         true,
      latitude:     true,
      longitude:    true,
      radiusMetres: true,
    },
  },
}

// Admin triggers a location verification for a lesson 

export const trigger = async (
  dto: TriggerLocationVerificationDTO
): Promise<LocationVerificationResponse> => {

  // Lesson must exist
  const lesson = await prisma.lesson.findUnique({
    where: { id: dto.lessonId },
  })

  if (!lesson) {
    throw new Error('Lesson not found')
  }

  // Only CONDUCTED or SUBSTITUTED lessons can be verified
  if (lesson.status === 'MISSED') {
    throw new Error('Cannot verify a MISSED lesson')
  }

  // Prevent duplicate verification for same lesson
  const existing = await prisma.locationVerification.findUnique({
    where: { lessonId: dto.lessonId },
  })

  if (existing) {
    throw new Error(
      `Location verification already exists for this lesson with status: ${existing.status}`
    )
  }

  const verification = await prisma.locationVerification.create({
    data: {
      teacherId: lesson.teacherId,
      lessonId:  dto.lessonId,
      status:    'PENDING',
    },
    include: verificationInclude,
  })

  return verification as unknown as LocationVerificationResponse
}

// ─── Teacher submits their GPS location for verification ─────────────────────

export const submit = async (
  dto: SubmitLocationVerificationDTO,
  requesterId: number
): Promise<LocationVerificationResponse> => {

  const verification = await prisma.locationVerification.findUnique({
    where: { id: dto.verificationId },
  })

  if (!verification) {
    throw new Error('Location verification request not found')
  }

  // Only the teacher linked to this verification can submit
  if (verification.teacherId !== requesterId) {
    throw new Error('This verification request is not assigned to you')
  }

  // Can't re-submit an already resolved verification
  if (verification.status !== 'PENDING') {
    throw new Error(
      `Verification already resolved with status: ${verification.status}`
    )
  }

  // Get teacher's school
  const teacher = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { schoolId: true },
  })

  if (!teacher) {
    throw new Error('Teacher not found')
  }

  // Try AllowedLocations first, fall back to school centre point
  const allowedLocations = await prisma.allowedLocation.findMany({
    where: { schoolId: teacher.schoolId, isActive: true },
  })

  let matchedLocationId: number | null = null
  let distanceMetres: number
  let newStatus: 'VERIFIED' | 'FAILED'

  if (allowedLocations.length > 0) {
    let nearest = { distance: Infinity, id: null as number | null }

    for (const loc of allowedLocations) {
      const d = haversineDistance(dto.latitude, dto.longitude, loc.latitude, loc.longitude)
      if (d <= loc.radiusMetres) {
        matchedLocationId = loc.id
        distanceMetres    = d
        newStatus         = 'VERIFIED'
        break
      }
      if (d < nearest.distance) {
        nearest = { distance: d, id: loc.id }
      }
    }

    if (!matchedLocationId) {
      distanceMetres = nearest.distance
      newStatus      = 'FAILED'
    }
  } else {
    // No allowed locations — fall back to school centre
    const school = await prisma.school.findUnique({
      where: { id: teacher.schoolId },
      select: { latitude: true, longitude: true, radiusMetres: true },
    })

    if (!school) throw new Error('School configuration not found')

    distanceMetres = haversineDistance(dto.latitude, dto.longitude, school.latitude, school.longitude)
    newStatus      = distanceMetres <= school.radiusMetres ? 'VERIFIED' : 'FAILED'
  }

  const updated = await prisma.locationVerification.update({
    where: { id: dto.verificationId },
    data: {
      status:            newStatus!,
      submittedLat:      dto.latitude,
      submittedLng:      dto.longitude,
      distanceMetres:    distanceMetres!,
      allowedLocationId: matchedLocationId,
      verifiedAt:        new Date(),
    },
    include: verificationInclude,
  })

  return updated as unknown as LocationVerificationResponse
}

// ─── Get teacher's own verifications ─────────────────────────────────────────

export const getMyVerifications = async (
  teacherId: number,
  filters: LocationVerificationFilters
): Promise<LocationVerificationResponse[]> => {
  const where = buildWhereClause({ ...filters, teacherId })

  const results = await prisma.locationVerification.findMany({
    where,
    include: verificationInclude,
    orderBy: { createdAt: 'desc' },
  })

  return results as unknown as LocationVerificationResponse[]
}

// ─── Get all verifications (Admin/Principal) ──────────────────────────────────

export const getAll = async (
  filters: LocationVerificationFilters
): Promise<LocationVerificationResponse[]> => {
  const where = buildWhereClause(filters)

  const results = await prisma.locationVerification.findMany({
    where,
    include: verificationInclude,
    orderBy: { createdAt: 'desc' },
  })

  return results as unknown as LocationVerificationResponse[]
}

// ─── Get single verification by ID ───────────────────────────────────────────

export const getById = async (id: number): Promise<LocationVerificationResponse> => {
  const result = await prisma.locationVerification.findUnique({
    where:   { id },
    include: verificationInclude,
  })

  if (!result) throw new Error('Location verification record not found')

  return result as unknown as LocationVerificationResponse
}

// ─── Admin retriggers a FAILED verification ───────────────────────────────────

export const retrigger = async (id: number): Promise<LocationVerificationResponse> => {
  const verification = await prisma.locationVerification.findUnique({
    where: { id },
  })

  if (!verification) throw new Error('Location verification record not found')

  if (verification.status === 'VERIFIED') {
    throw new Error('Cannot retrigger an already VERIFIED verification')
  }

  const reset = await prisma.locationVerification.update({
    where: { id },
    data: {
      status:            'PENDING',
      submittedLat:      null,
      submittedLng:      null,
      distanceMetres:    null,
      allowedLocationId: null,
      verifiedAt:        null,
    },
    include: verificationInclude,
  })

  return reset as unknown as LocationVerificationResponse
}

// ─── Summary stats per teacher (Admin/Principal) ──────────────────────────────

export const getSummary = async (
  filters: LocationVerificationFilters
): Promise<LocationVerificationSummary[]> => {
  const teachers = await prisma.user.findMany({
    where:  { role: 'TEACHER', isActive: true },
    select: { id: true, name: true },
  })

  const summaries: LocationVerificationSummary[] = []

  for (const teacher of teachers) {
    const where = buildWhereClause({ ...filters, teacherId: teacher.id })

    const records = await prisma.locationVerification.findMany({ where })

    const verified = records.filter((r: any) => r.status === 'VERIFIED').length
    const failed   = records.filter((r: any) => r.status === 'FAILED').length
    const pending  = records.filter((r: any) => r.status === 'PENDING').length
    const total    = records.length

    summaries.push({
      teacherId:   teacher.id,
      teacherName: teacher.name,
      total,
      verified,
      failed,
      pending,
      passRate: total > 0
        ? ((verified / total) * 100).toFixed(2) + '%'
        : '0.00%',
    })
  }

  return summaries
}

// ─── AllowedLocation CRUD (Admin/Principal) ───────────────────────────────────

export const createAllowedLocation = async (
  dto: CreateAllowedLocationDTO
): Promise<AllowedLocationResponse> => {
  const school = await prisma.school.findUnique({ where: { id: dto.schoolId } })
  if (!school) throw new Error('School not found')

  return prisma.allowedLocation.create({ data: dto }) as unknown as AllowedLocationResponse
}

export const getAllowedLocations = async (
  schoolId: number,
  includeInactive = false
): Promise<AllowedLocationResponse[]> => {
  const where: any = { schoolId }
  if (!includeInactive) where.isActive = true

  return prisma.allowedLocation.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  }) as unknown as AllowedLocationResponse[]
}

export const updateAllowedLocation = async (
  id: number,
  dto: UpdateAllowedLocationDTO
): Promise<AllowedLocationResponse> => {
  const loc = await prisma.allowedLocation.findUnique({ where: { id } })
  if (!loc) throw new Error('Allowed location not found')

  return prisma.allowedLocation.update({
    where: { id },
    data: dto,
  }) as unknown as AllowedLocationResponse
}

export const deleteAllowedLocation = async (id: number): Promise<void> => {
  const loc = await prisma.allowedLocation.findUnique({ where: { id } })
  if (!loc) throw new Error('Allowed location not found')

  await prisma.allowedLocation.delete({ where: { id } })
}

// ─── Helper: build Prisma where clause ───────────────────────────────────────

const buildWhereClause = (filters: LocationVerificationFilters) => {
  const where: any = {}

  if (filters.teacherId) where.teacherId = filters.teacherId
  if (filters.lessonId)  where.lessonId  = filters.lessonId
  if (filters.status)    where.status    = filters.status

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate)
  }

  return where
}
