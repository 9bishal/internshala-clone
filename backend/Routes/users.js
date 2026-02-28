const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// POST create a new user
router.post("/", async (req, res) => {
  try {
    const db = admin.firestore();
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email, and password are required",
        });
    }

    // Create in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // Save profile in Firestore
    const userData = {
      uid,
      name,
      email,
      photo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      subscription: {
        planId: "free",
        status: "active",
        startedAt: new Date(),
        expiresAt: null,
      },
    };

    await db.collection("users").doc(uid).set(userData);

    res
      .status(201)
      .json({
        success: true,
        message: "User created successfully",
        user: userData,
      });
  } catch (error) {
    console.error("Error creating user:", error);
    // Firebase Auth errors have a code property
    const message =
      error.code === "auth/email-already-exists"
        ? "Email already in use"
        : error.message || "Server error";
    res.status(400).json({ success: false, message });
  }
});

// GET all users
router.get("/", async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .get();
    const users = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error fetching all users:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// GET a single user by UID
router.get("/:uid", async (req, res) => {
  try {
    const db = admin.firestore();
    const { uid } = req.params;
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res
      .status(200)
      .json({ success: true, user: { id: userDoc.id, ...userDoc.data() } });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// PUT update a user by UID (name, email, photo)
router.put("/:uid", async (req, res) => {
  try {
    const db = admin.firestore();
    const { uid } = req.params;
    const { name, email, photo } = req.body;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updates = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (photo !== undefined) updates.photo = photo;

    await userRef.update(updates);

    // Also update Firebase Auth email if changed
    if (email) {
      try {
        await admin.auth().updateUser(uid, { email, displayName: name });
      } catch (authErr) {
        console.warn("Could not update Firebase Auth:", authErr.message);
      }
    }

    res
      .status(200)
      .json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// DELETE a user by UID (removes from Firestore + Firebase Auth)
router.delete("/:uid", async (req, res) => {
  try {
    const db = admin.firestore();
    const { uid } = req.params;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Delete from Firestore
    await userRef.delete();

    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(uid);
    } catch (authErr) {
      console.warn("Could not delete from Firebase Auth:", authErr.message);
    }

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
