/** Modal detail judul. */
import { $, esc, pic, toast } from '../core/utils.js';
import { DEMO } from '../data/demo.js';
import { IMG } from '../core/config.js';
import { K } from '../core/keys.js';
import { getJSON, omdb, tmdb } from '../core/api.js';
import { onAdd } from './add.js';
import { state } from '../core/state.js';

async function detail(s, t, id) {
  const R = (a, b) => (b ? [a, b] : null),
    ok = v => (v && v !== 'N/A' ? v : '');
  if (s === 'demo') {
    const d = DEMO.find(x => x.id === id);
    if (!d) throw new Error('Judul contoh tidak ditemukan');
    const ep = d.t === 'tv' ? d.seasons.reduce((a, b) => a + b, 0) : 0;
    return {
      title: d.name,
      poster: d.p,
      meta: [
        d.y,
        d.t === 'movie' ? d.min + ' menit' : `${d.seasons.length} season · ${ep} episode`,
        '★ ' + d.rating,
      ],
      genres: d.genres,
      overview: d.ov + ' (Sinopsis contoh.)',
      rows: [
        R('Sumber', 'Data contoh (dummy)'),
        R(d.t === 'movie' ? 'Sutradara' : 'Pembuat', d.by),
        R('Pemeran', d.cast),
      ],
    };
  }
  if (s === 'tmdb') {
    const d = await tmdb(`/${t}/${id}`, { append_to_response: 'credits' }),
      cr = d.credits || {};
    if (!d.overview) {
      try {
        d.overview = (await tmdb(`/${t}/${id}`, { language: 'en-US' })).overview;
      } catch (e) {}
    }
    const dir =
      t === 'movie'
        ? (cr.crew || [])
            .filter(c => c.job === 'Director')
            .map(c => c.name)
            .join(', ')
        : (d.created_by || []).map(c => c.name).join(', ');
    return {
      title: d.title || d.name,
      poster: d.poster_path ? IMG + d.poster_path : null,
      meta: [
        (d.release_date || d.first_air_date || '').slice(0, 4),
        t === 'movie'
          ? d.runtime
            ? d.runtime + ' menit'
            : ''
          : d.number_of_seasons
            ? `${d.number_of_seasons} season · ${d.number_of_episodes} episode`
            : '',
        d.vote_average ? '★ ' + d.vote_average.toFixed(1) : '',
      ],
      genres: (d.genres || []).map(g => g.name),
      overview: d.overview || d.tagline || '',
      rows: [
        R(t === 'movie' ? 'Sutradara' : 'Pembuat', dir),
        R(
          'Pemeran',
          (cr.cast || [])
            .slice(0, 6)
            .map(c => c.name)
            .join(', ')
        ),
        R('Status', d.status),
        R('Jaringan', (d.networks || []).map(n => n.name).join(', ')),
      ],
    };
  }
  if (s === 'omdb') {
    const d = await omdb({ i: id, plot: 'full' });
    return {
      title: d.Title,
      poster: pic(d.Poster),
      meta: [ok(d.Year), ok(d.Runtime), ok(d.imdbRating) ? '★ ' + d.imdbRating : '', ok(d.Rated)],
      genres: ok(d.Genre) ? d.Genre.split(', ') : [],
      overview: ok(d.Plot),
      rows: [
        R('Sutradara', ok(d.Director)),
        R('Pemeran', ok(d.Actors)),
        R('Negara', ok(d.Country)),
        R('Bahasa', ok(d.Language)),
      ],
    };
  }
  const d = await getJSON('https://api.tvmaze.com/shows/' + id),
    rt = d.averageRuntime || d.runtime;
  return {
    title: d.name,
    poster: pic(d.image && (d.image.original || d.image.medium)),
    meta: [
      (d.premiered || '').slice(0, 4),
      rt ? rt + ' menit/episode' : '',
      d.rating && d.rating.average ? '★ ' + d.rating.average : '',
    ],
    genres: d.genres || [],
    overview: new DOMParser().parseFromString(d.summary || '', 'text/html').body.textContent,
    rows: [
      R('Status', d.status),
      R('Jaringan', (d.network && d.network.name) || (d.webChannel && d.webChannel.name)),
      R('Bahasa', d.language),
    ],
  };
}

export async function openDetail(s, t, id) {
  const dlg = $('#dDet'),
    a = $('#dAdd');
  $('#dTi').textContent = 'Memuat…';
  $('#dMeta').textContent = '';
  $('#dGen').innerHTML = '';
  $('#dOv').textContent = '';
  $('#dRows').innerHTML = '';
  $('#dImg').innerHTML = '<div class="ph"></div>';
  a.hidden = true;
  dlg.showModal();
  let x;
  try {
    x = await detail(s, t, id);
  } catch (e) {
    dlg.close();
    toast(e.message);
    return;
  }
  $('#dImg').innerHTML = x.poster
    ? `<img src="${esc(x.poster)}" alt="">`
    : '<div class="ph"></div>';
  $('#dTi').textContent = x.title;
  $('#dMeta').textContent = x.meta.filter(Boolean).join(' · ');
  $('#dGen').innerHTML = x.genres.map(g => `<span>${esc(g)}</span>`).join('');
  $('#dOv').textContent = x.overview || 'Sinopsis belum tersedia untuk judul ini.';
  $('#dRows').innerHTML = x.rows
    .filter(Boolean)
    .map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`)
    .join('');
  const done = state.items.some(i => i.key === K(s, t, id));
  Object.assign(a.dataset, { s, t, id });
  a.hidden = false;
  a.disabled = done;
  a.textContent = done ? '✓ Sudah ditonton' : 'Sudah nonton';
}

export function initDetail() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-d]');
    if (!el) return;
    const [s, t, id] = el.dataset.d.split('|');
    openDetail(s, t, id);
  });
  $('#dClose').onclick = () => $('#dDet').close();
  $('#dAdd').onclick = e => {
    $('#dDet').close();
    onAdd(e);
  };
  document.querySelectorAll('dialog').forEach(d =>
    d.addEventListener('click', e => {
      if (e.target === d) d.close();
    })
  );
}
