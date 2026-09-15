// admin.js
import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc, updateDoc,
  query, orderBy, where, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const PRACTICALS = [
  { id: '1', name: 'Home', file: 'index.html' },
  { id: '2', name: 'Forces Simulator', file: '2.html' },
  { id: '3', name: 'Moments Simulator', file: '3.html' },
  { id: '4', name: "Hare's Apparatus", file: '4.html' },
  { id: '5', name: 'U-Tube Density', file: '5.html' },
  { id: '6', name: 'Liquid Density', file: '6.html' },
  { id: '7', name: 'Simple Pendulum', file: '7.html' },
  { id: '8', name: 'Helical Spring', file: '8.html' },
  { id: '10', name: 'Micrometer Gauge', file: '10.html' },
  { id: '11', name: 'Spherometer Lab', file: '11.html' },
  { id: '12', name: 'Travelling Microscope', file: '12.html' },
  { id: '13', name: 'Sonometer Practical', file: '13.html' },
  { id: '14', name: 'Resonance Tube Practical', file: '14.html' },
  { id: '15', name: 'Relative Humidity', file: '15.html' },
  { id: '16', name: 'Gas Law Simulator', file: '16.html' }
];

let viewsChart = null;
let editingAdId = null;
let currentSessionId = null;
let sessionUnsubscribe = null;

// ============ HELPER FUNCTIONS ============
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1) os = "MacOS";
  else if (ua.indexOf("Linux") !== -1) os = "Linux";
  else if (ua.indexOf("Android") !== -1) os = "Android";
  else if (ua.indexOf("like Mac") !== -1) os = "iOS";

  let browser = "Unknown Browser";
  if (ua.indexOf("Chrome") !== -1 && ua.indexOf("Edg") === -1) browser = "Chrome";
  else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Edg") !== -1) browser = "Edge";

  return `${os} / ${browser}`;
}

async function fetchAdminIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'Unavailable';
  }
}

// ============ AUTH & SESSION MANAGEMENT ============
window.adminLogin = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginError');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    errBox.style.display = 'none';
  } catch (e) {
    errBox.style.display = 'block';
    errBox.textContent = e.message.replace('Firebase: ', '');
  }
};

window.adminLogout = async () => {
  if (currentSessionId) {
    await updateDoc(doc(db, 'admin_sessions', currentSessionId), {
      isActive: false,
      logoutTime: serverTimestamp()
    });
  }
  if (sessionUnsubscribe) sessionUnsubscribe();
  await signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminLayout').classList.add('active');
    document.getElementById('adminEmail').textContent = user.email;
    
    // Create Session Record
    const ip = await fetchAdminIp();
    const device = getDeviceInfo();
    
    const sessionRef = await addDoc(collection(db, 'admin_sessions'), {
      uid: user.uid,
      email: user.email,
      ip: ip,
      device: device,
      loginTime: serverTimestamp(),
      isActive: true,
      terminated: false
    });
    
    currentSessionId = sessionRef.id;
    sessionStorage.setItem('currentSessionId', currentSessionId);

    // Listen for remote termination (Force Logout by another admin)
    sessionUnsubscribe = onSnapshot(doc(db, 'admin_sessions', currentSessionId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().terminated) {
        alert('⚠️ Your session was terminated by another administrator.');
        window.adminLogout();
      }
    });

    initDashboard();
loadAdmins();
loadPremiumIds(); // Load premium IDs table on login too
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminLayout').classList.remove('active');
    if (sessionUnsubscribe) sessionUnsubscribe();
    currentSessionId = null;
  }
});

// ============ NAVIGATION ============
window.switchSection = (id, el) => {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  el.classList.add('active');
  const titles = {
    dashboard: 'Dashboard Overview',
    ads: 'Popup Ads Manager',
    feedbacks: 'User Feedbacks',
    analytics: 'Views Analytics',
    youtube: 'YouTube Video Guides',
    admins: 'Manage Admin Sessions',
    premium: 'Premium ID Management'
  };
  document.getElementById('sectionTitle').textContent = titles[id];
  if (id === 'admins') loadAdmins();
  if (id === 'premium') loadPremiumIds(); // <-- THIS FIXES THE LOADING BUG
};

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.toggle('error', isError); t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ============ DASHBOARD ============
async function initDashboard() {
  populatePracticalDropdowns();
  loadStats(); loadAds(); loadFeedbacks(); loadAnalytics(); loadYouTubeGuides();
  setupAdPreview();
  const today = new Date(), from = new Date(); from.setDate(today.getDate() - 30);
  document.getElementById('dateTo').value = today.toISOString().split('T')[0];
  document.getElementById('dateFrom').value = from.toISOString().split('T')[0];
}

