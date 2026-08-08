"use strict";

/* ==========================================================
   GOMAI COMPONENT REGISTRY
   js/core/component-registry.js

   Tanggung jawab:
   - Mendaftarkan seluruh komponen UI Gomai
   - Mengelola tipe global, utility, dan render
   - Menginisialisasi komponen global
   - Mencegah lifecycle berjalan ganda
   - Menghancurkan komponen dengan aman
   - Meneruskan perubahan bahasa
   - Menyediakan akses terpusat ke komponen
   - Mengirim event lifecycle

   Tipe komponen:

   global
   - Komponen UI bersama.
   - Umumnya autoInit.
   - Contoh: HeaderComponent, FooterComponent.

   utility
   - Helper UI.
   - Tidak otomatis dirender.
   - Contoh: LoadingComponent, EmptyStateComponent.

   render
   - Renderer reusable.
   - Dipanggil controller saat diperlukan.
   - Contoh: ProductCardComponent,
     BrandCardComponent, SearchPanelComponent.
========================================================== */

const ComponentRegistry = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       COMPONENT TYPES
    ====================================================== */

    const TYPES =
        Object.freeze({

            GLOBAL:
                "global",

            UTILITY:
                "utility",

            RENDER:
                "render"

        });


    const VALID_TYPES =
        Object.freeze(
            Object.values(
                TYPES
            )
        );


    /* ======================================================
       EVENTS
    ====================================================== */

    const EVENTS =
        Object.freeze({

            REGISTERED:
                "gomai:component-registered",

            UNREGISTERED:
                "gomai:component-unregistered",


            INITIALIZING:
                "gomai:component-initializing",

            INITIALIZED:
                "gomai:component-initialized",

            INIT_SKIPPED:
                "gomai:component-init-skipped",

            INIT_ERROR:
                "gomai:component-error",


            DESTROYING:
                "gomai:component-destroying",

            DESTROYED:
                "gomai:component-destroyed",

            DESTROY_ERROR:
                "gomai:component-destroy-error",


            LANGUAGE_REFRESHING:
                "gomai:component-language-refreshing",

            LANGUAGE_REFRESHED:
                "gomai:component-language-refreshed",

            LANGUAGE_ERROR:
                "gomai:component-language-error",


            CALL_ERROR:
                "gomai:component-call-error",


            ALL_INITIALIZING:
                "gomai:components-initializing",

            ALL_INITIALIZED:
                "gomai:components-initialized",

            ALL_INIT_ERROR:
                "gomai:components-error",


            ALL_DESTROYING:
                "gomai:components-destroying",

            ALL_DESTROYED:
                "gomai:components-destroyed",


            REGISTRY_CLEARED:
                "gomai:component-registry-cleared"

        });


    /* ======================================================
       REGISTRY STATE
    ====================================================== */

    const components =
        new Map();


    let initializing =
        false;


    let initialized =
        false;


    let initializationPromise =
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
        component,
        options = {}
    ) {

        const normalizedName =
            normalizeComponentName(
                name
            );


        if (!normalizedName) {

            throw new Error(
                "ComponentRegistry.register(): nama komponen tidak valid."
            );

        }


        const settings =
            normalizeRegistrationOptions(
                options
            );


        validateComponent(
            component,
            normalizedName,
            settings
        );


        const previousEntry =
            components.get(
                normalizedName
            );


        if (
            previousEntry &&
            !settings.replace
        ) {

            console.warn(
                `ComponentRegistry: komponen "${normalizedName}" sudah terdaftar.`
            );


            return false;

        }


        if (
            previousEntry &&
            settings.replace &&
            isEntryBusy(
                previousEntry
            )
        ) {

            console.warn(
                `ComponentRegistry: komponen "${normalizedName}" diganti ketika lifecycle lama masih aktif.`
            );

        }


        if (
            previousEntry &&
            previousEntry.initialized &&
            settings.replace
        ) {

            console.warn(
                `ComponentRegistry: komponen "${normalizedName}" diganti ketika instance lama masih terinisialisasi.`
            );

        }


        const entry = {

            name:
                normalizedName,

            component,

            type:
                settings.type,

            autoInit:
                settings.autoInit,

            required:
                settings.required,

            languageAware:
                settings.languageAware,


            initMethod:
                settings.initMethod,

            destroyMethod:
                settings.destroyMethod,

            refreshMethod:
                settings.refreshMethod,


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
                null,


            initPromise:
                null,

            destroyPromise:
                null,

            refreshPromise:
                null

        };


        components.set(
            normalizedName,
            entry
        );


        /*
         * Auto-init baru berarti hasil init registry
         * sebelumnya tidak lagi lengkap.
         */
        if (
            initialized &&
            entry.autoInit
        ) {

            initialized =
                false;

        }


        dispatchRegistryEvent(
            EVENTS.REGISTERED,
            {

                name:
                    normalizedName,

                component,

                type:
                    entry.type,

                autoInit:
                    entry.autoInit,

                required:
                    entry.required,

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


                    const registered =
                        register(
                            name,
                            registration.component,
                            registration.options
                        );


                    if (registered) {

                        registeredNames.push(
                            normalizeComponentName(
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
                "ComponentRegistry.registerMany(): entries harus berupa object atau Map."
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


                    const registered =
                        register(
                            name,
                            registration.component,
                            registration.options
                        );


                    if (registered) {

                        registeredNames.push(
                            normalizeComponentName(
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
            normalizeComponentName(
                name
            );


        const entry =
            components.get(
                normalizedName
            );


        if (!entry) {
            return false;
        }


        await waitForEntry(
            entry
        );


        if (
            entry.initialized &&
            options.destroy !==
            false
        ) {

            await destroyOne(
                normalizedName,
                {

                    suppressMissing:
                        true,

                    force:
                        options.force ===
                        true,

                    context: {

                        reason:
                            "unregister"

                    }

                }
            );

        }


        components.delete(
            normalizedName
        );


        if (
            entry.autoInit
        ) {

            initialized =
                false;

        }


        dispatchRegistryEvent(
            EVENTS.UNREGISTERED,
            {

                name:
                    normalizedName,

                component:
                    entry.component,

                type:
                    entry.type

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
            components.get(
                normalizeComponentName(
                    name
                )
            )?.component ||
            null
        );

    }


    function getEntry(
        name
    ) {

        const entry =
            components.get(
                normalizeComponentName(
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


        components.forEach(
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
            components.keys()
        );

    }


    function has(
        name
    ) {

        return components.has(
            normalizeComponentName(
                name
            )
        );

    }


    function count() {

        return components.size;

    }


    /* ======================================================
       INITIALIZE ALL AUTO COMPONENTS
    ====================================================== */

    async function init(
        options = {}
    ) {

        if (
            initialized &&
            options.force !==
            true
        ) {

            return getInitializationResults();

        }


        if (
            initializing &&
            initializationPromise
        ) {

            return initializationPromise;

        }


        initializationPromise =
            initializeInternal(
                options
            );


        try {

            return await initializationPromise;

        } finally {

            initializationPromise =
                null;

        }

    }


    async function initializeInternal(
        options
    ) {

        initializing =
            true;


        bindLanguageEvent();
        enableLifecycle();


        const only =
            normalizeNameList(
                options.only
            );


        const exclude =
            normalizeNameList(
                options.exclude
            );


        const results =
            new Map();


        dispatchRegistryEvent(
            EVENTS.ALL_INITIALIZING,
            {

                count:
                    components.size

            }
        );


        try {

            for (
                const [
                    name,
                    entry
                ]
                of components
            ) {

                if (
                    !entry.autoInit
                ) {
                    continue;
                }


                if (
                    only.length > 0 &&
                    !only.includes(
                        name
                    )
                ) {
                    continue;
                }


                if (
                    exclude.includes(
                        name
                    )
                ) {
                    continue;
                }


                const customOptions =
                    isPlainObject(
                        options
                            .componentOptions
                            ?.[name]
                    )
                        ? options
                            .componentOptions[
                                name
                            ]
                        : {};


                try {

                    const result =
                        await initOne(
                            name,
                            {

                                force:
                                    options.force ===
                                    true,

                                options: {

                                    ...entry
                                        .initOptions,

                                    ...customOptions

                                }

                            }
                        );


                    results.set(
                        name,
                        result
                    );

                } catch (error) {

                    results.set(
                        name,
                        null
                    );


                    if (
                        entry.required
                    ) {

                        throw error;

                    }


                    console.error(
                        `ComponentRegistry: komponen opsional "${name}" gagal diinisialisasi.`,
                        error
                    );

                }

            }


            initialized =
                areRequiredAutoInitComponentsReady();


            /*
             * Bila tidak ada komponen required, init tetap
             * dianggap selesai setelah seluruh autoInit selesai.
             */
            if (
                !hasRequiredAutoInitComponents()
            ) {

                initialized =
                    true;

            }


            dispatchRegistryEvent(
                EVENTS.ALL_INITIALIZED,
                {

                    initialized:
                        Array.from(
                            results.keys()
                        ),

                    results

                }
            );


            return results;

        } catch (error) {

            initialized =
                false;


            const normalizedError =
                normalizeError(
                    error
                );


            dispatchRegistryEvent(
                EVENTS.ALL_INIT_ERROR,
                {

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        } finally {

            initializing =
                false;

        }

    }


    /* ======================================================
       INITIALIZE ONE
    ====================================================== */

    async function initOne(
        name,
        options = {}
    ) {

        const normalizedName =
            normalizeComponentName(
                name
            );


        const entry =
            components.get(
                normalizedName
            );


        if (!entry) {

            if (
                options.suppressMissing ===
                true
            ) {
                return null;
            }


            throw new Error(
                `ComponentRegistry: komponen "${normalizedName}" belum terdaftar.`
            );

        }


        if (
            entry.initialized &&
            options.force !==
            true
        ) {

            return entry.result;

        }


        if (
            entry.initializing &&
            entry.initPromise
        ) {

            return entry.initPromise;

        }


        /*
         * Tunggu destroy/refresh sebelumnya agar lifecycle
         * baru tidak berjalan di atas komponen yang sama.
         */
        await waitForEntry(
            entry,
            {
                exclude:
                    "init"
            }
        );


        if (
            entry.initialized &&
            options.force ===
            true
        ) {

            await destroyOne(
                normalizedName,
                {

                    suppressMissing:
                        true,

                    force:
                        true,

                    context: {

                        reason:
                            "force-reinit"

                    }

                }
            );

        }


        entry.initPromise =
            initializeEntry(
                entry,
                options
            );


        try {

            return await entry
                .initPromise;

        } finally {

            entry.initPromise =
                null;

        }

    }


    async function initializeEntry(
        entry,
        options
    ) {

        const method =
            resolveInitMethod(
                entry
            );


        if (!method) {

            entry.initialized =
                true;

            entry.result =
                entry.component;

            entry.error =
                null;


            dispatchRegistryEvent(
                EVENTS.INIT_SKIPPED,
                {

                    name:
                        entry.name,

                    type:
                        entry.type,

                    reason:
                        "no-init-method"

                }
            );


            return entry.result;

        }


        entry.initializing =
            true;

        entry.error =
            null;


        dispatchRegistryEvent(
            EVENTS.INITIALIZING,
            {

                name:
                    entry.name,

                type:
                    entry.type

            }
        );


        try {

            const initOptions = {

                ...entry
                    .initOptions,

                ...(
                    isPlainObject(
                        options.options
                    )
                        ? options.options
                        : {}
                )

            };


            const result =
                await method.call(
                    entry.component,
                    initOptions
                );


            /*
             * Komponen global required harus benar-benar
             * berhasil menghasilkan UI.
             *
             * Header/Footer Gomai menggunakan render()
             * dan mengembalikan root element.
             */
            if (
                entry.type ===
                    TYPES.GLOBAL &&
                entry.required &&
                (
                    result === null ||
                    result === false
                )
            ) {

                throw new Error(
                    `ComponentRegistry: komponen global "${entry.name}" tidak berhasil dirender.`
                );

            }


            entry.result =
                result;

            entry.initialized =
                true;

            entry.error =
                null;


            dispatchRegistryEvent(
                EVENTS.INITIALIZED,
                {

                    name:
                        entry.name,

                    type:
                        entry.type,

                    result

                }
            );


            return result;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            entry.result =
                null;

            entry.initialized =
                false;

            entry.error =
                normalizedError;


            dispatchRegistryEvent(
                EVENTS.INIT_ERROR,
                {

                    name:
                        entry.name,

                    type:
                        entry.type,

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        } finally {

            entry.initializing =
                false;

        }

    }


    /* ======================================================
       DESTROY ONE
    ====================================================== */

    async function destroyOne(
        name,
        options = {}
    ) {

        const normalizedName =
            normalizeComponentName(
                name
            );


        const entry =
            components.get(
                normalizedName
            );


        if (!entry) {

            if (
                options.suppressMissing ===
                true
            ) {
                return false;
            }


            console.warn(
                `ComponentRegistry: komponen "${normalizedName}" belum terdaftar.`
            );


            return false;

        }


        if (
            entry.destroying &&
            entry.destroyPromise
        ) {

            return entry.destroyPromise;

        }


        /*
         * Init yang sedang berjalan tidak dapat dibatalkan
         * dengan aman, jadi tunggu sampai selesai.
         */
        if (
            entry.initPromise
        ) {

            await settlePromise(
                entry.initPromise
            );

        }


        if (
            !entry.initialized &&
            options.force !==
            true
        ) {

            return false;

        }


        if (
            entry.refreshPromise
        ) {

            await settlePromise(
                entry.refreshPromise
            );

        }


        entry.destroyPromise =
            destroyEntry(
                entry,
                options
            );


        try {

            return await entry
                .destroyPromise;

        } finally {

            entry.destroyPromise =
                null;

        }

    }


    async function destroyEntry(
        entry,
        options
    ) {

        entry.destroying =
            true;


        dispatchRegistryEvent(
            EVENTS.DESTROYING,
            {

                name:
                    entry.name,

                type:
                    entry.type,

                context:
                    options.context ||
                    {}

            }
        );


        try {

            const method =
                resolveDestroyMethod(
                    entry
                );


            if (
                method
            ) {

                await method.call(
                    entry.component,
                    options.context ||
                    {}
                );

            }


            resetEntryRuntimeState(
                entry,
                {
                    preserveDestroyState:
                        true
                }
            );


            initialized =
                false;


            dispatchRegistryEvent(
                EVENTS.DESTROYED,
                {

                    name:
                        entry.name,

                    type:
                        entry.type

                }
            );


            return true;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            entry.error =
                normalizedError;


            dispatchRegistryEvent(
                EVENTS.DESTROY_ERROR,
                {

                    name:
                        entry.name,

                    type:
                        entry.type,

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        } finally {

            entry.destroying =
                false;

        }

    }


    /* ======================================================
       DESTROY ALL INITIALIZED COMPONENTS
    ====================================================== */

    async function destroy(
        options = {}
    ) {

        const names =
            Array.from(
                components.keys()
            )
                .reverse();


        const results =
            new Map();


        dispatchRegistryEvent(
            EVENTS.ALL_DESTROYING,
            {

                count:
                    names.length

            }
        );


        for (
            const name
            of names
        ) {

            const entry =
                components.get(
                    name
                );


            if (!entry) {
                continue;
            }


            if (
                !entry.initialized &&
                options.includeUninitialized !==
                true
            ) {

                continue;

            }


            try {

                const result =
                    await destroyOne(
                        name,
                        {

                            suppressMissing:
                                true,

                            force:
                                options
                                    .includeUninitialized ===
                                true,

                            context:
                                options.context ||
                                {}

                        }
                    );


                results.set(
                    name,
                    result
                );

            } catch (error) {

                results.set(
                    name,
                    false
                );


                if (
                    options.stopOnError ===
                    true
                ) {

                    throw error;

                }


                console.error(
                    `ComponentRegistry: gagal menghancurkan komponen "${name}".`,
                    error
                );

            }

        }


        initialized =
            false;


        dispatchRegistryEvent(
            EVENTS.ALL_DESTROYED,
            {

                destroyed:
                    Array.from(
                        results.keys()
                    ),

                results

            }
        );


        return results;

    }


    /* ======================================================
       LANGUAGE — ONE COMPONENT
    ====================================================== */

    async function refreshOne(
        name,
        context = {},
        options = {}
    ) {

        const normalizedName =
            normalizeComponentName(
                name
            );


        const entry =
            components.get(
                normalizedName
            );


        if (!entry) {
            return false;
        }


        if (
            !entry.languageAware
        ) {
            return false;
        }


        if (
            !entry.initialized &&
            options.includeUninitialized !==
            true
        ) {
            return false;
        }


        if (
            entry.destroying
        ) {
            return false;
        }


        if (
            entry.refreshing &&
            entry.refreshPromise
        ) {

            return entry.refreshPromise;

        }


        const method =
            resolveRefreshMethod(
                entry
            );


        if (!method) {
            return false;
        }


        entry.refreshPromise =
            refreshEntry(
                entry,
                context
            );


        try {

            return await entry
                .refreshPromise;

        } finally {

            entry.refreshPromise =
                null;

        }

    }


    async function refreshEntry(
        entry,
        context
    ) {

        const method =
            resolveRefreshMethod(
                entry
            );


        if (!method) {
            return false;
        }


        const language =
            normalizeLanguage(
                context.language ||
                getCurrentLanguage()
            );


        entry.refreshing =
            true;


        dispatchRegistryEvent(
            EVENTS.LANGUAGE_REFRESHING,
            {

                name:
                    entry.name,

                type:
                    entry.type,

                language

            }
        );


        try {

            await method.call(
                entry.component,
                {

                    ...context,

                    language

                }
            );


            dispatchRegistryEvent(
                EVENTS.LANGUAGE_REFRESHED,
                {

                    name:
                        entry.name,

                    type:
                        entry.type,

                    language

                }
            );


            return true;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            dispatchRegistryEvent(
                EVENTS.LANGUAGE_ERROR,
                {

                    name:
                        entry.name,

                    type:
                        entry.type,

                    language,

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        } finally {

            entry.refreshing =
                false;

        }

    }


    /* ======================================================
       LANGUAGE — ALL ACTIVE COMPONENTS
    ====================================================== */

    async function refreshLanguage(
        context = {},
        options = {}
    ) {

        const language =
            normalizeLanguage(
                context.language ||
                getCurrentLanguage()
            );


        const results =
            new Map();


        for (
            const [
                name,
                entry
            ]
            of components
        ) {

            if (
                !entry.languageAware
            ) {
                continue;
            }


            if (
                !entry.initialized &&
                options.includeUninitialized !==
                true
            ) {
                continue;
            }


            try {

                const refreshed =
                    await refreshOne(
                        name,
                        {

                            ...context,

                            language

                        },
                        options
                    );


                if (
                    refreshed
                ) {

                    results.set(
                        name,
                        true
                    );

                }

            } catch (error) {

                results.set(
                    name,
                    false
                );


                console.error(
                    `ComponentRegistry: gagal memperbarui bahasa komponen "${name}".`,
                    error
                );


                if (
                    options.stopOnError ===
                    true
                ) {

                    throw error;

                }

            }

        }


        return results;

    }


    /* ======================================================
       LANGUAGE EVENT
    ====================================================== */

    function handleLanguageChanged(
        event
    ) {

        refreshLanguage(
            {

                event,

                language:
                    event
                        ?.detail
                        ?.language ||
                    getCurrentLanguage()

            }
        )
            .catch(
                error => {

                    console.error(
                        "ComponentRegistry: refresh bahasa gagal.",
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
       CALL COMPONENT METHOD
    ====================================================== */

    async function call(
        componentName,
        methodName,
        ...args
    ) {

        const normalizedName =
            normalizeComponentName(
                componentName
            );


        const component =
            get(
                normalizedName
            );


        if (!component) {
            return undefined;
        }


        const normalizedMethodName =
            normalizeMethodName(
                methodName
            );


        if (!normalizedMethodName) {
            return undefined;
        }


        const method =
            component[
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
                component,
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
                        normalizedName,

                    component,

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
       STATUS
    ====================================================== */

    function isInitialized(
        name
    ) {

        return Boolean(
            components.get(
                normalizeComponentName(
                    name
                )
            )?.initialized
        );

    }


    function isInitializing(
        name = ""
    ) {

        if (!name) {
            return initializing;
        }


        return Boolean(
            components.get(
                normalizeComponentName(
                    name
                )
            )?.initializing
        );

    }


    function isDestroying(
        name
    ) {

        return Boolean(
            components.get(
                normalizeComponentName(
                    name
                )
            )?.destroying
        );

    }


    function hasInitializedComponents() {

        return initialized;

    }


    function getInitializationResults() {

        const results =
            new Map();


        components.forEach(
            (
                entry,
                name
            ) => {

                if (
                    entry.initialized
                ) {

                    results.set(
                        name,
                        entry.result
                    );

                }

            }
        );


        return results;

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


    /*
     * pagehide digunakan sebagai cleanup ringan.
     *
     * Browser tidak menunggu Promise ketika halaman
     * ditutup, jadi cleanup ini tidak mengandalkan await.
     */
    function handlePageHide(
        event
    ) {

        /*
         * Pada BFCache halaman dapat dipulihkan lagi.
         * Jangan hancurkan komponen bila persisted=true.
         */
        if (
            event?.persisted ===
            true
        ) {
            return;
        }


        components.forEach(
            entry => {

                if (
                    !entry.initialized
                ) {
                    return;
                }


                const method =
                    resolveDestroyMethod(
                        entry
                    );


                if (!method) {
                    return;
                }


                try {

                    const result =
                        method.call(
                            entry.component,
                            {

                                reason:
                                    "pagehide"

                            }
                        );


                    if (
                        result &&
                        typeof result
                            .catch ===
                            "function"
                    ) {

                        result.catch(
                            error => {

                                console.error(
                                    `ComponentRegistry: cleanup komponen "${entry.name}" gagal.`,
                                    error
                                );

                            }
                        );

                    }

                } catch (error) {

                    console.error(
                        `ComponentRegistry: cleanup komponen "${entry.name}" gagal.`,
                        error
                    );

                }

            }
        );

    }


    /* ======================================================
       CLEAR REGISTRY
    ====================================================== */

    async function clear(
        options = {}
    ) {

        /*
         * Komponen yang tercatat initialized dihancurkan
         * lebih dahulu.
         */
        await destroy(
            options
        );


        /*
         * Renderer reusable dapat memiliki registry internal
         * walaupun ComponentRegistry tidak pernah melakukan
         * initOne() terhadap renderer tersebut.
         *
         * Contoh: ProductCard / BrandCard.
         */
        if (
            options.clearRendererRegistries !==
            false
        ) {

            await clearRendererRegistries();

        }


        components.clear();


        unbindLanguageEvent();
        disableLifecycle();


        resetRegistryState();


        dispatchRegistryEvent(
            EVENTS.REGISTRY_CLEARED,
            {}
        );


        return true;

    }


    async function clearRendererRegistries() {

        for (
            const entry
            of components.values()
        ) {

            if (
                entry.type ===
                    TYPES.GLOBAL
            ) {
                continue;
            }


            const component =
                entry.component;


            if (
                !component ||
                typeof component
                    .clearRegistry !==
                    "function"
            ) {
                continue;
            }


            try {

                await component
                    .clearRegistry();

            } catch (error) {

                console.error(
                    `ComponentRegistry: gagal membersihkan registry internal komponen "${entry.name}".`,
                    error
                );

            }

        }

    }


    /* ======================================================
       METHOD RESOLUTION
    ====================================================== */

    function resolveInitMethod(
        entry
    ) {

        if (
            entry.initMethod &&
            typeof entry.component[
                entry.initMethod
            ] ===
            "function"
        ) {

            return entry.component[
                entry.initMethod
            ];

        }


        if (
            typeof entry.component
                ?.init ===
            "function"
        ) {

            return entry.component
                .init;

        }


        if (
            entry.type ===
                TYPES.GLOBAL &&
            typeof entry.component
                ?.render ===
            "function"
        ) {

            return entry.component
                .render;

        }


        if (
            entry.type ===
                TYPES.GLOBAL &&
            typeof entry.component ===
                "function"
        ) {

            return entry.component;

        }


        return null;

    }


    function resolveDestroyMethod(
        entry
    ) {

        if (
            entry.destroyMethod &&
            typeof entry.component[
                entry.destroyMethod
            ] ===
            "function"
        ) {

            return entry.component[
                entry.destroyMethod
            ];

        }


        if (
            typeof entry.component
                ?.destroy ===
            "function"
        ) {

            return entry.component
                .destroy;

        }


        return null;

    }


    function resolveRefreshMethod(
        entry
    ) {

        if (
            entry.refreshMethod &&
            typeof entry.component[
                entry.refreshMethod
            ] ===
            "function"
        ) {

            return entry.component[
                entry.refreshMethod
            ];

        }


        if (
            typeof entry.component
                ?.refreshLanguage ===
            "function"
        ) {

            return entry.component
                .refreshLanguage;

        }


        if (
            typeof entry.component
                ?.refreshAll ===
            "function"
        ) {

            return entry.component
                .refreshAll;

        }


        return null;

    }


    /* ======================================================
       VALIDATION
    ====================================================== */

    function validateComponent(
        component,
        name,
        settings
    ) {

        if (
            !component ||
            (
                typeof component !==
                    "object" &&
                typeof component !==
                    "function"
            )
        ) {

            throw new TypeError(
                `ComponentRegistry: komponen "${name}" harus berupa object atau function.`
            );

        }


        validateExplicitMethod(
            component,
            settings.initMethod,
            name,
            "initMethod"
        );


        validateExplicitMethod(
            component,
            settings.destroyMethod,
            name,
            "destroyMethod"
        );


        validateExplicitMethod(
            component,
            settings.refreshMethod,
            name,
            "refreshMethod"
        );


        if (
            settings.autoInit &&
            settings.type ===
                TYPES.GLOBAL &&
            !settings.initMethod &&
            typeof component.init !==
                "function" &&
            typeof component.render !==
                "function" &&
            typeof component !==
                "function"
        ) {

            throw new TypeError(
                `ComponentRegistry: komponen global "${name}" harus memiliki init() atau render().`
            );

        }

    }


    function validateExplicitMethod(
        component,
        methodName,
        componentName,
        optionName
    ) {

        if (!methodName) {
            return;
        }


        if (
            typeof component[
                methodName
            ] !==
            "function"
        ) {

            throw new TypeError(
                `ComponentRegistry: ${optionName} "${methodName}" tidak tersedia pada komponen "${componentName}".`
            );

        }

    }


    /* ======================================================
       REGISTRATION OPTIONS
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


        const type =
            VALID_TYPES.includes(
                source.type
            )
                ? source.type
                : TYPES.RENDER;


        return {

            type,

            autoInit:
                source.autoInit !==
                undefined
                    ? Boolean(
                        source.autoInit
                    )
                    : type ===
                        TYPES.GLOBAL,

            required:
                Boolean(
                    source.required
                ),

            replace:
                Boolean(
                    source.replace
                ),

            languageAware:
                source.languageAware !==
                false,

            initMethod:
                normalizeMethodName(
                    source.initMethod
                ),

            destroyMethod:
                normalizeMethodName(
                    source.destroyMethod
                ),

            refreshMethod:
                normalizeMethodName(
                    source.refreshMethod
                ),

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
                    "component"
                )
        ) {

            return {

                component:
                    value.component,

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

            component:
                value,

            options: {
                ...shared
            }

        };

    }


    /* ======================================================
       NAME NORMALIZATION
    ====================================================== */

    function normalizeComponentName(
        value
    ) {

        const text =
            String(
                value ||
                ""
            ).trim();


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


    function normalizeNameList(
        value
    ) {

        if (
            !Array.isArray(
                value
            )
        ) {
            return [];
        }


        return [
            ...new Set(
                value
                    .map(
                        normalizeComponentName
                    )
                    .filter(
                        Boolean
                    )
            )
        ];

    }


    /* ======================================================
       ENTRY STATUS HELPERS
    ====================================================== */

    function hasRequiredAutoInitComponents() {

        for (
            const entry
            of components.values()
        ) {

            if (
                entry.autoInit &&
                entry.required
            ) {

                return true;

            }

        }


        return false;

    }


    function areRequiredAutoInitComponentsReady() {

        for (
            const entry
            of components.values()
        ) {

            if (
                !entry.autoInit ||
                !entry.required
            ) {
                continue;
            }


            if (
                !entry.initialized
            ) {

                return false;

            }

        }


        return true;

    }


    function isEntryBusy(
        entry
    ) {

        return Boolean(
            entry?.initializing ||
            entry?.destroying ||
            entry?.refreshing ||
            entry?.initPromise ||
            entry?.destroyPromise ||
            entry?.refreshPromise
        );

    }


    async function waitForEntry(
        entry,
        options = {}
    ) {

        const exclude =
            String(
                options.exclude ||
                ""
            );


        const promises =
            [];


        if (
            exclude !==
                "init" &&
            entry.initPromise
        ) {

            promises.push(
                entry.initPromise
            );

        }


        if (
            exclude !==
                "destroy" &&
            entry.destroyPromise
        ) {

            promises.push(
                entry.destroyPromise
            );

        }


        if (
            exclude !==
                "refresh" &&
            entry.refreshPromise
        ) {

            promises.push(
                entry.refreshPromise
            );

        }


        if (
            promises.length ===
            0
        ) {
            return;
        }


        await Promise.allSettled(
            promises
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
             * Operasi berikutnya tetap boleh berjalan.
             * Error lifecycle lama sudah ditangani oleh
             * lifecycle yang menghasilkan Promise tersebut.
             */

        }

    }


    /* ======================================================
       RESET ENTRY
    ====================================================== */

    function resetEntryRuntimeState(
        entry,
        options = {}
    ) {

        entry.initialized =
            false;

        entry.initializing =
            false;


        if (
            options
                .preserveDestroyState !==
            true
        ) {

            entry.destroying =
                false;

        }


        entry.refreshing =
            false;


        entry.result =
            null;

        entry.error =
            null;


        entry.initPromise =
            null;

        entry.refreshPromise =
            null;


        if (
            options
                .preserveDestroyState !==
            true
        ) {

            entry.destroyPromise =
                null;

        }

    }


    function resetRegistryState() {

        initializing =
            false;

        initialized =
            false;

        initializationPromise =
            null;

    }


    /* ======================================================
       PUBLIC ENTRY SNAPSHOT
    ====================================================== */

    function createPublicEntry(
        entry
    ) {

        return Object.freeze({

            name:
                entry.name,

            component:
                entry.component,

            type:
                entry.type,

            autoInit:
                entry.autoInit,

            required:
                entry.required,

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
            document
                .documentElement
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
                "Terjadi kesalahan pada ComponentRegistry."
            )
        );

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

            types:
                TYPES,

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


            init,
            initOne,


            destroy,
            destroyOne,


            refreshLanguage,
            refreshOne,


            call,


            isInitialized,
            isInitializing,
            isDestroying,

            hasInitialized:
                hasInitializedComponents,

            getInitializationResults,


            enableLifecycle,
            disableLifecycle,


            clear

        });


    return publicAPI;

})();


window.ComponentRegistry =
    ComponentRegistry;