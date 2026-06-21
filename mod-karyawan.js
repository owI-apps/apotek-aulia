registerModule('karyawan', function() {
  const page = document.getElementById('page-karyawan');
  let allKar = [];
  const DIVISI = ['klinik', 'apotek'];

  function render() {
    page.innerHTML = `
      <div class="stats-grid" style="margin-bottom:18px">
        <div class="stat-card"><div class="s-label">Total Karyawan</div><div class="s-value green" id="karTotal">0</div></div>
        <div class="stat-card"><div class="s-label">Klinik</div><div class="s-value purple" id="karKlinik">0</div></div>
        <div class="stat-card"><div class="s-label">Apotek</div><div class="s-value blue" id="karApotek">0</div></div>
      </div>
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="karSearch" placeholder="Cari nama, jabatan..."></div>
        <button class="btn btn-primary btn-sm" id="karBtnAdd" style="width:auto"><i class="fas fa-user-plus"></i> Tambah Karyawan</button>
      </div>
      <div id="karList"><div class="empty-state"><i class="fas fa-users"></i><p>Memuat...</p></div></div>`;

    document.getElementById('karSearch').addEventListener('input', renderTable);
    document.getElementById('karBtnAdd').addEventListener('click', openAdd);
    startListener();
  }

  function startListener() {
    db.collection('karyawan').orderBy('divisi').orderBy('jabatan').onSnapshot(snap => {
      allKar = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTable();
      document.getElementById('karTotal').textContent = allKar.length;
      document.getElementById('karKlinik').textContent = allKar.filter(k => k.divisi === 'klinik').length;
      document.getElementById('karApotek').textContent = allKar.filter(k => k.divisi === 'apotek').length;
    });
  }

  function renderTable() {
    const s = (document.getElementById('karSearch').value || '').toLowerCase();
    const filtered = allKar.filter(k => {
      if (s && !(k.nama || '').toLowerCase().includes(s) && !(k.jabatan || '').toLowerCase().includes(s)) return false;
      return true;
    });
    const el = document.getElementById('karList');
    if (!filtered.length) { el.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Tidak ada data</p></div>`; return; }
    el.innerHTML = `<div class="table-wrap"><div style="overflow-x:auto"><table>
      <thead><tr><th>No</th><th>Nama</th><th>Divisi</th><th>Jabatan</th><th class="num">Gaji Pokok</th><th>Persen Tuslah</th><th>Persen Tindakan</th><th>Aksi</th></tr></thead>
      <tbody>${filtered.map((k, i) => `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:500">${k.nama}</td>
        <td><span class="pill ${k.divisi === 'klinik' ? 'pill-menunggu' : 'pill-approved'}">${k.divisi}</span></td>
        <td>${k.jabatan || '-'}</td>
        <td class="num">${fmt(k.gajiPokok || 0)}</td>
        <td class="num">${k.persenTuslah || 0}%</td>
        <td class="num">${k.persenTindakan || 0}%</td>
        <td class="actions">
          <button class="btn btn-outline btn-xs" onclick="Kar.edit('${k.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-xs" onclick="Kar.hapus('${k.id}','${escAttr(k.nama)}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('')}</tbody></table></div></div>`;
  }

  function openAdd() {
    const el = document.getElementById('karList');
    el.innerHTML = `
      <div class="trx-section"><h4><i class="fas fa-user-plus"></i> Tambah Karyawan</h4>
        <div class="form-grid">
          <div class="form-group"><label>Nama Lengkap *</label><input type="text" id="karNama" placeholder="Nama karyawan"></div>
          <div class="form-group"><label>Divisi *</label><select id="karDivisi"><option value="">Pilih</option><option>klinik</option><option>apotek</option></select></div>
          <div class="form-group"><label>Jabatan *</label><input type="text" id="karJabatan" placeholder="Dokter, Perawat, Apoteker, Karyawan..."></div>
          <div class="form-group"><label>Gaji Pokok (Rp)</label><input type="number" id="karGaji" min="0"></div>
          <div class="form-group"><label>% Bagian Tuslah</label><input type="number" id="karTuslah" min="0" max="100" step="0.1" value="0"></div>
          <div class="form-group"><label>% Bagian Tindakan Apotek</label><input type="number" id="karTindakan" min="0" max="100" step="0.1" value="0"></div>
          <div class="form-group"><label>Alamat</label><input type="text" id="karAlamat" placeholder="Opsional"></div>
          <div class="form-group"><label>No. Telepon</label><input type="text" id="karTelp" placeholder="08xxx"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Kar.render()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="karSaveBtn" style="width:auto;min-width:120px"><i class="fas fa-save"></i> Simpan</button></div>
      </div>`;

    document.getElementById('karDivisi').addEventListener('change', function () {
      // Auto-fill default jabatan & gaji
      const div = this.value;
      const defaults = {
        klinik: [
          { jabatan: 'Dokter', gaji: 0 },
          { jabatan: 'Perawat', gaji: 0 },
          { jabatan: 'Pendaftaran', gaji: 0 }
        ],
        apotek: [
          { jabatan: 'Apoteker', gaji: 1500000 },
          { jabatan: 'Karyawan', gaji: 1000000 }
        ]
      };
      const list = defaults[div] || [];
      if (list.length === 1) {
        document.getElementById('karJabatan').value = list[0].jabatan;
        document.getElementById('karGaji').value = list[0].gaji;
      }
    });

    document.getElementById('karSaveBtn').addEventListener('click', async () => {
      const d = {
        nama: document.getElementById('karNama').value.trim(),
        divisi: document.getElementById('karDivisi').value,
        jabatan: document.getElementById('karJabatan').value.trim(),
        gajiPokok: parseFloat(document.getElementById('karGaji').value) || 0,
        persenTuslah: parseFloat(document.getElementById('karTuslah').value) || 0,
        persenTindakan: parseFloat(document.getElementById('karTindakan').value) || 0,
        alamat: document.getElementById('karAlamat').value.trim(),
        telepon: document.getElementById('karTelp').value.trim(),
        status: 'aktif'
      };
      if (!d.nama || !d.divisi || !d.jabatan) { toast('Nama, divisi, jabatan wajib', 'error'); return; }
      try { await db.collection('karyawan').add(d); toast('Karyawan ditambahkan', 'success'); render(); } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  function edit(id) {
    const k = allKar.find(x => x.id === id); if (!k) return;
    const el = document.getElementById('karList');
    el.innerHTML = `
      <div class="trx-section"><h4><i class="fas fa-user-edit"></i> Edit Karyawan</h4>
        <div class="form-grid">
          <div class="form-group"><label>Nama Lengkap *</label><input type="text" id="karNama" value="${k.nama || ''}"></div>
          <div class="form-group"><label>Divisi *</label><select id="karDivisi"><option value="klinik" ${k.divisi === 'klinik' ? 'selected' : ''}>klinik</option><option value="apotek" ${k.divisi === 'apotek' ? 'selected' : ''}>apotek</option></select></div>
          <div class="form-group"><label>Jabatan *</label><input type="text" id="karJabatan" value="${k.jabatan || ''}"></div>
          <div class="form-group"><label>Gaji Pokok (Rp)</label><input type="number" id="karGaji" value="${k.gajiPokok || 0}" min="0"></div>
          <div class="form-group"><label>% Bagian Tuslah</label><input type="number" id="karTuslah" value="${k.persenTuslah || 0}" min="0" max="100" step="0.1"></div>
          <div class="form-group"><label>% Bagian Tindakan Apotek</label><input type="number" id="karTindakan" value="${k.persenTindakan || 0}" min="0" max="100" step="0.1"></div>
          <div class="form-group"><label>Alamat</label><input type="text" id="karAlamat" value="${k.alamat || ''}"></div>
          <div class="form-group"><label>No. Telepon</label><input type="text" id="karTelp" value="${k.telepon || ''}"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline btn-sm" onclick="Kar.render()" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="karEditBtn" style="width:auto;min-width:120px"><i class="fas fa-save"></i> Simpan</button></div>
      </div>`;

    document.getElementById('karEditBtn').addEventListener('click', async () => {
      const d = {
        nama: document.getElementById('karNama').value.trim(),
        divisi: document.getElementById('karDivisi').value,
        jabatan: document.getElementById('karJabatan').value.trim(),
        gajiPokok: parseFloat(document.getElementById('karGaji').value) || 0,
        persenTuslah: parseFloat(document.getElementById('karTuslah').value) || 0,
        persenTindakan: parseFloat(document.getElementById('karTindakan').value) || 0,
        alamat: document.getElementById('karAlamat').value.trim(),
        telepon: document.getElementById('karTelp').value.trim()
      };
      if (!d.nama || !d.divisi || !d.jabatan) { toast('Nama, divisi, jabatan wajib', 'error'); return; }
      try { await db.collection('karyawan').doc(id).update(d); toast('Diperbarui', 'success'); render(); } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  async function hapus(id, nama) { if (!confirm(`Hapus "${nama}"?`)) return; try { await db.collection('karyawan').doc(id).delete(); toast('Dihapus', 'success'); } catch (e) { toast('Gagal: ' + e.message, 'error'); } }
  window.Kar = { edit, hapus, render: renderTable };

  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