function populatePracticalDropdowns() {
  const sel1 = document.getElementById('practicalFilter'), sel2 = document.getElementById('ytPractical');
  PRACTICALS.forEach(p => {
    sel1.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    sel2.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });
}

async function loadStats() {
  const [adsSnap, fbSnap, viewsSnap, ytSnap] = await Promise.all([
    getDocs(collection(db, 'ads')), getDocs(collection(db, 'feedbacks')),
    getDocs(collection(db, 'views')), getDocs(collection(db, 'youtubeGuides'))
  ]);
  document.getElementById('statAds').textContent = adsSnap.docs.filter(d => d.data().status === 'active').length;
  document.getElementById('statFeedbacks').textContent = fbSnap.size;
  document.getElementById('statGuides').textContent = ytSnap.size;
  
  let totalViews = 0; const counts = {};
  viewsSnap.docs.forEach(d => { const v = d.data(); totalViews += v.count || 0; counts[v.practicalId] = (counts[v.practicalId] || 0) + (v.count || 0); });
  document.getElementById('statViews').textContent = totalViews.toLocaleString();

  const tbody = document.querySelector('#topPracticalsTable tbody'); tbody.innerHTML = '';
  Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([id, count], i) => {
    const p = PRACTICALS.find(x => x.id === id);
    tbody.innerHTML += `<tr><td><strong>${i + 1}</strong></td><td>${p ? p.name : 'Unknown'}</td><td><strong style="color:var(--teal-dark);">${count.toLocaleString()}</strong></td></tr>`;
  });
}

// ============ ADS ============
function setupAdPreview() {
  ['adImageUrl', 'adBtnName', 'adRemindDays', 'adDescription'].forEach(id => 
    document.getElementById(id).addEventListener('input', updatePreview)
  );
}
function updatePreview() {
  document.getElementById('previewImg').src = document.getElementById('adImageUrl').value || 'https://via.placeholder.com/400x225?text=16:9+Ad+Preview';
  document.getElementById('previewBtn').textContent = document.getElementById('adBtnName').value || 'Button Name';
  document.getElementById('previewDays').textContent = document.getElementById('adRemindDays').value || 3;
  document.getElementById('previewDesc').textContent = document.getElementById('adDescription').value || 'Popup description text will appear here...';
}

window.saveAd = async () => {
  const data = {
    imageUrl: document.getElementById('adImageUrl').value.trim(),
    buttonName: document.getElementById('adBtnName').value.trim(),
    description: document.getElementById('adDescription').value.trim(),
    buttonUrl: document.getElementById('adBtnUrl').value.trim(),
    remindDays: parseInt(document.getElementById('adRemindDays').value) || 3,
    status: document.getElementById('adStatus').value,
    updatedAt: serverTimestamp()
  };
  if (!data.imageUrl || !data.buttonName || !data.buttonUrl) return toast('Please fill image, button name, and URL', true);
  try {
    if (editingAdId) {
      await updateDoc(doc(db, 'ads', editingAdId), data);
      toast('Ad updated successfully'); editingAdId = null;
      document.getElementById('saveAdBtn').innerHTML = '<i class="fa-solid fa-save"></i> Save Ad';
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'ads'), data);
      toast('Ad created successfully');
    }
    clearAdForm(); loadAds(); loadStats();
  } catch (e) { toast('Error: ' + e.message, true); }
};

