import type { Request, Response } from 'express'
import type { LocationVerificationStatus } from '@prisma/client'
import * as LocationVerificationService from '../services/location-verification.service.js'
import type {
  TriggerLocationVerificationDTO,
  SubmitLocationVerificationDTO,
  LocationVerificationFilters,
  CreateAllowedLocationDTO,
  UpdateAllowedLocationDTO,
} from '../types/location-verification.types.js'

//
// LOCATION VERIFICATION ENDPOINTS

//  POST /api/location-verifications 
// Admin triggers a location verification request for a lesson

export const trigger = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: TriggerLocationVerificationDTO = req.body

    if (!dto.lessonId) {
      res.status(400).json({ success: false, message: 'lessonId is required' })
      return
    }

    const result = await LocationVerificationService.trigger(dto)

    res.status(201).json({
      success: true,
      message: 'Location verification triggered. Awaiting teacher submission',
      data: result,
    })
  } catch (error: any) {
    const status =
      error.message.includes('not found')       ? 404 :
      error.message.includes('already exists')  ? 409 :
      error.message.includes('MISSED')          ? 400 : 500

    res.status(status).json({ success: false, message: error.message })
  }
}

//  POST /api/location-verifications/submit
// Teacher submits their GPS location for verification

export const submit = async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterId = req.user!.userId
    const dto: SubmitLocationVerificationDTO = req.body

    if (!dto.verificationId || dto.latitude === undefined || dto.longitude === undefined) {
      res.status(400).json({
        success: false,
        message: 'verificationId, latitude, and longitude are required',
      })
      return
    }

    const result = await LocationVerificationService.submit(dto, requesterId)

    const passed       = result.status === 'VERIFIED'
    const locationName = result.allowedLocation?.name ?? 'school'
    const dist         = result.distanceMetres?.toFixed(0) ?? '?'

    res.status(200).json({
      success: true,
      message: passed
        ? `✅ Location verified — within ${dist}m of ${locationName}`
        : `❌ Location verification failed — ${dist}m from nearest allowed location (too far)`,
      data: result,
    })
  } catch (error: any) {
    const status =
      error.message.includes('not found')          ? 404 :
      error.message.includes('not assigned to you') ? 403 :
      error.message.includes('already resolved')   ? 409 :
      error.message.includes('No allowed locations') ? 400 : 500

    res.status(status).json({ success: false, message: error.message })
  }
}

// GET /api/location-verifications/my 
// Teacher: view their own verification history

export const getMyVerifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const { status, startDate, endDate } = req.query

    const filters: LocationVerificationFilters = {}
    if (status)    filters.status    = status    as LocationVerificationStatus
    if (startDate) filters.startDate = startDate as string
    if (endDate)   filters.endDate   = endDate   as string

    const results = await LocationVerificationService.getMyVerifications(teacherId, filters)

    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//  GET /api/location-verifications 
// Admin/Principal: all verifications (filterable)

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, lessonId, status, startDate, endDate } = req.query

    const filters: LocationVerificationFilters = {}
    if (teacherId) filters.teacherId = Number(teacherId)
    if (lessonId)  filters.lessonId  = Number(lessonId)
    if (status)    filters.status    = status as LocationVerificationStatus
    if (startDate) filters.startDate = startDate as string
    if (endDate)   filters.endDate   = endDate   as string

    const results = await LocationVerificationService.getAll(filters)

    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/location-verifications/summary 
// Admin/Principal: pass rate summary per teacher

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query

    const filters: LocationVerificationFilters = {}
    if (startDate) filters.startDate = startDate as string
    if (endDate)   filters.endDate   = endDate   as string

    const summary = await LocationVerificationService.getSummary(filters)

    res.status(200).json({ success: true, count: summary.length, data: summary })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//  GET /api/location-verifications/:id

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await LocationVerificationService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: result })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

//  PUT /api/location-verifications/:id/retrigger 
// Admin: reset a FAILED or PENDING verification so teacher can resubmit

export const retrigger = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await LocationVerificationService.retrigger(Number(req.params.id))

    res.status(200).json({
      success: true,
      message: 'Verification reset to PENDING. Teacher can resubmit',
      data: result,
    })
  } catch (error: any) {
    const status =
      error.message.includes('not found')  ? 404 :
      error.message.includes('VERIFIED')   ? 409 : 500

    res.status(status).json({ success: false, message: error.message })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ALLOWED LOCATION CRUD ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/location-verifications/allowed-locations ───────────────────────

export const createAllowedLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateAllowedLocationDTO = req.body

    if (!dto.schoolId || !dto.name || dto.latitude === undefined || dto.longitude === undefined) {
      res.status(400).json({ success: false, message: 'schoolId, name, latitude, and longitude are required' })
      return
    }

    const result = await LocationVerificationService.createAllowedLocation(dto)
    res.status(201).json({ success: true, message: 'Allowed location created', data: result })
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500
    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── GET /api/location-verifications/allowed-locations ────────────────────────

export const getAllowedLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolId        = Number(req.query.schoolId)
    const includeInactive = req.query.includeInactive === 'true'

    if (!schoolId) {
      res.status(400).json({ success: false, message: 'schoolId query param is required' })
      return
    }

    const results = await LocationVerificationService.getAllowedLocations(schoolId, includeInactive)
    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── PUT /api/location-verifications/allowed-locations/:id ────────────────────

export const updateAllowedLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: UpdateAllowedLocationDTO = req.body
    const result = await LocationVerificationService.updateAllowedLocation(Number(req.params.id), dto)
    res.status(200).json({ success: true, message: 'Allowed location updated', data: result })
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500
    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── DELETE /api/location-verifications/allowed-locations/:id ─────────────────

export const deleteAllowedLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    await LocationVerificationService.deleteAllowedLocation(Number(req.params.id))
    res.status(200).json({ success: true, message: 'Allowed location deleted' })
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500
    res.status(status).json({ success: false, message: error.message })
  }
}
