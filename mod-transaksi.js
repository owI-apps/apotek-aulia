registerModule('transaksi', function() {
  const page = document.getElementById('page-transaksi');
  let trxTipe = 'resep_klinik';
  let trxPasienId = null;
  let trxPasienNama = '';
  let trxItems = [];
  let trxRawatId = null;
  let trxRawatData = null;
  let trxTindApotek = { gula: false, asam: false, kolestrol: false, tensi: false };
  let editTrxId = null;
  let trxHistory = [];

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
      + '<div class="trx-section"><h4><i class="fas fa-user"></i> Pasien (opsional)</h4><div class="search-wrap"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="trxPsSe..."
      + '<div class="trx-section" id="trxObatSection"><h4><i class="fas fa-pills"></i> Item Obat</h4><div class="search-wrap"><div class="search-box"><i class="fas fa-search"></i><input type="text..."
      + '<div class="trx-section" id="trxTindSection" style="display:none"><h4><i class="fas fa-vial"></i> Pilih Tindakan</h4><div class="cb-group" id="cbTind"></div></div>'
      + '<div class="trx-section" id="trxSummarySection"><h4><i class="fas fa-calculator"></i> Ringkasan</h4><table class="trx-summary-table" id="trxSummaryTable"></table></div>'
      + '<div style="display:flex;gap:10px;margin-bottom:28px"><button class="btn btn-outline btn-sm" id="trxReset" style="width:auto"><i class="fas fa-undo"></i> Reset</button><button class="btn ..."
      + '<div class="trx-riwayat"><div class="section-title"><i class="fas fa-history"></i> Riwayat Terakhir</div><div class="table-wrap"><div style="overflow-x:auto"><table><thead><tr><th>No</th>...'

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
    trxPasienId = null; trxPasienNama = ''; trxItems = []; trxRawatId = null; trxRawatData = null;
    trxTindApotek = { gula: false, asam: false, kolestrol: false, tensi: false };
    var psEl = document.getElementById('trxPsSearch'); if (psEl) psEl.value = '';
    var psInfo = document.getElementById('trxPsInfo'); if (psInfo) psInfo.style.display = 'none';
    var itemsEl = document.getElementById('trxItemsList'); if (itemsEl) itemsEl.innerHTML = '';
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
    var rawatGlobal = window._rawatList || [];
    var pending = rawatGlobal.filter(r => r.status === 'menunggu_obat');
    
    if (!pending.length) { el.innerHTML = '<p style="font-size:13px;color:var(--muted)">Tidak ada rawat menunggu</p>'; return; }
    var h = '<select id="trxRawatSel" class="filter-select" style="width:100%"><option value="">-- Pilih Rawat Jalan --</option>';
    pending.forEach(r => {
      var tind = [];
      if (r.tindakan) { if(r.tindakan.gula) tind.push('Gula'); if(r.tindakan.asam) tind.push('Asam'); if(r.tindakan.kolestrol) tind.push('Kolestrol'); if(r.tindakan.nebu) tind.push('Nebu'); if(r.t.[...]
      h += '<option value="' + r.id + '">' + (r.nomor || '-') + ' — ' + (r.pasienNama || '-') + ' (' + tind.join(', ') + ') — Rp ' + fmt(r.totalTindakan || 0) + '</option>';
    });
    h += '</select>';
    el.innerHTML = h;
    
    document.getElementById('trxRawatSel').addEventListener('change', function() {
      if (!this.value) { trxRawatId = null; trxRawatData = null; return; }
      var rawat = pending.find(r => r.id === this.value);
      if (rawat) {
        trxRawatId = rawat.id; trxRawatData = rawat;
        trxPasienId = rawat.pasienId; trxPasienNama = rawat.pasienNama;
        document.getElementById('trxPsSearch').value = trxPasienNama;
        document.getElementById('trxPsInfo').style.display = 'block';
        document.getElementById('trxPsInfo').innerHTML = '<i class="fas fa-stethoscope" style="color:var(--purple)"></i> <strong>' + (rawat.nomor || '') + '</strong> — ' + trxPasienNama;
        renderSummary();
      }
    });
  }

  function setupDropdowns() {
    var psIn = document.getElementById('trxPsSearch');
    var psDr = document.getElementById('trxPsDrop');
    psIn.addEventListener('input', function() {
      var v = this.value.toLowerCase();
      var pasienList = window._pasienList || []; // OPTIMASI
      if (!v) { psDr.classList.remove('show'); return; }
      var m = pasienList.filter(p => (p.nama || '').toLowerCase().indexOf(v) >= 0 || (p.noRM || '').toLowerCase().indexOf(v) >= 0).slice(0, 8);
      if (!m.length) { psDr.classList.remove('show'); return; }
      var h = '';
      for (var i = 0; i < m.length; i++) {
        h += '<div class="sd-item" data-id="' + m[i].id + '" data-nama="' + escAttr(m[i].nama) + '">' + (m[i].noRM || '') + ' — ' + (m[i].nama || '') + '<div class="sd-sub">' + (m[i].telepon ||...]
      }
      psDr.innerHTML = h; psDr.classList.add('show');
      var items = psDr.querySelectorAll('.sd-item');
      for (var i = 0; i < items.length; i++) {
        (function(it) {
          it.addEventListener('click', function() {
            trxPasienId = it.dataset.id; trxPasienNama = it.dataset.nama;
            psIn.value = trxPasienNama; psDr.classList.remove('show');
            document.getElementById('trxPsInfo').style.display = 'block';
{