"use strict";

/**
 * ==========================================================
 * GOMAI FOOTER COMPONENT
 * Version 3.0.0
 * ==========================================================
 *
 * Shared Footer untuk seluruh halaman Gomai.
 *
 * Sumber brand Footer:
 * BrandsModel.getNavigation()
 *
 * Dependencies:
 * - GomaiUtils
 * - Language
 * - ComponentCore
 * - BrandsModel
 *
 * Public API:
 * - render()
 * - destroy()
 * - refreshLanguage()
 * - refreshNavigation()
 * - updateLanguageButtons()
 * - getNavigationBrands()
 * - hasRendered()
 * - getElement()
 * - getLastError()
 * - getCore()
 * ==========================================================
 */

const FooterComponent = (() => {
    const VERSION = "3.0.0";
    const DEFAULT_TARGET_ID = "site-footer";

    const DEFAULT_OPTIONS = Object.freeze({
        targetId: DEFAULT_TARGET_ID,

        showBrandLinks: true,
        showInformationLinks: true,
        showContact: true,
        showLanguage: true,
        showVersion: false,
        showWechatButton: true,

        wechatHref: "#wechat",

        /*
         * null:
         * tampilkan seluruh brand yang diizinkan
         * untuk navigasi oleh BrandsModel.
         */
        navigationLimit: null,

        /*
         * null:
         * ambil otomatis dari BrandsModel.getNavigation().
         *
         * Array:
         * dipakai sebagai override eksplisit.
         */
        navigationBrands: null
    });

    /* ======================================================
       STATE
    ====================================================== */

    let options = {
        ...DEFAULT_OPTIONS
    };

    let navigationBrands = [];

    let rootElement = null;
    let core = null;

    let rendered = false;
    let rendering = false;
    let renderPromise = null;

    let lastError = null;

    const elements = {
        copyright: null,
        version: null,
        wechatText: null,
        languageButtons: [],
        wechatLinks: []
    };

    /* ======================================================
       RENDER
    ====================================================== */

    /**
     * Merender Footer.
     *
     * @param {object} customOptions
     * @returns {Promise<HTMLElement|null>}
     */
    async function render(
        customOptions = {}
    ) {
        if (
            rendered &&
            rootElement?.isConnected &&
            !customOptions.force
        ) {
            refreshLanguage();

            return rootElement;
        }

        if (
            rendering &&
            renderPromise
        ) {
            return renderPromise;
        }

        renderPromise =
            renderInternal(
                customOptions
            );

        try {
            return await renderPromise;
        } finally {
            renderPromise = null;
        }
    }

    /**
     * Implementasi internal render().
     *
     * @param {object} customOptions
     * @returns {Promise<HTMLElement|null>}
     */
    async function renderInternal(
        customOptions
    ) {
        rendering = true;
        lastError = null;

        try {
            validateDependencies();

            options =
                normalizeOptions(
                    customOptions
                );

            const target =
                resolveTarget(
                    options.targetId
                );

            if (!target) {
                console.warn(
                    `FooterComponent: target "${options.targetId}" tidak ditemukan.`
                );

                return null;
            }

            /*
             * Data disiapkan sebelum markup Footer lama
             * disentuh.
             */
            navigationBrands =
                await resolveNavigationBrands(
                    options
                );

            /*
             * Markup dibangun terlebih dahulu di luar DOM.
             */
            const fragment =
                buildFooterFragment();

            if (
                rendered ||
                core
            ) {
                cleanupCurrentInstance({
                    clearMarkup: false
                });
            }

            rootElement = target;

            applyRootAttributes();

            rootElement.replaceChildren(
                fragment
            );

            createCore();
            cacheElements();

            core.mount(
                rootElement
            );

            bindEvents();

            rendered = true;

            refreshLanguage();

            dispatch(
                "gomai:footer-rendered",
                {
                    targetId:
                        options.targetId,

                    navigationBrands:
                        getNavigationBrands(),

                    element:
                        rootElement
                }
            );

            return rootElement;
        } catch (error) {
            lastError =
                normalizeError(
                    error
                );

            console.error(
                "FooterComponent gagal dirender:",
                lastError
            );

            dispatchDirect(
                "gomai:footer-error",
                {
                    error:
                        lastError
                }
            );

            /*
             * Footer lama tidak dihapus apabila
             * persiapan render gagal.
             */
            return null;
        } finally {
            rendering = false;
        }
    }

    /**
     * Membuat ComponentCore.
     */
    function createCore() {
        core =
            window.ComponentCore.create({
                name:
                    "footer",

                languageAware:
                    false,

                visible:
                    true,

                enabled:
                    true,

                eventTarget:
                    document,

                data: {
                    language:
                        getCurrentLanguage(),

                    navigationBrandCount:
                        navigationBrands.length
                }
            });
    }

    /**
     * Memberikan class dan atribut root Footer.
     */
    function applyRootAttributes() {
        rootElement.className =
            [
                "footer",
                "shared-footer"
            ].join(" ");

        rootElement.dataset.footerRendered =
            "true";

        rootElement.dataset.footerVersion =
            VERSION;
    }

    /**
     * Membuat seluruh markup Footer.
     *
     * @returns {DocumentFragment}
     */
    function buildFooterFragment() {
        const fragment =
            document.createDocumentFragment();

        const mainContainer =
            document.createElement(
                "div"
            );

        mainContainer.className =
            [
                "container",
                "footer-grid",
                "shared-footer-grid"
            ].join(" ");

        mainContainer.append(
            createIdentityColumn()
        );

        if (
            options.showBrandLinks
        ) {
            mainContainer.append(
                createBrandLinksColumn()
            );
        }

        if (
            options.showInformationLinks
        ) {
            mainContainer.append(
                createInformationColumn()
            );
        }

        if (
            options.showContact
        ) {
            mainContainer.append(
                createContactColumn()
            );
        }

        fragment.append(
            mainContainer,
            createFooterBottom()
        );

        return fragment;
    }

    /* ======================================================
       BRAND NAVIGATION DATA
    ====================================================== */

    /**
     * Menentukan sumber data navigasi brand.
     *
     * Prioritas:
     * 1. options.navigationBrands
     * 2. BrandsModel.getNavigation()
     *
     * @param {object} normalizedOptions
     * @returns {Promise<object[]>}
     */
    async function resolveNavigationBrands(
        normalizedOptions
    ) {
        if (
            Array.isArray(
                normalizedOptions
                    .navigationBrands
            )
        ) {
            return normalizeNavigationBrands(
                normalizedOptions
                    .navigationBrands
            );
        }

        const model =
            getBrandsModel();

        if (
            !model ||
            typeof model.getNavigation !==
                "function"
        ) {
            console.warn(
                "FooterComponent: BrandsModel.getNavigation() belum tersedia. Navigasi brand dikosongkan."
            );

            return [];
        }

        try {
            const data =
                await model.getNavigation(
                    normalizedOptions
                        .navigationLimit
                );

            return normalizeNavigationBrands(
                data
            );
        } catch (error) {
            const normalizedError =
                normalizeError(
                    error
                );

            console.error(
                "FooterComponent gagal mengambil navigasi brand:",
                normalizedError
            );

            dispatchDirect(
                "gomai:footer-navigation-error",
                {
                    error:
                        normalizedError
                }
            );

            return [];
        }
    }

    /**
     * Mengambil BrandsModel.
     *
     * @returns {object|null}
     */
    function getBrandsModel() {
        return (
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

    /**
     * Menormalisasi koleksi brand.
     *
     * @param {unknown} values
     * @returns {{id:string,slug:string,name:string}[]}
     */
    function normalizeNavigationBrands(
        values
    ) {
        if (
            !Array.isArray(values)
        ) {
            return [];
        }

        const usedIds =
            new Set();

        return values
            .map(
                normalizeNavigationBrand
            )
            .filter(
                brand => {
                    if (
                        !brand.id ||
                        !brand.name
                    ) {
                        return false;
                    }

                    const key =
                        brand.id
                            .toLowerCase();

                    if (
                        usedIds.has(key)
                    ) {
                        return false;
                    }

                    usedIds.add(key);

                    return true;
                }
            );
    }

    /**
     * Menormalisasi satu brand.
     *
     * @param {unknown} brand
     * @returns {{id:string,slug:string,name:string}}
     */
    function normalizeNavigationBrand(
        brand
    ) {
        const id =
            normalizeIdentifier(
                brand?.id ||
                brand?.slug
            );

        const slug =
            normalizeIdentifier(
                brand?.slug ||
                id
            );

        return {
            id,
            slug,

            name:
                normalizeText(
                    brand?.name ||
                    id
                )
        };
    }

    /**
     * Mengambil ulang brand dari BrandsModel lalu
     * merender ulang Footer.
     *
     * @returns {Promise<HTMLElement|null>}
     */
    async function refreshNavigation() {
        if (
            !rootElement
        ) {
            return null;
        }

        return render({
            ...options,

            force:
                true,

            navigationBrands:
                null
        });
    }

    /**
     * Mengambil salinan brand navigasi Footer.
     *
     * @returns {object[]}
     */
    function getNavigationBrands() {
        return cloneData(
            navigationBrands
        );
    }

    /* ======================================================
       IDENTITY
    ====================================================== */

    /**
     * Membuat kolom identitas Gomai.
     *
     * @returns {HTMLElement}
     */
    function createIdentityColumn() {
        const column =
            document.createElement(
                "div"
            );

        column.className =
            [
                "footer-column",
                "footer-brand-column"
            ].join(" ");

        const logoLink =
            document.createElement(
                "a"
            );

        logoLink.href =
            getRoute(
                "home",
                "index.html"
            );

        logoLink.className =
            "footer-logo";

        setAriaTranslation(
            logoLink,
            "common.home",
            "Beranda"
        );

        const heading =
            document.createElement(
                "h3"
            );

        heading.textContent =
            getSiteName();

        logoLink.append(
            heading
        );

        const description =
            document.createElement(
                "p"
            );

        setTextTranslation(
            description,
            "footer.description",
            "Belanja mudah untuk kebutuhan olahraga, outdoor, fashion, dan kebutuhan harian."
        );

        column.append(
            logoLink,
            description
        );

        if (
            options.showContact &&
            options.showWechatButton
        ) {
            const wechatLink =
                document.createElement(
                    "a"
                );

            wechatLink.href =
                options.wechatHref;

            wechatLink.className =
                [
                    "btn",
                    "btn-primary",
                    "footer-wechat-button"
                ].join(" ");

            wechatLink.dataset.footerWechatLink =
                "true";

            setTextTranslation(
                wechatLink,
                "wechat.button",
                "Hubungi via WeChat"
            );

            column.append(
                wechatLink
            );
        }

        return column;
    }

    /* ======================================================
       BRAND LINKS
    ====================================================== */

    /**
     * Membuat kolom brand.
     *
     * @returns {HTMLElement}
     */
    function createBrandLinksColumn() {
        const column =
            document.createElement(
                "div"
            );

        column.className =
            "footer-column";

        const heading =
            document.createElement(
                "h4"
            );

        setTextTranslation(
            heading,
            "footer.brandTitle",
            "Brand"
        );

        const list =
            document.createElement(
                "ul"
            );

        navigationBrands
            .forEach(
                brand => {
                    list.append(
                        createBrandLinkItem(
                            brand
                        )
                    );
                }
            );

        column.append(
            heading,
            list
        );

        return column;
    }

    /**
     * Membuat satu link brand.
     *
     * @param {{id:string,slug:string,name:string}} brand
     * @returns {HTMLLIElement}
     */
    function createBrandLinkItem(
        brand
    ) {
        const normalizedBrand =
            normalizeNavigationBrand(
                brand
            );

        const item =
            document.createElement(
                "li"
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            buildRoute(
                "brand",
                {
                    id:
                        normalizedBrand.id
                },
                `pages/brand.html?id=${encodeURIComponent(
                    normalizedBrand.id
                )}`
            );

        link.textContent =
            normalizedBrand.name;

        link.dataset.brandId =
            normalizedBrand.id;

        link.dataset.brandSlug =
            normalizedBrand.slug;

        item.append(
            link
        );

        return item;
    }

    /* ======================================================
       INFORMATION LINKS
    ====================================================== */

    /**
     * Membuat kolom informasi.
     *
     * @returns {HTMLElement}
     */
    function createInformationColumn() {
        const column =
            document.createElement(
                "div"
            );

        column.className =
            "footer-column";

        const heading =
            document.createElement(
                "h4"
            );

        setTextTranslation(
            heading,
            "footer.informationTitle",
            "Informasi"
        );

        const list =
            document.createElement(
                "ul"
            );

        list.append(
            createFooterLinkItem(
                "howToBuy",
                "footer.howToBuy",
                "Cara Membeli",
                "pages/how-to-buy.html"
            ),

            createFooterLinkItem(
                "about",
                "footer.about",
                "Tentang Kami",
                "pages/about.html"
            ),

            createFooterLinkItem(
                "faq",
                "footer.faq",
                "FAQ",
                "pages/faq.html"
            ),

            createFooterLinkItem(
                "contact",
                "footer.contactUs",
                "Hubungi Kami",
                "pages/contact.html"
            )
        );

        column.append(
            heading,
            list
        );

        return column;
    }

    /**
     * Membuat link halaman informasi.
     *
     * @param {string} routeKey
     * @param {string} translationKey
     * @param {string} fallback
     * @param {string} fallbackPath
     * @returns {HTMLLIElement}
     */
    function createFooterLinkItem(
        routeKey,
        translationKey,
        fallback,
        fallbackPath
    ) {
        const item =
            document.createElement(
                "li"
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            getRoute(
                routeKey,
                fallbackPath
            );

        setTextTranslation(
            link,
            translationKey,
            fallback
        );

        item.append(
            link
        );

        return item;
    }

    /* ======================================================
       CONTACT
    ====================================================== */

    /**
     * Membuat kolom kontak.
     *
     * @returns {HTMLElement}
     */
    function createContactColumn() {
        const column =
            document.createElement(
                "div"
            );

        column.className =
            [
                "footer-column",
                "footer-contact-column"
            ].join(" ");

        const heading =
            document.createElement(
                "h4"
            );

        setTextTranslation(
            heading,
            "footer.contactTitle",
            "Kontak"
        );

        const wechatText =
            document.createElement(
                "p"
            );

        wechatText.dataset.footerTemplateKey =
            "footer.wechatTemplate";

        wechatText.dataset.footerTemplateFallback =
            "WeChat: {{wechatId}}";

        wechatText.textContent =
            `WeChat: ${getWechatId()}`;

        const contactLink =
            document.createElement(
                "a"
            );

        contactLink.href =
            getRoute(
                "contact",
                "pages/contact.html"
            );

        contactLink.className =
            [
                "btn",
                "btn-outline"
            ].join(" ");

        setTextTranslation(
            contactLink,
            "footer.contactUs",
            "Hubungi Kami"
        );

        column.append(
            heading,
            wechatText,
            contactLink
        );

        return column;
    }

    /* ======================================================
       FOOTER BOTTOM
    ====================================================== */

    /**
     * Membuat bagian bawah Footer.
     *
     * @returns {HTMLElement}
     */
    function createFooterBottom() {
        const bottom =
            document.createElement(
                "div"
            );

        bottom.className =
            [
                "container",
                "footer-bottom",
                "shared-footer-bottom"
            ].join(" ");

        const copyright =
            document.createElement(
                "p"
            );

        copyright.dataset.footerCopyright =
            "true";

        copyright.dataset.footerTextKey =
            "footer.copyright";

        copyright.dataset.footerTextFallback =
            "© {{year}} Gomai. Semua Hak Dilindungi.";

        bottom.append(
            copyright
        );

        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            "footer-bottom-actions";

        if (
            options.showVersion
        ) {
            actions.append(
                createVersionLabel()
            );
        }

        if (
            options.showLanguage
        ) {
            actions.append(
                createLanguageSwitch()
            );
        }

        if (
            actions.childElementCount >
            0
        ) {
            bottom.append(
                actions
            );
        }

        return bottom;
    }

    /**
     * Membuat label versi.
     *
     * @returns {HTMLElement}
     */
    function createVersionLabel() {
        const version =
            document.createElement(
                "span"
            );

        version.className =
            "footer-version";

        version.textContent =
            `v${getSiteVersion()}`;

        return version;
    }

    /**
     * Membuat switch bahasa.
     *
     * @returns {HTMLElement}
     */
    function createLanguageSwitch() {
        const container =
            document.createElement(
                "div"
            );

        container.className =
            [
                "language-switch",
                "footer-language-switch"
            ].join(" ");

        container.setAttribute(
            "role",
            "group"
        );

        setAriaTranslation(
            container,
            "navigation.languageSelector",
            "Pilih bahasa"
        );

        container.append(
            createLanguageButton(
                "id",
                "Indonesia"
            ),

            createLanguageButton(
                "zh",
                "中文"
            )
        );

        return container;
    }

    /**
     * Membuat tombol bahasa.
     *
     * @param {"id"|"zh"} language
     * @param {string} label
     * @returns {HTMLButtonElement}
     */
    function createLanguageButton(
        language,
        label
    ) {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.dataset.language =
            language;

        button.setAttribute(
            "aria-pressed",
            "false"
        );

        button.textContent =
            label;

        return button;
    }

    /* ======================================================
       ELEMENT CACHE
    ====================================================== */

    /**
     * Menyimpan referensi elemen Footer.
     */
    function cacheElements() {
        elements.languageButtons =
            Array.from(
                rootElement.querySelectorAll(
                    "[data-language]"
                )
            );

        elements.wechatLinks =
            Array.from(
                rootElement.querySelectorAll(
                    "[data-footer-wechat-link]"
                )
            );

        elements.copyright =
            rootElement.querySelector(
                "[data-footer-copyright]"
            );

        elements.version =
            rootElement.querySelector(
                ".footer-version"
            );

        elements.wechatText =
            rootElement.querySelector(
                "[data-footer-template-key='footer.wechatTemplate']"
            );
    }

    /* ======================================================
       EVENTS
    ====================================================== */

    /**
     * Memasang event Footer.
     */
    function bindEvents() {
        elements.languageButtons
            .forEach(
                button => {
                    core.on(
                        button,
                        "click",
                        handleLanguageButtonClick
                    );
                }
            );
    }

    /**
     * Menangani pemilihan bahasa.
     *
     * @param {MouseEvent} event
     */
    async function handleLanguageButtonClick(
        event
    ) {
        const language =
            event.currentTarget
                ?.dataset
                ?.language;

        if (!language) {
            return;
        }

        try {
            if (
                typeof window.Language
                    .setLanguage ===
                "function"
            ) {
                await window.Language
                    .setLanguage(
                        language
                    );

                return;
            }

            if (
                typeof window.Language
                    .load ===
                "function"
            ) {
                await window.Language
                    .load(
                        language
                    );

                return;
            }

            throw new Error(
                "Language.setLanguage() dan Language.load() tidak tersedia."
            );
        } catch (error) {
            const normalizedError =
                normalizeError(
                    error
                );

            console.error(
                "FooterComponent gagal mengganti bahasa:",
                normalizedError
            );

            dispatch(
                "gomai:footer-language-error",
                {
                    language,

                    error:
                        normalizedError
                }
            );
        }
    }

    /* ======================================================
       LANGUAGE
    ====================================================== */

    /**
     * Memperbarui seluruh terjemahan Footer.
     *
     * Event bahasa global dikelola oleh
     * ComponentRegistry.
     *
     * @returns {boolean}
     */
    function refreshLanguage() {
        if (
            !rendered ||
            !rootElement
        ) {
            return false;
        }

        rootElement
            .querySelectorAll(
                "[data-footer-text-key]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .footerTextKey;

                    const fallback =
                        element.dataset
                            .footerTextFallback ||
                        "";

                    const parameters =
                        key ===
                        "footer.copyright"
                            ? {
                                year:
                                    new Date()
                                        .getFullYear()
                            }
                            : {};

                    element.textContent =
                        translate(
                            key,
                            fallback,
                            parameters
                        );
                }
            );

        rootElement
            .querySelectorAll(
                "[data-footer-aria-key]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .footerAriaKey;

                    const fallback =
                        element.dataset
                            .footerAriaFallback ||
                        "";

                    element.setAttribute(
                        "aria-label",
                        translate(
                            key,
                            fallback
                        )
                    );
                }
            );

        rootElement
            .querySelectorAll(
                "[data-footer-template-key]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .footerTemplateKey;

                    const fallback =
                        element.dataset
                            .footerTemplateFallback ||
                        "";

                    element.textContent =
                        translate(
                            key,
                            fallback,
                            {
                                wechatId:
                                    getWechatId()
                            }
                        );
                }
            );

        updateLanguageButtons();

        core?.setData(
            "language",
            getCurrentLanguage()
        );

        dispatch(
            "gomai:footer-language-refreshed",
            {
                language:
                    getCurrentLanguage()
            }
        );

        return true;
    }

    /**
     * Menandai tombol bahasa aktif.
     *
     * @returns {boolean}
     */
    function updateLanguageButtons() {
        const language =
            getCurrentLanguage();

        elements.languageButtons
            .forEach(
                button => {
                    const active =
                        button.dataset
                            .language ===
                        language;

                    button.classList.toggle(
                        "active",
                        active
                    );

                    button.classList.toggle(
                        "is-active",
                        active
                    );

                    button.setAttribute(
                        "aria-pressed",
                        String(active)
                    );
                }
            );

        return true;
    }

    /* ======================================================
       DESTROY
    ====================================================== */

    /**
     * Menghapus Footer.
     *
     * @returns {boolean}
     */
    function destroy() {
        if (
            !rendered &&
            !rootElement &&
            !core
        ) {
            return false;
        }

        cleanupCurrentInstance({
            clearMarkup:
                true
        });

        dispatchDirect(
            "gomai:footer-destroyed"
        );

        return true;
    }

    /**
     * Membersihkan instance Footer aktif.
     *
     * @param {{clearMarkup?:boolean}} cleanupOptions
     */
    function cleanupCurrentInstance(
        cleanupOptions = {}
    ) {
        const clearMarkup =
            cleanupOptions.clearMarkup !==
            false;

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.destroy({
                removeElement:
                    false,

                clearData:
                    true
            });
        }

        if (
            clearMarkup &&
            rootElement
        ) {
            rootElement.replaceChildren();

            rootElement.className =
                "";

            rootElement.removeAttribute(
                "data-footer-rendered"
            );

            rootElement.removeAttribute(
                "data-footer-version"
            );
        }

        resetElementCache();

        core = null;
        rendered = false;

        if (
            clearMarkup
        ) {
            rootElement = null;
            navigationBrands = [];
        }
    }

    /**
     * Menghapus cache elemen.
     */
    function resetElementCache() {
        elements.copyright =
            null;

        elements.version =
            null;

        elements.wechatText =
            null;

        elements.languageButtons =
            [];

        elements.wechatLinks =
            [];
    }

    /* ======================================================
       TRANSLATION HELPERS
    ====================================================== */

    /**
     * Menambahkan metadata terjemahan teks.
     *
     * @param {HTMLElement} element
     * @param {string} key
     * @param {string} fallback
     */
    function setTextTranslation(
        element,
        key,
        fallback
    ) {
        element.dataset.footerTextKey =
            key;

        element.dataset.footerTextFallback =
            fallback;

        element.textContent =
            fallback;
    }

    /**
     * Menambahkan metadata terjemahan aria-label.
     *
     * @param {HTMLElement} element
     * @param {string} key
     * @param {string} fallback
     */
    function setAriaTranslation(
        element,
        key,
        fallback
    ) {
        element.dataset.footerAriaKey =
            key;

        element.dataset.footerAriaFallback =
            fallback;

        element.setAttribute(
            "aria-label",
            fallback
        );
    }

    /* ======================================================
       ROUTING
    ====================================================== */

    /**
     * Mengambil route.
     *
     * @param {string} routeName
     * @param {string} fallbackPath
     * @returns {string}
     */
    function getRoute(
        routeName,
        fallbackPath
    ) {
        try {
            if (
                typeof window.GomaiUtils
                    .getRoute ===
                "function"
            ) {
                const route =
                    window.GomaiUtils
                        .getRoute(
                            routeName
                        );

                if (route) {
                    return route;
                }
            }
        } catch (error) {
            console.warn(
                `FooterComponent: route "${routeName}" tidak ditemukan.`,
                error
            );
        }

        return resolveFallbackPath(
            fallbackPath
        );
    }

    /**
     * Membentuk route dengan query parameter.
     *
     * @param {string} routeName
     * @param {object} parameters
     * @param {string} fallbackPath
     * @returns {string}
     */
    function buildRoute(
        routeName,
        parameters,
        fallbackPath
    ) {
        try {
            if (
                typeof window.GomaiUtils
                    .buildRoute ===
                "function"
            ) {
                const route =
                    window.GomaiUtils
                        .buildRoute(
                            routeName,
                            parameters
                        );

                if (route) {
                    return route;
                }
            }
        } catch (error) {
            console.warn(
                `FooterComponent: gagal membentuk route "${routeName}".`,
                error
            );
        }

        return resolveFallbackPath(
            fallbackPath
        );
    }

    /**
     * Menyesuaikan fallback path dengan lokasi halaman.
     *
     * @param {string} path
     * @returns {string}
     */
    function resolveFallbackPath(
        path
    ) {
        const normalizedPath =
            normalizeText(
                path
            );

        if (
            !normalizedPath
        ) {
            return "#";
        }

        const insidePages =
            window.location.pathname
                .toLowerCase()
                .includes(
                    "/pages/"
                );

        if (
            !insidePages
        ) {
            return normalizedPath;
        }

        if (
            normalizedPath ===
            "index.html"
        ) {
            return "../index.html";
        }

        if (
            normalizedPath.startsWith(
                "pages/"
            )
        ) {
            return normalizedPath.replace(
                /^pages\//,
                ""
            );
        }

        return normalizedPath;
    }

    /* ======================================================
       GENERAL HELPERS
    ====================================================== */

    /**
     * Memvalidasi dependency wajib.
     */
    function validateDependencies() {
        if (
            !window.GomaiUtils
        ) {
            throw new Error(
                "FooterComponent membutuhkan GomaiUtils."
            );
        }

        if (
            !window.Language
        ) {
            throw new Error(
                "FooterComponent membutuhkan Language."
            );
        }

        if (
            !window.ComponentCore ||
            typeof window.ComponentCore
                .create !==
                "function"
        ) {
            throw new Error(
                "FooterComponent membutuhkan ComponentCore.create()."
            );
        }
    }

    /**
     * Menormalisasi options.
     *
     * @param {object} customOptions
     * @returns {object}
     */
    function normalizeOptions(
        customOptions = {}
    ) {
        const customNavigationBrands =
            Array.isArray(
                customOptions
                    .navigationBrands
            )
                ? normalizeNavigationBrands(
                    customOptions
                        .navigationBrands
                )
                : null;

        return {
            ...DEFAULT_OPTIONS,
            ...customOptions,

            targetId:
                customOptions.targetId ||
                customOptions.target ||
                DEFAULT_TARGET_ID,

            navigationLimit:
                normalizeNavigationLimit(
                    customOptions
                        .navigationLimit
                ),

            navigationBrands:
                customNavigationBrands,

            wechatHref:
                normalizeText(
                    customOptions
                        .wechatHref ||
                    DEFAULT_OPTIONS
                        .wechatHref
                ) ||
                DEFAULT_OPTIONS
                    .wechatHref
        };
    }

    /**
     * null berarti tidak membatasi jumlah brand.
     *
     * @param {unknown} value
     * @returns {number|null}
     */
    function normalizeNavigationLimit(
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
            Number.isInteger(number) &&
            number > 0
        )
            ? number
            : null;
    }

    /**
     * Menormalisasi identifier.
     *
     * @param {unknown} value
     * @returns {string}
     */
    function normalizeIdentifier(
        value
    ) {
        return String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );
    }

    /**
     * Menormalisasi teks.
     *
     * @param {unknown} value
     * @returns {string}
     */
    function normalizeText(
        value
    ) {
        return String(
            value ?? ""
        ).trim();
    }

    /**
     * Mencari target render.
     *
     * @param {Element|string} target
     * @returns {Element|null}
     */
    function resolveTarget(
        target
    ) {
        if (
            target instanceof
                Element
        ) {
            return target;
        }

        const value =
            normalizeText(
                target
            );

        if (
            !value
        ) {
            return null;
        }

        if (
            value.startsWith("#") ||
            value.startsWith(".") ||
            value.startsWith("[") ||
            value.includes(" ")
        ) {
            return document.querySelector(
                value
            );
        }

        return (
            document.getElementById(
                value
            ) ||

            document.querySelector(
                value
            )
        );
    }

    /**
     * Mengambil nama situs.
     *
     * @returns {string}
     */
    function getSiteName() {
        return String(
            window.GomaiConfig
                ?.site
                ?.name ||
            "Gomai"
        );
    }

    /**
     * Mengambil versi situs.
     *
     * @returns {string}
     */
    function getSiteVersion() {
        return String(
            window.Gomai
                ?.version ||

            window.GomaiConfig
                ?.site
                ?.version ||

            VERSION
        );
    }

    /**
     * Mengambil WeChat ID.
     *
     * @returns {string}
     */
    function getWechatId() {
        return String(
            window.GomaiConfig
                ?.contact
                ?.wechatId ||
            "Gomai"
        );
    }

    /**
     * Mengambil bahasa aktif.
     *
     * @returns {string}
     */
    function getCurrentLanguage() {
        if (
            typeof window.Language
                .getLanguage ===
            "function"
        ) {
            return window.Language
                .getLanguage();
        }

        return (
            window.GomaiConfig
                ?.language
                ?.default ||

            document.documentElement
                .lang ||

            "id"
        );
    }

    /**
     * Mengambil terjemahan.
     *
     * @param {string} key
     * @param {string} fallback
     * @param {object} parameters
     * @returns {string}
     */
    function translate(
        key,
        fallback = "",
        parameters = {}
    ) {
        if (
            typeof window.Language
                .translate ===
            "function"
        ) {
            return window.Language
                .translate(
                    key,
                    fallback,
                    parameters
                );
        }

        return interpolate(
            fallback,
            parameters
        );
    }

    /**
     * Mengganti parameter template.
     *
     * @param {string} text
     * @param {object} parameters
     * @returns {string}
     */
    function interpolate(
        text,
        parameters = {}
    ) {
        return Object.entries(
            parameters
        ).reduce(
            (
                result,
                [
                    key,
                    value
                ]
            ) => {
                return result.replaceAll(
                    `{{${key}}}`,
                    String(
                        value ?? ""
                    )
                );
            },
            String(
                text || ""
            )
        );
    }

    /**
     * Membuat salinan data.
     *
     * @param {any} value
     * @returns {any}
     */
    function cloneData(
        value
    ) {
        if (
            typeof structuredClone ===
            "function"
        ) {
            return structuredClone(
                value
            );
        }

        return JSON.parse(
            JSON.stringify(
                value
            )
        );
    }

    /**
     * Menormalisasi error.
     *
     * @param {unknown} error
     * @returns {Error}
     */
    function normalizeError(
        error
    ) {
        if (
            error instanceof
                Error
        ) {
            return error;
        }

        return new Error(
            String(
                error ||
                "Terjadi kesalahan pada FooterComponent."
            )
        );
    }

    /**
     * Mengirim event melalui ComponentCore.
     *
     * @param {string} eventName
     * @param {object} detail
     * @returns {boolean}
     */
    function dispatch(
        eventName,
        detail = {}
    ) {
        if (
            core &&
            !core.isDestroyed()
        ) {
            return core.dispatch(
                eventName,
                {
                    component:
                        publicAPI,

                    version:
                        VERSION,

                    ...detail
                }
            );
        }

        return dispatchDirect(
            eventName,
            detail
        );
    }

    /**
     * Mengirim event langsung.
     *
     * @param {string} eventName
     * @param {object} detail
     * @returns {boolean}
     */
    function dispatchDirect(
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

                        ...detail
                    }
                }
            )
        );
    }

    /**
     * Memeriksa status render.
     *
     * @returns {boolean}
     */
    function hasRendered() {
        return Boolean(
            rendered &&
            rootElement?.isConnected
        );
    }

    /**
     * Mengambil root Footer.
     *
     * @returns {HTMLElement|null}
     */
    function getElement() {
        return rootElement;
    }

    /**
     * Mengambil error terakhir.
     *
     * @returns {Error|null}
     */
    function getLastError() {
        return lastError;
    }

    /* ======================================================
       PUBLIC API
    ====================================================== */

    const publicAPI =
        Object.freeze({
            version:
                VERSION,

            render,
            destroy,

            refreshLanguage,
            refreshNavigation,
            updateLanguageButtons,

            getNavigationBrands,

            hasRendered,
            getElement,
            getLastError,

            getCore() {
                return core;
            }
        });

    return publicAPI;
})();

window.FooterComponent =
    FooterComponent;