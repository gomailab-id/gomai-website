"use strict";

/* ==========================================================
   GOMAI LOADING COMPONENT
   js/components/loading.js

   Tanggung jawab:
   - Membuat spinner loading reusable
   - Membuat loading state
   - Membuat skeleton produk
   - Membuat skeleton brand
   - Membuat skeleton hero
   - Membuat skeleton product detail
   - Merender loading ke target
   - Menandai aria-busy pada target
   - Membersihkan loading dengan aman

   Komponen ini:
   - Tidak membaca JSON
   - Tidak melakukan fetch
   - Tidak bergantung pada model
   - Tidak mengatur lifecycle halaman
   - Tidak menyimpan data bisnis

   Public API:
   - createSpinner()
   - createState()
   - createSkeletonLine()
   - createProductCard()
   - createProductCards()
   - createBrandCard()
   - createBrandCards()
   - createHero()
   - createProductDetail()
   - renderSpinner()
   - renderState()
   - renderProductCards()
   - renderBrandCards()
   - renderHero()
   - renderProductDetail()
   - clear()
   - isLoading()
========================================================== */

const LoadingComponent = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       CONSTANTS
    ====================================================== */

    const DEFAULT_PRODUCT_COUNT =
        8;


    const DEFAULT_BRAND_COUNT =
        6;


    const MAX_SKELETON_COUNT =
        24;


    const LOADING_NODE_ATTRIBUTE =
        "data-gomai-loading-node";


    const TYPES =
        Object.freeze({

            SPINNER:
                "spinner",

            STATE:
                "state",

            PRODUCTS:
                "products",

            BRANDS:
                "brands",

            HERO:
                "hero",

            PRODUCT_DETAIL:
                "product-detail"

        });


    /* ======================================================
       CREATE SPINNER
    ====================================================== */

    function createSpinner(
        options = {}
    ) {

        const settings = {

            label:
                translate(
                    "common.loading",
                    "加载中..."
                ),

            showLabel:
                true,

            className:
                "",

            ...(
                isPlainObject(
                    options
                )
                    ? options
                    : {}
            )

        };


        const label =
            normalizeText(
                settings.label
            ) ||
            translate(
                "common.loading",
                "加载中..."
            );


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            buildClassName(
                "loading",
                settings.className
            );


        markLoadingNode(
            wrapper
        );


        wrapper.setAttribute(
            "role",
            "status"
        );


        wrapper.setAttribute(
            "aria-live",
            "polite"
        );


        wrapper.setAttribute(
            "aria-atomic",
            "true"
        );


        const spinner =
            document.createElement(
                "span"
            );


        spinner.className =
            "loading-spinner";


        spinner.setAttribute(
            "aria-hidden",
            "true"
        );


        wrapper.append(
            spinner
        );


        if (
            settings.showLabel !==
            false
        ) {

            const labelElement =
                document.createElement(
                    "span"
                );


            labelElement.className =
                "loading-label";


            labelElement.textContent =
                label;


            wrapper.append(
                labelElement
            );

        } else {

            wrapper.setAttribute(
                "aria-label",
                label
            );

        }


        return wrapper;

    }


    /* ======================================================
       CREATE STATE
    ====================================================== */

    function createState(
        options = {}
    ) {

        const settings = {

            label:
                translate(
                    "common.loading",
                    "加载中..."
                ),

            className:
                "",

            ...(
                isPlainObject(
                    options
                )
                    ? options
                    : {}
            )

        };


        const container =
            document.createElement(
                "div"
            );


        container.className =
            buildClassName(
                "empty-state",
                "loading-state",
                settings.className
            );


        markLoadingNode(
            container
        );


        container.setAttribute(
            "role",
            "status"
        );


        container.setAttribute(
            "aria-live",
            "polite"
        );


        container.setAttribute(
            "aria-atomic",
            "true"
        );


        container.append(
            createSpinner({

                label:
                    settings.label,

                showLabel:
                    true

            })
        );


        return container;

    }


    /* ======================================================
       CREATE SKELETON LINE
    ====================================================== */

    function createSkeletonLine(
        options = {}
    ) {

        const settings = {

            variant:
                "text",

            width:
                "",

            height:
                "",

            className:
                "",

            ...(
                isPlainObject(
                    options
                )
                    ? options
                    : {}
            )

        };


        const line =
            document.createElement(
                "div"
            );


        line.className =
            buildClassName(
                "skeleton",
                getSkeletonVariantClass(
                    settings.variant
                ),
                settings.className
            );


        line.setAttribute(
            "aria-hidden",
            "true"
        );


        if (
            isValidDimension(
                settings.width
            )
        ) {

            line.style.width =
                normalizeText(
                    settings.width
                );

        }


        if (
            isValidDimension(
                settings.height
            )
        ) {

            line.style.height =
                normalizeText(
                    settings.height
                );

        }


        return line;

    }


    /* ======================================================
       CREATE PRODUCT CARD SKELETON
    ====================================================== */

    function createProductCard() {

        const article =
            document.createElement(
                "article"
            );


        article.className =
            "skeleton-card skeleton-product-card";


        article.setAttribute(
            "aria-hidden",
            "true"
        );


        markLoadingNode(
            article
        );


        const image =
            createSkeletonLine({

                variant:
                    "image"

            });


        const body =
            document.createElement(
                "div"
            );


        body.className =
            "skeleton-card-body";


        body.append(

            createSkeletonLine({

                width:
                    "34%"

            }),


            createSkeletonLine({

                variant:
                    "title",

                width:
                    "88%"

            }),


            createSkeletonLine({

                width:
                    "68%"

            }),


            createSkeletonLine({

                variant:
                    "title",

                width:
                    "48%"

            })

        );


        article.append(
            image,
            body
        );


        return article;

    }


    /* ======================================================
       CREATE PRODUCT CARDS
    ====================================================== */

    function createProductCards(
        count =
            DEFAULT_PRODUCT_COUNT
    ) {

        const fragment =
            document.createDocumentFragment();


        const total =
            normalizeCount(
                count,
                DEFAULT_PRODUCT_COUNT
            );


        for (
            let index = 0;
            index < total;
            index += 1
        ) {

            fragment.append(
                createProductCard()
            );

        }


        return fragment;

    }


    /* ======================================================
       CREATE BRAND CARD SKELETON
    ====================================================== */

    function createBrandCard() {

        const article =
            document.createElement(
                "article"
            );


        article.className =
            "skeleton-card skeleton-brand-card";


        article.setAttribute(
            "aria-hidden",
            "true"
        );


        markLoadingNode(
            article
        );


        const image =
            createSkeletonLine({

                variant:
                    "brand-image"

            });


        const body =
            document.createElement(
                "div"
            );


        body.className =
            "skeleton-card-body";


        body.append(

            createSkeletonLine({

                width:
                    "38%",

                height:
                    "44px"

            }),


            createSkeletonLine({

                variant:
                    "title",

                width:
                    "56%"

            }),


            createSkeletonLine({

                width:
                    "92%"

            }),


            createSkeletonLine({

                width:
                    "76%"

            })

        );


        article.append(
            image,
            body
        );


        return article;

    }


    /* ======================================================
       CREATE BRAND CARDS
    ====================================================== */

    function createBrandCards(
        count =
            DEFAULT_BRAND_COUNT
    ) {

        const fragment =
            document.createDocumentFragment();


        const total =
            normalizeCount(
                count,
                DEFAULT_BRAND_COUNT
            );


        for (
            let index = 0;
            index < total;
            index += 1
        ) {

            fragment.append(
                createBrandCard()
            );

        }


        return fragment;

    }


    /* ======================================================
       CREATE HERO SKELETON
    ====================================================== */

    function createHero(
        options = {}
    ) {

        const settings = {

            showLogo:
                true,

            showActions:
                true,

            className:
                "",

            ...(
                isPlainObject(
                    options
                )
                    ? options
                    : {}
            )

        };


        const hero =
            document.createElement(
                "div"
            );


        hero.className =
            buildClassName(
                "skeleton-hero",
                settings.className
            );


        hero.setAttribute(
            "aria-hidden",
            "true"
        );


        markLoadingNode(
            hero
        );


        const media =
            createSkeletonLine({

                variant:
                    "image",

                className:
                    "skeleton-hero-media"

            });


        const content =
            document.createElement(
                "div"
            );


        content.className =
            "skeleton-hero-content";


        if (
            settings.showLogo !==
            false
        ) {

            content.append(
                createSkeletonLine({

                    width:
                        "130px",

                    height:
                        "76px",

                    className:
                        "skeleton-hero-logo"

                })
            );

        }


        content.append(

            createSkeletonLine({

                width:
                    "120px",

                height:
                    "28px"

            }),


            createSkeletonLine({

                variant:
                    "title",

                width:
                    "72%",

                height:
                    "56px"

            }),


            createSkeletonLine({

                width:
                    "92%"

            }),


            createSkeletonLine({

                width:
                    "76%"

            })

        );


        if (
            settings.showActions !==
            false
        ) {

            const actions =
                document.createElement(
                    "div"
                );


            actions.className =
                "skeleton-hero-actions";


            actions.append(

                createSkeletonLine({

                    width:
                        "150px",

                    height:
                        "48px"

                }),


                createSkeletonLine({

                    width:
                        "150px",

                    height:
                        "48px"

                })

            );


            content.append(
                actions
            );

        }


        hero.append(
            media,
            content
        );


        return hero;

    }


    /* ======================================================
       CREATE PRODUCT DETAIL SKELETON
    ====================================================== */

    function createProductDetail(
        options = {}
    ) {

        const settings = {

            thumbnailCount:
                4,

            className:
                "",

            ...(
                isPlainObject(
                    options
                )
                    ? options
                    : {}
            )

        };


        const container =
            document.createElement(
                "div"
            );


        container.className =
            buildClassName(
                "skeleton-product-detail",
                settings.className
            );


        container.setAttribute(
            "aria-hidden",
            "true"
        );


        markLoadingNode(
            container
        );


        /* ==============================================
           GALLERY
        ============================================== */

        const gallery =
            document.createElement(
                "div"
            );


        gallery.className =
            "skeleton-product-gallery";


        gallery.append(
            createSkeletonLine({

                variant:
                    "image",

                className:
                    "skeleton-product-main-image"

            })
        );


        const thumbnails =
            document.createElement(
                "div"
            );


        thumbnails.className =
            "skeleton-product-thumbnails";


        const thumbnailCount =
            normalizeCount(
                settings.thumbnailCount,
                4
            );


        for (
            let index = 0;
            index < thumbnailCount;
            index += 1
        ) {

            thumbnails.append(
                createSkeletonLine({

                    variant:
                        "image",

                    width:
                        "72px",

                    height:
                        "72px"

                })
            );

        }


        gallery.append(
            thumbnails
        );


        /* ==============================================
           PRODUCT INFORMATION
        ============================================== */

        const information =
            document.createElement(
                "div"
            );


        information.className =
            "skeleton-product-information";


        information.append(

            createSkeletonLine({

                width:
                    "28%"

            }),


            createSkeletonLine({

                variant:
                    "title",

                width:
                    "86%",

                height:
                    "48px"

            }),


            createSkeletonLine({

                variant:
                    "title",

                width:
                    "42%",

                height:
                    "34px"

            }),


            createSkeletonLine({

                width:
                    "110px",

                height:
                    "28px"

            }),


            createSkeletonLine({

                width:
                    "100%",

                height:
                    "1px"

            }),


            createSkeletonLine({

                width:
                    "38%"

            }),


            createSkeletonLine({

                width:
                    "74%",

                height:
                    "44px"

            }),


            createSkeletonLine({

                width:
                    "32%"

            }),


            createSkeletonLine({

                width:
                    "88%",

                height:
                    "44px"

            }),


            createSkeletonLine({

                width:
                    "100%",

                height:
                    "54px"

            })

        );


        container.append(
            gallery,
            information
        );


        return container;

    }


    /* ======================================================
       RENDER SPINNER
    ====================================================== */

    function renderSpinner(
        target,
        options = {}
    ) {

        return renderIntoTarget(
            target,
            createSpinner(
                options
            ),
            TYPES.SPINNER
        );

    }


    /* ======================================================
       RENDER STATE
    ====================================================== */

    function renderState(
        target,
        options = {}
    ) {

        return renderIntoTarget(
            target,
            createState(
                options
            ),
            TYPES.STATE
        );

    }


    /* ======================================================
       RENDER PRODUCT CARDS
    ====================================================== */

    function renderProductCards(
        target,
        count =
            DEFAULT_PRODUCT_COUNT
    ) {

        const container =
            resolveTarget(
                target
            );


        if (
            !container
        ) {

            return null;

        }


        prepareTarget(
            container
        );


        container.append(
            createProductCards(
                count
            )
        );


        markLoading(
            container,
            TYPES.PRODUCTS
        );


        return container;

    }


    /* ======================================================
       RENDER BRAND CARDS
    ====================================================== */

    function renderBrandCards(
        target,
        count =
            DEFAULT_BRAND_COUNT
    ) {

        const container =
            resolveTarget(
                target
            );


        if (
            !container
        ) {

            return null;

        }


        prepareTarget(
            container
        );


        container.append(
            createBrandCards(
                count
            )
        );


        markLoading(
            container,
            TYPES.BRANDS
        );


        return container;

    }


    /* ======================================================
       RENDER HERO
    ====================================================== */

    function renderHero(
        target,
        options = {}
    ) {

        return renderIntoTarget(
            target,
            createHero(
                options
            ),
            TYPES.HERO
        );

    }


    /* ======================================================
       RENDER PRODUCT DETAIL
    ====================================================== */

    function renderProductDetail(
        target,
        options = {}
    ) {

        return renderIntoTarget(
            target,
            createProductDetail(
                options
            ),
            TYPES.PRODUCT_DETAIL
        );

    }


    /* ======================================================
       GENERIC RENDER
    ====================================================== */

    function renderIntoTarget(
        target,
        element,
        type =
            TYPES.STATE
    ) {

        const container =
            resolveTarget(
                target
            );


        if (
            !container ||
            !(element instanceof Node)
        ) {

            return null;

        }


        prepareTarget(
            container
        );


        container.append(
            element
        );


        markLoading(
            container,
            type
        );


        return container;

    }


    /* ======================================================
       PREPARE TARGET
    ====================================================== */

    function prepareTarget(
        container
    ) {

        container.replaceChildren();


        container.hidden =
            false;


        container.setAttribute(
            "aria-busy",
            "true"
        );


        /*
         * Jangan menimpa aria-live yang lebih spesifik
         * apabila container sudah mendefinisikannya.
         */
        if (
            !container.hasAttribute(
                "aria-live"
            )
        ) {

            container.setAttribute(
                "aria-live",
                "polite"
            );

        }

    }


    /* ======================================================
       MARK LOADING
    ====================================================== */

    function markLoading(
        container,
        type
    ) {

        container.dataset.loading =
            "true";


        container.dataset.loadingType =
            normalizeLoadingType(
                type
            );

    }


    /* ======================================================
       CLEAR
    ====================================================== */

    function clear(
        target,
        clearContent = true
    ) {

        const container =
            resolveTarget(
                target,
                {
                    warn:
                        false
                }
            );


        if (
            !container
        ) {

            return false;

        }


        if (
            clearContent !==
            false
        ) {

            container.replaceChildren();

        } else {

            removeLoadingNodes(
                container
            );

        }


        delete container
            .dataset
            .loading;


        delete container
            .dataset
            .loadingType;


        container.setAttribute(
            "aria-busy",
            "false"
        );


        return true;

    }


    /* ======================================================
       REMOVE LOADING NODES ONLY
    ====================================================== */

    function removeLoadingNodes(
        container
    ) {

        const selector = [

            `[${LOADING_NODE_ATTRIBUTE}]`,

            ".loading-state",

            ".loading",

            ".skeleton-card",

            ".skeleton-hero",

            ".skeleton-product-detail"

        ].join(",");


        container
            .querySelectorAll(
                selector
            )
            .forEach(
                element => {

                    element.remove();

                }
            );

    }


    /* ======================================================
       IS LOADING
    ====================================================== */

    function isLoading(
        target
    ) {

        const container =
            resolveTarget(
                target,
                {
                    warn:
                        false
                }
            );


        return Boolean(
            container &&
            container.dataset
                .loading ===
                "true"
        );

    }


    /* ======================================================
       RESOLVE TARGET
    ====================================================== */

    function resolveTarget(
        target,
        options = {}
    ) {

        const warn =
            options.warn !==
            false;


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
                warn
            ) {

                console.warn(
                    "LoadingComponent: target tidak valid."
                );

            }


            return null;

        }


        const value =
            target.trim();


        /*
         * Prioritas pertama selalu ID.
         *
         * Ini membuat:
         *
         * "product-grid"
         *
         * tetap bekerja tanpa memerlukan "#product-grid".
         */
        const byId =
            document.getElementById(
                value.startsWith("#")
                    ? value.slice(1)
                    : value
            );


        if (
            byId
        ) {

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
            warn
        ) {

            console.warn(
                `LoadingComponent: target "${value}" tidak ditemukan.`
            );

        }


        return element;

    }


    /* ======================================================
       MARK CREATED LOADING NODE
    ====================================================== */

    function markLoadingNode(
        element
    ) {

        if (
            element instanceof
            Element
        ) {

            element.setAttribute(
                LOADING_NODE_ATTRIBUTE,
                "true"
            );

        }


        return element;

    }


    /* ======================================================
       SKELETON VARIANT
    ====================================================== */

    function getSkeletonVariantClass(
        variant
    ) {

        const normalized =
            normalizeText(
                variant
            )
                .toLowerCase();


        const supported =
            Object.freeze({

                text:
                    "skeleton-text",

                title:
                    "skeleton-title",

                image:
                    "skeleton-image",

                "brand-image":
                    "skeleton-brand-image"

            });


        return (
            supported[
                normalized
            ] ||
            supported.text
        );

    }


    /* ======================================================
       COUNT
    ====================================================== */

    function normalizeCount(
        value,
        fallback
    ) {

        const fallbackValue =
            Number.isInteger(
                Number(
                    fallback
                )
            ) &&
            Number(
                fallback
            ) > 0
                ? Number(
                    fallback
                )
                : 1;


        const count =
            Number(
                value
            );


        if (
            !Number.isInteger(
                count
            ) ||
            count <= 0
        ) {

            return Math.min(
                fallbackValue,
                MAX_SKELETON_COUNT
            );

        }


        return Math.min(
            count,
            MAX_SKELETON_COUNT
        );

    }


    /* ======================================================
       LOADING TYPE
    ====================================================== */

    function normalizeLoadingType(
        value
    ) {

        const normalized =
            normalizeText(
                value
            );


        return (
            normalized ||
            TYPES.STATE
        );

    }


    /* ======================================================
       DIMENSION VALIDATION
    ====================================================== */

    function isValidDimension(
        value
    ) {

        if (
            typeof value ===
            "number"
        ) {

            return Number.isFinite(
                value
            );

        }


        const text =
            normalizeText(
                value
            );


        if (
            !text
        ) {

            return false;

        }


        /*
         * Inline style hanya menerima nilai yang berasal
         * dari konfigurasi internal/opsi developer.
         *
         * Hindari karakter yang tidak diperlukan.
         */
        return /^[0-9.]+(?:px|rem|em|%|vh|vw|ch)?$/i
            .test(
                text
            );

    }


    /* ======================================================
       CLASS NAME
    ====================================================== */

    function buildClassName(
        ...values
    ) {

        return values
            .flatMap(
                value =>
                    normalizeClassNames(
                        value
                    )
            )
            .filter(
                Boolean
            )
            .join(" ");

    }


    function normalizeClassNames(
        value
    ) {

        if (
            Array.isArray(
                value
            )
        ) {

            return value
                .flatMap(
                    normalizeClassNames
                );

        }


        return normalizeText(
            value
        )
            .split(/\s+/)
            .filter(
                className =>
                    /^[a-zA-Z0-9_-]+$/
                        .test(
                            className
                        )
            );

    }


    /* ======================================================
       TEXT
    ====================================================== */

    function normalizeText(
        value
    ) {

        return String(
            value ??
            ""
        ).trim();

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
                    `LoadingComponent: terjemahan "${key}" gagal.`,
                    error
                );

            }

        }


        return String(
            fallback ||
            ""
        );

    }


    /* ======================================================
       PUBLIC API
    ====================================================== */

    const publicAPI =
        Object.freeze({

            version:
                VERSION,


            types:
                TYPES,


            createSpinner,

            createState,


            createSkeletonLine,


            createProductCard,

            createProductCards,


            createBrandCard,

            createBrandCards,


            createHero,

            createProductDetail,


            renderSpinner,

            renderState,


            renderProductCards,

            renderBrandCards,


            renderHero,

            renderProductDetail,


            clear,

            isLoading

        });


    return publicAPI;

})();


window.LoadingComponent =
    LoadingComponent;