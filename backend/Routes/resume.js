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
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
async function sendOTPEmail(email, otp, name) {
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

    // Check if user has premium subscription
    const subscription = userData.subscription || {};
    const hasPremium = ["bronze", "silver", "gold"].includes(
      subscription.planId
    );

    if (!hasPremium) {
      return res.status(403).json({
        message:
          "Resume creation is only available for premium plan subscribers (Bronze, Silver, or Gold).",
        requiresPremium: true,
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await db
      .collection("resume_otps")
      .doc(uid)
      .set({
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
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    const otpData = otpDoc.data();

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt.toDate()) {
      await db.collection("resume_otps").doc(uid).delete();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
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
      receipt: `resume_${uid}_${Date.now()}`,
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
    const {
      uid,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

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

    // Clean up OTP
    await db.collection("resume_otps").doc(uid).delete();

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

// Save resume data
router.post("/save-resume", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, resumeData } = req.body;

    if (!uid || !resumeData) {
      return res.status(400).json({ message: "UID and resume data are required" });
    }

    const resume = {
      uid,
      ...resumeData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const resumeRef = await db.collection("resumes").add(resume);

    // Attach to user profile
    await db
      .collection("users")
      .doc(uid)
      .update({
        resumeId: resumeRef.id,
        hasResume: true,
        resumeUpdatedAt: new Date(),
      });

    res.status(200).json({
      message: "Resume saved successfully",
      resumeId: resumeRef.id,
      resume,
    });
  } catch (error) {
    console.error("Error saving resume:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send confirmation email after resume creation
router.post("/send-confirmation", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, resumeId } = req.body;

    if (!uid || !resumeId) {
      return res.status(400).json({ message: "UID and resumeId are required" });
    }

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();

    const msg = {
      to: userData.email,
      from: process.env.DEFAULT_FROM_EMAIL,
      subject: "Resume Created Successfully - Internshala",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #333; margin-bottom: 20px;">Resume Created Successfully!</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              Hi ${userData.name || "User"},<br><br>
              Congratulations! Your resume has been created and saved successfully.
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; color: #333;">
                <strong>Resume ID:</strong> ${resumeId}
              </p>
            </div>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              Your resume is now attached to your profile and will be automatically included in your internship applications.
            </p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/resume" 
               style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View My Resumes
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              Thank you for using Internshala!
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);

    res.status(200).json({
      message: "Confirmation email sent successfully",
    });
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get available plans (must come before /:uid route)
router.get("/plans", async (req, res) => {
  try {
    const plans = [
      {
        id: "bronze",
        name: "Bronze",
        price: 99,
        features: [
          "Unlimited resume creation",
          "Basic templates",
          "PDF export",
          "Email support",
        ],
      },
      {
        id: "silver",
        name: "Silver",
        price: 199,
        features: [
          "Everything in Bronze",
          "Premium templates",
          "Priority support",
          "Cover letter builder",
        ],
      },
      {
        id: "gold",
        name: "Gold",
        price: 299,
        features: [
          "Everything in Silver",
          "AI-powered suggestions",
          "LinkedIn optimization",
          "Career coaching session",
        ],
      },
    ];

    res.status(200).json({ plans });
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's access level and resume creation rights
router.get("/access/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();
    const subscription = userData.subscription || {};
    
    // Check if user has premium subscription
    const hasPremium = ["bronze", "silver", "gold"].includes(
      subscription.planId
    );

    // Count user's resumes
    const resumesSnapshot = await db
      .collection("resumes")
      .where("uid", "==", uid)
      .get();

    const resumesCreated = resumesSnapshot.size;

    res.status(200).json({
      planId: subscription.planId || "free",
      accessLevel: hasPremium ? 1 : 0,
      maxResumes: hasPremium ? -1 : 0, // -1 = unlimited for premium
      resumesCreated,
      canCreateResume: hasPremium,
      planDetails: subscription,
    });
  } catch (error) {
    console.error("Error fetching access:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all user's resumes
router.get("/resumes/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    const resumesSnapshot = await db
      .collection("resumes")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const resumes = resumesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ resumes });
  } catch (error) {
    console.error("Error fetching resumes:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's resume by UID (must come AFTER specific routes)
router.get("/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();

    if (!userData.resumeId) {
      return res.status(404).json({ message: "No resume found for this user" });
    }

    const resumeDoc = await db.collection("resumes").doc(userData.resumeId).get();

    if (!resumeDoc.exists) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.status(200).json({
      resumeId: resumeDoc.id,
      ...resumeDoc.data(),
    });
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
