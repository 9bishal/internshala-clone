const admin = require('firebase-admin');
require('dotenv').config()

let firebaseApp;

module.exports.connect = () => {
    try {
        // Initialize Firebase Admin SDK
        if (!admin.apps.length) {
            const serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                clientId: process.env.FIREBASE_CLIENT_ID,
                authUri: "https://accounts.google.com/o/oauth2/auth",
                tokenUri: "https://oauth2.googleapis.com/token",
                authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
                clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL
            };

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL
            });

            firebaseApp = admin.app();
            console.log("✅ Firebase is connected");
        }
    } catch (err) {
        console.log("⚠️ Firebase connection error:", err.message);
    }
}

module.exports.db = () => admin.database();
module.exports.auth = () => admin.auth();
module.exports.storage = () => admin.storage();
module.exports.firestore = () => admin.firestore();