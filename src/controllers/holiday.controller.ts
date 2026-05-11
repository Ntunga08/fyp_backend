import type { Request, Response } from 'express'
import * as HolidayService from '../services/holiday.service.js'
import type { CreateHolidayDTO, UpdateHolidayDTO, HolidayFilters } from '../types/holiday.types.js'

// ─── POST /api/holidays ───────────────────────────────────────────────────────

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateHolidayDTO = req.body

    if (!dto.schoolId || !dto.name || !dto.date) {
      res.status(400).json({
        success: false,
        message: 'schoolId, name and date are required',
      })
      return
    }

    const holiday = await HolidayService.create(dto)

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data:    holiday,
    })
  } catch (error: any) {
    const isConflict = error.message.includes('already exists')
    const notFound   = error.message.includes('not found')
    const status     = isConflict ? 409 : notFound ? 404 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── GET /api/holidays ────────────────────────────────────────────────────────
// Admin/Principal: all holidays, filterable

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, startDate, endDate, upcoming } = req.query

    const filters: HolidayFilters = {
      schoolId:  schoolId  ? Number(schoolId)  : undefined,
      startDate: startDate as string | undefined,
      endDate:   endDate   as string | undefined,
      upcoming:  upcoming === 'true',
    }

    const holidays = await HolidayService.getAll(filters)

    res.status(200).json({
      success: true,
      count:   holidays.length,
      data:    holidays,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/holidays/my ─────────────────────────────────────────────────────
// Any user: holidays for their own school

export const getMySchoolHolidays = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId                   = req.user!.userId
    const { startDate, endDate, upcoming } = req.query

    const filters: HolidayFilters = {
      startDate: startDate as string | undefined,
      endDate:   endDate   as string | undefined,
      upcoming:  upcoming === 'true',
    }

    const holidays = await HolidayService.getMySchoolHolidays(userId, filters)

    res.status(200).json({
      success: true,
      count:   holidays.length,
      data:    holidays,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/holidays/upcoming/:schoolId ─────────────────────────────────────
// Upcoming holidays in next 30 days — for dashboard

export const getUpcoming = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = Number(req.params.schoolId)
    const days     = req.query.days ? Number(req.query.days) : 30

    const holidays = await HolidayService.getUpcoming(schoolId, days)

    res.status(200).json({
      success: true,
      count:   holidays.length,
      data:    holidays,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/holidays/check ──────────────────────────────────────────────────
// Check if a specific date is a holiday — used by attendance check-in
// ?schoolId=1&date=2025-12-25

export const checkDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, date } = req.query

    if (!schoolId || !date) {
      res.status(400).json({
        success: false,
        message: 'schoolId and date are required',
      })
      return
    }

    const result = await HolidayService.isHoliday(
      Number(schoolId),
      new Date(date as string)
    )

    res.status(200).json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/holidays/:id ────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const holiday = await HolidayService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: holiday })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── PUT /api/holidays/:id ────────────────────────────────────────────────────

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id:  number          = Number(req.params.id)
    const dto: UpdateHolidayDTO = req.body

    const updated = await HolidayService.update(id, dto)

    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data:    updated,
    })
  } catch (error: any) {
    const notFound   = error.message.includes('not found')
    const isConflict = error.message.includes('already exists')
    res.status(notFound ? 404 : isConflict ? 409 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── DELETE /api/holidays/:id ─────────────────────────────────────────────────

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await HolidayService.remove(Number(req.params.id))

    res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully',
    })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── POST /api/holidays/bulk/:schoolId ───────────────────────────────────────
// Auto-create Tanzania public holidays for a given year

export const bulkCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId = Number(req.params.schoolId)
    const year     = req.body.year ? Number(req.body.year) : new Date().getFullYear()

    if (year < 2020 || year > 2100) {
      res.status(400).json({ success: false, message: 'Invalid year provided' })
      return
    }

    const result = await HolidayService.bulkCreate(schoolId, year)

    res.status(201).json({
      success: true,
      message: `${result.created} holiday(s) created, ${result.skipped} skipped for ${year}`,
      data:    result,
    })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}