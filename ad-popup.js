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
    if (snap.empty) return;
    
    const ad = snap.docs[0].data();
    const adId = snap.docs[0].id;
    
    // Check if user dismissed it recently
    const dismissed = localStorage.getItem('ad_dismiss_' + adId);
    if (dismissed && Date.now() < parseInt(dismissed)) return;

    // 1. Create Overlay (Ultra-high z-index to guarantee it's on top)
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; 
      background: rgba(15, 39, 40, 0.75); 
      backdrop-filter: blur(6px); 
      z-index: 99999; 
      display: flex; align-items: center; justify-content: center; 
      padding: 20px; 
      animation: fadeIn 0.3s ease-out;
    `;

    // 2. Create Ad Box
    const adBox = document.createElement('div');
    adBox.style.cssText = `
      background: #fff; border-radius: 20px; max-width: 420px; width: 100%; 
      overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.3); 
      border: 2px solid #BDDED6; position: relative;
    `;

    // 3. Create Close Button (Direct reference, no ID conflicts)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      position: absolute; top: 12px; right: 12px; 
      width: 36px; height: 36px; border-radius: 50%; 
      background: #fff; border: 1.5px solid #BDDED6; 
      cursor: pointer; font-size: 1.1rem; color: #0f2728; 
      z-index: 10; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    `;
    // Hover effect
    closeBtn.onmouseenter = () => { 
      closeBtn.style.background = '#fee2e2'; 
      closeBtn.style.color = '#dc2626'; 
      closeBtn.style.borderColor = '#fecaca'; 
    };
    closeBtn.onmouseleave = () => { 
      closeBtn.style.background = '#fff'; 
      closeBtn.style.color = '#0f2728'; 
      closeBtn.style.borderColor = '#BDDED6'; 
    };
    
    // ROBUST CLOSE FUNCTION with fade-out
    const closeAd = () => {
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    };

    // Attach click directly to the button, stop propagation to prevent bubbling
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAd();
    };

    // Allow closing by clicking the dark background outside the ad
    overlay.onclick = (e) => {
      if (e.target === overlay) closeAd();
    };

    adBox.appendChild(closeBtn);

    // 4. Ad Image
    const img = document.createElement('img');
    img.src = ad.imageUrl;
    img.alt = "Ad";
    img.style.cssText = "width: 100%; display: block;";
    img.onerror = () => { img.src = 'https://via.placeholder.com/400x200?text=Ad+Image+Error'; };
    adBox.appendChild(img);

    // 5. Ad Content
    const content = document.createElement('div');
    content.style.cssText = "padding: 24px; text-align: center;";
    
    const link = document.createElement('a');
    link.href = ad.buttonUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = ad.buttonName;
    link.style.cssText = `
      display: block; padding: 14px; background: #177D81; color: #fff; 
      border-radius: 12px; text-decoration: none; font-weight: 700; 
      font-size: 1rem; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(23,125,129,0.3);
      transition: transform 0.2s;
    `;
    link.onmouseenter = () => { link.style.transform = 'translateY(-2px)'; };
    link.onmouseleave = () => { link.style.transform = 'translateY(0)'; };
    content.appendChild(link);

    const remindBtn = document.createElement('button');
    remindBtn.innerHTML = `⏰ Remind me in ${ad.remindDays} days`;
    remindBtn.style.cssText = `
      background: transparent; border: none; color: #4e6c6d; 
      font-size: 0.85rem; cursor: pointer; font-weight: 600;
      text-decoration: underline; text-underline-offset: 4px;
    `;
    remindBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ms = ad.remindDays * 24 * 60 * 60 * 1000;
      localStorage.setItem('ad_dismiss_' + adId, Date.now() + ms);
      closeAd();
    };
    content.appendChild(remindBtn);

    const footer = document.createElement('div');
    footer.style.cssText = "margin-top: 12px; font-size: 0.7rem; color: #4e6c6d;";
    footer.innerHTML = 'Ads by <strong style="color:#177D81;">Hexa Solutions</strong>';
    content.appendChild(footer);

    // Assemble and inject
    adBox.appendChild(content);
    overlay.appendChild(adBox);
    document.body.appendChild(overlay);

  } catch (err) {
    console.error("❌ Ad popup error:", err);
  }
})();
