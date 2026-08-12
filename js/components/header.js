"use strict";

/**
 * ==========================================================
 * GOMAI HEADER COMPONENT
 * Version 3.0.0
 * ==========================================================
 *
 * Shared Header untuk seluruh halaman Gomai.
 *
 * Tanggung jawab:
 * - Merender identitas Gomai.
 * - Merender navigasi brand dari BrandsModel.
 * - Merender navigasi desktop dan mobile.
 * - Mengelola pergantian bahasa.
 * - Menyediakan tombol WeChat.
 * - Menjadi pemicu SearchPanelComponent.
 * - Menandai navigasi aktif.
 * - Menyediakan lifecycle yang kompatibel dengan
 *   ComponentRegistry dan ComponentCore.
 *
 * Komponen ini tidak:
 * - membaca file JSON secara langsung;
 * - membaca ProductsModel;
 * - melakukan pencarian produk;
 * - membuat form pencarian internal;
 * - melakukan normalisasi data brand mentah.
 *
 * Sumber data navigasi:
 * CategoriesModel.getNavigation()
 *
 * Search UI:
 * SearchPanelComponent
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
 * - updateCurrentNavigation()
 * - openSearch()
 * - closeSearch()
 * - openMobileNavigation()
 * - closeMobileNavigation()
 * - toggleMobileNavigation()
 * - hasRendered()
 * - getElement()
 * - getNavigationCategories()
 * - getCore()
 * ==========================================================
 */

