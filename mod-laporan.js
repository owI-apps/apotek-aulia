registerModule('laporan', function() {
  const page = document.getElementById('page-laporan');
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','agustus','September','Oktober','November','Desember'];
  const tahunSekarang = ts().getFullYear();

  function render() {
    page.innerHTML = `
      <div class="trx-section"><h4><i class="fas fa-calendar-alt"></i> Pilih Periode</h4>
        <div class="form-grid" style="max-width:400px">
          <div class="form-group"><label>Bulan</label><select id="lrBulan">${bulanNama.map((b,i)=>`<option value="${i}" ${i===ts().getMonth()?'selected':''}>${b}</option>`).join('')}</select></div>
          <div class="form-group"><label>Tahun</label><input type="number" id="lrTahun" value="${tahunSekar}" min="2020" max="2099"></div>
          <div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-sm" id="lrBtnHitung" style="width:auto;min-width:160px"><i class="fas fa-chart-bar"></i> Buat Laporan</button></div>
        </div>
      </div>
      <div id="lrResult"></div>`;

    document.getElementById('lrBulan').value = ts().getMonth();
    document.getElementById('lrTahun').value = tahunSekarang;
    document.getElementById('lrBtnHitung').addEventListener('click', hitungLaporan);
  }

  async function hitungLaporan() {
    const btn = document.getElementById('lrBtnHitung');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghitung...';

    try {
      const bulan = parseInt(document.getElementById('lrBulan').value);
      const tahun = parseInt(document.getElementById('lrTindakan').value) || tahunSekarang;
      const start = new Date(tahun, bulan, 1);
      const end = new Date(tahun, bulan + 1, 1);

      // Load transaksi periode ini
      const trxSnap = await db.collection('transaksi').where('tanggal','>=',start).where('tanggal','<',end).get();

      // Hitung per tipe
      let D = {};
      trxSnap.docs.forEach(doc => {
        const t = doc.data();
        const key = tipe(t);
        if (!D[key]) D[key] = { count:0, total:0, hpp:0, totalHPP:0 };
        D[key].count++;
        D[key].total += t.totalAkhir || 0;
        if (t.totalHPP) D[key].hpp += t.totalHPP;
        if (t.tipe === 'tindakan_apotek') {
          if (t.tindakan?.gula) D[key].hpp += (C.gulaTotal - C.gulaTindakan);
          if (t.tindakan?.asam) D[key].hpp += (C.asamTotal - C.asamTindangan);
          if (t.tindakan?.kolestrol) D[key].hpp += (C.kolestrolTotal - C.kolestrolTindangan);
        }
      });

      const totalObat = D.obat_bebas?.total || 0;
      const totalHPP = D.obat_bebas?.hpp || 0;
      const margin = totalObat - totalHPP;
      const totalRevenue = Object.values(D).reduce((s,d)=>s+d.total,0);

      // Load persediaan obat
      const obatSnap = await db.collection('obat').get();
      let nilaiPersediaan = 0;
      obatSnap.docs.forEach(d => { nilaiPersediaan += (d.data().stock||0) * (d.data().hargaBeli||0); });

      // Load hutang
      const hutangSnap = await db.collection('hutang_usaha').where('status','==','aktif').get();
      let totalHutang = 0;
      hutangSnap.docs.forEach(d => { totalHutang += (d.data().total||0) - (d.data().sudahBayar||0); });

      // Load piutang
      const piutangSnap = await db.collection('piutang_karyawan').where('status','==','aktif').get();
      let totalPiutang = 0;
      piutangSnap.docs.forEach(d => { totalPiutang += (d.data().jumlah||0) - (d.data().sudahBayar||0); });

      // Load total gaji karyawan
      const karSnap = await db.collection('karyawan').get();
      let totalGaji = 0;
      karSnap.docs.forEach(d => { totalGaji += d.data().gajiPokok || 0; });

      // Hitung beban tindakan apotek (HPP alat, jarum)
      let bebanTind = 0;
      if (D.tindakan_apotek) bebanTind = D.hppApotek;

      // Laporan Laba/Rugi
      const labaRugi = totalRevenue - totalHPP - bebanTindang;

      // Neraca estimasi (sederhana)
      const aset = nilaiPersediaan + (totalRevenue > totalHPP ? totalRevenue - totalHPP : 0);
      const kewajiban = totalHutang + totalPiutang;
      const ekuitas = totalRevenue - (totalHPP + bebanTindakan + totalGaji);
      const kas = totalRevenue - (totalHPP + bebanTindakan + totalGaji);
      const alasan = kas < 0 ? 'Defisit' : kas >= 0 ? 'Surplus' : 'Seimbang';

      const bulanLabel = bulanNama[parseInt(document.getElementById('lrBulan').value)];

      const el = document.getElementById('lrResult');
      el.innerHTML = `
        <h4 style="margin-bottom:20px">Laporan Bulan ${bulanLabel} ${document.getElementById('lrTindakan').value}</h4>

        <div class="stats-grid" style="margin-bottom:24px">
          <div class="stat-card"><div class="s-label">Total Pendapatan</div><div class="s-value green">Rp ${fmt(totalRevenue)}</div></div>
          <div class="stat-card"><div class="s-label">Total HPP</div><div class="s-value red">Rp ${fmt(totalHPP)}</div></div>
          <div class="stat-card"><div class="s-label">Laba/Rugi</div><div class="s-value yellow">${labaRugi >= 0 ? '+' : ''}Rp ${fmt(Math.abs(labaRugi)}</div></div>
          <div class="stat-card"><div class="s-label">Beban Tindakan</div><div class="s-value red">Rp ${fmt(bebanTindak)}</div></div>
        </div>

        <div class="table-wrap"><table><thead><tr><th>Tipe Transaksi</th><th class="num">Jumlah Trx</th><th class="num">Total Pendapatan</th><th class="num">Total HPP</th><th class="num">Laba/Rugi</th></tr></thead>
        <tbody>${Object.entries(D).map(([key, d]) => {
          const labaR = d.total - d.hpp;
          return `<tr><td>${key.replace('_',' ')} (${d.count} trx)</td><td class="num">${d.count}</td><td class="num">Rp ${fmt(d.total)}</td><td class="num">Rp ${fmt(d.hpp)}</td><td class="num" style="color:${labaRuga>=0?'var(--accent)':'var(--danger)'}>Rp ${fmt(Math.abs(labaRuga)}</td></tr>`;
        }).join('')}</tbody></table></div>

        <h4 style="margin:28px 0 16px;font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px"><i class="fas fa-balance-scale"></i> Neraca Estimasi</h4>
        <div class="table-wrap"><table>
          <tbody>
            <tr><td style="font-weight:600">ASET</td><td></td></td><td></td></td></tr>
            <tr><td style="padding-left:24px">  Persediaan Obat</td><td></td><td class="num" style="color:var(--accent)">Rp ${fmt(nilaiPersediaan)}</td></td></tr>
            <tr><td style="padding-left:24px">  Kas</td><td></td><td class="num" style="color:${kas >= 0 ? 'var(--accent)' : 'var(--danger)'}">Rp ${fmt(kas)}</td></td></tr>
            <tr style="background:rgba(239,68,68,.04)"><td style="font-weight:600">KEWAJIBAN</td><td></td><td class="num">Rp ${fmt(kewajiban)}</td></td></tr>
            <tr><td style="padding-left:24px">  Piutang Karyawan</td><td></td><td class="num">Rp ${fmt(totalPiutang)}</td></td></tr>
            <tr><td style="padding-left:24px">  Hutang Usaha</td><td></td><td class="num">Rp ${fmt(totalHutang)}</td></td></tr>
            <tr><td style="padding-left:24px">  Gaji Karyawan</td><td></td><td class="num">Rp ${fmt(totalGaji)}</td></td></tr>
            <tr style="background:rgba(59,130,246,.04)"><td style="font-weight:600">EKUITAS</td><td></td><td class="num">Rp ${fmt(ekuitas)}</td></td></tr>
            <tr><td style="padding-left:24px">  Beban Tindakan</td><td></td><td class="num">Rp ${fmt(bebanTindak)}</td></td></tr>
            <tr style="background:rgba(16,185,129,.04)"><td style="font-weight:600">TOTAL EKUITAS</td><td></td><td class="num" style="font-size:16px;font-weight:800;color:var(--accent)">Rp ${fmt(ekuitas)}</td></td></tr>
            <tr><td style="padding-left:24px">  LABA RUGI</td><td></td><td class="num" style="font-size:16px;font-weight:800;color:var(--yellow)">Rp ${fmt(labaRugi)}</td></td></tr>
          </tbody></table></div>

        <div style="display:flex;gap:10px;margin-top:24px">
          <button class="btn btn-primary btn-sm" onclick="Keu.exportLaporan()" style="width:auto"><i class="fas fa-file-excel"></i> Export Semua ke Excel</button>
        </div>
      </div>`;

      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-chart-bar"></i> Buat Laporan';
    } catch(e) {
      console.error('Laporan error:', e);
      document.getElementById('lrResult').innerHTML = `<div class="import-result error"><i class="fas fa-exclamation-circle"></i> Gagal: ${e.message}</div>`;
    }
  }

  async function exportLaporan() {
    const bulan = parseInt(document.getElementById('lrBulan.value);
    const tahun = parseInt(document.getElementById('lrTahun').value) || ts().getFullYear();
    const start = new Date(tahun, bulan, 1);
    const end = new Date(tahun, bulan + 1, 1);

    const trxSnap = await db.collection('transaksi').where('tanggal','>=',start).where('tanggal','<',end).get();

    // Tabel transaksi
    const trxData = trxSnap.docs.map(d => ({
      'Nomor': d.data().nomor,
      'Tipe': d.data().tipe.replace('_',' '),
      'Pasien': d.data().pasienNama || '-',
      'Total': d.data().totalAkhir || 0,
      'HPP': d.data().totalHPP || 0,
      'Tanggal': d.data().tanggal ? fmtDate(d.data().tanggal) : '-'
    }));

    // Tabel Laba Rugi
    const labaRugi = trxData.reduce((s,d) => {
      return s + (d.Total - d.HPP);
    }, 0);

    const totalRevenue = trxData.reduce((s,d) => s + d.Total, 0);
    const totalHPP = trxData.reduce((s,d) => s + d.HPP, 0);
    const bebanTindakan = trxData
      .filter(d => d.Tipe === 'tindakan_apotek')
      .reduce((s,d) => {
        const id = d.Nomor;
        return s + (trxSnap.docs.find(x => x.data().nomor === id)?.data().hppApotek || 0);
      }, 0);

    // Persediaan & lainnya
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

    let bebanTindakan = 0;
    if (trxSnap.docs.length) {
      bebanTindakan = trxSnap.docs
        .filter(d => d.data().tipe === 'tindakan_apotek')
        .reduce((s,d) => {
          const id = d.data().nomor;
          return s + (trxSnap.docs.find(x => x.data().nomor === id)?.data().hppApotek || 0);
        }, 0);
    }

    const ekuitas = totalRevenue - (totalHPP + bebanTindakan + totalGaji);
    const kas = totalRevenue - (totalHPP + bebanTindakan + totalGaji);
    const alasan = kas < 0 ? 'Defisit' : kas >= 0 ? 'Surplus' : 'Seimbang';

    const bulanLabel = bulanNama[parseInt(document.getElementById('lrBulan').value)];
    const tahunLabel = document.getElementById('lrTindakan').value;

    // Sheet 1: Transaksi Detail
    const ws1 = XLSX.utils.json_to_sheet(trxData);
    ws1['!cols'] = [{wch:18},{wch:22},{wch:15},{wch:22},{wch:22},{wch:15},{wch:15},{wch:15},{wch:15},{wch:15},{wch:15},{wch:15}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Transaksi ' + bulanLabel);

    // Sheet 2: Laba Rugi
    const labaData = [
      { Keterangan: 'Total Pendapatan', Nilai: totalRevenue },
      { Keterangan: 'Total HPP (HPP)', Nilai: -totalHPP },
      { Keterangan: 'Beban Tindakan', Nilai: -bebanTindakan },
      { Keterangan: 'Laba/Rugi', Nilai: labaRugi }
    ];
    const ws2 = XLSX.utils.json_to_sheet(labaData);
    ws2['!cols'] = [{wch:30},{wch:45}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Laba Rugi');

    // Sheet 3: Neraca Estimasi
    const neracaData = [
      { Keterangan:'Aset - Persediaan Obat', Nilai: nilaiPersediaan },
      { Keterangan:'Aset - Kas', Nilai: Math.max(0, kas) },
      { Kewajiban - Hutang Usaha, Nilai: totalHutang },
      { Kewajiban - Piutang Karyawan', Nilai: totalPiutang },
      { Kewajiban - Gaji Karyawan', Nilai: totalGaji },
      { Kewajiban - Beban Tindakan', Nilai: bebanTindakan },
      { Ekuitas, Nilai: ekuitas },
      { LABA RUGI, Nilai: labaRugi }
    ];
    const ws3 = XLSX.utils.json_to_sheet(neracaData);
    ws3['!cols'] = [{wch:30},{wch:45}];
    XLSX.utils.book_append_sheet(wb, ws3, 'Neraca Estimasi');

    // Sheet 4: Header info
    const ws4 = XLSX.utils.json_to_sheet([{ 'Laporan': 'Bulan ' + bulanLabel + ' Tahun ' + tahunLabel }]);
    ws4['!cols'] = [{wch:75}];
    XLSX.utils.book_append_sheet(wb, ws4, 'Ringkasan');

    XLSX.writeFile(wb, `laporan_${bulanLabel}_${tahunLabel}.xlsx`);
    toast('Laporan berhasil diexport', 'success');
  }

  window.Keu.exportLaporan = exportLaporan;

  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
