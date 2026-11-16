/** Halaman Cari dan riwayat pencarian. */
import { $, W, esc, pic } from '../core/utils.js';
import { DEMO, demoCard, demoMode } from '../data/demo.js';
import { K } from '../core/keys.js';
import { getJSON, omdb } from '../core/api.js';
import { state } from '../core/state.js';

let recents = [];

try {
  recents = JSON.parse(localStorage.getItem('layar.rc') || '[]');
} catch (e) {}

function addRecent(v) {
  recents = [v, ...recents.filter(x => x.toLowerCase() !== v.toLowerCase())].slice(0, 6);
  try {
    localStorage.setItem('layar.rc', JSON.stringify(recents));
  } catch (e) {}
  renderRecent();
}

export function renderRecent() {
  $('#recent').innerHTML = recents
    .map(r => `<button class="tab" data-rc="${esc(r)}">${esc(r)}</button>`)
    .join('');
}

let timer;

function hint(t, err) {
  const h = $('#hint');
  h.textContent = t;
  h.className = 'hint' + (err ? ' err' : '');
}

export function setHint() {
  hint(
    demoMode()
      ? 'Mode Contoh: cari di antara judul dummy, mis. “kopi” atau “kota”.'
      : state.omdbKey
        ? 'Ketik judul lalu pilih hasilnya.'
        : 'Drama/serial sudah bisa dicari. Untuk film, isi OMDb key di Pengaturan, atau pakai “Tambah manual”.'
  );
}

export async function search(v) {
  if (!v) return;
  hint('Mencari…');
  if (demoMode()) {
    const q = v.toLowerCase(),
      rs = DEMO.filter(d => d.name.toLowerCase().includes(q))
        .slice(0, 10)
        .map(demoCard);
    if (rs.length) addRecent(v);
    hint(
      rs.length
        ? 'Mode Contoh: hasil dari data dummy.'
        : 'Tidak ada judul contoh yang cocok. Coba “kopi” atau “kota”.'
    );
    showRows(rs);
    return;
  }
  let msg = '';
  const [tv, mv] = await Promise.all([
    getJSON('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(v)).catch(() => {
      msg = 'Pencarian drama gagal. Cek koneksi internet.';
      return [];
    }),
    state.omdbKey
      ? omdb({ s: v, type: 'movie' })
          .then(d => d.Search)
          .catch(e => {
            if (!/not found/i.test(e.message)) msg = 'OMDb: ' + e.message;
            return [];
          })
      : [],
  ]);
  const rs = [
    ...mv.slice(0, 5).map(m => ({
      s: 'omdb',
      t: 'movie',
      id: m.imdbID,
      name: m.Title,
      y: m.Year,
      p: pic(m.Poster),
    })),
    ...tv.slice(0, 6).map(x => ({
      s: 'tvmaze',
      t: 'tv',
      id: x.show.id,
      name: x.show.name,
      y: (x.show.premiered || '').slice(0, 4),
      p: pic(x.show.image && x.show.image.medium),
    })),
  ];
  if (rs.length) addRecent(v);
  hint(
    msg ||
      (rs.length
        ? state.omdbKey
          ? ''
          : 'Hasil film tidak muncul karena OMDb key belum diisi.'
        : 'Tidak ada hasil. Coba ejaan lain atau judul aslinya.'),
    !!msg
  );
  showRows(rs);
}

function showRows(rs) {
  $('#res').innerHTML = rs
    .map(r => {
      const done = state.items.some(i => i.key === K(r.s, r.t, r.id)),
        dd = `${r.s}|${r.t}|${r.id}`;
      return `<div class="row">${W(dd, r.p ? `<img src="${esc(r.p)}" alt="">` : '<div class="ph"></div>', r.name)}
    <div class="in"><h3><button class="ttl" data-d="${dd}">${esc(r.name)}</button></h3><p>${r.t === 'tv' ? 'Drama / Serial' : 'Film'}${r.y ? ' · ' + esc(r.y) : ''}</p></div>
    <button class="btn ${done ? '' : 'pri'} sm" data-s="${r.s}" data-t="${r.t}" data-id="${esc(r.id)}" ${done ? 'disabled' : ''}>${done ? '✓ Sudah' : 'Tandai ditonton'}</button></div>`;
    })
    .join('');
}

export function initSearch() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rc]');
    if (!b) return;
    $('#q').value = b.dataset.rc;
    $('#recent').hidden = true;
    search(b.dataset.rc);
  });
  $('#q').oninput = e => {
    clearTimeout(timer);
    const v = e.target.value.trim();
    $('#recent').hidden = v.length >= 2;
    if (v.length < 2) {
      $('#res').innerHTML = '';
      setHint();
      return;
    }
    timer = setTimeout(() => search(v), 350);
  };
}
