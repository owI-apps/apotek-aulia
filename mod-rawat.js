registerModule('rawat', function() {
  const page = document.getElementById('page-rawat');
  let allPasien = [];
  let filterStatus = 'menunggu_obat';

  function render() {
    page.innerHTML = `
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="rjSearch" placeholder="Cari pasien, nomor..."></div>
        <select class="filter-select" id="rjFilter">
          <option value="menunggu_obat">Menunggu Obat</option>
          <option value="selesai">Selesai</option>
          <option value="">Semua</option>
        </select>
        <button class="btn btn-primary btn-sm" id="rjBtnAdd" style="width:auto"><i class="fas fa-plus"></i> Rawat Jalan Baru</button>
      </div>
      <div id="rjList"><div class="empty-state"><i class="fas fa-stethoscope"></i><p>Memuat data...</p></div></div>`;

    document.getElementById('rjSearch').addEventListener('input', renderList);
    document.getElementById('rjFilter').addEventListener('change', e => { filterStatus = e.target.value; renderList(); });
    document.getElementById('rjBtnAdd').addEventListener('click', showAddForm);

    loadPasien();
    startListener();
  }

  async function loadPasien() {
    try { const snap = await db.collection('pasien').get(); allPasien = snap.docs.map(d => ({id:d.id,...d.data()})); } catch(e) {}
  }

  function startListener() {
    db.collection('rawat_jalan').orderBy('tanggal','desc').onSnapshot(snap => {
      window._rawatList = snap.docs.map(d => ({id:d.id,...d.data()}));
      renderList();
    });
  }

  function renderList() {
    const list = window._rawatList || [];
    const search = (document.getElementById('rjSearch').value || '').toLowerCase();
    const filtered = list.filter(r => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (search && !(r.nomor||'').toLowerCase().includes(search) && !(r.pasienNama||'').toLowerCase().includes(search)) return false;
      return true;
    });
    const el = document.getElementById('rjList');
    if (!filtered.length) { el.innerHTML = `<div class="empty-state"><i class="fas fa-stethoscope"></i><p>Tidak ada data rawat jalan</p></div>`; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>No</th><th>Nomor</th><th>Pasien</th><th>Tindakan</th><th>Total</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>${filtered.map((r,i) => {
      const tind = [];
      if (r.tindakan) { if (r.tindakan.cek1) tind.push('Cek1'); if (r.tindakan.cek2) tind.push('Cek2'); if (r.tindakan.konsultasi) tind.push('Konsultasi'); }
      const statusClass = r.status === 'menunggu_obat' ? 'pill-menunggu' : 'pill-selesai';
      const statusText = r.status === 'menunggu_obat' ? 'Menunggu Obat' : 'Selesai';
      return `<tr><td>${i+1}</td><td style="font-family:var(--mono);font-size:12px;color:var(--purple)">${r.nomor||'-'}</td><td style="font-weight:500">${r.pasienNama||'-'}</td><td style="font-size:12px">${tind.join(', ')||'-'}</td><td class="num">Rp ${fmt(r.totalTindakan)}</td><td style="font-size:12px;color:var(--muted)">${fmtDate(r.tanggal)}</td><td><span class="pill ${statusClass}">${statusText}</span></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function showAddForm() {
    const el = document.getElementById('rjList');
    const psOptions = allPasien.map(p => `<option value="${p.id}">${p.noRM} — ${p.nama}</option>`).join('');
    el.innerHTML = `
      <div class="trx-section">
        <h4><i class="fas fa-user-plus"></i> Pasien</h4>
        <div class="form-group"><select id="rjPasien"><option value="">-- Pilih Pasien --</option>${psOptions}</select></div>
        <div style="margin-top:10px"><button class="btn btn-outline btn-xs" id="rjNewPs" style="width:auto"><i class="fas fa-user-plus"></i> Pasien Baru</button></div>
      </div>
      <div class="trx-section">
        <h4><i class="fas fa-stethoscope"></i> Tindakan</h4>
        <div class="cb-group">
          <label data-key="cek1"><input type="checkbox"> Cek 1 <span class="cb-price">Rp ${fmt(C.cek1)}</span></label>
          <label data-key="cek2"><input type="checkbox"> Cek 2 <span class="cb-price">Rp ${fmt(C.cek2)}</span></label>
          <label data-key="konsultasi"><input type="checkbox"> Konsultasi <span class="cb-price">Gratis</span></label>
        </div>
      </div>
      <div class="trx-section">
        <h4><i class="fas fa-notes-medical"></i> Catatan Dokter</h4>
        <textarea id="rjCatatan" rows="3" placeholder="Catatan pemeriksaan..." style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--fg);font-size:13px;resize:vertical;outline:none"></textarea>
      </div>
      <div style="display:flex;gap:10px"><button class="btn btn-outline btn-sm" id="rjCancel" style="width:auto"><i class="fas fa-times"></i> Batal</button><button class="btn btn-primary btn-sm" id="rjSave" style="width:auto;min-width:140px"><i class="fas fa-save"></i> Simpan Rawat Jalan</button></div>`;

    // Bind checkboxes
    const tindakan = { cek1: false, cek2: false, konsultasi: false };
    el.querySelectorAll('.cb-group label').forEach(lb => {
      const inp = lb.querySelector('input');
      inp.addEventListener('change', () => { tindakan[lb.dataset.key] = inp.checked; lb.classList.toggle('checked', inp.checked); });
    });

    document.getElementById('rjCancel').addEventListener('click', render);
    document.getElementById('rjNewPs').addEventListener('click', () => { navigateTo('pasien'); });
    document.getElementById('rjSave').addEventListener('click', async () => {
      const pasienId = document.getElementById('rjPasien').value;
      if (!pasienId) { toast('Pilih pasien', 'error'); return; }
      if (!tindakan.cek1 && !tindakan.cek2 && !tindakan.konsultasi) { toast('Pilih minimal 1 tindakan', 'error'); return; }
      const pasien = allPasien.find(p => p.id === pasienId);
      let total = 0;
      if (tindakan.cek1) total += C.cek1;
      if (tindakan.cek2) total += C.cek2;

      const ds = ts().toISOString().slice(0,10).replace(/-/g,'');
      const snap = await db.collection('rawat_jalan').where('nomor','>=','RJ-'+ds).where('nomor','<','RJ-'+ds+'Z').orderBy('nomor','desc').limit(1).get();
      const lastNum = snap.empty ? 0 : parseInt(snap.docs[0].data().nomor.slice(-4)) || 0;

      try {
        await db.collection('rawat_jalan').add({
          nomor: 'RJ-'+ds+'-'+String(lastNum+1).padStart(4,'0'),
          tanggal: now(),
          pasienId,
          pasienNama: pasien?.nama || '-',
          tindakan,
          totalTindakan: total,
          catatan: document.getElementById('rjCatatan').value.trim(),
          status: 'menunggu_obat',
          karyawanId: currentUser?.email || ''
        });
        toast('Rawat jalan disimpan — menunggu diproses di apotek', 'success');
        render();
      } catch(e) { toast('Gagal: ' + e.message, 'error'); }
    });
  }

  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
