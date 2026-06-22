registerModule('dashboard', function() {
  const page = document.getElementById('page-dashboard');

  function render() {
    const hour = ts().getHours();
    let salam = 'Selamat pagi';
    if (hour >= 11 && hour < 15) salam = 'Selamat siang';
    else if (hour >= 15 && hour < 18) salam = 'Selamat sore';
    else if (hour >= 18 || hour < 5) salam = 'Selamat malam';
    
    const dn = userData.namaTampilan || 'User';
    let html = `
      <div class="welcome-bar">
        <h2>${salam}, ${dn}</h2>
        <p>${ts().toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
      </div>`;

    if (userRole === 'klinik') html += renderKlinik();
    else if (userRole === 'apotek') html += renderApotek();
    else html += renderAdmin();

    page.innerHTML = html;

    // Bind quick actions
    page.querySelectorAll('.qa-card[data-nav]').forEach(c => {
      c.addEventListener('click', () => navigateTo(c.dataset.nav));
    });

    // Load stats async
    loadStats();
  }

  function renderKlinik() {
    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="s-label">Rawat Hari Ini</div><div class="s-value purple" id="ds-rawatToday">0</div></div>
        <div class="stat-card"><div class="s-label">Menunggu Obat</div><div class="s-value yellow" id="ds-rawatPending">0</div></div>
      </div>
      <div class="section-title"><i class="fas fa-bolt"></i> Aksi Cepat</div>
      <div class="quick-actions">
        <div class="qa-card" data-nav="rawat"><i class="fas fa-stethoscope"></i><span>Rawat Jalan</span></div>
        <div class="qa-card" data-nav="pasien"><i class="fas fa-user-plus"></i><span>Data Pasien</span></div>
      </div>`;
  }

  function renderApotek() {
    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="s-label">Transaksi Hari Ini</div><div class="s-value green" id="ds-trxToday">0</div></div>
        <div class="stat-card"><div class="s-label">Pendapatan Hari Ini</div><div class="s-value yellow" id="ds-revToday">Rp 0</div></div>
        <div class="stat-card"><div class="s-label">Stok Menipis</div><div class="s-value red" id="ds-lowStock">0</div></div>
      </div>
      <div class="section-title"><i class="fas fa-bolt"></i> Aksi Cepat</div>
      <div class="quick-actions">
        <div class="qa-card" data-nav="transaksi"><i class="fas fa-plus-circle"></i><span>Transaksi Baru</span></div>
        <div class="qa-card" data-nav="obat"><i class="fas fa-pills"></i><span>Stok Obat</span></div>
        <div class="qa-card" data-nav="pembelian"><i class="fas fa-truck"></i><span>Input Pembelian</span></div>
      </div>
      <div class="section-title"><i class="fas fa-clock"></i> Rawat Menunggu Obat</div>
      <div id="ds-pendingList"><div class="empty-state"><i class="fas fa-check-circle"></i><p>Tidak ada</p></div></div>`;
  }

  function renderAdmin() {
    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="s-label">Transaksi Hari Ini</div><div class="s-value green" id="ds-trxToday">0</div></div>
        <div class="stat-card"><div class="s-label">Pendapatan Hari Ini</div><div class="s-value yellow" id="ds-revToday">Rp 0</div></div>
        <div class="stat-card"><div class="s-label">Stok Menipis</div><div class="s-value red" id="ds-lowStock">0</div></div>
        <div class="stat-card"><div class="s-label">Nilai Persediaan</div><div class="s-value blue" id="ds-persediaan">Rp 0</div></div>
      </div>
      <div class="section-title"><i class="fas fa-bolt"></i> Aksi Cepat</div>
      <div class="quick-actions">
        <div class="qa-card" data-nav="transaksi"><i class="fas fa-plus-circle"></i><span>Transaksi Baru</span></div>
        <div class="qa-card" data-nav="rawat"><i class="fas fa-stethoscope"></i><span>Rawat Jalan</span></div>
        <div class="qa-card" data-nav="obat"><i class="fas fa-pills"></i><span>Stok Obat</span></div>
        <div class="qa-card" data-nav="karyawan"><i class="fas fa-users"></i><span>Karyawan</span></div>
      </div>
      <div class="section-title"><i class="fas fa-tasks"></i> Checklist</div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:8px 20px;">
        <ul class="checklist" id="ds-checklist">
          <li id="ck-config"><div class="ck-box"><i class="fas fa-check"></i></div><span>Lengkapi Pengaturan</span></li>
          <li id="ck-obat"><div class="ck-box"><i class="fas fa-check"></i></div><span>Input Data Obat</span></li>
          <li id="ck-karyawan"><div class="ck-box"><i class="fas fa-check"></i></div><span>Daftarkan Karyawan</span></li>
          <li id="ck-trx"><div class="ck-box"><i class="fas fa-check"></i></div><span>Transaksi Pertama</span></li>
        </ul>
      </div>
      <div class="section-title"><i class="fas fa-clock"></i> Menunggu Approval</div>
      <div id="ds-approvalList"><div class="empty-state"><i class="fas fa-check-circle"></i><p>Tidak ada</p></div></div>`;
  }

  async function loadStats() {
    const today = new Date(); today.setHours(0,0,0,0);

    // 1. Rawat Jalan Stats (Hanya query status pending, sangat ringan)
    try {
      const rjPending = await db.collection('rawat_jalan').where('status','==','menunggu_obat').get();
      const elRP = document.getElementById('ds-rawatPending'); 
      if(elRP) elRP.textContent = rjPending.size;
      
      const pendingList = document.getElementById('ds-pendingList');
      if(pendingList && rjPending.size > 0) {
        pendingList.innerHTML = rjPending.docs.map(d => {
          const r = d.data();
          return `<div class="rawat-pending"><div class="rp-head"><span class="rp-pasien">${r.pasienNama||'-'}</span><span class="rp-nomor">${r.nomor||'-'}</span><span class="pill pill-menunggu">Menunggu</span></div></div>`;
        }).join('');
      }
    } catch(e) {}

    // 2. Transaksi Hari Ini (Apotek & Admin)
    if (userRole === 'apotek' || userRole === 'admin') {
      try {
        const trxToday = await db.collection('transaksi').where('tanggal','>=',today).get();
        let rev = 0;
        trxToday.docs.forEach(d => rev += d.data().totalAkhir || 0);
        const elT = document.getElementById('ds-trxToday'); if(elT) elT.textContent = trxToday.size;
        const elR = document.getElementById('ds-revToday'); if(elR) elR.textContent = 'Rp ' + fmt(rev);
      } catch(e) {}
    }

    // 3. Admin Checklist & Stok Obat (Menggunakan Cache Global 0 Reads!)
    const obatList = window._obatList || [];
    const low = obatList.filter(d => (d.stock||0) <= (d.minStock||0));
    const elL = document.getElementById('ds-lowStock'); 
    if(elL) elL.textContent = low.length;

    if (userRole === 'admin') {
      const nilai = obatList.reduce((s,d) => s + ((d.stock||0)*(d.hargaBeli||0)), 0);
      const elP = document.getElementById('ds-persediaan'); if(elP) elP.textContent = 'Rp ' + fmt(nilai);
      
      try {
        document.getElementById('ck-config').classList.toggle('done', C.namaApotek !== 'Apotek Aulia' || C.alamat !== '');
        document.getElementById('ck-obat').classList.toggle('done', obatList.length > 0);
        
        const karSnap = await db.collection('karyawan').limit(1).get();
        document.getElementById('ck-karyawan').classList.toggle('done', !karSnap.empty);
        
        const trxSnap = await db.collection('transaksi').limit(1).get();
        document.getElementById('ck-trx').classList.toggle('done', !trxSnap.empty);
      } catch(e) {}
    }
  }

  const obs = new MutationObserver(() => { 
    if (page.classList.contains('active')) render(); 
  });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
