/**
 * Perhitungan drama berepisode: episode ditonton (dan ditonton ulang), total menit, dan persen.
 *
 * `seasons` : [{ n, r: [durasi tiap episode] }]
 * `plays`   : { nomorSeason: [berapa kali tiap episode ditonton] }  (0 = belum ditonton)
 */

export const MAX_PLAYS = 99;

/** Total episode dari seluruh season. */
export const totalEps = seasons => seasons.reduce((a, s) => a + s.r.length, 0);

/** Rapikan jumlah tonton: panjang sesuai jumlah episode, bilangan bulat 0..MAX_PLAYS. */
export function normalizePlays(seasons, plays) {
  return Object.fromEntries(
    seasons.map(s => {
      const src = (plays && plays[s.n]) || [];
      return [
        s.n,
        s.r.map((_, i) => Math.min(MAX_PLAYS, Math.max(0, Math.floor(Number(src[i]) || 0)))),
      ];
    })
  );
}

/** Semua episode sudah ditonton satu kali. */
export const allPlays = seasons => Object.fromEntries(seasons.map(s => [s.n, s.r.map(() => 1)]));

/** Data lama (`watched`: jumlah episode berurutan per season) menjadi 1× per episode. */
export const fromWatched = (seasons, watched) =>
  Object.fromEntries(
    seasons.map(s => {
      const k = Math.min(Number(watched[s.n]) || 0, s.r.length);
      return [s.n, s.r.map((_, i) => (i < k ? 1 : 0))];
    })
  );

/** Perkiraan untuk data lama tanpa rincian: isi episode berurutan sebanyak `eps`, masing-masing 1×. */
export function guessPlays(seasons, eps) {
  let left = eps;
  return Object.fromEntries(
    seasons.map(s => {
      const k = Math.min(left, s.r.length);
      left -= k;
      return [s.n, s.r.map((_, i) => (i < k ? 1 : 0))];
    })
  );
}

/** Jumlah tonton milik item tersimpan; null bila item belum punya rincian episode. */
export function playsOf(item) {
  if (!item.seasons) return null;
  if (item.plays) return normalizePlays(item.seasons, item.plays);
  if (item.watched) return fromWatched(item.seasons, item.watched);
  return null;
}

/**
 * Hitung dari `plays`:
 *  eps      episode yang pernah ditonton (unik)
 *  min      total menit termasuk tontonan ulang
 *  extra    jumlah tontonan ulang (tiap tonton setelah yang pertama)
 *  extraMin menit dari tontonan ulang
 *  base     menit bila tiap episode ditonton sekali
 */
export function tally(seasons, plays) {
  const p = normalizePlays(seasons, plays);
  let min = 0;
  let eps = 0;
  let extra = 0;
  let extraMin = 0;
  for (const s of seasons) {
    s.r.forEach((len, i) => {
      const c = p[s.n][i];
      if (c > 0) {
        eps++;
        min += len * c;
      }
      if (c > 1) {
        extra += c - 1;
        extraMin += len * (c - 1);
      }
    });
  }
  return { min, eps, extra, extraMin, base: min - extraMin };
}

/** Persen progres. 100 hanya bila semua episode sudah ditonton. */
export function pctOf(eps, seasons) {
  const total = totalEps(seasons);
  if (!total) return 0;
  if (eps >= total) return 100;
  return Math.min(99, Math.round((eps / total) * 100));
}