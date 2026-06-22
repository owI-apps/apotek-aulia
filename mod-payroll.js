registerModule('payroll', function() {
  var page = document.getElementById('page-payroll');
  var bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var payrollRows = [];

  function render() {
    var opts = '';
    for (var i = 0; i < bulanNama.length; i++) opts += '<option value="' + i + '"' + (i === ts().getMonth() ? ' selected' : '') + '>' + bulanNama[i] + '</option>';
    page.innerHTML = '<div class="trx-section"><h4><i class="fas fa-calendar-alt"></i> Pilih Periode</h4><div class="form-grid" style="max-width:300px"><div class="form-group"><label>Bulan</label><select id="prBulan">' + opts + '</select></div><div class="form-group"><label>Tahun</label><input type="number" id="prTahun" value="' + ts().getFullYear() + '" min="2024" max="2099"></div><div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-sm" id="prBtnHitung" style="width:auto;min-width:160px"><i class="fas fa-calculator"></i> Hitung Payroll</button></div></div></div><div id="prResult"></div>';
    document.getElementById('prBtnHitung').addEventListener('click', hitungPayroll);
  }

  function hitungPayroll() {
    var bulan = parseInt(document.getElementById('prBulan').value);
    var tahun = parseInt(document.getElementById('prTahun').value) || ts().getFullYear();
    var start = new Date(tahun, bulan, 1);
    var end = new Date(tahun, bulan + 1, 1);
    var btn = document.getElementById('prBtnHitung');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghitung...';

    db.collection('transaksi').where('tanggal', '>=', start).where('tanggal', '<', end).get().then(function(snap) {
      var D = {jmlRK:0,jmlRL:0,jmlOB:0,jmlTA:0, bhTotal:0,jdTotal:0,bagianKlinikTotal:0,tuslahTotal:0,kasResepTotal:0,dokterLuarTotal:0,labaLuarTotal:0,racikItems:0,pembulatan:0,rawatKlinik:0,totalObat:0,totalHPP:0,gulaCount:0,asamCount:0,kolestrolCount:0,tindApotekFee:0,hppApotek:0};

      snap.docs.forEach(function(doc) {
        var t = doc.data(), tipe = t.tipe;
        if (tipe === 'resep_klinik') {
          D.jmlRK++; D.bhTotal+=C.bhDokter; D.jdTotal+=C.jdDokter; D.bagianKlinikTotal+=C.bagianKlinikResep; D.tuslahTotal+=C.tuslah; D.kasResepTotal+=C.kasResep;
          D.rawatKlinik+=(t.rawatJalanTotal||0); D.totalObat+=(t.totalObat||0); D.totalHPP+=(t.totalHPP||0);
          var items = t.items || []; for (var i=0;i<items.length;i++) { if(items[i].racik) D.racikItems+=C.racikPerItem; }
          D.pembulatan+=(t.pembulatan||0);
        } else if (tipe === 'resep_luar') {
          D.jmlRL++; D.dokterLuarTotal+=C.dokterLuar; D.labaLuarTotal+=C.labaLuar;
          D.totalObat+=(t.totalObat||0); D.totalHPP+=(t.totalHPP||0);
          var items = t.items || []; for (var i=0;i<items.length;i++) { if(items[i].racik) D.racikItems+=C.racikPerItem; }
          D.pembulatan+=(t.pembulatan||0);
        } else if (tipe === 'obat_bebas') {
          D.jmlOB++; D.totalObat+=(t.totalObat||0); D.totalHPP+=(t.totalHPP||0); D.pembulatan+=(t.pembulatan||0);
        } else if (tipe === 'tindakan_apotek') {
          D.jmlTA++;
          var ta = t.tindakanApotek || {};
          if (ta.gula) { D.gulaCount++; D.tindApotekFee+=C.gulaTindakan; D.hppApotek+=(C.gulaTotal-C.gulaTindangan); }
          if (ta.asam) { D.asamCount++; D.tindApotekFee+=C.asamTindangan; D.hppApotek+=(C.asamTotal-C.asamTindangan); }
          if (ta.kolestrol) { D.kolestrolCount++; D.tindApotekFee+=C.kolestrolTindangan; D.hppApotek+=(C.kolestrolTotal-C.kolestrolTindangan); }
          D.pembulatan+=(t.pembulatan||0);
        }
      });

      var marginTotal = D.totalObat - D.totalHPP;
      var omzet = (C.persenOmzet / 100) * marginTotal;
      var totalDA = D.tuslahTotal + D.racikItems + D.pembulatan + D.tindApotekFee + omzet + D.rawatKlinik;

      return db.collection('karyawan').where('divisi','==','apotek').get();
    }).then(function(karSnap) {
      var karyawanApotek = [];
      karSnap.docs.forEach(function(d) { var o = {id:d.id}; var data = d.data(); var keys = Object.keys(data); for (var i=0;i<keys.length;i++) o[keys[i]]=data[keys[i]]; karyawanApotek.push(o); });
      var jmlKar = Math.max(karyawanApotek.length, 1);

      payrollRows = [];
      for (var i = 0; i < karyawanApotek.length; i++) {
        var k = karyawanApotek[i];
        var pTuslah = totalDA * ((k.persenTuslah||0) / 100);
        var pTindakan = D.tindApotekFee * ((k.persenTindakan||0) / 100);
        var pMakan = D.pembulatan * ((k.persenTuslah||0) / 100);
        var pOmzet = omzet / jmlKar;
        var pTransport = C.transportTotal / jmlKar;
        var gajiTotal = (k.gajiPokok||0) + pTuslah + pTindakan + pMakan + pOmzet + pTransport;
        payrollRows.push({nama:k.nama,jabatan:k.jabatan,gajiPokok:k.gajiPokok||0,pTuslah:pTuslah,pTindakan:pTindakan,makan:pMakan,omzet:pOmzet,transport:pTransport,total:gajiTotal,thrApotek:totalDA*0.20/jmlKar});
      }

      var totalGaji = 0; for (var i=0;i<payrollRows.length;i++) totalGaji+=payrollRows[i].total;
      var thrApotekTotal = totalDA * 0.20;
      var thrKlinik = D.bagianKlinikTotal * 0.10;
      var bulanLabel = bulanNama[bulan];

      var el = document.getElementById('prResult');
      var h = '<div class="stats-grid" style="margin-bottom:24px"><div class="stat-card"><div class="s-label">Resep Klinik</div><div class="s-value purple">' + D.jmlRK + ' resep</div></div><div class="stat-card"><div class="s-label">Resep Luar</div><div class="s-value blue">' + D.jmlRL + ' resep</div></div><div class="stat-card"><div class="s-label">Obat Bebas</div><div class="s-value yellow">' + D.jmlOB + ' trx</div></div><div class="stat-card"><div class="s-label">Tindakan Apotek</div><div class="s-value green">' + D.jmlTA + ' tindakan</div></div></div>';

      h += '<div class="section-title"><i class="fas fa-list-alt"></i> Rincian Komponen</div><div class="table-wrap"><table><thead><tr><th>Komponen</th><th class="num">Jumlah</th><th>Keterangan</th></tr></thead><tbody>';
      h += '<tr style="background:rgba(168,85,247,.04)"><td colspan="3" style="font-weight:700;color:var(--purple)">RESEP KLINIK (' + D.jmlRK + ')</td></tr>';
      h += '<tr><td>BH Dokter</td><td class="num">Rp ' + fmt(D.bhTotal) + '</td><td>' + D.jmlRK + ' x Rp ' + fmt(C.bhDokter) + '</td></tr>';
      h += '<tr><td>JD Dokter</td><td class="num">Rp ' + fmt(D.jdTotal) + '</td><td>' + D.jmlRK + ' x Rp ' + fmt(C.jdDokter) + '</td></tr>';
      h += '<tr><td>Bagian Klinik</td><td class="num">Rp ' + fmt(D.bagianKlinikTotal) + '</td><td>' + D.jmlRK + ' x Rp ' + fmt(C.bagianKlinikResep) + '</td></tr>';
      h += '<tr><td>Tuslah → D.a</td><td class="num">Rp ' + fmt(D.tuslahTotal) + '</td><td>' + D.jmlRK + ' x Rp ' + fmt(C.tuslah) + '</td></tr>';
      h += '<tr><td>Kas/Laba Resep</td><td class="num">Rp ' + fmt(D.kasResepTotal) + '</td><td>' + D.jmlRK + ' x Rp ' + fmt(C.kasResep) + '</td></tr>';
      h += '<tr><td>Rawat Klinik</td><td class="num">Rp ' + fmt(D.rawatKlinik) + '</td><td>Ditagih ke apotek</td></tr>';
      h += '<tr><td>Racik → D.a</td><td class="num">Rp ' + fmt(D.racikItems) + '</td><td>Item racik x Rp ' + fmt(C.racikPerItem) + '</td></tr>';
      h += '<tr><td>Pembulatan → D.a</td><td class="num">Rp ' + fmt(D.pembulatan) + '</td><td>Akumulasi</td></tr>';
      h += '<tr style="background:rgba(59,130,246,.04)"><td colspan="3" style="font-weight:700;color:var(--info)">RESEP LUAR (' + D.jmlRL + ')</td></tr>';
      h += '<tr><td>Dokter Luar</td><td class="num">Rp ' + fmt(D.dokterLuarTotal) + '</td><td>' + D.jmlRL + ' x Rp ' + fmt(C.dokterLuar) + '</td></tr>';
      h += '<tr><td>Laba Apotek</td><td class="num">Rp ' + fmt(D.labaLuarTotal) + '</td><td>' + D.jmlRL + ' x Rp ' + fmt(C.labaLuar) + '</td></tr>';
      h += '<tr style="background:rgba(245,158,11,.04)"><td colspan="3" style="font-weight:700;color:var(--warning)">OBAT BEBAS (' + D.jmlOB + ')</td></tr>';
      h += '<tr><td>Total Penjualan</td><td class="num">Rp ' + fmt(D.totalObat) + '</td><td>Harga jual</td></tr>';
      h += '<tr><td>Total HPP</td><td class="num">Rp ' + fmt(D.totalHPP) + '</td><td>HPP</td></tr>';
      h += '<tr><td>Margin</td><td class="num" style="color:var(--warning)">Rp ' + fmt(marginTotal) + '</td><td>Penjualan - HPP</td></tr>';
      h += '<tr><td>Omzet (' + C.persenOmzet + '%)</td><td class="num" style="color:var(--warning)">Rp ' + fmt(omzet) + '</td><td>Dibagi ' + jmlKar + ' karyawan</td></tr>';
      h += '<tr style="background:rgba(16,185,129,.04)"><td colspan="3" style="font-weight:700;color:var(--accent)">TINDAKAN APOTEK (' + D.jmlTA + ')</td></tr>';
      h += '<tr><td>Cek Gula (' + D.gulaCount + 'x)</td><td class="num">Rp ' + fmt(D.gulaCount * C.gulaTindangan) + '</td><td>Fee @Rp ' + fmt(C.gulaTindangan) + '</td></tr>';
      h += '<tr><td>Cek Asam (' + D.asamCount + 'x)</td><td class="num">Rp ' + fmt(D.asamCount * C.asamTindangan) + '</td><td>Fee @Rp ' + fmt(C.asamTindangan) + '</td></tr>';
      h += '<tr><td>Cek Kolestrol (' + D.kolestrolCount + 'x)</td><td class="num">Rp ' + fmt(D.kolestrolCount * C.kolestrolTindangan) + '</td><td>Fee @Rp ' + fmt(C.kolestrolTindangan) + '</td></tr>';
      h += '<tr><td>HPP Tindakan</td><td class="num">Rp ' + fmt(D.hppApotek) + '</td><td>Alat stick + jarum</td></tr>';
      h += '<tr style="background:rgba(16,185,129,.08)"><td colspan="2" style="font-weight:800;color:var(--accent)">TOTAL SKEMA D.a</td><td class="num" style="font-size:15px;font-weight:800;color:var(--accent)">Rp ' + fmt(totalDA) + '</td></tr>';
      h += '</tbody></table></div>';

      h += '<div style="margin-top:24px"><div class="section-title"><i class="fas fa-users"></i> Payroll Karyawan Apotek (' + karyawanApotek.length + ')</div><div class="table-wrap"><div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nama</th><th>Jabatan</th><th class="num">Gaji Pokok</th><th class="num">Tuslah</th><th class="num">Tindakan</th><th class="num">Makan</th><th class="num">Omzet</th><th class="num">Transport</th><th class="num">TOTAL</th></tr></thead><tbody>';
      for (var i = 0; i < payrollRows.length; i++) {
        var k = payrollRows[i];
        h += '<tr><td>' + (i+1) + '</td><td style="font-weight:500">' + k.nama + '</td><td>' + (k.jabatan||'-') + '</td><td class="num">Rp ' + fmt(k.gajiPokok) + '</td><td class="num">Rp ' + fmt(k.pTuslah) + '</td><td class="num">Rp ' + fmt(k.pTindakan) + '</td><td class="num">Rp ' + fmt(k.makan) + '</td><td class="num">Rp ' + fmt(k.omzet) + '</td><td class="num">Rp ' + fmt(k.transport) + '</td><td class="num" style="font-size:15px;font-weight:800;color:var(--accent)">Rp ' + fmt(k.total) + '</td></tr>';
      }
      h += '<tr style="background:rgba(16,185,129,.06)"><td colspan="9" style="font-weight:800;text-align:right">TOTAL PAYROLL</td><td class="num" style="font-size:18px;font-weight:800;color:var(--accent)">Rp ' + fmt(totalGaji) + '</td></tr>';
      h += '</tbody></table></div></div>';

      h += '<div class="stats-grid" style="margin-top:24px"><div class="stat-card"><div class="s-label">Total Gaji</div><div class="s-value green">Rp ' + fmt(totalGaji) + '</div></div><div class="stat-card"><div class="s-label">THR Apotek (20%)</div><div class="s-value purple">Rp ' + fmt(thrApotekTotal) + '</div></div><div class="stat-card"><div class="s-label">THR Klinik (10%)</div><div class="s-value yellow">Rp ' + fmt(thrKlinik) + '</div></div><div class="stat-card"><div class="s-label">Transport</div><div class="s-value blue">Rp ' + fmt(C.transportTotal) + '</div></div></div>';
      h += '<div style="display:flex;gap:10px;margin-top:20px"><button class="btn btn-outline btn-sm" onclick="Payroll.exportExcel()" style="width:auto"><i class="fas fa-file-excel"></i> Export Excel</button></div>';
      el.innerHTML = h;
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-calculator"></i> Hitung Payroll';
    }).catch(function(e) {
      console.error('Payroll error:', e);
      document.getElementById('prResult').innerHTML = '<div class="import-result" style="background:var(--danger-dim);color:var(--danger);border:1px solid rgba(239,68,68,.2)"><i class="fas fa-exclamation-circle"></i> Gagal: ' + e.message + '</div>';
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-calculator"></i> Hitung Payroll';
    });
  }

  function exportExcel() {
    if (!payrollRows.length) { toast('Hitung dulu','warning'); return; }
    var bulanLabel = bulanNama[parseInt(document.getElementById('prBulan').value)];
    var tahun = document.getElementById('prTahun').value;
    var data = [];
    for (var i = 0; i < payrollRows.length; i++) {
      var k = payrollRows[i];
      data.push({'No':i+1,'Nama':k.nama,'Jabatan':k.jabatan,'Gaji Pokok':k.gajiPokok,'Tuslah':k.pTuslah,'Tindakan':k.pTindakan,'Makan':k.makan,'Omzet':k.omzet,'Transport':k.transport,'THR Apotek':k.thrApotek,'TOTAL':k.total});
    }
    var ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:6},{wch:20},{wch:18},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:18}];
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, 'payroll_' + bulanLabel + '_' + tahun + '.xlsx');
    toast('Export berhasil','success');
  }

  window.Payroll = { exportExcel: exportExcel };
  var obs = new MutationObserver(function(){if(page.classList.contains('active'))render();});
  obs.observe(page, {attributes:true, attributeFilter:['class']});
});
