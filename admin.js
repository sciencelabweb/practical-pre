// admin.js
import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc, updateDoc,
  query, orderBy, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const PRACTICALS = [
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

// ============ AUTH ============
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

window.adminLogout = async () => { await signOut(auth); };

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminLayout').classList.add('active');
    document.getElementById('adminEmail').textContent = user.email;
    initDashboard();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminLayout').classList.remove('active');
  }
});

// ============ NAVIGATION ============
window.switchSection = (id, el) => {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  el.classList.add('active');
  const titles = { dashboard: 'Dashboard Overview', ads: 'Popup Ads Manager', feedbacks: 'User Feedbacks', analytics: 'Views Analytics', youtube: 'YouTube Video Guides' };
  document.getElementById('sectionTitle').textContent = titles[id];
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
      <p>📝 ${a.description || 'No description'}</p>
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
  toast('Generating PDF...'); const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(document.getElementById('chartExportArea'), { scale: 2, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF('l', 'mm', 'a4'); const pdfW = pdf.internal.pageSize.getWidth(); const pdfH = (canvas.height * pdfW) / canvas.width;
  pdf.setFillColor(23, 125, 129); pdf.rect(0, 0, pdfW, 15, 'F'); pdf.setTextColor(255); pdf.setFontSize(14); pdf.setFont(undefined, 'bold'); pdf.text('ScienceLab - Views Analytics Report', 10, 10);
  pdf.setFontSize(9); pdf.setFont(undefined, 'normal'); pdf.text(`Generated: ${new Date().toLocaleString()} | By Hexa Solutions`, pdfW - 10, 10, { align: 'right' });
  pdf.addImage(imgData, 'PNG', 5, 20, pdfW - 10, pdfH - 10); pdf.save(`ScienceLab_Analytics_${new Date().toISOString().split('T')[0]}.pdf`); toast('PDF downloaded');
};

// ============ YOUTUBE GUIDES ============
window.saveYouTubeGuide = async () => {
  const practicalId = document.getElementById('ytPractical').value, url = document.getElementById('ytUrl').value.trim(), title = document.getElementById('ytTitle').value.trim();
  if (!url) return toast('Please enter YouTube URL', true);
  const p = PRACTICALS.find(x => x.id === practicalId);
  try {
    const q = query(collection(db, 'youtubeGuides'), where('practicalId', '==', practicalId)); const existing = await getDocs(q);
    if (!existing.empty) { await updateDoc(doc(db, 'youtubeGuides', existing.docs[0].id), { youtubeUrl: url, title: title || p.name, updatedAt: serverTimestamp() }); toast('Guide updated'); } 
    else { await addDoc(collection(db, 'youtubeGuides'), { practicalId, practicalName: p.name, youtubeUrl: url, title: title || p.name, createdAt: serverTimestamp() }); toast('Guide added'); }
    document.getElementById('ytUrl').value = ''; document.getElementById('ytTitle').value = ''; loadYouTubeGuides(); loadStats();
  } catch (e) { toast('Error: ' + e.message, true); }
};
async function loadYouTubeGuides() {
  const snap = await getDocs(collection(db, 'youtubeGuides')); const list = document.getElementById('ytList');
  if (snap.empty) { list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No guides yet</p>'; return; }
  list.innerHTML = '';
  snap.docs.forEach(d => {
    const g = d.data(); const ytId = g.youtubeUrl.match(/(?:v=|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]; const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : 'https://via.placeholder.com/120x70';
    list.innerHTML += `<div class="list-item"><img class="thumb" src="${thumb}" style="width:120px; height:70px;"><div class="info"><h4>${g.practicalName}</h4><p>📹 ${g.title || 'Untitled'}</p><p>🔗 ${g.youtubeUrl}</p></div><div class="actions"><a href="${g.youtubeUrl}" target="_blank" class="icon-btn"><i class="fa-solid fa-play"></i></a><button class="icon-btn danger" onclick="deleteGuide('${d.id}')"><i class="fa-solid fa-trash"></i></button></div></div>`;
  });
}
window.deleteGuide = async (id) => { if (!confirm('Delete?')) return; await deleteDoc(doc(db, 'youtubeGuides', id)); toast('Deleted'); loadYouTubeGuides(); loadStats(); };
