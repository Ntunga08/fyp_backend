import type { Request, Response } from 'express'
import * as SubstituteService from '../services/substitute.service.js'
import type {
  AssignSubstituteDTO,
  RecordSubstituteLessonDTO,
  SubstituteFilters,
} from '../types/substitute.types'

// ─── POST /api/substitutes ────────────────────────────────────────────────────
// Admin assigns a substitute teacher to a MISSED lesson

export const assign = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: AssignSubstituteDTO = req.body

    if (!dto.lessonId || !dto.substituteTeacherId) {
      res.status(400).json({
        success: false,
        message: 'lessonId and substituteTeacherId are required',
      })
      return
    }

    const result = await SubstituteService.assign(dto)

    res.status(201).json({
      success: true,
      message: 'Substitute teacher assigned successfully',
      data: result,
    })
  } catch (error: any) {
    const status =
      error.message.includes('not found')           ? 404 :
      error.message.includes('already been assigned') ? 409 :
      error.message.includes('clash') ||
      error.message.includes('same as')             ? 409 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── PUT /api/substitutes/:id/record ─────────────────────────────────────────
// Substitute teacher records notes for the covered lesson

export const recordSubstituteLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const substituteId = Number(req.params.id)
    const teacherId    = req.user!.userId
    const dto: RecordSubstituteLessonDTO = req.body

    const result = await SubstituteService.recordSubstituteLesson(
      substituteId,
      teacherId,
      dto
    )

    res.status(200).json({
      success: true,
      message: 'Substitute lesson recorded successfully',
      data: result,
    })
  } catch (error: any) {
    const status =
      error.message.includes('not found') ? 404 :
      error.message.includes('not the assigned') ? 403 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── GET /api/substitutes/my-assignments ─────────────────────────────────────
// Substitute teacher: lessons they are covering

export const getMyAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const substituteTeacherId = req.user!.userId
    const { startDate, endDate, date } = req.query

    const filters: SubstituteFilters = {}

    if (date !== undefined && typeof date === 'string') {
      filters.date = date
    }

    if (startDate !== undefined && typeof startDate === 'string') {
      filters.startDate = startDate
    }

    if (endDate !== undefined && typeof endDate === 'string') {
      filters.endDate = endDate
    }

    const results = await SubstituteService.getMyAssignments(substituteTeacherId, filters)

    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//GET /api/substitutes/my-lessons 
// Original teacher: who covered their lessons while absent

export const getMyLessonSubstitutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const originalTeacherId = req.user!.userId
    const { startDate, endDate, date } = req.query

    const filters: SubstituteFilters = {}

    if (date !== undefined && typeof date === 'string') {
      filters.date = date
    }

    if (startDate !== undefined && typeof startDate === 'string') {
      filters.startDate = startDate
    }

    if (endDate !== undefined && typeof endDate === 'string') {
      filters.endDate = endDate
    }

    const results = await SubstituteService.getMyLessonSubstitutes(originalTeacherId, filters)

    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/substitutes 
// Admin/Principal: all substitute records (filterable)

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalTeacherId, substituteTeacherId, date, startDate, endDate } = req.query

    const filters: SubstituteFilters = {}

    if (originalTeacherId !== undefined) {
      const parsedOriginalTeacherId = Number(originalTeacherId)
      if (!Number.isNaN(parsedOriginalTeacherId)) {
        filters.originalTeacherId = parsedOriginalTeacherId
      }
    }

    if (substituteTeacherId !== undefined) {
      const parsedSubstituteTeacherId = Number(substituteTeacherId)
      if (!Number.isNaN(parsedSubstituteTeacherId)) {
        filters.substituteTeacherId = parsedSubstituteTeacherId
      }
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

    const results = await SubstituteService.getAll(filters)

    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/substitutes/:id 
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await SubstituteService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: result })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

//  DELETE /api/substitutes/:id
// Admin: unassign a substitute — reverts lesson back to MISSED

export const unassign = async (req: Request, res: Response): Promise<void> => {
  try {
    await SubstituteService.unassign(Number(req.params.id))

    res.status(200).json({
      success: true,
      message: 'Substitute unassigned. Lesson reverted to MISSED',
    })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}