registerModule('obat', function() {
  var page = document.getElementById('page-obat');
  var allObat = [];
  var importData = [];
  var unsubObat = null;
  var isAdmin = userRole === 'admin';

  var KATEGORI_LIST = ['Analgesik-Antipiretik','Antibiotik','Antihistamin','Antasida-Gastrointestinal','Antidiabetik','Antihipertensi','Kortikosteroid','Vitamin-Suplemen','Batuk-Pilek','Antialergi','Antijamur','Antiinflamasi','Steril-Antiseptik','Obat Topikal','Herbal','Lainnya'];

  function render() {
    if (unsubObat) { unsubObat(); unsubObat = null; }
    var katOpts = '<option value="">Semua Kategori</option>';
    for (var k = 0; k < KATEGORI_LIST.length; k++) katOpts += '<option>' + KATEGORI_LIST[k] + '</option>';
    var impBtns = isAdmin ? '<button class="btn btn-outline btn-sm" id="obBtnImport" style="width:auto"><i class="fas fa-file-excel"></i> Import</button><button class="btn btn-outline btn-sm" id="obBtnExport" style="width:auto"><i class="fas fa-download"></i> Export</button>' : '';

    page.innerHTML = '<div class="stats-grid" style="margin-bottom:18px"><div class="stat-card"><div class="s-label">Total Jenis</div><div class="s-value green" id="obTotal">0</div></div><div class="stat-card"><div class="s-label">Stok Rendah</div><div class="s-value red" id="obLow">0</div></div><div class="stat-card"><div class="s-label">Total Unit</div><div class="s-value blue" id="obStock">0</div></div><div class="stat-card"><div class="s-label">Nilai Persediaan</div><div class="s-value yellow" id="obNilai">Rp 0</div></div></div><div class="obat-toolbar"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="obSearch" placeholder="Cari kode, nama obat..."></div><select class="filter-select" id="obFilterKat">' + katOpts + '</select><select class="filter-select" id="obFilterStok"><option value="">Semua Stok</option><option value="low">Stok Rendah</option><option value="ok">Stok Aman</option><option value="zero">Stok Habis</option></select><button class="btn btn-primary btn-sm" id="obBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Tambah</button>' + impBtns + '</div><div class="table-wrap"><div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Kode</th><th>Nama Obat</th><th>Kategori</th><th>Sediaan</th><th class="num">HPP</th><th class="num">Harga Jual</th><th class="num">Stok</th><th>Aksi</th></tr></thead><tbody id="obBody"><tr><td colspan="9"><div class="empty-state"><i class="fas fa-pills"></i><p>Memuat...</p></div></td></tr></tbody></table></div><div class="table-footer"><span id="obCount">0 data</span><span id="obFilterInfo"></span></div></div>';

    document.getElementById('obSearch').addEventListener('input', renderTable);
    document.getElementById('obFilterKat').addEventListener('change', renderTable);
    document.getElementById('obFilterStok').addEventListener('change', renderTable);
    document.getElementById('obBtnAdd').addEventListener('click', openAdd);
    if (isAdmin) {
      document.getElementById('obBtnImport').addEventListener('click', function() { importData=[]; document.getElementById('importPreviewWrap').style.display='none'; document.getElementById('importResult').innerHTML=''; document.getElementById('btnDoImport').style.display='none'; document.getElementById('importFile').value=''; openModal('modalImport'); });
      document.getElementById('obBtnExport').addEventListener('click', doExport);
    }
    startListener();
  }

  function startListener() {
    unsubObat = db.collection('obat').orderBy('kodeObat','asc').onSnapshot(function(snap) {
      allObat = [];
      snap.docs.forEach(function(d) { var o = {id:d.id}; var data = d.data(); var keys = Object.keys(data); for (var i=0;i<keys.length;i++) o[keys[i]]=data[keys[i]]; allObat.push(o); });
      window._obatList = allObat;
      renderTable();
      updateStats();
    }, function(err) { console.error('Obat listener:', err); });
  }

  function getFiltered() {
    var s=(document.getElementById('obSearch').value||'').toLowerCase(), k=document.getElementById('obFilterKat').value, sf=document.getElementById('obFilterStok').value, res=[];
    for (var i=0;i<allObat.length;i++) {
      var o=allObat[i];
      if (s && (o.kodeObat||'').toLowerCase().indexOf(s)===-1 && (o.namaGenerik||'').toLowerCase().indexOf(s)===-1 && (o.namaMerek||'').toLowerCase().indexOf(s)===-1) continue;
      if (k && o.kategori!==k) continue;
      if (sf==='low' && (o.stock||0)>(o.minStock||0)) continue;
      if (sf==='ok' && (o.stock||0)<=(o.minStock||0)) continue;
      if (sf==='zero' && (o.stock||0)>0) continue;
      res.push(o);
    }
    return res;
  }

  function renderTable() {
    var tb=document.getElementById('obBody'); if(!tb) return;
    var f=getFiltered();
    var cEl=document.getElementById('obCount'), fEl=document.getElementById('obFilterInfo');
    if(cEl) cEl.textContent=f.length+' dari '+allObat.length;
    if(fEl) fEl.textContent=f.length<allObat.length?'(difilter)':'';
    if(!f.length){ tb.innerHTML='<tr><td colspan="9"><div class="empty-state"><i class="fas fa-pills"></i><p>'+(allObat.length?'Tidak cocok dengan filter.':'Belum ada data obat.')+'</p></div></td></tr>'; return; }
    var h='';
    for(var i=0;i<f.length;i++){
      var o=f[i], sk=o.stock||0, ms=o.minStock||0, sc=(sk===0||sk<=ms)?'stock-low':'stock-ok';
      var mk=o.namaMerek?' <span style="color:var(--muted);font-size:11px">('+o.namaMerek+')</span>':'';
      var kk=o.kekuatan?' ('+o.kekuatan+')':'';
      h+='<tr><td>'+(i+1)+'</td><td style="font-family:var(--mono);font-size:12px;color:var(--muted)">'+(o.kodeObat||'-')+'</td><td style="font-weight:500">'+(o.namaGenerik||'-')+mk+'</td><td style="font-size:12px;color:var(--muted)">'+(o.kategori||'-')+'</td><td style="font-size:12px">'+(o.sediaan||'-')+kk+'</td><td class="num">'+fmt(o.hargaBeli)+'</td><td class="num">'+fmt(o.hargaJual)+'</td><td class="num '+sc+'">'+sk+' '+(o.satuan||'')+'</td><td class="actions"><button class="btn btn-outline btn-xs" onclick="Obat.edit(\''+o.id+'\')" title="Edit"><i class="fas fa-edit"></i></button> <button class="btn btn-primary btn-xs" onclick="Obat.adjust(\''+o.id+'\',\'tambah\')" title="+Stok"><i class="fas fa-plus"></i></button> <button class="btn btn-warning btn-xs" onclick="Obat.adjust(\''+o.id+'\',\'kurang\')" title="-Stok"><i class="fas fa-minus"></i></button>'+(isAdmin?' <button class="btn btn-danger btn-xs" onclick="Obat.hapus(\''+o.id+'\',\''+escAttr(o.namaGenerik)+'\')" title="Hapus"><i class="fas fa-trash"></i></button>':'')+'</td></tr>';
    }
    tb.innerHTML=h;
  }

  function updateStats() {
    var lowC=0, totU=0, totN=0;
    for(var i=0;i<allObat.length;i++){var o=allObat[i]; if((o.stock||0)<=(o.minStock||0)) lowC++; totU+=(o.stock||0); totN+=(o.stock||0)*(o.hargaBeli||0);}
    var e; e=document.getElementById('obTotal'); if(e) e.textContent=allObat.length;
    e=document.getElementById('obLow'); if(e) e.textContent=lowC;
    e=document.getElementById('obStock'); if(e) e.textContent=fmt(totU);
    e=document.getElementById('obNilai'); if(e) e.textContent='Rp '+fmt(totN);
  }

  function openAdd() {
    document.getElementById('modalObatTitle').textContent='Tambah Obat';
    document.getElementById('obEditId').value='';
    document.getElementById('obKode').value=''; document.getElementById('obGenerik').value=''; document.getElementById('obMerek').value=''; document.getElementById('obKekuatan').value='';
    document.getElementById('obKategori').selectedIndex=0; document.getElementById('obSediaan').selectedIndex=0; document.getElementById('obSatuan').selectedIndex=0;
    document.getElementById('obHPP').value=''; document.getElementById('obHargaJual').value=''; document.getElementById('obStok').value='0'; document.getElementById('obMinStok').value='';
    openModal('modalObat'); document.getElementById('obKode').focus();
  }

  function edit(id) {
    var o=null; for(var i=0;i<allObat.length;i++){if(allObat[i].id===id){o=allObat[i];break;}} if(!o) return;
    document.getElementById('modalObatTitle').textContent='Edit Obat'; document.getElementById('obEditId').value=o.id;
    document.getElementById('obKode').value=o.kodeObat||''; document.getElementById('obGenerik').value=o.namaGenerik||''; document.getElementById('obMerek').value=o.namaMerek||''; document.getElementById('obKekuatan').value=o.kekuatan||'';
    document.getElementById('obHPP').value=o.hargaBeli||''; document.getElementById('obHargaJual').value=o.hargaJual||''; document.getElementById('obStok').value=o.stock||''; document.getElementById('obMinStok').value=o.minStock||'';
    setSel('obKategori',o.kategori); setSel('obSediaan',o.sediaan); setSel('obSatuan',o.satuan);
    openModal('modalObat');
  }

  function adjust(id, mode) {
    var o=null; for(var i=0;i<allObat.length;i++){if(allObat[i].id===id){o=allObat[i];break;}} if(!o) return;
    document.getElementById('stokObatId').value=id; document.getElementById('stokObatNama').textContent=o.namaGenerik;
    document.getElementById('stokObatJumlah').textContent=(o.stock||0)+' '+(o.satuan||''); document.getElementById('stokJumlah').value='';
    document.getElementById('modalStokTitle').textContent=mode==='tambah'?'Tambah Stok':'Kurang Stok';
    document.getElementById('stokKeterangan').selectedIndex=mode==='tambah'?0:3;
    openModal('modalStok'); document.getElementById('stokJumlah').focus();
  }

  function hapus(id, nama) { if(!confirm('Hapus "'+nama+'"?')) return; db.collection('obat').doc(id).delete().then(function(){toast('Dihapus','success')}).catch(function(e){toast('Gagal: '+e.message,'error')}); }
  window.Obat = { edit:edit, adjust:adjust, hapus:hapus };

  document.getElementById('obBtnSave').addEventListener('click', function() {
    var eid=document.getElementById('obEditId').value;
    var d={kodeObat:document.getElementById('obKode').value.trim(), namaGenerik:document.getElementById('obGenerik').value.trim(), namaMerek:document.getElementById('obMerek').value.trim(), kategori:document.getElementById('obKategori').value, sediaan:document.getElementById('obSediaan').value, kekuatan:document.getElementById('obKekuatan').value.trim(), satuan:document.getElementById('obSatuan').value, hargaBeli:parseFloat(document.getElementById('obHPP').value)||0, hargaJual:parseFloat(document.getElementById('obHargaJual').value)||0, stock:parseInt(document.getElementById('obStok').value)||0, minStock:parseInt(document.getElementById('obMinStok').value)||0, status:'aktif'};
    if(!d.kodeObat){toast('Kode wajib','error');return;} if(!d.namaGenerik){toast('Nama wajib','error');return;}
    var p; if(eid){p=db.collection('obat').doc(eid).update(d);}else{d.createdAt=now();p=db.collection('obat').add(d);}
    p.then(function(){toast(eid?'Diperbarui':'Ditambahkan','success');closeModal('modalObat');}).catch(function(e){toast('Gagal: '+e.message,'error');});
  });

  document.getElementById('stokBtnSave').addEventListener('click', function() {
    var id=document.getElementById('stokObatId').value, j=parseInt(document.getElementById('stokJumlah').value)||0, ket=document.getElementById('stokKeterangan').value;
    var isT=document.getElementById('modalStokTitle').textContent.indexOf('Tambah')>=0;
    if(j<=0){toast('Jumlah harus > 0','error');return;}
    var o=null; for(var i=0;i<allObat.length;i++){if(allObat[i].id===id){o=allObat[i];break;}} if(!o) return;
    var sB=o.stock||0, sS=isT?sB+j:sB-j;
    if(sS<0){toast('Stok tidak cukup ('+sB+')','error');return;}
    db.collection('obat').doc(id).update({stock:sS}).then(function(){
      return db.collection('stock_mutasi').add({obatId:id,tipe:isT?'masuk':'keluar',jumlah:isT?j:-j,stockSebelum:sB,stockSesudah:sS,keterangan:ket,tanggal:now(),userId:currentUser?currentUser.email:'',referensi:'Manual'});
    }).then(function(){toast('Stok: '+sB+' -> '+sS,'success');closeModal('modalStok');}).catch(function(e){toast('Gagal: '+e.message,'error');});
  });

  var iz=document.getElementById('importZone'), ifl=document.getElementById('importFile');
  if(iz&&ifl){
    iz.addEventListener('click',function(){ifl.click();});
    iz.addEventListener('dragover',function(e){e.preventDefault();iz.classList.add('dragover');});
    iz.addEventListener('dragleave',function(){iz.classList.remove('dragover');});
    iz.addEventListener('drop',function(e){e.preventDefault();iz.classList.remove('dragover');if(e.dataTransfer.files.length)handleIF(e.dataTransfer.files[0]);});
    ifl.addEventListener('change',function(e){if(e.target.files.length)handleIF(e.target.files[0]);});
  }

  function handleIF(f) {
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var wb=XLSX.read(e.target.result,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});
        if(!rows.length){toast('File kosong','error');return;}
        importData=[];
        for(var i=0;i<rows.length;i++){
          var r=rows[i], nama=String(r.namaGenerik||r.nama||'').trim(); if(!nama) continue;
          importData.push({no:i+1,kodeObat:String(r.kodeObat||r.kode||'OB-'+String(i+1).padStart(3,'0')).trim(),namaGenerik:nama,namaMerek:String(r.namaMerek||r.merek||'').trim(),kategori:String(r.kategori||'Lainnya').trim(),sediaan:String(r.sediaan||'').trim(),kekuatan:String(r.kekuatan||'').trim(),satuan:String(r.satuan||'butir').trim(),hargaBeli:parseFloat(r.hargaBeli||r.hpp||0)||0,hargaJual:parseFloat(r.hargaJual||r.harga||0)||0,stock:parseInt(r.stock||r.stok||0)||0,minStock:parseInt(r.minStock||r.minstok||100)||0});
        }
        document.getElementById('importCount').textContent=importData.length;
        var mx=Math.min(importData.length,50), h='<table><thead><tr><th>No</th><th>Kode</th><th>Nama</th><th>HPP</th><th>Harga</th><th>Stok</th></tr></thead><tbody>';
        for(var j=0;j<mx;j++){var row=importData[j];h+='<tr><td>'+row.no+'</td><td>'+row.kodeObat+'</td><td>'+row.namaGenerik+'</td><td>'+fmt(row.hargaBeli)+'</td><td>'+fmt(row.hargaJual)+'</td><td>'+row.stock+'</td></tr>';}
        if(importData.length>50) h+='<tr><td colspan="6" style="text-align:center;color:var(--muted)">...+'+(importData.length-50)+'</td></tr>';
        h+='</tbody></table>'; document.getElementById('importPreview').innerHTML=h; document.getElementById('importPreviewWrap').style.display='block'; document.getElementById('btnDoImport').style.display='inline-flex';
      }catch(err){toast('Gagal baca file','error');}
    };
    reader.readAsArrayBuffer(f);
  }

  document.getElementById('btnDoImport').addEventListener('click', function() {
    if(!importData.length) return;
    var btn=document.getElementById('btnDoImport'); btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Mengimport...';
    function processBatch(idx){
      if(idx>=importData.length){
        document.getElementById('importResult').innerHTML='<div class="import-result success"><i class="fas fa-check-circle"></i> '+idx+' obat berhasil diimport</div>';
        btn.disabled=false; btn.innerHTML='<i class="fas fa-upload"></i> Import'; btn.style.display='none'; importData=[]; return;
      }
      var batch=db.batch(), chunk=importData.slice(idx,idx+400);
      for(var i=0;i<chunk.length;i++){var r=chunk[i], ref=db.collection('obat').doc(); batch.set(ref,{kodeObat:r.kodeObat,namaGenerik:r.namaGenerik,namaMerek:r.namaMerek,kategori:r.kategori,sediaan:r.sediaan,kekuatan:r.kekuatan,satuan:r.satuan,hargaBeli:r.hargaBeli,hargaJual:r.hargaJual,stock:r.stock,minStock:r.minStock,status:'aktif',createdAt:now()});}
      batch.commit().then(function(){processBatch(idx+400);}).catch(function(err){console.error('Batch:',err);processBatch(idx+400);});
    }
    processBatch(0);
  });

  document.getElementById('btnDownloadTemplate').addEventListener('click', function() {
    var t=[{kodeObat:'OB-001',namaGenerik:'Paracetamol',namaMerek:'Panadol',kategori:'Analgesik-Antipiretik',sediaan:'Tablet',kekuatan:'500mg',satuan:'butir',hargaBeli:350,hargaJual:600,stock:1000,minStock:100}];
    var ws=XLSX.utils.json_to_sheet(t); ws['!cols']=[{wch:12},{wch:20},{wch:15},{wch:25},{wch:10},{wch:10},{wch:10},{wch:10},{wch:12},{wch:12},{wch:8},{wch:10}];
    var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Data Obat'); XLSX.writeFile(wb,'template_obat.xlsx'); toast('Template didownload','success');
  });

  function doExport() {
    if(!allObat.length){toast('Tidak ada data','warning');return;}
    var d=[]; for(var i=0;i<allObat.length;i++){var o=allObat[i]; d.push({kodeObat:o.kodeObat,namaGenerik:o.namaGenerik,namaMerek:o.namaMerek,kategori:o.kategori,sediaan:o.sediaan,kekuatan:o.kekuatan,satuan:o.satuan,hargaBeli:o.hargaBeli,hargaJual:o.hargaJual,stock:o.stock,minStock:o.minStock});}
    var ws=XLSX.utils.json_to_sheet(d),wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Data Obat'); XLSX.writeFile(wb,'obat_'+ts().toISOString().slice(0,10)+'.xlsx'); toast('Export berhasil','success');
  }

  var obs=new MutationObserver(function(){if(page.classList.contains('active'))render();});
  obs.observe(page,{attributes:true,attributeFilter:['class']});
});
