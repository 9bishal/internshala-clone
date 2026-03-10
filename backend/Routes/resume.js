const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

let db;

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const RESUME_PRICE = 50; // ₹50 per resume

// Generate OTP
function generateOTP() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return otp;
}

// Send OTP email
async function sendOTPEmail(email, otp, name) {
  console.log(
    `\n=========================================\n🚨 SYSTEM OTP GENERATED FOR ${email} [resume_creation]\n🔐 OTP IS: ${otp}\n=========================================\n`,
  );
  const msg = {
    to: email,
    from: process.env.DEFAULT_FROM_EMAIL,
    subject: "Resume Creation OTP - Internshala",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #333; margin-bottom: 20px;">Resume Creation Verification</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Hi ${name},<br><br>
            To proceed with resume creation (₹50), please verify your email with the OTP below:
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
}

// Send payment success email
async function sendPaymentSuccessEmail(email, name, paymentDetails) {
  const msg = {
    to: email,
    from: process.env.DEFAULT_FROM_EMAIL,
    subject: "Payment Successful - Resume Builder | Internshala",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #10B981; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 28px;">✓</span>
            </div>
          </div>
          <h2 style="color: #10B981; text-align: center; margin-bottom: 20px;">Payment Successful!</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Hi ${name},<br><br>
            Your payment for Resume Creation has been successfully processed. You can now create your professional resume.
          </p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Payment Receipt</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Amount Paid</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: bold;">₹${paymentDetails.amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Payment ID</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">${paymentDetails.razorpay_payment_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Order ID</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">${paymentDetails.razorpay_order_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Status</td>
                <td style="padding: 8px 0; color: #10B981; font-size: 14px; text-align: right; font-weight: bold;">✅ Completed</td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin-top: 25px;">
            <a href="${process.env.SITE_URL || "http://localhost:3000"}/resume-editor" style="background-color: #3B82F6; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">
              Create Your Resume Now
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 25px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("Payment success email sent to:", email);
  } catch (error) {
    console.error("Failed to send payment success email:", error);
  }
}

// Send payment failed email
async function sendPaymentFailedEmail(email, name, failureDetails) {
  const msg = {
    to: email,
    from: process.env.DEFAULT_FROM_EMAIL,
    subject: "Payment Failed - Resume Builder | Internshala",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #EF4444; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 28px;">✗</span>
            </div>
          </div>
          <h2 style="color: #EF4444; text-align: center; margin-bottom: 20px;">Payment Failed</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Hi ${name},<br><br>
            Unfortunately, your payment for Resume Creation could not be processed. Don't worry — no amount has been deducted from your account.
          </p>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Failure Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Amount</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">₹${RESUME_PRICE}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Reason</td>
                <td style="padding: 8px 0; color: #EF4444; font-size: 14px; text-align: right;">${failureDetails.reason || "Payment was declined or cancelled"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Status</td>
                <td style="padding: 8px 0; color: #EF4444; font-size: 14px; text-align: right; font-weight: bold;">❌ Failed</td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin-top: 25px;">
            <a href="${process.env.SITE_URL || "http://localhost:3000"}/resume/create" style="background-color: #3B82F6; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">
              Try Again
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 25px;">
            If the amount was deducted, it will be refunded within 5-7 business days. For help, contact our support team.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("Payment failed email sent to:", email);
  } catch (error) {
    console.error("Failed to send payment failed email:", error);
  }
}

// ======================================================
// GET Routes - Fetch resumes and check access
// ======================================================

// Get all resumes for a user
router.get("/resumes/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const resumesSnapshot = await db
      .collection("resumes")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const resumes = [];
    resumesSnapshot.forEach((doc) => {
      resumes.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({ resumes });
  } catch (error) {
    console.error("Error fetching resumes:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Check if user has access to create resumes (premium plan check)
router.get("/access/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Check subscription status
    const subDoc = await db.collection("subscriptions").doc(uid).get();
    const subData = subDoc.exists ? subDoc.data() : { planId: "free", status: "inactive" };

    const premiumPlans = ["bronze", "silver", "gold"];
    const hasPremium = premiumPlans.includes(subData.planId?.toLowerCase());
    const hasPaidForResume = userData.hasPaidForResume || false;

    res.status(200).json({
      canCreateResume: hasPremium,
      hasPaidForResume,
      planId: subData.planId || "free",
      planDetails: subData,
    });
  } catch (error) {
    console.error("Error checking resume access:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Save a resume
router.post("/save-resume", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, resumeData } = req.body;

    if (!uid || !resumeData) {
      return res.status(400).json({ message: "User ID and resume data are required" });
    }

    // Validate required fields
    if (!resumeData.fullName || !resumeData.email) {
      return res.status(400).json({ message: "Full name and email are required" });
    }

    const resumeRecord = {
      uid,
      ...resumeData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("resumes").add(resumeRecord);

    // Update user profile to reference the newly saved resume as default
    await db.collection("users").doc(uid).update({
      hasResume: true,
      resumeId: docRef.id,
      resumeName: resumeRecord.resumeName || resumeRecord.fullName || "Resume",
      latestResumeId: docRef.id,
      resumeUpdatedAt: new Date(),
    });

    res.status(201).json({
      message: "Resume saved successfully",
      resumeId: docRef.id,
    });
  } catch (error) {
    console.error("Error saving resume:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete a resume
router.delete("/delete-resume/:uid/:resumeId", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, resumeId } = req.params;

    if (!uid || !resumeId) {
      return res.status(400).json({ message: "User ID and Resume ID are required" });
    }

    // Verify ownership
    const resumeDoc = await db.collection("resumes").doc(resumeId).get();
    if (!resumeDoc.exists) {
      return res.status(404).json({ message: "Resume not found" });
    }

    if (resumeDoc.data().uid !== uid) {
      return res.status(403).json({ message: "Unauthorized to delete this resume" });
    }

    await db.collection("resumes").doc(resumeId).delete();

    // If this was the user's default resume, clear it
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists && userDoc.data().resumeId === resumeId) {
      await db.collection("users").doc(uid).update({
        resumeId: admin.firestore.FieldValue.delete(),
        resumeName: admin.firestore.FieldValue.delete(),
      });
    }

    res.status(200).json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Error deleting resume:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Set default resume for a user
router.post("/set-default-resume", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, resumeId } = req.body;

    if (!uid || !resumeId) {
      return res.status(400).json({ message: "User ID and Resume ID are required" });
    }

    // Verify the resume exists and belongs to the user
    const resumeDoc = await db.collection("resumes").doc(resumeId).get();
    if (!resumeDoc.exists) {
      return res.status(404).json({ message: "Resume not found" });
    }

    if (resumeDoc.data().uid !== uid) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const resumeData = resumeDoc.data();
    const resumeName = resumeData.resumeName || resumeData.fullName || "Resume";

    await db.collection("users").doc(uid).update({
      resumeId,
      resumeName,
      hasResume: true,
      resumeUpdatedAt: new Date(),
    });

    res.status(200).json({ message: "Default resume updated successfully" });
  } catch (error) {
    console.error("Error setting default resume:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send resume confirmation email
router.post("/send-confirmation", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, resumeId } = req.body;

    if (!uid || !resumeId) {
      return res.status(400).json({ message: "User ID and Resume ID are required" });
    }

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();

    if (userData.email) {
      const msg = {
        to: userData.email,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@internshala.com",
        subject: "Resume Created Successfully! 🎉",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Resume Created Successfully!</h2>
            <p>Hi ${userData.name || "User"},</p>
            <p>Your professional resume has been created and saved to your profile.</p>
            <p>You can download your resume anytime from your profile page.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              - Internshala Team
            </p>
          </div>
        `,
      };

      await sgMail.send(msg);
    }

    res.status(200).json({ message: "Confirmation email sent" });
  } catch (error) {
    console.error("Error sending confirmation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Request OTP for resume creation
router.post("/request-otp", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "UID is required" });
    }

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();

    // Anyone can request OTP to pay ₹50

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await db.collection("resume_otps").doc(uid).set({
      otp,
      expiresAt: otpExpiry,
      createdAt: new Date(),
      verified: false,
    });

    // Send OTP email
    await sendOTPEmail(userData.email, otp, userData.name || "User");

    res.status(200).json({
      message: "OTP sent to your registered email",
      expiresIn: "10 minutes",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, otp } = req.body;

    if (!uid || !otp) {
      return res.status(400).json({ message: "UID and OTP are required" });
    }

    const otpDoc = await db.collection("resume_otps").doc(uid).get();

    if (!otpDoc.exists) {
      return res
        .status(400)
        .json({ message: "No OTP found. Please request a new one." });
    }

    const otpData = otpDoc.data();

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt.toDate()) {
      await db.collection("resume_otps").doc(uid).delete();
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res
        .status(400)
        .json({ message: "Invalid OTP. Please try again." });
    }

    // Mark as verified
    await db.collection("resume_otps").doc(uid).update({
      verified: true,
      verifiedAt: new Date(),
    });

    res.status(200).json({
      message: "OTP verified successfully. You can now proceed with payment.",
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create Razorpay order for resume
router.post("/create-resume-order", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "UID is required" });
    }

    // Check if OTP is verified
    const otpDoc = await db.collection("resume_otps").doc(uid).get();

    if (!otpDoc.exists || !otpDoc.data().verified) {
      return res.status(403).json({
        message: "Please verify OTP before creating payment order.",
        requiresOTP: true,
      });
    }

    // Create Razorpay order
    const options = {
      amount: RESUME_PRICE * 100, // Amount in paise
      currency: "INR",
      receipt: `res_${uid.slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        uid,
        type: "resume_creation",
      },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      price: RESUME_PRICE,
    });
  } catch (error) {
    console.error("Error creating resume order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify payment and unlock resume creation
router.post("/verify-resume-payment", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (
      !uid ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();

    // Store payment record
    const paymentRecord = {
      uid,
      type: "resume_creation",
      amount: RESUME_PRICE,
      currency: "INR",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: "completed",
      timestamp: new Date(),
    };

    await db.collection("payments").add(paymentRecord);

    // Mark user as having paid for resume creation
    await db.collection("users").doc(uid).update({
      hasPaidForResume: true,
    });

    // Clean up OTP
    try {
      await db.collection("resume_otps").doc(uid).delete();
    } catch (e) {
      // Ignore cleanup errors
    }

    // Send payment success email
    if (userData && userData.email) {
      try {
        await sendPaymentSuccessEmail(userData.email, userData.name || "User", paymentRecord);
      } catch (emailError) {
        console.error("Failed to send payment success email:", emailError);
      }
    }

    res.status(200).json({
      message: "Payment verified successfully. Resume creation unlocked!",
      payment: paymentRecord,
      canCreateResume: true,
    });
  } catch (error) {
    console.error("Error verifying resume payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Rename a resume
router.put("/rename-resume/:uid/:resumeId", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, resumeId } = req.params;
    const { resumeName } = req.body;

    if (!resumeName || !resumeName.trim()) {
      return res.status(400).json({ message: "Resume name is required" });
    }

    const resumeDoc = await db.collection("resumes").doc(resumeId).get();
    if (!resumeDoc.exists || resumeDoc.data().uid !== uid) {
      return res
        .status(404)
        .json({ message: "Resume not found or unauthorized" });
    }

    await db.collection("resumes").doc(resumeId).update({
      resumeName: resumeName.trim(),
      updatedAt: new Date(),
    });

    // Sync the new name to the user profile if this is their default resume
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists && userDoc.data().resumeId === resumeId) {
      await db.collection("users").doc(uid).update({
        resumeName: resumeName.trim(),
      });
    }

    res.status(200).json({ message: "Resume renamed successfully" });
  } catch (error) {
    console.error("Error renaming resume:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
