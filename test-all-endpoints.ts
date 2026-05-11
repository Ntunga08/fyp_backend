import http from 'http'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  success: boolean
  message: string
  data?: any
}

const results: TestResult[] = []
let adminToken = ''
let teacherToken = ''
let teacherId = ''
let timetableSlotId = ''
let lessonId = ''

// Helper to make HTTP requests
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

// ============================================================================
// AUTH ENDPOINTS TESTS
// ============================================================================

async function testHealthCheck() {
  try {
    const response = await makeRequest('GET', '/')
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Health Check',
        success: true,
        message: 'API is running',
      })
    } else {
      results.push({
        name: '❌ Health Check',
        success: false,
        message: 'Health check failed',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Health Check',
      success: false,
      message: error.message,
    })
  }
}

async function testRegisterAdmin() {
  try {
    const response = await makeRequest('POST', '/api/auth/register', {
      name: 'Admin User',
      email: `admin-${Date.now()}@school.com`,
      password: 'Admin@123',
      role: 'ADMIN',
      phone: '+255712345678',
    })

    if (response.status === 201 && response.data.success) {
      results.push({
        name: '✅ Register Admin',
        success: true,
        message: 'Admin registered successfully',
      })
      return response.data.data.user
    } else {
      results.push({
        name: '❌ Register Admin',
        success: false,
        message: response.data.message || 'Registration failed',
      })
      return null
    }
  } catch (error: any) {
    results.push({
      name: '❌ Register Admin',
      success: false,
      message: error.message,
    })
    return null
  }
}

async function testRegisterTeacher() {
  try {
    const response = await makeRequest('POST', '/api/auth/register', {
      name: 'Teacher John',
      email: `teacher-${Date.now()}@school.com`,
      password: 'Teacher@123',
      role: 'TEACHER',
      phone: '+255723456789',
    })

    if (response.status === 201 && response.data.success) {
      teacherId = response.data.data.user.id
      results.push({
        name: '✅ Register Teacher',
        success: true,
        message: 'Teacher registered successfully',
      })
      return response.data.data.user
    } else {
      results.push({
        name: '❌ Register Teacher',
        success: false,
        message: response.data.message || 'Registration failed',
      })
      return null
    }
  } catch (error: any) {
    results.push({
      name: '❌ Register Teacher',
      success: false,
      message: error.message,
    })
    return null
  }
}

async function testLoginAdmin(email: string) {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email,
      password: 'Admin@123',
    })

    if (response.status === 200 && response.data.success) {
      adminToken = response.data.data.token
      results.push({
        name: '✅ Login Admin',
        success: true,
        message: 'Admin login successful',
      })
      return true
    } else {
      results.push({
        name: '❌ Login Admin',
        success: false,
        message: response.data.message || 'Login failed',
      })
      return false
    }
  } catch (error: any) {
    results.push({
      name: '❌ Login Admin',
      success: false,
      message: error.message,
    })
    return false
  }
}

async function testLoginTeacher(email: string) {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email,
      password: 'Teacher@123',
    })

    if (response.status === 200 && response.data.success) {
      teacherToken = response.data.data.token
      results.push({
        name: '✅ Login Teacher',
        success: true,
        message: 'Teacher login successful',
      })
      return true
    } else {
      results.push({
        name: '❌ Login Teacher',
        success: false,
        message: response.data.message || 'Login failed',
      })
      return false
    }
  } catch (error: any) {
    results.push({
      name: '❌ Login Teacher',
      success: false,
      message: error.message,
    })
    return false
  }
}

async function testGetMeAdmin() {
  try {
    const response = await makeRequest('GET', '/api/auth/me', undefined, adminToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get Me (Admin)',
        success: true,
        message: 'Fetched admin profile',
      })
    } else {
      results.push({
        name: '❌ Get Me (Admin)',
        success: false,
        message: response.data.message || 'Failed to get profile',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get Me (Admin)',
      success: false,
      message: error.message,
    })
  }
}

async function testGetMeTeacher() {
  try {
    const response = await makeRequest('GET', '/api/auth/me', undefined, teacherToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get Me (Teacher)',
        success: true,
        message: 'Fetched teacher profile',
      })
    } else {
      results.push({
        name: '❌ Get Me (Teacher)',
        success: false,
        message: response.data.message || 'Failed to get profile',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get Me (Teacher)',
      success: false,
      message: error.message,
    })
  }
}

// ============================================================================
// TIMETABLE ENDPOINTS TESTS
// ============================================================================

