import { Request, Response } from 'express'
import { FaceVerificationStatus } from '@prisma/client'
import * as FaceVerificationService from '../services/verification.service'
import {
  TriggerVerificationDTO,
  SubmitVerificationDTO,
  FaceVerificationFilters,
} from '../types/verification.types'

// ─── POST /api/face-verifications ─────────────────────────────────────────────
// Admin triggers a verification request for a lesson

export const trigger = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: TriggerVerificationDTO = req.body

    if (!dto.lessonId) {
      res.status(400).json({ success: false, message: 'lessonId is required' })
      return
    }

    const result = await FaceVerificationService.trigger(dto)

    res.status(201).json({
      success: true,
      message: 'Face verification triggered. Awaiting teacher submission',
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

// ─── POST /api/face-verifications/submit ─────────────────────────────────────
// Teacher submits their face image for verification

export const submit = async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterId = req.user!.userId
    const dto: SubmitVerificationDTO = req.body

    if (!dto.verificationId || !dto.imageBase64) {
      res.status(400).json({
        success: false,
        message: 'verificationId and imageBase64 are required',
      })
      return
    }

    const result = await FaceVerificationService.submit(dto, requesterId)

    const passed = result.status === 'VERIFIED'

    res.status(200).json({
      success: true,
      message: passed
        ? '✅ Face verification passed'
        : '❌ Face verification failed — identity could not be confirmed',
      data: result,
    })
  } catch (error: any) {
    const status =
      error.message.includes('not found')          ? 404 :
      error.message.includes('not assigned to you') ? 403 :
      error.message.includes('already resolved')   ? 409 : 500

    res.status(status).json({ success: false, message: error.message })
  }
}

// ─── GET /api/face-verifications/my ──────────────────────────────────────────
// Teacher: view their own verification history

export const getMyVerifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.userId
    const { status, startDate, endDate } = req.query

    const filters: FaceVerificationFilters = {
      status:    status    as FaceVerificationStatus | undefined,
      startDate: startDate as string | undefined,
      endDate:   endDate   as string | undefined,
    }

    const results = await FaceVerificationService.getMyVerifications(teacherId, filters)

    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/face-verifications ──────────────────────────────────────────────
// Admin/Principal: all verifications (filterable)

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, lessonId, status, startDate, endDate } = req.query

    const filters: FaceVerificationFilters = {
      teacherId: teacherId ? Number(teacherId) : undefined,
      lessonId:  lessonId  ? Number(lessonId)  : undefined,
      status:    status    as FaceVerificationStatus | undefined,
      startDate: startDate as string | undefined,
      endDate:   endDate   as string | undefined,
    }

    const results = await FaceVerificationService.getAll(filters)

    res.status(200).json({ success: true, count: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/face-verifications/summary ─────────────────────────────────────
// Admin/Principal: pass rate summary per teacher

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query

    const filters: FaceVerificationFilters = {
      startDate: startDate as string | undefined,
      endDate:   endDate   as string | undefined,
    }

    const summary = await FaceVerificationService.getSummary(filters)

    res.status(200).json({ success: true, count: summary.length, data: summary })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ─── GET /api/face-verifications/:id ─────────────────────────────────────────

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await FaceVerificationService.getById(Number(req.params.id))
    res.status(200).json({ success: true, data: result })
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

// ─── PUT /api/face-verifications/:id/retrigger ────────────────────────────────
// Admin: reset a FAILED or PENDING verification so teacher can resubmit

export const retrigger = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await FaceVerificationService.retrigger(Number(req.params.id))

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