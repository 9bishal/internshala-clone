// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUHbkPaM7MgssyDcXHc7kcAWsDCL_LyNE",
  authDomain: "internshala-clone-6c9f0.firebaseapp.com",
  projectId: "internshala-clone-6c9f0",
  storageBucket: "internshala-clone-6c9f0.firebasestorage.app",
  messagingSenderId: "1017934486580",
  appId: "1:1017934486580:web:60aa0474423fe3618ebe61",
  measurementId: "G-EKJZR1FX9S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({
  'login_hint': 'user@example.com'
});
const storage = getStorage(app);

export { auth, provider, storage };
