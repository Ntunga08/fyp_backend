import http from 'http'

const BASE_URL = 'http://localhost:3000/api'

// Real Tanzanian Schools
const SCHOOLS = [
  {
    name: 'Azania Secondary School',
    address: 'Magomeni, Dar es Salaam',
    latitude: -6.7924,
    longitude: 39.2683,
    radiusMetres: 150,
    lateCutoffHour: 7,
    lateCutoffMinute: 45,
  },
  {
    name: 'Jangwani Secondary School',
    address: 'Jangwani, Dar es Salaam',
    latitude: -6.8162,
    longitude: 39.2803,
    radiusMetres: 200,
    lateCutoffHour: 7,
    lateCutoffMinute: 30,
  },
]

// Real Tanzanian Names - Teachers
const TEACHERS = [
  { name: 'Juma Mwinyimkuu', email: 'juma.mwinyimkuu@azania.tz', phone: '+255712345001', subject: 'Kiswahili' },
  { name: 'Fatuma Hassan', email: 'fatuma.hassan@azania.tz', phone: '+255712345002', subject: 'English' },
  { name: 'Baraka Mtoro', email: 'baraka.mtoro@azania.tz', phone: '+255712345003', subject: 'Mathematics' },
  { name: 'Neema Kimaro', email: 'neema.kimaro@azania.tz', phone: '+255712345004', subject: 'Physics' },
  { name: 'Hamisi Juma', email: 'hamisi.juma@azania.tz', phone: '+255712345005', subject: 'Chemistry' },
  { name: 'Amina Salum', email: 'amina.salum@jangwani.tz', phone: '+255712345006', subject: 'Biology' },
  { name: 'Rashid Omari', email: 'rashid.omari@jangwani.tz', phone: '+255712345007', subject: 'Geography' },
  { name: 'Halima Mwita', email: 'halima.mwita@jangwani.tz', phone: '+255712345008', subject: 'History' },
  { name: 'Selemani Ally', email: 'selemani.ally@jangwani.tz', phone: '+255712345009', subject: 'Civics' },
  { name: 'Zuhura Bakari', email: 'zuhura.bakari@jangwani.tz', phone: '+255712345010', subject: 'Computer Studies' },
]

// Headmaster/Principal
const PRINCIPAL = {
  name: 'Mwalimu Nyerere',
  email: 'principal@azania.tz',
  phone: '+255713000001',
}

// Admin
const ADMIN = {
  name: 'Bi Titi Mohamed',
  email: 'admin@edutrack.tz',
  phone: '+255713000002',
}

const CLASSES = ['Form 1A', 'Form 1B', 'Form 2A', 'Form 2B', 'Form 3A', 'Form 3B', 'Form 4A', 'Form 4B']
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
const TIME_SLOTS = [
  '07:45-08:45',
  '08:45-09:45',
  '09:45-10:45',
  '11:00-12:00',
  '12:00-13:00',
  '14:00-15:00',
]

let ADMIN_TOKEN = ''
let PRINCIPAL_TOKEN = ''
let TEACHER_TOKENS: string[] = []
let TEACHER_IDS: number[] = []
let SCHOOL_IDS: number[] = []
let TIMETABLE_IDS: number[] = []
let LEAVE_IDS: number[] = []

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [] as string[],
}

async function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path)
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 500,
            data: JSON.parse(data),
          })
        } catch {
          resolve({
            status: res.statusCode || 500,
            data: { raw: data },
          })
        }
      })
    })

    req.on('error', reject)
    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

function test(name: string, expected: number, actual: number, details?: string) {
  stats.total++
  if (expected === actual) {
    stats.passed++
    console.log(`  ✅ ${name}`)
  } else {
    stats.failed++
    const error = `${name} (Expected ${expected}, got ${actual})${details ? ': ' + details : ''}`
    stats.errors.push(error)
    console.log(`  ❌ ${error}`)
  }
}

async function step1_RegisterAdmin() {
  console.log('\n📍 STEP 1: Register Admin')
  
  const res = await makeRequest('POST', '/auth/register', {
    name: ADMIN.name,
    email: ADMIN.email,
    password: 'Admin@1234',
    role: 'ADMIN',
    phone: ADMIN.phone,
  })
  
  if (res.status === 201) {
    ADMIN_TOKEN = res.data.data.token
    test('Register Admin', 201, res.status)
  } else if (res.status === 409) {
    // Already exists, login
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: ADMIN.email,
      password: 'Admin@1234',
    })
    if (loginRes.status === 200) {
      ADMIN_TOKEN = loginRes.data.data.token
      console.log('  ℹ️  Admin already exists, logged in')
    }
  } else {
    test('Register Admin', 201, res.status, res.data.message)
  }
}

