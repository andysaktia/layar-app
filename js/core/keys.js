/** Penanda sumber data pada kunci tiap judul (OMDb, TVmaze, TMDB, contoh). */
export const K = (s, t, id) => (s === 'tmdb' || s === 'demo' ? `${s}-${t}-${id}` : `${t}-${id}`);

const srcOf = k =>
  k.startsWith('demo-')
    ? 'demo'
    : k.startsWith('tmdb-')
      ? 'tmdb'
      : k.startsWith('movie-')
        ? 'omdb'
        : k.startsWith('tv-')
          ? 'tvmaze'
          : '';

export const dAttr = k => {
  const s = srcOf(k);
  if (!s) return '';
  const p = k.split('-');
  return s === 'tmdb' || s === 'demo'
    ? `${s}|${p[1]}|${p[2]}`
    : `${s}|${p[0]}|${p.slice(1).join('-')}`;
};
