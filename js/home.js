"use strict";

/**
 * GOMAI HOME CONTROLLER
 * Category-first storefront.
 */
const HomeController = (() => {
    const VERSION = "4.0.0";

    let initialized = false;
    let context = {};
    let categories = [];
    let brands = [];
    let products = [];

    const elements = {
        categoryGrid: null,
        brandGrid: null,
        productGrid: null
    };

    async function init(nextContext = {}) {
        if (initialized && nextContext?.force !== true) {
            return refreshLanguage();
        }

        context = nextContext || {};

        cacheElements();
        validateDependencies();

        await loadData();

        renderCategories();
        renderBrands();
        renderProducts();
        syncWechatId();

        initialized = true;

        return getResult();
    }

    function cacheElements() {
        elements.categoryGrid =
            document.getElementById("home-category-grid");

        elements.brandGrid =
            document.getElementById("brand-grid");

        elements.productGrid =
            document.getElementById("home-product-grid");
    }

    function validateDependencies() {
        if (!window.Language) {
            throw new Error(
                "HomeController membutuhkan Language."
            );
        }

        if (!getCategoriesModel()?.getActive) {
            throw new Error(
                "HomeController membutuhkan CategoriesModel."
            );
        }

        if (!getBrandsModel()?.getActive) {
            throw new Error(
                "HomeController membutuhkan BrandsModel."
            );
        }

        if (!getProductsModel()?.getActive) {
            throw new Error(
                "HomeController membutuhkan ProductsModel."
            );
        }

        if (!getBrandCard()?.render) {
            throw new Error(
                "HomeController membutuhkan BrandCardComponent."
            );
        }

        if (!getProductCard()?.render) {
            throw new Error(
                "HomeController membutuhkan ProductCardComponent."
            );
        }
    }

    function getModel(name, fallback) {
        return (
            context?.models?.get?.(name) ||
            window.Gomai?.getModel?.(name) ||
            window.ModelRegistry?.get?.(name) ||
            fallback ||
            null
        );
    }

    function getCategoriesModel() {
        return getModel(
            "categories",
            window.CategoriesModel
        );
    }

    function getBrandsModel() {
        return getModel(
            "brands",
            window.BrandsModel
        );
    }

    function getProductsModel() {
        return getModel(
            "products",
            window.ProductsModel
        );
    }

    function getBrandCard() {
        return (
            context?.components?.get?.("brandCard") ||
            window.Gomai?.getComponent?.("brandCard") ||
            window.BrandCardComponent ||
            null
        );
    }

    function getProductCard() {
        return (
            context?.components?.get?.("productCard") ||
            window.Gomai?.getComponent?.("productCard") ||
            window.ProductCardComponent ||
            null
        );
    }

    async function loadData() {
        const [
            categoryData,
            brandData,
            productData
        ] = await Promise.all([
            getCategoriesModel().getActive(),
            getBrandsModel().getFeatured?.() ||
                getBrandsModel().getActive(),
            getProductsModel().getActive()
        ]);

        categories = Array.isArray(categoryData)
            ? categoryData
            : [];

        brands = Array.isArray(brandData)
            ? brandData
            : [];

        const activeProducts = Array.isArray(productData)
            ? productData
            : [];

        products = activeProducts
            .slice()
            .sort((a, b) => {
                const af = a?.display?.featured ? 0 : 1;
                const bf = b?.display?.featured ? 0 : 1;

                if (af !== bf) {
                    return af - bf;
                }

                return (
                    Number(a?.display?.featuredOrder || a?.sortOrder || 999) -
                    Number(b?.display?.featuredOrder || b?.sortOrder || 999)
                );
            })
            .slice(0, 8);
    }

    function renderCategories() {
        const target = elements.categoryGrid;

        if (!target) {
            return;
        }

        target.replaceChildren();

        const fragment =
            document.createDocumentFragment();

        categories.forEach(category => {
            const card =
                document.createElement("a");

            const id =
                String(category?.id || "").trim();

            card.className =
                "home-category-card";

            card.href =
                buildProductsCategoryURL(id);

            card.dataset.categoryId =
                id;

            const media =
                document.createElement("span");

            media.className =
                "home-category-card-media";

            const icon =
                document.createElement("img");

            icon.src =
                resolveAsset(category?.icon);

            icon.alt = "";

            icon.decoding =
                "async";

            media.append(icon);

            const body =
                document.createElement("span");

            body.className =
                "home-category-card-body";

            const title =
                document.createElement("strong");

            title.textContent =
                localized(category?.name);

            const description =
                document.createElement("span");

            description.textContent =
                localized(category?.description);

            const action =
                document.createElement("span");

            action.className =
                "home-category-card-action";

            action.textContent =
                translate(
                    "homepage.categories.viewProducts",
                    "Lihat Produk →"
                );

            body.append(
                title,
                description,
                action
            );

            card.append(
                media,
                body
            );

            fragment.append(card);
        });

        target.append(fragment);

        target.setAttribute(
            "aria-busy",
            "false"
        );
    }

    function renderBrands() {
        if (!elements.brandGrid) {
            return;
        }

        getBrandCard().render({
            target: elements.brandGrid,
            brands,
            clearTarget: true,
            showLogo: true,
            showDescription: false,
            showAction: true,
            showBadge: false
        });
    }

    function renderProducts() {
        if (!elements.productGrid) {
            return;
        }

        if (products.length === 0) {
            elements.productGrid.innerHTML =
                `<div class="empty-state"><p>${escapeHTML(
                    translate(
                        "homepage.products.empty",
                        "Produk akan tampil setelah datanya tersedia."
                    )
                )}</p></div>`;

            elements.productGrid.setAttribute(
                "aria-busy",
                "false"
            );

            return;
        }

        getProductCard().render({
            target: elements.productGrid,
            products,
            clearTarget: true,
            showWishlist: true,
            showAddToCart: true
        });
    }

    function syncWechatId() {
        const id =
            window.GomaiConfig?.contact?.wechatId ||
            "Gomai";

        document
            .querySelectorAll("[data-wechat-id]")
            .forEach(element => {
                element.textContent = id;
            });
    }

    function localized(value) {
        const language =
            window.Language?.getLanguage?.() ||
            "zh";

        if (typeof value === "string") {
            return value.trim();
        }

        return String(
            value?.[language] ||
            value?.zh ||
            value?.id ||
            ""
        ).trim();
    }

    function translate(key, fallback) {
        return (
            window.Language?.translate?.(key) ||
            window.Language?.t?.(key) ||
            fallback
        );
    }

    function buildProductsCategoryURL(id) {
        const root =
            window.GomaiUtils?.getRoute?.(
                "products"
            ) ||
            "pages/products.html";

        const separator =
            root.includes("?")
                ? "&"
                : "?";

        return `${root}${separator}category=${encodeURIComponent(id)}`;
    }

    function resolveAsset(path) {
        if (!path) {
            return "";
        }

        return (
            window.GomaiUtils?.resolveAssetPath?.(path) ||
            path
        );
    }

    function escapeHTML(value) {
        const div =
            document.createElement("div");

        div.textContent =
            String(value || "");

        return div.innerHTML;
    }

    async function refreshLanguage() {
        if (!initialized) {
            return getResult();
        }

        renderCategories();
        renderBrands();
        renderProducts();
        syncWechatId();

        return getResult();
    }

    async function reloadData() {
        await loadData();

        renderCategories();
        renderBrands();
        renderProducts();

        return getResult();
    }

    function destroy() {
        initialized = false;
        categories = [];
        brands = [];
        products = [];
        context = {};
        return true;
    }

    function getResult() {
        return Object.freeze({
            version: VERSION,
            initialized,
            categoryCount: categories.length,
            brandCount: brands.length,
            productCount: products.length
        });
    }

    return Object.freeze({
        version: VERSION,
        init,
        destroy,
        refreshLanguage,
        reloadData,
        getCategories: () => JSON.parse(JSON.stringify(categories)),
        getBrands: () => JSON.parse(JSON.stringify(brands)),
        getProducts: () => JSON.parse(JSON.stringify(products)),
        hasInitialized: () => initialized
    });
})();

window.HomeController = HomeController;
window.HomePage = HomeController;
