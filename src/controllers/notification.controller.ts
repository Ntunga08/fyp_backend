import type { Request, Response } from 'express'
import { NotificationType } from '@prisma/client'
import * as NotificationService from '../services/notification.service.js'
import type { NotificationFilters } from '../types/notification.types.js'

// GET /api/notifications
// Logged-in user: get their notifications

export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId               = req.user!.userId
    const { isRead, type }     = req.query

    const filters: NotificationFilters = {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      type:   type as NotificationType | undefined,
    }

    const notifications = await NotificationService.getMyNotifications(userId, filters)

    res.status(200).json({
      success: true,
      count:   notifications.length,
      data:    notifications,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// GET /api/notifications/summary 
// Returns unread count — used for notification bell in UI

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = req.user!.userId
    const summary = await NotificationService.getSummary(userId)

    res.status(200).json({ success: true, data: summary })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// PUT /api/notifications/:id/read 
// Mark one notification as read

export const markOneRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id     = Number(req.params.id)
    const userId = req.user!.userId

    const notification = await NotificationService.markOneRead(id, userId)

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data:    notification,
    })
  } catch (error: any) {
    const notFound  = error.message.includes('not found')
    const forbidden = error.message.includes('your own')
    const alreadyRead = error.message.includes('already marked')

    const status = notFound ? 404 : forbidden ? 403 : alreadyRead ? 409 : 400

    res.status(status).json({ success: false, message: error.message })
  }
}

//  PUT /api/notifications/read-all 
// Mark all as read

export const markAllRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const count  = await NotificationService.markAllRead(userId)

    res.status(200).json({
      success: true,
      message: count > 0
        ? `${count} notification(s) marked as read`
        : 'No unread notifications',
      data: { updatedCount: count },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//  DELETE /api/notifications/:id 
// Delete one notification

export const deleteOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const id     = Number(req.params.id)
    const userId = req.user!.userId

    await NotificationService.deleteOne(id, userId)

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    })
  } catch (error: any) {
    const notFound  = error.message.includes('not found')
    const forbidden = error.message.includes('your own')
    res.status(notFound ? 404 : forbidden ? 403 : 500).json({
      success: false,
      message: error.message,
    })
  }
}

//  DELETE /api/notifications/clear-read 
// Clear all read notifications

export const clearRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const count  = await NotificationService.clearRead(userId)

    res.status(200).json({
      success: true,
      message: count > 0
        ? `${count} read notification(s) cleared`
        : 'No read notifications to clear',
      data: { deletedCount: count },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}

//  GET /api/notifications/all 
// Admin: view all notifications across users

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, type, isRead } = req.query

    const notifications = await NotificationService.getAll({
        userId: userId ? Number(userId) : undefined,
         type:   type   as string | undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    })


    res.status(200).json({
      success: true,
      count:   notifications.length,
      data:    notifications,
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
}