/** Pemasangan PWA, fallback gambar, dan registrasi service worker. */
import { $ } from '../core/utils.js';

let instEv = null;

export function initPwa() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    instEv = e;
    $('#bInst').hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    $('#bInst').hidden = true;
  });
  $('#bInst').onclick = async () => {
    if (!instEv) return;
    instEv.prompt();
    try {
      await instEv.userChoice;
    } catch (e) {}
    instEv = null;
    $('#bInst').hidden = true;
  };
  document.addEventListener(
    'error',
    e => {
      const im = e.target;
      if (!im || im.tagName !== 'IMG') return;
      const h = im.closest('.card,.row,.rc,.sc,.det'),
        t = h && h.querySelector('h3,p'),
        d = document.createElement('div');
      d.className = 'ph';
      d.textContent = t ? t.textContent : '';
      im.replaceWith(d);
    },
    true
  );
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol))
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
