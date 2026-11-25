/**
 * Dialog progres drama: tandai episode yang sudah ditonton dan berapa kali ditonton ulang,
 * saat menambah maupun memperbarui.
 */
import { $, fmtM, toast } from '../core/utils.js';
import { K, dAttr } from '../core/keys.js';
import { addItem, save, state } from '../core/state.js';
import {
  MAX_PLAYS,
  allPlays,
  guessPlays,
  normalizePlays,
  pctOf,
  playsOf,
  tally,
  totalEps,
} from '../core/tv.js';
import { render } from '../ui/render.js';
import { done_ } from './add.js';
import { search } from './search.js';
import { loadTvStructure } from './tvdata.js';

/** Season dengan lebih dari ini episode mendapat tombol −1/+1 agar bisa diatur teliti. */
const LONG_SEASON = 24;

/** Data dialog yang sedang terbuka: { mode: 'add' | 'edit', s, id, key, title, year, poster, seasons, plays, legacy } */
let ed = null;
/** Episode yang sedang dipilih untuk diatur jumlah tontonnya: { n, i } atau null. */
let sel = null;
/** Nomor season yang rincian episodenya sedang dibuka. */
const expanded = new Set();

const seasonOf = n => ed.seasons.find(x => x.n === n);
const marks = n => ed.plays[n];
const watchedIn = n => marks(n).filter(c => c > 0).length;
const extraIn = n => marks(n).reduce((a, c) => a + Math.max(0, c - 1), 0);

/** Tandai ada perubahan yang belum disimpan, agar ketukan di luar dialog tidak membuangnya. */
const markDirty = () => {
  $('#dTv').dataset.dirty = '1';
};

/** Pegangan penggeser: episode pertama sampai ke-k ditandai (jumlah tonton lama dipertahankan), sisanya dikosongkan. */
function setThrough(n, k) {
  const total = seasonOf(n).r.length;
  const upto = Math.max(0, Math.min(total, k));
  ed.plays[n] = marks(n).map((c, i) => (i < upto ? Math.max(1, c) : 0));
}

function paintDetail(n) {
  const box = $(`#seas .sr[data-n="${n}"] .sr-d`);
  const s = seasonOf(n);
  const p = marks(n);
  const cur = sel && sel.n === n ? sel.i : null;
  const chips = s.r
    .map((_, i) => {
      const c = p[i];
      const label = `Episode ${i + 1}: ${c > 0 ? c + ' kali ditonton' : 'belum ditonton'}`;
      return `<button type="button" class="ep${c > 0 ? ' on' : ''}${c > 1 ? ' re' : ''}${cur === i ? ' sel' : ''}" data-i="${i}" aria-pressed="${c > 0}" aria-label="${label}">${i + 1}${c > 1 ? `<sup>${c}×</sup>` : ''}</button>`;
    })
    .join('');
  let bar =
    '<span class="ep-hint">Ketuk episode untuk memilih, lalu atur berapa kali ditonton.</span>';
  if (cur !== null) {
    const c = p[cur];
    bar = `<span class="ep-cur">Episode ${cur + 1} · ${fmtM(s.r[cur])} · ${c > 0 ? c + '× ditonton' : 'belum ditonton'}</span>
      <span class="ep-step">
        <button type="button" class="btn sm ep-minus" aria-label="Kurangi satu kali tonton" ${c <= 0 ? 'disabled' : ''}>−</button>
        <button type="button" class="btn sm ep-plus" aria-label="Tambah satu kali tonton" ${c >= MAX_PLAYS ? 'disabled' : ''}>+</button>
      </span>`;
  }
  box.innerHTML = `<div class="ep-grid">${chips}</div>
    <div class="ep-bar">${bar}</div>
    <div class="ep-act"><button type="button" class="btn sm ep-all" ${watchedIn(n) ? '' : 'disabled'}>Tonton ulang season ini (+1)</button></div>`;
}

function paintRow(n) {
  const row = $(`#seas .sr[data-n="${n}"]`);
  const total = seasonOf(n).r.length;
  const k = watchedIn(n);
  const x = extraIn(n);
  row.querySelector('.sr-c').textContent = `${k}/${total}`;
  row.querySelector('input').value = k;
  const rw = row.querySelector('.sr-rw');
  rw.textContent = x ? `↻ ${x}× ulang` : '';
  rw.hidden = !x;
  const full = k === total;
  row.classList.toggle('full', full);
  const toggle = row.querySelector('.sr-t');
  toggle.setAttribute('aria-pressed', String(full));
  toggle.setAttribute('aria-label', `Season ${n}: ${full ? 'kosongkan' : 'tandai semua ditonton'}`);
  const isOpen = expanded.has(n);
  row.classList.toggle('open', isOpen);
  row.querySelector('.sr-n').setAttribute('aria-expanded', String(isOpen));
  if (isOpen) paintDetail(n);
}

