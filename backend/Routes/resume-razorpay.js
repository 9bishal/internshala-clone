const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

// Log configuration on module load
console.log('🚀 [Resume-Razorpay] Module loaded');
console.log('📧 [Resume-Razorpay] SendGrid API Key configured:', process.env.SENDGRID_API_KEY ? 'Yes ✅' : 'No ❌');
console.log('📧 [Resume-Razorpay] Default From Email:', process.env.DEFAULT_FROM_EMAIL || 'Not configured ❌');
console.log('💳 [Resume-Razorpay] Razorpay Key ID:', process.env.RAZORPAY_KEY_ID ? 'Yes ✅' : 'No ❌');
console.log('🔐 [Resume-Razorpay] Razorpay Key Secret:', process.env.RAZORPAY_KEY_SECRET ? 'Yes ✅' : 'No ❌');
console.log('🌐 [Resume-Razorpay] Site URL:', process.env.SITE_URL || 'Not configured');

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
  console.log(`📧 [OTP Email] Preparing to send OTP to: ${email}`);
  console.log(`📧 [OTP Email] Recipient name: ${name}`);
  console.log(`📧 [OTP Email] OTP: ${otp}`);
  console.log(`📧 [OTP Email] From email: ${process.env.DEFAULT_FROM_EMAIL}`);
  console.log(`📧 [OTP Email] SendGrid API key configured: ${process.env.SENDGRID_API_KEY ? 'Yes' : 'No'}`);

  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ [OTP Email] SendGrid API key not configured!');
    throw new Error('SendGrid API key not configured');
  }

  if (!process.env.DEFAULT_FROM_EMAIL) {
    console.error('❌ [OTP Email] DEFAULT_FROM_EMAIL not configured!');
    throw new Error('DEFAULT_FROM_EMAIL not configured');
  }

  if (!email) {
    console.error('❌ [OTP Email] Recipient email is empty!');
    throw new Error('Recipient email is required');
  }

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

  console.log(`📧 [OTP Email] Sending email via SendGrid...`);
  
  try {
    const result = await sgMail.send(msg);
    console.log(`✅ [OTP Email] Email sent successfully!`);
    console.log(`✅ [OTP Email] SendGrid response status: ${result[0]?.statusCode}`);
    return result;
  } catch (error) {
    console.error('❌ [OTP Email] Failed to send email:', error);
    if (error.response) {
      console.error('❌ [OTP Email] SendGrid error response:', error.response.body);
    }
    throw error;
  }
}

