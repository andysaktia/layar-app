/** Dialog progres drama: tandai episode yang sudah ditonton, saat menambah maupun memperbarui. */
import { $, fmtM, toast } from '../core/utils.js';
import { K, dAttr } from '../core/keys.js';
import { addItem, save, state } from '../core/state.js';
import { allWatched, guessWatched, mergeWatched, pctOf, tally, totalEps } from '../core/tv.js';
import { render } from '../ui/render.js';
import { done_ } from './add.js';
import { search } from './search.js';
import { loadTvStructure } from './tvdata.js';

/** Season dengan lebih dari ini episode mendapat tombol +/− agar bisa diatur teliti. */
const LONG_SEASON = 24;

/** Data dialog yang sedang terbuka: { mode: 'add' | 'edit', s, id, key, title, year, poster, seasons, watched } */
let ed = null;

const seasonOf = n => ed.seasons.find(x => x.n === n);

/** Tandai ada perubahan yang belum disimpan, agar ketukan di luar dialog tidak membuangnya. */
const markDirty = () => {
  $('#dTv').dataset.dirty = '1';
};

function paintRow(n) {
  const row = $(`#seas .sr[data-n="${n}"]`);
  const total = seasonOf(n).r.length;
  const k = ed.watched[n] || 0;
  const full = k === total;
  row.querySelector('.sr-c').textContent = `${k}/${total}`;
  row.querySelector('input').value = k;
  row.classList.toggle('full', full);
  const toggle = row.querySelector('.sr-t');
  toggle.setAttribute('aria-pressed', String(full));
  toggle.setAttribute('aria-label', `Season ${n}: ${full ? 'kosongkan' : 'tandai semua ditonton'}`);
}

function paintSummary() {
  const { min, eps } = tally(ed.seasons, ed.watched);
  const pct = pctOf(eps, ed.seasons);
  $('#tvPct').textContent = pct + '%';
  $('#tvBar').style.width = pct + '%';
  $('#tvSum').textContent = `${eps} dari ${totalEps(ed.seasons)} episode · ${fmtM(min)}`;
  $('#tvOk').disabled = eps === 0;
  $('#tvZero').hidden = eps > 0;
}

function paintSeasons() {
  $('#seas').innerHTML = ed.seasons
    .map(s => {
      const long = s.r.length > LONG_SEASON;
      return `<div class="sr${long ? ' long' : ''}" data-n="${s.n}">
        <b class="sr-n">Season ${s.n}</b>
        <input type="range" min="0" max="${s.r.length}" value="${ed.watched[s.n] || 0}"
          aria-label="Episode ditonton Season ${s.n}" />
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
      </div>`;
    })
    .join('');
  ed.seasons.forEach(s => paintRow(s.n));
}

function setWatched(n, k) {
  ed.watched[n] = Math.max(0, Math.min(seasonOf(n).r.length, k));
  markDirty();
  paintRow(n);
  paintSummary();
}

function open(next) {
  ed = next;
  delete $('#dTv').dataset.dirty;
  $('#tvT').textContent = ed.title;
  $('#tvHint').textContent = ed.legacy
    ? 'Data lama: perkiraan progres. Cek lalu simpan.'
    : 'Geser untuk mengatur episode yang sudah ditonton.';
  $('#tvOk').textContent = ed.mode === 'add' ? 'Tandai ditonton' : 'Simpan progres';
  $('#tvSync').hidden = ed.mode !== 'edit';
  paintSeasons();
  paintSummary();
  $('#seas').scrollTop = 0;
  $('#dTv').showModal();
}

/** Tambah drama baru: semua episode terisi, tinggal dikurangi bila belum tamat. */
export async function openTvAdd(s, id) {
  const st = await loadTvStructure(s, id);
  open({ mode: 'add', s, id, key: K(s, 'tv', id), ...st, watched: allWatched(st.seasons) });
}

/** Perbarui progres drama yang sudah ada di daftar. */
export async function openTvEdit(key) {
  const item = state.items.find(i => i.key === key);
  const ds = dAttr(key);
  if (!item || !ds) return;
  const [s, , id] = ds.split('|');
  let { seasons, watched } = item;
  let legacy = false;
  if (!seasons) {
    seasons = (await loadTvStructure(s, id)).seasons;
    watched = guessWatched(seasons, item.eps || 0);
    legacy = true;
  }
  open({
    mode: 'edit',
    s,
    id,
    key,
    title: item.title,
    year: item.year,
    poster: item.poster,
    seasons,
    watched: { ...watched },
    legacy,
  });
}

function commit() {
  const { min, eps } = tally(ed.seasons, ed.watched);
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
      watched: ed.watched,
    });
    toast('Ditambahkan: ' + ed.title);
  } else {
    const it = state.items.find(i => i.key === ed.key);
    if (!it) {
      toast('Judul sudah tidak ada di daftar');
      $('#dTv').close();
      return;
    }
    Object.assign(it, { minutes: min, eps, seasons: ed.seasons, watched: ed.watched });
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
    ed.watched = mergeWatched(ed.watched, st.seasons);
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

export function initProgress() {
  $('#seas').addEventListener('input', e => {
    const r = e.target.closest('input[type=range]');
    if (r) setWatched(+r.closest('.sr').dataset.n, +r.value);
  });
  $('#seas').addEventListener('click', e => {
    const row = e.target.closest('.sr');
    if (!row) return;
    const n = +row.dataset.n;
    const total = seasonOf(n).r.length;
    if (e.target.closest('.sr-t')) setWatched(n, (ed.watched[n] || 0) === total ? 0 : total);
    else if (e.target.closest('.sr-m')) setWatched(n, (ed.watched[n] || 0) - 1);
    else if (e.target.closest('.sr-p')) setWatched(n, (ed.watched[n] || 0) + 1);
  });
  $('#tvAll').onclick = () => {
    ed.watched = allWatched(ed.seasons);
    markDirty();
    paintSeasons();
    paintSummary();
  };
  $('#tvNone').onclick = () => {
    ed.watched = Object.fromEntries(ed.seasons.map(s => [s.n, 0]));
    markDirty();
    paintSeasons();
    paintSummary();
  };
  $('#tvX').onclick = () => {
    $('#dTv').close();
    search($('#q').value.trim());
  };
  $('#tvSync').onclick = syncEpisodes;
  $('#tvOk').onclick = commit;
}