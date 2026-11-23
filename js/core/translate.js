/** Terjemahan teks ke bahasa Indonesia lewat API MyMemory (gratis, tanpa server). */
import { decodeEntities, splitText, stripNikud } from './text.js';
import { cacheGet, cacheSet } from './trcache.js';
import { addUsed, getEmail, markFull, quotaInfo } from './quota.js';

const ENDPOINT = 'https://api.mymemory.translated.net/get';
const CHUNK_BYTES = 450; // batas API 500 byte per permintaan, disisakan sedikit ruang
const TIMEOUT_MS = 15000;

export class TranslateError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const nf = n => n.toLocaleString('id-ID');

function quotaMessage(info) {
  const base = `Kuota terjemahan hari ini habis (±${nf(info.used)}/${nf(info.limit)} karakter).`;
  return getEmail()
    ? `${base} Coba lagi besok.`
    : `${base} Coba lagi besok, atau isi email di Pengaturan untuk menaikkan kuota menjadi 50.000 karakter.`;
}

async function fetchChunk(q, pair) {
  const url = new URL(ENDPOINT);
  url.searchParams.set('q', q);
  url.searchParams.set('langpair', pair);
  const email = getEmail();
  if (email) url.searchParams.set('de', email);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } catch (e) {
    throw new TranslateError(
      'network',
      'Tidak bisa menghubungi layanan terjemahan. Cek koneksi internet lalu coba lagi.'
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok && res.status !== 429) {
    throw new TranslateError('network', `Layanan terjemahan menjawab galat ${res.status}.`);
  }
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new TranslateError('failed', 'Jawaban layanan terjemahan tidak terbaca.');
  }
  const text = data && data.responseData && data.responseData.translatedText;
  const details = String((data && data.responseDetails) || '');
  if (
    res.status === 429 ||
    Number(data.responseStatus) === 429 ||
    data.quotaFinished ||
    /MYMEMORY WARNING/i.test(String(text || '') + details)
  ) {
    markFull();
    throw new TranslateError('quota', quotaMessage(quotaInfo()));
  }
  if (/INVALID EMAIL/i.test(details)) {
    throw new TranslateError(
      'email',
      'Email di Pengaturan tidak diterima MyMemory. Perbaiki atau kosongkan emailnya.'
    );
  }
  if (Number(data.responseStatus) !== 200 || !text) {
    throw new TranslateError('failed', details || 'Gagal menerjemahkan teks ini.');
  }
  return decodeEntities(text);
}

/** Perkiraan karakter yang akan memakai kuota (potongan yang sudah di-cache tidak dihitung). */
export function estimateNeed(text, lang) {
  const pair = `${lang}|id`;
  const clean = lang === 'he' ? stripNikud(text) : text;
  return splitText(clean, CHUNK_BYTES)
    .filter(c => cacheGet(pair, c) === null)
    .reduce((a, c) => a + c.length, 0);
}

/**
 * Terjemahkan `text` dari `lang` ('en' atau 'he') ke Indonesia.
 * @param {(done:number,total:number)=>void} [onProgress]
 * @returns {Promise<{ text: string, fromCache: boolean }>}
 */
export async function translateText(text, lang, onProgress) {
  const pair = `${lang}|id`;
  const clean = lang === 'he' ? stripNikud(text) : text;
  const chunks = splitText(clean, CHUNK_BYTES);
  if (!chunks.length) throw new TranslateError('failed', 'Tidak ada teks untuk diterjemahkan.');

  const need = estimateNeed(text, lang);
  const info = quotaInfo();
  if (need > 0 && info.used + need > info.limit) {
    throw new TranslateError('quota', quotaMessage(info));
  }

  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i + 1, chunks.length);
    let t = cacheGet(pair, chunks[i]);
    if (t === null) {
      t = await fetchChunk(chunks[i], pair);
      cacheSet(pair, chunks[i], t);
      addUsed(chunks[i].length);
    }
    out.push(t);
  }
  return { text: out.join(' '), fromCache: need === 0 };
}