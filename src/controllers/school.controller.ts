import type { Request, Response } from 'express'
import * as SchoolService from '../services/school.service.js'
import type { CreateSchoolDTO, UpdateSchoolDTO, SchoolFilters } from '../types/school.types.js'

// ─── POST /api/schools ────────────────────────────────────────────────────────

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateSchoolDTO = req.body

    if (!dto.name || dto.latitude === undefined || dto.longitude === undefined) {
      res.status(400).json({
        success: false,
        message: 'name, latitude and longitude are required',
      })
      return
    }

    const school = await SchoolService.create(dto)

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data:    school,
    })
  } catch (error: any) {
    const isConflict = error.message.includes('already exists')
    res.status(isConflict ? 409 : 400).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── GET /api/schools ─────────────────────────────────────────────────────────

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { isActive, search } = req.query

    const filters: SchoolFilters = {}

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true'
    }

    if (typeof search === 'string') {
      filters.search = search
    }

    const schools = await SchoolService.getAll(filters)

    res.status(200).json({
      success: true,
      count:   schools.length,
      data:    schools,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/schools/my ─────────────────────────────────────────────────────
// Any logged-in user: see their own school details

export const getMySchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const school = await SchoolService.getMySchool(userId)

    res.status(200).json({ success: true, data: school })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/schools/:id/stats ───────────────────────────────────────────────

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const id    = Number(req.params.id)
    const stats = await SchoolService.getStats(id)

    res.status(200).json({ success: true, data: stats })
  } catch (error: any) {
    const notFound = error.message.includes('not found')
    res.status(notFound ? 404 : 500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/schools/:id ─────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const school = await SchoolService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: school })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── PUT /api/schools/:id ─────────────────────────────────────────────────────

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id:  number        = Number(req.params.id)
    const dto: UpdateSchoolDTO = req.body

    const updated = await SchoolService.update(id, dto)

    res.status(200).json({
      success: true,
      message: 'School updated successfully',
      data:    updated,
    })
  } catch (error: any) {
    const notFound   = error.message.includes('not found')
    const isConflict = error.message.includes('already exists')
    const status     = notFound ? 404 : isConflict ? 409 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── PUT /api/schools/:id/deactivate ─────────────────────────────────────────

export const deactivate = async (req: Request, res: Response): Promise<void> => {
  try {
    await SchoolService.deactivate(Number(req.params.id))

    res.status(200).json({
      success: true,
      message: 'School deactivated successfully',
    })
  } catch (error: any) {
    const notFound = error.message.includes('not found')
    res.status(notFound ? 404 : 400).json({ success: false, message: error.message })
  }
}

// ─── PUT /api/schools/:id/reactivate ─────────────────────────────────────────

export const reactivate = async (req: Request, res: Response): Promise<void> => {
  try {
    const school = await SchoolService.reactivate(Number(req.params.id))

    res.status(200).json({
      success: true,
      message: 'School reactivated successfully',
      data:    school,
    })
  } catch (error: any) {
    const notFound = error.message.includes('not found')
    res.status(notFound ? 404 : 400).json({ success: false, message: error.message })
  }
}