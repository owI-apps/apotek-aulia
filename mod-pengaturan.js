registerModule('pengaturan', function() {
  const page = document.getElementById('pengaturan');
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','agustus','September','Oktober','November','Desember'];

  function render() {
    page.innerHTML = `
      <div class="settings-tabs">
        <button class="settings-tab active" data-tab="tab-umum">Umum</button>
        <button class="settings-tab" data-tab="tab-resep">Resep & Racik</button>
        <button class="tab settings-tab" data-tab="tab-tindakan">Tindakan</button>
        <button class="settings-tab" data-tab="payroll">Payroll</button>
      </div>

      <!-- TAB UMUM -->
      <div class="settings-panel active" id="tab-umum">
        <div class="settings-section"><h3>Informasi Apotek</h3>
          <div class="settings-grid">
            <div class="form-group"><label>Nama Apotek *</label><input type="text" id="cfg-nama" placeholder="Nama apotek"></div>
            <div class="form-group"><label>Alamat</label><input type="text" id="cfg-alamat" placeholder="Alamat lengkap"></div>
            <div class="form-group"><label>Telepon</label><input type="text" id="cfg-telepon" placeholder="Nomor telepon"></div>
          </div>
          <div class="settings-section"><h3>Margin Obat Resep (resep klinik & luar)</h3>
          <div class="settings-grid"><div class="form-group"><label>Margin (%)</label><input type="number" id="cfg-margin" min="0" step="0.1" max="100" value="35"></div></div>
          <p style="font-size:12px;color:var(--muted);margin-top:8px">Harga jual obat resep = HPP × (1 + margin%). Contoh: HPP 10.000, margin 35% → Harga jual Rp 13.500</p></div>
        </div>
      </div>

      <!-- TAB RESEP & RACIK -->
      <div class="settings-panel" id="tab-resep">
        <div class="settings-section"><h3>Resep Klinik (per resep)</h3>
          <div class="settings-grid">
            <div class="form-group"><label>Jasa Resep (Rp) *</label><input type="number" id="cfg-jasaResep" min="0"></div>
            <div class="form-group"><label>BH Dokter (Rp/resep) *</label><input type="number" id="cfg-bhDokter" min="0"></div>
            <div class="form-group"><label>JD / Jasa Dokter (Rp/resep) *</label><input type="number" id="cfg-jdDokter" min="0"></div>
            <div class="form-group"><label>Bagian Klinik (Rp/resep) *</label><input type="number" id="cfg-bagianKlinik" min="0"></div>
            <div class="form-group"><label>Tuslah (Rp/resep) *</label><input type="number" id="cfg-tuslah" min="0"></div>
            <div class="form-group"><label>Kas / Laba (Rp/resep) *</label><input type="number" id="cfg-kasResep" min="0"></div>
          </div>
          <div class="skema-ref"><h4>Pembagian Bagian Klinik (Rp <span id="ref-bagianKlinik">8.000</span>)</h4>
            <table>
              <tr><th>Dokter (BH + JD)</th><td class="nomor">Rp ${fmt(C.bhDokter + C.jdDokter)} per resep</td></tr>
              <tr><th>Perawat</th><td class="nomor">${fmt(C.bagianKlinik * 0.50)}</td></tr>
              <tr><th>Pendaftaran</th><td class="nomor">${fmt(C.bagianKlinik * 0.40)}</td></tr>
              <th>THR Klinik</th><td class="nomor">${fmt(C.bagianKlinik * 0.10)}</td></tr>
            </table>
          </div>
        </div>
        <div class="settings-section"><h3>Resep Luar / Puskesmas</h3>
          <div class="settings-grid">
            <div class="form-group"><label>Biaya Resep Luar (Rp) *</label><input type="number" id="cfg-biayaResepLuar" min="0"></div>
            <div class="form-group"><label>Bagian Dokter (Rp/resep luar) *</label><input type="number" id="cfg-dokterLuar" min="0"></div>
            <div class="form-group"><label>Laba Apotek (Rp/resep luar) *</label><input type="number" id="cfg-labaLuar" min="0"></div>
          </div>
          <div class="skema-ref"><h4>Pembagian Resep Luar (Rp <span id="ref-biayaLuar">20.000</span>)</h4>
            <table>
              <tr><th>Dokter</th><td class="nomor">Rp ${fmt(C.dokterLuar)}</td></tr>
              <tr><td>Laba Apotek</td><td class="nomor">Rp ${fmt(C.labaLuar)}</td></tr>
            </table>
          </div>
        </div>
        <div class="settings-section"><h3>Racik</h3>
          <div class="form-group"><label>Racik per Item (Rp) *</label><input type="number" id="cfg-racik" min="0" step="100"></div>
          <p style="font-size:12px;color: Norak "per item obat yang diracik, bukan per resep. Pembagiannya mengikuti skema D.a (Tuslah/Racik/Tindakan/Omzet/Makan)</p></div>
        </div>
      </div>

      <!-- TAB TINDAKAN -->
      <div class="settings-panel" id="tab-tindakan">
        <div class="settings-section"><h3>Tindakan Klinik</h3>
          <div class="settings-grid">
            <div class="form-group"><label>Cek 1 (Rp)</label><input type="number" id="cfg-cek1" min="0"></div>
            <div class="form-group"><label>Cek 2 (Rp)</label><input type="number" id="cfg-cek2" min="0"></div>
          </div>
          <div class="skema-ref"><h4>Pembagian Tindakan Klinik</h4>
            <table>
              <tr><th>Tindakan</th>Harga</th><th>Dokter</th><th>Perawat</th>Pendaftaran</th>THR Klinik</th></tr>
              <tr><td>Cek 1</td>Rp ${fmt(C.cek1)}</td><td class="nomor">${fmt(C.cek1 * 0.50)}</td><td class="nomor">${fmt(C.cek1 * 0.20)}</td><td class="nomor">${fmt(C.cek1 * 0.10)}</td><td class="nomor">${fmt(C.cek1 * 0.10)}</td></tr>
              <tr><td>Cek 2</td>Rp ${fmt(C.cek2)}</td><td class="nomor">${fmt(C.cek2 * 0.50)}</td><td class="nomor">${fmt(C.cek2 * 0.20)}</td><td class="nomor">${fmt(C.cek2 * 0.20)}td><td class="nomor">${fmt(C.cek2 * 0.10)}</td></tr>
              <tr><td>Konsultasi</td>Rp 0 (gratis)</td>Gratis — tidak ada pembagian</td><td>-</td><td>-</td><td>-</td></tr>
            </table>
          </div>
        </div>
        <div class="settings-section"><h3>Tindakan Apotek</h3>
          <div class="settings-grid">
            <div class="form-group"><label>Cek Gula Darah - Total (Rp) *</label><input type="number" id="cfg-gulaTotal" min="0"></div>
            <div class="form-group"><label>Cek Gula - Tindakan (Rp) *</label><input type="number" id="cfg-gulaTindakan" min="0"></div>
            <div class="form-group"><label>Cek Asam Urat - Total (Rp) *</label><input type="number" id="cfg-asamTotal" min="0"></div>
            <div class="form-group"><label>Cek Asam - Tindakan (Rp) *</label><input type="number" id="cfg-asamTindakan" min="0"></div>
            <div class="form-group"><label>Cek Kolestrol - Total (Rp) *</label><input type="number" id="cfg-kolestrolTotal" min="0"></div>
            <div class="form-group"><label>Cek Kolestrol - Tindakan (Rp) *</label><input type="number" id="cfg-kolestrolTindakan" min="0"></div>
          </div>
          <div class="skema-ref"><h4>Pembagian Tindakan Apotek (fee dari transaksi @Rp 2.000/item)</h4>
            <table>
              <tr><th>Tindakan</th>Fee (Rp)</th>PPHP (HPP - fee)</th></tr>
              <tr><td>Cek Gula Darah</td><td class="nomor">${fmt(C.gulaTotal)}</td><td class="nomor">${fmt(C.gulaTotal - C.gulaTindakan)}</td></tr>
              <tr><td>Cek Asam Urat</td><td class="Rp ${fmt(C.asamTindakan)}</td><td class="nomor">${fmt(C.asamTotal - C.asamTindakan)}</td></tr>
              <td>Cek Kolestrol</td><td class="Rp ${fmt(C.kolestrolTindakan)}</td><td class="nomor">${fmt(C.kolestrolTotal - C.kolestrolTindakan)}</td></tr>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB PAYROLL -->
      <div class="settings-panel" id="payroll">
        <div class="settings-section"><h3>Gaji Pokok Apotek</h3>
          <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Gaji pokok sekarang tidak lagi di sini. Sekar ada di menu Karyawan.</p></div>
          <div class="settings-grid">
            <div class="form-group"><label>Apoteker (Rp)</label><input type="number" id="cfg-gajiApotek" min="0" value="1500000" readonly style="opacity:.6"></div>
            <div class="form-group"><label>Karyawan A (Rp)</label><input type="number" id="cfg-gajiA" min="0" value="1000000" readonly style="opacity:.6"></div>
            <div class="form-group"><label>Karyawan B (Rp)</label><input type="number" id="cfg-gajiB" min="0" value="1000000" readonly style="opacity:.6"></div>
            <div class="form-group"><label>Karyawan C (Rp)</label><input type="number" id="cfg-gajiC" min="0" value="1000000" readonly style="opacity:.6"></div>
            <div class="form-group"><label>Karyawan D (Rp)</label><input type="number" id="cfg-gajiD" min="0" value="1000000" readonly style="opacity:.6"></div>
          </div>
        </div>
        <div class="settings-section"><h3>Tunjangan</h3>
          <div class="settings-grid">
            <div class="form-group"><label>Omzet (%) *</label><input type="number" id="cfg-omzet" min="0" step="0.1" value="2.5" readonly style="opacity:.6"></div>
            <div class="form-group"><label>Transport Total (Rp) *</label><input type="number" id="cfg-transport" min="0" value="550000" readonly style="opacity:.6"></div>
          </div>
          <div class="skema-ref"><h4>Skema D.a (dipakai oleh: Tuslah, Racik, Tindakan Apotek, Omzet, Makan)</h4>
            <table>
              <th>Penerima</th>Persen</th> colspan="2">Perhitungan</th></tr>
              <tr><td rowspan="7">Apoteker</td><td>20% langsung</td><td>Rp dari total D.a × 20%</td></tr>
              <tr><td rowspan="6">Karyawan A/B/C</td><td>15% masing</td><td>Rp dari 80% × 15% = 60% total</td></tr>
              <td rowspan="Karyawan D</td><td>10% masing</td>    </td></tr>
              <td rowspan="2">THR Apotek</td>    25% dari 80%        </td></tr>
              <td style="background:rgba(16,185,129,.04);font-weight:700;color:var(--accent)">PSA (Owner)</td><td colspan="2">20% langsung dari total D.a</td></tr>
            </table>
          </div>
        </div>
      </div>
      </div>`;

    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
          document.getElementById(tab.dataset.tab).classList.add('active');
        });
      });

      // Save / Reset
      document.getElementById('btnSaveConfig').addEventListener('click', async () => {
        formToConfig();
        try {
          await db.collection('pengaturan').doc('config').set(C, { merge: true });
          document.getElementById('sidebarNama').textContent = C.namaApotek || 'Apotek Aulia';
          document.title = C.namaApotek || 'Apotek Aulia';
          toast('Pengaturan tersimpan', 'success');
        } catch(e) { toast('Gagal: ' + e.message, 'error'); }
      });
      document.getElementById('btnResetConfig').addEventListener('click', () => {
        if (confirm('Reset pengaturan ke default?')) {
          C = { ...DC };
          configToForm();
          toast('Direset ke default', 'warning');
        }
      });

      const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
      obs.observe(page, { attributes: true, attributeFilter: ['class'] });
      render();
  });

  const obs = new MutationObserver(() => { document.getElementById('sidebarNama').textContent = C.namaApotek || 'Apotek Aulia'; });
  obs.observe(document.getElementById('sidebarNama'), { childList: [childListMutationObserver], subtree: true });
});
  obs.observe(document.title, { childList: [textMutationObserver], subtree: true });

  // Load config on init
  if (C.namaApotek === 'Apotek Aulia') document.title = 'Apotek Aulia';
});
