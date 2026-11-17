# Layar

> Catat film dan drama yang sudah kamu tonton, lalu lihat berapa lama waktu yang sudah kamu habiskan di depan layar seumur hidup.

![Aplikasi statis](<https://img.shields.io/badge/aplikasi-statis%20(tanpa%20build)-4fd1c5>)
![PWA](https://img.shields.io/badge/PWA-siap%20dipasang-f5b942)
![Tanpa backend](https://img.shields.io/badge/backend-tidak%20ada-93a0bf)

**Layar** adalah aplikasi web satu halaman (HTML, CSS, dan JavaScript murni) untuk mencatat tontonan pribadi. Tidak ada server, akun, atau database: data tersimpan di browser penggunanya, dan setiap pengguna memakai API key miliknya sendiri.

<!-- Tambahkan tangkapan layar di docs/screenshots/ lalu aktifkan tabel di bawah.
| Beranda | Swipe cepat | Jelajah |
|---|---|---|
| ![Beranda](docs/screenshots/home.png) | ![Swipe](docs/screenshots/swipe.png) | ![Jelajah](docs/screenshots/explore.png) |
-->

## Daftar isi

- [Fitur](#fitur)
- [Mode penggunaan](#mode-penggunaan)
- [Mulai cepat](#mulai-cepat)
- [Mendapatkan API key](#mendapatkan-api-key)
- [Deploy](#deploy)
- [Data dan privasi](#data-dan-privasi)
- [Arsitektur](#arsitektur)
- [Struktur proyek](#struktur-proyek)
- [Rencana pengembangan](#rencana-pengembangan)
- [Atribusi dan lisensi data](#atribusi-dan-lisensi-data)
- [Lisensi](#lisensi)

## Fitur

| Halaman     | Kegunaan                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| **Beranda** | Total waktu tontonan seumur hidup, statistik ringkas, target berikutnya, dan poster "Terakhir ditonton"      |
| **Cari**    | Cari judul film dan drama, riwayat pencarian, dan tambah manual untuk judul yang tidak ditemukan             |
| **Swipe**   | Geser kanan kalau sudah nonton, kiri kalau belum. Cara tercepat mengisi riwayat awal                         |
| **Jelajah** | Temukan tontonan baru. Dengan TMDB tersedia filter genre, urutan Terbaru, Populer, Rating, dan nomor halaman |
| **Daftar**  | Semua judul yang sudah dicentang, dengan filter Film dan Drama                                               |

Fitur lainnya:

- **Modal detail**: judul, sinopsis, tahun, durasi, rating, genre, sutradara dan pemeran.
- **Hitung durasi drama per season**, jadi pengguna bisa memilih season yang sudah ditonton. Durasi dijumlah dari tiap episode.
- **Tema gelap dan terang** (gelap sebagai bawaan).
- **PWA**: bisa dipasang ke layar utama, dan beranda, total, serta daftar bisa dibuka offline.
- **Ekspor dan impor JSON** untuk cadangan.
- **Navigasi bawah** di HP dan tab di layar lebar.
- **Pintasan keyboard** di halaman Swipe: panah kiri dan kanan untuk memilih, `Backspace` atau `Z` untuk membatalkan.
- **Alamat per halaman** lewat hash: `#home`, `#search`, `#swipe`, `#explore`, `#list`.

## Mode penggunaan

Layar memilih mode otomatis berdasarkan API key yang diisi di Pengaturan.

| Mode        | Syarat        | Sumber data                                                   | Cocok untuk                                                     |
| ----------- | ------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| **Contoh**  | Tidak ada key | 24 judul dummy bawaan (tanpa internet)                        | Melihat-lihat fitur, demo, atau showcase                        |
| **Cepat**   | Key OMDb      | Film dari OMDb, drama dari TVmaze                             | Mencentang riwayat dengan cepat                                 |
| **Lengkap** | Key TMDB      | Jelajah dan detail dari TMDB, pencarian tetap TVmaze dan OMDb | Mencari tontonan baru dengan filter genre, Terbaru, dan halaman |

Catatan:

- Di **Mode Contoh**, semua judul adalah data dummy. Ada banner dan modal peringatan yang meminta pengguna mengisi API key.
- Judul contoh yang dicentang **dihapus otomatis** saat pengguna mengisi key. Judul asli yang ditambahkan manual tidak ikut terhapus.
- Pengisian kolom TMDB mengaktifkan mode Lengkap. Mengosongkannya kembali ke mode Cepat (atau Contoh bila OMDb juga kosong).

## Mulai cepat

Layar adalah situs statis tanpa langkah build. Karena memakai ES modules, aplikasi **harus dibuka lewat server HTTP**, bukan dengan klik dua kali `index.html` (`file://`).

```bash
git clone https://github.com/<username>/<nama-repo>.git
cd <nama-repo>

python3 -m http.server 8080
# atau
npx serve .
```

Buka `http://localhost:8080`. Tanpa key, aplikasi langsung berjalan di Mode Contoh.

## Mendapatkan API key

Key bersifat opsional dan **diisi sendiri oleh tiap pengguna** di **Pengaturan** (ikon di kanan atas). Key tersimpan hanya di browser.

**OMDb (film, mode Cepat), gratis**

1. Buka <https://www.omdbapi.com/apikey.aspx> dan pilih **FREE**.
2. Isi nama dan email, lalu klik link aktivasi yang dikirim ke emailmu.
3. Tempel key di kolom _OMDb API Key_. Batas gratis: 1.000 permintaan per hari per key.

**TMDB (mode Lengkap), gratis untuk non-komersial**

1. Buat akun di <https://www.themoviedb.org> dan verifikasi emailnya.
2. Buka _Settings → API_, lalu ajukan key bertipe _Developer_ (penggunaan pribadi).
3. Tempel _API Key (v3)_ atau _API Read Access Token_ di kolom _TMDB API Key_.

> **Jangan pernah meng-commit API key ke repo.** Layar tidak membutuhkannya di dalam kode. Kalau key terlanjur ter-commit, anggap sudah bocor dan buat key baru.

## Deploy

**Vercel**

1. Impor repo di Vercel.
2. _Framework Preset_: **Other**. Kosongkan _Build Command_ dan _Output Directory_.
3. Deploy.

**GitHub Pages**

1. Buka _Settings → Pages_.
2. _Source_: branch `main`, folder `/ (root)`.

Semua path di aplikasi bersifat relatif, jadi Layar juga berjalan di sub-path (misalnya `username.github.io/nama-repo/`).

**Memperbarui PWA:** naikkan konstanta `VERSION` di `sw.js` setiap rilis. Semua berkas aplikasi diambil dari jaringan lebih dulu dan baru memakai cache saat offline, jadi pembaruan ikut masuk begitu pengguna online.

## Data dan privasi

- Tidak ada server milik Layar, dan tidak ada data pengguna yang dikirim ke pihak lain selain permintaan pencarian ke API publik (TVmaze, OMDb, TMDB) langsung dari browser.
- Data disimpan di `localStorage` browser:

| Kunci                                    | Isi                                           |
| ---------------------------------------- | --------------------------------------------- |
| `layar.items`                            | Daftar tontonan                               |
| `layar.omdb`, `layar.tmdb`               | API key milik pengguna                        |
| `layar.theme`                            | Tema terang atau gelap                        |
| `layar.skip`                             | Judul yang digeser ke kiri di Swipe           |
| `layar.rc`                               | Riwayat pencarian                             |
| `layar.lastBackup`, `layar.backupSnooze` | Waktu ekspor terakhir dan penundaan pengingat |

- Membersihkan data browser menghapus semuanya. Gunakan **Ekspor** di Pengaturan sebagai cadangan, dan **Impor** untuk memulihkannya.
- Ekspor hanya berisi daftar tontonan, **tidak** menyertakan API key.
- **Pengingat cadangan:** bila ada minimal 5 judul asli dan belum pernah diekspor (atau sudah lebih dari 30 hari), Beranda menampilkan banner pengingat. Pengguna bisa mengekspor langsung atau menundanya 7 hari.
- **Penyimpanan permanen:** setelah ada judul yang tercatat, Layar meminta browser menjadikan penyimpanannya permanen (`navigator.storage.persist()`) agar tidak dihapus otomatis saat ruang perangkat penuh. Status dan tombol permintaannya ada di Pengaturan. Browser boleh menolak, jadi Ekspor tetap satu-satunya cadangan yang pasti.
- Setiap entri tontonan disimpan dalam bentuk ringkas:

```json
{
  "key": "tmdb-movie-603",
  "type": "movie",
  "title": "Judul",
  "year": "1999",
  "poster": "https://…",
  "minutes": 136,
  "eps": 0,
  "at": 1760000000000
}
```

## Arsitektur

**Layer:** Consumer
**Bergantung pada:** TVmaze API, OMDb API (opsional), TMDB API (opsional), dipanggil langsung dari browser
**Dipakai oleh:** pengguna akhir
**Status pengecualian arsitektur:** Tidak ada

Layar tidak membundel dataset tontonan. Data sumber selalu ditarik dari API pihak ketiga, sedangkan daftar tontonan adalah data milik pengguna. Satu-satunya data yang dibundel adalah 24 judul dummy untuk Mode Contoh, yang hanya berfungsi sebagai demo dan tidak pernah bercampur dengan data asli.

```
TVmaze ──┐
OMDb   ──┼─► diseragamkan ─► localStorage ─► total waktu dan daftar
TMDB   ──┘   {key,type,title,year,poster,minutes,eps,at}
```

Setiap entri membawa awalan sumber di kuncinya (`movie-…` OMDb, `tv-…` TVmaze, `tmdb-…` TMDB, `demo-…` contoh, `manual-…` manual), sehingga modal detail tahu API mana yang harus dipanggil.

**Batasan yang diketahui**

- Judul yang sama bisa tercatat dua kali bila ditambahkan lewat sumber berbeda, karena ID antar sumber tidak disamakan.
- Durasi disimpan saat judul dicentang dan tidak diperbarui otomatis.
- Poster hanya ditautkan, tidak diunduh, dan tidak tersedia offline.
- Key tersimpan di sisi browser. Untuk layanan yang dibuka banyak pengguna tanpa key masing-masing, diperlukan service layer tipis (misalnya fungsi serverless) yang menyimpan key di environment variable.

## Struktur proyek

```
.
├── index.html                 # markup halaman
├── manifest.webmanifest       # metadata PWA
├── sw.js                      # service worker (precache dan offline)
├── assets/icons/              # ikon PWA
├── css/
│   ├── variables.css          # design token dan tema gelap/terang
│   ├── base.css               # reset, elemen dasar, header, tombol
│   ├── hero.css               # ringkasan total waktu
│   ├── lists.css              # pencarian, hasil, grid kartu
│   ├── dashboard.css          # statistik dan rel poster di Beranda
│   ├── swipe.css              # mode Swipe cepat
│   ├── navigation.css         # navigasi bawah dan tab
│   └── components.css         # dialog, formulir, detail, toast, footer
└── js/
    ├── main.js                # titik masuk: merangkai modul dan menjalankan aplikasi
    ├── theme-init.js          # menerapkan tema sebelum halaman digambar
    ├── core/                  # fondasi tanpa UI
    │   ├── config.js          # konstanta
    │   ├── state.js           # state dan penyimpanan localStorage
    │   ├── storage.js         # penyimpanan permanen dan pelacakan cadangan
    │   ├── utils.js           # helper DOM, format, toast
    │   ├── keys.js            # penanda sumber data pada kunci judul
    │   └── api.js             # klien TVmaze, OMDb, TMDB
    ├── data/
    │   └── demo.js            # data contoh (dummy) untuk Mode Contoh
    ├── features/              # satu berkas per fitur
    │   ├── search.js
    │   ├── add.js
    │   ├── explore.js
    │   ├── detail.js
    │   └── swipe.js
    └── ui/                    # tampilan dan interaksi umum
        ├── render.js          # ringkasan, daftar, beranda
        ├── nav.js             # navigasi antarhalaman
        ├── backup.js          # ekspor, pengingat cadangan, status penyimpanan
        ├── settings.js        # pengaturan, tema, ekspor dan impor
        └── pwa.js             # pemasangan PWA dan service worker
```

Aturan sederhana: `core` tidak bergantung pada `features` maupun `ui`. Tiap modul fitur dan UI mengekspor fungsi `init…()` yang memasang event handler-nya, dan semuanya dipanggil dari `main.js`.

## Pengembangan

Alat bantu pengembangan bersifat opsional dan tidak dibutuhkan untuk menjalankan aplikasi.

```bash
npm install
npm start            # server lokal
npm run lint         # ESLint
npm run format       # rapikan kode dengan Prettier
npm run check        # lint + cek format (dipakai CI)
```

CI di `.github/workflows/ci.yml` menjalankan lint dan cek format pada setiap push ke `main` dan pull request.

**Menambah berkas JS atau CSS baru:** daftarkan juga di `SHELL` pada `sw.js` dan naikkan `VERSION`, supaya tersedia saat offline dan cache lama dibersihkan.

## Rencana pengembangan

- [ ] Edit season untuk drama yang sudah dicatat
- [ ] Watchlist "Mau ditonton" dan tandai tonton ulang
- [ ] Rating pribadi dan statistik per tahun atau genre
- [ ] Filter negara dan bahasa (misalnya drama Korea, Jepang, Tiongkok)
- [ ] Impor dari CSV (Letterboxd, IMDb)
- [ ] Kartu statistik yang bisa dibagikan
- [ ] Sinkron antar perangkat (membutuhkan service layer dan login)

## Atribusi dan lisensi data

Layar memakai data dari layanan berikut. Hormati syarat masing-masing, terutama bila repo ini dipublikasikan atau dikembangkan lebih jauh.

- **TVmaze** (<https://www.tvmaze.com>): data drama dan serial. Berlisensi CC BY-SA, wajib mencantumkan atribusi.
- **OMDb API** (<https://www.omdbapi.com>): data film. Menurut ringkasan di beberapa paket pihak ketiga, konten OMDb berlisensi CC BY-NC dan untuk pemakaian non-komersial. Cek syarat terbaru di situs resminya.
- **TMDB** (<https://www.themoviedb.org>): _This product uses the TMDB API but is not endorsed or certified by TMDB._ Gratis untuk pemakaian non-komersial. Pemakaian komersial memerlukan perjanjian tertulis dengan TMDB. Syarat TMDB juga meminta logo TMDB bila aplikasi dipublikasikan, jadi tambahkan logonya sebelum dibagikan luas.

Poster di Mode Contoh dibuat secara lokal dan bukan karya dari film atau drama sungguhan. Semua judul, sinopsis, dan nama di data contoh adalah fiksi.

## Lisensi

Kode di repo ini dirilis di bawah lisensi **MIT** (tambahkan berkas `LICENSE` berisi nama pemilik hak cipta dan tahun). Lisensi ini hanya berlaku untuk kode. Data dari TVmaze, OMDb, dan TMDB tetap tunduk pada syarat masing-masing, seperti dijelaskan di atas.