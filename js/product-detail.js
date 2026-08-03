"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    await Language.init();
    await ProductStore.init();

    loadProduct();
});

function loadProduct() {
    const productId = GomaiUtils.getQueryParameter("id");
    const productDetail = document.getElementById("product-detail");

    if (!productDetail) {
        return;
    }

    if (!productId) {
        showProductNotFound(productDetail);
        return;
    }

    const product = ProductStore.getProduct(productId);

    if (!product) {
        showProductNotFound(productDetail);
        return;
    }

    renderProduct(product);
}

function showProductNotFound(container) {
    container.innerHTML = `
        <div class="empty-state">
            <h2>Produk tidak ditemukan</h2>
            <p>Produk yang Anda cari tidak tersedia.</p>

            <a
                href="products.html"
                class="btn btn-primary"
            >
                Lihat Semua Produk
            </a>
        </div>
    `;
}

function renderProduct(product) {
    const language = Language.getLanguage();
    const selectedColor = product.colors?.[0];
    let currentColor = selectedColor;
    const images = currentColor?.images ?? [];
    const productName =
        product.name?.[language] ||
        product.name?.id ||
        product.id;

    const description =
        product.description?.[language] ||
        product.description?.id ||
        "";

    const colorName =
        selectedColor?.name?.[language] ||
        selectedColor?.name?.id ||
        "-";

    const productDetail = document.getElementById("product-detail");
    const breadcrumbName = document.getElementById(
        "breadcrumb-product-name"
    );
    const descriptionSection = document.getElementById(
        "product-description"
    );
    const descriptionText = document.getElementById(
        "product-description-text"
    );

    if (!productDetail) {
        return;
    }

    if (breadcrumbName) {
        breadcrumbName.textContent = productName;
    }

    document.title = `${productName} | Gomai`;

    productDetail.innerHTML = `
        <div class="product-gallery">

            <div class="thumbnail-list">

                ${images
                    .map(
                        (image, index) => `
                            <button
                                type="button"
                                class="thumbnail ${
                                    index === 0 ? "active" : ""
                                }"
                                data-image="../${GomaiUtils.escapeHTML(
                                    image
                                )}"
                                aria-label="Tampilkan gambar ${
                                    index + 1
                                }"
                            >
                                <img
                                    src="../${GomaiUtils.escapeHTML(
                                        image
                                    )}"
                                    alt="${GomaiUtils.escapeHTML(
                                        productName
                                    )} ${index + 1}"
                                    loading="lazy"
                                >
                            </button>
                        `
                    )
                    .join("")}

            </div>

            <div class="product-main-image">

                ${
                    images.length > 0
                        ? `
                            <img
                                id="main-product-image"
                                src="../${GomaiUtils.escapeHTML(
                                    images[0]
                                )}"
                                alt="${GomaiUtils.escapeHTML(
                                    productName
                                )}"
                            >
                        `
                        : `
                            <div class="empty-state">
                                <p>Gambar belum tersedia.</p>
                            </div>
                        `
                }

            </div>

        </div>

        <div class="product-info">

            <p class="product-brand">
                ${GomaiUtils.escapeHTML(
                    product.brand.toUpperCase()
                )}
            </p>

            <h1>
                ${GomaiUtils.escapeHTML(productName)}
            </h1>

            <p class="product-price">
                ${GomaiUtils.formatRupiah(product.price)}
            </p>

            <span class="badge ${
                product.stock
                    ? "badge-success"
                    : "badge-danger"
            }">
                ${
                    product.stock
                        ? language === "zh"
                            ? "有现货"
                            : "Tersedia"
                        : language === "zh"
                            ? "缺货"
                            : "Stok habis"
                }
            </span>

            <div class="option-group">

                <p class="option-title">
                    ${language === "zh" ? "颜色" : "Warna"}
                </p>

                <div class="option-list">

                    ${product.colors
                        .map(
                            (color, index) => `
                                <button
                                    type="button"
                                    class="option-btn color-option ${
                                        index === 0
                                            ? "active"
                                            : ""
                                    }"
                                    data-color-index="${index}"
                                >
                                    ${GomaiUtils.escapeHTML(
                                        color.name?.[
                                            language
                                        ] ||
                                        color.name?.id ||
                                        color.id
                                    )}
                                </button>
                            `
                        )
                        .join("")}

                </div>

                <p id="selected-color-name">
                    ${GomaiUtils.escapeHTML(colorName)}
                </p>

            </div>

            <div class="option-group">

                <p class="option-title">
                    ${language === "zh" ? "尺寸" : "Ukuran"}
                </p>

                <div class="option-list">

                    ${product.sizes
                        .map(
                            size => `
                                <button
                                    type="button"
                                    class="option-btn size-option"
                                    data-size="${GomaiUtils.escapeHTML(
                                        size
                                    )}"
                                >
                                    ${GomaiUtils.escapeHTML(size)}
                                </button>
                            `
                        )
                        .join("")}

                </div>

            </div>

            <div class="product-actions">

                <a
                    id="wechat-order-button"
                    href="#wechat"
                    class="btn btn-primary"
                >
                    ${
                        language === "zh"
                            ? "通过微信联系"
                            : "Hubungi via WeChat"
                    }
                </a>

            </div>

        </div>
    `;

    if (descriptionSection && descriptionText) {
        descriptionText.textContent = description;
        descriptionSection.classList.remove("hidden");
    }

    bindGalleryEvents();
    bindColorEvents(product);
    bindSizeEvents();
}

