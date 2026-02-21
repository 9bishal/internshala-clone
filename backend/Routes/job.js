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
    console.log('📝 [Job] Creating new job...');
    console.log('📝 [Job] Request body:', req.body);
    
    const jobData = {
      title: req.body.title || "",
      company: req.body.company || "",
      location: req.body.location || "",
      Experience: req.body.Experience || "",
      category: req.body.category || "",
      aboutCompany: req.body.aboutCompany || "",
      aboutJob: req.body.aboutJob || "",
      whoCanApply: req.body.whoCanApply || "",
      perks: req.body.perks || "",
      AdditionalInfo: req.body.AdditionalInfo || "",
      CTC: req.body.CTC || "",
      StartDate: req.body.StartDate || req.body.startDate || "",
      numberOfOpening: req.body.numberOfOpening || 1,
      postedBy: req.body.postedBy || null,
      createdAt: new Date(),
    };
    
    console.log('📝 [Job] Job data prepared:', jobData);
    
    const db = firestore();
    console.log('📝 [Job] Firestore instance obtained');
    
    const docRef = await db.collection("jobs").add(jobData);
    console.log('✅ [Job] Job created with ID:', docRef.id);
    
    const serializedData = serializeFirestoreData({ _id: docRef.id, ...jobData });
    res.status(201).json(serializedData);
  } catch (error) {
    console.error('❌ [Job] Error creating job:', error);
    console.error('❌ [Job] Error message:', error.message);
    console.error('❌ [Job] Error stack:', error.stack);
    res.status(500).json({ 
      error: "Failed to create job",
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const snapshot = await firestore().collection("jobs").get();
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
    const doc = await firestore().collection("jobs").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Jobs not found" });
    }
    const docData = { _id: doc.id, ...doc.data() };
    const serializedData = serializeFirestoreData(docData);
    res.status(200).json(serializedData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
});

module.exports = router;