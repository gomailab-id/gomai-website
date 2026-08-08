"use strict";

/* ==========================================================
   GOMAI CONTROLLER REGISTRY
   js/core/controller-registry.js

   Tanggung jawab:
   - Mendaftarkan controller halaman
   - Menentukan controller aktif
   - Menjalankan controller aktif
   - Menghentikan controller aktif
   - Restart controller
   - Mengelola perubahan bahasa
   - Menyediakan context standar
   - Mencegah lifecycle ganda
   - Mengirim event lifecycle

   Controller minimal:

   {
       init(context) {}
   }

   Method opsional:

   {
       destroy(context) {},
       refreshLanguage(context) {}
   }

   Struktur halaman final Gomai:

   home
   brand
   products
   productDetail
   information

   Halaman berikut memakai controller information:
   - about.html
   - contact.html
   - faq.html
   - how-to-buy.html
========================================================== */

const ControllerRegistry = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       CONSTANTS
    ====================================================== */

    const DEFAULT_BODY_ATTRIBUTE =
        "page";


    const INFORMATION_PAGES =
        Object.freeze([
            "about",
            "contact",
            "faq",
            "howToBuy"
        ]);


    /* ======================================================
       EVENTS
    ====================================================== */

    const EVENTS =
        Object.freeze({

            REGISTERED:
                "gomai:controller-registered",

            UNREGISTERED:
                "gomai:controller-unregistered",


            STARTING:
                "gomai:controller-starting",

            STARTED:
                "gomai:controller-started",

            SKIPPED:
                "gomai:controller-skipped",

            NOT_FOUND:
                "gomai:controller-not-found",

            ERROR:
                "gomai:controller-error",


            STOPPING:
                "gomai:controller-stopping",

            STOPPED:
                "gomai:controller-stopped",

            DESTROY_ERROR:
                "gomai:controller-destroy-error",


            RESTARTING:
                "gomai:controller-restarting",

            RESTARTED:
                "gomai:controller-restarted",


            LANGUAGE_REFRESHING:
                "gomai:controller-language-refreshing",

            LANGUAGE_REFRESHED:
                "gomai:controller-language-refreshed",

            LANGUAGE_ERROR:
                "gomai:controller-language-error",


            CALL_ERROR:
                "gomai:controller-call-error",


            REGISTRY_CLEARED:
                "gomai:controller-registry-cleared"

        });


    /* ======================================================
       REGISTRY STATE
    ====================================================== */

    const controllers =
        new Map();


    let activeControllerName =
        "";


    let activeController =
        null;


    let activeEntry =
        null;


    let activeContext =
        null;


    let starting =
        false;


    let stopping =
        false;


    let started =
        false;


    let startPromise =
        null;


    let stopPromise =
        null;


    let refreshPromise =
        null;


    let languageEventBound =
        false;


    let lifecycleEnabled =
        false;


    /* ======================================================
       REGISTER
    ====================================================== */

    function register(
        name,
        controller,
        options = {}
    ) {

        const normalizedName =
            normalizeControllerName(
                name
            );


        if (!normalizedName) {

            throw new Error(
                "ControllerRegistry.register(): nama controller tidak valid."
            );

        }


        const settings =
            normalizeRegistrationOptions(
                options
            );


        validateController(
            controller,
            normalizedName
        );


        const previousEntry =
            controllers.get(
                normalizedName
            );


        if (
            previousEntry &&
            !settings.replace
        ) {

            console.warn(
                `ControllerRegistry: controller "${normalizedName}" sudah terdaftar.`
            );


            return false;

        }


        if (
            previousEntry &&
            settings.replace &&
            activeControllerName ===
                normalizedName
        ) {

            console.warn(
                `ControllerRegistry: controller aktif "${normalizedName}" diganti.`
            );

        }


        const entry = {

            name:
                normalizedName,

            page:
                normalizePageName(
                    settings.page ||
                    normalizedName
                ),

            controller,

            required:
                settings.required,

            priority:
                settings.priority,

            languageAware:
                settings.languageAware,

            initOptions:
                clonePlainObject(
                    settings.initOptions
                ),


            initialized:
                false,

            initializing:
                false,

            destroying:
                false,

            refreshing:
                false,


            result:
                null,

            error:
                null

        };


        controllers.set(
            normalizedName,
            entry
        );


        dispatchRegistryEvent(
            EVENTS.REGISTERED,
            {

                name:
                    normalizedName,

                page:
                    entry.page,

                controller,

                required:
                    entry.required,

                priority:
                    entry.priority,

                languageAware:
                    entry.languageAware

            }
        );


        return true;

    }


    /* ======================================================
       REGISTER MANY
    ====================================================== */

    function registerMany(
        entries,
        sharedOptions = {}
    ) {

        const registeredNames =
            [];


        if (
            entries instanceof
            Map
        ) {

            entries.forEach(
                (
                    value,
                    name
                ) => {

                    const registration =
                        normalizeManyEntry(
                            value,
                            sharedOptions
                        );


                    if (
                        register(
                            name,
                            registration.controller,
                            registration.options
                        )
                    ) {

                        registeredNames.push(
                            normalizeControllerName(
                                name
                            )
                        );

                    }

                }
            );


            return registeredNames;

        }


        if (
            !isPlainObject(
                entries
            )
        ) {

            throw new TypeError(
                "ControllerRegistry.registerMany(): entries harus berupa object atau Map."
            );

        }


        Object.entries(
            entries
        )
            .forEach(
                ([
                    name,
                    value
                ]) => {

                    const registration =
                        normalizeManyEntry(
                            value,
                            sharedOptions
                        );


                    if (
                        register(
                            name,
                            registration.controller,
                            registration.options
                        )
                    ) {

                        registeredNames.push(
                            normalizeControllerName(
                                name
                            )
                        );

                    }

                }
            );


        return registeredNames;

    }


    /* ======================================================
       UNREGISTER
    ====================================================== */

    async function unregister(
        name,
        options = {}
    ) {

        const normalizedName =
            normalizeControllerName(
                name
            );


        const entry =
            controllers.get(
                normalizedName
            );


        if (!entry) {
            return false;
        }


        if (
            activeControllerName ===
            normalizedName
        ) {

            if (
                options.force !==
                true
            ) {

                console.warn(
                    `ControllerRegistry: controller "${normalizedName}" sedang aktif. Jalankan stop() terlebih dahulu.`
                );


                return false;

            }


            await stop({

                context: {

                    reason:
                        "unregister"

                }

            });

        }


        controllers.delete(
            normalizedName
        );


        dispatchRegistryEvent(
            EVENTS.UNREGISTERED,
            {

                name:
                    normalizedName,

                controller:
                    entry.controller,

                page:
                    entry.page

            }
        );


        return true;

    }


    /* ======================================================
       ACCESSORS
    ====================================================== */

    function get(
        name
    ) {

        return (
            controllers.get(
                normalizeControllerName(
                    name
                )
            )?.controller ||
            null
        );

    }


    function getEntry(
        name
    ) {

        const entry =
            controllers.get(
                normalizeControllerName(
                    name
                )
            );


        return entry
            ? createPublicEntry(
                entry
            )
            : null;

    }


    function getAll() {

        const result =
            new Map();


        controllers.forEach(
            (
                entry,
                name
            ) => {

                result.set(
                    name,
                    createPublicEntry(
                        entry
                    )
                );

            }
        );


        return result;

    }


    function getNames() {

        return Array.from(
            controllers.keys()
        );

    }


    function has(
        name
    ) {

        return controllers.has(
            normalizeControllerName(
                name
            )
        );

    }


    function count() {

        return controllers.size;

    }


    /* ======================================================
       PAGE RESOLUTION
    ====================================================== */

    function resolvePageName(
        options = {}
    ) {

        /*
         * Prioritas:
         *
         * 1. options.page
         * 2. body[data-page]
         * 3. pathname
         */

        const explicitPage =
            normalizePageName(
                options.page
            );


        if (explicitPage) {

            return resolveControllerAlias(
                explicitPage
            );

        }


        const bodyAttribute =
            normalizeDatasetKey(
                options.bodyAttribute ||
                DEFAULT_BODY_ATTRIBUTE
            );


        const bodyPage =
            normalizePageName(
                document.body
                    ?.dataset?.[
                        bodyAttribute
                    ]
            );


        if (bodyPage) {

            return resolveControllerAlias(
                bodyPage
            );

        }


        return resolveControllerAlias(
            detectPageFromPath()
        );

    }


    /* ======================================================
       PAGE ALIASES
    ====================================================== */

    function resolveControllerAlias(
        pageName
    ) {

        const normalized =
            normalizePageName(
                pageName
            );


        if (!normalized) {
            return "";
        }


        /*
         * Final Gomai menggunakan satu controller informasi
         * untuk empat halaman statis.
         */
        if (
            INFORMATION_PAGES.includes(
                normalized
            )
        ) {

            return "information";

        }


        return normalized;

    }


    /* ======================================================
       PATHNAME FALLBACK
    ====================================================== */

    function detectPageFromPath() {

        const pathname =
            String(
                window.location
                    ?.pathname ||
                ""
            )
                .replaceAll(
                    "\\",
                    "/"
                )
                .toLowerCase();


        const parts =
            pathname
                .split("/")
                .filter(Boolean);


        let fileName =
            parts.at(-1) ||
            "index.html";


        /*
         * URL root seperti:
         *
         * /
         * /gomai/
         *
         * dianggap homepage.
         */
        if (
            pathname.endsWith("/") ||
            !fileName.includes(".")
        ) {

            return "home";

        }


        fileName =
            fileName
                .split("?")[0]
                .split("#")[0];


        const pageMap = {

            "index.html":
                "home",

            "brand.html":
                "brand",

            "products.html":
                "products",

            "product-detail.html":
                "productDetail",

            "about.html":
                "information",

            "contact.html":
                "information",

            "faq.html":
                "information",

            "how-to-buy.html":
                "information",

            "404.html":
                "notFound"

        };


        if (
            pageMap[
                fileName
            ]
        ) {

            return pageMap[
                fileName
            ];

        }


        return normalizePageName(
            fileName.replace(
                /\.html?$/i,
                ""
            )
        );

    }


    /* ======================================================
       START
    ====================================================== */

    async function start(
        options = {}
    ) {

        const requestedPage =
            resolvePageName(
                options
            );


        /*
         * Controller yang sama sudah berjalan.
         */
        if (
            started &&
            activeController &&
            activeControllerName ===
                requestedPage &&
            options.forceRestart !==
                true
        ) {

            return activeController;

        }


        /*
         * Controller lain sudah aktif.
         * Start baru secara otomatis menghentikan controller
         * lama agar hanya ada satu controller halaman.
         */
        if (
            started &&
            activeController &&
            activeControllerName !==
                requestedPage
        ) {

            await stop({

                context: {

                    reason:
                        "page-change",

                    nextPage:
                        requestedPage

                }

            });

        }


        if (
            options.forceRestart ===
                true &&
            activeController
        ) {

            await stop({

                context: {

                    reason:
                        "force-restart",

                    nextPage:
                        requestedPage

                }

            });

        }


        if (
            starting &&
            startPromise
        ) {

            return startPromise;

        }


        /*
         * Stop lama harus benar-benar selesai sebelum
         * controller baru dijalankan.
         */
        if (
            stopping &&
            stopPromise
        ) {

            await settlePromise(
                stopPromise
            );

        }


        startPromise =
            startInternal(
                {

                    ...options,

                    page:
                        requestedPage

                }
            );


        try {

            return await startPromise;

        } finally {

            startPromise =
                null;

        }

    }


    async function startInternal(
        options
    ) {

        starting =
            true;


        const pageName =
            resolvePageName(
                options
            );


        dispatchRegistryEvent(
            EVENTS.STARTING,
            {

                name:
                    pageName

            }
        );


        try {

            if (!pageName) {

                resetActiveController();


                dispatchRegistryEvent(
                    EVENTS.SKIPPED,
                    {

                        reason:
                            "page-not-resolved"

                    }
                );


                console.warn(
                    "ControllerRegistry: halaman aktif tidak dapat ditentukan."
                );


                return null;

            }


            const entry =
                findEntryByPage(
                    pageName
                );


            if (!entry) {

                resetActiveController();


                dispatchRegistryEvent(
                    EVENTS.NOT_FOUND,
                    {

                        name:
                            pageName,

                        registeredControllers:
                            getNames()

                    }
                );


                console.warn(
                    `ControllerRegistry: controller untuk halaman "${pageName}" belum terdaftar.`
                );


                return null;

            }


            const controller =
                entry.controller;


            activeControllerName =
                entry.name;


            activeController =
                controller;


            activeEntry =
                entry;


            const context =
                createControllerContext(
                    entry.page,
                    {

                        ...entry
                            .initOptions,

                        ...(
                            isPlainObject(
                                options.context
                            )
                                ? options.context
                                : {}
                        )

                    }
                );


            activeContext =
                context;


            entry.initializing =
                true;


            entry.error =
                null;


            const result =
                await controller
                    .init(
                        context
                    );


            entry.initializing =
                false;


            entry.initialized =
                true;


            entry.result =
                result;


            entry.error =
                null;


            started =
                true;


            document.body
                ?.setAttribute(
                    "data-controller-active",
                    entry.name
                );


            bindLanguageEvent();
            enableLifecycle();


            dispatchRegistryEvent(
                EVENTS.STARTED,
                {

                    name:
                        entry.name,

                    page:
                        entry.page,

                    controller,

                    context,

                    result

                }
            );


            return controller;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            const failedEntry =
                activeEntry;


            if (failedEntry) {

                failedEntry.initializing =
                    false;


                failedEntry.initialized =
                    false;


                failedEntry.result =
                    null;


                failedEntry.error =
                    normalizedError;

            }


            const failedController =
                activeController;


            const failedName =
                activeControllerName ||
                pageName;


            resetActiveController();


            dispatchRegistryEvent(
                EVENTS.ERROR,
                {

                    name:
                        failedName,

                    controller:
                        failedController,

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        } finally {

            starting =
                false;

        }

    }


    /* ======================================================
       STOP
    ====================================================== */

    async function stop(
        options = {}
    ) {

        if (
            stopping &&
            stopPromise
        ) {

            return stopPromise;

        }


        if (
            starting &&
            startPromise
        ) {

            await settlePromise(
                startPromise
            );

        }


        if (!activeController) {

            resetActiveController();

            return false;

        }


        stopPromise =
            stopInternal(
                options
            );


        try {

            return await stopPromise;

        } finally {

            stopPromise =
                null;

        }

    }


    async function stopInternal(
        options
    ) {

        stopping =
            true;


        const controller =
            activeController;


        const controllerName =
            activeControllerName;


        const entry =
            activeEntry;


        const previousContext =
            activeContext;


        dispatchRegistryEvent(
            EVENTS.STOPPING,
            {

                name:
                    controllerName,

                controller

            }
        );


        try {

            if (
                entry
            ) {

                entry.destroying =
                    true;

            }


            if (
                typeof controller
                    .destroy ===
                "function"
            ) {

                await controller
                    .destroy({

                        name:
                            controllerName,

                        page:
                            entry?.page ||
                            controllerName,

                        previousContext,

                        context:
                            isPlainObject(
                                options.context
                            )
                                ? options.context
                                : {},

                        registry:
                            publicAPI

                    });

            }


            if (
                entry
            ) {

                entry.initialized =
                    false;


                entry.initializing =
                    false;


                entry.destroying =
                    false;


                entry.refreshing =
                    false;


                entry.result =
                    null;


                entry.error =
                    null;

            }


            dispatchRegistryEvent(
                EVENTS.STOPPED,
                {

                    name:
                        controllerName,

                    controller

                }
            );


            return true;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            if (
                entry
            ) {

                entry.destroying =
                    false;


                entry.error =
                    normalizedError;

            }


            dispatchRegistryEvent(
                EVENTS.DESTROY_ERROR,
                {

                    name:
                        controllerName,

                    controller,

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        } finally {

            resetActiveController();


            stopping =
                false;

        }

    }


    /* ======================================================
       RESTART
    ====================================================== */

    async function restart(
        options = {}
    ) {

        const pageName =
            resolvePageName({

                page:
                    options.page ||
                    activeEntry
                        ?.page ||
                    activeControllerName

            });


        dispatchRegistryEvent(
            EVENTS.RESTARTING,
            {

                name:
                    pageName

            }
        );


        await stop({

            context: {

                reason:
                    "restart",

                ...(
                    isPlainObject(
                        options.context
                    )
                        ? options.context
                        : {}
                )

            }

        });


        const controller =
            await start({

                ...options,

                page:
                    pageName,

                forceRestart:
                    false

            });


        dispatchRegistryEvent(
            EVENTS.RESTARTED,
            {

                name:
                    pageName,

                controller

            }
        );


        return controller;

    }


    /* ======================================================
       LANGUAGE REFRESH
    ====================================================== */

    async function refreshLanguage(
        context = {}
    ) {

        if (
            !activeController ||
            !activeEntry
        ) {

            return false;

        }


        if (
            activeEntry.languageAware ===
            false
        ) {

            return false;

        }


        if (
            refreshPromise
        ) {

            return refreshPromise;

        }


        refreshPromise =
            refreshLanguageInternal(
                context
            );


        try {

            return await refreshPromise;

        } finally {

            refreshPromise =
                null;

        }

    }


    async function refreshLanguageInternal(
        context
    ) {

        if (
            !activeController ||
            !activeEntry
        ) {
            return false;
        }


        const controller =
            activeController;


        const entry =
            activeEntry;


        const language =
            normalizeLanguage(
                context.language ||
                context
                    ?.event
                    ?.detail
                    ?.language ||
                getCurrentLanguage()
            );


        entry.refreshing =
            true;


        dispatchRegistryEvent(
            EVENTS.LANGUAGE_REFRESHING,
            {

                name:
                    entry.name,

                page:
                    entry.page,

                controller,

                language

            }
        );


        try {

            let refreshed =
                false;


            if (
                typeof controller
                    .refreshLanguage ===
                "function"
            ) {

                await controller
                    .refreshLanguage({

                        ...context,

                        language,

                        page:
                            entry.page,

                        registry:
                            publicAPI

                    });


                refreshed =
                    true;

            } else if (
                typeof controller
                    .handleLanguageChanged ===
                "function"
            ) {

                await controller
                    .handleLanguageChanged({

                        ...context,

                        language,

                        page:
                            entry.page,

                        registry:
                            publicAPI

                    });


                refreshed =
                    true;

            }


            entry.refreshing =
                false;


            if (
                refreshed
            ) {

                dispatchRegistryEvent(
                    EVENTS.LANGUAGE_REFRESHED,
                    {

                        name:
                            entry.name,

                        page:
                            entry.page,

                        controller,

                        language

                    }
                );

            }


            return refreshed;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            entry.refreshing =
                false;


            entry.error =
                normalizedError;


            dispatchRegistryEvent(
                EVENTS.LANGUAGE_ERROR,
                {

                    name:
                        entry.name,

                    page:
                        entry.page,

                    controller,

                    language,

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        }

    }


    /* ======================================================
       LANGUAGE EVENT
    ====================================================== */

    function handleLanguageChanged(
        event
    ) {

        refreshLanguage({

            event,

            language:
                event
                    ?.detail
                    ?.language ||
                getCurrentLanguage()

        })
            .catch(
                error => {

                    console.error(
                        "ControllerRegistry: gagal memperbarui controller setelah perubahan bahasa.",
                        error
                    );

                }
            );

    }


    function bindLanguageEvent() {

        if (
            languageEventBound
        ) {
            return false;
        }


        document.addEventListener(
            "gomai:language-changed",
            handleLanguageChanged
        );


        languageEventBound =
            true;


        return true;

    }


    function unbindLanguageEvent() {

        if (
            !languageEventBound
        ) {
            return false;
        }


        document.removeEventListener(
            "gomai:language-changed",
            handleLanguageChanged
        );


        languageEventBound =
            false;


        return true;

    }


    /* ======================================================
       CALL ACTIVE CONTROLLER
    ====================================================== */

    async function call(
        methodName,
        ...args
    ) {

        const normalizedMethodName =
            normalizeMethodName(
                methodName
            );


        if (
            !activeController ||
            !normalizedMethodName
        ) {

            return undefined;

        }


        const method =
            activeController[
                normalizedMethodName
            ];


        if (
            typeof method !==
            "function"
        ) {

            return undefined;

        }


        try {

            return await method.apply(
                activeController,
                args
            );

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            dispatchRegistryEvent(
                EVENTS.CALL_ERROR,
                {

                    name:
                        activeControllerName,

                    controller:
                        activeController,

                    method:
                        normalizedMethodName,

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        }

    }


    /* ======================================================
       ACTIVE CONTROLLER ACCESSORS
    ====================================================== */

    function getActiveName() {

        return activeControllerName;

    }


    function getActive() {

        return activeController;

    }


    function getActiveEntry() {

        return activeEntry
            ? createPublicEntry(
                activeEntry
            )
            : null;

    }


    function getActiveContext() {

        return activeContext;

    }


    function isActive(
        name
    ) {

        const normalizedName =
            normalizeControllerName(
                name
            );


        if (
            normalizedName ===
            activeControllerName
        ) {

            return true;

        }


        const pageName =
            resolveControllerAlias(
                normalizePageName(
                    name
                )
            );


        return Boolean(
            activeEntry &&
            activeEntry.page ===
                pageName
        );

    }


    function hasStartedController() {

        return started;

    }


    function isStartingController() {

        return starting;

    }


    function isStoppingController() {

        return stopping;

    }


    /* ======================================================
       CONTROLLER CONTEXT
    ====================================================== */

    function createControllerContext(
        pageName,
        customContext = {}
    ) {

        const context = {

            page:
                pageName,

            informationPage:
                getInformationPageName(),


            body:
                document.body,

            document,

            window,


            registry:
                publicAPI,


            utils:
                window.GomaiUtils ||
                null,

            language:
                window.Language ||
                null,

            config:
                window.GomaiConfig ||
                null,


            modelRegistry:
                window.ModelRegistry ||
                null,

            componentRegistry:
                window.ComponentRegistry ||
                null,


            query:
                getCurrentQueryParameters(),


            getModel(
                name
            ) {

                return (
                    window.ModelRegistry
                        ?.get?.(
                            name
                        ) ||
                    null
                );

            },


            getComponent(
                name
            ) {

                return (
                    window.ComponentRegistry
                        ?.get?.(
                            name
                        ) ||
                    null
                );

            },


            ...(
                isPlainObject(
                    customContext
                )
                    ? customContext
                    : {}
            )

        };


        return Object.freeze(
            context
        );

    }


    /* ======================================================
       INFORMATION PAGE NAME
    ====================================================== */

    function getInformationPageName() {

        const bodyValue =
            normalizePageName(
                document.body
                    ?.dataset
                    ?.informationPage
            );


        if (
            INFORMATION_PAGES.includes(
                bodyValue
            )
        ) {

            return bodyValue;

        }


        const detected =
            detectOriginalInformationPageFromPath();


        return INFORMATION_PAGES
            .includes(
                detected
            )
                ? detected
                : "";

    }


    function detectOriginalInformationPageFromPath() {

        const pathname =
            String(
                window.location
                    ?.pathname ||
                ""
            )
                .replaceAll(
                    "\\",
                    "/"
                )
                .toLowerCase();


        const fileName =
            pathname
                .split("/")
                .filter(Boolean)
                .at(-1) ||
            "";


        const informationMap = {

            "about.html":
                "about",

            "contact.html":
                "contact",

            "faq.html":
                "faq",

            "how-to-buy.html":
                "howToBuy"

        };


        return (
            informationMap[
                fileName
            ] ||
            ""
        );

    }


    /* ======================================================
       QUERY PARAMETER
    ====================================================== */

    function getCurrentQueryParameters() {

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .getQueryParameters ===
                "function"
        ) {

            return window.GomaiUtils
                .getQueryParameters();

        }


        try {

            const result =
                {};


            const params =
                new URLSearchParams(
                    window.location
                        .search
                );


            for (
                const [
                    key,
                    value
                ]
                of params.entries()
            ) {

                if (
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            result,
                            key
                        )
                ) {

                    const current =
                        result[
                            key
                        ];


                    result[
                        key
                    ] =
                        Array.isArray(
                            current
                        )
                            ? [
                                ...current,
                                value
                            ]
                            : [
                                current,
                                value
                            ];

                } else {

                    result[
                        key
                    ] =
                        value;

                }

            }


            return result;

        } catch (_error) {

            return {};

        }

    }


    /* ======================================================
       ENTRY RESOLUTION
    ====================================================== */

    function findEntryByPage(
        pageName
    ) {

        const normalizedPage =
            resolveControllerAlias(
                normalizePageName(
                    pageName
                )
            );


        /*
         * Nama registry yang sama dengan page
         * menjadi prioritas pertama.
         */
        const directEntry =
            controllers.get(
                normalizedPage
            );


        if (
            directEntry &&
            directEntry.page ===
                normalizedPage
        ) {

            return directEntry;

        }


        const candidates =
            Array.from(
                controllers.values()
            )
                .filter(
                    entry =>
                        entry.page ===
                        normalizedPage
                )
                .sort(
                    (
                        first,
                        second
                    ) =>
                        second.priority -
                        first.priority
                );


        return (
            candidates[0] ||
            directEntry ||
            null
        );

    }


    /* ======================================================
       GLOBAL LIFECYCLE
    ====================================================== */

    function enableLifecycle() {

        if (
            lifecycleEnabled
        ) {
            return false;
        }


        window.addEventListener(
            "pagehide",
            handlePageHide
        );


        lifecycleEnabled =
            true;


        return true;

    }


    function disableLifecycle() {

        if (
            !lifecycleEnabled
        ) {
            return false;
        }


        window.removeEventListener(
            "pagehide",
            handlePageHide
        );


        lifecycleEnabled =
            false;


        return true;

    }


    function handlePageHide(
        event
    ) {

        /*
         * Jangan merusak halaman yang akan masuk BFCache.
         */
        if (
            event?.persisted ===
            true
        ) {
            return;
        }


        if (
            !activeController
        ) {
            return;
        }


        const controller =
            activeController;


        const controllerName =
            activeControllerName;


        if (
            typeof controller
                .destroy !==
            "function"
        ) {

            return;

        }


        try {

            const result =
                controller.destroy({

                    name:
                        controllerName,

                    page:
                        activeEntry
                            ?.page ||
                        controllerName,

                    context: {

                        reason:
                            "pagehide"

                    },

                    registry:
                        publicAPI

                });


            /*
             * Browser tidak menunggu Promise saat pagehide,
             * tetapi rejection tetap ditangani agar tidak
             * menjadi unhandled rejection.
             */
            if (
                result &&
                typeof result
                    .catch ===
                    "function"
            ) {

                result.catch(
                    error => {

                        console.error(
                            `ControllerRegistry: cleanup controller "${controllerName}" gagal.`,
                            error
                        );

                    }
                );

            }

        } catch (error) {

            console.error(
                `ControllerRegistry: cleanup controller "${controllerName}" gagal.`,
                error
            );

        }

    }


    /* ======================================================
       CLEAR REGISTRY
    ====================================================== */

    async function clear(
        options = {}
    ) {

        await stop({

            context: {

                reason:
                    "registry-clear",

                ...(
                    isPlainObject(
                        options.context
                    )
                        ? options.context
                        : {}
                )

            }

        });


        controllers.clear();


        unbindLanguageEvent();
        disableLifecycle();


        resetRegistryState();


        dispatchRegistryEvent(
            EVENTS.REGISTRY_CLEARED,
            {}
        );


        return true;

    }


    /* ======================================================
       RESET ACTIVE CONTROLLER
    ====================================================== */

    function resetActiveController() {

        document.body
            ?.removeAttribute(
                "data-controller-active"
            );


        activeControllerName =
            "";


        activeController =
            null;


        activeEntry =
            null;


        activeContext =
            null;


        started =
            false;

    }


    function resetRegistryState() {

        resetActiveController();


        starting =
            false;


        stopping =
            false;


        startPromise =
            null;


        stopPromise =
            null;


        refreshPromise =
            null;

    }


    /* ======================================================
       REGISTRATION NORMALIZATION
    ====================================================== */

    function normalizeRegistrationOptions(
        options = {}
    ) {

        const source =
            isPlainObject(
                options
            )
                ? options
                : {};


        return {

            page:
                normalizePageName(
                    source.page
                ),

            required:
                source.required !==
                false,

            priority:
                normalizePriority(
                    source.priority
                ),

            languageAware:
                source.languageAware !==
                false,

            replace:
                source.replace ===
                true,

            initOptions:
                clonePlainObject(
                    source.initOptions
                )

        };

    }


    function normalizeManyEntry(
        value,
        sharedOptions
    ) {

        const shared =
            isPlainObject(
                sharedOptions
            )
                ? sharedOptions
                : {};


        if (
            isPlainObject(
                value
            ) &&
            Object.prototype
                .hasOwnProperty
                .call(
                    value,
                    "controller"
                )
        ) {

            return {

                controller:
                    value.controller,

                options: {

                    ...shared,

                    ...(
                        isPlainObject(
                            value.options
                        )
                            ? value.options
                            : {}
                    )

                }

            };

        }


        return {

            controller:
                value,

            options: {
                ...shared
            }

        };

    }


    /* ======================================================
       VALIDATION
    ====================================================== */

    function validateController(
        controller,
        name
    ) {

        if (
            !controller ||
            (
                typeof controller !==
                    "object" &&
                typeof controller !==
                    "function"
            )
        ) {

            throw new TypeError(
                `ControllerRegistry: controller "${name}" harus berupa object atau function.`
            );

        }


        if (
            typeof controller
                .init !==
            "function"
        ) {

            throw new TypeError(
                `ControllerRegistry: controller "${name}" harus memiliki init().`
            );

        }

    }


    /* ======================================================
       NAME NORMALIZATION
    ====================================================== */

    function normalizeControllerName(
        value
    ) {

        return normalizeCamelName(
            value
        );

    }


    function normalizePageName(
        value
    ) {

        const normalized =
            normalizeCamelName(
                value
            );


        if (!normalized) {
            return "";
        }


        /*
         * Alias eksplisit agar nama dari HTML, pathname,
         * dan registration selalu konsisten.
         */
        const aliases = {

            productdetail:
                "productDetail",

            productDetail:
                "productDetail",

            howtobuy:
                "howToBuy",

            howToBuy:
                "howToBuy",

            informationpage:
                "information",

            informationPage:
                "information"

        };


        return (
            aliases[
                normalized
            ] ||
            normalized
        );

    }


    function normalizeCamelName(
        value
    ) {

        const text =
            String(
                value ||
                ""
            )
                .trim()
                .replace(
                    /\.html?$/i,
                    ""
                );


        if (!text) {
            return "";
        }


        return text
            .replace(
                /[\s_-]+([a-zA-Z0-9])/g,
                (
                    _match,
                    character
                ) =>
                    character
                        .toUpperCase()
            )
            .replace(
                /^[A-Z]/,
                character =>
                    character
                        .toLowerCase()
            );

    }


    function normalizeMethodName(
        value
    ) {

        return String(
            value ||
            ""
        ).trim();

    }


    function normalizeDatasetKey(
        value
    ) {

        const normalized =
            normalizeCamelName(
                value
            );


        return (
            normalized ||
            DEFAULT_BODY_ATTRIBUTE
        );

    }


    function normalizePriority(
        value
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : 0;

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

            return normalizeLanguage(
                window.Language
                    .getLanguage()
            );

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


    function normalizeLanguage(
        value
    ) {

        const language =
            String(
                value ||
                ""
            )
                .trim()
                .toLowerCase()
                .replace(
                    "_",
                    "-"
                )
                .split("-")[0];


        const supported =
            window.GomaiConfig
                ?.language
                ?.supported;


        if (
            Array.isArray(
                supported
            ) &&
            supported.includes(
                language
            )
        ) {

            return language;

        }


        return (
            window.GomaiConfig
                ?.language
                ?.default ||
            "zh"
        );

    }


    /* ======================================================
       PUBLIC ENTRY
    ====================================================== */

    function createPublicEntry(
        entry
    ) {

        return Object.freeze({

            name:
                entry.name,

            page:
                entry.page,

            controller:
                entry.controller,

            required:
                entry.required,

            priority:
                entry.priority,

            languageAware:
                entry.languageAware,


            initialized:
                entry.initialized,

            initializing:
                entry.initializing,

            destroying:
                entry.destroying,

            refreshing:
                entry.refreshing,


            result:
                entry.result,

            error:
                entry.error

        });

    }


    /* ======================================================
       HELPERS
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
                "Terjadi kesalahan pada ControllerRegistry."
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
             * Error operasi sebelumnya sudah dikirim
             * melalui event lifecycle terkait.
             */

        }

    }


    /* ======================================================
       EVENTS
    ====================================================== */

    function dispatchRegistryEvent(
        eventName,
        detail = {}
    ) {

        return document.dispatchEvent(
            new CustomEvent(
                eventName,
                {

                    detail: {

                        registry:
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
       PUBLIC API
    ====================================================== */

    const publicAPI =
        Object.freeze({

            version:
                VERSION,

            events:
                EVENTS,


            register,
            registerMany,
            unregister,


            get,
            getEntry,
            getAll,
            getNames,
            has,
            count,


            resolvePageName,


            start,
            stop,
            restart,


            call,


            refreshLanguage,


            getActive,
            getActiveName,
            getActiveEntry,
            getActiveContext,


            isActive,

            hasStarted:
                hasStartedController,

            isStarting:
                isStartingController,

            isStopping:
                isStoppingController,


            enableLifecycle,
            disableLifecycle,


            clear

        });


    return publicAPI;

})();


window.ControllerRegistry =
    ControllerRegistry;