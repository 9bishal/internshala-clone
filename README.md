# Internshala Clone — Full-Stack Web Application

A comprehensive Internshala clone with advanced features including payment integration, multi-language support, social features, and security-focused authentication.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
  - [Task 1: Public Space](#task-1-public-space)
  - [Task 2: Forgot Password](#task-2-forgot-password)
  - [Task 3: Subscription Plans](#task-3-subscription-plans)
  - [Task 4: Resume Creation](#task-4-resume-creation)
  - [Task 5: Multi-Language Support](#task-5-multi-language-support)
  - [Task 6: Login History](#task-6-login-history)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Security](#security)
- [Razorpay Integration](#razorpay-integration)
- [Database Schema](#database-schema)
- [Contributing](#contributing)

---

## Project Overview

This project is a feature-rich clone of [Internshala](https://internshala.com), built with **Next.js** (frontend) and **Express.js** (backend), powered by **Firebase** (Auth + Firestore) and **Razorpay** for payment processing.

The application implements 6 major feature tasks, each with comprehensive backend APIs and frontend interfaces.

---

## Tech Stack

| Layer                | Technology                                    |
| -------------------- | --------------------------------------------- |
| **Frontend**         | Next.js 14, React 18, TypeScript, TailwindCSS |
| **Backend**          | Express.js, Node.js                           |
| **Database**         | Firebase Firestore                            |
| **Authentication**   | Firebase Email/Password Auth                  |
| **Payments**         | Razorpay (Test Mode)                          |
| **Email**            | SendGrid, Nodemailer                          |
| **Media Storage**    | Cloudinary                                    |
| **State Management** | Redux Toolkit                                 |
| **UI Components**    | Lucide React Icons                            |
| **Testing**          | Custom test runner with Axios                 |

---

## Architecture

```
┌────────────────────────────┐
│        Frontend            │
│   Next.js + React + TS     │
│   (Port 3000)              │
└──────────┬─────────────────┘
           │ axios HTTP
┌──────────▼─────────────────┐
│        Backend             │
│   Express.js REST API      │
│   (Port 5001)              │
└──────────┬─────────────────┘
           │
    ┌──────┼──────────┐
    │      │          │
    ▼      ▼          ▼
Firebase  Razorpay  SendGrid
Firestore Payment   Email
Auth      Gateway   Service
```

---

## Features

### Task 1: Public Space

A social media-like space where users can share posts with photos/videos, comment, like, and share with friends.

**Key Features:**

- **Text & Media Posts**: Create posts with text, photos, and videos
- **Friend-Based Posting Limits**:
  - 0 friends → Cannot post
  - 1 friend → 1 post/day
  - 2 friends → 2 posts/day
  - 10+ friends → Unlimited posts
- **Social Interactions**: Like, comment, share posts
- **Share with Friends**: Share posts with specific friends along with a personal message
- **Feed**: Chronological feed of all posts
- **Delete**: Users can delete their own posts

**Backend Routes**: `POST /api/posts`, `GET /api/posts/feed/:uid`, `POST /api/posts/:id/like`, `POST /api/posts/:id/comment`, `POST /api/posts/:id/share`

**Frontend**: `/publicspace`

---

### Task 2: Forgot Password

A secure password reset system with OTP verification, daily request limits, and an auto-generated password feature.

**Key Features:**

- **Password Reset via Email or Phone**: Users can reset their password using email or phone number
- **OTP Verification**: 6-digit OTP with 10-minute expiry
- **Once Per Day Limit**: Users can only request a password reset **once per day** — the system returns: _"You can use this option only once per day."_
- **Password Generator**: Generates random passwords using **only uppercase and lowercase letters** (no numbers, no special characters)
- **Secure Processing**: OTP stored in Firestore with expiry tracking

**Backend Routes**:

- `POST /api/auth/forgot-password` — Request OTP (max 1/day)
- `POST /api/auth/verify-otp-reset` — Verify OTP and reset password
- `POST /api/auth/generate-password` — Generate letters-only password

**Frontend**: `/forgotpassword`

---

### Task 3: Subscription Plans

A tiered subscription system with Razorpay payment integration, time-restricted payment windows, and email invoices.

**Subscription Tiers:**

| Plan       | Price  | Duration | Application Limit | Key Features                     |
| ---------- | ------ | -------- | ----------------- | -------------------------------- |
| **Free**   | ₹0     | Lifetime | 1/month           | Basic access                     |
| **Bronze** | ₹100   | 30 days  | 3/month           | Resume builder access            |
| **Silver** | ₹300   | 30 days  | 5/month           | Priority support, Interview tips |
| **Gold**   | ₹1,000 | 30 days  | Unlimited         | Career coach, Mock interviews    |

**Key Features:**

- **Razorpay Integration**: Secure order creation and payment verification
- **Payment Window**: Payments are only accepted between **10:00 AM – 11:00 AM IST**
- **Invoice Emails**: Automated email invoices via SendGrid after payment
- **Application Tracking**: Track and enforce monthly application limits
- **Subscription Management**: Upgrade, downgrade, and cancel subscription

**Backend Routes**: `GET /api/razorpay-subscription/plans`, `POST /api/razorpay-subscription/create-order`, `POST /api/razorpay-subscription/verify-payment`

**Frontend**: `/subscription`

---

### Task 4: Resume Creation

A premium resume builder that requires OTP verification and Razorpay payment (₹50 per resume).

**Key Features:**

- **Premium Plan Required**: Only users on Bronze, Silver, or Gold plans can create resumes
- **OTP Verification**: Email OTP required before payment
- **Razorpay Payment**: ₹50 per resume creation
- **Resume Data Storage**: Full resume saved to Firestore with user profile
- **Payment Confirmation**: Email confirmation after successful payment
- **Webhook Support**: Razorpay webhook handler for payment events

**Resume Flow:**

1. User clicks "Create Resume" (must be on a premium plan)
2. OTP sent to email → User verifies OTP
3. Razorpay payment of ₹50
4. Resume data saved and attached to profile
5. Confirmation email sent

**Backend Routes**: `POST /api/resume-razorpay/request-otp`, `POST /api/resume-razorpay/verify-otp`, `POST /api/resume-razorpay/create-order`, `POST /api/resume-razorpay/verify-resume-payment`

**Frontend**: `/resume/create`

---

### Task 5: Multi-Language Support

Support for 6 languages with OTP verification required for French language changes.

**Supported Languages (6 total):**

| Code | Language   | Native Name | OTP Required |
| ---- | ---------- | ----------- | ------------ |
| `en` | English    | English     | No           |
| `es` | Spanish    | Español     | No           |
| `hi` | Hindi      | हिंदी       | No           |
| `pt` | Portuguese | Português   | No           |
| `zh` | Chinese    | 中文        | No           |
| `fr` | French     | Français    | **Yes**      |

**Key Features:**

- **Language Selection**: Choose from 6 supported languages
- **French OTP Verification**: Changing to French requires OTP verification via email
- **Translations**: Full UI text translations for all 6 languages (welcome, hello, internships, jobs, profile, settings, logout, search, apply, home)
- **User Preferences**: Language preference saved per user

**Backend Routes**: `GET /api/language/supported`, `POST /api/language/request-change`, `POST /api/language/verify-change`, `GET /api/language/translations/:lang`

**Frontend**: `/language`

---

### Task 6: Login History

Detailed login tracking with security rules based on browser and device type.

**Key Features:**

- **Login Tracking**: Records timestamp, IP address, device info (browser, OS, device type)
- **Suspicious Login Detection**: Flags logins from different IPs within 10 minutes or new devices
- **Chrome OTP Requirement**: Users logging in with **Chrome browser** must verify via OTP
- **Mobile Time Restriction**: Mobile device logins are only allowed between **10:00 AM – 1:00 PM IST**
- **History Retrieval**: View last 20 login records

**Security Rules:**

| Condition                  | Rule                                |
| -------------------------- | ----------------------------------- |
| Chrome Browser             | OTP verification required           |
| Mobile Device              | Only allowed 10:00 AM – 1:00 PM IST |
| Different IP within 10 min | Flagged as suspicious               |
| New device/OS combination  | Flagged as suspicious               |

**Backend Routes**: `POST /api/auth/login-history`, `GET /api/auth/login-history/:uid`, `POST /api/auth/verify-chrome-otp`

**Frontend**: `/loginhistory`

---

## Project Structure

```
internshala-clone/
├── backend/                    # Express.js Backend
│   ├── index.js                # Server entry point (Port 5001)
│   ├── db.js                   # Firebase/Firestore initialization
│   ├── .env                    # Environment variables
│   ├── Routes/
│   │   ├── index.js            # Route aggregator
│   │   ├── auth.js             # Auth, Forgot Password, Login History
│   │   ├── posts.js            # Public Space (posts, likes, comments)
│   │   ├── friends.js          # Friend management
│   │   ├── subscription.js     # Basic subscription (simulated payment)
│   │   ├── razorpay-subscription.js  # Razorpay subscription integration
│   │   ├── resume-razorpay.js  # Resume creation with Razorpay
│   │   └── language.js         # Multi-language support
│   └── package.json
│
├── internarea/                 # Next.js Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── register/      # User registration UI
│   │   │   ├── forgotpassword/ # Password reset UI
│   │   │   ├── publicspace/    # Social feed UI
│   │   │   ├── subscription/   # Plan selection UI
│   │   │   ├── resume/         # Resume builder UI
│   │   │   ├── language/       # Language settings UI
│   │   │   ├── loginhistory/   # Login history UI
│   │   │   └── friends/        # Friend management UI
│   │   ├── Feature/            # Redux slices
│   │   ├── utils/              # API helpers
│   │   └── components/         # Shared components
│   └── package.json
│
├── razor_pay_ntegration/       # Razorpay Node.js SDK (local copy)
│   ├── lib/
│   │   ├── razorpay.js         # SDK main module
│   │   ├── api.js              # API request handler
│   │   ├── resources/          # Payment, Order, Subscription resources
│   │   └── utils/              # Crypto, signature utilities
│   └── README.md
│
├── tests/                      # Test suites
│   ├── run-all-tests.js        # Master test runner
│   ├── publicspace.test.js     # Task 1 tests
│   ├── forgotpassword.test.js  # Task 2 tests
│   ├── subscription.test.js    # Task 3 tests
│   ├── resume.test.js          # Task 4 tests
│   ├── language.test.js        # Task 5 tests
│   └── loginhistory.test.js    # Task 6 tests
│
├── PAYMENT_INTEGRATION_SUMMARY.md
└── README.md                   # This file
```

---

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Firebase Project with Firestore enabled
- Razorpay Test Account
- SendGrid Account (for emails)

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/internshala-clone.git
cd internshala-clone
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd internarea
npm install
```

### 4. Install Test Dependencies

```bash
cd tests
npm install
```

### 5. Configure Environment Variables

Copy the `.env.example` to `.env` in the `backend/` directory and fill in your credentials (see [Environment Variables](#environment-variables)).

### 6. Start the Application

**Backend (Port 5001):**

```bash
cd backend
node index.js
```

**Frontend (Port 3000):**

```bash
cd internarea
npm run dev
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=5001
NODE_ENV=development
DEBUG=True

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_DATABASE_URL=your-database-url

# Razorpay (Test Keys)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# SendGrid (Email)
SENDGRID_API_KEY=SG.xxxxx
DEFAULT_FROM_EMAIL=your-email@example.com

# Cloudinary (Media)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Timezone
TZ=Asia/Kolkata
```

---

## API Documentation

### Authentication (`/api/auth`)

| Method | Endpoint              | Description                         |
| ------ | --------------------- | ----------------------------------- |
| POST   | `/sync-user`          | Sync user data from Firebase Auth   |
| POST   | `/forgot-password`    | Request password reset OTP (1x/day) |
| POST   | `/verify-otp-reset`   | Verify OTP and reset password       |
| POST   | `/generate-password`  | Generate letters-only password      |
| POST   | `/login-history`      | Record login with device info       |
| POST   | `/verify-chrome-otp`  | Verify Chrome browser OTP           |
| GET    | `/login-history/:uid` | Get user's login history            |
| GET    | `/profile/:uid`       | Get user profile                    |

### Public Space (`/api/posts`)

| Method | Endpoint            | Description             |
| ------ | ------------------- | ----------------------- |
| POST   | `/`                 | Create a new post       |
| GET    | `/feed/:uid`        | Get user's feed         |
| GET    | `/check-limit/:uid` | Check posting limit     |
| POST   | `/:id/like`         | Like/unlike a post      |
| POST   | `/:id/comment`      | Add comment             |
| POST   | `/:id/share`        | Share post with friends |
| DELETE | `/:id`              | Delete a post           |

### Subscriptions (`/api/razorpay-subscription`)

| Method | Endpoint                    | Description                   |
| ------ | --------------------------- | ----------------------------- |
| GET    | `/plans`                    | Get all subscription plans    |
| POST   | `/create-order`             | Create Razorpay payment order |
| POST   | `/verify-payment`           | Verify payment and activate   |
| POST   | `/can-apply`                | Check application limit       |
| POST   | `/cancel-subscription/:uid` | Cancel subscription           |
| GET    | `/payment-history/:uid`     | Get payment history           |

### Resume (`/api/resume-razorpay`)

| Method | Endpoint                 | Description                |
| ------ | ------------------------ | -------------------------- |
| POST   | `/request-otp`           | Request OTP for resume     |
| POST   | `/verify-otp`            | Verify resume OTP          |
| POST   | `/create-order`          | Create payment order (₹50) |
| POST   | `/verify-resume-payment` | Verify and save resume     |
| GET    | `/:uid`                  | Get user's resume          |

### Language (`/api/language`)

| Method | Endpoint              | Description               |
| ------ | --------------------- | ------------------------- |
| GET    | `/supported`          | Get 6 supported languages |
| GET    | `/preference/:uid`    | Get user's language       |
| POST   | `/request-change`     | Request language change   |
| POST   | `/verify-change`      | Verify OTP for French     |
| GET    | `/translations/:lang` | Get translations          |

### Friends (`/api/friends`)

| Method | Endpoint          | Description           |
| ------ | ----------------- | --------------------- |
| POST   | `/send-request`   | Send friend request   |
| POST   | `/accept-request` | Accept friend request |
| POST   | `/reject-request` | Reject friend request |
| POST   | `/remove-friend`  | Remove friend         |
| GET    | `/:uid`           | Get friend list       |
| GET    | `/count/:uid`     | Get friend count      |

---

## Testing

### Run All Tests

```bash
cd tests
npm install
node run-all-tests.js
```

### Run Individual Test Suites

```bash
# Task 1: Public Space
node publicspace.test.js

# Task 2: Forgot Password
node forgotpassword.test.js

# Task 3: Subscription Plans
node subscription.test.js

# Task 4: Resume Creation
node resume.test.js

# Task 5: Multi-Language
node language.test.js

# Task 6: Login History
node loginhistory.test.js
```

### Test Prerequisites

1. Backend server must be running on `http://localhost:5001`
2. Firebase Firestore must be accessible
3. Test user data may need to be seeded

### Test Coverage

| Task            | Test File                | Tests                                                    |
| --------------- | ------------------------ | -------------------------------------------------------- |
| Public Space    | `publicspace.test.js`    | Post creation, limits, likes, comments, shares, deletion |
| Forgot Password | `forgotpassword.test.js` | Password generator, OTP, once/day limit                  |
| Subscriptions   | `subscription.test.js`   | Plans, pricing, time window, cancellation                |
| Resume          | `resume.test.js`         | OTP, premium check, save, retrieve                       |
| Language        | `language.test.js`       | 6 languages, French OTP, translations                    |
| Login History   | `loginhistory.test.js`   | Device tracking, Chrome OTP, mobile restriction          |

---

## Security

### Authentication

- Firebase Email/Password Authentication (register and login with email)
- Firebase Admin SDK for server-side user management
- OTP verification for sensitive actions (password reset, resume creation, language change to French, Chrome login)

### Payment Security

- **HMAC-SHA256 Signature Verification** for all Razorpay payments
- **Time-restricted payment window** (10:00 AM – 11:00 AM IST)
- **Webhook validation** for server-side payment confirmation

### Login Security

- **Chrome Browser OTP**: Additional verification required for Chrome
- **Mobile Time Restriction**: Mobile logins only between 10:00 AM – 1:00 PM IST
- **Suspicious Activity Detection**: Flags logins from new devices or rapid IP changes
- **IP Address Logging**: All login IPs are recorded

### Rate Limiting

- **Forgot Password**: Maximum 1 request per day
- **Posting Limits**: Based on friend count
- **Application Limits**: Based on subscription tier

---

## Razorpay Integration

### Overview

The project uses Razorpay in **Test Mode** for two payment flows:

1. **Subscription Plans**: Monthly subscription payments (₹100–₹1,000)
2. **Resume Creation**: One-time payment of ₹50

### Payment Flow

```
User Selects Plan/Resume
        ↓
Backend Creates Razorpay Order
        ↓
Frontend Opens Razorpay Checkout
        ↓
User Completes Payment
        ↓
Backend Verifies Signature (HMAC-SHA256)
        ↓
Feature Activated + Invoice Email Sent
```

### Local SDK

The `razor_pay_ntegration/` directory contains a local copy of the Razorpay Node.js SDK for reference and customization.

### Test Credentials

```
Key ID: rzp_test_xxxxx (set in .env)
Key Secret: xxxxx (set in .env)
```

---

## Database Schema

### Firestore Collections

```
users/
├── {uid}/
│   ├── email, displayName, photoURL
│   ├── subscription: { planId, status, expiresAt }
│   ├── loginHistory: [{ timestamp, ipAddress, deviceInfo, isSuspicious }]
│   ├── resume: { name, email, skills, experience, ... }
│   └── languagePreference: "en"

posts/
├── {postId}/
│   ├── userId, text, mediaUrls, type
│   ├── likes: [userId], likeCount
│   ├── comments: [{ userId, text, timestamp }]
│   └── shares: [{ sharedTo, message, timestamp }]

friendships/
├── {friendshipId}/
│   ├── userId, friendId, status, createdAt

friend_requests/
├── {requestId}/
│   ├── from, to, status, createdAt

payments/
├── {paymentId}/
│   ├── uid, planId, amount, razorpayPaymentId, status

password_resets/
├── {email}/
│   ├── otp, generatedPassword, expiresAt, used

otp_limits/
├── {identifier_date}/
│   ├── count, date, lastReset

chrome_login_otp/
├── {uid}/
│   ├── otp, email, expiresAt, verified
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is for educational purposes as part of an internship training program.

---

**Built with ❤️ by Bishal Kumar Shah**
