/** Render ringkasan, daftar tontonan, dan beranda. */
import { $, W, esc, fmtM, nf, toast } from '../core/utils.js';
import { dAttr } from '../core/keys.js';
import { state } from '../core/state.js';
import { blockPlays, itemBase, totalRewatch } from '../core/plays.js';
import { pctOf, playsOf, tally, totalEps } from '../core/tv.js';
import { openPlayCount } from '../features/playcount.js';
import { openTvEdit } from '../features/progress.js';
import { updBackupBar } from './backup.js';
import { removeWithUndo } from './undo.js';

let filter = 'all';

export function render() {
  const tot = state.items.reduce((a, i) => a + i.minutes, 0);
  const d = Math.floor(tot / 1440),
    h = Math.floor((tot % 1440) / 60),
    m = tot % 60;
  $('#big').innerHTML = tot
    ? `<span class="n">${nf(d)}<small>hari</small></span><span>${h}<small>jam</small></span><span>${m}<small>menit</small></span>`
    : `<span>0<small>menit</small></span>`;
  const mv = state.items.filter(i => i.type === 'movie'),
    tv = state.items.filter(i => i.type === 'tv');
  const mm = mv.reduce((a, i) => a + i.minutes, 0),
    tm = tv.reduce((a, i) => a + i.minutes, 0);
  const eps = tv.reduce((a, i) => a + (i.eps || 0), 0);
  renderHome();
  updBackupBar();
  const re = totalRewatch(state.items);
  $('#libTot').textContent = tot
    ? `Total ${nf(d)} hari ${h} jam ${m} menit · ${nf(state.items.length)} judul`
    : '';
  $('#sub').textContent = tot
    ? `Itu ${nf(Math.round(tot / 60))} jam nonton, setara ${((tot / 60 / 24 / 365) * 100).toFixed(2).replace('.', ',')}% dari satu tahun penuh tanpa tidur.${re.count ? ` Termasuk ${nf(re.count)}× tontonan ulang (${fmtM(re.minutes)}).` : ''}`
    : 'Cari judul di bawah dan tandai yang sudah kamu tonton. Totalnya langsung dihitung di sini.';
  $('#split').innerHTML = tot
    ? `<div style="width:${(mm / tot) * 100}%;background:var(--am)"></div><div style="width:${(tm / tot) * 100}%;background:var(--tl)"></div>`
    : '';
  $('#legend').innerHTML =
    `<span><i class="dot" style="background:var(--am)"></i><b>${nf(mv.length)}</b> film · ${nf(Math.round(mm / 60))} jam</span>
  <span><i class="dot" style="background:var(--tl)"></i><b>${nf(tv.length)}</b> drama/serial${eps ? ' · ' + nf(eps) + ' episode' : ''} · ${nf(Math.round(tm / 60))} jam</span>`;
  const list = state.items.filter(i =>
    filter === 'all'
      ? true
      : filter === 'ongoing'
        ? i.type === 'tv' && !!i.seasons && pctOf(i.eps, i.seasons) < 100
        : i.type === filter
  );
  $('#grid').innerHTML = list.length
    ? list
        .map(
          i => `<article class="card">
    ${W(dAttr(i.key), i.poster ? `<img loading="lazy" src="${esc(i.poster)}" alt="">` : `<div class="ph">${esc(i.title)}</div>`, i.title)}
    <span class="tag ${i.type === 'tv' ? 'tv' : 'mv'}">${i.type === 'tv' ? 'Drama' : 'Film'}</span>
    <button class="x" data-k="${esc(i.key)}" aria-label="Hapus ${esc(i.title)}">✕</button>
    <div class="m"><h3>${dAttr(i.key) ? `<button class="ttl" data-d="${dAttr(i.key)}">${esc(i.title)}</button>` : esc(i.title)}</h3><p>${i.year || ''}${i.year ? ' · ' : ''}${i.minutes >= 60 ? Math.floor(i.minutes / 60) + ' j ' + (i.minutes % 60) + ' m' : i.minutes + ' m'}</p>${progressBlock(i)}</div></article>`
        )
        .join('')
    : `<div class="empty" style="grid-column:1/-1">${state.items.length ? 'Belum ada di kategori ini.' : 'Belum ada tontonan. Mulai dengan mencari satu judul favoritmu.'}</div>`;
}

