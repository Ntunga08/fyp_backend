import { Day } from '@prisma/client'
import prisma from '../config/prisma.js'
import type {
  CreateTimetableDTO,
  UpdateTimetableDTO,
  TimetableFilters,
  TimetableSlotResponse,
  DaySlots,
  MyScheduleResponse,
  SchoolTimetableResponse,
} from '../types/timetable.types.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ORDER: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

const teacherSelect = { id: true, name: true, email: true }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const transformToResponse = (slot: any): TimetableSlotResponse => {
  const [startTime, endTime] = slot.timeSlot.split('-')
  return {
    id:        String(slot.id),
    day:       slot.day,
    startTime: startTime.trim(),
    endTime:   endTime.trim(),
    subject:   slot.subject,
    className: slot.class,
    teacher:   slot.teacher.name,
    teacherId: slot.teacher.id,
    room:      slot.room ?? '',
  }
}

const combineTimeSlot = (startTime: string, endTime: string) => `${startTime}-${endTime}`

const parseTime = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const timeSlotsOverlap = (slot1: string, slot2: string): boolean => {
  const [s1, e1] = slot1.split('-').map(parseTime)
  const [s2, e2] = slot2.split('-').map(parseTime)
  return s1 < e2 && s2 < e1
}

const groupByDay = (slots: TimetableSlotResponse[]): DaySlots[] =>
  DAY_ORDER
    .map(day => ({ day, slots: slots.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime)) }))
    .filter(g => g.slots.length > 0)

// ─── Create ───────────────────────────────────────────────────────────────────

export const create = async (dto: CreateTimetableDTO): Promise<TimetableSlotResponse> => {
  let teacherId = dto.teacherId

  if (!teacherId && dto.teacher) {
    const t = await prisma.user.findFirst({ where: { name: dto.teacher, role: 'TEACHER' } })
    if (!t) throw new Error(`Teacher "${dto.teacher}" not found`)
    teacherId = t.id
  }

  if (!teacherId) throw new Error('Either teacherId or teacher name is required')

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } })
  if (!teacher)              throw new Error('Teacher not found')
  if (teacher.role !== 'TEACHER') throw new Error('Assigned user is not a teacher')
  if (!teacher.schoolId)         throw new Error('Teacher is not associated with a school')

  const timeSlot = combineTimeSlot(dto.startTime, dto.endTime)

  const existing = await prisma.timetable.findMany({
    where: { teacherId, day: dto.day },
    include: { teacher: { select: teacherSelect } },
  })

  for (const ex of existing) {
    if (timeSlotsOverlap(timeSlot, ex.timeSlot)) {
      const [s, e] = ex.timeSlot.split('-')
      throw new Error(`Teacher ${teacher.name} already has a class (${ex.subject}, ${ex.class}) on ${dto.day} from ${s} to ${e}.`)
    }
  }

  const slot = await prisma.timetable.create({
    data: {
      teacherId,
      schoolId: teacher.schoolId,
      subject:  dto.subject,
      class:    dto.className,
      day:      dto.day,
      timeSlot,
      room:     dto.room ?? null,
    },
    include: { teacher: { select: teacherSelect } },
  })

  return transformToResponse(slot)
}

// ─── Get all slots (admin/principal, management view) ────────────────────────

export const getAll = async (filters: TimetableFilters): Promise<TimetableSlotResponse[]> => {
  const where: any = {}
  if (filters.teacherId !== undefined) where.teacherId = filters.teacherId
  if (filters.day       !== undefined) where.day       = filters.day
  if (filters.className !== undefined) where.class     = filters.className
  if (filters.schoolId  !== undefined) where.schoolId  = filters.schoolId

  const slots = await prisma.timetable.findMany({
    where,
    include: { teacher: { select: teacherSelect } },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
  })

  return slots.map(transformToResponse)
}

// ─── My schedule: teacher's own slots (flat list) ────────────────────────────

export const getMyTimetable = async (teacherId: number): Promise<TimetableSlotResponse[]> => {
  const slots = await prisma.timetable.findMany({
    where:   { teacherId },
    include: { teacher: { select: teacherSelect } },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
  })
  return slots.map(transformToResponse)
}

// ─── My schedule: grouped by day with summary ────────────────────────────────

