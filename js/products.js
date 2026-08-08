"use strict";

/**
 * ==========================================================
 * GOMAI PRODUCTS CONTROLLER
 * Version 3.0.0
 * js/products.js
 * ==========================================================
 *
 * Tanggung jawab:
 * - Mengelola halaman katalog produk.
 * - Membaca/menulis state filter melalui URL.
 * - Meminta filter, pencarian, dan sorting melalui ProductsModel.
 * - Mengambil brand melalui BrandsModel.
 * - Merender kartu melalui ProductCardComponent.
 * - Mengikuti lifecycle ControllerRegistry.
 *
 * Controller ini tidak membaca JSON langsung, tidak membuat
 * markup product-card sendiri, tidak bootstrap DOMContentLoaded,
 * dan tidak memasang listener bahasa global sendiri.
 * ==========================================================
 */

const ProductsController = (() => {
    const VERSION = "3.0.0";

    const EVENTS = Object.freeze({
        INITIALIZED: "gomai:products-controller-initialized",
        FILTERED: "gomai:products-controller-filtered",
        LANGUAGE_REFRESHED: "gomai:products-controller-language-refreshed",
        DATA_RELOADED: "gomai:products-controller-data-reloaded",
        DESTROYED: "gomai:products-controller-destroyed",
        ERROR: "gomai:products-controller-error"
    });

    const DEFAULT_STATE = Object.freeze({
        brand: "all",
        category: "all",
        stock: "all",
        sort: "default",
        query: ""
    });

    const SUPPORTED_STOCK = Object.freeze([
        "all",
        "available",
        "out-of-stock"
    ]);

    const SUPPORTED_SORT = Object.freeze([
        "default",
        "price-low",
        "price-high",
        "name-asc",
        "name-desc",
        "newest",
        "featured",
        "stock"
    ]);

    let initialized = false;
    let initializing = false;
    let initializationPromise = null;
    let lifecycleContext = null;
    let eventController = null;
    let searchTimer = null;
    let filterGeneration = 0;
    let allProducts = [];
    let allBrands = [];
    let visibleProducts = [];
    let lastError = null;

    const state = { ...DEFAULT_STATE };

    const elements = {
        pageRoot: null,
        title: null,
        description: null,
        productGrid: null,
        resultCount: null,
        brandFilter: null,
        categoryFilter: null,
        stockFilter: null,
        sortControl: null,
        searchForm: null,
        searchInput: null,
        resetButton: null,
        activeFilters: null,
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
            await refreshLanguage(context);

            return createResult();
        }

        if (
            initializing &&
            initializationPromise
        ) {
            return initializationPromise;
        }

        initializationPromise =
            initializeInternal(context);

        try {
            return await initializationPromise;
        } finally {
            initializationPromise = null;
        }
    }

    async function initializeInternal(
        context = {}
    ) {
        initializing = true;
        lastError = null;

        try {
            if (initialized) {
                destroy({
                    reason:
                        "forced-reinitialize"
                });
            }

            lifecycleContext =
                isPlainObject(context)
                    ? context
                    : {};

            validateDependencies();
            cacheElements();

            if (!elements.productGrid) {
                return Object.freeze({
                    version:
                        VERSION,

                    initialized:
                        false,

                    skipped:
                        true,

                    reason:
                        "product-grid-not-found"
                });
            }

            createEventController();

            readStateFromURL();

            showLoadingState();

            await loadReferenceData();

            await populateBrandFilter();

            await populateCategoryFilter();

            populateStockFilter();

            syncControls();

            bindControls();

            initialized = true;

            await applyFilters({
                updateHistory:
                    false
            });

            dispatch(
                EVENTS.INITIALIZED,
                {
                    state:
                        getState(),

                    total:
                        allProducts.length,

                    visible:
                        visibleProducts.length
                }
            );

            return createResult();

        } catch (error) {

            lastError =
                normalizeError(error);

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
                "ProductsController gagal diinisialisasi:",
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
                "ProductsController membutuhkan GomaiUtils."
            );
        }

        if (!window.Language) {
            throw new Error(
                "ProductsController membutuhkan Language."
            );
        }

        const productsModel =
            getProductsModel();

        const brandsModel =
            getBrandsModel();

        const productCard =
            getProductCardComponent();

        if (
            !productsModel ||
            typeof productsModel.getActive !==
                "function" ||
            typeof productsModel.sort !==
                "function"
        ) {
            throw new Error(
                "ProductsController membutuhkan ProductsModel final."
            );
        }

        if (
            !brandsModel ||
            typeof brandsModel.getActive !==
                "function"
        ) {
            throw new Error(
                "ProductsController membutuhkan BrandsModel final."
            );
        }

        if (
            !productCard ||
            typeof productCard.render !==
                "function"
        ) {
            throw new Error(
                "ProductsController membutuhkan ProductCardComponent.render()."
            );
        }
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

    /* ======================================================
       DOM
    ====================================================== */

    function cacheElements() {
        elements.pageRoot =
            findElement(
                "products-page",
                "product-listing-page"
            );

        elements.title =
            findElement(
                "products-title",
                "product-list-title"
            );

        elements.description =
            findElement(
                "products-description",
                "product-list-description"
            );

        elements.productGrid =
            findElement(
                "products-grid",
                "product-grid",
                "products-product-grid"
            );

        elements.resultCount =
            findElement(
                "products-result-count",
                "product-result-count",
                "products-count"
            );

        elements.brandFilter =
            findElement(
                "products-brand-filter",
                "product-brand-filter",
                "brand-filter"
            );

        elements.categoryFilter =
            findElement(
                "products-category-filter",
                "product-category-filter",
                "category-filter"
            );

        elements.stockFilter =
            findElement(
                "products-stock-filter",
                "product-stock-filter",
                "stock-filter"
            );

        elements.sortControl =
            findElement(
                "products-sort",
                "product-sort",
                "sort-products"
            );

        elements.searchForm =
            findElement(
                "products-search-form",
                "product-search-form"
            );

        elements.searchInput =
            findElement(
                "products-search-input",
                "product-search-input"
            );

        elements.resetButton =
            findElement(
                "products-reset-button",
                "product-reset-button",
                "reset-products-filter"
            );

        elements.activeFilters =
            findElement(
                "products-active-filters",
                "active-product-filters"
            );

        elements.pageDescription =
            document.getElementById(
                "page-description"
            );
    }

    function findElement(
        ...ids
    ) {
        for (const id of ids) {
            const element =
                document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function resetElementCache() {
        Object.keys(elements)
            .forEach(
                key => {
                    elements[key] =
                        null;
                }
            );
    }

    /* ======================================================
       DATA
    ====================================================== */

    async function loadReferenceData() {
        const [
            products,
            brands
        ] =
            await Promise.all([
                getProductsModel()
                    .getActive(),

                getBrandsModel()
                    .getActive()
            ]);

        allProducts =
            Array.isArray(products)
                ? products
                : [];

        allBrands =
            Array.isArray(brands)
                ? brands
                : [];
    }

    async function reloadData(
        options = {}
    ) {
        lastError =
            null;

        showLoadingState();

        try {
            const productsModel =
                getProductsModel();

            const brandsModel =
                getBrandsModel();

            if (
                options.reloadModels ===
                true
            ) {
                await Promise.all([
                    productsModel.reload?.(),
                    brandsModel.reload?.()
                ]);
            }

            await loadReferenceData();

            await populateBrandFilter();

            await populateCategoryFilter();

            populateStockFilter();

            syncControls();

            await applyFilters();

            dispatch(
                EVENTS.DATA_RELOADED,
                {
                    total:
                        allProducts.length,

                    visible:
                        visibleProducts.length
                }
            );

            return createResult();

        } catch (error) {

            lastError =
                normalizeError(error);

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
       URL STATE
    ====================================================== */

    function readStateFromURL() {
        const parameters =
            typeof window.GomaiUtils
                .getQueryParameters ===
                "function"

                ? window.GomaiUtils
                    .getQueryParameters()

                : Object.fromEntries(
                    new URLSearchParams(
                        window.location.search
                    ).entries()
                );

        state.brand =
            normalizeFilterValue(
                parameters.brand,
                "all"
            );

        state.category =
            normalizeFilterValue(
                parameters.category,
                "all"
            );

        state.stock =
            normalizeStockValue(
                parameters.stock
            );

        state.sort =
            normalizeSortValue(
                parameters.sort
            );

        state.query =
            normalizeText(
                parameters.q ||
                parameters.search
            );
    }

    function updateURL() {
        const parameters =
            new URLSearchParams();

        if (
            state.brand !==
            "all"
        ) {
            parameters.set(
                "brand",
                state.brand
            );
        }

        if (
            state.category !==
            "all"
        ) {
            parameters.set(
                "category",
                state.category
            );
        }

        if (
            state.stock !==
            "all"
        ) {
            parameters.set(
                "stock",
                state.stock
            );
        }

        if (
            state.sort !==
            "default"
        ) {
            parameters.set(
                "sort",
                state.sort
            );
        }

        if (state.query) {
            parameters.set(
                "q",
                state.query
            );
        }

        const query =
            parameters.toString();

        const nextURL =
            query
                ? `${window.location.pathname}?${query}`
                : window.location.pathname;

        window.history.replaceState(
            {},
            "",
            nextURL
        );
    }

    /* ======================================================
       BRAND FILTER
    ====================================================== */

    async function populateBrandFilter() {
        const filter =
            elements.brandFilter;

        if (!filter) {
            return;
        }

        const previousValue =
            state.brand;

        filter.replaceChildren();

        filter.append(
            createOption(
                "all",
                translate(
                    "productsPage.filter.allBrands",
                    "Semua Brand"
                )
            )
        );

        allBrands.forEach(
            brand => {
                const brandId =
                    normalizeIdentifier(
                        brand?.id ||
                        brand?.slug
                    );

                if (!brandId) {
                    return;
                }

                filter.append(
                    createOption(
                        brandId,

                        getBrandName(
                            brand,
                            getCurrentLanguage()
                        ) ||
                        brandId
                    )
                );
            }
        );

        state.brand =
            optionExists(
                filter,
                previousValue
            )
                ? previousValue
                : "all";

        filter.value =
            state.brand;
    }

    /* ======================================================
       CATEGORY FILTER
    ====================================================== */

    async function populateCategoryFilter() {
        const filter =
            elements.categoryFilter;

        if (!filter) {
            return;
        }

        const previousValue =
            state.category;

        const productsModel =
            getProductsModel();

        let categories =
            [];

        if (
            typeof productsModel
                .getCategories ===
            "function"
        ) {
            categories =
                await productsModel
                    .getCategories(
                        state.brand ===
                        "all"
                            ? null
                            : state.brand
                    );
        } else {
            categories =
                collectCategoriesLocally(
                    state.brand
                );
        }

        filter.replaceChildren();

        filter.append(
            createOption(
                "all",
                translate(
                    "productsPage.filter.allCategories",
                    "Semua Kategori"
                )
            )
        );

        categories.forEach(
            category => {
                const id =
                    normalizeIdentifier(
                        category
                    );

                if (!id) {
                    return;
                }

                filter.append(
                    createOption(
                        id,
                        getCategoryName(id)
                    )
                );
            }
        );

        state.category =
            optionExists(
                filter,
                previousValue
            )
                ? previousValue
                : "all";

        filter.value =
            state.category;
    }

    function collectCategoriesLocally(
        brandId
    ) {
        const normalizedBrand =
            normalizeIdentifier(
                brandId
            );

        const categories =
            new Set();

        allProducts.forEach(
            product => {
                if (
                    normalizedBrand &&
                    normalizedBrand !==
                        "all" &&

                    normalizeIdentifier(
                        product.brandId ||
                        product.brand
                    ) !==
                        normalizedBrand
                ) {
                    return;
                }

                const categoryIds =
                    Array.isArray(
                        product.categoryIds
                    )
                        ? product.categoryIds
                        : [
                            product.category
                        ];

                categoryIds
                    .map(
                        normalizeIdentifier
                    )
                    .filter(
                        Boolean
                    )
                    .forEach(
                        category => {
                            categories.add(
                                category
                            );
                        }
                    );
            }
        );

        return Array.from(
            categories
        ).sort();
    }

    /* ======================================================
       STOCK FILTER
    ====================================================== */

    function populateStockFilter() {
        const filter =
            elements.stockFilter;

        if (!filter) {
            return;
        }

        const previousValue =
            state.stock;

        filter.replaceChildren();

        filter.append(
            createOption(
                "all",
                translate(
                    "productsPage.filter.allStock",
                    "Semua Status Stok"
                )
            ),

            createOption(
                "available",
                translate(
                    "common.available",
                    "Tersedia"
                )
            ),

            createOption(
                "out-of-stock",
                translate(
                    "common.outOfStock",
                    "Stok Habis"
                )
            )
        );

        state.stock =
            optionExists(
                filter,
                previousValue
            )
                ? previousValue
                : "all";

        filter.value =
            state.stock;
    }

    /* ======================================================
       CONTROL SYNC
    ====================================================== */

    function syncControls() {
        if (
            elements.brandFilter
        ) {
            elements.brandFilter
                .value =
                state.brand;
        }

        if (
            elements.categoryFilter
        ) {
            elements.categoryFilter
                .value =
                state.category;
        }

        if (
            elements.stockFilter
        ) {
            elements.stockFilter
                .value =
                state.stock;
        }

        if (
            elements.sortControl
        ) {
            const normalizedSort =
                normalizeSortValue(
                    state.sort
                );

            state.sort =
                optionExists(
                    elements.sortControl,
                    normalizedSort
                )
                    ? normalizedSort
                    : "default";

            elements.sortControl
                .value =
                state.sort;
        }

        if (
            elements.searchInput
        ) {
            elements.searchInput
                .value =
                state.query;
        }
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

    /* ======================================================
       EVENTS
    ====================================================== */

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

        elements.brandFilter
            ?.addEventListener(
                "change",
                handleBrandChange,
                {
                    signal
                }
            );

        elements.categoryFilter
            ?.addEventListener(
                "change",
                handleCategoryChange,
                {
                    signal
                }
            );

        elements.stockFilter
            ?.addEventListener(
                "change",
                handleStockChange,
                {
                    signal
                }
            );

        elements.sortControl
            ?.addEventListener(
                "change",
                handleSortChange,
                {
                    signal
                }
            );

        elements.searchForm
            ?.addEventListener(
                "submit",
                handleSearchSubmit,
                {
                    signal
                }
            );

        if (
            elements.searchInput &&
            !elements.searchForm
        ) {
            elements.searchInput
                .addEventListener(
                    "input",
                    handleSearchInput,
                    {
                        signal
                    }
                );
        }

        elements.resetButton
            ?.addEventListener(
                "click",
                handleResetClick,
                {
                    signal
                }
            );
    }

    async function handleBrandChange(
        event
    ) {
        state.brand =
            normalizeFilterValue(
                event.target?.value,
                "all"
            );

        state.category =
            "all";

        await populateCategoryFilter();

        syncControls();

        await applyFilters();
    }

    async function handleCategoryChange(
        event
    ) {
        state.category =
            normalizeFilterValue(
                event.target?.value,
                "all"
            );

        await applyFilters();
    }

    async function handleStockChange(
        event
    ) {
        state.stock =
            normalizeStockValue(
                event.target?.value
            );

        await applyFilters();
    }

    async function handleSortChange(
        event
    ) {
        state.sort =
            normalizeSortValue(
                event.target?.value
            );

        await applyFilters();
    }

    async function handleSearchSubmit(
        event
    ) {
        event.preventDefault();

        state.query =
            normalizeText(
                elements.searchInput
                    ?.value
            );

        await applyFilters();
    }

    function handleSearchInput(
        event
    ) {
        window.clearTimeout(
            searchTimer
        );

        searchTimer =
            window.setTimeout(
                async () => {
                    state.query =
                        normalizeText(
                            event.target
                                ?.value
                        );

                    try {
                        await applyFilters();

                    } catch (error) {

                        console.error(
                            "ProductsController: pencarian gagal.",
                            error
                        );
                    }
                },
                300
            );
    }

    async function handleResetClick(
        event
    ) {
        event?.preventDefault?.();

        await resetFilters();
    }

    /* ======================================================
       FILTER / SEARCH / SORT
    ====================================================== */

    async function applyFilters(
        options = {}
    ) {
        if (
            !elements.productGrid
        ) {
            return false;
        }

        const generation =
            ++filterGeneration;

        const productsModel =
            getProductsModel();

        const language =
            getCurrentLanguage();

        const modelOptions = {
            language,

            sort:
                state.sort,

            stockOnly:
                state.stock ===
                "available"
        };

        if (
            state.brand !==
            "all"
        ) {
            modelOptions.brandId =
                state.brand;
        }

        if (
            state.category !==
            "all"
        ) {
            modelOptions.categoryId =
                state.category;
        }

        try {
            let results;

            if (
                state.query &&
                typeof productsModel
                    .search ===
                "function"
            ) {
                results =
                    await productsModel
                        .search(
                            state.query,
                            modelOptions
                        );

            } else if (
                state.brand !==
                    "all" &&
                typeof productsModel
                    .getByBrand ===
                "function"
            ) {
                results =
                    await productsModel
                        .getByBrand(
                            state.brand,
                            modelOptions
                        );

            } else if (
                state.category !==
                    "all" &&
                typeof productsModel
                    .getByCategory ===
                "function"
            ) {
                results =
                    await productsModel
                        .getByCategory(
                            state.category,
                            modelOptions
                        );

            } else {

                results =
                    await productsModel
                        .getActive();
            }

            if (
                generation !==
                filterGeneration
            ) {
                return false;
            }

            results =
                Array.isArray(results)
                    ? results
                    : [];

            /*
             * ProductsModel sudah menangani stockOnly untuk
             * stok tersedia. Out-of-stock adalah kondisi invers
             * sehingga diterapkan setelah hasil model diterima.
             */
            if (
                state.stock ===
                "out-of-stock"
            ) {
                results =
                    results.filter(
                        product =>
                            !Boolean(
                                product.stock ??
                                product.inventory
                                    ?.inStock
                            )
                    );
            }

            visibleProducts =
                productsModel.sort(
                    results,
                    state.sort,
                    language
                );

            if (
                options.updateHistory !==
                false
            ) {
                updateURL();
            }

            renderProducts();

            renderActiveFilters();

            updateDocumentMetadata();

            dispatch(
                EVENTS.FILTERED,
                {
                    state:
                        getState(),

                    total:
                        allProducts.length,

                    visible:
                        visibleProducts.length
                }
            );

            return true;

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
                        "filter",

                    error:
                        lastError
                }
            );

            throw lastError;
        }
    }

    async function resetFilters() {
        Object.assign(
            state,
            DEFAULT_STATE
        );

        await populateCategoryFilter();

        syncControls();

        return applyFilters();
    }

    async function clearSingleFilter(
        type
    ) {
        switch (type) {
            case "brand":
                state.brand =
                    "all";

                state.category =
                    "all";

                await populateCategoryFilter();

                break;

            case "category":
                state.category =
                    "all";

                break;

            case "stock":
                state.stock =
                    "all";

                break;

            case "query":
                state.query =
                    "";

                break;

            default:
                return false;
        }

        syncControls();

        await applyFilters();

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

        updateResultCount();

        const productCard =
            getProductCardComponent();

        /*
         * Bersihkan registry kartu lama sebelum render ulang.
         */
        productCard.destroy?.(
            grid
        );

        if (
            visibleProducts.length ===
            0
        ) {
            grid.replaceChildren(
                createEmptyState()
            );

            grid.hidden =
                false;

            grid.setAttribute(
                "aria-busy",
                "false"
            );

            return false;
        }

        productCard.render({
            target:
                grid,

            products:
                visibleProducts,

            clearTarget:
                true,

            brands:
                allBrands,

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

    function createEmptyState() {
        const container =
            document.createElement(
                "div"
            );

        container.className =
            "empty-state products-empty-state";

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            translate(
                "productsPage.empty.title",
                "Produk Tidak Ditemukan"
            );

        const description =
            document.createElement(
                "p"
            );

        description.textContent =
            translate(
                "productsPage.empty.description",
                "Coba ubah pencarian atau filter produk."
            );

        const resetButton =
            document.createElement(
                "button"
            );

        resetButton.type =
            "button";

        resetButton.className =
            "btn btn-outline";

        resetButton.textContent =
            translate(
                "productsPage.empty.resetButton",
                "Hapus Filter"
            );

        resetButton.addEventListener(
            "click",
            () => {
                resetFilters()
                    .catch(
                        error => {
                            console.error(
                                "ProductsController: reset filter gagal.",
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
            resetButton
        );

        return container;
    }

    function updateResultCount() {
        if (
            !elements.resultCount
        ) {
            return;
        }

        elements.resultCount
            .textContent =
            translate(
                "productsPage.resultCountTemplate",
                "Menampilkan {{visible}} dari {{total}} produk",
                {
                    visible:
                        visibleProducts
                            .length,

                    total:
                        allProducts
                            .length
                }
            );
    }

    /* ======================================================
       ACTIVE FILTERS
    ====================================================== */

    function renderActiveFilters() {
        const container =
            elements.activeFilters;

        if (!container) {
            return;
        }

        container.replaceChildren();

        const filters =
            [];

        if (
            state.brand !==
            "all"
        ) {
            filters.push({
                type:
                    "brand",

                label:
                    getBrandNameById(
                        state.brand
                    ) ||
                    state.brand
            });
        }

        if (
            state.category !==
            "all"
        ) {
            filters.push({
                type:
                    "category",

                label:
                    getCategoryName(
                        state.category
                    )
            });
        }

        if (
            state.stock !==
            "all"
        ) {
            filters.push({
                type:
                    "stock",

                label:
                    state.stock ===
                    "available"

                        ? translate(
                            "common.available",
                            "Tersedia"
                        )

                        : translate(
                            "common.outOfStock",
                            "Stok Habis"
                        )
            });
        }

        if (
            state.query
        ) {
            filters.push({
                type:
                    "query",

                label:
                    state.query
            });
        }

        if (
            filters.length ===
            0
        ) {
            container.hidden =
                true;

            return;
        }

        container.hidden =
            false;

        filters.forEach(
            filter => {
                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "active-filter-chip";

                button.textContent =
                    `${filter.label} ×`;

                button.addEventListener(
                    "click",
                    () => {
                        clearSingleFilter(
                            filter.type
                        )
                            .catch(
                                error => {
                                    console.error(
                                        "ProductsController: gagal menghapus filter.",
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

        getProductCardComponent()
            ?.destroy?.(
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
            typeof loading.renderState ===
                "function"
        ) {
            loading.renderState(
                grid,
                {
                    label:
                        translate(
                            "productsPage.loading",
                            "Memuat produk..."
                        )
                }
            );

            return;
        }

        const fallback =
            document.createElement(
                "div"
            );

        fallback.className =
            "empty-state loading-state";

        const text =
            document.createElement(
                "p"
            );

        text.textContent =
            translate(
                "productsPage.loading",
                "Memuat produk..."
            );

        fallback.append(
            text
        );

        grid.replaceChildren(
            fallback
        );
    }

    function showLoadError() {
        const grid =
            elements.productGrid;

        if (!grid) {
            return;
        }

        getProductCardComponent()
            ?.destroy?.(
                grid
            );

        getLoadingComponent()
            ?.clear?.(
                grid
            );

        grid.setAttribute(
            "aria-busy",
            "false"
        );

        const container =
            document.createElement(
                "div"
            );

        container.className =
            "empty-state products-error-state";

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            translate(
                "productsPage.error.title",
                "Data Produk Gagal Dimuat"
            );

        const description =
            document.createElement(
                "p"
            );

        description.textContent =
            translate(
                "productsPage.error.description",
                "Terjadi kesalahan. Silakan muat ulang halaman."
            );

        container.append(
            title,
            description
        );

        grid.replaceChildren(
            container
        );
    }

    /* ======================================================
       LANGUAGE
    ====================================================== */

    async function refreshLanguage(
        context = {}
    ) {
        if (
            !initialized ||
            !elements.productGrid
        ) {
            return false;
        }

        try {
            await populateBrandFilter();

            await populateCategoryFilter();

            populateStockFilter();

            syncControls();

            await applyFilters({
                updateHistory:
                    false
            });

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

            return false;
        }
    }

    /* ======================================================
       SEO
    ====================================================== */

    function updateDocumentMetadata() {
        document.title =
            translate(
                "productsPage.meta.title",
                "Semua Produk | Gomai"
            );

        elements.pageDescription
            ?.setAttribute(
                "content",
                translate(
                    "productsPage.meta.description",
                    "Jelajahi berbagai produk olahraga, outdoor, dan kebutuhan harian melalui Gomai."
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

        window.clearTimeout(
            searchTimer
        );

        searchTimer =
            null;

        eventController
            ?.abort();

        eventController =
            null;

        /*
         * Membatalkan hasil filter async lama.
         */
        filterGeneration +=
            1;

        if (
            elements.productGrid
        ) {
            getProductCardComponent()
                ?.destroy?.(
                    elements.productGrid
                );
        }

        allProducts =
            [];

        allBrands =
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
       BRAND NAME
    ====================================================== */

    function getBrandNameById(
        brandId
    ) {
        const id =
            normalizeIdentifier(
                brandId
            );

        const brand =
            allBrands.find(
                item =>
                    normalizeIdentifier(
                        item?.id ||
                        item?.slug
                    ) ===
                    id
            );

        return brand
            ? getBrandName(
                brand,
                getCurrentLanguage()
            )
            : "";
    }

    function getBrandName(
        brand,
        language
    ) {
        if (!brand) {
            return "";
        }

        if (
            typeof brand.name ===
            "string"
        ) {
            return normalizeText(
                brand.name
            );
        }

        return normalizeText(
            brand.name?.[language] ||
            brand.name?.zh ||
            brand.name?.id ||
            brand.title ||
            brand.id
        );
    }

    /* ======================================================
       CATEGORY NAME
    ====================================================== */

    function getCategoryName(
        category
    ) {
        const id =
            normalizeIdentifier(
                category
            );

        const fallback =
            id
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
            `categories.${id}.name`,
            fallback
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

            "zh"
        );
    }

    function normalizeLanguage(
        value
    ) {
        const language =
            normalizeText(value)
                .toLowerCase()
                .replace(
                    "_",
                    "-"
                )
                .split("-")[0];

        return language ===
            "id"
                ? "id"
                : "zh";
    }

    /* ======================================================
       TRANSLATION
    ====================================================== */

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
                    `ProductsController: terjemahan "${key}" gagal.`,
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
                        value ?? ""
                    )
                ),

            String(
                text || ""
            )
        );
    }

    /* ======================================================
       NORMALIZATION
    ====================================================== */

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

    function normalizeStockValue(
        value
    ) {
        const normalized =
            normalizeFilterValue(
                value,
                "all"
            );

        return SUPPORTED_STOCK
            .includes(
                normalized
            )
                ? normalized
                : "all";
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

    function normalizeText(
        value
    ) {
        return String(
            value ?? ""
        ).trim();
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

        return JSON.parse(
            JSON.stringify(
                value
            )
        );
    }

    /* ======================================================
       ERROR
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
                    "Terjadi kesalahan pada ProductsController."
                )
            );
    }

    /* ======================================================
       EVENTS
    ====================================================== */

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

                        ...detail
                    }
                }
            )
        );
    }

    /* ======================================================
       STATE API
    ====================================================== */

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

    function createResult() {
        return Object.freeze({
            version:
                VERSION,

            initialized,

            totalProducts:
                allProducts.length,

            visibleProducts:
                visibleProducts.length,

            state:
                getState()
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
            applyFilters,
            resetFilters,

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
window.ProductsController =
    ProductsController;

/*
 * Alias compatibility sementara.
 * Gomai Core hasil audit masih mengizinkan
 * ProductsController || ProductsPage.
 */
window.ProductsPage =
    ProductsController;