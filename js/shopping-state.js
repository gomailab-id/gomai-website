"use strict";

/* ==========================================================
   GOMAI SHOPPING STATE
   js/shopping-state.js

   Tanggung jawab:
   - Menyimpan Cart dan Wishlist di localStorage.
   - Menyediakan API tunggal untuk Header, Product Card,
     Product Detail, Cart, Wishlist, dan Checkout.
   - Menjaga schema storage tetap kecil dan data-driven.
   - Mengirim event perubahan state agar UI sinkron.

   Catatan:
   - Data produk TIDAK disalin ke localStorage.
   - Cart hanya menyimpan id produk + varian + jumlah.
   - Nama, gambar, harga, dan stok selalu dibaca kembali
     dari ProductsModel / products.json.
========================================================== */

const GomaiShoppingState = (() => {
    const VERSION = "1.1.0";

    const EVENTS = Object.freeze({
        CART_CHANGED: "gomai:cart-changed",
        WISHLIST_CHANGED: "gomai:wishlist-changed",
        CHECKOUT_DRAFT_CHANGED: "gomai:checkout-draft-changed"
    });

    const fallbackKeys = Object.freeze({
        cart: "gomai-cart-v1",
        wishlist: "gomai-wishlist-v1",
        checkoutDraft: "gomai-checkout-draft-v1",
        checkoutOrder: "gomai-checkout-order-v1"
    });

    function getKey(name) {
        return window.GomaiConfig?.storage?.[name] || fallbackKeys[name];
    }

    function readJSON(key, fallback) {
        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) return clone(fallback);
            const parsed = JSON.parse(raw);
            return parsed ?? clone(fallback);
        } catch (error) {
            console.warn("GomaiShoppingState: gagal membaca storage.", error);
            return clone(fallback);
        }
    }

    function writeJSON(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn("GomaiShoppingState: gagal menyimpan storage.", error);
            return false;
        }
    }

    function clone(value) {
        if (typeof structuredClone === "function") {
            try { return structuredClone(value); } catch (_) {}
        }
        return JSON.parse(JSON.stringify(value));
    }

    function text(value) {
        return String(value ?? "").trim();
    }

    function positiveInteger(value, fallback = 1) {
        const parsed = Math.floor(Number(value));
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    function normalizeCartItem(input = {}) {
        const productId = text(input.productId || input.id);
        if (!productId) throw new Error("Cart item membutuhkan productId.");

        return {
            productId,
            colorId: text(input.colorId),
            sizeId: text(input.sizeId || input.size),
            quantity: positiveInteger(input.quantity, 1)
        };
    }

    function itemKey(item) {
        return [item.productId, item.colorId || "-", item.sizeId || "-"].join("::");
    }

    function getCart() {
        const raw = readJSON(getKey("cart"), []);
        if (!Array.isArray(raw)) return [];
        return raw.flatMap(item => {
            try { return [normalizeCartItem(item)]; } catch (_) { return []; }
        });
    }

    function saveCart(items, reason = "update") {
        const clean = Array.isArray(items)
            ? items.flatMap(item => {
                try { return [normalizeCartItem(item)]; } catch (_) { return []; }
            })
            : [];

        writeJSON(getKey("cart"), clean);
        dispatch(EVENTS.CART_CHANGED, {
            reason,
            items: clone(clean),
            count: clean.reduce((sum, item) => sum + item.quantity, 0)
        });
        return clone(clean);
    }

    function addToCart(input = {}) {
        const incoming = normalizeCartItem(input);
        const items = getCart();
        const key = itemKey(incoming);
        const existing = items.find(item => itemKey(item) === key);

        if (existing) {
            existing.quantity = positiveInteger(existing.quantity + incoming.quantity, 1);
        } else {
            items.push(incoming);
        }
        return saveCart(items, "add");
    }

    function setQuantity(keyOrInput, quantity) {
        const key = typeof keyOrInput === "string"
            ? keyOrInput
            : itemKey(normalizeCartItem(keyOrInput));
        const next = positiveInteger(quantity, 1);
        const items = getCart();
        const item = items.find(entry => itemKey(entry) === key);
        if (!item) return clone(items);
        item.quantity = next;
        return saveCart(items, "quantity");
    }

    function removeFromCart(keyOrInput) {
        const key = typeof keyOrInput === "string"
            ? keyOrInput
            : itemKey(normalizeCartItem(keyOrInput));
        return saveCart(getCart().filter(item => itemKey(item) !== key), "remove");
    }

    function clearCart() {
        return saveCart([], "clear");
    }

    function getCartCount() {
        return getCart().reduce((sum, item) => sum + item.quantity, 0);
    }

    function getWishlist() {
        const raw = readJSON(getKey("wishlist"), []);
        if (!Array.isArray(raw)) return [];
        return [...new Set(raw.map(text).filter(Boolean))];
    }

    function saveWishlist(ids, reason = "update") {
        const clean = [...new Set((Array.isArray(ids) ? ids : []).map(text).filter(Boolean))];
        writeJSON(getKey("wishlist"), clean);
        dispatch(EVENTS.WISHLIST_CHANGED, {
            reason,
            productIds: clone(clean),
            count: clean.length
        });
        return clone(clean);
    }

    function isWishlisted(productId) {
        return getWishlist().includes(text(productId));
    }

    function addToWishlist(productId) {
        const id = text(productId);
        if (!id) return getWishlist();
        const ids = getWishlist();
        if (!ids.includes(id)) ids.push(id);
        return saveWishlist(ids, "add");
    }

    function removeFromWishlist(productId) {
        const id = text(productId);
        return saveWishlist(getWishlist().filter(entry => entry !== id), "remove");
    }

    function toggleWishlist(productId) {
        const id = text(productId);
        if (!id) return false;
        if (isWishlisted(id)) {
            removeFromWishlist(id);
            return false;
        }
        addToWishlist(id);
        return true;
    }

    function clearWishlist() {
        return saveWishlist([], "clear");
    }

    function getWishlistCount() {
        return getWishlist().length;
    }

    function getCheckoutDraft() {
        const raw = readJSON(getKey("checkoutDraft"), {});
        return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    }

    function saveCheckoutDraft(draft = {}) {
        const clean = draft && typeof draft === "object" && !Array.isArray(draft)
            ? { ...draft }
            : {};
        writeJSON(getKey("checkoutDraft"), clean);
        dispatch(EVENTS.CHECKOUT_DRAFT_CHANGED, { draft: clone(clean) });
        return clone(clean);
    }

    function getCheckoutOrderId() {
        try { return text(window.sessionStorage.getItem(getKey("checkoutOrder"))); }
        catch (_) { return ""; }
    }

    function getOrCreateCheckoutOrderId() {
        const existing =
            getCheckoutOrderId();

        if (
            /^GM-\d{4}$/.test(
                existing
            )
        ) {
            return existing;
        }

        let random =
            Math.floor(
                Math.random() *
                10000
            );

        if (
            window.crypto
                ?.getRandomValues
        ) {
            const buffer =
                new Uint32Array(1);

            window.crypto
                .getRandomValues(
                    buffer
                );

            random =
                buffer[0] %
                10000;
        }

        const id =
            `GM-${String(
                random
            ).padStart(
                4,
                "0"
            )}`;

        try {
            window.sessionStorage
                .setItem(
                    getKey(
                        "checkoutOrder"
                    ),
                    id
                );
        } catch (_) {}

        return id;
    }

    function resetCheckoutOrderId() {
        try { window.sessionStorage.removeItem(getKey("checkoutOrder")); } catch (_) {}
    }

    function getDefaultSelection(product = {}) {
        const colors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];
        const color = colors.find(entry => entry?.inStock !== false) || colors[0] || null;
        const colorSizes = Array.isArray(color?.sizes) ? color.sizes.filter(Boolean) : [];
        const productSizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];
        const sizes = colorSizes.length ? colorSizes : productSizes;
        const size = sizes.find(entry => typeof entry === "string" || entry?.inStock !== false) || sizes[0] || null;
        const sizeId = typeof size === "string" ? size : text(size?.id || size?.name || size?.size);
        return {
            productId: text(product.id || product.slug),
            colorId: text(color?.id),
            sizeId,
            quantity: 1
        };
    }

    function canQuickAdd(product = {}) {
        const colors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];
        if (colors.length > 1) return false;
        const colorSizes = Array.isArray(colors[0]?.sizes) ? colors[0].sizes.filter(Boolean) : [];
        const productSizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];
        return (colorSizes.length || productSizes.length) <= 1;
    }

    function dispatch(name, detail = {}) {
        document.dispatchEvent(new CustomEvent(name, {
            detail: { version: VERSION, timestamp: Date.now(), ...detail }
        }));
    }

    window.addEventListener("storage", event => {
        if (event.key === getKey("cart")) {
            dispatch(EVENTS.CART_CHANGED, { reason: "storage", items: getCart(), count: getCartCount() });
        }
        if (event.key === getKey("wishlist")) {
            dispatch(EVENTS.WISHLIST_CHANGED, { reason: "storage", productIds: getWishlist(), count: getWishlistCount() });
        }
    });

    return Object.freeze({
        version: VERSION,
        events: EVENTS,
        itemKey,
        getCart,
        addToCart,
        setQuantity,
        removeFromCart,
        clearCart,
        getCartCount,
        getWishlist,
        isWishlisted,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
        getWishlistCount,
        getCheckoutDraft,
        saveCheckoutDraft,
        getOrCreateCheckoutOrderId,
        resetCheckoutOrderId,
        getDefaultSelection,
        canQuickAdd
    });
})();

window.GomaiShoppingState = GomaiShoppingState;
