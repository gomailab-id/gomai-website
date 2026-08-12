"use strict";
const CartController = (() => {
    const VERSION = "1.0.0";
    let products = new Map();
    let brands = new Map();
    let bound = false;

    const t = (key, fallback) => window.Language?.translate?.(key, fallback) || fallback;
    const money = value => window.GomaiUtils?.formatCurrency?.(Number(value) || 0) || `Rp${Number(value || 0).toLocaleString("id-ID")}`;
    const route = (name, query = {}) => window.GomaiUtils?.buildRoute?.(name, query) || `${name}.html`;
    const currentLang = () => window.Language?.getCurrentLanguage?.() || "zh";
    const local = value => value && typeof value === "object" ? (value[currentLang()] || value.id || value.zh || "") : String(value || "");

    async function init() {
        await Promise.all([window.ProductsModel.load(), window.BrandsModel.load()]);
        products = new Map((await window.ProductsModel.getAll()).map(p => [p.id, p]));
        brands = new Map((await window.BrandsModel.getAll()).map(b => [b.id, b]));
        bind(); render();
        return { version: VERSION };
    }

    function bind() {
        if (bound) return; bound = true;
        document.addEventListener("click", handleClick);
        document.addEventListener("gomai:cart-changed", render);
    }

    function destroy() {
        if (bound) document.removeEventListener("click", handleClick);
        bound = false;
    }

    function refreshLanguage() { render(); }

    function getColor(product, id) {
        return (Array.isArray(product?.colors) ? product.colors : []).find(c => String(c?.id || "") === String(id || "")) || null;
    }
    function getImage(product, color) {
        const list = Array.isArray(color?.images) ? color.images : [];
        const fallback = Array.isArray(product?.images) ? product.images : [];
        return list[0] || fallback[0] || "";
    }
    function getBrand(product) { return brands.get(product?.brandId) || null; }
    function itemData(item) {
        const product = products.get(item.productId);
        if (!product) return null;
        const color = getColor(product, item.colorId);
        return { item, product, color, key: window.GomaiShoppingState.itemKey(item) };
    }

    function render() {
        const items = window.GomaiShoppingState.getCart();
        const resolved = items.map(itemData).filter(Boolean);
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        const countEl = document.getElementById("cart-count"); if (countEl) countEl.textContent = String(count);
        const empty = document.getElementById("cart-empty");
        const content = document.getElementById("cart-content");
        const list = document.getElementById("cart-list");
        const summary = document.getElementById("cart-summary");
        if (!empty || !content || !list || !summary) return;

        if (!resolved.length) {
            empty.hidden = false; content.hidden = true;
            empty.innerHTML = `<h2>${esc(t("cart.emptyTitle","Keranjang Anda masih kosong"))}</h2><p>${esc(t("cart.emptyDescription","Tambahkan produk yang Anda inginkan."))}</p><a class="btn btn-primary" href="${esc(route("products"))}">${esc(t("cart.continueShopping","Lanjut Belanja"))}</a>`;
            return;
        }
        empty.hidden = true; content.hidden = false;
        list.innerHTML = resolved.map(renderItem).join("");
        const subtotal = resolved.reduce((sum, entry) => sum + Number(entry.product.price || 0) * entry.item.quantity, 0);
        summary.innerHTML = `<h2>${esc(t("cart.summary","Ringkasan Pesanan"))}</h2><div class="summary-row"><span>${esc(t("cart.subtotal","Subtotal"))} (${count} ${esc(t("cart.items","Barang"))})</span><strong>${esc(money(subtotal))}</strong></div><div class="summary-row"><span>${esc(t("cart.delivery","Pengantaran"))}</span><strong>${esc(t("cart.deliveryPending","Akan dikonfirmasi"))}</strong></div><div class="summary-total"><span>${esc(t("cart.temporaryTotal","Total Sementara"))}</span><strong>${esc(money(subtotal))}</strong></div><div class="summary-note">${esc(t("cart.confirmNote","Harga dan ketersediaan barang akan dikonfirmasi oleh Gomai."))}</div><a class="btn btn-primary" href="${esc(route("checkout"))}">${esc(t("cart.checkout","Buat Ringkasan & Unduh"))}</a>`;
    }

    function renderItem(entry) {
        const { item, product, color, key } = entry;
        const image = getImage(product, color);
        const brand = getBrand(product);
        const variant = [color ? local(color.name) : "", item.sizeId].filter(Boolean).join(" · ");
        const subtotal = Number(product.price || 0) * item.quantity;
        return `<article class="cart-item" data-cart-key="${esc(key)}"><a class="cart-item-image" href="${esc(route("productDetail",{id:product.id}))}">${image ? `<img src="${esc(window.GomaiUtils.resolveAssetPath(image))}" alt="${esc(local(product.name))}">` : ""}</a><div><p class="cart-item-brand">${esc(brand?.name || product.brandId || "")}</p><h2 class="cart-item-name">${esc(local(product.name))}</h2>${variant ? `<p class="cart-item-variant">${esc(variant)}</p>` : ""}<div class="cart-item-meta"><span>${esc(money(product.price))}</span><div class="quantity-control-mini"><button type="button" data-cart-action="decrease" aria-label="-">−</button><span>${item.quantity}</span><button type="button" data-cart-action="increase" aria-label="+">+</button></div><button class="cart-item-remove" type="button" data-cart-action="remove">${esc(t("cart.remove","Hapus"))}</button></div></div><div class="cart-item-total"><strong>${esc(money(subtotal))}</strong></div></article>`;
    }

    function handleClick(event) {
        const action = event.target.closest?.("[data-cart-action]");
        if (action) {
            const row = action.closest("[data-cart-key]"); if (!row) return;
            const key = row.dataset.cartKey; const item = window.GomaiShoppingState.getCart().find(x => window.GomaiShoppingState.itemKey(x) === key); if (!item) return;
            const type = action.dataset.cartAction;
            if (type === "remove") window.GomaiShoppingState.removeFromCart(key);
            if (type === "increase") window.GomaiShoppingState.setQuantity(key, item.quantity + 1);
            if (type === "decrease") item.quantity <= 1 ? window.GomaiShoppingState.removeFromCart(key) : window.GomaiShoppingState.setQuantity(key, item.quantity - 1);
            return;
        }
        if (event.target.closest?.("#cart-clear")) window.GomaiShoppingState.clearCart();
    }
    function esc(v) { const d=document.createElement("div"); d.textContent=String(v??""); return d.innerHTML; }
    return Object.freeze({ version: VERSION, init, destroy, refreshLanguage });
})();
window.CartController = CartController;
