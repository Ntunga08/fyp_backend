import { NotificationType } from '@prisma/client'
import prisma from '../config/prisma.js'

/**
 * Central notification helper for EduTrack.
 *
 * Import and call sendNotification() from any service
 * to deliver a notification to a user.
 *
 * Usage examples:
 *
 * // When leave is approved
 * await sendNotification(
 *   teacherId,
 *   'LEAVE_APPROVED',
 *   'Leave Request Approved',
 *   'Your leave request from 10 May to 12 May has been approved.'
 * )
 *
 * // When substitute is assigned
 * await sendNotification(
 *   substituteTeacherId,
 *   'SUBSTITUTE_ASSIGNED',
 *   'New Substitute Assignment',
 *   'You have been assigned to cover Mathematics (Form 3A) on Monday.'
 * )
 */

export const sendNotification = async (
  userId:  number,
  type:    NotificationType,
  title:   string,
  message: string
): Promise<void> => {
  try {
    await prisma.notification.create({
      data: { userId, type, title, message },
    })
  } catch (error) {
    // Notifications should never crash the main flow
    console.error(`Failed to send notification to user ${userId}:`, error)
  }
}

// ─── Pre-built notification templates ────────────────────────────────────────
// Call these from their respective services

export const notify = {

  // ── Leave notifications ─────────────────────────────────────────────────

  leaveApproved: (teacherId: number, startDate: string, endDate: string) =>
    sendNotification(
      teacherId,
      'LEAVE_APPROVED',
      '✅ Leave Request Approved',
      `Your leave request from ${startDate} to ${endDate} has been approved.`
    ),

  leaveRejected: (teacherId: number, startDate: string, endDate: string, note?: string) =>
    sendNotification(
      teacherId,
      'LEAVE_REJECTED',
      '❌ Leave Request Rejected',
      `Your leave request from ${startDate} to ${endDate} was rejected.${note ? ` Reason: ${note}` : ''}`
    ),

  // ── Substitute notifications ────────────────────────────────────────────

  substituteAssigned: (
    substituteTeacherId: number,
    subject:  string,
    className: string,
    day:      string,
    timeSlot: string
  ) =>
    sendNotification(
      substituteTeacherId,
      'SUBSTITUTE_ASSIGNED',
      '📋 New Substitute Assignment',
      `You have been assigned to cover ${subject} (${className}) on ${day} at ${timeSlot}.`
    ),

  // ── Lesson notifications ────────────────────────────────────────────────

  missedLesson: (adminId: number, teacherName: string, subject: string, className: string) =>
    sendNotification(
      adminId,
      'MISSED_LESSON',
      '⚠️ Missed Lesson Detected',
      `${teacherName} did not record a lesson for ${subject} (${className}) today.`
    ),

  // ── Face verification notifications ────────────────────────────────────

  faceVerificationTriggered: (teacherId: number, subject: string, className: string) =>
    sendNotification(
      teacherId,
      'FACE_VERIFICATION',
      '📸 Face Verification Required',
      `Face verification has been triggered for your ${subject} (${className}) lesson. Please submit your photo.`
    ),

  // ── Inconsistency notifications ─────────────────────────────────────────

  inconsistencyDetected: (
    adminId:     number,
    teacherName: string,
    issue:       string
  ) =>
    sendNotification(
      adminId,
      'INCONSISTENCY_DETECTED',
      '🚨 Inconsistency Detected',
      `${teacherName}: ${issue}`
    ),

  // ── Check-in reminder ───────────────────────────────────────────────────

  checkInReminder: (teacherId: number) =>
    sendNotification(
      teacherId,
      'CHECK_IN_REMINDER',
      '🕐 Check-In Reminder',
      'You have not checked in yet today. Please check in to record your attendance.'
    ),
}