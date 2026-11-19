/** Ketahanan penyimpanan: izin penyimpanan permanen dan pelacakan cadangan. */
const BACKUP_KEY = 'layar.lastBackup';
const SNOOZE_KEY = 'layar.backupSnooze';
const COUNT_KEY = 'layar.backupCount';
const DAY = 86400000;

export const BACKUP_DAYS = 30;
export const SNOOZE_DAYS = 7;
export const MIN_ITEMS = 5;
export const CHANGE_THRESHOLD = 10;

let asked = false;

const read = key => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch (e) {
    return 0;
  }
};

const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch (e) {}
};

/* ---------- penyimpanan permanen ---------- */

export const persistSupported = () => !!(navigator.storage && navigator.storage.persist);

export async function isPersisted() {
  try {
    return persistSupported() && (await navigator.storage.persisted());
  } catch (e) {
    return false;
  }
}

export async function requestPersistence() {
  if (!persistSupported()) return false;
  try {
    return await navigator.storage.persist();
  } catch (e) {
    return false;
  }
}

/** Minta penyimpanan permanen sekali per sesi, setelah ada judul asli yang tercatat. */
export function maybePersist(realCount) {
  if (asked || realCount < 1 || !persistSupported()) return;
  asked = true;
  isPersisted().then(done => {
    if (!done) requestPersistence();
  });
}

/* ---------- cadangan ---------- */

export const getLastBackup = () => read(BACKUP_KEY);

/** Jumlah judul saat cadangan terakhir. Bila tidak tercatat (data lama), anggap sama dengan sekarang. */
const getBackupCount = fallback => {
  try {
    const raw = localStorage.getItem(COUNT_KEY);
    return raw === null ? fallback : Number(raw) || 0;
  } catch (e) {
    return fallback;
  }
};

export function markBackup(realCount) {
  write(BACKUP_KEY, Date.now());
  write(COUNT_KEY, realCount);
  write(SNOOZE_KEY, null);
}

export const snoozeBackup = () => write(SNOOZE_KEY, Date.now());

/** Jumlah judul asli yang ditambahkan sejak cadangan terakhir. */
export const changesSinceBackup = realCount =>
  getLastBackup() ? Math.max(0, realCount - getBackupCount(realCount)) : realCount;

/** Perlu diingatkan bila ada cukup judul asli, dan cadangan belum ada, sudah lama, atau sudah banyak perubahan. */
export function backupDue(realCount) {
  if (realCount < MIN_ITEMS) return false;
  if (Date.now() - read(SNOOZE_KEY) < SNOOZE_DAYS * DAY) return false;
  const last = getLastBackup();
  if (!last) return true;
  return Date.now() - last > BACKUP_DAYS * DAY || changesSinceBackup(realCount) >= CHANGE_THRESHOLD;
}

export const daysSince = ts => Math.floor((Date.now() - ts) / DAY);

export const fmtDate = ts =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(ts)
  );