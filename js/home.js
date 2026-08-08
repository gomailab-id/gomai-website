"use strict";

/**
 * ==========================================================
 * GOMAI HOME CONTROLLER
 * Version 3.0.0
 * ==========================================================
 *
 * Controller homepage Gomai.
 *
 * Sumber data:
 * - Brand grid: BrandsModel.getFeatured()
 * - Hero: BrandsModel.getHero()
 * - Fallback grid: BrandsModel.getActive()
 *
 * Brand card dirender oleh BrandCardComponent agar markup kartu
 * tidak diduplikasi di controller.
 *
 * Public API:
 * - init()
 * - destroy()
 * - refreshLanguage()
 * - reloadData()
 * - showHero()
 * - showNextHero()
 * - showPreviousHero()
 * - getBrands()
 * - getHeroBrands()
 * - getLastError()
 * - hasInitialized()
 * ==========================================================
 */

const HomeController = (() => {
    const VERSION = "3.0.0";

    const DEFAULT_OPTIONS = Object.freeze({
        heroId: "home-hero",
        brandGridId: "brand-grid",
        heroDotsId: "home-hero-dots",
        previousButtonId: "hero-previous",
        nextButtonId: "hero-next",

        heroInterval: 6000,
        minimumSwipeDistance: 50,

        autoplay: true,
        pauseOnHover: true,
        pauseOnFocus: true,
        enableSwipe: true,

        featuredLimit: null,
        heroLimit: null,

        fallbackToActiveBrands: true,

        brandCardShowLogo: true,
        brandCardShowDescription: true,
        brandCardShowAction: true,
        brandCardShowBadge: true
    });

    /* ======================================================
       STATE
    ====================================================== */

    let options = {
        ...DEFAULT_OPTIONS
    };

    let brands = [];
    let heroBrands = [];

    let activeHeroIndex = 0;

    let heroTimer = null;

    let touchStartX = 0;
    let touchEndX = 0;

    let initialized = false;
    let initializing = false;

    let initializationPromise = null;

    let eventController = null;

    let managedByRegistry = false;

    let lastError = null;

    const elements = {
        hero: null,
        heroControls: null,
        heroDots: null,
        previousButton: null,
        nextButton: null,
        brandGrid: null
    };

    /* ======================================================
       INITIALIZATION
    ====================================================== */

    /**
     * Menginisialisasi homepage.
     *
     * @param {object} context
     * @returns {Promise<object>}
     */
    async function init(
        context = {}
    ) {
        const force =
            context?.force === true;

        if (
            initialized &&
            !force
        ) {
            refreshLanguage();

            return createInitializationResult();
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

    /**
     * Implementasi internal init().
     *
     * @param {object} context
     * @returns {Promise<object>}
     */
    async function initializeInternal(
        context = {}
    ) {
        initializing =
            true;

        lastError =
            null;

        try {
            validateDependencies();

            if (
                initialized &&
                context?.force === true
            ) {
                cleanupRuntime({
                    clearRenderedContent:
                        true
                });
            }

            options =
                normalizeOptions(
                    context
                );

            /*
             * ControllerRegistry memberikan context seperti
             * registry, controllerName, components, dan models.
             *
             * Jika tersedia berarti lifecycle bahasa sudah
             * dikelola oleh ControllerRegistry.
             */
            managedByRegistry =
                Boolean(
                    context?.registry ||
                    context?.controllerName ||
                    context?.components ||
                    context?.models
                );

            cacheElements();

            if (
                !elements.hero &&
                !elements.brandGrid
            ) {
                throw new Error(
                    "HomeController: elemen homepage tidak ditemukan."
                );
            }

            createEventController();

            showBrandLoadingState();

            await loadBrandCollections();

            renderHero();
            renderBrands();

            bindEvents();

            initialized =
                true;

            startHeroAutoplay();

            dispatch(
                "gomai:home-initialized",
                {
                    brands:
                        getBrands(),

                    heroBrands:
                        getHeroBrands()
                }
            );

            return createInitializationResult();
        } catch (error) {
            lastError =
                normalizeError(
                    error
                );

            initialized =
                false;

            stopHeroAutoplay();

            showBrandLoadError();

            dispatch(
                "gomai:home-error",
                {
                    error:
                        lastError
                }
            );

            console.error(
                "HomeController gagal diinisialisasi:",
                lastError
            );

            throw lastError;
        } finally {
            initializing =
                false;
        }
    }

    /**
     * Memvalidasi dependency wajib.
     */
    function validateDependencies() {
        if (
            !window.GomaiUtils
        ) {
            throw new Error(
                "HomeController membutuhkan GomaiUtils."
            );
        }

        if (
            !window.Language
        ) {
            throw new Error(
                "HomeController membutuhkan Language."
            );
        }

        const model =
            getBrandsModel();

        if (
            !model ||
            typeof model.getActive !==
                "function"
        ) {
            throw new Error(
                "HomeController membutuhkan BrandsModel.getActive()."
            );
        }

        const brandCard =
            getBrandCardComponent();

        if (
            !brandCard ||
            typeof brandCard.render !==
                "function"
        ) {
            throw new Error(
                "HomeController membutuhkan BrandCardComponent.render()."
            );
        }
    }

    /**
     * Menyimpan referensi DOM homepage.
     */
    function cacheElements() {
        elements.hero =
            document.getElementById(
                options.heroId
            );

        elements.brandGrid =
            document.getElementById(
                options.brandGridId
            );

        elements.heroDots =
            document.getElementById(
                options.heroDotsId
            );

        elements.previousButton =
            document.getElementById(
                options.previousButtonId
            );

        elements.nextButton =
            document.getElementById(
                options.nextButtonId
            );

        elements.heroControls =
            elements.hero
                ?.querySelector(
                    ".home-hero-controls"
                ) ||
            null;
    }

    /**
     * Membuat AbortController untuk seluruh listener
     * Homepage.
     */
    function createEventController() {
        eventController
            ?.abort();

        eventController =
            new AbortController();
    }

    /* ======================================================
       DATA
    ====================================================== */

    /**
     * Memuat koleksi brand Homepage.
     *
     * Brand grid mengikuti aturan featured.
     * Hero mengikuti aturan showInHero.
     *
     * @returns {Promise<void>}
     */
    async function loadBrandCollections() {
        const model =
            getBrandsModel();

        let gridData =
            typeof model.getFeatured ===
                "function"
                ? await model.getFeatured(
                    options.featuredLimit
                )
                : await model.getActive();

        let heroData;

        if (
            typeof model.getHero ===
            "function"
        ) {
            heroData =
                await model.getHero(
                    options.heroLimit
                );
        } else {
            heroData =
                (
                    await model.getActive()
                ).filter(
                    brand =>
                        Boolean(
                            brand?.hero &&
                            brand?.logo
                        )
                );
        }

        gridData =
            normalizeBrandCollection(
                gridData
            );

        /*
         * Bila belum ada brand featured,
         * gunakan seluruh brand aktif agar Homepage
         * tidak menjadi kosong.
         */
        if (
            gridData.length === 0 &&
            options.fallbackToActiveBrands
        ) {
            gridData =
                normalizeBrandCollection(
                    await model.getActive()
                );
        }

        brands =
            applyLimit(
                gridData,
                options.featuredLimit
            );

        heroBrands =
            applyLimit(
                normalizeBrandCollection(
                    heroData
                ).filter(
                    brand =>
                        Boolean(
                            brand.hero &&
                            brand.logo
                        )
                ),
                options.heroLimit
            );

        activeHeroIndex =
            normalizeHeroIndex(
                activeHeroIndex,
                heroBrands.length
            );
    }

    /**
     * Memuat ulang data Homepage.
     *
     * @param {object} reloadOptions
     * @returns {Promise<object>}
     */
    async function reloadData(
        reloadOptions = {}
    ) {
        if (
            !initialized
        ) {
            return init();
        }

        stopHeroAutoplay();

        showBrandLoadingState();

        lastError =
            null;

        try {
            const model =
                getBrandsModel();

            if (
                reloadOptions.reloadModel ===
                    true &&
                typeof model.reload ===
                    "function"
            ) {
                await model.reload();
            }

            await loadBrandCollections();

            renderHero();
            renderBrands();

            startHeroAutoplay();

            dispatch(
                "gomai:home-data-reloaded",
                {
                    brands:
                        getBrands(),

                    heroBrands:
                        getHeroBrands()
                }
            );

            return createInitializationResult();
        } catch (error) {
            lastError =
                normalizeError(
                    error
                );

            showBrandLoadError();

            dispatch(
                "gomai:home-data-error",
                {
                    error:
                        lastError
                }
            );

            throw lastError;
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
     * Mengambil BrandCardComponent.
     *
     * @returns {object|null}
     */
    function getBrandCardComponent() {
        return (
            window.Gomai
                ?.getComponent?.(
                    "brandCard"
                ) ||

            window.ComponentRegistry
                ?.get?.(
                    "brandCard"
                ) ||

            window.BrandCardComponent ||

            null
        );
    }

    /**
     * Menormalisasi koleksi brand.
     *
     * @param {unknown} values
     * @returns {object[]}
     */
    function normalizeBrandCollection(
        values
    ) {
        if (
            !Array.isArray(
                values
            )
        ) {
            return [];
        }

        const usedIds =
            new Set();

        return values.filter(
            brand => {
                if (
                    !isValidBrand(
                        brand
                    )
                ) {
                    return false;
                }

                const key =
                    String(
                        brand.id ||
                        brand.slug ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                if (
                    usedIds.has(
                        key
                    )
                ) {
                    return false;
                }

                usedIds.add(
                    key
                );

                return true;
            }
        );
    }

    /**
     * Memvalidasi data brand minimum.
     *
     * @param {unknown} brand
     * @returns {boolean}
     */
    function isValidBrand(
        brand
    ) {
        return Boolean(
            brand &&
            typeof brand ===
                "object" &&
            String(
                brand.id ||
                brand.slug ||
                ""
            ).trim() &&
            String(
                brand.name ||
                ""
            ).trim()
        );
    }

    /* ======================================================
       HERO RENDERING
    ====================================================== */

    /**
     * Merender Hero Homepage.
     *
     * @returns {boolean}
     */
    function renderHero() {
        const hero =
            elements.hero;

        const controls =
            elements.heroControls;

        if (
            !hero
        ) {
            return false;
        }

        /*
         * Hanya slide yang dibuat controller yang dihapus.
         *
         * Slide fallback dari HTML tetap dipertahankan.
         */
        removeGeneratedHeroSlides();

        if (
            heroBrands.length ===
            0
        ) {
            restoreFallbackHero();

            clearHeroDots();

            updateHeroControlAvailability(
                0
            );

            if (
                controls
            ) {
                controls.hidden =
                    true;
            }

            return false;
        }

        hideFallbackHero();

        const fragment =
            document.createDocumentFragment();

        heroBrands.forEach(
            (
                brand,
                index
            ) => {
                fragment.append(
                    createHeroSlide(
                        brand,
                        index
                    )
                );
            }
        );

        if (
            controls
        ) {
            hero.insertBefore(
                fragment,
                controls
            );

            controls.hidden =
                false;
        } else {
            hero.prepend(
                fragment
            );
        }

        renderHeroDots();

        updateHeroSlide();

        updateHeroControlAvailability(
            heroBrands.length
        );

        return true;
    }

    /**
     * Menghapus slide Hero yang dibuat controller.
     */
    function removeGeneratedHeroSlides() {
        elements.hero
            ?.querySelectorAll(
                "[data-home-generated-hero='true']"
            )
            .forEach(
                slide =>
                    slide.remove()
            );
    }

    /**
     * Menyembunyikan slide fallback bawaan HTML.
     */
    function hideFallbackHero() {
        getFallbackHeroSlides()
            .forEach(
                slide => {
                    slide.hidden =
                        true;

                    slide.classList.remove(
                        "is-active"
                    );

                    slide.setAttribute(
                        "aria-hidden",
                        "true"
                    );
                }
            );
    }

    /**
     * Mengembalikan slide fallback bila data dinamis
     * tidak tersedia.
     */
    function restoreFallbackHero() {
        getFallbackHeroSlides()
            .forEach(
                (
                    slide,
                    index
                ) => {
                    const active =
                        index === 0;

                    slide.hidden =
                        false;

                    slide.classList.toggle(
                        "is-active",
                        active
                    );

                    slide.setAttribute(
                        "aria-hidden",
                        String(
                            !active
                        )
                    );
                }
            );
    }

    /**
     * Mengambil slide fallback dari HTML.
     *
     * @returns {HTMLElement[]}
     */
    function getFallbackHeroSlides() {
        return Array.from(
            elements.hero
                ?.querySelectorAll(
                    "[data-hero-slide]:not([data-home-generated-hero='true'])"
                ) ||
            []
        );
    }

    /**
     * Membuat satu slide Hero.
     *
     * @param {object} brand
     * @param {number} index
     * @returns {HTMLElement}
     */
    function createHeroSlide(
        brand,
        index
    ) {
        const language =
            getCurrentLanguage();

        const brandId =
            normalizeIdentifier(
                brand.id ||
                brand.slug
            );

        const brandName =
            normalizeText(
                brand.name ||
                brandId ||
                "Brand"
            );

        const description =
            getLocalizedText(
                brand.description,
                language
            );

        const slide =
            document.createElement(
                "div"
            );

        slide.className =
            "home-hero-slide";

        slide.dataset.heroSlide =
            "";

        slide.dataset.homeGeneratedHero =
            "true";

        slide.dataset.brand =
            brandId;

        const active =
            index ===
            activeHeroIndex;

        slide.classList.toggle(
            "is-active",
            active
        );

        slide.setAttribute(
            "aria-hidden",
            String(
                !active
            )
        );

        slide.append(
            createHeroMedia(
                brand,
                brandName,
                index
            ),

            createElementWithClass(
                "div",
                "home-hero-overlay"
            ),

            createHeroContent(
                brand,
                brandName,
                description
            )
        );

        return slide;
    }

    /**
     * Membuat media Hero.
     *
     * @param {object} brand
     * @param {string} brandName
     * @param {number} index
     * @returns {HTMLElement}
     */
    function createHeroMedia(
        brand,
        brandName,
        index
    ) {
        const media =
            createElementWithClass(
                "div",
                "home-hero-media"
            );

        const image =
            document.createElement(
                "img"
            );

        image.src =
            resolveAssetPath(
                brand.hero
            );

        image.alt =
            translate(
                "hero.imageAltTemplate",
                "Koleksi {{brand}}",
                {
                    brand:
                        brandName
                }
            );

        image.decoding =
            "async";

        if (
            index === 0
        ) {
            image.fetchPriority =
                "high";
        } else {
            image.loading =
                "lazy";
        }

        image.addEventListener(
            "error",
            () => {
                media.classList.add(
                    "image-error"
                );

                image.remove();
            },
            {
                once:
                    true
            }
        );

        media.append(
            image
        );

        return media;
    }

    /**
     * Membuat isi Hero.
     *
     * @param {object} brand
     * @param {string} brandName
     * @param {string} description
     * @returns {HTMLElement}
     */
    function createHeroContent(
        brand,
        brandName,
        description
    ) {
        const wrap =
            createElementWithClass(
                "div",
                "container home-hero-content-wrap"
            );

        const content =
            createElementWithClass(
                "div",
                "home-hero-content"
            );

        const logoWrap =
            createElementWithClass(
                "div",
                "home-hero-brand-logo"
            );

        const logo =
            document.createElement(
                "img"
            );

        logo.src =
            resolveAssetPath(
                brand.logo
            );

        logo.alt =
            translate(
                "hero.logoAltTemplate",
                "Logo {{brand}}",
                {
                    brand:
                        brandName
                }
            );

        logo.decoding =
            "async";

        logo.addEventListener(
            "error",
            () => {
                logoWrap.classList.add(
                    "logo-error"
                );

                logo.remove();
            },
            {
                once:
                    true
            }
        );

        logoWrap.append(
            logo
        );

        const eyebrow =
            createElementWithClass(
                "span",
                "home-hero-eyebrow"
            );

        eyebrow.textContent =
            translate(
                "hero.badge",
                "Koleksi Brand Pilihan"
            );

        const title =
            document.createElement(
                "h1"
            );

        title.textContent =
            translate(
                "hero.titleTemplate",
                "Jelajahi Koleksi {{brand}}",
                {
                    brand:
                        brandName
                }
            );

        const paragraph =
            document.createElement(
                "p"
            );

        paragraph.textContent =
            description;

        const actions =
            createElementWithClass(
                "div",
                "home-hero-actions"
            );

        const collectionLink =
            document.createElement(
                "a"
            );

        collectionLink.href =
            buildRoute(
                "brand",
                {
                    id:
                        brand.id
                },
                `pages/brand.html?id=${encodeURIComponent(
                    brand.id
                )}`
            );

        collectionLink.className =
            "btn btn-primary";

        collectionLink.textContent =
            translate(
                "hero.viewCollection",
                "Lihat Koleksi"
            );

        const wechatLink =
            document.createElement(
                "a"
            );

        wechatLink.href =
            "#wechat";

        wechatLink.className =
            "btn btn-hero-outline";

        wechatLink.textContent =
            translate(
                "hero.contactWechat",
                "Hubungi WeChat"
            );

        actions.append(
            collectionLink,
            wechatLink
        );

        content.append(
            logoWrap,
            eyebrow,
            title,
            paragraph,
            actions
        );

        wrap.append(
            content
        );

        return wrap;
    }

    /**
     * Merender Hero dots.
     */
    function renderHeroDots() {
        const container =
            elements.heroDots;

        if (
            !container
        ) {
            return;
        }

        container.replaceChildren();

        container.setAttribute(
            "aria-label",
            translate(
                "hero.chooseBrand",
                "Pilih hero brand"
            )
        );

        const fragment =
            document.createDocumentFragment();

        heroBrands.forEach(
            (
                brand,
                index
            ) => {
                const button =
                    document.createElement(
                        "button"
                    );

                const active =
                    index ===
                    activeHeroIndex;

                button.type =
                    "button";

                button.className =
                    "home-hero-dot";

                button.dataset.heroIndex =
                    String(
                        index
                    );

                button.classList.toggle(
                    "is-active",
                    active
                );

                button.setAttribute(
                    "aria-current",
                    active
                        ? "true"
                        : "false"
                );

                button.setAttribute(
                    "aria-label",
                    translate(
                        "hero.showBrandTemplate",
                        "Tampilkan {{brand}}",
                        {
                            brand:
                                brand.name
                        }
                    )
                );

                fragment.append(
                    button
                );
            }
        );

        container.append(
            fragment
        );
    }

    /**
     * Menghapus Hero dots.
     */
    function clearHeroDots() {
        elements.heroDots
            ?.replaceChildren();
    }

    /* ======================================================
       HERO EVENTS
    ====================================================== */

    /**
     * Memasang seluruh event Homepage.
     */
    function bindEvents() {
        if (
            !eventController
        ) {
            return;
        }

        const signal =
            eventController.signal;

        elements.previousButton
            ?.addEventListener(
                "click",
                handlePreviousClick,
                {
                    signal
                }
            );

        elements.nextButton
            ?.addEventListener(
                "click",
                handleNextClick,
                {
                    signal
                }
            );

        elements.heroDots
            ?.addEventListener(
                "click",
                handleHeroDotClick,
                {
                    signal
                }
            );

        if (
            elements.hero &&
            options.pauseOnHover
        ) {
            elements.hero
                .addEventListener(
                    "mouseenter",
                    stopHeroAutoplay,
                    {
                        signal
                    }
                );

            elements.hero
                .addEventListener(
                    "mouseleave",
                    startHeroAutoplay,
                    {
                        signal
                    }
                );
        }

        if (
            elements.hero &&
            options.pauseOnFocus
        ) {
            elements.hero
                .addEventListener(
                    "focusin",
                    stopHeroAutoplay,
                    {
                        signal
                    }
                );

            elements.hero
                .addEventListener(
                    "focusout",
                    handleHeroFocusOut,
                    {
                        signal
                    }
                );
        }

        if (
            elements.hero &&
            options.enableSwipe
        ) {
            elements.hero
                .addEventListener(
                    "touchstart",
                    handleTouchStart,
                    {
                        passive:
                            true,

                        signal
                    }
                );

            elements.hero
                .addEventListener(
                    "touchend",
                    handleTouchEnd,
                    {
                        passive:
                            true,

                        signal
                    }
                );
        }

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange,
            {
                signal
            }
        );

        /*
         * ControllerRegistry sudah mendengarkan
         * gomai:language-changed.
         *
         * Listener lokal hanya digunakan apabila HomeController
         * dijalankan secara standalone.
         */
        if (
            !managedByRegistry
        ) {
            document.addEventListener(
                "gomai:language-changed",
                handleLanguageChanged,
                {
                    signal
                }
            );
        }
    }

    function handlePreviousClick() {
        showPreviousHero();

        restartHeroAutoplay();
    }

    function handleNextClick() {
        showNextHero();

        restartHeroAutoplay();
    }

    /**
     * @param {MouseEvent} event
     */
    function handleHeroDotClick(
        event
    ) {
        const button =
            event.target.closest(
                "[data-hero-index]"
            );

        if (
            !button
        ) {
            return;
        }

        const index =
            Number(
                button.dataset
                    .heroIndex
            );

        if (
            !Number.isInteger(
                index
            )
        ) {
            return;
        }

        showHero(
            index
        );

        restartHeroAutoplay();
    }

    /**
     * @param {FocusEvent} event
     */
    function handleHeroFocusOut(
        event
    ) {
        if (
            !elements.hero
                ?.contains(
                    event.relatedTarget
                )
        ) {
            startHeroAutoplay();
        }
    }

    /**
     * @param {TouchEvent} event
     */
    function handleTouchStart(
        event
    ) {
        touchStartX =
            event.changedTouches
                ?.[0]
                ?.screenX ||
            0;
    }

    /**
     * @param {TouchEvent} event
     */
    function handleTouchEnd(
        event
    ) {
        touchEndX =
            event.changedTouches
                ?.[0]
                ?.screenX ||
            0;

        handleHeroSwipe();
    }

    function handleVisibilityChange() {
        if (
            document.hidden
        ) {
            stopHeroAutoplay();
        } else {
            startHeroAutoplay();
        }
    }

    /**
     * Fallback saat controller berjalan di luar registry.
     *
     * @param {CustomEvent} event
     */
    function handleLanguageChanged(
        event
    ) {
        refreshLanguage({
            event
        });
    }

    /**
     * Mengubah Hero aktif.
     *
     * @param {number} index
     * @returns {boolean}
     */
    function showHero(
        index
    ) {
        if (
            heroBrands.length ===
            0
        ) {
            return false;
        }

        activeHeroIndex =
            normalizeHeroIndex(
                index,
                heroBrands.length
            );

        updateHeroSlide();

        dispatch(
            "gomai:home-hero-changed",
            {
                index:
                    activeHeroIndex,

                brand:
                    cloneData(
                        heroBrands[
                            activeHeroIndex
                        ]
                    )
            }
        );

        return true;
    }

    /**
     * Menampilkan Hero berikutnya.
     *
     * @returns {boolean}
     */
    function showNextHero() {
        return showHero(
            activeHeroIndex +
            1
        );
    }

    /**
     * Menampilkan Hero sebelumnya.
     *
     * @returns {boolean}
     */
    function showPreviousHero() {
        return showHero(
            activeHeroIndex -
            1
        );
    }

    /**
     * Memperbarui slide dan dot aktif.
     */
    function updateHeroSlide() {
        const slides =
            getGeneratedHeroSlides();

        const dots =
            Array.from(
                elements.heroDots
                    ?.querySelectorAll(
                        "[data-hero-index]"
                    ) ||
                []
            );

        slides.forEach(
            (
                slide,
                index
            ) => {
                const active =
                    index ===
                    activeHeroIndex;

                slide.classList.toggle(
                    "is-active",
                    active
                );

                slide.setAttribute(
                    "aria-hidden",
                    String(
                        !active
                    )
                );
            }
        );

        dots.forEach(
            (
                dot,
                index
            ) => {
                const active =
                    index ===
                    activeHeroIndex;

                dot.classList.toggle(
                    "is-active",
                    active
                );

                dot.setAttribute(
                    "aria-current",
                    active
                        ? "true"
                        : "false"
                );
            }
        );
    }

    /**
     * Mengatur status tombol Hero.
     *
     * @param {number} total
     */
    function updateHeroControlAvailability(
        total
    ) {
        const disabled =
            total <= 1;

        if (
            elements.previousButton
        ) {
            elements.previousButton.disabled =
                disabled;

            elements.previousButton.hidden =
                disabled;

            elements.previousButton
                .setAttribute(
                    "aria-label",
                    translate(
                        "hero.previousBrand",
                        "Brand sebelumnya"
                    )
                );
        }

        if (
            elements.nextButton
        ) {
            elements.nextButton.disabled =
                disabled;

            elements.nextButton.hidden =
                disabled;

            elements.nextButton
                .setAttribute(
                    "aria-label",
                    translate(
                        "hero.nextBrand",
                        "Brand berikutnya"
                    )
                );
        }
    }

    /**
     * Mengambil slide dinamis.
     *
     * @returns {HTMLElement[]}
     */
    function getGeneratedHeroSlides() {
        return Array.from(
            elements.hero
                ?.querySelectorAll(
                    "[data-home-generated-hero='true']"
                ) ||
            []
        );
    }

    /**
     * Menangani gesture swipe.
     */
    function handleHeroSwipe() {
        const distance =
            touchStartX -
            touchEndX;

        if (
            Math.abs(
                distance
            ) <
            options.minimumSwipeDistance
        ) {
            return;
        }

        if (
            distance > 0
        ) {
            showNextHero();
        } else {
            showPreviousHero();
        }

        restartHeroAutoplay();
    }

    /* ======================================================
       AUTOPLAY
    ====================================================== */

    /**
     * Menjalankan autoplay.
     *
     * @returns {boolean}
     */
    function startHeroAutoplay() {
        if (
            !options.autoplay ||
            heroBrands.length <= 1 ||
            heroTimer !== null ||
            document.hidden
        ) {
            return false;
        }

        heroTimer =
            window.setInterval(
                showNextHero,
                options.heroInterval
            );

        return true;
    }

    /**
     * Menghentikan autoplay.
     *
     * @returns {boolean}
     */
    function stopHeroAutoplay() {
        if (
            heroTimer ===
            null
        ) {
            return false;
        }

        window.clearInterval(
            heroTimer
        );

        heroTimer =
            null;

        return true;
    }

    /**
     * Restart autoplay.
     *
     * @returns {boolean}
     */
    function restartHeroAutoplay() {
        stopHeroAutoplay();

        return startHeroAutoplay();
    }

    /* ======================================================
       BRAND GRID
    ====================================================== */

    /**
     * Merender brand grid melalui BrandCardComponent.
     *
     * @returns {boolean}
     */
    function renderBrands() {
        const grid =
            elements.brandGrid;

        if (
            !grid
        ) {
            return false;
        }

        grid.setAttribute(
            "aria-busy",
            "false"
        );

        if (
            brands.length ===
            0
        ) {
            showBrandEmptyState();

            return false;
        }

        const component =
            getBrandCardComponent();

        const cards =
            component.render({
                target:
                    grid,

                brands,

                clearTarget:
                    true,

                /*
                 * Menambahkan class kompatibilitas agar
                 * styling homepage yang sudah ada tetap berlaku.
                 */
                className:
                    "card",

                showLogo:
                    options
                        .brandCardShowLogo,

                showDescription:
                    options
                        .brandCardShowDescription,

                showAction:
                    options
                        .brandCardShowAction,

                showBadge:
                    options
                        .brandCardShowBadge,

                imageLoading:
                    "lazy"
            });

        return cards.length >
            0;
    }

    /**
     * Menampilkan loading state brand.
     */
    function showBrandLoadingState() {
        const grid =
            elements.brandGrid;

        if (
            !grid
        ) {
            return;
        }

        /*
         * Bersihkan registry kartu lama sebelum
         * mengganti isi container.
         */
        getBrandCardComponent()
            ?.destroy?.(
                grid
            );

        grid.setAttribute(
            "aria-busy",
            "true"
        );

        showBrandState(
            translate(
                "brands.loading",
                "Memuat brand..."
            ),
            ""
        );
    }

    /**
     * Menampilkan empty state.
     */
    function showBrandEmptyState() {
        elements.brandGrid
            ?.setAttribute(
                "aria-busy",
                "false"
            );

        showBrandState(
            translate(
                "brands.emptyTitle",
                "Belum Ada Brand"
            ),

            translate(
                "brands.emptyDescription",
                "Brand akan ditampilkan setelah datanya tersedia."
            )
        );
    }

    /**
     * Menampilkan error state.
     */
    function showBrandLoadError() {
        elements.brandGrid
            ?.setAttribute(
                "aria-busy",
                "false"
            );

        showBrandState(
            translate(
                "brands.errorTitle",
                "Data Brand Gagal Dimuat"
            ),

            translate(
                "brands.errorDescription",
                "Periksa data brand dan jalankan website melalui server lokal."
            )
        );
    }

    /**
     * Membuat generic brand state.
     *
     * @param {string} titleText
     * @param {string} descriptionText
     */
    function showBrandState(
        titleText,
        descriptionText
    ) {
        const grid =
            elements.brandGrid;

        if (
            !grid
        ) {
            return;
        }

        grid.replaceChildren();

        const state =
            createElementWithClass(
                "div",
                "empty-state"
            );

        if (
            titleText
        ) {
            const title =
                document.createElement(
                    descriptionText
                        ? "h3"
                        : "p"
                );

            title.textContent =
                titleText;

            state.append(
                title
            );
        }

        if (
            descriptionText
        ) {
            const description =
                document.createElement(
                    "p"
                );

            description.textContent =
                descriptionText;

            state.append(
                description
            );
        }

        grid.append(
            state
        );
    }

    /* ======================================================
       LANGUAGE
    ====================================================== */

    /**
     * Memperbarui konten dinamis saat bahasa berubah.
     *
     * Hero dibangun ulang karena teks Hero merupakan
     * bagian dari controller.
     *
     * BrandCardComponent memiliki lifecycle bahasanya sendiri.
     *
     * @param {object} context
     * @returns {boolean}
     */
    function refreshLanguage(
        context = {}
    ) {
        if (
            !initialized
        ) {
            return false;
        }

        stopHeroAutoplay();

        renderHero();

        /*
         * Jika dipanggil manual, refresh juga BrandCard.
         *
         * Jika berasal dari event bahasa global,
         * BrandCardComponent telah menerima event yang sama.
         */
        if (
            !context?.event
        ) {
            getBrandCardComponent()
                ?.refreshLanguage?.();
        }

        startHeroAutoplay();

        dispatch(
            "gomai:home-language-refreshed",
            {
                language:
                    getCurrentLanguage()
            }
        );

        return true;
    }

    /* ======================================================
       DESTROY
    ====================================================== */

    /**
     * Menghancurkan Homepage controller.
     *
     * @returns {boolean}
     */
    function destroy() {
        if (
            !initialized &&
            !initializing &&
            !eventController
        ) {
            return false;
        }

        cleanupRuntime({
            clearRenderedContent:
                true
        });

        dispatch(
            "gomai:home-destroyed"
        );

        return true;
    }

    /**
     * Membersihkan state runtime.
     *
     * @param {object} cleanupOptions
     */
    function cleanupRuntime(
        cleanupOptions = {}
    ) {
        stopHeroAutoplay();

        eventController
            ?.abort();

        eventController =
            null;

        if (
            cleanupOptions
                .clearRenderedContent ===
            true
        ) {
            /*
             * Hapus kartu dari registry BrandCardComponent.
             */
            getBrandCardComponent()
                ?.destroy?.(
                    elements.brandGrid
                );

            removeGeneratedHeroSlides();

            restoreFallbackHero();

            clearHeroDots();

            if (
                elements.heroControls
            ) {
                elements.heroControls.hidden =
                    false;
            }

            updateHeroControlAvailability(
                getFallbackHeroSlides()
                    .length
            );
        }

        brands =
            [];

        heroBrands =
            [];

        activeHeroIndex =
            0;

        touchStartX =
            0;

        touchEndX =
            0;

        initialized =
            false;

        initializing =
            false;

        initializationPromise =
            null;

        managedByRegistry =
            false;

        resetElementCache();
    }

    /**
     * Menghapus referensi DOM.
     */
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
       OPTIONS
    ====================================================== */

    /**
     * Menormalisasi option Homepage.
     *
     * ControllerRegistry dapat mengirim banyak properti
     * context tambahan; hanya option Homepage yang digunakan.
     *
     * @param {object} input
     * @returns {object}
     */
    function normalizeOptions(
        input = {}
    ) {
        return {
            heroId:
                normalizeText(
                    input.heroId
                ) ||
                DEFAULT_OPTIONS
                    .heroId,

            brandGridId:
                normalizeText(
                    input.brandGridId
                ) ||
                DEFAULT_OPTIONS
                    .brandGridId,

            heroDotsId:
                normalizeText(
                    input.heroDotsId
                ) ||
                DEFAULT_OPTIONS
                    .heroDotsId,

            previousButtonId:
                normalizeText(
                    input.previousButtonId
                ) ||
                DEFAULT_OPTIONS
                    .previousButtonId,

            nextButtonId:
                normalizeText(
                    input.nextButtonId
                ) ||
                DEFAULT_OPTIONS
                    .nextButtonId,

            heroInterval:
                normalizePositiveNumber(
                    input.heroInterval,
                    DEFAULT_OPTIONS
                        .heroInterval
                ),

            minimumSwipeDistance:
                normalizePositiveNumber(
                    input.minimumSwipeDistance,
                    DEFAULT_OPTIONS
                        .minimumSwipeDistance
                ),

            autoplay:
                normalizeBoolean(
                    input.autoplay,
                    DEFAULT_OPTIONS
                        .autoplay
                ),

            pauseOnHover:
                normalizeBoolean(
                    input.pauseOnHover,
                    DEFAULT_OPTIONS
                        .pauseOnHover
                ),

            pauseOnFocus:
                normalizeBoolean(
                    input.pauseOnFocus,
                    DEFAULT_OPTIONS
                        .pauseOnFocus
                ),

            enableSwipe:
                normalizeBoolean(
                    input.enableSwipe,
                    DEFAULT_OPTIONS
                        .enableSwipe
                ),

            featuredLimit:
                normalizeOptionalLimit(
                    input.featuredLimit
                ),

            heroLimit:
                normalizeOptionalLimit(
                    input.heroLimit
                ),

            fallbackToActiveBrands:
                normalizeBoolean(
                    input.fallbackToActiveBrands,
                    DEFAULT_OPTIONS
                        .fallbackToActiveBrands
                ),

            brandCardShowLogo:
                normalizeBoolean(
                    input.brandCardShowLogo,
                    DEFAULT_OPTIONS
                        .brandCardShowLogo
                ),

            brandCardShowDescription:
                normalizeBoolean(
                    input.brandCardShowDescription,
                    DEFAULT_OPTIONS
                        .brandCardShowDescription
                ),

            brandCardShowAction:
                normalizeBoolean(
                    input.brandCardShowAction,
                    DEFAULT_OPTIONS
                        .brandCardShowAction
                ),

            brandCardShowBadge:
                normalizeBoolean(
                    input.brandCardShowBadge,
                    DEFAULT_OPTIONS
                        .brandCardShowBadge
                )
        };
    }

    /**
     * @param {unknown} value
     * @param {number} fallback
     * @returns {number}
     */
    function normalizePositiveNumber(
        value,
        fallback
    ) {
        const number =
            Number(
                value
            );

        return (
            Number.isFinite(
                number
            ) &&
            number > 0
        )
            ? number
            : fallback;
    }

    /**
     * null berarti tidak membatasi jumlah data.
     *
     * @param {unknown} value
     * @returns {number|null}
     */
    function normalizeOptionalLimit(
        value
    ) {
        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return null;
        }

        const number =
            Number(
                value
            );

        return (
            Number.isInteger(
                number
            ) &&
            number > 0
        )
            ? number
            : null;
    }

    /**
     * @param {unknown} value
     * @param {boolean} fallback
     * @returns {boolean}
     */
    function normalizeBoolean(
        value,
        fallback
    ) {
        return typeof value ===
            "boolean"
            ? value
            : fallback;
    }

    /**
     * Membatasi array bila limit valid.
     *
     * @param {object[]} values
     * @param {number|null} limit
     * @returns {object[]}
     */
    function applyLimit(
        values,
        limit
    ) {
        if (
            !Number.isInteger(
                limit
            ) ||
            limit <= 0
        ) {
            return values;
        }

        return values.slice(
            0,
            limit
        );
    }

    /**
     * Menormalisasi index Hero.
     *
     * @param {number} index
     * @param {number} total
     * @returns {number}
     */
    function normalizeHeroIndex(
        index,
        total
    ) {
        if (
            total <= 0
        ) {
            return 0;
        }

        const number =
            Number(
                index
            );

        const safeIndex =
            Number.isFinite(
                number
            )
                ? number
                : 0;

        return (
            (
                safeIndex %
                total
            ) +
            total
        ) % total;
    }

    /**
     * Membuat elemen dengan class.
     *
     * @param {string} tagName
     * @param {string} className
     * @returns {HTMLElement}
     */
    function createElementWithClass(
        tagName,
        className
    ) {
        const element =
            document.createElement(
                tagName
            );

        element.className =
            className;

        return element;
    }

    /**
     * Mengambil teks localized.
     *
     * @param {unknown} value
     * @param {string} language
     * @returns {string}
     */
    function getLocalizedText(
        value,
        language
    ) {
        if (
            value &&
            typeof value ===
                "object"
        ) {
            return String(
                value[language] ||
                value.id ||
                value.zh ||
                ""
            );
        }

        return String(
            value ||
            ""
        );
    }

    /**
     * Menyesuaikan path aset.
     *
     * @param {unknown} path
     * @returns {string}
     */
    function resolveAssetPath(
        path
    ) {
        const value =
            normalizeText(
                path
            );

        if (
            !value
        ) {
            return "";
        }

        if (
            /^(https?:|data:|blob:|\/|\.\.\/)/i
                .test(
                    value
                )
        ) {
            return value;
        }

        if (
            typeof window.GomaiUtils
                .getBasePath ===
                "function"
        ) {
            return (
                window.GomaiUtils
                    .getBasePath() +
                value
            );
        }

        return value;
    }

    /**
     * Membentuk route.
     *
     * @param {string} routeName
     * @param {object} parameters
     * @param {string} fallback
     * @returns {string}
     */
    function buildRoute(
        routeName,
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
                            routeName,
                            parameters
                        );

                if (
                    route
                ) {
                    return route;
                }
            }
        } catch (error) {
            console.warn(
                `HomeController: gagal membentuk route "${routeName}".`,
                error
            );
        }

        return fallback;
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

            document
                .documentElement
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
                        value ??
                        ""
                    )
                );
            },
            String(
                text ||
                ""
            )
        );
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
            value ||
            ""
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
            value ??
            ""
        ).trim();
    }

    /**
     * Menormalisasi Error.
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
                "Terjadi kesalahan pada HomeController."
            )
        );
    }

    /**
     * Mengirim custom event.
     *
     * @param {string} eventName
     * @param {object} detail
     * @returns {boolean}
     */
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
     * Mengambil brand grid.
     *
     * @returns {object[]}
     */
    function getBrands() {
        return cloneData(
            brands
        );
    }

    /**
     * Mengambil brand Hero.
     *
     * @returns {object[]}
     */
    function getHeroBrands() {
        return cloneData(
            heroBrands
        );
    }

    /**
     * Mengambil error terakhir.
     *
     * @returns {Error|null}
     */
    function getLastError() {
        return lastError;
    }

    /**
     * Memeriksa status controller.
     *
     * @returns {boolean}
     */
    function hasInitialized() {
        return initialized;
    }

    /**
     * Membuat hasil inisialisasi.
     *
     * @returns {object}
     */
    function createInitializationResult() {
        return Object.freeze({
            version:
                VERSION,

            initialized,

            brands:
                getBrands(),

            heroBrands:
                getHeroBrands(),

            heroCount:
                heroBrands.length,

            activeHeroIndex
        });
    }

    /* ======================================================
       PUBLIC API
    ====================================================== */

    const publicAPI =
        Object.freeze({
            version:
                VERSION,

            init,
            destroy,

            refreshLanguage,
            reloadData,

            showHero,
            showNextHero,
            showPreviousHero,

            getBrands,
            getHeroBrands,
            getLastError,

            hasInitialized
        });

    return publicAPI;
})();

window.HomeController =
    HomeController;