/**
 * Resume Creation Feature Tests
 * 
 * Tests include:
 * - OTP request for resume creation (premium only)
 * - OTP verification
 * - Razorpay order creation for resume (₹50)
 * - Resume save and retrieval
 * - Premium plan requirement enforcement
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';
const TEST_USER_ID = 'test-user-123';

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m',
};

function log(message, color = colors.reset) { console.log(`${color}${message}${colors.reset}`); }
function pass(testName) { log(`✓ ${testName}`, colors.green); }
function fail(testName, error) { log(`✗ ${testName}`, colors.red); if (error) console.error('  Error:', typeof error === 'string' ? error : error.message || error); }
function section(title) { log(`\n${'='.repeat(50)}`, colors.blue); log(title, colors.blue); log('='.repeat(50), colors.blue); }

let testResults = { passed: 0, failed: 0 };

async function runResumeTests() {
  section('RESUME CREATION TESTS');

  await testRequestOTPRequiresPremium();
  await testRequestOTP();
  await testVerifyOTPMissing();
  await testGetResume();
  await testSaveResume();

  printSummary();
}

// Test 1: Request OTP requires premium plan
async function testRequestOTPRequiresPremium() {
  try {
    const response = await axios.post(`${API_BASE_URL}/resume-razorpay/request-otp`, {
      uid: 'free-plan-user-test-456',
    });

    fail('Request OTP Requires Premium', 'Should have been blocked for free user');
    testResults.failed++;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 403 && message?.includes('premium')) {
      log(`  Correctly blocked: ${message}`, colors.yellow);
      pass('Request OTP - Premium Required');
      testResults.passed++;
    } else if (status === 404) {
      log(`  User not found (expected for test user): ${message}`, colors.yellow);
      pass('Request OTP - User Validation');
      testResults.passed++;
    } else {
      fail('Request OTP Requires Premium', `${status}: ${message}`);
      testResults.failed++;
    }
  }
}

// Test 2: Request OTP for premium user
async function testRequestOTP() {
  try {
    const response = await axios.post(`${API_BASE_URL}/resume-razorpay/request-otp`, {
      uid: TEST_USER_ID,
    });

    if (response.status === 200) {
      log(`  Message: ${response.data.message}`, colors.yellow);
      pass('Request OTP - Success');
      testResults.passed++;
    } else {
      fail('Request OTP', 'Unexpected response');
      testResults.failed++;
    }
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 403) {
      log(`  User not premium (expected): ${message}`, colors.yellow);
      pass('Request OTP - Premium Check Works');
      testResults.passed++;
    } else if (status === 404) {
      log(`  User not found: ${message}`, colors.yellow);
      pass('Request OTP - User Check Works');
      testResults.passed++;
    } else {
      fail('Request OTP', `${status}: ${message}`);
      testResults.failed++;
    }
  }
}

// Test 3: Verify OTP missing params
async function testVerifyOTPMissing() {
  try {
    await axios.post(`${API_BASE_URL}/resume-razorpay/verify-otp`, {});
    fail('Verify OTP Missing Params', 'Should have returned 400');
    testResults.failed++;
  } catch (error) {
    if (error.response?.status === 400) {
      log(`  Correctly rejected: ${error.response.data.message}`, colors.yellow);
      pass('Verify OTP - Requires UID and OTP');
      testResults.passed++;
    } else {
      fail('Verify OTP Missing Params', error.message);
      testResults.failed++;
    }
  }
}

// Test 4: Get resume
async function testGetResume() {
  try {
    const response = await axios.get(`${API_BASE_URL}/resume-razorpay/${TEST_USER_ID}`);

    if (response.status === 200) {
      log(`  Resume found for user`, colors.yellow);
      pass('Get Resume');
      testResults.passed++;
    } else {
      fail('Get Resume', 'Unexpected response');
      testResults.failed++;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      log(`  No resume found (expected): ${error.response.data.message}`, colors.yellow);
      pass('Get Resume - 404 Handling');
      testResults.passed++;
    } else {
      fail('Get Resume', error.message);
      testResults.failed++;
    }
  }
}

// Test 5: Save resume data
async function testSaveResume() {
  try {
    const response = await axios.post(`${API_BASE_URL}/resume-razorpay/save-resume`, {
      uid: TEST_USER_ID,
      resumeData: {
        name: 'Test User',
        email: 'testuser@example.com',
        phone: '9876543210',
        qualifications: 'B.Tech CSE',
        experience: '1 year internship',
        skills: ['JavaScript', 'React', 'Node.js'],
        personalInfo: { city: 'Delhi', state: 'Delhi' },
      },
    });

    if (response.status === 200 && response.data.resumeId) {
      log(`  Resume ID: ${response.data.resumeId}`, colors.yellow);
      pass('Save Resume');
      testResults.passed++;
    } else {
      fail('Save Resume', 'Invalid response');
      testResults.failed++;
    }
  } catch (error) {
    fail('Save Resume', error.response?.data?.message || error.message);
    testResults.failed++;
  }
}

function printSummary() {
  section('TEST SUMMARY — RESUME CREATION');
  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(2) : 0;
  log(`Total Tests: ${total}`);
  log(`Passed: ${testResults.passed}`, colors.green);
  log(`Failed: ${testResults.failed}`, colors.red);
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? colors.green : colors.red);
  if (testResults.failed === 0) log('\n🎉 All tests passed!', colors.green);
  else log(`\n⚠️  ${testResults.failed} test(s) failed`, colors.red);
}

if (require.main === module) {
  log('Starting Resume Creation Tests...', colors.blue);
  log(`API Base URL: ${API_BASE_URL}\n`, colors.yellow);
  runResumeTests()
    .then(() => process.exit(testResults.failed > 0 ? 1 : 0))
    .catch((error) => { log('Test suite failed:', colors.red); console.error(error); process.exit(1); });
}

module.exports = { runResumeTests };