async function step2_CreateSchools() {
  console.log('\n📍 STEP 2: Create Schools')
  
  for (const school of SCHOOLS) {
    const res = await makeRequest('POST', '/schools', school, ADMIN_TOKEN)
    
    if (res.status === 201) {
      SCHOOL_IDS.push(res.data.data.id)
      test(`Create ${school.name}`, 201, res.status)
    } else if (res.status === 409) {
      // Already exists, get it
      const getRes = await makeRequest('GET', '/schools', undefined, ADMIN_TOKEN)
      const existing = getRes.data.data?.find((s: any) => s.name === school.name)
      if (existing) {
        SCHOOL_IDS.push(existing.id)
        console.log(`  ℹ️  ${school.name} already exists`)
      }
    } else {
      test(`Create ${school.name}`, 201, res.status, res.data.message)
    }
  }
}

async function step3_RegisterPrincipal() {
  console.log('\n📍 STEP 3: Register Principal')
  
  const res = await makeRequest('POST', '/auth/register', {
    name: PRINCIPAL.name,
    email: PRINCIPAL.email,
    password: 'Principal@1234',
    role: 'PRINCIPAL',
    phone: PRINCIPAL.phone,
    schoolId: SCHOOL_IDS[0],
  })
  
  if (res.status === 201) {
    PRINCIPAL_TOKEN = res.data.data.token
    test('Register Principal', 201, res.status)
  } else if (res.status === 409) {
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: PRINCIPAL.email,
      password: 'Principal@1234',
    })
    if (loginRes.status === 200) {
      PRINCIPAL_TOKEN = loginRes.data.data.token
      console.log('  ℹ️  Principal already exists, logged in')
    }
  } else {
    test('Register Principal', 201, res.status, res.data.message)
  }
}

async function step4_RegisterTeachers() {
  console.log('\n📍 STEP 4: Register 10 Teachers')
  
  for (let i = 0; i < TEACHERS.length; i++) {
    const teacher = TEACHERS[i]
    const schoolId = i < 5 ? SCHOOL_IDS[0] : SCHOOL_IDS[1]
    
    const res = await makeRequest('POST', '/auth/register', {
      name: teacher.name,
      email: teacher.email,
      password: 'Teacher@1234',
      role: 'TEACHER',
      phone: teacher.phone,
      schoolId,
    })
    
    if (res.status === 201) {
      TEACHER_IDS.push(res.data.data.user.id)
      TEACHER_TOKENS.push(res.data.data.token)
      test(`Register ${teacher.name}`, 201, res.status)
    } else if (res.status === 409) {
      const loginRes = await makeRequest('POST', '/auth/login', {
        email: teacher.email,
        password: 'Teacher@1234',
      })
      if (loginRes.status === 200) {
        TEACHER_IDS.push(loginRes.data.data.user.id)
        TEACHER_TOKENS.push(loginRes.data.data.token)
        console.log(`  ℹ️  ${teacher.name} already exists, logged in`)
      }
    } else {
      test(`Register ${teacher.name}`, 201, res.status, res.data.message)
    }
  }
}

async function step5_CreateTimetables() {
  console.log('\n📍 STEP 5: Create Timetables')
  
  for (let i = 0; i < Math.min(10, TEACHER_IDS.length); i++) {
    const teacher = TEACHERS[i]
    const res = await makeRequest('POST', '/timetable', {
      teacherId: TEACHER_IDS[i],
      subject: teacher.subject,
      class: CLASSES[i % CLASSES.length],
      day: DAYS[i % DAYS.length],
      timeSlot: TIME_SLOTS[i % TIME_SLOTS.length],
      room: `Room ${101 + i}`,
    }, ADMIN_TOKEN)
    
    if (res.status === 201) {
      TIMETABLE_IDS.push(res.data.data.id)
      test(`Timetable for ${teacher.name}`, 201, res.status)
    } else {
      test(`Timetable for ${teacher.name}`, 201, res.status, res.data.message)
    }
  }
}

