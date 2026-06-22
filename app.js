// ================================================================
//  FIREBASE CONFIG
// ================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCGNs3OW1e6L33-qxbjGViN97buL1l09dM",
  authDomain: "apotek-aulia.firebaseapp.com",
  projectId: "apotek-aulia",
  storageBucket: "apotek-aulia.firebasestorage.app",
  messagingSenderId: "901043246916",
  appId: "1:901043246916:web:783c348954e1b2754b6911",
  measurementId: "G-K49KZ7FED2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

// ================================================================
//  GLOBAL STATE
// ================================================================
let C = {}; // Config dari pengaturan
let currentUser = null;
let userRole = 'admin';
let userData = {};

const PAGE_TITLES = {
  dashboard: 'Dashboard', rawat: 'Rawat Jalan', pasien: 'Pasien', obat: 'Obat & Stock',
  transaksi: 'Transaksi', pembelian: 'Pembelian', 'stock-opname': 'Stock Opname',
  hutang: 'Hutang Usaha', piutang: 'Piutang Karyawan', pengeluaran: 'Pengeluaran',
  karyawan: 'Karyawan', payroll: 'Payroll', laporan: 'Laporan', pengaturan: 'Pengaturan'
};

// Module registry
const Modules = {};
function registerModule(name, initFn) { Modules[name] = initFn; }
function initModules() { 
  Object.entries(Modules).forEach(([name, fn]) => { 
    try { fn(); } catch(e) { console.error(`Module error [${name}]:`, e); } 
  }); 
}

