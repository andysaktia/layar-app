/** Ketahanan penyimpanan: izin penyimpanan permanen dan pelacakan cadangan. */
const BACKUP_KEY = 'layar.lastBackup';
const SNOOZE_KEY = 'layar.backupSnooze';
const DAY = 86400000;

export const BACKUP_DAYS = 30;
export const SNOOZE_DAYS = 7;
export const MIN_ITEMS = 5;

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

export function markBackup() {
  write(BACKUP_KEY, Date.now());
  write(SNOOZE_KEY, null);
}

export const snoozeBackup = () => write(SNOOZE_KEY, Date.now());

/** Perlu diingatkan bila ada cukup judul asli dan cadangan belum ada atau sudah lama. */
export function backupDue(realCount) {
  if (realCount < MIN_ITEMS) return false;
  if (Date.now() - read(SNOOZE_KEY) < SNOOZE_DAYS * DAY) return false;
  const last = getLastBackup();
  return !last || Date.now() - last > BACKUP_DAYS * DAY;
}

export const daysSince = ts => Math.floor((Date.now() - ts) / DAY);

export const fmtDate = ts =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(ts)
  );