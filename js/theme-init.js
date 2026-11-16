/** Terapkan tema sebelum halaman digambar agar tidak berkedip. */
try {
  document.documentElement.dataset.theme = localStorage.getItem('layar.theme') || 'dark';
} catch (e) {
  document.documentElement.dataset.theme = 'dark';
}
