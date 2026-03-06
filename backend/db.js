const admin = require("firebase-admin");
require("dotenv").config();

let firebaseApp;

module.exports.connect = () => {
  try {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      let serviceAccount;

      // Method 1: Base64-encoded full service account JSON (most reliable for cloud)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        console.log("🔑 Using FIREBASE_SERVICE_ACCOUNT_BASE64 for auth");
        const decoded = Buffer.from(
          process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
          "base64",
        ).toString("utf-8");
        serviceAccount = JSON.parse(decoded);
      } else {
        // Method 2: Individual env vars (local dev fallback)
        console.log("🔑 Using individual FIREBASE_* env vars for auth");

        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
          privateKey = privateKey.replace(/\\n/g, "\n");
          privateKey = privateKey.replace(/^["']|["']$/g, "");
        }

        serviceAccount = {
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
      }

      // Debug: Log key info
      console.log("🔑 Firebase Key Debug:");
      console.log(
        "  - project_id:",
        serviceAccount.projectId || serviceAccount.project_id || "MISSING",
      );
      console.log(
        "  - client_email:",
        serviceAccount.clientEmail || serviceAccount.client_email || "MISSING",
      );
      console.log(
        "  - private_key:",
        serviceAccount.privateKey || serviceAccount.private_key
          ? "Set ✅"
          : "MISSING ❌",
      );

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
