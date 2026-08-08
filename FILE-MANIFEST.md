# Gomai File Manifest

**Audit baseline:** snapshot `gomai-website.zip`, 2026-08-08.

## Status Legend

- `✅ STATIC-VERIFIED` — static/syntax/contract check saat ini tidak menemukan blocker; jangan edit tanpa incompatibility konkret.
- `🔎 VERIFY` — file tersedia dan tampak relevan, tetapi perlu integration/browser verification.
- `🛠 REVISE` — ada masalah konkret yang sudah teridentifikasi.
- `🧹 CLEANUP-CANDIDATE` — tidak dipakai runtime atau obsolete; jangan hapus sebelum cleanup phase.
- `📦 ASSET` — file asset yang ada dan tervalidasi keberadaannya.

## Root

| File | Status | Catatan |
|---|---|---|
| `index.html` | 🛠 REVISE | Hanya memuat `css/styles.css`; wajib memuat `css/home.css` setelah global CSS. |
| `404.html` | 🛠 REVISE | Masih legacy; stylesheet path `styles.css` salah terhadap struktur aktual dan asset lama perlu diaudit. |
| `README.md` | 🛠 REVISE | Isinya masih menggambarkan struktur MVP lama (`product.html`, `script.js`, satu styles file). Update setelah integration stabil. |
| `struktur-proyek.txt` | 🧹 CLEANUP-CANDIDATE | Snapshot tree lama/UTF-16; tidak menjadi source of truth. |

## Project Control

| File | Status | Catatan |
|---|---|---|
| `PROJECT.md` | ✅ STATIC-VERIFIED | Scope dan workflow baseline. |
| `ARCHITECTURE.md` | ✅ STATIC-VERIFIED | Kontrak architecture repository. |
| `DECISIONS.md` | ✅ STATIC-VERIFIED | Locked decisions log. |
| `FILE-MANIFEST.md` | ✅ STATIC-VERIFIED | Manifest ini; update setiap milestone. |
| `CHANGELOG.md` | ✅ STATIC-VERIFIED | Audit/change history. |

## CSS Global

| File | Status | Catatan |
|---|---|---|
| `css/styles.css` | ✅ STATIC-VERIFIED | Global aggregator: variables/reset/layout/components/header/responsive. Jangan import page CSS di sini. |
| `css/variables.css` | ✅ STATIC-VERIFIED | Design tokens. |
| `css/reset.css` | ✅ STATIC-VERIFIED | Global reset. |
| `css/layout.css` | ✅ STATIC-VERIFIED | Global layout primitives. |
| `css/components.css` | 🔎 VERIFY | Shared UI; runtime-relevant. Memiliki vendor `-webkit-line-clamp` warnings yang dapat dibersihkan setelah blocker utama. |
| `css/header.css` | 🔎 VERIFY | Shared Header/SearchPanel CSS. Memiliki vendor `-webkit-line-clamp` warnings yang tidak memblokir layout homepage. |
| `css/responsive.css` | ✅ STATIC-VERIFIED | Global responsive adjustments. |

## CSS Page-specific

| File | Status | Catatan |
|---|---|---|
| `css/home.css` | 🔎 VERIFY | Ada tetapi tidak dimuat oleh `index.html`. Verify sesudah wiring. |
| `css/brand.css` | 🔎 VERIFY | Ada tetapi tidak dimuat oleh `pages/brand.html`. |
| `css/products.css` | 🔎 VERIFY | Ada tetapi tidak dimuat oleh `pages/products.html`. |
| `css/product-detail.css` | 🔎 VERIFY | Ada tetapi tidak dimuat oleh `pages/product-detail.html`. |
| `css/information.css` | 🔎 VERIFY | Ada tetapi tidak dimuat oleh 4 information pages. |
| `css/product.css` | 🧹 CLEANUP-CANDIDATE | Tidak direferensikan HTML; audit menunjukkan dedicated `product-detail.css` tersedia. Jangan hapus sebelum cleanup. |

## JavaScript Foundation / Core

Seluruh 26 file JavaScript pada snapshot lolos `node --check`.