// Request OTP for resume creation
router.post("/request-otp", async (req, res) => {
  try {
    console.log('🔐 [Request OTP] Starting OTP request process...');
    db = admin.firestore();
    const { uid } = req.body;

    console.log(`🔐 [Request OTP] UID: ${uid}`);

    if (!uid) {
      console.warn('⚠️ [Request OTP] No UID provided');
      return res.status(400).json({ message: "UID is required" });
    }

    console.log(`🔐 [Request OTP] Fetching user document for UID: ${uid}`);
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      console.warn(`⚠️ [Request OTP] User not found: ${uid}`);
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();
    console.log(`✅ [Request OTP] User found: ${userData.name || userData.email}`);
    console.log(`📧 [Request OTP] User email: ${userData.email}`);
    console.log(`📦 [Request OTP] User subscription plan: ${userData.subscription?.planId || 'none'}`);

    if (!userData.email) {
      console.error('❌ [Request OTP] User has no email address!');
      return res.status(400).json({ 
        message: "User email not found. Please update your profile with a valid email address.",
        missingEmail: true
      });
    }

    // Check if user has premium subscription
    const subscription = userData.subscription || {};
    const hasPremium = ["bronze", "silver", "gold"].includes(
      subscription.planId
    );

    console.log(`🔒 [Request OTP] Has premium: ${hasPremium}`);

    if (!hasPremium) {
      console.warn(`⚠️ [Request OTP] User ${uid} does not have premium subscription`);
      return res.status(403).json({
        message:
          "Resume creation is only available for premium plan subscribers (Bronze, Silver, or Gold).",
        requiresPremium: true,
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`🔢 [Request OTP] Generated OTP: ${otp}`);
    console.log(`⏰ [Request OTP] OTP expires at: ${otpExpiry.toISOString()}`);

    // Store OTP in database
    console.log(`💾 [Request OTP] Storing OTP in Firestore...`);
    await db
      .collection("resume_otps")
      .doc(uid)
      .set({
        otp,
        expiresAt: otpExpiry,
        createdAt: new Date(),
        verified: false,
      });

    console.log(`✅ [Request OTP] OTP stored in database`);

    // Send OTP email
    console.log(`📧 [Request OTP] Attempting to send OTP email...`);
    await sendOTPEmail(userData.email, otp, userData.name || "User");

    console.log(`✅ [Request OTP] OTP process completed successfully`);
    res.status(200).json({
      message: "OTP sent to your registered email",
      expiresIn: "10 minutes",
    });
  } catch (error) {
    console.error("❌ [Request OTP] Error:", error);
    console.error("❌ [Request OTP] Error stack:", error.stack);
    
    // Provide more specific error messages
    let errorMessage = "Failed to send OTP";
    if (error.message?.includes('SendGrid')) {
      errorMessage = "Email service error. Please contact support.";
    } else if (error.message?.includes('email')) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    console.log('🔐 [Verify OTP] Starting OTP verification...');
    db = admin.firestore();
    const { uid, otp } = req.body;

    console.log(`🔐 [Verify OTP] UID: ${uid}`);
    console.log(`🔐 [Verify OTP] OTP received: ${otp}`);

    if (!uid || !otp) {
      console.warn('⚠️ [Verify OTP] Missing UID or OTP');
      return res.status(400).json({ message: "UID and OTP are required" });
    }

    console.log(`🔐 [Verify OTP] Fetching OTP document from Firestore...`);
    const otpDoc = await db.collection("resume_otps").doc(uid).get();

    if (!otpDoc.exists) {
      console.warn(`⚠️ [Verify OTP] No OTP found for UID: ${uid}`);
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    const otpData = otpDoc.data();
    console.log(`✅ [Verify OTP] OTP document found`);
    console.log(`🔐 [Verify OTP] Stored OTP: ${otpData.otp}`);
    console.log(`⏰ [Verify OTP] Expires at: ${otpData.expiresAt.toDate().toISOString()}`);
    console.log(`⏰ [Verify OTP] Current time: ${new Date().toISOString()}`);

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt.toDate()) {
      console.warn(`⚠️ [Verify OTP] OTP expired for UID: ${uid}`);
      await db.collection("resume_otps").doc(uid).delete();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      console.warn(`⚠️ [Verify OTP] Invalid OTP. Expected: ${otpData.otp}, Got: ${otp}`);
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    console.log(`✅ [Verify OTP] OTP verified successfully`);

    // Mark as verified
    await db.collection("resume_otps").doc(uid).update({
      verified: true,
      verifiedAt: new Date(),
    });

    console.log(`✅ [Verify OTP] OTP marked as verified in database`);

    res.status(200).json({
      message: "OTP verified successfully. You can now proceed with payment.",
      verified: true,
    });
  } catch (error) {
    console.error("❌ [Verify OTP] Error:", error);
    console.error("❌ [Verify OTP] Error stack:", error.stack);
    res.status(500).json({ 
      message: "Failed to verify OTP",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Get user's resume
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

// Razorpay Webhook for payment verification
router.post("/webhook", async (req, res) => {
  try {
    db = admin.firestore();
    
    // Verify webhook signature
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (expectedSignature !== webhookSignature) {
        console.error("Invalid webhook signature");
        return res.status(400).json({ message: "Invalid signature" });
      }
    }

    const event = req.body;

    // Handle payment.captured event
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const amount = payment.amount / 100; // Convert from paise to rupees

      // Find the user from order notes
      const orderData = await razorpay.orders.fetch(orderId);
      const uid = orderData.notes?.uid;

      if (!uid) {
        console.error("No UID found in order notes");
        return res.status(400).json({ message: "No UID in order" });
      }

      // Store payment record
      const paymentRecord = {
        uid,
        type: "resume_creation",
        amount,
        currency: payment.currency,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        status: payment.status,
        method: payment.method,
        timestamp: new Date(),
        webhookEvent: event.event,
      };

      await db.collection("payments").add(paymentRecord);

      // Send confirmation email
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        await sendPaymentConfirmationEmail(userData.email, paymentRecord, userData.name);
      }

      console.log(`Payment captured for UID: ${uid}, Amount: ₹${amount}`);
    }

    // Handle payment.failed event
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      console.log("Payment failed:", payment);

      // Store failed payment record
      const paymentRecord = {
        type: "resume_creation_failed",
        amount: payment.amount / 100,
        currency: payment.currency,
        razorpay_payment_id: payment.id,
        status: "failed",
        error: payment.error_description,
        timestamp: new Date(),
      };

      await db.collection("failed_payments").add(paymentRecord);
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

// Send payment confirmation email
async function sendPaymentConfirmationEmail(email, payment, name) {
  const msg = {
    to: email,
    from: process.env.DEFAULT_FROM_EMAIL,
    subject: "Resume Creation Payment Receipt - Internshala",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; margin-bottom: 20px;">Payment Successful!</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Hi ${name},<br><br>
            Your payment for resume creation has been successfully processed.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Amount Paid:</td>
                <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">₹${payment.amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Payment ID:</td>
                <td style="padding: 8px 0; color: #333; text-align: right; font-size: 12px;">${payment.razorpay_payment_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Order ID:</td>
                <td style="padding: 8px 0; color: #333; text-align: right; font-size: 12px;">${payment.razorpay_order_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Date:</td>
                <td style="padding: 8px 0; color: #333; text-align: right;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            </table>
          </div>

          <p style="color: #666; font-size: 16px; margin: 20px 0;">
            You can now create your professional resume. Your resume will be saved to your profile.
          </p>

          <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <p style="color: #1976d2; margin: 0; font-size: 14px;">
              <strong>Note:</strong> This receipt serves as your payment confirmation. Please keep it for your records.
            </p>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    `,
  };

  await sgMail.send(msg);
}

module.exports = router;
