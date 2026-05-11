import prisma from '../config/prisma.js'
import type {
  NotificationFilters,
  NotificationResponse,
  NotificationSummary,
} from '../types/notification.types.js'

const db = prisma as any

// ─── Get all notifications for logged-in user ─────────────────────────────────

export const getMyNotifications = async (
  userId:  number,
  filters: NotificationFilters
): Promise<NotificationResponse[]> => {
  const where: any = { userId }

  if (filters.isRead !== undefined) where.isRead = filters.isRead
  if (filters.type)                 where.type   = filters.type

  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return notifications as NotificationResponse[]
}

// ─── Get unread count + summary ───────────────────────────────────────────────

export const getSummary = async (userId: number): Promise<NotificationSummary> => {
  const [total, unread] = await Promise.all([
    db.notification.count({ where: { userId } }),
    db.notification.count({ where: { userId, isRead: false } }),
  ])

  return {
    total,
    unread,
    read: total - unread,
  }
}

// ─── Mark one notification as read ───────────────────────────────────────────

export const markOneRead = async (
  id:     number,
  userId: number
): Promise<NotificationResponse> => {
  const notification = await db.notification.findUnique({ where: { id } })

  if (!notification) {
    throw new Error('Notification not found')
  }

  if (notification.userId !== userId) {
    throw new Error('You can only update your own notifications')
  }

  if (notification.isRead) {
    throw new Error('Notification is already marked as read')
  }

  const updated = await db.notification.update({
    where: { id },
    data:  { isRead: true },
  })

  return updated as NotificationResponse
}

// ─── Mark all notifications as read ──────────────────────────────────────────

export const markAllRead = async (userId: number): Promise<number> => {
  const result = await db.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  })

  return result.count   // how many were updated
}

// ─── Delete one notification ──────────────────────────────────────────────────

export const deleteOne = async (
  id:     number,
  userId: number
): Promise<void> => {
  const notification = await db.notification.findUnique({ where: { id } })

  if (!notification) {
    throw new Error('Notification not found')
  }

  if (notification.userId !== userId) {
    throw new Error('You can only delete your own notifications')
  }

  await db.notification.delete({ where: { id } })
}

// ─── Delete all read notifications ───────────────────────────────────────────

export const clearRead = async (userId: number): Promise<number> => {
  const result = await db.notification.deleteMany({
    where: { userId, isRead: true },
  })

  return result.count
}

// ─── Admin: get all notifications across all users ────────────────────────────

export const getAll = async (filters: {
  userId?: number
  type?:   string
  isRead?: boolean
}): Promise<NotificationResponse[]> => {
  const where: any = {}

  if (filters.userId !== undefined) where.userId = filters.userId
  if (filters.type)                 where.type   = filters.type
  if (filters.isRead !== undefined) where.isRead = filters.isRead

  const notifications = await db.notification.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take:    200,   // limit to prevent huge payloads
  })

  return notifications as any
}