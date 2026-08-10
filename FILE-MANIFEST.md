# Gomai File Manifest

**Canonical baseline:** full replacement consolidation, 2026-08-08.

## Status Legend

- `✅ STATIC-VERIFIED` — syntax/static/contract validation saat ini tidak menemukan blocker.
- `🔎 BROWSER-QA` — static validation lolos; masih perlu verifikasi visual/interaksi di browser.
- `🧹 CLEANUP-CANDIDATE` — tidak direferensikan runtime saat ini; dipertahankan sampai browser QA selesai.
- `📦 ASSET` — asset tersedia dan path runtime tervalidasi.

## Root

| File | Status | Catatan |
|---|---|---|
| `index.html` | ✅ STATIC-VERIFIED | `css/styles.css` lalu `css/home.css`; script order canonical dan `js/app.js` terakhir. |
| `404.html` | ✅ STATIC-VERIFIED | Menggunakan `css/styles.css` + `css/not-found.css`; tidak memakai asset legacy yang hilang. |
| `README.md` | ✅ STATIC-VERIFIED | Sudah mengikuti arsitektur Gomai saat ini. |
| `.gitattributes` | ✅ STATIC-VERIFIED | Menetapkan line-ending lintas Windows/Linux secara konsisten. |
| `struktur-proyek.txt` | 🧹 CLEANUP-CANDIDATE | Snapshot struktur lama; bukan source of truth. |

## Project Control

| File | Status | Catatan |
|---|---|---|
| `PROJECT.md` | ✅ STATIC-VERIFIED | Scope dan definition of done. |
| `ARCHITECTURE.md` | ✅ STATIC-VERIFIED | Kontrak dependency/runtime/CSS. |
| `DECISIONS.md` | ✅ STATIC-VERIFIED | Keputusan teknis yang dikunci. |
| `FILE-MANIFEST.md` | ✅ STATIC-VERIFIED | Manifest canonical ini. |
| `CHANGELOG.md` | ✅ STATIC-VERIFIED | Riwayat audit dan perubahan. |

## CSS

### Global

| File | Status | Catatan |
|---|---|---|
| `css/styles.css` | ✅ STATIC-VERIFIED | Aggregator global. |
| `css/variables.css` | ✅ STATIC-VERIFIED | Design tokens. |
| `css/reset.css` | ✅ STATIC-VERIFIED | Reset global. |
| `css/layout.css` | ✅ STATIC-VERIFIED | Layout primitives. |
| `css/components.css` | ✅ STATIC-VERIFIED | Shared UI; standard `line-clamp` sudah dipasangkan dengan vendor property. |
| `css/header.css` | ✅ STATIC-VERIFIED | Shared Header + SearchPanel; standard `line-clamp` sudah lengkap. |
| `css/responsive.css` | ✅ STATIC-VERIFIED | Global responsive rules. |

### Page-specific

| File | Status | Dipakai oleh |
|---|---|---|
| `css/home.css` | 🔎 BROWSER-QA | `index.html` |
| `css/brand.css` | 🔎 BROWSER-QA | `pages/brand.html` |
| `css/products.css` | 🔎 BROWSER-QA | `pages/products.html` |
| `css/search.css` | 🔎 BROWSER-QA | `pages/search.html` |
| `css/product-detail.css` | 🔎 BROWSER-QA | `pages/product-detail.html` |
| `css/information.css` | 🔎 BROWSER-QA | about/contact/faq/how-to-buy |
| `css/not-found.css` | 🔎 BROWSER-QA | `404.html` |
| `css/product.css` | 🧹 CLEANUP-CANDIDATE | Tidak direferensikan HTML saat ini. |

## JavaScript Foundation / Core

Seluruh JavaScript runtime pada baseline ini lolos `node --check`.

| File | Status |
|---|---|
| `js/config.js` | ✅ STATIC-VERIFIED |
| `js/core/utils.js` | ✅ STATIC-VERIFIED |
| `js/language.js` | ✅ STATIC-VERIFIED |
| `js/core/component-core.js` | ✅ STATIC-VERIFIED |
| `js/core/model-registry.js` | ✅ STATIC-VERIFIED |
| `js/core/component-registry.js` | ✅ STATIC-VERIFIED |
| `js/core/controller-registry.js` | ✅ STATIC-VERIFIED |
| `js/core/gomai.js` | ✅ STATIC-VERIFIED |
| `js/app.js` | ✅ STATIC-VERIFIED |
| `js/core/base-component.js` | 🧹 CLEANUP-CANDIDATE |

## Models

| File | Status | Catatan |
|---|---|---|
| `js/models/brands.js` | ✅ STATIC-VERIFIED | Brand data boundary. |
| `js/models/products.js` | ✅ STATIC-VERIFIED | Product data boundary. |
| `js/models/categories.js` | 🧹 CLEANUP-CANDIDATE | Kosong dan tidak direferensikan runtime saat ini. |

