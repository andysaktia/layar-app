/** Render ringkasan, daftar tontonan, dan beranda. */
import { $, W, esc, fmtM, nf, toast } from '../core/utils.js';
import { dAttr } from '../core/keys.js';
import { save, state } from '../core/state.js';
import { updBackupBar } from './backup.js';

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
  $('#libTot').textContent = tot
    ? `Total ${nf(d)} hari ${h} jam ${m} menit · ${nf(state.items.length)} judul`
    : '';
  $('#sub').textContent = tot
    ? `Itu ${nf(Math.round(tot / 60))} jam nonton, setara ${((tot / 60 / 24 / 365) * 100).toFixed(2).replace('.', ',')}% dari satu tahun penuh tanpa tidur.`
    : 'Cari judul di bawah dan tandai yang sudah kamu tonton. Totalnya langsung dihitung di sini.';
  $('#split').innerHTML = tot
    ? `<div style="width:${(mm / tot) * 100}%;background:var(--am)"></div><div style="width:${(tm / tot) * 100}%;background:var(--tl)"></div>`
    : '';
  $('#legend').innerHTML =
    `<span><i class="dot" style="background:var(--am)"></i><b>${nf(mv.length)}</b> film · ${nf(Math.round(mm / 60))} jam</span>
  <span><i class="dot" style="background:var(--tl)"></i><b>${nf(tv.length)}</b> drama/serial${eps ? ' · ' + nf(eps) + ' episode' : ''} · ${nf(Math.round(tm / 60))} jam</span>`;
  const list = state.items.filter(i => filter === 'all' || i.type === filter);
  $('#grid').innerHTML = list.length
    ? list
        .map(
          i => `<article class="card">
    ${W(dAttr(i.key), i.poster ? `<img loading="lazy" src="${esc(i.poster)}" alt="">` : `<div class="ph">${esc(i.title)}</div>`, i.title)}
    <span class="tag ${i.type === 'tv' ? 'tv' : 'mv'}">${i.type === 'tv' ? 'Drama' : 'Film'}</span>
    <button class="x" data-k="${esc(i.key)}" aria-label="Hapus ${esc(i.title)}">✕</button>
    <div class="m"><h3>${dAttr(i.key) ? `<button class="ttl" data-d="${dAttr(i.key)}">${esc(i.title)}</button>` : esc(i.title)}</h3><p>${i.year || ''}${i.year ? ' · ' : ''}${i.minutes >= 60 ? Math.floor(i.minutes / 60) + ' j ' + (i.minutes % 60) + ' m' : i.minutes + ' m'}</p></div></article>`
        )
        .join('')
    : `<div class="empty" style="grid-column:1/-1">${state.items.length ? 'Belum ada di kategori ini.' : 'Belum ada tontonan. Mulai dengan mencari satu judul favoritmu.'}</div>`;
}

function renderHome() {
  const n = state.items.length;
  $('#onb').hidden = n > 0;
  $('#hx').hidden = !n;
  if (!n) return;
  const mv = state.items.filter(i => i.type === 'movie'),
    tv = state.items.filter(i => i.type === 'tv'),
    tot = state.items.reduce((a, i) => a + i.minutes, 0);
  const now = new Date(),
    mon = state.items
      .filter(i => {
        if (!i.at) return 0;
        const d = new Date(i.at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((a, i) => a + i.minutes, 0);
  const lg = state.items.reduce((a, i) => (i.minutes > a.minutes ? i : a), state.items[0]),
    eps = tv.reduce((a, i) => a + (i.eps || 0), 0);
  const T = (l, v, s) => `<div class="tile"><p>${l}</p><b>${v}</b><span>${s}</span></div>`;
  $('#tiles').innerHTML =
    T('Judul', nf(n), 'dicatat') +
    T('Film', nf(mv.length), nf(Math.round(mv.reduce((a, i) => a + i.minutes, 0) / 60)) + ' jam') +
    T('Drama', nf(tv.length), eps ? nf(eps) + ' episode' : 'serial') +
    T('Rata-rata', fmtM(Math.round(tot / n)), 'per judul') +
    T('Bulan ini', fmtM(mon), 'dicatat bulan ini') +
    T('Terlama', fmtM(lg.minutes), esc(lg.title));
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
    const b = e.target.closest('.x');
    if (!b) return;
    const it = state.items.find(i => i.key === b.dataset.k);
    state.items = state.items.filter(i => i.key !== b.dataset.k);
    save();
    render();
    toast('Dihapus: ' + (it ? it.title : ''));
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