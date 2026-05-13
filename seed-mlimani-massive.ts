import { PrismaClient, Day, UserStatus, AttendanceStatus, LessonStatus, LeaveStatus } from '@prisma/client'
import { hashPassword } from './src/utils/password'
import prisma from './src/config/prisma'

async function seed() {
  console.log('🌱 Populating Mlimani School with MASSIVE test data...\n')

  try {
    // Get Mlimani School
    const school = await prisma.school.findFirst({
      where: { name: 'Mlimani Secondary School' }
    })

    if (!school) {
      throw new Error('Mlimani School not found! Run seed-mlimani-complete.ts first')
    }

    console.log(`✅ Found: ${school.name} (ID: ${school.id})\n`)

    // Get all teachers at Mlimani
    const teachers = await prisma.user.findMany({
      where: { 
        schoolId: school.id,
        role: 'TEACHER',
        status: UserStatus.ACTIVE
      }
    })

    console.log(`✅ Found ${teachers.length} teachers\n`)

    // 1. CREATE MORE TIMETABLE ENTRIES (Complete weekly schedule for all teachers)
    console.log('📅 Creating comprehensive timetables...')
    
    const classes = [
      'Form 1A', 'Form 1B', 'Form 1C',
      'Form 2A', 'Form 2B', 'Form 2C',
      'Form 3A', 'Form 3B', 'Form 3C',
      'Form 4A', 'Form 4B', 'Form 4C'
    ]
    
    const timeSlots = [
      '07:30-08:30',
      '08:30-09:30',
      '09:30-10:30',
      '10:30-11:30', // Break
      '11:45-12:45',
      '12:45-13:45',
      '13:45-14:45', // Lunch
      '15:00-16:00'
    ]
    
    const days: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    const subjects = [
      'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology',
      'History', 'Geography', 'Kiswahili', 'Computer Science', 'Civics'
    ]

    // Delete existing timetables for Mlimani to avoid duplicates
    await prisma.timetable.deleteMany({
      where: { schoolId: school.id }
    })

    let timetableCount = 0
    for (const teacher of teachers) {
      const teacherSubject = subjects[teachers.indexOf(teacher) % subjects.length]
      
      // Each teacher gets 4-6 classes per day
      for (const day of days) {
        const numClasses = 4 + Math.floor(Math.random() * 3) // 4-6 classes
        
        for (let i = 0; i < numClasses; i++) {
          const classIndex = Math.floor(Math.random() * classes.length)
          const timeSlotIndex = i * 2 // Spread throughout the day
          
          if (timeSlotIndex < timeSlots.length) {
            await prisma.timetable.create({
              data: {
                schoolId: school.id,
                teacherId: teacher.id,
                subject: teacherSubject,
                class: classes[classIndex],
                day: day,
                timeSlot: timeSlots[timeSlotIndex],
                room: `Room ${Math.floor(Math.random() * 30) + 1}`,
              },
            })
            timetableCount++
          }
        }
      }
    }
    console.log(`  ✅ Created ${timetableCount} timetable entries\n`)

    // 2. CREATE ATTENDANCE RECORDS (Last 60 days)
    console.log('📊 Creating attendance records (last 60 days)...')
    
    const today = new Date()
    let attendanceCount = 0
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue
      
      for (const teacher of teachers) {
        // 90% attendance rate (some teachers miss some days)
        if (Math.random() > 0.1) {
          const hour = 7 + Math.floor(Math.random() * 2) // 7-8 AM
          const minute = Math.floor(Math.random() * 60)
          
          const timeIn = new Date(date)
          timeIn.setHours(hour, minute, 0)
          
          // Determine status based on time
          let status: AttendanceStatus = AttendanceStatus.PRESENT
          if (hour > school.lateCutoffHour || (hour === school.lateCutoffHour && minute > school.lateCutoffMinute)) {
            status = AttendanceStatus.LATE
          }

          try {
            await prisma.attendance.create({
              data: {
                teacherId: teacher.id,
                date: date,
                timeIn: timeIn,
                latitude: school.latitude + (Math.random() - 0.5) * 0.001,
                longitude: school.longitude + (Math.random() - 0.5) * 0.001,
                status: status,
              },
            })
            attendanceCount++
          } catch (error) {
            // Skip if duplicate (already exists)
          }
        }
      }
    }
    console.log(`  ✅ Created ${attendanceCount} attendance records\n`)

    // 3. CREATE LEAVE REQUESTS (Mix of pending, approved, rejected)
    console.log('📝 Creating leave requests...')
    
    const leaveReasons = [
      'Medical appointment',
      'Family emergency',
      'Personal matters',
      'Attending workshop',
      'Sick leave',
      'Maternity leave',
      'Bereavement',
      'Religious observance',
      'Professional development',
      'Court appearance'
    ]
    
    let leaveCount = 0
    const principal = await prisma.user.findFirst({
      where: { 
        schoolId: school.id,
        role: 'PRINCIPAL'
      }
    })

    for (const teacher of teachers) {
      // Each teacher has 3-7 leave requests
      const numRequests = 3 + Math.floor(Math.random() * 5)
      
      for (let i = 0; i < numRequests; i++) {
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 60) - 30) // -30 to +30 days
        
        const duration = 1 + Math.floor(Math.random() * 5) // 1-5 days
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + duration - 1)
        
        // 60% approved, 20% rejected, 20% pending
        const rand = Math.random()
        let status: LeaveStatus
        let reviewedBy = null
        let reviewedAt = null
        let reviewNote = null
        
        if (rand < 0.6) {
          status = LeaveStatus.APPROVED
          reviewedBy = principal?.id
          reviewedAt = new Date(startDate)
          reviewedAt.setDate(reviewedAt.getDate() - 2)
          reviewNote = 'Approved'
        } else if (rand < 0.8) {
          status = LeaveStatus.REJECTED
          reviewedBy = principal?.id
          reviewedAt = new Date(startDate)
          reviewedAt.setDate(reviewedAt.getDate() - 2)
          reviewNote = 'Insufficient notice provided'
        } else {
          status = LeaveStatus.PENDING
        }

        await prisma.leaveRequest.create({
          data: {
            teacherId: teacher.id,
            startDate: startDate,
            endDate: endDate,
            reason: leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
            status: status,
            reviewedBy: reviewedBy,
            reviewedAt: reviewedAt,
            reviewNote: reviewNote,
          },
        })
        leaveCount++
      }
    }
    console.log(`  ✅ Created ${leaveCount} leave requests\n`)

    // 4. CREATE LESSONS (Last 30 days)
    console.log('📚 Creating lesson records...')
    
    const timetables = await prisma.timetable.findMany({
      where: { schoolId: school.id },
    })
    
    let lessonCount = 0
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue
      
      const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][date.getDay()] as Day
      
      // Get timetables for this day
      const dayTimetables = timetables.filter(t => t.day === dayName)
      
      for (const timetable of dayTimetables) {
        // 95% of lessons are conducted
        const rand = Math.random()
        let status: LessonStatus
        let notes = ''
        
        if (rand < 0.90) {
          status = LessonStatus.CONDUCTED
          notes = 'Lesson completed successfully'
        } else if (rand < 0.95) {
          status = LessonStatus.SUBSTITUTED
          notes = 'Teacher was absent, substitute assigned'
        } else {
          status = LessonStatus.MISSED
          notes = 'Lesson could not be conducted'
        }

        try {
          await prisma.lesson.create({
            data: {
              teacherId: timetable.teacherId,
              timetableId: timetable.id,
              date: date,
              status: status,
              notes: notes,
            },
          })
          lessonCount++
        } catch (error) {
          // Skip if duplicate
        }
      }
    }
    console.log(`  ✅ Created ${lessonCount} lesson records\n`)

    // 5. CREATE SUBSTITUTIONS
    console.log('🔄 Creating substitute assignments...')
    
    const substitutedLessons = await prisma.lesson.findMany({
      where: {
        status: LessonStatus.SUBSTITUTED,
        substitute: null,
      },
      include: {
        timetable: true,
      },
    })
    
    let substituteCount = 0
    
    for (const lesson of substitutedLessons) {
      // Find a random teacher to substitute
      const substituteTeacher = teachers[Math.floor(Math.random() * teachers.length)]
      
      // Don't substitute with the same teacher
      if (substituteTeacher.id !== lesson.teacherId) {
        try {
          await prisma.substitute.create({
            data: {
              originalTeacherId: lesson.teacherId,
              substituteTeacherId: substituteTeacher.id,
              lessonId: lesson.id,
              date: lesson.date,
              reason: 'Original teacher on leave',
            },
          })
          substituteCount++
        } catch (error) {
          // Skip if duplicate
        }
      }
    }
    console.log(`  ✅ Created ${substituteCount} substitute assignments\n`)

    // 6. CREATE NOTIFICATIONS
    console.log('🔔 Creating notifications...')
    
    const notificationTypes = [
      { type: 'CHECK_IN_REMINDER', title: 'Check-in Reminder', message: 'Don\'t forget to check in for today\'s attendance' },
      { type: 'LEAVE_APPROVED', title: 'Leave Approved', message: 'Your leave request has been approved' },
      { type: 'LEAVE_REJECTED', title: 'Leave Rejected', message: 'Your leave request has been rejected' },
      { type: 'SUBSTITUTE_ASSIGNED', title: 'Substitute Assignment', message: 'You have been assigned as a substitute teacher' },
      { type: 'MISSED_LESSON', title: 'Missed Lesson Alert', message: 'You have a missed lesson that needs attention' },
    ]
    
    let notificationCount = 0
    
    for (const teacher of teachers) {
      // Each teacher gets 5-10 notifications
      const numNotifications = 5 + Math.floor(Math.random() * 6)
      
      for (let i = 0; i < numNotifications; i++) {
        const notif = notificationTypes[Math.floor(Math.random() * notificationTypes.length)]
        
        await prisma.notification.create({
          data: {
            userId: teacher.id,
            type: notif.type as any,
            title: notif.title,
            message: notif.message,
            isRead: Math.random() > 0.3, // 70% read
          },
        })
        notificationCount++
      }
    }
    console.log(`  ✅ Created ${notificationCount} notifications\n`)

    // 7. CREATE AUDIT LOGS
    console.log('📋 Creating audit logs...')
    
    const actions = [
      'CHECKED_IN',
      'REQUESTED_LEAVE',
      'APPROVED_LEAVE',
      'REJECTED_LEAVE',
      'ASSIGNED_SUBSTITUTE',
      'MARKED_LESSON_CONDUCTED',
      'UPDATED_PROFILE',
    ]
    
    let auditCount = 0
    
    for (const teacher of teachers) {
      // Each teacher has 10-20 audit logs
      const numLogs = 10 + Math.floor(Math.random() * 11)
      
      for (let i = 0; i < numLogs; i++) {
        await prisma.auditLog.create({
          data: {
            userId: teacher.id,
            action: actions[Math.floor(Math.random() * actions.length)],
            entity: 'Attendance',
            entityId: Math.floor(Math.random() * 1000),
            details: JSON.stringify({ timestamp: new Date() }),
          },
        })
        auditCount++
      }
    }
    console.log(`  ✅ Created ${auditCount} audit logs\n`)

    // SUMMARY
    console.log('✅ Mlimani School is now FULLY POPULATED!\n')
    console.log('📊 Final Summary:')
    console.log(`  • School: ${school.name}`)
    console.log(`  • Teachers: ${teachers.length}`)
    console.log(`  • Timetable Entries: ${timetableCount}`)
    console.log(`  • Attendance Records: ${attendanceCount} (last 60 days)`)
    console.log(`  • Leave Requests: ${leaveCount}`)
    console.log(`  • Lessons: ${lessonCount} (last 30 days)`)
    console.log(`  • Substitutions: ${substituteCount}`)
    console.log(`  • Notifications: ${notificationCount}`)
    console.log(`  • Audit Logs: ${auditCount}\n`)

    console.log('🎉 You can now test ALL features with realistic data!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
