/** Tombol terjemahan sinopsis di modal detail (Inggris atau Ibrani ke Indonesia). */
import { $ } from '../core/utils.js';
import { detectLang } from '../core/text.js';
import { estimateNeed, translateText } from '../core/translate.js';
import { quotaInfo } from '../core/quota.js';

const nf = n => n.toLocaleString('id-ID');

const IDLE = 'Terjemahkan ke Indonesia';

/** Status terjemahan untuk sinopsis yang sedang tampil. `token` membuang hasil yang sudah usang. */
const cur = { token: 0, text: '', lang: 'en', out: '', busy: false };

function paintQuota() {
  const q = quotaInfo();
  const ring = $('#dTrRing');
  ring.style.setProperty('--deg', `${q.pct * 3.6}deg`);
  ring.className = 'ring' + (q.pct >= 95 ? ' full' : q.pct >= 80 ? ' warn' : '');
  const label = `Kuota terjemahan hari ini: ±${nf(q.used)} dari ${nf(q.limit)} karakter (perkiraan)`;
  ring.setAttribute('aria-label', label);
  ring.title = label;
  $('#dTrNote').textContent =
    `Terjemahan mesin oleh MyMemory, bisa kurang akurat. Teks dikirim ke layanan itu. ` +
    `Kuota hari ini ±${nf(q.used)}/${nf(q.limit)} karakter.`;
}

function showError(message) {
  const el = $('#dTrErr');
  el.textContent = message;
  el.hidden = false;
}

/** Sembunyikan blok terjemahan (dipanggil saat modal dibuka dan datanya belum siap). */
export function hideTranslation() {
  cur.token++;
  cur.busy = false;
  $('#dTr').hidden = true;
}

/** Siapkan tombol untuk sinopsis baru. Hanya muncul bila sinopsis berbahasa Inggris atau Ibrani. */
export function setupTranslation(text) {
  cur.token++;
  Object.assign(cur, { text: text || '', out: '', busy: false });
  $('#dTrOut').hidden = true;
  $('#dTrErr').hidden = true;
  const lang = detectLang(cur.text);
  if (lang !== 'en' && lang !== 'he') {
    $('#dTr').hidden = true;
    return;
  }
  cur.lang = lang;
  const btn = $('#dTrBtn');
  btn.textContent = IDLE;
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  paintQuota();
  $('#dTr').hidden = false;
}

async function run() {
  if (cur.busy) return;
  const btn = $('#dTrBtn');

  // Sudah diterjemahkan: tombol menjadi pengalih tampil/sembunyi.
  if (cur.out) {
    const out = $('#dTrOut');
    out.hidden = !out.hidden;
    btn.textContent = out.hidden ? 'Tampilkan terjemahan' : 'Sembunyikan terjemahan';
    return;
  }

  const token = cur.token;
  cur.busy = true;
  $('#dTrErr').hidden = true;
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = 'Menerjemahkan…';
  try {
    const res = await translateText(cur.text, cur.lang, (i, n) => {
      if (token === cur.token && n > 1) btn.textContent = `Menerjemahkan… ${i}/${n}`;
    });
    if (token !== cur.token) return;
    cur.out = res.text;
    const out = $('#dTrOut');
    out.textContent = res.text;
    out.hidden = false;
    btn.textContent = 'Sembunyikan terjemahan';
  } catch (e) {
    if (token !== cur.token) return;
    showError(e.message);
    btn.textContent = 'Coba lagi';
  } finally {
    if (token === cur.token) {
      cur.busy = false;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      paintQuota();
    }
  }
}

export function initTranslation() {
  $('#dTrBtn').onclick = run;
}

/** Perkiraan karakter yang akan dipakai bila sinopsis ini diterjemahkan (0 bila sudah di-cache). */
export const translationCost = () => (cur.text ? estimateNeed(cur.text, cur.lang) : 0);