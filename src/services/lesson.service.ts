import prisma from '../config/prisma'
import { getTodayAsDay } from '../utils/geolocation'
import type {
  RecordLessonDTO,
  UpdateLessonDTO,
  LessonFilters,
  LessonResponse,
  LessonInconsistency,
} from '../types/lesson.types'

// ─── Shared includes ──────────────────────────────────────────────────────────

const lessonInclude = {
  teacher: {
    select: { id: true, name: true, email: true },
  },
  timetable: {
    select: {
      id: true,
      subject: true,
      class: true,
      day: true,
      timeSlot: true,
      room: true,
    },
  },
}

// ─── Record a lesson (Teacher) ────────────────────────────────────────────────

export const recordLesson = async (
  teacherId: number,
  dto: RecordLessonDTO
): Promise<LessonResponse> => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Block weekends
  const day = getTodayAsDay()
  if (!day) {
    throw new Error('Lessons can only be recorded on weekdays (Mon – Fri)')
  }

  // Teacher must be checked in first
  const attendance = await prisma.attendance.findUnique({
    where: { teacherId_date: { teacherId, date: today } },
  })

  if (!attendance) {
    throw new Error('You must check in before recording a lesson')
  }

  if (attendance.status === 'ABSENT') {
    throw new Error('Cannot record a lesson — you are marked absent today')
  }

  // Timetable slot must belong to this teacher
  const slot = await prisma.timetable.findUnique({
    where: { id: dto.timetableId },
  })

  if (!slot) {
    throw new Error('Timetable slot not found')
  }

  if (slot.teacherId !== teacherId) {
    throw new Error('This timetable slot does not belong to you')
  }

  // Slot must be scheduled for today
  if (slot.day !== day) {
    throw new Error(
      `This slot is scheduled for ${slot.day}, not today (${day})`
    )
  }

  // Prevent duplicate lesson record for same slot + date
  const existing = await prisma.lesson.findUnique({
    where: { timetableId_date: { timetableId: dto.timetableId, date: today } },
  })

  if (existing) {
    throw new Error('Lesson already recorded for this slot today')
  }

  const lesson = await prisma.lesson.create({
    data: {
      teacherId,
      timetableId: dto.timetableId,
      date: today,
      status: 'CONDUCTED',
      notes: dto.notes ?? null,
    },
    include: lessonInclude,
  })

  return lesson as unknown as LessonResponse
}

// ─── Get own lessons (Teacher) ────────────────────────────────────────────────

export const getMyLessons = async (
  teacherId: number,
  filters: LessonFilters
): Promise<LessonResponse[]> => {
  const where = buildWhereClause({ ...filters, teacherId })

  const lessons = await prisma.lesson.findMany({
    where,
    include: lessonInclude,
    orderBy: [{ date: 'desc' }],
  })

  return lessons as unknown as LessonResponse[]
}

// ─── Get today's lessons for logged-in teacher ────────────────────────────────

export const getMyToday = async (teacherId: number): Promise<LessonResponse[]> => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lessons = await prisma.lesson.findMany({
    where: { teacherId, date: today },
    include: lessonInclude,
    orderBy: { createdAt: 'asc' },
  })

  return lessons as unknown as LessonResponse[]
}

// ─── Get all lessons (Admin/Principal) ───────────────────────────────────────

export const getAll = async (filters: LessonFilters): Promise<LessonResponse[]> => {
  const where = buildWhereClause(filters)

  const lessons = await prisma.lesson.findMany({
    where,
    include: lessonInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'asc' }],
  })

  return lessons as unknown as LessonResponse[]
}

// ─── Get single lesson by ID ──────────────────────────────────────────────────

export const getById = async (id: number): Promise<LessonResponse> => {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: lessonInclude,
  })

  if (!lesson) throw new Error('Lesson not found')

  return lesson as unknown as LessonResponse
}

// ─── Update lesson notes or status (Teacher own / Admin any) ─────────────────

