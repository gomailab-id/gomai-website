# Gomai Website

Gomai adalah website belanja dua bahasa (Indonesia / 中文) dengan arsitektur data-driven untuk brand, produk, komponen bersama, dan halaman informasi.

## Menjalankan secara lokal

Buka folder ini di VS Code, lalu jalankan melalui Live Server. Entry point utama adalah `index.html`.

## Struktur utama

- `assets/` — logo, hero brand, dan gambar produk.
- `css/` — global stylesheet dan page-specific stylesheet.
- `data/` — data brand, produk, serta kamus bahasa ID / 中文.
- `js/core/` — registry, component core, utilities, dan Gomai Core.
- `js/models/` — model data brand dan produk.
- `js/components/` — Header, Footer, SearchPanel, cards, loading, dan empty state.
- `js/*.js` — controller halaman dan application bootstrap.
- `pages/` — brand, products, product detail, about, contact, FAQ, dan how-to-buy.

## Aturan pengembangan

1. Brand dan produk baru ditambahkan melalui `data/` dan `assets/`, bukan dengan hardcode ke HTML/JS.
2. `js/app.js` tetap menjadi application bootstrap terakhir pada setiap halaman yang memakai Gomai Core.
3. Header dan Footer adalah shared components.
4. Halaman informasi menggunakan satu `InformationController`.
5. CSS global dimuat melalui `css/styles.css`; halaman kemudian memuat page-specific CSS masing-masing.
6. Jangan mengubah file berstatus locked/static-verified tanpa incompatibility konkret.

## Dokumen kontrol

- `PROJECT.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `FILE-MANIFEST.md`
- `CHANGELOG.md`

Dokumen di atas adalah sumber kontrol proyek untuk audit dan pengembangan berikutnya.
