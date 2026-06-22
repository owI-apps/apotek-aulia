registerModule('transaksi', function() {
  var page = document.getElementById('page-transaksi');
  var trxTipe = 'resep_klinik';
  var trxPasienId = null;
  var trxPasienNama = '';
  var trxItems = [];
  var trxRawatId = null;
  var trxRawatData = null;
  var trxTindApotek = { gula: false, asam: false, kolestrol: false, tensi: false };
  var trxObatList = [];
  var trxPasienList = [];
  var trxHistory = [];
  var editTrxId = null;

  function isResep(t) { return t === 'resep_klinik' || t === 'resep_luar'; }
  function getMargin() { return 1 + (C.marginObatResep || 35) / 100; }

  function render() {
    page.innerHTML = ''
      + '<div class="trx-types" id="trxTypes">'
      + '<button class="trx-type-btn active" data-tipe="resep_klinik"><i class="fas fa-file-medical"></i> Resep Klinik</button>'
      + '<button class="trx-type-btn" data-tipe="resep_luar"><i class="fas fa-file-import"></i> Resep Luar</button>'
      + '<button class="trx-type-btn" data-tipe="obat_bebas"><i class="fas fa-pills"></i> Obat Bebas</button>'
      + '<button class="trx-type-btn" data-tipe="tindakan_apotek"><i class="fas fa-vial"></i> Tindakan Apotek</button>'
      + '</div>'
      + '<div class="trx-section" id="trxRawatSection" style="display:none"><h4><i class="fas fa-stethoscope"></i> Link Rawat Jalan</h4><div id="trxRawatList"></div></div>'
      + '<div class="trx-section"><h4><i class="fas fa-user"></i> Pasien (opsional)</h4><div class="search-wrap"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="trxPsSearch" placeholder="Ketik nama pasien atau kosongkan"></div><div class="search-dropdown" id="trxPsDrop"></div></div><div id="trxPsInfo" style="margin-top:10px;font-size:13px;display:none"></div></div>'
      + '<div class="trx-section" id="trxObatSection"><h4><i class="fas fa-pills"></i> Item Obat</h4><div class="search-wrap"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="trxObSearch" placeholder="Cari nama obat..."></div><div class="search-dropdown" id="trxObDrop"></div></div><div id="trxItemsList"></div></div>'
      + '<div class="trx-section" id="trxTindSection" style="display:none"><h4><i class="fas fa-vial"></i> Pilih Tindakan</h4><div class="cb-group" id="cbTind"></div></div>'
      + '<div class="trx-section" id="trxSummarySection"><h4><i class="fas fa-calculator"></i> Ringkasan</h4><table class="trx-summary-table" id="trxSummaryTable"></table></div>'
      + '<div style="display:flex;gap:10px;margin-bottom:28px"><button class="btn btn-outline btn-sm" id="trxReset" style="width:auto"><i class="fas fa-undo"></i> Reset</button><button class="btn btn-primary" id="trxSave"><i class="fas fa-save"></i> Simpan Transaksi</button></div>'
      + '<div class="trx-riwayat"><div class="section-title"><i class="fas fa-history"></i> Riwayat Terakhir</div><div class="table-wrap"><div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nomor</th><th>Tipe</th><th>Pasien</th><th class="num">Total</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody id="trxHistBody"><tr><td colspan="8"><div class="empty-state"><i class="fas fa-history"></i><p>Memuat...</p></div></td></tr></tbody></table></div></div>';

    var typeBtns = document.querySelectorAll('.trx-type-btn');
    for (var i = 0; i < typeBtns.length; i++) {
      typeBtns[i].addEventListener('click', function() {
        var allBtns = document.querySelectorAll('.trx-type-btn');
        for (var j = 0; j < allBtns.length; j++) allBtns[j].classList.remove('active');
        this.classList.add('active');
        trxTipe = this.dataset.tipe;
        trxReset();
        updateUI();
      });
    }

    document.getElementById('trxReset').addEventListener('click', trxReset);
    document.getElementById('trxSave').addEventListener('click', doSave);
    setupDropdowns();
    loadHist();
    updateUI();
  }

  function updateUI() {
    var hasObat = isResep(trxTipe) || trxTipe === 'obat_bebas';
    var isTA = trxTipe === 'tindakan_apotek';
    document.getElementById('trxRawatSection').style.display = trxTipe === 'resep_klinik' ? 'block' : 'none';
    document.getElementById('trxObatSection').style.display = hasObat ? 'block' : 'none';
    document.getElementById('trxTindSection').style.display = isTA ? 'block' : 'none';
    if (isTA) renderTindCB();
    if (trxTipe === 'resep_klinik') loadRawatPending();
    renderSummary();
  }

  function trxReset() {
    editTrxId = null;
    trxPasienId = null;
    trxPasienNama = '';
    trxItems = [];
    trxRawatId = null;
    trxRawatData = null;
    trxTindApotek = { gula: false, asam: false, kolestrol: false, tensi: false };
    var psEl = document.getElementById('trxPsSearch');
    if (psEl) psEl.value = '';
    var psInfo = document.getElementById('trxPsInfo');
    if (psInfo) psInfo.style.display = 'none';
    var itemsEl = document.getElementById('trxItemsList');
    if (itemsEl) itemsEl.innerHTML = '';
    var saveBtn = document.getElementById('trxSave');
    if (saveBtn) { saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Transaksi'; saveBtn.style.background = ''; saveBtn.style.color = ''; }
    renderSummary();
  }

  function renderTindCB() {
    var el = document.getElementById('cbTind');
    var h = '';
    h += '<label data-key="gula"><input type="checkbox" ' + (trxTindApotek.gula ? 'checked' : '') + '> Cek Gula Darah <span class="cb-price">Rp ' + fmt(C.gulaTotal) + '</span></label>';
    h += '<label data-key="asam"><input type="checkbox" ' + (trxTindApotek.asam ? 'checked' : '') + '> Cek Asam Urat <span class="cb-price">Rp ' + fmt(C.asamTotal) + '</span></label>';
    h += '<label data-key="kolestrol"><input type="checkbox" ' + (trxTindApotek.kolestrol ? 'checked' : '') + '> Cek Kolestrol <span class="cb-price">Rp ' + fmt(C.kolestrolTotal) + '</span></label>';
    h += '<label data-key="tensi"><input type="checkbox" ' + (trxTindApotek.tensi ? 'checked' : '') + '> Cek Tensi <span class="cb-price">Gratis</span></label>';
    el.innerHTML = h;

    var labels = el.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      (function(lb) {
        var inp = lb.querySelector('input');
        inp.addEventListener('change', function() {
          trxTindApotek[lb.dataset.key] = inp.checked;
          lb.classList.toggle('checked', inp.checked);
          renderSummary();
        });
      })(labels[i]);
    }
  }

  function loadRawatPending() {
    var el = document.getElementById('trxRawatList');
    db.collection('rawat_jalan').where('status', '==', 'menunggu_obat').orderBy('tanggal', 'desc').limit(20).get().then(function(snap) {
      if (snap.empty) { el.innerHTML = '<p style="font-size:13px;color:var(--muted)">Tidak ada rawat menunggu</p>'; return; }
      var h = '<select id="trxRawatSel" class="filter-select" style="width:100%"><option value="">-- Pilih Rawat Jalan --</option>';
      snap.docs.forEach(function(d) {
        var r = d.data();
        var tind = [];
        if (r.tindakan) {
          if (r.tindakan.cek1) tind.push('Cek1');
          if (r.tindakan.cek2) tind.push('Cek2');
          if (r.tindakan.konsultasi) tind.push('Konsultasi');
        }
        h += '<option value="' + d.id + '">' + (r.nomor || '-') + ' — ' + (r.pasienNama || '-') + ' (' + tind.join(', ') + ') — Rp ' + fmt(r.totalTindakan || 0) + '</option>';
      });
      h += '</select>';
      el.innerHTML = h;
      document.getElementById('trxRawatSel').addEventListener('change', function() {
        if (!this.value) { trxRawatId = null; trxRawatData = null; return; }
        var rawat = null;
        snap.docs.forEach(function(d) { if (d.id === this.value) rawat = d; }.bind(this));
        if (rawat) {
          trxRawatId = rawat.id;
          trxRawatData = rawat.data();
          trxPasienId = trxRawatData.pasienId;
          trxPasienNama = trxRawatData.pasienNama;
          document.getElementById('trxPsSearch').value = trxPasienNama;
          document.getElementById('trxPsInfo').style.display = 'block';
          document.getElementById('trxPsInfo').innerHTML = '<i class="fas fa-stethoscope" style="color:var(--purple)"></i> <strong>' + (trxRawatData.nomor || '') + '</strong> — ' + trxPasienNama;
          renderSummary();
        }
      });
    }).catch(function(e) { el.innerHTML = '<p style="font-size:13px;color:var(--muted)">Gagal memuat</p>'; });
  }

  function setupDropdowns() {
    var psIn = document.getElementById('trxPsSearch');
    var psDr = document.getElementById('trxPsDrop');
    psIn.addEventListener('input', function() {
      var v = this.value.toLowerCase();
      if (!v) { psDr.classList.remove('show'); return; }
      var m = [];
      for (var i = 0; i < trxPasienList.length; i++) {
        var p = trxPasienList[i];
        if ((p.nama || '').toLowerCase().indexOf(v) >= 0 || (p.noRM || '').toLowerCase().indexOf(v) >= 0) m.push(p);
        if (m.length >= 8) break;
      }
      if (!m.length) { psDr.classList.remove('show'); return; }
      var h = '';
      for (var i = 0; i < m.length; i++) {
        h += '<div class="sd-item" data-id="' + m[i].id + '" data-nama="' + escAttr(m[i].nama) + '">' + (m[i].noRM || '') + ' — ' + (m[i].nama || '') + '<div class="sd-sub">' + (m[i].telepon || '') + '</div></div>';
      }
      psDr.innerHTML = h;
      psDr.classList.add('show');
      var items = psDr.querySelectorAll('.sd-item');
      for (var i = 0; i < items.length; i++) {
        (function(it) {
          it.addEventListener('click', function() {
            trxPasienId = it.dataset.id;
            trxPasienNama = it.dataset.nama;
            psIn.value = trxPasienNama;
            psDr.classList.remove('show');
            document.getElementById('trxPsInfo').style.display = 'block';
            document.getElementById('trxPsInfo').innerHTML = '<i class="fas fa-user-check" style="color:var(--accent)"></i> ' + trxPasienNama;
          });
        })(items[i]);
      }
    });

    var obIn = document.getElementById('trxObSearch');
    var obDr = document.getElementById('trxObDrop');
    obIn.addEventListener('input', function() {
      var v = this.value.toLowerCase();
      if (!v) { obDr.classList.remove('show'); return; }
      var m = [];
      for (var i = 0; i < trxObatList.length; i++) {
        var o = trxObatList[i];
        if ((o.namaGenerik || '').toLowerCase().indexOf(v) >= 0 || (o.kodeObat || '').toLowerCase().indexOf(v) >= 0 || (o.namaMerek || '').toLowerCase().indexOf(v) >= 0) m.push(o);
        if (m.length >= 10) break;
      }
      if (!m.length) { obDr.classList.remove('show'); return; }
      var h = '';
      for (var i = 0; i < m.length; i++) {
        var o = m[i];
        h += '<div class="sd-item" data-id="' + o.id + '">' + (o.kodeObat || '') + ' — ' + (o.namaGenerik || '') + (o.namaMerek ? ' (' + o.namaMerek + ')' : '') + ' ' + (o.kekuatan || '') + '<div class="sd-sub">HPP: ' + fmt(o.hargaBeli) + ' | Stok: ' + (o.stock || 0) + ' ' + (o.satuan || '') + '</div></div>';
      }
      obDr.innerHTML = h;
      obDr.classList.add('show');
      var items = obDr.querySelectorAll('.sd-item');
      for (var i = 0; i < items.length; i++) {
        (function(it) {
          it.addEventListener('click', function() {
            addTrxItem(it.dataset.id);
            obDr.classList.remove('show');
            obIn.value = '';
          });
        })(items[i]);
      }
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('#trxPsSearch') && !e.target.closest('#trxPsDrop')) psDr.classList.remove('show');
      if (!e.target.closest('#trxObSearch') && !e.target.closest('#trxObDrop')) obDr.classList.remove('show');
    });
  }

  function addTrxItem(obatId) {
    var o = null;
    for (var i = 0; i < trxObatList.length; i++) { if (trxObatList[i].id === obatId) { o = trxObatList[i]; break; } }
    if (!o) return;
    for (var i = 0; i < trxItems.length; i++) { if (trxItems[i].obatId === obatId) { toast('Sudah ditambahkan', 'warning'); return; } }
    trxItems.push({ obatId: obatId, nama: o.namaGenerik, merek: o.namaMerek || '', sediaan: o.sediaan, kekuatan: o.kekuatan, satuan: o.satuan, hpp: o.hargaBeli, hargaJual: o.hargaJual, qty: 1, racik: false, stock: o.stock || 0 });
    renderItems();
    renderSummary();
  }

  function renderItems() {
    var el = document.getElementById('trxItemsList');
    if (!trxItems.length) { el.innerHTML = ''; return; }
    var mg = getMargin();
    var showRacik = isResep(trxTipe);
    var h = '';
    for (var i = 0; i < trxItems.length; i++) {
      var it = trxItems[i];
      var harga = showRacik ? Math.round(it.hpp * mg * it.qty) : it.hargaJual * it.qty;
      var jualSatuan = showRacik ? Math.round(it.hpp * mg) : it.hargaJual;
      h += '<div style="display:grid;grid-template-columns:1fr 80px 100px ' + (showRacik ? '60px ' : '') + '40px;gap:8px;align-items:center;margin-bottom:10px;padding:10px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">';
      h += '<div style="font-size:13px;font-weight:500">' + (it.nama || '-') + (it.merek ? ' <span style="color:var(--muted);font-size:11px">(' + it.merek + ')</span>' : '') + '<br><span style="font-size:11px;color:var(--muted)">' + (it.sediaan || '') + ' ' + (it.kekuatan || '') + ' | HPP: ' + fmt(it.hpp) + (showRacik ? ' | Jual: ' + fmt(jualSatuan) : ' | Jual: ' + fmt(it.hargaJual)) + ' | Stok: ' + it.stock + '</span></div>';
      h += '<div><input type="number" value="' + it.qty + '" min="1" max="' + it.stock + '" data-idx="' + i + '" class="trx-qty-input" style="width:100%;padding:8px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--fg);font-size:13px;text-align:center;font-family:var(--mono);outline:none"></div>';
      h += '<div style="text-align:right;font-family:var(--mono);font-size:13px;color:var(--accent);font-weight:600;padding:8px 0">' + fmt(harga) + '</div>';
      if (showRacik) h += '<div style="text-align:center"><input type="checkbox" id="rac' + i + '" ' + (it.racik ? 'checked' : '') + ' data-idx="' + i + '" class="trx-racik-input"><label for="rac' + i + '" style="font-size:11px;cursor:pointer;margin-left:4px">Racik</label></div>';
      h += '<div style="text-align:center"><button class="btn btn-danger btn-xs" data-idx="' + i + '" class="trx-rm-btn"><i class="fas fa-times"></i></button></div>';
      h += '</div>';
    }
    el.innerHTML = h;

    var qtyInputs = el.querySelectorAll('.trx-qty-input');
    for (var i = 0; i < qtyInputs.length; i++) {
      qtyInputs[i].addEventListener('change', function() {
        var idx = parseInt(this.dataset.idx);
        trxItems[idx].qty = Math.max(1, parseInt(this.value) || 1);
        renderItems();
        renderSummary();
      });
    }
    var racikInputs = el.querySelectorAll('.trx-racik-input');
    for (var i = 0; i < racikInputs.length; i++) {
      racikInputs[i].addEventListener('change', function() {
        var idx = parseInt(this.dataset.idx);
        trxItems[idx].racik = this.checked;
        renderItems();
        renderSummary();
      });
    }
    var rmBtns = el.querySelectorAll('.trx-rm-btn');
    for (var i = 0; i < rmBtns.length; i++) {
      rmBtns[i].addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        trxItems.splice(idx, 1);
        renderItems();
        renderSummary();
      });
    }
  }

  function hitung() {
    var isRK = trxTipe === 'resep_klinik';
    var isRL = trxTipe === 'resep_luar';
    var isOB = trxTipe === 'obat_bebas';
    var isTA = trxTipe === 'tindakan_apotek';
    var rows = [];
    var totalObat = 0, totalHPP = 0, totalRacik = 0, jasaResep = 0, biayaLuar = 0;
    var totalTind = 0, totalTAFee = 0, totalHPPA = 0, rawatCost = 0, subtotal = 0, pembulatan = 0;
    var mg = getMargin();

    if (isRK || isRL || isOB) {
      for (var i = 0; i < trxItems.length; i++) {
        var it = trxItems[i];
        var hpp = it.hpp * it.qty;
        var harga = (isRK || isRL) ? Math.round(it.hpp * mg * it.qty) : it.hargaJual * it.qty;
        totalObat += harga;
        totalHPP += hpp;
        if (it.racik) totalRacik += C.racikPerItem;
        rows.push({ label: (it.nama || '-') + ' ' + (it.kekuatan || '') + ' x' + it.qty + (it.racik ? ' (R)' : ''), val: harga });
      }
      if (isRK) { jasaResep = C.jasaResep; rows.push({ label: 'Jasa Resep', val: jasaResep }); }
      if (isRL) { biayaLuar = C.biayaResepLuar; rows.push({ label: 'Biaya Resep Luar', val: biayaLuar }); }
      if (totalRacik) rows.push({ label: 'Racik (' + trxItems.filter(function(x) { return x.racik; }).length + ' item)', val: totalRacik });
      if (isRK && trxRawatData) { rawatCost = trxRawatData.totalTindakan || 0; rows.push({ label: 'Rawat (' + (trxRawatData.nomor || '') + ')', val: rawatCost }); }
      subtotal = totalObat + jasaResep + biayaLuar + totalRacik + rawatCost;
    } else if (isTA) {
      if (trxTindApotek.gula) { totalTind += C.gulaTotal; totalTAFee += C.gulaTindangan; totalHPPA += (C.gulaTotal - C.gulaTindangan); rows.push({ label: 'Cek Gula Darah', val: C.gulaTotal }); }
      if (trxTindApotek.asam) { totalTind += C.asamTotal; totalTAFee += C.asamTindangan; totalHPPA += (C.asamTotal - C.asamTindangan); rows.push({ label: 'Cek Asam Urat', val: C.asamTotal }); }
      if (trxTindApotek.kolestrol) { totalTind += C.kolestrolTotal; totalTAFee += C.kolestrolTindangan; totalHPPA += (C.kolestrolTotal - C.kolestrolTindangan); rows.push({ label: 'Cek Kolestrol', val: C.kolestrolTotal }); }
      if (trxTindApotek.tensi) rows.push({ label: 'Cek Tensi', val: 0 });
      subtotal = totalTind;
    }

    pembulatan = hitungPembulatan(subtotal);
    if (pembulatan > 0) rows.push({ label: 'Pembulatan', val: pembulatan });

    var bh = {
      bhDokter: isRK ? C.bhDokter : 0, jdDokter: isRK ? C.jdDokter : 0,
      bagianKlinik: isRK ? C.bagianKlinikResep : 0, tuslah: isRK ? C.tuslah : 0,
      kasResep: isRK ? C.kasResep : 0, dokterLuar: isRL ? C.dokterLuar : 0, labaLuar: isRL ? C.labaLuar : 0,
      racikDa: totalRacik, makanDa: pembulatan, omzetDa: totalObat - totalHPP,
      rawatKlinik: rawatCost, hppApotek: totalHPPA, totalHPP: totalHPP,
      totalObat: totalObat, totalTindakan: totalTind, totalRacik: totalRacik,
      jasaResep: jasaResep, biayaLuar: biayaLuar, totalTindakanApotekFee: totalTAFee
    };

    return { rows: rows, subtotal: subtotal, pembulatan: pembulatan, totalAkhir: subtotal + pembulatan, bagiHasil: bh };
  }

  function renderSummary() {
    var h;
    try { h = hitung(); } catch (e) { return; }
    var tb = document.getElementById('trxSummaryTable');
    if (!tb) return;
    var html = '';
    for (var i = 0; i < h.rows.length; i++) {
      html += '<tr><td>' + h.rows[i].label + '</td><td>Rp ' + fmt(h.rows[i].val) + '</td></tr>';
    }
    html += '<tr class="total-row"><td>TOTAL</td><td>Rp ' + fmt(h.totalAkhir) + '</td></tr>';
    tb.innerHTML = html;
  }

  function doSave() {
    var h;
    try { h = hitung(); } catch (e) { toast('Error hitungan', 'error'); return; }
    if (h.totalAkhir <= 0) { toast('Tidak ada item', 'error'); return; }
    if ((isResep(trxTipe) || trxTipe === 'obat_bebas') && !trxItems.length) { toast('Tambahkan obat', 'error'); return; }
    if (trxTipe === 'tindakan_apotek' && !trxTindApotek.gula && !trxTindApotek.asam && !trxTindApotek.kolestrol) { toast('Pilih tindakan', 'error'); return; }

    for (var i = 0; i < trxItems.length; i++) {
      if (trxItems[i].qty > (trxItems[i].stock || 0)) { toast('Stok ' + trxItems[i].nama + ' tidak cukup (' + trxItems[i].stock + ')', 'error'); return; }
    }

    var btn = document.getElementById('trxSave');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    var ds = ts().toISOString().slice(0, 10).replace(/-/g, '');
    var mg = getMargin();
    db.collection('transaksi').where('nomor', '>=', 'TRX-' + ds).where('nomor', '<', 'TRX-' + ds + 'Z').orderBy('nomor', 'desc').limit(1).get().then(function(snap) {
      var lastNum = snap.empty ? 0 : parseInt(snap.docs[0].data().nomor.slice(-4)) || 0;
      var nomor = editTrxId ? (function(){ for(var x=0;x<trxHistory.length;x++){if(trxHistory[x].id===editTrxId) return trxHistory[x].nomor; } return 'TRX-'+ds+'-'+String(lastNum+1).padStart(4,'0'); })() : 'TRX-' + ds + '-' + String(lastNum + 1).padStart(4, '0');
      var hour = ts().getHours();
      var shift = hour < 13 ? 'pagi' : 'siang';

      var items = [];
      for (var i = 0; i < trxItems.length; i++) {
        var it = trxItems[i];
        items.push({
          obatId: it.obatId, nama: it.nama, hpp: it.hpp,
          hargaJual: isResep(trxTipe) ? Math.round(it.hpp * mg) : it.hargaJual,
          qty: it.qty, racik: it.racik,
          subtotal: isResep(trxTipe) ? Math.round(it.hpp * mg * it.qty) : it.hargaJual * it.qty
        });
      }

      var trxData = {
        nomor: nomor, tanggal: now(), tipe: trxTipe,
        pasienId: trxPasienId, pasienNama: trxPasienNama,
        shift: shift, karyawanId: currentUser ? currentUser.email : '',
        items: items,
        tindakanApotek: trxTipe === 'tindakan_apotek' ? { gula: trxTindApotek.gula, asam: trxTindApotek.asam, kolestrol: trxTindApotek.kolestrol, tensi: trxTindApotek.tensi } : null,
        rawatJalanId: trxRawatId, rawatJalanNomor: trxRawatData ? trxRawatData.nomor : null, rawatJalanTotal: trxRawatData ? trxRawatData.totalTindakan : 0,
        jasaResep: h.bagiHasil.jasaResep, biayaResepLuar: h.bagiHasil.biayaLuar,
        totalObat: h.bagiHasil.totalObat, totalRacik: h.bagiHasil.totalRacik, totalTindakan: h.bagiHasil.totalTindakan,
        totalTindakanApotekFee: h.bagiHasil.totalTindakanApotekFee,
        subtotal: h.subtotal, pembulatan: h.pembulatan, totalAkhir: h.totalAkhir,
        bagiHasil: h.bagiHasil, status: 'selesai'
      };

      var batch = db.batch();
      var trxRef = db.collection('transaksi').doc();

      // Jika mode edit, kembalikan stok lama dulu
      if (editTrxId) {
        var oldDoc = null;
        for (var x = 0; x < trxHistory.length; x++) { if (trxHistory[x].id === editTrxId) { oldDoc = trxHistory[x]; break; } }
        if (oldDoc && oldDoc.items) {
          for (var x = 0; x < oldDoc.items.length; x++) {
            var oldIt = oldDoc.items[x];
            if (oldIt.obatId) batch.update(db.collection('obat').doc(oldIt.obatId), { stock: firebase.firestore.FieldValue.increment(oldIt.qty) });
          }
        }
        if (oldDoc && oldDoc.rawatJalanId) {
          batch.update(db.collection('rawat_jalan').doc(oldDoc.rawatJalanId), { status: 'menunggu_obat', transaksiId: firebase.firestore.FieldValue.delete(), transaksiNomor: firebase.firestore.FieldValue.delete() });
        }
        trxRef = db.collection('transaksi').doc(editTrxId);
      }

      batch.set(trxRef, trxData);

      if (isResep(trxTipe) || trxTipe === 'obat_bebas') {
        for (var i = 0; i < trxItems.length; i++) {
          var it = trxItems[i];
          batch.update(db.collection('obat').doc(it.obatId), { stock: firebase.firestore.FieldValue.increment(-it.qty) });
          batch.set(db.collection('stock_mutasi').doc(), {
            obatId: it.obatId, tipe: 'keluar', jumlah: -it.qty,
            stockSebelum: it.stock, stockSesudah: it.stock - it.qty,
            keterangan: 'Penjualan ' + nomor, tanggal: now(),
            userId: currentUser ? currentUser.email : '', referensi: nomor
          });
        }
      }

      if (trxRawatId) {
        batch.update(db.collection('rawat_jalan').doc(trxRawatId), { status: 'selesai', transaksiId: trxRef.id, transaksiNomor: nomor });
      }

      return batch.commit();
    }).then(function() {
      if (editTrxId) {
        toast(nomor + ' — diperbarui', 'success');
      } else {
        toast(nomor + ' — Rp ' + fmt(h.totalAkhir), 'success');
      }
      editTrxId = null;
      trxReset();
      loadHist();
    }).catch(function(e) {
      toast('Gagal: ' + e.message, 'error');
      console.error('Save trx error:', e);
    }).finally(function() {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Transaksi';
      btn.style.background = '';
      btn.style.color = '';
    });
  }

  // ================================================================
  //  DETAIL TRANSAKSI
  // ================================================================
  function detailTrx(id) {
    var t = null;
    for (var i = 0; i < trxHistory.length; i++) { if (trxHistory[i].id === id) { t = trxHistory[i]; break; } }
    if (!t) return;
    var labels = { resep_klinik: 'Resep Klinik', resep_luar: 'Resep Luar', obat_bebas: 'Obat Bebas', tindakan_apotek: 'Tindakan Apotek' };

    var h = '<div class="trx-section"><h4><i class="fas fa-receipt"></i> Detail Transaksi</h4>';
    h += '<div class="form-grid"><div class="form-group"><label>Nomor</label><input value="' + (t.nomor || '') + '" readonly></div>';
    h += '<div class="form-group"><label>Tipe</label><input value="' + (labels[t.tipe] || t.tipe || '') + '" readonly></div>';
    h += '<div class="form-group"><label>Pasien</label><input value="' + (t.pasienNama || '-') + '" readonly></div>';
    h += '<div class="form-group"><label>Tanggal</label><input value="' + fmtDate(t.tanggal) + '" readonly></div>';
    h += '<div class="form-group"><label>Shift</label><input value="' + (t.shift || '-') + '" readonly></div>';
    h += '<div class="form-group"><label>Total</label><input value="Rp ' + fmt(t.totalAkhir) + '" readonly style="color:var(--accent);font-weight:700"></div></div></div>';

    if (t.items && t.items.length) {
      h += '<h4 style="margin:16px 0 10px;font-size:13px;font-weight:700;color:var(--muted)">Item Obat</h4>';
      h += '<div class="table-wrap"><table><thead><tr><th>Nama</th><th class="num">HPP</th><th class="num">Jual</th><th>Qty</th><th>Racik</th><th class="num">Subtotal</th></tr></thead><tbody>';
      for (var i = 0; i < t.items.length; i++) {
        var it = t.items[i];
        h += '<tr><td>' + (it.nama || '-') + '</td><td class="num">' + fmt(it.hpp) + '</td><td class="num">' + fmt(it.hargaJual) + '</td><td>' + it.qty + '</td><td>' + (it.racik ? 'Ya' : '-') + '</td><td class="num">' + fmt(it.subtotal) + '</td></tr>';
      }
      h += '</tbody></table></div>';
    }

    if (t.tipe === 'tindakan_apotek' && t.tindakanApotek) {
      var ta = t.tindakanApotek;
      h += '<h4 style="margin:16px 0 10px;font-size:13px;font-weight:700;color:var(--muted)">Tindakan Apotek</h4>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
      if (ta.gula) h += '<span class="pill pill-approved">Cek Gula Darah</span>';
      if (ta.asam) h += '<span class="pill pill-approved">Cek Asam Urat</span>';
      if (ta.kolestrol) h += '<span class="pill pill-approved">Cek Kolestrol</span>';
      if (ta.tensi) h += '<span class="pill pill-draft">Cek Tensi</span>';
      h += '</div>';
    }

    if (t.rawatJalanNomor) {
      h += '<p style="margin-top:16px;font-size:13px;color:var(--purple)"><i class="fas fa-stethoscope"></i> Rawat Jalan: ' + t.rawatJalanNomor + ' (Rp ' + fmt(t.rawatJalanTotal || 0) + ')</p>';
    }

    h += '<div style="margin-top:20px"><button class="btn btn-outline btn-sm" onclick="Trx.closeDetail()" style="width:auto"><i class="fas fa-arrow-left"></i> Kembali ke Riwayat</button></div></div>';

    var riwayatEl = document.querySelector('.trx-riwayat');
    if (riwayatEl) riwayatEl.innerHTML = h;
  }

  function closeDetail() {
    var riwayatEl = document.querySelector('.trx-riwayat');
    if (riwayatEl) {
      riwayatEl.innerHTML = '<div class="section-title"><i class="fas fa-history"></i> Riwayat Terakhir</div><div class="table-wrap"><div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nomor</th><th>Tipe</th><th>Pasien</th><th class="num">Total</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody id="trxHistBody"></tbody></table></div></div>';
      renderHist();
    }
  }

  // ================================================================
  //  EDIT TRANSAKSI
  // ================================================================
  function editTrx(id) {
    var t = null;
    for (var i = 0; i < trxHistory.length; i++) { if (trxHistory[i].id === id) { t = trxHistory[i]; break; } }
    if (!t) { toast('Data tidak ditemukan', 'error'); return; }

    editTrxId = id;
    trxTipe = t.tipe;
    trxPasienId = t.pasienId || null;
    trxPasienNama = t.pasienNama || '';

    var allBtns = document.querySelectorAll('.trx-type-btn');
    for (var i = 0; i < allBtns.length; i++) {
      allBtns[i].classList.remove('active');
      if (allBtns[i].dataset.tipe === trxTipe) allBtns[i].classList.add('active');
    }

    trxItems = [];
    if (t.items) {
      for (var i = 0; i < t.items.length; i++) {
        var it = t.items[i];
        var obatData = null;
        for (var j = 0; j < trxObatList.length; j++) {
          if (trxObatList[j].id === it.obatId) { obatData = trxObatList[j]; break; }
        }
        trxItems.push({
          obatId: it.obatId, nama: it.nama, merek: obatData ? (obatData.namaMerek || '') : '',
          sediaan: obatData ? obatData.sediaan : '', kekuatan: obatData ? obatData.kekuatan : '',
          satuan: obatData ? obatData.satuan : '', hpp: it.hpp, hargaJual: it.hargaJual,
          qty: it.qty, racik: it.racik || false, stock: obatData ? (obatData.stock || 0) : 0
        });
      }
    }

    if (t.tipe === 'tindakan_apotek' && t.tindakanApotek) {
      trxTindApotek = { gula: !!t.tindakanApotek.gula, asam: !!t.tindakanApotek.asam, kolestrol: !!t.tindakanApotek.kolestrol, tensi: !!t.tindakanApotek.tensi };
    } else {
      trxTindApotek = { gula: false, asam: false, kolestrol: false, tensi: false };
    }

    trxRawatId = t.rawatJalanId || null;
    trxRawatData = t.rawatJalanNomor ? { nomor: t.rawatJalanNomor, totalTindakan: t.rawatJalanTotal || 0, pasienId: t.pasienId, pasienNama: t.pasienNama } : null;

    var psEl = document.getElementById('trxPsSearch');
    if (psEl) psEl.value = trxPasienNama;
    var psInfo = document.getElementById('trxPsInfo');
    if (psInfo && trxPasienNama) {
      psInfo.style.display = 'block';
      psInfo.innerHTML = '<i class="fas fa-user-check" style="color:var(--accent)"></i> ' + trxPasienNama;
    }

    updateUI();
    renderItems();
    renderSummary();

    document.getElementById('trxTypes').scrollIntoView({ behavior: 'smooth', block: 'start' });

    var saveBtn = document.getElementById('trxSave');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Transaksi';
    saveBtn.style.background = 'var(--info)';
    saveBtn.style.color = '#fff';

    toast('Mode edit — ubah data lalu klik Update', 'info');
  }

  // ================================================================
  //  DELETE TRANSAKSI
  // ================================================================
  function deleteTrx(id, nomor) {
    if (!confirm('Hapus transaksi "' + nomor + '"?\n\nStok obat akan dikembalikan.\nRawat jalan (jika ada) akan dikembalikan ke status Menunggu Obat.')) return;

    var t = null;
    for (var i = 0; i < trxHistory.length; i++) { if (trxHistory[i].id === id) { t = trxHistory[i]; break; } }
    if (!t) { toast('Data tidak ditemukan', 'error'); return; }

    var btn = document.querySelector('.trx-riwayat button[onclick*="deleteTrx(\'' + id + '\')"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    db.collection('transaksi').doc(id).get().then(function(doc) {
      if (!doc.exists) { toast('Data sudah dihapus', 'warning'); return; }
      var data = doc.data();
      var batch = db.batch();

      batch.delete(db.collection('transaksi').doc(id));

      if (data.items) {
        for (var i = 0; i < data.items.length; i++) {
          var it = data.items[i];
          if (it.obatId) {
            batch.update(db.collection('obat').doc(it.obatId), { stock: firebase.firestore.FieldValue.increment(it.qty) });
            batch.set(db.collection('stock_mutasi').doc(), {
              obatId: it.obatId, tipe: 'masuk', jumlah: it.qty,
              stockSebelum: (it.stock || 0), stockSesudah: (it.stock || 0) + it.qty,
              keterangan: 'Pembatalan ' + nomor, tanggal: now(),
              userId: currentUser ? currentUser.email : '', referensi: nomor
            });
          }
        }
      }

      if (data.rawatJalanId) {
        batch.update(db.collection('rawat_jalan').doc(data.rawatJalanId), {
          status: 'menunggu_obat', transaksiId: firebase.firestore.FieldValue.delete(), transaksiNomor: firebase.firestore.FieldValue.delete()
        });
      }

      return batch.commit();
    }).then(function() {
      toast('Transaksi "' + nomor + '" dihapus', 'success');
      loadHist();
    }).catch(function(e) {
      toast('Gagal menghapus: ' + e.message, 'error');
      var btn2 = document.querySelector('.trx-riwayat button[onclick*="deleteTrx(\'' + id + '\')"]');
      if (btn2) { btn2.disabled = false; btn2.innerHTML = '<i class="fas fa-trash"></i>'; }
    });
  }

  // ================================================================
  //  LOAD & RENDER RIWAYAT
  // ================================================================
  function loadHist() {
    db.collection('transaksi').orderBy('tanggal', 'desc').limit(30).get().then(function(snap) {
      trxHistory = [];
      snap.docs.forEach(function(d) { var o = { id: d.id }; var data = d.data(); var keys = Object.keys(data); for (var i = 0; i < keys.length; i++) o[keys[i]] = data[keys[i]]; trxHistory.push(o); });
      renderHist();
    }).catch(function(e) { console.error('Load hist error:', e); });
  }

  function renderHist() {
    var tb = document.getElementById('trxHistBody');
    if (!tb) return;
    var labels = { resep_klinik: 'Resep Klinik', resep_luar: 'Resep Luar', obat_bebas: 'Obat Bebas', tindakan_apotek: 'Tindakan Apotek' };
    if (!trxHistory.length) { tb.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-history"></i><p>Belum ada transaksi</p></div></td></tr>'; return; }
    var h = '';
    for (var i = 0; i < trxHistory.length; i++) {
      var t = trxHistory[i];
      h += '<tr><td>' + (i + 1) + '</td><td style="font-family:var(--mono);font-size:12px;color:var(--accent)">' + (t.nomor || '-') + '</td><td style="font-size:12px">' + (labels[t.tipe] || t.tipe || '-') + '</td><td style="font-size:12px">' + (t.pasienNama || '-') + '</td><td class="num" style="font-weight:600">Rp ' + fmt(t.totalAkhir) + '</td><td style="font-size:12px;color:var(--muted)">' + fmtDate(t.tanggal) + '</td><td class="actions"><button class="btn btn-outline btn-xs" onclick="Trx.detail(\'' + t.id + '\')" title="Detail"><i class="fas fa-eye"></i></button> <button class="btn btn-primary btn-xs" onclick="Trx.editTrx(\'' + t.id + '\')" title="Edit"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-xs" onclick="Trx.deleteTrx(\'' + t.id + '\',\'' + escAttr(t.nomor) + '\')" title="Hapus"><i class="fas fa-trash"></i></button></td></tr>';
    }
    tb.innerHTML = h;
  }

  // Expose ke global
  window.Trx = { detailTrx: detailTrx, closeDetail: closeDetail, editTrx: editTrx, deleteTrx: deleteTrx };

  // ================================================================
  //  LISTENERS OBAT & PASIEN (untuk dropdown)
  // ================================================================
  db.collection('obat').onSnapshot(function(snap) {
    trxObatList = [];
    snap.docs.forEach(function(d) { var o = { id: d.id }; var data = d.data(); var keys = Object.keys(data); for (var i = 0; i < keys.length; i++) o[keys[i]] = data[keys[i]]; trxObatList.push(o); });
  }, function(err) { console.error('Trx obat listener:', err); });

  db.collection('pasien').onSnapshot(function(snap) {
    trxPasienList = [];
    snap.docs.forEach(function(d) { var o = { id: d.id }; var data = d.data(); var keys = Object.keys(data); for (var i = 0; i < keys.length; i++) o[keys[i]] = data[keys[i]]; trxPasienList.push(o); });
  }, function(err) { console.error('Trx pasien listener:', err); });

  var obs = new MutationObserver(function() { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
});
