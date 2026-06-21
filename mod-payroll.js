registerModule('payroll', function() {
  const page = document.getElementById('page-payroll');
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  let payrollRows = [];

  function render() {
    page.innerHTML = `
      <div class="trx-section"><h4><i class="fas fa-calendar-alt"></i> Pilih Periode</h4>
        <div class="form-grid" style="max-width:300px">
          <div class="form-group"><label>Bulan</label><select id="prBulan">${bulanNama.map((b,i)=>`<option value="${i}" ${i===ts().getMonth()?'selected':''}>${b}</option>`).join('')}</select></div>
          <div class="form-group"><label>Tahun</label><input type="number" id="prTahun" value="${ts().getFullYear()}" min="2024" max="2099"></div>
          <div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-sm" id="prBtnHitung" style="width:auto;min-width:160px"><i class="fas fa-calculator"></i> Hitung Payroll</button></div>
        </div>
      </div>
      <div id="prResult"></div>`;
    document.getElementById('prBtnHitung').addEventListener('click', hitungPayroll);
  }

  async function hitungPayroll() {
    const bulan = parseInt(document.getElementById('prBulan').value);
    const tahun = parseInt(document.getElementById('prTahun').value) || ts().getFullYear();
    const start = new Date(tahun, bulan, 1);
    const end = new Date(tahun, bulan + 1, 1);
    const btn = document.getElementById('prBtnHitung');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghitung...';

    try {
      const trxSnap = await db.collection('transaksi').where('tanggal','>=',start).where('tanggal','<',end).get();

      let D = { jmlResepKlinik:0, jmlResepLuar:0, jmlObatBebas:0, jmlTindakanApotek:0,
                bhTotal:0, jdTotal:0, bagianKlinikTotal:0, tuslahTotal:0, kasResepTotal:0,
                dokterLuarTotal:0, labaLuarTotal:0, racikItems:0, pembulatan:0, rawatKlinik:0,
                totalObat:0, totalHPP:0,
                gulaCount:0, asamCount:0, kolestrolCount:0, tindApotekFee:0, hppApotek:0 };

      trxSnap.docs.forEach(doc => {
        const t = doc.data();
        const tipe = t.tipe;
        if (tipe === 'resep_klinik') {
          D.jmlResepKlinik++;
          D.bhTotal += C.bhDokter; D.jdTotal += C.jdDokter;
          D.bagianKlinikTotal += C.bagianKlinikResep; D.tuslahTotal += C.tuslah; D.kasResepTotal += C.kasResep;
          D.rawatKlinik += t.rawatJalanTotal || 0;
          (t.items || []).forEach(i => { if (i.racik) D.racikItems += C.racikPerItem; });
          D.pembulatan += t.pembulatan || 0;
          D.totalObat += t.totalObat || 0; D.totalHPP += t.totalHPP || 0;
        } else if (tipe === 'resep_luar') {
          D.jmlResepLuar++;
          D.dokterLuarTotal += C.dokterLuar; D.labaLuarTotal += C.labaLuar;
          (t.items || []).forEach(i => { if (i.racik) D.racikItems += C.racikPerItem; });
          D.pembulatan += t.pembulatan || 0;
          D.totalObat += t.totalObat || 0; D.totalHPP += t.totalHPP || 0;
        } else if (tipe === 'obat_bebas') {
          D.jmlObatBebas++;
          D.totalObat += t.totalObat || 0; D.totalHPP += t.totalHPP || 0;
          D.pembulatan += t.pembulatan || 0;
        } else if (tipe === 'tindakan_apotek') {
          D.jmlTindakanApotek++;
          const ta = t.tindakanApotek || {};
          if (ta.gula) { D.gulaCount++; D.tindApotekFee += C.gulaTindakan; D.hppApotek += (C.gulaTotal - C.gulaTindakan); }
          if (ta.asam) { D.asamCount++; D.tindApotekFee += C.asamTindakan; D.hppApotek += (C.asamTotal - C.asamTindakan); }
          if (ta.kolestrol) { D.kolestrolCount++; D.tindApotekFee += C.kolestrolTindakan; D.hppApotek += (C.kolestrolTotal - C.kolestrolTindakan); }
          D.pembulatan += t.pembulatan || 0;
        }
      });

      const marginTotal = D.totalObat - D.totalHPP;
      const omzet = (C.persenOmzet / 100) * marginTotal;
      const totalDA = D.tuslahTotal + D.racikItems + D.pembulatan + D.tindApotekFee + omzet + D.rawatKlinik;

      const karSnap = await db.collection('karyawan').where('divisi','==','apotek').get();
      const karyawanApotek = karSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const jmlKar = Math.max(karyawanApotek.length, 1);

      payrollRows = karyawanApotek.map(k => {
        const pTuslah = totalDA * ((k.persenTuslah || 0) / 100);
        const pTindakan = D.tindApotekFee * ((k.persenTindakan || 0) / 100);
        const pMakan = D.pembulatan * ((k.persenTuslah || 0) / 100);
        const pOmzet = omzet / jmlKar;
        const pTransport = C.transportTotal / jmlKar;
        const gajiTotal = (k.gajiPokok || 0) + pTuslah + pTindakan + pMakan + pOmzet + pTransport;
        return { ...k, pTuslah, pTindakan, makan: pMakan, omzet: pOmzet, transport: pTransport, gajiPokok: k.gajiPokok || 0, total: gajiTotal, thrApotek: totalDA * 0.20 / jmlKar };
      });

      const totalGaji = payrollRows.reduce((s,k) => s + k.total, 0);
      const thrApotekTotal = totalDA * 0.20;
      const thrKlinik = D.bagianKlinikTotal * 0.10;
      const bulanLabel = bulanNama[bulan];

      const el = document.getElementById('prResult');
      el.innerHTML = `
        <div class="stats-grid" style="margin-bottom:24px">
          <div class="stat-card"><div class="s-label">Resep Klinik</div><div class="s-value purple">${D.jmlResepKlinik} resep</div></div>
          <div class="stat-card"><div class="s-label">Resep Luar</div><div class="s-value blue">${D.jmlResepLuar} resep</div></div>
          <div class="stat-card"><div class="s-label">Obat Bebas</div><div class="s-value yellow">${D.jmlObatBebas} trx</div></div>
          <div class="stat-card"><div class="s-label">Tindakan Apotek</div><div class="s-value green">${D.jmlTindakanApotek} tindakan</div></div>
        </div>
        <div class="section-title"><i class="fas fa-list-alt"></i> Rincian Komponen</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Komponen</th><th class="num">Jumlah</th><th>Keterangan</th></tr></thead>
          <tbody>
            <tr style="background:rgba(168,85,247,.04)"><td colspan="3" style="font-weight:700;color:var(--purple)">RESEP KLINIK (${D.jmlResepKlinik} resep)</td></tr>
            <tr><td>BH Dokter</td><td class="num">Rp ${fmt(D.bhTotal)}</td><td>${D.jmlResepKlinik} × Rp ${fmt(C.bhDokter)}</td></tr>
            <tr><td>JD Dokter</td><td class="num">Rp ${fmt(D.jdTotal)}</td><td>${D.jmlResepKlinik} × Rp ${fmt(C.jdDokter)}</td></tr>
            <tr><td>Bagian Klinik</td><td class="num">Rp ${fmt(D.bagianKlinikTotal)}</td><td>${D.jmlResepKlinik} × Rp ${fmt(C.bagianKlinikResep)}</td></tr>
            <tr><td>Tuslah → D.a</td><td class="num">Rp ${fmt(D.tuslahTotal)}</td><td>${D.jmlResepKlinik} × Rp ${fmt(C.tuslah)}</td></tr>
            <tr><td>Kas/Laba Resep</td><td class="num">Rp ${fmt(D.kasResepTotal)}</td><td>${D.jmlResepKlinik} × Rp ${fmt(C.kasResep)}</td></tr>
            <tr><td>Rawat Klinik</td><td class="num">Rp ${fmt(D.rawatKlinik)}</td><td>Biaya rawat ditagih ke apotek</td></tr>
            <tr><td>Racik → D.a</td><td class="num">Rp ${fmt(D.racikItems)}</td><td>Item racik × Rp ${fmt(C.racikPerItem)}</td></tr>
            <tr><td>Pembulatan → D.a</td><td class="num">Rp ${fmt(D.pembulatan)}</td><td>Akumulasi pembulatan</td></tr>
            <tr style="background:rgba(59,130,246,.04)"><td colspan="3" style="font-weight:700;color:var(--info)">RESEP LUAR (${D.jmlResepLuar} resep)</td></tr>
            <tr><td>Dokter Luar</td><td class="num">Rp ${fmt(D.dokterLuarTotal)}</td><td>${D.jmlResepLuar} × Rp ${fmt(C.dokterLuar)}</td></tr>
            <tr><td>Laba Apotek</td><td class="num">Rp ${fmt(D.labaLuarTotal)}</td><td>${D.jmlResepLuar} × Rp ${fmt(C.labaLuar)}</td></tr>
            <tr style="background:rgba(245,158,11,.04)"><td colspan="3" style="font-weight:700;color:var(--warning)">OBAT BEBAS (${D.jmlObatBebas} trx)</td></tr>
            <tr><td>Total Penjualan</td><td class="num">Rp ${fmt(D.totalObat)}</td><td>Harga jual semua obat</td></tr>
            <tr><td>Total HPP</td><td class="num">Rp ${fmt(D.totalHPP)}</td><td>HPP semua obat</td></tr>
            <tr><td>Margin</td><td class="num" style="color:var(--warning)">Rp ${fmt(marginTotal)}</td><td>Penjualan − HPP</td></tr>
            <tr><td>Omzet (${C.persenOmzet}% margin)</td><td class="num" style="color:var(--warning)">Rp ${fmt(omzet)}</td><td>Dibagi rata ke ${jmlKar} karyawan</td></tr>
            <tr style="background:rgba(16,185,129,.04)"><td colspan="3" style="font-weight:700;color:var(--accent)">TINDAKAN APOTEK (${D.jmlTindakanApotek})</td></tr>
            <tr><td>Cek Gula (${D.gulaCount}x)</td><td class="num">Rp ${fmt(D.gulaCount * C.gulaTindakan)}</td><td>Fee @Rp ${fmt(C.gulaTindakan)}</td></tr>
            <tr><td>Cek Asam (${D.asamCount}x)</td><td class="num">Rp ${fmt(D.asamCount * C.asamTindakan)}</td><td>Fee @Rp ${fmt(C.asamTindakan)}</td></tr>
            <tr><td>Cek Kolestrol (${D.kolestrolCount}x)</td><td class="num">Rp ${fmt(D.kolestrolCount * C.kolestrolTindakan)}</td><td>Fee @Rp ${fmt(C.kolestrolTindakan)}</td></tr>
            <tr><td>HPP Tindakan (alat)</td><td class="num">Rp ${fmt(D.hppApotek)}</td><td>Biaya stick + jarum</td></tr>
            <tr style="background:rgba(16,185,129,.08)"><td colspan="2" style="font-weight:800;color:var(--accent)">TOTAL SKEMA D.a</td><td class="num" style="font-size:15px;font-weight:800;color:var(--accent)">Rp ${fmt(totalDA)}</td></tr>
          </tbody>
        </table></div>
        <div style="margin-top:24px">
          <div class="section-title"><i class="fas fa-users"></i> Payroll Karyawan Apotek (${karyawanApotek.length})</div>
          <div class="table-wrap"><div style="overflow-x:auto"><table>
            <thead><tr><th>No</th><th>Nama</th><th>Jabatan</th><th class="num">Gaji Pokok</th><th class="num">Tuslah</th><th class="num">Tindakan</th><th class="num">Makan</th><th class="num">Omzet</th><th class="num">Transport</th><th class="num">TOTAL</th></tr></thead>
            <tbody>${payrollRows.map((k,i)=>`<tr>
              <td>${i+1}</td><td style="font-weight:500">${k.nama}</td><td>${k.jabatan||'-'}</td>
              <td class="num">Rp ${fmt(k.gajiPokok)}</td><td class="num">Rp ${fmt(k.pTuslah)}</td>
              <td class="num">Rp ${fmt(k.pTindakan)}</td><td class="num">Rp ${fmt(k.makan)}</td>
              <td class="num">Rp ${fmt(k.omzet)}</td><td class="num">Rp ${fmt(k.transport)}</td>
              <td class="num" style="font-size:15px;font-weight:800;color:var(--accent)">Rp ${fmt(k.total)}</td>
            </tr>`).join('')}
            <tr style="background:rgba(16,185,129,.06)"><td colspan="9" style="font-weight:800;text-align:right">TOTAL PAYROLL</td><td class="num" style="font-size:18px;font-weight:800;color:var(--accent)">Rp ${fmt(totalGaji)}</td></tr>
          </tbody></table></div></div>
        </div>
        <div class="stats-grid" style="margin-top:24px">
          <div class="stat-card"><div class="s-label">Total Gaji</div><div class="s-value green">Rp ${fmt(totalGaji)}</div></div>
          <div class="stat-card"><div class="s-label">THR Apotek (20%)</div><div class="s-value purple">Rp ${fmt(thrApotekTotal)}</div></div>
          <div class="stat-card"><div class="s-label">THR Klinik (10%)</div><div class="s-value yellow">Rp ${fmt(thrKlinik)}</div></div>
          <div class="stat-card"><div class="s-label">Transport</div><div class="s-value blue">Rp ${fmt(C.transportTotal)}</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-outline btn-sm" onclick="Payroll.exportExcel()" style="width:auto"><i class="fas fa-file-excel"></i> Export Excel</button>
        </div>`;
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-calculator"></i> Hitung Payroll';
    } catch(e) {
      console.error('Payroll error:', e);
      document.getElementById('prResult').innerHTML = `<div class="import-result" style="background:var(--danger-dim);color:var(--danger);border:1px solid rgba(239,68,68,.2)"><i class="fas fa-exclamation-circle"></i> Gagal: ${e.message}</div>`;
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-calculator"></i> Hitung Payroll';
    }
  }

  function exportExcel() {
    if (!payrollRows.length) { toast('Hitung dulu sebelum export','warning'); return; }
    const bulanLabel = bulanNama[parseInt(document.getElementById('prBulan').value)];
    const tahun = document.getElementById('prTahun').value;
    const wb = XLSX.utils.book_new();
    const data = payrollRows.map((k,i) => ({ 'No':i+1,'Nama':k.nama,'Jabatan':k.jabatan,'Gaji Pokok':k.gajiPokok,'Tuslah':k.pTuslah,'Tindakan':k.pTindakan,'Makan':k.makan,'Omzet':k.omzet,'Transport':k.transport,'THR Apotek':k.thrApotek,'TOTAL':k.total }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:6},{wch:20},{wch:18},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll_${bulanLabel}_${tahun}.xlsx`);
    toast('Export berhasil','success');
  }

  window.Payroll = { exportExcel };
  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
