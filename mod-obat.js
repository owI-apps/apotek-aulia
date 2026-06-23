registerModule('obat', function() {
  const page = document.getElementById('page-obat');
  let allObat = [];
  let importData = [];
  let unsubObat = null;
  const isAdmin = userRole === 'admin';

  const KATEGORI_LIST = ['Analgesik-Antipiretik','Antibiotik','Antihistamin','Antasida-Gastrointestinal','Antidiabetik','Antihipertensi','Kortikosteroid','Vitamin-Suplemen','Batuk-Pilek','Antialergi','Lainnya'];

  function render() {
    if (unsubObat) { unsubObat(); unsubObat = null; }
    
    let katOpts = '<option value="">Semua Kategori</option>';
    KATEGORI_LIST.forEach(k => katOpts += `<option>${k}</option>`);
    
    let impBtns = isAdmin ? `
      <button class="btn btn-outline btn-sm" id="obBtnImport" style="width:auto"><i class="fas fa-file-excel"></i> Import</button>
      <button class="btn btn-outline btn-sm" id="obBtnExport" style="width:auto"><i class="fas fa-download"></i> Export</button>
    ` : '';

    page.innerHTML = `
      <div class="stats-grid" style="margin-bottom:18px">
        <div class="stat-card"><div class="s-label">Total Jenis</div><div class="s-value green" id="obTotal">0</div></div>
        <div class="stat-card"><div class="s-label">Stok Rendah</div><div class="s-value red" id="obLow">0</div></div>
        <div class="stat-card"><div class="s-label">Total Unit</div><div class="s-value blue" id="obStock">0</div></div>
        <div class="stat-card"><div class="s-label">Nilai Persediaan</div><div class="s-value yellow" id="obNilai">Rp 0</div></div>
      </div>
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="obSearch" placeholder="Cari kode, nama obat..."></div>
        <select class="filter-select" id="obFilterKat">${katOpts}</select>
        <select class="filter-select" id="obFilterStok"><option value="">Semua Stok</option><option value="low">Stok Rendah</option><option value="ok">Stok Aman</option><option value="zero">Stok Habis</option></select>
        <button class="btn btn-primary btn-sm" id="obBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Tambah</button>
        ${impBtns}
      </div>
      <div class="table-wrap">
        <div style="overflow-x:auto"><table>
          <thead><tr><th>No</th><th>Kode</th><th>Nama Obat</th><th>Kategori</th><th>Sediaan</th><th class="num">HPP</th><th class="num">Harga Jual</th><th class="num">Stok</th><th>Aksi</th></tr></thead>
          <tbody id="obBody"><tr><td colspan="9"><div class="empty-state"><i class="fas fa-pills"></i><p>Memuat...</p></div></td></tr></tbody>
        </table></div>
        <div class="table-footer"><span id="obCount">0 data</span><span id="obFilterInfo"></span></div>
      </div>`;

    document.getElementById('obSearch').addEventListener('input', renderTable);
    document.getElementById('obFilterKat').addEventListener('change', renderTable);
    document.getElementById('obFilterStok').addEventListener('change', renderTable);
    document.getElementById('obBtnAdd').addEventListener('click', openAdd);
    
    if (isAdmin) {
      document.getElementById('obBtnImport').addEventListener('click', () => {
        importData = []; 
        document.getElementById('importPreviewWrap').style.display = 'none';
        document.getElementById('importResult').innerHTML = '';
        document.getElementById('btnDoImport').style.display = 'none';
        document.getElementById('importFile').value = '';
        openModal('modalImport');
      });
      document.getElementById('obBtnExport').addEventListener('click', doExport);
    }
    
    setupImportZone();
    startListener();
  }

  function startListener() {
    unsubObat = db.collection('obat').orderBy('kodeObat', 'asc').onSnapshot(snap => {
      allObat = snap.docs.map(d => ({id: d.id, ...d.data()}));
      
      // PENTING: Expose ke global supaya Dashboard, Laporan, dll bisa pakai tanpa query Firebase
      window._obatList = allObat; 
      
      renderTable();
      updateStats();
    }, err => console.error('Obat listener error:', err));
  }

  function getFiltered() {
    const s = (document.getElementById('obSearch').value || '').toLowerCase();
    const k = document.getElementById('obFilterKat').value;
    const sf = document.getElementById('obFilterStok').value;
    
    return allObat.filter(o => {
      if (s && (o.kodeObat||'').toLowerCase().indexOf(s) === -1 && (o.namaGenerik||'').toLowerCase().indexOf(s) === -1 && (o.namaMerek||'').toLowerCase().indexOf(s) === -1) return false;
      if (k && o.kategori !== k) return false;
      if (sf === 'low' && (o.stock||0) > (o.minStock||0)) return false;
      if (sf === 'ok' && (o.stock||0) <= (o.minStock||0)) return false;
      if (sf === 'zero' && (o.stock||0) > 0) return false;
      return true;
    });
  }

  function renderTable() {
    const tb = document.getElementById('obBody'); if (!tb) return;
    const f = getFiltered();
    const cEl = document.getElementById('obCount'), fEl = document.getElementById('obFilterInfo');
    if (cEl) cEl.textContent = f.length + ' dari ' + allObat.length;
    if (fEl) fEl.textContent = f.length < allObat.length ? '(difilter)' : '';
    
    if (!f.length) {
      tb.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-pills"></i><p>${allObat.length ? 'Tidak cocok dengan filter.' : 'Belum ada data obat.'}</p></div></td></tr>`;
      return;
    }

    let h = '';
    f.forEach((o, i) => {
      const sk = o.stock || 0, ms = o.minStock || 0;
      const sc = (sk === 0 || sk <= ms) ? 'stock-low' : 'stock-ok';
      const mk = o.namaMerek ? ` <span style="color:var(--muted);font-size:11px">(${o.namaMerek})</span>` : '';
      const kk = o.kekuatan ? ` (${o.kekuatan})` : '';
      
      h += `<tr>
        <td>${i + 1}</td>
        <td style="font-family:var(--mono);font-size:12px;color:var(--muted)">${o.kodeObat||'-'}</td>
        <td style="font-weight:500">${o.namaGenerik||'-'}${mk}</td>
        <td style="font-size:12px;color:var(--muted)">${o.kategori||'-'}</td>
        <td style="font-size:12px">${o.sediaan||'-'}${kk}</td>
        <td class="num">${fmt(o.hargaBeli)}</td>
        <td class="num">${fmt(o.hargaJual)}</td>
        <td class="num ${sc}">${sk} ${o.satuan||''}</td>
        <td class="actions">
          <button class="btn btn-outline btn-xs" onclick="Obat.edit('${o.id}')" title="Edit"><i class="fas fa-edit"></i></button> 
          <button class="btn btn-primary btn-xs" onclick="Obat.adjust('${o.id}', 'tambah')" title="+Stok"><i class="fas fa-plus"></i></button> 
          <button class="btn btn-warning btn-xs" onclick="Obat.adjust('${o.id}', 'kurang')" title="-Stok"><i class="fas fa-minus"></i></button>
          ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="Obat.hapus('${o.id}', '${escAttr(o.namaGenerik)}')" title="Hapus"><i class="fas fa-trash"></i></button>` : ''}
        </td>
      </tr>`;
    });
    tb.innerHTML = h;
  }

  function updateStats() {
    let lowC = 0, totU = 0, totN = 0;
    allObat.forEach(o => { 
      if ((o.stock||0) <= (o.minStock||0)) lowC++; 
      totU += (o.stock||0); 
      totN += (o.stock||0) * (o.hargaBeli||0); 
    });
    
    const e = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    e('obTotal', allObat.length);
    e('obLow', lowC);
    e('obStock', fmt(totU));
    e('obNilai', 'Rp ' + fmt(totN));
  }

  function openAdd() {
    document.getElementById('modalObatTitle').textContent = 'Tambah Obat';
    document.getElementById('obEditId').value = '';
    document.getElementById('obKode').value = ''; document.getElementById('obGenerik').value = ''; document.getElementById('obMerek').value = ''; document.getElementById('obKekuatan').value = '';
    document.getElementById('obKategori').selectedIndex = 0; document.getElementById('obSediaan').selectedIndex = 0; document.getElementById('obSatuan').selectedIndex = 0;
    document.getElementById('obHPP').value = ''; document.getElementById('obHargaJual').value = ''; document.getElementById('obStok').value = '0'; document.getElementById('obMinStok').value = '';
    openModal('modalObat'); document.getElementById('obKode').focus();
  });

  function edit(id) {
    const o = allObat.find(x => x.id === id); if (!o) return;
    document.getElementById('modalObatTitle').textContent = 'Edit Obat'; document.getElementById('obEditId').value = o.id;
    document.getElementById('obKode').value = o.kodeObat||''; document.getElementById('obGenerik').value = o.namaGenerik||''; document.getElementById('obMerek').value = o.namaMerek||''; document.[...]
    document.getElementById('obHPP').value = o.hargaBeli||''; document.getElementById('obHargaJual').value = o.hargaJual||''; document.getElementById('obStok').value = o.stock||''; document.getEl[...]
    setSel('obKategori', o.kategori); setSel('obSediaan', o.sediaan); setSel('obSatuan', o.satuan);
    openModal('modalObat');
  }

  function adjust(id, mode) {
    const o = allObat.find(x => x.id === id); if (!o) return;
    document.getElementById('stokObatId').value = id; document.getElementById('stokObatNama').textContent = o.namaGenerik;
    document.getElementById('stokObatJumlah').textContent = (o.stock||0) + ' ' + (o.satuan||''); document.getElementById('stokJumlah').value = '';
    document.getElementById('modalStokTitle').textContent = mode === 'tambah' ? 'Tambah Stok' : 'Kurang Stok';
    document.getElementById('stokKeterangan').selectedIndex = mode === 'tambah' ? 0 : 3;
    openModal('modalStok'); document.getElementById('stokJumlah').focus();
  }

  function hapus(id, nama) { 
    if (!confirm(`Hapus "${nama}"?`)) return; 
    db.collection('obat').doc(id).delete().then(() => toast('Dihapus', 'success')).catch(e => toast('Gagal: ' + e.message, 'error')); 
  }

  window.Obat = { edit, adjust, hapus };

  // SAVE OBAT
  document.getElementById('obBtnSave').addEventListener('click', () => {
    const eid = document.getElementById('obEditId').value;
    const d = {
      kodeObat: document.getElementById('obKode').value.trim(), namaGenerik: document.getElementById('obGenerik').value.trim(), namaMerek: document.getElementById('obMerek').value.trim(),
      kategori: document.getElementById('obKategori').value, sediaan: document.getElementById('obSediaan').value, kekuatan: document.getElementById('obKekuatan').value.trim(),
      satuan: document.getElementById('obSatuan').value, hargaBeli: parseFloat(document.getElementById('obHPP').value) || 0, hargaJual: parseFloat(document.getElementById('obHargaJual').value) || 0,
      stock: parseInt(document.getElementById('obStok').value) || 0, minStock: parseInt(document.getElementById('obMinStok').value) || 0, status: 'aktif'
    };
    if (!d.kodeObat) { toast('Kode wajib', 'error'); return; } if (!d.namaGenerik) { toast('Nama wajib', 'error'); return; }
    
    let p; if (eid) { p = db.collection('obat').doc(eid).update(d); } else { d.createdAt = now(); p = db.collection('obat').add(d); }
    p.then(() => { toast(eid ? 'Diperbarui' : 'Ditambahkan', 'success'); closeModal('modalObat'); }).catch(e => toast('Gagal: ' + e.message, 'error'));
  });

  // ADJUST STOK
  document.getElementById('stokBtnSave').addEventListener('click', () => {
    const id = document.getElementById('stokObatId').value, j = parseInt(document.getElementById('stokJumlah').value) || 0, ket = document.getElementById('stokKeterangan').value;
    const isT = document.getElementById('modalStokTitle').textContent.indexOf('Tambah') >= 0;
    if (j <= 0) { toast('Jumlah harus > 0', 'error'); return; }
    const o = allObat.find(x => x.id === id); if (!o) return;
    const sB = o.stock || 0, sS = isT ? sB + j : sB - j;
    if (sS < 0) { toast('Stok tidak cukup (' + sB + ')', 'error'); return; }
    
    db.collection('obat').doc(id).update({ stock: sS }).then(() => {
      return db.collection('stock_mutasi').add({
        obatId: id, tipe: isT ? 'masuk' : 'keluar', jumlah: isT ? j : -j,
        stockSebelum: sB, stockSesudah: sS, keterangan: ket, tanggal: now(),
        userId: currentUser ? currentUser.email : '', referensi: 'Manual'
      });
    }).then(() => { toast('Stok: ' + sB + ' -> ' + sS, 'success'); closeModal('modalStok'); }).catch(e => toast('Gagal: ' + e.message, 'error'));
  });

  // IMPORT EXCEL
  function setupImportZone() {
    const iz = document.getElementById('importZone'), ifl = document.getElementById('importFile');
    if (!iz || !ifl) return;
    iz.addEventListener('click', () => ifl.click());
    iz.addEventListener('dragover', e => { e.preventDefault(); iz.classList.add('dragover'); });
    iz.addEventListener('dragleave', () => iz.classList.remove('dragover'));
    iz.addEventListener('drop', e => { e.preventDefault(); iz.classList.remove('dragover'); if (e.dataTransfer.files.length) handleIF(e.dataTransfer.files[0]); });
    ifl.addEventListener('change', e => { if (e.target.files.length) handleIF(e.target.files[0]); });
  }

  function handleIF(f) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]], rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rows.length) { toast('File kosong', 'error'); return; }
        importData = [];
        rows.forEach((r, i) => {
          const nama = String(r.namaGenerik || r.nama || '').trim(); if (!nama) return;
          importData.push({
            no: i + 1, kodeObat: String(r.kodeObat || r.kode || 'OB-' + String(i + 1).padStart(3, '0')).trim(), namaGenerik: nama,
            namaMerek: String(r.namaMerek || r.merek || '').trim(), kategori: String(r.kategori || 'Lainnya').trim(),
            sediaan: String(r.sediaan || '').trim(), kekuatan: String(r.kekuatan || '').trim(), satuan: String(r.satuan || 'butir').trim(),
            hargaBeli: parseFloat(r.hargaBeli || r.hpp || 0) || 0, hargaJual: parseFloat(r.hargaJual || r.harga || 0) || 0,
            stock: parseInt(r.stock || r.stok || 0) || 0, minStock: parseInt(r.minStock || r.minstok || 100) || 0
          });
        });
        document.getElementById('importCount').textContent = importData.length;
        const mx = Math.min(importData.length, 50);
        let h = '<table><thead><tr><th>No</th><th>Kode</th><th>Nama</th><th>HPP</th><th>Harga</th><th>Stok</th></tr></thead><tbody>';
        for (let j = 0; j < mx; j++) { const row = importData[j]; h += `<tr><td>${row.no}</td><td>${row.kodeObat}</td><td>${row.namaGenerik}</td><td>${fmt(row.hargaBeli)}</td><td>${fmt(row.harga[...])}
        if (importData.length > 50) h += `<tr><td colspan="6" style="text-align:center;color:var(--muted)">...+${importData.length - 50}</td></tr>`;
        h += '</tbody></table>';
        document.getElementById('importPreview').innerHTML = h;
        document.getElementById('importPreviewWrap').style.display = 'block';
        document.getElementById('btnDoImport').style.display = 'inline-flex';
      } catch (err) { toast('Gagal baca file', 'error'); }
    };
    reader.readAsArrayBuffer(f);
  }

  document.getElementById('btnDoImport').addEventListener('click', async () => {
    if (!importData.length) return;
    const btn = document.getElementById('btnDoImport'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
    let suc = 0;
    const batch = db.batch();
    importData.forEach(d => { const ref = db.collection('obat').doc(); batch.set(ref, { ...d, status: 'aktif', createdAt: now() }); suc++; });
    try { await batch.commit(); document.getElementById('importResult').innerHTML = `<div class="import-result success">Berhasil import ${suc} obat.</div>`; toast('Import selesai', 'success'); } [...]
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Import';
  });

  document.getElementById('btnDownloadTemplate').addEventListener('click', () => {
    const ws = XLSX.utils.json_to_sheet([{ kodeObat: 'OB-001', namaGenerik: 'Paracetamol', namaMerek: 'Panadol', kategori: 'Analgesik-Antipiretik', sediaan: 'Tablet', kekuatan: '500mg', satuan: 'butir', hargaBeli: 0, hargaJual: 0, stock: 0 }]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Template'); XLSX.writeFile(wb, 'template_obat.xlsx');
  });

  function doExport() {
    if (!allObat.length) { toast('Tidak ada data', 'warning'); return; }
    const data = allObat.map(o => ({ 'Kode': o.kodeObat, 'Nama Generik': o.namaGenerik, 'Merek': o.namaMerek, 'Kategori': o.kategori, 'HPP': o.hargaBeli, 'Harga Jual': o.hargaJual, 'Stok': o.stock ?? o.stok ?? 0 }));
    const ws = XLSX.utils.json_to_sheet(data); ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data Obat'); XLSX.writeFile(wb, 'data_obat_' + ts().toISOString().slice(0, 10) + '.xlsx'); toast('Export berhasil', 'success');
  }

  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
