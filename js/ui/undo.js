/** Hapus dengan pembatalan: snackbar hitung mundur ala Telegram, tanpa dialog konfirmasi. */
import { $, toast } from '../core/utils.js';
import { save, state } from '../core/state.js';
import { render } from './render.js';

const SECONDS = 6;

let pending = []; // { item, index } untuk tiap judul yang baru dihapus
let timer = null;
let tick = null;
let left = 0;

const paint = () => {
  $('#undoBtn').textContent = `Batalkan ${left}`;
};

function hide() {
  clearTimeout(timer);
  clearInterval(tick);
  $('#undoBar').hidden = true;
}

function show() {
  const n = pending.length;
  $('#undoMsg').textContent = n === 1 ? `“${pending[0].item.title}” dihapus` : `${n} judul dihapus`;
  left = SECONDS;
  paint();
  $('#undoBar').hidden = false;

  // Mulai ulang bar hitung mundur dari penuh ke kosong.
  const fill = $('#undoFill');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  void fill.offsetWidth;
  fill.style.transition = `width ${SECONDS}s linear`;
  fill.style.width = '0%';

  clearTimeout(timer);
  clearInterval(tick);
  tick = setInterval(() => {
    left = Math.max(0, left - 1);
    paint();
  }, 1000);
  timer = setTimeout(commit, SECONDS * 1000);
}

/** Waktu habis: penghapusan dianggap final. */
function commit() {
  pending = [];
  hide();
}

/** Hapus judul sekarang juga (tampilan dan total langsung berubah), tetapi bisa dibatalkan. */
export function removeWithUndo(key) {
  const index = state.items.findIndex(i => i.key === key);
  if (index < 0) return;
  const [item] = state.items.splice(index, 1);
  pending.push({ item, index });
  save();
  render();
  show();
}

/** Kembalikan semua judul yang baru dihapus ke posisi semula. */
export function undoRemove() {
  if (!pending.length) return;
  let restored = 0;
  // Kebalikan urutan hapus supaya posisi asli terpulihkan.
  for (const { item, index } of [...pending].reverse()) {
    if (state.items.some(i => i.key === item.key)) continue; // sudah ditambahkan lagi
    state.items.splice(Math.min(index, state.items.length), 0, item);
    restored++;
  }
  pending = [];
  hide();
  save();
  render();
  toast(restored ? 'Dikembalikan' : 'Judul itu sudah ada lagi di daftar');
}

export function initUndo() {
  $('#undoBtn').onclick = undoRemove;
}