import { Prisma } from '@prisma/client'
import prisma from '../config/prisma.js'
import { notify } from '../utils/notify.js'
import {
  leaveSubmittedEmail,
  leaveApprovedEmail,
  leaveRejectedEmail,
} from '../utils/email.js'
import type {
  CreateLeaveDTO,
  ReviewLeaveDTO,
  LeaveFilters,
  LeaveResponse,
} from '../types/leave.types.js'

const db = prisma as any

//Shared include 

const leaveInclude = {
  teacher: {
    select: { id: true, name: true, email: true, phone: true },
  },
  reviewer: {
    select: { id: true, name: true },
  },
}

// Helper: count working days between two dates 

const countWorkingDays = (start: Date, end: Date): number => {
  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++  // skip Sunday(0) and Saturday(6)
    current.setDate(current.getDate() + 1)
  }

  return count
}

//  Helper: get all working dates in a range 
const getWorkingDates = (start: Date, end: Date): Date[] => {
  const dates: Date[] = []
  const current = new Date(start)

  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

//  Helper: normalize to safe response
const sanitize = (leave: any): LeaveResponse => ({
  ...leave,
  daysRequested: countWorkingDays(leave.startDate, leave.endDate),
})

const formatDate = (date: Date): string => date.toLocaleDateString('en-CA')

// Apply for leave (Teacher)

export const apply = async (
  teacherId: number,
  dto:       CreateLeaveDTO
): Promise<LeaveResponse> => {

  const start = new Date(dto.startDate)
  const end   = new Date(dto.endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  // Start must not be in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (start < today) {
    throw new Error('Leave start date cannot be in the past')
  }

  // End must be >= start
  if (end < start) {
    throw new Error('End date cannot be before start date')
  }

  // Check for overlapping leave requests
  const overlap = await db.leaveRequest.findFirst({
    where: {
      teacherId,
      status:    { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: end },
      endDate:   { gte: start },
    },
  })

  if (overlap) {
    throw new Error(
      `You already have a ${overlap.status.toLowerCase()} leave request overlapping these dates`
    )
  }

  const leave = await db.leaveRequest.create({
    data: {
      teacherId,
      startDate: start,
      endDate:   end,
      reason:    dto.reason,
    },
    include: leaveInclude,
  })

  // Email all active admins/principals in the same school
  const teacher = await prisma.user.findUnique({
    where:  { id: teacherId },
    select: { name: true, schoolId: true },
  })
  if (teacher?.schoolId) {
    const admins = await prisma.user.findMany({
      where: {
        schoolId: teacher.schoolId,
        role:     { in: ['ADMIN', 'PRINCIPAL'] },
        status:   'ACTIVE',
        isActive: true,
      },
      select: { name: true, email: true },
    })
    const days = countWorkingDays(start, end)
    for (const admin of admins) {
      void leaveSubmittedEmail({
        adminEmail:  admin.email,
        adminName:   admin.name,
        teacherName: teacher.name,
        startDate:   formatDate(start),
        endDate:     formatDate(end),
        days,
        reason:      dto.reason,
      })
    }
  }

  return sanitize(leave)
}

//Get own leave requests (Teacher)

export const getMyLeaves = async (
  teacherId: number,
  filters:   LeaveFilters
): Promise<LeaveResponse[]> => {
  const where = buildWhereClause({ ...filters, teacherId })

  const leaves = await db.leaveRequest.findMany({
    where,
    include: leaveInclude,
    orderBy: { createdAt: 'desc' },
  })

  return leaves.map(sanitize)
}

//  Get all leave requests (Admin/Principal) 

export const getAll = async (filters: LeaveFilters): Promise<LeaveResponse[]> => {
  const where = buildWhereClause(filters)

  const leaves = await db.leaveRequest.findMany({
    where,
    include: leaveInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return leaves.map(sanitize)
}

// Get single leave request

export const getById = async (id: number): Promise<LeaveResponse> => {
  const leave = await db.leaveRequest.findUnique({
    where:   { id },
    include: leaveInclude,
  })

  if (!leave) throw new Error('Leave request not found')

  return sanitize(leave)
}

//  Approve leave (Admin/Principal) 
// Automatically:
// 1. Marks attendance ABSENT for each working day
// 2. Generates MISSED lessons for those days

export const approve = async (
  id:          number,
  reviewerId:  number,
  dto:         ReviewLeaveDTO
): Promise<LeaveResponse> => {

  const leave = await db.leaveRequest.findUnique({
    where:   { id },
    include: { teacher: true },
  })

  if (!leave) throw new Error('Leave request not found')

  if (leave.status !== 'PENDING') {
    throw new Error(`Cannot approve — leave is already ${leave.status}`)
  }

  const workingDates = getWorkingDates(leave.startDate, leave.endDate)

  //Run everything in a transaction 
  await db.$transaction(async (tx: any) => {

    // 1. Approve the leave
    await tx.leaveRequest.update({
      where: { id },
      data: {
        status:     'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote ?? null,
      },
    })

    for (const date of workingDates) {
      const normalizedDate = new Date(date)
      normalizedDate.setHours(0, 0, 0, 0)

      // 2. Mark attendance ABSENT for each day (skip if already exists)
      const existingAtt = await tx.attendance.findUnique({
        where: {
          teacherId_date: {
            teacherId: leave.teacherId,
            date:      normalizedDate,
          },
        },
      })

      if (!existingAtt) {
        await tx.attendance.create({
          data: {
            teacherId: leave.teacherId,
            date:      normalizedDate,
            timeIn:    normalizedDate,   // placeholder for absent
            latitude:  0,
            longitude: 0,
            status:    'ABSENT',
          },
        })
      }

      // 3. Get day name for timetable lookup
      const dayMap: Record<number, string> = {
        1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY',
        4: 'THURSDAY', 5: 'FRIDAY',
      }
      const dayName = dayMap[normalizedDate.getDay()]
      if (!dayName) continue

      // 4. Get teacher's timetable slots for that day
      const slots = await tx.timetable.findMany({
        where: { teacherId: leave.teacherId, day: dayName as any },
      })

      // 5. Generate MISSED lessons for each unrecorded slot
      for (const slot of slots) {
        const existingLesson = await tx.lesson.findUnique({
          where: {
            timetableId_date: {
              timetableId: slot.id,
              date:        normalizedDate,
            },
          },
        })

        if (!existingLesson) {
          await tx.lesson.create({
            data: {
              teacherId:   leave.teacherId,
              timetableId: slot.id,
              date:        normalizedDate,
              status:      'MISSED',
              notes:       `Auto-generated — approved leave request #${id}`,
            },
          })
        }
      }
    }
  })

  const updated = await db.leaveRequest.findUnique({
    where:   { id },
    include: leaveInclude,
  })

  if (!updated) {
    throw new Error('Leave request not found')
  }

  await notify.leaveApproved(
    leave.teacherId,
    formatDate(leave.startDate),
    formatDate(leave.endDate)
  )

  void leaveApprovedEmail({
    teacherEmail: leave.teacher.email,
    teacherName:  leave.teacher.name,
    startDate:    formatDate(leave.startDate),
    endDate:      formatDate(leave.endDate),
    days:         countWorkingDays(leave.startDate, leave.endDate),
    note:         dto.reviewNote ?? undefined,
  })

  return sanitize(updated)
}

//  Reject leave (Admin/Principal)

export const reject = async (
  id:         number,
  reviewerId: number,
  dto:        ReviewLeaveDTO
): Promise<LeaveResponse> => {

  const leave = await db.leaveRequest.findUnique({
    where:   { id },
    include: { teacher: { select: { name: true, email: true } } },
  })

  if (!leave) throw new Error('Leave request not found')

  if (leave.status !== 'PENDING') {
    throw new Error(`Cannot reject — leave is already ${leave.status}`)
  }

  const updated = await db.leaveRequest.update({
    where: { id },
    data: {
      status:     'REJECTED',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNote: dto.reviewNote ?? null,
    },
    include: leaveInclude,
  })

  await notify.leaveRejected(
    leave.teacherId,
    formatDate(leave.startDate),
    formatDate(leave.endDate),
    dto.reviewNote ?? undefined
  )

  void leaveRejectedEmail({
    teacherEmail: leave.teacher.email,
    teacherName:  leave.teacher.name,
    startDate:    formatDate(leave.startDate),
    endDate:      formatDate(leave.endDate),
    note:         dto.reviewNote ?? undefined,
  })

  return sanitize(updated)
}

//  Cancel leave (Teacher cancels their own PENDING request)

export const cancel = async (
  id:        number,
  teacherId: number
): Promise<void> => {

  const leave = await db.leaveRequest.findUnique({ where: { id } })

  if (!leave) throw new Error('Leave request not found')

  if (leave.teacherId !== teacherId) {
    throw new Error('You can only cancel your own leave requests')
  }

  if (leave.status !== 'PENDING') {
    throw new Error(`Cannot cancel — leave is already ${leave.status}`)
  }

  await db.leaveRequest.delete({ where: { id } })
}

//Helper: build Prisma where clause
const buildWhereClause = (filters: LeaveFilters) => {
  const where: any = {}

  if (filters.teacherId) where.teacherId = filters.teacherId
  if (filters.status)    where.status    = filters.status

  if (filters.startDate || filters.endDate) {
    where.startDate = {}
    if (filters.startDate) where.startDate.gte = new Date(filters.startDate)
    if (filters.endDate)   where.startDate.lte = new Date(filters.endDate)
  }

  return where
}