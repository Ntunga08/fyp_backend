import prisma from '../config/prisma.js'
import type {
  CreateHolidayDTO,
  UpdateHolidayDTO,
  HolidayFilters,
  HolidayResponse,
} from '../types/holiday.types.js'

const db = prisma as any

// Shared include 

const holidayInclude = {
  school: {
    select: { id: true, name: true },
  },
}

// Create holiday 

export const create = async (dto: CreateHolidayDTO): Promise<HolidayResponse> => {
  const date = new Date(dto.date)
  date.setHours(0, 0, 0, 0)

  // Verify school exists
  const school = await db.school.findUnique({
    where: { id: dto.schoolId },
  })

  if (!school) throw new Error('School not found')

  // Prevent duplicate holiday on same date for same school
  const existing = await db.schoolHoliday.findUnique({
    where: {
      schoolId_date: {
        schoolId: dto.schoolId,
        date,
      },
    },
  })

  if (existing) {
    throw new Error(
      `A holiday already exists on ${dto.date} for ${school.name}`
    )
  }

  const holiday = await db.schoolHoliday.create({
    data: {
      schoolId:    dto.schoolId,
      name:        dto.name,
      date,
      description: dto.description ?? null,
    },
    include: holidayInclude,
  })

  return holiday as HolidayResponse
}

// Get all holidays
export const getAll = async (filters: HolidayFilters): Promise<HolidayResponse[]> => {
  const where: any = {}

  if (filters.schoolId) where.schoolId = filters.schoolId

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.date = {}
    if (filters.startDate) where.date.gte = new Date(filters.startDate)
    if (filters.endDate)   where.date.lte = new Date(filters.endDate)
  }

  // Upcoming only — from today onwards
  if (filters.upcoming) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    where.date = { ...where.date, gte: today }
  }

  const holidays = await db.schoolHoliday.findMany({
    where,
    include: holidayInclude,
    orderBy: { date: 'asc' },
  })

  return holidays as HolidayResponse[]
}

// ─── Get holidays for logged-in user's school ─────────────────────────────────

export const getMySchoolHolidays = async (
  userId:  number,
  filters: HolidayFilters
): Promise<HolidayResponse[]> => {
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { schoolId: true },
  })

  if (!user) throw new Error('User not found')

  return getAll({ ...filters, schoolId: user.schoolId })
}

// ─── Get single holiday ───────────────────────────────────────────────────────

export const getById = async (id: number): Promise<HolidayResponse> => {
  const holiday = await db.schoolHoliday.findUnique({
    where:   { id },
    include: holidayInclude,
  })

  if (!holiday) throw new Error('Holiday not found')

  return holiday as HolidayResponse
}

// ─── Check if a specific date is a holiday ────────────────────────────────────
// Used by attendance.service.ts before allowing check-in

export const isHoliday = async (
  schoolId: number,
  date:     Date
): Promise<{ isHoliday: boolean; name?: string }> => {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)

  const holiday = await db.schoolHoliday.findUnique({
    where: {
      schoolId_date: {
        schoolId,
        date: normalized,
      },
    },
  })

  if (!holiday) return { isHoliday: false }

  return { isHoliday: true, name: holiday.name }
}

// ─── Get upcoming holidays (next 30 days) ─────────────────────────────────────

export const getUpcoming = async (
  schoolId: number,
  days:     number = 30
): Promise<HolidayResponse[]> => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const future = new Date(today)
  future.setDate(future.getDate() + days)

  const holidays = await db.schoolHoliday.findMany({
    where: {
      schoolId,
      date: { gte: today, lte: future },
    },
    include: holidayInclude,
    orderBy: { date: 'asc' },
  })

  return holidays as HolidayResponse[]
}

// ─── Update holiday ───────────────────────────────────────────────────────────

export const update = async (
  id:  number,
  dto: UpdateHolidayDTO
): Promise<HolidayResponse> => {
  const existing = await db.schoolHoliday.findUnique({ where: { id } })

  if (!existing) throw new Error('Holiday not found')

  // If changing date, check for duplicate on new date
  if (dto.date) {
    const newDate = new Date(dto.date)
    newDate.setHours(0, 0, 0, 0)

    const conflict = await db.schoolHoliday.findUnique({
      where: {
        schoolId_date: {
          schoolId: existing.schoolId,
          date:     newDate,
        },
      },
    })

    if (conflict && conflict.id !== id) {
      throw new Error(`A holiday already exists on ${dto.date} for this school`)
    }
  }

  const updated = await db.schoolHoliday.update({
    where: { id },
    data: {
      name:        dto.name        ?? undefined,
      date:        dto.date        ? new Date(dto.date) : undefined,
      description: dto.description ?? undefined,
    },
    include: holidayInclude,
  })

  return updated as HolidayResponse
}

// ─── Delete holiday ───────────────────────────────────────────────────────────

export const remove = async (id: number): Promise<void> => {
  const holiday = await db.schoolHoliday.findUnique({ where: { id } })

  if (!holiday) throw new Error('Holiday not found')

  await db.schoolHoliday.delete({ where: { id } })
}

// ─── Bulk create holidays (Tanzania public holidays for a year) ───────────────

export const bulkCreate = async (
  schoolId: number,
  year:     number
): Promise<{ created: number; skipped: number }> => {
  const school = await db.school.findUnique({ where: { id: schoolId } })
  if (!school) throw new Error('School not found')

  // Tanzania public holidays
  const tanzaniaHolidays = [
    { name: "New Year's Day",          month: 1,  day: 1  },
    { name: 'Zanzibar Revolution Day', month: 1,  day: 12 },
    { name: 'CCM Day',                 month: 2,  day: 5  },
    { name: 'Union Day',               month: 4,  day: 26 },
    { name: 'Workers Day',             month: 5,  day: 1  },
    { name: 'Saba Saba Day',           month: 7,  day: 7  },
    { name: 'Nane Nane Day',           month: 8,  day: 8  },
    { name: 'Nyerere Day',             month: 10, day: 14 },
    { name: 'Independence Day',        month: 12, day: 9  },
    { name: 'Christmas Day',           month: 12, day: 25 },
    { name: 'Boxing Day',              month: 12, day: 26 },
  ]

  let created = 0
  let skipped = 0

  for (const h of tanzaniaHolidays) {
    const date = new Date(year, h.month - 1, h.day)
    date.setHours(0, 0, 0, 0)

    // Skip weekends (holidays on weekends don't affect school days)
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      skipped++
      continue
    }

    try {
      await db.schoolHoliday.create({
        data: {
          schoolId,
          name:        h.name,
          date,
          description: `Tanzania public holiday ${year}`,
        },
      })
      created++
    } catch {
      // Skip duplicates silently
      skipped++
    }
  }

  return { created, skipped }
}