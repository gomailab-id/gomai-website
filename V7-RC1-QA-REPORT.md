# Gomai Website V7 — Release Candidate 1 QA Report

Tanggal: 15 Agustus 2026  
Versi: `7.0.0-rc.1`

## Kesimpulan

V7 RC1 lulus seluruh pemeriksaan otomatis dan siap untuk **visual acceptance test** melalui VS Code Live Server. Build belum boleh diberi label V7 Final sebelum tampilan desktop dan mobile diperiksa secara langsung.

## Kontrak bisnis yang dikunci

- Minimum subtotal produk: **Rp50.000**.
- Rp50.000–Rp299.999: jasa Rp15.000 + pengantaran Rp5.000 = **Rp20.000**.
- Rp300.000–Rp499.999: jasa Rp25.000 + pengantaran Rp5.000 = **Rp30.000**.
- Rp500.000–Rp999.999: jasa Rp35.000 + pengantaran Rp5.000 = **Rp40.000**.
- Rp1.000.000–Rp1.999.999: jasa Rp50.000 + pengantaran Rp5.000 = **Rp55.000**.
- Rp2.000.000 atau lebih: konfirmasi khusus.
- Ongkir supplier ke Morowali bersifat dinamis dan dihitung sekali per Source ID unik.
- Gomai Express tidak memakai ongkir supplier.
- Gomai Express dan Official Order tidak dapat digabung dalam satu checkout.
- Kartu unduhan adalah estimasi/permintaan pesanan, bukan invoice atau bukti pembayaran.

## Hasil otomatis

| Pemeriksaan | Hasil |
|---|---|
| Sintaks seluruh JavaScript | Lulus |
| JSON runtime | Lulus |
| Struktur terjemahan ID/中文 | Lulus — 758 kunci |
| Referensi lokal HTML/CSS/JS/aset | Lulus |
| Urutan runtime (`app.js` terakhir) | Lulus |
| Integritas 6 brand, 4 kategori, dan produk | Lulus |
| Migrasi `gomai-cart-v1` | Lulus |
| Keranjang Express/Official terpisah | Lulus |
| Hapus satu kelompok layanan | Lulus |
| Nomor referensi tersimpan per layanan | Lulus |
| QR, ID, dan skema buka WeChat | Lulus |
| Identitas layanan pada kartu PNG | Lulus |

## Skenario perhitungan

| Skenario | Hasil |
|---|---:|
| Express, subtotal Rp100.000 | Total Rp120.000 |
| Official, subtotal Rp100.000 + ongkir confirmed Rp25.000 | Total Rp145.000 |
| Dua item dari Source ID yang sama | Ongkir tetap dihitung sekali: Rp25.000 |
| Ongkir estimated Rp20.000–Rp30.000 | Total Rp140.000–Rp150.000 |
| Ongkir pending | Total angka ditahan sampai ongkir diperiksa |

## Perbaikan RC1

- Tautan official store disembunyikan dari checkout Gomai Express.
- Kartu PNG mencetak `GOMAI EXPRESS` atau `OFFICIAL ORDER`.
- Nomor referensi dan nama file kartu dipisahkan per layanan.
- Dokumentasi lama Replacement 6/7.2 diperbarui menjadi V7 RC1.

## Visual acceptance test yang wajib

Jalankan `index.html` melalui VS Code Live Server, lalu periksa:

1. Desktop 1440 px: homepage, produk, detail, cart, kedua checkout, Contact, dan Cara Membeli.
2. Mobile 390 px: menu, tombol, cart, form checkout, dan tidak ada scroll horizontal.
3. Tambahkan satu produk ke masing-masing layanan melalui data uji lokal.
4. Unduh kartu ID dan 中文 untuk kedua layanan.
5. Pastikan semua item, total, identitas layanan, informasi pengantaran, QR, dan WeChat ID terbaca.
6. Uji tombol **Buka WeChat** pada Android dan iOS.

## Keterbatasan environment

Playwright tersedia, tetapi binary Chromium tidak tersedia pada environment build sehingga visual browser QA otomatis tidak dapat dijalankan. Kegagalan ini bukan kegagalan kode website; V7 Final tetap menunggu pemeriksaan visual nyata.

## Data katalog

Katalog produksi RC1 tetap berisi produk Official Order Atalon yang sudah ada. Produk Express sintetis hanya digunakan dalam unit test dan tidak dimasukkan ke katalog pelanggan. Produk lokal nyata berikutnya harus ditambahkan melalui `data/products.json` atau alur impor spreadsheet dengan `"serviceType": "express"`.
