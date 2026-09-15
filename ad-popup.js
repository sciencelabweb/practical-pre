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

    // ✅ FIX: Randomly select an active ad instead of always picking the first one (snap.docs[0])
    // This prevents them from showing in a predictable "one by one" sequence.
    const randomIndex = Math.floor(Math.random() * snap.docs.length);
    const ad = snap.docs[randomIndex].data();
    const adId = snap.docs[randomIndex].id;

    const permanentlyDismissed = localStorage.getItem('ad_permanent_' + adId);
    if (permanentlyDismissed === 'true') return;

    const remindUntil = localStorage.getItem('ad_remind_' + adId);
    if (remindUntil && Date.now() < parseInt(remindUntil)) return;

    // ====== OVERLAY ======
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(15, 39, 40, 0.75);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      animation: adFadeIn 0.35s ease-out;
    `;

    // ====== CARD ======
    const card = document.createElement('div');
    card.style.cssText = `
      background: #ffffff;
      border-radius: 24px;
      max-width: 420px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
      position: relative;
      animation: adSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    // ====== INFO BUTTON ======
    const infoBtn = document.createElement('button');
    infoBtn.innerHTML = '<i class="fa-solid fa-info" style="font-size:0.75rem;"></i>';
    infoBtn.style.cssText = `
      position: absolute; top: 14px; right: 14px;
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255,255,255,0.9); border: 1.5px solid #BDDED6;
      cursor: pointer; color: #4e6c6d;
      display: flex; align-items: center; justify-content: center;
      z-index: 10; transition: all 0.2s;
    `;
    infoBtn.onmouseenter = () => { infoBtn.style.background = '#f0f7f5'; infoBtn.style.color = '#177D81'; };
    infoBtn.onmouseleave = () => { infoBtn.style.background = 'rgba(255,255,255,0.9)'; infoBtn.style.color = '#4e6c6d'; };
    infoBtn.onclick = (e) => { e.stopPropagation(); alert(`Sponsored promotion.\n\nAds by Hexa Solutions\nRemind interval: ${ad.remindDays} days`); };
    card.appendChild(infoBtn);

    // ====== 16:9 IMAGE ======
    const img = document.createElement('img');
    img.src = ad.imageUrl;
    img.alt = "Advertisement";
    img.style.cssText = "width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block;";
    img.onerror = () => { img.src = 'https://via.placeholder.com/400x225?text=16:9+Ad+Image'; };
    card.appendChild(img);

    // ====== CONTENT ======
    const content = document.createElement('div');
    content.style.cssText = "padding: 24px 24px 20px; text-align: center;";

    // Description Text (Below Image)
    if (ad.description) {
      const desc = document.createElement('div');
      desc.textContent = ad.description;
      desc.style.cssText = `
        font-size: 1.05rem; font-weight: 600; color: #0f2728;
        margin-bottom: 20px; letter-spacing: -0.2px; line-height: 1.4;
      `;
      content.appendChild(desc);
    }

    // Primary CTA Button
    const ctaBtn = document.createElement('a');
    ctaBtn.href = ad.buttonUrl;
    ctaBtn.target = "_blank";
    ctaBtn.rel = "noopener noreferrer";
    ctaBtn.textContent = ad.buttonName || 'Learn More';
    ctaBtn.style.cssText = `
      display: block; width: 100%; padding: 16px;
      background: linear-gradient(135deg, #177D81 0%, #0d9488 100%);
      color: #ffffff; border-radius: 14px;
      text-decoration: none; font-weight: 700; font-size: 1.05rem;
      margin-bottom: 12px;
      box-shadow: 0 4px 16px rgba(23, 125, 129, 0.35);
      transition: all 0.25s ease; border: none; cursor: pointer;
    `;
    ctaBtn.onmouseenter = () => { ctaBtn.style.transform = 'translateY(-2px)'; ctaBtn.style.boxShadow = '0 6px 22px rgba(23, 125, 129, 0.45)'; };
    ctaBtn.onmouseleave = () => { ctaBtn.style.transform = 'translateY(0)'; ctaBtn.style.boxShadow = '0 4px 16px rgba(23, 125, 129, 0.35)'; };
    ctaBtn.onclick = () => { localStorage.setItem('ad_permanent_' + adId, 'true'); };
    content.appendChild(ctaBtn);

    // Remind Me Later Button
    const remindBtn = document.createElement('button');
    remindBtn.textContent = 'Remind me later';
    remindBtn.style.cssText = `
      display: block; width: 100%; padding: 14px;
      background: #ffffff; color: #4e6c6d;
      border: 2px solid #BDDED6; border-radius: 14px;
      font-weight: 600; font-size: 0.95rem;
      cursor: pointer; transition: all 0.25s ease; font-family: inherit;
    `;
    remindBtn.onmouseenter = () => { remindBtn.style.background = '#f0f7f5'; remindBtn.style.borderColor = '#177D81'; remindBtn.style.color = '#177D81'; };
    remindBtn.onmouseleave = () => { remindBtn.style.background = '#ffffff'; remindBtn.style.borderColor = '#BDDED6'; remindBtn.style.color = '#4e6c6d'; };
    remindBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const ms = (ad.remindDays || 3) * 24 * 60 * 60 * 1000;
      localStorage.setItem('ad_remind_' + adId, Date.now() + ms);
      closeAd();
    };
    content.appendChild(remindBtn);

    // Footer with Link
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 16px; padding-top: 14px;
      border-top: 1px solid #BDDED6;
      font-size: 0.8rem; color: #4e6c6d;
    `;
    footer.innerHTML = 'Ads by <a href="https://hexasolutions.online" target="_blank" rel="noopener noreferrer" style="color:#177D81; text-decoration:none; font-weight:700;">Hexa Solutions</a>';
    content.appendChild(footer);
    card.appendChild(content);
    overlay.appendChild(card);

    // ====== CLOSE LOGIC ======
    const closeAd = () => {
      card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      card.style.transform = 'scale(0.95)'; card.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease'; overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        const ms = (ad.remindDays || 3) * 24 * 60 * 60 * 1000;
        localStorage.setItem('ad_remind_' + adId, Date.now() + ms);
        closeAd();
      }
    };

    document.body.appendChild(overlay);
  } catch (err) { 
    console.error("Ad popup error:", err); 
  }
})();