// ================================================================
//  UTILITAS
// ================================================================
function toast(m, t = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${t}`;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  el.innerHTML = `<i class="fas ${icons[t] || icons.info}"></i> ${m}`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3500);
}

function fmt(n) { return new Intl.NumberFormat('id-ID').format(n || 0); }

function fmtDate(d) { 
  if (!d) return '-'; 
  const dt = d.toDate ? d.toDate() : new Date(d); 
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); 
}

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function setSel(id, v) { 
  const s = document.getElementById(id); 
  if (!s || !v) return; 
  for (let i = 0; i < s.options.length; i++) { 
    if (s.options[i].value === v) { s.selectedIndex = i; return; } 
  } 
}

function hitungPembulatan(sub) { 
  if (sub <= 0) return 0; 
  return Math.ceil(sub / 1000) * 1000 - sub; 
}

function escAttr(s) { return String(s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function now() { return firebase.firestore.FieldValue.serverTimestamp(); }
function ts() { return new Date(); }

// ================================================================
//  ANTI DUPLIKAT NOMOR (TRANSACTION COUNTER)
// ================================================================
async function generateNomor(prefix) {
  const counterRef = db.collection('counters').doc(prefix);
  return db.runTransaction(async transaction => {
    const doc = await transaction.get(counterRef);
    let current = doc.exists ? (doc.data().seq || 0) : 0;
    current++;
    transaction.set(counterRef, { seq: current }, { merge: true });
    const ds = ts().toISOString().slice(0, 10).replace(/-/g, '');
    return prefix + '-' + ds + '-' + String(current).padStart(4, '0');
  });
}

// ================================================================
//  DEFAULT CONFIG (SUDAH DIPERBAIKI TYPO & DITAMBAH TINDAKAN KLINIK)
// ================================================================
const DC = {
  namaApotek: 'Apotek Aulia', alamat: '', telepon: '', marginObatResep: 35,
  jasaResep: 60000, bhDokter: 25000, jdDokter: 1000, bagianKlinikResep: 8000, tuslah: 12000, kasResep: 14000,
  biayaResepLuar: 20000, dokterLuar: 8000, labaLuar: 12000, racikPerItem: 500,
  // Tindakan Klinik
  klinikGula: 15000, klinikAsam: 15000, klinikKolestrol: 30000, klinikNebu: 25000, klinikLainnya: 10000,
  // Tindakan Apotek (Menggunakan 'ng' biar konsisten dengan modul transaksi/payroll)
  gulaTotal: 15000, gulaTindangan: 2000, 
  asamTotal: 15000, asamTindangan: 2000, 
  kolestrolTotal: 30000, kolestrolTindangan: 2000,
  // Payroll
  gajiApoteker: 1500000, gajiA: 1000000, gajiB: 1000000, gajiC: 1000000, gajiD: 1000000,
  persenOmzet: 2.5, transportTotal: 550000
};

// Mapping ID HTML ke Key Config
const CF_MAP = {
  'cfg-nama': 'namaApotek', 'cfg-alamat': 'alamat', 'cfg-telepon': 'telepon', 'cfg-margin': 'marginObatResep',
  'cfg-jasaResep': 'jasaResep', 'cfg-bhDokter': 'bhDokter', 'cfg-jdDokter': 'jdDokter',
  'cfg-bagianKlinik': 'bagianKlinikResep', 'cfg-tuslah': 'tuslah', 'cfg-kasResep': 'kasResep',
  'cfg-biayaResepLuar': 'biayaResepLuar', 'cfg-dokterLuar': 'dokterLuar', 'cfg-labaLuar': 'labaLuar', 'cfg-racik': 'racikPerItem',
  'cfg-klinikGula': 'klinikGula', 'cfg-klinikAsam': 'klinikAsam', 'cfg-klinikKolestrol': 'klinikKolestrol', 'cfg-klinikNebu': 'klinikNebu', 'cfg-klinikLainnya': 'klinikLainnya',
  'cfg-gulaTotal': 'gulaTotal', 'cfg-gulaTindangan': 'gulaTindangan', 
  'cfg-asamTotal': 'asamTotal', 'cfg-asamTindangan': 'asamTindangan', 
  'cfg-kolestrolTotal': 'kolestrolTotal', 'cfg-kolestrolTindangan': 'kolestrolTindangan',
  'cfg-gajiApoteker': 'gajiApoteker', 'cfg-gajiA': 'gajiA', 'cfg-gajiB': 'gajiB', 'cfg-gajiC': 'gajiC', 'cfg-gajiD': 'gajiD',
  'cfg-omzet': 'persenOmzet', 'cfg-transport': 'transportTotal'
};

function configToForm() { for (const [elId, key] of Object.entries(CF_MAP)) { const el = document.getElementById(elId); if (el) el.value = C[key] ?? ''; } }
function formToConfig() { for (const [elId, key] of Object.entries(CF_MAP)) { const el = document.getElementById(elId); if (el) { const v = el.value.trim(); C[key] = (key === 'namaApotek' || key === 'alamat' || key === 'telepon') ? v : parseFloat(v) || 0; } } }

async function loadConfig() { 
  try { 
    const d = await db.collection('pengaturan').doc('config').get(); 
    C = d.exists ? { ...DC, ...d.data() } : { ...DC }; 
    configToForm(); 
    document.getElementById('sidebarNama').textContent = C.namaApotek || 'Apotek Aulia'; 
    document.title = C.namaApotek || 'Apotek Aulia'; 
  } catch(e) { C = { ...DC }; configToForm(); } 
}

async function saveConfig() { 
  formToConfig(); 
  try { 
    await db.collection('pengaturan').doc('config').set(C, { merge: true }); 
    document.getElementById('sidebarNama').textContent = C.namaApotek || 'Apotek Aulia'; 
    document.title = C.namaApotek || 'Apotek Aulia'; 
    toast('Pengaturan tersimpan', 'success'); 
  } catch(e) { toast('Gagal: ' + e.message, 'error'); } 
}

// ================================================================
//  KEAMANAN AUTH (ANTI HACK)
// ================================================================
async function ensureUser(user) {
  let ud;
  try { const doc = await db.collection('users').doc(user.email).get(); if (doc.exists) ud = doc.data(); } catch(e) {}
  
  if (!ud) {
    // Jika user baru daftar sendiri, WAJIB nonaktif. Admin yang mengaktifkan.
    ud = { email: user.email, role: 'nonaktif', namaTampilan: user.email.split('@')[0], createdAt: now() };
    try { await db.collection('users').doc(user.email).set(ud); } catch(e) {}
    toast('Akun belum diaktifkan. Hubungi Admin.', 'warning');
    auth.signOut();
    return ud;
  }

  if (ud.role === 'nonaktif') {
    toast('Akun dinonaktifkan oleh Admin.', 'error');
    setTimeout(() => auth.signOut(), 1500);
  }
  return ud;
}

// ================================================================
//  LOGIN UI
// ================================================================
const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

loginBtn.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  loginError.style.display = 'none';
  loginBtn.disabled = true; loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';
  auth.signInWithEmailAndPassword(email, pass).catch(err => {
    let msg = 'Login gagal';
    if (err.code === 'auth/user-not-found') msg = 'Email tidak terdaftar';
    else if (err.code === 'auth/wrong-password') msg = 'Password salah';
    else if (err.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan';
    loginError.textContent = msg; loginError.style.display = 'block';
  }).finally(() => { loginBtn.disabled = false; loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk'; });
});

document.getElementById('loginPass').addEventListener('keypress', e => { if (e.key === 'Enter') loginBtn.click(); });
document.getElementById('logoutBtn').addEventListener('click', () => { auth.signOut(); toast('Keluar', 'info'); });

auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    userData = await ensureUser(user);
    userRole = userData.role || 'nonaktif';
    loginScreen.style.display = 'none';
    appShell.style.display = 'block';
    await loadConfig();
    applyRole();
    setTimeout(initModules, 50);
  } else {
    currentUser = null; userRole = 'admin'; userData = {};
    loginScreen.style.display = 'flex';
    appShell.style.display = 'none';
  }
});

// ================================================================
//  ROLE-BASED UI
// ================================================================
function applyRole() {
  document.querySelectorAll('#sidebarNav .nav-section').forEach(sec => {
    let anyVisible = false;
    sec.querySelectorAll('.nav-item').forEach(item => {
      const roles = (item.dataset.roles || '').split(',');
      const show = roles.includes(userRole);
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    sec.style.display = anyVisible ? '' : 'none';
  });

  const firstVisible = document.querySelector('#sidebarNav .nav-item[style=""], #sidebarNav .nav-item:not([style])');
  if (firstVisible) { 
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); 
    firstVisible.classList.add('active'); 
    navigateTo(firstVisible.dataset.page); 
  }

  const dn = userData.namaTampilan || currentUser?.email?.split('@')[0] || 'User';
  document.getElementById('sidebarUser').textContent = dn;
  document.getElementById('sidebarAvatar').textContent = dn.charAt(0).toUpperCase();
  const roleLabels = { klinik: 'Klinik', apotek: 'Apotek', admin: 'Administrator' };
  document.getElementById('sidebarRole').textContent = roleLabels[userRole] || userRole;
  document.getElementById('roleBadge').innerHTML = `<i class="fas fa-shield-alt"></i> ${roleLabels[userRole] || userRole}`;
  updateThemeIcon(localStorage.getItem('apotek-theme') || 'light');
}

// ================================================================
//  NAVIGASI
// ================================================================
function navigateTo(pageId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  const pg = document.getElementById(`page-${pageId}`);
  if (nav) nav.classList.add('active');
  if (pg) pg.classList.add('active');
  document.getElementById('pageTitle').textContent = PAGE_TITLES[pageId] || 'Dashboard';
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  window._currentPage = pageId;
}

document.getElementById('sidebarNav').addEventListener('click', e => {
  const item = e.target.closest('.nav-item');
  if (item && item.dataset.page) navigateTo(item.dataset.page);
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
});

document.getElementById('sidebarOverlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
});

// ================================================================
//  GLOBAL DROPDOWN CLOSE (FIX MEMORY LEAK)
// ================================================================
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) {
    document.querySelectorAll('.search-dropdown.show').forEach(d => d.classList.remove('show'));
  }
});

// ================================================================
//  CONNECTION STATUS
// ================================================================
function updateConn() {
  const b = document.getElementById('connBadge'), t = document.getElementById('connText');
  if (navigator.onLine) { b.className = 'conn-badge online'; t.textContent = 'Online'; }
  else { b.className = 'conn-badge offline'; t.textContent = 'Offline'; }
}
window.addEventListener('online', () => { updateConn(); toast('Kembali online', 'success'); });
window.addEventListener('offline', () => { updateConn(); toast('Offline — data tersimpan lokal', 'warning'); });
updateConn();

// ================================================================
//  PWA (ASLI - BUKAN BLOB)
// ================================================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW Failed:', err));
}

// ================================================================
//  THEME TOGGLE (CLEAN CODE)
// ================================================================
function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

(function() {
  const saved = localStorage.getItem('apotek-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  
  document.addEventListener('click', e => {
    if (e.target.closest('#themeToggle')) {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('apotek-theme', next);
      updateThemeIcon(next);
    }
  });
})();
