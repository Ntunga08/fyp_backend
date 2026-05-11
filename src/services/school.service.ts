import prisma from '../config/prisma.js'
import type {
  CreateSchoolDTO,
  UpdateSchoolDTO,
  SchoolFilters,
  SchoolResponse,
} from '../types/school.types.js'

const db = prisma as any

// ─── Create school ────────────────────────────────────────────────────────────

export const create = async (dto: CreateSchoolDTO): Promise<SchoolResponse> => {

  // Prevent duplicate school name
  const existing = await db.school.findFirst({
    where: { name: { equals: dto.name, mode: 'insensitive' } },
  })

  if (existing) {
    throw new Error(`A school named "${dto.name}" already exists`)
  }

  // Validate GPS coords are realistic
  if (dto.latitude < -90 || dto.latitude > 90) {
    throw new Error('Invalid latitude. Must be between -90 and 90')
  }
  if (dto.longitude < -180 || dto.longitude > 180) {
    throw new Error('Invalid longitude. Must be between -180 and 180')
  }

  const school = await db.school.create({
    data: {
      name:             dto.name,
      address:          dto.address          ?? null,
      latitude:         dto.latitude,
      longitude:        dto.longitude,
      radiusMetres:     dto.radiusMetres      ?? 100,
      lateCutoffHour:   dto.lateCutoffHour    ?? 8,
      lateCutoffMinute: dto.lateCutoffMinute  ?? 15,
    },
    include: { _count: { select: { users: true, timetables: true, holidays: true } } },
  })

  return school as SchoolResponse
}

// ─── Get all schools ──────────────────────────────────────────────────────────

export const getAll = async (filters: SchoolFilters): Promise<SchoolResponse[]> => {
  const where: any = {}

  if (filters.isActive !== undefined) where.isActive = filters.isActive
  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' }
  }

  const schools = await db.school.findMany({
    where,
    include: { _count: { select: { users: true, timetables: true, holidays: true } } },
    orderBy: { name: 'asc' },
  })

  return schools as SchoolResponse[]
}

// ─── Get single school by ID ──────────────────────────────────────────────────

export const getById = async (id: number): Promise<SchoolResponse> => {
  const school = await db.school.findUnique({
    where:   { id },
    include: { _count: { select: { users: true, timetables: true, holidays: true } } },
  })

  if (!school) throw new Error('School not found')

  return school as SchoolResponse
}

// ─── Get school by user (for teachers/admins to see their school) ─────────────

export const getMySchool = async (userId: number): Promise<SchoolResponse> => {
  const user = await db.user.findUnique({
    where:   { id: userId },
    include: {
      school: {
        include: { _count: { select: { users: true, timetables: true, holidays: true } } },
      },
    },
  })

  if (!user) throw new Error('User not found')
  if (!user.school) throw new Error('School not found')

  return user.school as SchoolResponse
}

// ─── Update school ────────────────────────────────────────────────────────────

export const update = async (
  id:  number,
  dto: UpdateSchoolDTO
): Promise<SchoolResponse> => {
  const existing = await db.school.findUnique({ where: { id } })

  if (!existing) throw new Error('School not found')

  // If renaming, check no duplicate
  if (dto.name && dto.name !== existing.name) {
    const conflict = await db.school.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        NOT:  { id },
      },
    })
    if (conflict) throw new Error(`A school named "${dto.name}" already exists`)
  }

  // Validate coords if provided
  if (dto.latitude  !== undefined && (dto.latitude  < -90  || dto.latitude  > 90))  {
    throw new Error('Invalid latitude. Must be between -90 and 90')
  }
  if (dto.longitude !== undefined && (dto.longitude < -180 || dto.longitude > 180)) {
    throw new Error('Invalid longitude. Must be between -180 and 180')
  }

  const updated = await db.school.update({
    where:   { id },
    data:    dto,
    include: { _count: { select: { users: true, timetables: true, holidays: true } } },
  })

  return updated as SchoolResponse
}

// ─── Deactivate school (soft delete) ─────────────────────────────────────────

export const deactivate = async (id: number): Promise<void> => {
  const school = await db.school.findUnique({ where: { id } })

  if (!school)         throw new Error('School not found')
  if (!school.isActive) throw new Error('School is already deactivated')

  await db.school.update({
    where: { id },
    data:  { isActive: false },
  })
}

// ─── Reactivate school ────────────────────────────────────────────────────────

export const reactivate = async (id: number): Promise<SchoolResponse> => {
  const school = await db.school.findUnique({ where: { id } })

  if (!school)        throw new Error('School not found')
  if (school.isActive) throw new Error('School is already active')

  const updated = await db.school.update({
    where:   { id },
    data:    { isActive: true },
    include: { _count: { select: { users: true, timetables: true, holidays: true } } },
  })

  return updated as SchoolResponse
}

// ─── Get school stats ─────────────────────────────────────────────────────────

export const getStats = async (id: number) => {
  const school = await db.school.findUnique({ where: { id } })
  if (!school) throw new Error('School not found')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalTeachers,
    activeTeachers,
    totalAdmins,
    todayAttendance,
    todayLessons,
    pendingLeaves,
  ] = await Promise.all([
    db.user.count({ where: { schoolId: id, role: 'TEACHER' } }),
    db.user.count({ where: { schoolId: id, role: 'TEACHER', isActive: true } }),
    db.user.count({ where: { schoolId: id, role: 'ADMIN' } }),
    db.attendance.count({
      where: {
        date:    today,
        teacher: { schoolId: id },
      },
    }),
    db.lesson.count({
      where: {
        date:    today,
        teacher: { schoolId: id },
      },
    }),
    db.leaveRequest.count({
      where: {
        status:  'PENDING',
        teacher: { schoolId: id },
      },
    }),
  ])

  return {
    schoolId:       id,
    schoolName:     school.name,
    totalTeachers,
    activeTeachers,
    totalAdmins,
    todayAttendance,
    todayLessons,
    pendingLeaves,
    settings: {
      radiusMetres:     school.radiusMetres,
      lateCutoffHour:   school.lateCutoffHour,
      lateCutoffMinute: school.lateCutoffMinute,
    },
  }
}