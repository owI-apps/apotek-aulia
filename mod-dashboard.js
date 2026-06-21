registerModule('dashboard', function() {
  const page = document.getElementById('page-dashboard');
  let unsubscribes = [];

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
        <p>${ts().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
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
        <div class="stat-card"><div class="s-label">Total Rawat Bulan Ini</div><div class="s-value blue" id="ds-rawatMonth">0</div></div>
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
        <div class="stat-card"><div class="s-label">Menunggu Obat</div><div class="s-value purple" id="ds-rawatPending">0</div></div>
      </div>
      <div class="section-title"><i class="fas fa-bolt"></i> Aksi Cepat</div>
      <div class="quick-actions">
        <div class="qa-card" data-nav="transaksi"><i class="fas fa-plus-circle"></i><span>Transaksi Baru</span></div>
        <div class="qa-card" data-nav="obat"><i class="fas fa-pills"></i><span>Stok Obat</span></div>
        <div class="qa-card" data-nav="pembelian"><i class="fas fa-truck"></i><span>Input Pembelian</span></div>
        <div class="qa-card" data-nav="stock-opname"><i class="fas fa-clipboard-check"></i><span>Stock Opname</span></div>
      </div>
      <div class="section-title"><i class="fas fa-clock"></i> Rawat Menunggu Obat</div>
      <div id="ds-pendingList"><div class="empty-state"><i class="fas fa-check-circle"></i><p>Tidak ada rawat yang menunggu</p></div></div>`;
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
      <div id="ds-approvalList"><div class="empty-state"><i class="fas fa-check-circle"></i><p>Tidak ada yang menunggu approval</p></div></div>`;
  }

  async function loadStats() {
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Rawat jalan stats
    try {
      const rjToday = await db.collection('rawat_jalan').where('tanggal','>=',today).get();
      const rjPending = await db.collection('rawat_jalan').where('status','==','menunggu_obat').get();
      const rjMonth = await db.collection('rawat_jalan').where('tanggal','>=',monthStart).get();
      const elRT = document.getElementById('ds-rawatToday');
      const elRP = document.getElementById('ds-rawatPending');
      const elRM = document.getElementById('ds-rawatMonth');
      if (elRT) elRT.textContent = rjToday.size;
      if (elRP) elRP.textContent = rjPending.size;
      if (elRM) elRM.textContent = rjMonth.size;

      // Pending list for apotek/admin
      const pendingList = document.getElementById('ds-pendingList');
      if (pendingList && rjPending.size > 0) {
        pendingList.innerHTML = rjPending.docs.map(d => {
          const r = d.data();
          const tindakan = [];
          if (r.tindakan) { if (r.tindakan.cek1) tindakan.push('Cek1'); if (r.tindakan.cek2) tindakan.push('Cek2'); if (r.tindakan.konsultasi) tindakan.push('Konsultasi'); }
          return `<div class="rawat-pending"><div class="rp-head"><span class="rp-pasien">${r.pasienNama||'-'}</span><span class="rp-nomor">${r.nomor||'-'}</span><span class="pill pill-menunggu">Menunggu</span></div><div class="rp-detail"><span><i class="fas fa-stethoscope"></i> ${tindakan.join(', ')||'-'}</span><span><i class="fas fa-clock"></i> ${fmtDate(r.tanggal)}</span></div></div>`;
        }).join('');
      }
    } catch(e) {}

    // Apotek/Admin stats
    if (userRole === 'apotek' || userRole === 'admin') {
      try {
        const trxToday = await db.collection('transaksi').where('tanggal','>=',today).get();
        let rev = 0;
        trxToday.docs.forEach(d => rev += d.data().totalAkhir || 0);
        const elT = document.getElementById('ds-trxToday');
        const elR = document.getElementById('ds-revToday');
        if (elT) elT.textContent = trxToday.size;
        if (elR) elR.textContent = 'Rp ' + fmt(rev);
      } catch(e) {}
    }

    // Admin checklist + approvals
    if (userRole === 'admin') {
      try {
        document.getElementById('ck-config').classList.toggle('done', C.namaApotek !== 'Apotek Aulia' || C.alamat !== '');
        const obSnap = await db.collection('obat').limit(1).get();
        document.getElementById('ck-obat').classList.toggle('done', !obSnap.empty);
        const karSnap = await db.collection('karyawan').limit(1).get();
        document.getElementById('ck-karyawan').classList.toggle('done', !karSnap.empty);
        const trxSnap = await db.collection('transaksi').limit(1).get();
        document.getElementById('ck-trx').classList.toggle('done', !trxSnap.empty);

        // Approval list
        const approvals = [];
        const [pembelian, opname, hutangBayar, piutang] = await Promise.all([
          db.collection('pembelian').where('status','==','pending').get(),
          db.collection('stock_opname').where('status','==','pending').get(),
          db.collection('hutang_bayar').where('status','==','pending').get(),
          db.collection('piutang_karyawan').where('status','==','pending').get()
        ]);
        pembelian.docs.forEach(d => approvals.push({ type:'Pembelian', id:d.id, data:d.data() }));
        opname.docs.forEach(d => approvals.push({ type:'Stock Opname', id:d.id, data:d.data() }));
        hutangBayar.docs.forEach(d => approvals.push({ type:'Bayar Hutang', id:d.id, data:d.data() }));
        piutang.docs.forEach(d => approvals.push({ type:'Piutang Karyawan', id:d.id, data:d.data() }));

        const alEl = document.getElementById('ds-approvalList');
        if (alEl && approvals.length > 0) {
          alEl.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Tipe</th><th>Nomor</th><th>Nilai</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>${approvals.map(a => `<tr><td>${a.type}</td><td style="font-family:var(--mono);font-size:12px">${a.data.nomor||'-'}</td><td class="num">${a.data.total? 'Rp '+fmt(a.data.total) : a.data.jumlah? fmt(a.data.jumlah) : '-'}</td><td style="font-size:12px;color:var(--muted)">${fmtDate(a.data.tanggal)}</td><td><span class="pill pill-pending">Pending</span></td></tr>`).join('')}</tbody></table></div>`;
        }
      } catch(e) {}
    }

    // Low stock
    try {
      const obatSnap = await db.collection('obat').get();
      const low = obatSnap.docs.filter(d => (d.data().stock||0) <= (d.data().minStock||0));
      const elL = document.getElementById('ds-lowStock');
      if (elL) elL.textContent = low.length;

      if (userRole === 'admin') {
        const nilai = obatSnap.docs.reduce((s,d) => s + ((d.data().stock||0)*(d.data().hargaBeli||0)), 0);
        const elP = document.getElementById('ds-persediaan');
        if (elP) elP.textContent = 'Rp ' + fmt(nilai);
      }
    } catch(e) {}
  }

  // Listen for page changes
  const obs = new MutationObserver(() => {
    if (document.getElementById('page-dashboard').classList.contains('active')) render();
  });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
