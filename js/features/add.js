/** Menambahkan film ke daftar dan menjadi pintu masuk tombol tambah (film dan drama). */
import { $, pic, toast } from '../core/utils.js';
import { DEMO } from '../data/demo.js';
import { IMG } from '../core/config.js';
import { K } from '../core/keys.js';
import { addItem, save, state } from '../core/state.js';
import { omdb, tmdb } from '../core/api.js';
import { render } from '../ui/render.js';
import { openTvAdd } from './progress.js';
import { search } from './search.js';

let pendingBtn = null;

export async function onAdd(e) {
  const b = e.target.closest('button[data-id]');
  if (!b || b.disabled) return;
  const { s, t, id } = b.dataset;
  b.dataset.l = b.textContent;
  b.disabled = true;
  b.textContent = '…';
  pendingBtn = b;
  try {
    await (t === 'movie' ? addMovie(s, id) : openTvAdd(s, id));
  } catch (err) {
    toast(err.message);
    b.disabled = false;
    b.textContent = b.dataset.l;
  }
}

export function done_(s, t, id) {
  const b = document.querySelector(`#disc .go[data-s="${s}"][data-t="${t}"][data-id="${id}"]`);
  if (!b) return;
  if (s === 'tmdb') {
    b.disabled = true;
    b.textContent = '✓ Sudah';
  } else b.closest('.card').remove();
}

export async function addMovie(s, id, quiet) {
  let m;
  if (s === 'demo') {
    const d = DEMO.find(x => x.id === id);
    if (!d) throw new Error('Judul contoh tidak ditemukan');
    m = { title: d.name, year: d.y, poster: d.p, min: d.min };
  } else if (s === 'tmdb') {
    const d = await tmdb('/movie/' + id);
    m = {
      title: d.title,
      year: (d.release_date || '').slice(0, 4),
      poster: d.poster_path ? IMG + d.poster_path : null,
      min: d.runtime,
    };
  } else {
    const d = await omdb({ i: id });
    m = {
      title: d.Title,
      year: (d.Year || '').slice(0, 4),
      poster: pic(d.Poster),
      min: parseInt(d.Runtime, 10),
    };
  }
  if (!m.min) throw new Error('Durasi film ini tidak tersedia. Pakai “Tambah manual”.');
  addItem({
    key: K(s, 'movie', id),
    type: 'movie',
    title: m.title,
    year: m.year,
    poster: m.poster,
    minutes: m.min,
  });
  save();
  render();
  if (!quiet) {
    toast('Ditambahkan: ' + m.title);
    done_(s, 'movie', id);
    search($('#q').value.trim());
  }
  return state.items[0];
}

export function initAdd() {
  $('#res').onclick = onAdd;
  $('#disc').onclick = onAdd;
  $('#dTv').addEventListener('close', () => {
    const b = pendingBtn;
    if (
      b &&
      b.isConnected &&
      !state.items.some(i => i.key === K(b.dataset.s, b.dataset.t, b.dataset.id))
    ) {
      b.disabled = false;
      b.textContent = b.dataset.l || 'Sudah nonton';
    }
  });
}