registerModule('keuangan', function() {
  var hutangPage = document.getElementById('page-hutang');
  var piutangPage = document.getElementById('page-piutang');
  var allHutang = [];
  var allHutangBayar = [];
  var allPiutang = [];

  // ==================== HUTANG USAHA ====================
  function renderHutang() {
    hutangPage.innerHTML = '<div class="stats-grid" style="margin-bottom:18px"><div class="stat-card"><div class="s-label">Hutang Aktif</div><div class="s-value red" id="htAktif">0</div></div><div class="stat-card"><div class="s-label">Total Hutang</div><div class="s-value yellow" id="htTotal">Rp 0</div></div><div class="stat-card"><div class="s-label">Bayar Pending</div><div class="s-value purple" id="htPending">0</div></div></div><div class="obat-toolbar"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="htSearch" placeholder="Cari supplier, nomor..."></div><select class="filter-select" id="htFilter"><option value="aktif">Aktif</option><option value="lunas">Lunas</option><option value="">Semua</option></select><button class="btn btn-primary btn-sm" id="htBtnBayar" style="width:auto"><i class="fas fa-money-bill-wave"></i> Bayar Hutang</button></div><div id="htList"><div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Memuat...</p></div></div><div class="trx-riwayat" style="margin-top:28px"><div class="section-title"><i class="fas fa-history"></i> Riwayat Pembayaran</div><div id="htBayarList"><div class="empty-state"><i class="fas fa-check-circle"></i><p>Tidak ada riwayat</p></div></div></div>';

    document.getElementById('htSearch').addEventListener('input', renderHtTable);
    document.getElementById('htFilter').addEventListener('change', renderHtTable);
    document.getElementById('htBtnBayar').addEventListener('click', function() { showBayarForm(null, 0); });
    startHtListener();
    startHtBayarListener();
  }

  function startHtListener() {
    db.collection('hutang_usaha').orderBy('jatuhTempo', 'asc').onSnapshot(function(snap) {
      allHutang = [];
      snap.docs.forEach(function(d) { var o = {id: d.id}; var data = d.data(); var keys = Object.keys(data); for (var i = 0; i < keys.length; i++) o[keys[i]] = data[keys[i]]; allHutang.push(o); });
      renderHtTable();
      var aktif = 0, totalSisa = 0;
      for (var i = 0; i < allHutang.length; i++) { if (allHutang[i].status === 'aktif') { aktif++; totalSisa += (allHutang[i].total || 0) - (allHutang[i].sudahBayar || 0); } }
      var el; el = document.getElementById('htAktif'); if (el) el.textContent = aktif;
      el = document.getElementById('htTotal'); if (el) el.textContent = 'Rp ' + fmt(totalSisa);
      el = document.getElementById('htPending'); if (el) el.textContent = allHutangBayar.filter(function(b) { return b.status === 'pending'; }).length;
    }, function(err) { console.error('Hutang listener:', err); });
  }

  function startHtBayarListener() {
    db.collection('hutang_bayar').orderBy('tanggal', 'desc').onSnapshot(function(snap) {
      allHutangBayar = [];
      snap.docs.forEach(function(d) { var o = {id: d.id}; var data = d.data(); var keys = Object.keys(data); for (var i = 0; i < keys.length; i++) o[keys[i]] = data[keys[i]]; allHutangBayar.push(o); });
      renderHtBayarTable();
    }, function(err) { console.error('Hutang bayar listener:', err); });
  }

  function renderHtTable() {
    var s = (document.getElementById('htSearch').value || '').toLowerCase();
    var f = document.getElementById('htFilter').value;
    var filtered = [];
    for (var i = 0; i < allHutang.length; i++) {
      var h = allHutang[i];
      if (f && h.status !== f) continue;
      if (s && (h.supplier || '').toLowerCase().indexOf(s) === -1 && (h.nomor || '').toLowerCase().indexOf(s) === -1) continue;
      filtered.push(h);
    }
    var el = document.getElementById('htList');
    if (!filtered.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Tidak ada data</p></div>'; return; }
    var h = '<div class="table-wrap"><table><thead><tr><th>No</th><th>Nomor</th><th>Supplier</th><th>Invoice</th><th class="num">Total</th><th class="num">Sudah Bayar</th><th class="num">Sisa</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
    for (var i = 0; i < filtered.length; i++) {
      var ht = filtered[i];
      var sisa = ht.total - (ht.sudahBayar || 0);
      var statusClass = ht.status === 'aktif' ? 'pill-pending' : 'pill-approved';
      var statusText = ht.status === 'aktif' ? 'Aktif' : 'Lunas';
      var jt = ht.jatuhTempo ? new Date(ht.jatuhTempo.seconds * 1000).toLocaleDateString('id-ID') : '-';
      var aksi = '';
      if (ht.status === 'aktif') aksi = '<button class="btn btn-primary btn-xs" onclick="Keu.bayarHutang(\'' + ht.id + '\',' + sisa + ')"><i class="fas fa-money-bill-wave"></i></button>';
      h += '<tr><td>' + (i+1) + '</td><td style="font-family:var(--mono);font-size:12px;color:var(--accent)">' + (ht.nomor||'-') + '</td><td>' + (ht.supplier||'-') + '</td><td style="font-size:12px">' + (ht.noInvoice||'-') + '</td><td class="num">Rp ' + fmt(ht.total) + '</td><td class="num">Rp ' + fmt(ht.sudahBayar||0) + '</td><td class="num" style="color:' + (sisa > 0 ? 'var(--danger)' : 'var(--accent)') + '">Rp ' + fmt(sisa) + '</td><td style="font-size:12px">' + jt + '</td><td><span class="pill ' + statusClass + '">' + statusText + '</span></td><td class="actions">' + aksi + '</td></tr>';
    }
    h += '</tbody></table></div>';
    el.innerHTML = h;
  }

  function renderHtBayarTable() {
    var el = document.getElementById('htBayarList');
    if (!el) return;
    if (!allHutangBayar.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Tidak ada riwayat</p></div>'; return; }
    var h = '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Nomor</th><th class="num">Jumlah</th><th>Status</th></tr></thead><tbody>';
    for (var i = 0; i < allHutangBayar.length; i++) {
      var b = allHutangBayar[i];
      var sc = b.status === 'approved' ? 'pill-approved' : b.status === 'rejected' ? 'pill-rejected' : 'pill-pending';
      var st = b.status === 'approved' ? 'Disetujui' : b.status === 'rejected' ? 'Ditolak' : 'Pending';
      h += '<tr><td style="font-size:12px;color:var(--muted)">' + fmtDate(b.tanggal) + '</td><td style="font-family:var(--mono);font-size:12px">' + (b.nomor||'-') + '</td><td class="num">Rp ' + fmt(b.jumlah) + '</td><td><span class="pill ' + sc + '">' + st + '</span></td></tr>';
    }
    h += '</tbody></table></div>';
    el.innerHTML = h;
  }

  function showBayarForm(hutangId, sisa) {
    var h = null;
    if (hutangId) { for (var i = 0; i < allHutang.length; i++) { if (allHutang[i].id === hutangId) { h = allHutang[i]; break; } } }
    if (!h) {
      var el = document.getElementById('htList');
      var opts = '<option value="">-- Pilih Hutang --</option>';
      for (var i = 0; i < allHutang.length; i++) { if (allHutang[i].status === 'aktif') { var s = allHutang[i].total - (allHutang[i].sudahBayar || 0); opts += '<option value="' + allHutang[i].id + '" data-sisa="' + s + '">' + allHutang[i].nomor + ' — ' + allHutang[i].supplier + ' (Sisa: Rp ' + fmt(s) + ')</option>'; } }
      el.innerHTML = '<div class="trx-section"><h4><i class="fas fa-money-bill-wave"></i> Bayar Hutang</h4><div class="form-group"><label>Pilih Hutang</label><select id="htSelectHutang">' + opts + '</select></div><div id="htBayarFormInner"></div></div><div style="margin-top:12px"><button class="btn btn-outline btn-sm" onclick="Keu.renderHtTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button></div>';
      document.getElementById('htSelectHutang').addEventListener('change', function() {
        var sel = this.options[this.selectedIndex]; var sid = sel.value; var ss = parseInt(sel.dataset.sisa) || 0;
        if (!sid) { document.getElementById('htBayarFormInner').innerHTML = ''; return; }
        showBayarFormInner(sid, ss);
      });
    } else {
      showBayarFormInner(hutangId, sisa);
    }
  }

  function showBayarFormInner(hutangId, sisa) {
    document.getElementById('htBayarFormInner').innerHTML = '<div class="form-grid" style="margin-top:14px"><div class="form-group"><label>Jumlah Bayar (Rp)</label><input type="number" id="htJumlah" value="' + sisa + '" max="' + sisa + '" min="1"></div><div class="form-group"><label>Keterangan</label><input type="text" id="htKet" placeholder="Opsional"></div></div><div style="margin-top:12px"><button class="btn btn-primary btn-sm" id="htBayarBtn" style="width:auto;min-width:140px"><i class="fas fa-paper-plane"></i> Ajukan Pembayaran</button></div>';
    document.getElementById('htBayarBtn').addEventListener('click', function() {
      var jumlah = parseInt(document.getElementById('htJumlah').value) || 0;
      if (jumlah <= 0 || jumlah > sisa) { toast('Jumlah tidak valid', 'error'); return; }
      doBayarHutang(hutangId, jumlah, document.getElementById('htKet').value.trim());
    });
  }

  function doBayarHutang(hutangId, jumlah, ket) {
    var h = null; for (var i = 0; i < allHutang.length; i++) { if (allHutang[i].id === hutangId) { h = allHutang[i]; break; } } if (!h) return;
    var ds = ts().toISOString().slice(0,10).replace(/-/g,'');
    db.collection('hutang_bayar').where('nomor','>=','HB-'+ds).where('nomor','<','HB-'+ds+'Z').orderBy('nomor','desc').limit(1).get().then(function(snap) {
      var lastNum = snap.empty ? 0 : parseInt(snap.docs[0].data().nomor.slice(-4)) || 0;
      return db.collection('hutang_bayar').add({nomor:'HB-'+ds+'-'+String(lastNum+1).padStart(4,'0'), hutangId:h.id, nomorHutang:h.nomor, jumlah:jumlah, keterangan:ket, tanggal:now(), status:'pending', karyawanId:currentUser?currentUser.email:''});
    }).then(function(){toast('Pembayaran diajukan','success');renderHtTable();}).catch(function(e){toast('Gagal: '+e.message,'error');});
  }

  async function approveHtBayar(id) {
    if (!confirm('Setujui pembayaran ini?')) return;
    var b = null; for (var i = 0; i < allHutangBayar.length; i++) { if (allHutangBayar[i].id === id) { b = allHutangBayar[i]; break; } } if (!b) return;
    try {
      var batch = db.batch();
      batch.update(db.collection('hutang_bayar').doc(id), {status:'approved', approvedBy:currentUser?currentUser.email:''});
      batch.update(db.collection('hutang_usaha').doc(b.hutangId), {sudahBayar:firebase.firestore.FieldValue.increment(b.jumlah)});
      var hutang = null; for (var i = 0; i < allHutang.length; i++) { if (allHutang[i].id === b.hutangId) { hutang = allHutang[i]; break; } }
      if (hutang && b.jumlah >= ((hutang.total||0) - (hutang.sudahBayar||0))) batch.update(db.collection('hutang_usaha').doc(b.hutangId), {status:'lunas'});
      await batch.commit(); toast('Pembayaran disetujui','success');
    } catch(e) { toast('Gagal: '+e.message,'error'); }
  }

  function rejectHtBayar(id) { if(!confirm('Tolak pembayaran?'))return; db.collection('hutang_bayar').doc(id).update({status:'rejected',rejectedBy:currentUser?currentUser.email:''}).then(function(){toast('Ditolak','warning')}).catch(function(e){toast('Gagal: '+e.message,'error')}); }

  // ==================== PIUTANG KARYAWAN ====================
  function renderPiutang() {
    piutangPage.innerHTML = '<div class="stats-grid" style="margin-bottom:18px"><div class="stat-card"><div class="s-label">Piutang Aktif</div><div class="s-value red" id="ptAktif">0</div></div><div class="stat-card"><div class="s-label">Total Piutang</div><div class="s-value yellow" id="ptTotal">Rp 0</div></div></div><div class="obat-toolbar"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="ptSearch" placeholder="Cari karyawan..."></div><select class="filter-select" id="ptFilter"><option value="aktif">Aktif</option><option value="lunas">Lunas</option><option value="">Semua</option></select><button class="btn btn-primary btn-sm" id="ptBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Input Piutang</button></div><div id="ptList"><div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>Memuat...</p></div></div>';

    document.getElementById('ptSearch').addEventListener('input', renderPtTable);
    document.getElementById('ptFilter').addEventListener('change', renderPtTable);
    document.getElementById('ptBtnAdd').addEventListener('click', showAddPiutang);
    startPtListener();
  }

  function startPtListener() {
    db.collection('piutang_karyawan').orderBy('tanggal','desc').onSnapshot(function(snap) {
      allPiutang = [];
      snap.docs.forEach(function(d) { var o = {id:d.id}; var data = d.data(); var keys = Object.keys(data); for (var i=0;i<keys.length;i++) o[keys[i]]=data[keys[i]]; allPiutang.push(o); });
      renderPtTable();
      var aktifC=0, totalSisa=0;
      for(var i=0;i<allPiutang.length;i++){var p=allPiutang[i]; if(p.status==='aktif'){aktifC++; totalSisa+=(p.jumlah||0)-(p.sudahBayar||0);}}
      var el; el=document.getElementById('ptAktif'); if(el) el.textContent=aktifC;
      el=document.getElementById('ptTotal'); if(el) el.textContent='Rp '+fmt(totalSisa);
    }, function(err){console.error('Piutang listener:',err);});
  }

  function renderPtTable() {
    var s=(document.getElementById('ptSearch').value||'').toLowerCase(), f=document.getElementById('ptFilter').value;
    var filtered=[];
    for(var i=0;i<allPiutang.length;i++){var p=allPiutang[i]; if(f&&p.status!==f)continue; if(s&&(p.karyawanNama||'').toLowerCase().indexOf(s)===-1&&(p.keterangan||'').toLowerCase().indexOf(s)===-1)continue; filtered.push(p);}
    var el=document.getElementById('ptList');
    if(!filtered.length){el.innerHTML='<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>Tidak ada data</p></div>';return;}
    var h='<div class="table-wrap"><table><thead><tr><th>No</th><th>Karyawan</th><th>Keterangan</th><th class="num">Jumlah</th><th class="num">Sudah Bayar</th><th class="num">Sisa</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
    for(var i=0;i<filtered.length;i++){
      var p=filtered[i], sisa=(p.jumlah||0)-(p.sudahBayar||0);
      var sc=p.status==='aktif'?'pill-pending':'pill-approved', st=p.status==='aktif'?'Aktif':'Lunas';
      var aksi=p.status==='aktif'?'<button class="btn btn-primary btn-xs" onclick="Keu.bayarPiutang(\''+p.id+'\','+sisa+')"><i class="fas fa-money-bill-wave"></i></button>':'';
      h+='<tr><td>'+(i+1)+'</td><td style="font-weight:500">'+(p.karyawanNama||'-')+'</td><td style="font-size:12px;color:var(--muted)">'+(p.keterangan||'-')+'</td><td class="num">Rp '+fmt(p.jumlah)+'</td><td class="num">Rp '+fmt(p.sudahBayar||0)+'</td><td class="num" style="color:'+(sisa>0?'var(--danger)':'var(--accent)')+'">Rp '+fmt(sisa)+'</td><td style="font-size:12px;color:var(--muted)">'+fmtDate(p.tanggal)+'</td><td><span class="pill '+sc+'">'+st+'</span></td><td class="actions">'+aksi+'</td></tr>';
    }
    h+='</tbody></table></div>'; el.innerHTML=h;
  }

  function showAddPiutang() {
    var el=document.getElementById('ptList');
    el.innerHTML='<div class="trx-section"><h4><i class="fas fa-hand-holding-usd"></i> Input Piutang Karyawan</h4><div class="form-grid"><div class="form-group full"><label>Nama Karyawan *</label><input type="text" id="ptNama" placeholder="Nama karyawan"></div><div class="form-group"><label>Jumlah Pinjaman (Rp) *</label><input type="number" id="ptJumlah" min="1000" step="1000"></div><div class="form-group full"><label>Keterangan</label><input type="text" id="ptKet" placeholder="Alasan pinjaman"></div></div><div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Keu.renderPtTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="ptSaveBtn" style="width:auto;min-width:140px"><i class="fas fa-paper-plane"></i> Ajukan</button></div></div>';
    document.getElementById('ptSaveBtn').addEventListener('click',function(){
      var nama=document.getElementById('ptNama').value.trim(), jumlah=parseInt(document.getElementById('ptJumlah').value)||0;
      if(!nama){toast('Nama wajib','error');return;} if(jumlah<=0){toast('Jumlah harus > 0','error');return;}
      db.collection('piutang_karyawan').add({karyawanNama:nama,jumlah:jumlah,keterangan:document.getElementById('ptKet').value.trim(),sudahBayar:0,status:'pending',tanggal:now(),karyawanId:currentUser?currentUser.email:''}).then(function(){toast('Piutang diajukan','success');renderPtTable();}).catch(function(e){toast('Gagal: '+e.message,'error');});
    });
  }

  function bayarPiutang(id, sisa) {
    var p=null; for(var i=0;i<allPiutang.length;i++){if(allPiutang[i].id===id){p=allPiutang[i];break;}} if(!p) return;
    var el=document.getElementById('ptList');
    el.innerHTML='<div class="trx-section"><h4><i class="fas fa-money-bill-wave"></i> Bayar Piutang</h4><div class="form-grid"><div class="form-group full"><label>'+p.karyawanNama+' — Sisa: Rp '+fmt(sisa)+'</label><input type="text" value="Rp '+fmt(sisa)+'" readonly style="color:var(--danger);font-weight:700"></div><div class="form-group"><label>Jumlah Bayar (Rp)</label><input type="number" id="ptBayarJumlah" value="'+sisa+'" max="'+sisa+'" min="1"></div><div class="form-group"><label>Keterangan</label><input type="text" id="ptBayarKet" placeholder="Opsional"></div></div><div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Keu.renderPtTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="ptBayarBtn" style="width:auto;min-width:140px"><i class="fas fa-paper-plane"></i> Ajukan Pembayaran</button></div></div>';
    document.getElementById('ptBayarBtn').addEventListener('click',function(){
      var jumlah=parseInt(document.getElementById('ptBayarJumlah').value)||0;
      if(jumlah<=0||jumlah>sisa){toast('Jumlah tidak valid','error');return;}
      db.collection('piutang_karyawan').doc(id).collection('pembayaran').add({jumlah:jumlah,keterangan:document.getElementById('ptBayarKet').value.trim(),tanggal:now(),status:'pending',karyawanId:currentUser?currentUser.email:''}).then(function(){toast('Pembayaran diajukan','success');renderPtTable();}).catch(function(e){toast('Gagal: '+e.message,'error');});
    });
  }

  window.Keu = { bayarHutang: showBayarForm, approveHtBayar: approveHtBayar, rejectHtBayar: rejectHtBayar, renderHtTable: renderHtTable, bayarPiutang: bayarPiutang, renderPtTable: renderPtTable };

  var obsHt = new MutationObserver(function(){if(hutangPage.classList.contains('active'))renderHutang();});
  var obsPt = new MutationObserver(function(){if(piutangPage.classList.contains('active'))renderPiutang();});
  obsHt.observe(hutangPage, {attributes:true, attributeFilter:['class']});
  obsPt.observe(piutangPage, {attributes:true, attributeFilter:['class']});
  renderHutang();
  renderPiutang();
});
