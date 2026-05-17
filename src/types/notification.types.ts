import { NotificationType } from '@prisma/client'

// Internal use (called from other services)
export interface CreateNotificationDTO {
  userId:  number
  type:    NotificationType
  title:   string
  message: string
}

//  Query Filters 

export interface NotificationFilters {
  isRead?: boolean
  type?:   NotificationType
}

//  Response 
export interface NotificationResponse {
  id:        number
  type:      NotificationType
  title:     string
  message:   string
  isRead:    boolean
  createdAt: Date
}

// Summary

export interface NotificationSummary {
  total:   number
  unread:  number
  read:    number
}