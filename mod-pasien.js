registerModule('pasien', function() {
  const page = document.getElementById('page-pasien');
  let allPasien = [];
  const canWrite = userRole === 'klinik' || userRole === 'admin';

  function render() {
    page.innerHTML = `
      <div class="obat-toolbar">
        <div class="search-box"><i class="fas fa-search"></i><input type="text" id="psSearch" placeholder="Cari nama, No. RM, telepon..."></div>
        ${canWrite ? '<button class="btn btn-primary btn-sm" id="psBtnAdd" style="width:auto"><i class="fas fa-user-plus"></i> Tambah Pasien</button>' : ''}
      </div>
      <div class="table-wrap"><div style="overflow-x:auto"><table>
        <thead><tr><th>No</th><th>No. RM</th><th>Nama</th><th>JK</th><th>No. KTP</th><th>Telepon</th><th>Alergi</th>${canWrite ? '<th>Aksi</th>' : ''}</tr></thead>
        <tbody id="psBody"><tr><td colspan="${canWrite?8:7}"><div class="empty-state"><i class="fas fa-user-injured"></i><p>Memuat...</p></div></td></tr></tbody>
      </table></div>
      <div class="table-footer"><span id="psCount">0 data</span></div></div>`;

    document.getElementById('psSearch').addEventListener('input', renderTable);
    if (canWrite) document.getElementById('psBtnAdd').addEventListener('click', openAdd);
    startListener();
  }

  function startListener() {
    db.collection('pasien').orderBy('noRM','desc').onSnapshot(snap => {
      allPasien = snap.docs.map(d => ({id:d.id,...d.data()}));
      renderTable();
    });
  }

  function renderTable() {
    const s = (document.getElementById('psSearch').value||'').toLowerCase();
    const f = allPasien.filter(p => { if (!s) return true; return (p.noRM||'').toLowerCase().includes(s)||(p.nama||'').toLowerCase().includes(s)||(p.telepon||'').includes(s); });
    document.getElementById('psCount').textContent = f.length + ' data';
    const tb = document.getElementById('psBody');
    if (!f.length) { tb.innerHTML = `<tr><td colspan="${canWrite?8:7}"><div class="empty-state"><i class="fas fa-user-injured"></i><p>${allPasien.length?'Tidak ditemukan.':'Belum ada data pasien.'}</p></div></td></tr>`; return; }
    tb.innerHTML = f.map((p,i) => `<tr><td>${i+1}</td><td style="font-family:var(--mono);font-size:12px;color:var(--accent)">${p.noRM||'-'}</td><td style="font-weight:500">${p.nama||'-'}</td><td style="font-size:12px">${p.jenisKelamin||'-'}</td><td style="font-family:var(--mono);font-size:12px">${p.nik||'-'}</td><td style="font-size:12px">${p.telepon||'-'}</td><td style="font-size:11px;color:var(--danger);max-width:120px;overflow:hidden;text-overflow:ellipsis">${(p.alergi||[]).join(', ')||'-'}</td>${canWrite?`<td class="actions"><button class="btn btn-outline btn-xs" onclick="PS.edit('${p.id}')"><i class="fas fa-edit"></i></button><button class="btn btn-danger btn-xs" onclick="PS.hapus('${p.id}','${escAttr(p.nama)}')"><i class="fas fa-trash"></i></button></td>`:''}</tr>`).join('');
  }

  async function openAdd() {
    document.getElementById('modalPsTitle').textContent = 'Tambah Pasien';
    document.getElementById('psEditId').value = '';
    let nx = 1;
    try { const sp = await db.collection('pasien').orderBy('noRM','desc').limit(1).get(); if (!sp.empty) nx = (parseInt(sp.docs[0].data().noRM.replace('RM-',''))||0)+1; } catch(e) {}
    document.getElementById('psNoRM').value = 'RM-'+String(nx).padStart(4,'0');
    ['psNama','psNIK','psLahir','psTelp','psAlamat','psAlergi','psCatatan'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('psJK').selectedIndex = 0;
    openModal('modalPasien');
    document.getElementById('psNama').focus();
  }

  function edit(id) {
    const p = allPasien.find(x => x.id === id); if (!p) return;
    document.getElementById('modalPsTitle').textContent = 'Edit Pasien';
    document.getElementById('psEditId').value = p.id;
    document.getElementById('psNoRM').value = p.noRM||'';
    document.getElementById('psNama').value = p.nama||'';
    document.getElementById('psNIK').value = p.nik||'';
    document.getElementById('psLahir').value = p.tanggalLahir||'';
    setSel('psJK', p.jenisKelamin);
    document.getElementById('psTelp').value = p.telepon||'';
    document.getElementById('psAlamat').value = p.alamat||'';
    document.getElementById('psAlergi').value = (p.alergi||[]).join(', ');
    document.getElementById('psCatatan').value = p.catatan||'';
    openModal('modalPasien');
  }

  async function hapus(id, nama) { if (!confirm(`Hapus "${nama}"?`)) return; try { await db.collection('pasien').doc(id).delete(); toast('Dihapus','success'); } catch(e) { toast('Gagal: '+e.message,'error'); } }

  // Expose globally for inline onclick
  window.PS = { edit, hapus };

  // Save handler
  document.getElementById('psBtnSave').addEventListener('click', async () => {
    const eid = document.getElementById('psEditId').value;
    const d = {
      noRM: document.getElementById('psNoRM').value,
      nama: document.getElementById('psNama').value.trim(),
      nik: document.getElementById('psNIK').value.trim(),
      tanggalLahir: document.getElementById('psLahir').value,
      jenisKelamin: document.getElementById('psJK').value,
      telepon: document.getElementById('psTelp').value.trim(),
      alamat: document.getElementById('psAlamat').value.trim(),
      alergi: document.getElementById('psAlergi').value.split(',').map(s=>s.trim()).filter(Boolean),
      catatan: document.getElementById('psCatatan').value.trim()
    };
    if (!d.nama) { toast('Nama wajib diisi','error'); return; }
    try {
      if (eid) { await db.collection('pasien').doc(eid).update(d); toast('Diperbarui','success'); }
      else { d.createdAt = now(); await db.collection('pasien').add(d); toast('Ditambahkan','success'); }
      closeModal('modalPasien');
    } catch(e) { toast('Gagal: '+e.message,'error'); }
  });

  const obs = new MutationObserver(() => { if (page.classList.contains('active')) render(); });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
});