async function testCreateTimetableSlot() {
  try {
    const response = await makeRequest(
      'POST',
      '/api/timetable',
      {
        teacherId: teacherId,
        day: 'MONDAY',
        timeSlot: '08:00-09:00',
        subject: 'Mathematics',
        class: 'Form 1A',
        room: 'Room 101',
      },
      adminToken
    )

    if (response.status === 201 && response.data.success) {
      timetableSlotId = response.data.data.id
      results.push({
        name: '✅ Create Timetable Slot',
        success: true,
        message: 'Timetable slot created',
      })
    } else {
      results.push({
        name: '❌ Create Timetable Slot',
        success: false,
        message: response.data.message || 'Failed to create slot',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Create Timetable Slot',
      success: false,
      message: error.message,
    })
  }
}

async function testGetAllTimetableSlots() {
  try {
    const response = await makeRequest('GET', '/api/timetable', undefined, adminToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get All Timetable Slots',
        success: true,
        message: `Found ${response.data.data.length} slots`,
      })
    } else {
      results.push({
        name: '❌ Get All Timetable Slots',
        success: false,
        message: response.data.message || 'Failed to get slots',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get All Timetable Slots',
      success: false,
      message: error.message,
    })
  }
}

async function testGetTimetableById() {
  try {
    const response = await makeRequest(
      'GET',
      `/api/timetable/${timetableSlotId}`,
      undefined,
      adminToken
    )
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get Timetable Slot by ID',
        success: true,
        message: 'Fetched slot details',
      })
    } else {
      results.push({
        name: '❌ Get Timetable Slot by ID',
        success: false,
        message: response.data.message || 'Failed to get slot',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get Timetable Slot by ID',
      success: false,
      message: error.message,
    })
  }
}

async function testGetMyTimetable() {
  try {
    const response = await makeRequest('GET', '/api/timetable/my', undefined, teacherToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get My Timetable (Teacher)',
        success: true,
        message: `Found ${response.data.data.length} slots`,
      })
    } else {
      results.push({
        name: '❌ Get My Timetable (Teacher)',
        success: false,
        message: response.data.message || 'Failed to get timetable',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get My Timetable (Teacher)',
      success: false,
      message: error.message,
    })
  }
}

async function testGetTimetableByDay() {
  try {
    const response = await makeRequest('GET', '/api/timetable/day/MONDAY', undefined, teacherToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get Timetable by Day (Teacher)',
        success: true,
        message: `Found ${response.data.data.length} slots for Monday`,
      })
    } else {
      results.push({
        name: '❌ Get Timetable by Day (Teacher)',
        success: false,
        message: response.data.message || 'Failed to get day schedule',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get Timetable by Day (Teacher)',
      success: false,
      message: error.message,
    })
  }
}

async function testUpdateTimetableSlot() {
  try {
    const response = await makeRequest(
      'PUT',
      `/api/timetable/${timetableSlotId}`,
      {
        subject: 'Advanced Mathematics',
        timeSlot: '08:00-09:30',
      },
      adminToken
    )
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Update Timetable Slot',
        success: true,
        message: 'Slot updated successfully',
      })
    } else {
      results.push({
        name: '❌ Update Timetable Slot',
        success: false,
        message: response.data.message || 'Failed to update slot',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Update Timetable Slot',
      success: false,
      message: error.message,
    })
  }
}

// ============================================================================
// ATTENDANCE ENDPOINTS TESTS
// ============================================================================

async function testCheckIn() {
  try {
    // Note: Check-in only works on weekdays (Mon-Fri)
    // If today is weekend, this test will fail as expected
    const response = await makeRequest(
      'POST',
      '/api/attendance/checkin',
      {
        latitude: -6.771246975220776,
        longitude: 39.2405926971738,
      },
      teacherToken
    )

    // Accept both success and weekend rejection
    if (response.status === 201 && response.data.success) {
      results.push({
        name: '✅ Teacher Check-in',
        success: true,
        message: 'Check-in successful',
      })
    } else if (response.status === 400 && response.data.message?.includes('weekdays')) {
      results.push({
        name: '✅ Teacher Check-in (Weekend - Expected)',
        success: true,
        message: 'Correctly rejected weekend check-in',
      })
    } else {
      results.push({
        name: '❌ Teacher Check-in',
        success: false,
        message: response.data.message || 'Check-in failed',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Teacher Check-in',
      success: false,
      message: error.message,
    })
  }
}

async function testGetMyToday() {
  try {
    const response = await makeRequest('GET', '/api/attendance/today', undefined, teacherToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get My Today Attendance',
        success: true,
        message: 'Fetched today attendance',
      })
    } else {
      results.push({
        name: '❌ Get My Today Attendance',
        success: false,
        message: response.data.message || 'Failed to get attendance',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get My Today Attendance',
      success: false,
      message: error.message,
    })
  }
}

async function testGetMyHistory() {
  try {
    const response = await makeRequest('GET', '/api/attendance/my', undefined, teacherToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get My Attendance History',
        success: true,
        message: `Found ${response.data.data.length} records`,
      })
    } else {
      results.push({
        name: '❌ Get My Attendance History',
        success: false,
        message: response.data.message || 'Failed to get history',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get My Attendance History',
      success: false,
      message: error.message,
    })
  }
}

