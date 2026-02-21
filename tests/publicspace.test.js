/**
 * Public Space Feature Tests
 * 
 * This file contains test cases for the Public Space social networking feature
 * including posting, media upload, likes, comments, and shares.
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
let createdPostId = null;
let testResults = {
  passed: 0,
  failed: 0,
};

// ============================================
// TEST SUITE: PUBLIC SPACE
// ============================================

async function runPublicSpaceTests() {
  section('PUBLIC SPACE TESTS');

  // Test 1: Create Post with Text Only
  await testCreatePostTextOnly();

  // Test 2: Create Post with Media URLs
  await testCreatePostWithMedia();

  // Test 3: Check Posting Limit
  await testCheckPostingLimit();

  // Test 4: Get Feed
  await testGetFeed();

  // Test 5: Like Post
  await testLikePost();

  // Test 6: Unlike Post
  await testUnlikePost();

  // Test 7: Comment on Post
  await testCommentOnPost();

  // Test 8: Share Post
  await testSharePost();

  // Test 9: Delete Post
  await testDeletePost();

  // Test 10: Posting Limit - No Friends
  await testPostingLimitNoFriends();

  // Print summary
  printSummary();
}

// ============================================
// TEST CASES
// ============================================

async function testCreatePostTextOnly() {
  try {
    const response = await axios.post(`${API_BASE_URL}/posts`, {
      userId: TEST_USER_ID,
      caption: 'This is a test post created by automated testing script',
      mediaUrls: [],
    });

    if (response.status === 200 && response.data._id) {
      createdPostId = response.data._id;
      pass('Create Post with Text Only');
      testResults.passed++;
    } else {
      fail('Create Post with Text Only', 'Invalid response structure');
      testResults.failed++;
    }
  } catch (error) {
    fail('Create Post with Text Only', error.message);
    testResults.failed++;
  }
}

async function testCreatePostWithMedia() {
  try {
    const response = await axios.post(`${API_BASE_URL}/posts`, {
      userId: TEST_USER_ID,
      caption: 'Test post with media',
      mediaUrls: [
        'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      ],
    });

    if (response.status === 200 && response.data.mediaUrls.length === 2) {
      pass('Create Post with Media URLs');
      testResults.passed++;
    } else {
      fail('Create Post with Media URLs', 'Media URLs not saved correctly');
      testResults.failed++;
    }
  } catch (error) {
    fail('Create Post with Media URLs', error.message);
    testResults.failed++;
  }
}

async function testCheckPostingLimit() {
  try {
    const response = await axios.post(`${API_BASE_URL}/posts/check-limit`, {
      userId: TEST_USER_ID,
    });

    if (
      response.status === 200 &&
      typeof response.data.canPost === 'boolean' &&
      typeof response.data.friendCount === 'number'
    ) {
      log(`  Friend Count: ${response.data.friendCount}`, colors.yellow);
      log(`  Can Post: ${response.data.canPost}`, colors.yellow);
      log(`  Daily Limit: ${response.data.limit === -1 ? 'Unlimited' : response.data.limit}`, colors.yellow);
      log(`  Posts Today: ${response.data.todaysPostCount}`, colors.yellow);
      pass('Check Posting Limit');
      testResults.passed++;
    } else {
      fail('Check Posting Limit', 'Invalid response structure');
      testResults.failed++;
    }
  } catch (error) {
    fail('Check Posting Limit', error.message);
    testResults.failed++;
  }
}

async function testGetFeed() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/posts/feed?userId=${TEST_USER_ID}&limit=10&offset=0`
    );

    if (response.status === 200 && Array.isArray(response.data.posts)) {
      log(`  Found ${response.data.posts.length} posts in feed`, colors.yellow);
      pass('Get Feed');
      testResults.passed++;
    } else {
      fail('Get Feed', 'Invalid response structure');
      testResults.failed++;
    }
  } catch (error) {
    fail('Get Feed', error.message);
    testResults.failed++;
  }
}

async function testLikePost() {
  if (!createdPostId) {
    log('⊘ Like Post - Skipped (no post created)', colors.yellow);
    return;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/posts/${createdPostId}/like`, {
      userId: TEST_USER_ID,
    });

    if (response.status === 200) {
      pass('Like Post');
      testResults.passed++;
    } else {
      fail('Like Post', 'Invalid response');
      testResults.failed++;
    }
  } catch (error) {
    fail('Like Post', error.message);
    testResults.failed++;
  }
}

async function testUnlikePost() {
  if (!createdPostId) {
    log('⊘ Unlike Post - Skipped (no post created)', colors.yellow);
    return;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/posts/${createdPostId}/like`, {
      userId: TEST_USER_ID,
    });

    if (response.status === 200) {
      pass('Unlike Post');
      testResults.passed++;
    } else {
      fail('Unlike Post', 'Invalid response');
      testResults.failed++;
    }
  } catch (error) {
    fail('Unlike Post', error.message);
    testResults.failed++;
  }
}

async function testCommentOnPost() {
  if (!createdPostId) {
    log('⊘ Comment on Post - Skipped (no post created)', colors.yellow);
    return;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/posts/${createdPostId}/comment`, {
      userId: TEST_USER_ID,
      text: 'This is a test comment from automated testing',
    });

    if (response.status === 200 && response.data.comment) {
      log(`  Comment ID: ${response.data.comment._id}`, colors.yellow);
      pass('Comment on Post');
      testResults.passed++;
    } else {
      fail('Comment on Post', 'Invalid response');
      testResults.failed++;
    }
  } catch (error) {
    fail('Comment on Post', error.message);
    testResults.failed++;
  }
}

async function testSharePost() {
  if (!createdPostId) {
    log('⊘ Share Post - Skipped (no post created)', colors.yellow);
    return;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/posts/${createdPostId}/share`, {
      userId: TEST_USER_ID,
      message: 'Sharing this awesome post!',
    });

    if (response.status === 200) {
      pass('Share Post');
      testResults.passed++;
    } else {
      fail('Share Post', 'Invalid response');
      testResults.failed++;
    }
  } catch (error) {
    fail('Share Post', error.message);
    testResults.failed++;
  }
}

async function testDeletePost() {
  if (!createdPostId) {
    log('⊘ Delete Post - Skipped (no post created)', colors.yellow);
    return;
  }

  try {
    const response = await axios.delete(`${API_BASE_URL}/posts/${createdPostId}`, {
      data: { userId: TEST_USER_ID },
    });

    if (response.status === 200) {
      pass('Delete Post');
      testResults.passed++;
    } else {
      fail('Delete Post', 'Invalid response');
      testResults.failed++;
    }
  } catch (error) {
    fail('Delete Post', error.message);
    testResults.failed++;
  }
}

async function testPostingLimitNoFriends() {
  try {
    const response = await axios.post(`${API_BASE_URL}/posts/check-limit`, {
      userId: 'user-with-no-friends-123',
    });

    if (
      response.status === 200 &&
      response.data.canPost === false &&
      response.data.friendCount === 0
    ) {
      pass('Posting Limit - No Friends (correctly blocked)');
      testResults.passed++;
    } else {
      fail('Posting Limit - No Friends', 'Should block users with no friends');
      testResults.failed++;
    }
  } catch (error) {
    // Expected to fail for user with no friends
    if (error.response && error.response.data.canPost === false) {
      pass('Posting Limit - No Friends (correctly blocked)');
      testResults.passed++;
    } else {
      fail('Posting Limit - No Friends', error.message);
      testResults.failed++;
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
  log('Starting Public Space Tests...', colors.blue);
  log(`API Base URL: ${API_BASE_URL}`, colors.yellow);
  log(`Test User ID: ${TEST_USER_ID}\n`, colors.yellow);

  runPublicSpaceTests()
    .then(() => {
      process.exit(testResults.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      log('Test suite failed with error:', colors.red);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runPublicSpaceTests };
