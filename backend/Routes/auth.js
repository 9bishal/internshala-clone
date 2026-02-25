const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const emailTemplates = require("../utils/emailTemplates");

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

// Delete all users from Firebase Auth and Firestore
router.delete("/delete-all-users", async (req, res) => {
  try {
    db = admin.firestore();

    // Delete all users from Firebase Auth (in batches)
    let deletedAuthCount = 0;
    let nextPageToken;

    do {
      const listResult = await admin.auth().listUsers(1000, nextPageToken);
      const uids = listResult.users.map(user => user.uid);
      
      if (uids.length > 0) {
        const deleteResult = await admin.auth().deleteUsers(uids);
        deletedAuthCount += deleteResult.successCount;
        console.log(`🗑️ Deleted ${deleteResult.successCount} users from Firebase Auth`);
        
        if (deleteResult.failureCount > 0) {
          console.error(`⚠️ Failed to delete ${deleteResult.failureCount} users`);
        }
      }

      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    // Delete all user documents from Firestore
    let deletedFirestoreCount = 0;
    const usersSnapshot = await db.collection("users").get();
    
    const batch = db.batch();
    usersSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      deletedFirestoreCount++;
    });

    if (deletedFirestoreCount > 0) {
      await batch.commit();
    }

    console.log(`🗑️ Deleted ${deletedFirestoreCount} user docs from Firestore`);

    res.status(200).json({
      message: "All users deleted successfully",
      deletedFromAuth: deletedAuthCount,
      deletedFromFirestore: deletedFirestoreCount,
    });
  } catch (error) {
    console.error("Error deleting all users:", error);
    res.status(500).json({ message: "Failed to delete users", error: error.message });
  }
});

