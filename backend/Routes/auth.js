const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

let db;

// Sync/Update user data (name, email, photo)
router.post("/sync-user", async (req, res) => {
  try {
    const { uid, name, email, photo } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: "UID and email are required" });
    }

    db = admin.firestore();

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    // Extract name from email if not provided
    const displayName = name || email.split('@')[0] || "User";
    
    const userData = {
      uid,
      name: displayName,
      email,
      photo: photo || null,
      updatedAt: new Date(),
    };

    if (userDoc.exists) {
      // Update existing user
      await userRef.update(userData);
    } else {
      // Create new user
      userData.createdAt = new Date();
      userData.subscription = {
        planId: "free",
        status: "active",
        startedAt: new Date(),
        expiresAt: null,
      };
      await userRef.set(userData);
    }

    res.status(200).json({
      message: "User data synced successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Error syncing user data:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Configure email service (using SendGrid)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email using SendGrid
async function sendOTPEmail(email, otp) {
  try {
    const msg = {
      to: email,
      from: process.env.DEFAULT_FROM_EMAIL,
      subject: "Password Reset OTP - Internshala",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              You requested a password reset. Use the OTP below to reset your password:
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; letter-spacing: 2px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #999; font-size: 14px;">
              This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return false;
  }
}

// Request password reset OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    db = admin.firestore();

    // Check daily OTP limit (max 3 OTPs per day)
    const today = new Date().toISOString().split("T")[0];
    const otpLimitRef = db.collection("otp_limits").doc(`${email}_${today}`);
    const otpLimitDoc = await otpLimitRef.get();

    let otpCount = 0;
    if (otpLimitDoc.exists) {
      otpCount = otpLimitDoc.data().count || 0;
    }

    if (otpCount >= 3) {
      return res.status(429).json({
        message: "Daily OTP limit exceeded. Try again tomorrow.",
      });
    }

    // Check if user exists
    try {
      await admin.auth().getUserByEmail(email);
    } catch (error) {
      return res.status(404).json({ message: "Email not registered" });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Firestore
    await db.collection("password_resets").doc(email).set({
      otp,
      expiresAt,
      createdAt: new Date(),
      used: false,
    });

    // Update OTP limit counter
    await otpLimitRef.set({
      count: otpCount + 1,
      date: today,
      lastReset: new Date(),
    });

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);

    if (emailSent) {
      res.status(200).json({
        message: "OTP sent to your email",
        otpSentTo: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
      });
    } else {
      res.status(500).json({ message: "Failed to send OTP" });
    }
  } catch (error) {
    console.error("Error in forgot-password:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify OTP and reset password
router.post("/verify-otp-reset", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    db = admin.firestore();

    // Retrieve stored OTP
    const otpDoc = await db.collection("password_resets").doc(email).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    const otpData = otpDoc.data();

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt.toDate()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if OTP was already used
    if (otpData.used) {
      return res.status(400).json({ message: "OTP already used" });
    }

    // Update password
    await admin.auth().updateUser(email, {
      password: newPassword,
    });

    // Mark OTP as used
    await db.collection("password_resets").doc(email).update({
      used: true,
      resetAt: new Date(),
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in verify-otp-reset:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Log user login with device info
router.post("/login-history", async (req, res) => {
  try {
    const { uid, email, deviceInfo, ipAddress } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: "User ID and email are required" });
    }

    db = admin.firestore();

    // Get user's login history
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    let userData = userDoc.data() || {};
    let loginHistory = userData.loginHistory || [];

    // Create login record
    const loginRecord = {
      timestamp: new Date(),
      ipAddress,
      deviceInfo: {
        userAgent: deviceInfo?.userAgent || "Unknown",
        browser: deviceInfo?.browser || "Unknown",
        os: deviceInfo?.os || "Unknown",
        device: deviceInfo?.device || "Unknown",
      },
    };

    // Check for suspicious login attempts
    let isSuspicious = false;
    let suspiciousReason = "";

    if (loginHistory.length > 0) {
      const lastLogin = loginHistory[0];
      const timeDiff =
        (new Date() - lastLogin.timestamp.toDate()) / (1000 * 60); // minutes

      // Flag if login from different IP within short time
      if (
        lastLogin.ipAddress !== ipAddress &&
        timeDiff < 10
      ) {
        isSuspicious = true;
        suspiciousReason =
          "Multiple logins from different locations within 10 minutes";
      }

      // Flag if login from very different location
      if (
        lastLogin.deviceInfo.os !== deviceInfo?.os &&
        lastLogin.deviceInfo.browser !== deviceInfo?.browser
      ) {
        isSuspicious = true;
        suspiciousReason = "Login from new device";
      }
    }

    // Add new login to history (keep last 20 logins)
    loginHistory.unshift({
      ...loginRecord,
      isSuspicious,
      suspiciousReason,
    });
    loginHistory = loginHistory.slice(0, 20);

    // Update user document
    await userRef.set(
      {
        uid,
        email,
        lastLogin: new Date(),
        loginHistory,
      },
      { merge: true }
    );

    res.status(200).json({
      message: "Login recorded",
      isSuspicious,
      suspiciousReason: isSuspicious ? suspiciousReason : null,
    });
  } catch (error) {
    console.error("Error in login-history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's login history
router.get("/login-history/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    db = admin.firestore();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();
    const loginHistory = userData.loginHistory || [];

    res.status(200).json({
      loginHistory,
      totalLogins: loginHistory.length,
    });
  } catch (error) {
    console.error("Error in get login-history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify suspicious login with OTP
router.post("/verify-suspicious-login", async (req, res) => {
  try {
    const { uid, otp } = req.body;

    if (!uid || !otp) {
      return res.status(400).json({ message: "UID and OTP are required" });
    }

    db = admin.firestore();

    // Retrieve stored OTP
    const otpDoc = await db
      .collection("suspicious_login_otp")
      .doc(uid)
      .get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    const otpData = otpDoc.data();

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt.toDate()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark OTP as verified
    await db.collection("suspicious_login_otp").doc(uid).update({
      verified: true,
      verifiedAt: new Date(),
    });

    res.status(200).json({
      message: "Login verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("Error in verify-suspicious-login:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user profile by UID
router.get("/user/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ message: "UID is required" });
    }

    db = admin.firestore();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Return a basic profile with just the UID instead of 404
      // This helps with displaying posts from users who may have been deleted
      return res.status(200).json({
        uid: uid,
        name: "Unknown User",
        email: null,
        photo: null,
      });
    }

    const userData = userDoc.data();
    res.status(200).json({
      uid: userData.uid || uid,
      name: userData.name || "Unknown User",
      email: userData.email || null,
      photo: userData.photo || null,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
