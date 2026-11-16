/** Navigasi antarhalaman (bottom nav di HP, tab di desktop). */
import { $ } from '../core/utils.js';
import { deckArr, fillDeck, filling } from '../features/swipe.js';
import { discover } from '../features/explore.js';
import { openSet } from './settings.js';

let exploreLoaded = false;

export function setView(v) {
  document.body.dataset.page = v;
  document
    .querySelectorAll('#nav [data-v]')
    .forEach(x =>
      x.dataset.v === v ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current')
    );
  if (v === 'explore' && !exploreLoaded) {
    exploreLoaded = true;
    discover();
  }
  if (v === 'swipe' && !deckArr.length && !filling) fillDeck();
  if (v === 'search') setTimeout(() => $('#q').focus(), 60);
  try {
    history.replaceState(null, '', '#' + v);
  } catch (e) {}
  window.scrollTo(0, 0);
}

export function refreshExplore() {
  exploreLoaded = false;
  if (document.body.dataset.page === 'explore') {
    exploreLoaded = true;
    discover();
  }
}

export function initNav() {
  document.querySelectorAll('#nav [data-v]').forEach(b => (b.onclick = () => setView(b.dataset.v)));
  $('#bSetH').onclick = openSet;
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) setView(g.dataset.go);
  });
  $('#goSearch').onclick = () => setView('search');
}
