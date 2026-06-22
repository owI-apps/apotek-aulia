registerModule('laporan', function() {
  var page = document.getElementById('page-laporan');
  var bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  function render() {
    var opts = '';
    for (var i = 0; i < bulanNama.length; i++) opts += '<option value="' + i + '"' + (i === ts().getMonth() ? ' selected' : '') + '>' + bulanNama[i] + '</option>';
    page.innerHTML = '<div class="trx-section"><h4><i class="fas fa-calendar-alt"></i> Pilih Periode</h4><div class="form-grid" style="max-width:400px"><div class="form-group"><label>Bulan</label><select id="lrBulan">' + opts + '</select></div><div class="form-group"><label>Tahun</label><input type="number" id="lrTahun" value="' + ts().getFullYear() + '" min="2020" max="2099"></div><div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-sm" id="lrBtnHitung" style="width:auto;min-width:160px"><i class="fas fa-chart-bar"></i> Buat Laporan</button></div></div></div><div id="lrResult"></div>';
    document.getElementById('lrBtnHitung').addEventListener('click', hitungLaporan);
  }

  async function hitungLaporan() {
    var btn = document.getElementById('lrBtnHitung');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghitung...';

    var bulan = parseInt(document.getElementById('lrBulan').value);
    var tahun = parseInt(document.getElementById('lrTahun').value) || ts().getFullYear();
    var start = new Date(tahun, bulan, 1);
    var end = new Date(tahun, bulan + 1, 1);

    try {
      var trxSnap = await db.collection('transaksi').where('tanggal', '>=', start).where('tanggal', '<', end).get();
      var D = {}, totalHPPAll = 0, bebanTindakan = 0;
      
      trxSnap.docs.forEach(function(doc) {
        var t = doc.data(), key = t.tipe || 'lainnya';
        if (!D[key]) D[key] = { count: 0, total: 0, hpp: 0 };
        D[key].count++; D[key].total += (t.totalAkhir || 0); D[key].hpp += (t.totalHPP || 0);
        totalHPPAll += (t.totalHPP || 0);
        
        if (t.tipe === 'tindakan_apotek' && t.tindakanApotek) {
          var ta = t.tindakanApotek;
          if (ta.gula) bebanTindakan += (C.gulaTotal - C.gulaTindangan);
          if (ta.asam) bebanTindakan += (C.asamTotal - C.asamTindangan);
          if (ta.kolestrol) bebanTindakan += (C.kolestrolTotal - C.kolestrolTindangan);
        }
      });

      var totalRevenue = 0;
      var tKeys = Object.keys(D);
      for (var i = 0; i < tKeys.length; i++) totalRevenue += D[tKeys[i]].total;
      var labaRugi = totalRevenue - totalHPPAll - bebanTindakan;

      // OPTIMASI BESAR: Tidak membaca 'obat' dari Firestore, pakai cache global!
      var obatList = window._obatList || [];
      var nilaiPersediaan = 0;
      for (var i = 0; i < obatList.length; i++) { nilaiPersediaan += (obatList[i].stock || 0) * (obatList[i].hargaBeli || 0); }

      var hutangSnap = await db.collection('hutang_usaha').where('status', '==', 'aktif').get();
      var totalHutang = 0;
      hutangSnap.docs.forEach(function(d) { totalHutang += (d.data().total || 0) - (d.data().sudahBayar || 0); });

      var piutangSnap = await db.collection('piutang_karyawan').where('status', '==', 'aktif').get();
      var totalPiutang = 0;
      piutangSnap.docs.forEach(function(d) { totalPiutang += (d.data().jumlah || 0) - (d.data().sudahBayar || 0); });

      var karSnap = await db.collection('karyawan').get();
      var totalGaji = 0;
      karSnap.docs.forEach(function(d) { totalGaji += d.data().gajiPokok || 0; });

      var kas = totalRevenue - totalHPPAll - bebanTindakan - totalGaji;
      var ekuitas = kas + nilaiPersediaan - totalHutang - totalPiutang;
      var bulanLabel = bulanNama[bulan];

      var el = document.getElementById('lrResult');
      var h = '<h4 style="margin-bottom:20px">Laporan Bulan ' + bulanLabel + ' ' + tahun + '</h4>';
      h += '<div class="stats-grid" style="margin-bottom:24px"><div class="stat-card"><div class="s-label">Total Pendapatan</div><div class="s-value green">Rp ' + fmt(totalRevenue) + '</div></div><div class="stat-card"><div class="s-label">Total HPP</div><div class="s-value red">Rp ' + fmt(totalHPPAll) + '</div></div><div class="stat-card"><div class="s-label">Beban Tindakan</div><div class="s-value red">Rp ' + fmt(bebanTindakan) + '</div></div><div class="stat-card"><div class="s-label">Laba/Rugi</div><div class="s-value ' + (labaRugi >= 0 ? 'green' : 'red') + '">' + (labaRugi >= 0 ? '+' : '') + 'Rp ' + fmt(labaRugi) + '</div></div></div>';

      h += '<div class="section-title"><i class="fas fa-receipt"></i> Per Tipe Transaksi</div><div class="table-wrap"><table><thead><tr><th>Tipe</th><th class="num">Jumlah</th><th class="num">Pendapatan</th><th class="num">HPP</th><th class="num">Laba</th></tr></thead><tbody>';
      for (var i = 0; i < tKeys.length; i++) {
        var key = tKeys[i], d = D[key], laba = d.total - d.hpp;
        h += '<tr><td>' + key.replace(/_/g, ' ') + ' (' + d.count + ')</td><td class="num">' + d.count + '</td><td class="num">Rp ' + fmt(d.total) + '</td><td class="num">Rp ' + fmt(d.hpp) + '</td><td class="num" style="color:' + (laba >= 0 ? 'var(--accent)' : 'var(--danger)') + '">Rp ' + fmt(laba) + '</td></tr>';
      }
      h += '</tbody></table></div>';

      h += '<div class="section-title" style="margin-top:28px"><i class="fas fa-balance-scale"></i> Neraca Estimasi</div><div class="table-wrap"><table><tbody>';
      h += '<tr style="background:rgba(16,185,129,.04)"><td colspan="2" style="font-weight:700">ASET</td><td></td></tr>';
      h += '<tr><td style="padding-left:24px">Persediaan Obat</td><td></td><td class="num" style="color:var(--accent)">Rp ' + fmt(nilaiPersediaan) + '</td></tr>';
      h += '<tr><td style="padding-left:24px">Kas (estimasi)</td><td></td><td class="num" style="color:' + (kas >= 0 ? 'var(--accent)' : 'var(--danger)') + '">Rp ' + fmt(kas) + '</td></tr>';
      h += '<tr style="background:rgba(239,68,68,.04)"><td colspan="2" style="font-weight:700">KEWAJIBAN</td><td></td></tr>';
      h += '<tr><td style="padding-left:24px">Hutang Usaha</td><td></td><td class="num">Rp ' + fmt(totalHutang) + '</td></tr>';
      h += '<tr><td style="padding-left:24px">Piutang Karyawan</td><td></td><td class="num">Rp ' + fmt(totalPiutang) + '</td></tr>';
      h += '<tr><td style="padding-left:24px">Gaji Karyawan</td><td></td><td class="num">Rp ' + fmt(totalGaji) + '</td></tr>';
      h += '<tr><td style="padding-left:24px">Beban Tindakan</td><td></td><td class="num">Rp ' + fmt(bebanTindakan) + '</td></tr>';
      h += '<tr style="background:rgba(59,130,246,.04)"><td colspan="2" style="font-weight:700">EKUITAS (estimasi)</td><td class="num" style="font-size:16px;font-weight:800;color:var(--accent)">Rp ' + fmt(ekuitas) + '</td></tr>';
      h += '<tr><td style="padding-left:24px">Laba/Rugi Bulan Ini</td><td></td><td class="num" style="font-weight:700;color:' + (labaRugi >= 0 ? 'var(--accent)' : 'var(--danger)') + '">Rp ' + fmt(labaRugi) + '</td></tr>';
      h += '</tbody></table></div>';
      h += '<div style="display:flex;gap:10px;margin-top:24px"><button class="btn btn-primary btn-sm" onclick="Lap.exportExcel()" style="width:auto"><i class="fas fa-file-excel"></i> Export Excel</button></div>';
      el.innerHTML = h;
      
    } catch (e) {
      console.error('Laporan error:', e);
      document.getElementById('lrResult').innerHTML = '<div class="import-result" style="background:var(--danger-dim);color:var(--danger);border:1px solid rgba(239,68,68,.2)"><i class="fas fa-exclamation-circle"></i> Gagal: ' + e.message + '</div>';
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-chart-bar"></i> Buat Laporan';
    }
  }

  function exportExcel() {
    var bulan = parseInt(document.getElementById('lrBulan').value);
    var tahun = parseInt(document.getElementById('lrTahun').value) || ts().getFullYear();
    var start = new Date(tahun, bulan, 1);
    var end = new Date(tahun, bulan + 1, 1);
    var bulanLabel = bulanNama[bulan];

    db.collection('transaksi').where('tanggal', '>=', start).where('tanggal', '<', end).get().then(function(snap) {
      var trxData = [], totalRevenue = 0, totalHPP = 0, bebanTindakan = 0;
      snap.docs.forEach(function(d) {
        var t = d.data();
        trxData.push({ 'Nomor': t.nomor, 'Tipe': (t.tipe || '').replace(/_/g, ' '), 'Pasien': t.pasienNama || '-', 'Total': t.totalAkhir || 0, 'HPP': t.totalHPP || 0, 'Tanggal': t.tanggal ? fmtDate(t.tanggal) : '-' });
        totalRevenue += (t.totalAkhir || 0); totalHPP += (t.totalHPP || 0);
        if (t.tipe === 'tindakan_apotek' && t.tindakanApotek) {
          var ta = t.tindakanApotek;
          if (ta.gula) bebanTindakan += (C.gulaTotal - C.gulaTindangan);
          if (ta.asam) bebanTindakan += (C.asamTotal - C.asamTindangan);
          if (ta.kolestrol) bebanTindakan += (C.kolestrolTotal - C.kolestrolTindangan);
        }
      });

      var obatList = window._obatList || [];
      var nilaiPersediaan = 0;
      for (var i = 0; i < obatList.length; i++) { nilaiPersediaan += (obatList[i].stock || 0) * (obatList[i].hargaBeli || 0); }

      var labaRugi = totalRevenue - totalHPP - bebanTindakan;

      var wb = XLSX.utils.book_new();
      var ws1 = XLSX.utils.json_to_sheet(trxData);
      ws1['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Transaksi');

      var ws2 = XLSX.utils.json_to_sheet([
        { 'Keterangan': 'Total Pendapatan', 'Nilai': totalRevenue },
        { 'Keterangan': 'Total HPP', 'Nilai': -totalHPP },
        { 'Keterangan': 'Beban Tindakan', 'Nilai': -bebanTindakan },
        { 'Keterangan': 'Laba/Rugi', 'Nilai': labaRugi }
      ]);
      ws2['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Laba Rugi');

      var ws3 = XLSX.utils.json_to_sheet([
        { 'Keterangan': 'Aset - Persediaan Obat', 'Nilai': nilaiPersediaan },
        { 'Keterangan': 'Aset - Kas', 'Nilai': totalRevenue - totalHPP - bebanTindakan - (function(){ try { var g=0; karSnap.docs.forEach(function(d){g+=d.data().gajiPokok||0;}); return g; }catch(e){return 0;} })() },
        { 'Keterangan': 'Kewajiban - Hutang Usaha', 'Nilai': -(function(){ try { var h=0; hutangSnap.docs.forEach(function(d){h+=(d.data().total||0)-(d.data().sudahBayar||0);}); return h; }catch(e){return 0;} })() },
        { 'Kewajiban - Piutang Karyawan', 'Nilai': -(function(){ try { var p=0; piutangSnap.docs.forEach(function(d){p+=(d.data().jumlah||0)-(d.data().sudahBayar||0);}); return p; }catch(e){return 0;} })() },
        'Kewajiban - Beban Tindakan', 'Nilai': -bebanTindangan },
        { 'Keterangan': 'Ekuitas (estimasi)', 'Nilai': nilaiPersediaan + (totalRevenue - totalHPP - bebanTindakan) - (function(){ try { var h=0; hutangSnap.docs.forEach(function(d){h+=(d.data().total||0)-(d.data().sudahBayar||0);}); var p=0; piutangSnap.docs.forEach(function(d){p+=(d.data().jumlah||0)-(d.data().sudahBayar||0);} var g=0; karSnap.docs.forEach(function(d){g+=d.data().gajiPokok||0;}); return h+p+g; }catch(e){return 0;} })() },
        { 'Keterangan': 'Laba/Rugi', 'Nilai': labaRugi }
      ]);
      ws3['!cols'] = [{ wch: 35 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Neraca');

      XLSX.writeFile(wb, 'laporan_' + bulanLabel + '_' + tahun + '.xlsx');
      toast('Export berhasil', 'success');
    }).catch(function(e) { toast('Export gagal: ' + e.message, 'error'); });
  }

  window.Lap = { exportExcel: exportExcel };
  var obs = new MutationObserver(function() { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
});
