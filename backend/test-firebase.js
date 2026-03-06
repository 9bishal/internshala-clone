const admin = require('firebase-admin');
require('dotenv').config();

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/^["']|["']$/g, '');
}

const sa = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: privateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: "https://accounts.google.com/o/oauth2/auth",
    tokenUri: "https://oauth2.googleapis.com/token",
    authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
    credential: admin.credential.cert(sa),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

admin.firestore().collection('internship').limit(1).get()
    .then(snap => {
        console.log("SUCCESS! Got", snap.size, "records");
        process.exit(0);
    })
    .catch(err => {
        console.error("FAILED:", err.message);
        process.exit(1);
    });