async function step6_BulkCreateHolidays() {
  console.log('\n📍 STEP 6: Bulk Create Tanzania Holidays 2025')
  
  for (const schoolId of SCHOOL_IDS) {
    const res = await makeRequest('POST', `/holidays/bulk/${schoolId}`, {
      year: 2025,
    }, ADMIN_TOKEN)
    
    if (res.status === 201) {
      test(`Holidays for School ${schoolId}`, 201, res.status)
      console.log(`    Created: ${res.data.data.created}, Skipped: ${res.data.data.skipped}`)
    } else {
      test(`Holidays for School ${schoolId}`, 201, res.status, res.data.message)
    }
  }
}

async function step7_TeachersApplyLeave() {
  console.log('\n📍 STEP 7: Teachers Apply for Leave')
  
  // Get next Monday
  const today = new Date()
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  
  const nextWednesday = new Date(nextMonday)
  nextWednesday.setDate(nextMonday.getDate() + 2)
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  
  // First 3 teachers apply
  for (let i = 0; i < 3; i++) {
    const res = await makeRequest('POST', '/leave', {
      startDate: formatDate(nextMonday),
      endDate: formatDate(nextWednesday),
      reason: 'Attending family ceremony in Dodoma',
    }, TEACHER_TOKENS[i])
    
    if (res.status === 201) {
      LEAVE_IDS.push(res.data.data.id)
      test(`Leave for ${TEACHERS[i].name}`, 201, res.status)
      console.log(`    Days requested: ${res.data.data.daysRequested}`)
    } else {
      test(`Leave for ${TEACHERS[i].name}`, 201, res.status, res.data.message)
    }
  }
}

async function step8_ApproveLeave() {
  console.log('\n📍 STEP 8: Principal Approves Leave')
  
  for (let i = 0; i < Math.min(2, LEAVE_IDS.length); i++) {
    const res = await makeRequest('PUT', `/leave/${LEAVE_IDS[i]}/approve`, {
      reviewNote: 'Approved. Safe travels!',
    }, PRINCIPAL_TOKEN)
    
    if (res.status === 200) {
      test(`Approve leave ${LEAVE_IDS[i]}`, 200, res.status)
      console.log(`    ${res.data.message}`)
    } else {
      test(`Approve leave ${LEAVE_IDS[i]}`, 200, res.status, res.data.message)
    }
  }
}

async function step9_CheckNotifications() {
  console.log('\n📍 STEP 9: Check Notifications')
  
  // Check first teacher's notifications
  const res = await makeRequest('GET', '/notifications', undefined, TEACHER_TOKENS[0])
  
  if (res.status === 200) {
    test('Get notifications', 200, res.status)
    console.log(`    ${TEACHERS[0].name} has ${res.data.count} notifications`)
    
    // Get summary
    const summaryRes = await makeRequest('GET', '/notifications/summary', undefined, TEACHER_TOKENS[0])
    if (summaryRes.status === 200) {
      console.log(`    Unread: ${summaryRes.data.data.unread}, Total: ${summaryRes.data.data.total}`)
      test('Get notification summary', 200, summaryRes.status)
    }
  } else {
    test('Get notifications', 200, res.status, res.data.message)
  }
}

async function step10_ViewSchoolStats() {
  console.log('\n📍 STEP 10: View School Statistics')
  
  for (const schoolId of SCHOOL_IDS) {
    const res = await makeRequest('GET', `/schools/${schoolId}/stats`, undefined, ADMIN_TOKEN)
    
    if (res.status === 200) {
      const stats = res.data.data
      test(`Stats for ${stats.schoolName}`, 200, res.status)
      console.log(`    Teachers: ${stats.totalTeachers} (${stats.activeTeachers} active)`)
      console.log(`    Pending Leaves: ${stats.pendingLeaves}`)
    } else {
      test(`Stats for school ${schoolId}`, 200, res.status, res.data.message)
    }
  }
}

async function step11_GetAllData() {
  console.log('\n📍 STEP 11: Get All Data (Admin View)')
  
  const endpoints = [
    { name: 'Schools', path: '/schools' },
    { name: 'Holidays', path: `/holidays?schoolId=${SCHOOL_IDS[0]}` },
    { name: 'Leave Requests', path: '/leave' },
    { name: 'Timetables', path: '/timetable' },
    { name: 'All Notifications', path: '/notifications/all' },
  ]
  
  for (const endpoint of endpoints) {
    const res = await makeRequest('GET', endpoint.path, undefined, ADMIN_TOKEN)
    
    if (res.status === 200) {
      test(`Get ${endpoint.name}`, 200, res.status)
      console.log(`    Count: ${res.data.count || res.data.data?.length || 0}`)
    } else {
      test(`Get ${endpoint.name}`, 200, res.status, res.data.message)
    }
  }
}

