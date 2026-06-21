registerModule('payroll', function() {
  const page = document.getElementById('page-payroll');
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','agustus','September','Oktober','November','Desember'];
  const tahunSekarang = ts().getFullYear();

  function render() {
    page.innerHTML = `
      <div class="trx-section"><h4><i class="fas fa-calendar-alt"></i> Pilih Periode</h4>
        <div class="form-grid" style="max-width:300px">
          <div class="form-group"><label>Bulan</label><select id="prBulan">${bulanNama.map((b,i)=>`<option value="${i}" ${i===ts().getMonth()?'selected':''}>${b}</option>`).join('')}</select></div>
          <div class="form-group"><label>Tahun</label><input type="number" id="prTahun" value="${tahunSekar}" min="2024" max="2099"></div>
          <div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-sm" id="prBtnHitung" style="width:auto;min-width:160px"><i class="fas fa-calculator"></i> Hitung Payroll</button></div>
        </div>
      </div>
      <div id="prResult"></div>`;

    document.getElementById('prBulan').value = ts().getMonth();
    document.getElementById('prTahun').value = tahunSekar;
    document.getElementById('prBtnHitung').addEventListener('click', hitungPayroll);
  }

  async function hitungPayroll() {
    const bulan = parseInt(document.getElementById('prBulan').value);
    const tahun = parseInt(document.getElementById('prTahun').value) || ts().getFullYear();
    const start = new Date(tahun, bulan, 1);
    const end = new Date(tahun, bulan + 1, 1);

    const btn = document.getElementById('prBtnHitung');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghitung...';

    try {
      // 1. Load semua transaksi bulan ini
      const trxSnap = await db.collection('transaksi')
        .where('tanggal', '>=', start)
        .where('tanggal', '<', end)
        .get();

      // 2. Kelompokkan per tipe dan hitung masing2 komponen
      let D = { jmlResepKlinik:0, bhTotal:0, jdTotal:0, bagianKlinikTotal:0, tuslahTotal:0, kasResepTotal:0, dokterLuarTotal:0, labaLuarTotal:0, racikItems:0, pembulatan:0, rawatKlinik:0,
            jmlResepLuar:0, jmlObatBebas:0, jmlTindKlinik:0, jmlTindApotek:0,
            totalObat:0, totalHPP:0, cek1Total:0, cek2Total:0, gulaFee:0, asamFee:0, kolestrolFee:0, tindApotekFee:0, hppApotek:0 };

      trxSnap.docs.forEach(doc => {
        const t = doc.data();
        if (!D[`jml${t.tipe.replace('tindakan_','')}`] return;
        D[`jml${t.tipe.replace('tindakan_','')}`]++;

        if (tipe(t) === 'resep_klinik') {
          D.bhTotal = D.jmlResepKlinik * C.bhDokter;
          D.jdTotal = D.jmlResepKlinik * C.jdDokter;
          D.bagianKlinikTotal = D.jmlResepKlinik * C.bagianKlinikResep;
          D.tuslahTotal = D.jmlResepKlinik * C.tuslah;
          D.kasResepTotal = D.jmlResepKlinik * C.kasResep;
          (t.items || []).forEach(i => { if (i.racik) D.racikItems += C.racikPerItem; });
          D.pembulatan += t.pembulatan || 0;
          D.rawatKlinik += t.rawatJalanTotal || 0;
        } else if (tipe(t) === 'resep_luar') {
          D.dokterLuarTotal = D.jmlResepLuar * C.dokterLuar;
          D.labaLuarTotal = D.jmlResepLuar * C.labaLuar;
          (t.items || []).forEach(i => { if (i.racik) D.racikItems += C.racikPerItem; });
          D.pembulatan += t.pembulatan || 0;
        } else if (tipe(t) === 'obat_bebas') {
          D.totalObat += t.totalObat || 0;
          D.totalHPP += t.totalHPP || 0;
          D.pembulatan += t.pembulatan || 0;
        } else if (tipe(t) === 'tindakan_klinik') {
          if (t.tindakan?.cek1) D.cek1Total += C.cek1;
          if (t.tindakan?.cek2) D.cek2Total += C.cek2;
          // Konsultasi = gratis, tidak ada pembagian
        } else if (tipe(t) === 'tindakan_apotek') {
          if (t.tindakan?.gula) { D.gulaFee = (D.gulaFee || 0) + (t.tindakan?.gula ? 1 : 0);
          if (t.tindakan?.asam) { D.asamFee = (D.asamFee || 0) + (t.tindakan?.asam ? 1 : 0); }
          if (t.tindakan?.kolestrol) { D.kolestrolFee = (D.kolestrolFee || 0) + (t.tindakan?.kolestrol ? 1 : 0); }
          D.tindApotekFee = D.gulaFee + D.asamFee + D.kolestrolFee;
          D.hppApotek += (t.tindakan?.gula ? (C.gulaTotal - C.gulaTindakan) : 0)
            + (t.tindakan?.asam ? (C.asamTotal - C.asamTindangan) : 0)
            + (tindakan?.kolestrol ? (C.kolestrolTotal - C.kolestrolTindangan) : 0);
          D.pembulatan += t.pembulatan || 0;
        }
      });

      // Margin dari SEMUA transaksi (resep klinik 35% + resep luar 35% + obat bebas = jual - HPP)
      const marginTotal = D.totalObat - D.totalHPP;

      // Omzet = 2.5% dari margin SEMUA
      const omzet = (C.persenOmzet / 100) * marginTotal;

      // Total skema D.a (yang dibagi ke karyawan apotek)
      const totalDA = D.tuslahTotal + D.racikItems + D.pembulatan + D.tindApotekFee + omzet + D.rawatKlinik;

      // 3. Load karyawan apotek
      const karSnap = await db.collection('karyawan').where('divisi','==','apotek').get();
      const karyawanApotek = karSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 4. Hitung per karyawan
      const payrollRows = karyawanApotek.map(k => {
        const pTuslah = totalDA * (k.persenTuslah / 100);
        const pTindakan = D.tindApotekFee * (k.persenTindakan / 100);
        const pMakan = D.pembulatan * (k.persenMakan / 100);
        const pOmzet = omzet; // omzet sudah global, bukan per-karyawan
        const pTransport = C.transportTotal / Math.max(karyawanApotek.length, 1);
        const gajiTotal = (k.gajiPokok || 0) + pTuslah + pTindakan + pMakan + pOmzet + pTransport;
        const thrApotek = totalDA * 0.20; // 25% dari totalDA
        return { ...k, pTuslah, pTindakan, makan: pMakan, omzet: pOmzet, transport: pTransport, gajiPokok: k.gajiPokok || 0, total: gajiTotal, thrApotek };
      });

      // 5. Hitung THR
      const thrKlinik = (D.bagianKlinikTotal + D.cek1Total + D.cek2Total) * 0.10;

      // 6. Render
      const jmlK = D.jmlResepKlinik;
      const jmlL = D.jmlResepLuar;
      const jmlB = D.jmlObatBebas;
      const jmlTK = D.jmlTindakanApotek;

      const el = document.getElementById('prResult');
      el.innerHTML = `
        <div class="stats-grid" style="margin-bottom:24px">
          <div class="stat-card"><div class="s-label">Resep Klinik (${jmlK})</div><div class="s-value purple">${jmlK} resep</div></div>
          <div class="stat-card"><div class="s-label">Resep Luar (${jmlL})</div><div class="s-value blue">${jmlL} resep</div></div>
          <div class="stat-card"><div class="s-label">Obat Bebas (${jmlB})</div><div class="s-value yellow">${jmlB} transaksi</div></div>
          <div class="stat-card"><div class="s-label">Tindakan Apotek (${jmlTK})</div><div class="s-value green">${jmlTK} tindakan</div></div>
        </div>

        <div class="table-wrap"><table>
          <thead><tr><th>Komponen</th><th class="num">Jumlah</th><th>Keterangan</th></tr></thead>
          <tbody>
            <tr><td>BH Dokter</td><td class="num">Rp ${fmt(D.bhTotal)}</td><td>${jmlK} resep × Rp ${fmt(C.bhDokter)}/resep</td></tr>
            <tr><td>JD Dokter</td><td class="num">Rp ${fmt(D.jdTotal)}</td><td>${jmlK} resep × Rp ${fmt(C.jdDokter)}/resep</td></tr>
            <tr><td>Bagian Klinik</td><td class="num">Rp ${fmt(D.bagianKlinikTotal)}</td>Perawat 50% / Daftar 40% / THR Klinik 10%</td></tr>
            <tr><td>Tuslah</td><td class="num">Rp ${fmt(D.tuslahTotal)}</td>${jmlK} resep × Rp ${fmt(C.tuslah)}/resep → Skema D.a</td></tr>
            <tr><td>Kas/Laba Resep</td><td class="num">Rp ${fmt(D.kasResepTotal)}</td>${jmlK} resep × Rp ${fmt(C.kasResep)}</td></tr>
            <tr style="background:rgba(168,85,247,.04)"><td>Rawat Klinik</td><td class="num">Rp ${fmt(D.rawatKlinik)}</td>Biaya rawat jalan yang ditagih ke apotek</td></tr>
            <tr><td colspan="3" style="background:rgba(59,130,246,.04);font-weight:700;color:var(--info)">RESEP LUAR (${jmlL} resep)</td></tr>
            <tr><td>Dokter Luar</td><td class="num">Rp ${fmt(D.dokterLuarTotal)}</td>${jmlL} resep × Rp ${fmt(C.dokterLuar)}</td></tr>
            <tr><td>Laba Apotek</td><td class="num">Rp ${fmt(D.labaLuarTotal)}</td>${jmlL} resep × Rp ${fmt(C.labaLuar)}</td></tr>
            <tr><td>Racik (skema D.a)</td><td class="num">Rp ${fmt(D.racikItems)}</td>Setiap item racik × Rp ${fmt(C.racikPerItem)}</td></tr>
            <tr><td>Pembulatan (skema D.a)</td><td class="num">Rp ${fmt(D.pembulatan)}</td>Akumulasi semua pembulatan bulan ini</td></tr>
            <tr style="background:rgba(16,185,129,.04);font-weight:700;color:var(--divisi)">OBAT BEBAS (${jmlB} transaksi)</tr></tr>
            <tr><td>Total Penjualan Obat</td><td class="num">Rp ${fmt(D.totalObat)}</td>Harga jual dari input apotek (bukan margin)</td></tr>
            <tr><td>Total HPP</td><td class="num">Rp ${fmt(D.totalHPP)}</td>HPP dari semua transaksi</td></tr>
            <tr style="background:rgba(245,158,11,.04);font-weight:700;color:var(--warning)"><td colspan="2">MARGIN = Penjualan - HPP</td><td class="num" style="color:var(--warning)">Rp ${fmt(marginTotal)}</td></tr>
            <tr><td colspan="2">Omzet (2.5% dari margin)</td><td class="num" style="color:var(--warning)">Rp ${fmt(omzet)}</td></tr>
            <tr style="background:rgba(168,85,247,.04);font-weight:700;color:var(--divisi)">TINDAKAN APOTEK (${jmlTK} tindakan)</tr></tr>
            <tr><td>Cek Gula Darah (tindakan @ Rp 2.000)</td><td class="num">${D.gulaFee > 0 ? 'Rp ' + fmt(D.gulaFee) : '-'}</td>${(D.gulaFee > 0 ? D.tindakanApotek.filter?.length || 0 : 'Tidak ada'} yang cek gula darah</td></tr>
            <td>Cek Asam Urat (tindakan @ Rp 2.000)</td><td class="num">${D.asamFee > 0 ? 'Rp ' + fmt(D.asamFee) : '-'}</td>${D.asamFee > 0 ? D.tindakanApotek.filter?.length || 0 : 'Tidak ada'} yang cek asam urat</td></tr>
            <td>Cek Kolestrol (tindakan @ Rp 2.000)</td><td class="num">${D.kolestrolFee > 0 ? 'Rp ' + fmt(D.kolestrolFee) : '-'}</td>${D.kolestrolFee > 0 ? D.tindakanApotek.filter?.length || 0 : 'Tidak ada'} yang cek kolestrol</td></tr>
            <tr><td>HPP Tindakan (alat stick + jarum)</td><td class="num">Rp ${fmt(D.hppApotek)}</td>Biaya alat dari tindakan</td></tr>
            <td>Pembulatan (skema D.a)</td><td class="num">Rp ${fmt(D.pembulatan)}</td>Akumulasi pembulatan bulan ini</td></tr>
            <tr style="background:rgba(16,185,129,.04);font-weight:700;color:var(--accent)"><td colspan="2">TOTAL SKEMA D.a</td><td class="num" style="color:var(--accent)">Rp ${fmt(totalDA)}</td></tr>
          </tbody>
        </table></div>

        <div style="margin-top:24px">
          <div class="section-title"><i class="fas fa-users"></i> Rincian Payroll Karyawan Apotek (${karyawanApotek.length} orang)</div>
          <div class="table-wrap"><div style="overflow-x:auto"><table>
            <thead><tr><th>No</th><th>Nama</th><th>Jabatan</th><th class="num">Gaji Pokok</th><th class="num">Tuslah (D.a)</th><th class="num">Tindakan (D.a)</th><th class="num">Makan (D.a)</th><th class="num">Omzet (2.5%)</th><th class="num">Transport</th><th class="num">TOTAL</th></tr></thead>
            <tbody>${payrollRows.map((k, i) => `<tr>
              <td>${i + 1}</td>
              <td style="font-weight:500">${k.nama}</td>
              <td>${k.jabatan || '-'}</td>
              <td class="num">Rp ${fmt(k.gajiPokok || 0)}</td>
              <td class="num">Rp ${fmt(k.pTuslah)}</td>
              <td class="num">Rp ${fmt(k.pTindakan)}</td>
              <td class="num">Rp ${fmt(k.makan)}</td>
              <td class="num">Rp ${fmt(k.omzet)}</td>
              <td class="num">Rp ${fmt(k.transport)}</td>
              <td class="num" style="font-size:15px;font-weight:800;color:var(--accent)">Rp ${fmt(k.total)}</td>
            </tr>`).join('')}
            <tr style="background:rgba(16,185,129,.06)"><td colspan="2">TOTAL PAYROLL BULAN INI</td><td colspan="6"></td><td class="num" style="font-size:18px;font-weight:800;color:var(--accent)">Rp ${fmt(payrollRows.reduce((s,k)=>s+k.total,0)}</td></tr>
          </tbody></table></div>
        </div>

        <div class="stats-grid" style="margin-top:24px">
          <div class="stat-card"><div class="s-label">Total Gaji Bulan Ini</div><div class="s-value green">Rp ${fmt(payrollRows.reduce((s,k)=>s+k.total,0)}</div></div>
          <div class="stat-card"><div class="s-label">THR Apotek (20% dari D.a)</div><div class="s-value purple">Rp ${fmt(totalDA * 0.20)}</div></div>
          <div class="stat-card"><div class="s-label">THR Klinik (10% dari bagian klinik)</div><div class="s-value yellow">Rp ${fmt(thrKlinik)}</div></div>
          <div class="stat-card"><div class="s-label">Transport Total</div><div class="s-value blue">Rp ${fmt(C.transportTotal)}</div></div>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-outline btn-sm" onclick="Keu.exportPayroll()" style="width:auto"><i class="fas fa-file-excel"></i> Export ke Excel</button>
        </div>
      </div>`;

      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-calculator"></i> Hitung Payroll';
    } catch(e) {
      console.error('Payroll error:', e);
      document.getElementById('prResult').innerHTML = `<div class="import-result error"><i class="fas fa-exclamation-circle"></i> Gagal menghitung: ${e.message}</div>`;
    }
  }

  function tipe(t) { return t.replace('tindakan_', ''); }

  async function exportPayroll() {
    if (!payrollRows.length) { toast('Hitung dulu sebelum export', 'warning'); return; }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Rekap Payroll
    const rekapData = payrollRows.map((k, i) => ({
      'No': i + 1,
      'Nama': k.nama,
      'Jabatan': k.jabatan,
      'Gaji Pokok': k.gajiPokok || 0,
      'Tuslah (D.a)': k.pTuslah,
      'Tindakan (D.a)': k.pTindakan,
      'Makan (D.a)': k.makan,
      'Omzet (2.5%)': k.omzet,
      'Transport': k.transport,
      'THR Apotek (20%)': k.thrApotek,
      'TOTAL': k.total
    }));
    const ws1 = XLSX.utils.json_to_sheet(rekapData);
    ws1['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Payroll');

    // Sheet 2: Detail
    const detailData = payrollRows.map((k, i) => ({
      'No': i + 1,
      'Nama': k.nama,
      'Jabatan': k.jabatan,
      'Gaji Pokok': k.gajiPokok || 0,
      'Tuslah': k.pTuslah,
      'Tindakan': k.pTindakan,
      'Makan': k.makan,
      'Omzet': k.omzet,
      'Transport': k.transport,
      'THR Apotek': k.thrApotek,
      'TOTAL': k.total
    }));
    const ws2 = XLSX.utils.json_to_sheet(detailData);
    ws2['!cols'] = ws1['!cols'];
    XLSX.utils.book_append_sheet(wb, ws2, 'Detail Payroll');

    // Download
    XLSX.writeFile(wb, `payroll_${bulanNama[parseInt(document.getElementById('prBulan').value]}_${document.getElementById('prTahun').value}.xlsx`);
    toast('Payroll berhasil diexport', 'success');
  }

  window.Keu.exportPayroll = exportPayroll;

  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
