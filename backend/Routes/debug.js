const express = require('express');
const router = express.Router();

router.get('/env', (req, res) => {
    let pk = process.env.FIREBASE_PRIVATE_KEY || "";
    if (pk) {
        pk = pk.replace(/\\n/g, '\n');
        pk = pk.replace(/^["']|["']$/g, '');
    }

    res.json({
        firebaseAppInitialized: require('firebase-admin').apps.length > 0,
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID ? "Set" : "Missing",
        privateKeyLength: pk.length,
        privateKeyStart: pk.substring(0, 30),
        privateKeyEnd: pk.substring(pk.length - 30),
        privateKeyHasNewlines: pk.includes('\n'),
        newlineCount: (pk.match(/\n/g) || []).length
    });
});

module.exports = router;
