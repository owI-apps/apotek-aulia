registerModule('rawat', function() {
  const page = document.getElementById('page-rawat');
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

    startListener();
  }

  function startListener() {
    db.collection('rawat_jalan').orderBy('tanggal', 'desc').onSnapshot(snap => {
      window._rawatList = snap.docs.map(d => ({id: d.id, ...d.data()}));
      renderList();
    }, err => console.error('Rawat listener error:', err));
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
    if (!filtered.length) {
      el.innerHTML = `<div class="empty-state"><i class="fas fa-stethoscope"></i><p>Tidak ada data rawat jalan</p></div>`;
      return;
    }

    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>No</th><th>Nomor</th><th>Pasien</th><th>Tindakan</th><th>Total</th><th>Tanggal</th><th>Status</th></tr></thead>
      <tbody>${filtered.map((r, i) => {
        const tind = [];
        if (r.tindakan) {
          if (r.tindakan.gula) tind.push('Gula');
          if (r.tindakan.asam) tind.push('Asam');
          if (r.tindakan.kolestrol) tind.push('Kolestrol');
          if (r.tindakan.nebu) tind.push('Nebu');
          if (r.tindakan.lainnya) tind.push('Lainnya');
        }
        const statusClass = r.status === 'menunggu_obat' ? 'pill-menunggu' : 'pill-selesai';
        const statusText = r.status === 'menunggu_obat' ? 'Menunggu Obat' : 'Selesai';
        return `<tr>
          <td>${i + 1}</td>
          <td style="font-family:var(--mono);font-size:12px;color:var(--purple)">${r.nomor||'-'}</td>
          <td style="font-weight:500">${r.pasienNama||'-'}</td>
          <td style="font-size:12px">${tind.join(', ')||'-'}</td>
          <td class="num">Rp ${fmt(r.totalTindakan)}</td>
          <td style="font-size:12px;color:var(--muted)">${fmtDate(r.tanggal)}</td>
          <td><span class="pill ${statusClass}">${statusText}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function showAddForm() {
    const el = document.getElementById('rjList');
    // OPTIMASI: Pakai global list, tidak query ulang ke Firestore
    const pasienGlobal = window._pasienList || [];
    const psOptions = pasienGlobal.map(p => `<option value="${p.id}">${p.noRM} — ${p.nama}</option>`).join('');
    
    el.innerHTML = `
      <div class="trx-section">
        <h4><i class="fas fa-user-plus"></i> Pasien</h4>
        <div class="form-group"><select id="rjPasien"><option value="">-- Pilih Pasien --</option>${psOptions}</select></div>
      </div>
      <div class="trx-section">
        <h4><i class="fas fa-stethoscope"></i> Tindakan Klinik (Update Baru)</h4>
        <div class="cb-group">
          <label data-key="gula"><input type="checkbox"> Cek Gula <span class="cb-price">Rp ${fmt(C.klinikGula)}</span></label>
          <label data-key="asam"><input type="checkbox"> Cek Asam Urat <span class="cb-price">Rp ${fmt(C.klinikAsam)}</span></label>
          <label data-key="kolestrol"><input type="checkbox"> Cek Kolestrol <span class="cb-price">Rp ${fmt(C.klinikKolestrol)}</span></label>
          <label data-key="nebu"><input type="checkbox"> Tindakan Nebu <span class="cb-price">Rp ${fmt(C.klinikNebu)}</span></label>
          <label data-key="lainnya"><input type="checkbox"> Tindakan Lainnya <span class="cb-price">Rp ${fmt(C.klinikLainnya)}</span></label>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-sm" id="rjCancel" style="width:auto"><i class="fas fa-times"></i> Batal</button>
        <button class="btn btn-primary btn-sm" id="rjSave" style="width:auto;min-width:140px"><i class="fas fa-save"></i> Simpan Rawat Jalan</button>
      </div>`;

    const tindakan = { gula: false, asam: false, kolestrol: false, nebu: false, lainnya: false };
    
    el.querySelectorAll('.cb-group label').forEach(lb => {
      const inp = lb.querySelector('input');
      inp.addEventListener('change', () => {
        tindakan[lb.dataset.key] = inp.checked;
        lb.classList.toggle('checked', inp.checked);
      });
    });

    document.getElementById('rjCancel').addEventListener('click', render);
    
    document.getElementById('rjSave').addEventListener('click', async () => {
      const pasienId = document.getElementById('rjPasien').value;
      if (!pasienId) { toast('Pilih pasien', 'error'); return; }
      if (!Object.values(tindakan).some(v => v)) { toast('Pilih minimal 1 tindakan', 'error'); return; }
      
      const pasien = pasienGlobal.find(p => p.id === pasienId); 
      let total = 0;
      if (tindakan.gula) total += C.klinikGula;
      if (tindakan.asam) total += C.klinikAsam;
      if (tindakan.kolestrol) total += C.klinikKolestrol;
      if (tindakan.nebu) total += C.klinikNebu;
      if (tindakan.lainnya) total += C.klinikLainnya;

      try {
        // ANTI DUPLIKAT NOMOR
        const nomor = await generateNomor('RJ');
        await db.collection('rawat_jalan').add({
          nomor, tanggal: now(), pasienId, pasienNama: pasien?.nama || '-',
          tindakan, totalTindakan: total, status: 'menunggu_obat',
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
