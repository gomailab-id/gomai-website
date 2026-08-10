# Gomai Changelog

## 2026-08-10 — Dedicated Search Page

- Menambahkan `pages/search.html`, `css/search.css`, dan SearchController final di `js/search.js`.
- Tombol pencarian shared Header sekarang menuju halaman pencarian khusus secara langsung.
- Menghapus form pencarian dari halaman `Semua Produk`; halaman tersebut kembali fokus pada katalog dan filter.
- Menambahkan route `search` pada config dan registrasi SearchController pada Gomai Core.
- SearchPanel compatibility route diarahkan ke halaman search, bukan katalog products.


Semua perubahan teknis yang memengaruhi baseline proyek dicatat di sini.

## 2026-08-08 — Phase 2 / Integration Blocker #2: Brand Hero Asset Paths

### Changed

- `data/brands.json` memperbaiki enam `assets.hero` dari `hero.png` menjadi `hero.webp`.
- Perubahan hanya menyelaraskan data dengan asset yang benar-benar tersedia di repository.

### Verified

- keenam target `assets/brands/<brand>/hero.webp` benar-benar ada;
- keenam `logo.png` tetap ada dan tidak diubah;
- `data/brands.json` lolos JSON parse validation;
- tidak ada `hero.png` tersisa pada `data/brands.json`;
- tidak ada JavaScript, HTML, CSS, atau model yang diubah pada milestone ini.

### Next Planned Change

Integration Blocker #3: sinkronkan translation key/semantic coverage untuk `data/id.json` dan `data/zh.json`, terutama struktur `contactPage.*`, tanpa menambah key secara spekulatif.

## 2026-08-08 — Phase 2 / Integration Blocker #1: CSS Page Wiring

### Changed

- `index.html` sekarang memuat `css/home.css` setelah `css/styles.css`.
- `pages/brand.html` sekarang memuat `../css/brand.css`.
- `pages/products.html` sekarang memuat `../css/products.css`.
- `pages/product-detail.html` sekarang memuat `../css/product-detail.css`.
- `pages/about.html`, `pages/contact.html`, `pages/faq.html`, dan `pages/how-to-buy.html` sekarang memuat `../css/information.css`.

### Verified

- seluruh page-specific stylesheet yang direferensikan benar-benar ada pada repository;
- global stylesheet tetap dimuat lebih dulu;
- tidak ada page-specific CSS yang dimasukkan ke `css/styles.css`;
- tidak ada JavaScript, JSON, atau CSS rule yang diubah pada milestone ini.

### Next Planned Change

Integration Blocker #2: perbaiki enam hero asset path pada `data/brands.json` dari `.png` ke asset `.webp` yang benar-benar tersedia.

## 2026-08-08 — Recovery Audit Baseline

### Added

- `PROJECT.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `FILE-MANIFEST.md`
- `CHANGELOG.md`

### Audited

- repository structure dari `gomai-website.zip`;
- 26 JavaScript files dengan `node --check` — semua lolos;
- 4 JSON files — semua valid;
- application page script order — konsisten dan `app.js` terakhir;
- body page markers — sesuai controller architecture;
- Header/Footer shared mount architecture;
- brand/product asset path existence;
- translation dictionary tree parity;
- initial UI translation key coverage;
- unused/legacy candidate references;
- Git status dan repository history.

### Confirmed Blockers

1. Semua application HTML hanya memuat global `styles.css` dan belum memuat page-specific stylesheet.
2. Enam hero path di `data/brands.json` menunjuk `.png` yang tidak ada, sementara asset aktual adalah `.webp`.
3. `id.json` dan `zh.json` mempunyai struktur identik tetapi static scan menemukan 17 key UI yang belum tersedia.
4. `404.html` masih memakai path/struktur legacy.

### Confirmed Non-blockers / Deferred Cleanup

- CSS `line-clamp` compatibility warnings tidak menyebabkan homepage raw layout; cleanup ditunda sampai integration blockers selesai.
- `js/core/base-component.js`, `js/search.js`, `js/models/categories.js`, dan `css/product.css` diklasifikasikan sebagai cleanup candidate; belum dihapus.
- `left.webp` dan `stretch.webp` ternyata berisi SVG, tetapi tidak direferensikan current product JSON sehingga bukan blocker baseline saat ini.

### Next Planned Change

Integration Blocker #1: perbaiki **CSS page wiring** di seluruh HTML secara sistematis, lalu jalankan static verification sebelum menyentuh page CSS itu sendiri.

## 2026-08-08 — Full replacement consolidation

- Menggabungkan Project Control Pack, CSS page wiring, hero asset path fix, dan translation synchronization ke satu baseline repository.
- Memperbaiki lima warning kompatibilitas `line-clamp` tanpa mengubah perilaku visual yang dimaksud.
- Mengintegrasikan `404.html` dengan struktur CSS aktual dan menghapus referensi asset legacy yang tidak ada.
- Menambahkan `css/not-found.css` untuk halaman 404.
- Memperbarui `README.md` agar mencerminkan arsitektur Gomai saat ini.
- Menambahkan `.gitattributes` untuk line-ending lintas Windows/Linux yang stabil.
- Cleanup candidates yang tidak direferensikan runtime tetap dipertahankan sampai browser QA selesai, sesuai keputusan proyek.
- `left.webp` dan `stretch.webp` tetap dipertahankan sebagai cleanup candidates karena tidak direferensikan current product data.
## 2026-08-08 — Browser QA runtime fixes

### Fixed

- Homepage BrandCard sekarang ikut berubah saat bahasa diganti ID ↔ 中文.
- Label BrandCard tidak lagi menghasilkan panah ganda; panah hanya berasal dari CSS pseudo-element.
- Tombol kontak Footer sekarang menggunakan `btn-outline-light`, sehingga teks terlihat pada background footer gelap.

### Observed / Content Pending

- Keenam brand masih memakai file logo dan hero placeholder yang byte-identik. Ini bukan bug runtime; asset brand asli perlu menggantikan placeholder tersebut ketika tersedia.

## 2026-08-10 — Search and All Products re-audit

### Verified

- Header homepage search button terhubung ke `SearchPanelComponent` secara lazy.
- Submit pencarian membentuk route `pages/products.html?q=...`.
- `ProductsController` membaca parameter `q`, menyinkronkan search input, dan menjalankan `ProductsModel.search()`.
- `pages/products.html` memuat `products.css` dan seluruh control utama yang dibutuhkan controller.
- Data produk aktif saat ini berjumlah satu item, sehingga halaman Semua Produk memang hanya menampilkan satu produk sampai katalog ditambah.

### Fixed

- Filter stok `Tersedia` pada halaman Semua Produk sekarang diterapkan pada hasil akhir untuk semua kombinasi query/brand/category. Sebelumnya kondisi tanpa query, brand, dan kategori mengambil `getActive()` sehingga filter `Tersedia` dapat terlewati ketika katalog nanti berisi produk stok habis.

### QA Status

- Search flow: static contract verified; tetap perlu satu browser click-through QA.
- All Products: static contract verified setelah stock-filter fix; tetap perlu browser visual/interaksi QA.