// Configure email service (using SendGrid)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Password generator: random password with ONLY uppercase and lowercase letters
// No numbers, no special characters
function generateRandomPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const allChars = uppercase + lowercase;
  let password = '';
  // Ensure at least one uppercase and one lowercase
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  for (let i = 2; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Check if mobile login time is allowed (10:00 AM - 1:00 PM IST)
function isMobileLoginTimeAllowed() {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hour = istTime.getHours();
  return hour >= 10 && hour < 13;
}

// Send OTP via email using SendGrid
async function sendOTPEmail(email, otp, language = "en", type = "password_reset") {
  try {
    const templates = emailTemplates[language] || emailTemplates["en"];
    const subject = templates.otp_subject;
    const title = type === "chrome_login" ? templates.chrome_login_title : templates.password_reset_title;
    const body = type === "chrome_login" ? templates.chrome_login_body : templates.password_reset_body;

    const msg = {
      to: email,
      from: process.env.DEFAULT_FROM_EMAIL,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              ${body}
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; letter-spacing: 2px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #999; font-size: 14px;">
              ${templates.otp_expiry_msg}
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

// Generate a random password (letters only) endpoint
router.post("/generate-password", async (req, res) => {
  try {
    const { length } = req.body;
    const passwordLength = length && length >= 8 && length <= 32 ? length : 12;
    const password = generateRandomPassword(passwordLength);
    res.status(200).json({
      message: "Password generated successfully",
      password,
      note: "This password contains only uppercase and lowercase letters (no numbers or special characters)",
    });
  } catch (error) {
    console.error("Error generating password:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Request password reset OTP (limited to ONCE per day per task requirement)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, phone, language = "en" } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ message: "Email or phone number is required" });
    }

    const identifier = email || phone;

    db = admin.firestore();

    // Check daily reset limit (max 1 reset per day as per task requirement)
    const today = new Date().toISOString().split("T")[0];
    const otpLimitRef = db.collection("otp_limits").doc(`${identifier}_${today}`);
    const otpLimitDoc = await otpLimitRef.get();

    let otpCount = 0;
    if (otpLimitDoc.exists) {
      otpCount = otpLimitDoc.data().count || 0;
    }

    if (otpCount >= 1) {
      return res.status(429).json({
        message: "You can use this option only once per day.",
        limitReached: true,
      });
    }

    // Check if user exists by email
    if (email) {
      try {
        await admin.auth().getUserByEmail(email);
      } catch (error) {
        return res.status(404).json({ message: "Email not registered" });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Also generate a random password (letters only, no numbers or special chars)
    const generatedPassword = generateRandomPassword(12);

    // Store OTP in Firestore
    await db.collection("password_resets").doc(identifier).set({
      otp,
      generatedPassword,
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
    if (email) {
      const emailSent = await sendOTPEmail(email, otp, language, "password_reset");

      if (emailSent) {
        res.status(200).json({
          message: "OTP sent to your email",
          otpSentTo: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
          generatedPassword,
        });
      } else {
        res.status(500).json({ message: "Failed to send OTP" });
      }
    } else {
      // Phone-based reset - return OTP info (in production would send SMS)
      res.status(200).json({
        message: "OTP sent to your phone",
        generatedPassword,
      });
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

    // Look up user by email to get their UID
    const userRecord = await admin.auth().getUserByEmail(email);

    // Update password using the correct UID
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword,
    });

    // Mark OTP as used
    await db.collection("password_resets").doc(email).update({
      used: true,
      resetAt: new Date(),
    });

    res.status(200).json({ message: "Password reset successfully! You can now login with your new password." });
  } catch (error) {
    console.error("Error in verify-otp-reset:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Log user login with device info
// Includes Chrome OTP verification requirement and mobile time restriction
router.post("/login-history", async (req, res) => {
  try {
    const { uid, email, deviceInfo, ipAddress, language = "en" } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: "User ID and email are required" });
    }

    db = admin.firestore();

    // --- ACCESS RULE: Mobile device login only allowed between 10 AM - 1 PM IST ---
    const deviceType = (deviceInfo?.device || "Unknown").toLowerCase();
    if (deviceType === "mobile") {
      if (!isMobileLoginTimeAllowed()) {
        return res.status(403).json({
          message: "Mobile login is only allowed between 10:00 AM and 1:00 PM IST.",
          blocked: true,
          reason: "mobile_time_restriction",
          allowedWindow: { start: "10:00 AM IST", end: "1:00 PM IST" },
        });
      }
    }

    // --- ACCESS RULE: Chrome browser requires OTP verification ---
    const browserName = (deviceInfo?.browser || "Unknown").toLowerCase();
    let requiresChromeOTP = false;
    if (browserName === "chrome") {
      requiresChromeOTP = true;

      // Check if an OTP was already sent recently (within last 10 mins) to prevent duplicate emails
      const existingOtpDoc = await db.collection("chrome_login_otp").doc(uid).get();
      const existingOtpData = existingOtpDoc.exists ? existingOtpDoc.data() : null;
      
      let shouldSendNewOTP = true;
      if (existingOtpData && existingOtpData.createdAt) {
        const createdAt = existingOtpData.createdAt.toDate ? existingOtpData.createdAt.toDate() : new Date(existingOtpData.createdAt);
        const minutesSinceLastOTP = (Date.now() - createdAt.getTime()) / (1000 * 60);
        if (minutesSinceLastOTP < 10 && !existingOtpData.verified) {
          shouldSendNewOTP = false; // Reuse existing OTP, don't send another email
          console.log(`⏭️ Skipping Chrome OTP email for ${email} - one was sent ${minutesSinceLastOTP.toFixed(1)} min ago`);
        }
      }

      if (shouldSendNewOTP) {
        // Generate and store OTP for Chrome verification
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.collection("chrome_login_otp").doc(uid).set({
          otp,
          email,
          expiresAt: otpExpiry,
          createdAt: new Date(),
          verified: false,
        });

        // Send OTP email
        try {
          await sendOTPEmail(email, otp, language, "chrome_login");
          console.log(`📧 Chrome OTP email sent to ${email} (Language: ${language})`);
        } catch (emailError) {
          console.error("Failed to send Chrome OTP email:", emailError);
        }
      }
    }

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
      let timeDiff = Infinity;
      try {
        const lastTimestamp = lastLogin.timestamp?.toDate ? lastLogin.timestamp.toDate() : new Date(lastLogin.timestamp);
        timeDiff = (new Date() - lastTimestamp) / (1000 * 60);
      } catch (e) {
        // Ignore date parsing errors
      }

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
      requiresChromeOTP,
      chromeOTPMessage: requiresChromeOTP ? "OTP sent to your email for Chrome browser verification" : null,
    });
  } catch (error) {
    console.error("Error in login-history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify Chrome login OTP
router.post("/verify-chrome-otp", async (req, res) => {
  try {
    const { uid, otp } = req.body;

    if (!uid || !otp) {
      return res.status(400).json({ message: "UID and OTP are required" });
    }

    db = admin.firestore();

    const otpDoc = await db.collection("chrome_login_otp").doc(uid).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    const otpData = otpDoc.data();

    if (new Date() > otpData.expiresAt.toDate()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark as verified
    await db.collection("chrome_login_otp").doc(uid).update({
      verified: true,
      verifiedAt: new Date(),
    });

    res.status(200).json({
      message: "Chrome login verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("Error in verify-chrome-otp:", error);
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
