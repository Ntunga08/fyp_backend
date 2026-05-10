import type { Request, Response } from 'express'
import { AttendanceStatus } from '@prisma/client'
import * as AttendanceService from '../services/attendance.service.js'
import type { CheckInDTO, AttendanceFilters } from '../types/attendance.types.js'

// POST /api/attendance/checkin
export const checkIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const dto: CheckInDTO = req.body

    if (dto.latitude === undefined || dto.longitude === undefined) {
      res.status(400).json({
        success: false,
        message: 'latitude and longitude are required',
      })
      return
    }

    const record = await AttendanceService.checkIn(teacherId, dto)

    res.status(201).json({
      success: true,
      message: `Check-in successful. Status: ${record.status}`,
      data: record,
    })
  } catch (error: any) {
    const isRejected = error.message.includes('rejected') ||
                       error.message.includes('already checked') ||
                       error.message.includes('weekdays')

    res.status(isRejected ? 400 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

// GET /api/attendance/toda
// Teacher: check their own status for today

export const getMyToday = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const record = await AttendanceService.getMyToday(teacherId)

    if (!record) {
      res.status(200).json({
        success: true,
        message: 'No check-in recorded for today',
        data: null,
      })
      return
    }

    res.status(200).json({ success: true, data: record })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//GET /api/attendance/my
// Teacher: own attendance history — ?status=LATE&startDate=&endDate=

export const getMyHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const { status, startDate, endDate } = req.query

    const filters: AttendanceFilters = {}

    if (status !== undefined && typeof status === 'string') {
      filters.status = status as AttendanceStatus
    }

    if (startDate !== undefined && typeof startDate === 'string') {
      filters.startDate = startDate
    }

    if (endDate !== undefined && typeof endDate === 'string') {
      filters.endDate = endDate
    }

    const records = await AttendanceService.getMyHistory(teacherId, filters)

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//GET /api/attendance 
// Admin/Principal: all records — ?teacherId=&status=&date=&startDate=&endDate=

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, status, date, startDate, endDate } = req.query

    const filters: AttendanceFilters = {}

    if (teacherId !== undefined) {
      const parsedTeacherId = Number(teacherId)
      if (!Number.isNaN(parsedTeacherId)) {
        filters.teacherId = parsedTeacherId
      }
    }

    if (status !== undefined && typeof status === 'string') {
      filters.status = status as AttendanceStatus
    }

    if (date !== undefined && typeof date === 'string') {
      filters.date = date
    }

    if (startDate !== undefined && typeof startDate === 'string') {
      filters.startDate = startDate
    }

    if (endDate !== undefined && typeof endDate === 'string') {
      filters.endDate = endDate
    }

    const records = await AttendanceService.getAll(filters)

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/attendance/summary 
// Admin/Principal: summary stats per teacher — ?startDate=&endDate=

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query

    const filters: AttendanceFilters = {}

    if (startDate !== undefined && typeof startDate === 'string') {
      filters.startDate = startDate
    }

    if (endDate !== undefined && typeof endDate === 'string') {
      filters.endDate = endDate
    }

    const summary = await AttendanceService.getSummary(filters)

    res.status(200).json({
      success: true,
      count: summary.length,
      data: summary,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//POST /api/attendance/absent
// Admin: manually mark a teacher as absent for a specific date

export const markAbsent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, date } = req.body

    if (!teacherId || !date) {
      res.status(400).json({
        success: false,
        message: 'teacherId and date are required',
      })
      return
    }

    const record = await AttendanceService.markAbsent(Number(teacherId), new Date(date))

    res.status(201).json({
      success: true,
      message: 'Teacher marked as absent',
      data: record,
    })
  } catch (error: any) {
    const isConflict = error.message.includes('already has')
    res.status(isConflict ? 409 : 400).json({
      success: false,
      message: error.message,
    })
  }
}