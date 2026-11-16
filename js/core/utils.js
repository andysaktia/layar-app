/** Helper umum: DOM, escape HTML, format angka, toast. */
export const $ = s => document.querySelector(s);

export const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

export const nf = n => n.toLocaleString('id-ID');

export function toast(t) {
  const e = $('#toast');
  e.textContent = t;
  e.classList.add('on');
  clearTimeout(e._t);
  e._t = setTimeout(() => e.classList.remove('on'), 2200);
}

export const pic = u => (u && u !== 'N/A' ? u.replace('http:', 'https:') : null);

export const W = (dd, inner, l) =>
  dd ? `<button class="pic" data-d="${dd}" aria-label="Detail ${esc(l)}">${inner}</button>` : inner;

export const rnd = a => a[Math.floor(Math.random() * a.length)];

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const fmtM = m => (m >= 60 ? `${Math.floor(m / 60)} j ${m % 60} m` : `${m} m`);
