# Test Suite - Internshala Clone

## Overview
Automated test scripts for Public Space and Login History features.

## Installation

```bash
cd tests
npm install
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Individual Test Suites

**Public Space Tests:**
```bash
npm run test:publicspace
```

**Login History Tests:**
```bash
npm run test:loginhistory
```

## Prerequisites

Before running tests, ensure:

1. **Backend Server is Running**
   ```bash
   cd backend
   npm start
   # Server should be running on http://localhost:5001
   ```

2. **Frontend Server is Running** (optional, for manual testing)
   ```bash
   cd internarea
   npm run dev
   # App should be running on http://localhost:3000
   ```

3. **Database is Accessible**
   - Firestore database is connected
   - Firebase Admin SDK is configured

4. **Environment Variables are Set**
   - Cloudinary credentials in backend `.env`
   - Firebase config in frontend

## Test Files

- `publicspace.test.js` - Tests for Public Space feature
  - Post creation (text only, with media)
  - Posting limits based on friend count
  - Like/unlike functionality
  - Comments
  - Shares
  - Post deletion
  - Feed retrieval

- `loginhistory.test.js` - Tests for Login History feature
  - User data sync
  - Login recording
  - Device detection
  - Browser and OS detection
  - Suspicious activity flagging
  - Login history retrieval
  - Date formatting

- `run-all-tests.js` - Combined test runner

## Test Output

The tests will output colored results:
- ✓ Green = Passed
- ✗ Red = Failed
- ⊘ Yellow = Skipped

Example output:
```
==================================================
PUBLIC SPACE TESTS
==================================================
✓ Create Post with Text Only
✓ Create Post with Media URLs
✓ Check Posting Limit
  Friend Count: 5
  Can Post: true
  Daily Limit: 5
  Posts Today: 2
✓ Get Feed
  Found 10 posts in feed
✓ Like Post
✓ Unlike Post
✓ Comment on Post
✓ Share Post
✓ Delete Post

==================================================
TEST SUMMARY
==================================================
Total Tests: 9
Passed: 9
Failed: 0
Pass Rate: 100.00%

🎉 All tests passed!
```

## Configuration

Edit the test files to change:
- API base URL (default: `http://localhost:4000/api`)
- Test user credentials
- Test data

## Troubleshooting

### Tests Fail with Connection Error
- Ensure backend server is running on port 4000
- Check firewall settings
- Verify API endpoints are accessible

### 400/401 Errors
- Check if test user exists in database
- Verify authentication tokens
- Review required fields in API requests

### Date Formatting Errors
- These have been fixed in the latest version
- Ensure you're using the updated code

## Manual Testing Checklist

For features that require user interaction, use the manual testing guide in `TESTING_GUIDE.md`.

## Continuous Integration

To integrate with CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    cd tests
    npm install
    npm test
```

## Support

For issues or questions:
1. Check `TESTING_GUIDE.md` for detailed testing instructions
2. Review console output for specific error messages
3. Verify all prerequisites are met