/** Progres dan tontonan ulang di kartu Daftar, beserta tombol untuk mengubahnya. */
function progressBlock(i) {
  const key = esc(i.key);
  if (i.seasons) {
    const p = playsOf(i);
    if (!p) return '';
    const t = tally(i.seasons, p);
    const pct = pctOf(t.eps, i.seasons);
    const label =
      (pct >= 100 ? '✓ Selesai' : `${t.eps}/${totalEps(i.seasons)} eps · ${pct}%`) +
      (t.extra ? ` · ↻ ${t.extra}×` : '');
    return `<div class="prog"><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progres ${esc(i.title)}"><i style="width:${pct}%"></i></div><span>${label}</span></div><button class="upd" data-upd="${key}">Perbarui</button>`;
  }
  if (i.type === 'tv' && dAttr(i.key)) {
    return `<button class="upd" data-upd="${key}">Atur progres</button>`;
  }
  // Film atau judul manual: durasi sekali tonton dikali jumlah tonton.
  const n = blockPlays(i);
  const info =
    n > 1 ? `<div class="prog"><span>Ditonton ${n}× · ↻ ${n - 1}× ulang</span></div>` : '';
  return `${info}<button class="upd" data-play="${key}">${n > 1 ? 'Ubah jumlah tonton' : 'Tonton ulang'}</button>`;
}

function renderHome() {
  const n = state.items.length;
  $('#onb').hidden = n > 0;
  $('#hx').hidden = !n;
  if (!n) return;
  const mv = state.items.filter(i => i.type === 'movie'),
    tv = state.items.filter(i => i.type === 'tv');
  const now = new Date(),
    mon = state.items
      .filter(i => {
        if (!i.at) return 0;
        const d = new Date(i.at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((a, i) => a + i.minutes, 0);
  const lg = state.items.reduce((a, i) => (itemBase(i) > itemBase(a) ? i : a), state.items[0]),
    base = state.items.reduce((a, i) => a + itemBase(i), 0),
    re = totalRewatch(state.items),
    eps = tv.reduce((a, i) => a + (i.eps || 0), 0);
  const T = (l, v, s) => `<div class="tile"><p>${l}</p><b>${v}</b><span>${s}</span></div>`;
  $('#tiles').innerHTML =
    T('Judul', nf(n), 'dicatat') +
    T('Film', nf(mv.length), nf(Math.round(mv.reduce((a, i) => a + i.minutes, 0) / 60)) + ' jam') +
    T('Drama', nf(tv.length), eps ? nf(eps) + ' episode' : 'serial') +
    T('Rata-rata', fmtM(Math.round(base / n)), 'per judul') +
    T('Bulan ini', fmtM(mon), 'dicatat bulan ini') +
    T('Tonton ulang', nf(re.count) + '×', fmtM(re.minutes)) +
    T('Terlama', fmtM(itemBase(lg)), esc(lg.title));
  const M = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    nx = M.find(x => x > n) || n + 1000,
    pv = [...M].reverse().find(x => x <= n) || 0;
  $('#ms').innerHTML =
    `<b>Target berikutnya: ${nf(nx)} judul</b><div class="bar"><i style="width:${Math.round(((n - pv) / (nx - pv)) * 100)}%"></i></div><span class="note">Tinggal ${nf(nx - n)} judul lagi.</span>`;
  $('#rail').innerHTML = state.items
    .slice(0, 12)
    .map(i => {
      const dd = dAttr(i.key),
        img = i.poster
          ? `<img loading="lazy" src="${esc(i.poster)}" alt="">`
          : `<div class="ph">${esc(i.title)}</div>`;
      return `<div class="rc">${W(dd, img, i.title)}<p>${esc(i.title)}</p></div>`;
    })
    .join('');
}

export function initRender() {
  $('#grid').onclick = e => {
    const x = e.target.closest('.x');
    if (x) {
      removeWithUndo(x.dataset.k);
      return;
    }
    const py = e.target.closest('[data-play]');
    if (py) {
      openPlayCount(py.dataset.play);
      return;
    }
    const u = e.target.closest('.upd');
    if (!u) return;
    const label = u.textContent;
    u.disabled = true;
    u.textContent = '…';
    openTvEdit(u.dataset.upd)
      .catch(err => toast(err.message))
      .finally(() => {
        u.disabled = false;
        u.textContent = label;
      });
  };
  document.querySelectorAll('.tab[data-f]').forEach(
    t =>
      (t.onclick = () => {
        filter = t.dataset.f;
        document
          .querySelectorAll('.tab[data-f]')
          .forEach(x => x.setAttribute('aria-pressed', x === t));
        render();
      })
  );
}