import type { Request, Response } from 'express'
import * as LeaveService from '../services/leave.service.js'
import type { CreateLeaveDTO, ReviewLeaveDTO, LeaveFilters } from '../types/leave.types.js'

// ─── POST /api/leave ──────────────────────────────────────────────────────────
// Teacher applies for leave

export const apply = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId        = req.user!.userId
    const dto: CreateLeaveDTO = req.body

    if (!dto.startDate || !dto.endDate || !dto.reason) {
      res.status(400).json({
        success: false,
        message: 'startDate, endDate and reason are required',
      })
      return
    }

    const leave = await LeaveService.apply(teacherId, dto)

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data:    leave,
    })
  } catch (error: any) {
    const isConflict = error.message.includes('overlapping')
    res.status(isConflict ? 409 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── GET /api/leave/my ────────────────────────────────────────────────────────
// Teacher: own leave history

export const getMyLeaves = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId             = req.user!.userId
    const { status, startDate, endDate } = req.query

    const filters: LeaveFilters = {}

    if (typeof status === 'string') {
      filters.status = status as LeaveFilters['status']
    }

    if (typeof startDate === 'string') {
      filters.startDate = startDate
    }

    if (typeof endDate === 'string') {
      filters.endDate = endDate
    }

    const leaves = await LeaveService.getMyLeaves(teacherId, filters)

    res.status(200).json({ success: true, count: leaves.length, data: leaves })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/leave ───────────────────────────────────────────────────────────
// Admin/Principal: all leave requests

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, status, startDate, endDate } = req.query

    const filters: LeaveFilters = {}

    if (teacherId !== undefined) {
      const parsedTeacherId = Number(teacherId)
      if (!Number.isNaN(parsedTeacherId)) {
        filters.teacherId = parsedTeacherId
      }
    }

    if (typeof status === 'string') {
      filters.status = status as LeaveFilters['status']
    }

    if (typeof startDate === 'string') {
      filters.startDate = startDate
    }

    if (typeof endDate === 'string') {
      filters.endDate = endDate
    }

    const leaves = await LeaveService.getAll(filters)

    res.status(200).json({ success: true, count: leaves.length, data: leaves })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/leave/pending ───────────────────────────────────────────────────
// Admin/Principal: pending leave requests only

export const getPending = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: LeaveFilters = { status: 'PENDING' }
    const leaves = await LeaveService.getAll(filters)

    res.status(200).json({ success: true, count: leaves.length, data: leaves })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/leave/:id ───────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const leave = await LeaveService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: leave })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── PUT /api/leave/:id/approve ───────────────────────────────────────────────
// Admin/Principal approves leave

export const approve = async (req: Request, res: Response): Promise<void> => {
  try {
    const id           = Number(req.params.id)
    const reviewerId   = req.user!.userId
    const dto: ReviewLeaveDTO = req.body

    const leave = await LeaveService.approve(id, reviewerId, dto)

    res.status(200).json({
      success: true,
      message: `Leave approved. Attendance and missed lessons auto-generated for ${leave.daysRequested} working day(s)`,
      data:    leave,
    })
  } catch (error: any) {
    const notFound = error.message.includes('not found')
    res.status(notFound ? 404 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── PUT /api/leave/:id/reject ────────────────────────────────────────────────
// Admin/Principal rejects leave

export const reject = async (req: Request, res: Response): Promise<void> => {
  try {
    const id           = Number(req.params.id)
    const reviewerId   = req.user!.userId
    const dto: ReviewLeaveDTO = req.body

    const leave = await LeaveService.reject(id, reviewerId, dto)

    res.status(200).json({
      success: true,
      message: 'Leave request rejected',
      data:    leave,
    })
  } catch (error: any) {
    const notFound = error.message.includes('not found')
    res.status(notFound ? 404 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── DELETE /api/leave/:id ────────────────────────────────────────────────────
// Teacher cancels their own PENDING request

export const cancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const id        = Number(req.params.id)
    const teacherId = req.user!.userId

    await LeaveService.cancel(id, teacherId)

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled',
    })
  } catch (error: any) {
    const notFound  = error.message.includes('not found')
    const forbidden = error.message.includes('your own')
    const status    = notFound ? 404 : forbidden ? 403 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}