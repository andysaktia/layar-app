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
import { allWatched, tally } from '../core/tv.js';
import { loadTvStructure } from './tvdata.js';

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
  $('#swc').textContent = sess.n ? `Sesi ini: ${sess.n} judul · ${fmtM(sess.min)}` : '';
  if (!has) {
    box.innerHTML = `<div class="empty" style="position:absolute;inset:0;display:grid;place-content:center;gap:12px">${filling ? 'Memuat poster…' : esc(swErr || 'Pilihan habis.')}${filling ? '' : '<button class="btn pri" id="swMore">Muat lagi</button>'}</div>`;
    return;
  }
  box.innerHTML = deckArr
    .slice(0, 3)
    .map(
      (
        c,
        i
      ) => `<article class="sc${i ? '' : ' top'}" style="--i:${i}">${c.p ? `<img src="${esc(c.p)}" alt="" draggable="false">` : `<div class="ph">${esc(c.name)}</div>`}
    <div class="cap"><h3>${esc(c.name)}</h3><p>${c.t === 'tv' ? 'Drama' : 'Film'}${c.y ? ' · ' + esc(c.y) : ''}</p></div>
    <span class="stamp y">SUDAH</span><span class="stamp n">BELUM</span></article>`
    )
    .join('');
}

function decide(dir) {
  const c = deckArr[0];
  if (!c || busy) return;
  busy = true;
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
  const watched = allWatched(st.seasons);
  const { min, eps } = tally(st.seasons, watched);
  addItem({
    key: K(s, 'tv', id),
    type: 'tv',
    title: st.title,
    year: st.year,
    poster: st.poster,
    minutes: min,
    eps,
    seasons: st.seasons,
    watched,
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

const endDrag = () => {
  if (!drag) return;
  const { c, dx, moved } = drag;
  drag = null;
  if (Math.abs(dx) > 90) {
    decide(dx > 0 ? 'yes' : 'no');
  } else {
    c.style.transition = 'transform .2s';
    c.style.transform = '';
    c.querySelectorAll('.stamp').forEach(x => (x.style.opacity = 0));
    if (!moved && deckArr[0]) openDetail(deckArr[0].s, deckArr[0].t, deckArr[0].id);
  }
};

export function initSwipe() {
  deck.addEventListener('pointerdown', e => {
    const c = e.target.closest('.sc.top');
    if (!c || busy) return;
    drag = { c, x: e.clientX, dx: 0, moved: false };
    try {
      c.setPointerCapture(e.pointerId);
    } catch (_) {}
    c.style.transition = 'none';
  });
  deck.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    if (Math.abs(drag.dx) > 6) drag.moved = true;
    drag.c.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 18}deg)`;
    drag.c.querySelector('.stamp.y').style.opacity = Math.max(0, Math.min(1, drag.dx / 90));
    drag.c.querySelector('.stamp.n').style.opacity = Math.max(0, Math.min(1, -drag.dx / 90));
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