function paintSummary() {
  const t = tally(ed.seasons, ed.plays);
  const pct = pctOf(t.eps, ed.seasons);
  $('#tvPct').textContent = pct + '%';
  $('#tvBar').style.width = pct + '%';
  $('#tvSum').textContent =
    `${t.eps} dari ${totalEps(ed.seasons)} episode · ${fmtM(t.min)}` +
    (t.extra ? ` · ↻ ${t.extra}× ulang` : '');
  $('#tvOk').disabled = t.eps === 0;
  $('#tvAgain').disabled = t.eps === 0;
  $('#tvZero').hidden = t.eps > 0;
}

function paintSeasons() {
  $('#seas').innerHTML = ed.seasons
    .map(s => {
      const long = s.r.length > LONG_SEASON;
      return `<div class="sr${long ? ' long' : ''}" data-n="${s.n}">
        <button type="button" class="sr-n" aria-expanded="false"><b>Season ${s.n}</b><small class="sr-rw" hidden></small></button>
        <input type="range" min="0" max="${s.r.length}" value="0" aria-label="Episode ditonton Season ${s.n}" />
        <span class="sr-c"></span>
        <button type="button" class="sr-t" aria-pressed="false">✓</button>
        ${
          long
            ? `<div class="sr-adj">
                 <button type="button" class="btn sm sr-m" aria-label="Kurangi satu episode">−1</button>
                 <button type="button" class="btn sm sr-p" aria-label="Tambah satu episode">+1</button>
               </div>`
            : ''
        }
        <div class="sr-d"></div>
      </div>`;
    })
    .join('');
  ed.seasons.forEach(s => paintRow(s.n));
}

/** Perubahan jumlah tonton pada satu season. */
function change(n) {
  markDirty();
  paintRow(n);
  paintSummary();
}

function openSheet(next) {
  ed = next;
  sel = null;
  expanded.clear();
  // Drama satu season (umum untuk drama Asia): langsung tampilkan petak episodenya.
  if (ed.seasons.length === 1) expanded.add(ed.seasons[0].n);
  delete $('#dTv').dataset.dirty;
  $('#tvT').textContent = ed.title;
  $('#tvHint').textContent = ed.legacy
    ? 'Data lama: perkiraan progres. Cek lalu simpan.'
    : 'Geser untuk episode ditonton. Ketuk nama season untuk atur per episode.';
  $('#tvOk').textContent = ed.mode === 'add' ? 'Tandai ditonton' : 'Simpan progres';
  $('#tvSync').hidden = ed.mode !== 'edit';
  paintSeasons();
  paintSummary();
  $('#seas').scrollTop = 0;
  $('#dTv').showModal();
}

/** Tambah drama baru: semua episode terisi sekali, tinggal dikurangi bila belum tamat. */
export async function openTvAdd(s, id) {
  const st = await loadTvStructure(s, id);
  openSheet({ mode: 'add', s, id, key: K(s, 'tv', id), ...st, plays: allPlays(st.seasons) });
}

/** Perbarui progres dan tontonan ulang drama yang sudah ada di daftar. */
export async function openTvEdit(key) {
  const item = state.items.find(i => i.key === key);
  const ds = dAttr(key);
  if (!item || !ds) return;
  const [s, , id] = ds.split('|');
  let seasons = item.seasons;
  let plays = playsOf(item);
  let legacy = false;
  if (!seasons) {
    seasons = (await loadTvStructure(s, id)).seasons;
    plays = guessPlays(seasons, item.eps || 0);
    legacy = true;
  }
  openSheet({
    mode: 'edit',
    s,
    id,
    key,
    title: item.title,
    year: item.year,
    poster: item.poster,
    seasons,
    plays,
    legacy,
  });
}

function commit() {
  const { min, eps } = tally(ed.seasons, ed.plays);
  if (ed.mode === 'add') {
    addItem({
      key: ed.key,
      type: 'tv',
      title: ed.title,
      year: ed.year,
      poster: ed.poster,
      minutes: min,
      eps,
      seasons: ed.seasons,
      plays: ed.plays,
    });
    toast('Ditambahkan: ' + ed.title);
  } else {
    const it = state.items.find(i => i.key === ed.key);
    if (!it) {
      toast('Judul sudah tidak ada di daftar');
      $('#dTv').close();
      return;
    }
    Object.assign(it, { minutes: min, eps, seasons: ed.seasons, plays: ed.plays });
    delete it.watched; // format lama, sudah digantikan `plays`
    toast(`${ed.title}: ${pctOf(eps, ed.seasons)}% ditonton`);
  }
  save();
  render();
  $('#dTv').close();
  if (ed.mode === 'add') {
    done_(ed.s, 'tv', ed.id);
    search($('#q').value.trim());
  }
}