const HeaderComponent = (() => {
    /* ======================================================
       CONSTANTS
    ====================================================== */

    const VERSION =
        "4.1.0";

    const DEFAULT_TARGET_ID =
        "site-header";

    const SEARCH_HOST_ID =
        "header-search-panel-host";

    const MOBILE_NAVIGATION_ID =
        "shared-mobile-navigation";

    const SEARCH_BUTTON_ID =
        "shared-open-search-button";

    const MOBILE_MENU_BUTTON_ID =
        "shared-mobile-menu-button";

    const DEFAULT_NAVIGATION_LIMIT =
        4;

    const DEFAULT_OPTIONS =
        Object.freeze({
            targetId:
                DEFAULT_TARGET_ID,

            showPromoBar:
                false,

            showSearch:
                true,

            showWechat:
                true,

            showMobileWechat:
                true,

            wechatHref:
                "#wechat",

            searchMode:
                "dropdown",

            searchOpenOnRender:
                false,

            searchCloseOnSubmit:
                false,

            searchCloseOnSelect:
                true,

            searchCloseOnOutsideClick:
                true,

            navigationLimit:
                DEFAULT_NAVIGATION_LIMIT,

            /*
             * null:
             * data navigasi diambil dari BrandsModel.
             *
             * Array:
             * dipakai sebagai override eksplisit.
             */
            navigationCategories:
                null
        });

    /* ======================================================
       INTERNAL STATE
    ====================================================== */

    let options = {
        ...DEFAULT_OPTIONS
    };

    let navigationCategories =
        [];

    let rootElement =
        null;

    let core =
        null;

    let rendered =
        false;

    let rendering =
        false;

    let renderPromise =
        null;

    let mobileNavigationOpen =
        false;

    let searchPanelInitialized =
        false;

    let searchInitializationPromise =
        null;

    let lastError =
        null;

    const elements = {
        promoBar:
            null,

        promoText:
            null,

        promoLink:
            null,

        headerInner:
            null,

        logoLink:
            null,

        desktopNavigation:
            null,

        mobileNavigation:
            null,

        searchOpenButton:
            null,

        searchHost:
            null,

        mobileMenuButton:
            null,

        desktopWechatButton:
            null,

        mobileWechatButton:
            null,

        languageButtons:
            []
    };

    /* ======================================================
       RENDER
    ====================================================== */

    /**
     * Merender Header.
     *
     * Markup baru dibangun terlebih dahulu di luar DOM.
     * Isi Header lama baru diganti setelah seluruh proses
     * persiapan berhasil.
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
            updateCurrentNavigation();

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
            renderPromise =
                null;
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
        rendering =
            true;

        lastError =
            null;

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
                    `HeaderComponent: target "${options.targetId}" tidak ditemukan.`
                );

                return null;
            }

            /*
             * Muat data sebelum menyentuh isi Header lama.
             */
            navigationCategories =
                await resolveNavigationCategories(
                    options
                );

            /*
             * Bangun markup pada DocumentFragment.
             * Jika terjadi error, Header lama tetap utuh.
             */
            const fragment =
                buildHeaderFragment();

            if (
                rendered ||
                core
            ) {
                cleanupCurrentInstance({
                    clearMarkup:
                        false
                });
            }

            rootElement =
                target;

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

            rendered =
                true;

            mobileNavigationOpen =
                false;

            refreshLanguage();
            updateCurrentNavigation();

            dispatch(
                "gomai:header-rendered",
                {
                    targetId:
                        options.targetId,

                    navigationCategories:
                        getNavigationCategories(),

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
                "HeaderComponent gagal dirender:",
                lastError
            );

            dispatchDirect(
                "gomai:header-error",
                {
                    error:
                        lastError
                }
            );

            /*
             * Jangan menghapus fallback atau Header lama
             * ketika proses render gagal.
             */
            return null;
        } finally {
            rendering =
                false;
        }
    }

    /**
     * Membuat instance ComponentCore.
     */
    function createCore() {
        core =
            window.ComponentCore.create({
                name:
                    "header",

                languageAware:
                    false,

                visible:
                    true,

                enabled:
                    true,

                eventTarget:
                    document,

                data: {
                    mobileNavigationOpen:
                        false,

                    searchOpen:
                        false,

                    navigationCategoryCount:
                        navigationCategories.length
                }
            });
    }

    /**
     * Memberikan class dan atribut root Header.
     */
    function applyRootAttributes() {
        rootElement.className =
            [
                "site-header",
                "header",
                "home-header",
                "shared-header"
            ].join(" ");

        rootElement.dataset.headerRendered =
            "true";

        rootElement.dataset.headerVersion =
            VERSION;
    }

    /**
     * Membuat seluruh markup Header di luar DOM.
     *
     * @returns {DocumentFragment}
     */
    function buildHeaderFragment() {
        const fragment =
            document.createDocumentFragment();

        if (
            options.showPromoBar
        ) {
            fragment.append(
                createPromoBar()
            );
        }

        const inner =
            document.createElement(
                "div"
            );

        inner.className =
            [
                "container",
                "header-inner",
                "home-header-inner",
                "shared-header-inner"
            ].join(" ");

        inner.append(
            createLogo(),
            createDesktopNavigation(),
            createHeaderActions()
        );

        fragment.append(
            inner,
            createMobileNavigation()
        );

        return fragment;
    }

    /* ======================================================
       NAVIGATION DATA
    ====================================================== */

    /**
     * Menentukan sumber data navigasi.
     *
     * Urutan prioritas:
     * 1. customOptions.navigationCategories
     * 2. CategoriesModel.getNavigation()
     *
     * @param {object} normalizedOptions
     * @returns {Promise<object[]>}
     */
    async function resolveNavigationCategories(
        normalizedOptions
    ) {
        if (
            Array.isArray(
                normalizedOptions.navigationCategories
            )
        ) {
            return normalizeNavigationCategories(
                normalizedOptions.navigationCategories
            );
        }

        const model =
            getCategoriesModel();

        if (
            !model ||
            typeof model.getNavigation !==
                "function"
        ) {
            console.warn(
                "HeaderComponent: CategoriesModel.getNavigation() belum tersedia. Navigasi brand dikosongkan."
            );

            return [];
        }

        try {
            const data =
                await model.getNavigation(
                    normalizedOptions
                        .navigationLimit
                );

            return normalizeNavigationCategories(
                data
            );
        } catch (error) {
            console.error(
                "HeaderComponent gagal mengambil navigasi brand:",
                error
            );

            dispatchDirect(
                "gomai:header-navigation-error",
                {
                    error:
                        normalizeError(
                            error
                        )
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
    function getCategoriesModel() {
        return (
            window.Gomai
                ?.getModel?.(
                    "categories"
                ) ||
            window.ModelRegistry
                ?.get?.(
                    "categories"
                ) ||
            window.CategoriesModel ||
            null
        );
    }

    /**
     * Menormalisasi koleksi brand navigasi.
     *
     * @param {unknown} values
     * @returns {{id:string,slug:string,name:string}[]}
     */
    function normalizeNavigationCategories(
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
                normalizeNavigationCategory
            )
            .filter(
                brand => {
                    if (
                        !brand.id
                    ) {
                        return false;
                    }

                    const key =
                        brand.id.toLowerCase();

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
     * Menormalisasi satu brand navigasi.
     *
     * @param {unknown} brand
     * @returns {{id:string,slug:string,name:string}}
     */
    function normalizeNavigationCategory(
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
                brand?.name ||
                id,

            description:
                brand?.description ||
                "",

            icon:
                normalizeText(
                    brand?.icon
                )
        };
    }

    /**
     * Memuat ulang navigasi dari BrandsModel lalu
     * merender ulang Header.
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

            navigationCategories:
                null
        });
    }

    /**
     * Mengambil salinan brand navigasi aktif.
     *
     * @returns {object[]}
     */
    function getNavigationCategories() {
        return cloneData(
            navigationCategories
        );
    }

    /* ======================================================
       PROMO BAR
    ====================================================== */

    /**
     * Membuat promo bar.
     *
     * @returns {HTMLElement}
     */
    function createPromoBar() {
        const promoBar =
            document.createElement(
                "div"
            );

        promoBar.className =
            "promo-bar";

        const inner =
            document.createElement(
                "div"
            );

        inner.className =
            "container promo-bar-inner";

        const text =
            document.createElement(
                "p"
            );

        setTextTranslation(
            text,
            "announcement.text",
            "Belanja mudah, kami antar."
        );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            getHowToBuyRoute();

        setTextTranslation(
            link,
            "announcement.link",
            "Lihat cara belanja"
        );

        inner.append(
            text,
            link
        );

        promoBar.append(
            inner
        );

        return promoBar;
    }

    /* ======================================================
       LOGO
    ====================================================== */

    /**
     * Membuat identitas Gomai.
     *
     * Source logo berasal dari GomaiConfig.site.logo.header.
     * Wordmark teks dipertahankan hanya sebagai fallback
     * apabila aset logo gagal dimuat.
     *
     * @returns {HTMLAnchorElement}
     */
    function createLogo() {
        const link =
            document.createElement(
                "a"
            );

        link.className =
            [
                "logo",
                "home-logo",
                "shared-header-logo"
            ].join(" ");

        link.href =
            getRoute(
                "home",
                "index.html"
            );

        setAriaTranslation(
            link,
            "common.home",
            "Beranda"
        );

        const logoImage =
            document.createElement(
                "img"
            );

        logoImage.className =
            "shared-header-logo-image";

        logoImage.src =
            getHeaderLogoPath();

        logoImage.alt =
            window.GomaiConfig
                ?.site
                ?.name ||
            "Gomai";

        logoImage.decoding =
            "async";

        const logoText =
            document.createElement(
                "strong"
            );

        logoText.className =
            [
                "logo-text",
                "shared-header-logo-fallback"
            ].join(" ");

        logoText.textContent =
            window.GomaiConfig
                ?.site
                ?.name ||
            "Gomai";

        logoText.hidden =
            true;

        logoImage.addEventListener(
            "error",
            () => {
                logoImage.hidden =
                    true;

                logoText.hidden =
                    false;
            },
            {
                once:
                    true
            }
        );

        link.append(
            logoImage,
            logoText
        );

        return link;
    }

    /**
     * Mengambil path logo Header dari konfigurasi dan
     * menyesuaikannya dengan posisi halaman aktif.
     *
     * @returns {string}
     */
    function getHeaderLogoPath() {
        const configuredPath =
            normalizeText(
                window.GomaiConfig
                    ?.site
                    ?.logo
                    ?.header
            ) ||
            "assets/gomai/logo-header.png";

        try {
            if (
                typeof window.GomaiUtils
                    ?.resolveAssetPath ===
                "function"
            ) {
                return window.GomaiUtils
                    .resolveAssetPath(
                        configuredPath
                    );
            }
        } catch (error) {
            console.warn(
                "HeaderComponent: gagal resolve asset logo Gomai.",
                error
            );
        }

        return resolveFallbackPath(
            configuredPath
        );
    }

    /* ======================================================
       DESKTOP NAVIGATION
    ====================================================== */

    /**
     * Membuat navigasi desktop.
     *
     * @returns {HTMLElement}
     */
    function createDesktopNavigation() {
        const navigation =
            document.createElement(
                "nav"
            );

        navigation.className =
            [
                "nav",
                "home-navigation",
                "shared-navigation"
            ].join(" ");

        setAriaTranslation(
            navigation,
            "navigation.mainLabel",
            "Navigasi utama"
        );

        navigationCategories
            .forEach(
                brand => {
                    navigation.append(
                        createCategoryNavigationLink(
                            brand
                        )
                    );
                }
            );

        navigation.append(
            createAllProductsLink()
        );

        return navigation;
    }

    /**
     * Membuat link navigasi satu brand.
     *
     * @param {{id:string,slug:string,name:string}} brand
     * @returns {HTMLAnchorElement}
     */
    function createCategoryNavigationLink(
        category
    ) {
        const normalizedCategory =
            normalizeNavigationCategory(
                category
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            buildRoute(
                "products",
                {
                    category:
                        normalizedCategory.id
                },
                `pages/products.html?category=${encodeURIComponent(
                    normalizedCategory.id
                )}`
            );

        link.textContent =
            getNavigationCategoryName(
                normalizedCategory
            );

        link.dataset.categoryId =
            normalizedCategory.id;

        link.dataset.categorySlug =
            normalizedCategory.slug;

        link.dataset.navigationRoute =
            "category";

        return link;
    }

    function getNavigationCategoryName(
        category
    ) {
        const language =
            getCurrentLanguage();

        const value =
            category?.name;

        if (
            typeof value ===
            "string"
        ) {
            return normalizeText(
                value
            );
        }

        return normalizeText(
            value?.[language] ||
            value?.zh ||
            value?.id ||
            category?.id
        );
    }


    /**
     * Membuat link semua produk.
     *
     * @returns {HTMLAnchorElement}
     */
    function createAllProductsLink() {
        const link =
            document.createElement(
                "a"
            );

        link.href =
            getRoute(
                "products",
                "pages/products.html"
            );

        link.className =
            "navigation-sale";

        link.dataset.navigationRoute =
            "products";

        setTextTranslation(
            link,
            "navigation.allProducts",
            "Semua Produk"
        );

        return link;
    }

    /* ======================================================
       HEADER ACTIONS
    ====================================================== */

    /**
     * Membuat area tindakan Header.
     *
     * @returns {HTMLElement}
     */
    function createHeaderActions() {
        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            [
                "header-actions",
                "home-header-actions",
                "shared-header-actions"
            ].join(" ");

        if (
            options.showSearch
        ) {
            actions.append(
                createSearchOpenButton()
            );
        }

        actions.append(
            createLanguageSwitch(),
            createShoppingLink(
                "wishlist",
                "wishlist",
                "♡"
            ),
            createShoppingLink(
                "cart",
                "cart",
                "🛒"
            )
        );

        if (
            options.showWechat
        ) {
            actions.append(
                createWechatButton(
                    "desktop"
                )
            );
        }

        actions.append(
            createMobileMenuButton()
        );

        return actions;
    }

    /**
     * Membuat tombol pencarian.
     *
     * @returns {HTMLAnchorElement}
     */
    function createSearchOpenButton() {
        const link =
            document.createElement(
                "a"
            );

        link.id =
            SEARCH_BUTTON_ID;

        link.className =
            "header-icon-button";

        link.href =
            getRoute(
                "search",
                "pages/search.html"
            );

        setAriaTranslation(
            link,
            "navigation.openSearch",
            "Buka pencarian"
        );

        const icon =
            document.createElement(
                "span"
            );

        icon.setAttribute(
            "aria-hidden",
            "true"
        );

        icon.textContent =
            "⌕";

        link.append(
            icon
        );

        return link;
    }

    /**
     * Membuat pemilih bahasa.
     *
     * @returns {HTMLElement}
     */
    function createLanguageSwitch() {
        const container =
            document.createElement(
                "div"
            );

        container.className =
            "language-switch";

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
                "ID"
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
       CART / WISHLIST
    ====================================================== */

    function createShoppingLink(routeName, type, iconText) {
        const link = document.createElement("a");
        link.className = `header-shopping-link header-${type}-link`;
        link.href = getRoute(routeName, `pages/${type}.html`);
        link.dataset.shoppingType = type;

        const label = translate(
            type === "wishlist" ? "wishlist.title" : "cart.title",
            type === "wishlist" ? "Wishlist" : "Keranjang"
        );

        link.setAttribute("aria-label", label);
        link.title = label;

        const icon = document.createElement("span");
        icon.className = "header-shopping-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = iconText;

        const badge = document.createElement("span");
        badge.className = "header-shopping-badge";
        badge.dataset.shoppingBadge = type;
        badge.setAttribute("aria-hidden", "true");

        link.append(icon, badge);
        updateShoppingBadge(link, type);
        ensureShoppingStateBinding();
        return link;
    }

    let shoppingStateBound = false;

    function ensureShoppingStateBinding() {
        if (shoppingStateBound) return;
        shoppingStateBound = true;

        document.addEventListener("gomai:cart-changed", refreshShoppingBadges);
        document.addEventListener("gomai:wishlist-changed", refreshShoppingBadges);
    }

    function refreshShoppingBadges() {
        document.querySelectorAll("[data-shopping-type]").forEach(link => {
            updateShoppingBadge(link, link.dataset.shoppingType || "");
        });
    }

    function updateShoppingBadge(link, type) {
        const badge = link?.querySelector?.("[data-shopping-badge]");
        if (!badge) return;

        const store = window.GomaiShoppingState;
        const count = type === "wishlist"
            ? Number(store?.getWishlistCount?.() || 0)
            : Number(store?.getCartCount?.() || 0);

        badge.textContent = count > 99 ? "99+" : String(count);
        badge.hidden = count <= 0;
    }

    /**
     * Membuat tombol WeChat.
     *
     * @param {"desktop"|"mobile"} location
     * @returns {HTMLAnchorElement}
     */
    function createWechatButton(
        location
    ) {
        const link =
            document.createElement(
                "a"
            );

        link.href =
            options.wechatHref ===
                "#wechat"
                ? getRoute(
                    "contact",
                    "pages/contact.html"
                )
                : options.wechatHref;

        link.className =
            location === "mobile"
                ? [
                    "btn",
                    "btn-primary",
                    "header-wechat-button",
                    "mobile-navigation-wechat"
                ].join(" ")
                : [
                    "btn",
                    "btn-primary",
                    "header-wechat-button"
                ].join(" ");

        link.dataset.wechatLocation =
            location;

        setTextTranslation(
            link,
            "common.wechat",
            "WeChat"
        );

        return link;
    }

    /**
     * Membuat tombol menu mobile.
     *
     * @returns {HTMLButtonElement}
     */
    function createMobileMenuButton() {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.id =
            MOBILE_MENU_BUTTON_ID;

        button.className =
            "mobile-menu-button";

        button.setAttribute(
            "aria-controls",
            MOBILE_NAVIGATION_ID
        );

        button.setAttribute(
            "aria-expanded",
            "false"
        );

        setAriaTranslation(
            button,
            "navigation.openMenu",
            "Buka menu"
        );

        for (
            let index = 0;
            index < 3;
            index += 1
        ) {
            const line =
                document.createElement(
                    "span"
                );

            line.setAttribute(
                "aria-hidden",
                "true"
            );

            button.append(
                line
            );
        }

        return button;
    }

    /* ======================================================
       MOBILE NAVIGATION
    ====================================================== */

    /**
     * Membuat navigasi mobile.
     *
     * @returns {HTMLElement}
     */
    function createMobileNavigation() {
        const navigation =
            document.createElement(
                "nav"
            );

        navigation.id =
            MOBILE_NAVIGATION_ID;

        navigation.className =
            "mobile-navigation";

        navigation.hidden =
            true;

        setAriaTranslation(
            navigation,
            "navigation.mobileLabel",
            "Navigasi mobile"
        );

        const inner =
            document.createElement(
                "div"
            );

        inner.className =
            "container mobile-navigation-inner";

        navigationCategories
            .forEach(
                brand => {
                    inner.append(
                        createCategoryNavigationLink(
                            brand
                        )
                    );
                }
            );

        inner.append(
            createAllProductsLink()
        );

        if (
            options.showWechat &&
            options.showMobileWechat
        ) {
            inner.append(
                createWechatButton(
                    "mobile"
                )
            );
        }

        navigation.append(
            inner
        );

        return navigation;
    }

    /**
     * Membuka navigasi mobile.
     *
     * @returns {boolean}
     */
    function openMobileNavigation() {
        if (
            !rendered ||
            !elements.mobileNavigation
        ) {
            return false;
        }

        void closeSearch();

        mobileNavigationOpen =
            true;

        elements.mobileNavigation.hidden =
            false;

        elements.mobileNavigation.setAttribute(
            "aria-hidden",
            "false"
        );

        elements.mobileMenuButton
            ?.setAttribute(
                "aria-expanded",
                "true"
            );

        elements.mobileMenuButton
            ?.classList.add(
                "is-active"
            );

        document.body.classList.add(
            "mobile-navigation-open"
        );

        core?.setData(
            "mobileNavigationOpen",
            true
        );

        updateMobileMenuLabel(
            true
        );

        dispatch(
            "gomai:header-mobile-navigation-opened"
        );

        return true;
    }

    /**
     * Menutup navigasi mobile.
     *
     * @returns {boolean}
     */
    function closeMobileNavigation() {
        if (
            !elements.mobileNavigation
        ) {
            return false;
        }

        mobileNavigationOpen =
            false;

        elements.mobileNavigation.hidden =
            true;

        elements.mobileNavigation.setAttribute(
            "aria-hidden",
            "true"
        );

        elements.mobileMenuButton
            ?.setAttribute(
                "aria-expanded",
                "false"
            );

        elements.mobileMenuButton
            ?.classList.remove(
                "is-active"
            );

        document.body.classList.remove(
            "mobile-navigation-open"
        );

        core?.setData(
            "mobileNavigationOpen",
            false
        );

        updateMobileMenuLabel(
            false
        );

        return true;
    }

    /**
     * Toggle navigasi mobile.
     *
     * @returns {boolean}
     */
    function toggleMobileNavigation() {
        return mobileNavigationOpen
            ? closeMobileNavigation()
            : openMobileNavigation();
    }

    /* ======================================================
       SEARCH HOST
    ====================================================== */

    /**
     * Membuat host SearchPanelComponent.
     *
     * @returns {HTMLElement}
     */
    function createSearchHost() {
        const host =
            document.createElement(
                "div"
            );

        host.id =
            SEARCH_HOST_ID;

        host.className =
            "header-search-panel-host";

        host.hidden =
            true;

        host.setAttribute(
            "aria-hidden",
            "true"
        );

        return host;
    }

    /**
     * Memastikan SearchPanelComponent sudah dirender.
     *
     * @returns {Promise<object|null>}
     */
    async function ensureSearchPanel() {
        if (
            !options.showSearch
        ) {
            return null;
        }

        const component =
            getSearchPanelComponent();

        if (!component) {
            console.warn(
                "HeaderComponent: SearchPanelComponent belum tersedia."
            );

            return null;
        }

        if (
            component.hasRendered?.()
        ) {
            searchPanelInitialized =
                true;

            return component;
        }

        if (
            searchInitializationPromise
        ) {
            await searchInitializationPromise;

            return component;
        }

        searchInitializationPromise =
            Promise.resolve(
                component.render({
                    targetId:
                        SEARCH_HOST_ID,

                    mode:
                        options.searchMode,

                    openOnRender:
                        options.searchOpenOnRender,

                    closeOnSubmit:
                        options.searchCloseOnSubmit,

                    closeOnSelect:
                        options.searchCloseOnSelect,

                    closeOnOutsideClick:
                        options.searchCloseOnOutsideClick,

                    showCloseButton:
                        true
                })
            );

        try {
            const result =
                await searchInitializationPromise;

            searchPanelInitialized =
                Boolean(result);

            return result
                ? component
                : null;
        } catch (error) {
            console.error(
                "HeaderComponent gagal merender SearchPanelComponent:",
                error
            );

            dispatch(
                "gomai:header-search-error",
                {
                    error:
                        normalizeError(
                            error
                        )
                }
            );

            return null;
        } finally {
            searchInitializationPromise =
                null;
        }
    }

    /**
     * Membuka Search Panel.
     *
     * @returns {Promise<boolean>}
     */
    async function openSearch() {
        window.location.href =
            getRoute(
                "search",
                "pages/search.html"
            );

        return true;
    }

    /**
     * Menutup Search Panel.
     *
     * @returns {Promise<boolean>}
     */
    async function closeSearch() {
        if (
            !rendered ||
            !options.showSearch
        ) {
            return false;
        }

        const component =
            getSearchPanelComponent();

        if (
            component?.hasRendered?.()
        ) {
            await component.close?.({
                blur:
                    true
            });
        }

        if (
            elements.searchHost
        ) {
            elements.searchHost.hidden =
                true;

            elements.searchHost.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        elements.searchOpenButton
            ?.setAttribute(
                "aria-expanded",
                "false"
            );

        document.body.classList.remove(
            "header-search-open"
        );

        core?.setData(
            "searchOpen",
            false
        );

        dispatch(
            "gomai:header-search-closed"
        );

        return true;
    }

    /**
     * Mengalihkan ke halaman produk bila Search Panel
     * belum tersedia.
     */
    function redirectToProductsSearch() {
        window.location.href =
            getRoute(
                "search",
                "pages/search.html"
            );
    }

    /**
     * Mengambil SearchPanelComponent.
     *
     * @returns {object|null}
     */
    function getSearchPanelComponent() {
        return (
            window.Gomai
                ?.getComponent?.(
                    "searchPanel"
                ) ||
            window.ComponentRegistry
                ?.get?.(
                    "searchPanel"
                ) ||
            window.SearchPanelComponent ||
            null
        );
    }

    /* ======================================================
       ELEMENT CACHE
    ====================================================== */

    /**
     * Menyimpan referensi elemen Header.
     */
    function cacheElements() {
        elements.promoBar =
            rootElement.querySelector(
                ".promo-bar"
            );

        elements.promoText =
            rootElement.querySelector(
                "[data-header-text-key='announcement.text']"
            );

        elements.promoLink =
            rootElement.querySelector(
                "[data-header-text-key='announcement.link']"
            );

        elements.headerInner =
            rootElement.querySelector(
                ".shared-header-inner"
            );

        elements.logoLink =
            rootElement.querySelector(
                ".shared-header-logo"
            );

        elements.desktopNavigation =
            rootElement.querySelector(
                ".shared-navigation"
            );

        elements.mobileNavigation =
            rootElement.querySelector(
                `#${MOBILE_NAVIGATION_ID}`
            );

        elements.searchOpenButton =
            rootElement.querySelector(
                `#${SEARCH_BUTTON_ID}`
            );

        elements.searchHost =
            rootElement.querySelector(
                `#${SEARCH_HOST_ID}`
            );

        elements.mobileMenuButton =
            rootElement.querySelector(
                `#${MOBILE_MENU_BUTTON_ID}`
            );

        elements.desktopWechatButton =
            rootElement.querySelector(
                "[data-wechat-location='desktop']"
            );

        elements.mobileWechatButton =
            rootElement.querySelector(
                "[data-wechat-location='mobile']"
            );

        elements.languageButtons =
            Array.from(
                rootElement.querySelectorAll(
                    "[data-language]"
                )
            );
    }

    /* ======================================================
       EVENT BINDING
    ====================================================== */

    /**
     * Memasang seluruh event Header.
     */
    function bindEvents() {
        if (
            elements.mobileMenuButton
        ) {
            core.on(
                elements.mobileMenuButton,
                "click",
                handleMobileMenuButtonClick
            );
        }

        if (
            elements.mobileNavigation
        ) {
            core.on(
                elements.mobileNavigation,
                "click",
                handleMobileNavigationClick
            );
        }

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

        core.on(
            document,
            "keydown",
            handleDocumentKeydown
        );

        core.on(
            document,
            "click",
            handleDocumentClick
        );

        core.on(
            "gomai:search-open",
            handleSearchPanelOpened
        );

        core.on(
            "gomai:search-close",
            handleSearchPanelClosed
        );
    }

    function handleSearchButtonClick() {
        void openSearch();
    }

    function handleMobileMenuButtonClick() {
        toggleMobileNavigation();
    }

    /**
     * @param {MouseEvent} event
     */
    function handleMobileNavigationClick(
        event
    ) {
        const link =
            event.target.closest(
                "a"
            );

        if (link) {
            closeMobileNavigation();
        }
    }

    /**
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
            } else if (
                typeof window.Language
                    .load ===
                "function"
            ) {
                await window.Language
                    .load(
                        language
                    );
            } else {
                throw new Error(
                    "Language.setLanguage() dan Language.load() tidak tersedia."
                );
            }
        } catch (error) {
            console.error(
                "HeaderComponent gagal mengganti bahasa:",
                error
            );

            dispatch(
                "gomai:header-language-error",
                {
                    language,

                    error:
                        normalizeError(
                            error
                        )
                }
            );
        }
    }

    /**
     * @param {KeyboardEvent} event
     */
    function handleDocumentKeydown(
        event
    ) {
        if (
            event.key !==
            "Escape"
        ) {
            return;
        }

        void closeSearch();
        closeMobileNavigation();
    }

    /**
     * @param {MouseEvent} event
     */
    function handleDocumentClick(
        event
    ) {
        if (
            !mobileNavigationOpen ||
            !rootElement ||
            rootElement.contains(
                event.target
            )
        ) {
            return;
        }

        closeMobileNavigation();
    }

    function handleSearchPanelOpened() {
        elements.searchOpenButton
            ?.setAttribute(
                "aria-expanded",
                "true"
            );

        if (
            elements.searchHost
        ) {
            elements.searchHost.hidden =
                false;

            elements.searchHost.setAttribute(
                "aria-hidden",
                "false"
            );
        }

        document.body.classList.add(
            "header-search-open"
        );

        core?.setData(
            "searchOpen",
            true
        );
    }

    function handleSearchPanelClosed() {
        elements.searchOpenButton
            ?.setAttribute(
                "aria-expanded",
                "false"
            );

        if (
            elements.searchHost
        ) {
            elements.searchHost.hidden =
                true;

            elements.searchHost.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        document.body.classList.remove(
            "header-search-open"
        );

        core?.setData(
            "searchOpen",
            false
        );
    }

    /* ======================================================
       LANGUAGE
    ====================================================== */

    /**
     * Memperbarui seluruh teks Header.
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
                "[data-header-text-key]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .headerTextKey;

                    const fallback =
                        element.dataset
                            .headerTextFallback ||
                        "";

                    element.textContent =
                        translate(
                            key,
                            fallback
                        );
                }
            );

        rootElement
            .querySelectorAll(
                "[data-header-placeholder-key]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .headerPlaceholderKey;

                    const fallback =
                        element.dataset
                            .headerPlaceholderFallback ||
                        "";

                    element.placeholder =
                        translate(
                            key,
                            fallback
                        );
                }
            );

        rootElement
            .querySelectorAll(
                "[data-header-aria-key]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .headerAriaKey;

                    const fallback =
                        element.dataset
                            .headerAriaFallback ||
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
                "[data-category-id]"
            )
            .forEach(
                link => {
                    const category =
                        navigationCategories.find(
                            item =>
                                item.id ===
                                link.dataset.categoryId
                        );

                    if (category) {
                        link.textContent =
                            getNavigationCategoryName(
                                category
                            );
                    }
                }
            );

        updateLanguageButtons();

        updateMobileMenuLabel(
            mobileNavigationOpen
        );

        return true;
    }

    /**
     * Menandai bahasa aktif.
     */
    function updateLanguageButtons() {
        const currentLanguage =
            getCurrentLanguage();

        elements.languageButtons
            .forEach(
                button => {
                    const active =
                        button.dataset
                            .language ===
                        currentLanguage;

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
    }

    /**
     * Memperbarui label tombol menu mobile.
     *
     * @param {boolean} isOpen
     */
    function updateMobileMenuLabel(
        isOpen
    ) {
        if (
            !elements.mobileMenuButton
        ) {
            return;
        }

        elements.mobileMenuButton
            .setAttribute(
                "aria-label",
                isOpen
                    ? translate(
                        "navigation.closeMenu",
                        "Tutup menu"
                    )
                    : translate(
                        "navigation.openMenu",
                        "Buka menu"
                    )
            );
    }

    /* ======================================================
       ACTIVE NAVIGATION
    ====================================================== */

    /**
     * Menandai link navigasi aktif.
     *
     * @returns {boolean}
     */
    function updateCurrentNavigation() {
        if (
            !rendered ||
            !rootElement
        ) {
            return false;
        }

        const pathname =
            window.location.pathname
                .toLowerCase();

        rootElement
            .querySelectorAll(
                "[data-navigation-route]"
            )
            .forEach(
                link => {
                    const route =
                        link.dataset
                            .navigationRoute;

                    let active =
                        false;

                    const activeCategoryId =
                        getQueryParameter(
                            window.GomaiConfig
                                ?.query
                                ?.category ||
                            "category"
                        ).toLowerCase();

                    if (
                        route === "products" &&
                        pathname.includes(
                            "products.html"
                        ) &&
                        !activeCategoryId
                    ) {
                        active =
                            true;
                    }

                    if (
                        route === "category" &&
                        pathname.includes(
                            "products.html"
                        ) &&
                        String(
                            link.dataset
                                .categoryId ||
                            ""
                        ).toLowerCase() ===
                            activeCategoryId
                    ) {
                        active =
                            true;
                    }

                    link.classList.toggle(
                        "is-active",
                        active
                    );

                    if (active) {
                        link.setAttribute(
                            "aria-current",
                            "page"
                        );
                    } else {
                        link.removeAttribute(
                            "aria-current"
                        );
                    }
                }
            );

        return true;
    }

    /* ======================================================
       DESTROY AND CLEANUP
    ====================================================== */

    /**
     * Menghapus Header.
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
            "gomai:header-destroyed"
        );

        return true;
    }

    /**
     * Membersihkan instance Header aktif.
     *
     * @param {{clearMarkup?:boolean}} cleanupOptions
     */
    function cleanupCurrentInstance(
        cleanupOptions = {}
    ) {
        const clearMarkup =
            cleanupOptions.clearMarkup !==
            false;

        mobileNavigationOpen =
            false;

        const searchPanel =
            getSearchPanelComponent();

        if (
            searchPanel?.hasRendered?.()
        ) {
            Promise.resolve(
                searchPanel.close?.({
                    blur:
                        true
                })
            ).catch(
                error => {
                    console.warn(
                        "HeaderComponent gagal menutup SearchPanel saat cleanup:",
                        error
                    );
                }
            );
        }

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
                "data-header-rendered"
            );

            rootElement.removeAttribute(
                "data-header-version"
            );
        }

        document.body.classList.remove(
            "header-search-open",
            "mobile-navigation-open"
        );

        resetElementCache();

        core =
            null;

        rendered =
            false;

        searchPanelInitialized =
            false;

        searchInitializationPromise =
            null;

        if (clearMarkup) {
            rootElement =
                null;

            navigationCategories =
                [];
        }
    }

    /**
     * Menghapus referensi elemen.
     */
    function resetElementCache() {
        Object.keys(elements)
            .forEach(
                key => {
                    elements[key] =
                        Array.isArray(
                            elements[key]
                        )
                            ? []
                            : null;
                }
            );

        elements.languageButtons =
            [];
    }

    /* ======================================================
       TRANSLATION HELPERS
    ====================================================== */

    /**
     * @param {HTMLElement} element
     * @param {string} key
     * @param {string} fallback
     */
    function setTextTranslation(
        element,
        key,
        fallback
    ) {
        element.dataset.headerTextKey =
            key;

        element.dataset.headerTextFallback =
            fallback;

        element.textContent =
            fallback;
    }

    /**
     * @param {HTMLElement} element
     * @param {string} key
     * @param {string} fallback
     */
    function setAriaTranslation(
        element,
        key,
        fallback
    ) {
        element.dataset.headerAriaKey =
            key;

        element.dataset.headerAriaFallback =
            fallback;

        element.setAttribute(
            "aria-label",
            fallback
        );
    }

    /**
     * @param {HTMLElement} element
     * @param {string} key
     * @param {string} fallback
     */
    function setPlaceholderTranslation(
        element,
        key,
        fallback
    ) {
        element.dataset.headerPlaceholderKey =
            key;

        element.dataset.headerPlaceholderFallback =
            fallback;

        element.placeholder =
            fallback;
    }

    /* ======================================================
       ROUTE HELPERS
    ====================================================== */

    /**
     * @param {string} name
     * @param {string} fallback
     * @returns {string}
     */
    function getRoute(
        name,
        fallback
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
                            name
                        );

                if (route) {
                    return route;
                }
            }
        } catch (error) {
            console.warn(
                `HeaderComponent: route "${name}" tidak ditemukan.`,
                error
            );
        }

        return resolveFallbackPath(
            fallback
        );
    }

    /**
     * @param {string} name
     * @param {object} parameters
     * @param {string} fallback
     * @returns {string}
     */
    function buildRoute(
        name,
        parameters,
        fallback
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
                            name,
                            parameters
                        );

                if (route) {
                    return route;
                }
            }
        } catch (error) {
            console.warn(
                `HeaderComponent: gagal membentuk route "${name}".`,
                error
            );
        }

        return resolveFallbackPath(
            fallback
        );
    }

    /**
     * @returns {string}
     */
    function getHowToBuyRoute() {
        return getRoute(
            "howToBuy",
            "pages/how-to-buy.html"
        );
    }

    /**
     * Menyesuaikan fallback path berdasarkan lokasi halaman.
     *
     * @param {string} path
     * @returns {string}
     */
    function resolveFallbackPath(path) {
        const normalizedPath =
            normalizeText(
                path
            );

        if (!normalizedPath) {
            return "#";
        }

        if (
            window.location.pathname
                .toLowerCase()
                .includes(
                    "/pages/"
                )
        ) {
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

            if (
                normalizedPath ===
                "index.html"
            ) {
                return "../index.html";
            }
        }

        return normalizedPath;
    }

    /**
     * @param {string} key
     * @returns {string}
     */
    function getQueryParameter(key) {
        if (
            typeof window.GomaiUtils
                .getQueryParameter ===
            "function"
        ) {
            return String(
                window.GomaiUtils
                    .getQueryParameter(
                        key
                    ) ||
                ""
            );
        }

        return (
            new URLSearchParams(
                window.location.search
            ).get(key) ||
            ""
        );
    }

    /* ======================================================
       GENERAL HELPERS
    ====================================================== */

    /**
     * Memvalidasi dependency wajib.
     */
    function validateDependencies() {
        if (!window.GomaiUtils) {
            throw new Error(
                "HeaderComponent membutuhkan GomaiUtils."
            );
        }

        if (!window.Language) {
            throw new Error(
                "HeaderComponent membutuhkan Language."
            );
        }

        if (
            !window.ComponentCore ||
            typeof window.ComponentCore
                .create !==
                "function"
        ) {
            throw new Error(
                "HeaderComponent membutuhkan ComponentCore.create()."
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
        const customNavigationCategories =
            Array.isArray(
                customOptions
                    .navigationCategories
            )
                ? normalizeNavigationCategories(
                    customOptions
                        .navigationCategories
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
                normalizePositiveInteger(
                    customOptions
                        .navigationLimit,
                    DEFAULT_NAVIGATION_LIMIT
                ),

            navigationCategories:
                customNavigationCategories,

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
     * @param {unknown} value
     * @param {number} fallback
     * @returns {number}
     */
    function normalizePositiveInteger(
        value,
        fallback
    ) {
        const number =
            Number(value);

        return (
            Number.isInteger(number) &&
            number > 0
        )
            ? number
            : fallback;
    }

    /**
     * @param {unknown} value
     * @returns {string}
     */
    function normalizeIdentifier(value) {
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
     * @param {unknown} value
     * @returns {string}
     */
    function normalizeText(value) {
        return String(
            value ?? ""
        ).trim();
    }

    /**
     * Mengambil target Header.
     *
     * @param {string|Element} target
     * @returns {Element|null}
     */
    function resolveTarget(target) {
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

        if (!value) {
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
    function cloneData(value) {
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
     * @param {unknown} error
     * @returns {Error}
     */
    function normalizeError(error) {
        if (
            error instanceof Error
        ) {
            return error;
        }

        return new Error(
            String(
                error ||
                "Terjadi kesalahan pada HeaderComponent."
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
     * @returns {boolean}
     */
    function hasRendered() {
        return Boolean(
            rendered &&
            rootElement?.isConnected
        );
    }

    /**
     * @returns {HTMLElement|null}
     */
    function getElement() {
        return rootElement;
    }

    /**
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
            updateCurrentNavigation,

            openSearch,
            closeSearch,

            openMobileNavigation,
            closeMobileNavigation,
            toggleMobileNavigation,

            getNavigationCategories,

            hasRendered,
            getElement,
            getLastError,

            getCore() {
                return core;
            }
        });

    return publicAPI;
})();

window.HeaderComponent =
    HeaderComponent;