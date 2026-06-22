registerModule('obat', function() {
  const page = document.getElementById('page-obat');
  let allObat = [];
  let importData = [];
  let unsubObat = null;
  const isAdmin = userRole === 'admin';

  function render() {
    // Lepas listener lama kalau ada
    if (unsubObat) { unsubObat(); unsubObat = null; }

    page.innerHTML = `
      <div class="stats-grid" style="margin-bottom:18px">
        <div class="stat-card"><div class="s-label">Total Jenis</div><div class="s-value green" id="obTotal">0</div></div>
        <div class="stat-card"><div class="s-label">Stok Rendah</div><div class="s-value red" id="obLow">0</div></div>
        <div class="stat-card"><div class="s-label">Total Unit</div><div class="s-value blue" id="obStock">0</div></div>
        <div class="stat-card"><div class="s-label">Nilai Persediaan</div><div class="s-value yellow" id="obNilai">Rp 0</div></div>
      </div>
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="obSearch" placeholder="Cari kode, nama obat..."></div>
        <select class="filter-select" id="obFilterKat"><option value="">Semua Kategori</option>${['Analgesik-Antipiretik','Antibiotik','Antihistamin','Antasida-Gastrointestinal','Antidiabetik','Antihipertensi','Kortikosteroid','Vitamin-Suplemen','Batuk-Pilek','Antialergi','Antijamur','Antiinflamasi','Steril-Antiseptik','Obat Topikal','Herbal','Lainnya'].map(k=>'<option>'+k+'</option>').join('')}</select>
        <select class="filter-select" id="obFilterStok"><option value="">Semua Stok</option><option value="low">Stok Rendah</option><option value="ok">Stok Aman</option><option value="zero">Stok Habis</option></select>
        <button class="btn btn-primary btn-sm" id="obBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Tambah</button>
        ${isAdmin ? '<button class="btn btn-outline btn-sm" id="obBtnImport" style="width:auto"><i class="fas fa-file-excel"></i> Import</button><button class="btn btn-outline btn-sm" id="obBtnExport" style="width:auto"><i class="fas fa-download"></i> Export</button>' : ''}
      </div>
      <div class="table-wrap"><div style="overflow-x:auto"><table>
        <thead><tr><th>No</th><th>Kode</th><th>Nama Obat</th><th>Kategori</th><th>Sediaan</th><th class="num">HPP</th><th class="num">Harga Jual</th><th class="num">Stok</th><th>Aksi</th></tr></thead>
        <tbody id="obBody"><tr><td colspan="9"><div class="empty-state"><i class="fas fa-pills"></i><p>Memuat...</p></div></td></tr></tbody>
      </table></div><div class="table-footer"><span id="obCount">0 data</span><span id="obFilterInfo"></span></div></div>`;

    // Event listeners halaman (di-attach setiap render, aman karena elemen baru)
    document.getElementById('obSearch').addEventListener('input', renderTable);
    document.getElementById('obFilterKat').addEventListener('change', renderTable);
    document.getElementById('obFilterStok').addEventListener('change', renderTable);
    document.getElementById('obBtnAdd').addEventListener('click', openAdd);

    if (isAdmin) {
      document.getElementById('obBtnImport').addEventListener('click', function() {
        importData = [];
        document.getElementById('importPreviewWrap').style.display = 'none';
        document.getElementById('importResult').innerHTML = '';
        document.getElementById('btnDoImport').style.display = 'none';
        document.getElementById('importFile').value = '';
        openModal('modalImport');
      });
      document.getElementById('obBtnExport').addEventListener('click', doExport);
    }

    // Listener Firestore (dengan unsubscribe)
    startListener();
  }

  function startListener() {
    unsubObat = db.collection('obat').orderBy('kodeObat','asc').onSnapshot(function(snap) {
      allObat = snap.docs.map(function(d) { return Object.assign({id: d.id}, d.data()); });
      window._obatList = allObat;
      renderTable();
      updateStats();
    }, function(err) {
      console.error('Obat listener error:', err);
    });
  }

  function getFiltered() {
    var s = (document.getElementById('obSearch').value || '').toLowerCase();
    var k = document.getElementById('obFilterKat').value;
    var sf = document.getElementById('obFilterStok').value;
    return allObat.filter(function(o) {
      if (s && !(o.kodeObat||'').toLowerCase().includes(s) && !(o.namaGenerik||'').toLowerCase().includes(s) && !(o.namaMerek||'').toLowerCase().includes(s)) return false;
      if (k && o.kategori !== k) return false;
      if (sf === 'low' && (o.stock||0) > (o.minStock||0)) return false;
      if (sf === 'ok' && (o.stock||0) <= (o.minStock||0)) return false;
      if (sf === 'zero' && (o.stock||0) > 0) return false;
      return true;
    });
  }

  function renderTable() {
    var tb = document.getElementById('obBody');
    if (!tb) return; // safety check
    var f = getFiltered();
    document.getElementById('obCount').textContent = f.length + ' dari ' + allObat.length;
    document.getElementById('obFilterInfo').textContent = f.length < allObat.length ? '(difilter)' : '';
    if (!f.length) {
      tb.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-pills"></i><p>' + (allObat.length ? 'Tidak cocok dengan filter.' : 'Belum ada data obat.') + '</p></div></td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < f.length; i++) {
      var o = f[i];
      var sk = o.stock || 0, ms = o.minStock || 0;
      var sc = (sk === 0 || sk <= ms) ? 'stock-low' : 'stock-ok';
      html += '<tr>';
      html += '<td>' + (i+1) + '</td>';
      html += '<td style="font-family:var(--mono);font-size:12px;color:var(--muted)">' + (o.kodeObat||'-') + '</td>';
      html += '<td style="font-weight:500">' + (o.namaGenerik||'-');
      if (o.namaMerek) html += ' <span style="color:var(--muted);font-size:11px">(' + o.namaMerek + ')</span>';
      html += '</td>';
      html += '<td style="font-size:12px;color:var(--muted)">' + (o.kategori||'-') + '</td>';
      html += '<td style="font-size:12px">' + (o.sediaan||'-') + (o.kekuatan ? ' ('+o.kekuatan+')' : '') + '</td>';
      html += '<td class="num">' + fmt(o.hargaBeli) + '</td>';
      html += '<td class="num">' + fmt(o.hargaJual) + '</td>';
      html += '<td class="num ' + sc + '">' + sk + ' ' + (o.satuan||'') + '</td>';
      html += '<td class="actions">';
      html += '<button class="btn btn-outline btn-xs" onclick="Obat.edit(\'' + o.id + '\')" title="Edit"><i class="fas fa-edit"></i></button>';
      html += '<button class="btn btn-primary btn-xs" onclick="Obat.adjust(\'' + o.id + '\',\'tambah\')" title="+Stok"><i class="fas fa-plus"></i></button>';
      html += '<button class="btn btn-warning btn-xs" onclick="Obat.adjust(\'' + o.id + '\',\'kurang\')" title="-Stok"><i class="fas fa-minus"></i></button>';
      if (isAdmin) html += '<button class="btn btn-danger btn-xs" onclick="Obat.hapus(\'' + o.id + '\',\'' + escAttr(o.namaGenerik) + '\')" title="Hapus"><i class="fas fa-trash"></i></button>';
      html += '</td></tr>';
    }
    tb.innerHTML = html;
  }

  function updateStats() {
    var el;
    el = document.getElementById('obTotal'); if (el) el.textContent = allObat.length;
    el = document.getElementById('obLow'); if (el) el.textContent = allObat.filter(function(o){return (o.stock||0)<=(o.minStock||0)}).length;
    el = document.getElementById('obStock'); if (el) el.textContent = fmt(allObat.reduce(function(s,o){return s+(o.stock||0)},0));
    el = document.getElementById('obNilai'); if (el) el.textContent = 'Rp ' + fmt(allObat.reduce(function(s,o){return s+((o.stock||0)*(o.hargaBeli||0))},0));
  }

  function openAdd() {
    document.getElementById('modalObatTitle').textContent = 'Tambah Obat';
    document.getElementById('obEditId').value = '';
    ['obKode','obGenerik','obMerek','obKekuatan'].forEach(function(i){document.getElementById(i).value=''});
    ['obKategori','obSediaan','obSatuan'].forEach(function(i){document.getElementById(i).selectedIndex=0});
    ['obHPP','obHargaJual','obMinStok'].forEach(function(i){document.getElementById(i).value=''});
    document.getElementById('obStok').value = '0';
    openModal('modalObat');
    document.getElementById('obKode').focus();
  }

  function edit(id) {
    var o = allObat.find(function(x){return x.id===id});
    if (!o) return;
    document.getElementById('modalObatTitle').textContent = 'Edit Obat';
    document.getElementById('obEditId').value = o.id;
    document.getElementById('obKode').value = o.kodeObat || '';
    document.getElementById('obGenerik').value = o.namaGenerik || '';
    document.getElementById('obMerek').value = o.namaMerek || '';
    document.getElementById('obKekuatan').value = o.kekuatan || '';
    document.getElementById('obHPP').value = o.hargaBeli || '';
    document.getElementById('obHargaJual').value = o.hargaJual || '';
    document.getElementById('obStok').value = o.stock || '';
    document.getElementById('obMinStok').value = o.minStock || '';
    setSel('obKategori', o.kategori);
    setSel('obSediaan', o.sediaan);
    setSel('obSatuan', o.satuan);
    openModal('modalObat');
  }

  function adjust(id, mode) {
    var o = allObat.find(function(x){return x.id===id});
    if (!o) return;
    document.getElementById('stokObatId').value = id;
    document.getElementById('stokObatNama').textContent = o.namaGenerik;
    document.getElementById('stokObatJumlah').textContent = (o.stock||0) + ' ' + (o.satuan||'');
    document.getElementById('stokJumlah').value = '';
    document.getElementById('modalStokTitle').textContent = mode === 'tambah' ? 'Tambah Stok' : 'Kurang Stok';
    document.getElementById('stokKeterangan').selectedIndex = mode === 'tambah' ? 0 : 3;
    openModal('modalStok');
    document.getElementById('stokJumlah').focus();
  }

  function hapus(id, nama) {
    if (!confirm('Hapus "' + nama + '"?')) return;
    db.collection('obat').doc(id).delete().then(function(){toast('Dihapus','success')}).catch(function(e){toast('Gagal: '+e.message,'error')});
  }

  window.Obat = { edit: edit, adjust: adjust, hapus: hapus };

  // ============================================
  // PERSISTENT LISTENERS (modal di index.html)
  // Di-attach sekali saat module load
  // ============================================
  document.getElementById('obBtnSave').addEventListener('click', function() {
    var eid = document.getElementById('obEditId').value;
    var d = {
      kodeObat: document.getElementById('obKode').value.trim(),
      namaGenerik: document.getElementById('obGenerik').value.trim(),
      namaMerek: document.getElementById('obMerek').value.trim(),
      kategori: document.getElementById('obKategori').value,
      sediaan: document.getElementById('obSediaan').value,
      kekuatan: document.getElementById('obKekuatan').value.trim(),
      satuan: document.getElementById('obSatuan').value,
      hargaBeli: parseFloat(document.getElementById('obHPP').value) || 0,
      hargaJual: parseFloat(document.getElementById('obHargaJual').value) || 0,
      stock: parseInt(document.getElementById('obStok').value) || 0,
      minStock: parseInt(document.getElementById('obMinStok').value) || 0,
      status: 'aktif'
    };
    if (!d.kodeObat) { toast('Kode wajib','error'); return; }
    if (!d.namaGenerik) { toast('Nama wajib','error'); return; }

    if (eid) {
      db.collection('obat').doc(eid).update(d).then(function(){toast('Diperbarui','success');closeModal('modalObat')}).catch(function(e){toast('Gagal: '+e.message,'error')});
    } else {
      d.createdAt = now();
      db.collection('obat').add(d).then(function(){toast('Ditambahkan','success');closeModal('modalObat')}).catch(function(e){toast('Gagal: '+e.message,'error')});
    }
  });

  document.getElementById('stokBtnSave').addEventListener('click', function() {
    var id = document.getElementById('stokObatId').value;
    var j = parseInt(document.getElementById('stokJumlah').value) || 0;
    var ket = document.getElementById('stokKeterangan').value;
    var isT = document.getElementById('modalStokTitle').textContent.includes('Tambah');
    if (j <= 0) { toast('Jumlah harus > 0','error'); return; }
    var o = allObat.find(function(x){return x.id===id});
    if (!o) return;
    var sB = o.stock || 0;
    var sS = isT ? sB + j : sB - j;
    if (sS < 0) { toast('Stok tidak cukup (' + sB + ')','error'); return; }
    db.collection('obat').doc(id).update({stock: sS}).then(function() {
      return db.collection('stock_mutasi').add({
        obatId: id, tipe: isT ? 'masuk' : 'keluar', jumlah: isT ? j : -j,
        stockSebelum: sB, stockSesudah: sS, keterangan: ket,
        tanggal: now(), userId: currentUser?.email || '', referensi: 'Manual'
      });
    }).then(function(){toast('Stok: '+sB+' → '+sS,'success');closeModal('modalStok')}).catch(function(e){toast('Gagal: '+e.message,'error')});
  });

  // Import
  var iz = document.getElementById('importZone');
  var ifl = document.getElementById('importFile');
  if (iz && ifl) {
    iz.addEventListener('click', function(){ ifl.click() });
    iz.addEventListener('dragover', function(e){ e.preventDefault(); iz.classList.add('dragover') });
    iz.addEventListener('dragleave', function(){ iz.classList.remove('dragover') });
    iz.addEventListener('drop', function(e){ e.preventDefault(); iz.classList.remove('dragover'); if(e.dataTransfer.files.length) handleIF(e.dataTransfer.files[0]) });
    ifl.addEventListener('change', function(e){ if(e.target.files.length) handleIF(e.target.files[0]) });
  }

  function handleIF(f) {
    var r = new FileReader();
    r.onload = function(e) {
      try {
        var wb = XLSX.read(e.target.result, {type:'array'});
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, {defval:''});
        if (!rows.length) { toast('File kosong','error'); return; }
        importData = rows.map(function(row, i) {
          return {
            no: i+1,
            kodeObat: String(row.kodeObat || row.kode || 'OB-'+String(i+1).padStart(3,'0')).trim(),
            namaGenerik: String(row.namaGenerik || row.nama || '').trim(),
            namaMerek: String(row.namaMerek || row.merek || '').trim(),
            kategori: String(row.kategori || 'Lainnya').trim(),
            sediaan: String(row.sediaan || '').trim(),
            kekuatan: String(row.kekuatan || '').trim(),
            satuan: String(row.satuan || 'butir').trim(),
            hargaBeli: parseFloat(row.hargaBeli || row.hpp || 0) || 0,
            hargaJual: parseFloat(row.hargaJual || row.harga || 0) || 0,
            stock: parseInt(row.stock || row.stok || 0) || 0,
            minStock: parseInt(row.minStock || row.minstok || 100) || 0
          };
        }).filter(function(r){ return r.namaGenerik; });

        document.getElementById('importCount').textContent = importData.length;
        var mx = Math.min(importData.length, 50);
        var h = '<table><thead><tr><th>No</th><th>Kode</th><th>Nama</th><th>HPP</th><th>Harga</th><th>Stok</th></tr></thead><tbody>';
        for (var i = 0; i < mx; i++) {
          var row = importData[i];
          h += '<tr><td>'+row.no+'</td><td>'+row.kodeObat+'</td><td>'+row.namaGenerik+'</td><td>'+fmt(row.hargaBeli)+'</td><td>'+fmt(row.hargaJual)+'</td><td>'+row.stock+'</td></tr>';
        }
        if (importData.length > 50) h += '<tr><td colspan="6" style="text-align:center;color:var(--muted)">...+' + (importData.length-50) + '</td></tr>';
        h += '</tbody></table>';
        document.getElementById('importPreview').innerHTML = h;
        document.getElementById('importPreviewWrap').style.display = 'block';
        document.getElementById('btnDoImport').style.display = 'inline-flex';
      } catch(err) { toast('Gagal baca file','error'); }
    };
    r.readAsArrayBuffer(f);
  }

  document.getElementById('btnDoImport').addEventListener('click', function() {
    if (!importData.length) return;
    var btn = document.getElementById('btnDoImport');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengimport...';
    var ok = 0;
    var processBatch = function(startIdx) {
      if (startIdx >= importData.length) {
        document.getElementById('importResult').innerHTML = '<div class="import-result success"><i class="fas fa-check-circle"></i> ' + ok + ' obat berhasil diimport</div>';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Import';
        btn.style.display = 'none';
        importData = [];
        return;
      }
      var batch = db.batch();
      var chunk = importData.slice(startIdx, startIdx + 400);
      chunk.forEach(function(r) {
        batch.set(db.collection('obat').doc(), Object.assign({}, r, {status:'aktif', createdAt: now()}));
      });
      batch.commit().then(function() {
        ok += chunk.length;
        processBatch(startIdx + 400);
      }).catch(function(e) {
        console.error('Batch error:', e);
        processBatch(startIdx + 400);
      });
    };
    processBatch(0);
  });

  document.getElementById('btnDownloadTemplate').addEventListener('click', function() {
    var t = [{kodeObat:'OB-001',namaGenerik:'Paracetamol',namaMerek:'Panadol',kategori:'Analgesik-Antipiretik',sediaan:'Tablet',kekuatan:'500mg',satuan:'butir',hargaBeli:350,hargaJual:600,stock:1000,minStock:100}];
    var ws = XLSX.utils.json_to_sheet(t);
    ws['!cols'] = [{wch:12},{wch:20},{wch:15},{wch:25},{wch:10},{wch:10},{wch:10},{wch:10},{wch:12},{wch:12},{wch:8},{wch:10}];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Obat');
    XLSX.writeFile(wb, 'template_obat.xlsx');
    toast('Template didownload','success');
  });

  function doExport() {
    if (!allObat.length) { toast('Tidak ada data','warning'); return; }
    var d = allObat.map(function(o) {
      return {kodeObat:o.kodeObat,namaGenerik:o.namaGenerik,namaMerek:o.namaMerek,kategori:o.kategori,sediaan:o.sediaan,kekuatan:o.kekuatan,satuan:o.satuan,hargaBeli:o.hargaBeli,hargaJual:o.hargaJual,stock:o.stock,minStock:o.minStock};
    });
    var ws = XLSX.utils.json_to_sheet(d);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Obat');
    XLSX.writeFile(wb, 'obat_' + ts().toISOString().slice(0,10) + '.xlsx');
    toast('Export berhasil','success');
  }

  // MutationObserver untuk render saat halaman aktif
  var obs = new MutationObserver(function() {
    if (page.classList.contains('active')) render();
  });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
});
