/** Halaman Jelajah: filter, urutan, genre, dan halaman. */
import { $, W, esc, nf, pic, rnd, shuffle } from '../core/utils.js';
import { IMG, WORDS } from '../core/config.js';
import { K } from '../core/keys.js';
import { demoMode, discoverDemo } from '../data/demo.js';
import { getJSON, omdb, tmdb } from '../core/api.js';
import { state } from '../core/state.js';

export let dMode = 'mix',
  dSort = 'new',
  dGenre = '',
  dPage = 1,
  dTotal = 1;

export function resetExplore() {
  dGenre = '';
  dPage = 1;
}

export function setExploreMode(m) {
  dMode = m;
}

const tvCache = {},
  genres = {};

export async function loadGenres() {
  const t = dMode === 'movie' ? 'movie' : 'tv';
  if (!genres[t]) genres[t] = (await tmdb('/genre/' + t + '/list')).genres;
  $('#gSel').innerHTML =
    '<option value="">Semua genre</option>' +
    genres[t].map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
  $('#gSel').value = dGenre;
}

async function discoverTmdb() {
  const t = dMode === 'movie' ? 'movie' : 'tv',
    dt = t === 'movie' ? 'primary_release_date' : 'first_air_date',
    today = new Date().toISOString().slice(0, 10);
  const p = {
    include_adult: 'false',
    page: dSort === 'rand' ? 1 + Math.floor(Math.random() * 15) : dPage,
  };
  if (dGenre) p.with_genres = dGenre;
  if (dSort === 'new') {
    p.sort_by = dt + '.desc';
    p[dt + '.lte'] = today;
    p['vote_count.gte'] = t === 'movie' ? 5 : 2;
  } else if (dSort === 'top') {
    p.sort_by = 'vote_average.desc';
    p['vote_count.gte'] = t === 'movie' ? 500 : 200;
  } else p.sort_by = 'popularity.desc';
  let d = await tmdb('/discover/' + t, p);
  if (!d.results.length && dSort === 'rand') {
    p.page = 1;
    d = await tmdb('/discover/' + t, p);
  }
  dTotal = Math.min(d.total_pages || 1, 500);
  let rs = d.results.filter(x => x.poster_path);
  if (dSort === 'rand') rs = shuffle(rs).slice(0, 12);
  return rs.map(x => ({
    s: 'tmdb',
    t,
    id: x.id,
    name: x.title || x.name,
    y: (x.release_date || x.first_air_date || '').slice(0, 4),
    p: IMG + x.poster_path,
    done: state.items.some(i => i.key === K('tmdb', t, x.id)),
  }));
}

export async function randTv(want, n) {
  let ok = [];
  for (let t = 0; t < 4 && ok.length < n; t++) {
    const p = Math.floor(Math.random() * 50);
    if (!tvCache[p]) tvCache[p] = await getJSON('https://api.tvmaze.com/shows?page=' + p);
    ok = ok.concat(
      tvCache[p].filter(
        s =>
          s.image &&
          s.type === 'Scripted' &&
          s.rating &&
          s.rating.average >= 7.5 &&
          !want.has('tv-' + s.id)
      )
    );
  }
  return shuffle(ok)
    .slice(0, n)
    .map(s => ({
      s: 'tvmaze',
      t: 'tv',
      id: s.id,
      name: s.name,
      y: (s.premiered || '').slice(0, 4),
      p: pic(s.image.medium),
    }));
}

export async function randMv(want, n) {
  for (let t = 0; t < 4; t++) {
    try {
      const d = await omdb({
        s: rnd(WORDS),
        type: 'movie',
        page: 1 + Math.floor(Math.random() * 3),
      });
      const ok = d.Search.filter(m => pic(m.Poster) && !want.has('movie-' + m.imdbID));
      if (ok.length)
        return shuffle(ok)
          .slice(0, n)
          .map(m => ({
            s: 'omdb',
            t: 'movie',
            id: m.imdbID,
            name: m.Title,
            y: m.Year,
            p: pic(m.Poster),
          }));
    } catch (e) {
      if (!/not found/i.test(e.message)) throw e;
    }
  }
  return [];
}

