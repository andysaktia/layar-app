/** Pengolah teks untuk terjemahan: deteksi bahasa, pembersihan nikud Ibrani, dan pemecah teks. */

const ID_WORDS = new Set(
  'yang dan di ke dari untuk dengan pada adalah ini itu dalam akan juga tidak oleh seorang karena saat sebagai mereka kembali menjadi harus setelah sebuah ketika namun hingga atau lebih sudah telah dapat bisa para'.split(
    ' '
  )
);
const EN_WORDS = new Set(
  'the and of to in a is that for with as on his her he she they their who after when must finds while an by from has had are was were be this it at but not one into'.split(
    ' '
  )
);

/**
 * Tebak bahasa teks: 'he' (Ibrani), 'id' (Indonesia), 'en' (Inggris), atau 'other'
 * (aksara lain / terlalu pendek untuk ditebak).
 */
export function detectLang(text) {
  const letters = (text || '').replace(/[^\p{L}]/gu, '');
  if (letters.length < 12) return 'other';
  const hebrew = (letters.match(/[\u0590-\u05FF]/g) || []).length;
  if (hebrew / letters.length > 0.3) return 'he';
  const latin = (letters.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
  if (latin / letters.length < 0.7) return 'other';
  let id = 0;
  let en = 0;
  for (const w of text.toLowerCase().match(/[a-z\u00E0-\u00FF']+/g) || []) {
    if (ID_WORDS.has(w)) id++;
    if (EN_WORDS.has(w)) en++;
  }
  return id > en ? 'id' : 'en';
}

/** Buang nikud dan ta'amim agar teks Ibrani bervokal lebih mudah diterjemahkan (maqaf dipertahankan). */
export const stripNikud = text => text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');

export const byteLength = s => new TextEncoder().encode(s).length;

/** Pecah teks panjang pada batas kalimat (atau kata) agar tiap potongan muat di batas API. */
export function splitText(text, maxBytes = 450) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?。]+[.!?。]+["')\]]*\s*|[^.!?。]+$/g) || [clean];
  const parts = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (byteLength(s) <= maxBytes) {
      parts.push(s);
      continue;
    }
    // Satu kalimat terlalu panjang: pecah per kata.
    let cur = '';
    for (const w of s.split(' ')) {
      const next = cur ? cur + ' ' + w : w;
      if (cur && byteLength(next) > maxBytes) {
        parts.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) parts.push(cur);
  }
  // Gabungkan kalimat pendek yang bersebelahan selama masih muat, supaya permintaan lebih sedikit.
  const chunks = [];
  for (const p of parts) {
    const last = chunks[chunks.length - 1];
    if (last && byteLength(last + ' ' + p) <= maxBytes) chunks[chunks.length - 1] = last + ' ' + p;
    else chunks.push(p);
  }
  return chunks;
}

/** Ubah entitas HTML (misalnya &#39;) pada hasil terjemahan menjadi karakter biasa. */
export const decodeEntities = s =>
  new DOMParser().parseFromString(s, 'text/html').documentElement.textContent;