"use strict";

/* ==========================================================
   GOMAI BRAND CARD COMPONENT
   js/components/brand-card.js

   Renderer kartu brand reusable.
   Data diterima dari controller/model layer; file ini tidak
   membaca brands.json dan tidak memanggil BrandsModel.
========================================================== */

const BrandCardComponent = (() => {
    const VERSION = "2.0.0";

    const EVENTS = Object.freeze({
        CREATED: "gomai:brand-card-created",
        RENDERED: "gomai:brand-cards-rendered",
        CLICKED: "gomai:brand-click",
        HERO_ERROR: "gomai:brand-card-hero-error",
        LOGO_ERROR: "gomai:brand-card-logo-error",
        DESTROYED: "gomai:brand-card-destroyed",
        REFRESHED: "gomai:brand-card-refreshed",
        ERROR: "gomai:brand-card-error"
    });

    const DEFAULT_OPTIONS = Object.freeze({
        showLogo: true,
        showDescription: true,
        showAction: true,
        showBadge: false,

        imageLoading: "lazy",
        imageDecoding: "async",
        logoLoading: "lazy",

        className: "",
        imageClassName: "",
        contentClassName: "",

        actionClassName:
            "brand-card-link",

        badgeClassName:
            "badge badge-warning brand-card-badge",

        actionTranslationKey:
            "brands.viewBrand",

        actionFallback:
            "",

        onClick:
            null
    });

    const activeCards =
        new Map();

    let cardCounter =
        0;


    /* ======================================================
       CREATE
    ====================================================== */

    function create(
        brand,
        options = {}
    ) {
        validateDependencies();

        const normalizedBrand =
            normalizeBrand(
                brand
            );

        const settings =
            normalizeOptions(
                options
            );

        const cardId =
            createCardId(
                normalizedBrand.id
            );

        const element =
            createCardElement(
                normalizedBrand,
                settings,
                cardId
            );

        activeCards.set(
            cardId,
            {
                element,

                brand:
                    cloneSafe(
                        normalizedBrand
                    ),

                options: {
                    ...settings
                }
            }
        );

        dispatch(
            EVENTS.CREATED,
            {
                cardId,

                brand:
                    cloneSafe(
                        normalizedBrand
                    ),

                element
            }
        );

        return element;
    }


    /* ======================================================
       RENDER

       Format utama:

       BrandCardComponent.render({
           target: "brand-grid",
           brands: [...]
       });

       Compatibility:

       BrandCardComponent.render(
           "brand-grid",
           brands,
           options
       );
    ====================================================== */

    function render(
        input = {},
        brandList = null,
        extraOptions = {}
    ) {
        validateDependencies();

        const options =
            normalizeRenderArguments(
                input,
                brandList,
                extraOptions
            );

        const target =
            resolveTarget(
                options.target
            );

        if (!target) {
            return [];
        }

        const brands =
            Array.isArray(
                options.brands
            )
                ? options.brands
                : [];

        const clearTarget =
            options.clearTarget !==
            false;

        const cardOptions =
            extractCardOptions(
                options
            );

        if (clearTarget) {
            unregisterCardsInside(
                target
            );

            target.replaceChildren();
        }

        const fragment =
            document.createDocumentFragment();

        const cards =
            [];

        brands.forEach(
            brand => {
                try {
                    const card =
                        create(
                            brand,
                            cardOptions
                        );

                    cards.push(
                        card
                    );

                    fragment.append(
                        card
                    );
                } catch (error) {
                    const normalizedError =
                        normalizeError(
                            error
                        );

                    console.error(
                        "BrandCardComponent: brand gagal dirender.",
                        normalizedError,
                        brand
                    );

                    dispatch(
                        EVENTS.ERROR,
                        {
                            error:
                                normalizedError,

                            brand:
                                cloneSafe(
                                    brand
                                )
                        }
                    );
                }
            }
        );

        target.append(
            fragment
        );

        target.hidden =
            false;

        target.setAttribute(
            "aria-busy",
            "false"
        );

        dispatch(
            EVENTS.RENDERED,
            {
                target,

                count:
                    cards.length,

                brands:
                    brands.map(
                        cloneSafe
                    )
            }
        );

        return cards;
    }


    /* ======================================================
       APPEND
    ====================================================== */

    function append(
        target,
        brands,
        options = {}
    ) {
        return render({
            ...(
                isPlainObject(
                    options
                )
                    ? options
                    : {}
            ),

            target,

            brands:
                Array.isArray(
                    brands
                )
                    ? brands
                    : [brands],

            clearTarget:
                false
        });
    }


    /* ======================================================
       REPLACE
    ====================================================== */

    function replace(
        target,
        brands,
        options = {}
    ) {
        return render({
            ...(
                isPlainObject(
                    options
                )
                    ? options
                    : {}
            ),

            target,

            brands:
                Array.isArray(
                    brands
                )
                    ? brands
                    : [brands],

            clearTarget:
                true
        });
    }


    /* ======================================================
       DESTROY
    ====================================================== */

    function destroy(
        target = null
    ) {
        /*
         * ComponentRegistry dapat mengirim lifecycle context,
         * bukan target DOM.
         */
        if (
            target === null ||
            target === undefined ||
            isRegistryLifecycleContext(
                target
            )
        ) {
            return destroyAll();
        }

        const element =
            resolveTarget(
                target,
                false
            );

        if (!element) {
            return false;
        }

        if (
            element.matches?.(
                "[data-brand-card='true']"
            )
        ) {
            destroyCardElement(
                element
            );

            return true;
        }

        const cards =
            Array.from(
                element.querySelectorAll(
                    "[data-brand-card='true']"
                )
            );

        cards.forEach(
            destroyCardElement
        );

        return cards.length >
            0;
    }


    /* ======================================================
       DESTROY ALL
    ====================================================== */

    function destroyAll() {
        const entries =
            Array.from(
                activeCards.entries()
            );

        entries.forEach(
            ([
                cardId,
                state
            ]) => {
                const element =
                    state.element;

                const brandId =
                    state.brand?.id ||
                    element?.dataset
                        ?.brandId ||
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

                        brandId,

                        element:
                            element ||
                            null
                    }
                );
            }
        );

        return entries.length >
            0;
    }


    /* ======================================================
       DESTROY CARD
    ====================================================== */

    function destroyCardElement(
        card
    ) {
        const cardId =
            card.dataset
                .brandCardId ||
            "";

        const brandId =
            card.dataset
                .brandId ||
            "";

        unregisterCard(
            card
        );

        card.remove();

        dispatch(
            EVENTS.DESTROYED,
            {
                cardId,
                brandId,
                element:
                    card
            }
        );
    }


    /* ======================================================
       REFRESH
    ====================================================== */

    function refresh(
        target
    ) {
        const element =
            resolveTarget(
                target,
                false
            );

        if (!element) {
            return null;
        }

        if (
            element.matches?.(
                "[data-brand-card='true']"
            )
        ) {
            return refreshCardElement(
                element
            );
        }

        let firstRefreshed =
            null;

        element
            .querySelectorAll(
                "[data-brand-card='true']"
            )
            .forEach(
                card => {
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
                }
            );

        return firstRefreshed;
    }


    /* ======================================================
       REFRESH ALL
    ====================================================== */

    function refreshAll() {
        const entries =
            Array.from(
                activeCards.entries()
            );

        let refreshed =
            0;

        entries.forEach(
            ([
                cardId,
                state
            ]) => {
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

                    return;
                }

                if (
                    refreshCardElement(
                        state.element
                    )
                ) {
                    refreshed +=
                        1;
                }
            }
        );

        return refreshed;
    }


    /*
     * Dipertahankan untuk compatibility API lama
     * dan ComponentRegistry.
     */
    function refreshLanguage() {
        return refreshAll();
    }


    /* ======================================================
       REFRESH CARD ELEMENT
    ====================================================== */

    function refreshCardElement(
        element
    ) {
        const cardId =
            element.dataset
                .brandCardId ||
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
                state.brand,
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

                brand:
                    cloneSafe(
                        state.brand
                    ),

                element:
                    replacement
            }
        );

        return replacement;
    }


    /* ======================================================
       CARD STRUCTURE
    ====================================================== */

    function createCardElement(
        brand,
        settings,
        cardId
    ) {
        const article =
            document.createElement(
                "article"
            );

        article.className =
            buildClassName(
                "brand-card",
                settings.className
            );

        article.dataset
            .brandCard =
            "true";

        article.dataset
            .brandCardId =
            cardId;

        article.dataset
            .brandId =
            brand.id;

        article.dataset
            .brandSlug =
            brand.slug;

        if (
            brand.featured
        ) {
            article.dataset
                .featured =
                "true";
        }

        article.append(
            createImageSection(
                brand,
                settings
            ),

            createContentSection(
                brand,
                settings
            )
        );

        return article;
    }


    /* ======================================================
       IMAGE SECTION
    ====================================================== */

    function createImageSection(
        brand,
        settings
    ) {
        const brandName =
            getBrandName(
                brand
            );

        const link =
            document.createElement(
                "a"
            );

        link.className =
            buildClassName(
                "brand-card-image",
                settings
                    .imageClassName
            );

        link.href =
            getBrandURL(
                brand
            );

        link.dataset
            .brandCardLink =
            "image";

        link.setAttribute(
            "aria-label",
            getViewBrandLabel(
                brandName
            )
        );

        bindBrandLinkEvent(
            link,
            brand,
            settings,
            "image"
        );

        link.append(
            brand.hero
                ? createHeroImage(
                    brand,
                    settings
                )
                : createHeroPlaceholder(
                    brand
                )
        );

        if (
            settings.showBadge &&
            brand.featured
        ) {
            link.append(
                createFeaturedBadge(
                    settings
                )
            );
        }

        return link;
    }


    /* ======================================================
       HERO IMAGE
    ====================================================== */

    function createHeroImage(
        brand,
        settings
    ) {
        const image =
            document.createElement(
                "img"
            );

        const source =
            resolveAssetPath(
                brand.hero
            );

        image.src =
            source;

        image.alt =
            getHeroAlt(
                getBrandName(
                    brand
                )
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
                const parent =
                    image.parentElement;

                image.remove();

                if (
                    parent &&
                    !parent.querySelector(
                        ".brand-card-image-placeholder"
                    )
                ) {
                    parent.prepend(
                        createHeroPlaceholder(
                            brand
                        )
                    );
                }

                dispatch(
                    EVENTS.HERO_ERROR,
                    {
                        brand:
                            cloneSafe(
                                brand
                            ),

                        source,

                        element:
                            parent ||
                            null
                    }
                );
            },
            {
                once:
                    true
            }
        );

        return image;
    }


    /* ======================================================
       HERO PLACEHOLDER
    ====================================================== */

    function createHeroPlaceholder(
        brandInput
    ) {
        const brand =
            normalizeBrand(
                brandInput
            );

        const brandName =
            getBrandName(
                brand
            );

        const placeholder =
            document.createElement(
                "div"
            );

        const mark =
            document.createElement(
                "span"
            );

        placeholder.className =
            "brand-card-image-placeholder";

        placeholder.style
            .background =
            createBrandGradient(
                brand
            );

        placeholder.setAttribute(
            "role",
            "img"
        );

        placeholder.setAttribute(
            "aria-label",
            getHeroAlt(
                brandName
            )
        );

        mark.className =
            "brand-card-placeholder-mark";

        mark.textContent =
            getBrandInitial(
                brandName
            );

        mark.setAttribute(
            "aria-hidden",
            "true"
        );

        placeholder.append(
            mark
        );

        return placeholder;
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
                settings
                    .badgeClassName
            );

        badge.textContent =
            translate(
                "common.featured",

                getCurrentLanguage() ===
                    "zh"
                    ? "精选"
                    : "Pilihan"
            );

        return badge;
    }


    /* ======================================================
       CONTENT SECTION
    ====================================================== */

    function createContentSection(
        brand,
        settings
    ) {
        const content =
            document.createElement(
                "div"
            );

        const copy =
            document.createElement(
                "div"
            );

        content.className =
            buildClassName(
                "brand-card-content",
                settings
                    .contentClassName
            );

        if (
            settings.showLogo
        ) {
            content.append(
                createLogoSection(
                    brand,
                    settings
                )
            );
        }

        copy.className =
            "brand-card-copy";

        copy.append(
            createBrandName(
                brand,
                settings
            )
        );

        if (
            settings
                .showDescription
        ) {
            const description =
                createDescription(
                    brand
                );

            if (
                description
            ) {
                copy.append(
                    description
                );
            }
        }

        content.append(
            copy
        );

        if (
            settings.showAction
        ) {
            content.append(
                createAction(
                    brand,
                    settings
                )
            );
        }

        return content;
    }


    /* ======================================================
       LOGO
    ====================================================== */

    function createLogoSection(
        brand,
        settings = {}
    ) {
        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "brand-card-logo-wrap";

        if (
            !brand.logo
        ) {
            wrapper.append(
                createLogoFallback(
                    brand
                )
            );

            return wrapper;
        }

        const image =
            document.createElement(
                "img"
            );

        const source =
            resolveAssetPath(
                brand.logo
            );

        image.className =
            "brand-card-logo";

        image.src =
            source;

        image.alt =
            getLogoAlt(
                getBrandName(
                    brand
                )
            );

        image.loading =
            normalizeImageLoading(
                settings.logoLoading ||
                "lazy"
            );

        image.decoding =
            "async";

        image.addEventListener(
            "error",
            () => {
                const fallback =
                    createLogoFallback(
                        brand
                    );

                image.replaceWith(
                    fallback
                );

                dispatch(
                    EVENTS.LOGO_ERROR,
                    {
                        brand:
                            cloneSafe(
                                brand
                            ),

                        source,

                        element:
                            fallback
                    }
                );
            },
            {
                once:
                    true
            }
        );

        wrapper.append(
            image
        );

        return wrapper;
    }


    /* ======================================================
       LOGO FALLBACK
    ====================================================== */

    function createLogoFallback(
        brandInput
    ) {
        const brand =
            normalizeBrand(
                brandInput
            );

        const brandName =
            getBrandName(
                brand
            );

        const fallback =
            document.createElement(
                "span"
            );

        fallback.className =
            "brand-card-logo-fallback";

        fallback.textContent =
            getBrandInitial(
                brandName
            );

        fallback.setAttribute(
            "role",
            "img"
        );

        fallback.setAttribute(
            "aria-label",
            getLogoAlt(
                brandName
            )
        );

        return fallback;
    }


    /* ======================================================
       BRAND NAME
    ====================================================== */

    function createBrandName(
        brand,
        settings
    ) {
        const heading =
            document.createElement(
                "h3"
            );

        const link =
            document.createElement(
                "a"
            );

        const brandName =
            getBrandName(
                brand
            );

        link.href =
            getBrandURL(
                brand
            );

        link.textContent =
            brandName;

        link.dataset
            .brandCardLink =
            "name";

        link.setAttribute(
            "aria-label",
            getViewBrandLabel(
                brandName
            )
        );

        bindBrandLinkEvent(
            link,
            brand,
            settings,
            "name"
        );

        heading.append(
            link
        );

        return heading;
    }


    /* ======================================================
       DESCRIPTION
    ====================================================== */

    function createDescription(
        brand
    ) {
        const text =
            getBrandDescription(
                brand
            );

        if (!text) {
            return null;
        }

        const description =
            document.createElement(
                "p"
            );

        description.className =
            "brand-card-description";

        description.textContent =
            text;

        return description;
    }


    /* ======================================================
       ACTION
    ====================================================== */

    function createAction(
        brand,
        settings
    ) {
        const link =
            document.createElement(
                "a"
            );

        const brandName =
            getBrandName(
                brand
            );

        const fallback =
            settings.actionFallback ||
            (
                getCurrentLanguage() ===
                    "zh"
                    ? "查看品牌"
                    : "Lihat Brand"
            );

        link.href =
            getBrandURL(
                brand
            );

        link.className =
            buildClassName(
                settings
                    .actionClassName
            );

        link.dataset
            .brandCardLink =
            "action";

        link.textContent =
            translate(
                settings
                    .actionTranslationKey,
                fallback
            );

        link.setAttribute(
            "aria-label",
            getViewBrandLabel(
                brandName
            )
        );

        bindBrandLinkEvent(
            link,
            brand,
            settings,
            "action"
        );

        return link;
    }


    /* ======================================================
       INTERACTION
    ====================================================== */

    function bindBrandLinkEvent(
        element,
        brand,
        settings,
        source
    ) {
        element.addEventListener(
            "click",
            event => {
                const detail = {
                    brand:
                        cloneSafe(
                            brand
                        ),

                    brandId:
                        brand.id,

                    source,

                    destination:
                        element.href ||
                        "",

                    element,

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
                            result ===
                            false
                        ) {
                            event.preventDefault();
                        } else if (
                            result &&
                            typeof result
                                .catch ===
                                "function"
                        ) {
                            result.catch(
                                error =>
                                    handleInteractionError(
                                        error,
                                        detail
                                    )
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
            "BrandCardComponent: callback klik gagal.",
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
       BRAND NORMALIZATION
    ====================================================== */

    function normalizeBrand(
        brand
    ) {
        if (
            !isPlainObject(
                brand
            )
        ) {
            throw new TypeError(
                "BrandCardComponent membutuhkan object brand."
            );
        }

        const id =
            normalizeIdentifier(
                brand.id ||
                brand.slug
            );

        if (!id) {
            throw new Error(
                "Brand harus memiliki id atau slug."
            );
        }

        const slug =
            normalizeIdentifier(
                brand.slug ||
                id
            );

        const localizedName =
            normalizeLocalizedText(
                brand.localizedName ||
                brand.name,
                id
            );

        const canonicalName =
            normalizeText(
                typeof brand.name ===
                "string"
                    ? brand.name
                    : (
                        localizedName.zh ||
                        localizedName.id ||
                        id
                    )
            );

        const theme =
            isPlainObject(
                brand.theme
            )
                ? brand.theme
                : {};

        const display =
            isPlainObject(
                brand.display
            )
                ? brand.display
                : {};

        return {
            ...brand,

            id,

            slug,

            name:
                canonicalName ||
                id,

            localizedName,

            description:
                normalizeLocalizedText(
                    brand.description,
                    ""
                ),

            logo:
                normalizeText(
                    brand.logo ||
                    brand.logoPath
                ),

            hero:
                normalizeText(
                    brand.hero ||
                    brand.heroImage ||
                    brand.heroPath
                ),

            primaryColor:
                normalizeColor(
                    brand.primaryColor ||
                    theme.primaryColor ||
                    theme.primary,
                    "#111111"
                ),

            accentColor:
                normalizeColor(
                    brand.accentColor ||
                    theme.accentColor ||
                    theme.accent,
                    "#f5b400"
                ),

            featured:
                normalizeBoolean(
                    brand.featured,
                    normalizeBoolean(
                        display.featured,
                        false
                    )
                ),

            active:
                normalizeBoolean(
                    brand.active,
                    true
                ),

            sortOrder:
                normalizeNumber(
                    brand.sortOrder,
                    9999
                )
        };
    }


    /* ======================================================
       OPTIONS
    ====================================================== */

    function normalizeOptions(
        options
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

            showLogo:
                source.showLogo !==
                undefined
                    ? Boolean(
                        source.showLogo
                    )
                    : DEFAULT_OPTIONS
                        .showLogo,

            showDescription:
                source.showDescription !==
                undefined
                    ? Boolean(
                        source.showDescription
                    )
                    : DEFAULT_OPTIONS
                        .showDescription,

            showAction:
                source.showAction !==
                undefined
                    ? Boolean(
                        source.showAction
                    )
                    : DEFAULT_OPTIONS
                        .showAction,

            showBadge:
                source.showBadge !==
                undefined
                    ? Boolean(
                        source.showBadge
                    )
                    : DEFAULT_OPTIONS
                        .showBadge,

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

            logoLoading:
                normalizeImageLoading(
                    source.logoLoading ||
                    DEFAULT_OPTIONS
                        .logoLoading
                ),

            className:
                buildClassName(
                    source.className
                ),

            imageClassName:
                buildClassName(
                    source.imageClassName
                ),

            contentClassName:
                buildClassName(
                    source.contentClassName
                ),

            actionClassName:
                buildClassName(
                    source.actionClassName ||
                    DEFAULT_OPTIONS
                        .actionClassName
                ),

            badgeClassName:
                buildClassName(
                    source.badgeClassName ||
                    DEFAULT_OPTIONS
                        .badgeClassName
                ),

            actionTranslationKey:
                normalizeText(
                    source
                        .actionTranslationKey ||
                    DEFAULT_OPTIONS
                        .actionTranslationKey
                ),

            actionFallback:
                normalizeText(
                    source.actionFallback
                ),

            onClick:
                typeof source.onClick ===
                "function"
                    ? source.onClick
                    : null
        };
    }


    /* ======================================================
       RENDER ARGUMENT NORMALIZATION
    ====================================================== */

    function normalizeRenderArguments(
        input,
        brandList,
        extraOptions
    ) {
        if (
            input instanceof
            Element ||
            typeof input ===
            "string"
        ) {
            return {
                ...(
                    isPlainObject(
                        extraOptions
                    )
                        ? extraOptions
                        : {}
                ),

                target:
                    input,

                brands:
                    Array.isArray(
                        brandList
                    )
                        ? brandList
                        : []
            };
        }

        return isPlainObject(
            input
        )
            ? {
                ...input
            }
            : {};
    }


    function extractCardOptions(
        renderOptions
    ) {
        const options = {
            ...renderOptions
        };

        delete options.target;
        delete options.brands;
        delete options.clearTarget;

        return options;
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
            "string" ||
            typeof value ===
            "number"
        ) {
            const text =
                normalizeText(
                    value
                ) ||
                fallbackText;

            return {
                id:
                    text,

                zh:
                    text
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


    /* ======================================================
       BOOLEAN
    ====================================================== */

    function normalizeBoolean(
        value,
        fallback = false
    ) {
        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return Boolean(
                fallback
            );
        }

        if (
            typeof value ===
            "string"
        ) {
            const normalized =
                value
                    .trim()
                    .toLowerCase();

            if (
                [
                    "false",
                    "0",
                    "no",
                    "off",
                    "inactive"
                ].includes(
                    normalized
                )
            ) {
                return false;
            }

            if (
                [
                    "true",
                    "1",
                    "yes",
                    "on",
                    "active"
                ].includes(
                    normalized
                )
            ) {
                return true;
            }
        }

        return Boolean(
            value
        );
    }


    /* ======================================================
       BASIC NORMALIZATION
    ====================================================== */

    function normalizeNumber(
        value,
        fallback = 0
    ) {
        const number =
            Number(
                value
            );

        return Number.isFinite(
            number
        )
            ? number
            : fallback;
    }


    function normalizeIdentifier(
        value
    ) {
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


    function normalizeText(
        value
    ) {
        return String(
            value ??
            ""
        ).trim();
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
                .split("-")[0];

        return language ===
            "id"
                ? "id"
                : "zh";
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


    function normalizeColor(
        value,
        fallback
    ) {
        const color =
            normalizeText(
                value ||
                fallback
            );

        if (!color) {
            return fallback;
        }

        if (
            window.CSS &&
            typeof window.CSS
                .supports ===
                "function"
        ) {
            try {
                return window.CSS
                    .supports(
                        "color",
                        color
                    )
                    ? color
                    : fallback;
            } catch (_error) {
                return fallback;
            }
        }

        return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
            .test(
                color
            )
                ? color
                : fallback;
    }


    /* ======================================================
       BRAND DATA HELPERS
    ====================================================== */

    function getBrandName(
        brand,
        language =
            getCurrentLanguage()
    ) {
        return (
            getLocalizedText(
                brand.localizedName,
                language
            ) ||

            normalizeText(
                brand.name
            ) ||

            normalizeText(
                brand.id
            ) ||

            "Gomai"
        );
    }


    function getBrandDescription(
        brand,
        language =
            getCurrentLanguage()
    ) {
        return getLocalizedText(
            brand.description,
            language
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
       BRAND URL
    ====================================================== */

    function getBrandURL(
        brand
    ) {
        const queryKey =
            window.GomaiConfig
                ?.query
                ?.brandId ||
            "id";

        try {
            const route =
                window.GomaiUtils
                    .buildRoute(
                        "brand",
                        {
                            [queryKey]:
                                brand.id
                        }
                    );

            if (route) {
                return route;
            }
        } catch (error) {
            console.warn(
                "BrandCardComponent: gagal membentuk URL brand.",
                error
            );
        }

        const fallback =
            `pages/brand.html?${encodeURIComponent(
                queryKey
            )}=${encodeURIComponent(
                brand.id
            )}`;

        if (
            typeof window.GomaiUtils
                ?.resolveProjectPath ===
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
       BRAND INITIAL
    ====================================================== */

    function getBrandInitial(
        name
    ) {
        const normalized =
            normalizeText(
                name
            );

        return normalized
            ? (
                Array.from(
                    normalized
                )[0]
                    ?.toLocaleUpperCase() ||
                "G"
            )
            : "G";
    }


    /* ======================================================
       PLACEHOLDER GRADIENT
    ====================================================== */

    function createBrandGradient(
        brand
    ) {
        const primary =
            brand.primaryColor ||
            "#111111";

        const secondary =
            adjustColorOpacity(
                primary,
                0.76
            );

        return (
            `linear-gradient(` +
            `135deg, ` +
            `${primary} 0%, ` +
            `${secondary} 55%, ` +
            `#262626 100%` +
            `)`
        );
    }


    function adjustColorOpacity(
        color,
        opacity
    ) {
        const normalized =
            normalizeText(
                color
            );

        const clampedOpacity =
            Math.min(
                1,
                Math.max(
                    0,
                    Number(
                        opacity
                    ) ||
                    0
                )
            );

        const sixDigit =
            normalized.match(
                /^#([0-9a-f]{6})$/i
            );

        const threeDigit =
            normalized.match(
                /^#([0-9a-f]{3})$/i
            );

        let hex =
            "";

        if (
            sixDigit
        ) {
            hex =
                sixDigit[1];
        } else if (
            threeDigit
        ) {
            hex =
                threeDigit[1]
                    .split("")
                    .map(
                        character =>
                            character +
                            character
                    )
                    .join("");
        } else {
            return normalized ||
                "#111111";
        }

        const red =
            parseInt(
                hex.slice(
                    0,
                    2
                ),
                16
            );

        const green =
            parseInt(
                hex.slice(
                    2,
                    4
                ),
                16
            );

        const blue =
            parseInt(
                hex.slice(
                    4,
                    6
                ),
                16
            );

        return (
            `rgba(` +
            `${red}, ` +
            `${green}, ` +
            `${blue}, ` +
            `${clampedOpacity}` +
            `)`
        );
    }


    /* ======================================================
       ACCESSIBILITY TEXT
    ====================================================== */

    function getViewBrandLabel(
        brandName
    ) {
        return translate(
            "brands.ariaViewBrandTemplate",

            getCurrentLanguage() ===
                "zh"
                ? "查看品牌 {{brand}}"
                : "Lihat brand {{brand}}",

            {
                brand:
                    brandName
            }
        );
    }


    function getHeroAlt(
        brandName
    ) {
        return translate(
            "hero.imageAltTemplate",

            getCurrentLanguage() ===
                "zh"
                ? "{{brand}} 系列"
                : "Koleksi {{brand}}",

            {
                brand:
                    brandName
            }
        );
    }


    function getLogoAlt(
        brandName
    ) {
        return translate(
            "hero.logoAltTemplate",

            getCurrentLanguage() ===
                "zh"
                ? "{{brand}} 标志"
                : "Logo {{brand}}",

            {
                brand:
                    brandName
            }
        );
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
            if (
                showWarning
            ) {
                console.warn(
                    "BrandCardComponent: target tidak valid."
                );
            }

            return null;
        }

        const value =
            target.trim();

        const id =
            value.startsWith(
                "#"
            )
                ? value.slice(
                    1
                )
                : value;

        const byId =
            document.getElementById(
                id
            );

        if (byId) {
            return byId;
        }

        let element =
            null;

        try {
            element =
                document.querySelector(
                    value
                );
        } catch (_error) {
            element =
                null;
        }

        if (
            !element &&
            showWarning
        ) {
            console.warn(
                `BrandCardComponent: target "${value}" tidak ditemukan.`
            );
        }

        return element;
    }


    /* ======================================================
       ACTIVE REGISTRY
    ====================================================== */

    function unregisterCardsInside(
        target
    ) {
        target
            .querySelectorAll(
                "[data-brand-card='true']"
            )
            .forEach(
                unregisterCard
            );
    }


    function unregisterCard(
        card
    ) {
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
                .brandCardId ||
            "";

        return cardId
            ? activeCards.delete(
                cardId
            )
            : false;
    }


    function createCardId(
        brandId
    ) {
        cardCounter +=
            1;

        return (
            `brand-card-` +
            `${sanitizeId(
                brandId
            ) || "item"}-` +
            `${cardCounter}`
        );
    }


    function sanitizeId(
        value
    ) {
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


    /*
     * Compatibility API lama:
     * hanya membersihkan registry,
     * tidak menghapus elemen DOM.
     */
    function clearRegistry() {
        activeCards.clear();

        return true;
    }


    function getActiveCardCount() {
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
            (
                state,
                cardId
            ) => {
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
       ASSET PATH
    ====================================================== */

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
                    `BrandCardComponent: terjemahan "${key}" gagal.`,
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
       DEPENDENCIES
    ====================================================== */

    function validateDependencies() {
        if (
            !window.GomaiUtils
        ) {
            throw new Error(
                "BrandCardComponent membutuhkan GomaiUtils."
            );
        }

        if (
            typeof window.GomaiUtils
                .buildRoute !==
                "function"
        ) {
            throw new Error(
                "BrandCardComponent membutuhkan GomaiUtils.buildRoute()."
            );
        }

        if (
            !window.Language
        ) {
            throw new Error(
                "BrandCardComponent membutuhkan Language."
            );
        }
    }


    /* ======================================================
       CLASS NAME
    ====================================================== */

    function buildClassName(
        ...values
    ) {
        return [
            ...new Set(
                values
                    .flatMap(
                        value =>
                            Array.isArray(
                                value
                            )
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
       CLONE
    ====================================================== */

    function cloneSafe(
        value
    ) {
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
                 * Gunakan shallow clone.
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

    function normalizeError(
        error
    ) {
        return error instanceof
        Error
            ? error
            : new Error(
                String(
                    error ||
                    "Terjadi kesalahan pada BrandCardComponent."
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

            createHeroPlaceholder,

            createLogoFallback,

            refresh,

            refreshAll,

            refreshLanguage,

            normalizeBrand,

            clearRegistry,

            getActiveCardCount,

            getActiveElements
        });

    return publicAPI;
})();


window.BrandCardComponent =
    BrandCardComponent;