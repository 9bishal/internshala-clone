const admin = require('firebase-admin');
require('dotenv').config();

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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.firestore();

async function deleteAllUsers() {
  try {
    console.log('🗑️  Deleting all users from Firestore...');
    
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('✅ No users found to delete');
      process.exit(0);
    }
    
    const batch = db.batch();
    let count = 0;
    
    usersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    
    await batch.commit();
    console.log(`✅ Successfully deleted ${count} users`);
    
    // Also delete from Firebase Auth
    console.log('🗑️  Deleting users from Firebase Authentication...');
    const authUsers = await admin.auth().listUsers(1000);
    
    let authCount = 0;
    for (const user of authUsers.users) {
      try {
        await admin.auth().deleteUser(user.uid);
        authCount++;
      } catch (error) {
        console.error(`Could not delete auth user ${user.uid}:`, error.message);
      }
    }
    
    console.log(`✅ Successfully deleted ${authCount} auth users`);
    console.log('✅ All users deleted successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting users:', error);
    process.exit(1);
  }
}

deleteAllUsers();
