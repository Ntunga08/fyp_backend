import type { Request, Response } from 'express'
import { LessonStatus } from '@prisma/client'
import * as LessonService from '../services/lesson.service'
import type { RecordLessonDTO, UpdateLessonDTO, LessonFilters } from '../types/lesson.types'

// ─── POST /api/lessons ────────────────────────────────────────────────────────

export const recordLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const dto: RecordLessonDTO = req.body

    if (!dto.timetableId) {
      res.status(400).json({ success: false, message: 'timetableId is required' })
      return
    }

    const lesson = await LessonService.recordLesson(teacherId, dto)

    res.status(201).json({
      success: true,
      message: 'Lesson recorded successfully',
      data: lesson,
    })
  } catch (error: any) {
    const status =
      error.message.includes('not found')         ? 404 :
      error.message.includes('already recorded')  ? 409 :
      error.message.includes('must check in')     ? 403 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── GET /api/lessons/today ───────────────────────────────────────────────────

export const getMyToday = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const lessons = await LessonService.getMyToday(teacherId)

    res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//  GET /api/lessons/my

export const getMyLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const { status, startDate, endDate, timetableId } = req.query

    const filters: LessonFilters = {}
    if (status !== undefined && typeof status === 'string') {
      filters.status = status as LessonStatus
    }
    if (startDate !== undefined && typeof startDate === 'string') {
      filters.startDate = startDate
    }
    if (endDate !== undefined && typeof endDate === 'string') {
      filters.endDate = endDate
    }
    if (timetableId !== undefined) {
      const parsedTimetableId = Number(timetableId)
      if (!Number.isNaN(parsedTimetableId)) {
        filters.timetableId = parsedTimetableId
      }
    }

    const lessons = await LessonService.getMyLessons(teacherId, filters)

    res.status(200).json({ success: true, count: lessons.length, data: lessons })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//GET /api/lessons

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, status, date, startDate, endDate, timetableId } = req.query

    const filters: LessonFilters = {}
    if (teacherId !== undefined) {
      const parsedTeacherId = Number(teacherId)
      if (!Number.isNaN(parsedTeacherId)) {
        filters.teacherId = parsedTeacherId
      }
    }
    if (status !== undefined && typeof status === 'string') {
      filters.status = status as LessonStatus
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
    if (timetableId !== undefined) {
      const parsedTimetableId = Number(timetableId)
      if (!Number.isNaN(parsedTimetableId)) {
        filters.timetableId = parsedTimetableId
      }
    }

    const lessons = await LessonService.getAll(filters)

    res.status(200).json({ success: true, count: lessons.length, data: lessons })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/lessons/inconsistencies

export const getInconsistencies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.query
    const results = await LessonService.getInconsistencies(date as string | undefined)

    res.status(200).json({
      success: true,
      count: results.length,
      message: results.length === 0
        ? 'No inconsistencies found'
        : `${results.length} inconsistencies detected`,
      data: results,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/lessons/:id 

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const lesson = await LessonService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: lesson })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

// PUT /api/lessons/:id 
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id            = Number(req.params.id)
    const requesterId   = req.user!.userId
    const requesterRole = req.user!.role
    const dto: UpdateLessonDTO = req.body

    const updated = await LessonService.update(id, requesterId, requesterRole, dto)

    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: updated,
    })
  } catch (error: any) {
    const status =
      error.message.includes('not found') ? 404 :
      error.message.includes('own')       ? 403 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}

//POST /api/lessons/generate-missed 

export const generateMissed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.body

    if (!date) {
      res.status(400).json({ success: false, message: 'date is required' })
      return
    }

    const count = await LessonService.generateMissedLessons(new Date(date))

    res.status(200).json({
      success: true,
      message: `${count} missed lesson(s) generated for ${date}`,
      data: { missedCount: count },
    })
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message })
  }
}