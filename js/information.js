"use strict";

/**
 * ==========================================================
 * GOMAI INFORMATION CONTROLLER
 * Version 1.0.0
 * js/information.js
 * ==========================================================
 *
 * Satu controller untuk halaman informasi statis:
 * - about.html
 * - contact.html
 * - faq.html
 * - how-to-buy.html
 *
 * Tanggung jawab:
 * - Menentukan subhalaman informasi aktif.
 * - Menjalankan translasi konten dinamis yang tidak ditangani
 *   langsung oleh Language Manager.
 * - Mengelola interaksi FAQ accordion.
 * - Menjaga link CTA/kontak tetap sesuai route Gomai.
 * - Mengikuti lifecycle ControllerRegistry.
 *
 * Tidak membaca JSON langsung.
 * Tidak melakukan DOMContentLoaded sendiri.
 * Tidak memanggil Language.init() sendiri.
 * Tidak memasang listener gomai:language-changed sendiri.
 * ==========================================================
 */

const InformationController = (() => {
    const VERSION = "1.1.0";

    const PAGE_TYPES = Object.freeze({
        ABOUT: "about",
        CONTACT: "contact",
        FAQ: "faq",
        HOW_TO_BUY: "howToBuy"
    });

    const EVENTS = Object.freeze({
        INITIALIZED:
            "gomai:information-controller-initialized",

        LANGUAGE_REFRESHED:
            "gomai:information-controller-language-refreshed",

        FAQ_CHANGED:
            "gomai:information-faq-changed",

        DESTROYED:
            "gomai:information-controller-destroyed",

        ERROR:
            "gomai:information-controller-error"
    });

    let initialized = false;
    let initializing = false;
    let initializationPromise = null;

    let lifecycleContext = null;
    let eventController = null;

    let activePageType = "";
    let lastError = null;

    const elements = {
        pageRoot: null,
        faqRoot: null
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

            activePageType =
                resolveInformationPageType();

            if (!activePageType) {
                throw new Error(
                    "InformationController tidak dapat menentukan halaman informasi aktif."
                );
            }

            cacheElements();

            markPageState();

            createEventController();

            bindPageInteractions();

            updateDynamicContent();

            initialized =
                true;

            dispatch(
                EVENTS.INITIALIZED,
                {
                    pageType:
                        activePageType
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
                "InformationController gagal diinisialisasi:",
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
                "InformationController membutuhkan GomaiUtils."
            );
        }

        if (
            !window.Language ||
            typeof window.Language
                .translate !==
                "function"
        ) {
            throw new Error(
                "InformationController membutuhkan Language."
            );
        }
    }


    /* ======================================================
       PAGE RESOLUTION
    ====================================================== */

    function resolveInformationPageType() {
        const body =
            document.body;

        const explicit =
            normalizePageType(
                body?.dataset
                    ?.informationPage ||

                body?.dataset
                    ?.informationType ||

                body?.dataset
                    ?.pageType ||

                ""
            );

        if (explicit) {
            return explicit;
        }

        const contextPage =
            normalizePageType(
                lifecycleContext
                    ?.informationPage ||

                lifecycleContext
                    ?.pageType ||

                ""
            );

        if (contextPage) {
            return contextPage;
        }

        const pathname =
            String(
                window.location
                    .pathname ||
                ""
            )
                .toLowerCase();

        const fileName =
            pathname
                .split("/")
                .filter(Boolean)
                .pop() ||
            "";

        const map = {
            "about.html":
                PAGE_TYPES.ABOUT,

            "contact.html":
                PAGE_TYPES.CONTACT,

            "faq.html":
                PAGE_TYPES.FAQ,

            "how-to-buy.html":
                PAGE_TYPES.HOW_TO_BUY
        };

        if (
            map[fileName]
        ) {
            return map[
                fileName
            ];
        }

        /*
         * Compatibility sementara selama HTML lama
         * masih memakai data-page khusus.
         */
        return normalizePageType(
            body?.dataset
                ?.page ||
            ""
        );
    }


    function normalizePageType(
        value
    ) {
        const normalized =
            normalizeText(
                value
            )
                .toLowerCase()
                .replace(
                    /[\s_-]+([a-z0-9])/g,
                    (
                        _match,
                        character
                    ) =>
                        character
                            .toUpperCase()
                );

        switch (
            normalized
        ) {
            case "about":
                return PAGE_TYPES.ABOUT;

            case "contact":
                return PAGE_TYPES.CONTACT;

            case "faq":
                return PAGE_TYPES.FAQ;

            case "howToBuy":
            case "howtobuy":
                return PAGE_TYPES.HOW_TO_BUY;

            default:
                return "";
        }
    }


    /* ======================================================
       DOM
    ====================================================== */

    function cacheElements() {
        elements.pageRoot =
            document.querySelector(
                "[data-information-page-root]"
            ) ||

            document.querySelector(
                "main"
            ) ||

            document.body;

        elements.faqRoot =
            document.getElementById(
                "faq-list"
            ) ||

            document.querySelector(
                "[data-faq-list]"
            ) ||

            document.querySelector(
                ".faq-list"
            );
    }


    function resetElementCache() {
        elements.pageRoot =
            null;

        elements.faqRoot =
            null;
    }


    function markPageState() {
        document.body
            ?.setAttribute(
                "data-information-page",
                activePageType
            );

        elements.pageRoot
            ?.setAttribute(
                "data-information-page-active",
                activePageType
            );
    }


    /* ======================================================
       INTERACTIONS
    ====================================================== */

    function createEventController() {
        eventController
            ?.abort();

        eventController =
            new AbortController();
    }


    function bindPageInteractions() {
        if (!eventController) {
            return;
        }

        const signal =
            eventController.signal;

        document.addEventListener(
            "click",
            handleDocumentClick,
            {
                signal
            }
        );

        if (
            activePageType ===
            PAGE_TYPES.FAQ
        ) {
            initializeFaqState();
        }
    }


    function handleDocumentClick(
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

        const copyWechatButton =
            target.closest(
                "[data-copy-wechat]"
            );

        if (copyWechatButton) {
            handleWechatCopy(
                copyWechatButton
            );

            return;
        }


        const faqTrigger =
            target.closest(
                "[data-faq-trigger], .faq-question"
            );

        if (
            activePageType ===
                PAGE_TYPES.FAQ &&
            faqTrigger
        ) {
            handleFaqTrigger(
                faqTrigger
            );
        }
    }


    async function handleWechatCopy(
        button
    ) {
        const wechatId =
            window.GomaiConfig
                ?.contact
                ?.wechatId ||
            "Gomai";

        const copied =
            await copyText(
                wechatId
            );

        if (!copied) {
            return false;
        }

        const label =
            button.querySelector(
                "[data-copy-label]"
            );

        if (label) {
            label.textContent =
                translate(
                    "contactPage.wechat.copied",
                    "Tersalin"
                );
        }

        button.classList.add(
            "is-copied"
        );

        window.setTimeout(
            () => {
                if (!button.isConnected) {
                    return;
                }

                if (label) {
                    label.textContent =
                        translate(
                            "contactPage.wechat.copy",
                            "Salin"
                        );
                }

                button.classList.remove(
                    "is-copied"
                );
            },
            1600
        );

        return true;
    }


    async function copyText(
        value
    ) {
        const text =
            String(value || "");

        if (!text) {
            return false;
        }

        try {
            if (
                navigator.clipboard &&
                typeof navigator.clipboard
                    .writeText ===
                    "function"
            ) {
                await navigator.clipboard
                    .writeText(text);

                return true;
            }
        } catch (_error) {
            /* gunakan fallback */
        }

        const textarea =
            document.createElement(
                "textarea"
            );

        textarea.value =
            text;

        textarea.setAttribute(
            "readonly",
            ""
        );

        textarea.style.position =
            "fixed";

        textarea.style.opacity =
            "0";

        document.body.append(
            textarea
        );

        textarea.select();

        let copied = false;

        try {
            copied =
                document.execCommand(
                    "copy"
                );
        } catch (_error) {
            copied = false;
        }

        textarea.remove();

        return copied;
    }


    /* ======================================================
       FAQ
    ====================================================== */

    function initializeFaqState() {
        getFaqItems()
            .forEach(
                (
                    item,
                    index
                ) => {
                    const trigger =
                        getFaqTrigger(
                            item
                        );

                    const panel =
                        getFaqPanel(
                            item
                        );

                    if (
                        !trigger ||
                        !panel
                    ) {
                        return;
                    }

                    const triggerId =
                        trigger.id ||
                        `faq-question-${index + 1}`;

                    const panelId =
                        panel.id ||
                        `faq-answer-${index + 1}`;

                    trigger.id =
                        triggerId;

                    panel.id =
                        panelId;

                    trigger.setAttribute(
                        "aria-controls",
                        panelId
                    );

                    panel.setAttribute(
                        "aria-labelledby",
                        triggerId
                    );

                    const initiallyOpen =
                        item.classList
                            .contains(
                                "is-open"
                            ) ||

                        item.hasAttribute(
                            "open"
                        ) ||

                        trigger.getAttribute(
                            "aria-expanded"
                        ) ===
                            "true";

                    setFaqItemState(
                        item,
                        initiallyOpen,
                        false
                    );
                }
            );
    }


    function handleFaqTrigger(
        trigger
    ) {
        const item =
            trigger.closest(
                "[data-faq-item], .faq-item, details"
            );

        if (!item) {
            return;
        }

        const isOpen =
            trigger.getAttribute(
                "aria-expanded"
            ) ===
                "true" ||

            item.classList
                .contains(
                    "is-open"
                ) ||

            item.hasAttribute(
                "open"
            );

        setFaqItemState(
            item,
            !isOpen,
            true
        );
    }


    function setFaqItemState(
        item,
        open,
        emitEvent = true
    ) {
        const trigger =
            getFaqTrigger(
                item
            );

        const panel =
            getFaqPanel(
                item
            );

        if (
            !trigger ||
            !panel
        ) {
            return false;
        }

        item.classList
            .toggle(
                "is-open",
                open
            );

        if (
            item instanceof
                HTMLDetailsElement
        ) {
            item.open =
                open;
        }

        trigger.setAttribute(
            "aria-expanded",
            String(
                open
            )
        );

        if (
            !(
                item instanceof
                    HTMLDetailsElement
            )
        ) {
            panel.hidden =
                !open;
        }

        if (emitEvent) {
            dispatch(
                EVENTS.FAQ_CHANGED,
                {
                    open,
                    item,
                    trigger,
                    panel
                }
            );
        }

        return true;
    }


    function getFaqItems() {
        const root =
            elements.faqRoot ||
            document;

        return Array.from(
            root.querySelectorAll(
                "[data-faq-item], .faq-item, details.faq-item"
            )
        );
    }


    function getFaqTrigger(
        item
    ) {
        return item.querySelector(
            "[data-faq-trigger], .faq-question, summary"
        );
    }


    function getFaqPanel(
        item
    ) {
        return item.querySelector(
            "[data-faq-panel], .faq-answer, .faq-content"
        );
    }


    /* ======================================================
       DYNAMIC CONTENT
    ====================================================== */

    function updateDynamicContent() {
        updatePageMetadata();

        updateRouteLinks();

        updateWechatValues();

        updateFaqLabels();
    }


    function updateRouteLinks() {
        document
            .querySelectorAll(
                "[data-route]"
            )
            .forEach(
                element => {
                    if (
                        !(
                            element instanceof
                                HTMLAnchorElement
                        )
                    ) {
                        return;
                    }

                    const routeName =
                        normalizeText(
                            element.dataset
                                .route
                        );

                    if (!routeName) {
                        return;
                    }

                    const parameters =
                        {};

                    if (
                        element.dataset
                            .routeId
                    ) {
                        parameters.id =
                            element.dataset
                                .routeId;
                    }

                    element.href =
                        buildRoute(
                            routeName,
                            parameters
                        );
                }
            );
    }


    function updateWechatValues() {
        const wechatId =
            window.GomaiConfig
                ?.contact
                ?.wechatId ||

            window.GomaiConfig
                ?.wechat
                ?.id ||

            "Gomai";

        document
            .querySelectorAll(
                "[data-wechat-id]"
            )
            .forEach(
                element => {
                    element.textContent =
                        wechatId;
                }
            );

        document
            .querySelectorAll(
                "[data-wechat-template]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .wechatTemplate ||

                        "footer.wechatTemplate";

                    element.textContent =
                        translate(
                            key,
                            "WeChat: {{wechatId}}",
                            {
                                wechatId
                            }
                        );
                }
            );
    }


    function updateFaqLabels() {
        if (
            activePageType !==
            PAGE_TYPES.FAQ
        ) {
            return;
        }

        getFaqItems()
            .forEach(
                item => {
                    const trigger =
                        getFaqTrigger(
                            item
                        );

                    if (!trigger) {
                        return;
                    }

                    const expanded =
                        trigger.getAttribute(
                            "aria-expanded"
                        ) ===
                            "true";

                    trigger.setAttribute(
                        "data-faq-state",
                        expanded
                            ? "open"
                            : "closed"
                    );
                }
            );
    }


    /* ======================================================
       METADATA
    ====================================================== */

    function updatePageMetadata() {
        const metadata =
            getPageMetadata(
                activePageType
            );

        if (!metadata) {
            return;
        }

        document.title =
            translate(
                metadata.titleKey,
                metadata.titleFallback
            );

        const description =
            translate(
                metadata.descriptionKey,
                metadata.descriptionFallback
            );

        document
            .querySelector(
                'meta[name="description"]'
            )
            ?.setAttribute(
                "content",
                description
            );
    }


    function getPageMetadata(
        pageType
    ) {
        const pages = {
            [PAGE_TYPES.ABOUT]: {
                titleKey:
                    "aboutPage.meta.title",

                titleFallback:
                    "Tentang Gomai | Gomai",

                descriptionKey:
                    "aboutPage.meta.description",

                descriptionFallback:
                    "Pelajari lebih lanjut tentang Gomai dan layanan belanja yang kami sediakan."
            },

            [PAGE_TYPES.CONTACT]: {
                titleKey:
                    "contactPage.meta.title",

                titleFallback:
                    "Hubungi Gomai | Gomai",

                descriptionKey:
                    "contactPage.meta.description",

                descriptionFallback:
                    "Hubungi Gomai untuk bantuan produk, pemesanan, dan layanan pelanggan."
            },

            [PAGE_TYPES.FAQ]: {
                titleKey:
                    "faqPage.meta.title",

                titleFallback:
                    "FAQ | Gomai",

                descriptionKey:
                    "faqPage.meta.description",

                descriptionFallback:
                    "Temukan jawaban atas pertanyaan umum mengenai belanja dan layanan Gomai."
            },

            [PAGE_TYPES.HOW_TO_BUY]: {
                titleKey:
                    "howToBuyPage.meta.title",

                titleFallback:
                    "Cara Membeli | Gomai",

                descriptionKey:
                    "howToBuyPage.meta.description",

                descriptionFallback:
                    "Pelajari langkah sederhana untuk memilih produk, memesan, membayar, dan menerima pesanan melalui Gomai."
            }
        };

        return pages[
            pageType
        ] ||
        null;
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
            updateDynamicContent();

            dispatch(
                EVENTS.LANGUAGE_REFRESHED,
                {
                    pageType:
                        activePageType,

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
       ROUTES
    ====================================================== */

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
                 * Gunakan fallback.
                 */
            }
        }

        if (
            typeof window.GomaiUtils
                ?.getRoute ===
            "function"
        ) {
            const base =
                window.GomaiUtils
                    .getRoute(
                        routeName
                    );

            const query =
                new URLSearchParams(
                    parameters
                ).toString();

            return query
                ? `${base}?${query}`
                : base;
        }

        const routeMap = {
            home:
                "../index.html",

            products:
                "products.html",

            brand:
                "brand.html",

            productDetail:
                "product-detail.html",

            about:
                "about.html",

            contact:
                "contact.html",

            faq:
                "faq.html",

            howToBuy:
                "how-to-buy.html"
        };

        const base =
            routeMap[
                routeName
            ] ||
            "#";

        const query =
            new URLSearchParams(
                parameters
            ).toString();

        return query
            ? `${base}?${query}`
            : base;
    }


    /* ======================================================
       TRANSLATION
    ====================================================== */

    function getCurrentLanguage() {
        if (
            typeof window.Language
                ?.getLanguage ===
            "function"
        ) {
            return window.Language
                .getLanguage();
        }

        return (
            window.GomaiConfig
                ?.language
                ?.default ||

            document
                .documentElement
                .lang ||

            "id"
        );
    }


    function translate(
        key,
        fallback = "",
        parameters = {}
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

        } catch (_error) {

            return interpolate(
                fallback,
                parameters
            );
        }
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

        document.body
            ?.removeAttribute(
                "data-information-page"
            );

        elements.pageRoot
            ?.removeAttribute(
                "data-information-page-active"
            );

        activePageType =
            "";

        lastError =
            null;

        lifecycleContext =
            null;

        initialized =
            false;

        initializing =
            false;

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
       HELPERS / PUBLIC STATE
    ====================================================== */

    function normalizeText(
        value
    ) {
        return String(
            value ??
            ""
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


    function normalizeError(
        error
    ) {
        return error instanceof
            Error

            ? error

            : new Error(
                String(
                    error ||
                    "Terjadi kesalahan pada InformationController."
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


    function getPageType() {
        return activePageType;
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

            pageType:
                activePageType
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

            pageTypes:
                PAGE_TYPES,

            init,
            destroy,
            refreshLanguage,

            getPageType,
            getLastError,
            hasInitialized
        });

    return publicAPI;
})();


window.InformationController =
    InformationController;


/*
 * Compatibility alias selama transisi.
 */
window.InformationPage =
    InformationController;