/** State aplikasi dan penyimpanan di localStorage. */
import { toast } from './utils.js';
import { maybePersist } from './storage.js';

export const state = { items: [], omdbKey: '', tmdbKey: '' };

try {
  state.items = JSON.parse(localStorage.getItem('layar.items') || '[]');
  state.omdbKey = localStorage.getItem('layar.omdb') || '';
  state.tmdbKey = localStorage.getItem('layar.tmdb') || '';
} catch (e) {}

export const save = () => {
  try {
    localStorage.setItem('layar.items', JSON.stringify(state.items));
    maybePersist(state.items.filter(i => !i.demo).length);
  } catch (e) {
    toast('Gagal menyimpan di browser');
  }
};

export const addItem = o => {
  o.at = Date.now();
  if (String(o.key).startsWith('demo-')) o.demo = 1;
  state.items.unshift(o);
};