# Gomai Website Replacement 5

Replacement 5 consolidates all work completed after Replacement 4 into one full website package.

## Included

### Commerce
- Wishlist stored in browser-local `localStorage`.
- Cart stored in browser-local `localStorage`.
- Shared Header Wishlist and Cart badges.
- Product Card Wishlist and Add-to-Cart behavior.
- Product Detail Wishlist and Add-to-Cart behavior.
- `pages/cart.html`.
- `pages/wishlist.html`.
- `pages/checkout.html`.
- Checkout delivery-information form.
- Independent order-card language selection: Indonesian or Chinese.
- Premium PNG order summary using the locked Gomai logo.
- Order summary remains a request/summary, not a final invoice or proof of payment.

### Information Icon System
- How-to-Buy: 4 contextual step icons.
- About: identity, process, and value-card icons.
- Contact: preparation, service, flow, and useful-link icons.
- FAQ: accordion remains minimal; the two action cards use contextual icons.
- All icons are local SVG assets; no external icon library is required.

### Existing V4 foundation retained
- Locked Gomai master logo.
- Shared Header / Search / Footer architecture.
- Six partner brands.
- Final 1600×900 WebP brand heroes.
- Optical-fit clean partner logos.
- Indonesian + Chinese translation system.
- Data-driven brand and product catalog.

## Operational Flow

`Browse → Wishlist optional → Cart → Checkout → choose ID/中文 → download PNG order summary → send through WeChat → Gomai confirms stock/final price → payment → delivery`

## Storage

Cart storage contains only product/variant/quantity references. Product names, prices, stock, and imagery continue to resolve from the product model and `data/products.json`.

## Important limitation

The order reference is generated client-side because the current website has no backend. It is appropriate for the initial WeChat workflow, but it is not yet a server-guaranteed transaction identifier.

## Consolidated QA

- HTML files: 13
- CSS files: 16
- JavaScript files: 30
- Translation leaf keys: ID=504, ZH=504
- Brands: 6
- Cart/Wishlist localStorage module: functional Node test passed.
- Client-side order reference format: functional test passed.
- Bilingual PNG order-card generator: static contract passed.
- Information icon system: 26 local SVG assets validated.
- Static errors: 0
- Static warnings: 0

### Visual QA

Automated Chromium visual QA could not run in this environment because local page navigation is blocked by the runtime administrator. Final visual QA should be performed with VS Code Live Server after installation.
