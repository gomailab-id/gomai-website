# Gomai Decisions Log

Dokumen ini menyimpan keputusan teknis yang tidak boleh ditebak ulang pada chat berikutnya.

## D-001 — Repository Aktual adalah Source of Truth

**Status:** Accepted  
**Tanggal:** 2026-08-08

Snapshot repository aktual menjadi dasar audit. Percakapan lama dipakai sebagai konteks, tetapi tidak boleh mengalahkan file aktual tanpa verifikasi.

## D-002 — Data-driven Brand dan Product

**Status:** Accepted

Brand dan product dikelola melalui JSON + assets + Model layer.
Penambahan katalog tidak boleh membutuhkan perubahan HTML/JS selama schema yang ada mencukupi.

## D-003 — Dua Bahasa: zh dan id

**Status:** Accepted

Repository mendukung Mandarin (`zh`) dan Indonesia (`id`).
Konfigurasi runtime saat ini menetapkan `zh` sebagai default/fallback.
Dictionary harus mempunyai key tree identik.

## D-004 — Shared Header, Footer, Search

**Status:** Accepted

Header dan Footer adalah shared global components.
SearchPanel adalah shared component yang di-host/dipicu Header.
Page controller tidak memiliki lifecycle komponen global tersebut.

## D-005 — Satu InformationController

**Status:** Accepted

`about`, `contact`, `faq`, dan `how-to-buy` menggunakan satu `InformationController`.
Subtype ditentukan dengan `data-information-page`.

## D-006 — Single Application Bootstrap

**Status:** Accepted

`js/app.js` menjalankan `Gomai.boot()`.
`app.js` harus menjadi script terakhir.
Tidak dibuat bootstrap terpisah pada page controller.

## D-007 — Global CSS dan Page CSS Dipisah

**Status:** Accepted

`css/styles.css` hanya aggregator global.
Page-specific CSS harus dimuat langsung oleh HTML setelah `styles.css`.

Keputusan ini mencegah semua halaman mengunduh CSS yang tidak diperlukan dan mengurangi collision antarhalaman.

## D-008 — Asset Path Harus Mengikuti File Aktual

**Status:** Accepted

Format file tidak boleh diasumsikan dari standar lama.
Saat snapshot 2026-08-08, hero enam brand tersedia sebagai `hero.webp`, sementara `data/brands.json` menunjuk `hero.png` yang tidak ada.
Integration fix harus menyelaraskan JSON dengan asset aktual atau melakukan konversi asset secara eksplisit; tidak boleh sekadar mengganti ekstensi berdasarkan dugaan.

## D-009 — Gomai Core Tidak Diubah untuk BrandCard Refresh

**Status:** Accepted

Snapshot saat ini menunjukkan `BrandCardComponent` sudah menyediakan `refreshAll()` dan `refreshLanguage()` sebagai compatibility API.
Tidak ada alasan untuk mengubah Gomai Core pada isu ini.

## D-010 — Legacy File Tidak Dihapus Sebelum Integration Stabil

**Status:** Accepted

File yang tampak obsolete diklasifikasikan dulu sebagai cleanup candidate.
Penghapusan dilakukan setelah page integration dan browser QA, supaya tidak menghapus dependency tersembunyi berdasarkan asumsi.

## D-011 — Fix Blocker Sebelum Cosmetic Cleanup

**Status:** Accepted

Urutan prioritas:

1. CSS page wiring;
2. asset path mismatch;
3. translation coverage;
4. 404 integration;
5. static validation;
6. browser QA;
7. legacy/line-ending/README cleanup;
8. Git stable checkpoint.

Warning kosmetik atau lint yang tidak memblokir runtime tidak boleh menggeser blocker integrasi utama.

## D-012 — Full Replacement Baseline untuk Recovery

**Status:** Accepted  
**Tanggal:** 2026-08-08

Untuk recovery proyek setelah workflow patch menjadi terlalu kompleks, satu paket full replacement boleh menjadi baseline canonical baru selama paket tersebut:

- berasal dari snapshot repository aktual;
- menggabungkan hanya perubahan yang sudah diaudit/terverifikasi;
- lolos static validation;
- mempertahankan Git repository dan remote;
- tidak menghapus cleanup candidates sebelum browser QA kecuali ada alasan konkret.

Setelah baseline replacement dipakai, perubahan berikutnya kembali mengikuti audit → validate → checkpoint.


## Search UX

- Tombol ikon pencarian pada shared Header membuka `pages/search.html`.
- Pencarian memiliki halaman khusus; `pages/products.html` hanya bertanggung jawab sebagai katalog semua produk dan filter katalog.
- Query pencarian menggunakan parameter `q`.
- Search page dapat menampilkan hasil brand dan produk melalui model + card component yang sudah ada.

## D-012 — Master Logo Gomai Dikunci untuk Replacement 4

**Status:** Accepted  
**Tanggal:** 2026-08-11

Master logo Gomai final menjadi source visual resmi. Header menggunakan asset turunan master yang hanya memangkas area transparan; bentuk, warna, dan identitas master tidak boleh didesain ulang tanpa keputusan baru.

## D-013 — Brand Logo Menggunakan Optical Fit Global

**Status:** Accepted  
**Tanggal:** 2026-08-11

Logo brand dipersiapkan dengan tight crop dan ditampilkan menggunakan satu aturan global `object-fit: contain`. Per-brand CSS tidak digunakan agar brand baru dapat ditambahkan melalui data/assets tanpa revisi styling.

## D-014 — Information Pages Premium Tetap Satu Controller

**Status:** Accepted  
**Tanggal:** 2026-08-11

How-to-Buy, About, Contact, dan FAQ boleh memiliki presentation layer premium berbeda melalui scoped CSS, tetapi tetap menggunakan satu `InformationController` dan shared Header/Footer/Search architecture.