function clearAdForm() {
  ['adImageUrl', 'adBtnName', 'adBtnUrl', 'adDescription'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('adRemindDays').value = 3; document.getElementById('adStatus').value = 'active';
  updatePreview();
}

async function loadAds() {
  const snap = await getDocs(query(collection(db, 'ads'), orderBy('createdAt', 'desc')));
  const list = document.getElementById('adsList');
  if (snap.empty) { list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No ads yet</p>'; return; }
  list.innerHTML = '';
  snap.docs.forEach(d => {
    const a = d.data();
    list.innerHTML += `<div class="list-item">
      <img class="thumb" src="${a.imageUrl}" onerror="this.src='https://via.placeholder.com/70'">
      <div class="info"><h4>${a.buttonName} <span style="font-size:0.7rem; padding:3px 8px; border-radius:6px; background:${a.status === 'active' ? '#dcfce7' : '#fee2e2'}; color:${a.status === 'active' ? '#166534' : '#991b1b'};">${a.status.toUpperCase()}</span></h4>
      <p> ${a.description || 'No description'}</p>
      <p>🔗 ${a.buttonUrl}</p><p>⏰ Remind after ${a.remindDays} days</p></div>
      <div class="actions">
        <button class="icon-btn" onclick="editAd('${d.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn danger" onclick="deleteAd('${d.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div></div>`;
  });
}

window.editAd = async (id) => {
  const snap = await getDocs(collection(db, 'ads'));
  const d = snap.docs.find(x => x.id === id).data();
  document.getElementById('adImageUrl').value = d.imageUrl;
  document.getElementById('adBtnName').value = d.buttonName;
  document.getElementById('adDescription').value = d.description || '';
  document.getElementById('adBtnUrl').value = d.buttonUrl;
  document.getElementById('adRemindDays').value = d.remindDays;
  document.getElementById('adStatus').value = d.status;
  editingAdId = id;
  document.getElementById('saveAdBtn').innerHTML = '<i class="fa-solid fa-pen"></i> Update Ad';
  updatePreview();
};

window.deleteAd = async (id) => {
  if (!confirm('Delete this ad?')) return;
  await deleteDoc(doc(db, 'ads', id)); toast('Ad deleted'); loadAds(); loadStats();
};

// ============ FEEDBACKS ============
async function loadFeedbacks() {
  const snap = await getDocs(query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc')));
  const list = document.getElementById('feedbacksList');
  if (snap.empty) { list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No feedbacks yet</p>'; return; }
  list.innerHTML = '';
  snap.docs.forEach(d => {
    const f = d.data();
    const stars = '★'.repeat(f.rating || 0) + '☆'.repeat(5 - (f.rating || 0));
    const date = f.createdAt?.toDate ? f.createdAt.toDate().toLocaleString() : '—';
    list.innerHTML += `<div class="feedback-card" style="position:relative;">
      <button onclick="deleteFeedback('${d.id}')" title="Delete" style="position:absolute; top:14px; right:14px; width:32px; height:32px; border-radius:8px; background:#fff; border:1.5px solid var(--border-color); cursor:pointer; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fff'"><i class="fa-solid fa-trash" style="color:#dc2626;"></i></button>
      <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-right:40px;"><span style="color:#D98E18; font-weight:700;">${stars}</span><span style="font-size:0.8rem; color:var(--text-muted);">${date}</span></div>
      <div style="color:var(--text-main); line-height:1.55;">${f.message || '<em style="color:var(--text-muted);">No message</em>'}</div>
      <div style="margin-top:10px; font-size:0.75rem; color:var(--text-muted);">From: <strong>${f.page || 'Unknown'}</strong></div>
    </div>`;
  });
}
window.deleteFeedback = async (id) => {
  if (!confirm('Delete this feedback?')) return;
  await deleteDoc(doc(db, 'feedbacks', id)); toast('Deleted'); loadFeedbacks(); loadStats();
};

// ============ ANALYTICS ============
let allViewsData = [];
async function loadAnalytics() {
  const snap = await getDocs(collection(db, 'views'));
  allViewsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderChart(allViewsData); renderAnalyticsTable(allViewsData);
}
function renderChart(data) {
  const ctx = document.getElementById('viewsChart').getContext('2d');
  const byDate = {};
  data.forEach(v => { if (!byDate[v.date]) byDate[v.date] = {}; byDate[v.date][v.practicalId] = (byDate[v.date][v.practicalId] || 0) + (v.count || 0); });
  const dates = Object.keys(byDate).sort();
  const practicalIds = [...new Set(data.map(v => v.practicalId))];
  const colors = ['#177D81', '#D98E18', '#0d9488', '#dc2626', '#2563eb', '#c084fc', '#38bdf8', '#166534'];
  const datasets = practicalIds.map((pid, i) => {
    const p = PRACTICALS.find(x => x.id === pid);
    return { label: p ? p.name : pid, data: dates.map(d => byDate[d][pid] || 0), borderColor: colors[i % colors.length], backgroundColor: colors[i % colors.length] + '22', tension: 0.35, fill: true, pointRadius: 3, borderWidth: 2.5 };
  });
  if (viewsChart) viewsChart.destroy();
  viewsChart = new Chart(ctx, { type: 'line', data: { labels: dates, datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } } });
}
function renderAnalyticsTable(data) {
  const counts = {}; data.forEach(v => { counts[v.practicalId] = (counts[v.practicalId] || 0) + (v.count || 0); });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const tbody = document.querySelector('#analyticsTable tbody'); tbody.innerHTML = '';
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([id, count]) => {
    const p = PRACTICALS.find(x => x.id === id); const pct = ((count / total) * 100).toFixed(1);
    tbody.innerHTML += `<tr><td><strong>${p ? p.name : id}</strong></td><td>${count.toLocaleString()}</td><td><div style="display:flex; align-items:center; gap:8px;"><div style="flex:1; height:8px; background:var(--teal-subtle); border-radius:4px;"><div style="width:${pct}%; height:100%; background:var(--teal-dark);"></div></div><span style="font-size:0.8rem; font-weight:700; color:var(--teal-dark);">${pct}%</span></div></td></tr>`;
  });
}
window.applyDateFilter = () => {
  const from = document.getElementById('dateFrom').value, to = document.getElementById('dateTo').value, pid = document.getElementById('practicalFilter').value;
  let filtered = allViewsData;
  if (from) filtered = filtered.filter(v => v.date >= from); if (to) filtered = filtered.filter(v => v.date <= to); if (pid !== 'all') filtered = filtered.filter(v => v.practicalId === pid);
  renderChart(filtered); renderAnalyticsTable(filtered); toast('Filter applied');
};

window.exportPDF = async () => {
  toast('Generating PDF Report...');
  const { jsPDF } = window.jspdf;
  const counts = {};
  allViewsData.forEach(v => { counts[v.practicalId] = (counts[v.practicalId] || 0) + (v.count || 0); });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  let tableRows = '';
  sorted.forEach(([id, count], index) => {
    const p = PRACTICALS.find(x => x.id === id);
    const name = p ? p.name : `Practical ${id}`;
    tableRows += `<tr style="border-bottom: 1px solid #eee;"> <td style="padding: 14px; text-align: left; color: #333; font-size: 14px;">${index + 1}. ${name}</td> <td style="padding: 14px; text-align: right; font-weight: bold; color: #177D81; font-size: 14px;">${count.toLocaleString()}</td> </tr>`;
  });
  const pdfContainer = document.createElement('div');
  pdfContainer.style.cssText = 'position: absolute; left: -9999px; width: 800px; background: #fff; padding: 40px; font-family: "Plus Jakarta Sans", sans-serif;';
  pdfContainer.innerHTML = `<div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #177D81; padding-bottom: 20px;"> <h1 style="color: #177D81; margin: 0; font-size: 28px; font-weight: 800;">ScienceLab Analytics Report</h1> <p style="color: #666; margin-top: 10px; font-size: 16px; font-weight: 600;">Total Page Views per Practical</p> <p style="color: #999; font-size: 12px; margin-top: 5px;">Generated on: ${new Date().toLocaleString()} | By Hexa Solutions</p> </div> <table style="width: 100%; border-collapse: collapse; margin-top: 20px;"> <thead> <tr style="background-color: #f0f7f5;"> <th style="padding: 14px; text-align: left; color: #177D81; border-bottom: 2px solid #177D81; font-weight: 700;">Practical Name</th> <th style="padding: 14px; text-align: right; color: #177D81; border-bottom: 2px solid #177D81; font-weight: 700;">Total Views</th> </tr> </thead> <tbody>${tableRows}</tbody> </table> <div style="margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;"> Powered by <strong style="color:#177D81;">Hexa Solutions</strong> (hexasolutions.online) </div>`;
  document.body.appendChild(pdfContainer);
  const canvas = await html2canvas(pdfContainer, { scale: 2, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`ScienceLab_Total_Views_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  document.body.removeChild(pdfContainer);
  toast('PDF downloaded successfully!');
};

// ============ YOUTUBE GUIDES ============
window.saveYouTubeGuide = async () => {
  const practicalId = document.getElementById('ytPractical').value;
  const url = document.getElementById('ytUrl').value.trim();
  const title = document.getElementById('ytTitle').value.trim();
  const description = document.getElementById('ytDescription') ? document.getElementById('ytDescription').value.trim() : '';
  if (!url) return toast('Please enter YouTube URL', true);
  let fixedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) fixedUrl = 'https://' + url;
  const p = PRACTICALS.find(x => x.id === practicalId);
  try {
    const q = query(collection(db, 'youtubeGuides'), where('practicalId', '==', practicalId));
    const existing = await getDocs(q);
    if (existing.size >= 5) return toast('Maximum 5 guides allowed per practical. Delete one first.', true);
    await addDoc(collection(db, 'youtubeGuides'), {
      practicalId, practicalName: p.name, youtubeUrl: fixedUrl,
      title: title || 'Guide ' + (existing.size + 1), description: description, createdAt: serverTimestamp()
    });
    toast('Guide added successfully');
    document.getElementById('ytUrl').value = ''; document.getElementById('ytTitle').value = '';
    if (document.getElementById('ytDescription')) document.getElementById('ytDescription').value = '';
    loadYouTubeGuides(); loadStats();
  } catch (e) { toast('Error: ' + e.message, true); }
};

async function loadYouTubeGuides() {
  const snap = await getDocs(collection(db, 'youtubeGuides'));
  const list = document.getElementById('ytList');
  if (snap.empty) { list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No guides yet</p>'; return; }
  const guidesByPractical = {};
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (!guidesByPractical[data.practicalId]) guidesByPractical[data.practicalId] = [];
    guidesByPractical[data.practicalId].push({ id: doc.id, ...data });
  });
  list.innerHTML = '';
  Object.keys(guidesByPractical).forEach(practicalId => {
    const guides = guidesByPractical[practicalId];
    const practicalName = guides[0].practicalName;
    list.innerHTML += `<div style="margin-bottom:24px; padding-bottom:16px; border-bottom:2px dashed var(--teal-light);">
      <h4 style="color:var(--teal-dark); margin-bottom:12px; font-size:1.05rem;"><i class="fa-solid fa-flask"></i> ${practicalName} (${guides.length}/5)</h4>`;
    guides.forEach(g => {
      const ytId = extractYTId(g.youtubeUrl);
      const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : 'https://via.placeholder.com/120x70';
      list.innerHTML += `<div class="list-item" style="margin-bottom:8px;">
        <img class="thumb" src="${thumb}" style="width:120px; height:70px;">
        <div class="info"><h4 style="font-size:0.9rem;">${g.title || 'Untitled'}</h4>
        <p style="font-size:0.75rem;">📝 ${g.description || 'No description'}</p>
        <p style="font-size:0.75rem; word-break:break-all;">🔗 ${g.youtubeUrl}</p></div>
        <div class="actions">
          <a href="${g.youtubeUrl}" target="_blank" class="icon-btn" title="Watch"><i class="fa-solid fa-play"></i></a>
          <button class="icon-btn danger" onclick="deleteGuide('${g.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div></div>`;
    });
    list.innerHTML += `</div>`;
  });
}

