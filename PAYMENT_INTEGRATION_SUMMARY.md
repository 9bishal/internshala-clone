# Payment Module Integration Summary

## Overview
The Internshala Clone platform has been successfully integrated with Razorpay payment gateway to manage subscription plans and premium features. This document outlines the complete payment implementation including subscription plans, resume creation with payment, and related features.

---

## 1. Subscription Plans Integration

### Plans Configuration
Located in: `/backend/Routes/razorpay-subscription.js`

Four subscription tiers are available:

| Plan | Price | Applications/Month | Features |
|------|-------|-------------------|----------|
| **Free** | ₹0 | 1 | Basic profile access |
| **Bronze** | ₹100 | 3 | Priority support, Profile customization |
| **Silver** | ₹300 | 5 | Extended profile features, Application tracking |
| **Gold** | ₹1000 | Unlimited | Resume builder, Mock interviews, All features |

### Key Features:
- **Payment Window**: Payments only allowed between 10:00 AM - 11:00 AM IST
- **Time Validation**: `isPaymentTimeAllowed()` function checks payment eligibility
- **Email Invoicing**: Automatic SendGrid email with invoice details after successful payment
- **Subscription Tracking**: User subscription data stored in Firebase Firestore

### API Endpoints:

#### GET `/api/razorpay-subscription/plans`
Fetches all available subscription plans.

#### GET `/api/razorpay-subscription/:uid`
Fetches user's current subscription status.

#### POST `/api/razorpay-subscription/create-order`
Creates a Razorpay order for payment processing.

#### POST `/api/razorpay-subscription/verify-payment`
Verifies payment signature and activates subscription.

#### POST `/api/razorpay-subscription/can-apply`
Checks if user can apply for an internship based on their subscription.

#### POST `/api/razorpay-subscription/increment-application`
Increments application count after successful application.

#### POST `/api/razorpay-subscription/cancel/:uid`
Cancels user's subscription and downgrades to free plan.

#### GET `/api/razorpay-subscription/payments/:uid`
Fetches payment history with timestamps as ISO strings.

---

## 2. Resume Creation with Payment

### Location: `/backend/Routes/resume-razorpay.js`

### Pricing:
- **Resume Creation Fee**: ₹50 per resume
- **Verification Method**: Email OTP (expires in 10 minutes)
- **Gateway**: Razorpay

### Workflow:

#### Step 1: Request OTP
**Endpoint**: `POST /api/resume-razorpay/request-otp`

#### Step 2: Verify OTP
**Endpoint**: `POST /api/resume-razorpay/verify-otp`

#### Step 3: Create Payment Order
**Endpoint**: `POST /api/resume-razorpay/create-order`

#### Step 4: Verify Resume Payment
**Endpoint**: `POST /api/resume-razorpay/verify-payment`

### Features:
- OTP validation (10-minute expiry)
- Email verification via SendGrid
- Automatic invoice email after payment
- Resume stored in user profile

---

## 3. Public Space Posting Limits

### Location: `/backend/Routes/posts.js`

### Posting Limits Based on Friends:

| Friends Count | Daily Limit | Notes |
|---------------|------------|-------|
| 0 | 0 | Cannot post |
| 1 | 1 | Once per day |
| 2 | 2 | Twice per day |
| 3-9 | Variable | Equal to friend count |
| 10+ | Unlimited | No restrictions |

This structure encourages social interaction, rewards users for building connections, and maintains meaningful content in the community.

---

## 4. Environment Variables

### Required .env Configuration:

```env
# Razorpay (Test Mode Keys)
RAZORPAY_KEY_ID=rzp_test_SCQMgnp7aK7svP
RAZORPAY_KEY_SECRET=TdRahWowlDBYvQqkZ6zav2jF
RAZORPAY_WEBHOOK_SECRET=internshala_webhook_secret_2025

# SendGrid Email
SENDGRID_API_KEY=SG.xxxxx
DEFAULT_FROM_EMAIL=your-email@gmail.com

# Site Configuration
SITE_URL=http://localhost:3000
PORT=5001

# Timezone
TZ=Asia/Kolkata
```

---

## 5. Frontend Integration

### Subscription Page: `/src/pages/subscription/index.tsx`

**Features:**
- Display all subscription plans with features
- Show current user subscription status
- Subscribe to plan button (triggers Razorpay integration)
- Cancel subscription option
- Plan comparison

