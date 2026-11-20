/** Pemasangan PWA, fallback gambar, dan registrasi service worker. */
import { $, toast } from '../core/utils.js';
import { APP_VERSION } from '../core/config.js';

const CHECK_EVERY = 5 * 60 * 1000; // periksa pembaruan saat aplikasi dibuka kembali, paling sering tiap 5 menit

let instEv = null;
let reg = null;
let lastCheck = 0;

/** Minta browser memeriksa sw.js ke server. Mengembalikan true bila versi baru sedang dipasang. */
async function checkForUpdate() {
  if (!reg) return false;
  lastCheck = Date.now();
  try {
    await reg.update();
  } catch (e) {}
  return !!(reg.installing || reg.waiting);
}

async function registerWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  // Bila halaman sudah dikendalikan service worker, perubahan pengendali berarti ada versi baru.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) $('#updBar').hidden = false;
  });
  try {
    reg = await navigator.serviceWorker.register(`sw.js?v=${APP_VERSION}`, {
      updateViaCache: 'none',
    });
  } catch (e) {
    return;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastCheck > CHECK_EVERY) checkForUpdate();
  });
}

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
  $('#appVer').textContent = `Versi aplikasi: v${APP_VERSION}`;
  $('#updBtn').onclick = () => location.reload();
  $('#bUpd').onclick = async () => {
    const btn = $('#bUpd');
    btn.disabled = true;
    btn.textContent = 'Memeriksa…';
    if (!reg) {
      toast('Pembaruan otomatis hanya aktif di situs yang di-hosting, bukan file lokal.');
    } else {
      await checkForUpdate();
      await new Promise(r => setTimeout(r, 900)); // beri waktu versi baru selesai dipasang
      const ready = !$('#updBar').hidden || reg.installing || reg.waiting;
      toast(
        ready ? 'Versi baru ditemukan. Ketuk Muat ulang.' : `Sudah versi terbaru (v${APP_VERSION})`
      );
    }
    btn.disabled = false;
    btn.textContent = 'Periksa pembaruan';
  };
  registerWorker();
}