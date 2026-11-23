/** Pengaturan, tema, mode, tambah manual, ekspor dan impor. */
import { $, toast } from '../core/utils.js';
import { addItem, save, state } from '../core/state.js';
import { demoMode, demoSeen } from '../data/demo.js';
import { loadGenres, resetExplore } from '../features/explore.js';
import { refreshDataStatus } from './backup.js';
import { getEmail, isValidEmail, quotaInfo, setEmail } from '../core/quota.js';
import { refreshExplore } from './nav.js';
import { render } from './render.js';
import { resetDeck } from '../features/swipe.js';
import { setHint } from '../features/search.js';

export function updMode() {
  const dm = demoMode();
  $('#modePill').textContent = dm ? 'Mode Contoh' : state.tmdbKey ? 'Mode Lengkap' : 'Mode Cepat';
  $('#mLengkap').classList.toggle('on', !!state.tmdbKey);
  $('#mCepat').classList.toggle('on', !dm && !state.tmdbKey);
  $('#srcLine').textContent = dm
    ? 'Asal data: contoh (dummy), tidak diambil dari internet.'
    : state.tmdbKey
      ? 'Asal data: pencarian dari TVmaze + OMDb; Jelajah dan detail dari TMDB.'
      : 'Asal data: drama dari TVmaze, film dari OMDb.';
  $('#demoBar').hidden = !dm;
  $('#demoNote').hidden = !dm;
}

export const openSet = () => {
  $('#key').value = state.omdbKey;
  $('#tkey').value = state.tmdbKey;
  $('#mmEmail').value = getEmail();
  const q = quotaInfo();
  $('#trQuotaText').textContent =
    `Kuota terjemahan hari ini: ±${q.used.toLocaleString('id-ID')} dari ${q.limit.toLocaleString('id-ID')} karakter (perkiraan).`;
  updMode();
  refreshDataStatus();
  $('#dSet').showModal();
};

const SUN =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
  MOON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></svg>';

export function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('layar.theme', t);
  } catch (e) {}
  $('#bTheme').innerHTML = t === 'dark' ? SUN : MOON;
  $('#bTheme').setAttribute(
    'aria-label',
    t === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'
  );
  document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#0e1523' : '#f3f5fa';
}

export function initSettings() {
  $('#bTheme').onclick = () =>
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  $('#wFast').onclick = () => {
    demoSeen();
    $('#dWel').close();
  };
  $('#wFull').onclick = () => {
    demoSeen();
    $('#dWel').close();
    openSet();
    $('#key').focus();
  };
  $('#dSet .btn[value=x]').onclick = () => $('#dSet').close();
  $('#saveKey').onclick = () => {
    const email = $('#mmEmail').value.trim();
    if (email && !isValidEmail(email)) {
      toast('Email tidak valid. Perbaiki atau kosongkan kolomnya.');
      return;
    }
    setEmail(email);
    state.omdbKey = $('#key').value.trim();
    state.tmdbKey = $('#tkey').value.trim();
    try {
      localStorage.setItem('layar.omdb', state.omdbKey);
      localStorage.setItem('layar.tmdb', state.tmdbKey);
    } catch (e) {}
    const nd = state.items.length;
    if (!demoMode()) {
      state.items = state.items.filter(i => !i.demo);
      if (state.items.length !== nd) {
        save();
        render();
      }
    }
    resetDeck();
    $('#dSet').close();
    setHint();
    updMode();
    toast(
      demoMode()
        ? 'Masih Mode Contoh: isi key OMDb atau TMDB'
        : state.tmdbKey
          ? 'Mode Lengkap aktif'
          : nd !== state.items.length
            ? 'Mode Cepat aktif. Data contoh dihapus.'
            : 'Mode Cepat aktif'
    );
    resetExplore();
    if (state.tmdbKey) loadGenres().catch(() => {});
    refreshExplore();
  };
  $('#bManual').onclick = () => {
    $('#mT').value = '';
    $('#mM').value = '';
    $('#dMan').showModal();
  };
  $('#mX').onclick = () => $('#dMan').close();
  $('#mOk').onclick = () => {
    const t = $('#mT').value.trim(),
      m = parseInt($('#mM').value, 10);
    if (!t || !m || m < 1) {
      toast('Isi judul dan durasi dalam menit');
      return;
    }
    addItem({
      key: 'manual-' + Date.now(),
      type: $('#mK').value,
      title: t,
      year: '',
      poster: null,
      minutes: m,
    });
    save();
    render();
    $('#dMan').close();
    toast('Ditambahkan: ' + t);
  };
  $('#bImp').onclick = () => $('#file').click();
  $('#file').onchange = async e => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(d)) throw 0;
      const have = new Set(state.items.map(i => i.key));
      d.filter(i => i && i.key && i.title && i.minutes >= 0 && !have.has(i.key)).forEach(i =>
        state.items.push(i)
      );
      save();
      render();
      toast('Impor selesai');
    } catch (err) {
      toast('File tidak valid');
    }
    e.target.value = '';
  };
  $('#demoSet').onclick = openSet;
}