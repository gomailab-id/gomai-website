# Gomai Website V7 — Release Candidate 1

Gomai adalah website belanja bilingual Indonesia / 中文 dengan arsitektur statis, data-driven, dan website-first.

## Menjalankan secara lokal

Buka folder `gomai-website` di VS Code lalu jalankan `index.html` melalui Live Server.

## Struktur produk saat ini

- Homepage berorientasi **4 kategori utama**.
- Brand dan produk berasal dari JSON + assets.
- Wishlist dan Cart memakai `localStorage`.
- Keranjang dan checkout memisahkan **Gomai Express** dari **Official Order**.
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

## Model layanan V7

- **Gomai Express**: produk lokal Morowali; ongkir supplier tidak berlaku.
- **Official Order**: produk dari supplier/official store; ongkir supplier ke Morowali diperiksa dan dikonfirmasi sebelum pembayaran.
- Kedua layanan memiliki keranjang, checkout, nomor referensi, dan kartu estimasi terpisah.

## Status QA

Release Candidate 1 telah lulus pemeriksaan sintaks, JSON, referensi aset, bilingual parity, migrasi keranjang, pemisahan layanan, tier biaya, ongkir supplier unik, kontrak WeChat, dan generator kartu PNG. Visual browser QA akhir tetap wajib dilakukan melalui VS Code Live Server karena binary Chromium tidak tersedia di lingkungan build.
