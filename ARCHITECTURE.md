# Gomai Architecture

## 1. Tujuan

Dokumen ini mendefinisikan arsitektur teknis repository Gomai.
Perubahan yang bertentangan dengan dokumen ini harus mempunyai alasan integration requirement yang konkret dan dicatat di `DECISIONS.md`.

## 2. Dependency Direction

```text
config / utils / language
        ↓
core + registries
        ↓
models
        ↓
shared components
        ↓
page controller
        ↓
Gomai Core
        ↓
app bootstrap
```

Layer yang lebih atas boleh menggunakan layer di bawahnya sesuai kontrak, tetapi UI tidak boleh melewati model untuk membaca raw JSON katalog.

## 3. Runtime Layers

### Configuration

`js/config.js`

Tanggung jawab:

- site metadata;
- language configuration;
- storage key;
- currency;
- contact;
- route;
- data path;
- query parameter;
- shared selector/UI config.

Tidak melakukan DOM access, fetch, atau application state.

### Utilities

`js/core/utils.js`

Tanggung jawab:

- route/path helper;
- fetch/data helper;
- formatting dan reusable utility.

Raw network/data loading harus terpusat di utility/model/language layer, bukan UI component.

### Language

`js/language.js`

Tanggung jawab:

- load dictionary;
- menyimpan current language;
- translation lookup/interpolation;
- apply translation pada DOM;
- dispatch lifecycle language.

Language yang didukung berasal dari `GomaiConfig.language`.

### Registries / Core

- `js/core/component-core.js`
- `js/core/model-registry.js`
- `js/core/component-registry.js`
- `js/core/controller-registry.js`

Registry mengelola lifecycle, bukan business content.

### Models

- `js/models/brands.js`
- `js/models/products.js`

Models adalah boundary data untuk UI.

UI/component/controller tidak membaca `data/brands.json` atau `data/products.json` secara langsung.

### Shared Components

- `js/components/loading.js`
- `js/components/empty-state.js`
- `js/components/product-card.js`
- `js/components/brand-card.js`
- `js/components/search-panel.js`
- `js/components/header.js`
- `js/components/footer.js`

Header dan Footer adalah global components.
SearchPanel dipicu/dihost oleh Header, tetapi search logic tetap berada pada SearchPanel component.

### Page Controllers

- `js/home.js` → `data-page="home"`
- `js/brand.js` → `data-page="brand"`
- `js/products.js` → `data-page="products"`
- `js/product-detail.js` → `data-page="productDetail"`
- `js/information.js` → `data-page="information"`

Information pages memakai satu `InformationController` dengan subtype melalui `data-information-page`:

- `about`
- `contact`
- `faq`
- `howToBuy`

Controller hanya memiliki page-specific behavior. Header/Footer/SearchPanel lifecycle tidak boleh dipindahkan ke page controller.

### Framework Bootstrap

`js/core/gomai.js`

Tanggung jawab:

- inisialisasi Language;
- register/init Models;
- register/init Components;
- register/init Controller yang sesuai page;
- dispatch framework lifecycle.

### Application Entry Point

`js/app.js`

Tanggung jawab utamanya memanggil `Gomai.boot()` dan menangani bootstrap failure secara global.

`app.js` harus menjadi script runtime terakhir pada halaman aplikasi.

## 4. Canonical Script Order

Untuk halaman aplikasi biasa:

```text
1.  js/config.js
2.  js/core/utils.js
3.  js/language.js
4.  js/core/component-core.js
5.  js/core/model-registry.js
6.  js/core/component-registry.js
7.  js/core/controller-registry.js
8.  js/models/brands.js
9.  js/models/products.js
10. js/components/loading.js
11. js/components/empty-state.js
12. js/components/product-card.js
13. js/components/brand-card.js
14. js/components/search-panel.js
15. js/components/header.js
16. js/components/footer.js
17. page controller
18. js/core/gomai.js
19. js/app.js
```

Path memakai `../` bila halaman berada di folder `/pages/`.

## 5. HTML Contract

Setiap application page harus menyediakan:

```html
<header id="site-header"></header>
...
<footer id="site-footer"></footer>
```

`body[data-page]` menentukan controller aktif.

Information page wajib memakai:

```html
<body data-page="information" data-information-page="...">
```

HTML tidak boleh menyimpan daftar brand/product sebagai source of truth.
Dynamic content host boleh berisi loading/fallback semantic content, tetapi controller/model adalah runtime source.

## 6. CSS Architecture

### Global Bundle

`css/styles.css` hanya memuat global CSS:

```text
variables.css
reset.css
layout.css
components.css
header.css
responsive.css
```

### Page-specific CSS

Page CSS **tidak** di-import dari `styles.css`.
Setiap HTML harus memuat global stylesheet lebih dahulu lalu stylesheet khusus halaman.

Mapping canonical:

```text
index.html                     → css/styles.css + css/home.css
pages/brand.html               → ../css/styles.css + ../css/brand.css
pages/products.html            → ../css/styles.css + ../css/products.css
pages/product-detail.html      → ../css/styles.css + ../css/product-detail.css
pages/about.html               → ../css/styles.css + ../css/information.css
pages/contact.html             → ../css/styles.css + ../css/information.css
pages/faq.html                 → ../css/styles.css + ../css/information.css
pages/how-to-buy.html          → ../css/styles.css + ../css/information.css
```

Page-specific stylesheet harus ditulis setelah `styles.css` agar page rules dapat melakukan override secara terkendali.

## 7. Data Contract

### Brands

Runtime source: `data/brands.json`.

Asset path harus menunjuk file yang benar-benar ada di repository.
Jangan mengubah ekstensi pada JSON tanpa benar-benar mengonversi/menamai ulang asset.

### Products

Runtime source: `data/products.json`.

Product media disimpan di:

```text
assets/products/<brand>/<product>/<color>/...
```

### Translation

- `data/zh.json`
- `data/id.json`

Kedua file wajib memiliki key tree identik.
Semua key yang dipakai oleh HTML/JS harus tersedia di kedua dictionary.

## 8. Architecture Guardrails

Dilarang tanpa keputusan baru:

- `fetch()` katalog langsung dari component/controller;
- hardcoded array brand/product di Header/page controller;
- page-specific Header/Footer implementation;
- controller-specific global language listener bila registry sudah mengelolanya;
- bootstrap kedua selain `Gomai.boot()`;
- `DOMContentLoaded` bootstrap di page controller;
- membuat empat controller terpisah untuk about/contact/faq/how-to-buy;
- memasukkan semua page CSS ke global bundle;
- menambah dependency/framework baru hanya untuk merapikan kode.

## 9. Validation Gates

Sebelum file dinyatakan stabil:

- JavaScript: `node --check`;
- JSON: parse validation;
- HTML: dependency order + unique IDs + required mount points;
- assets: path existence;
- translations: key parity + UI-key coverage;
- browser: console + interaction + responsive + multilingual.