| File | Status | Catatan |
|---|---|---|
| `js/config.js` | ✅ STATIC-VERIFIED | Central configuration. |
| `js/core/utils.js` | ✅ STATIC-VERIFIED | Shared utility/data fetch boundary. |
| `js/language.js` | ✅ STATIC-VERIFIED | Language manager. |
| `js/core/component-core.js` | ✅ STATIC-VERIFIED | Component lifecycle core. |
| `js/core/model-registry.js` | ✅ STATIC-VERIFIED | Model lifecycle registry. |
| `js/core/component-registry.js` | ✅ STATIC-VERIFIED | Component lifecycle registry. |
| `js/core/controller-registry.js` | ✅ STATIC-VERIFIED | Controller lifecycle/page resolution. |
| `js/core/gomai.js` | ✅ STATIC-VERIFIED | Central framework boot/registration. |
| `js/app.js` | ✅ STATIC-VERIFIED | Single application bootstrap; uses `Gomai.boot()`. |
| `js/core/base-component.js` | 🧹 CLEANUP-CANDIDATE | Tidak direferensikan runtime lain dan tidak dimuat HTML. Sangat besar; jangan hapus sebelum cleanup verification. |

## Models

| File | Status | Catatan |
|---|---|---|
| `js/models/brands.js` | ✅ STATIC-VERIFIED | Brand data boundary. Current data path issue berada di JSON assets, bukan syntax model. |
| `js/models/products.js` | ✅ STATIC-VERIFIED | Product data boundary. |
| `js/models/categories.js` | 🧹 CLEANUP-CANDIDATE | File 0 byte; `ProductsModel` tidak membutuhkan `CategoriesModel`. |

## Components

| File | Status | Catatan |
|---|---|---|
| `js/components/loading.js` | ✅ STATIC-VERIFIED | Shared utility component. |
| `js/components/empty-state.js` | ✅ STATIC-VERIFIED | Shared empty/error state. |
| `js/components/product-card.js` | ✅ STATIC-VERIFIED | Reusable product renderer. |
| `js/components/brand-card.js` | ✅ STATIC-VERIFIED | Memiliki `refreshAll()` + `refreshLanguage()` compatibility API. |
| `js/components/search-panel.js` | ✅ STATIC-VERIFIED | Shared search UI/logic. Translation key coverage masih perlu fix di dictionary. |
| `js/components/header.js` | ✅ STATIC-VERIFIED | Shared Header; navigation dari BrandsModel. |
| `js/components/footer.js` | ✅ STATIC-VERIFIED | Shared Footer. |

## Page Controllers

| File | Status | Catatan |
|---|---|---|
| `js/home.js` | ✅ STATIC-VERIFIED | `data-page="home"`. |
| `js/brand.js` | ✅ STATIC-VERIFIED | `data-page="brand"`. |
| `js/products.js` | ✅ STATIC-VERIFIED | `data-page="products"`. |
| `js/product-detail.js` | ✅ STATIC-VERIFIED | `data-page="productDetail"`; beberapa translation keys belum tersedia. |
| `js/information.js` | ✅ STATIC-VERIFIED | Satu controller untuk about/contact/faq/howToBuy. |
| `js/search.js` | 🧹 CLEANUP-CANDIDATE | 4-line stub dan tidak dimuat halaman. |

## HTML Pages

Seluruh application pages saat ini memiliki canonical script order dan `app.js` berada paling akhir.

| File | Status | Catatan |
|---|---|---|
| `pages/brand.html` | 🛠 REVISE | Tambahkan `../css/brand.css` setelah `../css/styles.css`. |
| `pages/products.html` | 🛠 REVISE | Tambahkan `../css/products.css`. |
| `pages/product-detail.html` | 🛠 REVISE | Tambahkan `../css/product-detail.css`. |
| `pages/about.html` | 🛠 REVISE | Tambahkan `../css/information.css`. |
| `pages/contact.html` | 🛠 REVISE | Tambahkan `../css/information.css`; translation semantics juga perlu sinkronisasi. |
| `pages/faq.html` | 🛠 REVISE | Tambahkan `../css/information.css`. |
| `pages/how-to-buy.html` | 🛠 REVISE | Tambahkan `../css/information.css`. |

