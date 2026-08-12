"use strict";

/**
 * ==========================================================
 * GOMAI BRAND CONTROLLER
 * Version 3.0.0
 * js/brand.js
 * ==========================================================
 *
 * Tanggung jawab:
 * - Membaca brand dari URL.
 * - Mengambil data melalui BrandsModel dan ProductsModel.
 * - Merender identitas, hero, tema, dan koleksi brand.
 * - Menangani filter kategori dan sorting produk.
 * - Merender kartu melalui ProductCardComponent.
 * - Mengikuti lifecycle ControllerRegistry.
 * - Memperbarui konten dinamis ketika bahasa berubah.
 *
 * Tidak membaca JSON langsung.
 * Tidak membuat markup product-card sendiri.
 * Tidak memakai DOMContentLoaded sendiri.
 * Tidak memasang listener bahasa global sendiri.
 * ==========================================================
 */

const BrandController = (() => {
    const VERSION = "3.1.0";

    const EVENTS = Object.freeze({
        INITIALIZED: "gomai:brand-controller-initialized",
        FILTERED: "gomai:brand-controller-filtered",
        LANGUAGE_REFRESHED: "gomai:brand-controller-language-refreshed",
        DATA_RELOADED: "gomai:brand-controller-data-reloaded",
        NOT_FOUND: "gomai:brand-controller-not-found",
        DESTROYED: "gomai:brand-controller-destroyed",
        ERROR: "gomai:brand-controller-error"
    });

    const DEFAULT_STATE = Object.freeze({
        selectedCategory: "all",
        selectedSort: "default"
    });

    const SUPPORTED_SORT = Object.freeze([
        "default",
        "price-low",
        "price-high",
        "name-asc",
        "name-desc",
        "newest",
        "featured"
    ]);

    let initialized = false;
    let initializing = false;
    let initializationPromise = null;
    let lifecycleContext = null;

    let requestedBrandId = "";
    let currentBrand = null;
    let brandProducts = [];
    let visibleProducts = [];

    let eventController = null;
    let lastError = null;

    const state = {
        ...DEFAULT_STATE
    };

    const elements = {
        pageRoot: null,
        breadcrumbBrandName: null,
        heroSection: null,
        heroImage: null,
        heroPlaceholder: null,
        brandLogo: null,
        brandName: null,
        brandDescription: null,
        productsSection: null,
        productGrid: null,
        productCount: null,
        categoryFilter: null,
        sortControl: null,
        notFound: null,
        notFoundTitle: null,
        notFoundDescription: null,
        notFoundButton: null,
        pageDescription: null
    };

    /* ======================================================
       INIT
    ====================================================== */

    async function init(context = {}) {
        if (
            initialized &&
            context?.force !== true
        ) {
            await refreshLanguage(
                context
            );

            return createResult();
        }

        if (
            initializing &&
            initializationPromise
        ) {
            return initializationPromise;
        }

        initializationPromise =
            initializeInternal(
                context
            );

        try {
            return await initializationPromise;
        } finally {
            initializationPromise =
                null;
        }
    }

    async function initializeInternal(
        context = {}
    ) {
        initializing =
            true;

        lastError =
            null;

        try {
            if (initialized) {
                destroy({
                    reason:
                        "forced-reinitialize"
                });
            }

            lifecycleContext =
                isPlainObject(
                    context
                )
                    ? context
                    : {};

            validateDependencies();
            cacheElements();
            validatePageMarkup();

            createEventController();
            bindControls();

            requestedBrandId =
                getRequestedBrandId();

            if (!requestedBrandId) {
                initialized =
                    true;

                showBrandNotFound();

                return createResult({
                    notFound:
                        true
                });
            }

            showLoadingState();

            await loadPageData(
                requestedBrandId
            );

            if (!currentBrand) {
                initialized =
                    true;

                showBrandNotFound();

                return createResult({
                    notFound:
                        true
                });
            }

            await renderPage();

            initialized =
                true;

            dispatch(
                EVENTS.INITIALIZED,
                {
                    brand:
                        getCurrentBrand(),

                    totalProducts:
                        brandProducts.length,

                    visibleProducts:
                        visibleProducts.length,

                    state:
                        getState()
                }
            );

            return createResult();

        } catch (error) {

            lastError =
                normalizeError(
                    error
                );

            initialized =
                false;

            showLoadError();

            dispatch(
                EVENTS.ERROR,
                {
                    phase:
                        "init",

                    error:
                        lastError
                }
            );

            console.error(
                "BrandController gagal diinisialisasi:",
                lastError
            );

            throw lastError;

        } finally {

            initializing =
                false;
        }
    }

    /* ======================================================
       DEPENDENCIES
    ====================================================== */

    function validateDependencies() {
        if (!window.GomaiUtils) {
            throw new Error(
                "BrandController membutuhkan GomaiUtils."
            );
        }

        if (
            !window.Language ||
            typeof window.Language
                .translate !==
                "function"
        ) {
            throw new Error(
                "BrandController membutuhkan Language."
            );
        }

        const brandsModel =
            getBrandsModel();

        const productsModel =
            getProductsModel();

        const productCard =
            getProductCardComponent();

        if (
            !brandsModel ||
            typeof brandsModel.find !==
                "function"
        ) {
            throw new Error(
                "BrandController membutuhkan BrandsModel.find()."
            );
        }

        if (
            !productsModel ||
            typeof productsModel
                .getByBrand !==
                "function" ||
            typeof productsModel
                .getCategories !==
                "function" ||
            typeof productsModel
                .sort !==
                "function"
        ) {
            throw new Error(
                "BrandController membutuhkan ProductsModel final."
            );
        }

        if (
            !productCard ||
            typeof productCard.render !==
                "function"
        ) {
            throw new Error(
                "BrandController membutuhkan ProductCardComponent.render()."
            );
        }
    }

    function getBrandsModel() {
        return (
            lifecycleContext
                ?.models
                ?.get?.(
                    "brands"
                ) ||

            window.Gomai
                ?.getModel?.(
                    "brands"
                ) ||

            window.ModelRegistry
                ?.get?.(
                    "brands"
                ) ||

            window.BrandsModel ||

            null
        );
    }

    function getProductsModel() {
        return (
            lifecycleContext
                ?.models
                ?.get?.(
                    "products"
                ) ||

            window.Gomai
                ?.getModel?.(
                    "products"
                ) ||

            window.ModelRegistry
                ?.get?.(
                    "products"
                ) ||

            window.ProductsModel ||

            null
        );
    }

    function getProductCardComponent() {
        return (
            lifecycleContext
                ?.components
                ?.get?.(
                    "productCard"
                ) ||

            window.Gomai
                ?.getComponent?.(
                    "productCard"
                ) ||

            window.ComponentRegistry
                ?.get?.(
                    "productCard"
                ) ||

            window.ProductCardComponent ||

            null
        );
    }

    function getLoadingComponent() {
        return (
            lifecycleContext
                ?.components
                ?.get?.(
                    "loading"
                ) ||

            window.Gomai
                ?.getComponent?.(
                    "loading"
                ) ||

            window.ComponentRegistry
                ?.get?.(
                    "loading"
                ) ||

            window.LoadingComponent ||

            null
        );
    }

    function getEmptyStateComponent() {
        return (
            lifecycleContext
                ?.components
                ?.get?.(
                    "emptyState"
                ) ||

            window.Gomai
                ?.getComponent?.(
                    "emptyState"
                ) ||

            window.ComponentRegistry
                ?.get?.(
                    "emptyState"
                ) ||

            window.EmptyStateComponent ||

            null
        );
    }

    /* ======================================================
       DOM
    ====================================================== */

    function cacheElements() {
        elements.pageRoot =
            document.getElementById(
                "brand-page"
            ) ||
            document.querySelector(
                "[data-page='brand']"
            );

        elements.breadcrumbBrandName =
            document.getElementById(
                "breadcrumb-brand-name"
            );

        elements.heroSection =
            document.getElementById(
                "brand-hero-section"
            );

        elements.heroImage =
            document.getElementById(
                "brand-hero-image"
            );

        elements.heroPlaceholder =
            document.getElementById(
                "brand-hero-placeholder"
            );

        elements.brandLogo =
            document.getElementById(
                "brand-logo"
            );

        elements.brandName =
            document.getElementById(
                "brand-name"
            );

        elements.brandDescription =
            document.getElementById(
                "brand-description"
            );

        elements.productsSection =
            document.getElementById(
                "brand-products"
            );

        elements.productGrid =
            document.getElementById(
                "brand-product-grid"
            );

        elements.productCount =
            document.getElementById(
                "brand-product-count"
            );

        elements.categoryFilter =
            document.getElementById(
                "brand-category-filter"
            );

        elements.sortControl =
            document.getElementById(
                "brand-sort"
            );

        elements.notFound =
            document.getElementById(
                "brand-not-found"
            );

        elements.notFoundTitle =
            document.getElementById(
                "brand-not-found-title"
            );

        elements.notFoundDescription =
            document.getElementById(
                "brand-not-found-description"
            );

        elements.notFoundButton =
            document.getElementById(
                "brand-not-found-button"
            );

        elements.pageDescription =
            document.getElementById(
                "page-description"
            );
    }

    function validatePageMarkup() {
        if (!elements.productGrid) {
            throw new Error(
                'BrandController: elemen "#brand-product-grid" tidak ditemukan.'
            );
        }

        if (!elements.notFound) {
            throw new Error(
                'BrandController: elemen "#brand-not-found" tidak ditemukan.'
            );
        }
    }

    function resetElementCache() {
        Object.keys(
            elements
        ).forEach(
            key => {
                elements[key] =
                    null;
            }
        );
    }

    /* ======================================================
       URL
    ====================================================== */

    function getRequestedBrandId() {
        const queryKey =
            window.GomaiConfig
                ?.query
                ?.brandId ||
            "id";

        let value =
            "";

        if (
            typeof window.GomaiUtils
                .getQueryParameter ===
            "function"
        ) {
            value =
                window.GomaiUtils
                    .getQueryParameter(
                        queryKey
                    );
        } else {
            value =
                new URLSearchParams(
                    window.location.search
                ).get(
                    queryKey
                );
        }

        return normalizeIdentifier(
            value
        );
    }

    /* ======================================================
       DATA
    ====================================================== */

    async function loadPageData(
        brandId
    ) {
        const brandsModel =
            getBrandsModel();

        const productsModel =
            getProductsModel();

        currentBrand =
            await brandsModel.find(
                brandId
            ) ||
            null;

        if (!currentBrand) {
            brandProducts =
                [];

            visibleProducts =
                [];

            return;
        }

        const products =
            await productsModel
                .getByBrand(
                    currentBrand.id
                );

        brandProducts =
            Array.isArray(
                products
            )
                ? products
                : [];

        visibleProducts = [
            ...brandProducts
        ];
    }

    async function reloadData(
        options = {}
    ) {
        lastError =
            null;

        try {
            if (
                options.reloadModels ===
                true
            ) {
                await Promise.all([
                    getBrandsModel()
                        .reload?.(),

                    getProductsModel()
                        .reload?.()
                ]);
            }

            requestedBrandId =
                options.brandId
                    ? normalizeIdentifier(
                        options.brandId
                    )
                    : (
                        requestedBrandId ||
                        getRequestedBrandId()
                    );

            if (!requestedBrandId) {
                currentBrand =
                    null;

                brandProducts =
                    [];

                visibleProducts =
                    [];

                showBrandNotFound();

                return createResult({
                    notFound:
                        true
                });
            }

            showLoadingState();

            await loadPageData(
                requestedBrandId
            );

            if (!currentBrand) {
                showBrandNotFound();

                return createResult({
                    notFound:
                        true
                });
            }

            await renderPage();

            dispatch(
                EVENTS.DATA_RELOADED,
                {
                    brand:
                        getCurrentBrand(),

                    totalProducts:
                        brandProducts.length,

                    visibleProducts:
                        visibleProducts.length
                }
            );

            return createResult();

        } catch (error) {

            lastError =
                normalizeError(
                    error
                );

            showLoadError();

            dispatch(
                EVENTS.ERROR,
                {
                    phase:
                        "reload",

                    error:
                        lastError
                }
            );

            throw lastError;
        }
    }

    /* ======================================================
       PAGE RENDER
    ====================================================== */

    async function renderPage() {
        renderBrandIdentity();
        renderHeroMedia();
        applyBrandTheme();

        await populateCategoryFilter();

        syncSortControl();
        updateVisibleProducts();

        updateDocumentMetadata();
        showBrandContent();
    }

    /* ======================================================
       BRAND IDENTITY
    ====================================================== */

    function renderBrandIdentity() {
        if (!currentBrand) {
            return;
        }

        const language =
            getCurrentLanguage();

        const brandName =
            getBrandName(
                language
            );

        const description =
            getBrandDescription(
                language
            );

        setElementText(
            elements.breadcrumbBrandName,
            brandName
        );

        setElementText(
            elements.brandName,
            brandName
        );

        setElementText(
            elements.brandDescription,
            description
        );

    }

    /* ======================================================
       HERO / LOGO
    ====================================================== */

    function renderHeroMedia() {
        if (!currentBrand) {
            return;
        }

        const heroPath =
            resolveAssetPath(
                currentBrand.assets
                    ?.hero ||
                currentBrand.hero ||
                ""
            );

        const logoPath =
            resolveAssetPath(
                currentBrand.assets
                    ?.logo ||
                currentBrand.logo ||
                ""
            );

        renderHeroImage(
            heroPath
        );

        renderBrandLogo(
            logoPath
        );
    }

    function renderHeroImage(
        path
    ) {
        const image =
            elements.heroImage;

        if (!image) {
            return;
        }

        image.onload =
            null;

        image.onerror =
            null;

        image.alt =
            translate(
                "hero.imageAltTemplate",
                "Koleksi {{brand}}",
                {
                    brand:
                        getBrandName()
                }
            );

        if (!path) {
            image.removeAttribute(
                "src"
            );

            image.hidden =
                true;

            showHeroPlaceholder();

            return;
        }

        image.hidden =
            true;

        image.onload =
            () => {
                image.hidden =
                    false;

                if (
                    elements
                        .heroPlaceholder
                ) {
                    elements
                        .heroPlaceholder
                        .hidden =
                        true;
                }
            };

        image.onerror =
            () => {
                image.hidden =
                    true;

                showHeroPlaceholder();
            };

        image.src =
            path;
    }

    function renderBrandLogo(
        path
    ) {
        const logo =
            elements.brandLogo;

        if (!logo) {
            return;
        }

        logo.onload =
            null;

        logo.onerror =
            null;

        logo.alt =
            translate(
                "hero.logoAltTemplate",
                "Logo {{brand}}",
                {
                    brand:
                        getBrandName()
                }
            );

        if (!path) {
            logo.removeAttribute(
                "src"
            );

            logo.hidden =
                true;

            return;
        }

        logo.hidden =
            true;

        logo.onload =
            () => {
                logo.hidden =
                    false;
            };

        logo.onerror =
            () => {
                logo.hidden =
                    true;
            };

        logo.src =
            path;
    }

    function refreshHeroTranslations() {
        if (!currentBrand) {
            return;
        }

        if (
            elements.heroImage
        ) {
            elements.heroImage.alt =
                translate(
                    "hero.imageAltTemplate",
                    "Koleksi {{brand}}",
                    {
                        brand:
                            getBrandName()
                    }
                );
        }

        if (
            elements.brandLogo
        ) {
            elements.brandLogo.alt =
                translate(
                    "hero.logoAltTemplate",
                    "Logo {{brand}}",
                    {
                        brand:
                            getBrandName()
                    }
                );
        }

        if (
            elements
                .heroPlaceholder &&
            !elements
                .heroPlaceholder
                .hidden
        ) {
            showHeroPlaceholder();
        }
    }

    function showHeroPlaceholder() {
        const placeholder =
            elements.heroPlaceholder;

        if (!placeholder) {
            return;
        }

        placeholder.hidden =
            false;

        placeholder.replaceChildren();

        const paragraph =
            document.createElement(
                "p"
            );

        paragraph.textContent =
            translate(
                "product.imageUnavailable",
                "Gambar belum tersedia"
            );

        placeholder.append(
            paragraph
        );
    }

    /* ======================================================
       BRAND THEME
    ====================================================== */

    function applyBrandTheme() {
        if (!currentBrand) {
            return;
        }

        const primaryColor =
            currentBrand.theme
                ?.primaryColor ||
            currentBrand
                .primaryColor ||
            "#111111";

        const accentColor =
            currentBrand.theme
                ?.accentColor ||
            currentBrand
                .accentColor ||
            "#ffffff";

        document.documentElement
            .style
            .setProperty(
                "--brand-primary",
                primaryColor
            );

        document.documentElement
            .style
            .setProperty(
                "--brand-accent",
                accentColor
            );

        elements.heroSection
            ?.style
            .setProperty(
                "--brand-primary",
                primaryColor
            );

        elements.heroSection
            ?.style
            .setProperty(
                "--brand-accent",
                accentColor
            );

        document.body
            ?.setAttribute(
                "data-brand-id",
                currentBrand.id
            );

        elements.pageRoot
            ?.setAttribute(
                "data-brand-id",
                currentBrand.id
            );
    }

    function clearBrandTheme() {
        document.documentElement
            .style
            .removeProperty(
                "--brand-primary"
            );

        document.documentElement
            .style
            .removeProperty(
                "--brand-accent"
            );

        elements.heroSection
            ?.style
            .removeProperty(
                "--brand-primary"
            );

        elements.heroSection
            ?.style
            .removeProperty(
                "--brand-accent"
            );

        document.body
            ?.removeAttribute(
                "data-brand-id"
            );

        elements.pageRoot
            ?.removeAttribute(
                "data-brand-id"
            );
    }

    /* ======================================================
       FILTER / SORT
    ====================================================== */

    async function populateCategoryFilter() {
        const filter =
            elements.categoryFilter;

        if (
            !filter ||
            !currentBrand
        ) {
            return;
        }

        const previousValue =
            state.selectedCategory;

        const categories =
            await getProductsModel()
                .getCategories(
                    currentBrand.id
                );

        filter.replaceChildren();

        filter.append(
            createOption(
                "all",
                translate(
                    "brandPage.filter.allCategories",
                    "Semua Kategori"
                )
            )
        );

        (
            Array.isArray(
                categories
            )
                ? categories
                : []
        ).forEach(
            category => {
                const normalized =
                    normalizeIdentifier(
                        category
                    );

                if (!normalized) {
                    return;
                }

                filter.append(
                    createOption(
                        normalized,
                        getCategoryName(
                            normalized
                        )
                    )
                );
            }
        );

        state.selectedCategory =
            optionExists(
                filter,
                previousValue
            )
                ? previousValue
                : "all";

        filter.value =
            state.selectedCategory;
    }

    function syncSortControl() {
        const control =
            elements.sortControl;

        if (!control) {
            return;
        }

        const normalized =
            normalizeSortValue(
                state.selectedSort
            );

        state.selectedSort =
            optionExists(
                control,
                normalized
            )
                ? normalized
                : "default";

        control.value =
            state.selectedSort;
    }

    function createOption(
        value,
        label
    ) {
        const option =
            document.createElement(
                "option"
            );

        option.value =
            value;

        option.textContent =
            label;

        return option;
    }

    function optionExists(
        select,
        value
    ) {
        return Array.from(
            select?.options ||
            []
        ).some(
            option =>
                option.value ===
                value
        );
    }

    function createEventController() {
        eventController
            ?.abort();

        eventController =
            new AbortController();
    }

    function bindControls() {
        if (!eventController) {
            return;
        }

        const signal =
            eventController.signal;

        elements.categoryFilter
            ?.addEventListener(
                "change",
                event => {
                    state.selectedCategory =
                        normalizeFilterValue(
                            event.target
                                ?.value,
                            "all"
                        );

                    updateVisibleProducts();
                },
                {
                    signal
                }
            );

        elements.sortControl
            ?.addEventListener(
                "change",
                event => {
                    state.selectedSort =
                        normalizeSortValue(
                            event.target
                                ?.value
                        );

                    updateVisibleProducts();
                },
                {
                    signal
                }
            );
    }

    function updateVisibleProducts() {
        if (!currentBrand) {
            visibleProducts =
                [];

            renderProducts();

            return;
        }

        let results = [
            ...brandProducts
        ];

        if (
            state.selectedCategory !==
            "all"
        ) {
            results =
                results.filter(
                    product =>
                        productMatchesCategory(
                            product,
                            state
                                .selectedCategory
                        )
                );
        }

        visibleProducts =
            getProductsModel()
                .sort(
                    results,
                    state.selectedSort,
                    getCurrentLanguage()
                );

        renderProducts();

        dispatch(
            EVENTS.FILTERED,
            {
                brandId:
                    currentBrand.id,

                state:
                    getState(),

                totalProducts:
                    brandProducts.length,

                visibleProducts:
                    visibleProducts.length
            }
        );
    }

    function productMatchesCategory(
        product,
        categoryId
    ) {
        const normalizedCategory =
            normalizeIdentifier(
                categoryId
            );

        if (!normalizedCategory) {
            return true;
        }

        const categoryIds =
            Array.isArray(
                product
                    ?.categoryIds
            )
                ? product.categoryIds
                : [
                    product
                        ?.category
                ];

        return categoryIds
            .map(
                normalizeIdentifier
            )
            .includes(
                normalizedCategory
            );
    }

    async function resetFilters() {
        Object.assign(
            state,
            DEFAULT_STATE
        );

        await populateCategoryFilter();

        syncSortControl();
        updateVisibleProducts();

        return true;
    }

    /* ======================================================
       PRODUCT RENDERING
    ====================================================== */

    function renderProducts() {
        const grid =
            elements.productGrid;

        if (!grid) {
            return false;
        }

        updateProductCount();
        clearFeedbackState();

        if (
            visibleProducts.length ===
            0
        ) {
            renderProductEmptyState();

            return false;
        }

        getProductCardComponent()
            .render({
                target:
                    grid,

                products:
                    visibleProducts,

                clearTarget:
                    true,

                brand:
                    currentBrand,

                showBrand:
                    true,

                includeBrandInName:
                    true,

                showStock:
                    true,

                imageLoading:
                    "lazy",

                imageDecoding:
                    "async"
            });

        return true;
    }

    function renderProductEmptyState() {
        const grid =
            elements.productGrid;

        if (!grid) {
            return;
        }

        const emptyState =
            getEmptyStateComponent();

        const hasCategoryFilter =
            state.selectedCategory !==
            "all";

        if (
            emptyState &&
            typeof emptyState
                .render ===
                "function"
        ) {
            emptyState.render({
                target:
                    grid,

                preset:
                    hasCategoryFilter
                        ? "noCategory"
                        : "noProducts",

                titleKey:
                    "brandPage.emptyProductsTitle",

                titleFallback:
                    "Belum Ada Produk",

                descriptionKey:
                    "brandPage.emptyProductsDescription",

                descriptionFallback:
                    "Belum ada produk yang dapat ditampilkan untuk brand atau kategori ini.",

                primaryAction:
                    hasCategoryFilter
                        ? {
                            labelKey:
                                "emptyState.noCategory.primaryButton",

                            labelFallback:
                                "Hapus Filter",

                            action:
                                "clear-filter",

                            onClick:
                                () => {
                                    resetFilters()
                                        .catch(
                                            error => {
                                                console.error(
                                                    "BrandController: gagal mereset filter.",
                                                    error
                                                );
                                            }
                                        );
                                },

                            className:
                                "btn btn-primary"
                        }
                        : false,

                secondaryAction:
                    false,

                className:
                    "brand-products-empty-state"
            });

            return;
        }

        const container =
            document.createElement(
                "div"
            );

        container.className =
            "empty-state brand-products-empty-state";

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            translate(
                "brandPage.emptyProductsTitle",
                "Belum Ada Produk"
            );

        const description =
            document.createElement(
                "p"
            );

        description.textContent =
            translate(
                "brandPage.emptyProductsDescription",
                "Belum ada produk yang dapat ditampilkan untuk brand atau kategori ini."
            );

        container.append(
            title,
            description
        );

        if (hasCategoryFilter) {
            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "btn btn-primary";

            button.textContent =
                translate(
                    "emptyState.noCategory.primaryButton",
                    "Hapus Filter"
                );

            button.addEventListener(
                "click",
                () => {
                    resetFilters()
                        .catch(
                            error => {
                                console.error(
                                    "BrandController: gagal mereset filter.",
                                    error
                                );
                            }
                        );
                },
                {
                    once:
                        true
                }
            );

            container.append(
                button
            );
        }

        grid.replaceChildren(
            container
        );

        grid.hidden =
            false;

        grid.setAttribute(
            "aria-busy",
            "false"
        );
    }

    function updateProductCount() {
        if (!elements.productCount) {
            return;
        }

        elements.productCount
            .textContent =
            translate(
                "brandPage.showingProductsTemplate",
                "Menampilkan {{count}} produk",
                {
                    count:
                        visibleProducts
                            .length
                }
            );
    }

    /* ======================================================
       PAGE STATES
    ====================================================== */

    function showLoadingState() {
        const grid =
            elements.productGrid;

        if (!grid) {
            return;
        }

        if (
            elements.productsSection
        ) {
            elements.productsSection.hidden =
                false;
        }

        if (
            elements.notFound
        ) {
            elements.notFound.hidden =
                true;
        }

        getProductCardComponent()
            ?.destroy?.(
                grid
            );

        getEmptyStateComponent()
            ?.clear?.(
                grid
            );

        grid.setAttribute(
            "aria-busy",
            "true"
        );

        const loading =
            getLoadingComponent();

        if (
            loading &&
            typeof loading
                .renderState ===
                "function"
        ) {
            loading.renderState(
                grid,
                {
                    label:
                        translate(
                            "brandPage.loadingProducts",
                            "Memuat produk..."
                        ),

                    className:
                        "brand-products-loading-state"
                }
            );

            return;
        }

        const container =
            document.createElement(
                "div"
            );

        container.className =
            "empty-state loading-state brand-products-loading-state";

        const paragraph =
            document.createElement(
                "p"
            );

        paragraph.textContent =
            translate(
                "brandPage.loadingProducts",
                "Memuat produk..."
            );

        container.append(
            paragraph
        );

        grid.replaceChildren(
            container
        );
    }

    function showBrandNotFound(
        options = {}
    ) {
        hideBrandSections();
        clearBrandTheme();

        getProductCardComponent()
            ?.destroy?.(
                elements.productGrid
            );

        if (
            elements.notFound
        ) {
            elements.notFound.hidden =
                false;
        }

        setElementText(
            elements.notFoundTitle,
            translate(
                "brandPage.notFound.title",
                "Brand Tidak Ditemukan"
            )
        );

        setElementText(
            elements.notFoundDescription,
            translate(
                "brandPage.notFound.description",
                "Brand yang Anda cari belum tersedia atau alamat halaman tidak valid."
            )
        );

        setElementText(
            elements.notFoundButton,
            translate(
                "brandPage.notFound.button",
                "Lihat Semua Brand"
            )
        );

        if (
            elements.notFoundButton
        ) {
            elements.notFoundButton.href =
                buildHomeBrandsURL();
        }

        const title =
            translate(
                "brandPage.notFound.title",
                "Brand Tidak Ditemukan"
            );

        document.title =
            `${title} | Gomai`;

        elements.pageDescription
            ?.setAttribute(
                "content",
                translate(
                    "brandPage.notFound.description",
                    "Brand yang Anda cari belum tersedia atau alamat halaman tidak valid."
                )
            );

        if (
            options.dispatchEvent !==
            false
        ) {
            dispatch(
                EVENTS.NOT_FOUND,
                {
                    requestedBrandId
                }
            );
        }
    }

    function showLoadError() {
        const grid =
            elements.productGrid;

        if (!grid) {
            return;
        }

        if (
            elements.productsSection
        ) {
            elements.productsSection.hidden =
                false;
        }

        if (
            elements.notFound
        ) {
            elements.notFound.hidden =
                true;
        }

        getProductCardComponent()
            ?.destroy?.(
                grid
            );

        getLoadingComponent()
            ?.clear?.(
                grid
            );

        const emptyState =
            getEmptyStateComponent();

        if (
            emptyState &&
            typeof emptyState
                .render ===
                "function"
        ) {
            emptyState.render({
                target:
                    grid,

                preset:
                    "error",

                titleKey:
                    "brands.errorTitle",

                titleFallback:
                    "Data Gagal Dimuat",

                descriptionKey:
                    "brands.errorDescription",

                descriptionFallback:
                    "Terjadi kesalahan saat memuat data. Silakan coba kembali.",

                primaryAction: {
                    label:
                        translate(
                            "emptyState.error.primaryButton",
                            "Coba Lagi"
                        ),

                    action:
                        "retry",

                    onClick:
                        () => {
                            reloadData()
                                .catch(
                                    error => {
                                        console.error(
                                            "BrandController: reload gagal.",
                                            error
                                        );
                                    }
                                );
                        },

                    className:
                        "btn btn-primary"
                },

                secondaryAction:
                    false,

                className:
                    "brand-products-error-state"
            });

            return;
        }

        const container =
            document.createElement(
                "div"
            );

        container.className =
            "empty-state brand-products-error-state";

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            translate(
                "brands.errorTitle",
                "Data Gagal Dimuat"
            );

        const description =
            document.createElement(
                "p"
            );

        description.textContent =
            translate(
                "brands.errorDescription",
                "Terjadi kesalahan saat memuat data. Silakan coba kembali."
            );

        const retryButton =
            document.createElement(
                "button"
            );

        retryButton.type =
            "button";

        retryButton.className =
            "btn btn-primary";

        retryButton.textContent =
            translate(
                "emptyState.error.primaryButton",
                "Coba Lagi"
            );

        retryButton.addEventListener(
            "click",
            () => {
                reloadData()
                    .catch(
                        error => {
                            console.error(
                                "BrandController: reload gagal.",
                                error
                            );
                        }
                    );
            },
            {
                once:
                    true
            }
        );

        container.append(
            title,
            description,
            retryButton
        );

        grid.replaceChildren(
            container
        );

        grid.hidden =
            false;

        grid.setAttribute(
            "aria-busy",
            "false"
        );
    }

    function showBrandContent() {
        if (
            elements.heroSection
        ) {
            elements.heroSection.hidden =
                false;
        }

        if (
            elements.productsSection
        ) {
            elements.productsSection.hidden =
                false;
        }

        if (
            elements.notFound
        ) {
            elements.notFound.hidden =
                true;
        }
    }

    function hideBrandSections() {
        if (
            elements.heroSection
        ) {
            elements.heroSection.hidden =
                true;
        }

        if (
            elements.productsSection
        ) {
            elements.productsSection.hidden =
                true;
        }
    }

    function clearFeedbackState() {
        const grid =
            elements.productGrid;

        if (!grid) {
            return;
        }

        /*
         * ProductCard dihancurkan sebelum target dibersihkan
         * agar registry kartu tidak menyimpan elemen lama.
         */
        getProductCardComponent()
            ?.destroy?.(
                grid
            );

        getLoadingComponent()
            ?.clear?.(
                grid
            );

        getEmptyStateComponent()
            ?.clear?.(
                grid
            );
    }

    /* ======================================================
       LANGUAGE
    ====================================================== */

    async function refreshLanguage(
        context = {}
    ) {
        if (!initialized) {
            return false;
        }

        try {
            if (!currentBrand) {
                showBrandNotFound({
                    dispatchEvent:
                        false
                });

                return true;
            }

            renderBrandIdentity();
            refreshHeroTranslations();

            await populateCategoryFilter();

            syncSortControl();
            updateVisibleProducts();
            updateDocumentMetadata();

            dispatch(
                EVENTS.LANGUAGE_REFRESHED,
                {
                    language:
                        context.language ||
                        getCurrentLanguage()
                }
            );

            return true;

        } catch (error) {

            lastError =
                normalizeError(
                    error
                );

            dispatch(
                EVENTS.ERROR,
                {
                    phase:
                        "language",

                    error:
                        lastError
                }
            );

            console.error(
                "BrandController gagal memperbarui bahasa:",
                lastError
            );

            return false;
        }
    }

    /* ======================================================
       SEO
    ====================================================== */

    function updateDocumentMetadata() {
        if (!currentBrand) {
            return;
        }

        const brandName =
            getBrandName();

        const description =
            getBrandDescription() ||
            translate(
                "brandPage.collectionDescriptionTemplate",
                "Jelajahi produk {{brand}} yang tersedia melalui Gomai.",
                {
                    brand:
                        brandName
                }
            );

        document.title =
            `${brandName} | Gomai`;

        elements.pageDescription
            ?.setAttribute(
                "content",
                description
            );
    }

    /* ======================================================
       HELPERS
    ====================================================== */

    function getBrandName(
        language =
            getCurrentLanguage()
    ) {
        if (!currentBrand) {
            return "Brand";
        }

        if (
            typeof currentBrand
                .name ===
            "string"
        ) {
            return (
                normalizeText(
                    currentBrand.name
                ) ||
                currentBrand.id ||
                "Brand"
            );
        }

        return normalizeText(
            currentBrand.name
                ?.[language] ||
            currentBrand.name
                ?.id ||
            currentBrand.name
                ?.zh ||
            currentBrand.id ||
            "Brand"
        );
    }

    function getBrandDescription(
        language =
            getCurrentLanguage()
    ) {
        if (!currentBrand) {
            return "";
        }

        if (
            typeof currentBrand
                .description ===
            "string"
        ) {
            return normalizeText(
                currentBrand
                    .description
            );
        }

        return normalizeText(
            currentBrand
                .description
                ?.[language] ||
            currentBrand
                .description
                ?.id ||
            currentBrand
                .description
                ?.zh ||
            ""
        );
    }

    function getCategoryName(
        category
    ) {
        const normalized =
            normalizeIdentifier(
                category
            );

        const fallback =
            normalized
                .replaceAll(
                    "-",
                    " "
                )
                .replace(
                    /\b\w/g,
                    character =>
                        character
                            .toUpperCase()
                );

        return translate(
            `categories.${normalized}.name`,
            fallback
        );
    }

    function resolveAssetPath(
        path
    ) {
        const value =
            normalizeText(
                path
            );

        if (!value) {
            return "";
        }

        if (
            value.startsWith(
                "http://"
            ) ||
            value.startsWith(
                "https://"
            ) ||
            value.startsWith(
                "/"
            ) ||
            value.startsWith(
                "../"
            ) ||
            value.startsWith(
                "./"
            )
        ) {
            return value;
        }

        if (
            typeof window.GomaiUtils
                ?.resolveAssetPath ===
            "function"
        ) {
            try {
                return window.GomaiUtils
                    .resolveAssetPath(
                        value
                    );

            } catch (_error) {

                /*
                 * Gunakan fallback getBasePath.
                 */
            }
        }

        const basePath =
            typeof window.GomaiUtils
                ?.getBasePath ===
            "function"

                ? window.GomaiUtils
                    .getBasePath()

                : "";

        return `${basePath}${value}`;
    }

    function buildHomeBrandsURL() {
        if (
            typeof window.GomaiUtils
                ?.buildRoute ===
            "function"
        ) {
            try {
                return (
                    window.GomaiUtils
                        .buildRoute(
                            "home",
                            {}
                        )
                        .split(
                            "#"
                        )[0] +
                    "#brands"
                );

            } catch (_error) {

                /*
                 * Gunakan fallback.
                 */
            }
        }

        const basePath =
            typeof window.GomaiUtils
                ?.getBasePath ===
            "function"

                ? window.GomaiUtils
                    .getBasePath()

                : "../";

        return `${basePath}index.html#brands`;
    }

    function setElementText(
        element,
        value
    ) {
        if (!element) {
            return;
        }

        element.textContent =
            String(
                value ??
                ""
            );
    }

    /* ======================================================
       LANGUAGE HELPERS
    ====================================================== */

    function getCurrentLanguage() {
        if (
            typeof window.Language
                ?.getLanguage ===
            "function"
        ) {
            return normalizeLanguage(
                window.Language
                    .getLanguage()
            );
        }

        return normalizeLanguage(
            window.GomaiConfig
                ?.language
                ?.default ||

            document
                .documentElement
                ?.lang ||

            "id"
        );
    }

    function normalizeLanguage(
        value
    ) {
        const language =
            normalizeText(
                value
            )
                .toLowerCase()
                .replace(
                    "_",
                    "-"
                )
                .split(
                    "-"
                )[0];

        return language ===
            "zh"
                ? "zh"
                : "id";
    }

    function translate(
        key,
        fallback = "",
        parameters = {}
    ) {
        if (
            typeof window.Language
                ?.translate ===
            "function"
        ) {
            try {
                return String(
                    window.Language
                        .translate(
                            key,
                            fallback,
                            parameters
                        )
                );

            } catch (error) {

                console.warn(
                    `BrandController: terjemahan "${key}" gagal.`,
                    error
                );
            }
        }

        return interpolate(
            fallback,
            parameters
        );
    }

    function interpolate(
        text,
        parameters = {}
    ) {
        if (
            typeof window.GomaiUtils
                ?.interpolate ===
            "function"
        ) {
            try {
                return window.GomaiUtils
                    .interpolate(
                        text,
                        parameters
                    );

            } catch (_error) {

                /*
                 * Gunakan fallback internal.
                 */
            }
        }

        return Object.entries(
            parameters
        ).reduce(
            (
                result,
                [
                    key,
                    value
                ]
            ) =>
                result.replaceAll(
                    `{{${key}}}`,
                    String(
                        value ??
                        ""
                    )
                ),

            String(
                text ||
                ""
            )
        );
    }

    /* ======================================================
       NORMALIZATION
    ====================================================== */

    function normalizeText(
        value
    ) {
        return String(
            value ??
            ""
        ).trim();
    }

    function normalizeIdentifier(
        value
    ) {
        return normalizeText(
            value
        )
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );
    }

    function normalizeFilterValue(
        value,
        fallback = "all"
    ) {
        const normalized =
            normalizeIdentifier(
                value
            );

        return normalized ||
            fallback;
    }

    function normalizeSortValue(
        value
    ) {
        const normalized =
            normalizeFilterValue(
                value,
                "default"
            );

        return SUPPORTED_SORT
            .includes(
                normalized
            )
                ? normalized
                : "default";
    }

    function isPlainObject(
        value
    ) {
        if (
            !value ||
            typeof value !==
                "object" ||
            Array.isArray(
                value
            )
        ) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(
                value
            );

        return (
            prototype ===
                Object.prototype ||
            prototype ===
                null
        );
    }

    /* ======================================================
       CLONE
    ====================================================== */

    function cloneData(
        value
    ) {
        if (
            typeof window.GomaiUtils
                ?.cloneData ===
            "function"
        ) {
            try {
                return window.GomaiUtils
                    .cloneData(
                        value
                    );

            } catch (_error) {

                /*
                 * Gunakan fallback.
                 */
            }
        }

        if (
            typeof structuredClone ===
            "function"
        ) {
            try {
                return structuredClone(
                    value
                );

            } catch (_error) {

                /*
                 * Gunakan JSON fallback.
                 */
            }
        }

        if (
            value === undefined
        ) {
            return undefined;
        }

        return JSON.parse(
            JSON.stringify(
                value
            )
        );
    }

    /* ======================================================
       ERROR / EVENTS
    ====================================================== */

    function normalizeError(
        error
    ) {
        return error instanceof
            Error

            ? error

            : new Error(
                String(
                    error ||
                    "Terjadi kesalahan pada BrandController."
                )
            );
    }

    function dispatch(
        eventName,
        detail = {}
    ) {
        return document.dispatchEvent(
            new CustomEvent(
                eventName,
                {
                    detail: {
                        controller:
                            publicAPI,

                        version:
                            VERSION,

                        timestamp:
                            Date.now(),

                        ...(
                            isPlainObject(
                                detail
                            )
                                ? detail
                                : {}
                        )
                    }
                }
            )
        );
    }

    /* ======================================================
       DESTROY
    ====================================================== */

    function destroy(
        context = {}
    ) {
        if (
            !initialized &&
            !initializing &&
            !eventController
        ) {
            return false;
        }

        eventController
            ?.abort();

        eventController =
            null;

        if (
            elements.heroImage
        ) {
            elements.heroImage.onload =
                null;

            elements.heroImage.onerror =
                null;
        }

        if (
            elements.brandLogo
        ) {
            elements.brandLogo.onload =
                null;

            elements.brandLogo.onerror =
                null;
        }

        getProductCardComponent()
            ?.destroy?.(
                elements.productGrid
            );

        getLoadingComponent()
            ?.clear?.(
                elements.productGrid,
                false
            );

        getEmptyStateComponent()
            ?.clear?.(
                elements.productGrid,
                false
            );

        clearBrandTheme();

        requestedBrandId =
            "";

        currentBrand =
            null;

        brandProducts =
            [];

        visibleProducts =
            [];

        Object.assign(
            state,
            DEFAULT_STATE
        );

        initialized =
            false;

        initializing =
            false;

        lifecycleContext =
            null;

        resetElementCache();

        dispatch(
            EVENTS.DESTROYED,
            {
                reason:
                    context?.reason ||
                    "destroy"
            }
        );

        return true;
    }

    /* ======================================================
       PUBLIC STATE
    ====================================================== */

    function getCurrentBrand() {
        return currentBrand
            ? cloneData(
                currentBrand
            )
            : null;
    }

    function getVisibleProducts() {
        return cloneData(
            visibleProducts
        );
    }

    function getState() {
        return cloneData(
            state
        );
    }

    function getLastError() {
        return lastError;
    }

    function hasInitialized() {
        return initialized;
    }

    function createResult(
        extra = {}
    ) {
        return Object.freeze({
            version:
                VERSION,

            initialized,

            requestedBrandId,

            brand:
                getCurrentBrand(),

            totalProducts:
                brandProducts.length,

            visibleProducts:
                visibleProducts.length,

            state:
                getState(),

            ...(
                isPlainObject(
                    extra
                )
                    ? extra
                    : {}
            )
        });
    }

    /* ======================================================
       PUBLIC API
    ====================================================== */

    const publicAPI =
        Object.freeze({
            version:
                VERSION,

            events:
                EVENTS,

            init,
            destroy,

            refreshLanguage,
            reloadData,
            resetFilters,

            getCurrentBrand,
            getVisibleProducts,
            getState,
            getLastError,
            hasInitialized
        });

    return publicAPI;
})();

/*
 * Nama final controller.
 */
window.BrandController =
    BrandController;

/*
 * Alias compatibility sementara.
 * Gomai Core hasil audit masih mengizinkan:
 * BrandController || BrandPage.
 */
window.BrandPage =
    BrandController;