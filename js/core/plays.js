/** Tontonan ulang: jumlah tonton film atau judul manual, serta ringkasan untuk semua jenis judul. */
import { playsOf, tally } from './tv.js';

/** Jumlah tonton untuk judul tanpa rincian episode (film atau judul manual). Minimal 1. */
export const blockPlays = i => Math.max(1, Math.floor(Number(i.plays) || 1));

/** Menit sekali tonton untuk judul tanpa rincian episode. */
export const baseRuntime = i => i.runtime || Math.round(i.minutes / blockPlays(i));

/** Menit bila judul ditonton sekali saja (tanpa tontonan ulang). */
export function itemBase(i) {
  const p = playsOf(i);
  return p ? tally(i.seasons, p).base : baseRuntime(i);
}

/** Jumlah dan menit tontonan ulang pada satu judul. */
export function itemRewatch(i) {
  const p = playsOf(i);
  if (p) {
    const t = tally(i.seasons, p);
    return { count: t.extra, minutes: t.extraMin };
  }
  const extra = blockPlays(i) - 1;
  return { count: extra, minutes: baseRuntime(i) * extra };
}

/** Gabungan tontonan ulang seluruh daftar. */
export const totalRewatch = items =>
  items.reduce(
    (a, i) => {
      const r = itemRewatch(i);
      return { count: a.count + r.count, minutes: a.minutes + r.minutes };
    },
    { count: 0, minutes: 0 }
  );