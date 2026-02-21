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

// Define subscription plans as per requirements
const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free Plan",
    price: 0,
    currency: "INR",
    internshipLimit: 1,
    duration: 30, // days
    features: ["Apply to 1 internship per month", "Basic profile access"],
  },
  bronze: {
    name: "Bronze Plan",
    price: 100,
    currency: "INR",
    internshipLimit: 3,
    duration: 30,
    features: [
      "Apply to 3 internships per month",
      "Priority support",
      "Profile customization",
    ],
  },
  silver: {
    name: "Silver Plan",
    price: 300,
    currency: "INR",
    internshipLimit: 5,
    duration: 30,
    features: [
      "Apply to 5 internships per month",
      "Priority support",
      "Extended profile features",
      "Application tracking",
    ],
  },
  gold: {
    name: "Gold Plan",
    price: 1000,
    currency: "INR",
    internshipLimit: -1, // Unlimited
    duration: 30,
    features: [
      "Unlimited internship applications",
      "Premium support",
      "All features included",
      "Resume builder access",
      "Mock interviews",
    ],
  },
};

// Check if current time is within payment window (10:00 AM - 11:00 AM IST)
function isPaymentTimeAllowed() {
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const hour = istTime.getHours();
  return hour >= 10 && hour < 11;
}

