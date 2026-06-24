registerModule('payroll', function() {
  const page = document.getElementById('page-payroll');
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  let payrollRows = [];

  // small HTML escape util (safe for text insertion)
  function escapeHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  // Pure function: compute payroll aggregates and per-employee rows
  function computePayroll(transactions, employees, C) {
    const D = {
      jmlRK:0, jmlRL:0, jmlOB:0, jmlTA:0,
      bhTotal:0, jdTotal:0, bagianKlinikTotal:0, tuslahTotal:0, kasResepTotal:0,
      dokterLuarTotal:0, labaLuarTotal:0, racikItems:0, pembulatan:0,
      rawatKlinik:0, totalObat:0, totalHPP:0,
      gulaCount:0, asamCount:0, kolestrolCount:0,
      tindApotekFee:0, hppApotek:0
    };

    for (const t of transactions) {
      const tipe = t.tipe;
      if (tipe === 'resep_klinik') {
        D.jmlRK++;
        D.bhTotal += C.bhDokter || 0;
        D.jdTotal += C.jdDokter || 0;
        D.bagianKlinikTotal += C.bagianKlinikResep || 0;
        D.tuslahTotal += C.tuslah || 0;
        D.kasResepTotal += C.kasResep || 0;
        D.rawatKlinik += t.rawatJalanTotal || 0;
        D.totalObat += t.totalObat || 0;
        D.totalHPP += t.totalHPP || 0;
        D.pembulatan += t.pembulatan || 0;
        (t.items || []).forEach(it => { if (it.racik) D.racikItems += (C.racikPerItem || 0); });
      } else if (tipe === 'resep_luar') {
        D.jmlRL++;
        D.dokterLuarTotal += C.dokterLuar || 0;
        D.labaLuarTotal += C.labaLuar || 0;
        D.totalObat += t.totalObat || 0;
        D.totalHPP += t.totalHPP || 0;
        D.pembulatan += t.pembulatan || 0;
        (t.items || []).forEach(it => { if (it.racik) D.racikItems += (C.racikPerItem || 0); });
      } else if (tipe === 'obat_bebas') {
        D.jmlOB++;
        D.totalObat += t.totalObat || 0;
        D.totalHPP += t.totalHPP || 0;
        D.pembulatan += t.pembulatan || 0;
      } else if (tipe === 'tindakan_apotek') {
        D.jmlTA++;
        const ta = t.tindakanApotek || {};
        if (ta.gula) { D.gulaCount++; D.tindApotekFee += (C.gulaTindangan || 0); D.hppApotek += ((C.gulaTotal || 0) - (C.gulaTindangan || 0)); }
        if (ta.asam) { D.asamCount++; D.tindApotekFee += (C.asamTindangan || 0); D.hppApotek += ((C.asamTotal || 0) - (C.asamTindangan || 0)); }
        if (ta.kolestrol) { D.kolestrolCount++; D.tindApotekFee += (C.kolestrolTindangan || 0); D.hppApotek += ((C.kolestrolTotal || 0) - (C.kolestrolTindangan || 0)); }
        D.pembulatan += t.pembulatan || 0;
      }
    }

    const marginTotal = D.totalObat - D.totalHPP;
    const omzet = (C.persenOmzet || 0) / 100 * marginTotal;
    const totalDA = (D.tuslahTotal || 0) + (D.racikItems || 0) + (D.pembulatan || 0) + (D.tindApotekFee || 0) + omzet + (D.rawatKlinik || 0);

    const jmlKar = Math.max((employees && employees.length) || 0, 1);
    const payrollRowsLocal = [];

    for (const k of (employees || [])) {
      const persenTuslah = (k.persenTuslah != null) ? (k.persenTuslah/100) : (1 / jmlKar);
      const pTuslah = totalDA * persenTuslah;
      const persenTindakan = (k.persenTindakan != null) ? (k.persenTindakan/100) : (1 / jmlKar);
      const pTindakan = (D.tindApotekFee || 0) * persenTindakan;
      const pMakan = (D.pembulatan || 0) / jmlKar;
      const pOmzet = omzet / jmlKar;
      const pTransport = (C.transportTotal || 0) / jmlKar;

      const gajiTotal = (k.gajiPokok || 0) + pTuslah + pTindakan + pMakan + pOmzet + pTransport;

      payrollRowsLocal.push({
        nama: k.nama,
        jabatan: k.jabatan,
        gajiPokok: k.gajiPokok || 0,
        pTuslah: pTuslah,
        pTindakan: pTindakan,
        makan: pMakan,
        omzet: pOmzet,
        transport: pTransport,
        total: gajiTotal,
        thrApotek: (totalDA * 0.20) / jmlKar
      });
    }

    const totalGaji = payrollRowsLocal.reduce((s, r) => s + (r.total || 0), 0);

    return { D, payrollRows: payrollRowsLocal, totals: { totalGaji, thrApotekTotal: totalDA * 0.20, thrKlinik: (D.bagianKlinikTotal || 0) * 0.10, omzet, marginTotal } };
  }

  function render() {
    let opts = '';
    for (let i = 0; i < bulanNama.length; i++) opts += '<option value="' + i + '"' + (i === ts().getMonth() ? ' selected' : '') + '>' + bulanNama[i] + '</option>';
    
    page.innerHTML = '<div class="trx-section"><h4><i class="fas fa-calendar-alt"></i> Pilih Periode</h4><div class="form-grid" style="max-width:300px"><div class="form-group"><label>Bulan</label><select id="prBulan">' + opts + '</select></div><div class="form-group"><label>Tahun</label><input id="prTahun" type="number" value="' + ts().getFullYear() + '"></div><div class="form-group" style="align-self:end"><button class="btn btn-primary btn-sm" id="prBtnHitung"><i class="fas fa-calculator"></i> Hitung Payroll</button></div></div></div><div id="prResult"></div>';
    
    document.getElementById('prBtnHitung').addEventListener('click', hitungPayroll);
  }

  async function hitungPayroll() {
    const bulan = parseInt(document.getElementById('prBulan').value, 10);
    const tahun = parseInt(document.getElementById('prTahun').value, 10) || ts().getFullYear();
    const start = new Date(tahun, bulan, 1);
    const end = new Date(tahun, bulan + 1, 1);
    const btn = document.getElementById('prBtnHitung');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghitung...';

    try {
      const trxSnap = await db.collection('transaksi').where('tanggal', '>=', start).where('tanggal', '<', end).get();
      const transactions = trxSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch karyawan apotek saja
      const karSnap = await db.collection('karyawan').where('divisi', '==', 'apotek').get();
      const karyawanApotek = karSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Compute using pure function
      const result = computePayroll(transactions, karyawanApotek, C);
      const D = result.D;
      payrollRows = result.payrollRows;
      const totals = result.totals;

      const jmlKar = Math.max(karyawanApotek.length, 1);

      const el = document.getElementById('prResult');
      let h = '<div class="stats-grid" style="margin-bottom:24px"><div class="stat-card"><div class="s-label">Resep Klinik</div><div class="s-value purple">' + D.jmlRK + ' resep</div></div><div class="stat-card"><div class="s-label">Resep Luar</div><div class="s-value info">' + D.jmlRL + ' resep</div></div><div class="stat-card"><div class="s-label">Obat Bebas</div><div class="s-value yellow">' + D.jmlOB + ' tr</div></div><div class="stat-card"><div class="s-label">Tindakan Apotek</div><div class="s-value green">' + D.jmlTA + ' tr</div></div></div>';

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
      const marginTotal = totals.marginTotal;
      const omzet = totals.omzet;
      h += '<tr><td>Margin</td><td class="num" style="color:var(--warning)">Rp ' + fmt(marginTotal) + '</td><td>Penjualan - HPP</td></tr>';
      h += '<tr><td>Omzet (' + C.persenOmzet + '%)</td><td class="num" style="color:var(--warning)">Rp ' + fmt(omzet) + '</td><td>Dibagi ' + jmlKar + ' karyawan</td></tr>';
      h += '<tr style="background:rgba(16,185,129,.04)"><td colspan="3" style="font-weight:700;color:var(--accent)">TINDAKAN APOTEK (' + D.jmlTA + ')</td></tr>';
      h += '<tr><td>Cek Gula (' + D.gulaCount + 'x)</td><td class="num">Rp ' + fmt(D.gulaCount * (C.gulaTindangan || 0)) + '</td><td>Fee @Rp ' + fmt(C.gulaTindangan) + '</td></tr>';
      h += '<tr><td>Cek Asam (' + D.asamCount + 'x)</td><td class="num">Rp ' + fmt(D.asamCount * (C.asamTindangan || 0)) + '</td><td>Fee @Rp ' + fmt(C.asamTindangan) + '</td></tr>';
      h += '<tr><td>Cek Kolestrol (' + D.kolestrolCount + 'x)</td><td class="num">Rp ' + fmt(D.kolestrolCount * (C.kolestrolTindangan || 0)) + '</td><td>Fee @Rp ' + fmt(C.kolestrolTindangan) + '</td></tr>';
      h += '<tr><td>HPP Tindakan</td><td class="num">Rp ' + fmt(D.hppApotek) + '</td><td>Alat stick + jarum</td></tr>';
      h += '<tr style="background:rgba(16,185,129,.08)"><td colspan="2" style="font-weight:800;color:var(--accent)">TOTAL SKEMA D.a</td><td class="num" style="font-size:15px;font-weight:800;color:var(--accent)">Rp ' + fmt(totals.totalGaji || 0) + '</td></tr>';
      h += '</tbody></table></div>';

      h += '<div style="margin-top:24px"><div class="section-title"><i class="fas fa-users"></i> Payroll Karyawan Apotek (' + karyawanApotek.length + ')</div><div class="table-wrap"><div style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nama</th><th>Jabatan</th><th>Gaji Pokok</th><th>Tuslah</th><th>Tindakan</th><th>Makan</th><th>Omzet</th><th>Transport</th><th>Total</th></tr></thead><tbody>';
      for (let i = 0; i < payrollRows.length; i++) {
        const k = payrollRows[i];
        h += '<tr><td>' + (i + 1) + '</td><td style="font-weight:500">' + escapeHtml(k.nama) + '</td><td>' + escapeHtml(k.jabatan || '-') + '</td><td class="num">Rp ' + fmt(k.gajiPokok) + '</td><td class="num">Rp ' + fmt(k.pTuslah) + '</td><td class="num">Rp ' + fmt(k.pTindakan) + '</td><td class="num">Rp ' + fmt(k.makan) + '</td><td class="num">Rp ' + fmt(k.omzet) + '</td><td class="num">Rp ' + fmt(k.transport) + '</td><td class="num">Rp ' + fmt(k.total) + '</td></tr>';
      }
      h += '<tr style="background:rgba(16,185,129,.06)"><td colspan="9" style="font-weight:800;text-align:right">TOTAL PAYROLL</td><td class="num" style="font-size:18px;font-weight:800;color:var(--accent)">Rp ' + fmt(totals.totalGaji || 0) + '</td></tr>';
      h += '</tbody></table></div></div>';

      h += '<div class="stats-grid" style="margin-top:24px"><div class="stat-card"><div class="s-label">Total Gaji</div><div class="s-value green">Rp ' + fmt(totals.totalGaji || 0) + '</div></div><div class="stat-card"><div class="s-label">THR Apotek</div><div class="s-value blue">Rp ' + fmt(totals.thrApotekTotal || 0) + '</div></div><div class="stat-card"><div class="s-label">THR Klinik</div><div class="s-value yellow">Rp ' + fmt(totals.thrKlinik || 0) + '</div></div></div>';

      h += '<div style="display:flex;gap:10px;margin-top:20px"><button class="btn btn-outline btn-sm" onclick="Payroll.exportExcel()" style="width:auto"><i class="fas fa-file-excel"></i> Export Excel</button></div>';
      el.innerHTML = h;

    } catch (e) {
      console.error('Payroll error:', e);
      document.getElementById('prResult').innerHTML = '<div class="import-result" style="background:var(--danger-dim);color:var(--danger);border:1px solid rgba(239,68,68,.2)"><i class="fas fa-exclamation-triangle"></i> Gagal menghitung payroll: ' + escapeHtml(e.message) + '</div>';
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-calculator"></i> Hitung Payroll';
    }
  }

  function exportExcel() {
    if (!payrollRows.length) { toast('Hitung dulu', 'warning'); return; }
    const bulanLabel = bulanNama[parseInt(document.getElementById('prBulan').value, 10)];
    const tahun = document.getElementById('prTahun').value;
    const data = [];
    for (let i = 0; i < payrollRows.length; i++) {
      const k = payrollRows[i];
      data.push({ 'No': i + 1, 'Nama': k.nama, 'Jabatan': k.jabatan, 'Gaji Pokok': k.gajiPokok, 'Tuslah': k.pTuslah, 'Tindakan': k.pTindakan, 'Makan': k.makan, 'Omzet': k.omzet, 'Transport': k.transport, 'Total': k.total, 'THR Apotek': k.thrApotek });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, 'payroll_' + bulanLabel + '_' + tahun + '.xlsx');
    toast('Export berhasil', 'success');
  }

  window.Payroll = { exportExcel: exportExcel, computePayroll };
  
  const obs = new MutationObserver(function() { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});