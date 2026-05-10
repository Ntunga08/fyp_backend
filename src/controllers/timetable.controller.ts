import type { Request, Response } from 'express'
import { Day } from '@prisma/client'
import * as TimetableService from '../services/timetable.service'
import type { CreateTimetableDTO, UpdateTimetableDTO } from '../types/timetable.types'

// POST /api/timetable 

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateTimetableDTO = req.body
    const slot = await TimetableService.create(dto)

    res.status(201).json({
      success: true,
      message: 'Timetable slot created successfully',
      data: slot,
    })
  } catch (error: any) {
    const isConflict = error.message.includes('already has a class')
    res.status(isConflict ? 409 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

//GET /api/timetable
// Admin/Principal: all slots, optionally filtered by ?teacherId, ?day, ?class

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, day, class: cls } = req.query
    const filters: { teacherId?: number; day?: Day; class?: string } = {}

    if (teacherId !== undefined) {
      const parsedTeacherId = Number(teacherId)
      if (!Number.isNaN(parsedTeacherId)) {
        filters.teacherId = parsedTeacherId
      }
    }

    if (day !== undefined && typeof day === 'string') {
      filters.day = day.toUpperCase() as Day
    }

    if (cls !== undefined && typeof cls === 'string') {
      filters.class = cls
    }

    const slots = await TimetableService.getAll(filters)

    res.status(200).json({
      success: true,
      count: slots.length,
      data: slots,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/timetable/my 

export const getMyTimetable = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const slots = await TimetableService.getMyTimetable(teacherId)

    res.status(200).json({
      success: true,
      count: slots.length,
      data: slots,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//  GET /api/timetable/day/:day
// Teacher: their schedule for a specific day (used during check-in)

export const getByDay = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const dayParam = req.params.day

    if (typeof dayParam !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid day provided' })
      return
    }

    const day = dayParam.toUpperCase() as Day

    const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    if (!validDays.includes(day)) {
      res.status(400).json({ success: false, message: 'Invalid day provided' })
      return
    }

    const slots = await TimetableService.getByDay(teacherId, day)

    res.status(200).json({
      success: true,
      count: slots.length,
      data: slots,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/timetable/:id 

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const slot = await TimetableService.getById(id)

    res.status(200).json({ success: true, data: slot })
  } catch (error: any) {
    const notFound = error.message.includes('not found')
    res.status(notFound ? 404 : 500).json({ success: false, message: error.message })
  }
}

// PUT /api/timetable/:id 
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const dto: UpdateTimetableDTO = req.body

    const updated = await TimetableService.update(id, dto)

    res.status(200).json({
      success: true,
      message: 'Timetable slot updated successfully',
      data: updated,
    })
  } catch (error: any) {
    const notFound  = error.message.includes('not found')
    const isConflict = error.message.includes('already has a class')
    const status = notFound ? 404 : isConflict ? 409 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}

// DELETE /api/timetable/:id 
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    await TimetableService.remove(id)

    res.status(200).json({
      success: true,
      message: 'Timetable slot deleted successfully',
    })
  } catch (error: any) {
    const notFound = error.message.includes('not found')
    res.status(notFound ? 404 : 500).json({ success: false, message: error.message })
  }
}