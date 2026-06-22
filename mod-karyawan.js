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
    document.getElementById('karBtnAdd').addEventListener('click', showFormAdd);
    startListener();
  }

  function startListener() {
    // FIX CRASH: Hapus orderBy('jabatan') untuk menghindari error Composite Index
    db.collection('karyawan').orderBy('divisi').onSnapshot(snap => {
      allKar = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTable();
      document.getElementById('karTotal').textContent = allKar.length;
      document.getElementById('karKlinik').textContent = allKar.filter(k => k.divisi === 'klinik').length;
      document.getElementById('karApotek').textContent = allKar.filter(k => k.divisi === 'apotek').length;
    }, err => console.error('Karyawan listener:', err));
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
      <tbody>${filtered.map((k, i) => `
        <tr>
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
        </tr>
      `).join('')}</tbody></table></div></div>`;
  }

  function renderFormEdit(k) {
    const el = document.getElementById('karList');
    const isEdit = !!k;
    el.innerHTML = `
      <div class="trx-section">
        <h4><i class="fas fa-${isEdit ? 'user-edit' : 'user-plus'}"></i> ${isEdit ? 'Edit' : 'Tambah'} Karyawan</h4>
        <div class="form-grid">
          <div class="form-group"><label>Nama Lengkap *</label><input type="text" id="karNama" value="${k ? k.nama : ''}" placeholder="Nama karyawan"></div>
          <div class="form-group"><label>Divisi *</label><select id="karDivisi"><option value="">Pilih</option><option value="klinik">klinik</option><option value="apotek">apotek</option></select></div>
          <div class="form-group"><label>Jabatan *</label><input type="text" id="karJabatan" value="${k ? k.jabatan : ''}" placeholder="Dokter, Perawat, Apoteker, Karyawan..."></div>
          <div class="form-group"><label>Gaji Pokok (Rp)</label><input type="number" id="karGaji" value="${k ? (k.gajiPokok || 0) : 0}" min="0"></div>
          <div class="form-group"><label>% Bagian Tuslah</label><input type="number" id="karTuslah" value="${k ? (k.persenTuslah || 0) : 0}" min="0" max="100" step="0.1"></div>
          <div class="form-group"><label>% Bagian Tindakan Apotek</label><input type="number" id="karTindakan" value="${k ? (k.persenTindakan || 0) : 0}" min="0" max="100" step="0.1"></div>
          <div class="form-group"><label>Alamat</label><input type="text" id="karAlamat" value="${k ? (k.alamat || '') : ''}" placeholder="Opsional"></div>
          <div class="form-group"><label>No. Telepon</label><input type="text" id="karTelp" value="${k ? (k.telepon || '') : ''}" placeholder="08xxx"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-outline btn-sm" onclick="Kar.renderTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button>
          <button class="btn btn-primary btn-sm" id="karSaveBtn" style="width:auto;min-width:120px"><i class="fas fa-save"></i> Simpan</button>
        </div>
      </div>`;

    if (k && k.divisi) setSel('karDivisi', k.divisi);

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
      
      try {
        if (isEdit) { await db.collection('karyawan').doc(k.id).update(d); toast('Diperbarui', 'success'); }
        else { await db.collection('karyawan').add(d); toast('Karyawan ditambahkan', 'success'); }
        renderTable();
      } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  function showFormAdd() { renderFormEdit(null); }
  
  function edit(id) {
    const k = allKar.find(x => x.id === id); 
    if (!k) return;
    renderFormEdit(k);
  }

  async function hapus(id, nama) { 
    if (!confirm(`Hapus "${nama}"?`)) return; 
    try { 
      await db.collection('karyawan').doc(id).delete(); 
      toast('Dihapus', 'success'); 
    } catch (e) { toast('Gagal: ' + e.message, 'error'); } 
  }

  window.Kar = { edit, hapus, render: renderTable };

  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
