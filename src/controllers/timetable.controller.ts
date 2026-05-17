import type { Request, Response } from 'express'
import { Day } from '@prisma/client'
import * as TimetableService from '../services/timetable.service.js'
import type { CreateTimetableDTO, UpdateTimetableDTO } from '../types/timetable.types.js'

const VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

// ─── POST /api/timetables ─────────────────────────────────────────────────────

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateTimetableDTO = req.body

    if (!dto.subject || !dto.className || !dto.day || !dto.startTime || !dto.endTime) {
      res.status(400).json({ success: false, message: 'subject, className, day, startTime, and endTime are required' })
      return
    }

    if (!dto.teacherId && !dto.teacher) {
      res.status(400).json({ success: false, message: 'Either teacherId or teacher name is required' })
      return
    }

    const slot = await TimetableService.create(dto)
    res.status(201).json({ success: true, data: slot })
  } catch (error: any) {
    const isConflict = error.message.includes('already has a class')
    res.status(isConflict ? 409 : 400).json({ success: false, message: error.message })
  }
}

// ─── GET /api/timetables ──────────────────────────────────────────────────────
// Admin/Principal: all slots in their school, filterable by ?day=&className=&teacherId=

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { className, day, teacherId } = req.query
    const schoolId = req.user!.schoolId

    const filters: any = {}
    if (schoolId  !== undefined) filters.schoolId  = schoolId
    if (className !== undefined && typeof className === 'string') filters.className = className
    if (day       !== undefined && typeof day === 'string')       filters.day       = day.toUpperCase() as Day
    if (teacherId !== undefined)                                  filters.teacherId = Number(teacherId)

    const slots = await TimetableService.getAll(filters)
    res.status(200).json({ success: true, count: slots.length, data: slots })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/timetables/my-schedule ─────────────────────────────────────────
// Teacher: own timetable — ?grouped=true for day-grouped view with summary

export const getMySchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const grouped   = req.query.grouped === 'true'

    if (grouped) {
      const schedule = await TimetableService.getMyScheduleGrouped(teacherId)
      res.status(200).json({ success: true, data: schedule })
    } else {
      const slots = await TimetableService.getMyTimetable(teacherId)
      res.status(200).json({ success: true, count: slots.length, data: slots })
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/timetables/school ───────────────────────────────────────────────
// Any authenticated user in the school: school-wide timetable
// Filterable by ?day=MONDAY&className=Form+3A

export const getSchoolTimetable = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId

    if (!schoolId) {
      res.status(403).json({ success: false, message: 'No school associated with your account' })
      return
    }

    const dayParam       = req.query.day as string | undefined
    const classNameParam = req.query.className as string | undefined

    let day: Day | undefined
    if (dayParam) {
      const upper = dayParam.toUpperCase()
      if (!VALID_DAYS.includes(upper)) {
        res.status(400).json({ success: false, message: `Invalid day. Use: ${VALID_DAYS.join(', ')}` })
        return
      }
      day = upper as Day
    }

    const result = await TimetableService.getSchoolTimetable(schoolId, day, classNameParam)
    res.status(200).json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/timetables/day/:day ────────────────────────────────────────────
// Teacher: own schedule for a specific day

export const getByDay = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const day       = (req.params.day as string).toUpperCase() as Day

    if (!VALID_DAYS.includes(day)) {
      res.status(400).json({ success: false, message: 'Invalid day provided' })
      return
    }

    const slots = await TimetableService.getByDay(teacherId, day)
    res.status(200).json({ success: true, count: slots.length, data: slots })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/timetables/:id ──────────────────────────────────────────────────

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const slot = await TimetableService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: slot })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, message: error.message })
  }
}

// ─── PUT /api/timetables/:id ──────────────────────────────────────────────────

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: UpdateTimetableDTO = req.body
    const updated = await TimetableService.update(Number(req.params.id), dto)
    res.status(200).json({ success: true, data: updated })
  } catch (error: any) {
    const notFound   = error.message.includes('not found')
    const isConflict = error.message.includes('already has a class')
    res.status(notFound ? 404 : isConflict ? 409 : 400).json({ success: false, message: error.message })
  }
}

// ─── DELETE /api/timetables/:id ───────────────────────────────────────────────

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await TimetableService.remove(Number(req.params.id))
    res.status(200).json({ success: true, message: 'Deleted successfully' })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, message: error.message })
  }
}