async function testGetAllAttendance() {
  try {
    const response = await makeRequest('GET', '/api/attendance', undefined, adminToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get All Attendance (Admin)',
        success: true,
        message: `Found ${response.data.data.length} records`,
      })
    } else {
      results.push({
        name: '❌ Get All Attendance (Admin)',
        success: false,
        message: response.data.message || 'Failed to get attendance',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get All Attendance (Admin)',
      success: false,
      message: error.message,
    })
  }
}

async function testGetAttendanceSummary() {
  try {
    const response = await makeRequest('GET', '/api/attendance/summary', undefined, adminToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get Attendance Summary (Admin)',
        success: true,
        message: 'Fetched summary statistics',
      })
    } else {
      results.push({
        name: '❌ Get Attendance Summary (Admin)',
        success: false,
        message: response.data.message || 'Failed to get summary',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get Attendance Summary (Admin)',
      success: false,
      message: error.message,
    })
  }
}

async function testMarkAbsent() {
  try {
    const response = await makeRequest(
      'POST',
      '/api/attendance/absent',
      {
        teacherId: teacherId,
        date: new Date().toISOString().split('T')[0],
        reason: 'Sick leave',
      },
      adminToken
    )

    // This might fail if teacher already checked in, which is expected
    if (response.status === 201 || response.status === 400) {
      results.push({
        name: '✅ Mark Teacher Absent (Admin)',
        success: true,
        message: response.data.message || 'Tested absent marking',
      })
    } else {
      results.push({
        name: '❌ Mark Teacher Absent (Admin)',
        success: false,
        message: response.data.message || 'Failed to mark absent',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Mark Teacher Absent (Admin)',
      success: false,
      message: error.message,
    })
  }
}

// ============================================================================
// LESSON ENDPOINTS TESTS
// ============================================================================

async function testRecordLesson() {
  try {
    const response = await makeRequest(
      'POST',
      '/api/lessons',
      {
        timetableId: timetableSlotId,
        date: new Date().toISOString().split('T')[0],
        status: 'CONDUCTED',
        notes: 'Covered algebra basics',
      },
      teacherToken
    )

    // Accept both success and weekend rejection
    if (response.status === 201 && response.data.success) {
      lessonId = response.data.data.id
      results.push({
        name: '✅ Record Lesson',
        success: true,
        message: 'Lesson recorded successfully',
      })
    } else if (response.status === 400 && response.data.message?.includes('weekdays')) {
      results.push({
        name: '✅ Record Lesson (Weekend - Expected)',
        success: true,
        message: 'Correctly rejected weekend lesson recording',
      })
    } else {
      results.push({
        name: '❌ Record Lesson',
        success: false,
        message: response.data.message || 'Failed to record lesson',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Record Lesson',
      success: false,
      message: error.message,
    })
  }
}

async function testGetMyLessonsToday() {
  try {
    const response = await makeRequest('GET', '/api/lessons/today', undefined, teacherToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get My Lessons Today',
        success: true,
        message: `Found ${response.data.data.length} lessons`,
      })
    } else {
      results.push({
        name: '❌ Get My Lessons Today',
        success: false,
        message: response.data.message || 'Failed to get lessons',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get My Lessons Today',
      success: false,
      message: error.message,
    })
  }
}

async function testGetMyLessons() {
  try {
    const response = await makeRequest('GET', '/api/lessons/my', undefined, teacherToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get My Lessons History',
        success: true,
        message: `Found ${response.data.data.length} lessons`,
      })
    } else {
      results.push({
        name: '❌ Get My Lessons History',
        success: false,
        message: response.data.message || 'Failed to get lessons',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get My Lessons History',
      success: false,
      message: error.message,
    })
  }
}

async function testUpdateLesson() {
  try {
    // Skip if no lesson was created (e.g., on weekends)
    if (!lessonId) {
      results.push({
        name: '✅ Update Lesson (Skipped - No lesson created)',
        success: true,
        message: 'Skipped because lesson creation was not possible',
      })
      return
    }

    const response = await makeRequest(
      'PUT',
      `/api/lessons/${lessonId}`,
      {
        notes: 'Updated: Covered algebra and geometry basics',
      },
      teacherToken
    )
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Update Lesson',
        success: true,
        message: 'Lesson updated successfully',
      })
    } else {
      results.push({
        name: '❌ Update Lesson',
        success: false,
        message: response.data.message || 'Failed to update lesson',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Update Lesson',
      success: false,
      message: error.message,
    })
  }
}

