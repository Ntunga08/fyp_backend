import prisma from '../config/prisma.js'
import { notify } from '../utils/notify.js'
import type {
  AssignSubstituteDTO,
  RecordSubstituteLessonDTO,
  SubstituteFilters,
  SubstituteResponse,
} from '../types/substitute.types.js'

// ─── DB include ───────────────────────────────────────────────────────────────

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

// ─── Transform raw DB record → clean response ─────────────────────────────────

const transform = (raw: any): SubstituteResponse => {
  const tt = raw.lesson.timetable
  const parts     = (tt.timeSlot as string).split('-')
  const startTime = parts[0]?.trim() ?? ''
  const endTime   = parts[1]?.trim() ?? ''

  return {
    id:      raw.id,
    date:    (raw.date as Date).toISOString().split('T')[0],
    summary: `${raw.substituteTeacher.name} covering for ${raw.originalTeacher.name}`,
    coveringFor: {
      id:    raw.originalTeacher.id,
      name:  raw.originalTeacher.name,
      email: raw.originalTeacher.email,
    },
    coveredBy: {
      id:    raw.substituteTeacher.id,
      name:  raw.substituteTeacher.name,
      email: raw.substituteTeacher.email,
    },
    lesson: {
      id:           raw.lesson.id,
      subject:      tt.subject,
      className:    tt.class,
      day:          tt.day,
      startTime,
      endTime,
      room:         tt.room ?? '',
      lessonStatus: raw.lesson.status,
      notes:        raw.lesson.notes,
    },
    reason:    raw.reason,
    createdAt: (raw.createdAt as Date).toISOString(),
  }
}

// ─── Assign substitute (Admin) ────────────────────────────────────────────────

export const assign = async (dto: AssignSubstituteDTO): Promise<SubstituteResponse> => {
  const lesson = await prisma.lesson.findUnique({
    where:   { id: dto.lessonId },
    include: { timetable: true },
  })

  if (!lesson) throw new Error('Lesson not found')

  if (lesson.status !== 'MISSED') {
    throw new Error(
      `Cannot assign substitute — lesson status is ${lesson.status}. Only MISSED lessons can be substituted`
    )
  }

  const subTeacher = await prisma.user.findUnique({ where: { id: dto.substituteTeacherId } })

  if (!subTeacher)                   throw new Error('Substitute teacher not found')
  if (subTeacher.role !== 'TEACHER') throw new Error('Assigned user is not a teacher')
  if (!subTeacher.isActive)          throw new Error('Substitute teacher account is deactivated')

  if (dto.substituteTeacherId === lesson.teacherId) {
    throw new Error('Substitute teacher cannot be the same as the original teacher')
  }

  const existingSub = await prisma.substitute.findUnique({ where: { lessonId: dto.lessonId } })
  if (existingSub) throw new Error('A substitute has already been assigned to this lesson')

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

  return transform(substitute)
}

// ─── Substitute records notes for the covered lesson ─────────────────────────

export const recordSubstituteLesson = async (
  substituteId: number,
  teacherId:    number,
  dto:          RecordSubstituteLessonDTO
): Promise<SubstituteResponse> => {
  const substitute = await prisma.substitute.findUnique({
    where:   { id: substituteId },
    include: { lesson: true },
  })

  if (!substitute) throw new Error('Substitute assignment not found')

  if (substitute.substituteTeacherId !== teacherId) {
    throw new Error('You are not the assigned substitute for this lesson')
  }

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

  return transform(updated)
}

// ─── My substitute assignments (as the covering teacher) ─────────────────────

export const getMyAssignments = async (
  substituteTeacherId: number,
  filters:             SubstituteFilters
): Promise<SubstituteResponse[]> => {
  const results = await prisma.substitute.findMany({
    where:   buildWhere({ ...filters, substituteTeacherId }),
    include: substituteInclude,
    orderBy: { date: 'desc' },
  })
  return results.map(transform)
}

// ─── Who covered my lessons (as the original/absent teacher) ─────────────────

export const getMyLessonSubstitutes = async (
  originalTeacherId: number,
  filters:           SubstituteFilters
): Promise<SubstituteResponse[]> => {
  const results = await prisma.substitute.findMany({
    where:   buildWhere({ ...filters, originalTeacherId }),
    include: substituteInclude,
    orderBy: { date: 'desc' },
  })
  return results.map(transform)
}

// ─── All substitutes in school (Admin/Principal) ──────────────────────────────

export const getAll = async (filters: SubstituteFilters): Promise<SubstituteResponse[]> => {
  const results = await prisma.substitute.findMany({
    where:   buildWhere(filters),
    include: substituteInclude,
    orderBy: { date: 'desc' },
  })
  return results.map(transform)
}

// ─── Single record ────────────────────────────────────────────────────────────

export const getById = async (id: number): Promise<SubstituteResponse> => {
  const result = await prisma.substitute.findUnique({
    where:   { id },
    include: substituteInclude,
  })
  if (!result) throw new Error('Substitute record not found')
  return transform(result)
}

// ─── Unassign (revert lesson to MISSED) ──────────────────────────────────────

export const unassign = async (id: number): Promise<void> => {
  const substitute = await prisma.substitute.findUnique({ where: { id } })
  if (!substitute) throw new Error('Substitute record not found')

  await prisma.$transaction([
    prisma.lesson.update({
      where: { id: substitute.lessonId },
      data:  { status: 'MISSED' },
    }),
    prisma.substitute.delete({ where: { id } }),
  ])
}

// ─── Where clause builder ─────────────────────────────────────────────────────

const buildWhere = (filters: SubstituteFilters) => {
  const where: any = {}

  if (filters.originalTeacherId)   where.originalTeacherId   = filters.originalTeacherId
  if (filters.substituteTeacherId) where.substituteTeacherId = filters.substituteTeacherId

  // Scope to a school by joining through the lesson → timetable → schoolId
  if (filters.schoolId) {
    where.lesson = { timetable: { schoolId: filters.schoolId } }
  }

  if (filters.date) {
    const d = new Date(filters.date)
    d.setHours(0, 0, 0, 0)
    where.date = d
  } else if (filters.startDate || filters.endDate) {
    where.date = {}
    if (filters.startDate) where.date.gte = new Date(filters.startDate)
    if (filters.endDate)   where.date.lte = new Date(filters.endDate)
  }

  return where
}
