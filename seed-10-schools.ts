import { Day, UserStatus, AttendanceStatus, LessonStatus } from '@prisma/client'
import { hashPassword } from './src/utils/password'
import prisma from './src/config/prisma'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekdays(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function dayEnum(date: Date): Day {
  const map: Day[] = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'] as Day[]
  return map[date.getDay()]
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const START    = new Date('2026-03-02')
const END      = new Date('2026-05-15')
const WEEKDAYS = getWeekdays(START, END)   // 55 days

// Each teacher: primary subject (Mon/Tue/Wed) + secondary subject (Thu/Fri)
// They teach 3 different class groups
const TEACHER_DATA = [
  { first: 'Hashim',    last: 'Juma',    subject1: 'Mathematics',    subject2: 'Physics',         room1: 'Room 101', room2: 'Lab 1'   },
  { first: 'Grace',     last: 'Mushi',   subject1: 'English',        subject2: 'Kiswahili',       room1: 'Room 102', room2: 'Room 103' },
  { first: 'Peter',     last: 'Ndege',   subject1: 'Chemistry',      subject2: 'Biology',         room1: 'Lab 2',    room2: 'Lab 3'   },
  { first: 'Sarah',     last: 'Komba',   subject1: 'History',        subject2: 'Geography',       room1: 'Room 104', room2: 'Room 105' },
  { first: 'David',     last: 'Mwita',   subject1: 'Computer Science', subject2: 'Mathematics',   room1: 'ICT Lab',  room2: 'Room 101' },
  { first: 'Mary',      last: 'Njau',    subject1: 'Biology',        subject2: 'Chemistry',       room1: 'Lab 3',    room2: 'Lab 2'   },
  { first: 'James',     last: 'Kondo',   subject1: 'Civics',         subject2: 'History',         room1: 'Room 106', room2: 'Room 104' },
  { first: 'Elizabeth', last: 'Mlay',    subject1: 'Commerce',       subject2: 'Agriculture',     room1: 'Room 107', room2: 'Room 108' },
]

// Classes: 4 forms × 2 streams (A/B)
const CLASSES = ['Form 1A', 'Form 1B', 'Form 2A', 'Form 2B', 'Form 3A', 'Form 3B', 'Form 4A', 'Form 4B']

// Time slots spread across the school day
const TIME_SLOTS = [
  { slot: '07:00-08:00', label: 'Period 1' },
  { slot: '08:00-09:00', label: 'Period 2' },
  { slot: '09:00-10:00', label: 'Period 3' },
  { slot: '10:30-11:30', label: 'Period 4' },  // after break
  { slot: '11:30-12:30', label: 'Period 5' },
  { slot: '13:30-14:30', label: 'Period 6' },  // after lunch
  { slot: '14:30-15:30', label: 'Period 7' },
]

const SCHOOL_DAYS: Day[] = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']

// 10 Schools
const SCHOOLS = [
  { name: 'Mlimani Secondary School',      code: 'mlimani',      address: 'Mlimani City, Dar es Salaam',   lat: -6.769869, lng: 39.246234, radius: 150 },
  { name: 'Kariakoo Secondary School',     code: 'kariakoo',     address: 'Kariakoo, Dar es Salaam',       lat: -6.818927, lng: 39.275543, radius: 150 },
  { name: 'Kinondoni Secondary School',    code: 'kinondoni',    address: 'Kinondoni, Dar es Salaam',      lat: -6.780234, lng: 39.268123, radius: 150 },
  { name: 'Ilala Secondary School',        code: 'ilala',        address: 'Ilala, Dar es Salaam',          lat: -6.810567, lng: 39.256789, radius: 150 },
  { name: 'Temeke Secondary School',       code: 'temeke',       address: 'Temeke, Dar es Salaam',         lat: -6.840123, lng: 39.298456, radius: 150 },
  { name: 'Mbagala Secondary School',      code: 'mbagala',      address: 'Mbagala, Dar es Salaam',        lat: -6.860234, lng: 39.318567, radius: 150 },
  { name: 'Kigamboni Secondary School',    code: 'kigamboni',    address: 'Kigamboni, Dar es Salaam',      lat: -6.878901, lng: 39.320234, radius: 150 },
  { name: 'Ubungo Secondary School',       code: 'ubungo',       address: 'Ubungo, Dar es Salaam',         lat: -6.772345, lng: 39.234567, radius: 150 },
  { name: 'Mwananyamala Secondary School', code: 'mwananyamala', address: 'Mwananyamala, Dar es Salaam',   lat: -6.793456, lng: 39.272345, radius: 150 },
  { name: 'Magomeni Secondary School',     code: 'magomeni',     address: 'Magomeni, Dar es Salaam',       lat: -6.801234, lng: 39.265432, radius: 150 },
]

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding 10 schools with 3 months of data...\n')

  // Wipe all existing data
  console.log('🧹 Clearing existing data...')
  await prisma.locationVerification.deleteMany()
  await prisma.faceVerification.deleteMany()
  await prisma.faceProfile.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.substitute.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.schoolHoliday.deleteMany()
  await prisma.timetable.deleteMany()
  await prisma.allowedLocation.deleteMany()
  await prisma.user.deleteMany()
  await prisma.school.deleteMany()
  console.log('  ✅ Done\n')

  const teacherPassword   = await hashPassword('Teacher@2025')
  const adminPassword     = await hashPassword('Admin@2025')
  const principalPassword = await hashPassword('Principal@2025')

  let totalAttendance = 0
  let totalLessons    = 0
  let totalLeaves     = 0

  for (let si = 0; si < SCHOOLS.length; si++) {
    const sch = SCHOOLS[si]
    console.log(`📍 [${si + 1}/10] Creating ${sch.name}...`)

    // ── School ──────────────────────────────────────────────────────────────
    const school = await prisma.school.create({
      data: {
        name:             sch.name,
        address:          sch.address,
        latitude:         sch.lat,
        longitude:        sch.lng,
        radiusMetres:     sch.radius,
        lateCutoffHour:   8,
        lateCutoffMinute: 0,
        isActive:         true,
      },
    })

    // ── Allowed locations ────────────────────────────────────────────────────
    await prisma.allowedLocation.createMany({
      data: [
        { schoolId: school.id, name: 'Main Campus',   latitude: sch.lat,           longitude: sch.lng,           radiusMetres: sch.radius, isActive: true },
        { schoolId: school.id, name: 'Science Block',  latitude: sch.lat - 0.0001, longitude: sch.lng + 0.0001, radiusMetres: 100,        isActive: true },
        { schoolId: school.id, name: 'Sports Field',   latitude: sch.lat + 0.0001, longitude: sch.lng - 0.0001, radiusMetres: 200,        isActive: true },
      ],
    })

    // ── Admin ────────────────────────────────────────────────────────────────
    const admin = await prisma.user.create({
      data: {
        schoolId: school.id,
        name:     `Admin ${sch.name.split(' ')[0]}`,
        email:    `admin@${sch.code}.tz`,
        password: adminPassword,
        role:     'ADMIN',
        status:   UserStatus.ACTIVE,
        isActive: true,
      },
    })

    // ── Principal ────────────────────────────────────────────────────────────
    await prisma.user.create({
      data: {
        schoolId: school.id,
        name:     `Principal ${sch.name.split(' ')[0]}`,
        email:    `principal@${sch.code}.tz`,
        password: principalPassword,
        role:     'PRINCIPAL',
        status:   UserStatus.ACTIVE,
        isActive: true,
      },
    })

    // ── 8 Teachers with consistent subjects ──────────────────────────────────
    const teachers: any[] = []
    for (let ti = 0; ti < TEACHER_DATA.length; ti++) {
      const td = TEACHER_DATA[ti]
      const teacher = await prisma.user.create({
        data: {
          schoolId: school.id,
          name:     `${td.first} ${td.last}`,
          email:    `${td.first.toLowerCase()}.${td.last.toLowerCase()}@${sch.code}.tz`,
          password: teacherPassword,
          role:     'TEACHER',
          status:   UserStatus.ACTIVE,
          isActive: true,
          phone:    `+2557${si}${String(ti).padStart(2,'0')}0001`,
        },
      })
      teachers.push({ ...teacher, data: td })
    }

    // ── Timetable: each teacher → 3 classes × both subjects across 5 days ───
    // Slots per teacher: 12 per week (Mon–Wed: subject1 × 2 slots, Thu–Fri: subject2 × 2 slots, +2 extra)
    const timetables: any[] = []

    // Assign each teacher a unique set of classes to avoid same class/time conflicts
    const classGroups: string[][] = [
      ['Form 1A', 'Form 2B', 'Form 3A'],
      ['Form 1B', 'Form 2A', 'Form 3B'],
      ['Form 1A', 'Form 2A', 'Form 4A'],
      ['Form 1B', 'Form 2B', 'Form 4B'],
      ['Form 3A', 'Form 4A', 'Form 1A'],
      ['Form 3B', 'Form 4B', 'Form 1B'],
      ['Form 2A', 'Form 3A', 'Form 4A'],
      ['Form 2B', 'Form 3B', 'Form 4B'],
    ]

    // Build a school-wide slot registry to detect conflicts
    // Key: day-timeSlot-className → teacherId
    const slotRegistry = new Map<string, number>()

    for (let ti = 0; ti < teachers.length; ti++) {
      const teacher = teachers[ti]
      const td      = teacher.data
      const classes = classGroups[ti]

      // Monday–Wednesday: primary subject (subject1)
      // Thursday–Friday: secondary subject (subject2)
      const weekPlan: { day: Day; subject: string; room: string }[] = [
        { day: 'MONDAY',    subject: td.subject1, room: td.room1 },
        { day: 'TUESDAY',   subject: td.subject1, room: td.room1 },
        { day: 'WEDNESDAY', subject: td.subject1, room: td.room1 },
        { day: 'THURSDAY',  subject: td.subject2, room: td.room2 },
        { day: 'FRIDAY',    subject: td.subject2, room: td.room2 },
      ]

      // Assign time slots: spread across the day to avoid conflicts
      // Each teacher gets 2 slots per day (one per class group, skipping one class each day)
      const slotBase = (ti * 2) % TIME_SLOTS.length

      for (let di = 0; di < weekPlan.length; di++) {
        const { day, subject, room } = weekPlan[di]
        const slot1 = TIME_SLOTS[slotBase % TIME_SLOTS.length]
        const slot2 = TIME_SLOTS[(slotBase + 3) % TIME_SLOTS.length]

        // Assign to 2 of the 3 classes each day, rotating daily
        const classIdx1 = di % classes.length
        const classIdx2 = (di + 1) % classes.length
        const classesForDay = [classes[classIdx1], classes[classIdx2]]

        for (let ci = 0; ci < classesForDay.length; ci++) {
          const className = classesForDay[ci]
          const timeSlot  = ci === 0 ? slot1 : slot2
          const regKey    = `${day}-${timeSlot.slot}-${className}`

          // Skip if another teacher already has this class at this time
          if (slotRegistry.has(regKey)) continue

          try {
            const tt = await prisma.timetable.create({
              data: {
                schoolId:  school.id,
                teacherId: teacher.id,
                subject,
                class:     className,
                day,
                timeSlot:  timeSlot.slot,
                room,
              },
            })
            slotRegistry.set(regKey, teacher.id)
            timetables.push({ ...tt, teacher })
          } catch (_) {}
        }
      }
    }

    // ── Holidays (Tanzania national holidays in the seed window) ─────────────
    const holidays = [
      { name: 'Sheikh Abeid Karume Day', date: new Date('2026-04-07') },
      { name: 'Union Day',               date: new Date('2026-04-26') },
      { name: 'Workers Day',             date: new Date('2026-05-01') },
    ]
    for (const h of holidays) {
      await prisma.schoolHoliday.create({
        data: { schoolId: school.id, name: h.name, date: h.date },
      }).catch(() => {})
    }
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]))

    // ── 3 months of attendance (55 weekdays, excluding holidays) ────────────
    const workDays = WEEKDAYS.filter(d => !holidayDates.has(d.toISOString().split('T')[0]))

    for (const teacher of teachers) {
      // Hashim (ti=0 at school 0) is a star teacher — higher presence rate
      const isHashimAtMlimani = teacher.name === 'Hashim Juma' && si === 0
      const absentRate  = isHashimAtMlimani ? 0.02 : 0.05
      const lateRate    = isHashimAtMlimani ? 0.05 : 0.10

      for (const day of workDays) {
        const rand = Math.random()

        if (rand < absentRate) {
          await prisma.attendance.create({
            data: {
              teacherId: teacher.id,
              date:      day,
              timeIn:    new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0),
              latitude:  sch.lat,
              longitude: sch.lng,
              status:    AttendanceStatus.ABSENT,
            },
          })
        } else if (rand < absentRate + lateRate) {
          const lateMin = randomBetween(1, 30)
          await prisma.attendance.create({
            data: {
              teacherId: teacher.id,
              date:      day,
              timeIn:    new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, lateMin),
              latitude:  sch.lat,
              longitude: sch.lng,
              status:    AttendanceStatus.LATE,
            },
          })
        } else {
          const earlyMin = randomBetween(0, 55)
          await prisma.attendance.create({
            data: {
              teacherId: teacher.id,
              date:      day,
              timeIn:    new Date(day.getFullYear(), day.getMonth(), day.getDate(), 7, earlyMin),
              latitude:  sch.lat,
              longitude: sch.lng,
              status:    AttendanceStatus.PRESENT,
            },
          })
        }
        totalAttendance++
      }
    }

    // ── Lessons from timetable × workdays ────────────────────────────────────
    const lessonMap = new Map<string, any>()

    for (const tt of timetables) {
      for (const day of workDays) {
        if (dayEnum(day) !== tt.day) continue

        // Hashim at Mlimani conducts 95% of lessons; everyone else 90%
        const isHashim = tt.teacher.name === 'Hashim Juma' && si === 0
        const rand     = Math.random()
        const missRate = isHashim ? 0.02 : 0.05
        const subRate  = isHashim ? 0.03 : 0.05

        const isMissed = rand < missRate
        const isSub    = !isMissed && rand < missRate + subRate

        try {
          const lesson = await prisma.lesson.create({
            data: {
              teacherId:   tt.teacherId,
              timetableId: tt.id,
              date:        day,
              status:      isMissed ? LessonStatus.MISSED
                         : isSub    ? LessonStatus.SUBSTITUTED
                                    : LessonStatus.CONDUCTED,
              notes: isMissed
                ? pick(['Teacher absent', 'School event', 'Emergency'])
                : isSub
                ? 'Covered by substitute teacher'
                : null,
            },
          })
          lessonMap.set(`${tt.id}-${day.toISOString().split('T')[0]}`, { lesson, tt, isSub })
          totalLessons++
        } catch (_) {}
      }
    }

    // ── Substitutions for SUBSTITUTED lessons ────────────────────────────────
    for (const [, val] of lessonMap) {
      if (!val.isSub) continue
      const otherTeachers = teachers.filter(t => t.id !== val.tt.teacherId)
      if (!otherTeachers.length) continue
      const sub = pick(otherTeachers)
      try {
        await prisma.substitute.create({
          data: {
            originalTeacherId:   val.tt.teacherId,
            substituteTeacherId: sub.id,
            lessonId:            val.lesson.id,
            date:                val.lesson.date,
          },
        })
      } catch (_) {}
    }

    // ── Leave requests (2–4 per school, realistic data) ───────────────────────
    const leaveCount = randomBetween(2, 4)
    const leaveReasons = [
      'Medical appointment', 'Family emergency',
      'Professional training', 'Personal reasons', 'Bereavement leave',
    ]
    for (let li = 0; li < leaveCount; li++) {
      const teacher   = teachers[li % teachers.length]
      const startIdx  = randomBetween(0, workDays.length - 5)
      const startDate = workDays[startIdx]
      const endDate   = workDays[Math.min(startIdx + randomBetween(1, 3), workDays.length - 1)]
      const statuses  = ['APPROVED', 'APPROVED', 'PENDING', 'REJECTED']
      const status    = statuses[li % statuses.length] as any

      try {
        await prisma.leaveRequest.create({
          data: {
            teacherId:  teacher.id,
            startDate,
            endDate,
            reason:     pick(leaveReasons),
            status,
            reviewedBy: status !== 'PENDING' ? admin.id : null,
            reviewedAt: status !== 'PENDING' ? new Date() : null,
          },
        })
        totalLeaves++
      } catch (_) {}
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    await prisma.notification.createMany({
      data: teachers.slice(0, 3).map(t => ({
        userId:  t.id,
        type:    'CHECK_IN_REMINDER' as any,
        title:   'Check-in Reminder',
        message: 'Please remember to check in when you arrive at school.',
        isRead:  false,
      })),
    })

    const ttCount = timetables.length
    console.log(`  ✅ ${sch.name} — 8 teachers, ${workDays.length} work days, ${ttCount} timetable slots`)
  }

  // ── Final summary ──────────────────────────────────────────────────────────
  console.log(`
✅ Seeding complete!

📊 Summary:
  • Schools:       ${SCHOOLS.length}
  • Teachers:      ${SCHOOLS.length * 8} (8 per school)
  • Attendance:    ~${totalAttendance} records (3 months)
  • Lessons:       ~${totalLessons} records
  • Leaves:        ${totalLeaves} requests
  • Period:        ${START.toDateString()} → ${END.toDateString()}

🔐 Login credentials per school:
  Admin:     admin@<code>.tz      / Admin@2025
  Principal: principal@<code>.tz  / Principal@2025
  Teachers:  <first>.<last>@<code>.tz / Teacher@2025

👨‍🏫 Teacher roster (same names across all schools):
  hashim.juma      → Mathematics + Physics   (Room 101 / Lab 1)
  grace.mushi      → English + Kiswahili     (Room 102 / Room 103)
  peter.ndege      → Chemistry + Biology     (Lab 2 / Lab 3)
  sarah.komba      → History + Geography     (Room 104 / Room 105)
  david.mwita      → Computer Science + Math (ICT Lab / Room 101)
  mary.njau        → Biology + Chemistry     (Lab 3 / Lab 2)
  james.kondo      → Civics + History        (Room 106 / Room 104)
  elizabeth.mlay   → Commerce + Agriculture  (Room 107 / Room 108)

🏫 School codes:
${SCHOOLS.map(s => `  • ${s.code.padEnd(16)} → ${s.name}`).join('\n')}
  `)
}

seed()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