function bindGalleryEvents() {
    const mainImage = document.getElementById(
        "main-product-image"
    );

    document
        .querySelectorAll(".thumbnail")
        .forEach(thumbnail => {
            thumbnail.addEventListener("click", () => {
                const image = thumbnail.dataset.image;

                if (mainImage && image) {
                    mainImage.src = image;
                }

                document
                    .querySelectorAll(".thumbnail")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                thumbnail.classList.add("active");
            });
        });
}

function bindColorEvents(product) {
    document
        .querySelectorAll(".color-option")
        .forEach(button => {
            button.addEventListener("click", () => {
                const colorIndex = Number(
                    button.dataset.colorIndex
                );

                const selectedColor =
                    product.colors[colorIndex];

                if (!selectedColor) {
                    return;
                }

                document
                    .querySelectorAll(".color-option")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                button.classList.add("active");

                updateGallery(selectedColor);

                const language = Language.getLanguage();
                const colorName =
                    selectedColor.name?.[language] ||
                    selectedColor.name?.id ||
                    selectedColor.id;

                const selectedColorName =
                    document.getElementById(
                        "selected-color-name"
                    );

                if (selectedColorName) {
                    selectedColorName.textContent =
                        colorName;
                }
            });
        });
}

function updateGallery(color) {
    const thumbnailList =
        document.querySelector(".thumbnail-list");
    const mainImage = document.getElementById(
        "main-product-image"
    );

    if (!thumbnailList || !mainImage) {
        return;
    }

    const images = color.images ?? [];

    thumbnailList.innerHTML = images
        .map(
            (image, index) => `
                <button
                    type="button"
                    class="thumbnail ${
                        index === 0 ? "active" : ""
                    }"
                    data-image="../${GomaiUtils.escapeHTML(
                        image
                    )}"
                >
                    <img
                        src="../${GomaiUtils.escapeHTML(
                            image
                        )}"
                        alt="Gambar produk ${index + 1}"
                    >
                </button>
            `
        )
        .join("");

    if (images.length > 0) {
        mainImage.src = `../${images[0]}`;
    }

    bindGalleryEvents();
}

function bindSizeEvents() {
    document
        .querySelectorAll(".size-option")
        .forEach(button => {
            button.addEventListener("click", () => {
                document
                    .querySelectorAll(".size-option")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                button.classList.add("active");
            });
        });
}