// ad-popup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const db = getFirestore(app);

(async function loadAdPopup() {
  try {
    const snap = await getDocs(query(collection(db, 'ads'), where('status', '==', 'active')));
    if (snap.empty) {
      console.log("ℹ️ No active ads found in Firestore.");
      return;
    }
    
    const ad = snap.docs[0].data();
    const adId = snap.docs[0].id;
    
    // Check if user dismissed it recently
    const dismissed = localStorage.getItem('ad_dismiss_' + adId);
    if (dismissed && Date.now() < parseInt(dismissed)) {
      console.log("⏰ Ad dismissed until", new Date(parseInt(dismissed)).toLocaleString());
      return;
    }

    // Build popup UI
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed; inset:0; background:rgba(15,39,40,0.7); backdrop-filter:blur(6px); z-index:9998; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.3s;`;
    
    overlay.innerHTML = `
      <div style="background:#fff; border-radius:20px; max-width:420px; width:100%; overflow:hidden; box-shadow:0 25px 50px rgba(0,0,0,0.3); border:2px solid #BDDED6; position:relative;">
        <button id="adClose" style="position:absolute; top:12px; right:12px; width:32px; height:32px; border-radius:50%; background:#fff; border:1.5px solid #BDDED6; cursor:pointer; font-size:1rem; color:#0f2728; z-index:2; display:flex; align-items:center; justify-content:center;">✕</button>
        <img src="${ad.imageUrl}" style="width:100%; display:block;" alt="ad" onerror="this.src='https://via.placeholder.com/400x200?text=Ad+Image+Error'">
        <div style="padding:20px; text-align:center;">
          <a href="${ad.buttonUrl}" target="_blank" style="display:block; padding:14px; background:#177D81; color:#fff; border-radius:12px; text-decoration:none; font-weight:700; font-size:1rem; margin-bottom:12px; box-shadow:0 4px 14px rgba(23,125,129,0.3);">${ad.buttonName}</a>
          <button id="adRemind" style="background:transparent; border:none; color:#4e6c6d; font-size:0.85rem; cursor:pointer; font-weight:600;">⏰ Remind me in ${ad.remindDays} days</button>
          <div style="margin-top:10px; font-size:0.7rem; color:#4e6c6d;">Ads by <strong style="color:#177D81;">Hexa Solutions</strong></div>
        </div>
      </div>`;
      
    document.body.appendChild(overlay);

    // Event Listeners
    document.getElementById('adClose').onclick = () => overlay.remove();
    document.getElementById('adRemind').onclick = () => {
      const ms = ad.remindDays * 24 * 60 * 60 * 1000;
      localStorage.setItem('ad_dismiss_' + adId, Date.now() + ms);
      overlay.remove();
    };
  } catch (err) {
    console.error("❌ Ad popup error:", err);
  }
})();
