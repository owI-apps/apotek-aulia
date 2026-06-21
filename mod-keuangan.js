registerModule('keuangan', function() {
  // ==================== HUTANG USAHA ====================
  const hutangPage = document.getElementById('page-hutang');
  let allHutang = [], allHutangBayar = [];

  function renderHutang() {
    hutangPage.innerHTML = `
      <div class="stats-grid" style="margin-bottom:18px">
        <div class="stat-card"><div class="s-label">Hutang Aktif</div><div class="s-value red" id="htAktif">0</div></div>
        <div class="stat-card"><div class="s-label">Total Hutang</div><div class="s-value yellow" id="htTotal">Rp 0</div></div>
        <div class="stat-card"><div="s-label">Bayar Pending</div><div class="stat-card"><div class="s-label">Bayar Pending</div><div class="s-value purple" id="htPending">0</div></div>
      </div>
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="htSearch" placeholder="Cari supplier, nomor..."></div>
        <select class="filter-select" id="htFilter"><option value="aktif">Aktif</option><option value="lunas">Lunas</option><option value="">Semua</option></select>
        <button class="btn btn-primary btn-sm" id="htBtnBayar" style="width:auto"><i class="fas fa-money-bill-wave"></i> Bayar Hutang</button>
      </div>
      <div id="htList"><div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Memuat...</p></div></div>
      <div class="trx-riwayat" style="margin-top:28px"><div class="section-title"><i class="fas fa-history"></i> Riwayat Pembayaran</div><div id="htBayarList"><div class="empty-state"><i class="fas fa-check-circle"></i><p>Tidak ada riwayat</p></div></div></div>`;

    document.getElementById('htSearch').addEventListener('input', renderHtTable);
    document.getElementById('htFilter').addEventListener('change', renderHtTable);
    document.getElementById('htBtnBayar').addEventListener('click', showBayarModal);
    startHtListener();
    startHtBayarListener();
  }

  function startHtListener() {
    db.collection('hutang_usaha').orderBy('jatuhTempo', 'asc').onSnapshot(snap => {
      allHutang = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHtTable();
      document.getElementById('htAktif').textContent = allHutang.filter(h => h.status === 'aktif').length;
      document.getElementById('htTotal').textContent = 'Rp ' + fmt(allHutang.filter(h => h.status === 'aktif').reduce((s, h) => s + (h.total - (h.sudahBayar || 0)), 0));
      document.getElementById('htPending').textContent = allHutangBayar.filter(b => b.status === 'pending').length;
    });
  }

  function startHtBayarListener() {
    db.collection('hutang_bayar').orderBy('tanggal', 'desc').onSnapshot(snap => {
      allHutangBayar = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHtBayarTable();
    });
  }

  function renderHtTable() {
    const s = (document.getElementById('htSearch').value || '').toLowerCase(), f = document.getElementById('htFilter').value;
    const filtered = allHutang.filter(h => {
      if (f && h.status !== f) return false;
      if (s && !(h.supplier || '').toLowerCase().includes(s) && !(h.nomor || '').toLowerCase().includes(s)) return false;
      return true;
    });
    const el = document.getElementById('htList');
    if (!filtered.length) { el.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Tidak ada data</p></div>`; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>No</th><th>Nomor</th><th>Supplier</th><th>Invoice</th><th class="num">Total</th><th class="num">Sudah Bayar</th><th class="num">Sisa</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${filtered.map((h, i) => {
      const sisa = h.total - (h.sudahBayar || 0);
      return `<tr><td>${i + 1}</td><td style="font-family:var(--mono);font-size:12px;color:var(--accent)">${h.nomor}</td><td>${h.supplier}</td><td style="font-size:12px">${h.noInvoice || '-'}</td><td class="num">Rp ${fmt(h.total)}</td><td class="num">Rp ${fmt(h.sudahBayar || 0)}</td><td class="num" style="color:${sisa > 0 ? 'var(--danger)' : 'var(--accent)'}">Rp ${fmt(sisa)}</td><td style="font-size:12px">${h.jatuhTempo ? new Date(h.jatuhTempo.seconds * 1000).toLocaleDateString('id-ID') : '-'}</td><td><span class="pill pill-${h.status === 'aktif' ? 'pending' : 'approved'}">${h.status === 'aktif' ? 'Aktif' : 'Lunas'}</span></td><td class="actions">${h.status === 'aktif' ? `<button class="btn btn-primary btn-xs" onclick="Keu.bayarHutang('${h.id}',${h.total - (h.sudahBayar || 0)})"><i class="fas fa-money-bill-wave"></i></button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function renderHtBayarTable() {
    const el = document.getElementById('htBayarList');
    if (!allHutangBayar.length) { el.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Tidak ada riwayat</p></div>`; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Nomor Hutang</th><th class="num">Jumlah</th><th>Status</th></tr></thead><tbody>${allHutangBayar.map(b => `<tr><td style="font-size:12px;color:var(--muted)">${fmtDate(b.tanggal)}</td><td style="font-family:var(--mono);font-size:12px">${b.nomor}</td><td class="num">Rp ${fmt(b.jumlah)}</td><td><span class="pill pill-${b.status === 'approved' ? 'approved' : b.status === 'rejected' ? 'rejected' : 'pending'}">${b.status === 'approved' ? 'Disetujui' : b.status === 'rejected' ? 'Ditolak' : 'Pending'}</span></td></tr>`).join('')}</tbody></table></div>`;
  }

  function showBayarModal(hutangId, sisa) {
    const h = allHutang.find(x => x.id === hutangId); if (!h) return;
    const el = document.getElementById('htList');
    el.innerHTML = `<div class="trx-section"><h4><i class="fas fa-money-bill-wave"></i> Bayar Hutang</h4>
      <div class="form-grid">
        <div class="form-group full"><label>${h.nomor} — ${h.supplier}</label><input type="text" value="Sisa: Rp ${fmt(sisa)}" readonly style="color:var(--danger);font-weight:700"></div>
        <div class="form-group"><label>Jumlah Bayar (Rp)</label><input type="number" id="htJumlah" value="${sisa}" max="${sisa}" min="1"></div>
        <div class="form-group"><label>Keterangan</label><input type="text" id="htKet" placeholder="Opsional"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Keu.renderHtTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="htBayarBtn" style="width:auto;min-width:140px"><i class="fas fa-paper-plane"></i> Ajukan Pembayaran</button></div>
    </div>`;

    document.getElementById('htBayarBtn').addEventListener('click', async () => {
      const jumlah = parseInt(document.getElementById('htJumlah').value) || 0;
      if (jumlah <= 0 || jumlah > sisa) { toast('Jumlah tidak valid', 'error'); return; }
      const ds = ts().toISOString().slice(0, 10).replace(/-/g, '');
      const snap = await db.collection('hutang_bayar').where('nomor', '>=', 'HB-' + ds).where('nomor', '<', 'HB-' + ds + 'Z').orderBy('nomor', 'desc').limit(1).get();
      const lastNum = snap.empty ? 0 : parseInt(snap.docs[0].data().nomor.slice(-4)) || 0;
      try {
        await db.collection('hutang_bayar').add({ nomor: 'HB-' + ds + '-' + String(lastNum + 1).padStart(4, '0'), hutangId: h.id, nomorHutang: h.nomor, jumlah, keterangan: document.getElementById('htKet').value.trim(), tanggal: now(), status: 'pending', karyawanId: currentUser?.email || '' });
        toast('Pembayaran diajukan — menunggu approval', 'success');
        renderHtTable();
      } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  async function approveHtBayar(id) {
    if (!confirm('Setujui pembayaran ini?')) return;
    const b = allHutangBayar.find(x => x.id === id); if (!b) return;
    try {
      const batch = db.batch();
      batch.update(db.collection('hutang_bayar').doc(id), { status: 'approved', approvedBy: currentUser?.email || '' });
      const sisa = (allHutang.find(h => h.id === b.hutangId)?.total || 0) - (allHutang.find(h => h.id === b.hutangId)?.sudahBayar || 0);
      batch.update(db.collection('hutang_usaha').doc(b.hutangId), { sudahBayar: firebase.firestore.FieldValue.increment(b.jumlah) });
      if (b.jumlah >= sisa) batch.update(db.collection('hutang_usaha').doc(b.hutangId), { status: 'lunas' });
      await batch.commit(); toast('Pembayaran disetujui', 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  }

  async function rejectHtBayar(id) { if (!confirm('Tolak pembayaran?')) return; try { await db.collection('hutang_bayar').doc(id).update({ status: 'rejected', rejectedBy: currentUser?.email || '' }); toast('Ditolak', 'warning'); } catch (e) { toast('Gagal: ' + e.message, 'error'); } }
  window.Keu = { bayarHutang: showBayarModal, approveHtBayar, rejectHtBayar, renderHtTable };

  // ==================== PIUTANG KARYAWAN ====================
  const piutangPage = document.getElementById('page-piutang');
  let allPiutang = [];

  function renderPiutang() {
    piutangPage.innerHTML = `
      <div class="stats-grid" style="margin-bottom:18px">
        <div class="stat-card"><div class="s-label">Piutang Aktif</div><div class="s-value red" id="ptAktif">0</div></div>
        <div class="stat-card"><div class="s-label">Total Piutang</div><div class="s-value yellow" id="ptTotal">Rp 0</div></div>
        <div class="stat-card"><div class="s-label">Bayar Pending</div><div class="s-value purple" id="ptPending">0</div></div>
      </div>
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="ptSearch" placeholder="Cari karyawan, keterangan..."></div>
        <select class="filter-select" id="ptFilter"><option value="aktif">Aktif</option><option value="lunas">Lunas</option><option value="">Semua</option></select>
        <button class="btn btn-primary btn-sm" id="ptBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Input Piutang</button>
      </div>
      <div id="ptList"><div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>Memuat...</p></div></div>`;

    document.getElementById('ptSearch').addEventListener('input', renderPtTable);
    document.getElementById('ptFilter').addEventListener('change', renderPtTable);
    document.getElementById('ptBtnAdd').addEventListener('click', showAddPiutang);
    startPtListener();
  }

  function startPtListener() {
    db.collection('piutang_karyawan').orderBy('tanggal', 'desc').onSnapshot(snap => {
      allPiutang = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderPtTable();
      document.getElementById('ptAktif').textContent = allPiutang.filter(p => p.status === 'aktif').length;
      document.getElementById('ptTotal').textContent = 'Rp ' + fmt(allPiutang.filter(p => p.status === 'aktif').reduce((s, p) => s + (p.jumlah - (p.sudahBayar || 0)), 0));
      document.getElementById('ptPending').textContent = allPiutang.filter(p => (p.status === 'aktif') && (p.bayarList || []).filter(b => b.status === 'pending').length).length;
    });
  }

  function renderPtTable() {
    const s = (document.getElementById('ptSearch').value || '').toLowerCase(), f = document.getElementById('ptFilter').value;
    const filtered = allPiutang.filter(p => { if (f && p.status !== f) return false; if (s && !(p.karyawanNama || '').toLowerCase().includes(s) && !(p.keterangan || '').toLowerCase().includes(s)) return false; return true; });
    const el = document.getElementById('ptList');
    if (!filtered.length) { el.innerHTML = `<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>Tidak ada data</p></div>`; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>No</th><th>Karyawan</th><th>Keterangan</th><th class="num">Jumlah</th><th class="num">Sudah Bayar</th><th class="num">Sisa</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${filtered.map((p, i) => {
      const sisa = p.jumlah - (p.sudahBayar || 0);
      return `<tr><td>${i + 1}</td><td style="font-weight:500">${p.karyawanNama || '-'}</td><td style="font-size:12px;color:var(--muted)">${p.keterangan || '-'}</td><td class="num">Rp ${fmt(p.jumlah)}</td><td class="num">Rp ${fmt(p.sudahBayar || 0)}</td><td class="num" style="color:${sisa > 0 ? 'var(--danger)' : 'var(--accent)'}">Rp ${fmt(sisa)}</td><td style="font-size:12px;color:var(--muted)">${fmtDate(p.tanggal)}</td><td><span class="pill pill-${p.status === 'aktif' ? 'pending' : 'approved'}">${p.status === 'aktif' ? 'Aktif' : 'Lunas'}</span></td><td class="actions">${p.status === 'aktif' ? `<button class="btn btn-primary btn-xs" onclick="Keu.bayarPiutang('${p.id}',${sisa})"><i class="fas fa-money-bill-wave"></i></button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function showAddPiutang() {
    const el = document.getElementById('ptList');
    el.innerHTML = `<div class="trx-section"><h4><i class="fas fa-hand-holding-usd"></i> Input Piutang Karyawan</h4>
      <div class="form-grid">
        <div class="form-group full"><label>Nama Karyawan *</label><input type="text" id="ptNama" placeholder="Nama karyawan"></div>
        <div class="form-group"><label>Jumlah Pinjaman (Rp) *</label><input type="number" id="ptJumlah" min="1000" step="1000"></div>
        <div class="form-group full"><label>Keterangan</label><input type="text" id="ptKet" placeholder="Alasan pinjaman"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Keu.renderPtTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="ptSaveBtn" style="width:auto;min-width:140px"><i class="fas fa-paper-plane"></i> Ajukan</button></div>
    </div>`;
    document.getElementById('ptSaveBtn').addEventListener('click', async () => {
      const nama = document.getElementById('ptNama').value.trim(), jumlah = parseInt(document.getElementById('ptJumlah').value) || 0;
      if (!nama) { toast('Nama wajib', 'error'); return; }
      if (jumlah <= 0) { toast('Jumlah harus > 0', 'error'); return; }
      try {
        await db.collection('piutang_karyawan').add({ karyawanNama: nama, jumlah, keterangan: document.getElementById('ptKet').value.trim(), sudahBayar: 0, status: 'pending', tanggal: now(), karyawanId: currentUser?.email || '' });
        toast('Piutang diajukan — menunggu approval', 'success');
        renderPtTable();
      } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  function bayarPiutang(id, sisa) {
    const p = allPiutang.find(x => x.id === id); if (!p) return;
    const el = document.getElementById('ptList');
    el.innerHTML = `<div class="trx-section"><h4><i class="fas fa-money-bill-wave"></i> Bayar Piutang</h4>
      <div class="form-grid">
        <div class="form-group full"><label>${p.karyawanNama} — Sisa: Rp ${fmt(sisa)}</label><input type="text" value="Rp ${fmt(sisa)}" readonly style="color:var(--danger);font-weight:700"></div>
        <div class="form-group"><label>Jumlah Bayar (Rp)</label><input type="number" id="ptBayarJumlah" value="${sisa}" max="${sisa}" min="1"></div>
        <div class="form-group"><label>Keterangan</label><input type="text" id="ptBayarKet" placeholder="Opsional"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Keu.renderPtTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="ptBayarBtn" style="width:auto;min-width:140px"><i class="fas fa-paper-plane"></i> Ajukan Pembayaran</button></div>
    </div>`;
    document.getElementById('ptBayarBtn').addEventListener('click', async () => {
      const jumlah = parseInt(document.getElementById('ptBayarJumlah').value) || 0;
      if (jumlah <= 0 || jumlah > sisa) { toast('Jumlah tidak valid', 'error'); return; }
      try {
        await db.collection('piutang_karyawan').doc(id).collection('pembayaran').add({ jumlah, keterangan: document.getElementById('ptBayarKet').value.trim(), tanggal: now(), status: 'pending', karyawanId: currentUser?.email || '' });
        toast('Pembayaran diajukan', 'success');
        renderPtTable();
      } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  async function approvePtBayar(piutangId, bayarId) {
    if (!confirm('Setujui pembayaran ini?')) return;
    const b = await db.collection('piutang_karyawan').doc(piutangId).collection('pembayaran').doc(bayarId).get();
    if (!b.exists) { toast('Data tidak ditemukan', 'error'); return; }
    const bayarData = b.data();
    try {
      const batch = db.batch();
      batch.update(db.collection('piutang_karyawan').doc(piutangId).collection('pembayaran').doc(bayarId), { status: 'approved', approvedBy: currentUser?.email || '' });
      batch.update(db.collection('piutang_karyawan').doc(piutangId), { sudahBayar: firebase.firestore.FieldValue.increment(bayarData.jumlah) });
      const piutang = allPiutang.find(p => p.id === piutangId);
      if (piutang && bayarData.jumlah >= ((piutang.jumlah || 0) - (piutang.sudahBayar || 0))) {
        batch.update(db.collection('piutang_karyawan').doc(piutangId), { status: 'lunas' });
      }
      await batch.commit(); toast('Pembayaran disetujui', 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  }

  async function rejectPtBayar(piutangId, bayarId) { if (!confirm('Tolak?')) return; try { await db.collection('piutang_karyawan').doc(piutangId).collection('pembayaran').doc(bayarId).update({ status: 'rejected', rejectedBy: currentUser?.email || '' }); toast('Ditolak', 'warning'); } catch (e) { toast('Gagal: ' + e.message, 'error'); } }
  window.Keu.bayarPiutang = bayarPiutang;
  window.Keu.approvePtBayar = approvePtBayar;
  window.Keu.rejectPtBayar = rejectPtBayar;
  window.Keu.renderPtTable = renderPtTable;

  // Init both pages
  const obsHt = new MutationObserver(() => { if (hutangPage.classList.contains('active')) renderHutang(); });
  const obsPt = new MutationObserver(() => { if (piutangPage.classList.contains('active')) renderPiutang(); });
  obsHt.observe(hutangPage, { attributes: true, attributeFilter: ['class'] });
  obsPt.observe(piutangPage, { attributes: true, attributeFilter: ['class'] });
  renderHutang();
  renderPiutang();
});
