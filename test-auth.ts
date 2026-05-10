import http from 'http'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  success: boolean
  message: string
  data?: any
}

const results: TestResult[] = []

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

// Test 1: Register a new user
async function testRegister() {
  try {
    const response = await makeRequest('POST', '/api/auth/register', {
      name: 'John Doe',
      email: `test-${Date.now()}@example.com`,
      password: 'Password@123',
      role: 'TEACHER',
      phone: '+1234567890',
    })

    if (response.status === 201 && response.data.success) {
      results.push({
        name: '✅ Register User',
        success: true,
        message: 'User created successfully',
        data: response.data.data,
      })
      return response.data.data.user
    } else {
      results.push({
        name: '❌ Register User',
        success: false,
        message: response.data.message || 'Registration failed',
        data: response.data,
      })
      return null
    }
  } catch (error: any) {
    results.push({
      name: '❌ Register User',
      success: false,
      message: error.message,
    })
    return null
  }
}

// Test 2: Login with registered user
async function testLogin(email: string) {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email,
      password: 'Password@123',
    })

    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Login User',
        success: true,
        message: 'Login successful',
        data: {
          token: response.data.data.token.substring(0, 20) + '...',
          user: response.data.data.user,
        },
      })
      return response.data.data.token
    } else {
      results.push({
        name: '❌ Login User',
        success: false,
        message: response.data.message || 'Login failed',
        data: response.data,
      })
      return null
    }
  } catch (error: any) {
    results.push({
      name: '❌ Login User',
      success: false,
      message: error.message,
    })
    return null
  }
}

// Test 3: Get current user with token
async function testGetMe(token: string) {
  try {
    const response = await makeRequest('GET', '/api/auth/me', undefined, token)

    if (response.status === 200 && response.data.success) {
      results.push({
        name: '✅ Get Current User',
        success: true,
        message: 'Fetched current user',
        data: response.data.data,
      })
      return true
    } else {
      results.push({
        name: '❌ Get Current User',
        success: false,
        message: response.data.message || 'Failed to get user',
        data: response.data,
      })
      return false
    }
  } catch (error: any) {
    results.push({
      name: '❌ Get Current User',
      success: false,
      message: error.message,
    })
    return false
  }
}

// Test 4: Login with wrong password
async function testLoginWrongPassword(email: string) {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email,
      password: 'WrongPassword123',
    })

    if (response.status === 401) {
      results.push({
        name: '✅ Login Wrong Password (Expected to fail)',
        success: true,
        message: 'Correctly rejected invalid password',
      })
      return true
    } else {
      results.push({
        name: '❌ Login Wrong Password (Should have failed)',
        success: false,
        message: 'Should reject invalid password',
      })
      return false
    }
  } catch (error: any) {
    results.push({
      name: '❌ Login Wrong Password',
      success: false,
      message: error.message,
    })
    return false
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Starting Auth API Tests...\n')
  console.log('━'.repeat(60))

  // Register user
  const user = await testRegister()
  if (!user) {
    console.log('\n⛔ Registration failed. Cannot continue with other tests.\n')
    printResults()
    process.exit(1)
  }

  // Login with registered user
  const token = await testLogin(user.email)
  if (!token) {
    console.log('\n⛔ Login failed. Cannot continue with other tests.\n')
    printResults()
    process.exit(1)
  }

  // Get current user
  await testGetMe(token)

  // Test invalid login
  await testLoginWrongPassword(user.email)

  printResults()
}

function printResults() {
  console.log('\n━'.repeat(60))
  console.log('\n📋 Test Results:\n')

  results.forEach((result) => {
    console.log(`${result.name}`)
    console.log(`   └─ ${result.message}`)
    if (result.data) {
      console.log(`   └─ Data: ${JSON.stringify(result.data, null, 2)}`)
    }
    console.log()
  })

  const passed = results.filter((r) => r.success).length
  const total = results.length

  console.log('━'.repeat(60))
  console.log(`\n✨ Results: ${passed}/${total} tests passed\n`)

  if (passed === total) {
    console.log('🎉 All tests passed!\n')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed\n')
    process.exit(1)
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
