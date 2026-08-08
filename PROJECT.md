# Gomai Project

## 1. Tujuan Dokumen

Dokumen ini adalah ringkasan scope produk Gomai yang berlaku untuk repository ini.
Ia dipakai bersama `ARCHITECTURE.md`, `DECISIONS.md`, `FILE-MANIFEST.md`, dan `CHANGELOG.md` sebagai sumber kebenaran proyek.

Riwayat percakapan ChatGPT bukan sumber utama status teknis proyek. Jika ada perbedaan antara percakapan lama dan repository aktual, repository + dokumen kontrol ini harus diaudit terlebih dahulu sebelum perubahan dilakukan.

## 2. Produk Saat Ini

Gomai adalah website katalog belanja statis dan data-driven.
Website menampilkan brand dan produk, membantu pengguna menjelajahi katalog, lalu mengarahkan proses komunikasi/pemesanan melalui kanal Gomai seperti WeChat.

Versi repository saat ini belum merupakan aplikasi commerce dengan database, cart server-side, checkout server-side, atau payment gateway terintegrasi.

## 3. Scope MVP Repository

### Halaman

- `index.html` — homepage berbasis brand.
- `pages/brand.html` — halaman koleksi satu brand.
- `pages/products.html` — katalog seluruh produk.
- `pages/product-detail.html` — detail satu produk.
- `pages/about.html` — informasi tentang Gomai.
- `pages/contact.html` — kontak.
- `pages/faq.html` — FAQ.
- `pages/how-to-buy.html` — panduan pembelian.
- `404.html` — halaman not found.

### Bahasa

Repository mendukung dua bahasa:

- Mandarin / Simplified Chinese (`zh`)
- Indonesia (`id`)

Konfigurasi runtime saat ini menetapkan `zh` sebagai default dan fallback language.

### Data

Sumber data runtime:

- `data/brands.json`
- `data/products.json`
- `data/zh.json`
- `data/id.json`

Brand dan produk tidak boleh ditambahkan dengan mengedit markup HTML atau membuat array katalog baru di component/controller.

## 4. Prinsip Produk Teknis

1. **Data-driven** — brand, produk, dan konten multilingual berasal dari data.
2. **Brand-first homepage** — homepage menjadi entry point untuk brand.
3. **Mobile-first** — UI harus nyaman digunakan di handphone terlebih dahulu.
4. **Mandarin-first implementation** — sesuai konfigurasi runtime saat ini, dengan Indonesia tetap setara sebagai bahasa yang didukung.
5. **Progressive robustness** — halaman tetap memiliki struktur semantic dan error/empty state yang jelas.
6. **Shared UI** — Header, Footer, SearchPanel, BrandCard, ProductCard, loading, dan empty state tidak diduplikasi per halaman.
7. **Single bootstrap** — aplikasi dimulai melalui Gomai Core dan `js/app.js`.

## 5. Bukan Scope Saat Ini

Jangan menambahkan fitur berikut tanpa keputusan produk baru:

- database backend;
- akun/login pengguna;
- cart server-side;
- checkout server-side;
- payment gateway langsung di website;
- marketplace escrow;
- CMS;
- framework frontend baru.

## 6. Definition of Done untuk Baseline Stabil

Baseline MVP dinyatakan stabil jika:

- seluruh halaman memuat CSS global + CSS khusus halaman yang benar;
- seluruh path data dan assets valid;
- dictionary `id` dan `zh` memiliki struktur key identik dan tidak ada key UI yang hilang;
- seluruh script dependency termuat dalam urutan yang benar;
- `node --check` lolos untuk seluruh JavaScript;
- seluruh JSON valid;
- tidak ada error JavaScript di browser pada alur utama;
- homepage, brand, products, product detail, information pages, search, dan 404 lolos QA desktop/mobile;
- switching `zh` ↔ `id` bekerja tanpa teks key mentah atau bahasa campur yang tidak disengaja;
- obsolete file sudah diklasifikasikan dan cleanup dilakukan setelah integrasi stabil;
- Git memiliki checkpoint baseline stabil yang bersih.

## 7. Workflow Wajib

Untuk setiap perubahan:

1. baca file aktual;
2. cek dependency dan kontraknya;
3. tentukan `SKIP`, `REVISE`, atau `CLEANUP-CANDIDATE`;
4. hanya revisi jika ada masalah konkret;
5. validasi syntax/static;
6. update `FILE-MANIFEST.md` dan `CHANGELOG.md`;
7. lock file setelah stabil;
8. lanjut berdasarkan dependency, bukan berdasarkan tebakan.
