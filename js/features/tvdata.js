/** Memuat struktur drama (durasi tiap episode per season) dari sumber datanya. */
import { DEMO } from '../data/demo.js';
import { IMG } from '../core/config.js';
import { getJSON, tmdb } from '../core/api.js';
import { pic } from '../core/utils.js';

/**
 * @returns {Promise<{title:string, year:string, poster:string|null, seasons:{n:number, r:number[]}[]}>}
 */
export async function loadTvStructure(s, id) {
  let out;
  if (s === 'demo') {
    const d = DEMO.find(x => x.id === id);
    if (!d) throw new Error('Judul contoh tidak ditemukan');
    out = {
      title: d.name,
      year: d.y,
      poster: d.p,
      seasons: d.seasons.map((c, i) => ({ n: i + 1, r: Array(c).fill(d.rt) })),
    };
  } else if (s === 'tmdb') {
    const d = await tmdb('/tv/' + id);
    const avg = (d.episode_run_time && d.episode_run_time[0]) || 45;
    const list = d.seasons.filter(x => x.season_number > 0 && x.episode_count > 0);
    const seasons = await Promise.all(
      list.map(async x => {
        try {
          const sd = await tmdb(`/tv/${id}/season/${x.season_number}`);
          if (sd.episodes && sd.episodes.length) {
            return { n: x.season_number, r: sd.episodes.map(e => e.runtime || avg) };
          }
        } catch (e) {}
        return { n: x.season_number, r: Array(x.episode_count).fill(avg) };
      })
    );
    out = {
      title: d.name,
      year: (d.first_air_date || '').slice(0, 4),
      poster: d.poster_path ? IMG + d.poster_path : null,
      seasons,
    };
  } else {
    const show = await getJSON(`https://api.tvmaze.com/shows/${id}?embed=episodes`);
    const avg = show.averageRuntime || show.runtime || 45;
    const by = {};
    ((show._embedded && show._embedded.episodes) || []).forEach(e =>
      (by[e.season] = by[e.season] || []).push(e.runtime || avg)
    );
    out = {
      title: show.name,
      year: (show.premiered || '').slice(0, 4),
      poster: pic(show.image && show.image.medium),
      seasons: Object.keys(by)
        .map(Number)
        .sort((a, b) => a - b)
        .map(n => ({ n, r: by[n] })),
    };
  }
  if (!out.seasons.length) throw new Error('Data episode belum tersedia. Pakai “Tambah manual”.');
  return out;
}