## Data

Keempat JSON lolos parse validation.
`id.json` dan `zh.json` masing-masing memiliki 427 leaf keys dan tree keduanya identik.

| File | Status | Catatan |
|---|---|---|
| `data/brands.json` | 🛠 REVISE | Semua 6 hero menunjuk `hero.png` yang tidak ada; repository menyimpan `hero.webp`. |
| `data/products.json` | ✅ STATIC-VERIFIED | Product image yang direferensikan saat ini (`right.webp`) ada. |
| `data/id.json` | 🛠 REVISE | Tree parity bagus, tetapi 17 UI keys terdeteksi belum tersedia. |
| `data/zh.json` | 🛠 REVISE | Harus direvisi paralel dengan `id.json` agar tree tetap identik. |

### Translation Keys yang Belum Tersedia pada Static Scan

```text
aboutPage.values.support.description
aboutPage.values.support.title
brands.featured
contactPage.links.badge
contactPage.links.faq
contactPage.links.howToBuy
contactPage.prepare.item1
contactPage.prepare.item2
contactPage.prepare.item3
contactPage.prepare.item4
contactPage.services.stock.description
contactPage.services.stock.title
productDetail.decreaseQuantity
productDetail.increaseQuantity
productDetail.meta.descriptionTemplate
productDetail.meta.titleTemplate
searchPanel.error
```

Catatan: sebelum menambah semua key secara mekanis, sinkronkan semantic structure HTML/controller dengan dictionary, terutama `contactPage.*`.

## Brand Assets

| Asset | Status |
|---|---|
| `assets/brands/atalon/logo.png` | 📦 ASSET |
| `assets/brands/atalon/hero.webp` | 📦 ASSET |
| `assets/brands/specs/logo.png` | 📦 ASSET |
| `assets/brands/specs/hero.webp` | 📦 ASSET |
| `assets/brands/erspo/logo.png` | 📦 ASSET |
| `assets/brands/erspo/hero.webp` | 📦 ASSET |
| `assets/brands/ortuseight/logo.png` | 📦 ASSET |
| `assets/brands/ortuseight/hero.webp` | 📦 ASSET |
| `assets/brands/decathlon/logo.png` | 📦 ASSET |
| `assets/brands/decathlon/hero.webp` | 📦 ASSET |
| `assets/brands/whittaker/logo.png` | 📦 ASSET |
| `assets/brands/whittaker/hero.webp` | 📦 ASSET |

## Product Assets

| Asset | Status | Catatan |
|---|---|---|
| `.../black/right.webp` | 📦 ASSET | Valid WebP dan direferensikan data saat ini. |
| `.../black/back-detail.webp` | 📦 ASSET | Valid WebP, belum direferensikan current product JSON. |
| `.../black/fabric.webp` | 📦 ASSET | Valid WebP, belum direferensikan current product JSON. |
| `.../black/left.webp` | 🔎 VERIFY | File berisi SVG walau ekstensi `.webp`; tidak direferensikan current product JSON. |
| `.../black/stretch.webp` | 🔎 VERIFY | File berisi SVG walau ekstensi `.webp`; tidak direferensikan current product JSON. |

## Current Integration Blockers — Priority Order

1. 🛠 CSS page-specific wiring di seluruh HTML.
2. 🛠 `data/brands.json` hero asset paths.
3. 🛠 translation key/semantic coverage untuk `id` + `zh`.
4. 🛠 `404.html` integration.
5. 🔎 browser QA seluruh page.
6. 🧹 cleanup obsolete files, line endings, README, project tree.

## Git Observation

Snapshot Git menunjukkan banyak file `M`.
Audit sebelumnya menunjukkan line-ending Windows/CRLF merupakan penyebab dominan, bukan bukti bahwa seluruh file mempunyai perubahan logic besar.
Jangan mass-reset atau mass-commit sebelum baseline integration selesai dan diff dinormalisasi.
