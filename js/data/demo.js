/** Data contoh (dummy) untuk Mode Contoh. */
import { K } from '../core/keys.js';
import { dMode } from '../features/explore.js';
import { shuffle } from '../core/utils.js';
import { state } from '../core/state.js';

export const demoMode = () => !state.omdbKey && !state.tmdbKey;

export const demoSeen = () => {
  try {
    sessionStorage.setItem('layar.demoSeen', '1');
  } catch (e) {}
};

const posterOf = (name, i) => {
  const h = (i * 47) % 360,
    l = [''];
  name.split(' ').forEach(x => {
    const c = (l[l.length - 1] + ' ' + x).trim();
    if (c.length > 13 && l[l.length - 1]) l.push(x);
    else l[l.length - 1] = c;
  });
  const tx = l
    .slice(0, 4)
    .map(
      (x, k) =>
        `<text x="150" y="${290 + k * 30}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="24" fill="#fff">${x.replace(/&/g, '&amp;')}</text>`
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},60%,38%)"/><stop offset="1" stop-color="hsl(${(h + 50) % 360},65%,16%)"/></linearGradient></defs><rect width="300" height="450" fill="url(#g)"/><circle cx="220" cy="90" r="60" fill="#fff" fill-opacity=".1"/><circle cx="60" cy="170" r="36" fill="#fff" fill-opacity=".08"/>${tx}<text x="150" y="428" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#fff" fill-opacity=".6">CONTOH</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

export const DEMO = (() => {
  const A = [
    'Raka Wirabuana',
    'Laras Anindya',
    'Dimas Prakoso',
    'Sekar Ayu',
    'Bima Santoso',
    'Nadia Kusuma',
  ];
  const mv = [
      [
        'Senja di Kota Tua',
        2021,
        112,
        'Drama,Romantis',
        7.4,
        'Dua orang asing bertemu di kota tua dan menemukan kisah lama yang mengikat mereka.',
      ],
      [
        'Pulau Seribu Bayangan',
        2019,
        128,
        'Misteri,Thriller',
        7.1,
        'Seorang peneliti terdampar di pulau yang menyimpan rahasia selama seabad.',
      ],
      [
        'Kopi Terakhir',
        2023,
        98,
        'Drama,Komedi',
        7.8,
        'Pemilik kedai kopi tua berjuang mempertahankan usahanya dengan cara yang tak terduga.',
      ],
      [
        'Jejak Naga Putih',
        2018,
        141,
        'Aksi,Petualangan',
        6.9,
        'Sekelompok pemburu harta mengejar peta kuno melintasi tiga benua.',
      ],
      [
        'Surat dari Utara',
        2020,
        105,
        'Drama',
        7.6,
        'Sepucuk surat lama membawa seorang anak pulang ke kampung halaman ayahnya.',
      ],
      [
        'Malam Seribu Lampu',
        2022,
        117,
        'Fantasi',
        7.3,
        'Festival lampu tahunan membuka gerbang ke dunia yang tersembunyi.',
      ],
      [
        'Detak',
        2024,
        93,
        'Thriller',
        6.8,
        'Seorang teknisi medis harus menghentikan sabotase sebelum fajar tiba.',
      ],
      [
        'Rumah di Ujung Gang',
        2017,
        101,
        'Horor',
        6.5,
        'Keluarga baru pindah ke rumah yang menyimpan suara-suara dari masa lalu.',
      ],
      [
        'Pelaut Terakhir',
        2016,
        134,
        'Petualangan,Drama',
        7.9,
        'Pelaut tua menempuh pelayaran terakhirnya untuk menepati sebuah janji.',
      ],
      [
        'Hujan Bulan Lalu',
        2025,
        109,
        'Romantis',
        7.0,
        'Dua sahabat lama dipertemukan kembali oleh hujan yang tak kunjung reda.',
      ],
      [
        'Kode Merah',
        2022,
        122,
        'Aksi',
        6.7,
        'Agen yang diberhentikan dipanggil kembali untuk satu misi yang mustahil.',
      ],
      [
        'Dongeng Kancil Digital',
        2023,
        88,
        'Animasi,Keluarga',
        7.2,
        'Si Kancil belajar bahwa kecerdikan paling berguna jika dipakai untuk menolong.',
      ],
      [
        'Lorong Waktu',
        2021,
        126,
        'Fiksi Ilmiah',
        7.5,
        'Sebuah lorong di stasiun tua membawa seorang pekerja ke tahun yang berbeda.',
      ],
      [
        'Tamu Tengah Malam',
        2019,
        96,
        'Horor,Misteri',
        6.6,
        'Penginapan sepi kedatangan tamu yang tidak tercatat di buku mana pun.',
      ],
    ],
    tv = [
      [
        'Kota Tanpa Nama',
        2022,
        [10, 10],
        55,
        'Drama,Misteri',
        8.2,
        'Seorang jurnalis menyelidiki kota yang namanya terhapus dari semua peta.',
      ],
      [
        'Cinta Musim Gugur',
        2023,
        [16],
        65,
        'Romantis',
        8.0,
        'Kisah dua dokter muda yang saling bertaut di tengah tekanan rumah sakit.',
      ],
      [
        'Para Penjaga Fajar',
        2021,
        [8, 8, 8],
        50,
        'Aksi,Fantasi',
        7.9,
        'Penjaga rahasia melindungi kota dari makhluk yang hanya muncul menjelang pagi.',
      ],
      [
        'Dapur Mak Nyak',
        2024,
        [12],
        45,
        'Komedi,Keluarga',
        7.6,
        'Warung makan keluarga yang kacau tapi hangat bertahan di tengah persaingan.',
      ],
      [
        'Kode Etik',
        2020,
        [12, 12],
        60,
        'Drama,Hukum',
        8.3,
        'Pengacara idealis menghadapi pilihan sulit antara kebenaran dan kariernya.',
      ],
      [
        'Laut Biru Seberang',
        2025,
        [10],
        50,
        'Petualangan',
        7.5,
        'Kru kapal kecil menelusuri jalur laut yang tidak ada di peta resmi.',
      ],
      [
        'Sekolah Bintang',
        2022,
        [14, 14],
        55,
        'Remaja,Drama',
        7.3,
        'Siswa-siswa sekolah seni mengejar mimpi sambil menghadapi persahabatan dan rivalitas.',
      ],
      [
        'Jejak Rempah',
        2023,
        [8],
        48,
        'Sejarah,Drama',
        8.1,
        'Saudagar muda menyusuri jalur rempah pada masa perdagangan laut.',
      ],
      [
        'Detektif Senja',
        2019,
        [10, 10, 10, 10],
        45,
        'Kriminal,Misteri',
        7.8,
        'Detektif pensiunan menyelesaikan kasus lama yang belum tuntas.',
      ],
      [
        'Rumah Kaca',
        2024,
        [12],
        58,
        'Thriller',
        7.7,
        'Keluarga terpandang menyimpan rahasia yang mulai retak satu per satu.',
      ],
    ];
  const out = [];
  mv.forEach(m =>
    out.push({
      t: 'movie',
      name: m[0],
      y: String(m[1]),
      min: m[2],
      genres: m[3].split(','),
      rating: m[4],
      ov: m[5],
    })
  );
  tv.forEach(m =>
    out.push({
      t: 'tv',
      name: m[0],
      y: String(m[1]),
      seasons: m[2],
      rt: m[3],
      genres: m[4].split(','),
      rating: m[5],
      ov: m[6],
    })
  );
  out.forEach((d, i) => {
    d.id = 'd' + (i + 1);
    d.p = posterOf(d.name, i);
    d.by = A[i % 6];
    d.cast = A[(i + 2) % 6] + ', ' + A[(i + 4) % 6];
  });
  return out;
})();

export const demoCard = d => ({ s: 'demo', t: d.t, id: d.id, name: d.name, y: d.y, p: d.p });

export function discoverDemo() {
  const have = new Set(state.items.map(i => i.key));
  return shuffle(DEMO.filter(d => dMode === 'mix' || d.t === dMode).map(demoCard))
    .slice(0, 12)
    .map(r => ({ ...r, done: have.has(K('demo', r.t, r.id)) }));
}
