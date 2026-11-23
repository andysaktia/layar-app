/** Perkiraan kuota harian MyMemory (dihitung di perangkat ini) dan email opsional untuk kuota lebih besar. */
const QUOTA_KEY = 'layar.trQuota';
const EMAIL_KEY = 'layar.mmEmail';

export const LIMIT_ANON = 5000;
export const LIMIT_EMAIL = 50000;

export const isValidEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

export function getEmail() {
  try {
    const e = localStorage.getItem(EMAIL_KEY) || '';
    return isValidEmail(e) ? e : '';
  } catch (err) {
    return '';
  }
}

export function setEmail(email) {
  try {
    if (email) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  } catch (err) {}
}

export const dailyLimit = () => (getEmail() ? LIMIT_EMAIL : LIMIT_ANON);

const today = () => new Date().toISOString().slice(0, 10);

/** Kuota hari ini: { used, limit, pct }. Otomatis mulai dari nol saat ganti hari. */
export function quotaInfo() {
  let used = 0;
  try {
    const q = JSON.parse(localStorage.getItem(QUOTA_KEY));
    if (q && q.date === today()) used = Number(q.used) || 0;
  } catch (e) {}
  const limit = dailyLimit();
  return { used, limit, pct: Math.min(100, Math.round((used / limit) * 100)) };
}

export function addUsed(chars) {
  const { used } = quotaInfo();
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today(), used: used + chars }));
  } catch (e) {}
}

/** Layanan melaporkan kuota habis: samakan hitungan lokal agar indikator tidak menyesatkan. */
export function markFull() {
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today(), used: dailyLimit() }));
  } catch (e) {}
}