export const update = async (
  id: number,
  requesterId: number,
  requesterRole: string,
  dto: UpdateLessonDTO
): Promise<LessonResponse> => {
  const lesson = await prisma.lesson.findUnique({ where: { id } })

  if (!lesson) throw new Error('Lesson not found')

  // Teacher can only update their own lessons
  if (requesterRole === 'TEACHER' && lesson.teacherId !== requesterId) {
    throw new Error('You can only update your own lessons')
  }

  const updated = await prisma.lesson.update({
    where: { id },
    data: dto,
    include: lessonInclude,
  })

  return updated as unknown as LessonResponse
}

// ─── Auto-generate MISSED lessons for a given date (Admin cron/manual) ───────
// Compares timetable slots vs recorded lessons for a given day

export const generateMissedLessons = async (date: Date): Promise<number> => {
  const normalizedDate = new Date(date)
  normalizedDate.setHours(0, 0, 0, 0)

  const dayMap: Record<number, string> = {
    1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY',
  }
  const dayOfWeek = normalizedDate.getDay()
  const day = dayMap[dayOfWeek]

  if (!day) throw new Error('Cannot generate missed lessons for weekends')

  // All timetable slots for this day
  const slots = await prisma.timetable.findMany({ where: { day: day as any } })

  let missedCount = 0

  for (const slot of slots) {
    // Check if a lesson was already recorded for this slot + date
    const recorded = await prisma.lesson.findUnique({
      where: { timetableId_date: { timetableId: slot.id, date: normalizedDate } },
    })

    if (!recorded) {
      // Check if teacher was present that day
      const attendance = await prisma.attendance.findUnique({
        where: { teacherId_date: { teacherId: slot.teacherId, date: normalizedDate } },
      })

      // Only mark MISSED if teacher was present but didn't record lesson
      const status = attendance && attendance.status !== 'ABSENT'
        ? 'MISSED'
        : 'MISSED'

      await prisma.lesson.create({
        data: {
          teacherId:   slot.teacherId,
          timetableId: slot.id,
          date:        normalizedDate,
          status,
          notes: 'Auto-generated — no lesson recorded',
        },
      })

      missedCount++
    }
  }

  return missedCount
}

// ─── Get inconsistencies ──────────────────────────────────────────────────────
// Teachers who checked in but have unrecorded lessons for today

export const getInconsistencies = async (
  date?: string
): Promise<LessonInconsistency[]> => {
  const targetDate = date ? new Date(date) : new Date()
  targetDate.setHours(0, 0, 0, 0)

  const dayMap: Record<number, string> = {
    1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY',
  }
  const day = dayMap[targetDate.getDay()]
  if (!day) return []

  // Teachers who checked in that day
  const presentTeachers = await prisma.attendance.findMany({
    where: { date: targetDate, status: { in: ['PRESENT', 'LATE'] } },
    include: { teacher: { select: { id: true, name: true } } },
  })

  const inconsistencies: LessonInconsistency[] = []

  for (const record of presentTeachers) {
    // Their timetable slots for that day
    const slots = await prisma.timetable.findMany({
      where: { teacherId: record.teacherId, day: day as any },
    })

    for (const slot of slots) {
      const lesson = await prisma.lesson.findUnique({
        where: {
          timetableId_date: { timetableId: slot.id, date: targetDate },
        },
      })

      if (!lesson) {
        inconsistencies.push({
          teacherId:   record.teacher.id,
          teacherName: record.teacher.name,
          date:        targetDate,
          timetableId: slot.id,
          subject:     slot.subject,
          class:       slot.class,
          timeSlot:    slot.timeSlot,
          issue:       'CHECKED_IN_NO_LESSON',
        })
      }
    }
  }

  return inconsistencies
}

// ─── Helper: build Prisma where clause ───────────────────────────────────────

const buildWhereClause = (filters: LessonFilters) => {
  const where: any = {}

  if (filters.teacherId)  where.teacherId  = filters.teacherId
  if (filters.status)     where.status     = filters.status
  if (filters.timetableId) where.timetableId = filters.timetableId

  if (filters.date) {
    const d = new Date(filters.date)
    d.setHours(0, 0, 0, 0)
    where.date = d
  }

  if (filters.startDate || filters.endDate) {
    where.date = {}
    if (filters.startDate) where.date.gte = new Date(filters.startDate)
    if (filters.endDate)   where.date.lte = new Date(filters.endDate)
  }

  return where
}