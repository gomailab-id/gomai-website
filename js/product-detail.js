"use strict";

/**
 * ==========================================================
 * GOMAI PRODUCT DETAIL CONTROLLER
 * Version 3.2.0
 * js/product-detail.js
 * ==========================================================
 *
 * Tanggung jawab:
 * - Membaca produk dari URL.
 * - Mengambil data melalui ProductsModel dan BrandsModel.
 * - Mengelola state warna, gambar, ukuran, dan jumlah.
 * - Merender detail produk yang dibutuhkan untuk keputusan pembelian.
 * - Mengikuti lifecycle ControllerRegistry.
 * - Memperbarui konten dinamis ketika bahasa berubah.
 * - Mengelola Wishlist dan Tambah ke Keranjang.
 *
 * Controller ini tidak membaca JSON langsung, tidak membuat
 * product-card sendiri, tidak melakukan bootstrap DOMContentLoaded,
 * dan tidak memasang listener bahasa global sendiri.
 * ==========================================================
 */

const ProductDetailController = (() => {
    const VERSION = "3.2.0";
    const RELATED_LIMIT = 4;

    const EVENTS = Object.freeze({
        INITIALIZED:
            "gomai:product-detail-controller-initialized",

        SELECTION_CHANGED:
            "gomai:product-detail-selection-changed",

        LANGUAGE_REFRESHED:
            "gomai:product-detail-language-refreshed",

        DATA_RELOADED:
            "gomai:product-detail-data-reloaded",

        NOT_FOUND:
            "gomai:product-detail-not-found",

        DESTROYED:
            "gomai:product-detail-controller-destroyed",

        ERROR:
            "gomai:product-detail-controller-error"
    });

    const DEFAULT_STATE = Object.freeze({
        selectedColorIndex: 0,
        selectedImageIndex: 0,
        selectedSize: "",
        quantity: 1
    });

    let initialized = false;
    let initializing = false;
    let initializationPromise = null;

    let lifecycleContext = null;
    let eventController = null;

    let requestedProductId = "";

    let currentProduct = null;
    let currentBrand = null;

    let allBrands = [];
    let relatedProducts = [];

    let lastError = null;
    let viewState = "idle";

    const state = {
        ...DEFAULT_STATE
    };

    const elements = {
        pageRoot: null,
        detailContainer: null,

        breadcrumbProductName: null,

        gallery: null,
        thumbnailList: null,
        mainImageContainer: null,
        mainImage: null,

        productInfo: null,

        brandName: null,
        brandLink: null,

        productName: null,
        productPrice: null,
        stockBadge: null,

        colorGroup: null,
        colorOptions: null,
        selectedColorName: null,

        sizeGroup: null,
        sizeOptions: null,

        quantityGroup: null,
        quantityInput: null,
        quantityDecrease: null,
        quantityIncrease: null,

        orderButton: null,
        addCartButton: null,
        wishlistButton: null,
        contactButton: null,

        informationSection: null,

        descriptionSection: null,
        descriptionTitle: null,
        descriptionText: null,

        specificationSection: null,
        specificationTitle: null,
        specificationList: null,

        relatedSection: null,
        relatedTitle: null,
        relatedGrid: null,

        notFound: null,
        notFoundTitle: null,
        notFoundDescription: null,
        notFoundButton: null,

        pageDescription: null
    };


    /* ======================================================
       INIT
    ====================================================== */

    async function init(
        context = {}
    ) {
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

            requestedProductId =
                getRequestedProductId();

            if (!requestedProductId) {
                initialized =
                    true;

                showProductNotFound();

                return createResult({
                    notFound:
                        true
                });
            }

            showLoadingState();

            await loadPageData(
                requestedProductId
            );

            if (!currentProduct) {
                initialized =
                    true;

                showProductNotFound();

                return createResult({
                    notFound:
                        true
                });
            }

            initializeSelectionState();

            renderPage();

            initialized =
                true;

            dispatch(
                EVENTS.INITIALIZED,
                {
                    product:
                        getCurrentProduct(),

                    brand:
                        getCurrentBrand(),

                    relatedCount:
                        relatedProducts.length,

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
                "ProductDetailController gagal diinisialisasi:",
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
                "ProductDetailController membutuhkan GomaiUtils."
            );
        }

        if (
            !window.Language ||
            typeof window.Language
                .translate !==
                "function"
        ) {
            throw new Error(
                "ProductDetailController membutuhkan Language."
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
            (
                typeof productsModel
                    .find !==
                    "function" &&
                typeof productsModel
                    .getById !==
                    "function"
            ) ||
            typeof productsModel
                .getRelated !==
                "function"
        ) {
            throw new Error(
                "ProductDetailController membutuhkan ProductsModel final."
            );
        }

        if (
            !brandsModel ||
            (
                typeof brandsModel
                    .find !==
                    "function" &&
                typeof brandsModel
                    .getById !==
                    "function"
            ) ||
            typeof brandsModel
                .getActive !==
                "function"
        ) {
            throw new Error(
                "ProductDetailController membutuhkan BrandsModel final."
            );
        }

        if (
            !productCard ||
            typeof productCard
                .render !==
                "function"
        ) {
            throw new Error(
                "ProductDetailController membutuhkan ProductCardComponent.render()."
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
            findElement(
                "product-detail-page",
                "product-page"
            );

        elements.detailContainer =
            findElement(
                "product-detail",
                "product-detail-container"
            );

        elements.breadcrumbProductName =
            findElement(
                "breadcrumb-product-name"
            );

        elements.gallery =
            findElement(
                "product-gallery"
            );

        elements.thumbnailList =
            findElement(
                "product-thumbnail-list",
                "thumbnail-list"
            );

        elements.mainImageContainer =
            findElement(
                "product-main-image",
                "product-main-image-container"
            );

        elements.mainImage =
            findElement(
                "main-product-image"
            );

        elements.productInfo =
            findElement(
                "product-info"
            );

        elements.brandName =
            findElement(
                "product-brand-name"
            );

        elements.brandLink =
            findElement(
                "product-brand-link"
            );

        elements.productName =
            findElement(
                "product-name"
            );

        elements.productPrice =
            findElement(
                "product-price"
            );

        elements.stockBadge =
            findElement(
                "product-stock"
            );

        elements.colorGroup =
            findElement(
                "product-color-group"
            );

        elements.colorOptions =
            findElement(
                "product-color-options"
            );

        elements.selectedColorName =
            findElement(
                "selected-color-name"
            );

        elements.sizeGroup =
            findElement(
                "product-size-group"
            );

        elements.sizeOptions =
            findElement(
                "product-size-options"
            );

        elements.quantityGroup =
            findElement(
                "product-quantity-group"
            );

        elements.quantityInput =
            findElement(
                "product-quantity"
            );

        elements.quantityDecrease =
            findElement(
                "quantity-decrease"
            );

        elements.quantityIncrease =
            findElement(
                "quantity-increase"
            );

        elements.orderButton =
            findElement(
                "wechat-order-button",
                "product-order-button"
            );

        elements.addCartButton =
            findElement(
                "add-to-cart-button"
            );

        elements.wishlistButton =
            findElement(
                "wishlist-toggle-button"
            );

        elements.contactButton =
            findElement(
                "product-contact-button"
            );

        elements.informationSection =
            findElement(
                "product-information-section"
            );

        elements.descriptionSection =
            findElement(
                "product-description"
            );

        elements.descriptionTitle =
            findElement(
                "product-description-title"
            );

        elements.descriptionText =
            findElement(
                "product-description-text"
            );

        elements.specificationSection =
            findElement(
                "product-specification"
            );

        elements.specificationTitle =
            findElement(
                "product-specification-title"
            );

        elements.specificationList =
            findElement(
                "product-specification-list"
            );

        elements.relatedSection =
            findElement(
                "related-products",
                "product-related-section"
            );

        elements.relatedTitle =
            findElement(
                "related-products-title"
            );

        elements.relatedGrid =
            findElement(
                "related-products-grid"
            );

        elements.notFound =
            findElement(
                "product-not-found"
            );

        elements.notFoundTitle =
            findElement(
                "product-not-found-title"
            );

        elements.notFoundDescription =
            findElement(
                "product-not-found-description"
            );

        elements.notFoundButton =
            findElement(
                "product-not-found-button"
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
                document.getElementById(
                    id
                );

            if (element) {
                return element;
            }
        }

        return null;
    }


    function validatePageMarkup() {
        if (!elements.detailContainer) {
            throw new Error(
                'ProductDetailController: elemen "#product-detail" tidak ditemukan.'
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


    function hasStructuredDetail() {
        return Boolean(
            elements.mainImageContainer &&
            elements.productName &&
            elements.productInfo
        );
    }


    /* ======================================================
       URL
    ====================================================== */

    function getRequestedProductId() {
        const queryKey =
            window.GomaiConfig
                ?.query
                ?.productId ||
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
        productId
    ) {
        const productsModel =
            getProductsModel();

        const brandsModel =
            getBrandsModel();

        currentProduct =
            typeof productsModel
                .find ===
                "function"

                ? await productsModel
                    .find(
                        productId
                    )

                : await productsModel
                    .getById(
                        productId
                    );

        if (!currentProduct) {
            currentBrand =
                null;

            allBrands =
                [];

            relatedProducts =
                [];

            return;
        }

        const brandId =
            normalizeIdentifier(
                currentProduct.brandId ||
                currentProduct.brand
            );

        const [
            brand,
            brands,
            related
        ] =
            await Promise.all([
                brandId
                    ? (
                        typeof brandsModel
                            .find ===
                            "function"

                            ? brandsModel
                                .find(
                                    brandId
                                )

                            : brandsModel
                                .getById(
                                    brandId
                                )
                    )
                    : Promise.resolve(
                        null
                    ),

                brandsModel
                    .getActive(),

                productsModel
                    .getRelated(
                        currentProduct.id,
                        RELATED_LIMIT
                    )
            ]);

        currentBrand =
            brand ||
            null;

        allBrands =
            Array.isArray(
                brands
            )
                ? brands
                : [];

        relatedProducts =
            Array.isArray(
                related
            )
                ? related
                : [];
    }


    async function reloadData(
        options = {}
    ) {
        lastError =
            null;

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
                    productsModel
                        .reload?.(),

                    brandsModel
                        .reload?.()
                ]);
            }

            requestedProductId =
                options.productId

                    ? normalizeIdentifier(
                        options.productId
                    )

                    : (
                        requestedProductId ||
                        getRequestedProductId()
                    );

            if (!requestedProductId) {
                currentProduct =
                    null;

                currentBrand =
                    null;

                relatedProducts =
                    [];

                showProductNotFound();

                return createResult({
                    notFound:
                        true
                });
            }

            showLoadingState();

            await loadPageData(
                requestedProductId
            );

            if (!currentProduct) {
                showProductNotFound();

                return createResult({
                    notFound:
                        true
                });
            }

            initializeSelectionState();

            renderPage();

            dispatch(
                EVENTS.DATA_RELOADED,
                {
                    product:
                        getCurrentProduct(),

                    brand:
                        getCurrentBrand(),

                    relatedCount:
                        relatedProducts.length
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
       SELECTION STATE
    ====================================================== */

    function initializeSelectionState() {
        Object.assign(
            state,
            DEFAULT_STATE
        );

        const colors =
            getColors();

        const hasAvailability =
            hasColorAvailabilitySignal(
                colors
            );

        if (hasAvailability) {
            const availableIndex =
                colors.findIndex(
                    color =>
                        isColorAvailable(
                            color
                        )
                );

            state.selectedColorIndex =
                availableIndex >=
                0
                    ? availableIndex
                    : 0;
        }

        syncSelectedSizeToCurrentVariant();
    }


    function syncSelectedSizeToCurrentVariant() {
        const sizeOptions =
            getSelectableSizes();

        if (
            sizeOptions.length ===
            0
        ) {
            state.selectedSize =
                "";

            return;
        }

        const current =
            sizeOptions.find(
                item =>
                    item.id ===
                        state.selectedSize &&
                    !item.disabled
            );

        if (current) {
            return;
        }

        const firstAvailable =
            sizeOptions.find(
                item =>
                    !item.disabled
            ) ||
            sizeOptions[0];

        state.selectedSize =
            firstAvailable
                ?.id ||
            "";
    }


    function getColors() {
        return Array.isArray(
            currentProduct
                ?.colors
        )
            ? currentProduct.colors
            : [];
    }


    function getSelectedColor() {
        const colors =
            getColors();

        return (
            colors[
                state.selectedColorIndex
            ] ||
            colors[0] ||
            null
        );
    }


    function hasColorAvailabilitySignal(
        colors =
            getColors()
    ) {
        return colors.some(
            color => {
                const quantity =
                    Number(
                        color?.quantity
                    ) ||
                    0;

                const sizes =
                    Array.isArray(
                        color?.sizes
                    )
                        ? color.sizes
                        : [];

                return (
                    color?.inStock ===
                        true ||

                    quantity >
                        0 ||

                    sizes.some(
                        size =>
                            size?.inStock ===
                                true ||

                            (
                                Number(
                                    size
                                        ?.quantity
                                ) ||
                                0
                            ) >
                                0
                    )
                );
            }
        );
    }


    function isColorAvailable(
        color
    ) {
        if (!color) {
            return false;
        }

        if (
            !hasColorAvailabilitySignal()
        ) {
            return true;
        }

        const quantity =
            Number(
                color.quantity
            ) ||
            0;

        const sizes =
            Array.isArray(
                color.sizes
            )
                ? color.sizes
                : [];

        return Boolean(
            color.inStock ===
                true ||

            quantity >
                0 ||

            sizes.some(
                size =>
                    size?.inStock ===
                        true ||

                    (
                        Number(
                            size
                                ?.quantity
                        ) ||
                        0
                    ) >
                        0
            )
        );
    }


    function getSelectableSizes() {
        const selectedColor =
            getSelectedColor();

        const variantSizes =
            Array.isArray(
                selectedColor
                    ?.sizes
            )
                ? selectedColor.sizes
                : [];

        if (
            variantSizes.length >
            0
        ) {
            const hasAvailability =
                variantSizes.some(
                    size =>
                        size?.inStock ===
                            true ||

                        (
                            Number(
                                size
                                    ?.quantity
                            ) ||
                            0
                        ) >
                            0
                );

            return variantSizes
                .map(
                    size => {
                        const id =
                            normalizeText(
                                typeof size ===
                                    "object"

                                    ? (
                                        size.id ||
                                        size.name ||
                                        size.size
                                    )

                                    : size
                            );

                        const quantity =
                            Number(
                                size
                                    ?.quantity
                            ) ||
                            0;

                        const available =
                            Boolean(
                                size
                                    ?.inStock ===
                                    true ||

                                quantity >
                                    0
                            );

                        return {
                            id,

                            disabled:
                                hasAvailability
                                    ? !available
                                    : false
                        };
                    }
                )
                .filter(
                    item =>
                        Boolean(
                            item.id
                        )
                );
        }

        const globalSizes =
            Array.isArray(
                currentProduct
                    ?.sizes
            )
                ? currentProduct.sizes
                : [];

        return globalSizes
            .map(
                size => ({
                    id:
                        normalizeText(
                            typeof size ===
                                "object"

                                ? (
                                    size.id ||
                                    size.name ||
                                    size.size
                                )

                                : size
                        ),

                    disabled:
                        false
                })
            )
            .filter(
                item =>
                    Boolean(
                        item.id
                    )
            );
    }


    /* ======================================================
       PAGE RENDER
    ====================================================== */

    function renderPage() {
        clearInlineState();

        ensureDynamicStructure();

        cacheElements();

        renderBreadcrumb();

        renderProductInformation();

        renderGallery();

        renderColorOptions();

        renderSizeOptions();

        renderQuantity();

        renderDescription();

        renderSpecifications();

        updateInformationSectionVisibility();

        renderGeneratedControlTranslations();

        updateOrderButton();

        updateDocumentMetadata();

        showProductContent();
    }


    /* ======================================================
       DYNAMIC STRUCTURE COMPATIBILITY
    ====================================================== */

    function ensureDynamicStructure() {
        if (
            !elements.detailContainer ||
            hasStructuredDetail()
        ) {
            return;
        }

        elements.detailContainer
            .replaceChildren();

        const gallery =
            document.createElement(
                "div"
            );

        gallery.id =
            "product-gallery";

        gallery.className =
            "product-gallery";

        const thumbnailList =
            document.createElement(
                "div"
            );

        thumbnailList.id =
            "product-thumbnail-list";

        thumbnailList.className =
            "thumbnail-list";

        const mainImageContainer =
            document.createElement(
                "div"
            );

        mainImageContainer.id =
            "product-main-image";

        mainImageContainer.className =
            "product-main-image";

        gallery.append(
            thumbnailList,
            mainImageContainer
        );

        const info =
            document.createElement(
                "div"
            );

        info.id =
            "product-info";

        info.className =
            "product-info";

        const brandLink =
            document.createElement(
                "a"
            );

        brandLink.id =
            "product-brand-link";

        brandLink.className =
            "product-brand";

        const name =
            document.createElement(
                "h1"
            );

        name.id =
            "product-name";

        const price =
            document.createElement(
                "p"
            );

        price.id =
            "product-price";

        price.className =
            "product-price";

        const stock =
            document.createElement(
                "span"
            );

        stock.id =
            "product-stock";

        stock.className =
            "badge";

        const colorGroup =
            createOptionGroup(
                "product-color-group",
                "productDetail.colorLabel",
                "Pilih Warna",
                "product-color-options"
            );

        const selectedColorName =
            document.createElement(
                "p"
            );

        selectedColorName.id =
            "selected-color-name";

        colorGroup.append(
            selectedColorName
        );

        const sizeGroup =
            createOptionGroup(
                "product-size-group",
                "productDetail.sizeLabel",
                "Pilih Ukuran",
                "product-size-options"
            );

        const quantityGroup =
            createQuantityGroup();

        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            "product-actions";

        const addCartButton =
            document.createElement(
                "button"
            );

        addCartButton.id =
            "add-to-cart-button";

        addCartButton.type =
            "button";

        addCartButton.className =
            "btn btn-primary";

        const wishlistButton =
            document.createElement(
                "button"
            );

        wishlistButton.id =
            "wishlist-toggle-button";

        wishlistButton.type =
            "button";

        wishlistButton.className =
            "btn btn-secondary";

        actions.append(
            wishlistButton,
            addCartButton
        );

        info.append(
            brandLink,
            name,
            price,
            stock,
            colorGroup,
            sizeGroup,
            quantityGroup,
            actions
        );

        elements.detailContainer
            .append(
                gallery,
                info
            );
    }


    function createOptionGroup(
        groupId,
        translationKey,
        fallback,
        optionsId
    ) {
        const group =
            document.createElement(
                "div"
            );

        group.id =
            groupId;

        group.className =
            "option-group";

        const title =
            document.createElement(
                "p"
            );

        title.className =
            "option-title";

        title.dataset.translationKey =
            translationKey;

        title.dataset.translationFallback =
            fallback;

        title.textContent =
            translate(
                translationKey,
                fallback
            );

        const options =
            document.createElement(
                "div"
            );

        options.id =
            optionsId;

        options.className =
            "option-list";

        group.append(
            title,
            options
        );

        return group;
    }


    function createQuantityGroup() {
        const group =
            document.createElement(
                "div"
            );

        group.id =
            "product-quantity-group";

        group.className =
            "option-group product-quantity-group";

        const title =
            document.createElement(
                "p"
            );

        title.className =
            "option-title";

        title.dataset.translationKey =
            "productDetail.quantityLabel";

        title.dataset.translationFallback =
            "Jumlah";

        title.textContent =
            translate(
                "productDetail.quantityLabel",
                "Jumlah"
            );

        const control =
            document.createElement(
                "div"
            );

        control.className =
            "quantity-control";

        const decrease =
            document.createElement(
                "button"
            );

        decrease.id =
            "quantity-decrease";

        decrease.type =
            "button";

        decrease.className =
            "quantity-button";

        decrease.textContent =
            "−";

        const input =
            document.createElement(
                "input"
            );

        input.id =
            "product-quantity";

        input.type =
            "number";

        input.min =
            "1";

        input.value =
            "1";

        input.inputMode =
            "numeric";

        const increase =
            document.createElement(
                "button"
            );

        increase.id =
            "quantity-increase";

        increase.type =
            "button";

        increase.className =
            "quantity-button";

        increase.textContent =
            "+";

        control.append(
            decrease,
            input,
            increase
        );

        group.append(
            title,
            control
        );

        return group;
    }


    /* ======================================================
       PRODUCT INFORMATION
    ====================================================== */

    function renderBreadcrumb() {
        setElementText(
            elements.breadcrumbProductName,
            getProductName()
        );
    }


    function renderProductInformation() {
        const productName =
            getProductName();

        const brandName =
            getBrandName();

        setElementText(
            elements.productName,
            productName
        );

        setElementText(
            elements.productPrice,
            window.GomaiUtils
                .formatCurrency(
                    currentProduct.price
                )
        );

        renderOfficialSource();

        if (
            elements.brandLink
        ) {
            elements.brandLink
                .textContent =
                brandName;

            if (
                currentBrand?.id
            ) {
                elements.brandLink
                    .href =
                    buildRoute(
                        "brand",
                        {
                            id:
                                currentBrand.id
                        }
                    );
            } else {
                elements.brandLink
                    .removeAttribute(
                        "href"
                    );
            }
        }

        setElementText(
            elements.brandName,
            brandName
        );

        renderStockBadge();
    }


    function renderOfficialSource() {
        if (!elements.productInfo) {
            return;
        }

        elements.productInfo
            .querySelector(
                ".product-official-source"
            )
            ?.remove();

        const source =
            currentProduct?.source;

        if (!source?.url) {
            return;
        }

        const link =
            document.createElement(
                "a"
            );

        link.className =
            "product-official-source";

        link.href =
            source.url;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";

        link.textContent =
            `${translate(
                "product.officialSource",
                "Lihat sumber resmi"
            )} ↗`;

        elements.productPrice
            ?.insertAdjacentElement(
                "afterend",
                link
            );
    }


    function renderStockBadge() {
        const badge =
            elements.stockBadge;

        if (!badge) {
            return;
        }

        const hasStock =
            Boolean(
                currentProduct
                    ?.inventory
                    ?.inStock ??
                currentProduct
                    ?.stock
            );

        badge.className =
            hasStock
                ? "badge badge-success"
                : "badge badge-danger";

        badge.textContent =
            hasStock
                ? translate(
                    "common.available",
                    "Tersedia"
                )
                : translate(
                    "common.outOfStock",
                    "Stok Habis"
                );
    }


    /* ======================================================
       GALLERY
    ====================================================== */

    function renderGallery() {
        const images =
            getSelectedImages();

        if (
            state.selectedImageIndex >=
            images.length
        ) {
            state.selectedImageIndex =
                0;
        }

        renderThumbnails(
            images
        );

        renderMainImage(
            images
        );
    }


    function getSelectedImages() {
        const color =
            getSelectedColor();

        if (
            color &&
            Array.isArray(
                color.images
            )
        ) {
            return color.images
                .filter(
                    Boolean
                );
        }

        return Array.isArray(
            currentProduct
                ?.images
        )
            ? currentProduct.images
                .filter(
                    Boolean
                )
            : [];
    }


    function renderThumbnails(
        images
    ) {
        const list =
            elements.thumbnailList;

        if (!list) {
            return;
        }

        list.replaceChildren();

        if (
            images.length <=
            1
        ) {
            list.hidden =
                true;

            return;
        }

        list.hidden =
            false;

        const productName =
            getProductName();

        images.forEach(
            (
                imagePath,
                index
            ) => {
                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    index ===
                    state.selectedImageIndex

                        ? "thumbnail active"
                        : "thumbnail";

                button.dataset.imageIndex =
                    String(
                        index
                    );

                button.setAttribute(
                    "aria-pressed",
                    String(
                        index ===
                        state.selectedImageIndex
                    )
                );

                button.setAttribute(
                    "aria-label",
                    translate(
                        "productDetail.viewImageTemplate",
                        "Lihat gambar {{number}} produk {{product}}",
                        {
                            number:
                                index +
                                1,

                            product:
                                productName
                        }
                    )
                );

                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    resolveAssetPath(
                        imagePath
                    );

                image.alt =
                    translate(
                        "productDetail.imageAltTemplate",
                        "Foto produk {{product}}",
                        {
                            product:
                                productName
                        }
                    );

                image.loading =
                    "lazy";

                image.decoding =
                    "async";

                image.addEventListener(
                    "error",
                    () => {
                        button.remove();
                    },
                    {
                        once:
                            true
                    }
                );

                button.append(
                    image
                );

                list.append(
                    button
                );
            }
        );
    }


    function renderMainImage(
        images
    ) {
        const container =
            elements.mainImageContainer;

        if (!container) {
            return;
        }

        container.replaceChildren();

        if (
            images.length ===
            0
        ) {
            container.append(
                createImagePlaceholder()
            );

            elements.mainImage =
                null;

            return;
        }

        const selectedPath =
            images[
                state.selectedImageIndex
            ];

        const image =
            document.createElement(
                "img"
            );

        image.id =
            "main-product-image";

        image.src =
            resolveAssetPath(
                selectedPath
            );

        image.alt =
            translate(
                "productDetail.imageAltTemplate",
                "Foto produk {{product}}",
                {
                    product:
                        getProductName()
                }
            );

        image.decoding =
            "async";

        image.addEventListener(
            "error",
            () => {
                container.replaceChildren(
                    createImagePlaceholder()
                );

                elements.mainImage =
                    null;
            },
            {
                once:
                    true
            }
        );

        container.append(
            image
        );

        elements.mainImage =
            image;
    }


    function createImagePlaceholder() {
        const placeholder =
            document.createElement(
                "div"
            );

        placeholder.className =
            "empty-state product-image-placeholder";

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

        return placeholder;
    }


    /* ======================================================
       COLORS
    ====================================================== */

    function renderColorOptions() {
        const container =
            elements.colorOptions;

        if (!container) {
            return;
        }

        container.replaceChildren();

        const colors =
            getColors();

        if (
            elements.colorGroup
        ) {
            elements.colorGroup
                .hidden =
                colors.length ===
                0;
        }

        const hasAvailability =
            hasColorAvailabilitySignal(
                colors
            );

        colors.forEach(
            (
                color,
                index
            ) => {
                const button =
                    document.createElement(
                        "button"
                    );

                const isActive =
                    index ===
                    state.selectedColorIndex;

                const disabled =
                    hasAvailability &&
                    !isColorAvailable(
                        color
                    );

                button.type =
                    "button";

                button.className =
                    isActive
                        ? "option-btn color-option active"
                        : "option-btn color-option";

                button.dataset.colorIndex =
                    String(
                        index
                    );

                button.disabled =
                    disabled;

                button.setAttribute(
                    "aria-pressed",
                    String(
                        isActive
                    )
                );

                button.textContent =
                    getColorName(
                        color
                    );

                if (
                    color?.hex
                ) {
                    button.style
                        .setProperty(
                            "--product-color",
                            String(
                                color.hex
                            )
                        );
                }

                container.append(
                    button
                );
            }
        );

        updateSelectedColorName();
    }


    function updateSelectedColorName() {
        const color =
            getSelectedColor();

        setElementText(
            elements.selectedColorName,
            color
                ? getColorName(
                    color
                )
                : ""
        );
    }


    /* ======================================================
       SIZES
    ====================================================== */

    function renderSizeOptions() {
        const container =
            elements.sizeOptions;

        if (!container) {
            return;
        }

        container.replaceChildren();

        const sizes =
            getSelectableSizes();

        if (
            elements.sizeGroup
        ) {
            elements.sizeGroup
                .hidden =
                sizes.length ===
                0;
        }

        syncSelectedSizeToCurrentVariant();

        sizes.forEach(
            size => {
                const button =
                    document.createElement(
                        "button"
                    );

                const isActive =
                    size.id ===
                    state.selectedSize;

                button.type =
                    "button";

                button.className =
                    isActive
                        ? "option-btn size-option active"
                        : "option-btn size-option";

                button.dataset.size =
                    size.id;

                button.disabled =
                    Boolean(
                        size.disabled
                    );

                button.setAttribute(
                    "aria-pressed",
                    String(
                        isActive
                    )
                );

                button.textContent =
                    size.id;

                container.append(
                    button
                );
            }
        );
    }


    /* ======================================================
       QUANTITY
    ====================================================== */

    function renderQuantity() {
        if (
            elements.quantityInput
        ) {
            elements.quantityInput
                .value =
                String(
                    state.quantity
                );
        }
    }


    function setQuantity(
        quantity
    ) {
        const normalized =
            Math.max(
                1,
                Math.floor(
                    Number(
                        quantity
                    ) ||
                    1
                )
            );

        state.quantity =
            normalized;

        renderQuantity();

        updateOrderButton();

        emitSelectionChanged(
            "quantity"
        );
    }


    /* ======================================================
       DESCRIPTION
    ====================================================== */

    function renderDescription() {
        const description =
            getLocalizedText(
                currentProduct
                    ?.description,

                getCurrentLanguage()
            );

        setElementText(
            elements.descriptionTitle,
            translate(
                "productDetail.descriptionTitle",
                "Deskripsi Produk"
            )
        );

        setElementText(
            elements.descriptionText,
            description
        );

        if (
            elements.descriptionSection
        ) {
            elements.descriptionSection
                .hidden =
                !description;

            elements.descriptionSection
                .classList
                .toggle(
                    "hidden",
                    !description
                );
        }
    }


    /* ======================================================
       SPECIFICATIONS
    ====================================================== */

    function renderSpecifications() {
        const list =
            elements.specificationList;

        if (!list) {
            return;
        }

        setElementText(
            elements.specificationTitle,
            translate(
                "productDetail.specificationTitle",
                "Spesifikasi"
            )
        );

        list.replaceChildren();

        const specifications =
            buildSpecifications();

        if (
            elements.specificationSection
        ) {
            elements.specificationSection
                .hidden =
                specifications.length ===
                0;
        }

        specifications.forEach(
            specification => {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "product-specification-item";

                const term =
                    document.createElement(
                        "dt"
                    );

                term.textContent =
                    specification.label;

                const description =
                    document.createElement(
                        "dd"
                    );

                description.textContent =
                    specification.value;

                item.append(
                    term,
                    description
                );

                list.append(
                    item
                );
            }
        );
    }


    function buildSpecifications() {
        const language =
            getCurrentLanguage();

        const result =
            [];

        const usedKeys =
            new Set();

        const add =
            (
                key,
                label,
                value
            ) => {
                const normalizedKey =
                    normalizeIdentifier(
                        key ||
                        label
                    );

                const normalizedValue =
                    normalizeText(
                        value
                    );

                if (
                    !normalizedValue ||
                    usedKeys.has(
                        normalizedKey
                    )
                ) {
                    return;
                }

                usedKeys.add(
                    normalizedKey
                );

                result.push({
                    label,
                    value:
                        normalizedValue
                });
            };

        add(
            "brand",

            translate(
                "product.brand",
                "Brand"
            ),

            getBrandName()
        );

        add(
            "category",

            translate(
                "product.category",
                "Kategori"
            ),

            getCategoryNames()
                .join(
                    ", "
                )
        );

        add(
            "stock",

            translate(
                "product.stock",
                "Stok"
            ),

            Boolean(
                currentProduct
                    ?.inventory
                    ?.inStock ??
                currentProduct
                    ?.stock
            )
                ? translate(
                    "common.available",
                    "Tersedia"
                )
                : translate(
                    "common.outOfStock",
                    "Stok Habis"
                )
        );

        const custom =
            Array.isArray(
                currentProduct
                    ?.specifications
            )
                ? currentProduct
                    .specifications
                : [];

        custom.forEach(
            specification => {
                const label =
                    getLocalizedText(
                        specification
                            ?.label,

                        language
                    );

                const value =
                    getLocalizedText(
                        specification
                            ?.value,

                        language
                    );

                add(
                    specification
                        ?.key ||
                    label,

                    label,

                    value
                );
            }
        );

        return result;
    }


    function updateInformationSectionVisibility() {
        if (
            !elements.informationSection
        ) {
            return false;
        }

        const hasDescription =
            Boolean(
                elements.descriptionSection &&
                !elements.descriptionSection.hidden
            );

        const hasSpecifications =
            Boolean(
                elements.specificationSection &&
                !elements.specificationSection.hidden
            );

        elements.informationSection.hidden =
            !(
                hasDescription ||
                hasSpecifications
            );

        return !elements.informationSection.hidden;
    }


    /* ======================================================
       RELATED PRODUCTS
    ====================================================== */

    function renderRelatedProducts() {
        const grid =
            elements.relatedGrid;

        const section =
            elements.relatedSection;

        if (
            !grid ||
            !section
        ) {
            return false;
        }

        setElementText(
            elements.relatedTitle,
            translate(
                "productDetail.relatedTitle",
                "Produk Serupa"
            )
        );

        const productCard =
            getProductCardComponent();

        productCard
            .destroy?.(
                grid
            );

        if (
            relatedProducts.length ===
            0
        ) {
            grid.replaceChildren();

            section.hidden =
                true;

            return false;
        }

        section.hidden =
            false;

        productCard.render({
            target:
                grid,

            products:
                relatedProducts,

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


    function refreshRelatedProductsLanguage(
        context = {}
    ) {
        setElementText(
            elements.relatedTitle,
            translate(
                "productDetail.relatedTitle",
                "Produk Serupa"
            )
        );

        if (
            !context?.event
        ) {
            getProductCardComponent()
                ?.refreshAll?.();
        }
    }


    /* ======================================================
       ORDER / WECHAT
    ====================================================== */

    function updateOrderButton() {
        const button =
            elements.orderButton;

        if (
            button &&
            currentProduct
        ) {
            button.textContent =
                translate(
                    "productDetail.orderButton",
                    "Pesan melalui WeChat"
                );

            button.dataset.productId =
                currentProduct.id ||
                "";

            button.dataset.orderText =
                buildOrderSummary();

            button.href =
                "#wechat";
        }

        updateShoppingButtons();
    }


    function updateShoppingButtons() {
        if (!currentProduct) return;

        if (elements.addCartButton) {
            const available = Boolean(currentProduct?.inventory?.inStock ?? currentProduct?.stock);
            elements.addCartButton.disabled = !available;
            elements.addCartButton.textContent = translate(
                available ? "cart.add" : "common.outOfStock",
                available ? "Titip Beli" : "Stok Habis"
            );
        }

        if (elements.wishlistButton) {
            const active = Boolean(window.GomaiShoppingState?.isWishlisted?.(currentProduct.id));
            elements.wishlistButton.classList.toggle("is-active", active);
            elements.wishlistButton.setAttribute("aria-pressed", active ? "true" : "false");
            elements.wishlistButton.textContent = translate(
                active ? "wishlist.remove" : "wishlist.add",
                active ? "Hapus dari Wishlist" : "Simpan ke Wishlist"
            );
        }
    }

    function addCurrentSelectionToCart() {
        if (!currentProduct || !window.GomaiShoppingState) return;
        const color = getSelectedColor();
        window.GomaiShoppingState.addToCart({
            serviceType: currentProduct.serviceType,
            productId: currentProduct.id,
            colorId: color?.id || "",
            sizeId: state.selectedSize || "",
            quantity: state.quantity
        });

        if (elements.addCartButton) {
            const original = translate("cart.add", "Titip Beli");
            elements.addCartButton.textContent = translate("cart.added", "Ditambahkan ✓");
            elements.addCartButton.classList.add("is-added");
            window.setTimeout(() => {
                if (!elements.addCartButton?.isConnected) return;
                elements.addCartButton.textContent = original;
                elements.addCartButton.classList.remove("is-added");
            }, 1200);
        }
    }

    function toggleCurrentWishlist() {
        if (!currentProduct || !window.GomaiShoppingState) return;
        window.GomaiShoppingState.toggleWishlist(currentProduct.id);
        updateShoppingButtons();
    }

    function updateContactButton() {
        if (
            !elements.contactButton
        ) {
            return;
        }

        elements.contactButton
            .href =
            buildRoute(
                "contact",
                {}
            );
    }


    function buildOrderSummary() {
        if (!currentProduct) {
            return "";
        }

        const color =
            getSelectedColor();

        return [
            `${translate(
                "product.brand",
                "Brand"
            )}: ${getBrandName()}`,

            `${translate(
                "common.products",
                "Produk"
            )}: ${getProductName()}`,

            `${translate(
                "product.color",
                "Warna"
            )}: ${
                color
                    ? getColorName(
                        color
                    )
                    : "-"
            }`,

            `${translate(
                "product.size",
                "Ukuran"
            )}: ${
                state.selectedSize ||
                "-"
            }`,

            `${translate(
                "product.quantity",
                "Jumlah"
            )}: ${state.quantity}`,

            `${translate(
                "product.price",
                "Harga"
            )}: ${
                window.GomaiUtils
                    .formatCurrency(
                        currentProduct.price
                    )
            }`,

            `URL: ${window.location.href}`
        ].join(
            "\n"
        );
    }


    /* ======================================================
       EVENT BINDING
    ====================================================== */

    function createEventController() {
        eventController
            ?.abort();

        eventController =
            new AbortController();
    }


    function bindControls() {
        if (
            !eventController ||
            !elements.detailContainer
        ) {
            return;
        }

        const signal =
            eventController.signal;

        elements.detailContainer
            .addEventListener(
                "click",
                handleDetailClick,
                {
                    signal
                }
            );

        elements.detailContainer
            .addEventListener(
                "input",
                handleDetailInput,
                {
                    signal
                }
            );

        elements.detailContainer
            .addEventListener(
                "change",
                handleDetailChange,
                {
                    signal
                }
            );
    }


    function handleDetailClick(
        event
    ) {
        const target =
            event.target instanceof
                Element
                ? event.target
                : null;

        if (!target) {
            return;
        }

        const retry =
            target.closest(
                "[data-product-detail-action='retry']"
            );

        if (retry) {
            event.preventDefault();

            reloadData()
                .catch(
                    error => {
                        console.error(
                            "ProductDetailController: reload gagal.",
                            error
                        );
                    }
                );

            return;
        }

        const thumbnail =
            target.closest(
                "[data-image-index]"
            );

        if (thumbnail) {
            const imageIndex =
                Number(
                    thumbnail.dataset
                        .imageIndex
                );

            if (
                Number.isInteger(
                    imageIndex
                ) &&
                imageIndex >=
                    0
            ) {
                state.selectedImageIndex =
                    imageIndex;

                renderGallery();

                emitSelectionChanged(
                    "image"
                );
            }

            return;
        }

        const colorButton =
            target.closest(
                "[data-color-index]"
            );

        if (colorButton) {
            if (
                colorButton.disabled
            ) {
                return;
            }

            const colorIndex =
                Number(
                    colorButton.dataset
                        .colorIndex
                );

            if (
                Number.isInteger(
                    colorIndex
                ) &&
                colorIndex >=
                    0 &&
                colorIndex <
                    getColors()
                        .length
            ) {
                state.selectedColorIndex =
                    colorIndex;

                state.selectedImageIndex =
                    0;

                syncSelectedSizeToCurrentVariant();

                renderColorOptions();

                renderSizeOptions();

                renderGallery();

                updateOrderButton();

                emitSelectionChanged(
                    "color"
                );
            }

            return;
        }

        const sizeButton =
            target.closest(
                "[data-size]"
            );

        if (sizeButton) {
            if (
                sizeButton.disabled
            ) {
                return;
            }

            state.selectedSize =
                normalizeText(
                    sizeButton.dataset
                        .size
                );

            renderSizeOptions();

            updateOrderButton();

            emitSelectionChanged(
                "size"
            );

            return;
        }

        if (
            target.closest(
                "#add-to-cart-button"
            )
        ) {
            event.preventDefault();
            addCurrentSelectionToCart();
            return;
        }

        if (
            target.closest(
                "#wishlist-toggle-button"
            )
        ) {
            event.preventDefault();
            toggleCurrentWishlist();
            return;
        }

        if (
            target.closest(
                "#quantity-decrease"
            )
        ) {
            setQuantity(
                state.quantity -
                1
            );

            return;
        }

        if (
            target.closest(
                "#quantity-increase"
            )
        ) {
            setQuantity(
                state.quantity +
                1
            );
        }
    }


    function handleDetailInput(
        event
    ) {
        const input =
            event.target;

        if (
            !(input instanceof
                HTMLInputElement)
        ) {
            return;
        }

        if (
            input.id !==
            "product-quantity"
        ) {
            return;
        }

        const value =
            Number(
                input.value
            );

        if (
            Number.isFinite(
                value
            ) &&
            value >=
                1
        ) {
            state.quantity =
                Math.floor(
                    value
                );

            updateOrderButton();
        }
    }


    function handleDetailChange(
        event
    ) {
        const input =
            event.target;

        if (
            !(input instanceof
                HTMLInputElement)
        ) {
            return;
        }

        if (
            input.id ===
            "product-quantity"
        ) {
            setQuantity(
                input.value
            );
        }
    }


    function emitSelectionChanged(
        reason
    ) {
        dispatch(
            EVENTS.SELECTION_CHANGED,
            {
                reason,

                state:
                    getState(),

                orderSummary:
                    buildOrderSummary()
            }
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
            if (!currentProduct) {
                refreshCurrentPageState();

                return true;
            }

            renderBreadcrumb();

            renderProductInformation();

            renderGallery();

            renderColorOptions();

            renderSizeOptions();

            renderDescription();

            renderSpecifications();

            updateInformationSectionVisibility();

            renderGeneratedControlTranslations();

            updateOrderButton();

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
                "ProductDetailController gagal memperbarui bahasa:",
                lastError
            );

            return false;
        }
    }


    function renderGeneratedControlTranslations() {
        elements.detailContainer
            ?.querySelectorAll(
                "[data-translation-key]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .translationKey ||
                        "";

                    const fallback =
                        element.dataset
                            .translationFallback ||
                        "";

                    if (key) {
                        element.textContent =
                            translate(
                                key,
                                fallback
                            );
                    }
                }
            );

        if (
            elements.quantityDecrease
        ) {
            elements.quantityDecrease
                .setAttribute(
                    "aria-label",
                    translate(
                        "productDetail.decreaseQuantity",
                        "Kurangi jumlah"
                    )
                );
        }

        if (
            elements.quantityIncrease
        ) {
            elements.quantityIncrease
                .setAttribute(
                    "aria-label",
                    translate(
                        "productDetail.increaseQuantity",
                        "Tambah jumlah"
                    )
                );
        }

        if (
            elements.quantityInput
        ) {
            elements.quantityInput
                .setAttribute(
                    "aria-label",
                    translate(
                        "productDetail.quantityLabel",
                        "Jumlah"
                    )
                );
        }
    }


    function refreshCurrentPageState() {
        if (
            viewState ===
            "not-found"
        ) {
            showProductNotFound({
                dispatchEvent:
                    false
            });

        } else if (
            viewState ===
            "error"
        ) {
            showLoadError();
        }
    }


    /* ======================================================
       SEO
    ====================================================== */

    function updateDocumentMetadata() {
        if (!currentProduct) {
            return;
        }

        const productName =
            getProductName();

        const description =
            getLocalizedText(
                currentProduct
                    .description,

                getCurrentLanguage()
            ) ||

            getLocalizedText(
                currentProduct
                    .shortDescription,

                getCurrentLanguage()
            ) ||

            translate(
                "productDetail.meta.descriptionTemplate",
                "Lihat detail produk {{product}} melalui Gomai.",
                {
                    product:
                        productName
                }
            );

        document.title =
            translate(
                "productDetail.meta.titleTemplate",
                "{{product}} | Gomai",
                {
                    product:
                        productName
                }
            );

        elements.pageDescription
            ?.setAttribute(
                "content",
                description
            );
    }


    /* ======================================================
       PAGE STATES
    ====================================================== */

    function showLoadingState() {
        viewState =
            "loading";

        if (
            !elements.detailContainer
        ) {
            return;
        }

        clearInlineState();

        hideProductSubsections();

        clearRelatedProducts();

        if (
            elements.notFound
        ) {
            elements.notFound
                .hidden =
                true;
        }

        elements.detailContainer
            .hidden =
            false;

        elements.detailContainer
            .setAttribute(
                "aria-busy",
                "true"
            );

        elements.detailContainer
            .classList
            .add(
                "is-loading"
            );

        if (
            elements.gallery
        ) {
            elements.gallery.hidden =
                true;
        }

        if (
            elements.productInfo
        ) {
            elements.productInfo.hidden =
                true;
        }

        const loading =
            document.createElement(
                "div"
            );

        loading.className =
            "empty-state product-detail-loading-state";

        loading.dataset.productDetailState =
            "loading";

        const text =
            document.createElement(
                "p"
            );

        text.textContent =
            translate(
                "product.loading",
                "Memuat produk..."
            );

        loading.append(
            text
        );

        elements.detailContainer
            .prepend(
                loading
            );
    }


    function showProductNotFound(
        options = {}
    ) {
        viewState =
            "not-found";

        clearInlineState();

        hideProductSections();

        clearRelatedProducts();

        const title =
            translate(
                "productDetail.notFound.title",
                "Produk Tidak Ditemukan"
            );

        const description =
            translate(
                "productDetail.notFound.description",
                "Produk yang Anda cari belum tersedia atau alamat halaman tidak valid."
            );

        const buttonText =
            translate(
                "productDetail.notFound.button",
                "Lihat Semua Produk"
            );

        if (
            elements.notFound
        ) {
            elements.notFound.hidden =
                false;

            setElementText(
                elements.notFoundTitle,
                title
            );

            setElementText(
                elements.notFoundDescription,
                description
            );

            setElementText(
                elements.notFoundButton,
                buttonText
            );

            if (
                elements.notFoundButton
            ) {
                elements.notFoundButton
                    .href =
                    buildRoute(
                        "products",
                        {}
                    );
            }

        } else if (
            elements.detailContainer
        ) {
            elements.detailContainer
                .hidden =
                false;

            elements.detailContainer
                .prepend(
                    createInlineNotFoundState(
                        title,
                        description,
                        buttonText
                    )
                );
        }

        document.title =
            `${title} | Gomai`;

        elements.pageDescription
            ?.setAttribute(
                "content",
                description
            );

        if (
            options.dispatchEvent !==
            false
        ) {
            dispatch(
                EVENTS.NOT_FOUND,
                {
                    requestedProductId
                }
            );
        }
    }


    function createInlineNotFoundState(
        title,
        description,
        buttonText
    ) {
        const container =
            document.createElement(
                "div"
            );

        container.className =
            "empty-state product-detail-not-found-state";

        container.dataset.productDetailState =
            "not-found";

        const heading =
            document.createElement(
                "h2"
            );

        heading.textContent =
            title;

        const paragraph =
            document.createElement(
                "p"
            );

        paragraph.textContent =
            description;

        const link =
            document.createElement(
                "a"
            );

        link.href =
            buildRoute(
                "products",
                {}
            );

        link.className =
            "btn btn-primary";

        link.textContent =
            buttonText;

        container.append(
            heading,
            paragraph,
            link
        );

        return container;
    }


    function showLoadError() {
        viewState =
            "error";

        clearInlineState();

        hideProductSubsections();

        clearRelatedProducts();

        if (
            elements.notFound
        ) {
            elements.notFound.hidden =
                true;
        }

        const container =
            elements.detailContainer;

        if (!container) {
            return;
        }

        container.hidden =
            false;

        container.setAttribute(
            "aria-busy",
            "false"
        );

        if (
            elements.gallery
        ) {
            elements.gallery.hidden =
                true;
        }

        if (
            elements.productInfo
        ) {
            elements.productInfo.hidden =
                true;
        }

        const emptyState =
            getEmptyStateComponent();

        let stateElement =
            null;

        if (
            emptyState &&
            typeof emptyState
                .create ===
                "function"
        ) {
            stateElement =
                emptyState.create({
                    preset:
                        "error",

                    titleKey:
                        "productDetail.error.title",

                    titleFallback:
                        "Produk Gagal Dimuat",

                    descriptionKey:
                        "productDetail.error.description",

                    descriptionFallback:
                        "Terjadi kesalahan saat memuat produk. Silakan coba kembali.",

                    primaryAction: {
                        labelKey:
                            "emptyState.error.primaryButton",

                        labelFallback:
                            "Coba Lagi",

                        action:
                            "retry",

                        className:
                            "btn btn-primary"
                    },

                    secondaryAction:
                        false,

                    className:
                        "product-detail-error-state"
                });

            if (stateElement) {
                stateElement.dataset
                    .productDetailState =
                    "error";

                const action =
                    stateElement
                        .querySelector(
                            "[data-empty-state-action], a, button"
                        );

                if (action) {
                    action.dataset
                        .productDetailAction =
                        "retry";
                }
            }
        }

        if (!stateElement) {
            stateElement =
                createFallbackErrorState();
        }

        container.prepend(
            stateElement
        );
    }


    function createFallbackErrorState() {
        const container =
            document.createElement(
                "div"
            );

        container.className =
            "empty-state product-detail-error-state";

        container.dataset.productDetailState =
            "error";

        const title =
            document.createElement(
                "h2"
            );

        title.textContent =
            translate(
                "productDetail.error.title",
                "Produk Gagal Dimuat"
            );

        const description =
            document.createElement(
                "p"
            );

        description.textContent =
            translate(
                "productDetail.error.description",
                "Terjadi kesalahan saat memuat produk. Silakan coba kembali."
            );

        const retry =
            document.createElement(
                "button"
            );

        retry.type =
            "button";

        retry.className =
            "btn btn-primary";

        retry.dataset.productDetailAction =
            "retry";

        retry.textContent =
            translate(
                "emptyState.error.primaryButton",
                "Coba Lagi"
            );

        container.append(
            title,
            description,
            retry
        );

        return container;
    }


    function showProductContent() {
        viewState =
            "ready";

        clearInlineState();

        if (
            elements.notFound
        ) {
            elements.notFound.hidden =
                true;
        }

        if (
            elements.detailContainer
        ) {
            elements.detailContainer
                .hidden =
                false;

            elements.detailContainer
                .setAttribute(
                    "aria-busy",
                    "false"
                );

            elements.detailContainer
                .classList
                .remove(
                    "is-loading"
                );
        }

        if (
            elements.gallery
        ) {
            elements.gallery.hidden =
                false;
        }

        if (
            elements.productInfo
        ) {
            elements.productInfo.hidden =
                false;
        }
    }


    function hideProductSections() {
        if (
            elements.notFound
        ) {
            elements.notFound.hidden =
                false;
        }

        if (
            elements.detailContainer
        ) {
            elements.detailContainer.hidden =
                Boolean(
                    elements.notFound
                );

            elements.detailContainer
                .setAttribute(
                    "aria-busy",
                    "false"
                );

            elements.detailContainer
                .classList
                .remove(
                    "is-loading"
                );
        }

        hideProductSubsections();
    }


    function hideProductSubsections() {
        if (
            elements.informationSection
        ) {
            elements.informationSection
                .hidden =
                true;
        }

        if (
            elements.descriptionSection
        ) {
            elements.descriptionSection
                .hidden =
                true;
        }

        if (
            elements.specificationSection
        ) {
            elements.specificationSection
                .hidden =
                true;
        }

        if (
            elements.relatedSection
        ) {
            elements.relatedSection
                .hidden =
                true;
        }
    }


    function clearInlineState() {
        elements.detailContainer
            ?.querySelectorAll(
                "[data-product-detail-state]"
            )
            .forEach(
                element =>
                    element.remove()
            );

        elements.detailContainer
            ?.classList
            .remove(
                "is-loading"
            );
    }


    function clearRelatedProducts() {
        if (
            !elements.relatedGrid
        ) {
            return;
        }

        getProductCardComponent()
            ?.destroy?.(
                elements.relatedGrid
            );

        elements.relatedGrid
            .replaceChildren();
    }


    /* ======================================================
       HELPERS
    ====================================================== */

    function getProductName(
        product =
            currentProduct,

        language =
            getCurrentLanguage()
    ) {
        return (
            getLocalizedText(
                product?.name,
                language
            ) ||

            product?.id ||

            translate(
                "common.products",
                "Produk"
            )
        );
    }


    function getBrandName(
        language =
            getCurrentLanguage()
    ) {
        if (currentBrand) {
            if (
                typeof currentBrand
                    .name ===
                "string"
            ) {
                return (
                    normalizeText(
                        currentBrand.name
                    ) ||

                    currentBrand.id
                );
            }

            return (
                getLocalizedText(
                    currentBrand.name,
                    language
                ) ||

                currentBrand.id ||

                "Brand"
            );
        }

        return (
            normalizeText(
                currentProduct
                    ?.brandId ||
                currentProduct
                    ?.brand
            ) ||

            translate(
                "common.brand",
                "Brand"
            )
        );
    }


    function getColorName(
        color,
        language =
            getCurrentLanguage()
    ) {
        return (
            getLocalizedText(
                color?.name,
                language
            ) ||

            color?.id ||

            "-"
        );
    }


    function getCategoryNames() {
        const categoryIds =
            Array.isArray(
                currentProduct
                    ?.categoryIds
            )
                ? currentProduct
                    .categoryIds

                : [
                    currentProduct
                        ?.category
                ];

        return categoryIds
            .map(
                normalizeIdentifier
            )
            .filter(
                Boolean
            )
            .map(
                getCategoryName
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


    function getLocalizedText(
        value,
        language =
            getCurrentLanguage()
    ) {
        if (
            typeof value ===
                "string" ||
            typeof value ===
                "number"
        ) {
            return normalizeText(
                value
            );
        }

        if (
            !value ||
            typeof value !==
                "object"
        ) {
            return "";
        }

        return normalizeText(
            value[
                language
            ] ||

            value.zh ||

            value.id ||

            value.en ||

            ""
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
                 * Gunakan getBasePath fallback.
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


    function buildRoute(
        routeName,
        parameters = {}
    ) {
        if (
            typeof window.GomaiUtils
                ?.buildRoute ===
            "function"
        ) {
            try {
                return window.GomaiUtils
                    .buildRoute(
                        routeName,
                        parameters
                    );

            } catch (_error) {

                /*
                 * Gunakan getRoute fallback.
                 */
            }
        }

        if (
            typeof window.GomaiUtils
                ?.getRoute ===
            "function"
        ) {
            const route =
                window.GomaiUtils
                    .getRoute(
                        routeName
                    );

            const params =
                new URLSearchParams(
                    parameters
                );

            const query =
                params.toString();

            return query
                ? `${route}?${query}`
                : route;
        }

        if (
            routeName ===
            "brand"
        ) {
            return (
                `brand.html?id=${
                    encodeURIComponent(
                        parameters.id ||
                        ""
                    )
                }`
            );
        }

        if (
            routeName ===
            "contact"
        ) {
            return "contact.html";
        }

        return "products.html";
    }


    function setElementText(
        element,
        value
    ) {
        if (element) {
            element.textContent =
                String(
                    value ??
                    ""
                );
        }
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
                    `ProductDetailController: terjemahan "${key}" gagal.`,
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
       NORMALIZATION / CLONE
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
            value ===
            undefined
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
                    "Terjadi kesalahan pada ProductDetailController."
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

        clearRelatedProducts();

        clearInlineState();

        requestedProductId =
            "";

        currentProduct =
            null;

        currentBrand =
            null;

        allBrands =
            [];

        relatedProducts =
            [];

        lastError =
            null;

        viewState =
            "idle";

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

    function getState() {
        return cloneData(
            state
        );
    }


    function getCurrentProduct() {
        return currentProduct
            ? cloneData(
                currentProduct
            )
            : null;
    }


    function getCurrentBrand() {
        return currentBrand
            ? cloneData(
                currentBrand
            )
            : null;
    }


    function getRelatedProducts() {
        return cloneData(
            relatedProducts
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

            requestedProductId,

            product:
                getCurrentProduct(),

            brand:
                getCurrentBrand(),

            relatedCount:
                relatedProducts.length,

            state:
                getState(),

            viewState,

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

            buildOrderSummary,
            setQuantity,

            getState,
            getCurrentProduct,
            getCurrentBrand,
            getRelatedProducts,
            getLastError,
            hasInitialized
        });

    return publicAPI;
})();


/*
 * Nama final controller.
 */
window.ProductDetailController =
    ProductDetailController;


/*
 * Compatibility alias selama transisi file lama.
 *
 * Gomai Core hasil audit menerima:
 * ProductDetailController || ProductDetailPage.
 */
window.ProductDetailPage =
    ProductDetailController;
