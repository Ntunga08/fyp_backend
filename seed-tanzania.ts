import prisma from './src/config/prisma.js'
import { hashPassword } from './src/utils/password.js'

async function seed() {
  console.log('🌱 Seeding Tanzania data...\n')

  try {
    // Create Schools
    console.log('📍 Creating schools...')
    const school1 = await prisma.school.create({
      data: {
        name: 'Azania Secondary School',
        address: 'Kinondoni, Dar es Salaam',
        latitude: -6.7924,
        longitude: 39.2083,
        radiusMetres: 150,
        lateCutoffHour: 8,
        lateCutoffMinute: 15
      }
    })
    console.log(`  ✅ Created: ${school1.name} (ID: ${school1.id})`)

    const school2 = await prisma.school.create({
      data: {
        name: 'Jangwani Secondary School',
        address: 'Ilala, Dar es Salaam',
        latitude: -6.8160,
        longitude: 39.2803,
        radiusMetres: 120,
        lateCutoffHour: 8,
        lateCutoffMinute: 0
      }
    })
    console.log(`  ✅ Created: ${school2.name} (ID: ${school2.id})`)

    // Create Admin
    console.log('\n📍 Creating admin...')
    const adminPassword = await hashPassword('Admin@2025')
    const admin = await prisma.user.create({
      data: {
        name: 'Bi Titi Mohamed',
        email: 'admin@edutrack.tz',
        password: adminPassword,
        role: 'ADMIN',
        schoolId: school1.id,
        phone: '+255713000002'
      }
    })
    console.log(`  ✅ Created: ${admin.name} (${admin.email})`)

    // Create Principal
    console.log('\n📍 Creating principal...')
    const principalPassword = await hashPassword('Principal@2025')
    const principal = await prisma.user.create({
      data: {
        name: 'Mwalimu Julius Nyerere',
        email: 'principal@azania.tz',
        password: principalPassword,
        role: 'PRINCIPAL',
        schoolId: school1.id,
        phone: '+255713000001'
      }
    })
    console.log(`  ✅ Created: ${principal.name} (${principal.email})`)

    // Create Teachers
    console.log('\n📍 Creating teachers...')
    const teachers = [
      { name: 'Juma Mwinyimkuu', email: 'juma.mwinyimkuu@azania.tz', phone: '+255713100001', schoolId: school1.id },
      { name: 'Fatuma Hassan', email: 'fatuma.hassan@azania.tz', phone: '+255713100002', schoolId: school1.id },
      { name: 'Baraka Mtoro', email: 'baraka.mtoro@azania.tz', phone: '+255713100003', schoolId: school1.id },
      { name: 'Neema Kimaro', email: 'neema.kimaro@azania.tz', phone: '+255713100004', schoolId: school1.id },
      { name: 'Hamisi Juma', email: 'hamisi.juma@azania.tz', phone: '+255713100005', schoolId: school1.id },
      { name: 'Amina Salum', email: 'amina.salum@jangwani.tz', phone: '+255713200001', schoolId: school2.id },
      { name: 'Rashid Omari', email: 'rashid.omari@jangwani.tz', phone: '+255713200002', schoolId: school2.id },
      { name: 'Halima Mwita', email: 'halima.mwita@jangwani.tz', phone: '+255713200003', schoolId: school2.id },
      { name: 'Selemani Ally', email: 'selemani.ally@jangwani.tz', phone: '+255713200004', schoolId: school2.id },
      { name: 'Zuhura Bakari', email: 'zuhura.bakari@jangwani.tz', phone: '+255713200005', schoolId: school2.id }
    ]

    const teacherPassword = await hashPassword('Teacher@2025')
    for (const teacher of teachers) {
      const created = await prisma.user.create({
        data: {
          ...teacher,
          password: teacherPassword,
          role: 'TEACHER'
        }
      })
      console.log(`  ✅ Created: ${created.name} (${created.email})`)
    }

    // Create Tanzania Holidays 2025
    console.log('\n📍 Creating Tanzania public holidays 2025...')
    const holidays = [
      { name: 'New Year\'s Day', date: '2025-01-01', description: 'Start of the new year' },
      { name: 'Zanzibar Revolution Day', date: '2025-01-12', description: 'Commemoration of the 1964 revolution' },
      { name: 'Eid al-Fitr', date: '2025-03-31', description: 'End of Ramadan' },
      { name: 'Good Friday', date: '2025-04-18', description: 'Christian holiday' },
      { name: 'Easter Monday', date: '2025-04-21', description: 'Christian holiday' },
      { name: 'Union Day', date: '2025-04-26', description: 'Union of Tanganyika and Zanzibar' },
      { name: 'Workers\' Day', date: '2025-05-01', description: 'International Workers\' Day' },
      { name: 'Eid al-Adha', date: '2025-06-07', description: 'Festival of Sacrifice' },
      { name: 'Saba Saba Day', date: '2025-07-07', description: 'Peasants\' Day' },
      { name: 'Nane Nane Day', date: '2025-08-08', description: 'Farmers\' Day' },
      { name: 'Maulid Day', date: '2025-09-05', description: 'Prophet Muhammad\'s Birthday' },
      { name: 'Independence Day', date: '2025-12-09', description: 'Tanzania Independence' },
      { name: 'Christmas Day', date: '2025-12-25', description: 'Christian holiday' },
      { name: 'Boxing Day', date: '2025-12-26', description: 'Day after Christmas' }
    ]

    for (const holiday of holidays) {
      await prisma.schoolHoliday.create({
        data: {
          ...holiday,
          date: new Date(holiday.date),
          schoolId: school1.id
        }
      })
      await prisma.schoolHoliday.create({
        data: {
          ...holiday,
          date: new Date(holiday.date),
          schoolId: school2.id
        }
      })
    }
    console.log(`  ✅ Created ${holidays.length} holidays for each school`)

    console.log('\n✅ Seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  • Schools: 2`)
    console.log(`  • Admin: 1`)
    console.log(`  • Principal: 1`)
    console.log(`  • Teachers: 10`)
    console.log(`  • Holidays: ${holidays.length * 2}`)
    console.log('\n🔐 Login Credentials:')
    console.log(`  Admin: admin@edutrack.tz / Admin@2025`)
    console.log(`  Principal: principal@azania.tz / Principal@2025`)
    console.log(`  Teachers: <email> / Teacher@2025`)

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seed()
