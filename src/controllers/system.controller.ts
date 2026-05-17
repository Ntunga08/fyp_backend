import type { Request, Response } from 'express'
import * as SystemService from '../services/system.service.js'

// ─── GET /api/system/stats ────────────────────────────────────────────────────
// Platform-wide totals: schools, users breakdown

export const getPlatformStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await SystemService.getPlatformStats()
    res.status(200).json({ success: true, data: stats })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/system/schools ──────────────────────────────────────────────────
// All registered schools with staff counts (no attendance/lesson details)

export const getAllSchools = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined
    const schools = await SystemService.getAllSchools(search)
    res.status(200).json({ success: true, count: schools.length, data: schools })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/system/schools/:id ─────────────────────────────────────────────

export const getSchoolById = async (req: Request, res: Response): Promise<void> => {
  try {
    const school = await SystemService.getSchoolById(Number(req.params.id))
    res.status(200).json({ success: true, data: school })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500)
      .json({ success: false, message: error.message })
  }
}

// ─── PATCH /api/system/schools/:id/activate ──────────────────────────────────

export const activateSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await SystemService.setSchoolStatus(Number(req.params.id), true)
    res.status(200).json({ success: true, message: `${result.name} has been activated`, data: result })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500)
      .json({ success: false, message: error.message })
  }
}

// ─── PATCH /api/system/schools/:id/deactivate ────────────────────────────────

export const deactivateSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await SystemService.setSchoolStatus(Number(req.params.id), false)
    res.status(200).json({ success: true, message: `${result.name} has been deactivated`, data: result })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500)
      .json({ success: false, message: error.message })
  }
}

// ─── POST /api/system/schools ─────────────────────────────────────────────────
// Register a new school from the system level

export const createSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, latitude, longitude, radiusMetres, lateCutoffHour, lateCutoffMinute } = req.body

    if (!name || latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, message: 'name, latitude and longitude are required' })
      return
    }

    const school = await SystemService.createSchool({
      name, address, latitude, longitude, radiusMetres, lateCutoffHour, lateCutoffMinute,
    })

    res.status(201).json({ success: true, message: 'School registered successfully', data: school })
  } catch (error: any) {
    const status = error.message.includes('already exists') ? 409
                 : error.message.includes('Invalid')        ? 400 : 500
    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── GET /api/system/admins ───────────────────────────────────────────────────

export const getSuperAdmins = async (_req: Request, res: Response): Promise<void> => {
  try {
    const admins = await SystemService.getSuperAdmins()
    res.status(200).json({ success: true, count: admins.length, data: admins })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}
