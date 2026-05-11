import prisma from '../config/prisma.js'
import type {
  DailyReport,
  DailyReportEntry,
  PeriodReport,
  PeriodReportEntry,
  TeacherPerformanceReport,
  InconsistencyReport,
  ReportDateRange,
  TeacherReportParams,
} from '../types/report.types.js'

//Helpers 

const pct = (part: number, total: number): string =>
  total > 0 ? ((part / total) * 100).toFixed(2) + '%' : '0.00%'

const normalizeDate = (d: Date | string): Date => {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

const getDayEnum = (date: Date): string => {
  const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
  return days[date.getDay()] || 'SUNDAY'
}

const formatDate = (d: Date): string => {
  const parts = d.toISOString().split('T')
  return parts[0] || ''
}

const formatTime = (d: Date): string => {
  const parts = d.toTimeString().split(' ')
  return parts[0]?.substring(0, 5) || '00:00'
}

//DAILY REPORT 

export const generateDailyReport = async (date: string): Promise<DailyReport> => {
  const targetDate = normalizeDate(date)
  const day        = getDayEnum(targetDate)

  if (day === 'SUNDAY' || day === 'SATURDAY') {
    throw new Error('No report available for weekends')
  }

  const teachers = await prisma.user.findMany({
    where:  { role: 'TEACHER', isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const entries: DailyReportEntry[] = []

  let totalPresent = 0, totalAbsent = 0, totalLate = 0
  let totalScheduled = 0, totalConducted = 0
  let totalMissed = 0, totalSubstituted = 0

  for (const teacher of teachers) {
    // Attendance
    const attendance = await prisma.attendance.findUnique({
      where: { teacherId_date: { teacherId: teacher.id, date: targetDate } },
    })

    if (attendance?.status === 'PRESENT') totalPresent++
    else if (attendance?.status === 'LATE') totalLate++
    else totalAbsent++

    // Timetable slots for this day
    const slots = await prisma.timetable.findMany({
      where: { teacherId: teacher.id, day: day as any },
    })
    totalScheduled += slots.length

    // Lessons recorded
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: teacher.id, date: targetDate },
      include: { timetable: true },
    })

    const conducted   = lessons.filter((l) => l.status === 'CONDUCTED').length
    const missed      = lessons.filter((l) => l.status === 'MISSED').length
    const substituted = lessons.filter((l) => l.status === 'SUBSTITUTED').length

    totalConducted   += conducted
    totalMissed      += missed
    totalSubstituted += substituted

    // Face verifications
    const verifications = await prisma.faceVerification.findMany({
      where: { teacherId: teacher.id, lesson: { date: targetDate } },
    })

    // Inconsistencies
    const flags: string[] = []
    if (attendance && attendance.status !== 'ABSENT' && conducted === 0 && slots.length > 0) {
      flags.push('Checked in but no lessons recorded')
    }
    if (!attendance) {
      flags.push('No check-in recorded')
    }
    const failedFace = verifications.filter((v) => v.status === 'FAILED').length
    if (failedFace > 0) {
      flags.push(`${failedFace} failed face verification(s)`)
    }

    entries.push({
      teacher,
      attendance: {
        status:   attendance?.status ?? 'ABSENT',
        timeIn:   attendance?.timeIn ?? null,
        location: attendance
          ? { latitude: attendance.latitude, longitude: attendance.longitude }
          : null,
      },
      lessons: {
        total:       slots.length,
        conducted,
        missed,
        substituted,
        details: lessons.map((l) => ({
          subject:  l.timetable.subject,
          class:    l.timetable.class,
          timeSlot: l.timetable.timeSlot,
          status:   l.status,
        })),
      },
      faceVerifications: {
        total:    verifications.length,
        verified: verifications.filter((v) => v.status === 'VERIFIED').length,
        failed:   failedFace,
        pending:  verifications.filter((v) => v.status === 'PENDING').length,
      },
      inconsistencies: flags,
    })
  }

  return {
    date:        formatDate(targetDate),
    generatedAt: new Date(),
    summary: {
      totalTeachers:      teachers.length,
      present:            totalPresent,
      absent:             totalAbsent,
      late:               totalLate,
      lessonsScheduled:   totalScheduled,
      lessonsConducted:   totalConducted,
      lessonsMissed:      totalMissed,
      lessonsSubstituted: totalSubstituted,
      attendanceRate:     pct(totalPresent + totalLate, teachers.length),
      lessonDeliveryRate: pct(totalConducted + totalSubstituted, totalScheduled),
    },
    entries,
  }
}

// PERIOD REPORT (Weekly / Monthly) 

export const generatePeriodReport = async (
  params: ReportDateRange,
  label: string
): Promise<PeriodReport> => {
  const start = normalizeDate(params.startDate)
  const end   = normalizeDate(params.endDate)

  const teachers = await prisma.user.findMany({
    where:  { role: 'TEACHER', isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const entries: PeriodReportEntry[] = []

  let totalAttendanceRates: number[] = []
  let totalDeliveryRates:   number[] = []
  let grandMissed = 0, grandSubs = 0

  for (const teacher of teachers) {
    // Attendance
    const attendances = await prisma.attendance.findMany({
      where: {
        teacherId: teacher.id,
        date: { gte: start, lte: end },
      },
    })

    const present   = attendances.filter((a) => a.status === 'PRESENT').length
    const late      = attendances.filter((a) => a.status === 'LATE').length
    const absent    = attendances.filter((a) => a.status === 'ABSENT').length
    const attRate   = (present + late) / (attendances.length || 1) * 100

    totalAttendanceRates.push(attRate)

    // Lessons
    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId: teacher.id,
        date: { gte: start, lte: end },
      },
    })

    const conducted   = lessons.filter((l) => l.status === 'CONDUCTED').length
    const missed      = lessons.filter((l) => l.status === 'MISSED').length
    const substituted = lessons.filter((l) => l.status === 'SUBSTITUTED').length
    const scheduled   = lessons.length
    const delRate     = (conducted + substituted) / (scheduled || 1) * 100

    totalDeliveryRates.push(delRate)
    grandMissed += missed
    grandSubs   += substituted

    // Face verifications
    const verifications = await prisma.faceVerification.findMany({
      where: {
        teacherId: teacher.id,
        createdAt: { gte: start, lte: end },
      },
    })

    const verified = verifications.filter((v) => v.status === 'VERIFIED').length
    const failed   = verifications.filter((v) => v.status === 'FAILED').length

    // Substitutes
    const asOriginal = await prisma.substitute.count({
      where: {
        originalTeacherId: teacher.id,
        date: { gte: start, lte: end },
      },
    })
    const asCover = await prisma.substitute.count({
      where: {
        substituteTeacherId: teacher.id,
        date: { gte: start, lte: end },
      },
    })

    entries.push({
      teacher,
      attendance: {
        totalDays:      attendances.length,
        present,
        late,
        absent,
        attendanceRate: pct(present + late, attendances.length),
      },
      lessons: {
        scheduled,
        conducted,
        missed,
        substituted,
        deliveryRate: pct(conducted + substituted, scheduled),
      },
      faceVerifications: {
        total:    verifications.length,
        verified,
        failed,
        passRate: pct(verified, verifications.length),
      },
      substitutes: {
        timesAbsent:        asOriginal,
        timesCovered:       asOriginal,
        timesAsSubstitute:  asCover,
      },
    })
  }

  const avgAtt = totalAttendanceRates.length > 0
    ? (totalAttendanceRates.reduce((a, b) => a + b, 0) / totalAttendanceRates.length).toFixed(2) + '%'
    : '0.00%'

  const avgDel = totalDeliveryRates.length > 0
    ? (totalDeliveryRates.reduce((a, b) => a + b, 0) / totalDeliveryRates.length).toFixed(2) + '%'
    : '0.00%'

  return {
    period:      label,
    startDate:   formatDate(start),
    endDate:     formatDate(end),
    generatedAt: new Date(),
    summary: {
      totalTeachers:        teachers.length,
      avgAttendanceRate:    avgAtt,
      avgDeliveryRate:      avgDel,
      totalMissedLessons:   grandMissed,
      totalSubstitutions:   grandSubs,
      totalInconsistencies: entries.reduce(
        (acc, e) => acc + (e.lessons.missed > 0 && e.attendance.present > 0 ? 1 : 0), 0
      ),
    },
    entries,
  }
}

// TEACHER PERFORMANCE REPORT 

export const generateTeacherReport = async (
  params: TeacherReportParams
): Promise<TeacherPerformanceReport> => {
  const start     = normalizeDate(params.startDate)
  const end       = normalizeDate(params.endDate)
  const teacherId = params.teacherId!

  const teacher = await prisma.user.findUnique({
    where:  { id: teacherId },
    select: { id: true, name: true, email: true, phone: true, role: true },
  })

  if (!teacher || teacher.role !== 'TEACHER') {
    throw new Error('Teacher not found')
  }

  // Attendance
  const attendances = await prisma.attendance.findMany({
    where: { teacherId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  })

  const present = attendances.filter((a) => a.status === 'PRESENT').length
  const late    = attendances.filter((a) => a.status === 'LATE').length
  const absent  = attendances.filter((a) => a.status === 'ABSENT').length

  // Lessons
  const lessons = await prisma.lesson.findMany({
    where:   { teacherId, date: { gte: start, lte: end } },
    include: { timetable: true },
    orderBy: { date: 'asc' },
  })

  const conducted   = lessons.filter((l) => l.status === 'CONDUCTED').length
  const missed      = lessons.filter((l) => l.status === 'MISSED').length
  const substituted = lessons.filter((l) => l.status === 'SUBSTITUTED').length

  // Group by subject
  const subjectMap: Record<string, { conducted: number; missed: number }> = {}
  for (const lesson of lessons) {
    const sub = lesson.timetable.subject
    if (!subjectMap[sub]) subjectMap[sub] = { conducted: 0, missed: 0 }
    if (lesson.status === 'CONDUCTED') subjectMap[sub].conducted++
    if (lesson.status === 'MISSED')    subjectMap[sub].missed++
  }

  // Face verifications
  const verifications = await prisma.faceVerification.findMany({
    where: { teacherId, createdAt: { gte: start, lte: end } },
  })

  const verified = verifications.filter((v) => v.status === 'VERIFIED').length
  const failed   = verifications.filter((v) => v.status === 'FAILED').length

  // Substitutes
  const asOriginal = await prisma.substitute.count({
    where: { originalTeacherId: teacherId, date: { gte: start, lte: end } },
  })
  const asCover = await prisma.substitute.count({
    where: { substituteTeacherId: teacherId, date: { gte: start, lte: end } },
  })

  // Flags
  const flags: string[] = []
  if (absent > 2)   flags.push(`High absenteeism: ${absent} absent day(s)`)
  if (missed > 3)   flags.push(`${missed} missed lesson(s) detected`)
  if (failed > 0)   flags.push(`${failed} failed face verification(s)`)
  const attRate = (present + late) / (attendances.length || 1) * 100
  if (attRate < 75) flags.push(`Low attendance rate: ${attRate.toFixed(1)}%`)

  return {
    teacher: { id: teacher.id, name: teacher.name, email: teacher.email, phone: teacher.phone },
    period:      `${formatDate(start)} to ${formatDate(end)}`,
    generatedAt: new Date(),
    attendance: {
      totalDays:      attendances.length,
      present,
      late,
      absent,
      attendanceRate: pct(present + late, attendances.length),
      checkInTimes:   attendances.map((a) => ({
        date:   formatDate(a.date),
        time:   formatTime(a.timeIn),
        status: a.status,
      })),
    },
    lessons: {
      scheduled:    lessons.length,
      conducted,
      missed,
      substituted,
      deliveryRate: pct(conducted + substituted, lessons.length),
      bySubject:    Object.entries(subjectMap).map(([subject, stats]) => ({
        subject,
        conducted: stats.conducted,
        missed:    stats.missed,
      })),
    },
    faceVerifications: {
      total:    verifications.length,
      verified,
      failed,
      passRate: pct(verified, verifications.length),
    },
    substitutes: {
      timesAbsent:       asOriginal,
      coverageRate:      pct(asOriginal, asOriginal),
      asSubstituteCount: asCover,
    },
    flags,
  }
}

//  INCONSISTENCY REPORT

export const generateInconsistencyReport = async (
  date: string
): Promise<InconsistencyReport> => {
  const targetDate = normalizeDate(date)
  const day        = getDayEnum(targetDate)

  const flags: InconsistencyReport['flags'] = []

  // 1. Teachers checked in but didn't record lessons
  const presentAttendances = await prisma.attendance.findMany({
    where: {
      date:   targetDate,
      status: { in: ['PRESENT', 'LATE'] },
    },
    include: { teacher: { select: { id: true, name: true } } },
  })

  for (const att of presentAttendances) {
    const slots = await prisma.timetable.findMany({
      where: { teacherId: att.teacherId, day: day as any },
    })

    for (const slot of slots) {
      const lesson = await prisma.lesson.findUnique({
        where: { timetableId_date: { timetableId: slot.id, date: targetDate } },
      })
      if (!lesson) {
        flags.push({
          teacherId:   att.teacher.id,
          teacherName: att.teacher.name,
          type:        'CHECKED_IN_NO_LESSON',
          detail:      `Checked in but no lesson recorded for ${slot.subject} (${slot.class}) at ${slot.timeSlot}`,
        })
      }
    }
  }

  // 2. Absent teachers with no substitute assigned
  const absentAttendances = await prisma.attendance.findMany({
    where: { date: targetDate, status: 'ABSENT' },
    include: { teacher: { select: { id: true, name: true } } },
  })

  for (const att of absentAttendances) {
    const missedLessons = await prisma.lesson.findMany({
      where: { teacherId: att.teacherId, date: targetDate, status: 'MISSED' },
      include: { timetable: true },
    })

    for (const lesson of missedLessons) {
      const hasSub = await prisma.substitute.findUnique({
        where: { lessonId: lesson.id },
      })
      if (!hasSub) {
        flags.push({
          teacherId:   att.teacher.id,
          teacherName: att.teacher.name,
          type:        'ABSENT_NO_SUBSTITUTE',
          detail:      `Absent with no substitute for ${lesson.timetable.subject} (${lesson.timetable.class}) at ${lesson.timetable.timeSlot}`,
        })
      }
    }
  }

  // 3. Failed face verifications
  const failedVerifications = await prisma.faceVerification.findMany({
    where: {
      status: 'FAILED',
      lesson: { date: targetDate },
    },
    include: {
      teacher: { select: { id: true, name: true } },
      lesson:  { include: { timetable: true } },
    },
  })

  for (const v of failedVerifications) {
    flags.push({
      teacherId:   v.teacher.id,
      teacherName: v.teacher.name,
      type:        'FAILED_FACE_VERIFICATION',
      detail:      `Failed face verification for ${v.lesson.timetable.subject} (${v.lesson.timetable.class})`,
    })
  }

  return {
    generatedAt: new Date(),
    date:        formatDate(targetDate),
    totalFlags:  flags.length,
    flags,
  }
}