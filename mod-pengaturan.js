registerModule('pengaturan', function() {
  var page = document.getElementById('page-pengaturan');

  function render() {
    page.innerHTML = ''
      + '<div class="settings-tabs">'
      + '<button class="settings-tab active" data-tab="tab-umum">Umum</button>'
      + '<button class="settings-tab" data-tab="tab-resep">Resep & Racik</button>'
      + '<button class="settings-tab" data-tab="tab-tindakan">Tindakan</button>'
      + '<button class="settings-tab" data-tab="tab-payroll">Payroll</button>'
      + '</div>'

      + '<div class="settings-panel active" id="tab-umum">'
      + '<div class="settings-section"><h3>Informasi Apotek</h3>'
      + '<div class="settings-grid">'
      + '<div class="form-group"><label>Nama Apotek *</label><input type="text" id="cfg-nama" placeholder="Nama apotek"></div>'
      + '<div class="form-group"><label>Alamat</label><input type="text" id="cfg-alamat" placeholder="Alamat lengkap"></div>'
      + '<div class="form-group"><label>Telepon</label><input type="text" id="cfg-telepon" placeholder="Nomor telepon"></div>'
      + '</div></div>'
      + '<div class="settings-section"><h3>Margin Obat Resep</h3>'
      + '<div class="settings-grid"><div class="form-group"><label>Margin (%)</label><input type="number" id="cfg-margin" min="0" step="0.1" max="100" value="35"></div></div>'
      + '<p style="font-size:12px;color:var(--muted);margin-top:8px">Harga jual = HPP x (1 + margin%). Contoh: HPP 10.000, margin 35% = Rp 13.500</p>'
      + '</div></div>'

      + '<div class="settings-panel" id="tab-resep">'
      + '<div class="settings-section"><h3>Resep Klinik (per resep)</h3>'
      + '<div class="settings-grid">'
      + '<div class="form-group"><label>Jasa Resep (Rp)</label><input type="number" id="cfg-jasaResep" min="0"></div>'
      + '<div class="form-group"><label>BH Dokter (Rp/resep)</label><input type="number" id="cfg-bhDokter" min="0"></div>'
      + '<div class="form-group"><label>JD Dokter (Rp/resep)</label><input type="number" id="cfg-jdDokter" min="0"></div>'
      + '<div class="form-group"><label>Bagian Klinik (Rp/resep)</label><input type="number" id="cfg-bagianKlinik" min="0"></div>'
      + '<div class="form-group"><label>Tuslah (Rp/resep)</label><input type="number" id="cfg-tuslah" min="0"></div>'
      + '<div class="form-group"><label>Kas/Laba (Rp/resep)</label><input type="number" id="cfg-kasResep" min="0"></div>'
      + '</div>'
      + '<div class="skema-ref"><h4>Pembagian Bagian Klinik</h4><table>'
      + '<tr><th>Dokter (BH + JD)</th><td>Rp ' + fmt(C.bhDokter + C.jdDokter) + ' /resep</td></tr>'
      + '<tr><th>Perawat (50%)</th><td>Rp ' + fmt(C.bagianKlinikResep * 0.50) + '</td></tr>'
      + '<tr><th>Pendaftaran (40%)</th><td>Rp ' + fmt(C.bagianKlinikResep * 0.40) + '</td></tr>'
      + '<tr><th>THR Klinik (10%)</th><td>Rp ' + fmt(C.bagianKlinikResep * 0.10) + '</td></tr>'
      + '</table></div></div>'
      + '<div class="settings-section"><h3>Resep Luar</h3>'
      + '<div class="settings-grid">'
      + '<div class="form-group"><label>Biaya Resep Luar (Rp)</label><input type="number" id="cfg-biayaResepLuar" min="0"></div>'
      + '<div class="form-group"><label>Dokter Luar (Rp/resep)</label><input type="number" id="cfg-dokterLuar" min="0"></div>'
      + '<div class="form-group"><label>Laba Apotek (Rp/resep)</label><input type="number" id="cfg-labaLuar" min="0"></div>'
      + '</div></div>'
      + '<div class="settings-section"><h3>Racik</h3>'
      + '<div class="settings-grid"><div class="form-group"><label>Racik per Item (Rp)</label><input type="number" id="cfg-racik" min="0" step="100"></div></div>'
      + '<p style="font-size:12px;color:var(--muted);margin-top:8px">Per item obat yang diracik. Ikut skema D.a</p>'
      + '</div></div>'

      + '<div class="settings-panel" id="tab-tindakan">'
      + '<div class="settings-section"><h3>Tindakan Klinik</h3>'
      + '<div class="settings-grid">'
      + '<div class="form-group"><label>Cek 1 (Rp)</label><input type="number" id="cfg-cek1" min="0"></div>'
      + '<div class="form-group"><label>Cek 2 (Rp)</label><input type="number" id="cfg-cek2" min="0"></div>'
      + '</div>'
      + '<div class="skema-ref"><h4>Pembagian Tindakan Klinik</h4><table>'
      + '<tr><th>Tindakan</th><th>Harga</th><th>Dokter 50%</th><th>Perawat 20%</th><th>Daftar 20%</th><th>THR 10%</th></tr>'
      + '<tr><td>Cek 1</td><td>Rp ' + fmt(C.cek1) + '</td><td>Rp ' + fmt(C.cek1*0.50) + '</td><td>Rp ' + fmt(C.cek1*0.20) + '</td><td>Rp ' + fmt(C.cek1*0.20) + '</td><td>Rp ' + fmt(C.cek1*0.10) + '</td></tr>'
      + '<tr><td>Cek 2</td><td>Rp ' + fmt(C.cek2) + '</td><td>Rp ' + fmt(C.cek2*0.50) + '</td><td>Rp ' + fmt(C.cek2*0.20) + '</td><td>Rp ' + fmt(C.cek2*0.20) + '</td><td>Rp ' + fmt(C.cek2*0.10) + '</td></tr>'
      + '<tr><td>Konsultasi</td><td>Gratis</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>'
      + '</table></div></div>'
      + '<div class="settings-section"><h3>Tindakan Apotek</h3>'
      + '<div class="settings-grid">'
      + '<div class="form-group"><label>Gula - Total (Rp)</label><input type="number" id="cfg-gulaTotal" min="0"></div>'
      + '<div class="form-group"><label>Gula - Fee (Rp)</label><input type="number" id="cfg-gulaTindangan" min="0"></div>'
      + '<div class="form-group"><label>Asam - Total (Rp)</label><input type="number" id="cfg-asamTotal" min="0"></div>'
      + '<div class="form-group"><label>Asam - Fee (Rp)</label><input type="number" id="cfg-asamTindangan" min="0"></div>'
      + '<div class="form-group"><label>Kolestrol - Total (Rp)</label><input type="number" id="cfg-kolestrolTotal" min="0"></div>'
      + '<div class="form-group"><label>Kolestrol - Fee (Rp)</label><input type="number" id="cfg-kolestrolTindangan" min="0"></div>'
      + '</div>'
      + '<div class="skema-ref"><h4>Pembagian Tindakan Apotek</h4><table>'
      + '<tr><th>Tindakan</th><th>Total</th><th>Fee (D.a)</th><th>HPP Alat</th></tr>'
      + '<tr><td>Cek Gula Darah</td><td>Rp ' + fmt(C.gulaTotal) + '</td><td>Rp ' + fmt(C.gulaTindangan) + '</td><td>Rp ' + fmt(C.gulaTotal - C.gulaTindangan) + '</td></tr>'
      + '<tr><td>Cek Asam Urat</td><td>Rp ' + fmt(C.asamTotal) + '</td><td>Rp ' + fmt(C.asamTindangan) + '</td><td>Rp ' + fmt(C.asamTotal - C.asamTindangan) + '</td></tr>'
      + '<tr><td>Cek Kolestrol</td><td>Rp ' + fmt(C.kolestrolTotal) + '</td><td>Rp ' + fmt(C.kolestrolTindangan) + '</td><td>Rp ' + fmt(C.kolestrolTotal - C.kolestrolTindangan) + '</td></tr>'
      + '</table></div></div></div>'

      + '<div class="settings-panel" id="tab-payroll">'
      + '<div class="settings-section"><h3>Gaji Pokok (kini di menu Karyawan)</h3>'
      + '<p style="font-size:12px;color:var(--muted);margin-bottom:14px">Gaji pokok dikelola per karyawan. Field readonly untuk referensi.</p>'
      + '<div class="settings-grid">'
      + '<div class="form-group"><label>Apoteker (Rp)</label><input type="number" id="cfg-gajiApotek" readonly style="opacity:.6"></div>'
      + '<div class="form-group"><label>Karyawan A (Rp)</label><input type="number" id="cfg-gajiA" readonly style="opacity:.6"></div>'
      + '<div class="form-group"><label>Karyawan B (Rp)</label><input type="number" id="cfg-gajiB" readonly style="opacity:.6"></div>'
      + '<div class="form-group"><label>Karyawan C (Rp)</label><input type="number" id="cfg-gajiC" readonly style="opacity:.6"></div>'
      + '<div class="form-group"><label>Karyawan D (Rp)</label><input type="number" id="cfg-gajiD" readonly style="opacity:.6"></div>'
      + '</div></div>'
      + '<div class="settings-section"><h3>Tunjangan</h3>'
      + '<div class="settings-grid">'
      + '<div class="form-group"><label>% Omzet dari Margin</label><input type="number" id="cfg-omzet" min="0" step="0.1"></div>'
      + '<div class="form-group"><label>Transport Total (Rp)</label><input type="number" id="cfg-transport" min="0"></div>'
      + '</div>'
      + '<div class="skema-ref"><h4>Skema D.a</h4><table>'
      + '<tr><th>Komponen</th><th>Keterangan</th></tr>'
      + '<tr><td>Tuslah</td><td>Dari resep klinik</td></tr>'
      + '<tr><td>Racik</td><td>Per item obat racik</td></tr>'
      + '<tr><td>Tindakan Apotek</td><td>Fee gula/asam/kolestrol</td></tr>'
      + '<tr><td>Omzet</td><td>' + C.persenOmzet + '% dari margin obat</td></tr>'
      + '<tr><td>Makan</td><td>Dari pembulatan transaksi</td></tr>'
      + '<tr><td>Rawat Klinik</td><td>Biaya rawat ditagih ke apotek</td></tr>'
      + '</table></div></div></div>'

      + '<div class="save-bar">'
      + '<button class="btn btn-outline btn-sm" id="btnResetConfig" style="width:auto"><i class="fas fa-undo"></i> Reset Default</button>'
      + '<button class="btn btn-primary btn-sm" id="btnSaveConfig" style="width:auto;min-width:140px"><i class="fas fa-save"></i> Simpan Pengaturan</button>'
      + '</div>';

    var tabs = document.querySelectorAll('.settings-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function() {
        var allTabs = document.querySelectorAll('.settings-tab');
        var allPanels = document.querySelectorAll('.settings-panel');
        for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('active');
        for (var j = 0; j < allPanels.length; j++) allPanels[j].classList.remove('active');
        var target = document.getElementById(this.dataset.tab);
        if (target) target.classList.add('active');
      });
    }

    document.getElementById('btnSaveConfig').addEventListener('click', function() {
      formToConfig();
      db.collection('pengaturan').doc('config').set(C, {merge:true}).then(function() {
        document.getElementById('sidebarNama').textContent = C.namaApotek || 'Apotek Aulia';
        document.title = C.namaApotek || 'Apotek Aulia';
        toast('Pengaturan tersimpan','success');
      }).catch(function(e) { toast('Gagal: '+e.message,'error'); });
    });

    document.getElementById('btnResetConfig').addEventListener('click', function() {
      if (confirm('Reset pengaturan ke default?')) { C = Object.assign({}, DC); configToForm(); toast('Direset ke default','warning'); }
    });
  }

  var obs = new MutationObserver(function(){if(page.classList.contains('active'))render();});
  obs.observe(page, {attributes:true, attributeFilter:['class']});
});
