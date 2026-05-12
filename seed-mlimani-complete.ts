import { Day, UserStatus } from '@prisma/client'
import { hashPassword } from './src/utils/password'
import prisma from './src/config/prisma'

async function seed() {
  console.log('🌱 Seeding Mlimani School with complete data...\n')

  try {
    // 1. Create Mlimani School
    console.log('📍 Creating Mlimani Secondary School...')
    const school = await prisma.school.create({
      data: {
        name: 'Mlimani Secondary School',
        address: 'Mlimani City, Dar es Salaam',
        latitude: -6.7924,
        longitude: 39.2083,
        radiusMetres: 150,
        lateCutoffHour: 8,
        lateCutoffMinute: 0,
        isActive: true,
      },
    })
    console.log(`  ✅ Created: ${school.name} (ID: ${school.id})\n`)

    // 2. Create Super Admin
    console.log('📍 Creating Super Admin...')
    const adminPassword = await hashPassword('Admin@2025')
    const admin = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'System Administrator',
        email: 'admin@mlimani.tz',
        password: adminPassword,
        role: 'ADMIN',
        status: UserStatus.ACTIVE,
        phone: '+255712000001',
        isActive: true,
      },
    })
    console.log(`  ✅ Created: ${admin.name} (${admin.email})\n`)

    // 3. Create Principal
    console.log('📍 Creating Principal...')
    const principalPassword = await hashPassword('Principal@2025')
    const principal = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'Dr. Amina Mwakasege',
        email: 'principal@mlimani.tz',
        password: principalPassword,
        role: 'PRINCIPAL',
        status: UserStatus.ACTIVE,
        phone: '+255712000002',
        isActive: true,
      },
    })
    console.log(`  ✅ Created: ${principal.name} (${principal.email})\n`)

    // 4. Create 10 Teachers (All ACTIVE)
    console.log('📍 Creating 10 approved teachers...')
    const teacherPassword = await hashPassword('Teacher@2025')
    
    const teachersData = [
      { name: 'John Kamara', email: 'john.kamara@mlimani.tz', phone: '+255712000101', subject: 'Mathematics' },
      { name: 'Grace Mushi', email: 'grace.mushi@mlimani.tz', phone: '+255712000102', subject: 'English' },
      { name: 'Peter Ndege', email: 'peter.ndege@mlimani.tz', phone: '+255712000103', subject: 'Physics' },
      { name: 'Sarah Komba', email: 'sarah.komba@mlimani.tz', phone: '+255712000104', subject: 'Chemistry' },
      { name: 'David Mwita', email: 'david.mwita@mlimani.tz', phone: '+255712000105', subject: 'Biology' },
      { name: 'Mary Njau', email: 'mary.njau@mlimani.tz', phone: '+255712000106', subject: 'History' },
      { name: 'James Kondo', email: 'james.kondo@mlimani.tz', phone: '+255712000107', subject: 'Geography' },
      { name: 'Elizabeth Mlay', email: 'elizabeth.mlay@mlimani.tz', phone: '+255712000108', subject: 'Kiswahili' },
      { name: 'Robert Msigwa', email: 'robert.msigwa@mlimani.tz', phone: '+255712000109', subject: 'Computer Science' },
      { name: 'Anna Mbwana', email: 'anna.mbwana@mlimani.tz', phone: '+255712000110', subject: 'Civics' },
    ]

    const teachers = []
    for (const teacherData of teachersData) {
      const teacher = await prisma.user.create({
        data: {
          schoolId: school.id,
          name: teacherData.name,
          email: teacherData.email,
          password: teacherPassword,
          role: 'TEACHER',
          status: UserStatus.ACTIVE,
          phone: teacherData.phone,
          isActive: true,
        },
      })
      teachers.push({ ...teacher, subject: teacherData.subject })
      console.log(`  ✅ Created: ${teacher.name} (${teacher.email})`)
    }
    console.log()

    // 5. Create Timetables for all teachers
    console.log('📍 Creating timetables...')
    const classes = ['Form 1A', 'Form 1B', 'Form 2A', 'Form 2B', 'Form 3A', 'Form 3B', 'Form 4A', 'Form 4B']
    const timeSlots = ['08:00-09:00', '09:00-10:00', '10:30-11:30', '11:30-12:30', '13:30-14:30', '14:30-15:30']
    const days: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    
    let timetableCount = 0
    for (const teacher of teachers) {
      // Each teacher gets 2 classes per day
      for (const day of days) {
        const classIndex = Math.floor(Math.random() * classes.length)
        const timeSlotIndex = Math.floor(Math.random() * timeSlots.length)
        
        await prisma.timetable.create({
          data: {
            schoolId: school.id,
            teacherId: teacher.id,
            subject: teacher.subject,
            class: classes[classIndex],
            day: day,
            timeSlot: timeSlots[timeSlotIndex],
            room: `Room ${Math.floor(Math.random() * 20) + 1}`,
          },
        })
        timetableCount++
      }
    }
    console.log(`  ✅ Created ${timetableCount} timetable entries\n`)

    // 6. Create Attendance Records (last 7 days)
    console.log('📍 Creating attendance records...')
    const today = new Date()
    let attendanceCount = 0
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue
      
      for (const teacher of teachers) {
        const timeIn = new Date(date)
        timeIn.setHours(7, 30 + Math.floor(Math.random() * 30), 0)
        
        await prisma.attendance.create({
          data: {
            teacherId: teacher.id,
            date: date,
            timeIn: timeIn,
            latitude: school.latitude + (Math.random() - 0.5) * 0.001,
            longitude: school.longitude + (Math.random() - 0.5) * 0.001,
            status: timeIn.getHours() >= 8 && timeIn.getMinutes() > 15 ? 'LATE' : 'PRESENT',
          },
        })
        attendanceCount++
      }
    }
    console.log(`  ✅ Created ${attendanceCount} attendance records\n`)

    // 7. Create Leave Requests (some pending, some approved)
    console.log('📍 Creating leave requests...')
    const leaveReasons = [
      'Medical appointment',
      'Family emergency',
      'Personal matters',
      'Attending workshop',
      'Sick leave',
    ]
    
    let leaveCount = 0
    for (let i = 0; i < 5; i++) {
      const teacher = teachers[i]
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 10) + 1)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3) + 1)
      
      const isApproved = i < 3 // First 3 are approved
      
      await prisma.leaveRequest.create({
        data: {
          teacherId: teacher.id,
          startDate: startDate,
          endDate: endDate,
          reason: leaveReasons[i],
          status: isApproved ? 'APPROVED' : 'PENDING',
          reviewedBy: isApproved ? principal.id : null,
          reviewedAt: isApproved ? new Date() : null,
          reviewNote: isApproved ? 'Approved' : null,
        },
      })
      leaveCount++
    }
    console.log(`  ✅ Created ${leaveCount} leave requests (3 approved, 2 pending)\n`)

    // 8. Create Lessons with some substitutions
    console.log('📍 Creating lessons and substitutions...')
    const timetables = await prisma.timetable.findMany({
      where: { schoolId: school.id },
      take: 20,
    })
    
    let lessonCount = 0
    let substituteCount = 0
    
    for (let i = 0; i < 15; i++) {
      const timetable = timetables[i % timetables.length]
      const lessonDate = new Date(today)
      lessonDate.setDate(lessonDate.getDate() - Math.floor(Math.random() * 5))
      
      const lesson = await prisma.lesson.create({
        data: {
          teacherId: timetable.teacherId,
          timetableId: timetable.id,
          date: lessonDate,
          status: i < 3 ? 'SUBSTITUTED' : 'CONDUCTED',
          notes: i < 3 ? 'Teacher was absent' : 'Lesson conducted successfully',
        },
      })
      lessonCount++
      
      // Create substitution for first 3 lessons
      if (i < 3) {
        const substituteTeacher = teachers[(i + 5) % teachers.length]
        await prisma.substitute.create({
          data: {
            originalTeacherId: timetable.teacherId,
            substituteTeacherId: substituteTeacher.id,
            lessonId: lesson.id,
            date: lessonDate,
            reason: 'Original teacher on leave',
          },
        })
        substituteCount++
      }
    }
    console.log(`  ✅ Created ${lessonCount} lessons`)
    console.log(`  ✅ Created ${substituteCount} substitutions\n`)

    // 9. Create School Holidays (Tanzania 2025)
    console.log('📍 Creating Tanzania public holidays 2025...')
    const holidays = [
      { name: 'New Year\'s Day', date: new Date('2025-01-01') },
      { name: 'Zanzibar Revolution Day', date: new Date('2025-01-12') },
      { name: 'Eid al-Fitr', date: new Date('2025-03-31') },
      { name: 'Good Friday', date: new Date('2025-04-18') },
      { name: 'Easter Monday', date: new Date('2025-04-21') },
      { name: 'Union Day', date: new Date('2025-04-26') },
      { name: 'Workers\' Day', date: new Date('2025-05-01') },
      { name: 'Eid al-Adha', date: new Date('2025-06-07') },
      { name: 'Saba Saba Day', date: new Date('2025-07-07') },
      { name: 'Nane Nane Day', date: new Date('2025-08-08') },
      { name: 'Maulid Day', date: new Date('2025-09-05') },
      { name: 'Independence Day', date: new Date('2025-12-09') },
      { name: 'Christmas Day', date: new Date('2025-12-25') },
      { name: 'Boxing Day', date: new Date('2025-12-26') },
    ]
    
    for (const holiday of holidays) {
      await prisma.schoolHoliday.create({
        data: {
          schoolId: school.id,
          name: holiday.name,
          date: holiday.date,
          description: `Public holiday in Tanzania`,
        },
      })
    }
    console.log(`  ✅ Created ${holidays.length} holidays\n`)

    // 10. Create Notifications
    console.log('📍 Creating notifications...')
    let notificationCount = 0
    
    for (let i = 0; i < 5; i++) {
      const teacher = teachers[i]
      await prisma.notification.create({
        data: {
          userId: teacher.id,
          type: 'CHECK_IN_REMINDER',
          title: 'Check-in Reminder',
          message: 'Don\'t forget to check in for today\'s attendance',
          isRead: i < 2,
        },
      })
      notificationCount++
    }
    console.log(`  ✅ Created ${notificationCount} notifications\n`)

    console.log('✅ Seeding completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`  • School: ${school.name}`)
    console.log(`  • Admin: 1`)
    console.log(`  • Principal: 1`)
    console.log(`  • Teachers: ${teachers.length} (All ACTIVE)`)
    console.log(`  • Timetables: ${timetableCount}`)
    console.log(`  • Attendance Records: ${attendanceCount}`)
    console.log(`  • Leave Requests: ${leaveCount}`)
    console.log(`  • Lessons: ${lessonCount}`)
    console.log(`  • Substitutions: ${substituteCount}`)
    console.log(`  • Holidays: ${holidays.length}`)
    console.log(`  • Notifications: ${notificationCount}\n`)

    console.log('🔐 Login Credentials:')
    console.log('  Admin: admin@mlimani.tz / Admin@2025')
    console.log('  Principal: principal@mlimani.tz / Principal@2025')
    console.log('  Teachers: <email> / Teacher@2025\n')
    
    console.log('👥 Teacher Emails:')
    teachers.forEach((t) => console.log(`  • ${t.email}`))

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
