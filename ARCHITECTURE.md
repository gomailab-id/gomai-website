# Gomai Architecture V7 — Release Candidate 1

## Dependency Direction

```text
config / utils / language / shopping-state
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
app.js
```

## Data Boundaries

### Models

- `js/models/brands.js`
- `js/models/categories.js`
- `js/models/products.js`

Shared/page UI tidak membuat katalog hardcoded baru.

### Main data

- `data/brands.json`
- `data/categories.json`
- `data/products.json`
- `data/id.json`
- `data/zh.json`

## Shared Components

- Header
- Footer
- SearchPanel
- ProductCard
- BrandCard
- Loading
- EmptyState

Header mengambil empat kategori utama dari `CategoriesModel`.

Footer menampilkan empat kategori, link informasi, QR WeChat, dan copyable WeChat ID.

## Page Controllers

- `home.js`
- `brand.js`
- `products.js`
- `product-detail.js`
- `search.js`
- `cart.js`
- `wishlist.js`
- `checkout.js`
- `information.js`

`information.js` melayani:
- `howToBuy`
- `about`
- `contact`
- `faq`

## Commerce State

`js/shopping-state.js` menyimpan:
- cart V2 yang dikelompokkan menjadi `express` dan `official-order`
- wishlist
- checkout draft
- checkout order reference

Semua bersifat client-side. Cart V1 dimigrasikan secara aman sebagai Official Order.

## Service Boundary

- `express`: produk lokal; tidak memiliki ongkir supplier ke Gomai.
- `official-order`: sumber resmi wajib diperiksa; ongkir dihitung sekali per Source ID unik.
- `pages/cart.html` mengelompokkan layanan.
- `pages/checkout.html?service=...` hanya memproses satu layanan.

## Categories

Empat kategori utama berasal dari `data/categories.json`.

Tidak ada child/subcategory hierarchy pada baseline V7.

## Checkout Card

`js/checkout.js` membangun PNG secara dinamis:
- semua item selalu dirender;
- teks produk/varian wrap;
- tinggi canvas mengikuti konten;
- delivery info tidak dapat tertutup footer;
- layout ID dan 中文 sama;
- visible order reference menggunakan `GM-####`.

## CSS

Global:
- variables
- reset
- layout
- components
- header
- responsive

Page-specific:
- home
- brand
- products
- search
- product-detail
- commerce
- information
- not-found

## Contact

Sumber WeChat ID dan QR tersentral di `js/config.js`.

Header mengarah ke halaman Contact, bukan anchor `#wechat`, karena repeated WeChat section telah dihapus dari page body.
