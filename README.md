# Gomai Website — Replacement 6

Gomai adalah website belanja bilingual Indonesia / 中文 dengan arsitektur statis, data-driven, dan website-first.

## Menjalankan secara lokal

Buka folder `gomai-website` di VS Code lalu jalankan `index.html` melalui Live Server.

## Struktur produk saat ini

- Homepage berorientasi **4 kategori utama**.
- Brand dan produk berasal dari JSON + assets.
- Wishlist dan Cart memakai `localStorage`.
- Checkout menghasilkan **Ringkasan Pesanan PNG** dalam bahasa Indonesia atau 中文.
- Ringkasan dikirim melalui WeChat; stok dan harga akhir dikonfirmasi oleh Gomai sebelum pembayaran.
- Halaman informasi dibuat fokus: About, Contact, FAQ, dan How to Buy tidak saling mengulang konten.
- Contact dan Footer memakai QR WeChat yang sama dan WeChat ID yang dapat disalin.

## Empat kategori utama

1. Olahraga & Outdoor
2. Makanan & Minuman
3. Bahan Segar
4. Perlengkapan Harian

Tidak ada subkategori pada baseline ini.

## Aturan data-driven

Untuk menambah brand, produk, kategori, atau aset katalog, gunakan:
- `data/brands.json`
- `data/products.json`
- `data/categories.json`
- `assets/`

Jangan hardcode katalog baru ke HTML / CSS / JavaScript selama schema data yang ada mencukupi.

## Runtime

Dependency utama:

`config → utils/language → registries → models → shared components → page controller → Gomai Core → app.js`

`js/app.js` wajib menjadi script runtime terakhir.

## Bahasa

- `zh` — Mandarin / Simplified Chinese
- `id` — Indonesia

Kedua dictionary harus memiliki struktur key yang identik.

## QA

Replacement 6 telah melalui static QA lintas halaman, data, asset, translation, script order, commerce state contract, category contract, FAQ contract, QR/contact contract, serta responsive CSS contract.

Headless Chromium tidak dapat menyelesaikan local visual run pada environment build ini, sehingga visual QA akhir tetap dilakukan melalui VS Code Live Server pada desktop dan mobile viewport.
