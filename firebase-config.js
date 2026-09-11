// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqZ2z6cLSV-cygTigtgc6TyKcRgxeYoy4",
  authDomain: "sciencelab-admin.firebaseapp.com",
  projectId: "sciencelab-admin",
  storageBucket: "sciencelab-admin.firebasestorage.app",
  messagingSenderId: "79590520524",
  appId: "1:79590520524:web:41bc1b93236e98107e7469",
  measurementId: "G-VPRS1JY8D2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
