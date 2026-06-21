registerModule('obat', function() {
  const page = document.getElementById('page-obat');
  let allObat = [];
  let importData = [];
  const isAdmin = userRole === 'admin';

  function render() {
    page.innerHTML = `
      <div class="stats-grid" style="margin-bottom:18px">
        <div class="stat-card"><div class="s-label">Total Jenis</div><div class="s-value green" id="obTotal">0</div></div>
        <div class="stat-card"><div class="s-label">Stok Rendah</div><div class="s-value red" id="obLow">0</div></div>
        <div class="stat-card"><div class="s-label">Total Unit</div><div class="s-value blue" id="obStock">0</div></div>
        <div class="stat-card"><div class="s-label">Nilai Persediaan</div><div class="s-value yellow" id="obNilai">Rp 0</div></div>
      </div>
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="obSearch" placeholder="Cari kode, nama obat..."></div>
        <select class="filter-select" id="obFilterKat"><option value="">Semua Kategori</option>${['Analgesik-Antipiretik','Antibiotik','Antihistamin','Antasida-Gastrointestinal','Antidiabetik','Antihipertensi','Kortikosteroid','Vitamin-Suplemen','Batuk-Pilek','Antialergi','Antijamur','Antiinflamasi','Steril-Antiseptik','Obat Topikal','Herbal','Lainnya'].map(k=>`<option>${k}</option>`).join('')}</select>
        <select class="filter-select" id="obFilterStok"><option value="">Semua Stok</option><option value="low">Stok Rendah</option><option value="ok">Stok Aman</option><option value="zero">Stok Habis</option></select>
        <button class="btn btn-primary btn-sm" id="obBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Tambah</button>
        ${isAdmin ? '<button class="btn btn-outline btn-sm" id="obBtnImport" style="width:auto"><i class="fas fa-file-excel"></i> Import</button><button class="btn btn-outline btn-sm" id="obBtnExport" style="width:auto"><i class="fas fa-download"></i> Export</button>' : ''}
      </div>
      <div class="table-wrap"><div style="overflow-x:auto"><table>
        <thead><tr><th>No</th><th>Kode</th><th>Nama Obat</th><th>Kategori</th><th>Sediaan</th><th class="num">HPP</th><th class="num">Harga Jual</th><th class="num">Stok</th><th>Aksi</th></tr></thead>
        <tbody id="obBody"><tr><td colspan="9"><div class="empty-state"><i class="fas fa-pills"></i><p>Memuat...</p></div></td></tr></tbody>
      </table></div><div class="table-footer"><span id="obCount">0 data</span><span id="obFilterInfo"></span></div></div>`;

    document.getElementById('obSearch').addEventListener('input', renderTable);
    document.getElementById('obFilterKat').addEventListener('change', renderTable);
    document.getElementById('obFilterStok').addEventListener('change', renderTable);
    document.getElementById('obBtnAdd').addEventListener('click', openAdd);
    if (isAdmin) {
      document.getElementById('obBtnImport').addEventListener('click', () => { importData=[]; document.getElementById('importPreviewWrap').style.display='none'; document.getElementById('importResult').innerHTML=''; document.getElementById('btnDoImport').style.display='none'; document.getElementById('importFile').value=''; openModal('modalImport'); });
      document.getElementById('obBtnExport').addEventListener('click', doExport);
    }
    startListener();
  }

  function startListener() {
    db.collection('obat').orderBy('kodeObat','asc').onSnapshot(snap => {
      allObat = snap.docs.map(d => ({id:d.id,...d.data()}));
      window._obatList = allObat;
      renderTable();
      updateStats();
    });
  }

  function getFiltered() {
    const s=(document.getElementById('obSearch').value||'').toLowerCase(), k=document.getElementById('obFilterKat').value, sf=document.getElementById('obFilterStok').value;
    return allObat.filter(o => {
      if(s&&!(o.kodeObat||'').toLowerCase().includes(s)&&!(o.namaGenerik||'').toLowerCase().includes(s)&&!(o.namaMerek||'').toLowerCase().includes(s))return false;
      if(k&&o.kategori!==k)return false;
      if(sf==='low'&&(o.stock||0)>(o.minStock||0))return false;
      if(sf==='ok'&&(o.stock||0)<=(o.minStock||0))return false;
      if(sf==='zero'&&(o.stock||0)>0)return false;
      return true;
    });
  }

  function renderTable() {
    const f=getFiltered(), tb=document.getElementById('obBody');
    document.getElementById('obCount').textContent=`${f.length} dari ${allObat.length}`;
    document.getElementById('obFilterInfo').textContent=f.length<allObat.length?'(difilter)':'';
    if(!f.length){tb.innerHTML=`<tr><td colspan="9"><div class="empty-state"><i class="fas fa-pills"></i><p>${allObat.length?'Tidak cocok dengan filter.':'Belum ada data.'}</p></div></td></tr>`;return}
    tb.innerHTML=f.map((o,i)=>{const sk=o.stock||0,ms=o.minStock||0,sc=sk===0||sk<=ms?'stock-low':'stock-ok';return`<tr><td>${i+1}</td><td style="font-family:var(--mono);font-size:12px;color:var(--muted)">${o.kodeObat||'-'}</td><td style="font-weight:500">${o.namaGenerik||'-'}${o.namaMerek?` <span style="color:var(--muted);font-size:11px">(${o.namaMerek})</span>`:''}</td><td style="font-size:12px;color:var(--muted)">${o.kategori||'-'}</td><td style="font-size:12px">${o.sediaan||'-'} ${o.kekuatan?'('+o.kekuatan+')':''}</td><td class="num">${fmt(o.hargaBeli)}</td><td class="num">${fmt(o.hargaJual)}</td><td class="num ${sc}">${sk} ${o.satuan||''}</td><td class="actions"><button class="btn btn-outline btn-xs" onclick="Obat.edit('${o.id}')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn btn-primary btn-xs" onclick="Obat.adjust('${o.id}','tambah')" title="+Stok"><i class="fas fa-plus"></i></button><button class="btn btn-warning btn-xs" onclick="Obat.adjust('${o.id}','kurang')" title="-Stok"><i class="fas fa-minus"></i></button>${isAdmin?`<button class="btn btn-danger btn-xs" onclick="Obat.hapus('${o.id}','${escAttr(o.namaGenerik)}')" title="Hapus"><i class="fas fa-trash"></i></button>`:''}</td></tr>`}).join('')}
  }

  function updateStats() {
    document.getElementById('obTotal').textContent=allObat.length;
    document.getElementById('obLow').textContent=allObat.filter(o=>(o.stock||0)<=(o.minStock||0)).length;
    document.getElementById('obStock').textContent=fmt(allObat.reduce((s,o)=>s+(o.stock||0),0));
    document.getElementById('obNilai').textContent='Rp '+fmt(allObat.reduce((s,o)=>s+((o.stock||0)*(o.hargaBeli||0)),0));
  }

  function openAdd() {
    document.getElementById('modalObatTitle').textContent='Tambah Obat'; document.getElementById('obEditId').value='';
    ['obKode','obGenerik','obMerek','obKekuatan'].forEach(i=>document.getElementById(i).value='');
    ['obKategori','obSediaan','obSatuan'].forEach(i=>document.getElementById(i).selectedIndex=0);
    ['obHPP','obHargaJual','obMinStok'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('obStok').value='0';
    openModal('modalObat'); document.getElementById('obKode').focus();
  }

  function edit(id) {
    const o=allObat.find(x=>x.id===id); if(!o)return;
    document.getElementById('modalObatTitle').textContent='Edit Obat'; document.getElementById('obEditId').value=o.id;
    document.getElementById('obKode').value=o.kodeObat||''; document.getElementById('obGenerik').value=o.namaGenerik||'';
    document.getElementById('obMerek').value=o.namaMerek||''; document.getElementById('obKekuatan').value=o.kekuatan||'';
    document.getElementById('obHPP').value=o.hargaBeli||''; document.getElementById('obHargaJual').value=o.hargaJual||'';
    document.getElementById('obStok').value=o.stock||''; document.getElementById('obMinStok').value=o.minStock||'';
    setSel('obKategori',o.kategori); setSel('obSediaan',o.sediaan); setSel('obSatuan',o.satuan);
    openModal('modalObat');
  }

  function adjust(id, mode) {
    const o=allObat.find(x=>x.id===id); if(!o)return;
    document.getElementById('stokObatId').value=id;
    document.getElementById('stokObatNama').textContent=o.namaGenerik;
    document.getElementById('stokObatJumlah').textContent=(o.stock||0)+' '+(o.satuan||'');
    document.getElementById('stokJumlah').value='';
    document.getElementById('modalStokTitle').textContent=mode==='tambah'?'Tambah Stok':'Kurang Stok';
    document.getElementById('stokKeterangan').selectedIndex=mode==='tambah'?0:3;
    openModal('modalStok'); document.getElementById('stokJumlah').focus();
  }

  async function hapus(id, nama) { if(!confirm(`Hapus "${nama}"?`))return; try{await db.collection('obat').doc(id).delete();toast('Dihapus','success')}catch(e){toast('Gagal: '+e.message,'error')} }
  window.Obat = { edit, adjust, hapus };

  // Modal save handlers (persistent - modals in index.html)
  document.getElementById('obBtnSave').addEventListener('click', async () => {
    const eid=document.getElementById('obEditId').value;
    const d={kodeObat:document.getElementById('obKode').value.trim(),namaGenerik:document.getElementById('obGenerik').value.trim(),namaMerek:document.getElementById('obMerek').value.trim(),kategori:document.getElementById('obKategori').value,sediaan:document.getElementById('obSediaan').value,kekuatan:document.getElementById('obKekuatan').value.trim(),satuan:document.getElementById('obSatuan').value,hargaBeli:parseFloat(document.getElementById('obHPP').value)||0,hargaJual:parseFloat(document.getElementById('obHargaJual').value)||0,stock:parseInt(document.getElementById('obStok').value)||0,minStock:parseInt(document.getElementById('obMinStok').value)||0,status:'aktif'};
    if(!d.kodeObat){toast('Kode wajib','error');return}
    if(!d.namaGenerik){toast('Nama wajib','error');return}
    try{if(eid){await db.collection('obat').doc(eid).update(d);toast('Diperbarui','success')}else{d.createdAt=now();await db.collection('obat').add(d);toast('Ditambahkan','success')}closeModal('modalObat')}catch(e){toast('Gagal: '+e.message,'error')}
  });

  document.getElementById('stokBtnSave').addEventListener('click', async () => {
    const id=document.getElementById('stokObatId').value, j=parseInt(document.getElementById('stokJumlah').value)||0, ket=document.getElementById('stokKeterangan').value;
    const isT=document.getElementById('modalStokTitle').textContent.includes('Tambah');
    if(j<=0){toast('Jumlah harus > 0','error');return}
    const o=allObat.find(x=>x.id===id); if(!o)return;
    const sB=o.stock||0, sS=isT?sB+j:sB-j;
    if(sS<0){toast(`Stok tidak cukup (${sB})`,'error');return}
    try{await db.collection('obat').doc(id).update({stock:sS});await db.collection('stock_mutasi').add({obatId:id,tipe:isT?'masuk':'keluar',jumlah:isT?j:-j,stockSebelum:sB,stockSesudah:sS,keterangan:ket,tanggal:now(),userId:currentUser?.email||'',referensi:'Manual'});toast(`Stok: ${sB} → ${sS}`,'success');closeModal('modalStok')}catch(e){toast('Gagal: '+e.message,'error')}
  });

  // Import (admin only)
  const iz=document.getElementById('importZone'), ifl=document.getElementById('importFile');
  iz.addEventListener('click',()=>ifl.click());
  iz.addEventListener('dragover',e=>{e.preventDefault();iz.classList.add('dragover')});
  iz.addEventListener('dragleave',()=>iz.classList.remove('dragover'));
  iz.addEventListener('drop',e=>{e.preventDefault();iz.classList.remove('dragover');if(e.dataTransfer.files.length)handleIF(e.dataTransfer.files[0])});
  ifl.addEventListener('change',e=>{if(e.target.files.length)handleIF(e.target.files[0])});

  function handleIF(f) {
    const r=new FileReader();
    r.onload=function(e){
      try{const wb=XLSX.read(e.target.result,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],j=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!j.length){toast('File kosong','error');return}
      importData=j.map((r,i)=>({no:i+1,kodeObat:String(r.kodeObat||r.kode||`OB-${String(i+1).padStart(3,'0')}`).trim(),namaGenerik:String(r.namaGenerik||r.nama||'').trim(),namaMerek:String(r.namaMerek||r.merek||'').trim(),kategori:String(r.kategori||'Lainnya').trim(),sediaan:String(r.sediaan||'').trim(),kekuatan:String(r.kekuatan||'').trim(),satuan:String(r.satuan||'butir').trim(),hargaBeli:parseFloat(r.hargaBeli||r.hpp||0)||0,hargaJual:parseFloat(r.hargaJual||r.harga||0)||0,stock:parseInt(r.stock||r.stok||0)||0,minStock:parseInt(r.minStock||r.minstok||100)||0})).filter(r=>r.namaGenerik);
      document.getElementById('importCount').textContent=importData.length;
      const mx=Math.min(importData.length,50);
      let h='<table><thead><tr><th>No</th><th>Kode</th><th>Nama</th><th>HPP</th><th>Harga</th><th>Stok</th></tr></thead><tbody>';
      for(let i=0;i<mx;i++){const r=importData[i];h+=`<tr><td>${r.no}</td><td>${r.kodeObat}</td><td>${r.namaGenerik}</td><td>${fmt(r.hargaBeli)}</td><td>${fmt(r.hargaJual)}</td><td>${r.stock}</td></tr>`}
      if(importData.length>50)h+=`<tr><td colspan="6" style="text-align:center;color:var(--muted)">...+${importData.length-50}</td></tr>`;
      h+='</tbody></table>';
      document.getElementById('importPreview').innerHTML=h;
      document.getElementById('importPreviewWrap').style.display='block';
      document.getElementById('btnDoImport').style.display='inline-flex';
    }catch(err){toast('Gagal baca file','error')}
    };r.readAsArrayBuffer(f);
  }

  document.getElementById('btnDoImport').addEventListener('click', async () => {
    if(!importData.length)return;
    const btn=document.getElementById('btnDoImport');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Mengimport...';
    let ok=0;
    for(let i=0;i<importData.length;i+=400){const batch=db.batch(),chunk=importData.slice(i,i+400);chunk.forEach(r=>{batch.set(db.collection('obat').doc(),{...r,status:'aktif',createdAt:now()})});try{await batch.commit();ok+=chunk.length}catch(e){console.error(e)}}
    document.getElementById('importResult').innerHTML=`<div class="import-result success"><i class="fas fa-check-circle"></i> ${ok} obat berhasil diimport</div>`;
    btn.disabled=false;btn.innerHTML='<i class="fas fa-upload"></i> Import';btn.style.display='none';importData=[];
  });

  document.getElementById('btnDownloadTemplate').addEventListener('click', () => {
    const t=[{kodeObat:'OB-001',namaGenerik:'Paracetamol',namaMerek:'Panadol',kategori:'Analgesik-Antipiretik',sediaan:'Tablet',kekuatan:'500mg',satuan:'butir',hargaBeli:350,hargaJual:600,stock:1000,minStock:100}];
    const ws=XLSX.utils.json_to_sheet(t);ws['!cols']=[{wch:12},{wch:20},{wch:15},{wch:25},{wch:10},{wch:10},{wch:10},{wch:10},{wch:12},{wch:12},{wch:8},{wch:10}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Data Obat');XLSX.writeFile(wb,'template_obat.xlsx');toast('Template didownload','success');
  });

  function doExport() {
    if(!allObat.length){toast('Tidak ada data','warning');return}
    const d=allObat.map(o=>({kodeObat:o.kodeObat,namaGenerik:o.namaGenerik,namaMerek:o.namaMerek,kategori:o.kategori,sediaan:o.sediaan,kekuatan:o.kekuatan,satuan:o.satuan,hargaBeli:o.hargaBeli,hargaJual:o.hargaJual,stock:o.stock,minStock:o.minStock}));
    const ws=XLSX.utils.json_to_sheet(d),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Data Obat');XLSX.writeFile(wb,`obat_${ts().toISOString().slice(0,10)}.xlsx`);toast('Export berhasil','success');
  }

  const obs=new MutationObserver(()=>{if(page.classList.contains('active'))render()});
  obs.observe(page,{attributes:true,attributeFilter:['class']});
  render();
});
