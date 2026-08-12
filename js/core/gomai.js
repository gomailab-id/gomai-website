"use strict";

/* ==========================================================
   GOMAI CORE FRAMEWORK
   js/core/gomai.js

   Tanggung jawab:
   - Pintu masuk utama framework Gomai
   - Menjalankan bootstrap aplikasi
   - Mendaftarkan model bawaan
   - Mendaftarkan komponen bawaan
   - Mendaftarkan controller halaman
   - Menyediakan akses terpusat ke registry
   - Menyediakan Gomai.ready()
   - Menangani shutdown dan restart framework
   - Menyediakan status dan event lifecycle

   Urutan bootstrap:

   1. Language.init()
   2. Register default models
   3. ModelRegistry.init()
   4. Register default components
   5. ComponentRegistry.init()
   6. Register default controllers
   7. ControllerRegistry.start()
   8. Dispatch "gomai:ready"

   Prinsip:
   - Mandarin-first
   - Satu bootstrap pusat
   - Tidak ada bootstrap controller per-file
   - Tidak ada DOMContentLoaded di core
   - app.js menjadi pemicu boot
========================================================== */

const Gomai = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       STATUS
    ====================================================== */

    const STATUS =
        Object.freeze({

            IDLE:
                "idle",

            BOOTING:
                "booting",

            READY:
                "ready",

            ERROR:
                "error",

            SHUTTING_DOWN:
                "shutting-down",

            STOPPED:
                "stopped"

        });


    /* ======================================================
       EVENTS
    ====================================================== */

    const EVENTS =
        Object.freeze({

            BOOTING:
                "gomai:booting",

            LANGUAGE_READY:
                "gomai:language-ready",

            MODELS_READY:
                "gomai:models-ready",

            COMPONENTS_READY:
                "gomai:components-ready",

            CONTROLLER_READY:
                "gomai:controller-ready",

            READY:
                "gomai:ready",

            ERROR:
                "gomai:error",

            SHUTTING_DOWN:
                "gomai:shutting-down",

            STOPPED:
                "gomai:stopped"

        });


    /* ======================================================
       RUNTIME STATE
    ====================================================== */

    let currentStatus =
        STATUS.IDLE;


    let bootPromise =
        null;


    let shutdownPromise =
        null;


    let lastError =
        null;


    let bootStartedAt =
        null;


    let bootCompletedAt =
        null;


    let lastShutdownAt =
        null;


    let bootCount =
        0;


    /* ======================================================
       READY PROMISE
    ====================================================== */

    let readyPromise =
        null;


    let resolveReadyPromise =
        null;


    let rejectReadyPromise =
        null;


    /* ======================================================
       DEFAULT REGISTRATION STATE
    ====================================================== */

    const registeredDefaults = {

        models:
            false,

        components:
            false,

        controllers:
            false

    };


    createReadyPromise();


    /* ======================================================
       BOOT
    ====================================================== */

    async function boot(
        options = {}
    ) {

        const settings =
            normalizeBootOptions(
                options
            );


        /*
         * Framework sudah siap.
         */
        if (
            currentStatus ===
                STATUS.READY &&
            !settings.force
        ) {

            return createBootResult();

        }


        /*
         * Boot yang sama sedang berjalan.
         */
        if (
            currentStatus ===
                STATUS.BOOTING &&
            bootPromise
        ) {

            return bootPromise;

        }


        /*
         * Tunggu shutdown lama sampai selesai.
         */
        if (
            currentStatus ===
                STATUS.SHUTTING_DOWN &&
            shutdownPromise
        ) {

            await shutdownPromise;

        }


        /*
         * Force boot membersihkan lifecycle sebelumnya.
         */
        if (
            settings.force
        ) {

            await prepareForcedBoot();

        } else if (
            currentStatus ===
                STATUS.ERROR ||
            currentStatus ===
                STATUS.STOPPED
        ) {

            /*
             * Retry biasa mendapatkan Promise ready baru.
             *
             * Registry yang masih memiliki state valid tetap
             * dapat digunakan kembali secara idempotent.
             */
            currentStatus =
                STATUS.IDLE;


            lastError =
                null;


            createReadyPromise();

        }


        bootPromise =
            bootInternal(
                settings
            );


        try {

            return await bootPromise;

        } finally {

            bootPromise =
                null;

        }

    }


    /* ======================================================
       BOOT INTERNAL
    ====================================================== */

    async function bootInternal(
        settings
    ) {

        validateCoreDependencies();


        currentStatus =
            STATUS.BOOTING;


        lastError =
            null;


        bootStartedAt =
            Date.now();


        bootCompletedAt =
            null;


        dispatchEvent(
            EVENTS.BOOTING,
            {

                settings:
                    createSafeBootSettings(
                        settings
                    )

            }
        );


        try {

            /* ==============================================
               1. LANGUAGE
            ============================================== */

            if (
                settings.initLanguage
            ) {

                await initializeLanguage(
                    settings.languageOptions
                );

            }


            /* ==============================================
               2. DEFAULT REGISTRATION
            ============================================== */

            if (
                settings.registerDefaults
            ) {

                registerDefaultModels();

                registerDefaultComponents();

                registerDefaultControllers();

            }


            /* ==============================================
               3. MODELS
            ============================================== */

            let modelResults =
                new Map();


            if (
                settings.initModels
            ) {

                modelResults =
                    await initializeModels(
                        settings.modelOptions
                    );

            }


            /* ==============================================
               4. COMPONENTS
            ============================================== */

            let componentResults =
                new Map();


            if (
                settings.initComponents
            ) {

                componentResults =
                    await initializeComponents(
                        settings.componentOptions
                    );

            }


            /* ==============================================
               5. CONTROLLER
            ============================================== */

            let controller =
                null;


            if (
                settings.startController
            ) {

                controller =
                    await startController(
                        settings.controllerOptions,
                        settings.requireController
                    );

            }


            /* ==============================================
               6. READY
            ============================================== */

            currentStatus =
                STATUS.READY;


            bootCompletedAt =
                Date.now();


            bootCount +=
                1;


            const result =
                createBootResult({

                    models:
                        modelResults,

                    components:
                        componentResults,

                    controller

                });


            resolveReadyPromise?.(
                result
            );


            dispatchEvent(
                EVENTS.READY,
                result
            );


            return result;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            currentStatus =
                STATUS.ERROR;


            lastError =
                normalizedError;


            bootCompletedAt =
                Date.now();


            rejectReadyPromise?.(
                normalizedError
            );


            dispatchEvent(
                EVENTS.ERROR,
                {

                    error:
                        normalizedError,

                    phase:
                        "boot",

                    duration:
                        getBootDuration()

                }
            );


            console.error(
                "Gomai gagal melakukan bootstrap:",
                normalizedError
            );


            throw normalizedError;

        }

    }


    /* ======================================================
       BOOT OPTIONS
    ====================================================== */

    function normalizeBootOptions(
        options
    ) {

        const source =
            isPlainObject(
                options
            )
                ? options
                : {};


        return {

            force:
                source.force ===
                true,


            initLanguage:
                source.initLanguage !==
                false,

            initModels:
                source.initModels !==
                false,

            initComponents:
                source.initComponents !==
                false,

            startController:
                source.startController !==
                false,


            registerDefaults:
                source.registerDefaults !==
                false,


            /*
             * Pada halaman normal Gomai controller halaman
             * wajib tersedia.
             *
             * Dapat dimatikan untuk halaman khusus/test.
             */
            requireController:
                source.requireController !==
                false,


            languageOptions:
                clonePlainObject(
                    source.languageOptions
                ),

            modelOptions:
                clonePlainObject(
                    source.modelOptions
                ),

            componentOptions:
                clonePlainObject(
                    source.componentOptions
                ),

            controllerOptions:
                clonePlainObject(
                    source.controllerOptions
                )

        };

    }


    function createSafeBootSettings(
        settings
    ) {

        return {

            force:
                settings.force,

            initLanguage:
                settings.initLanguage,

            initModels:
                settings.initModels,

            initComponents:
                settings.initComponents,

            startController:
                settings.startController,

            registerDefaults:
                settings.registerDefaults,

            requireController:
                settings.requireController

        };

    }


    /* ======================================================
       LANGUAGE INITIALIZATION
    ====================================================== */

    async function initializeLanguage(
        options = {}
    ) {

        const language =
            getLanguageManager();


        if (
            !language ||
            typeof language.init !==
                "function"
        ) {

            throw new Error(
                "Gomai membutuhkan Language.init()."
            );

        }


        const result =
            await language.init(
                options
            );


        dispatchEvent(
            EVENTS.LANGUAGE_READY,
            {

                language:
                    getCurrentLanguage(),

                result

            }
        );


        return result;

    }


    /* ======================================================
       DEFAULT MODELS
    ====================================================== */

    function registerDefaultModels() {

        const registry =
            getModelRegistry();


        if (!registry) {

            throw new Error(
                "ModelRegistry belum tersedia."
            );

        }


        const definitions = {

            brands: {

                model:
                    window.BrandsModel,

                options: {

                    required:
                        true,

                    autoLoad:
                        true

                }

            },


            categories: {

                model:
                    window.CategoriesModel,

                options: {

                    required:
                        true,

                    autoLoad:
                        true

                }

            },


            products: {

                model:
                    window.ProductsModel,

                options: {

                    required:
                        true,

                    autoLoad:
                        true

                }

            }

        };


        const registered =
            [];


        Object.entries(
            definitions
        )
            .forEach(
                ([
                    name,
                    definition
                ]) => {

                    if (
                        !definition.model
                    ) {

                        return;

                    }


                    /*
                     * Idempotent:
                     * jangan register dua kali.
                     */
                    if (
                        registry.has(
                            name
                        )
                    ) {

                        return;

                    }


                    if (
                        registry.register(
                            name,
                            definition.model,
                            definition.options
                        )
                    ) {

                        registered.push(
                            name
                        );

                    }

                }
            );


        registeredDefaults.models =
            true;


        return registered;

    }


    /* ======================================================
       MODEL INITIALIZATION
    ====================================================== */

    async function initializeModels(
        options = {}
    ) {

        const registry =
            getModelRegistry();


        if (
            !registry ||
            typeof registry.init !==
                "function"
        ) {

            throw new Error(
                "Gomai membutuhkan ModelRegistry.init()."
            );

        }


        const results =
            await registry.init(
                options
            );


        dispatchEvent(
            EVENTS.MODELS_READY,
            {

                models:
                    registry.getNames(),

                results

            }
        );


        return results;

    }


    /* ======================================================
       DEFAULT COMPONENTS
    ====================================================== */

    function registerDefaultComponents() {

        const registry =
            getComponentRegistry();


        if (!registry) {

            throw new Error(
                "ComponentRegistry belum tersedia."
            );

        }


        const definitions =
            {};


        /* ==============================================
           HEADER

           Header merupakan global component dan harus
           dirender sebelum controller halaman.
        ============================================== */

        if (
            window.HeaderComponent
        ) {

            definitions.header = {

                component:
                    window.HeaderComponent,

                options: {

                    type:
                        "global",

                    autoInit:
                        true,

                    required:
                        true,

                    languageAware:
                        true,

                    initMethod:
                        "render",

                    destroyMethod:
                        "destroy",

                    refreshMethod:
                        "refreshLanguage",

                    initOptions: {

                        targetId:
                            "site-header"

                    }

                }

            };

        }


        /* ==============================================
           FOOTER
        ============================================== */

        if (
            window.FooterComponent
        ) {

            definitions.footer = {

                component:
                    window.FooterComponent,

                options: {

                    type:
                        "global",

                    autoInit:
                        true,

                    required:
                        true,

                    languageAware:
                        true,

                    initMethod:
                        "render",

                    destroyMethod:
                        "destroy",

                    refreshMethod:
                        "refreshLanguage",

                    initOptions: {

                        targetId:
                            "site-footer"

                    }

                }

            };

        }


        /* ==============================================
           LOADING
        ============================================== */

        if (
            window.LoadingComponent
        ) {

            definitions.loading = {

                component:
                    window.LoadingComponent,

                options: {

                    type:
                        "utility",

                    autoInit:
                        false,

                    required:
                        false,

                    languageAware:
                        false

                }

            };

        }


        /* ==============================================
           EMPTY STATE
        ============================================== */

        if (
            window.EmptyStateComponent
        ) {

            definitions.emptyState = {

                component:
                    window.EmptyStateComponent,

                options: {

                    type:
                        "utility",

                    autoInit:
                        false,

                    required:
                        false,

                    languageAware:
                        true,

                    refreshMethod:
                        "refreshAll"

                }

            };

        }


        /* ==============================================
           PRODUCT CARD
        ============================================== */

        if (
            window.ProductCardComponent
        ) {

            definitions.productCard = {

                component:
                    window.ProductCardComponent,

                options: {

                    type:
                        "render",

                    autoInit:
                        false,

                    required:
                        false,

                    languageAware:
                        true,

                    refreshMethod:
                        "refreshAll"

                }

            };

        }


        /* ==============================================
           BRAND CARD
        ============================================== */

        if (
            window.BrandCardComponent
        ) {

            definitions.brandCard = {

                component:
                    window.BrandCardComponent,

                options: {

                    type:
                        "render",

                    autoInit:
                        false,

                    required:
                        false,

                    languageAware:
                        true,

                    refreshMethod:
                        "refreshAll"

                }

            };

        }


        /* ==============================================
           SEARCH PANEL

           SearchPanel TIDAK autoInit.

           Header terlebih dahulu membuat:
           #header-search-panel-host

           kemudian SearchPanel dirender secara lazy ketika
           pengguna membuka pencarian.
        ============================================== */

        if (
            window.SearchPanelComponent
        ) {

            definitions.searchPanel = {

                component:
                    window.SearchPanelComponent,

                options: {

                    type:
                        "render",

                    autoInit:
                        false,

                    required:
                        false,

                    languageAware:
                        true,

                    initMethod:
                        "render",

                    destroyMethod:
                        "destroy",

                    refreshMethod:
                        "refreshLanguage"

                }

            };

        }


        const registered =
            [];


        Object.entries(
            definitions
        )
            .forEach(
                ([
                    name,
                    definition
                ]) => {

                    if (
                        registry.has(
                            name
                        )
                    ) {

                        return;

                    }


                    if (
                        registry.register(
                            name,
                            definition.component,
                            definition.options
                        )
                    ) {

                        registered.push(
                            name
                        );

                    }

                }
            );


        registeredDefaults.components =
            true;


        return registered;

    }


    /* ======================================================
       COMPONENT INITIALIZATION
    ====================================================== */

    async function initializeComponents(
        options = {}
    ) {

        const registry =
            getComponentRegistry();


        if (
            !registry ||
            typeof registry.init !==
                "function"
        ) {

            throw new Error(
                "Gomai membutuhkan ComponentRegistry.init()."
            );

        }


        const results =
            await registry.init(
                options
            );


        dispatchEvent(
            EVENTS.COMPONENTS_READY,
            {

                components:
                    registry.getNames(),

                results

            }
        );


        return results;

    }


    /* ======================================================
       DEFAULT CONTROLLERS
    ====================================================== */

    function registerDefaultControllers() {

        const registry =
            getControllerRegistry();


        if (!registry) {

            throw new Error(
                "ControllerRegistry belum tersedia."
            );

        }


        const definitions =
            {};


        /* ==============================================
           HOME
        ============================================== */

        const homeController =
            window.HomeController ||
            window.HomePage;


        if (
            homeController
        ) {

            definitions.home = {

                controller:
                    homeController,

                options: {

                    page:
                        "home",

                    required:
                        true,

                    languageAware:
                        true

                }

            };

        }


        /* ==============================================
           BRAND
        ============================================== */

        const brandController =
            window.BrandController ||
            window.BrandPage;


        if (
            brandController
        ) {

            definitions.brand = {

                controller:
                    brandController,

                options: {

                    page:
                        "brand",

                    required:
                        true,

                    languageAware:
                        true

                }

            };

        }


        /* ==============================================
           PRODUCTS
        ============================================== */

        const productsController =
            window.ProductsController ||
            window.ProductsPage;


        if (
            productsController
        ) {

            definitions.products = {

                controller:
                    productsController,

                options: {

                    page:
                        "products",

                    required:
                        true,

                    languageAware:
                        true

                }

            };

        }


        /* ==============================================
           SEARCH
        ============================================== */

        const searchController =
            window.SearchController ||
            window.SearchPage;


        if (
            searchController
        ) {

            definitions.search = {

                controller:
                    searchController,

                options: {

                    page:
                        "search",

                    required:
                        true,

                    languageAware:
                        true

                }

            };

        }


        /* ==============================================
           PRODUCT DETAIL
        ============================================== */

        const productDetailController =
            window.ProductDetailController ||
            window.ProductDetailPage;


        if (
            productDetailController
        ) {

            definitions.productDetail = {

                controller:
                    productDetailController,

                options: {

                    page:
                        "productDetail",

                    required:
                        true,

                    languageAware:
                        true

                }

            };

        }


        /* ==============================================
           CART / WISHLIST / CHECKOUT
        ============================================== */

        if (window.CartController) {
            definitions.cart = { controller: window.CartController, options: { page: "cart", required: true, languageAware: true } };
        }

        if (window.WishlistController) {
            definitions.wishlist = { controller: window.WishlistController, options: { page: "wishlist", required: true, languageAware: true } };
        }

        if (window.CheckoutController) {
            definitions.checkout = { controller: window.CheckoutController, options: { page: "checkout", required: true, languageAware: true } };
        }


        /* ==============================================
           INFORMATION

           Final Gomai memakai satu controller untuk:
           - about
           - contact
           - faq
           - how-to-buy

           Fallback controller lama dipertahankan sementara
           agar transisi file tidak memutus halaman.
        ============================================== */

        const informationController =
            window.InformationController ||
            window.InformationPage ||
            window.AboutController ||
            window.ContactController ||
            window.FaqController ||
            window.HowToBuyController;


        if (
            informationController
        ) {

            definitions.information = {

                controller:
                    informationController,

                options: {

                    page:
                        "information",

                    required:
                        true,

                    languageAware:
                        true

                }

            };

        }


        /* ==============================================
           OPTIONAL NOT FOUND CONTROLLER

           404 final direncanakan standalone sehingga
           controller ini tidak diwajibkan.
        ============================================== */

        const notFoundController =
            window.NotFoundController ||
            window.NotFoundPage;


        if (
            notFoundController
        ) {

            definitions.notFound = {

                controller:
                    notFoundController,

                options: {

                    page:
                        "notFound",

                    required:
                        false,

                    languageAware:
                        true

                }

            };

        }


        const registered =
            [];


        Object.entries(
            definitions
        )
            .forEach(
                ([
                    name,
                    definition
                ]) => {

                    if (
                        registry.has(
                            name
                        )
                    ) {

                        return;

                    }


                    if (
                        registry.register(
                            name,
                            definition.controller,
                            definition.options
                        )
                    ) {

                        registered.push(
                            name
                        );

                    }

                }
            );


        registeredDefaults.controllers =
            true;


        return registered;

    }


    /* ======================================================
       START CONTROLLER
    ====================================================== */

    async function startController(
        options = {},
        required = true
    ) {

        const registry =
            getControllerRegistry();


        if (
            !registry ||
            typeof registry.start !==
                "function"
        ) {

            throw new Error(
                "Gomai membutuhkan ControllerRegistry.start()."
            );

        }


        const controller =
            await registry.start(
                options
            );


        if (
            required &&
            !controller
        ) {

            const page =
                registry.resolvePageName?.(
                    options
                ) ||
                document.body
                    ?.dataset
                    ?.page ||
                "";


            throw new Error(
                `Controller halaman "${page || "unknown"}" tidak tersedia.`
            );

        }


        dispatchEvent(
            EVENTS.CONTROLLER_READY,
            {

                controller,

                name:
                    registry.getActiveName(),

                page:
                    registry
                        .getActiveEntry?.()
                        ?.page ||
                    ""

            }
        );


        return controller;

    }


    /* ======================================================
       MANUAL REGISTRATION
    ====================================================== */

    function registerModel(
        name,
        model,
        options = {}
    ) {

        const registry =
            getModelRegistry();


        if (!registry) {

            throw new Error(
                "ModelRegistry belum tersedia."
            );

        }


        return registry.register(
            name,
            model,
            options
        );

    }


    function registerComponent(
        name,
        component,
        options = {}
    ) {

        const registry =
            getComponentRegistry();


        if (!registry) {

            throw new Error(
                "ComponentRegistry belum tersedia."
            );

        }


        return registry.register(
            name,
            component,
            options
        );

    }


    function registerController(
        name,
        controller,
        options = {}
    ) {

        const registry =
            getControllerRegistry();


        if (!registry) {

            throw new Error(
                "ControllerRegistry belum tersedia."
            );

        }


        return registry.register(
            name,
            controller,
            options
        );

    }


    /* ======================================================
       READY
    ====================================================== */

    function ready() {

        if (
            currentStatus ===
                STATUS.READY
        ) {

            return Promise.resolve(
                createBootResult()
            );

        }


        return readyPromise;

    }


    function createReadyPromise() {

        readyPromise =
            new Promise(
                (
                    resolve,
                    reject
                ) => {

                    resolveReadyPromise =
                        resolve;


                    rejectReadyPromise =
                        reject;

                }
            );


        /*
         * ready() tidak harus dipanggil oleh setiap halaman.
         * Catch internal ini mencegah warning
         * "Unhandled Promise Rejection".
         */
        readyPromise.catch(
            () => {}
        );

    }


    /* ======================================================
       SHUTDOWN
    ====================================================== */

    async function shutdown(
        options = {}
    ) {

        if (
            currentStatus ===
                STATUS.SHUTTING_DOWN &&
            shutdownPromise
        ) {

            return shutdownPromise;

        }


        if (
            currentStatus ===
                STATUS.BOOTING &&
            bootPromise
        ) {

            await settlePromise(
                bootPromise
            );

        }


        shutdownPromise =
            shutdownInternal(
                normalizeShutdownOptions(
                    options
                )
            );


        try {

            return await shutdownPromise;

        } finally {

            shutdownPromise =
                null;

        }

    }


    /* ======================================================
       SHUTDOWN INTERNAL
    ====================================================== */

    async function shutdownInternal(
        settings
    ) {

        currentStatus =
            STATUS.SHUTTING_DOWN;


        dispatchEvent(
            EVENTS.SHUTTING_DOWN,
            {

                destroyRegistries:
                    settings.destroyRegistries,

                clearModels:
                    settings.clearModels

            }
        );


        try {

            const controllerRegistry =
                getControllerRegistry();


            const componentRegistry =
                getComponentRegistry();


            const modelRegistry =
                getModelRegistry();


            /* ==============================================
               1. CONTROLLER
            ============================================== */

            if (
                controllerRegistry
            ) {

                await controllerRegistry
                    .stop({

                        context: {

                            reason:
                                settings.reason

                        }

                    });


                controllerRegistry
                    .disableLifecycle?.();

            }


            /* ==============================================
               2. COMPONENTS
            ============================================== */

            if (
                componentRegistry
            ) {

                if (
                    settings.destroyRegistries
                ) {

                    await componentRegistry
                        .clear({

                            context: {

                                reason:
                                    settings.reason

                            }

                        });

                } else {

                    await componentRegistry
                        .destroy({

                            context: {

                                reason:
                                    settings.reason

                            }

                        });

                }

            }


            /* ==============================================
               3. MODELS
            ============================================== */

            if (
                modelRegistry &&
                settings.clearModels
            ) {

                if (
                    settings.destroyRegistries
                ) {

                    await modelRegistry
                        .destroy({

                            context: {

                                reason:
                                    settings.reason

                            }

                        });

                } else {

                    await modelRegistry
                        .clear({

                            context: {

                                reason:
                                    settings.reason

                            }

                        });

                }

            }


            /* ==============================================
               4. CONTROLLER REGISTRY

               clear() hanya dilakukan ketika seluruh
               registry memang diminta dihapus.
            ============================================== */

            if (
                settings.destroyRegistries &&
                controllerRegistry
            ) {

                await controllerRegistry
                    .clear({

                        context: {

                            reason:
                                settings.reason

                        }

                    });

            }


            /* ==============================================
               RESET REGISTRATION FLAGS
            ============================================== */

            if (
                settings.destroyRegistries
            ) {

                registeredDefaults.models =
                    false;


                registeredDefaults.components =
                    false;


                registeredDefaults.controllers =
                    false;

            }


            currentStatus =
                STATUS.STOPPED;


            lastShutdownAt =
                Date.now();


            bootStartedAt =
                null;


            bootCompletedAt =
                null;


            lastError =
                null;


            createReadyPromise();


            dispatchEvent(
                EVENTS.STOPPED,
                {

                    lastShutdownAt,

                    reason:
                        settings.reason

                }
            );


            return true;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            currentStatus =
                STATUS.ERROR;


            lastError =
                normalizedError;


            dispatchEvent(
                EVENTS.ERROR,
                {

                    error:
                        normalizedError,

                    phase:
                        "shutdown"

                }
            );


            throw normalizedError;

        }

    }


    /* ======================================================
       SHUTDOWN OPTIONS
    ====================================================== */

    function normalizeShutdownOptions(
        options
    ) {

        const source =
            isPlainObject(
                options
            )
                ? options
                : {};


        return {

            destroyRegistries:
                source.destroyRegistries ===
                true,

            clearModels:
                source.clearModels !==
                false,

            reason:
                String(
                    source.reason ||
                    "gomai-shutdown"
                )

        };

    }


    /* ======================================================
       FORCE BOOT PREPARATION
    ====================================================== */

    async function prepareForcedBoot() {

        /*
         * Hanya lakukan shutdown jika framework memang
         * pernah berjalan atau berada pada error.
         */
        if (
            currentStatus ===
                STATUS.READY ||
            currentStatus ===
                STATUS.ERROR ||
            currentStatus ===
                STATUS.STOPPED
        ) {

            await shutdown({

                destroyRegistries:
                    false,

                clearModels:
                    true,

                reason:
                    "force-reboot"

            });

        }


        currentStatus =
            STATUS.IDLE;


        lastError =
            null;


        createReadyPromise();

    }


    /* ======================================================
       ACCESS — MODEL
    ====================================================== */

    function getModel(
        name
    ) {

        return (
            getModelRegistry()
                ?.get(
                    name
                ) ||
            null
        );

    }


    async function callModel(
        name,
        method,
        ...args
    ) {

        const registry =
            getModelRegistry();


        if (
            !registry ||
            typeof registry.call !==
                "function"
        ) {

            return undefined;

        }


        return registry.call(
            name,
            method,
            ...args
        );

    }


    /* ======================================================
       ACCESS — COMPONENT
    ====================================================== */

    function getComponent(
        name
    ) {

        return (
            getComponentRegistry()
                ?.get(
                    name
                ) ||
            null
        );

    }


    async function callComponent(
        name,
        method,
        ...args
    ) {

        const registry =
            getComponentRegistry();


        if (
            !registry ||
            typeof registry.call !==
                "function"
        ) {

            return undefined;

        }


        return registry.call(
            name,
            method,
            ...args
        );

    }


    /* ======================================================
       ACCESS — CONTROLLER
    ====================================================== */

    function getController(
        name
    ) {

        return (
            getControllerRegistry()
                ?.get(
                    name
                ) ||
            null
        );

    }


    async function callController(
        method,
        ...args
    ) {

        const registry =
            getControllerRegistry();


        if (
            !registry ||
            typeof registry.call !==
                "function"
        ) {

            return undefined;

        }


        return registry.call(
            method,
            ...args
        );

    }


    /* ======================================================
       REGISTRY GETTERS
    ====================================================== */

    function getModelRegistry() {

        return (
            window.ModelRegistry ||
            null
        );

    }


    function getComponentRegistry() {

        return (
            window.ComponentRegistry ||
            null
        );

    }


    function getControllerRegistry() {

        return (
            window.ControllerRegistry ||
            null
        );

    }


    function getLanguageManager() {

        return (
            window.Language ||
            null
        );

    }


    function getUtils() {

        return (
            window.GomaiUtils ||
            null
        );

    }


    function getConfig() {

        return (
            window.GomaiConfig ||
            null
        );

    }


    /* ======================================================
       STATUS ACCESSORS
    ====================================================== */

    function getStatus() {

        return currentStatus;

    }


    function isReady() {

        return (
            currentStatus ===
            STATUS.READY
        );

    }


    function isBooting() {

        return (
            currentStatus ===
            STATUS.BOOTING
        );

    }


    function isShuttingDown() {

        return (
            currentStatus ===
            STATUS.SHUTTING_DOWN
        );

    }


    function getLastError() {

        return lastError;

    }


    function getBootDuration() {

        if (
            !bootStartedAt
        ) {

            return 0;

        }


        const end =
            bootCompletedAt ??
            Date.now();


        return (
            end -
            bootStartedAt
        );

    }


    function getCurrentLanguage() {

        const language =
            getLanguageManager();


        if (
            language &&
            typeof language.getLanguage ===
                "function"
        ) {

            return language
                .getLanguage();

        }


        return (
            getConfig()
                ?.language
                ?.default ||
            document.documentElement
                ?.lang ||
            "zh"
        );

    }


    /* ======================================================
       FRAMEWORK STATE
    ====================================================== */

    function getState() {

        const modelRegistry =
            getModelRegistry();


        const componentRegistry =
            getComponentRegistry();


        const controllerRegistry =
            getControllerRegistry();


        return Object.freeze({

            version:
                VERSION,


            status:
                currentStatus,


            language:
                getCurrentLanguage(),


            ready:
                isReady(),


            booting:
                isBooting(),


            shuttingDown:
                isShuttingDown(),


            bootCount,


            bootStartedAt,

            bootCompletedAt,

            lastShutdownAt,


            duration:
                getBootDuration(),


            lastError,


            defaultRegistrations:
                Object.freeze({

                    ...registeredDefaults

                }),


            models:
                modelRegistry
                    ?.getNames?.() ||
                [],


            components:
                componentRegistry
                    ?.getNames?.() ||
                [],


            controllers:
                controllerRegistry
                    ?.getNames?.() ||
                [],


            activeController:
                controllerRegistry
                    ?.getActiveName?.() ||
                "",


            activePage:
                controllerRegistry
                    ?.getActiveEntry?.()
                    ?.page ||
                ""

        });

    }


    /* ======================================================
       BOOT RESULT
    ====================================================== */

    function createBootResult(
        extra = {}
    ) {

        const modelRegistry =
            getModelRegistry();


        const componentRegistry =
            getComponentRegistry();


        const controllerRegistry =
            getControllerRegistry();


        const suppliedModels =
            extra.models;


        const suppliedComponents =
            extra.components;


        return Object.freeze({

            version:
                VERSION,


            status:
                currentStatus,


            language:
                getCurrentLanguage(),


            duration:
                getBootDuration(),


            bootCount,


            models:
                suppliedModels instanceof
                    Map
                    ? suppliedModels
                    : (
                        modelRegistry
                            ?.getInitializationResults?.() ||
                        new Map()
                    ),


            components:
                suppliedComponents instanceof
                    Map
                    ? suppliedComponents
                    : (
                        componentRegistry
                            ?.getInitializationResults?.() ||
                        new Map()
                    ),


            controller:
                Object.prototype
                    .hasOwnProperty
                    .call(
                        extra,
                        "controller"
                    )
                    ? extra.controller
                    : (
                        controllerRegistry
                            ?.getActive?.() ||
                        null
                    ),


            controllerName:
                controllerRegistry
                    ?.getActiveName?.() ||
                "",


            page:
                controllerRegistry
                    ?.getActiveEntry?.()
                    ?.page ||
                ""

        });

    }


    /* ======================================================
       DEPENDENCY VALIDATION
    ====================================================== */

    function validateCoreDependencies() {

        const required = [

            [
                "GomaiConfig",
                getConfig()
            ],

            [
                "GomaiUtils",
                getUtils()
            ],

            [
                "Language",
                getLanguageManager()
            ],

            [
                "ModelRegistry",
                getModelRegistry()
            ],

            [
                "ComponentRegistry",
                getComponentRegistry()
            ],

            [
                "ControllerRegistry",
                getControllerRegistry()
            ]

        ];


        const missing =
            required
                .filter(
                    ([
                        _name,
                        value
                    ]) =>
                        !value
                )
                .map(
                    ([
                        name
                    ]) =>
                        name
                );


        if (
            missing.length > 0
        ) {

            throw new Error(
                `Gomai membutuhkan dependency berikut: ${missing.join(", ")}.`
            );

        }

    }


    /* ======================================================
       GENERIC HELPERS
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


    function clonePlainObject(
        value
    ) {

        if (
            !isPlainObject(
                value
            )
        ) {

            return {};

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
                 * Gunakan shallow clone.
                 */
            }

        }


        return {
            ...value
        };

    }


    function normalizeError(
        error
    ) {

        if (
            error instanceof
            Error
        ) {

            return error;

        }


        if (
            isPlainObject(
                error
            ) &&
            typeof error.message ===
                "string"
        ) {

            const normalized =
                new Error(
                    error.message
                );


            if (
                error.name
            ) {

                normalized.name =
                    String(
                        error.name
                    );

            }


            return normalized;

        }


        return new Error(
            String(
                error ||
                "Terjadi kesalahan pada Gomai."
            )
        );

    }


    async function settlePromise(
        promise
    ) {

        if (!promise) {
            return;
        }


        try {

            await promise;

        } catch (_error) {

            /*
             * Error operasi sebelumnya sudah ditangani
             * oleh lifecycle terkait.
             */

        }

    }


    /* ======================================================
       EVENTS
    ====================================================== */

    function dispatchEvent(
        eventName,
        detail = {}
    ) {

        return document.dispatchEvent(
            new CustomEvent(
                eventName,
                {

                    detail: {

                        gomai:
                            publicAPI,


                        version:
                            VERSION,


                        status:
                            currentStatus,


                        timestamp:
                            Date.now(),


                        ...(
                            isPlainObject(
                                detail
                            )
                                ? detail
                                : {
                                    value:
                                        detail
                                }
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


            status:
                STATUS,


            events:
                EVENTS,


            boot,

            ready,

            shutdown,


            registerModel,

            registerComponent,

            registerController,


            registerDefaultModels,

            registerDefaultComponents,

            registerDefaultControllers,


            getModel,

            getComponent,

            getController,


            callModel,

            callComponent,

            callController,


            getStatus,

            getState,

            getLastError,

            getBootDuration,


            isReady,

            isBooting,

            isShuttingDown,


            get config() {

                return getConfig();

            },


            get utils() {

                return getUtils();

            },


            get language() {

                return getLanguageManager();

            },


            get models() {

                return getModelRegistry();

            },


            get components() {

                return getComponentRegistry();

            },


            get controllers() {

                return getControllerRegistry();

            }

        });


    return publicAPI;

})();


window.Gomai =
    Gomai;