## Shared Components

| File | Status |
|---|---|
| `js/components/loading.js` | ✅ STATIC-VERIFIED |
| `js/components/empty-state.js` | ✅ STATIC-VERIFIED |
| `js/components/product-card.js` | ✅ STATIC-VERIFIED |
| `js/components/brand-card.js` | ✅ STATIC-VERIFIED | Language refresh + action label diverifikasi pada browser QA; arrow hanya dirender CSS. |
| `js/components/search-panel.js` | ✅ STATIC-VERIFIED |
| `js/components/header.js` | ✅ STATIC-VERIFIED |
| `js/components/footer.js` | ✅ STATIC-VERIFIED | Footer contact CTA memakai outline-light pada background gelap. |

`BrandCardComponent` menyediakan `refreshAll()` dan compatibility `refreshLanguage()`; tidak diperlukan perubahan Gomai Core untuk kontrak ini.

## Page Controllers

| File | Status | Page contract |
|---|---|---|
| `js/home.js` | ✅ STATIC-VERIFIED | `data-page="home"`; refresh bahasa juga me-refresh BrandCard render component. |
| `js/brand.js` | ✅ STATIC-VERIFIED | `data-page="brand"` |
| `js/products.js` | ✅ STATIC-VERIFIED | Search/filter/sort contract diverifikasi ulang; filter stok final konsisten untuk semua kombinasi state. |
| `js/product-detail.js` | ✅ STATIC-VERIFIED | `data-page="productDetail"` |
| `js/information.js` | ✅ STATIC-VERIFIED | Satu controller untuk 4 information pages. |
| `js/search.js` | ✅ STATIC-VERIFIED | Dedicated search page controller (`data-page="search"`). |

## HTML Pages

| File | Status | CSS page-specific |
|---|---|---|
| `pages/brand.html` | 🔎 BROWSER-QA | `../css/brand.css` |
| `pages/products.html` | 🔎 BROWSER-QA | `../css/products.css`; katalog/filter tanpa form pencarian. |
| `pages/search.html` | 🔎 BROWSER-QA | `../css/search.css`; halaman pencarian khusus. |
| `pages/product-detail.html` | 🔎 BROWSER-QA | `../css/product-detail.css` |
| `pages/about.html` | 🔎 BROWSER-QA | `../css/information.css` |
| `pages/contact.html` | 🔎 BROWSER-QA | `../css/information.css` |
| `pages/faq.html` | 🔎 BROWSER-QA | `../css/information.css` |
| `pages/how-to-buy.html` | 🔎 BROWSER-QA | `../css/information.css` |

Seluruh application pages memiliki script dependency order canonical dan `app.js` sebagai script runtime terakhir.

## Data

Keempat JSON lolos parse validation.

| File | Status | Catatan |
|---|---|---|
| `data/brands.json` | ✅ STATIC-VERIFIED | 6 brand; semua logo/hero path yang direferensikan tersedia. Hero memakai asset aktual `hero.webp`. |
| `data/products.json` | ✅ STATIC-VERIFIED | Produk terverifikasi saat ini memakai image runtime yang tersedia. |
| `data/id.json` | ✅ STATIC-VERIFIED | 436 leaf keys. |
| `data/zh.json` | ✅ STATIC-VERIFIED | 436 leaf keys; tree identik dengan `id.json`. |

Static translation scan tidak menemukan literal UI key yang hilang. Placeholder `{{...}}` pada key paralel ID/中文 konsisten.

## Assets

- 6 brand memiliki `logo.png` dan `hero.webp` yang tervalidasi keberadaannya. `📦 ASSET`
- Product image yang direferensikan `data/products.json` tersedia. `📦 ASSET`
- `left.webp` dan `stretch.webp` dipertahankan sementara sebagai cleanup candidates karena tidak direferensikan current product data dan format internalnya tidak sesuai ekstensi.

## Static Validation Result

Baseline replacement ini telah diperiksa untuk:

- JavaScript syntax (`node --check`);
- JSON parse;
- parity tree `id.json` ↔ `zh.json`;
- translation placeholder parity;
- literal translation key coverage;
- local HTML stylesheet/script/image references;
- duplicate HTML ids;
- `app.js` sebagai application script terakhir;
- CSS parse;
- standard + vendor `line-clamp` compatibility;
- brand/product asset references.

Tidak ada blocker static yang tersisa pada pemeriksaan tersebut.

## Remaining Work

1. 🔎 Browser QA desktop/mobile untuk seluruh halaman.
2. 🔎 Browser QA bahasa ID / 中文 dan dedicated Search page.
3. 🔎 Verifikasi visual hero, brand cards, product cards, product detail, information pages, dan 404.
4. 🧹 Setelah browser QA lolos, hapus cleanup candidates yang tetap terbukti tidak dipakai.
5. ✅ Buat Git checkpoint setelah browser QA stabil.
