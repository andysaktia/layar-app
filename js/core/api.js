/** Klien API pihak ketiga (TVmaze, OMDb, TMDB). */
import { state } from './state.js';

export async function getJSON(u) {
  const r = await fetch(u);
  if (!r.ok) throw new Error('Gagal menghubungi server (' + r.status + ')');
  return r.json();
}

export async function omdb(p) {
  const u = new URL('https://www.omdbapi.com/');
  u.searchParams.set('apikey', state.omdbKey);
  Object.entries(p).forEach(([k, v]) => u.searchParams.set(k, v));
  const d = await getJSON(u);
  if (d.Response === 'False') throw new Error(d.Error || 'Gagal');
  return d;
}

export async function tmdb(path, p = {}) {
  const u = new URL('https://api.themoviedb.org/3' + path);
  u.searchParams.set('language', 'id-ID');
  Object.entries(p).forEach(([k, v]) => u.searchParams.set(k, v));
  const o = {};
  if (state.tmdbKey.length > 40) o.headers = { Authorization: 'Bearer ' + state.tmdbKey };
  else u.searchParams.set('api_key', state.tmdbKey);
  const r = await fetch(u, o);
  if (!r.ok) throw new Error(r.status === 401 ? 'TMDB key tidak valid' : 'TMDB error ' + r.status);
  return r.json();
}
