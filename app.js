// ================================================================
//  FIREBASE CONFIG — GANTI DENGAN MILIKMU
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
let C = {}; // config dari pengaturan
let currentUser = null;
let userRole = 'admin';
let userData = {};
const PAGE_TITLES = {
  dashboard:'Dashboard', rawat:'Rawat Jalan', pasien:'Pasien', obat:'Obat & Stock',
  transaksi:'Transaksi', pembelian:'Pembelian', 'stock-opname':'Stock Opname',
  hutang:'Hutang Usaha', piutang:'Piutang Karyawan', karyawan:'Karyawan',
  payroll:'Payroll', laporan:'Laporan', pengaturan:'Pengaturan'
};

// Module registry
const Modules = {};
function registerModule(name, initFn) { Modules[name] = initFn; }
function initModules() { Object.values(Modules).forEach(fn => { try { fn(); } catch(e) { console.error(`Module error [${name}]:`, e); } }); }

// ================================================================
//  UTILITAS
// ================================================================
function toast(m, t='info') {
  const el = document.createElement('div');
  el.className = `toast ${t}`;
  const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
  el.innerHTML = `<i class="fas ${icons[t]}"></i> ${m}`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3500);
}
function fmt(n) { return new Intl.NumberFormat('id-ID').format(n || 0); }
function fmtDate(d) { if (!d) return '-'; const dt = d.toDate ? d.toDate() : new Date(d); return dt.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function setSel(id, v) { const s = document.getElementById(id); if (!s || !v) return; for (let i = 0; i < s.options.length; i++) if (s.options[i].value === v) { s.selectedIndex = i; return; } }
function hitungPembulatan(sub) { if (sub <= 0) return 0; return Math.ceil(sub / 1000) * 1000 - sub; }
function hitungSkemaDa(x) { return { apoteker: x*.16, karyawanA: x*.12, karyawanB: x*.12, karyawanC: x*.12, karyawanD: x*.08, thrApotek: x*.20, psa: x*.20 }; }
function escAttr(s) { return String(s||'').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function now() { return firebase.firestore.FieldValue.serverTimestamp(); }
function ts() { return new Date(); }

// ================================================================
//  DEFAULT CONFIG
// ================================================================
const DC = {
  namaApotek:'Apotek Aulia', alamat:'', telepon:'', marginObatResep:35,
  jasaResep:60000, bhDokter:25000, jdDokter:1000, bagianKlinikResep:8000, tuslah:12000, kasResep:14000,
  biayaResepLuar:20000, dokterLuar:8000, labaLuar:12000, racikPerItem:500,
  cek1:2000, cek2:5000,
  gulaTotal:15000, gulaTindakan:2000, asamTotal:15000, asamTindakan:2000,
  kolestrolTotal:30000, kolestrolTindakan:2000,
  gajiApoteker:1500000, gajiA:1000000, gajiB:1000000, gajiC:1000000, gajiD:1000000,
  persenOmzet:2.5, transportTotal:550000
};

// ================================================================
//  CONFIG LOAD/SAVE
// ================================================================
const CF_MAP = {
  'cfg-nama':'namaApotek','cfg-alamat':'alamat','cfg-telepon':'telepon','cfg-margin':'marginObatResep',
  'cfg-jasaResep':'jasaResep','cfg-bhDokter':'bhDokter','cfg-jdDokter':'jdDokter',
  'cfg-bagianKlinik':'bagianKlinikResep','cfg-tuslah':'tuslah','cfg-kasResep':'kasResep',
  'cfg-biayaResepLuar':'biayaResepLuar','cfg-dokterLuar':'dokterLuar','cfg-labaLuar':'labaLuar','cfg-racik':'racikPerItem',
  'cfg-cek1':'cek1','cfg-cek2':'cek2',
  'cfg-gulaTotal':'gulaTotal','cfg-gulaTindangan':'gulaTindangan','cfg-asamTotal':'asamTotal','cfg-asamTindangan':'asamTindangan',
  'cfg-kolestrolTotal':'kolestrolTotal','cfg-kolestrolTindangan':'kolestrolTindangan',
  'cfg-gajiApoteker':'gajiApoteker','cfg-gajiA':'gajiA','cfg-gajiB':'gajiB','cfg-gajiC':'gajiC','cfg-gajiD':'gajiD',
  'cfg-omzet':'persenOmzet','cfg-transport':'transportTotal'
};
function configToForm() { for (const [elId, key] of Object.entries(CF_MAP)) { const el = document.getElementById(elId); if (el) el.value = C[key] ?? ''; } }
function formToConfig() { for (const [elId, key] of Object.entries(CF_MAP)) { const el = document.getElementById(elId); if (el) { const v = el.value.trim(); C[key] = (key==='namaApotek'||key==='alamat'||key==='telepon') ? v : parseFloat(v) || 0; } } }
async function loadConfig() { try { const d = await db.collection('pengaturan').doc('config').get(); if (d.exists) C = { ...DC, ...d.data() }; else C = { ...DC }; configToForm(); document.getElementById('sidebarNama').textContent = C.namaApotek || 'Apotek Aulia'; document.title = C.namaApotek || 'Apotek Aulia'; } catch(e) { C = { ...DC }; configToForm(); } }
async function saveConfig() { formToConfig(); try { await db.collection('pengaturan').doc('config').set(C, { merge: true }); document.getElementById('sidebarNama').textContent = C.namaApotek || 'Apotek Aulia'; document.title = C.namaApotek || 'Apotek Aulia'; toast('Pengaturan tersimpan', 'success'); } catch(e) { toast('Gagal: ' + e.message, 'error'); } }

// ================================================================
//  AUTH & ROLE
// ================================================================
async function ensureUser(user) {
  let ud;
  try { const doc = await db.collection('users').doc(user.email).get(); if (doc.exists) { ud = doc.data(); } } catch(e) {}
  if (!ud) {
    let role = 'apotek';
    if (user.email.includes('pendaftaran')) role = 'klinik';
    else if (user.email.includes('admin')) role = 'admin';
    ud = { email: user.email, role, namaTampilan: user.email.split('@')[0], createdAt: now() };
    try { await db.collection('users').doc(user.email).set(ud); } catch(e) { console.warn('Gagal simpan user record:', e); }
  }
  return ud;
}

const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

loginBtn.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  loginError.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';
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
    userRole = userData.role || 'apotek';
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
  // Filter nav
  document.querySelectorAll('#sidebarNav .nav-section').forEach(sec => {
    const items = sec.querySelectorAll('.nav-item');
    let anyVisible = false;
    items.forEach(item => {
      const roles = (item.dataset.roles || '').split(',');
      const show = roles.includes(userRole);
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    sec.style.display = anyVisible ? '' : 'none';
  });

  // Set active to first visible
  const firstVisible = document.querySelector('#sidebarNav .nav-item[style=""], #sidebarNav .nav-item:not([style])');
  if (firstVisible) { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); firstVisible.classList.add('active'); navigateTo(firstVisible.dataset.page); }

  // User info
  const dn = userData.namaTampilan || currentUser?.email?.split('@')[0] || 'User';
  document.getElementById('sidebarUser').textContent = dn;
  document.getElementById('sidebarAvatar').textContent = dn.charAt(0).toUpperCase();
  const roleLabels = { klinik: 'Klinik', apotek: 'Apotek', admin: 'Administrator' };
  document.getElementById('sidebarRole').textContent = roleLabels[userRole] || userRole;
  document.getElementById('roleBadge').innerHTML = `<i class="fas fa-shield-alt"></i> ${roleLabels[userRole] || userRole}`;
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
//  PWA
// ================================================================
if ('serviceWorker' in navigator) {
  const sw = `const C='apotek-v4';self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['/'])))});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))))});self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.status===200&&res.type==='basic')caches.open(C).then(c=>c.put(e.request,res.clone()));return res}).catch(()=>caches.match('/'))))});`;
  navigator.serviceWorker.register(URL.createObjectURL(new Blob([sw], { type: 'application/javascript' }))).catch(() => {});
}
