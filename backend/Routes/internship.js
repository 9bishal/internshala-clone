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
    const internshipData = {
      title: req.body.title || "",
      company: req.body.company || "",
      location: req.body.location || "",
      category: req.body.category || "",
      aboutCompany: req.body.aboutCompany || "",
      aboutInternship: req.body.aboutInternship || "",
      whoCanApply: req.body.whoCanApply || "",
      perks: req.body.perks || "",
      numberOfOpening: req.body.numberOfOpening || 1,
      stipend: req.body.stipend || 0,
      startDate: req.body.startDate || "",
      additionalInfo: req.body.additionalInfo || "",
      postedBy: req.body.postedBy || null,
      createdAt: new Date(),
    };
    const docRef = await firestore().collection("internships").add(internshipData);
    const serializedData = serializeFirestoreData({ _id: docRef.id, ...internshipData });
    res.status(201).json(serializedData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create internship" });
  }
});

router.get("/", async (req, res) => {
  try {
    const snapshot = await firestore().collection("internships").get();
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
    const doc = await firestore().collection("internships").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "internship not found" });
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