/** Muat ulang daftar episode (untuk serial yang masih tayang) tanpa mengubah progres. */
async function syncEpisodes() {
  const btn = $('#tvSync');
  btn.disabled = true;
  btn.textContent = 'Memuat…';
  try {
    const st = await loadTvStructure(ed.s, ed.id);
    const before = totalEps(ed.seasons);
    ed.seasons = st.seasons;
    ed.plays = normalizePlays(st.seasons, ed.plays); // episode baru mulai dari 0
    sel = null;
    markDirty();
    paintSeasons();
    paintSummary();
    const added = totalEps(st.seasons) - before;
    toast(added > 0 ? `${added} episode baru ditemukan` : 'Belum ada episode baru');
  } catch (e) {
    toast(e.message);
  }
  btn.disabled = false;
  btn.textContent = 'Cek episode baru';
}

/** Ubah jumlah tonton episode terpilih sebanyak `delta`. */
function bumpSelected(delta) {
  if (!sel) return;
  const arr = marks(sel.n);
  arr[sel.i] = Math.max(0, Math.min(MAX_PLAYS, arr[sel.i] + delta));
  change(sel.n);
}

export function initProgress() {
  $('#seas').addEventListener('input', e => {
    const r = e.target.closest('input[type=range]');
    if (!r) return;
    const n = +r.closest('.sr').dataset.n;
    setThrough(n, +r.value);
    change(n);
  });

  $('#seas').addEventListener('click', e => {
    const row = e.target.closest('.sr');
    if (!row) return;
    const n = +row.dataset.n;
    const total = seasonOf(n).r.length;

    if (e.target.closest('.sr-n')) {
      if (expanded.has(n)) expanded.delete(n);
      else expanded.add(n);
      paintRow(n);
    } else if (e.target.closest('.sr-t')) {
      const full = watchedIn(n) === total;
      ed.plays[n] = marks(n).map(c => (full ? 0 : Math.max(1, c)));
      change(n);
    } else if (e.target.closest('.sr-m')) {
      setThrough(n, watchedIn(n) - 1);
      change(n);
    } else if (e.target.closest('.sr-p')) {
      setThrough(n, watchedIn(n) + 1);
      change(n);
    } else if (e.target.closest('.ep')) {
      const i = +e.target.closest('.ep').dataset.i;
      const prev = sel;
      sel = { n, i };
      if (prev && prev.n !== n && expanded.has(prev.n)) paintRow(prev.n);
      // Ketukan pada episode kosong = ditonton. Pada episode yang sudah ditonton hanya memilihnya.
      if (marks(n)[i] === 0) {
        marks(n)[i] = 1;
        change(n);
      } else {
        paintRow(n);
      }
    } else if (e.target.closest('.ep-plus')) {
      bumpSelected(1);
    } else if (e.target.closest('.ep-minus')) {
      bumpSelected(-1);
    } else if (e.target.closest('.ep-all')) {
      ed.plays[n] = marks(n).map(c => (c > 0 ? Math.min(MAX_PLAYS, c + 1) : 0));
      change(n);
    }
  });

  $('#tvAll').onclick = () => {
    for (const s of ed.seasons) ed.plays[s.n] = marks(s.n).map(c => Math.max(1, c));
    markDirty();
    paintSeasons();
    paintSummary();
  };
  $('#tvNone').onclick = () => {
    for (const s of ed.seasons) ed.plays[s.n] = marks(s.n).map(() => 0);
    sel = null;
    markDirty();
    paintSeasons();
    paintSummary();
  };
  $('#tvAgain').onclick = () => {
    for (const s of ed.seasons) {
      ed.plays[s.n] = marks(s.n).map(c => (c > 0 ? Math.min(MAX_PLAYS, c + 1) : 0));
    }
    markDirty();
    paintSeasons();
    paintSummary();
    toast('Semua episode yang sudah ditonton bertambah 1×');
  };
  $('#tvX').onclick = () => {
    $('#dTv').close();
    search($('#q').value.trim());
  };
  $('#tvSync').onclick = syncEpisodes;
  $('#tvOk').onclick = commit;
}