export const getMyScheduleGrouped = async (teacherId: number): Promise<MyScheduleResponse> => {
  const user = await prisma.user.findUnique({
    where:  { id: teacherId },
    select: { name: true },
  })

  const slots = await prisma.timetable.findMany({
    where:   { teacherId },
    include: { teacher: { select: teacherSelect } },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
  })

  const flat     = slots.map(transformToResponse)
  const subjects = [...new Set(flat.map(s => s.subject))].sort()

  return {
    teacherName:       user?.name ?? '',
    subjects,
    totalSlotsPerWeek: flat.length,
    schedule:          groupByDay(flat),
  }
}

// ─── School timetable: all slots for teacher's school ────────────────────────

export const getSchoolTimetable = async (
  schoolId:  number,
  day?:      Day,
  className?: string
): Promise<SchoolTimetableResponse> => {
  const school = await prisma.school.findUnique({
    where:  { id: schoolId },
    select: { name: true },
  })

  const where: any = { schoolId }
  if (day)       where.day   = day
  if (className) where.class = className

  const slots = await prisma.timetable.findMany({
    where,
    include: { teacher: { select: teacherSelect } },
    orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
  })

  const flat = slots.map(transformToResponse)

  return {
    schoolName: school?.name ?? '',
    filters:    { day, className },
    schedule:   groupByDay(flat),
  }
}

// ─── Schedule for a specific day (used at check-in time) ─────────────────────

export const getByDay = async (teacherId: number, day: Day): Promise<TimetableSlotResponse[]> => {
  const slots = await prisma.timetable.findMany({
    where:   { teacherId, day },
    include: { teacher: { select: teacherSelect } },
    orderBy: { timeSlot: 'asc' },
  })
  return slots.map(transformToResponse)
}

// ─── Single slot ──────────────────────────────────────────────────────────────

export const getById = async (id: number): Promise<TimetableSlotResponse> => {
  const slot = await prisma.timetable.findUnique({
    where:   { id },
    include: { teacher: { select: teacherSelect } },
  })
  if (!slot) throw new Error('Timetable slot not found')
  return transformToResponse(slot)
}

// ─── Update ───────────────────────────────────────────────────────────────────

export const update = async (id: number, dto: UpdateTimetableDTO): Promise<TimetableSlotResponse> => {
  const existing = await prisma.timetable.findUnique({
    where:   { id },
    include: { teacher: { select: teacherSelect } },
  })
  if (!existing) throw new Error('Timetable slot not found')

  let teacherId = dto.teacherId
  if (!teacherId && dto.teacher) {
    const t = await prisma.user.findFirst({ where: { name: dto.teacher, role: 'TEACHER' } })
    if (!t) throw new Error(`Teacher "${dto.teacher}" not found`)
    teacherId = t.id
  }

  if (teacherId && teacherId !== existing.teacherId) {
    const t = await prisma.user.findUnique({ where: { id: teacherId } })
    if (!t || t.role !== 'TEACHER') throw new Error('Invalid teacher ID')
  }

  const newTeacherId = teacherId ?? existing.teacherId
  const newDay       = dto.day ?? existing.day

  let newTimeSlot = existing.timeSlot
  if (dto.startTime && dto.endTime) {
    newTimeSlot = combineTimeSlot(dto.startTime, dto.endTime)
  } else if (dto.startTime || dto.endTime) {
    const [es, ee] = existing.timeSlot.split('-')
    newTimeSlot = combineTimeSlot(dto.startTime ?? es, dto.endTime ?? ee)
  }

  const others = await prisma.timetable.findMany({
    where:   { teacherId: newTeacherId, day: newDay, NOT: { id } },
    include: { teacher: { select: teacherSelect } },
  })

  for (const other of others) {
    if (timeSlotsOverlap(newTimeSlot, other.timeSlot)) {
      const [s, e] = other.timeSlot.split('-')
      throw new Error(`Teacher already has a class (${other.subject}, ${other.class}) on ${newDay} from ${s} to ${e}.`)
    }
  }

  const updateData: any = {}
  if (teacherId)                       updateData.teacherId = teacherId
  if (dto.subject)                     updateData.subject   = dto.subject
  if (dto.className)                   updateData.class     = dto.className
  if (dto.day)                         updateData.day       = dto.day
  if (newTimeSlot !== existing.timeSlot) updateData.timeSlot = newTimeSlot
  if (dto.room !== undefined)          updateData.room      = dto.room || null

  const updated = await prisma.timetable.update({
    where:   { id },
    data:    updateData,
    include: { teacher: { select: teacherSelect } },
  })

  return transformToResponse(updated)
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.timetable.findUnique({ where: { id } })
  if (!existing) throw new Error('Timetable slot not found')
  await prisma.timetable.delete({ where: { id } })
}