// Get all plans
router.get("/plans", async (req, res) => {
  try {
    const plansArray = Object.entries(SUBSCRIPTION_PLANS).map(
      ([key, plan]) => ({
        id: key,
        ...plan,
      })
    );

    res.status(200).json({ plans: plansArray });
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's current subscription
router.get("/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      const freeSubscription = {
        planId: "free",
        status: "active",
        startedAt: new Date(),
        expiresAt: null,
        applicationsUsed: 0,
        applicationsLimit: 1,
      };

      await db
        .collection("users")
        .doc(uid)
        .set(
          {
            subscription: freeSubscription,
          },
          { merge: true }
        );

      return res.status(200).json({
        ...freeSubscription,
        planDetails: SUBSCRIPTION_PLANS["free"],
      });
    }

    const userData = userDoc.data();
    const subscription = userData.subscription || {
      planId: "free",
      status: "active",
      startedAt: new Date(),
      expiresAt: null,
      applicationsUsed: 0,
      applicationsLimit: 1,
    };

    // Check if subscription has expired
    if (
      subscription.planId !== "free" &&
      subscription.expiresAt &&
      new Date() > subscription.expiresAt.toDate()
    ) {
      await db
        .collection("users")
        .doc(uid)
        .update({
          "subscription.planId": "free",
          "subscription.status": "expired",
          "subscription.applicationsLimit": 1,
          "subscription.applicationsUsed": 0,
          "subscription.expiredAt": new Date(),
        });

      return res.status(200).json({
        planId: "free",
        status: "expired",
        applicationsUsed: 0,
        applicationsLimit: 1,
        message: "Subscription expired. Downgraded to free plan.",
        planDetails: SUBSCRIPTION_PLANS["free"],
      });
    }

    res.status(200).json({
      ...subscription,
      planDetails: SUBSCRIPTION_PLANS[subscription.planId || "free"],
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create Razorpay order
router.post("/create-order", async (req, res) => {
  try {
    const { uid, planId } = req.body;

    if (!uid || !planId) {
      return res.status(400).json({ message: "UID and plan ID are required" });
    }

    if (!SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ message: "Invalid plan ID" });
    }

    // Check payment time window (10 AM - 11 AM IST)
    if (!isPaymentTimeAllowed()) {
      return res.status(403).json({
        message:
          "Payments are only allowed between 10:00 AM and 11:00 AM IST. Please try again during this time window.",
        paymentWindowStart: "10:00 AM IST",
        paymentWindowEnd: "11:00 AM IST",
      });
    }

    const plan = SUBSCRIPTION_PLANS[planId];

    if (plan.price === 0) {
      return res
        .status(400)
        .json({ message: "Cannot create order for free plan" });
    }

    // Create Razorpay order
    const options = {
      amount: plan.price * 100, // Amount in paise
      currency: plan.currency,
      receipt: `sub_${uid}_${Date.now()}`,
      notes: {
        uid,
        planId,
        planName: plan.name,
      },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planDetails: plan,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify payment and activate subscription
router.post("/verify-payment", async (req, res) => {
  try {
    db = admin.firestore();
    const {
      uid,
      planId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !uid ||
      !planId ||
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

    const plan = SUBSCRIPTION_PLANS[planId];
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();

    // Update subscription
    const subscriptionData = {
      planId,
      status: "active",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
      applicationsUsed: 0,
      applicationsLimit: plan.internshipLimit,
      lastPaymentId: razorpay_payment_id,
      lastOrderId: razorpay_order_id,
    };

    await db
      .collection("users")
      .doc(uid)
      .update({
        subscription: subscriptionData,
      });

    // Store payment record
    const paymentRecord = {
      uid,
      planId,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: "completed",
      timestamp: new Date(),
    };

    await db.collection("payments").add(paymentRecord);

    // Send invoice email
    try {
      await sendInvoiceEmail(
        userData.email,
        userData.name || "User",
        paymentRecord,
        subscriptionData
      );
    } catch (emailError) {
      console.error("Error sending invoice email:", emailError);
      // Don't fail the payment if email fails
    }

    res.status(200).json({
      message: "Payment verified and subscription activated",
      subscription: {
        ...subscriptionData,
        planDetails: plan,
      },
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send invoice email
async function sendInvoiceEmail(email, name, payment, subscription) {
  const msg = {
    to: email,
    from: process.env.DEFAULT_FROM_EMAIL,
    subject: `Payment Invoice - ${payment.planName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: white; padding: 30px; border-radius: 8px;">
          <h1 style="color: #007bff; text-align: center; margin-bottom: 30px;">Payment Successful!</h1>
          
          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Invoice Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #666;">Transaction ID:</td>
                <td style="padding: 10px 0; color: #333; font-weight: bold;">${payment.razorpay_payment_id}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Order ID:</td>
                <td style="padding: 10px 0; color: #333; font-weight: bold;">${payment.razorpay_order_id}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Plan:</td>
                <td style="padding: 10px 0; color: #333; font-weight: bold;">${payment.planName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Amount Paid:</td>
                <td style="padding: 10px 0; color: #007bff; font-weight: bold; font-size: 18px;">₹${payment.amount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Date:</td>
                <td style="padding: 10px 0; color: #333;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Subscription Details</h3>
            <p style="color: #666; margin: 5px 0;">Status: <span style="color: #28a745; font-weight: bold;">Active</span></p>
            <p style="color: #666; margin: 5px 0;">Valid Until: <strong>${subscription.expiresAt.toDate ? subscription.expiresAt.toDate().toLocaleDateString('en-IN') : new Date(subscription.expiresAt).toLocaleDateString('en-IN')}</strong></p>
            <p style="color: #666; margin: 5px 0;">Internship Applications: <strong>${subscription.applicationsLimit === -1 ? 'Unlimited' : subscription.applicationsLimit} per month</strong></p>
          </div>

          <p style="color: #666; text-align: center; margin: 20px 0;">Thank you for your purchase! If you have any questions, please contact our support team.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.SITE_URL}/subscription" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Subscription</a>
          </div>
        </div>
      </div>
    `,
  };

  await sgMail.send(msg);
}

// Check if user can apply to internship
router.post("/can-apply", async (req, res) => {
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
    const subscription = userData.subscription || {
      planId: "free",
      applicationsUsed: 0,
      applicationsLimit: 1,
    };

    // Gold plan has unlimited applications
    if (subscription.applicationsLimit === -1) {
      return res.status(200).json({
        canApply: true,
        applicationsUsed: subscription.applicationsUsed || 0,
        applicationsLimit: "Unlimited",
        planId: subscription.planId,
      });
    }

    // Check if user has reached limit
    const canApply =
      (subscription.applicationsUsed || 0) < subscription.applicationsLimit;

    res.status(200).json({
      canApply,
      applicationsUsed: subscription.applicationsUsed || 0,
      applicationsLimit: subscription.applicationsLimit,
      planId: subscription.planId,
    });
  } catch (error) {
    console.error("Error checking application limit:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Increment application count
router.post("/increment-application", async (req, res) => {
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
    const subscription = userData.subscription || {
      applicationsUsed: 0,
      applicationsLimit: 1,
    };

    // Don't increment for unlimited plans
    if (subscription.applicationsLimit === -1) {
      return res.status(200).json({
        message: "Application counted (unlimited plan)",
        applicationsUsed: subscription.applicationsUsed || 0,
        applicationsLimit: "Unlimited",
      });
    }

    const newCount = (subscription.applicationsUsed || 0) + 1;

    await db
      .collection("users")
      .doc(uid)
      .update({
        "subscription.applicationsUsed": newCount,
      });

    res.status(200).json({
      message: "Application count incremented",
      applicationsUsed: newCount,
      applicationsLimit: subscription.applicationsLimit,
    });
  } catch (error) {
    console.error("Error incrementing application:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Cancel subscription
router.post("/cancel/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    await db
      .collection("users")
      .doc(uid)
      .update({
        "subscription.planId": "free",
        "subscription.status": "cancelled",
        "subscription.applicationsLimit": 1,
        "subscription.applicationsUsed": 0,
        "subscription.cancelledAt": new Date(),
      });

    res.status(200).json({ message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get payment history
router.get("/payments/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    const paymentsSnapshot = await db
      .collection("payments")
      .where("uid", "==", uid)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const payments = paymentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      payments,
      totalCount: payments.length,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
