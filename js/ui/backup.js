/** Cadangan: ekspor, pengingat, dan status penyimpanan permanen. */
import { $, toast } from '../core/utils.js';
import { state } from '../core/state.js';
import {
  BACKUP_DAYS,
  backupDue,
  daysSince,
  fmtDate,
  getLastBackup,
  isPersisted,
  markBackup,
  persistSupported,
  requestPersistence,
  snoozeBackup,
} from '../core/storage.js';

const realCount = () => state.items.filter(i => !i.demo).length;

/** Tampilkan atau sembunyikan banner pengingat cadangan di Beranda. */
export function updBackupBar() {
  const due = backupDue(realCount());
  $('#backupBar').hidden = !due;
  if (!due) return;
  const last = getLastBackup();
  $('#backupMsg').textContent = last
    ? `Terakhir diekspor ${daysSince(last)} hari lalu (${fmtDate(last)}). Data hanya tersimpan di browser ini.`
    : 'Kamu belum pernah mengekspor daftarmu. Data hanya tersimpan di browser ini.';
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
}

export function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(state.items, null, 1)], { type: 'application/json' })
  );
  a.download = 'layar-tontonan.json';
  a.click();
  URL.revokeObjectURL(a.href);
  markBackup();
  updBackupBar();
  refreshDataStatus();
  toast('Cadangan diekspor');
}

export function initBackup() {
  $('#bExp').onclick = exportData;
  $('#backupNow').onclick = exportData;
  $('#backupLater').onclick = () => {
    snoozeBackup();
    updBackupBar();
  };
  $('#bPersist').onclick = async () => {
    const ok = await requestPersistence();
    toast(
      ok
        ? 'Penyimpanan permanen aktif'
        : 'Browser tidak memberi izin penyimpanan permanen. Pakai Ekspor sebagai cadangan.'
    );
    refreshDataStatus();
  };
}