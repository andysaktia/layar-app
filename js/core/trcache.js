/** Cache terjemahan di localStorage: potongan yang pernah diterjemahkan tidak memakai kuota lagi. */
const KEY = 'layar.trCache';
const MAX = 300;

const hash = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

const idOf = (pair, text) => `${pair}:${text.length}:${hash(text)}`;

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (e) {
    return {};
  }
};

export function cacheGet(pair, text) {
  const hit = load()[idOf(pair, text)];
  return hit ? hit.t : null;
}

export function cacheSet(pair, text, translated) {
  const all = load();
  all[idOf(pair, text)] = { t: translated, at: Date.now() };
  const keys = Object.keys(all);
  if (keys.length > MAX) {
    keys
      .sort((a, b) => all[a].at - all[b].at)
      .slice(0, keys.length - MAX)
      .forEach(k => delete all[k]);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {}
}