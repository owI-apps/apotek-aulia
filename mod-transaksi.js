registerModule('transaksi', function() {
  const page = document.getElementById('page-transaksi');
  let trxTipe='resep_klinik', trxPasienId=null, trxPasienNama='', trxItems=[], trxRawatId=null, trxRawatData=null;
  let trxTindApotek={gula:false,asam:false,kolestrol:false,tensi:false};
  let trxObatList=[], trxPasienList=[], trxHistory=[];
  const isResep=t=>t==='resep_klinik'||t==='resep_luar', margin=()=>1+C.marginObatResep/100;

  function render() {
    page.innerHTML=`
      <div class="trx-types" id="trxTypes">
        <button class="trx-type-btn active" data-tipe="resep_klinik"><i class="fas fa-file-medical"></i> Resep Klinik</button>
        <button class="trx-type-btn" data-tipe="resep_luar"><i class="fas fa-file-import"></i> Resep Luar</button>
        <button class="trx-type-btn" data-tipe="obat_bebas"><i class="fas fa-pills"></i> Obat Bebas</button>
        <button class="trx-type-btn" data-tipe="tindakan_apotek"><i class="fas fa-vial"></i> Tindakan Apotek</button>
      </div>
      <div class="trx-section" id="trxRawatSection" style="display:none"><h4><i class="fas fa-stethoscope"></i> Link Rawat Jalan</h4><div id="trxRawatList"></div></div>
      <div class="trx-section"><h4><i class="fas fa-user"></i> Pasien (opsional)</h4><div class="search-wrap"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="trxPsSearch" placeholder="Ketik nama pasien atau kosongkan"></div><div class="search-dropdown" id="trxPsDrop"></div></div><div id="trxPsInfo" style="margin-top:10px;font-size:13px;display:none"></div></div>
      <div class="trx-section" id="trxObatSection"><h4><i class="fas fa-pills"></i> Item Obat</h4><div class="search-wrap"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="trxObSearch" placeholder="Cari nama obat..."></div><div class="search-dropdown" id="trxObDrop"></div></div><div id="trxItemsList"></div></div>
      <div class="trx-section" id="trxTindSection" style="display:none"><h4><i class="fas fa-vial"></i> Pilih Tindakan</h4><div class="cb-group" id="cbTind"></div></div>
      <div class="trx-section" id="trxSummarySection"><h4><i class="fas fa-calculator"></i> Ringkasan</h4><table class="trx-summary-table" id="trxSummaryTable"></table></div>
      <div style="display:flex;gap:10px;margin-bottom:28px"><button class="btn btn-outline btn-sm" id="trxReset" style="width:auto"><i class="fas fa-undo"></i> Reset</button><button class="btn btn-primary" id="trxSave"><i class="fas fa-save"></i> Simpan Transaksi</button></div>
      <div class="trx-riwayat"><div class="section-title"><i class="fas fa-history"></i> Riwayat Terakhir</div><div class="table-wrap"><div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nomor</th><th>Tipe</th><th>Pasien</th><th class="num">Total</th><th>Tanggal</th></tr></thead><tbody id="trxHistBody"><tr><td colspan="6"><div class="empty-state"><i class="fas fa-history"></i><p>Memuat...</p></div></td></tr></tbody></table></div></div>`;

    document.querySelectorAll('.trx-type-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.trx-type-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');trxTipe=b.dataset.tipe;trxReset();updateUI()}));
    document.getElementById('trxReset').addEventListener('click', trxReset);
    document.getElementById('trxSave').addEventListener('click', doSave);
    setupDropdowns();
    loadHist();
    updateUI();
  }

  function updateUI() {
    const hasObat=isResep(trxTipe)||trxTipe==='obat_bebas';
    const isTA=trxTipe==='tindakan_apotek';
    document.getElementById('trxRawatSection').style.display=trxTipe==='resep_klinik'?'block':'none';
    document.getElementById('trxObatSection').style.display=hasObat?'block':'none';
    document.getElementById('trxTindSection').style.display=isTA?'block':'none';
    if(isTA)renderTindCB();
    if(trxTipe==='resep_klinik')loadRawatPending();
    renderSummary();
  }

  function trxReset() {
    trxPasienId=null;trxPasienNama='';trxItems=[];trxRawatId=null;trxRawatData=null;
    trxTindApotek={gula:false,asam:false,kolestrol:false,tensi:false};
    document.getElementById('trxPsSearch').value='';document.getElementById('trxPsInfo').style.display='none';
    document.getElementById('trxObatSearch').value='';document.getElementById('trxItemsList').innerHTML='';
    renderSummary();
  }

  function renderTindCB() {
    const el=document.getElementById('cbTind');
    el.innerHTML=`<label data-key="gula"><input type="checkbox" ${trxTindApotek.gula?'checked':''}> Cek Gula Darah <span class="cb-price">Rp ${fmt(C.gulaTotal)}</span></label><label data-key="asam"><input type="checkbox" ${trxTindApotek.asam?'checked':''}> Cek Asam Urat <span class="cb-price">Rp ${fmt(C.asamTotal)}</span></label><label data-key="kolestrol"><input type="checkbox" ${trxTindApotek.kolestrol?'checked':''}> Cek Kolestrol <span class="cb-price">Rp ${fmt(C.kolestrolTotal)}</span></label><label data-key="tensi"><input type="checkbox" ${trxTindApotek.tensi?'checked':''}> Cek Tensi <span class="cb-price">Gratis</span></label>`;
    el.querySelectorAll('label').forEach(lb=>{const inp=lb.querySelector('input');inp.addEventListener('change',()=>{trxTindApotek[lb.dataset.key]=inp.checked;lb.classList.toggle('checked',inp.checked);renderSummary()});if(inp.checked)lb.classList.add('checked')});
  }

  async function loadRawatPending() {
    const el=document.getElementById('trxRawatList');
    try {
      const snap=await db.collection('rawat_jalan').where('status','==','menunggu_obat').orderBy('tanggal','desc').limit(20).get();
      if(snap.empty){el.innerHTML='<p style="font-size:13px;color:var(--muted)">Tidak ada rawat menunggu</p>';return}
      el.innerHTML=`<select id="trxRawatSel" class="filter-select" style="width:100%"><option value="">-- Pilih Rawat Jalan --</option>${snap.docs.map(d=>{const r=d.data();const t=[];if(r.tindakan){if(r.tindakan.cek1)t.push('Cek1');if(r.tindakan.cek2)t.push('Cek2');if(r.tindakan.konsultasi)t.push('Konsultasi')}return`<option value="${d.id}">${r.nomor} — ${r.pasienNama} (${t.join(', ')}) — Rp ${fmt(r.totalTindakan)}</option>`}).join('')}</select>`;
      document.getElementById('trxRawatSel').addEventListener('change',function(){
        if(!this.value){trxRawatId=null;trxRawatData=null;return}
        const rawat=snap.docs.find(d=>d.id===this.value);
        if(rawat){trxRawatId=rawat.id;trxRawatData=rawat.data();
          trxPasienId=rawat.data().pasienId;trxPasienNama=rawat.data().pasienNama;
          document.getElementById('trxPsSearch').value=trxPasienNama;
          document.getElementById('trxPsInfo').style.display='block';
          document.getElementById('trxPsInfo').innerHTML=`<i class="fas fa-stethoscope" style="color:var(--purple)"></i> <strong>${rawat.data().nomor}</strong> — ${trxPasienNama}`;
          renderSummary();
        }
      });
    }catch(e){el.innerHTML='<p style="font-size:13px;color:var(--muted)">Gagal memuat</p>'}
  }

  function setupDropdowns() {
    const psIn=document.getElementById('trxPsSearch'),psDr=document.getElementById('trxPsDrop');
    psIn.addEventListener('input',function(){const v=this.value.toLowerCase();if(!v){psDr.classList.remove('show');return}const m=trxPasienList.filter(p=>(p.nama||'').toLowerCase().includes(v)||(p.noRM||'').toLowerCase().includes(v)).slice(0,8);if(!m.length){psDr.classList.remove('show');return}psDr.innerHTML=m.map(p=>`<div class="sd-item" data-id="${p.id}" data-nama="${escAttr(p.nama)}">${p.noRM} — ${p.nama}<div class="sd-sub">${p.telepon||''}</div></div>`).join('');psDr.classList.add('show');psDr.querySelectorAll('.sd-item').forEach(it=>it.addEventListener('click',()=>{trxPasienId=it.dataset.id;trxPasienNama=it.dataset.nama;psIn.value=trxPasienNama;psDr.classList.remove('show');document.getElementById('trxPsInfo').style.display='block';document.getElementById('trxPsInfo').innerHTML=`<i class="fas fa-user-check" style="color:var(--accent)"></i> ${trxPasienNama}`}))});
    
    const obIn=document.getElementById('trxObSearch'),obDr=document.getElementById('trxObDrop');
    obIn.addEventListener('input',function(){const v=this.value.toLowerCase();if(!v){obDr.classList.remove('show');return}const m=trxObatList.filter(o=>(o.namaGenerik||'').toLowerCase().includes(v)||(o.kodeObat||'').toLowerCase().includes(v)||(o.namaMerek||'').toLowerCase().includes(v)).slice(0,10);if(!m.length){obDr.classList.remove('show');return}obDr.innerHTML=m.map(o=>`<div class="sd-item" data-id="${o.id}">${o.kodeObak} — ${o.namaGenerik} ${o.namaMerek?'('+o.namaMerek+')':''} ${o.kekuatan||''}<div class="sd-sub">HPP: ${fmt(o.hargaBeli)} | Stok: ${o.stock||0} ${o.satuan||''}</div></div>`).join('');obDr.classList.add('show');obDr.querySelectorAll('.sd-item').forEach(it=>it.addEventListener('click',()=>{addTrxItem(it.dataset.id);obDr.classList.remove('show');obIn.value=''}))});
    
    document.addEventListener('click',e=>{if(!e.target.closest('#trxPsSearch')&&!e.target.closest('#trxPsDrop'))psDr.classList.remove('show');if(!e.target.closest('#trxObSearch')&&!e.target.closest('#trxObDrop'))obDr.classList.remove('show')});
  }

  function addTrxItem(obatId) {
    const o=trxObatList.find(x=>x.id===obatId);if(!o)return;
    if(trxItems.find(x=>x.obatId===obatId)){toast('Sudah ditambahkan','warning');return}
    trxItems.push({obatId,nama:o.namaGenerik,merek:o.namaMerek||'',sediaan:o.sediaan,kekuatan:o.kekuatan,satuan:o.satuan,hpp:o.hargaBeli,hargaJual:o.hargaJual,qty:1,racik:false,stock:o.stock||0});
    renderItems();renderSummary();
  }

  function renderItems() {
    const el=document.getElementById('trxItemsList');if(!trxItems.length){el.innerHTML='';return}
    el.innerHTML=trxItems.map((it,i)=>{
      const harga=isResep(trxTipe)?Math.round(it.hpp*margin()*it.qty):it.hargaJual*it.qty;
      return`<div style="display:grid;grid-template-columns:1fr 80px 100px ${isResep(trxTipe)?'60px':''} 40px;gap:8px;align-items:center;margin-bottom:10px;padding:10px;background:var(--surface);border-radius:8px;border:1px solid var(--border)"><div style="font-size:13px;font-weight:500">${it.nama} ${it.merek?'<span style="color:var(--muted);font-size:11px">('+it.merek+')</span>':''}<br><span style="font-size:11px;color:var(--muted)">${it.sediaan||''} ${it.kekuatan||''} | HPP: ${fmt(it.hpp)}${isResep(trxTipe)?' | Jual: '+fmt(Math.round(it.hpp*margin())):' | Jual: '+fmt(it.hargaJual)} | Stok: ${it.stock}</span></div><div><input type="number" value="${it.qty}" min="1" max="${it.stock}" onchange="updItem(${i},'qty',this.value)" style="width:100%;padding:8px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--fg);font-size:13px;text-align:center;font-family:var(--mono);outline:none"></div><div style="text-align:right;font-family:var(--mono);font-size:13px;color:var(--accent);font-weight:600;padding:8px 0">${fmt(harga)}</div>${isResep(trxTipe)?`<div style="text-align:center"><input type="checkbox" id="rac${i}" ${it.racik?'checked':''} onchange="updItem(${i},'racik',this.checked)"><label for="rac${i}" style="font-size:11px;cursor:pointer;margin-left:4px">Racik</label></div>`:''}<div style="text-align:center"><button class="btn btn-danger btn-xs" onclick="rmItem(${i})"><i class="fas fa-times"></i></button></div></div>`}).join('');
  }

  function updItem(i,k,v){if(k==='qty')trxItems[i].qty=Math.max(1,parseInt(v)||1);else if(k==='racik')trxItems[i].racik=v;renderItems();renderSummary()}
  function rmItem(i){trxItems.splice(i,1);renderItems();renderSummary()}

  // ================================================================
  //  HITUNG TRANSAKSI
  // ================================================================
  function hitung() {
    const isRK=trxTipe==='resep_klinik', isRL=trxTipe==='resep_luar', isOB=trxTipe==='obat_bebas', isTA=trxTipe==='tindakan_apotek';
    let rows=[], totalObat=0, totalHPP=0, totalRacik=0, jasaResep=0, biayaLuar=0, totalTind=0, totalTAFee=0, totalHPPA=0, rawatCost=0, subtotal=0, pembulatan=0;

    if(isRK||isRL||isOB) {
      trxItems.forEach(it=>{
        const hpp=it.hpp*it.qty, harga=isRK||isRL?Math.round(it.hpp*margin()*it.qty):it.hargaJual*it.qty;
        totalObat+=harga; totalHPP+=hpp;
        if(it.racik)totalRacik+=C.racikPerItem;
        rows.push({label:`${it.nama} ${it.kekuatan||''} x${it.qty}${it.racik?' (R)':''}`,val:harga});
      });
      if(isRK){jasaResep=C.jasaResep;rows.push({label:'Jasa Resep',val:jasaResep})}
      if(isRL){biayaLuar=C.biayaResepLuar;rows.push({label:'Biaya Resep Luar',val:biayaLuar})}
      if(totalRacik)rows.push({label:`Racik (${trxItems.filter(x=>x.racik).length} item)`,val:totalRacik});
      if(isRK&&trxRawatData){rawatCost=trxRawatData.totalTindakan||0;rows.push({label:`Rawat (${trxRawatData.nomor})`,val:rawatCost})}
      subtotal=totalObat+jasaResep+biayaLuar+totalRacik+rawatCost;
    } else if(isTA) {
      if(trxTindApotek.gula){totalTind+=C.gulaTotal;totalTAFee+=C.gulaTindakan;totalHPPA+=C.gulaTotal-C.gulaTindakan;rows.push({label:'Cek Gula Darah',val:C.gulaTotal})}
      if(trxTindApotek.asam){totalTind+=C.asamTotal;totalTAFee+=C.asamTindakan;totalHPPA+=C.asamTotal-C.asamTindakan;rows.push({label:'Cek Asam Urat',val:C.asamTotal})}
      if(trxTindApotek.kolestrol){totalTind+=C.kolestrolTotal;totalTAFee+=C.kolestrolTindakan;totalHPPA+=C.kolestrolTotal-C.kolestrolTindakan;rows.push({label:'Cek Kolestrol',val:C.kolestrolTotal})}
      if(trxTindApotek.tensi)rows.push({label:'Cek Tensi',val:0});
      subtotal=totalTind;
    }

    pembulatan=hitungPembulatan(subtotal);
    if(pembulatan>0)rows.push({label:'Pembulatan',val:pembulatan});

    const marginObat=totalObat-totalHPP;
    const bh={bhDokter:isRK?C.bhDokter:0,jdDokter:isRK?C.jdDokter:0,bagianKlinik:isRK?C.bagianKlinikResep:0,tuslah:isRK?C.tuslah:0,kasResep:isRK?C.kasResep:0,dokterLuar:isRL?C.dokterLuar:0,labaLuar:isRL?C.labaLuar:0,racikDa:totalRacik,makanDa:pembulatan,omzetDa:marginObat,rawatKlinik:rawatCost,hppApotek:totalHPPA,totalHPP,totalObat,totalTindakan,totalRacik,jasaResep,biayaLuar,totalTindakanApotekFee:totalTAFee};
    return{rows,subtotal,pembulatan,totalAkhir:subtotal+pembulatan,bagiHasil:bh};
  }

  function renderSummary() {
    const h=hitung(),tb=document.getElementById('trxSummaryTable');
    let html='';h.rows.forEach(r=>{html+=`<tr><td>${r.label}</td><td>Rp ${fmt(r.val)}</td></tr>`});
    html+=`<tr class="total-row"><td>TOTAL</td><td>Rp ${fmt(h.totalAkhir)}</td></tr>`;
    tb.innerHTML=html;
  }

  // ================================================================
  //  SIMPAN TRANSAKSI
  // ================================================================
  async function doSave() {
    const h=hitung();
    if(h.totalAkhir<=0){toast('Tidak ada item','error');return}
    if((isResep(trxTipe)||trxTipe==='obat_bebas')&&!trxItems.length){toast('Tambahkan obat','error');return}
    if(trxTipe==='tindakan_apotek'&&!trxTindApotek.gula&&!trxTindApotek.asam&&!trxTindApotek.kolestrol){toast('Pilih tindakan','error');return}

    // Validasi stok
    for(const it of trxItems){if(it.qty>(it.stock||0)){toast(`Stok ${it.nama} tidak cukup (${it.stock})`,'error');return}}

    const btn=document.getElementById('trxSave');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    try{
      const ds=ts().toISOString().slice(0,10).replace(/-/g,'');
      const snap=await db.collection('transaksi').where('nomor','>=','TRX-'+ds).where('nomor','<','TRX-'+ds+'Z').orderBy('nomor','desc').limit(1).get();
      const lastNum=snap.empty?0:parseInt(snap.docs[0].data().nomor.slice(-4))||0;
      const nomor='TRX-'+ds+'-'+String(lastNum+1).padStart(4,'0');
      const hour=ts().getHours(), shift=hour<13?'pagi':'siang';

      const trxData={nomor,tanggal:now(),tipe:trxTipe,pasienId:trxPasienId,pasienNama:trxPasienNama,shift,karyawanId:currentUser?.email||'',items:trxItems.map(it=>({obatId:it.obatId,nama:it.nama,hpp:it.hpp,hargaJual:isResep(trxTipe)?Math.round(it.hpp*margin()):it.hargaJual,qty:it.qty,racik:it.racik,subtotal:isResep(trxType)?Math.round(it.hpp*margin()*it.qty):it.hargaJual*it.qty})),tindakanApotek:trxTipe==='tindakan_apotek'?{...trxTindApotek}:null,rawatJalanId:trxRawatId,rawatJalanNomor:trxRawatData?.nomor||null,rawatJalanTotal:trxRawatData?.totalTindakan||0,jasaResep:h.bagiHasil.jasaResep,biayaResepLuar:h.bagiHasil.biayaLuar,totalObat:h.totalObat,totalRacik:h.totalRacik,totalTindakan:h.totalTindakan,totalTindakanApotekFee:h.bagiHasil.totalTindakanApotekFee,subtotal:h.subtotal,pembulatan:h.pembulatan,totalAkhir:h.totalAkhir,bagiHasil:h.bagiHasil,status:'selesai'};

      const batch=db.batch();
      const trxRef=db.collection('transaksi').doc();
      batch.set(trxRef,{...trxData,id:trxRef.id});

      // Kurangi stok
      if(isResep(trxTipe)||trxTipe==='obat_bebas'){
        trxItems.forEach(it=>{
          batch.update(db.collection('obat').doc(it.obatId),{stock:firebase.firestore.FieldValue.increment(-it.qty)});
          batch.set(db.collection('stock_mutasi').doc(),{obatId:it.obatId,tipe:'keluar',jumlah:-it.qty,stockSebelum:it.stock,stockSesudah:it.stock-it.qty,keterangan:'Penjualan '+nomor,tanggal:now(),userId:currentUser?.email||'',referensi:nomor});
        });
      }

      // Update rawat status
      if(trxRawatId){batch.update(db.collection('rawat_jalan').doc(trxRawatId),{status:'selesai',transaksiId:trxRef.id,transaksiNomor:nomor})}

      await batch.commit();
      toast(`${nomor} — Rp ${fmt(h.totalAkhir)}`,'success');
      trxReset();loadHist();
    }catch(e){toast('Gagal: '+e.message,'error');console.error(e)}
    finally{btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Simpan Transaksi'}
  }

  function isResep(t){return t==='resep_klinik'||t==='resep_luar'}

  // Riwayat
  async function loadHist() {
    try{const snap=await db.collection('transaksi').orderBy('tanggal','desc').limit(30).get();trxHistory=snap.docs.map(d=>({id:d.id,...d.data()}));renderHist()}catch(e){}
  }
  function renderHist() {
    const tb=document.getElementById('trxHistBody');
    const labels={resep_klinik:'Resep Klinik',resep_luar:'Resep Luar',obat_bebas:'Obat Bebas',tindakan_apotek:'Tindakan Apotek'};
    if(!trxHistory.length){tb.innerHTML='<tr><td colspan="6"><div class="empty-state"><i class="fas fa-history"></i><p>Belum ada transaksi</p></div></td></tr>';return}
    tb.innerHTML=trxHistory.map((t,i)=>`<tr><td>${i+1}</td><td style="font-family:var(--mono);font-size:12px;color:var(--accent)">${t.nomor}</td><td style="font-size:12px">${labels[t.tipe]||t.tipe}</td><td style="font-size:12px">${t.pasienNama||'-'}</td><td class="num" style="font-weight:600">Rp ${fmt(t.totalAkhir)}</td><td style="font-size:12px;color:var(--muted)">${fmtDate(t.tanggal)}</td></tr>`).join('');
  }

  // Load supporting data
  db.collection('obat').onSnapshot(snap=>{trxObatList=snap.docs.map(d=>({id:d.id,...d.data()}))},()=>{});
  db.collection('pasien').onSnapshot(snap=>{trxPasienList=snap.docs.map(d=>({id:d.id,...d.data()}))},()=>{});

  const obs=new MutationObserver(()=>{if(page.classList.contains('active'))render()});
  obs.observe(page,{attributes:true,attributeFilter:['class']});
  render();
});
