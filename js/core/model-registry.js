"use strict";

/* ==========================================================
   GOMAI MODEL REGISTRY
   js/core/model-registry.js

   Tanggung jawab:
   - Mendaftarkan seluruh model Gomai
   - Menginisialisasi model autoLoad
   - Mencegah load/reload/clear ganda
   - Mengelola required dan optional model
   - Memuat ulang model
   - Membersihkan cache model
   - Menyediakan akses model terpusat
   - Mengirim event lifecycle model

   Kontrak model standar Gomai:

   {
       load(forceReload),
       reload(),
       clearCache(),
       hasLoaded()
   }

   Method dapat diganti melalui registration options:

   {
       loadMethod: "init",
       reloadMethod: "refresh",
       clearMethod: "destroy",
       statusMethod: "isReady"
   }
========================================================== */

const ModelRegistry = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       EVENTS
    ====================================================== */

    const EVENTS =
        Object.freeze({

            REGISTERED:
                "gomai:model-registered",

            UNREGISTERED:
                "gomai:model-unregistered",

            LOADING:
                "gomai:model-loading",

            LOADED:
                "gomai:model-loaded",

            LOAD_SKIPPED:
                "gomai:model-load-skipped",

            LOAD_ERROR:
                "gomai:model-error",

            RELOADING:
                "gomai:model-reloading",

            RELOADED:
                "gomai:model-reloaded",

            RELOAD_ERROR:
                "gomai:model-reload-error",

            CLEARING:
                "gomai:model-clearing",

            CLEARED:
                "gomai:model-cleared",

            CLEAR_ERROR:
                "gomai:model-clear-error",

            CALL_ERROR:
                "gomai:model-call-error",

            ALL_INITIALIZING:
                "gomai:models-initializing",

            ALL_INITIALIZED:
                "gomai:models-initialized",

            ALL_INIT_ERROR:
                "gomai:models-error",

            ALL_RELOADING:
                "gomai:models-reloading",

            ALL_RELOADED:
                "gomai:models-reloaded",

            ALL_CLEARING:
                "gomai:models-clearing",

            ALL_CLEARED:
                "gomai:models-cleared",

            REGISTRY_DESTROYED:
                "gomai:model-registry-destroyed"

        });


    /* ======================================================
       REGISTRY STATE
    ====================================================== */

    const models =
        new Map();


    let initializing =
        false;


    let initialized =
        false;


    let initializationPromise =
        null;


    /* ======================================================
       REGISTER
    ====================================================== */

    function register(
        name,
        model,
        options = {}
    ) {

        const normalizedName =
            normalizeModelName(
                name
            );


        if (!normalizedName) {

            throw new Error(
                "ModelRegistry.register(): nama model tidak valid."
            );

        }


        const settings =
            normalizeRegistrationOptions(
                options
            );


        validateModel(
            model,
            normalizedName,
            settings
        );


        if (
            models.has(
                normalizedName
            ) &&
            !settings.replace
        ) {

            console.warn(
                `ModelRegistry: model "${normalizedName}" sudah terdaftar.`
            );


            return false;

        }


        const previousEntry =
            models.get(
                normalizedName
            );


        if (
            previousEntry &&
            settings.replace &&
            isEntryBusy(
                previousEntry
            )
        ) {

            console.warn(
                `ModelRegistry: model "${normalizedName}" diganti ketika masih memiliki proses aktif.`
            );

        }


        const entry = {

            name:
                normalizedName,

            model,

            required:
                settings.required,

            autoLoad:
                settings.autoLoad,

            loadMethod:
                settings.loadMethod,

            reloadMethod:
                settings.reloadMethod,

            clearMethod:
                settings.clearMethod,

            statusMethod:
                settings.statusMethod,

            loadOptions:
                clonePlainObject(
                    settings.loadOptions
                ),


            loaded:
                false,

            loading:
                false,

            reloading:
                false,

            clearing:
                false,


            result:
                null,

            error:
                null,


            loadPromise:
                null,

            reloadPromise:
                null,

            clearPromise:
                null

        };


        models.set(
            normalizedName,
            entry
        );


        /*
         * Registrasi baru setelah registry pernah
         * diinisialisasi berarti snapshot initialized
         * sebelumnya tidak lagi mewakili semua model.
         */
        if (
            initialized &&
            entry.autoLoad
        ) {

            initialized =
                false;

        }


        dispatchRegistryEvent(
            EVENTS.REGISTERED,
            {

                name:
                    normalizedName,

                model,

                required:
                    entry.required,

                autoLoad:
                    entry.autoLoad

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

        const registered =
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
                            registration.model,
                            registration.options
                        )
                    ) {

                        registered.push(
                            normalizeModelName(
                                name
                            )
                        );

                    }

                }
            );


            return registered;

        }


        if (
            !isPlainObject(
                entries
            )
        ) {

            throw new TypeError(
                "ModelRegistry.registerMany(): entries harus berupa object atau Map."
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
                            registration.model,
                            registration.options
                        )
                    ) {

                        registered.push(
                            normalizeModelName(
                                name
                            )
                        );

                    }

                }
            );


        return registered;

    }


    /* ======================================================
       UNREGISTER
    ====================================================== */

    async function unregister(
        name,
        options = {}
    ) {

        const normalizedName =
            normalizeModelName(
                name
            );


        const entry =
            models.get(
                normalizedName
            );


        if (!entry) {
            return false;
        }


        if (
            isEntryBusy(
                entry
            ) &&
            options.force !==
                true
        ) {

            await waitForEntry(
                entry
            );

        }


        if (
            options.clearCache !==
            false
        ) {

            await clearOne(
                normalizedName,
                {

                    suppressMissing:
                        true,

                    force:
                        options.force,

                    context: {

                        reason:
                            "unregister"

                    }

                }
            );

        }


        models.delete(
            normalizedName
        );


        initialized =
            false;


        dispatchRegistryEvent(
            EVENTS.UNREGISTERED,
            {

                name:
                    normalizedName,

                model:
                    entry.model

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
            models.get(
                normalizeModelName(
                    name
                )
            )?.model ||
            null
        );

    }


    function getEntry(
        name
    ) {

        const entry =
            models.get(
                normalizeModelName(
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


        models.forEach(
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
            models.keys()
        );

    }


    function has(
        name
    ) {

        return models.has(
            normalizeModelName(
                name
            )
        );

    }


    function count() {

        return models.size;

    }


    /* ======================================================
       INITIALIZE ALL MODELS
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
                    models.size

            }
        );


        try {

            for (
                const [
                    name,
                    entry
                ]
                of models
            ) {

                if (
                    !entry.autoLoad
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
                            .modelOptions
                            ?.[name]
                    )
                        ? options
                            .modelOptions[
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
                                        .loadOptions,

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
                        `ModelRegistry: model opsional "${name}" gagal dimuat.`,
                        error
                    );

                }

            }


            initialized =
                true;


            dispatchRegistryEvent(
                EVENTS.ALL_INITIALIZED,
                {

                    loaded:
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


            dispatchRegistryEvent(
                EVENTS.ALL_INIT_ERROR,
                {
                    error
                }
            );


            throw error;

        } finally {

            initializing =
                false;

        }

    }


    /* ======================================================
       INITIALIZE ONE MODEL
    ====================================================== */

    async function initOne(
        name,
        options = {}
    ) {

        const normalizedName =
            normalizeModelName(
                name
            );


        const entry =
            models.get(
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
                `ModelRegistry: model "${normalizedName}" belum terdaftar.`
            );

        }


        if (
            isEntryLoaded(
                entry
            ) &&
            options.force !==
                true
        ) {

            entry.loaded =
                true;


            /*
             * Bila model sudah dimuat di luar registry,
             * result mungkin belum tersimpan.
             */
            if (
                entry.result ===
                null
            ) {

                entry.result =
                    await resolveExistingResult(
                        entry
                    );

            }


            return entry.result;

        }


        if (
            entry.loading &&
            entry.loadPromise
        ) {

            return entry.loadPromise;

        }


        /*
         * Clear atau reload yang sedang berlangsung harus
         * selesai dahulu sebelum load baru dimulai.
         */
        await waitForEntry(
            entry,
            {
                exclude:
                    "load"
            }
        );


        entry.loadPromise =
            loadEntry(
                entry,
                options
            );


        try {

            return await entry.loadPromise;

        } finally {

            entry.loadPromise =
                null;

        }

    }


    async function loadEntry(
        entry,
        options
    ) {

        const method =
            resolveLoadMethod(
                entry
            );


        if (!method) {

            entry.loaded =
                true;

            entry.result =
                entry.model;

            entry.error =
                null;


            dispatchRegistryEvent(
                EVENTS.LOAD_SKIPPED,
                {

                    name:
                        entry.name,

                    model:
                        entry.model,

                    reason:
                        "no-load-method"

                }
            );


            return entry.result;

        }


        entry.loading =
            true;

        entry.error =
            null;


        dispatchRegistryEvent(
            EVENTS.LOADING,
            {

                name:
                    entry.name,

                model:
                    entry.model,

                force:
                    options.force ===
                    true

            }
        );


        try {

            const loadOptions =
                isPlainObject(
                    options.options
                )
                    ? options.options
                    : {};


            /*
             * BrandsModel dan ProductsModel menggunakan:
             *
             * load(forceReload)
             *
             * Object kedua disediakan untuk model lain
             * tanpa merusak kontrak model saat ini.
             */
            const result =
                await method.call(
                    entry.model,
                    options.force ===
                        true,
                    loadOptions
                );


            entry.result =
                result;

            entry.loaded =
                true;

            entry.error =
                null;


            dispatchRegistryEvent(
                EVENTS.LOADED,
                {

                    name:
                        entry.name,

                    model:
                        entry.model,

                    result

                }
            );


            return result;

        } catch (error) {

            entry.result =
                null;

            entry.loaded =
                false;

            entry.error =
                normalizeError(
                    error
                );


            dispatchRegistryEvent(
                EVENTS.LOAD_ERROR,
                {

                    name:
                        entry.name,

                    model:
                        entry.model,

                    error:
                        entry.error

                }
            );


            throw entry.error;

        } finally {

            entry.loading =
                false;

        }

    }


    /* ======================================================
       RELOAD ALL
    ====================================================== */

    async function reload(
        options = {}
    ) {

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
            EVENTS.ALL_RELOADING,
            {}
        );


        for (
            const [
                name,
                entry
            ]
            of models
        ) {

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
                        .modelOptions
                        ?.[name]
                )
                    ? options
                        .modelOptions[
                            name
                        ]
                    : {};


            try {

                const result =
                    await reloadOne(
                        name,
                        {

                            options: {

                                ...entry
                                    .loadOptions,

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
                    options.stopOnError ===
                    true
                ) {

                    throw error;

                }


                console.error(
                    `ModelRegistry: gagal memuat ulang model "${name}".`,
                    error
                );

            }

        }


        /*
         * Reload menghasilkan cache valid kembali.
         */
        initialized =
            areRequiredAutoLoadModelsReady();


        dispatchRegistryEvent(
            EVENTS.ALL_RELOADED,
            {

                models:
                    Array.from(
                        results.keys()
                    ),

                results

            }
        );


        return results;

    }


    /* ======================================================
       RELOAD ONE
    ====================================================== */

    async function reloadOne(
        name,
        options = {}
    ) {

        const normalizedName =
            normalizeModelName(
                name
            );


        const entry =
            models.get(
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
                `ModelRegistry: model "${normalizedName}" belum terdaftar.`
            );

        }


        if (
            entry.reloading &&
            entry.reloadPromise
        ) {

            return entry.reloadPromise;

        }


        await waitForEntry(
            entry,
            {
                exclude:
                    "reload"
            }
        );


        entry.reloadPromise =
            reloadEntry(
                entry,
                options
            );


        try {

            return await entry
                .reloadPromise;

        } finally {

            entry.reloadPromise =
                null;

        }

    }


    async function reloadEntry(
        entry,
        options
    ) {

        entry.reloading =
            true;

        entry.error =
            null;


        dispatchRegistryEvent(
            EVENTS.RELOADING,
            {

                name:
                    entry.name,

                model:
                    entry.model

            }
        );


        try {

            const reloadMethod =
                resolveReloadMethod(
                    entry
                );


            const customOptions =
                isPlainObject(
                    options.options
                )
                    ? options.options
                    : {};


            let result;


            if (
                reloadMethod
            ) {

                result =
                    await reloadMethod.call(
                        entry.model,
                        customOptions
                    );

            } else {

                const loadMethod =
                    resolveLoadMethod(
                        entry
                    );


                if (
                    loadMethod
                ) {

                    result =
                        await loadMethod.call(
                            entry.model,
                            true,
                            customOptions
                        );

                } else {

                    result =
                        entry.model;

                }

            }


            entry.result =
                result;

            entry.loaded =
                true;

            entry.error =
                null;


            dispatchRegistryEvent(
                EVENTS.RELOADED,
                {

                    name:
                        entry.name,

                    model:
                        entry.model,

                    result

                }
            );


            return result;

        } catch (error) {

            entry.result =
                null;

            entry.loaded =
                false;

            entry.error =
                normalizeError(
                    error
                );


            dispatchRegistryEvent(
                EVENTS.RELOAD_ERROR,
                {

                    name:
                        entry.name,

                    model:
                        entry.model,

                    error:
                        entry.error

                }
            );


            throw entry.error;

        } finally {

            entry.reloading =
                false;

        }

    }


    /* ======================================================
       CLEAR ALL MODEL CACHE
    ====================================================== */

    async function clear(
        options = {}
    ) {

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
            EVENTS.ALL_CLEARING,
            {}
        );


        for (
            const [name]
            of models
        ) {

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


            try {

                const result =
                    await clearOne(
                        name,
                        {

                            force:
                                options.force ===
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
                    `ModelRegistry: gagal membersihkan model "${name}".`,
                    error
                );

            }

        }


        initialized =
            false;

        initializing =
            false;

        initializationPromise =
            null;


        dispatchRegistryEvent(
            EVENTS.ALL_CLEARED,
            {

                models:
                    Array.from(
                        results.keys()
                    ),

                results

            }
        );


        return results;

    }


    /* ======================================================
       CLEAR ONE MODEL
    ====================================================== */

    async function clearOne(
        name,
        options = {}
    ) {

        const normalizedName =
            normalizeModelName(
                name
            );


        const entry =
            models.get(
                normalizedName
            );


        if (!entry) {

            if (
                options.suppressMissing ===
                true
            ) {
                return false;
            }


            throw new Error(
                `ModelRegistry: model "${normalizedName}" belum terdaftar.`
            );

        }


        if (
            entry.clearing &&
            entry.clearPromise
        ) {

            return entry.clearPromise;

        }


        /*
         * Jangan membersihkan model ketika fetch/reload
         * lama masih dapat menulis cache setelah clear.
         */
        await waitForEntry(
            entry,
            {
                exclude:
                    "clear"
            }
        );


        entry.clearPromise =
            clearEntry(
                entry,
                options
            );


        try {

            return await entry
                .clearPromise;

        } finally {

            entry.clearPromise =
                null;

        }

    }


    async function clearEntry(
        entry,
        options
    ) {

        entry.clearing =
            true;


        dispatchRegistryEvent(
            EVENTS.CLEARING,
            {

                name:
                    entry.name,

                model:
                    entry.model,

                context:
                    options.context ||
                    {}

            }
        );


        try {

            const method =
                resolveClearMethod(
                    entry
                );


            if (
                method
            ) {

                await method.call(
                    entry.model,
                    options.context ||
                    {}
                );

            }


            resetEntryRuntimeState(
                entry,
                {
                    preserveClearState:
                        true
                }
            );


            initialized =
                false;


            dispatchRegistryEvent(
                EVENTS.CLEARED,
                {

                    name:
                        entry.name,

                    model:
                        entry.model

                }
            );


            return true;

        } catch (error) {

            entry.error =
                normalizeError(
                    error
                );


            dispatchRegistryEvent(
                EVENTS.CLEAR_ERROR,
                {

                    name:
                        entry.name,

                    model:
                        entry.model,

                    error:
                        entry.error

                }
            );


            throw entry.error;

        } finally {

            entry.clearing =
                false;

        }

    }


    /* ======================================================
       DESTROY REGISTRY
    ====================================================== */

    async function destroy(
        options = {}
    ) {

        await clear({
            ...options,

            stopOnError:
                options.stopOnError ===
                true
        });


        models.clear();


        resetRegistryState();


        dispatchRegistryEvent(
            EVENTS.REGISTRY_DESTROYED,
            {}
        );


        return true;

    }


    /* ======================================================
       STATUS
    ====================================================== */

    function isLoaded(
        name
    ) {

        const entry =
            models.get(
                normalizeModelName(
                    name
                )
            );


        return entry
            ? isEntryLoaded(
                entry
            )
            : false;

    }


    function isLoading(
        name
    ) {

        return Boolean(
            models.get(
                normalizeModelName(
                    name
                )
            )?.loading
        );

    }


    function hasInitializedModels() {

        return initialized;

    }


    function getInitializationResults() {

        const results =
            new Map();


        models.forEach(
            (
                entry,
                name
            ) => {

                if (
                    isEntryLoaded(
                        entry
                    )
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
       CALL MODEL METHOD
    ====================================================== */

    async function call(
        modelName,
        methodName,
        ...args
    ) {

        const normalizedName =
            normalizeModelName(
                modelName
            );


        const model =
            get(
                normalizedName
            );


        if (!model) {
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
            model[
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
                model,
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

                    model,

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
       METHOD RESOLUTION
    ====================================================== */

    function resolveLoadMethod(
        entry
    ) {

        if (
            entry.loadMethod &&
            typeof entry.model[
                entry.loadMethod
            ] ===
            "function"
        ) {

            return entry.model[
                entry.loadMethod
            ];

        }


        if (
            typeof entry.model.load ===
            "function"
        ) {

            return entry.model.load;

        }


        if (
            typeof entry.model.init ===
            "function"
        ) {

            return entry.model.init;

        }


        return null;

    }


    function resolveReloadMethod(
        entry
    ) {

        if (
            entry.reloadMethod &&
            typeof entry.model[
                entry.reloadMethod
            ] ===
            "function"
        ) {

            return entry.model[
                entry.reloadMethod
            ];

        }


        if (
            typeof entry.model.reload ===
            "function"
        ) {

            return entry.model.reload;

        }


        return null;

    }


    function resolveClearMethod(
        entry
    ) {

        if (
            entry.clearMethod &&
            typeof entry.model[
                entry.clearMethod
            ] ===
            "function"
        ) {

            return entry.model[
                entry.clearMethod
            ];

        }


        if (
            typeof entry.model
                .clearCache ===
            "function"
        ) {

            return entry.model
                .clearCache;

        }


        if (
            typeof entry.model
                .destroy ===
            "function"
        ) {

            return entry.model
                .destroy;

        }


        return null;

    }


    function resolveStatusMethod(
        entry
    ) {

        if (
            entry.statusMethod &&
            typeof entry.model[
                entry.statusMethod
            ] ===
            "function"
        ) {

            return entry.model[
                entry.statusMethod
            ];

        }


        if (
            typeof entry.model
                .hasLoaded ===
            "function"
        ) {

            return entry.model
                .hasLoaded;

        }


        return null;

    }


    /* ======================================================
       EXISTING MODEL RESULT

       Dipakai ketika model ternyata telah dimuat sebelum
       ModelRegistry.init() dijalankan.
    ====================================================== */

    async function resolveExistingResult(
        entry
    ) {

        if (
            entry.result !==
            null
        ) {
            return entry.result;
        }


        if (
            typeof entry.model.getAll ===
            "function"
        ) {

            try {

                return await entry.model
                    .getAll();

            } catch (_error) {
                /*
                 * Status model sudah mengatakan loaded.
                 * Bila getAll() tidak cocok untuk model
                 * tertentu, fallback ke object model.
                 */
            }

        }


        return entry.model;

    }


    /* ======================================================
       ENTRY SYNCHRONIZATION
    ====================================================== */

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
                "load" &&
            entry.loadPromise
        ) {

            promises.push(
                entry.loadPromise
            );

        }


        if (
            exclude !==
                "reload" &&
            entry.reloadPromise
        ) {

            promises.push(
                entry.reloadPromise
            );

        }


        if (
            exclude !==
                "clear" &&
            entry.clearPromise
        ) {

            promises.push(
                entry.clearPromise
            );

        }


        if (
            promises.length ===
            0
        ) {
            return;
        }


        const settlements =
            await Promise.allSettled(
                promises
            );


        /*
         * Error operasi sebelumnya tidak menghalangi
         * operasi baru. State error tetap tersimpan
         * di entry untuk inspeksi.
         */
        settlements.forEach(
            result => {

                if (
                    result.status ===
                    "rejected"
                ) {

                    entry.error =
                        normalizeError(
                            result.reason
                        );

                }

            }
        );

    }


    function isEntryBusy(
        entry
    ) {

        return Boolean(
            entry?.loading ||
            entry?.reloading ||
            entry?.clearing ||
            entry?.loadPromise ||
            entry?.reloadPromise ||
            entry?.clearPromise
        );

    }


    /* ======================================================
       MODEL STATUS
    ====================================================== */

    function isEntryLoaded(
        entry
    ) {

        const method =
            resolveStatusMethod(
                entry
            );


        if (
            method
        ) {

            try {

                return Boolean(
                    method.call(
                        entry.model
                    )
                );

            } catch (error) {

                console.warn(
                    `ModelRegistry: gagal membaca status model "${entry.name}".`,
                    error
                );

            }

        }


        return Boolean(
            entry.loaded
        );

    }


    function areRequiredAutoLoadModelsReady() {

        for (
            const entry
            of models.values()
        ) {

            if (
                !entry.autoLoad ||
                !entry.required
            ) {
                continue;
            }


            if (
                !isEntryLoaded(
                    entry
                )
            ) {

                return false;

            }

        }


        return true;

    }


    /* ======================================================
       RUNTIME STATE RESET
    ====================================================== */

    function resetEntryRuntimeState(
        entry,
        options = {}
    ) {

        entry.loaded =
            false;

        entry.loading =
            false;

        entry.reloading =
            false;


        if (
            options
                .preserveClearState !==
            true
        ) {

            entry.clearing =
                false;

        }


        entry.result =
            null;

        entry.error =
            null;

        entry.loadPromise =
            null;

        entry.reloadPromise =
            null;


        if (
            options
                .preserveClearState !==
            true
        ) {

            entry.clearPromise =
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
       VALIDATION
    ====================================================== */

    function validateModel(
        model,
        name,
        settings
    ) {

        if (
            !model ||
            typeof model !==
            "object"
        ) {

            throw new TypeError(
                `ModelRegistry: model "${name}" harus berupa object.`
            );

        }


        validateExplicitMethod(
            model,
            settings.loadMethod,
            name,
            "loadMethod"
        );


        validateExplicitMethod(
            model,
            settings.reloadMethod,
            name,
            "reloadMethod"
        );


        validateExplicitMethod(
            model,
            settings.clearMethod,
            name,
            "clearMethod"
        );


        validateExplicitMethod(
            model,
            settings.statusMethod,
            name,
            "statusMethod"
        );


        if (
            settings.autoLoad &&
            !settings.loadMethod &&
            typeof model.load !==
                "function" &&
            typeof model.init !==
                "function"
        ) {

            console.warn(
                `ModelRegistry: model autoLoad "${name}" tidak memiliki load() atau init(). Model akan dianggap siap tanpa proses load.`
            );

        }

    }


    function validateExplicitMethod(
        model,
        methodName,
        modelName,
        optionName
    ) {

        if (!methodName) {
            return;
        }


        if (
            typeof model[
                methodName
            ] !==
            "function"
        ) {

            throw new TypeError(
                `ModelRegistry: ${optionName} "${methodName}" tidak tersedia pada model "${modelName}".`
            );

        }

    }


    /* ======================================================
       REGISTRATION OPTION NORMALIZATION
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

            required:
                source.required !==
                false,

            autoLoad:
                source.autoLoad !==
                false,

            replace:
                source.replace ===
                true,

            loadMethod:
                normalizeMethodName(
                    source.loadMethod
                ),

            reloadMethod:
                normalizeMethodName(
                    source.reloadMethod
                ),

            clearMethod:
                normalizeMethodName(
                    source.clearMethod
                ),

            statusMethod:
                normalizeMethodName(
                    source.statusMethod
                ),

            loadOptions:
                clonePlainObject(
                    source.loadOptions
                )

        };

    }


    function normalizeManyEntry(
        value,
        sharedOptions
    ) {

        if (
            isPlainObject(
                value
            ) &&
            Object.prototype
                .hasOwnProperty
                .call(
                    value,
                    "model"
                )
        ) {

            return {

                model:
                    value.model,

                options: {

                    ...(
                        isPlainObject(
                            sharedOptions
                        )
                            ? sharedOptions
                            : {}
                    ),

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

            model:
                value,

            options:
                isPlainObject(
                    sharedOptions
                )
                    ? {
                        ...sharedOptions
                    }
                    : {}

        };

    }


    /* ======================================================
       NAME NORMALIZATION
    ====================================================== */

    function normalizeModelName(
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
                        normalizeModelName
                    )
                    .filter(
                        Boolean
                    )
            )
        ];

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

            model:
                entry.model,

            required:
                entry.required,

            autoLoad:
                entry.autoLoad,

            loaded:
                isEntryLoaded(
                    entry
                ),

            loading:
                entry.loading,

            reloading:
                entry.reloading,

            clearing:
                entry.clearing,

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

        return isPlainObject(
            value
        )
            ? {
                ...value
            }
            : {};

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
                "Terjadi kesalahan pada ModelRegistry."
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


            reload,
            reloadOne,


            clear,
            clearOne,


            destroy,


            isLoaded,
            isLoading,

            hasInitialized:
                hasInitializedModels,


            call,


            getInitializationResults

        });


    return publicAPI;

})();


window.ModelRegistry =
    ModelRegistry;