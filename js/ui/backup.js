/** Cadangan: ekspor, bagikan, pengingat, dan status penyimpanan permanen. */
import { $, toast } from '../core/utils.js';
import { state } from '../core/state.js';
import {
  BACKUP_DAYS,
  CHANGE_THRESHOLD,
  backupDue,
  changesSinceBackup,
  daysSince,
  fmtDate,
  getLastBackup,
  isPersisted,
  markBackup,
  persistSupported,
  requestPersistence,
  snoozeBackup,
} from '../core/storage.js';

let persistDenied = false;

const realCount = () => state.items.filter(i => !i.demo).length;

function buildBackup() {
  const date = new Date().toISOString().slice(0, 10);
  return {
    json: JSON.stringify(state.items, null, 1),
    name: `layar-tontonan-${date}.json`,
  };
}

/** Apakah browser bisa membagikan berkas lewat menu bagikan sistem? */
function canShareFile() {
  try {
    if (!navigator.share || !navigator.canShare) return false;
    return navigator.canShare({
      files: [new File(['{}'], 'x.json', { type: 'application/json' })],
    });
  } catch (e) {
    return false;
  }
}

function backupReason(count) {
  const last = getLastBackup();
  if (!last) return 'Kamu belum pernah mengekspor daftarmu.';
  const changes = changesSinceBackup(count);
  if (changes >= CHANGE_THRESHOLD) {
    return `${changes} judul baru sejak ekspor terakhir (${fmtDate(last)}).`;
  }
  return `Terakhir diekspor ${daysSince(last)} hari lalu (${fmtDate(last)}).`;
}

/** Tampilkan atau sembunyikan banner pengingat cadangan di Beranda. */
export function updBackupBar() {
  const count = realCount();
  const due = backupDue(count);
  $('#backupBar').hidden = !due;
  if (!due) return;
  $('#backupMsg').textContent = `${backupReason(count)} Data hanya tersimpan di browser ini.`;
  $('#backupShare').hidden = !canShareFile();
}

/** Perbarui keterangan penyimpanan dan cadangan di Pengaturan. */
export async function refreshDataStatus() {
  const persisted = await isPersisted();
  const last = getLastBackup();
  const storage = !persistSupported()
    ? 'Penyimpanan: status tidak tersedia di browser ini.'
    : persisted
      ? 'Penyimpanan: permanen (tidak dihapus otomatis oleh browser).'
      : 'Penyimpanan: standar (browser bisa menghapusnya bila ruang perangkat penuh).';
  const backup = last
    ? `Cadangan terakhir: ${fmtDate(last)}${daysSince(last) > BACKUP_DAYS ? ' (sudah lama)' : ''}.`
    : 'Cadangan terakhir: belum pernah.';
  $('#stStatus').textContent = `${storage} ${backup}`;
  $('#bPersist').hidden = !persistSupported() || persisted;
  $('#persistHelp').hidden = !(persistDenied && !persisted);
  $('#bShare').hidden = !canShareFile();
}

function afterBackup() {
  markBackup(realCount());
  updBackupBar();
  refreshDataStatus();
}

export function exportData() {
  const { json, name } = buildBackup();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  afterBackup();
  toast('Cadangan diekspor');
}

/** Bagikan cadangan lewat menu bagikan sistem (Drive, email, WhatsApp, dan lainnya). */
export async function shareData() {
  const { json, name } = buildBackup();
  const file = new File([json], name, { type: 'application/json' });
  try {
    await navigator.share({
      files: [file],
      title: 'Cadangan Layar',
      text: 'Cadangan daftar tontonan Layar',
    });
    afterBackup();
    toast('Cadangan dibagikan');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    toast('Tidak bisa membagikan di browser ini. Pakai Ekspor.');
  }
}

export function initBackup() {
  $('#bExp').onclick = exportData;
  $('#backupNow').onclick = exportData;
  $('#bShare').onclick = shareData;
  $('#backupShare').onclick = shareData;
  $('#backupLater').onclick = () => {
    snoozeBackup();
    updBackupBar();
  };
  $('#bPersist').onclick = async () => {
    const ok = await requestPersistence();
    persistDenied = !ok;
    toast(
      ok ? 'Penyimpanan permanen aktif' : 'Izin belum diberikan browser. Lihat saran di bawah.'
    );
    refreshDataStatus();
  };
}