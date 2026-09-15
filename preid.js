// preid.js - Premium ID Management System
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ NEW FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyA3orxMYOhXIj9ceQPGG0y3Vupj8uHGkzE",
  authDomain: "premiumid-f32c9.firebaseapp.com",
  projectId: "premiumid-f32c9",
  storageBucket: "premiumid-f32c9.firebasestorage.app",
  messagingSenderId: "539865333401",
  appId: "1:539865333401:web:56c60789c568bdd174c208",
  measurementId: "G-TN3WK5X5QT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ====== TELEGRAM BOT CONFIG ======
const TG_TOKEN = '8915689423:AAEX8Pu-tO6uwoeJJhwxwt9VQjb6bPP_6J0';
const TG_CHAT_ID = '8894629015';

// ====== GENERATE 8-CHARACTER PREMIUM ID ======
function generatePremiumId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (I, O, 0, 1)
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ====== TELEGRAM NOTIFICATION ======
async function notifyTelegram(title, message, color = '🟢') {
  const time = new Date().toLocaleString();
  const adminEmail = auth.currentUser?.email || 'Unknown';
  const fullMessage = `${color} *${title}*\n\n${message}\n\n👤 *Admin:* ${adminEmail}\n🕒 *Time:* ${time}`;
  
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text: fullMessage,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    console.error('Telegram notification failed:', e);
  }
}

// ====== TOAST HELPER ======
function preidToast(msg, isError = false) {
  if (typeof toast === 'function') {
    toast(msg, isError);
  } else {
    alert(msg);
  }
}

// ====== GENERATE & SAVE PREMIUM ID ======
window.generatePremiumId = async () => {
  const name = document.getElementById('preidName').value.trim();
  const phone = document.getElementById('preidPhone').value.trim();
  const age = document.getElementById('preidAge').value.trim();

  if (!name || !phone || !age) {
    return preidToast('Please fill all fields (Name, Phone, Age)', true);
  }

  if (!/^\d{7,15}$/.test(phone)) {
    return preidToast('Please enter a valid phone number', true);
  }

  if (isNaN(age) || parseInt(age) < 1 || parseInt(age) > 120) {
    return preidToast('Please enter a valid age', true);
  }

  const btn = document.getElementById('generatePreidBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

  try {
    let premiumCode = generatePremiumId();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await getDocs(query(collection(db, 'premiumIds'), where('code', '==', premiumCode)));
      if (existing.empty) break;
      premiumCode = generatePremiumId();
      attempts++;
    }

    await addDoc(collection(db, 'premiumIds'), {
      code: premiumCode,
      name: name,
      phone: phone,
      age: parseInt(age),
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || 'Unknown'
    });

    document.getElementById('preidName').value = '';
    document.getElementById('preidPhone').value = '';
    document.getElementById('preidAge').value = '';

    await notifyTelegram(
      'New Premium ID Generated',
      `🆔 *Code:* \`${premiumCode}\`\n👤 *Name:* ${name}\n📞 *Phone:* ${phone}\n🎂 *Age:* ${age}`
    );

    preidToast('✅ Premium ID generated: ' + premiumCode);
    loadPremiumIds();
  } catch (e) {
    console.error(e);
    preidToast('Error: ' + e.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Premium ID';
  }
};

// ====== LOAD ALL PREMIUM IDS ======
window.loadPremiumIds = async () => {
  const tbody = document.querySelector('#premiumIdsTable tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';

  try {
    const snap = await getDocs(query(collection(db, 'premiumIds'), orderBy('createdAt', 'desc')));
    tbody.innerHTML = '';

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No Premium IDs generated yet.</td></tr>';
      return;
    }

    snap.docs.forEach(d => {
      const p = d.data();
      const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : '—';
      const statusBadge = p.status === 'active'
        ? `<span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">● Active</span>`
        : `<span style="background:#fee2e2; color:#991b1b; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">● Disabled</span>`;

      const toggleBtn = p.status === 'active'
        ? `<button class="icon-btn" onclick="togglePremiumStatus('${d.id}', 'disabled', '${p.code}')" title="Disable" style="color:#D98E18;"><i class="fa-solid fa-ban"></i></button>`
        : `<button class="icon-btn" onclick="togglePremiumStatus('${d.id}', 'active', '${p.code}')" title="Enable" style="color:#166534;"><i class="fa-solid fa-check"></i></button>`;

      tbody.innerHTML += `<tr>
        <td><code style="background:var(--teal-subtle); color:var(--teal-dark); padding:4px 10px; border-radius:6px; font-weight:800; letter-spacing:1px; font-size:0.9rem; cursor:pointer;" onclick="copyPremiumId('${p.code}')" title="Click to copy">${p.code}</code></td>
        <td><strong>${p.name}</strong></td>
        <td style="font-family:monospace;">${p.phone}</td>
        <td>${p.age}</td>
        <td style="font-size:0.85rem;">${date}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:4px;">
            ${toggleBtn}
            <button class="icon-btn danger" onclick="deletePremiumId('${d.id}', '${p.code}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    });
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#dc2626;">Error loading Premium IDs.</td></tr>`;
  }
};

// ====== TOGGLE STATUS ======
window.togglePremiumStatus = async (id, newStatus, code) => {
  const action = newStatus === 'active' ? 'enable' : 'disable';
  if (!confirm(`Are you sure you want to ${action} Premium ID: ${code}?`)) return;

  try {
    await updateDoc(doc(db, 'premiumIds', id), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    const color = newStatus === 'active' ? '🟢' : '🔴';
    const title = newStatus === 'active' ? 'Premium ID Re-enabled' : 'Premium ID Disabled';
    await notifyTelegram(title, `🆔 *Code:* \`${code}\`\n📊 *New Status:* ${newStatus.toUpperCase()}`, color);

    preidToast(`Premium ID ${action}d successfully`);
    loadPremiumIds();
  } catch (e) {
    preidToast('Error: ' + e.message, true);
  }
};

// ====== DELETE PREMIUM ID ======
window.deletePremiumId = async (id, code) => {
  if (!confirm(`Permanently delete Premium ID: ${code}? This cannot be undone.`)) return;

  try {
    await deleteDoc(doc(db, 'premiumIds', id));
    await notifyTelegram('Premium ID Deleted', `🆔 *Code:* \`${code}\`\n🗑️ *Action:* Permanently deleted`, '⚠️');
    preidToast('Premium ID deleted');
    loadPremiumIds();
  } catch (e) {
    preidToast('Error: ' + e.message, true);
  }
};

// ====== COPY PREMIUM ID ======
window.copyPremiumId = (code) => {
  navigator.clipboard.writeText(code).then(() => {
    preidToast('📋 Copied: ' + code);
  });
};
