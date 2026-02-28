const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const adminuser = "admin";
const adminpass = "admin";

router.get("/stats", async (req, res) => {
  try {
    const db = admin.firestore();

    // Run parallel count queries using Firestore count()
    const [applicationsSnapshot, jobsSnapshot, internshipsSnapshot] =
      await Promise.all([
        db.collection("applications").count().get(),
        db.collection("jobs").count().get(),
        db.collection("internships").count().get(),
      ]);

    const totalApplications = applicationsSnapshot.data().count;
    const activeJobs = jobsSnapshot.data().count;
    const activeInternships = internshipsSnapshot.data().count;

    // Calculate a mock "conversion rate" based on total applications relative to total postings
    const totalPostings = activeJobs + activeInternships;
    const conversionRate =
      totalPostings > 0 ? (totalApplications / totalPostings).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        totalApplications,
        activeJobs,
        activeInternships,
        conversionRate,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats from Firestore:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/adminlogin", (req, res) => {
  const { username, password } = req.body;
  // Simple auth - update with proper Firebase auth later
  if (username === "admin" && password === "admin") {
    res.json({
      success: true,
      message: "Admin login successful",
      token: "admin-token-123",
    });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});
module.exports = router;
