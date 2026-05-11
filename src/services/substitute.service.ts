import prisma from '../config/prisma.js'
import { notify } from '../utils/notify.js'
import type {
  AssignSubstituteDTO,
  RecordSubstituteLessonDTO,
  SubstituteFilters,
  SubstituteResponse,
} from '../types/substitute.types.js'

// ─── Shared include ───────────────────────────────────────────────────────────

const substituteInclude = {
  originalTeacher: {
    select: { id: true, name: true, email: true },
  },
  substituteTeacher: {
    select: { id: true, name: true, email: true },
  },
  lesson: {
    select: {
      id:     true,
      status: true,
      notes:  true,
      timetable: {
        select: {
          subject:  true,
          class:    true,
          day:      true,
          timeSlot: true,
          room:     true,
        },
      },
    },
  },
}

// ─── Assign substitute (Admin) ────────────────────────────────────────────────

export const assign = async (
  dto: AssignSubstituteDTO
): Promise<SubstituteResponse> => {

  // Verify lesson exists
  const lesson = await prisma.lesson.findUnique({
    where: { id: dto.lessonId },
    include: { timetable: true },
  })

  if (!lesson) {
    throw new Error('Lesson not found')
  }

  // Lesson must be MISSED to assign a substitute
  if (lesson.status !== 'MISSED') {
    throw new Error(
      `Cannot assign substitute — lesson status is ${lesson.status}. Only MISSED lessons can be substituted`
    )
  }

  // Verify substitute teacher exists and has TEACHER role
  const subTeacher = await prisma.user.findUnique({
    where: { id: dto.substituteTeacherId },
  })

  if (!subTeacher) {
    throw new Error('Substitute teacher not found')
  }

  if (subTeacher.role !== 'TEACHER') {
    throw new Error('Assigned user is not a teacher')
  }

  if (!subTeacher.isActive) {
    throw new Error('Substitute teacher account is deactivated')
  }

  // Substitute can't be the original teacher
  if (dto.substituteTeacherId === lesson.teacherId) {
    throw new Error('Substitute teacher cannot be the same as the original teacher')
  }

  // Prevent double assignment on the same lesson
  const existingSub = await prisma.substitute.findUnique({
    where: { lessonId: dto.lessonId },
  })

  if (existingSub) {
    throw new Error('A substitute has already been assigned to this lesson')
  }

  // Check substitute teacher has no clash on same day + timeSlot
  const clash = await prisma.timetable.findFirst({
    where: {
      teacherId: dto.substituteTeacherId,
      day:       lesson.timetable.day,
      timeSlot:  lesson.timetable.timeSlot,
    },
  })

  if (clash) {
    throw new Error(
      `Substitute teacher already has a class on ${lesson.timetable.day} at ${lesson.timetable.timeSlot}`
    )
  }

  // Create substitute record + update lesson status in a transaction
  const [substitute] = await prisma.$transaction([
    prisma.substitute.create({
      data: {
        originalTeacherId:   lesson.teacherId,
        substituteTeacherId: dto.substituteTeacherId,
        lessonId:            dto.lessonId,
        date:                lesson.date,
        reason:              dto.reason ?? null,
      },
      include: substituteInclude,
    }),
    prisma.lesson.update({
      where: { id: dto.lessonId },
      data:  { status: 'SUBSTITUTED' },
    }),
  ])

  await notify.substituteAssigned(
    dto.substituteTeacherId,
    lesson.timetable.subject,
    lesson.timetable.class,
    lesson.timetable.day,
    lesson.timetable.timeSlot
  )

  return substitute as unknown as SubstituteResponse
}

// ─── Substitute teacher records the lesson ────────────────────────────────────

export const recordSubstituteLesson = async (
  substituteId: number,
  teacherId: number,
  dto: RecordSubstituteLessonDTO
): Promise<SubstituteResponse> => {

  const substitute = await prisma.substitute.findUnique({
    where: { id: substituteId },
    include: { lesson: true },
  })

  if (!substitute) {
    throw new Error('Substitute assignment not found')
  }

  // Only the assigned substitute can record this
  if (substitute.substituteTeacherId !== teacherId) {
    throw new Error('You are not the assigned substitute for this lesson')
  }

  // Update lesson notes if provided
  if (dto.notes) {
    await prisma.lesson.update({
      where: { id: substitute.lessonId },
      data:  { notes: dto.notes },
    })
  }

  const updated = await prisma.substitute.findUnique({
    where:   { id: substituteId },
    include: substituteInclude,
  })

  return updated as unknown as SubstituteResponse
}

// ─── Get my substitute assignments (as substitute teacher) ────────────────────

export const getMyAssignments = async (
  substituteTeacherId: number,
  filters: SubstituteFilters
): Promise<SubstituteResponse[]> => {
  const where = buildWhereClause({ ...filters, substituteTeacherId })

  const results = await prisma.substitute.findMany({
    where,
    include: substituteInclude,
    orderBy: { date: 'desc' },
  })

  return results as unknown as SubstituteResponse[]
}

// ─── Get substitutes for my lessons (as original teacher) ────────────────────

export const getMyLessonSubstitutes = async (
  originalTeacherId: number,
  filters: SubstituteFilters
): Promise<SubstituteResponse[]> => {
  const where = buildWhereClause({ ...filters, originalTeacherId })

  const results = await prisma.substitute.findMany({
    where,
    include: substituteInclude,
    orderBy: { date: 'desc' },
  })

  return results as unknown as SubstituteResponse[]
}

// ─── Get all substitutes (Admin/Principal) ────────────────────────────────────

export const getAll = async (
  filters: SubstituteFilters
): Promise<SubstituteResponse[]> => {
  const where = buildWhereClause(filters)

  const results = await prisma.substitute.findMany({
    where,
    include: substituteInclude,
    orderBy: { date: 'desc' },
  })

  return results as unknown as SubstituteResponse[]
}

// ─── Get single substitute by ID ──────────────────────────────────────────────

export const getById = async (id: number): Promise<SubstituteResponse> => {
  const result = await prisma.substitute.findUnique({
    where:   { id },
    include: substituteInclude,
  })

  if (!result) throw new Error('Substitute record not found')

  return result as unknown as SubstituteResponse
}

// ─── Unassign substitute (Admin) ──────────────────────────────────────────────

export const unassign = async (id: number): Promise<void> => {
  const substitute = await prisma.substitute.findUnique({
    where: { id },
  })

  if (!substitute) throw new Error('Substitute record not found')

  // Revert lesson back to MISSED + delete substitute record in a transaction
  await prisma.$transaction([
    prisma.lesson.update({
      where: { id: substitute.lessonId },
      data:  { status: 'MISSED' },
    }),
    prisma.substitute.delete({
      where: { id },
    }),
  ])
}

// ─── Helper: build Prisma where clause ───────────────────────────────────────

const buildWhereClause = (filters: SubstituteFilters) => {
  const where: any = {}

  if (filters.originalTeacherId)   where.originalTeacherId   = filters.originalTeacherId
  if (filters.substituteTeacherId) where.substituteTeacherId = filters.substituteTeacherId

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