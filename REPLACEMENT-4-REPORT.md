# Gomai Website Replacement 4 — Consolidation Report

Tanggal konsolidasi: 2026-08-11

## Ringkasan

Replacement 4 menggabungkan seluruh revisi visual dan integrasi yang telah disetujui ke satu baseline website penuh, sehingga instalasi tidak perlu dilakukan file demi file.

## Revisi yang Digabungkan

### Identitas Gomai
- Master logo Gomai final dikunci dan disimpan di `assets/gomai/logo-master.png`.
- Asset header turunan master disimpan di `assets/gomai/logo-header.png` dengan hanya memangkas area transparan kosong.
- Shared Header sekarang menggunakan logo gambar resmi dari `GomaiConfig.site.logo.header`.
- Fallback wordmark teks tetap tersedia apabila asset logo gagal dimuat.

### Brand Partner
- Brand aktif: Atalon, Specs, Erspo, Ortuseight, Decathlon, Whittaker.
- Keenam hero final menggunakan `hero.webp` berukuran 1600×900.
- Keenam logo menggunakan versi clean tanpa white halo/noise.
- Logo card menggunakan tight-crop asset + satu aturan CSS global; tidak ada CSS khusus per brand.
- Container logo homepage diperbesar dan `object-fit: contain` dipertahankan untuk konsistensi optik.

### Halaman Informasi Premium
- `pages/how-to-buy.html` — Premium Pass.
- `pages/about.html` — Premium Pass.
- `pages/contact.html` — Premium Pass.
- `pages/faq.html` — Premium Pass dengan 7 accordion FAQ.
- `css/information.css` dikonsolidasikan menjadi satu stylesheet kumulatif dan premium rules di-scope per halaman.

### Arsitektur yang Dipertahankan
- Satu `InformationController` untuk about/contact/faq/how-to-buy.
- Shared Header/Footer/Search tetap berada pada shared component layer.
- `app.js` tetap menjadi application script terakhir.
- Brand dan product tetap data-driven melalui JSON + Model layer.
- Bahasa tetap hanya `zh` dan `id`.

## Audit Statis Replacement 4

- 26 JavaScript files: lolos `node --check`.
- 15 CSS files: brace balance valid.
- 4 JSON files: parse valid.
- `id.json` dan `zh.json`: masing-masing 436 leaf keys dan tree identik.
- 10 HTML pages diperiksa.
- 266 translation hooks HTML: seluruhnya tersedia di ID dan 中文.
- Tidak ditemukan broken local HTML references.
- 6 brand logo + 6 hero asset final tersedia.
- Hero final terverifikasi 1600×900 WebP.
- Master logo dan header logo Gomai tersedia sebagai PNG RGBA.

## Catatan QA

Audit statis dan struktural telah selesai. Rendering browser otomatis di environment ini tidak dapat diselesaikan karena proses Chromium headless tidak keluar dengan normal. Karena itu, acceptance terakhir tetap dilakukan melalui Live Server di browser pengguna untuk memeriksa desktop/mobile, ID/中文, Header/Search/Footer, dan interaction FAQ secara visual.

## Instalasi

ZIP Replacement 4 sengaja tidak berisi folder `.git`. Extract ZIP ke parent folder repository dan merge/replace isi `gomai-website`; metadata Git lokal tetap aman.