window.deleteGuide = async (id) => {
  if (!confirm('Delete this guide?')) return;
  await deleteDoc(doc(db, 'youtubeGuides', id)); toast('Guide deleted'); loadYouTubeGuides(); loadStats();
};

function extractYTId(url) {
  const m = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return m ? m[1] : null;
}

// ============ MANAGE ADMINS (NEW SECTION) ============
async function loadAdmins() {
  const tbody = document.querySelector('#adminsTable tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading sessions...</td></tr>';
  
  try {
    const snap = await getDocs(query(collection(db, 'admin_sessions'), orderBy('loginTime', 'desc')));
    tbody.innerHTML = '';
    
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No active sessions found.</td></tr>';
      return;
    }

    snap.docs.forEach(d => {
      const s = d.data();
      const loginTime = s.loginTime?.toDate ? s.loginTime.toDate().toLocaleString() : 'Just now';
      const isCurrent = d.id === currentSessionId;
      
      const statusBadge = s.isActive 
        ? `<span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">● Active</span>` 
        : `<span style="background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">○ Inactive</span>`;
      
      const actionBtn = (!isCurrent && s.isActive) 
        ? `<button class="icon-btn danger" onclick="terminateSession('${d.id}')" title="Force Logout"><i class="fa-solid fa-right-from-bracket"></i></button>` 
        : `<button class="icon-btn" disabled style="opacity:0.5; cursor:not-allowed;" title="${isCurrent ? 'Current Session' : 'Already Inactive'}"><i class="fa-solid fa-ban"></i></button>`;

      tbody.innerHTML += `<tr>
        <td><strong>${s.email}</strong> ${isCurrent ? '<span style="font-size:0.7rem; background:var(--teal-subtle); color:var(--teal-dark); padding:2px 6px; border-radius:4px; margin-left:6px;">YOU</span>' : ''}</td>
        <td style="font-family:monospace; font-size:0.9rem;">${s.ip || 'N/A'}</td>
        <td style="font-size:0.85rem;">${s.device || 'Unknown'}</td>
        <td style="font-size:0.85rem;">${loginTime}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>`;
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#dc2626;">Error loading sessions.</td></tr>`;
  }
}

window.terminateSession = async (targetSessionId) => {
  if (!confirm('Are you sure you want to force logout this admin session?')) return;
  try {
    await updateDoc(doc(db, 'admin_sessions', targetSessionId), {
      isActive: false,
      terminated: true,
      terminatedAt: serverTimestamp(),
      terminatedBy: auth.currentUser.email
    });
    toast('Session terminated successfully');
    loadAdmins();
  } catch (e) {
    toast('Error terminating session: ' + e.message, true);
  }
};

// ============ PREMIUM IDs MANAGEMENT ============
window.generateAndSavePremiumId = async () => {
  const name = document.getElementById('premName').value.trim();
  const phone = document.getElementById('premPhone').value.trim();
  const age = document.getElementById('premAge').value.trim();

  if (!name || !phone || !age) return toast('Please fill all fields', true);

  const premiumId = generateRandomId();
  const data = {
    premiumId,
    name,
    phone,
    age: parseInt(age),
    createdAt: serverTimestamp(),
    isActive: true
  };

  try {
    await addDoc(collection(db, 'premium_ids'), data);
    
    // Show generated ID on screen
    document.getElementById('generatedIdDisplay').style.display = 'block';
    document.getElementById('newPremiumId').textContent = premiumId;
    
    // Clear form
    document.getElementById('premName').value = '';
    document.getElementById('premPhone').value = '';
    document.getElementById('premAge').value = '';

    toast('Premium ID generated and saved successfully!');
    
    // Send Telegram Notification
    sendTelegramNotification(data);
    
    // Refresh table
    loadPremiumIds();
  } catch (e) {
    toast('Error: ' + e.message, true);
  }
};

function generateRandomId() {
  // Removed confusing characters like I, 1, O, 0 for better readability
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sendTelegramNotification(data) {
  // ⚠️ SECURITY WARNING: Replace these with your actual Bot Token and Chat ID.
  // For better security, consider using a backend Cloud Function instead of client-side.
  const botToken = "8915689423:AAEX8Pu-tO6uwoeJJhwxwt9VQjb6bPP_6J0"; 
  const chatId = "8894629015"; 
  
  const message = `🎉 *New Premium ID Generated!*%0A%0A🆔 *ID:* \`${data.premiumId}\`%0A👤 *Name:* ${data.name}%0A📱 *Phone:* ${data.phone}%0A🎂 *Age:* ${data.age}%0A📅 *Date:* ${new Date().toLocaleString()}`;
  
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=Markdown`);
  } catch (error) {
    console.error("Telegram notification failed:", error);
  }
}

async function loadPremiumIds() {
  const tbody = document.querySelector('#premiumIdsTable tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
  
  try {
    const snap = await getDocs(query(collection(db, 'premium_ids'), orderBy('createdAt', 'desc')));
    tbody.innerHTML = '';
    
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No Premium IDs generated yet.</td></tr>';
      return;
    }
    
    snap.docs.forEach(d => {
      const p = d.data();
      const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : 'Just now';
      const statusBadge = p.isActive 
        ? `<span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">● Active</span>` 
        : `<span style="background:#fee2e2; color:#991b1b; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">○ Disabled</span>`;
      
      const actionBtn = p.isActive
        ? `<button class="icon-btn danger" onclick="togglePremiumStatus('${d.id}', false)" title="Disable ID"><i class="fa-solid fa-ban"></i></button>`
        : `<button class="icon-btn" onclick="togglePremiumStatus('${d.id}', true)" title="Enable ID" style="color: #166534;"><i class="fa-solid fa-check"></i></button>`;
        
      tbody.innerHTML += `<tr>
        <td style="font-family:monospace; font-weight:700; color:var(--teal-dark); letter-spacing:1px;">${p.premiumId}</td>
        <td>${p.name}</td>
        <td>${p.phone}</td>
        <td>${p.age}</td>
        <td style="font-size:0.85rem;">${date}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>`;
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#dc2626;">Error loading Premium IDs.</td></tr>`;
  }
}

window.togglePremiumStatus = async (docId, newStatus) => {
  try {
    await updateDoc(doc(db, 'premium_ids', docId), { isActive: newStatus });
    toast(`Premium ID ${newStatus ? 'enabled' : 'disabled'} successfully`);
    loadPremiumIds();
  } catch (e) {
    toast('Error updating status: ' + e.message, true);
  }
};
