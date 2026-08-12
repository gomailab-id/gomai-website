# Gomai Website — Replacement 6 Report

## Status

**STATIC QA PASS**

- Errors: **0**
- Warnings: **0**
- HTML pages: **13**
- CSS files: **15**
- JavaScript files: **29**
- Translation leaf keys per language: **546**
- Brands: **6**
- Main categories: **4**
- Current products: **1**

## Consolidated Changes

Replacement 6 contains the cumulative Gomai baseline through category-first navigation, commerce, focused information pages, exact WeChat QR + copyable ID, simple dynamic order card, simplified category catalog, and focused product detail.

## Full-Site Consistency Fix

The Header WeChat button now routes to the Contact page. It no longer relies on the removed repeated `#wechat` body sections.

## Cleanup

Removed conclusively unused legacy runtime/assets including `base-component.js`, `product.css`, stale structure/report files, obsolete information icon packs, and invalid unused `.webp` payloads.

## Validation Passed

- JavaScript syntax PASS (29 files).
- JSON parse PASS (5 files).
- CSS brace balance PASS (15 files).
- Static HTML references PASS (13 pages).
- Viewport meta PASS on every HTML page.
- Application script order PASS (app.js last wherever loaded).
- Translation tree parity PASS (546 leaf keys per language).
- DOM translation-key coverage PASS (153 literal keys).
- Brand data PASS (6 partner brands).
- Category data PASS (exactly 4 flat main categories, no subcategories).
- Brand asset references PASS.
- Product referential integrity PASS (1 current products).
- Header cleanup PASS (top yellow promo bar disabled).
- Header WeChat routing PASS (Contact page).
- WeChat contact contract PASS (QR + copyable ID in Contact/Footer).
- FAQ contract PASS (7 accessible accordions, right/down chevrons).
- Order reference contract PASS (GM-####).
- Order-card PNG contract PASS (dynamic height, wrapped content, all items).
- Category catalog contract PASS (context title/description + relevant brands).
- Product-detail focus contract PASS.
- Shopping-state functional test PASS (Cart, Wishlist, GM-2571).
- Responsive/mobile CSS contract PASS across all page groups.
- Mobile header navigation contract PASS.
- Legacy cleanup PASS.
- WebP payload validation PASS.

## Browser QA Limitation

Headless Chromium did not complete the local visual run in the build environment. This package therefore does **not** claim pixel-level browser QA.

Before production deployment, open Replacement 6 with VS Code Live Server and visually check desktop + mobile, ID ↔ 中文, mobile menu, category flow, product detail, Wishlist/Cart/Checkout, both PNG downloads, FAQ, QR readability, and copy buttons.

## Errors

- None

## Warnings

- None