async function step12_TeacherViewOwnData() {
  console.log('\n📍 STEP 12: Teacher Views Own Data')
  
  const teacher = TEACHERS[0]
  const token = TEACHER_TOKENS[0]
  
  const endpoints = [
    { name: 'My School', path: '/schools/my' },
    { name: 'My Timetable', path: '/timetable/my' },
    { name: 'My Leaves', path: '/leave/my' },
    { name: 'My Holidays', path: '/holidays/my' },
  ]
  
  for (const endpoint of endpoints) {
    const res = await makeRequest('GET', endpoint.path, undefined, token)
    
    if (res.status === 200) {
      test(`${teacher.name} - ${endpoint.name}`, 200, res.status)
    } else {
      test(`${teacher.name} - ${endpoint.name}`, 200, res.status, res.data.message)
    }
  }
}

async function printDatabaseSummary() {
  console.log('\n' + '='.repeat(70))
  console.log('💾 DATABASE SUMMARY')
  console.log('='.repeat(70))
  
  const schoolsRes = await makeRequest('GET', '/schools', undefined, ADMIN_TOKEN)
  const leavesRes = await makeRequest('GET', '/leave', undefined, ADMIN_TOKEN)
  const holidaysRes = await makeRequest('GET', `/holidays?schoolId=${SCHOOL_IDS[0]}`, undefined, ADMIN_TOKEN)
  const timetablesRes = await makeRequest('GET', '/timetable', undefined, ADMIN_TOKEN)
  
  console.log(`\n  📊 Total Records:`)
  console.log(`     Schools: ${schoolsRes.data.count || 0}`)
  console.log(`     Teachers: ${TEACHER_IDS.length}`)
  console.log(`     Principal: 1`)
  console.log(`     Admin: 1`)
  console.log(`     Timetable Slots: ${timetablesRes.data.count || 0}`)
  console.log(`     Leave Requests: ${leavesRes.data.count || 0}`)
  console.log(`     Holidays (School 1): ${holidaysRes.data.count || 0}`)
}

async function runTests() {
  console.log('\n' + '='.repeat(70))
  console.log('🇹🇿  EDUTRACK COMPREHENSIVE TANZANIA TEST')
  console.log('='.repeat(70))
  console.log('\nTesting with:')
  console.log('  • 2 Schools (Azania & Jangwani)')
  console.log('  • 1 Admin (Bi Titi Mohamed)')
  console.log('  • 1 Principal (Mwalimu Nyerere)')
  console.log('  • 10 Teachers with real Tanzanian names')
  console.log('  • Tanzania Public Holidays 2025')
  console.log('  • Leave requests and approvals')
  console.log('  • Notifications system')
  console.log('='.repeat(70))
  
  try {
    await step1_RegisterAdmin()
    await step2_CreateSchools()
    await step3_RegisterPrincipal()
    await step4_RegisterTeachers()
    await step5_CreateTimetables()
    await step6_BulkCreateHolidays()
    await step7_TeachersApplyLeave()
    await step8_ApproveLeave()
    await step9_CheckNotifications()
    await step10_ViewSchoolStats()
    await step11_GetAllData()
    await step12_TeacherViewOwnData()
    
    await printDatabaseSummary()
    
    console.log('\n' + '='.repeat(70))
    console.log('📊 TEST RESULTS')
    console.log('='.repeat(70))
    console.log(`\nTotal Tests: ${stats.total}`)
    console.log(`✅ Passed: ${stats.passed}`)
    console.log(`❌ Failed: ${stats.failed}`)
    console.log(`📈 Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`)
    
    if (stats.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:')
      stats.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`)
      })
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('🌐 VIEW YOUR DATABASE:')
    console.log('='.repeat(70))
    console.log('\n  Prisma Studio: http://localhost:51212')
    console.log('  pgAdmin:       http://localhost:5050')
    console.log('    - Host: db')
    console.log('    - Port: 5432')
    console.log('    - Database: edutrack')
    console.log('    - Username: postgres')
    console.log('    - Password: postgres')
    console.log('\n' + '='.repeat(70))
    
    process.exit(stats.failed > 0 ? 1 : 0)
  } catch (error: any) {
    console.error('\n❌ Fatal Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

runTests()
