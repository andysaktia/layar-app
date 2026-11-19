/** Perhitungan progres drama: episode ditonton per season, total menit, dan persen. */

/** Total episode dari seluruh season. `seasons` berbentuk [{ n, r: [durasi tiap episode] }]. */
export const totalEps = seasons => seasons.reduce((a, s) => a + s.r.length, 0);

/** Semua episode ditandai sudah ditonton. */
export const allWatched = seasons => Object.fromEntries(seasons.map(s => [s.n, s.r.length]));

/** Hitung total menit dan jumlah episode dari `watched` ({ nomorSeason: jumlahEpisodeDitonton }). */
export function tally(seasons, watched) {
  let min = 0;
  let eps = 0;
  for (const s of seasons) {
    const k = Math.min(Math.max(Number(watched[s.n]) || 0, 0), s.r.length);
    eps += k;
    for (let i = 0; i < k; i++) min += s.r[i];
  }
  return { min, eps };
}

/** Persen progres. 100 hanya bila semua episode sudah ditonton. */
export function pctOf(eps, seasons) {
  const total = totalEps(seasons);
  if (!total) return 0;
  if (eps >= total) return 100;
  return Math.min(99, Math.round((eps / total) * 100));
}

/** Perkiraan untuk data lama yang belum punya rincian: isi episode berurutan sebanyak `eps`. */
export function guessWatched(seasons, eps) {
  const watched = {};
  let left = eps;
  for (const s of seasons) {
    const k = Math.min(left, s.r.length);
    watched[s.n] = k;
    left -= k;
  }
  return watched;
}

/** Pertahankan progres lama saat struktur episode berubah (misalnya ada episode baru). */
export const mergeWatched = (watched, seasons) =>
  Object.fromEntries(seasons.map(s => [s.n, Math.min(Number(watched[s.n]) || 0, s.r.length)]));