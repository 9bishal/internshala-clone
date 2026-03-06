const admin = require("firebase-admin");
require("dotenv").config();

let firebaseApp;

module.exports.connect = () => {
  try {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      // Handle private key - works for both:
      // 1. Local .env files where \n is literal text "\\n"
      // 2. Render/production where newlines are real
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey) {
        // Replace literal \n strings with real newlines (for .env files)
        privateKey = privateKey.replace(/\\n/g, "\n");
        // Remove surrounding quotes if present
        privateKey = privateKey.replace(/^["']|["']$/g, "");
      }

      // Debug: Log key info (safe - only shows first/last chars)
      console.log("🔑 Firebase Key Debug:");
      console.log(
        "  - PROJECT_ID:",
        process.env.FIREBASE_PROJECT_ID || "MISSING",
      );
      console.log(
        "  - CLIENT_EMAIL:",
        process.env.FIREBASE_CLIENT_EMAIL || "MISSING",
      );
      console.log(
        "  - PRIVATE_KEY_ID:",
        process.env.FIREBASE_PRIVATE_KEY_ID ? "Set ✅" : "MISSING ❌",
      );
      console.log(
        "  - PRIVATE_KEY:",
        privateKey
          ? `Set ✅ (${privateKey.length} chars, starts with: ${privateKey.substring(0, 27)}...)`
          : "MISSING ❌",
      );
      console.log(
        "  - DATABASE_URL:",
        process.env.FIREBASE_DATABASE_URL || "MISSING",
      );

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: "https://accounts.google.com/o/oauth2/auth",
        tokenUri: "https://oauth2.googleapis.com/token",
        authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
        clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });

      firebaseApp = admin.app();
      console.log("✅ Firebase is connected");
    }
  } catch (err) {
    console.log("⚠️ Firebase connection error:", err.message);
  }
};

module.exports.db = () => admin.database();
module.exports.auth = () => admin.auth();
module.exports.storage = () => admin.storage();
module.exports.firestore = () => admin.firestore();
