"use strict";

/* ==========================================================
   GOMAI PRODUCT CARD COMPONENT
   js/components/product-card.js

   Tanggung jawab:
   - Membuat kartu produk reusable.
   - Merender satu / beberapa kartu produk.
   - Mendukung struktur ProductsModel baru dan lama.
   - Mendukung Mandarin dan Indonesia.
   - Membentuk URL product detail melalui GomaiUtils.
   - Menangani gambar kosong / gagal dimuat.
   - Menyimpan registry kartu aktif untuk refresh bahasa.
   - Membersihkan registry ketika kartu dihancurkan.
   - Mengirim event interaksi kartu.

   Komponen ini tidak membaca JSON dan tidak memakai
   ProductsModel secara langsung. Data selalu diterima dari
   controller / model layer.
========================================================== */

const ProductCardComponent = (() => {
    const VERSION = "2.1.0";

    const EVENTS = Object.freeze({
        CREATED: "gomai:product-card-created",
        RENDERED: "gomai:product-cards-rendered",
        CLICKED: "gomai:product-card-clicked",
        IMAGE_ERROR: "gomai:product-card-image-error",
        DESTROYED: "gomai:product-card-destroyed",
        REFRESHED: "gomai:product-card-refreshed",
        ERROR: "gomai:product-card-error"
    });

    const DEFAULT_OPTIONS = Object.freeze({
        showBrand: true,
        includeBrandInName: true,
        showStock: true,
        showComparePrice: false,
        showFeaturedBadge: false,
        imageLoading: "lazy",
        imageDecoding: "async",
        className: "",
        imageClassName: "",
        bodyClassName: "",
        brandClassName: "",
        nameClassName: "",
        priceClassName: "",
        stockClassName: "",
        featuredClassName: "badge badge-warning",
        onClick: null
    });

    const activeCards = new Map();
    let cardCounter = 0;

    /* ======================================================
       CREATE
    ====================================================== */

    function create(product, options = {}) {
        validateDependencies();

        const normalizedProduct = normalizeProduct(product);
        const settings = normalizeOptions(options);
        const cardId = createCardId(normalizedProduct.id);

        const article = createCardElement(
            normalizedProduct,
            settings,
            cardId
        );

        activeCards.set(cardId, {
            element: article,
            product: cloneSafe(normalizedProduct),
            options: cloneOptionsForRegistry(settings)
        });

        dispatch(EVENTS.CREATED, {
            product: cloneSafe(normalizedProduct),
            element: article,
            cardId
        });

        return article;
    }

    /* ======================================================
       RENDER

       Format utama:

       ProductCardComponent.render({
           target: "product-grid",
           products: [...]
       });

       Compatibility:

       ProductCardComponent.render(
           "product-grid",
           products,
           options
       );
    ====================================================== */

    function render(
        input = {},
        productList = null,
        extraOptions = {}
    ) {
        validateDependencies();

        const renderOptions = normalizeRenderArguments(
            input,
            productList,
            extraOptions
        );

        const target = resolveTarget(
            renderOptions.target
        );

        if (!target) {
            return [];
        }

        const products = Array.isArray(
            renderOptions.products
        )
            ? renderOptions.products
            : [];

        const clearTarget =
            renderOptions.clearTarget !== false;

        const cardOptions =
            extractCardOptions(
                renderOptions
            );

        if (clearTarget) {
            unregisterCardsInside(
                target
            );

            target.replaceChildren();
        }

        const fragment =
            document.createDocumentFragment();

        const cards = [];

        products.forEach(product => {
            try {
                const card = create(
                    product,
                    cardOptions
                );

                cards.push(card);
                fragment.append(card);
            } catch (error) {
                const normalizedError =
                    normalizeError(error);

                console.error(
                    "ProductCardComponent: produk gagal dirender.",
                    normalizedError,
                    product
                );

                dispatch(EVENTS.ERROR, {
                    error: normalizedError,
                    product: cloneSafe(product)
                });
            }
        });

        target.append(fragment);

        target.hidden = false;

        target.setAttribute(
            "aria-busy",
            "false"
        );

        dispatch(EVENTS.RENDERED, {
            target,
            count: cards.length,
            products: products.map(
                cloneSafe
            )
        });

        return cards;
    }

    /* ======================================================
       APPEND
    ====================================================== */

    function append(
        target,
        products,
        options = {}
    ) {
        return render({
            ...(isPlainObject(options)
                ? options
                : {}),

            target,

            products: Array.isArray(
                products
            )
                ? products
                : [products],

            clearTarget: false
        });
    }

    /* ======================================================
       REPLACE
    ====================================================== */

    function replace(
        target,
        products,
        options = {}
    ) {
        return render({
            ...(isPlainObject(options)
                ? options
                : {}),

            target,

            products: Array.isArray(
                products
            )
                ? products
                : [products],

            clearTarget: true
        });
    }

    /* ======================================================
       DESTROY
    ====================================================== */

    function destroy(target = null) {
        /*
         * ComponentRegistry dapat memanggil destroy(context)
         * ketika shutdown. Context tersebut bukan target DOM.
         */
        if (
            target === null ||
            target === undefined ||
            isRegistryLifecycleContext(target)
        ) {
            return destroyAll();
        }

        const element = resolveTarget(
            target,
            false
        );

        if (!element) {
            return false;
        }

        if (
            element.matches?.(
                "[data-product-card='true']"
            )
        ) {
            destroyCardElement(
                element
            );

            return true;
        }

        const cards = Array.from(
            element.querySelectorAll(
                "[data-product-card='true']"
            )
        );

        cards.forEach(
            destroyCardElement
        );

        return cards.length > 0;
    }

    /* ======================================================
       DESTROY ALL
    ====================================================== */

    function destroyAll() {
        const entries = Array.from(
            activeCards.entries()
        );

        entries.forEach(
            ([cardId, state]) => {
                const element =
                    state.element;

                const productId =
                    state.product?.id ||
                    element?.dataset
                        ?.productId ||
                    "";

                activeCards.delete(
                    cardId
                );

                if (
                    element instanceof
                    Element
                ) {
                    element.remove();
                }

                dispatch(
                    EVENTS.DESTROYED,
                    {
                        cardId,
                        productId,
                        element:
                            element || null
                    }
                );
            }
        );

        return entries.length > 0;
    }

    /* ======================================================
       DESTROY CARD ELEMENT
    ====================================================== */

    function destroyCardElement(card) {
        const cardId =
            card.dataset
                .productCardId ||
            "";

        const productId =
            card.dataset
                .productId ||
            "";

        unregisterCard(card);

        card.remove();

        dispatch(
            EVENTS.DESTROYED,
            {
                cardId,
                productId,
                element: card
            }
        );
    }

    /* ======================================================
       REFRESH
    ====================================================== */

    function refresh(target) {
        const element = resolveTarget(
            target,
            false
        );

        if (!element) {
            return null;
        }

        if (
            element.matches?.(
                "[data-product-card='true']"
            )
        ) {
            return refreshCardElement(
                element
            );
        }

        let firstRefreshed = null;

        element
            .querySelectorAll(
                "[data-product-card='true']"
            )
            .forEach(card => {
                const refreshed =
                    refreshCardElement(
                        card
                    );

                if (
                    !firstRefreshed &&
                    refreshed
                ) {
                    firstRefreshed =
                        refreshed;
                }
            });

        return firstRefreshed;
    }

    /* ======================================================
       REFRESH ALL

       Dipanggil ComponentRegistry saat bahasa berubah.
    ====================================================== */

    function refreshAll() {
        const entries = Array.from(
            activeCards.entries()
        );

        let refreshed = 0;

        entries.forEach(
            ([cardId, state]) => {
                const element =
                    state.element;

                if (
                    !(
                        element instanceof
                        Element
                    ) ||
                    !element.isConnected
                ) {
                    activeCards.delete(
                        cardId
                    );

                    return;
                }

                if (
                    refreshCardElement(
                        element
                    )
                ) {
                    refreshed += 1;
                }
            }
        );

        return refreshed;
    }

    /* ======================================================
       REFRESH CARD ELEMENT
    ====================================================== */

    function refreshCardElement(element) {
        const cardId =
            element.dataset
                .productCardId ||
            "";

        if (!cardId) {
            return null;
        }

        const state =
            activeCards.get(
                cardId
            );

        if (!state) {
            return null;
        }

        const replacement =
            createCardElement(
                state.product,
                state.options,
                cardId
            );

        element.replaceWith(
            replacement
        );

        activeCards.set(
            cardId,
            {
                ...state,
                element:
                    replacement
            }
        );

        dispatch(
            EVENTS.REFRESHED,
            {
                cardId,

                product:
                    cloneSafe(
                        state.product
                    ),

                element:
                    replacement
            }
        );

        return replacement;
    }

    /* ======================================================
       CARD MARKUP
    ====================================================== */

    function createCardElement(
        product,
        settings,
        cardId
    ) {
        const language =
            getCurrentLanguage();

        const brandName =
            getBrandName(
                product,
                settings,
                language
            );

        const productName =
            getProductName(
                product,
                language
            );

        const displayName =
            formatProductDisplayName(
                productName,
                brandName,
                settings
            );

        const detailUrl =
            getProductDetailUrl(
                product
            );

        const article =
            document.createElement(
                "article"
            );

        article.className =
            buildClassName(
                "product-card",
                settings.className
            );

        article.dataset.productCard =
            "true";

        article.dataset.productCardId =
            cardId;

        article.dataset.productId =
            product.id;

        article.dataset.productSlug =
            product.slug;

        article.dataset.brandId =
            product.brandId;

        if (
            product.categoryIds.length >
            0
        ) {
            article.dataset.categoryIds =
                product.categoryIds
                    .join(" ");
        }

        if (product.featured) {
            article.dataset.featured =
                "true";
        }

        article.append(
            createImageSection(
                product,
                settings,
                displayName,
                detailUrl
            ),

            createWishlistControl(
                product,
                displayName
            ),

            createBodySection(
                product,
                settings,
                {
                    language,
                    brandName,
                    productName,
                    displayName,
                    detailUrl
                }
            )
        );

        return article;
    }

    /* ======================================================
       IMAGE SECTION
    ====================================================== */

    function createImageSection(
        product,
        settings,
        displayName,
        detailUrl
    ) {
        const imageLink =
            document.createElement(
                "a"
            );

        imageLink.className =
            buildClassName(
                "product-image",
                settings.imageClassName
            );

        imageLink.href = detailUrl;

        imageLink.setAttribute(
            "aria-label",
            getViewProductLabel(
                displayName
            )
        );

        bindProductLinkEvent(
            imageLink,
            product,
            settings,
            detailUrl
        );

        const imagePath =
            getPrimaryImage(
                product,
                settings
            );

        if (imagePath) {
            const image =
                document.createElement(
                    "img"
                );

            image.src =
                resolveAssetPath(
                    imagePath
                );

            image.alt =
                getImageAlt(
                    displayName
                );

            image.loading =
                normalizeImageLoading(
                    settings.imageLoading
                );

            image.decoding =
                normalizeImageDecoding(
                    settings.imageDecoding
                );

            image.addEventListener(
                "error",
                () => {
                    const failedSource =
                        image.src;

                    image.remove();

                    if (
                        !imageLink.querySelector(
                            ".product-image-placeholder"
                        )
                    ) {
                        imageLink.append(
                            createImagePlaceholder(
                                displayName
                            )
                        );
                    }

                    dispatch(
                        EVENTS.IMAGE_ERROR,
                        {
                            product:
                                cloneSafe(
                                    product
                                ),

                            source:
                                failedSource,

                            element:
                                imageLink
                        }
                    );
                },
                {
                    once: true
                }
            );

            imageLink.append(image);
        } else {
            imageLink.append(
                createImagePlaceholder(
                    displayName
                )
            );
        }

        if (
            settings.showFeaturedBadge &&
            product.featured
        ) {
            imageLink.append(
                createFeaturedBadge(
                    settings
                )
            );
        }

        return imageLink;
    }

    /* ======================================================
       BODY SECTION
    ====================================================== */

    function createBodySection(
        product,
        settings,
        context
    ) {
        const body =
            document.createElement(
                "div"
            );

        body.className =
            buildClassName(
                "product-body",
                settings.bodyClassName
            );

        /* ==============================================
           BRAND
        ============================================== */

        if (
            settings.showBrand &&
            context.brandName
        ) {
            const brand =
                document.createElement(
                    "p"
                );

            brand.className =
                buildClassName(
                    "product-brand",
                    settings
                        .brandClassName
                );

            brand.textContent =
                context.brandName;

            body.append(brand);
        }

        /* ==============================================
           PRODUCT NAME
        ============================================== */

        const nameHeading =
            document.createElement(
                "h3"
            );

        nameHeading.className =
            buildClassName(
                "product-name",
                settings.nameClassName
            );

        const nameLink =
            document.createElement(
                "a"
            );

        nameLink.href =
            context.detailUrl;

        nameLink.textContent =
            context.displayName;

        nameLink.setAttribute(
            "aria-label",
            getViewProductLabel(
                context.displayName
            )
        );

        bindProductLinkEvent(
            nameLink,
            product,
            settings,
            context.detailUrl
        );

        nameHeading.append(
            nameLink
        );

        body.append(
            nameHeading
        );

        /* ==============================================
           PRICE
        ============================================== */

        const priceGroup =
            document.createElement(
                "div"
            );

        priceGroup.className =
            "product-price-group";

        const price =
            document.createElement(
                "p"
            );

        price.className =
            buildClassName(
                "product-price",
                settings.priceClassName
            );

        price.textContent =
            formatCurrency(
                product.price
            );

        priceGroup.append(price);

        if (
            settings.showComparePrice &&
            product.compareAtPrice !==
                null &&
            product.compareAtPrice >
                product.price
        ) {
            const comparePrice =
                document.createElement(
                    "del"
                );

            comparePrice.className =
                "product-compare-price";

            comparePrice.textContent =
                formatCurrency(
                    product.compareAtPrice
                );

            priceGroup.append(
                comparePrice
            );
        }

        body.append(
            priceGroup
        );

        /* ==============================================
           STOCK
        ============================================== */

        if (settings.showStock) {
            body.append(
                createStockBadge(
                    product,
                    settings
                )
            );
        }

        body.append(
            createShoppingActions(
                product,
                context.detailUrl
            )
        );

        return body;
    }

    /* ======================================================
       SHOPPING ACTIONS
    ====================================================== */

    let shoppingEventsBound = false;

    function ensureShoppingEventsBound() {
        if (shoppingEventsBound) return;
        shoppingEventsBound = true;
        document.addEventListener("gomai:wishlist-changed", () => refreshAll());
    }

    function createWishlistControl(product, displayName) {
        ensureShoppingEventsBound();

        const button = document.createElement("button");
        button.type = "button";
        button.className = "product-wishlist-button";
        button.dataset.productWishlist = product.id;

        const active = Boolean(window.GomaiShoppingState?.isWishlisted?.(product.id));
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.setAttribute(
            "aria-label",
            translate(active ? "wishlist.remove" : "wishlist.add", active ? "Hapus dari wishlist" : "Tambah ke wishlist") + `: ${displayName}`
        );
        button.textContent = active ? "♥" : "♡";

        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            window.GomaiShoppingState?.toggleWishlist?.(product.id);
        });

        return button;
    }

    function createShoppingActions(product, detailUrl) {
        const actions = document.createElement("div");
        actions.className = "product-card-actions product-commerce-actions";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-primary product-card-cart-button";

        const quickAdd = Boolean(window.GomaiShoppingState?.canQuickAdd?.(product));
        button.textContent = translate(
            quickAdd ? "cart.add" : "cart.chooseVariant",
            quickAdd ? "Tambah ke Keranjang" : "Pilih Varian"
        );

        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            if (!quickAdd) {
                window.location.href = detailUrl;
                return;
            }

            const selection = window.GomaiShoppingState?.getDefaultSelection?.(product);
            if (!selection) return;
            window.GomaiShoppingState.addToCart(selection);

            const original = button.textContent;
            button.textContent = translate("cart.added", "Ditambahkan ✓");
            button.classList.add("is-added");
            window.setTimeout(() => {
                if (!button.isConnected) return;
                button.textContent = original;
                button.classList.remove("is-added");
            }, 1100);
        });

        actions.append(button);
        return actions;
    }

    /* ======================================================
       STOCK BADGE
    ====================================================== */

    function createStockBadge(
        product,
        settings
    ) {
        const inStock =
            Boolean(
                product.stock
            );

        const badge =
            document.createElement(
                "span"
            );

        badge.className =
            buildClassName(
                "badge",

                inStock
                    ? "badge-success"
                    : "badge-danger",

                settings.stockClassName
            );

        badge.dataset.stock =
            inStock
                ? "available"
                : "out-of-stock";

        badge.textContent =
            getStockText(
                inStock
            );

        return badge;
    }

    /* ======================================================
       FEATURED BADGE
    ====================================================== */

    function createFeaturedBadge(
        settings
    ) {
        const badge =
            document.createElement(
                "span"
            );

        badge.className =
            buildClassName(
                "product-featured-badge",
                settings
                    .featuredClassName
            );

        badge.textContent =
            translate(
                "common.featured",

                getCurrentLanguage() ===
                    "zh"
                    ? "精选"
                    : "Unggulan"
            );

        return badge;
    }

    /* ======================================================
       IMAGE PLACEHOLDER
    ====================================================== */

    function createImagePlaceholder(
        displayName = ""
    ) {
        const placeholder =
            document.createElement(
                "div"
            );

        placeholder.className =
            "empty-state product-image-placeholder";

        placeholder.setAttribute(
            "role",
            "img"
        );

        placeholder.setAttribute(
            "aria-label",
            getImageUnavailableText(
                displayName
            )
        );

        const paragraph =
            document.createElement(
                "p"
            );

        paragraph.textContent =
            getImageUnavailableText();

        placeholder.append(
            paragraph
        );

        return placeholder;
    }

    /* ======================================================
       INTERACTION
    ====================================================== */

    function bindProductLinkEvent(
        link,
        product,
        settings,
        destination
    ) {
        link.addEventListener(
            "click",
            event => {
                const detail = {
                    product:
                        cloneSafe(
                            product
                        ),

                    productId:
                        product.id,

                    destination,

                    element:
                        link,

                    originalEvent:
                        event
                };

                if (
                    typeof settings
                        .onClick ===
                    "function"
                ) {
                    try {
                        const result =
                            settings.onClick(
                                detail
                            );

                        if (
                            result === false
                        ) {
                            event.preventDefault();
                        } else if (
                            result &&
                            typeof result
                                .catch ===
                                "function"
                        ) {
                            result.catch(
                                error => {
                                    handleInteractionError(
                                        error,
                                        detail
                                    );
                                }
                            );
                        }
                    } catch (error) {
                        handleInteractionError(
                            error,
                            detail
                        );
                    }
                }

                dispatch(
                    EVENTS.CLICKED,
                    detail
                );
            }
        );
    }

    function handleInteractionError(
        error,
        detail
    ) {
        const normalizedError =
            normalizeError(
                error
            );

        console.error(
            "ProductCardComponent: callback klik gagal.",
            normalizedError
        );

        dispatch(
            EVENTS.ERROR,
            {
                ...detail,

                error:
                    normalizedError
            }
        );
    }

    /* ======================================================
       PRODUCT NORMALIZATION
    ====================================================== */

    function normalizeProduct(product) {
        if (
            !isPlainObject(
                product
            )
        ) {
            throw new TypeError(
                "ProductCardComponent.create(): product harus berupa object."
            );
        }

        const id =
            normalizeIdentifier(
                product.id ||
                product.slug
            );

        if (!id) {
            throw new Error(
                "ProductCardComponent: product.id wajib tersedia."
            );
        }

        const slug =
            normalizeIdentifier(
                product.slug ||
                id
            );

        const brandId =
            normalizeIdentifier(
                product.brandId ||
                product.brand
            );

        const categoryIds =
            normalizeCategoryIds(
                product
            );

        return {
            ...product,

            id,

            slug,

            brandId,

            brand:
                brandId,

            categoryIds,

            category:
                categoryIds[0] ||
                "",

            name:
                normalizeLocalizedText(
                    product.name,
                    id
                ),

            price:
                normalizePrice(
                    product.price
                ),

            compareAtPrice:
                normalizeOptionalPrice(
                    product
                        .compareAtPrice
                ),

            currency:
                normalizeText(
                    product.currency ||
                    window.GomaiConfig
                        ?.currency
                        ?.code ||
                    "IDR"
                ).toUpperCase(),

            colors:
                normalizeColors(
                    product.colors
                ),

            images:
                normalizeAssetArray(
                    product.images
                ),

            stock:
                resolveStock(
                    product
                ),

            featured:
                resolveFeatured(
                    product
                )
        };
    }

    /* ======================================================
       OPTIONS NORMALIZATION
    ====================================================== */

    function normalizeOptions(
        options = {}
    ) {
        const source =
            isPlainObject(
                options
            )
                ? options
                : {};

        return {
            ...DEFAULT_OPTIONS,
            ...source,

            showBrand:
                source.showBrand !==
                undefined
                    ? Boolean(
                        source.showBrand
                    )
                    : DEFAULT_OPTIONS
                        .showBrand,

            includeBrandInName:
                source
                    .includeBrandInName !==
                undefined
                    ? Boolean(
                        source
                            .includeBrandInName
                    )
                    : DEFAULT_OPTIONS
                        .includeBrandInName,

            showStock:
                source.showStock !==
                undefined
                    ? Boolean(
                        source.showStock
                    )
                    : DEFAULT_OPTIONS
                        .showStock,

            showComparePrice:
                source
                    .showComparePrice !==
                undefined
                    ? Boolean(
                        source
                            .showComparePrice
                    )
                    : DEFAULT_OPTIONS
                        .showComparePrice,

            showFeaturedBadge:
                source
                    .showFeaturedBadge !==
                undefined
                    ? Boolean(
                        source
                            .showFeaturedBadge
                    )
                    : DEFAULT_OPTIONS
                        .showFeaturedBadge,

            imageLoading:
                normalizeImageLoading(
                    source.imageLoading ||
                    DEFAULT_OPTIONS
                        .imageLoading
                ),

            imageDecoding:
                normalizeImageDecoding(
                    source.imageDecoding ||
                    DEFAULT_OPTIONS
                        .imageDecoding
                ),

            className:
                buildClassName(
                    source.className
                ),

            imageClassName:
                buildClassName(
                    source.imageClassName
                ),

            bodyClassName:
                buildClassName(
                    source.bodyClassName
                ),

            brandClassName:
                buildClassName(
                    source.brandClassName
                ),

            nameClassName:
                buildClassName(
                    source.nameClassName
                ),

            priceClassName:
                buildClassName(
                    source.priceClassName
                ),

            stockClassName:
                buildClassName(
                    source.stockClassName
                ),

            featuredClassName:
                buildClassName(
                    source
                        .featuredClassName ||
                    DEFAULT_OPTIONS
                        .featuredClassName
                ),

            brandName:
                normalizeText(
                    source.brandName
                ),

            brand:
                source.brand || null,

            brands:
                source.brands || null,

            brandMap:
                source.brandMap || null,

            image:
                normalizeText(
                    source.image
                ),

            onClick:
                typeof source.onClick ===
                "function"
                    ? source.onClick
                    : null
        };
    }

    /* ======================================================
       RENDER ARGUMENTS
    ====================================================== */

    function normalizeRenderArguments(
        input,
        productList,
        extraOptions
    ) {
        if (
            input instanceof Element ||
            typeof input === "string"
        ) {
            return {
                ...(isPlainObject(
                    extraOptions
                )
                    ? extraOptions
                    : {}),

                target:
                    input,

                products:
                    Array.isArray(
                        productList
                    )
                        ? productList
                        : []
            };
        }

        return isPlainObject(
            input
        )
            ? { ...input }
            : {};
    }

    function extractCardOptions(
        renderOptions
    ) {
        const options = {
            ...renderOptions
        };

        delete options.target;
        delete options.products;
        delete options.clearTarget;

        return options;
    }

    /* ======================================================
       PRODUCT NAME
    ====================================================== */

    function getProductName(
        product,
        language =
            getCurrentLanguage()
    ) {
        return (
            getLocalizedText(
                product.name,
                language
            ) ||

            product.id ||

            translate(
                "common.products",

                language === "zh"
                    ? "商品"
                    : "Produk"
            )
        );
    }

    /* ======================================================
       BRAND NAME
    ====================================================== */

    function getBrandName(
        product,
        settings,
        language =
            getCurrentLanguage()
    ) {
        if (settings.brandName) {
            return settings.brandName;
        }

        const directBrand =
            resolveBrandNameFromValue(
                settings.brand,
                product.brandId,
                language
            );

        if (directBrand) {
            return directBrand;
        }

        const mappedBrand =
            resolveBrandNameFromCollection(
                settings.brandMap,
                product.brandId,
                language
            ) ||
            resolveBrandNameFromCollection(
                settings.brands,
                product.brandId,
                language
            );

        if (mappedBrand) {
            return mappedBrand;
        }

        if (product.brandName) {
            return getLocalizedText(
                product.brandName,
                language
            );
        }

        return formatBrandId(
            product.brandId
        );
    }

    function resolveBrandNameFromCollection(
        collection,
        brandId,
        language
    ) {
        if (
            !collection ||
            !brandId
        ) {
            return "";
        }

        if (
            collection instanceof Map
        ) {
            return resolveBrandNameFromValue(
                collection.get(
                    brandId
                ),

                brandId,
                language
            );
        }

        if (
            Array.isArray(
                collection
            )
        ) {
            const brand =
                collection.find(
                    item =>
                        normalizeIdentifier(
                            item?.id ||
                            item?.slug
                        ) ===
                        brandId
                );

            return resolveBrandNameFromValue(
                brand,
                brandId,
                language
            );
        }

        if (
            isPlainObject(
                collection
            )
        ) {
            return resolveBrandNameFromValue(
                collection[
                    brandId
                ],

                brandId,
                language
            );
        }

        return "";
    }

    function resolveBrandNameFromValue(
        value,
        brandId,
        language
    ) {
        if (
            typeof value ===
            "string"
        ) {
            return normalizeText(
                value
            );
        }

        if (
            !isPlainObject(
                value
            )
        ) {
            return "";
        }

        const valueId =
            normalizeIdentifier(
                value.id ||
                value.slug
            );

        if (
            brandId &&
            valueId &&
            valueId !== brandId
        ) {
            return "";
        }

        return (
            getLocalizedText(
                value.name,
                language
            ) ||

            normalizeText(
                value.title
            ) ||

            formatBrandId(
                valueId
            )
        );
    }

    /* ======================================================
       BRAND-FIRST PRODUCT NAME
    ====================================================== */

    function formatProductDisplayName(
        productName,
        brandName,
        settings
    ) {
        const name =
            normalizeText(
                productName
            );

        const brand =
            normalizeText(
                brandName
            );

        if (
            !settings
                .includeBrandInName ||
            !brand ||
            !name
        ) {
            return name || brand;
        }

        if (
            startsWithBrand(
                name,
                brand
            )
        ) {
            return name;
        }

        return `${brand} ${name}`;
    }

    function startsWithBrand(
        productName,
        brandName
    ) {
        const name =
            normalizeComparisonText(
                productName
            );

        const brand =
            normalizeComparisonText(
                brandName
            );

        return Boolean(
            name &&
            brand &&
            (
                name === brand ||
                name.startsWith(
                    `${brand} `
                )
            )
        );
    }

    /* ======================================================
       PRODUCT IMAGE
    ====================================================== */

    function getPrimaryImage(
        product,
        settings
    ) {
        if (settings.image) {
            return settings.image;
        }

        const directImages =
            normalizeAssetArray(
                product.images ||
                product.gallery
            );

        if (
            directImages.length >
            0
        ) {
            return directImages[0];
        }

        if (product.image) {
            return normalizeText(
                product.image
            );
        }

        const colors =
            Array.isArray(
                product.colors
            )
                ? product.colors
                : [];

        for (const color of colors) {
            const images =
                normalizeAssetArray(
                    color?.images ||
                    color?.gallery
                );

            if (
                images.length >
                0
            ) {
                return images[0];
            }
        }

        return "";
    }

    /* ======================================================
       PRODUCT DETAIL URL
    ====================================================== */

    function getProductDetailUrl(
        product
    ) {
        const queryKey =
            window.GomaiConfig
                ?.query
                ?.productId ||
            "id";

        const identifier =
            product.id ||
            product.slug;

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .buildRoute ===
                "function"
        ) {
            try {
                const route =
                    window.GomaiUtils
                        .buildRoute(
                            "productDetail",
                            {
                                [queryKey]:
                                    identifier
                            }
                        );

                if (route) {
                    return route;
                }
            } catch (error) {
                console.warn(
                    "ProductCardComponent: gagal membentuk URL product detail.",
                    error
                );
            }
        }

        const fallback =
            `pages/product-detail.html?${encodeURIComponent(queryKey)}` +
            `=${encodeURIComponent(identifier)}`;

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .resolveProjectPath ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .resolveProjectPath(
                        fallback
                    );
            } catch (_error) {
                /*
                 * Gunakan fallback mentah.
                 */
            }
        }

        return fallback;
    }

    /* ======================================================
       STOCK
    ====================================================== */

    function resolveStock(product) {
        if (
            typeof product.stock ===
            "boolean"
        ) {
            return product.stock;
        }

        if (
            isPlainObject(
                product.inventory
            )
        ) {
            if (
                typeof product
                    .inventory
                    .inStock ===
                    "boolean"
            ) {
                return product
                    .inventory
                    .inStock;
            }

            const quantity =
                Number(
                    product
                        .inventory
                        .quantity
                );

            if (
                Number.isFinite(
                    quantity
                )
            ) {
                return quantity > 0;
            }
        }

        return false;
    }

    function getStockText(inStock) {
        const language =
            getCurrentLanguage();

        return inStock
            ? translate(
                "productDetail.available",

                language === "zh"
                    ? "有现货"
                    : "Tersedia"
            )
            : translate(
                "productDetail.outOfStock",

                language === "zh"
                    ? "缺货"
                    : "Stok Habis"
            );
    }

    /* ======================================================
       FEATURED
    ====================================================== */

    function resolveFeatured(product) {
        if (
            typeof product.featured ===
            "boolean"
        ) {
            return product.featured;
        }

        return Boolean(
            product.display
                ?.featured
        );
    }

    /* ======================================================
       CATEGORY IDS
    ====================================================== */

    function normalizeCategoryIds(
        product
    ) {
        let values = [];

        if (
            Array.isArray(
                product.categoryIds
            )
        ) {
            values =
                product.categoryIds;
        } else if (
            Array.isArray(
                product.categories
            )
        ) {
            values =
                product.categories;
        } else if (
            product.category
        ) {
            values = [
                product.category
            ];
        }

        return [
            ...new Set(
                values
                    .map(
                        normalizeIdentifier
                    )
                    .filter(Boolean)
            )
        ];
    }

    /* ======================================================
       COLORS
    ====================================================== */

    function normalizeColors(values) {
        if (
            !Array.isArray(
                values
            )
        ) {
            return [];
        }

        return values
            .map(value => {
                if (
                    typeof value ===
                    "string"
                ) {
                    return {
                        id:
                            normalizeIdentifier(
                                value
                            ),

                        name:
                            normalizeLocalizedText(
                                value,
                                value
                            ),

                        images: []
                    };
                }

                if (
                    !isPlainObject(
                        value
                    )
                ) {
                    return null;
                }

                return {
                    ...value,

                    id:
                        normalizeIdentifier(
                            value.id ||
                            value.slug ||
                            getLocalizedText(
                                value.name,
                                "id"
                            ) ||
                            getLocalizedText(
                                value.name,
                                "zh"
                            )
                        ),

                    name:
                        normalizeLocalizedText(
                            value.name,
                            value.id ||
                            ""
                        ),

                    images:
                        normalizeAssetArray(
                            value.images ||
                            value.gallery
                        )
                };
            })
            .filter(Boolean);
    }

    /* ======================================================
       LOCALIZED TEXT
    ====================================================== */

    function normalizeLocalizedText(
        value,
        fallback = ""
    ) {
        const fallbackText =
            normalizeText(
                fallback
            );

        if (
            typeof value ===
            "string"
        ) {
            const text =
                normalizeText(
                    value
                ) ||
                fallbackText;

            return {
                id: text,
                zh: text
            };
        }

        const source =
            isPlainObject(
                value
            )
                ? value
                : {};

        const idText =
            normalizeText(
                source.id
            );

        const zhText =
            normalizeText(
                source.zh
            );

        return {
            id:
                idText ||
                zhText ||
                fallbackText,

            zh:
                zhText ||
                idText ||
                fallbackText
        };
    }

    function getLocalizedText(
        value,
        language =
            getCurrentLanguage()
    ) {
        if (
            typeof value ===
            "string"
        ) {
            return normalizeText(
                value
            );
        }

        if (
            !isPlainObject(
                value
            )
        ) {
            return "";
        }

        const normalizedLanguage =
            normalizeLanguage(
                language
            );

        return normalizeText(
            value[
                normalizedLanguage
            ] ||
            value.zh ||
            value.id
        );
    }

    /* ======================================================
       GENERAL NORMALIZATION
    ====================================================== */

    function normalizeIdentifier(value) {
        return String(
            value ??
            ""
        )
            .trim()
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );
    }

    function normalizeText(value) {
        return String(
            value ??
            ""
        ).trim();
    }

    function normalizeComparisonText(
        value
    ) {
        return normalizeText(
            value
        )
            .toLocaleLowerCase()
            .replace(
                /\s+/g,
                " "
            );
    }

    function normalizePrice(value) {
        const number =
            Number(value);

        return (
            Number.isFinite(
                number
            ) &&
            number >= 0
        )
            ? number
            : 0;
    }

    function normalizeOptionalPrice(
        value
    ) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        const number =
            Number(value);

        return (
            Number.isFinite(
                number
            ) &&
            number >= 0
        )
            ? number
            : null;
    }

    function normalizeAssetArray(
        values
    ) {
        if (
            typeof values ===
            "string"
        ) {
            values = [
                values
            ];
        }

        if (
            !Array.isArray(
                values
            )
        ) {
            return [];
        }

        return [
            ...new Set(
                values
                    .map(
                        normalizeText
                    )
                    .filter(Boolean)
            )
        ];
    }

    function normalizeImageLoading(
        value
    ) {
        const normalized =
            normalizeText(
                value
            ).toLowerCase();

        return [
            "lazy",
            "eager"
        ].includes(
            normalized
        )
            ? normalized
            : "lazy";
    }

    function normalizeImageDecoding(
        value
    ) {
        const normalized =
            normalizeText(
                value
            ).toLowerCase();

        return [
            "async",
            "sync",
            "auto"
        ].includes(
            normalized
        )
            ? normalized
            : "async";
    }

    function normalizeLanguage(value) {
        const language =
            normalizeText(
                value
            )
                .toLowerCase()
                .replace(
                    "_",
                    "-"
                )
                .split("-")[0];

        return language === "id"
            ? "id"
            : "zh";
    }

    function formatBrandId(brandId) {
        const value =
            normalizeText(
                brandId
            );

        if (!value) {
            return "";
        }

        return value
            .replace(
                /[-_]+/g,
                " "
            )
            .replace(
                /\b\w/g,
                character =>
                    character.toUpperCase()
            );
    }

    function sanitizeId(value) {
        return normalizeText(
            value
        )
            .toLowerCase()
            .replace(
                /[^a-z0-9-_]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );
    }

    function buildClassName(
        ...values
    ) {
        return [
            ...new Set(
                values
                    .flatMap(value =>
                        Array.isArray(value)
                            ? value
                            : String(
                                value ??
                                ""
                            ).split(
                                /\s+/
                            )
                    )
                    .map(
                        normalizeText
                    )
                    .filter(
                        className =>
                            Boolean(
                                className
                            ) &&
                            /^[a-zA-Z0-9_-]+$/
                                .test(
                                    className
                                )
                    )
            )
        ].join(" ");
    }

    /* ======================================================
       ACCESSIBILITY TEXT
    ====================================================== */

    function getImageAlt(
        displayName
    ) {
        const language =
            getCurrentLanguage();

        return translate(
            "productDetail.imageAltTemplate",

            language === "zh"
                ? "{{product}} 商品图片"
                : "Foto produk {{product}}",

            {
                product:
                    displayName
            }
        );
    }

    function getImageUnavailableText(
        displayName = ""
    ) {
        const language =
            getCurrentLanguage();

        const text =
            translate(
                "product.imageUnavailable",

                language === "zh"
                    ? "暂无图片"
                    : "Gambar belum tersedia"
            );

        return displayName
            ? `${text}: ${displayName}`
            : text;
    }

    function getViewProductLabel(
        displayName
    ) {
        const language =
            getCurrentLanguage();

        return translate(
            "productsPage.card.viewProductTemplate",

            language === "zh"
                ? "查看商品 {{product}}"
                : "Lihat produk {{product}}",

            {
                product:
                    displayName
            }
        );
    }

    /* ======================================================
       CURRENCY
    ====================================================== */

    function formatCurrency(value) {
        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .formatCurrency ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .formatCurrency(
                        value
                    );
            } catch (_error) {
                /*
                 * Gunakan fallback Intl.
                 */
            }
        }

        const number =
            normalizePrice(
                value
            );

        try {
            return new Intl.NumberFormat(
                "id-ID",
                {
                    style:
                        "currency",

                    currency:
                        "IDR",

                    minimumFractionDigits:
                        0,

                    maximumFractionDigits:
                        0
                }
            ).format(
                number
            );
        } catch (_error) {
            return `Rp ${Math.round(number)
                .toLocaleString("id-ID")}`;
        }
    }

    /* ======================================================
       ASSET PATH
    ====================================================== */

    function resolveAssetPath(path) {
        const value =
            normalizeText(
                path
            );

        if (!value) {
            return "";
        }

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .resolveAssetPath ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .resolveAssetPath(
                        value
                    );
            } catch (_error) {
                /*
                 * Gunakan path asli.
                 */
            }
        }

        return value;
    }

    /* ======================================================
       TARGET
    ====================================================== */

    function resolveTarget(
        target,
        showWarning = true
    ) {
        if (
            target instanceof
            Element
        ) {
            return target;
        }

        if (
            typeof target !==
                "string" ||
            !target.trim()
        ) {
            if (showWarning) {
                console.warn(
                    "ProductCardComponent: target tidak valid."
                );
            }

            return null;
        }

        const value =
            target.trim();

        const id =
            value.startsWith("#")
                ? value.slice(1)
                : value;

        const byId =
            document.getElementById(
                id
            );

        if (byId) {
            return byId;
        }

        let element = null;

        try {
            element =
                document.querySelector(
                    value
                );
        } catch (_error) {
            element = null;
        }

        if (
            !element &&
            showWarning
        ) {
            console.warn(
                `ProductCardComponent: target "${value}" tidak ditemukan.`
            );
        }

        return element;
    }

    /* ======================================================
       CARD REGISTRY
    ====================================================== */

    function unregisterCardsInside(
        target
    ) {
        target
            .querySelectorAll(
                "[data-product-card='true']"
            )
            .forEach(
                unregisterCard
            );
    }

    function unregisterCard(card) {
        if (
            !(
                card instanceof
                Element
            )
        ) {
            return false;
        }

        const cardId =
            card.dataset
                .productCardId ||
            "";

        return cardId
            ? activeCards.delete(
                cardId
            )
            : false;
    }

    function createCardId(productId) {
        cardCounter += 1;

        return [
            "product-card",

            sanitizeId(
                productId
            ) ||
            "item",

            cardCounter
        ].join("-");
    }

    function getActiveCount() {
        pruneDisconnectedCards();

        return activeCards.size;
    }

    function getActiveElements() {
        pruneDisconnectedCards();

        return Array.from(
            activeCards.values()
        )
            .map(
                state =>
                    state.element
            )
            .filter(
                element =>
                    element instanceof
                    Element
            );
    }

    function pruneDisconnectedCards() {
        activeCards.forEach(
            (state, cardId) => {
                if (
                    !(
                        state.element instanceof
                        Element
                    ) ||
                    !state.element
                        .isConnected
                ) {
                    activeCards.delete(
                        cardId
                    );
                }
            }
        );
    }

    /* ======================================================
       LANGUAGE
    ====================================================== */

    function getCurrentLanguage() {
        if (
            window.Language &&
            typeof window.Language
                .getLanguage ===
                "function"
        ) {
            try {
                return normalizeLanguage(
                    window.Language
                        .getLanguage()
                );
            } catch (_error) {
                /*
                 * Gunakan config fallback.
                 */
            }
        }

        return normalizeLanguage(
            window.GomaiConfig
                ?.language
                ?.default ||

            document.documentElement
                ?.lang ||

            "zh"
        );
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
            window.Language &&
            typeof window.Language
                .translate ===
                "function"
        ) {
            try {
                const translated =
                    window.Language
                        .translate(
                            key,
                            fallback,
                            parameters
                        );

                if (
                    translated !==
                        undefined &&
                    translated !==
                        null
                ) {
                    return String(
                        translated
                    );
                }
            } catch (error) {
                console.warn(
                    `ProductCardComponent: terjemahan "${key}" gagal.`,
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
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .interpolate ===
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

        if (
            !isPlainObject(
                parameters
            )
        ) {
            return String(
                text ||
                ""
            );
        }

        return Object.entries(
            parameters
        ).reduce(
            (
                result,
                [key, value]
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
       DEPENDENCY VALIDATION
    ====================================================== */

    function validateDependencies() {
        if (!window.GomaiUtils) {
            throw new Error(
                "ProductCardComponent membutuhkan GomaiUtils."
            );
        }

        if (!window.Language) {
            throw new Error(
                "ProductCardComponent membutuhkan Language."
            );
        }
    }

    /* ======================================================
       CLONE
    ====================================================== */

    function cloneOptionsForRegistry(
        options
    ) {
        /*
         * Map / callback / brand lookup sengaja dipertahankan
         * sebagai reference karena structuredClone tidak dapat
         * menyalin function dan tidak diperlukan di sini.
         */
        return {
            ...options
        };
    }

    function cloneSafe(value) {
        if (
            value ===
            undefined
        ) {
            return undefined;
        }

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .cloneData ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .cloneData(
                        value
                    );
            } catch (_error) {
                /*
                 * Gunakan structuredClone.
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
                 * Gunakan shallow fallback.
                 */
            }
        }

        if (
            Array.isArray(
                value
            )
        ) {
            return [
                ...value
            ];
        }

        if (
            isPlainObject(
                value
            )
        ) {
            return {
                ...value
            };
        }

        return value;
    }

    /* ======================================================
       PLAIN OBJECT
    ====================================================== */

    function isPlainObject(value) {
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
       REGISTRY LIFECYCLE CONTEXT
    ====================================================== */

    function isRegistryLifecycleContext(
        value
    ) {
        if (
            !isPlainObject(
                value
            )
        ) {
            return false;
        }

        return Boolean(
            Object.prototype
                .hasOwnProperty
                .call(
                    value,
                    "registry"
                ) ||

            Object.prototype
                .hasOwnProperty
                .call(
                    value,
                    "reason"
                ) ||

            Object.prototype
                .hasOwnProperty
                .call(
                    value,
                    "context"
                ) ||

            Object.prototype
                .hasOwnProperty
                .call(
                    value,
                    "name"
                )
        );
    }

    /* ======================================================
       ERROR
    ====================================================== */

    function normalizeError(error) {
        return error instanceof Error
            ? error
            : new Error(
                String(
                    error ||
                    "Terjadi kesalahan pada ProductCardComponent."
                )
            );
    }

    /* ======================================================
       EVENT
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
                        component:
                            publicAPI,

                        version:
                            VERSION,

                        timestamp:
                            Date.now(),

                        ...(isPlainObject(
                            detail
                        )
                            ? detail
                            : {})
                    }
                }
            )
        );
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

            create,

            render,

            append,

            replace,

            destroy,

            destroyAll,

            refresh,

            refreshAll,

            getActiveCount,

            getActiveElements
        });

    return publicAPI;
})();

window.ProductCardComponent =
    ProductCardComponent;