registerModule('laporan', function() {
  const page = document.getElementById('page-laporan');
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  function render() {
    page.innerHTML = `
      <div class="trx-section"><h4><i class="fas fa-calendar-alt"></i> Pilih Periode</h4>
        <div class="form-grid" style="max-width:400px">
          <div class="form-group"><label>Bulan</label><select id="lrBulan">${bulanNama.map((b,i)=>`<option value="${i}" ${i===ts().getMonth()?'selected':''}>${b}</option>`).join('')}</select></div>
          <div class="form-group"><label>Tahun</label><input type="number" id="lrTahun" value="${ts().getFullYear()}" min="2020" max="2099"></div>
          <div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-sm" id="lrBtnHitung" style="width:auto;min-width:160px"><i class="fas fa-chart-bar"></i> Buat Laporan</button></div>
        </div>
      </div>
      <div id="lrResult"></div>`;
    document.getElementById('lrBtnHitung').addEventListener('click', hitungLaporan);
  }

  async function hitungLaporan() {
    const btn = document.getElementById('lrBtnHitung');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghitung...';

    try {
      const bulan = parseInt(document.getElementById('lrBulan').value);
      const tahun = parseInt(document.getElementById('lrTahun').value) || ts().getFullYear();
      const start = new Date(tahun, bulan, 1);
      const end = new Date(tahun, bulan + 1, 1);

      const trxSnap = await db.collection('transaksi').where('tanggal','>=',start).where('tanggal','<',end).get();
      let D = {}, totalHPPAll = 0, bebanTindakan = 0;

      trxSnap.docs.forEach(doc => {
        const t = doc.data();
        const key = t.tipe || 'lainnya';
        if (!D[key]) D[key] = { count:0, total:0, hpp:0 };
        D[key].count++;
        D[key].total += t.totalAkhir || 0;
        D[key].hpp += t.totalHPP || 0;
        totalHPPAll += t.totalHPP || 0;
        if (t.tipe === 'tindakan_apotek' && t.tindakanApotek) {
          const ta = t.tindakanApotek;
          if (ta.gula) bebanTindakan += (C.gulaTotal - C.gulaTindakan);
          if (ta.asam) bebanTindakan += (C.asamTotal - C.asamTindakan);
          if (ta.kolestrol) bebanTindakan += (C.kolestrolTotal - C.kolestrolTindakan);
        }
      });

      const totalRevenue = Object.values(D).reduce((s,d) => s + d.total, 0);
      const labaRugi = totalRevenue - totalHPPAll - bebanTindakan;

      const obatSnap = await db.collection('obat').get();
      let nilaiPersediaan = 0;
      obatSnap.docs.forEach(d => { nilaiPersediaan += (d.data().stock||0) * (d.data().hargaBeli||0); });

      const hutangSnap = await db.collection('hutang_usaha').where('status','==','aktif').get();
      let totalHutang = 0;
      hutangSnap.docs.forEach(d => { totalHutang += (d.data().total||0) - (d.data().sudahBayar||0); });

      const piutangSnap = await db.collection('piutang_karyawan').where('status','==','aktif').get();
      let totalPiutang = 0;
      piutangSnap.docs.forEach(d => { totalPiutang += (d.data().jumlah||0) - (d.data().sudahBayar||0); });

      const karSnap = await db.collection('karyawan').get();
      let totalGaji = 0;
      karSnap.docs.forEach(d => { totalGaji += d.data().gajiPokok || 0; });

      const kas = totalRevenue - totalHPPAll - bebanTindakan - totalGaji;
      const ekuitas = kas + nilaiPersediaan - totalHutang - totalPiutang;
      const bulanLabel = bulanNama[bulan];

      const el = document.getElementById('lrResult');
      el.innerHTML = `
        <h4 style="margin-bottom:20px">Laporan Bulan ${bulanLabel} ${tahun}</h4>
        <div class="stats-grid" style="margin-bottom:24px">
          <div class="stat-card"><div class="s-label">Total Pendapatan</div><div class="s-value green">Rp ${fmt(totalRevenue)}</div></div>
          <div class="stat-card"><div class="s-label">Total HPP</div><div class="s-value red">Rp ${fmt(totalHPPAll)}</div></div>
          <div class="stat-card"><div class="s-label">Beban Tindakan</div><div class="s-value red">Rp ${fmt(bebanTindakan)}</div></div>
          <div class="stat-card"><div class="s-label">Laba/Rugi</div><div class="s-value ${labaRugi>=0?'green':'red'}">${labaRugi>=0?'+':''}Rp ${fmt(labaRugi)}</div></div>
        </div>
        <div class="section-title"><i class="fas fa-receipt"></i> Per Tipe Transaksi</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Tipe</th><th class="num">Jumlah</th><th class="num">Pendapatan</th><th class="num">HPP</th><th class="num">Laba</th></tr></thead>
          <tbody>${Object.entries(D).map(([key,d])=>{
            const laba = d.total - d.hpp;
            return `<tr><td>${key.replace(/_/g,' ')} (${d.count})</td><td class="num">${d.count}</td><td class="num">Rp ${fmt(d.total)}</td><td class="num">Rp ${fmt(d.hpp)}</td><td class="num" style="color:${laba>=0?'var(--accent)':'var(--danger)'}">Rp ${fmt(laba)}</td></tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="section-title" style="margin-top:28px"><i class="fas fa-balance-scale"></i> Neraca Estimasi</div>
        <div class="table-wrap"><table>
          <tbody>
            <tr style="background:rgba(16,185,129,.04)"><td colspan="2" style="font-weight:700">ASET</td><td></td></tr>
            <tr><td style="padding-left:24px">Persediaan Obat</td><td></td><td class="num" style="color:var(--accent)">Rp ${fmt(nilaiPersediaan)}</td></tr>
            <tr><td style="padding-left:24px">Kas (estimasi)</td><td></td><td class="num" style="color:${kas>=0?'var(--accent)':'var(--danger)'}">Rp ${fmt(kas)}</td></tr>
            <tr style="background:rgba(239,68,68,.04)"><td colspan="2" style="font-weight:700">KEWAJIBAN</td><td></td></tr>
            <tr><td style="padding-left:24px">Hutang Usaha</td><td></td><td class="num">Rp ${fmt(totalHutang)}</td></tr>
            <tr><td style="padding-left:24px">Piutang Karyawan</td><td></td><td class="num">Rp ${fmt(totalPiutang)}</td></tr>
            <tr><td style="padding-left:24px">Gaji Karyawan</td><td></td><td class="num">Rp ${fmt(totalGaji)}</td></tr>
            <tr><td style="padding-left:24px">Beban Tindakan</td><td></td><td class="num">Rp ${fmt(bebanTindakan)}</td></tr>
            <tr style="background:rgba(59,130,246,.04)"><td colspan="2" style="font-weight:700">EKUITAS (estimasi)</td><td class="num" style="font-size:16px;font-weight:800;color:var(--accent)">Rp ${fmt(ekuitas)}</td></tr>
            <tr><td style="padding-left:24px">Laba/Rugi Bulan Ini</td><td></td><td class="num" style="font-weight:700;color:${labaRugi>=0?'var(--accent)':'var(--danger)'}">Rp ${fmt(labaRugi)}</td></tr>
          </tbody>
        </table></div>
        <div style="display:flex;gap:10px;margin-top:24px">
          <button class="btn btn-primary btn-sm" onclick="Lap.exportExcel()" style="width:auto"><i class="fas fa-file-excel"></i> Export Excel</button>
        </div>`;
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-chart-bar"></i> Buat Laporan';
    } catch(e) {
      console.error('Laporan error:', e);
      document.getElementById('lrResult').innerHTML = `<div class="import-result" style="background:var(--danger-dim);color:var(--danger);border:1px solid rgba(239,68,68,.2)"><i class="fas fa-exclamation-circle"></i> Gagal: ${e.message}</div>`;
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-chart-bar"></i> Buat Laporan';
    }
  }

  async function exportExcel() {
    const bulan = parseInt(document.getElementById('lrBulan').value);
    const tahun = parseInt(document.getElementById('lrTahun').value) || ts().getFullYear();
    const start = new Date(tahun, bulan, 1);
    const end = new Date(tahun, bulan + 1, 1);
    const bulanLabel = bulanNama[bulan];

    const trxSnap = await db.collection('transaksi').where('tanggal','>=',start).where('tanggal','<',end).get();
    const trxData = trxSnap.docs.map(d => { const t = d.data(); return { 'Nomor':t.nomor,'Tipe':(t.tipe||'').replace(/_/g,' '),'Pasien':t.pasienNama||'-','Total':t.totalAkhir||0,'HPP':t.totalHPP||0,'Tanggal':t.tanggal?fmtDate(t.tanggal):'-' }; });

    let totalRevenue=0, totalHPP=0, bebanTindakan=0;
    trxSnap.docs.forEach(d => {
      const t = d.data();
      totalRevenue += t.totalAkhir||0; totalHPP += t.totalHPP||0;
      if (t.tipe==='tindakan_apotek' && t.tindakanApotek) {
        const ta = t.tindakanApotek;
        if (ta.gula) bebanTindakan += (C.gulaTotal-C.gulaTindakan);
        if (ta.asam) bebanTindakan += (C.asamTotal-C.asamTindakan);
        if (ta.kolestrol) bebanTindakan += (C.kolestrolTotal-C.kolestrolTindakan);
      }
    });

    const obatSnap = await db.collection('obat').get();
    let nilaiPersediaan=0;
    obatSnap.docs.forEach(d => { nilaiPersediaan += (d.data().stock||0)*(d.data().hargaBeli||0); });

    const hutangSnap = await db.collection('hutang_usaha').where('status','==','aktif').get();
    let totalHutang=0;
    hutangSnap.docs.forEach(d => { totalHutang += (d.data().total||0)-(d.data().sudahBayar||0); });

    const piutangSnap = await db.collection('piutang_karyawan').where('status','==','aktif').get();
    let totalPiutang=0;
    piutangSnap.docs.forEach(d => { totalPiutang += (d.data().jumlah||0)-(d.data().sudahBayar||0); });

    const karSnap = await db.collection('karyawan').get();
    let totalGaji=0;
    karSnap.docs.forEach(d => { totalGaji += d.data().gajiPokok||0; });

    const kas = totalRevenue-totalHPP-bebanTindakan-totalGaji;
    const ekuitas = kas+nilaiPersediaan-totalHutang-totalPiutang;
    const labaRugi = totalRevenue-totalHPP-bebanTindakan;

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(trxData);
    ws1['!cols'] = [{wch:18},{wch:22},{wch:15},{wch:18},{wch:18},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws1, 'Transaksi');

    const ws2 = XLSX.utils.json_to_sheet([
      {'Keterangan':'Total Pendapatan','Nilai':totalRevenue},
      {'Keterangan':'Total HPP','Nilai':-totalHPP},
      {'Keterangan':'Beban Tindakan','Nilai':-bebanTindakan},
      {'Keterangan':'Laba/Rugi','Nilai':labaRugi}
    ]);
    ws2['!cols'] = [{wch:30},{wch:20}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Laba Rugi');

    const ws3 = XLSX.utils.json_to_sheet([
      {'Keterangan':'Aset - Persediaan Obat','Nilai':nilaiPersediaan},
      {'Keterangan':'Aset - Kas','Nilai':kas},
      {'Keterangan':'Kewajiban - Hutang Usaha','Nilai':-totalHutang},
      {'Keterangan':'Kewajiban - Piutang Karyawan','Nilai':-totalPiutang},
      {'Keterangan':'Kewajiban - Gaji Karyawan','Nilai':-totalGaji},
      {'Keterangan':'Kewajiban - Beban Tindakan','Nilai':-bebanTindakan},
      {'Keterangan':'Ekuitas (estimasi)','Nilai':ekuitas},
      {'Keterangan':'Laba/Rugi','Nilai':labaRugi}
    ]);
    ws3['!cols'] = [{wch:35},{wch:20}];
    XLSX.utils.book_append_sheet(wb, ws3, 'Neraca');

    XLSX.writeFile(wb, `laporan_${bulanLabel}_${tahun}.xlsx`);
    toast('Export berhasil','success');
  }

  window.Lap = { exportExcel };
  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