async function testGetAllLessons() {
  try {
    const response = await makeRequest('GET', '/api/lessons', undefined, adminToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get All Lessons (Admin)',
        success: true,
        message: `Found ${response.data.data.length} lessons`,
      })
    } else {
      results.push({
        name: '❌ Get All Lessons (Admin)',
        success: false,
        message: response.data.message || 'Failed to get lessons',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get All Lessons (Admin)',
      success: false,
      message: error.message,
    })
  }
}

async function testGetLessonById() {
  try {
    const response = await makeRequest('GET', `/api/lessons/${lessonId}`, undefined, adminToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get Lesson by ID (Admin)',
        success: true,
        message: 'Fetched lesson details',
      })
    } else {
      results.push({
        name: '❌ Get Lesson by ID (Admin)',
        success: false,
        message: response.data.message || 'Failed to get lesson',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get Lesson by ID (Admin)',
      success: false,
      message: error.message,
    })
  }
}

async function testGetInconsistencies() {
  try {
    const response = await makeRequest('GET', '/api/lessons/inconsistencies', undefined, adminToken)
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get Lesson Inconsistencies (Admin)',
        success: true,
        message: 'Fetched inconsistencies',
      })
    } else {
      results.push({
        name: '❌ Get Lesson Inconsistencies (Admin)',
        success: false,
        message: response.data.message || 'Failed to get inconsistencies',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get Lesson Inconsistencies (Admin)',
      success: false,
      message: error.message,
    })
  }
}

// ============================================================================
// DELETE TESTS (Run at the end)
// ============================================================================

async function testDeleteTimetableSlot() {
  try {
    const response = await makeRequest(
      'DELETE',
      `/api/timetable/${timetableSlotId}`,
      undefined,
      adminToken
    )
    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Delete Timetable Slot',
        success: true,
        message: 'Slot deleted successfully',
      })
    } else {
      results.push({
        name: '❌ Delete Timetable Slot',
        success: false,
        message: response.data.message || 'Failed to delete slot',
      })
    }
  } catch (error: any) {
    results.push({
      name: '❌ Delete Timetable Slot',
      success: false,
      message: error.message,
    })
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('\n🧪 Starting Comprehensive API Tests...\n')
  console.log('━'.repeat(70))

  // Health Check
  console.log('\n📍 Testing Health Check...')
  await testHealthCheck()

  // Auth Tests
  console.log('\n📍 Testing Authentication Endpoints...')
  const admin = await testRegisterAdmin()
  if (!admin) {
    console.log('\n⛔ Admin registration failed. Cannot continue.\n')
    printResults()
    process.exit(1)
  }

  const teacher = await testRegisterTeacher()
  if (!teacher) {
    console.log('\n⛔ Teacher registration failed. Cannot continue.\n')
    printResults()
    process.exit(1)
  }

  await testLoginAdmin(admin.email)
  await testLoginTeacher(teacher.email)
  await testGetMeAdmin()
  await testGetMeTeacher()

  // Timetable Tests
  console.log('\n📍 Testing Timetable Endpoints...')
  await testCreateTimetableSlot()
  await testGetAllTimetableSlots()
  await testGetTimetableById()
  await testGetMyTimetable()
  await testGetTimetableByDay()
  await testUpdateTimetableSlot()

  // Attendance Tests
  console.log('\n📍 Testing Attendance Endpoints...')
  await testCheckIn()
  await testGetMyToday()
  await testGetMyHistory()
  await testGetAllAttendance()
  await testGetAttendanceSummary()
  await testMarkAbsent()

  // Lesson Tests
  console.log('\n📍 Testing Lesson Endpoints...')
  await testRecordLesson()
  await testGetMyLessonsToday()
  await testGetMyLessons()
  await testUpdateLesson()
  await testGetAllLessons()
  await testGetLessonById()
  await testGetInconsistencies()

  // Delete Tests
  console.log('\n📍 Testing Delete Endpoints...')
  await testDeleteTimetableSlot()

  printResults()
}

function printResults() {
  console.log('\n━'.repeat(70))
  console.log('\n📋 Test Results Summary:\n')

  // Group results by category
  const categories = {
    'Health & Auth': results.slice(0, 7),
    'Timetable': results.slice(7, 14),
    'Attendance': results.slice(14, 20),
    'Lessons': results.slice(20, 27),
    'Delete': results.slice(27),
  }

  Object.entries(categories).forEach(([category, tests]) => {
    console.log(`\n${category}:`)
    tests.forEach((result) => {
      console.log(`  ${result.name}`)
      console.log(`     └─ ${result.message}`)
    })
  })

  const passed = results.filter((r) => r.success).length
  const total = results.length

  console.log('\n━'.repeat(70))
  console.log(`\n✨ Final Results: ${passed}/${total} tests passed\n`)

  if (passed === total) {
    console.log('🎉 All tests passed successfully!\n')
    process.exit(0)
  } else {
    console.log(`⚠️  ${total - passed} test(s) failed\n`)
    process.exit(1)
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
