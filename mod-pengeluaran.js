registerModule('pengeluaran', function() {
  const page = document.getElementById('page-pengeluaran');
  let allPengeluaran = [];
  const isAdmin = userRole === 'admin';

  function render() {
    page.innerHTML = `
      <div class="stats-grid" style="margin-bottom:18px">
        <div class="stat-card"><div class="s-label">Total Pengeluaran</div><div class="s-value yellow" id="pgTotal">0</div></div>
        <div class="stat-card"><div class="s-label">Menunggu Approval</div><div class="s-value purple" id="pgPending">0</div></div>
        <div class="stat-card"><div class="s-label">Ditolak</div><div class="s-value red" id="pgRejected">0</div></div>
      </div>
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="pgSearch" placeholder="Cari keterangan..."></div>
        <select class="filter-select" id="pgFilterTipe"><option value="">Semua Tipe</option><option value="harian">Rutin (Harian)</option><option value="bulanan">Bulanan</option></select>
        <select class="filter-select" id="pgFilterStatus"><option value="">Semua Status</option><option value="pending">Pending</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option></select>
        ${userRole !== 'admin' ? '<button class="btn btn-primary btn-sm" id="pgBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Input Pengeluaran</button>' : ''}
      </div>
      <div id="pgList"><div class="empty-state"><i class="fas fa-money-bill-wave"></i><p>Memuat...</p></div></div>`;

    document.getElementById('pgSearch').addEventListener('input', renderTable);
    document.getElementById('pgFilterTipe').addEventListener('change', renderTable);
    document.getElementById('pgFilterStatus').addEventListener('change', renderTable);
    if (userRole !== 'admin') document.getElementById('pgBtnAdd').addEventListener('click', showAddForm);
    
    startListener();
  }

  function startListener() {
    db.collection('pengeluaran').orderBy('tanggal', 'desc').onSnapshot(snap => {
      allPengeluaran = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTable();
      updateStats();
    }, err => console.error('Pengeluaran listener error:', err));
  }

  function updateStats() {
    let total = 0, pending = 0, rejected = 0;
    for (let i = 0; i < allPengeluaran.length; i++) {
      const p = allPengeluaran[i];
      if (p.status === 'approved') total += (p.jumlah || 0);
      if (p.status === 'pending') pending++;
      if (p.status === 'rejected') rejected++;
    }
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('pgTotal', 'Rp ' + fmt(total));
    el('pgPending', pending);
    el('pgRejected', rejected);
  }

  function renderTable() {
    const s = (document.getElementById('pgSearch').value || '').toLowerCase();
    const fTipe = document.getElementById('pgFilterTipe').value;
    const fStatus = document.getElementById('pgFilterStatus').value;
    
    const filtered = allPengeluaran.filter(p => {
      if (fTipe && p.tipe !== fTipe) return false;
      if (fStatus && p.status !== fStatus) return false;
      if (s && !(p.keterangan || '').toLowerCase().includes(s)) return false;
      return true;
    });

    const el = document.getElementById('pgList');
    if (!filtered.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-money-bill-wave"></i><p>Tidak ada data</p></div>'; return; }
    
    let h = '<div class="table-wrap"><table><thead><tr><th>No</th><th>Nomor</th><th>Tanggal</th><th>Tipe</th><th>Keterangan</th><th class="num">Jumlah</th><th>Status</th>' + (isAdmin ? '<th>Aksi</th>' : '') + '</tr></thead><tbody>';
    
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      const tipeLabel = p.tipe === 'harian' ? '<span class="pill pill-parsial">Harian</span>' : '<span class="pill pill-menunggu">Bulanan</span>';
      let statusClass = 'pill-pending', statusText = 'Pending';
      if (p.status === 'approved') { statusClass = 'pill-approved'; statusText = 'Disetujui'; }
      else if (p.status === 'rejected') { statusClass = 'rejected'; statusText = 'Ditolak'; }
      
      let aksi = '';
      if (isAdmin && p.status === 'pending') {
        aksi = `<button class="btn btn-primary btn-xs" onclick="Peng.approve('${p.id}')"><i class="fas fa-check"></i></button> <button class="btn btn-danger btn-xs" onclick="Peng.reject('${p.id}')"><i class="fas fa-times"></i></button>`;
      } else if (isAdmin && p.status === 'approved') {
        aksi = `<button class="btn btn-outline btn-xs" onclick="Peng.edit('${p.id}')"><i class="fas fa-edit"></i></button> <button class="btn btn-danger btn-xs" onclick="Peng.hapus('${p.id}')"><i class="fas fa-trash"></i></button>`;
      }

      h += `<tr>
        <td>${i + 1}</td>
        <td style="font-family:var(--mono);font-size:12px;color:var(--accent)">${p.nomor || '-'}</td>
        <td style="font-size:12px;color:var(--muted)">${fmtDate(p.tanggal)}</td>
        <td>${tipeLabel}</td>
        <td>${p.keterangan || '-'}</td>
        <td class="num">Rp ${fmt(p.jumlah)}</td>
        <td><span class="pill ${statusClass}">${statusText}</span></td>
        ${isAdmin ? '<td class="actions">' + aksi + '</td>' : ''}
      </tr>`;
    }
    
    h += '</tbody></table></div>';
    el.innerHTML = h;
  }

  function showAddForm() {
    const el = document.getElementById('pgList');
    el.innerHTML = `
      <div class="trx-section">
        <h4><i class="fas fa-plus"></i> Input Pengeluaran</h4>
        <div class="form-grid">
          <div class="form-group"><label>Tipe Pengeluaran</label>
            <select id="pgTipe">
              <option value="harian">Rutin (Harian)</option>
              <option value="bulanan">Bulanan</option>
            </select>
          </div>
          <div class="form-group"><label>Jumlah (Rp) *</label>
            <input type="number" id="pgJumlah" min="1000" step="1000" placeholder="0">
          </div>
          <div class="form-group full"><label>Keterangan *</label>
            <input type="text" id="pgKet" placeholder="Contoh: Beli plastik kresek, Bayar listrik bulan ini...">
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-outline btn-sm" onclick="Peng.renderTable()" style="width:auto"><i class="fas fa-times"></i> Batal</button>
          <button class="btn btn-primary btn-sm" id="pgSaveBtn" style="width:auto;min-width:140px"><i class="fas fa-paper-plane"></i> Ajukan</button>
        </div>
      </div>`;

    document.getElementById('pgSaveBtn').addEventListener('click', async () => {
      const tipe = document.getElementById('pgTipe').value;
      const jumlah = parseInt(document.getElementById('pgJumlah').value) || 0;
      const ket = document.getElementById('pgKet').value.trim();
      
      if (jumlah <= 0) { toast('Jumlah harus lebih dari 0', 'error'); return; }
      if (!ket) { toast('Keterangan wajib diisi', 'error'); return; }

      try {
        const nomor = await generateNomor('PG'); // ANTI DUPLIKAT
        await db.collection('pengeluaran').add({
          nomor, tipe, jumlah, keterangan: ket, tanggal: now(), 
          status: 'pending', karyawanId: currentUser?.email || ''
        });
        toast('Pengeluaran diajukan', 'success');
        renderTable();
      } catch (e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  async function approve(id) {
    if (!confirm('Setujui pengeluaran ini?')) return;
    try { 
      await db.collection('pengeluaran').doc(id).update({ 
        status: 'approved', approvedBy: currentUser?.email || '' 
      }); 
      toast('Disetujui', 'success'); 
    } catch (e) { toast('Gagal', 'error'); }
  }

  async function reject(id) {
    if (!confirm('Tolak pengeluaran ini?')) return;
    try { 
      await db.collection('pengeluaran').doc(id).update({ 
        status: 'rejected', rejectedBy: currentUser?.email || '' 
      }); 
      toast('Ditolak', 'warning'); 
    } catch (e) { toast('Gagal', 'error'); }
  }

  async function hapus(id) {
    if (!confirm('Hapus pengeluaran yang sudah disetujui?')) return;
    try { 
      await db.collection('pengeluaran').doc(id).delete(); 
      toast('Dihapus', 'success'); 
    } catch (e) { toast('Gagal: ' + e.message, 'error'); }
  }

  async function edit(id) {
    const p = allPengeluaran.find(x => x.id === id); 
    if (!p) return;
    
    const el = document.getElementById('pgList');
    el.innerHTML = `
      <div class="trx-section">
        <h4><i class="fas fa-edit"></i> Edit Pengeluaran</h4>
        <div class="form-grid">
          <div class="form-group"><label>Tipe</label>
            <input value="${p.tipe === 'harian' ? 'Rutin (Harian)' : 'Bulanan'}" readonly>
          </div>
          <div class="form-group"><label>Jumlah (Rp) *</label>
            <input type="number" id="pgEditJumlah" value="${p.jumlah}" min="0">
          </div>
          <div class="form-group full"><label>Keterangan *</label>
            <input type="text" id="pgEditKet" value="${escAttr(p.keterangan)}">
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-outline btn-sm" onclick="Peng.renderTable()" style="width:auto"><i class="fas fa-arrow-left"></i> Batal</button>
          <button class="btn btn-primary btn-sm" id="pgEditSaveBtn" style="width:auto;min-width:120px"><i class="fas fa-save"></i> Update</button>
        </div>
      </div>`;

    document.getElementById('pgEditSaveBtn').addEventListener('click', async () => {
      const j = parseInt(document.getElementById('pgEditJumlah').value) || 0;
      const k = document.getElementById('pgEditKet').value.trim();
      if (j <= 0 || !k) { toast('Data tidak valid', 'error'); return; }
      
      try { 
        await db.collection('pengeluaran').doc(id).update({ jumlah: j, keterangan: k }); 
        toast('Diperbarui', 'success'); renderTable(); 
      } catch (e) { toast('Gue gagal update: ' + e.message, 'error'); }
    });
  }

  window.Peng = { approve, reject, hapus, edit, renderTable };

  const obs = new MutationObserver(() => { 
    if (page.classList.contains('active')) render(); 
  });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
