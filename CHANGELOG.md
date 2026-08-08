# Gomai Changelog

Semua perubahan teknis yang memengaruhi baseline proyek dicatat di sini.

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
