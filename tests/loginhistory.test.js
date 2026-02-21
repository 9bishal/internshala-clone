/**
 * Login History Feature Tests
 * 
 * This file contains test cases for the Login History tracking feature
 * including login recording, device detection, and suspicious activity detection.
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5001/api';
const TEST_USER_ID = 'test-user-123';
const TEST_USER_EMAIL = 'testuser@example.com';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Test utilities
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function pass(testName) {
  log(`✓ ${testName}`, colors.green);
}

function fail(testName, error) {
  log(`✗ ${testName}`, colors.red);
  console.error(error);
}

function section(title) {
  log(`\n${'='.repeat(50)}`, colors.blue);
  log(title, colors.blue);
  log('='.repeat(50), colors.blue);
}

// Test variables
let testResults = {
  passed: 0,
  failed: 0,
};

// ============================================
// TEST SUITE: LOGIN HISTORY
// ============================================

async function runLoginHistoryTests() {
  section('LOGIN HISTORY TESTS');

  // Test 1: Sync User Data
  await testSyncUserData();

  // Test 2: Record Login History (Desktop Chrome)
  await testRecordLoginDesktopChrome();

  // Test 3: Record Login History (Mobile Safari)
  await testRecordLoginMobileSafari();

  // Test 4: Record Login History (Different IP - Suspicious)
  await testRecordLoginDifferentIP();

  // Test 5: Get Login History
  await testGetLoginHistory();

  // Test 6: Validate Date Formatting
  await testDateFormatting();

  // Test 7: Device Detection
  await testDeviceDetection();

  // Print summary
  printSummary();
}

// ============================================
// TEST CASES
// ============================================

async function testSyncUserData() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/sync-user`, {
      uid: TEST_USER_ID,
      name: 'Test User',
      email: TEST_USER_EMAIL,
      photo: 'https://example.com/photo.jpg',
    });

    if (response.status === 200 && response.data.user) {
      log(`  User synced: ${response.data.user.name}`, colors.yellow);
      pass('Sync User Data');
      testResults.passed++;
    } else {
      fail('Sync User Data', 'Invalid response structure');
      testResults.failed++;
    }
  } catch (error) {
    fail('Sync User Data', error.message);
    testResults.failed++;
  }
}

async function testRecordLoginDesktopChrome() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login-history`, {
      uid: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      ipAddress: '192.168.1.100',
      deviceInfo: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
      },
    });

    if (response.status === 200 && response.data.message === 'Login recorded') {
      log(`  Suspicious: ${response.data.isSuspicious}`, colors.yellow);
      pass('Record Login History - Desktop Chrome');
      testResults.passed++;
    } else {
      fail('Record Login History - Desktop Chrome', 'Invalid response structure');
      testResults.failed++;
    }
  } catch (error) {
    fail('Record Login History - Desktop Chrome', error.message);
    testResults.failed++;
  }
}

async function testRecordLoginMobileSafari() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login-history`, {
      uid: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      ipAddress: '192.168.1.101',
      deviceInfo: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        browser: 'Safari',
        os: 'iOS',
        device: 'Mobile',
      },
    });

    if (response.status === 200) {
      log(`  Suspicious: ${response.data.isSuspicious}`, colors.yellow);
      if (response.data.isSuspicious) {
        log(`  Reason: ${response.data.suspiciousReason}`, colors.yellow);
      }
      pass('Record Login History - Mobile Safari');
      testResults.passed++;
    } else {
      fail('Record Login History - Mobile Safari', 'Invalid response structure');
      testResults.failed++;
    }
  } catch (error) {
    fail('Record Login History - Mobile Safari', error.message);
    testResults.failed++;
  }
}

async function testRecordLoginDifferentIP() {
  try {
    // First login
    await axios.post(`${API_BASE_URL}/auth/login-history`, {
      uid: 'suspicious-test-user',
      email: 'suspicious@example.com',
      ipAddress: '10.0.0.1',
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
      },
    });

    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Second login from different IP (within 10 minutes - should be suspicious)
    const response = await axios.post(`${API_BASE_URL}/auth/login-history`, {
      uid: 'suspicious-test-user',
      email: 'suspicious@example.com',
      ipAddress: '10.0.0.2',
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
      },
    });

    if (response.status === 200) {
      log(`  Suspicious: ${response.data.isSuspicious}`, colors.yellow);
      if (response.data.suspiciousReason) {
        log(`  Reason: ${response.data.suspiciousReason}`, colors.yellow);
      }
      
      if (response.data.isSuspicious) {
        pass('Record Login History - Different IP (correctly flagged as suspicious)');
        testResults.passed++;
      } else {
        fail('Record Login History - Different IP', 'Should be flagged as suspicious');
        testResults.failed++;
      }
    } else {
      fail('Record Login History - Different IP', 'Invalid response');
      testResults.failed++;
    }
  } catch (error) {
    fail('Record Login History - Different IP', error.message);
    testResults.failed++;
  }
}

async function testGetLoginHistory() {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/login-history/${TEST_USER_ID}`);

    if (
      response.status === 200 &&
      Array.isArray(response.data.loginHistory) &&
      typeof response.data.totalLogins === 'number'
    ) {
      log(`  Total Logins: ${response.data.totalLogins}`, colors.yellow);
      log(`  History Records: ${response.data.loginHistory.length}`, colors.yellow);
      
      // Check if records have required fields
      if (response.data.loginHistory.length > 0) {
        const record = response.data.loginHistory[0];
        const hasRequiredFields = 
          record.timestamp &&
          record.ipAddress &&
          record.deviceInfo &&
          typeof record.isSuspicious === 'boolean';
        
        if (hasRequiredFields) {
          log(`  Sample Record:`, colors.yellow);
          log(`    Device: ${record.deviceInfo.device}`, colors.yellow);
          log(`    Browser: ${record.deviceInfo.browser}`, colors.yellow);
          log(`    OS: ${record.deviceInfo.os}`, colors.yellow);
          log(`    IP: ${record.ipAddress}`, colors.yellow);
          pass('Get Login History');
          testResults.passed++;
        } else {
          fail('Get Login History', 'Missing required fields in record');
          testResults.failed++;
        }
      } else {
        pass('Get Login History (empty - no records yet)');
        testResults.passed++;
      }
    } else {
      fail('Get Login History', 'Invalid response structure');
      testResults.failed++;
    }
  } catch (error) {
    fail('Get Login History', error.message);
    testResults.failed++;
  }
}

async function testDateFormatting() {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/login-history/${TEST_USER_ID}`);

    if (response.data.loginHistory.length > 0) {
      const record = response.data.loginHistory[0];
      
      // Test various date formats
      let dateObj;
      
      // Handle Firestore Timestamp
      if (record.timestamp._seconds) {
        dateObj = new Date(record.timestamp._seconds * 1000);
      }
      // Handle Firestore toDate method
      else if (record.timestamp.toDate && typeof record.timestamp.toDate === 'function') {
        dateObj = record.timestamp.toDate();
      }
      // Handle ISO string or timestamp
      else {
        dateObj = new Date(record.timestamp);
      }
      
      // Check if date is valid
      if (!isNaN(dateObj.getTime())) {
        const formatted = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(dateObj);
        
        log(`  Formatted Date: ${formatted}`, colors.yellow);
        pass('Date Formatting (valid date)');
        testResults.passed++;
      } else {
        fail('Date Formatting', 'Invalid date detected');
        testResults.failed++;
      }
    } else {
      log('⊘ Date Formatting - Skipped (no records)', colors.yellow);
    }
  } catch (error) {
    fail('Date Formatting', error.message);
    testResults.failed++;
  }
}

async function testDeviceDetection() {
  const testCases = [
    {
      name: 'Desktop Windows Chrome',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      expected: { device: 'Desktop', browser: 'Chrome', os: 'Windows' }
    },
    {
      name: 'Mobile iPhone Safari',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      expected: { device: 'Mobile', browser: 'Safari', os: 'iOS' }
    },
    {
      name: 'Desktop macOS Safari',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
      expected: { device: 'Desktop', browser: 'Safari', os: 'macOS' }
    },
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    const detected = detectDevice(testCase.userAgent);
    const matches = 
      detected.device === testCase.expected.device &&
      detected.browser === testCase.expected.browser &&
      detected.os === testCase.expected.os;

    if (matches) {
      log(`  ✓ ${testCase.name}`, colors.green);
    } else {
      log(`  ✗ ${testCase.name}`, colors.red);
      log(`    Expected: ${JSON.stringify(testCase.expected)}`, colors.red);
      log(`    Got: ${JSON.stringify(detected)}`, colors.red);
      allPassed = false;
    }
  }

  if (allPassed) {
    pass('Device Detection');
    testResults.passed++;
  } else {
    fail('Device Detection', 'Some device detections failed');
    testResults.failed++;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function detectDevice(userAgent) {
  const browser = userAgent.includes('Chrome') ? 'Chrome' :
                 userAgent.includes('Firefox') ? 'Firefox' :
                 userAgent.includes('Safari') ? 'Safari' :
                 userAgent.includes('Edge') ? 'Edge' : 'Unknown';
  
  const os = userAgent.includes('Win') ? 'Windows' :
            userAgent.includes('Mac') ? 'macOS' :
            userAgent.includes('Linux') ? 'Linux' :
            userAgent.includes('iPhone') || userAgent.includes('iOS') ? 'iOS' :
            userAgent.includes('Android') ? 'Android' : 'Unknown';
  
  const device = /mobile|android|iphone|ipad|phone/i.test(userAgent) ? 'Mobile' :
                /tablet|ipad/i.test(userAgent) ? 'Tablet' : 'Desktop';
  
  return { browser, os, device };
}

function printSummary() {
  section('TEST SUMMARY');
  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(2) : 0;

  log(`Total Tests: ${total}`);
  log(`Passed: ${testResults.passed}`, colors.green);
  log(`Failed: ${testResults.failed}`, colors.red);
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? colors.green : colors.red);

  if (testResults.failed === 0) {
    log('\n🎉 All tests passed!', colors.green);
  } else {
    log(`\n⚠️  ${testResults.failed} test(s) failed`, colors.red);
  }
}

// ============================================
// RUN TESTS
// ============================================

if (require.main === module) {
  log('Starting Login History Tests...', colors.blue);
  log(`API Base URL: ${API_BASE_URL}`, colors.yellow);
  log(`Test User ID: ${TEST_USER_ID}\n`, colors.yellow);

  runLoginHistoryTests()
    .then(() => {
      process.exit(testResults.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      log('Test suite failed with error:', colors.red);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runLoginHistoryTests };
