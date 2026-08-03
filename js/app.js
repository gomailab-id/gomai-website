"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    await Language.init();
    await ProductStore.init();

    renderFeaturedProducts();
});

function renderFeaturedProducts() {
    const productGrid = document.getElementById("product-grid");

    if (!productGrid) {
        return;
    }

    const products = ProductStore
        .getProducts()
        .filter(product => product.featured);

    if (products.length === 0) {
        productGrid.innerHTML = `
            <div class="empty-state">
                <p>Belum ada produk unggulan.</p>
            </div>
        `;
        return;
    }

    productGrid.innerHTML = products
        .map(product => createProductCard(product))
        .join("");
}

function createProductCard(product) {
    const language = Language.getLanguage();

    const productName =
        product.name?.[language] ||
        product.name?.id ||
        product.id;

    const firstColor = product.colors?.[0];

    const productImage =
        firstColor?.images?.[0] ||
        "assets/placeholders/product-placeholder.webp";

    const stockText = product.stock
        ? language === "zh"
            ? "有现货"
            : "Tersedia"
        : language === "zh"
            ? "缺货"
            : "Stok habis";

    const stockClass = product.stock
        ? "badge-success"
        : "badge-danger";

    return `
        <article class="product-card">

            <a
                href="pages/product-detail.html?id=${encodeURIComponent(product.id)}"
                class="product-image"
                aria-label="${GomaiUtils.escapeHTML(productName)}"
            >
                <img
                    src="${GomaiUtils.escapeHTML(productImage)}"
                    alt="${GomaiUtils.escapeHTML(productName)}"
                    loading="lazy"
                >
            </a>

            <div class="product-body">

                <p class="product-brand">
                    ${GomaiUtils.escapeHTML(product.brand)}
                </p>

                <h3 class="product-name">
                    <a
                        href="pages/product-detail.html?id=${encodeURIComponent(product.id)}"
                    >
                        ${GomaiUtils.escapeHTML(productName)}
                    </a>
                </h3>

                <p class="product-price">
                    ${GomaiUtils.formatRupiah(product.price)}
                </p>

                <span class="badge ${stockClass}">
                    ${stockText}
                </span>

            </div>

        </article>
    `;
}