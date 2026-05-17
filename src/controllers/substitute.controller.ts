import type { Request, Response } from 'express'
import * as SubstituteService from '../services/substitute.service.js'
import type {
  AssignSubstituteDTO,
  RecordSubstituteLessonDTO,
  SubstituteFilters,
} from '../types/substitute.types.js'

// ─── POST /api/substitutes ────────────────────────────────────────────────────

export const assign = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: AssignSubstituteDTO = req.body

    if (!dto.lessonId || !dto.substituteTeacherId) {
      res.status(400).json({ success: false, message: 'lessonId and substituteTeacherId are required' })
      return
    }

    const result = await SubstituteService.assign(dto)
    res.status(201).json({ success: true, message: 'Substitute teacher assigned successfully', data: result })
  } catch (error: any) {
    const status =
      error.message.includes('not found')             ? 404 :
      error.message.includes('already been assigned') ? 409 :
      error.message.includes('clash') ||
      error.message.includes('same as')               ? 409 : 400
    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── PUT /api/substitutes/:id/record ─────────────────────────────────────────

export const recordSubstituteLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const substituteId = Number(req.params.id)
    const teacherId    = req.user!.userId
    const dto: RecordSubstituteLessonDTO = req.body

    const result = await SubstituteService.recordSubstituteLesson(substituteId, teacherId, dto)
    res.status(200).json({ success: true, message: 'Lesson notes recorded', data: result })
  } catch (error: any) {
    const status =
      error.message.includes('not found')       ? 404 :
      error.message.includes('not the assigned') ? 403 : 400
    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── GET /api/substitutes/my-assignments ─────────────────────────────────────
// Teacher: lessons they are covering for someone else

export const getMyAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = parseFilters(req)
    const results = await SubstituteService.getMyAssignments(req.user!.userId, filters)
    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/substitutes/my-lessons ─────────────────────────────────────────
// Teacher: who covered their lessons while they were absent

export const getMyLessonSubstitutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = parseFilters(req)
    const results = await SubstituteService.getMyLessonSubstitutes(req.user!.userId, filters)
    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/substitutes ─────────────────────────────────────────────────────
// Admin/Principal: all substitutes in their school

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = parseFilters(req)

    // Scope to the requesting user's school
    if (req.user?.schoolId) filters.schoolId = req.user.schoolId

    // Optional extra filters from query string
    if (req.query.originalTeacherId) {
      const v = Number(req.query.originalTeacherId)
      if (!isNaN(v)) filters.originalTeacherId = v
    }
    if (req.query.substituteTeacherId) {
      const v = Number(req.query.substituteTeacherId)
      if (!isNaN(v)) filters.substituteTeacherId = v
    }

    const results = await SubstituteService.getAll(filters)
    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/substitutes/:id ─────────────────────────────────────────────────

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await SubstituteService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: result })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, message: error.message })
  }
}

// ─── DELETE /api/substitutes/:id ─────────────────────────────────────────────

export const unassign = async (req: Request, res: Response): Promise<void> => {
  try {
    await SubstituteService.unassign(Number(req.params.id))
    res.status(200).json({ success: true, message: 'Substitute unassigned. Lesson reverted to MISSED' })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, message: error.message })
  }
}

// ─── Helper: extract date filters from query ──────────────────────────────────

const parseFilters = (req: Request): SubstituteFilters => {
  const filters: SubstituteFilters = {}
  const { date, startDate, endDate } = req.query

  if (typeof date      === 'string') filters.date      = date
  if (typeof startDate === 'string') filters.startDate = startDate
  if (typeof endDate   === 'string') filters.endDate   = endDate

  return filters
}