---

## 6. Database Schema (Firestore)

### Users Collection - Subscription Field:
```json
{
  "uid": "user-id",
  "subscription": {
    "planId": "bronze",
    "status": "active",
    "startedAt": Timestamp,
    "expiresAt": Timestamp,
    "applicationsUsed": 1,
    "applicationsLimit": 3,
    "lastPaymentId": "pay_id",
    "lastOrderId": "order_id"
  }
}
```

### Payments Collection:
```json
{
  "uid": "user-id",
  "planId": "bronze",
  "planName": "Bronze Plan",
  "amount": 100,
  "currency": "INR",
  "razorpay_order_id": "order_id",
  "razorpay_payment_id": "pay_id",
  "razorpay_signature": "signature",
  "status": "completed",
  "timestamp": Timestamp
}
```

---

## 7. Security Implementation

### Payment Signature Verification:
- HMAC-SHA256 signature verification
- Validates order and payment ID
- Protects against payment tampering

### OTP Security:
- 6-digit random OTP generated
- 10-minute expiration
- Email verification required
- Limited attempt tracking

### Time-based Restrictions:
- Payment window: 10:00 AM - 11:00 AM IST
- OTP expiry: 10 minutes
- Session management via Firebase Auth

---

## 8. Error Handling & Validation

### Common Error Codes:

| Code | Message | Solution |
|------|---------|----------|
| 400 | Payment window closed | Try between 10 AM - 11 AM IST |
| 400 | Invalid plan ID | Select valid plan from available options |
| 400 | Invalid payment signature | Payment verification failed, contact support |
| 500 | SendGrid API error | Check email configuration |
| 403 | OTP expired | Request new OTP |

---

## 9. Testing Guidelines

### Test Mode:
- Using Razorpay test keys (rzp_test_*)
- No actual money charged
- Test card: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: Any 3 digits

### Test Scenarios:
1. Subscribe to plan during payment window (10-11 AM IST)
2. Attempt payment outside window (should fail)
3. Cancel subscription and verify downgrade to free
4. Request resume creation OTP
5. Verify OTP and complete payment
6. Check payment history

---

## 10. Current Status

✅ **Completed:**
- Razorpay integration setup
- Subscription plans (Free, Bronze, Silver, Gold)
- Payment verification with signature
- Invoice email via SendGrid
- Resume creation with OTP verification
- Public space posting limits based on friends
- Timestamp ISO string formatting for frontend compatibility
- Payment history API endpoint
- Subscription status tracking

⚠️ **Notes:**
- Payment window enforced (10-11 AM IST only)
- All sensitive keys stored in .env (test mode)
- Firebase Firestore used for data persistence
- SendGrid for email notifications

---

## 11. Implementation Details

### Backend Files:
1. `/backend/Routes/razorpay-subscription.js` - Subscription management
2. `/backend/Routes/resume-razorpay.js` - Resume payment with OTP
3. `/backend/Routes/posts.js` - Public space posting limits
4. `/backend/Routes/index.js` - Route registration

### Frontend Files:
1. `/internarea/src/pages/subscription/index.tsx` - Subscription UI
2. `/internarea/src/pages/resume/` - Resume creation pages
3. `/internarea/src/pages/publicspace/` - Public space UI

### Dependencies:
- `razorpay` - ₹2.9.6 (Node.js SDK)
- `@sendgrid/mail` - ^8.1.6 (Email service)
- `firebase-admin` - ^13.6.1 (Database)
- `express` - ^4.21.2 (Backend framework)

---

## 12. Integration Checklist

- [x] Razorpay SDK installed
- [x] Environment variables configured
- [x] Backend API endpoints created
- [x] Payment signature verification implemented
- [x] Email notifications via SendGrid
- [x] Firebase Firestore schema created
- [x] Subscription tracking implemented
- [x] Posting limits based on friends count
- [x] Resume OTP verification
- [x] Payment history tracking
- [x] Frontend subscription page
- [x] Error handling and validation

---

## 13. Support & References

- **Razorpay Docs**: https://razorpay.com/docs/
- **SendGrid Docs**: https://docs.sendgrid.com/
- **Firebase Firestore**: https://firebase.google.com/docs/firestore

---

**Last Updated**: February 21, 2026  
**Version**: 1.0  
**Status**: Still in Development 
