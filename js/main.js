/** Titik masuk aplikasi. */
import { $ } from './core/utils.js';
import { VIEWS } from './core/config.js';
import { applyTheme, initSettings, updMode } from './ui/settings.js';
import { demoMode } from './data/demo.js';
import { initAdd } from './features/add.js';
import { initBackup } from './ui/backup.js';
import { initDetail } from './features/detail.js';
import { initExplore, loadGenres, setExploreMode } from './features/explore.js';
import { initNav, setView } from './ui/nav.js';
import { initPwa } from './ui/pwa.js';
import { initProgress } from './features/progress.js';
import { initRender, render } from './ui/render.js';
import { initUndo } from './ui/undo.js';
import { initSearch, renderRecent, setHint } from './features/search.js';
import { initSwipe } from './features/swipe.js';
import { initTranslation } from './features/translation.js';
import { maybePersist } from './core/storage.js';
import { save, state } from './core/state.js';

initRender();
initSearch();
initAdd();
initProgress();
initSettings();
initBackup();
initUndo();
initNav();
initExplore();
initDetail();
initTranslation();
initSwipe();
initPwa();

if (!demoMode() && state.items.some(i => i.demo)) {
  state.items = state.items.filter(i => !i.demo);
  save();
}

maybePersist(state.items.filter(i => !i.demo).length);

applyTheme(document.documentElement.dataset.theme);

setHint();

render();

updMode();

renderRecent();

if (state.tmdbKey) {
  setExploreMode('tv');
  loadGenres().catch(() => {});
}

try {
  if (demoMode() && !sessionStorage.getItem('layar.demoSeen')) $('#dWel').showModal();
} catch (e) {}

const hv = location.hash.slice(1);

setView(VIEWS.includes(hv) ? hv : 'home');