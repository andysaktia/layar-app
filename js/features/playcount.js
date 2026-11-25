/** Dialog jumlah tonton untuk film dan judul manual: menit total = durasi sekali tonton × jumlah tonton. */
import { $, fmtM, toast } from '../core/utils.js';
import { save, state } from '../core/state.js';
import { MAX_PLAYS } from '../core/tv.js';
import { baseRuntime, blockPlays } from '../core/plays.js';
import { render } from '../ui/render.js';

/** Data dialog yang sedang terbuka: { key, title, runtime, n } */
let cur = null;

function paint() {
  $('#pyN').textContent = `${cur.n}×`;
  $('#pySum').textContent =
    cur.n > 1
      ? `${cur.n} × ${fmtM(cur.runtime)} = ${fmtM(cur.n * cur.runtime)} (${cur.n - 1}× tonton ulang)`
      : `${fmtM(cur.runtime)}, ditonton sekali`;
  $('#pyMinus').disabled = cur.n <= 1;
  $('#pyPlus').disabled = cur.n >= MAX_PLAYS;
}

export function openPlayCount(key) {
  const it = state.items.find(i => i.key === key);
  if (!it) return;
  cur = { key, title: it.title, runtime: baseRuntime(it), n: blockPlays(it) };
  $('#pyT').textContent = it.title;
  paint();
  $('#dPlay').showModal();
}

function commit() {
  const it = state.items.find(i => i.key === cur.key);
  if (!it) {
    $('#dPlay').close();
    return;
  }
  it.runtime = cur.runtime;
  it.plays = cur.n;
  it.minutes = cur.runtime * cur.n;
  save();
  render();
  $('#dPlay').close();
  toast(cur.n > 1 ? `${cur.title}: ditonton ${cur.n}×` : `${cur.title}: ditonton sekali`);
}

export function initPlayCount() {
  $('#pyMinus').onclick = () => {
    cur.n = Math.max(1, cur.n - 1);
    paint();
  };
  $('#pyPlus').onclick = () => {
    cur.n = Math.min(MAX_PLAYS, cur.n + 1);
    paint();
  };
  $('#pyX').onclick = () => $('#dPlay').close();
  $('#pyOk').onclick = commit;
}