"use strict";

const BrandPage = (() => {
    let currentBrand = null;
    let brandProducts = [];
    let visibleProducts = [];

    /**
     * Memulai halaman brand.
     */
    async function init() {
        const brandId = GomaiUtils.getQueryParameter("id");

        if (!brandId) {
            showBrandNotFound();
            return;
        }

        try {
            showLoadingState();

            const basePath = GomaiUtils.getBasePath();

            const [brandData, productData] = await Promise.all([
                GomaiUtils.fetchJSON(
                    `${basePath}data/brands.json`
                ),
                GomaiUtils.fetchJSON(
                    `${basePath}data/products.json`
                )
            ]);

            const brands = Array.isArray(brandData.brands)
                ? brandData.brands
                : [];

            const products = Array.isArray(productData.products)
                ? productData.products
                : [];

            currentBrand = brands.find(
                brand => brand.id === brandId
            );

            if (!currentBrand) {
                showBrandNotFound();
                return;
            }

            brandProducts = products.filter(
                product => product.brand === currentBrand.id
            );

            visibleProducts = [...brandProducts];

            renderBrand();
            populateCategoryFilter();
            bindControls();
            renderProducts();

        } catch (error) {
            console.error(
                "Gagal memuat halaman brand:",
                error
            );

            showLoadError();
        }
    }

    /**
     * Menampilkan identitas brand:
     * nama, logo, hero, deskripsi, dan warna tema.
     */
    function renderBrand() {
        const language = getCurrentLanguage();

        const description =
            currentBrand.description?.[language] ||
            currentBrand.description?.id ||
            "";

        const heroPath = resolveAssetPath(
            currentBrand.hero ||
            `assets/brands/${currentBrand.id}/hero.webp`
        );

        const logoPath = resolveAssetPath(
            currentBrand.logo ||
            `assets/brands/${currentBrand.id}/logo.png`
        );

        setText(
            "breadcrumb-brand-name",
            currentBrand.name
        );

        setText(
            "brand-name",
            currentBrand.name
        );

        setText(
            "brand-description",
            description
        );

        setText(
            "brand-collection-title",
            language === "zh"
                ? `${currentBrand.name} 系列`
                : `Koleksi ${currentBrand.name}`
        );

        setText(
            "brand-collection-description",
            language === "zh"
                ? `探索 Gomai 提供的 ${currentBrand.name} 产品。`
                : `Jelajahi produk ${currentBrand.name} yang tersedia melalui Gomai.`
        );

        renderHeroImage(heroPath);
        renderBrandLogo(logoPath);

        document.title =
            `${currentBrand.name} | Gomai`;

        const pageDescription =
            document.getElementById("page-description");

        if (pageDescription) {
            pageDescription.setAttribute(
                "content",
                description ||
                `Jelajahi koleksi ${currentBrand.name} melalui Gomai.`
            );
        }

        applyBrandTheme();
        showBrandContent();
    }

    /**
     * Menampilkan gambar hero.
     */
    function renderHeroImage(path) {
        const heroImage =
            document.getElementById("brand-hero-image");

        const placeholder =
            document.getElementById(
                "brand-hero-placeholder"
            );

        if (!heroImage) {
            return;
        }

        heroImage.src = path;
        heroImage.alt =
            `Koleksi ${currentBrand.name}`;

        heroImage.onload = () => {
            heroImage.hidden = false;

            if (placeholder) {
                placeholder.hidden = true;
            }
        };

        heroImage.onerror = () => {
            heroImage.hidden = true;

            if (placeholder) {
                placeholder.hidden = false;
                placeholder.innerHTML = `
                    <p>
                        Gambar hero ${escapeValue(
                            currentBrand.name
                        )} belum tersedia.
                    </p>
                `;
            }
        };
    }

    /**
     * Menampilkan logo brand.
     */
    function renderBrandLogo(path) {
        const logo =
            document.getElementById("brand-logo");

        if (!logo) {
            return;
        }

        logo.src = path;
        logo.alt = `Logo ${currentBrand.name}`;

        logo.onload = () => {
            logo.hidden = false;
        };

        logo.onerror = () => {
            logo.hidden = true;
        };
    }

    /**
     * Menggunakan warna brand dari brands.json.
     */
    function applyBrandTheme() {
        const primaryColor =
            currentBrand.primaryColor || "#111111";

        const accentColor =
            currentBrand.accentColor || "#ffffff";

        document.documentElement.style.setProperty(
            "--brand-primary",
            primaryColor
        );

        document.documentElement.style.setProperty(
            "--brand-accent",
            accentColor
        );

        const heroSection =
            document.getElementById(
                "brand-hero-section"
            );

        if (heroSection) {
            heroSection.style.setProperty(
                "--brand-primary",
                primaryColor
            );

            heroSection.style.setProperty(
                "--brand-accent",
                accentColor
            );
        }
    }

    /**
     * Membuat pilihan kategori dari produk brand.
     */
    function populateCategoryFilter() {
        const categoryFilter =
            document.getElementById(
                "brand-category-filter"
            );

        if (!categoryFilter) {
            return;
        }

        const language = getCurrentLanguage();

        const categories = [
            ...new Set(
                brandProducts
                    .map(product => product.category)
                    .filter(Boolean)
            )
        ].sort();

        categoryFilter.innerHTML = `
            <option value="all">
                ${
                    language === "zh"
                        ? "所有分类"
                        : "Semua Kategori"
                }
            </option>

            ${categories
                .map(category => `
                    <option value="${escapeValue(category)}">
                        ${escapeValue(
                            formatCategoryName(category)
                        )}
                    </option>
                `)
                .join("")}
        `;
    }

    /**
     * Menghubungkan filter dan pengurutan.
     */
    function bindControls() {
        const categoryFilter =
            document.getElementById(
                "brand-category-filter"
            );

        const sortControl =
            document.getElementById("brand-sort");

        if (categoryFilter) {
            categoryFilter.addEventListener(
                "change",
                updateVisibleProducts
            );
        }

        if (sortControl) {
            sortControl.addEventListener(
                "change",
                updateVisibleProducts
            );
        }
    }

    /**
     * Menerapkan filter kategori dan pengurutan.
     */
    function updateVisibleProducts() {
        const categoryFilter =
            document.getElementById(
                "brand-category-filter"
            );

        const sortControl =
            document.getElementById("brand-sort");

        const selectedCategory =
            categoryFilter?.value || "all";

        const selectedSort =
            sortControl?.value || "default";

        visibleProducts = brandProducts.filter(
            product => {
                return (
                    selectedCategory === "all" ||
                    product.category === selectedCategory
                );
            }
        );

        visibleProducts = sortProducts(
            visibleProducts,
            selectedSort
        );

        renderProducts();
    }

    /**
     * Mengurutkan produk.
     */
    function sortProducts(products, sortType) {
        const sortedProducts = [...products];

        switch (sortType) {
            case "price-low":
                return sortedProducts.sort(
                    (a, b) =>
                        Number(a.price) -
                        Number(b.price)
                );

            case "price-high":
                return sortedProducts.sort(
                    (a, b) =>
                        Number(b.price) -
                        Number(a.price)
                );

            case "name-asc": {
                const language =
                    getCurrentLanguage();

                return sortedProducts.sort(
                    (a, b) => {
                        const firstName =
                            getProductName(
                                a,
                                language
                            );

                        const secondName =
                            getProductName(
                                b,
                                language
                            );

                        return firstName.localeCompare(
                            secondName
                        );
                    }
                );
            }

            default:
                return sortedProducts;
        }
    }

    /**
     * Menampilkan produk pada grid.
     */
    function renderProducts() {
        const productGrid =
            document.getElementById(
                "brand-product-grid"
            );

        if (!productGrid) {
            return;
        }

        updateProductCount();

        if (visibleProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="empty-state">
                    <h3>
                        ${
                            getCurrentLanguage() === "zh"
                                ? "暂无产品"
                                : "Belum Ada Produk"
                        }
                    </h3>

                    <p>
                        ${
                            getCurrentLanguage() === "zh"
                                ? "此品牌或分类目前没有可显示的产品。"
                                : "Belum ada produk yang dapat ditampilkan untuk brand atau kategori ini."
                        }
                    </p>
                </div>
            `;

            return;
        }

        productGrid.innerHTML = visibleProducts
            .map(createProductCard)
            .join("");
    }

    /**
     * Membuat satu kartu produk.
     */
    function createProductCard(product) {
        const language = getCurrentLanguage();

        const productName =
            getProductName(product, language);

        const firstColor =
            product.colors?.[0];

        const firstImage =
            firstColor?.images?.[0];

        const imagePath = firstImage
            ? resolveAssetPath(firstImage)
            : "";

        const detailUrl =
            `product-detail.html?id=${encodeURIComponent(
                product.id
            )}`;

        const stockText = product.stock
            ? language === "zh"
                ? "有现货"
                : "Tersedia"
            : language === "zh"
                ? "缺货"
                : "Stok Habis";

        const stockClass = product.stock
            ? "badge-success"
            : "badge-danger";

        return `
            <article class="product-card">

                <a
                    href="${detailUrl}"
                    class="product-image"
                    aria-label="${escapeValue(productName)}"
                >
                    ${
                        imagePath
                            ? `
                                <img
                                    src="${escapeValue(imagePath)}"
                                    alt="${escapeValue(productName)}"
                                    loading="lazy"
                                    decoding="async"
                                >
                            `
                            : `
                                <div class="empty-state">
                                    <p>
                                        Gambar belum tersedia
                                    </p>
                                </div>
                            `
                    }
                </a>

                <div class="product-body">

                    <p class="product-brand">
                        ${escapeValue(currentBrand.name)}
                    </p>

                    <h3 class="product-name">

                        <a href="${detailUrl}">
                            ${escapeValue(productName)}
                        </a>

                    </h3>

                    <p class="product-price">
                        ${GomaiUtils.formatRupiah(
                            product.price
                        )}
                    </p>

                    <span class="badge ${stockClass}">
                        ${stockText}
                    </span>

                </div>

            </article>
        `;
    }

    /**
     * Memperbarui jumlah produk.
     */
    function updateProductCount() {
        const countElement =
            document.getElementById(
                "brand-product-count"
            );

        if (!countElement) {
            return;
        }

        const language = getCurrentLanguage();
        const count = visibleProducts.length;

        countElement.textContent =
            language === "zh"
                ? `显示 ${count} 件产品`
                : `Menampilkan ${count} produk`;
    }

    /**
     * Mengambil nama produk berdasarkan bahasa.
     */
    function getProductName(product, language) {
        return (
            product.name?.[language] ||
            product.name?.id ||
            product.id ||
            "Produk"
        );
    }

    /**
     * Membuat nama kategori lebih mudah dibaca.
     */
    function formatCategoryName(category) {
        return String(category)
            .replaceAll("-", " ")
            .replace(/\b\w/g, letter =>
                letter.toUpperCase()
            );
    }

    /**
     * Menambahkan ../ untuk aset karena brand.html
     * berada di dalam folder pages.
     */
    function resolveAssetPath(path) {
        if (!path) {
            return "";
        }

        if (
            path.startsWith("http://") ||
            path.startsWith("https://") ||
            path.startsWith("../") ||
            path.startsWith("/")
        ) {
            return path;
        }

        return `../${path}`;
    }

    /**
     * Mengambil bahasa aktif.
     */
    function getCurrentLanguage() {
        if (
            window.Language &&
            typeof Language.getLanguage === "function"
        ) {
            return Language.getLanguage();
        }

        return "id";
    }

    /**
     * Mengamankan teks sebelum dimasukkan ke HTML.
     */
    function escapeValue(value) {
        if (
            window.GomaiUtils &&
            typeof GomaiUtils.escapeHTML === "function"
        ) {
            return GomaiUtils.escapeHTML(value);
        }

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /**
     * Memasukkan teks ke elemen berdasarkan ID.
     */
    function setText(elementId, value) {
        const element =
            document.getElementById(elementId);

        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Menampilkan seluruh bagian halaman brand.
     */
    function showBrandContent() {
        const sections = [
            "brand-hero-section",
            "brand-products"
        ];

        sections.forEach(sectionId => {
            const section =
                document.getElementById(sectionId);

            if (section) {
                section.hidden = false;
            }
        });

        const notFound =
            document.getElementById(
                "brand-not-found"
            );

        if (notFound) {
            notFound.hidden = true;
        }
    }

    /**
     * Status awal ketika data dimuat.
     */
    function showLoadingState() {
        const productGrid =
            document.getElementById(
                "brand-product-grid"
            );

        if (productGrid) {
            productGrid.innerHTML = `
                <div class="empty-state">
                    <p>Memuat produk brand...</p>
                </div>
            `;
        }
    }

    /**
     * Menampilkan kondisi brand tidak ditemukan.
     */
    function showBrandNotFound() {
        const notFound =
            document.getElementById(
                "brand-not-found"
            );

        if (notFound) {
            notFound.hidden = false;
        }

        hideBrandSections();

        document.title =
            "Brand Tidak Ditemukan | Gomai";
    }

    /**
     * Menampilkan kondisi gagal memuat data.
     */
    function showLoadError() {
        const productGrid =
            document.getElementById(
                "brand-product-grid"
            );

        if (productGrid) {
            productGrid.innerHTML = `
                <div class="empty-state">

                    <h3>
                        Data Gagal Dimuat
                    </h3>

                    <p>
                        Periksa file brands.json,
                        products.json, dan jalankan
                        website menggunakan Live Server.
                    </p>

                </div>
            `;
        }
    }

    /**
     * Menyembunyikan bagian brand jika ID tidak valid.
     */
    function hideBrandSections() {
        const sections = [
            "brand-hero-section",
            "brand-products"
        ];

        sections.forEach(sectionId => {
            const section =
                document.getElementById(sectionId);

            if (section) {
                section.hidden = true;
            }
        });
    }

    /**
     * Merender ulang bagian berbahasa dinamis.
     */
    function refreshLanguage() {
        if (!currentBrand) {
            return;
        }

        renderBrand();
        populateCategoryFilter();
        updateVisibleProducts();
    }

    return {
        init,
        refreshLanguage
    };
})();

window.BrandPage = BrandPage;


/**
 * Menjalankan halaman brand.
 *
 * BrandPage memiliki listener sendiri karena brand.html
 * hanya membutuhkan halaman brand.
 */
document.addEventListener(
    "DOMContentLoaded",
    async () => {
        try {
            if (
                window.Language &&
                typeof Language.init === "function"
            ) {
                await Language.init();
            }

            await BrandPage.init();

        } catch (error) {
            console.error(
                "Inisialisasi halaman brand gagal:",
                error
            );
        }
    }
);