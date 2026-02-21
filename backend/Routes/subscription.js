const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

let db;

// Define subscription plans as per task requirements
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    currency: "INR",
    duration: null, // Lifetime
    applicationLimit: 1, // 1 internship per month
    features: [
      "Apply for 1 internship per month",
      "Browse all internships and jobs",
      "Public space access",
      "Basic profile",
    ],
  },
  bronze: {
    name: "Bronze",
    price: 100,
    currency: "INR",
    duration: 30, // Days (monthly)
    applicationLimit: 3, // 3 internships per month
    features: [
      "Apply for 3 internships per month",
      "All Free features",
      "Resume builder access (₹50 per resume)",
      "Email support",
      "Profile customization",
    ],
  },
  silver: {
    name: "Silver",
    price: 300,
    currency: "INR",
    duration: 30, // Days (monthly)
    applicationLimit: 5, // 5 internships per month
    features: [
      "Apply for 5 internships per month",
      "All Bronze features",
      "Priority support",
      "Interview tips",
      "Application tracking",
    ],
  },
  gold: {
    name: "Gold",
    price: 1000,
    currency: "INR",
    duration: 30, // Days (monthly)
    applicationLimit: -1, // Unlimited
    features: [
      "Unlimited internship applications",
      "All Silver features",
      "Dedicated career coach",
      "Mock interviews",
      "Premium resources",
      "Priority job alerts",
    ],
  },
};

// Get available plans
router.get("/plans", async (req, res) => {
  try {
    db = admin.firestore();

    const plansArray = Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
    }));

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

    // If user doesn't exist, create with free plan
    if (!userDoc.exists) {
      const freeSubscription = {
        planId: "free",
        status: "active",
        startedAt: new Date(),
        expiresAt: null,
      };

      await db.collection("users").doc(uid).set({
        uid,
        subscription: freeSubscription,
        createdAt: new Date(),
      });

      return res.status(200).json({
        ...freeSubscription,
        planDetails: PLANS["free"],
      });
    }

    const userData = userDoc.data();
    const subscription = userData.subscription || {
      planId: "free",
      status: "active",
      startedAt: new Date(),
      expiresAt: null,
    };

    // Check if subscription has expired
    if (
      subscription.planId !== "free" &&
      subscription.expiresAt &&
      new Date() > subscription.expiresAt.toDate()
    ) {
      // Downgrade to free plan
      await db
        .collection("users")
        .doc(uid)
        .update({
          "subscription.planId": "free",
          "subscription.status": "expired",
          "subscription.expiredAt": new Date(),
        });

      return res.status(200).json({
        planId: "free",
        status: "expired",
        message: "Subscription expired. Downgraded to free plan.",
        planDetails: PLANS["free"],
      });
    }

    res.status(200).json({
      ...subscription,
      planDetails: PLANS[subscription.planId || "free"],
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create subscription (Simulate payment)
router.post("/subscribe", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid, planId, paymentToken } = req.body;

    if (!uid || !planId) {
      return res.status(400).json({ message: "UID and plan ID are required" });
    }

    if (!PLANS[planId]) {
      return res.status(400).json({ message: "Invalid plan ID" });
    }

    // Simulate payment processing
    if (PLANS[planId].price > 0 && !paymentToken) {
      return res.status(400).json({
        message: "Payment token required for paid plans",
      });
    }

    // Here you would process the payment through Stripe/PayPal
    // For now, we'll simulate successful payment
    const paymentRecord = {
      id: uuidv4(),
      transactionId: uuidv4(),
      planId,
      amount: PLANS[planId].price,
      currency: PLANS[planId].currency,
      status: "completed",
      timestamp: new Date(),
    };

    const subscriptionData = {
      planId,
      status: "active",
      startedAt: new Date(),
      expiresAt: PLANS[planId].duration
        ? new Date(Date.now() + PLANS[planId].duration * 24 * 60 * 60 * 1000)
        : null,
      lastPayment: paymentRecord,
    };

    // Update user subscription
    await db.collection("users").doc(uid).set(
      {
        uid,
        subscription: subscriptionData,
      },
      { merge: true }
    );

    // Store payment record
    await db
      .collection("payments")
      .doc(paymentRecord.id)
      .set(paymentRecord);

    res.status(200).json({
      message: "Subscription activated successfully",
      subscription: {
        ...subscriptionData,
        planDetails: PLANS[planId],
      },
      payment: paymentRecord,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Cancel subscription
router.post("/cancel-subscription/:uid", async (req, res) => {
  try {
    db = admin.firestore();
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();

    if (userData.subscription?.planId === "free") {
      return res.status(400).json({
        message: "Cannot cancel free plan",
      });
    }

    // Downgrade to free plan
    await db
      .collection("users")
      .doc(uid)
      .update({
        "subscription.planId": "free",
        "subscription.status": "cancelled",
        "subscription.cancelledAt": new Date(),
        "subscription.expiresAt": new Date(), // Immediate downgrade
      });

    res.status(200).json({
      message: "Subscription cancelled successfully",
      planId: "free",
    });
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

    const payments = await db
      .collection("payments")
      .where("uid", "==", uid)
      .limit(50)
      .get();

    const paymentHistory = payments.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((a, b) => {
      // Sort by timestamp in descending order (newest first)
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return dateB - dateA;
    });

    res.status(200).json({
      paymentHistory,
      totalCount: paymentHistory.length,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
