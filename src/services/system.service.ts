import prisma from '../config/prisma.js'

// ─── Platform stats (top-level numbers) ──────────────────────────────────────

export const getPlatformStats = async () => {
  const [
    totalSchools,
    activeSchools,
    inactiveSchools,
    totalUsers,
    totalTeachers,
    totalAdmins,
    totalPrincipals,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { isActive: true } }),
    prisma.school.count({ where: { isActive: false } }),
    prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'PRINCIPAL' } }),
  ])

  return {
    schools: { total: totalSchools, active: activeSchools, inactive: inactiveSchools },
    users:   { total: totalUsers, teachers: totalTeachers, admins: totalAdmins, principals: totalPrincipals },
  }
}

// ─── All schools with per-school staff counts (no attendance/lesson data) ─────

export const getAllSchools = async (search?: string) => {
  const where: any = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const schools = await prisma.school.findMany({
    where,
    orderBy: { name: 'asc' },
  })

  const result = await Promise.all(
    schools.map(async (school) => {
      const [teachers, admins, principals, pendingUsers] = await Promise.all([
        prisma.user.count({ where: { schoolId: school.id, role: 'TEACHER',   isActive: true } }),
        prisma.user.count({ where: { schoolId: school.id, role: 'ADMIN',     isActive: true } }),
        prisma.user.count({ where: { schoolId: school.id, role: 'PRINCIPAL', isActive: true } }),
        prisma.user.count({ where: { schoolId: school.id, status: 'PENDING' } }),
      ])

      return {
        id:           school.id,
        name:         school.name,
        address:      school.address,
        latitude:     school.latitude,
        longitude:    school.longitude,
        radiusMetres: school.radiusMetres,
        isActive:     school.isActive,
        createdAt:    school.createdAt,
        staff:        { teachers, admins, principals, pendingApprovals: pendingUsers },
      }
    })
  )

  return result
}

// ─── Single school profile (identity + staff counts, no operational data) ─────

export const getSchoolById = async (id: number) => {
  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) throw new Error('School not found')

  const [teachers, admins, principals, activeTeachers, pendingUsers] = await Promise.all([
    prisma.user.count({ where: { schoolId: id, role: 'TEACHER' } }),
    prisma.user.count({ where: { schoolId: id, role: 'ADMIN' } }),
    prisma.user.count({ where: { schoolId: id, role: 'PRINCIPAL' } }),
    prisma.user.count({ where: { schoolId: id, role: 'TEACHER', isActive: true } }),
    prisma.user.count({ where: { schoolId: id, status: 'PENDING' } }),
  ])

  return {
    id:           school.id,
    name:         school.name,
    address:      school.address,
    latitude:     school.latitude,
    longitude:    school.longitude,
    radiusMetres: school.radiusMetres,
    isActive:     school.isActive,
    settings: {
      lateCutoffHour:   school.lateCutoffHour,
      lateCutoffMinute: school.lateCutoffMinute,
    },
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
    staff: {
      total:            teachers + admins + principals,
      teachers,
      activeTeachers,
      admins,
      principals,
      pendingApprovals: pendingUsers,
    },
  }
}

// ─── Activate / deactivate a school ──────────────────────────────────────────

export const setSchoolStatus = async (id: number, isActive: boolean) => {
  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) throw new Error('School not found')

  return prisma.school.update({
    where:  { id },
    data:   { isActive },
    select: { id: true, name: true, isActive: true, updatedAt: true },
  })
}

// ─── Register a new school (SUPER_ADMIN only) ─────────────────────────────────

export const createSchool = async (data: {
  name:              string
  address?:          string
  latitude:          number
  longitude:         number
  radiusMetres?:     number
  lateCutoffHour?:   number
  lateCutoffMinute?: number
}) => {
  const existing = await prisma.school.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  })
  if (existing) throw new Error(`A school named "${data.name}" already exists`)

  if (data.latitude < -90  || data.latitude > 90)   throw new Error('Invalid latitude')
  if (data.longitude < -180 || data.longitude > 180) throw new Error('Invalid longitude')

  const radius = data.radiusMetres ?? 100

  const school = await prisma.school.create({
    data: {
      name:             data.name,
      address:          data.address          ?? null,
      latitude:         data.latitude,
      longitude:        data.longitude,
      radiusMetres:     radius,
      lateCutoffHour:   data.lateCutoffHour   ?? 8,
      lateCutoffMinute: data.lateCutoffMinute ?? 0,
    },
  })

  await prisma.allowedLocation.create({
    data: {
      schoolId:     school.id,
      name:         'Main Campus',
      latitude:     data.latitude,
      longitude:    data.longitude,
      radiusMetres: radius,
      isActive:     true,
    },
  })

  return school
}

// ─── List all SUPER_ADMIN accounts ───────────────────────────────────────────

export const getSuperAdmins = async () => {
  return prisma.user.findMany({
    where:   { role: 'SUPER_ADMIN' },
    select:  { id: true, name: true, email: true, status: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
}
