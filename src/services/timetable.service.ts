import { Day } from '@prisma/client'
import prisma from '../config/prisma'
import type {
  CreateTimetableDTO,
  UpdateTimetableDTO,
  TimetableFilters,
  TimetableResponse,
} from '../types/timetable.types'

// ─── Shared teacher select fields ─────────────────────────────────────────────

const teacherSelect = {
  id: true,
  name: true,
  email: true,
}

// ─── Create timetable slot ────────────────────────────────────────────────────

export const create = async (dto: CreateTimetableDTO): Promise<TimetableResponse> => {
  // Verify the teacher exists and has TEACHER role
  const teacher = await prisma.user.findUnique({
    where: { id: dto.teacherId },
  })

  if (!teacher) {
    throw new Error('Teacher not found')
  }

  if (teacher.role !== 'TEACHER') {
    throw new Error('Assigned user is not a teacher')
  }

  // Prevent duplicate slot: same teacher, same day, same time
  const conflict = await prisma.timetable.findFirst({
    where: {
      teacherId: dto.teacherId,
      day: dto.day,
      timeSlot: dto.timeSlot,
    },
  })

  if (conflict) {
    throw new Error(
      `Teacher already has a class on ${dto.day} at ${dto.timeSlot}`
    )
  }

  const slot = await prisma.timetable.create({
    data: {
      teacherId: dto.teacherId,
      schoolId: dto.schoolId,
      subject: dto.subject,
      class: dto.class,
      day: dto.day,
      timeSlot: dto.timeSlot,
      room: dto.room ?? null,
    },
    include: { teacher: { select: teacherSelect } },
  })

  return slot as TimetableResponse
}

// ─── Get all timetable slots (admin/principal — filterable) ───────────────────

export const getAll = async (filters: TimetableFilters): Promise<TimetableResponse[]> => {
  const where: any = {}

  if (filters.teacherId !== undefined) where.teacherId = filters.teacherId
  if (filters.day !== undefined) where.day = filters.day
  if (filters.class !== undefined) where.class = filters.class

  const slots = await prisma.timetable.findMany({
    where,
    include: { teacher: { select: teacherSelect } },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
  })

  return slots as TimetableResponse[]
}

// Get logged-in teacher's own timetable 

export const getMyTimetable = async (teacherId: number): Promise<TimetableResponse[]> => {
  const slots = await prisma.timetable.findMany({
    where: { teacherId },
    include: { teacher: { select: teacherSelect } },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
  })

  return slots as TimetableResponse[]
}

// Get timetable for a specific day (useful for check-in validation) 

export const getByDay = async (teacherId: number, day: Day): Promise<TimetableResponse[]> => {
  const slots = await prisma.timetable.findMany({
    where: { teacherId, day },
    include: { teacher: { select: teacherSelect } },
    orderBy: { timeSlot: 'asc' },
  })

  return slots as TimetableResponse[]
}

//  Get single slot by ID

export const getById = async (id: number): Promise<TimetableResponse> => {
  const slot = await prisma.timetable.findUnique({
    where: { id },
    include: { teacher: { select: teacherSelect } },
  })

  if (!slot) {
    throw new Error('Timetable slot not found')
  }

  return slot as TimetableResponse
}

// Update timetable slot 

export const update = async (
  id: number,
  dto: UpdateTimetableDTO
): Promise<TimetableResponse> => {
  const existing = await prisma.timetable.findUnique({ where: { id } })

  if (!existing) {
    throw new Error('Timetable slot not found')
  }

  // If changing teacherId, verify new teacher exists
  if (dto.teacherId) {
    const teacher = await prisma.user.findUnique({ where: { id: dto.teacherId } })
    if (!teacher || teacher.role !== 'TEACHER') {
      throw new Error('Invalid teacher ID')
    }
  }

  // Check for conflicts if day/time/teacher is being changed
  const newTeacherId = dto.teacherId ?? existing.teacherId
  const newDay       = dto.day       ?? existing.day
  const newTimeSlot  = dto.timeSlot  ?? existing.timeSlot

  const conflict = await prisma.timetable.findFirst({
    where: {
      teacherId: newTeacherId,
      day: newDay,
      timeSlot: newTimeSlot,
      NOT: { id },  // exclude current slot
    },
  })

  if (conflict) {
    throw new Error(
      `Teacher already has a class on ${newDay} at ${newTimeSlot}`
    )
  }

  const updated = await prisma.timetable.update({
    where: { id },
    data: dto,
    include: { teacher: { select: teacherSelect } },
  })

  return updated as TimetableResponse
}

//Delete timetable slot

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.timetable.findUnique({ where: { id } })

  if (!existing) {
    throw new Error('Timetable slot not found')
  }

  await prisma.timetable.delete({ where: { id } })
}