async function discoverFallback(setMsg) {
  const want = new Set(state.items.map(i => i.key)),
    mv = dMode !== 'tv',
    tv = dMode !== 'movie',
    n = dMode === 'mix' ? 6 : 12,
    out = [];
  await Promise.all([
    tv
      ? randTv(want, n)
          .then(a => out.push(...a))
          .catch(() => setMsg('Drama gagal dimuat. Cek koneksi internet.'))
      : 0,
    mv && state.omdbKey
      ? randMv(want, n)
          .then(a => out.push(...a))
          .catch(e => setMsg('Film: ' + e.message))
      : 0,
  ]);
  if (mv && !state.omdbKey)
    setMsg(
      tv
        ? 'Hanya drama yang tampil. Isi OMDb key di Pengaturan untuk ikut menampilkan film.'
        : 'Film acak butuh OMDb key. Isi di Pengaturan.'
    );
  return shuffle(out);
}

const dCard = r => {
  const dd = `${r.s}|${r.t}|${r.id}`;
  return `<article class="card disc">${W(dd, r.p ? `<img loading="lazy" src="${esc(r.p)}" alt="">` : `<div class="ph">${esc(r.name)}</div>`, r.name)}
  <span class="tag ${r.t === 'tv' ? 'tv' : 'mv'}">${r.t === 'tv' ? 'Drama' : 'Film'}</span>
  <div class="m"><h3><button class="ttl" data-d="${dd}">${esc(r.name)}</button></h3><p>${esc(r.y)}</p></div>
  <button class="go" data-s="${r.s}" data-t="${r.t}" data-id="${esc(r.id)}" ${r.done ? 'disabled' : ''}>${r.done ? '✓ Sudah' : 'Sudah nonton'}</button></article>`;
};

function syncUI() {
  if (state.tmdbKey && dMode === 'mix') dMode = 'tv';
  $('#tf').hidden = !state.tmdbKey;
  $('[data-m=mix]').hidden = !!state.tmdbKey;
  document
    .querySelectorAll('[data-m]')
    .forEach(x => x.setAttribute('aria-pressed', x.dataset.m === dMode));
  document
    .querySelectorAll('[data-o]')
    .forEach(x => x.setAttribute('aria-pressed', x.dataset.o === dSort));
  $('#shuf').hidden = !!state.tmdbKey && dSort !== 'rand';
}

export async function discover() {
  syncUI();
  const box = $('#disc');
  let out = [],
    msg = '';
  box.innerHTML = '<div class="empty" style="grid-column:1/-1">Memuat…</div>';
  try {
    out = demoMode()
      ? discoverDemo()
      : state.tmdbKey
        ? await discoverTmdb()
        : await discoverFallback(m => (msg = m));
  } catch (e) {
    msg = e.message;
  }
  $('#dh').textContent =
    msg ||
    (demoMode()
      ? 'Mode Contoh: data dummy, bukan dari internet. Isi API key di Pengaturan untuk data asli.'
      : state.tmdbKey
        ? ''
        : 'Ingin filter genre, urutan Terbaru, dan nomor halaman? Isi TMDB key di Pengaturan (gratis).');
  $('#dh').className = 'hint' + (msg ? ' err' : '');
  box.innerHTML = out.length
    ? out.map(dCard).join('')
    : `<div class="empty" style="grid-column:1/-1">${msg ? 'Gagal memuat.' : 'Tidak ada hasil untuk filter ini.'}</div>`;
  $('#pg').hidden = !(state.tmdbKey && dSort !== 'rand' && dTotal > 1);
  $('#pn').textContent = `Halaman ${dPage} dari ${nf(dTotal)}`;
  $('#pp').disabled = dPage <= 1;
  $('#pnx').disabled = dPage >= dTotal;
}

const go = d => {
  dPage += d;
  discover();
  $('#dsec').scrollIntoView();
};

export function initExplore() {
  $('#shuf').onclick = discover;
  document.querySelectorAll('[data-m]').forEach(
    t =>
      (t.onclick = async () => {
        dMode = t.dataset.m;
        dGenre = '';
        dPage = 1;
        if (state.tmdbKey) await loadGenres().catch(() => {});
        discover();
      })
  );
  document.querySelectorAll('[data-o]').forEach(
    t =>
      (t.onclick = () => {
        dSort = t.dataset.o;
        dPage = 1;
        discover();
      })
  );
  $('#gSel').onchange = e => {
    dGenre = e.target.value;
    dPage = 1;
    discover();
  };
  $('#pp').onclick = () => go(-1);
  $('#pnx').onclick = () => go(1);
}
