# Gomai Decisions V7 — Release Candidate 1

## D-001 — Repository aktual adalah source of truth
Accepted.

## D-002 — Data-driven catalog
Brand, kategori, dan produk ditambah melalui JSON + assets selama schema mencukupi.

## D-003 — Dua bahasa
Hanya `zh` dan `id`.

## D-004 — Empat kategori utama
- sports-outdoor
- food-beverage
- fresh-food
- daily-supplies

Tidak ada subkategori.

## D-005 — Homepage category-first
Homepage menjadi pintu masuk empat kategori utama; brand tetap tersedia sebagai discovery layer sekunder.

## D-006 — Shared Header / Footer / Search
Lifecycle global tidak diduplikasi di page controller.

## D-007 — Header bersih
Top yellow utility/promo bar tidak ditampilkan.

## D-008 — Information Pages = Focused Content Only
Tidak ada cross-promotion section yang berulang antar About, Contact, FAQ, dan How to Buy.

## D-009 — WeChat contact
Contact dan Footer memakai QR yang sama.
WeChat ID dapat disalin.
Header WeChat mengarah ke Contact page.

## D-010 — FAQ control
Collapsed = chevron kanan.
Expanded = chevron bawah.
`aria-expanded`, `aria-controls`, dan panel accessibility dipertahankan.

## D-011 — Commerce MVP client-side
Wishlist/Cart/Checkout menggunakan localStorage/sessionStorage tanpa login/backend.

## D-012 — Checkout sebelum payment
Checkout membuat order summary; stok dan harga akhir dikonfirmasi Gomai sebelum pembayaran.

## D-013 — Order Card simple
Kode terlihat: `GM-####`.
Canvas PNG dinamis dan tidak boleh menyembunyikan item.
QR tidak ditaruh di order card; WeChat ID cukup pada dokumen compact.

## D-014 — Product page focused
Detail produk berisi gallery, brand/name/price/stock, variants, quantity, Wishlist/Add Cart, dan product information.
Related-products dan repeated WeChat CTA dihapus.

## D-015 — app.js last
`js/app.js` wajib menjadi runtime script terakhir pada application page.

## D-016 — Browser visual QA
Static QA tidak boleh dianggap sebagai pengganti visual QA desktop/mobile melalui Live Server.
# Keputusan Replacement 7.3

- `serviceType` adalah kontrak data wajib: `express` atau `official-order`.
- Keranjang dua layanan tidak boleh dibayar dalam satu checkout.
- Produk lama tanpa `serviceType` diperlakukan sebagai `official-order` untuk kompatibilitas.
- Ongkir supplier hanya berlaku pada Official Order dan dihitung sekali per Source ID unik.
- Kartu unduhan adalah estimasi/permintaan pesanan, bukan invoice atau bukti pembayaran.
- IDR tetap nilai utama; CNY hanya estimasi informasi ketika ditampilkan.
