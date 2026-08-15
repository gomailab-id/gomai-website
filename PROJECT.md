# Gomai Project V7 — Release Candidate 1

## Scope

Gomai adalah website katalog dan pemesanan ringan tanpa login/backend pada baseline ini.

Alur utama:

`Homepage → Kategori → Produk → Detail → Wishlist/Cart per layanan → Checkout per layanan → Download PNG → WeChat → Konfirmasi Gomai → Pembayaran → Pengantaran`

## Halaman

- `index.html` — homepage category-first.
- `pages/brand.html` — koleksi satu brand.
- `pages/products.html` — katalog semua produk atau satu kategori utama.
- `pages/product-detail.html` — detail produk yang fokus.
- `pages/search.html` — hasil pencarian.
- `pages/wishlist.html` — wishlist lokal.
- `pages/cart.html` — cart lokal.
- `pages/checkout.html` — data pengantaran + generator ringkasan PNG.
- `pages/how-to-buy.html` — cara pelanggan mengirim permintaan dan alur transparansi Gomai sebagai jasa titip pihak ketiga.
- `pages/about.html` — hanya tentang Gomai.
- `pages/contact.html` — WeChat QR + copyable WeChat ID.
- `pages/faq.html` — 9 accordion FAQ.
- `404.html` — not found.

## Commerce MVP

- Tidak ada akun/login.
- Tidak ada backend/database.
- Wishlist dan Cart memakai localStorage.
- Checkout belum menarik pembayaran.
- Kode referensi client-side berbentuk `GM-####`.
- PNG order summary mempunyai tinggi dinamis agar seluruh produk dan informasi pengantaran tetap terlihat.
- Gomai Express dan Official Order tidak dapat digabung dalam satu checkout.
- Kartu PNG mencetak identitas layanan dan total estimasi pembayaran.
- Harga dan ketersediaan dikonfirmasi Gomai sebelum pembayaran.

## Bahasa

- Mandarin (`zh`)
- Indonesia (`id`)

Runtime mempertahankan `zh` sebagai default/fallback saat ini.

## Definition of Done Baseline

Baseline static-ready jika:
- seluruh JSON valid;
- seluruh JavaScript lolos `node --check`;
- semua local HTML/CSS/JS/image references yang statis valid;
- dictionary ID/ZH parity;
- brand/category/product references valid;
- `app.js` menjadi script terakhir;
- Header/Footer shared;
- 4 kategori utama tanpa subkategori;
- Wishlist/Cart/Checkout contract tetap aktif;
- FAQ chevron accessibility contract tetap aktif;
- QR + copyable WeChat ID tersedia di Contact dan Footer;
- responsive CSS tersedia untuk seluruh kelompok halaman utama.

Visual/browser QA tetap wajib sebelum deployment production.
