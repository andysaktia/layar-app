/** Menambahkan film dan drama ke daftar (termasuk pilihan season). */
import { $, pic, toast } from '../core/utils.js';
import { DEMO } from '../data/demo.js';
import { IMG } from '../core/config.js';
import { K } from '../core/keys.js';
import { addItem, save, state } from '../core/state.js';
import { getJSON, omdb, tmdb } from '../core/api.js';
import { render } from '../ui/render.js';
import { search } from './search.js';

let pendingBtn = null;

let pendingTv = null;

export async function onAdd(e) {
  const b = e.target.closest('button[data-id]');
  if (!b || b.disabled) return;
  const { s, t, id } = b.dataset;
  b.dataset.l = b.textContent;
  b.disabled = true;
  b.textContent = '…';
  pendingBtn = b;
  try {
    await (t === 'movie' ? addMovie(s, id) : openTv(s, id));
  } catch (err) {
    toast(err.message);
    b.disabled = false;
    b.textContent = b.dataset.l;
  }
}

function done_(s, t, id) {
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

export async function openTv(s, id, silent) {
  if (s === 'demo') {
    const d = DEMO.find(x => x.id === id);
    if (!d) throw new Error('Judul contoh tidak ditemukan');
    pendingTv = {
      s,
      id,
      key: K(s, 'tv', id),
      title: d.name,
      year: d.y,
      poster: d.p,
      seasons: d.seasons.map((c, i) => ({ n: i + 1, c })),
      calc: ns => ({
        min: ns.reduce((a, n) => a + d.seasons[n - 1] * d.rt, 0),
        eps: ns.reduce((a, n) => a + d.seasons[n - 1], 0),
      }),
    };
  } else if (s === 'tmdb') {
    const d = await tmdb('/tv/' + id),
      avg = (d.episode_run_time && d.episode_run_time[0]) || 45;
    pendingTv = {
      s,
      id,
      key: K(s, 'tv', id),
      title: d.name,
      year: (d.first_air_date || '').slice(0, 4),
      poster: d.poster_path ? IMG + d.poster_path : null,
      seasons: d.seasons
        .filter(x => x.season_number > 0 && x.episode_count > 0)
        .map(x => ({ n: x.season_number, c: x.episode_count })),
      calc: async ns => {
        let min = 0,
          eps = 0;
        (await Promise.all(ns.map(n => tmdb(`/tv/${id}/season/${n}`)))).forEach(x =>
          x.episodes.forEach(e => {
            min += e.runtime || avg;
            eps++;
          })
        );
        return { min, eps };
      },
    };
  } else {
    const show = await getJSON(`https://api.tvmaze.com/shows/${id}?embed=episodes`),
      by = {},
      avg = show.averageRuntime || show.runtime || 45;
    ((show._embedded && show._embedded.episodes) || []).forEach(e =>
      (by[e.season] = by[e.season] || []).push(e)
    );
    pendingTv = {
      s,
      id,
      key: K(s, 'tv', id),
      title: show.name,
      year: (show.premiered || '').slice(0, 4),
      poster: pic(show.image && show.image.medium),
      seasons: Object.keys(by)
        .map(Number)
        .sort((a, b) => a - b)
        .map(n => ({ n, c: by[n].length })),
      calc: ns => {
        let min = 0,
          eps = 0;
        ns.forEach(n =>
          by[n].forEach(e => {
            min += e.runtime || avg;
            eps++;
          })
        );
        return { min, eps };
      },
    };
  }
  if (!pendingTv.seasons.length)
    throw new Error('Data episode belum tersedia. Pakai “Tambah manual”.');
  if (silent) return pendingTv;
  $('#tvT').textContent = pendingTv.title;
  $('#seas').innerHTML = pendingTv.seasons
    .map(
      x =>
        `<label><input type="checkbox" checked value="${x.n}" data-e="${x.c}"> Season ${x.n} · ${x.c} episode</label>`
    )
    .join('');
  sumTv();
  $('#dTv').showModal();
}

function sumTv() {
  const c = [...document.querySelectorAll('#seas input:checked')];
  $('#tvSum').textContent = c.length
    ? `${c.length} season · ${c.reduce((a, x) => a + +x.dataset.e, 0)} episode dipilih`
    : 'Pilih minimal satu season.';
  $('#tvOk').disabled = !c.length;
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
  $('#seas').onchange = sumTv;
  $('#tvX').onclick = () => {
    $('#dTv').close();
    search($('#q').value.trim());
  };
  $('#tvOk').onclick = async () => {
    const p = pendingTv,
      ns = [...document.querySelectorAll('#seas input:checked')].map(x => +x.value),
      btn = $('#tvOk');
    btn.disabled = true;
    btn.textContent = 'Menghitung…';
    try {
      const r = await p.calc(ns);
      addItem({
        key: p.key,
        type: 'tv',
        title: p.title,
        year: p.year,
        poster: p.poster,
        minutes: r.min,
        eps: r.eps,
      });
      save();
      render();
      toast('Ditambahkan: ' + p.title);
      $('#dTv').close();
      done_(p.s, 'tv', p.id);
      search($('#q').value.trim());
    } catch (err) {
      toast(err.message);
    }
    btn.textContent = 'Tandai ditonton';
    btn.disabled = false;
  };
}
