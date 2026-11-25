/** Mode Swipe cepat. */
import { $, esc, fmtM, shuffle, toast } from '../core/utils.js';
import { DEMO, demoCard, demoMode } from '../data/demo.js';
import { IMG } from '../core/config.js';
import { K } from '../core/keys.js';
import { addItem, save, state } from '../core/state.js';
import { addMovie } from './add.js';
import { openDetail } from './detail.js';
import { randMv, randTv } from './explore.js';
import { render } from '../ui/render.js';
import { tmdb } from '../core/api.js';
import { allPlays, tally } from '../core/tv.js';
import { loadTvStructure } from './tvdata.js';

const HINT = 'Kanan: sudah · Kiri: belum · Ketuk poster: detail';
const COACH_KEY = 'layar.swipeCoach';

/** Petunjuk pertama kali. Bila penyimpanan tidak tersedia, jangan ditampilkan agar tidak mengganggu. */
let coachVisible = (() => {
  try {
    return !localStorage.getItem(COACH_KEY);
  } catch (e) {
    return false;
  }
})();

/** Getaran halus (Android). Dilewati bila tidak didukung atau pengguna meminta gerakan minimal. */
function buzz(ms) {
  try {
    const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
}

function dismissCoach() {
  if (!coachVisible) return;
  coachVisible = false;
  try {
    localStorage.setItem(COACH_KEY, '1');
  } catch (e) {}
  const el = document.querySelector('#deck .coach');
  if (el) el.remove();
}

const coachHtml = `<div class="coach" role="group" aria-label="Petunjuk swipe">
  <div class="coach-l"><span class="coach-arrow" aria-hidden="true">←</span><b>Belum</b><small>Geser ke kiri</small></div>
  <div class="coach-r"><span class="coach-arrow" aria-hidden="true">→</span><b>Sudah</b><small>Geser ke kanan</small></div>
  <p class="coach-t">Ketuk poster untuk melihat detail</p>
  <button type="button" class="btn pri coach-ok">Mengerti</button>
</div>`;

export let deckArr = [],
  filling = false,
  swMode = 'mix',
  swErr = '',
  lastAct = null,
  busy = false,
  drag = null,
  addQ = Promise.resolve();

export function resetDeck() {
  deckArr = [];
  lastAct = null;
  renderDeck();
}

const sess = { n: 0, min: 0 };

let skipSet = new Set();

try {
  skipSet = new Set(JSON.parse(localStorage.getItem('layar.skip') || '[]'));
} catch (e) {}

const saveSkip = () => {
  try {
    localStorage.setItem('layar.skip', JSON.stringify([...skipSet].slice(-3000)));
  } catch (e) {}
};

const ck = c => K(c.s, c.t, c.id);

export async function fillDeck() {
  if (filling) return;
  filling = true;
  swErr = '';
  if (!deckArr.length) renderDeck();
  try {
    const want = new Set([...state.items.map(i => i.key), ...skipSet, ...deckArr.map(ck)]);
    let add = [];
    if (demoMode()) {
      add = DEMO.filter(d => swMode === 'mix' || d.t === swMode).map(demoCard);
    } else if (state.tmdbKey) {
      const ts = swMode === 'mix' ? ['movie', 'tv'] : [swMode];
      add = (
        await Promise.all(
          ts.map(async t =>
            (
              await tmdb('/discover/' + t, {
                sort_by: 'popularity.desc',
                include_adult: 'false',
                page: 1 + Math.floor(Math.random() * 30),
              })
            ).results
              .filter(x => x.poster_path)
              .map(x => ({
                s: 'tmdb',
                t,
                id: x.id,
                name: x.title || x.name,
                y: (x.release_date || x.first_air_date || '').slice(0, 4),
                p: IMG + x.poster_path,
              }))
          )
        )
      ).flat();
    } else {
      const n = swMode === 'mix' ? 6 : 12;
      const [tv, mv] = await Promise.all([
        swMode !== 'movie' ? randTv(want, n).catch(() => []) : [],
        swMode !== 'tv' && state.omdbKey ? randMv(want, n).catch(() => []) : [],
      ]);
      add = [...tv, ...mv];
      if (swMode === 'movie' && !state.omdbKey)
        swErr = 'Film butuh OMDb key. Isi di Pengaturan, atau pilih Drama.';
    }
    deckArr.push(...shuffle(add.filter(c => !want.has(ck(c)))));
    if (!deckArr.length && !swErr)
      swErr = demoMode()
        ? 'Semua judul contoh sudah dipilih. Isi API key untuk data asli.'
        : 'Belum ada pilihan baru. Coba lagi.';
  } catch (e) {
    swErr = e.message;
  }
  filling = false;
  renderDeck();
}

function renderDeck() {
  const box = $('#deck'),
    has = deckArr.length > 0;
  ['swNo', 'swYes', 'swInfo'].forEach(i => ($('#' + i).disabled = !has));
  $('#swUndo').disabled = !lastAct;
  $('#swh').textContent = sess.n ? `Sesi ini: ${sess.n} judul · ${fmtM(sess.min)}` : HINT;
  if (!has) {
    box.innerHTML = `<div class="empty" style="position:absolute;inset:0;display:grid;place-content:center;gap:12px">${filling ? 'Memuat poster…' : esc(swErr || 'Pilihan habis.')}${filling ? '' : '<button class="btn pri" id="swMore">Muat lagi</button>'}</div>`;
    return;
  }
  box.innerHTML =
    deckArr
      .slice(0, 3)
      .map(
        (
          c,
          i
        ) => `<article class="sc${i ? '' : ' top'}" style="--i:${i}">${c.p ? `<img src="${esc(c.p)}" alt="" draggable="false">` : `<div class="ph">${esc(c.name)}</div>`}
    <div class="cap"><h3>${esc(c.name)}</h3><p>${c.t === 'tv' ? 'Drama' : 'Film'}${c.y ? ' · ' + esc(c.y) : ''}${c.t === 'tv' ? ' · semua season dihitung' : ''}</p></div>
    <span class="stamp y">SUDAH</span><span class="stamp n">BELUM</span></article>`
      )
      .join('') + (coachVisible ? coachHtml : '');
}

function decide(dir, haptic = true) {
  const c = deckArr[0];
  if (!c || busy) return;
  busy = true;
  dismissCoach();
  if (haptic) buzz(dir === 'yes' ? 18 : 10);
  const el = document.querySelector('#deck .sc.top');
  if (el) {
    el.style.transition = 'transform .25s,opacity .25s';
    el.style.transform = `translateX(${dir === 'yes' ? 520 : -520}px) rotate(${dir === 'yes' ? 24 : -24}deg)`;
    el.style.opacity = '0';
  }
  setTimeout(
    () => {
      deckArr.shift();
      lastAct = { c, dir };
      if (dir === 'yes') addQ = addQ.then(() => swAdd(c));
      else {
        skipSet.add(ck(c));
        saveSkip();
      }
      busy = false;
      renderDeck();
      if (deckArr.length < 5) fillDeck();
    },
    el ? 230 : 0
  );
}

async function addTvAll(s, id) {
  const st = await loadTvStructure(s, id);
  const plays = allPlays(st.seasons);
  const { min, eps } = tally(st.seasons, plays);
  addItem({
    key: K(s, 'tv', id),
    type: 'tv',
    title: st.title,
    year: st.year,
    poster: st.poster,
    minutes: min,
    eps,
    seasons: st.seasons,
    plays,
  });
  save();
  render();
  return state.items[0];
}

async function swAdd(c) {
  try {
    const it = c.t === 'movie' ? await addMovie(c.s, c.id, true) : await addTvAll(c.s, c.id);
    sess.n++;
    sess.min += it.minutes;
    renderDeck();
  } catch (e) {
    skipSet.add(ck(c));
    saveSkip();
    toast(c.name + ': ' + e.message);
  }
}

function undo() {
  if (!lastAct) return;
  const { c, dir } = lastAct;
  lastAct = null;
  skipSet.delete(ck(c));
  saveSkip();
  if (dir === 'yes')
    addQ = addQ.then(() => {
      const it = state.items.find(i => i.key === ck(c));
      if (it) {
        state.items = state.items.filter(i => i !== it);
        sess.n = Math.max(0, sess.n - 1);
        sess.min = Math.max(0, sess.min - it.minutes);
        save();
        render();
      }
      renderDeck();
    });
  deckArr.unshift(c);
  renderDeck();
}

const deck = $('#deck');

/** Sesuaikan ukuran kartu agar kartu dan tombol aksi muat di layar tanpa digulir. */
export function fitDeck() {
  const box = $('#deck');
  if (getComputedStyle($('#swp')).display === 'none') return;
  const mobile = !!window.matchMedia && window.matchMedia('(max-width: 759px)').matches;
  box.style.width = '';
  box.style.height = '';
  const top = box.getBoundingClientRect().top + window.scrollY;
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  const nav = mobile ? $('#nav').offsetHeight : 0;
  // Sisakan tombol aksi, jarak, dan ruang agar tombol Swipe di navigasi tidak menimpanya.
  const reserve = $('.sbar').offsetHeight + 16 + (mobile ? nav + 28 : 28);
  let h = Math.max(200, Math.min(Math.floor(vh - top - reserve), 560));
  let w = Math.round((h * 2) / 3);
  const maxW = box.parentElement.clientWidth || w;
  if (w > maxW) {
    w = maxW;
    h = Math.round(w * 1.5);
  }
  box.style.height = h + 'px';
  box.style.width = w + 'px';
}

const FLIP_DIST = 90; // jarak geser horizontal agar kartu diputuskan (px)
const LOCK_DIST = 8; // jarak awal sebelum arah gerakan dikunci (px)
const TAP_MOVE = 10; // gerakan maksimum yang masih dianggap ketukan (px)
const TAP_TIME = 350; // lama maksimum ketukan (ms)

/** Lepaskan jari. Hanya ketukan singkat tanpa gerakan yang membuka detail. */
const endDrag = e => {
  if (!drag) return;
  const { c, dx, dy, lock, t0 } = drag;
  drag = null;
  const cancelled = !!e && e.type === 'pointercancel';
  if (!cancelled && lock === 'h' && Math.abs(dx) > FLIP_DIST) {
    decide(dx > 0 ? 'yes' : 'no', false);
    return;
  }
  c.style.transition = 'transform .2s';
  c.style.transform = '';
  c.querySelectorAll('.stamp').forEach(x => (x.style.opacity = 0));
  const isTap =
    !cancelled && !lock && Math.hypot(dx, dy) < TAP_MOVE && performance.now() - t0 < TAP_TIME;
  if (isTap && deckArr[0]) openDetail(deckArr[0].s, deckArr[0].t, deckArr[0].id);
};

export function initSwipe() {
  window.addEventListener('resize', fitDeck);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitDeck);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitDeck);
  deck.addEventListener('pointerdown', e => {
    const c = e.target.closest('.sc.top');
    if (!c || busy) return;
    drag = { c, x: e.clientX, y: e.clientY, dx: 0, dy: 0, lock: null, t0: performance.now() };
    c.style.transition = 'none';
  });
  deck.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    if (!drag.lock) {
      if (Math.hypot(drag.dx, drag.dy) < LOCK_DIST) return;
      // Arah dikunci sekali: gerakan vertikal diabaikan sepenuhnya (tidak menggeser kartu).
      drag.lock = Math.abs(drag.dx) > Math.abs(drag.dy) ? 'h' : 'v';
      if (drag.lock === 'h') {
        try {
          drag.c.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }
    if (drag.lock !== 'h') return;
    const armed = Math.abs(drag.dx) > FLIP_DIST;
    if (armed !== !!drag.armed) {
      drag.armed = armed;
      if (armed) buzz(8); // tanda halus: melepas sekarang akan memutuskan kartu
    }
    drag.c.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 18}deg)`;
    drag.c.querySelector('.stamp.y').style.opacity = Math.max(0, Math.min(1, drag.dx / FLIP_DIST));
    drag.c.querySelector('.stamp.n').style.opacity = Math.max(0, Math.min(1, -drag.dx / FLIP_DIST));
  });
  deck.addEventListener('click', e => {
    if (e.target.closest('.coach')) dismissCoach();
  });
  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);
  $('#swYes').onclick = () => decide('yes');
  $('#swNo').onclick = () => decide('no');
  $('#swUndo').onclick = undo;
  $('#swInfo').onclick = () => {
    const c = deckArr[0];
    if (c) openDetail(c.s, c.t, c.id);
  };
  document.addEventListener('click', e => {
    if (e.target.closest('#swMore')) {
      swErr = '';
      fillDeck();
    }
  });
  document.querySelectorAll('[data-sw]').forEach(
    t =>
      (t.onclick = () => {
        swMode = t.dataset.sw;
        deckArr = [];
        lastAct = null;
        document
          .querySelectorAll('[data-sw]')
          .forEach(x => x.setAttribute('aria-pressed', x === t));
        fillDeck();
      })
  );
  document.addEventListener('keydown', e => {
    if (
      document.body.dataset.page !== 'swipe' ||
      document.querySelector('dialog[open]') ||
      /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
    )
      return;
    if (coachVisible) {
      dismissCoach();
      return;
    }
    if (e.key === 'ArrowRight') decide('yes');
    else if (e.key === 'ArrowLeft') decide('no');
    else if (e.key === 'Backspace' || e.key === 'z') undo();
  });
  $('#bSkip').onclick = () => {
    skipSet = new Set();
    saveSkip();
    toast('Daftar yang dilewati direset');
  };
}