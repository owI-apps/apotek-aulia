registerModule('inventory', function() {
  var page = document.getElementById('page-stock-opname');
  var isAdmin = userRole === 'admin';
  var pendingPage = document.getElementById('page-pembelian');

  // ==================== PEMBELIAN ====================
  function renderPembelian() {
    pendingPage.innerHTML = '<div class="stats-grid" style="margin-bottom:18px"><div class="stat-card"><div class="s-label">Pending Approval</div><div class="s-value yellow" id="pbPending">0</div></div><div class="stat-card"><div class="s-label">Disetujui Bulan Ini</div><div class="s-value green" id="pbApproved">0</div></div><div class="stat-card"><div class="s-label">Ditolak</div><div class="s-value red" id="pbRejected">0</div></div></div><div class="obat-toolbar"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="pbSearch" placeholder="Cari nomor, supplier..."></div><select class="filter-select" id="pbFilter"><option value="">Semua</option><option value="pending">Pending</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option></select>' + (userRole !== 'admin' ? '<button class="btn btn-primary btn-sm" id="pbBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Input Pembelian</button>' : '') + '</div><div id="pbList"><div class="empty-state"><i class="fas fa-truck"></i><p>Memuat...</p></div></div>';

    document.getElementById('pbSearch').addEventListener('input', renderPbTable);
    document.getElementById('pbFilter').addEventListener('change', renderPbTable);
    if (userRole !== 'admin') document.getElementById('pbBtnAdd').addEventListener('click', showAddPembelian);
    startPbListener();
  }

  var allPb = [], pbItems = [];

  function startPbListener() {
    db.collection('pembelian').orderBy('tanggal', 'desc').onSnapshot(function(snap) {
      allPb = snap.docs.map(function(d) { return { id: d.id, ...d.data() }; });
      renderPbTable(); updatePbStats();
    }, function(err) { console.error('Pembelian listener:', err); });
  }

  function renderPbTable() {
    var s = (document.getElementById('pbSearch').value || '').toLowerCase();
    var f = document.getElementById('pbFilter').value;
    var filtered = allPb.filter(function(p) { if (f && p.status !== f) return false; if (s && !(p.nomor || '').toLowerCase().includes(s) && !(p.supplier || '').toLowerCase().includes(s)) return false; return true; });
    var el = document.getElementById('pbList');
    if (!filtered.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-truck"></i><p>Tidak ada data</p></div>'; return; }

    el.innerHTML = '<div class="table-wrap"><div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nomor</th><th>Tanggal</th><th>Supplier</th><th class="num">Total</th><th>Metode</th><th>Status</th>' + (isAdmin ? '<th>Aksi</th>' : '') + '</tr></thead><tbody>' + filtered.map(function(p, i) {
      var aksi = '';
      if (isAdmin && p.status === 'pending') aksi = '<button class="btn btn-primary btn-xs" onclick="Inv.approve(\'' + p.id + '\')"><i class="fas fa-check"></i></button><button class="btn btn-danger btn-xs" onclick="Inv.reject(\'' + p.id + '\')"><i class="fas fa-times"></i></button><button class="btn btn-outline btn-xs" onclick="Inv.detailPb(\'' + p.id + '\')"><i class="fas fa-eye"></i></button>';
      else aksi = '<button class="btn btn-outline btn-xs" onclick="Inv.detailPb(\'' + p.id + '\')"><i class="fas fa-eye"></i></button>';
      return '<tr><td>' + (i + 1) + '</td><td style="font-family:var(--mono);font-size:12px;color:var(--accent)">' + (p.nomor || '-') + '</td><td style="font-size:12px;color:var(--muted)">' + fmtDate(p.tanggal) + '</td><td>' + (p.supplier || '-') + '</td><td class="num">Rp ' + fmt(p.total) + '</td><td style="font-size:12px">' + (p.metode === 'kredit' ? 'Kredit ' + (p.termin || 30) + 'hr' : 'Cash') + '</td><td><span class="pill pill-' + (p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending') + '">' + (p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : 'Pending') + '</span></td>' + (isAdmin ? '<td class="actions">' + aksi + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div></div>';
  }

  function updatePbStats() {
    var el; el = document.getElementById('pbPending'); if (el) el.textContent = allPb.filter(function(p) { return p.status === 'pending'; }).length;
    el = document.getElementById('pbApproved'); if (el) el.textContent = allPb.filter(function(p) { return p.status === 'approved'; }).length;
    el = document.getElementById('pbRejected'); if (el) el.textContent = allPb.filter(function(p) { return p.status === 'rejected'; }).length;
  }

  function showAddPembelian() {
    var el = document.getElementById('pbList');
    var obatList = window._obatList || [];
    el.innerHTML = '<div class="trx-section"><h4><i class="fas fa-info-circle"></i> Info Pembelian</h4><div class="form-grid"><div class="form-group"><label>Supplier</label><input type="text" id="pbSupplier" placeholder="Nama supplier"></div><div class="form-group"><label>No. Invoice</label><input type="text" id="pbInvoice" placeholder="INV-xxx"></div><div class="form-group"><label>Metode</label><select id="pbMetode"><option value="cash">Cash</option><option value="kredit">Kredit</option></select></div><div class="form-group" id="pbTerminWrap" style="display:none"><label>Termin (hari)</label><input type="number" id="pbTermin" value="30" min="1"></div></div></div></div><div class="trx-section"><h4><i class="fas fa-pills"></i> Tambah Obat</h4><div class="search-wrap"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="pbObSearch" placeholder="Cari obat..."></div><div class="search-dropdown" id="pbObDrop"></div></div><div id="pbItemsList"></div></div><div class="trx-section"><h4><i class="fas fa-calculator"></i> Ringkasan</h4><table class="trx-summary-table" id="pbSummary"><tr><td colspan="2" style="color:var(--muted)">Belum ada item</td></tr></table></div><div style="display:flex;gap:10px"><button class="btn btn-outline btn-sm" onclick="Inv.renderPbTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="pbSaveBtn" style="width:auto;min-width:140px"><i class="fas fa-paper-plane"></i> Ajukan (Pending Approval)</button></div>';

    document.getElementById('pbMetode').addEventListener('change', function(e) { document.getElementById('pbTerminWrap').style.display = e.target.value === 'kredit' ? '' : 'none'; });
    document.getElementById('pbObSearch').addEventListener('input', function() {
      var v = this.value.toLowerCase(), drop = document.getElementById('pbObDrop'), m = obatList.filter(function(o) { return (o.namaGenerik || '').toLowerCase().includes(v) || (o.kodeObat || '').toLowerCase().includes(v); }).slice(0, 8);
      if (!m.length) { drop.classList.remove('show'); return; }
      drop.innerHTML = m.map(function(o) { return '<div class="sd-item" data-id="' + o.id + '">' + o.kodeObat + ' — ' + o.namaGenerik + '<div class="sd-sub">HPP: ' + fmt(o.hargaBeli) + ' | Stok: ' + (o.stock || 0) + '</div></div>'; }).join('');
      drop.classList.add('show');
      drop.querySelectorAll('.sd-item').forEach(function(it) { it.addEventListener('click', function() { addPbItem(it.dataset.id); drop.classList.remove('show'); document.getElementById('pbObSearch').value = ''; }); });
    });

    document.getElementById('pbSaveBtn').addEventListener('click', async function() {
      var supplier = document.getElementById('pbSupplier').value.trim();
      if (!supplier) { toast('Supplier wajib', 'error'); return; }
      if (!pbItems.length) { toast('Tambahkan obat', 'error'); return; }
      var total = pbItems.reduce(function(s, i) { return s + i.hpp * i.qty; }, 0);
      if (total <= 0) { toast('Total tidak valid', 'error'); return; }

      try {
        var nomor = await generateNomor('PB'); // ANTI DUPLIKAT
        var metode = document.getElementById('pbMetode').value;
        await db.collection('pembelian').add({ nomor: nomor, tanggal: now(), supplier: supplier, noInvoice: document.getElementById('pbInvoice').value.trim(), metode: metode, termin: metode === 'kredit' ? parseInt(document.getElementById('pbTermin').value) || 30 : 0, items: pbItems, total: total, status: 'pending', karyawanId: currentUser?.email || '' });
        toast('Pembelian diajukan — menunggu approval Admin', 'success'); renderPbTable();
      } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  function addPbItem(obatId) {
    var o = (window._obatList || []).find(function(x) { return x.id === obatId; }); if (!o) return;
    if (pbItems.find(function(x) { return x.obatId === obatId; })) { toast('Sudah ditambahkan', 'warning'); return; }
    pbItems.push({ obatId: obatId, nama: o.namaGenerik, hpp: o.hargaBeli, qty: 1 }); renderPbItems();
  }

  function renderPbItems() {
    var el = document.getElementById('pbItemsList');
    if (!pbItems.length) { el.innerHTML = '<p style="font-size:13px;color:var(--muted)">Belum ada item</p>'; return; }
    el.innerHTML = pbItems.map(function(it, i) { return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px"><span style="flex:1;font-size:13px">' + it.nama + ' — <strong style="font-family:var(--mono);color:var(--accent)">Rp ' + fmt(it.hpp) + '</strong></span><input type="number" value="' + it.qty + '" min="1" onchange="Inv.updPbItem(' + i + ',this.value)" style="width:70px;padding:6px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--fg);font-family:var(--mono);font-size:12px;text-align:center;outline:none"><span style="font-family:var(--mono);font-size:12px;color:var(--muted);min-width:90px;text-align:right">Rp ' + fmt(it.hpp * it.qty) + '</span><button class="btn btn-danger btn-xs" onclick="Inv.rmPbItem(' + i + ')"><i class="fas fa-times"></i></button></div>'; }).join('');
    var total = pbItems.reduce(function(s, i) { return s + i.hpp * i.qty; }, 0);
    document.getElementById('pbSummary').innerHTML = '<tr><td>Total</td><td style="text-align:right;font-family:var(--mono);font-weight:700;color:var(--accent)">Rp ' + fmt(total) + '</td></tr>';
  }
  function updPbItem(i, v) { pbItems[i].qty = Math.max(1, parseInt(v) || 1); renderPbItems(); }
  function rmPbItem(i) { pbItems.splice(i, 1); renderPbItems(); }

  async function approvePb(id) {
    if (!confirm('Setujui pembelian ini? Stok obat akan bertambah.')) return;
    var pb = allPb.find(function(x) { return x.id === id; }); if (!pb) return;
    try {
      var batch = db.batch();
      batch.update(db.collection('pembelian').doc(id), { status: 'approved', approvedBy: currentUser?.email || '', approvedAt: now() });
      if (pb.items) { pb.items.forEach(function(it) { batch.update(db.collection('obat').doc(it.obatId), { stock: firebase.firestore.FieldValue.increment(it.qty) }); batch.set(db.collection('stock_mutasi').doc(), { obatId: it.obatId, tipe: 'masuk', jumlah: it.qty, keterangan: 'Pembelian ' + pb.nomor, tanggal: now(), userId: currentUser?.email || '', referensi: pb.nomor }); }); }
      if (pb.metode === 'kredit') { var jt = new Date(); jt.setDate(jt.getDate() + (pb.termin || 30)); batch.set(db.collection('hutang_usaha').doc(), { pembelianId: id, nomor: 'HT-' + pb.nomor.replace('PB-', ''), supplier: pb.supplier, noInvoice: pb.noInvoice, total: pb.total, sudahBayar: 0, status: 'aktif', tanggal: now(), jatuhTempo: jt, karyawanId: pb.karyawanId }); }
      await batch.commit(); toast('Pembelian disetujui', 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  }
  async function rejectPb(id) { if (!confirm('Tolak pembelian ini?')) return; try { await db.collection('pembelian').doc(id).update({ status: 'rejected', rejectedBy: currentUser?.email || '' }); toast('Ditolak', 'warning'); } catch (e) { toast('Gagal: ' + e.message, 'error'); } }

  function detailPb(id) {
    var pb = allPb.find(function(x) { return x.id === id; }); if (!pb) return;
    document.getElementById('pbList').innerHTML = '<div class="trx-section"><h4>Detail Pembelian</h4><div class="form-grid"><div class="form-group"><label>Nomor</label><input value="' + pb.nomor + '" readonly></div><div class="form-group"><label>Supplier</label><input value="' + (pb.supplier || '') + '" readonly></div><div class="form-group"><label>Total</label><input value="Rp ' + fmt(pb.total) + '" readonly style="color:var(--accent);font-weight:700"></div><div class="form-group"><label>Status</label><input value="' + pb.status + '" readonly></div></div></div><h4 style="margin:16px 0 8px;font-size:13px;font-weight:700;color:var(--muted)">Item:</h4><div class="table-wrap"><table><thead><tr><th>Nama</th><th class="num">HPP</th><th>Qty</th><th class="num">Subtotal</th></tr></thead><tbody>' + (pb.items || []).map(function(it) { return '<tr><td>' + it.nama + '</td><td class="num">' + fmt(it.hpp) + '</td><td>' + it.qty + '</td><td class="num">' + fmt(it.hpp * it.qty) + '</td></tr>'; }).join('') + '</tbody></table></div><div style="margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Inv.renderPbTable()" style="width:auto"><i class="fas fa-arrow-left"></i> Kembali</button></div>';
  }
  window.Inv = { approve: approvePb, reject: rejectPb, detailPb: detailPb, updPbItem: updPbItem, rmPbItem: rmPbItem, renderPbTable: renderPbTable };

  // ==================== STOCK OPNAME ====================
  function renderOpname() {
    page.innerHTML = '<div class="stats-grid" style="margin-bottom:18px"><div class="stat-card"><div class="s-label">Pending</div><div class="s-value yellow" id="soPending">0</div></div><div class="stat-card"><div class="s-label">Disetujui</div><div class="s-value green" id="soApproved">0</div></div><div class="stat-card"><div class="s-label">Ditolak</div><div class="s-value red" id="soRejected">0</div></div></div><div class="obat-toolbar"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="soSearch" placeholder="Cari nomor..."></div><select class="filter-select" id="soFilter"><option value="">Semua</option><option value="pending">Pending</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option></select>' + (userRole !== 'admin' ? '<button class="btn btn-primary btn-sm" id="soBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Mulai Opname</button>' : '') + '</div><div id="soList"><div class="empty-state"><i class="fas fa-clipboard-check"></i><p>Memuat...</p></div></div>';

    document.getElementById('soSearch').addEventListener('input', renderSoTable);
    document.getElementById('soFilter').addEventListener('change', renderSoTable);
    if (userRole !== 'admin') document.getElementById('soBtnAdd').addEventListener('click', showAddOpname);
    startSoListener();
  }

  var allSo = [];
  function startSoListener() {
    db.collection('stock_opname').orderBy('tanggal', 'desc').onSnapshot(function(snap) {
      allSo = snap.docs.map(function(d) { return { id: d.id, ...d.data() }; });
      renderSoTable();
      document.getElementById('soPending').textContent = allSo.filter(function(s) { return s.status === 'pending'; }).length;
      document.getElementById('soApproved').textContent = allSo.filter(function(s) { return s.status === 'approved'; }).length;
      document.getElementById('soRejected').textContent = allSo.filter(function(s) { return s.status === 'rejected'; }).length;
    });
  }

  function renderSoTable() {
    var s = (document.getElementById('soSearch').value || '').toLowerCase(), f = document.getElementById('soFilter').value;
    var filtered = allSo.filter(function(o) { if (f && o.status !== f) return false; if (s && !(o.nomor || '').toLowerCase().includes(s)) return false; return true; });
    var el = document.getElementById('soList');
    if (!filtered.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>Tidak ada data</p></div>'; return; }
    el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>No</th><th>Nomor</th><th>Tanggal</th><th>Jumlah Item</th><th class="num">Selisih</th><th>Status</th>' + (isAdmin ? '<th>Aksi</th>' : '') + '</tr></thead><tbody>' + filtered.map(function(o, i) {
      var selisih = (o.items || []).reduce(function(s, it) { return s + (it.selisih || 0); }, 0);
      return '<tr><td>' + (i + 1) + '</td><td style="font-family:var(--mono);font-size:12px;color:var(--accent)">' + o.nomor + '</td><td style="font-size:12px;color:var(--muted)">' + fmtDate(o.tanggal) + '</td><td>' + (o.items || []).length + '</td><td class="num" style="color:' + (selisih < 0 ? 'var(--danger)' : selisih > 0 ? 'var(--accent)' : 'var(--muted)') + '">' + selisih + '</td><td><span class="pill pill-' + o.status + '">' + (o.status === 'approved' ? 'Disetujui' : o.status === 'rejected' ? 'Ditolak' : 'Pending') + '</span></td>' + (isAdmin && o.status === 'pending' ? '<td class="actions"><button class="btn btn-primary btn-xs" onclick="Inv.approveSo(\'' + o.id + '\')"><i class="fas fa-check"></i></button><button class="btn btn-danger btn-xs" onclick="Inv.rejectSo(\'' + o.id + '\')"><i class="fas fa-times"></i></button><button class="btn btn-outline btn-xs" onclick="Inv.detailSo(\'' + o.id + '\')"><i class="fas fa-eye"></i></button></td>' : '<td></td>') + '</tr>';
    }).join('') + '</tbody></table></div>';
  }

  function showAddOpname() {
    var obatList = window._obatList || []; if (!obatList.length) { toast('Belum ada data obat', 'warning'); return; }
    var el = document.getElementById('soList');
    el.innerHTML = '<div class="trx-section"><h4><i class="fas fa-clipboard-list"></i> Input Stok Fisik (' + obatList.length + ' obat)</h4><p style="font-size:12px;color:var(--muted);margin-bottom:16px">Isi stok fisik. Sistem hitung selisih.</p><div class="table-wrap"><table><thead><tr><th>Obat</th><th class="num">Stok Sistem</th><th class="num">Stok Fisik</th><th class="num">Selisih</th></tr></thead><tbody>' + obatList.map(function(o) { return '<tr><td>' + o.kodeObat + ' — ' + o.namaGenerik + '</td><td class="num">' + (o.stock || 0) + '</td><td><input type="number" class="so-fisik" data-id="' + o.id + '" data-sistem="' + (o.stock || 0) + '" value="' + (o.stock || 0) + '" min="0" style="width:100px;padding:6px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--fg);font-family:var(--mono);font-size:12px;text-align:center;outline:none"></td><td class="num so-selisih" style="color:var(--muted)">0</td></tr>'; }).join('') + '</tbody></table></div></div><div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Inv.renderSoTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="soSaveBtn" style="width:auto;min-width:160px"><i class="fas fa-paper-plane"></i> Ajukan Opname</button></div>';

    el.querySelectorAll('.so-fisik').forEach(function(inp) {
      inp.addEventListener('input', function() {
        var selisih = parseInt(this.value) - parseInt(this.dataset.sistem);
        this.closest('tr').querySelector('.so-selisih').textContent = selisih;
        this.closest('tr').querySelector('.so-selisih').style.color = selisih < 0 ? 'var(--danger)' : selisih > 0 ? 'var(--accent)' : 'var(--muted)';
      });
    });

    document.getElementById('soSaveBtn').addEventListener('click', async function() {
      var items = [];
      el.querySelectorAll('.so-fisik').forEach(function(inp) { var fisik = parseInt(inp.value) || 0, sistem = parseInt(inp.dataset.sistem) || 0; if (fisik !== sistem) items.push({ obatId: inp.dataset.id, stokSistem: sistem, stokFisik: fisik, selisih: fisik - sistem }); });
      if (!items.length) { toast('Tidak ada selisih', 'warning'); return; }
      try {
        var nomor = await generateNomor('SO'); // ANTI DUPLIKAT
        await db.collection('stock_opname').add({ nomor: nomor, tanggal: now(), items: items, status: 'pending', karyawanId: currentUser?.email || '' });
        toast('Opname diajukan — menunggu approval Admin', 'success'); renderSoTable();
      } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  async function approveSo(id) {
    if (!confirm('Setujui opname? Stok akan disesuaikan.')) return;
    var so = allSo.find(function(x) { return x.id === id; }); if (!so) return;
    try {
      var batch = db.batch();
      batch.update(db.collection('stock_opname').doc(id), { status: 'approved', approvedBy: currentUser?.email || '', approvedAt: now() });
      (so.items || []).forEach(function(it) { batch.update(db.collection('obat').doc(it.obatId), { stock: firebase.firestore.FieldValue.increment(it.selisih) }); batch.set(db.collection('stock_mutasi').doc(), { obatId: it.obatId, tipe: it.selisih > 0 ? 'masuk' : 'keluar', jumlah: it.selisih, stockSebelum: it.stokSistem, stockSesudah: it.stokFisik, keterangan: 'Stock Opname ' + so.nomor, tanggal: now(), userId: currentUser?.email || '', referensi: so.nomor }); });
      await batch.commit(); toast('Opname disetujui', 'success');
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  }
  async function rejectSo(id) { if (!confirm('Tolak opname?')) return; try { await db.collection('stock_opname').doc(id).update({ status: 'rejected', rejectedBy: currentUser?.email || '' }); toast('Ditolak', 'warning'); } catch (e) { toast('Gagal: ' + e.message, 'error'); } }
  function detailSo(id) { var so = allSo.find(function(x) { return x.id === id; }); if (!so) return; document.getElementById('soList').innerHTML = '<div class="trx-section"><h4>Detail Opname ' + so.nomor + '</h4><div class="table-wrap"><table><thead><tr><th>Obat</th><th class="num">Sistem</th><th class="num">Fisik</th><th class="num">Selisih</th></tr></thead><tbody>' + (so.items || []).map(function(it) { return '<tr><td>' + ((window._obatList || []).find(function(o) { return o.id === it.obatId; })?.namaGenerik || it.obatId) + '</td><td class="num">' + it.stokSistem + '</td><td class="num">' + it.stokFisik + '</td><td class="num" style="color:' + (it.selisih < 0 ? 'var(--danger)' : 'var(--accent)') + '">' + it.selisih + '</td></tr>'; }).join('') + '</tbody></table></div><div style="margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Inv.renderSoTable()" style="width:auto"><i class="fas fa-arrow-left"></i> Kembali</button></div>'; }

  window.Inv.approveSo = approveSo; window.Inv.rejectSo = rejectSo; window.Inv.detailSo = detailSo;

  var obsPb = new MutationObserver(function() { if (pendingPage.classList.contains('active')) renderPembelian(); });
  var obsSo = new MutationObserver(function() { if (page.classList.contains('active')) renderOpname(); });
  obsPb.observe(pendingPage, { attributes: true, attributeFilter: ['class'] });
  obsSo.observe(page, { attributes: true, attributeFilter: ['class'] });
  renderPembelian(); renderOpname();
});
