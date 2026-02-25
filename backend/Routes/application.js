const express = require("express");
const router = express.Router();
const { firestore } = require("../db");

// Helper function to serialize Firestore objects
const serializeFirestoreData = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  // Convert Firestore Timestamp to ISO string
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  
  // If it's an array, map through it
  if (Array.isArray(obj)) {
    return obj.map(item => serializeFirestoreData(item));
  }
  
  // If it's an object, recursively convert all properties
  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = serializeFirestoreData(obj[key]);
      }
    }
    return converted;
  }
  
  return obj;
};

router.post("/", async (req, res) => {
  try {
    const { user, Application } = req.body;
    
    // Get the job/internship to check who posted it
    let poster = null;
    let posting = null;
    
    // Try to get from jobs first
    const jobDoc = await firestore().collection("jobs").doc(Application).get();
    if (jobDoc.exists) {
      posting = jobDoc.data();
      poster = posting.postedBy;
    } else {
      // Try internships
      const internshipDoc = await firestore().collection("internships").doc(Application).get();
      if (internshipDoc.exists) {
        posting = internshipDoc.data();
        poster = posting.postedBy;
      }
    }
    
    // Prevent self-applications
    if (poster && user && poster.uid === user.uid) {
      return res.status(403).json({ 
        error: "You cannot apply to your own posting",
        message: "Users cannot submit applications for jobs/internships they posted"
      });
    }

    // Prevent duplicate applications
    const existingApplication = await firestore()
      .collection("applications")
      .where("Application", "==", Application)
      .where("user.uid", "==", user.uid)
      .get();

    if (!existingApplication.empty) {
      return res.status(409).json({
        error: "You have already applied for this role."
      });
    }
    
    const applicationData = {
      company: req.body.company,
      category: req.body.category,
      coverLetter: req.body.coverLetter,
      user: req.body.user,
      Application: req.body.Application,
      availability: req.body.availability,
      status: "pending",
      createdAt: new Date(),
    };
    const docRef = await firestore().collection("applications").add(applicationData);
    const serializedData = serializeFirestoreData({ _id: docRef.id, ...applicationData });
    res.status(201).json(serializedData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create application" });
  }
});

router.get("/", async (req, res) => {
  try {
    const snapshot = await firestore().collection("applications").get();
    const data = snapshot.docs.map(doc => {
      const docData = { _id: doc.id, ...doc.data() };
      return serializeFirestoreData(docData);
    });
    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await firestore().collection("applications").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "application not found" });
    }
    const docData = { _id: doc.id, ...doc.data() };
    const serializedData = serializeFirestoreData(docData);
    res.status(200).json(serializedData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  let status;
  if (action === "accepted") {
    status = "accepted";
  } else if (action === "rejected") {
    status = "rejected";
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }
  try {
    await firestore().collection("applications").doc(id).update({ status });
    const doc = await firestore().collection("applications").doc(id).get();
    const docData = { _id: doc.id, ...doc.data() };
    const serializedData = serializeFirestoreData(docData);
    res.status(200).json({ success: true, data: serializedData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
});

module.exports = router;
