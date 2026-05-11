import { prisma } from '../config/prisma'
import { verifyFace } from '../utils/face-recognition'
import {
  TriggerVerificationDTO,
  SubmitVerificationDTO,
  FaceVerificationFilters,
  FaceVerificationResponse,
  FaceVerificationSummary,
} from '../types/face-verification.types'

// ─── Shared include ───────────────────────────────────────────────────────────

const verificationInclude = {
  teacher: {
    select: { id: true, name: true, email: true },
  },
  lesson: {
    select: {
      id:     true,
      date:   true,
      status: true,
      timetable: {
        select: {
          subject:  true,
          class:    true,
          day:      true,
          timeSlot: true,
        },
      },
    },
  },
}

// ─── Admin triggers a verification for a lesson ───────────────────────────────

export const trigger = async (
  dto: TriggerVerificationDTO
): Promise<FaceVerificationResponse> => {

  // Lesson must exist
  const lesson = await prisma.lesson.findUnique({
    where: { id: dto.lessonId },
  })

  if (!lesson) {
    throw new Error('Lesson not found')
  }

  // Only CONDUCTED or SUBSTITUTED lessons can be verified
  if (lesson.status === 'MISSED') {
    throw new Error('Cannot verify a MISSED lesson')
  }

  // Prevent duplicate verification for same lesson
  const existing = await prisma.faceVerification.findUnique({
    where: { lessonId: dto.lessonId },
  })

  if (existing) {
    throw new Error(
      `Verification already exists for this lesson with status: ${existing.status}`
    )
  }

  const verification = await prisma.faceVerification.create({
    data: {
      teacherId: lesson.teacherId,
      lessonId:  dto.lessonId,
      status:    'PENDING',
    },
    include: verificationInclude,
  })

  return verification as unknown as FaceVerificationResponse
}

// ─── Teacher submits their face for verification ──────────────────────────────

export const submit = async (
  dto: SubmitVerificationDTO,
  requesterId: number
): Promise<FaceVerificationResponse> => {

  const verification = await prisma.faceVerification.findUnique({
    where: { id: dto.verificationId },
  })

  if (!verification) {
    throw new Error('Verification request not found')
  }

  // Only the teacher linked to this verification can submit
  if (verification.teacherId !== requesterId) {
    throw new Error('This verification request is not assigned to you')
  }

  // Can't re-submit an already resolved verification
  if (verification.status !== 'PENDING') {
    throw new Error(
      `Verification already resolved with status: ${verification.status}`
    )
  }

  // Run face recognition
  const result = await verifyFace(dto.imageBase64, requesterId)

  const newStatus = result.matched ? 'VERIFIED' : 'FAILED'

  const updated = await prisma.faceVerification.update({
    where: { id: dto.verificationId },
    data: {
      status:     newStatus,
      verifiedAt: new Date(),
    },
    include: verificationInclude,
  })

  return updated as unknown as FaceVerificationResponse
}

// ─── Get teacher's own verifications ─────────────────────────────────────────

export const getMyVerifications = async (
  teacherId: number,
  filters: FaceVerificationFilters
): Promise<FaceVerificationResponse[]> => {
  const where = buildWhereClause({ ...filters, teacherId })

  const results = await prisma.faceVerification.findMany({
    where,
    include: verificationInclude,
    orderBy: { createdAt: 'desc' },
  })

  return results as unknown as FaceVerificationResponse[]
}

// ─── Get all verifications (Admin/Principal) ──────────────────────────────────

export const getAll = async (
  filters: FaceVerificationFilters
): Promise<FaceVerificationResponse[]> => {
  const where = buildWhereClause(filters)

  const results = await prisma.faceVerification.findMany({
    where,
    include: verificationInclude,
    orderBy: { createdAt: 'desc' },
  })

  return results as unknown as FaceVerificationResponse[]
}

// ─── Get single verification by ID ───────────────────────────────────────────

export const getById = async (id: number): Promise<FaceVerificationResponse> => {
  const result = await prisma.faceVerification.findUnique({
    where:   { id },
    include: verificationInclude,
  })

  if (!result) throw new Error('Verification record not found')

  return result as unknown as FaceVerificationResponse
}

// ─── Admin retriggers a FAILED verification ───────────────────────────────────

export const retrigger = async (id: number): Promise<FaceVerificationResponse> => {
  const verification = await prisma.faceVerification.findUnique({
    where: { id },
  })

  if (!verification) throw new Error('Verification record not found')

  if (verification.status === 'VERIFIED') {
    throw new Error('Cannot retrigger an already VERIFIED verification')
  }

  const reset = await prisma.faceVerification.update({
    where: { id },
    data: {
      status:     'PENDING',
      verifiedAt: null,
    },
    include: verificationInclude,
  })

  return reset as unknown as FaceVerificationResponse
}

// ─── Summary stats per teacher (Admin/Principal) ──────────────────────────────

export const getSummary = async (
  filters: FaceVerificationFilters
): Promise<FaceVerificationSummary[]> => {
  const teachers = await prisma.user.findMany({
    where:  { role: 'TEACHER', isActive: true },
    select: { id: true, name: true },
  })

  const summaries: FaceVerificationSummary[] = []

  for (const teacher of teachers) {
    const where = buildWhereClause({ ...filters, teacherId: teacher.id })

    const records = await prisma.faceVerification.findMany({ where })

    const verified = records.filter((r) => r.status === 'VERIFIED').length
    const failed   = records.filter((r) => r.status === 'FAILED').length
    const pending  = records.filter((r) => r.status === 'PENDING').length
    const total    = records.length

    summaries.push({
      teacherId:   teacher.id,
      teacherName: teacher.name,
      total,
      verified,
      failed,
      pending,
      passRate: total > 0
        ? ((verified / total) * 100).toFixed(2) + '%'
        : '0.00%',
    })
  }

  return summaries
}

// ─── Helper: build Prisma where clause ───────────────────────────────────────

const buildWhereClause = (filters: FaceVerificationFilters) => {
  const where: any = {}

  if (filters.teacherId) where.teacherId = filters.teacherId
  if (filters.lessonId)  where.lessonId  = filters.lessonId
  if (filters.status)    where.status    = filters.status

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate)
  }

  return where
}