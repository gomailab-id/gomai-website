"use strict";

/* ==========================================================
   GOMAI UTILITIES
   js/core/utils.js

   Tanggung jawab:
   - Resolusi path project
   - Route dan query parameter
   - Pembacaan data JSON
   - Penyimpanan local/session storage
   - Format harga dan angka
   - Sanitasi teks untuk HTML
   - Helper bahasa
   - Helper data umum
   - Debounce / throttle

   Prinsip:
   - Tidak menyimpan state bisnis aplikasi
   - Tidak melakukan bootstrap aplikasi
   - Tidak bergantung pada Language atau Model
   - Aman dipakai dari root maupun folder /pages/
   - Kompatibel dengan Mandarin-first Gomai
========================================================== */

const GomaiUtils = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       BASIC HELPERS
    ====================================================== */

    function getConfig() {
        return (
            window.GomaiConfig ||
            {}
        );
    }


    function isPlainObject(value) {
        return Boolean(
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }


    function normalizeText(value) {
        return String(
            value ?? ""
        ).trim();
    }


    function normalizeIdentifier(value) {
        return normalizeText(value)
            .toLowerCase()
            .replace(/\s+/g, "-");
    }


    function cloneData(value) {
        if (
            value === null ||
            value === undefined ||
            typeof value !== "object"
        ) {
            return value;
        }

        if (
            typeof structuredClone ===
            "function"
        ) {
            return structuredClone(value);
        }

        return JSON.parse(
            JSON.stringify(value)
        );
    }


    function clamp(
        value,
        minimum,
        maximum
    ) {
        const number =
            Number(value);

        const min =
            Number(minimum);

        const max =
            Number(maximum);

        if (
            !Number.isFinite(number) ||
            !Number.isFinite(min) ||
            !Number.isFinite(max)
        ) {
            return number;
        }

        return Math.min(
            Math.max(
                number,
                min
            ),
            max
        );
    }


    /* ======================================================
       PAGE / PATH DETECTION
    ====================================================== */

    function isInsidePagesDirectory() {
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

        return (
            pathname.includes(
                "/pages/"
            ) ||
            pathname.startsWith(
                "pages/"
            )
        );
    }


    function getBasePath() {
        return isInsidePagesDirectory()
            ? "../"
            : "";
    }


    function isExternalOrAbsolutePath(path) {
        return /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i
            .test(path);
    }


    function resolveProjectPath(path) {
        const value =
            normalizeText(path);

        if (!value) {
            return "";
        }

        if (
            isExternalOrAbsolutePath(
                value
            ) ||
            value.startsWith("../")
        ) {
            return value;
        }

        const normalized =
            value.replace(
                /^\.\//,
                ""
            );

        if (
            !isInsidePagesDirectory()
        ) {
            return normalized;
        }

        /*
         * pages/brand.html dari halaman yang
         * sudah berada di /pages/ cukup menjadi
         * brand.html.
         */
        if (
            normalized.startsWith(
                "pages/"
            )
        ) {
            return normalized.slice(
                "pages/".length
            );
        }

        /*
         * File root, data, dan asset membutuhkan
         * ../ saat dipanggil dari /pages/.
         */
        return `../${normalized}`;
    }


    function resolveAssetPath(path) {
        return resolveProjectPath(
            path
        );
    }


    /* ======================================================
       CONFIG PATHS
    ====================================================== */

    function getDataPath(key) {
        const normalizedKey =
            normalizeText(key);

        if (!normalizedKey) {
            return "";
        }

        const config =
            getConfig();

        let configuredPath =
            config.data?.[
                normalizedKey
            ];

        /*
         * Dukungan struktur data.languages
         * selain key langsung languageZh
         * dan languageId.
         */
        if (
            typeof configuredPath !==
            "string"
        ) {
            if (
                normalizedKey ===
                "languageZh"
            ) {
                configuredPath =
                    config.data
                        ?.languages
                        ?.zh;
            } else if (
                normalizedKey ===
                "languageId"
            ) {
                configuredPath =
                    config.data
                        ?.languages
                        ?.id;
            }
        }

        if (
            typeof configuredPath !==
                "string" ||
            !configuredPath.trim()
        ) {
            const fallbackPaths = {

                brands:
                    "data/brands.json",

                products:
                    "data/products.json",

                languageZh:
                    "data/zh.json",

                languageId:
                    "data/id.json"

            };

            configuredPath =
                fallbackPaths[
                    normalizedKey
                ] ||
                "";
        }

        return resolveProjectPath(
            configuredPath
        );
    }


    function getRoute(routeName) {
        const name =
            normalizeText(
                routeName
            );

        if (!name) {
            return "";
        }

        const configuredRoute =
            getConfig()
                .routes?.[name];

        if (
            typeof configuredRoute !==
                "string" ||
            !configuredRoute.trim()
        ) {
            return "";
        }

        return resolveProjectPath(
            configuredRoute
        );
    }


    /* ======================================================
       ROUTING
    ====================================================== */

    function appendQueryParameters(
        url,
        parameters = {}
    ) {
        const value =
            normalizeText(url);

        if (!value) {
            return "";
        }

        if (
            !isPlainObject(
                parameters
            )
        ) {
            return value;
        }

        /*
         * Hash dipisahkan supaya query selalu
         * ditempatkan sebelum #fragment.
         */
        const hashIndex =
            value.indexOf("#");

        const hash =
            hashIndex >= 0
                ? value.slice(
                    hashIndex
                )
                : "";

        const withoutHash =
            hashIndex >= 0
                ? value.slice(
                    0,
                    hashIndex
                )
                : value;

        const queryIndex =
            withoutHash.indexOf("?");

        const pathname =
            queryIndex >= 0
                ? withoutHash.slice(
                    0,
                    queryIndex
                )
                : withoutHash;

        const existingQuery =
            queryIndex >= 0
                ? withoutHash.slice(
                    queryIndex + 1
                )
                : "";

        const searchParams =
            new URLSearchParams(
                existingQuery
            );

        Object.entries(
            parameters
        ).forEach(
            ([
                key,
                rawValue
            ]) => {

                const normalizedKey =
                    normalizeText(key);

                if (!normalizedKey) {
                    return;
                }

                /*
                 * Parameter dengan key yang sama
                 * diganti agar URL tidak memiliki
                 * value lama dan baru sekaligus.
                 */
                searchParams.delete(
                    normalizedKey
                );

                if (
                    rawValue === null ||
                    rawValue === undefined ||
                    rawValue === ""
                ) {
                    return;
                }

                const values =
                    Array.isArray(
                        rawValue
                    )
                        ? rawValue
                        : [rawValue];

                values.forEach(
                    item => {

                        if (
                            item === null ||
                            item === undefined ||
                            item === ""
                        ) {
                            return;
                        }

                        searchParams.append(
                            normalizedKey,
                            String(item)
                        );

                    }
                );

            }
        );

        const queryString =
            searchParams.toString();

        return (
            pathname +
            (
                queryString
                    ? `?${queryString}`
                    : ""
            ) +
            hash
        );
    }


    function buildRoute(
        routeName,
        parameters = {}
    ) {
        const route =
            getRoute(
                routeName
            );

        if (!route) {
            return "";
        }

        return appendQueryParameters(
            route,
            parameters
        );
    }


    function getQueryParameter(
        key,
        search =
            window.location
                ?.search ||
            ""
    ) {
        const normalizedKey =
            normalizeText(key);

        if (!normalizedKey) {
            return "";
        }

        try {
            return (
                new URLSearchParams(
                    String(
                        search ||
                        ""
                    )
                )
                    .get(
                        normalizedKey
                    ) ||
                ""
            );
        } catch (error) {
            console.warn(
                "GomaiUtils: gagal membaca query parameter.",
                error
            );

            return "";
        }
    }


    function getQueryParameters(
        search =
            window.location
                ?.search ||
            ""
    ) {
        const result = {};

        try {
            const searchParams =
                new URLSearchParams(
                    String(
                        search ||
                        ""
                    )
                );

            for (
                const [
                    key,
                    value
                ]
                of searchParams.entries()
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
                        result[key];

                    result[key] =
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
                    result[key] =
                        value;
                }
            }
        } catch (error) {
            console.warn(
                "GomaiUtils: gagal membaca query string.",
                error
            );
        }

        return result;
    }


    /* ======================================================
       FETCH JSON
    ====================================================== */

    async function fetchJSON(
        path,
        options = {}
    ) {
        const rawPath =
            normalizeText(path);

        if (!rawPath) {
            throw new Error(
                "GomaiUtils.fetchJSON(): path tidak boleh kosong."
            );
        }

        /*
         * Path yang sudah berupa ../ tidak akan
         * diberi prefix lagi oleh resolveProjectPath().
         */
        const url =
            resolveProjectPath(
                rawPath
            );

        const requestOptions =
            isPlainObject(options)
                ? options
                : {};

        const headers =
            new Headers(
                requestOptions.headers ||
                {}
            );

        if (
            !headers.has(
                "Accept"
            )
        ) {
            headers.set(
                "Accept",
                "application/json"
            );
        }

        let response;

        try {
            response =
                await fetch(
                    url,
                    {
                        method:
                            "GET",

                        credentials:
                            "same-origin",

                        cache:
                            "no-cache",

                        ...requestOptions,

                        headers
                    }
                );
        } catch (error) {
            throw new Error(
                `Gagal mengakses data JSON: ${url}`,
                {
                    cause:
                        error
                }
            );
        }

        if (!response.ok) {
            throw new Error(
                `Gagal memuat data JSON (${response.status} ${response.statusText}): ${url}`
            );
        }

        try {
            return await response
                .json();
        } catch (error) {
            throw new Error(
                `Data JSON tidak valid: ${url}`,
                {
                    cause:
                        error
                }
            );
        }
    }


    /* ======================================================
       STORAGE
    ====================================================== */

    function serializeStorageValue(
        value
    ) {
        return JSON.stringify(
            value
        );
    }


    function deserializeStorageValue(
        value,
        fallback = null
    ) {
        if (value === null) {
            return fallback;
        }

        /*
         * Data lama yang mungkin disimpan sebagai
         * raw string tetap dapat dibaca.
         *
         * Contoh:
         * zh
         *
         * dan format baru:
         * "zh"
         *
         * keduanya menghasilkan "zh".
         */
        try {
            return JSON.parse(
                value
            );
        } catch (_error) {
            return value;
        }
    }


    function getLocalStorage() {
        try {
            return window.localStorage;
        } catch (_error) {
            return null;
        }
    }


    function getSessionStorage() {
        try {
            return window.sessionStorage;
        } catch (_error) {
            return null;
        }
    }


    function saveStorageData(
        storage,
        key,
        value
    ) {
        const normalizedKey =
            normalizeText(key);

        if (
            !storage ||
            !normalizedKey
        ) {
            return false;
        }

        try {
            storage.setItem(
                normalizedKey,
                serializeStorageValue(
                    value
                )
            );

            return true;
        } catch (error) {
            console.warn(
                `GomaiUtils: gagal menyimpan "${normalizedKey}".`,
                error
            );

            return false;
        }
    }


    function readStorageData(
        storage,
        key,
        fallback = null
    ) {
        const normalizedKey =
            normalizeText(key);

        if (
            !storage ||
            !normalizedKey
        ) {
            return fallback;
        }

        try {
            return deserializeStorageValue(
                storage.getItem(
                    normalizedKey
                ),
                fallback
            );
        } catch (error) {
            console.warn(
                `GomaiUtils: gagal membaca "${normalizedKey}".`,
                error
            );

            return fallback;
        }
    }


    function removeStorageData(
        storage,
        key
    ) {
        const normalizedKey =
            normalizeText(key);

        if (
            !storage ||
            !normalizedKey
        ) {
            return false;
        }

        try {
            storage.removeItem(
                normalizedKey
            );

            return true;
        } catch (error) {
            console.warn(
                `GomaiUtils: gagal menghapus "${normalizedKey}".`,
                error
            );

            return false;
        }
    }


    function saveLocalData(
        key,
        value
    ) {
        return saveStorageData(
            getLocalStorage(),
            key,
            value
        );
    }


    function readLocalData(
        key,
        fallback = null
    ) {
        return readStorageData(
            getLocalStorage(),
            key,
            fallback
        );
    }


    function removeLocalData(key) {
        return removeStorageData(
            getLocalStorage(),
            key
        );
    }


    function saveSessionData(
        key,
        value
    ) {
        return saveStorageData(
            getSessionStorage(),
            key,
            value
        );
    }


    function readSessionData(
        key,
        fallback = null
    ) {
        return readStorageData(
            getSessionStorage(),
            key,
            fallback
        );
    }


    function removeSessionData(key) {
        return removeStorageData(
            getSessionStorage(),
            key
        );
    }


    /* ======================================================
       LANGUAGE HELPERS
    ====================================================== */

    function getSupportedLanguages() {
        const configured =
            getConfig()
                .language
                ?.supported;

        if (
            Array.isArray(
                configured
            ) &&
            configured.length > 0
        ) {
            return configured
                .map(
                    normalizeText
                )
                .filter(Boolean);
        }

        return [
            "zh",
            "id"
        ];
    }


    function getDefaultLanguage() {
        const configured =
            normalizeText(
                getConfig()
                    .language
                    ?.default
            ).toLowerCase();

        return (
            configured ||
            "zh"
        );
    }


    function normalizeLanguage(
        language
    ) {
        const value =
            normalizeText(
                language
            ).toLowerCase();

        const supported =
            getSupportedLanguages();

        return supported.includes(
            value
        )
            ? value
            : getDefaultLanguage();
    }


    function getCurrentLanguage() {
        /*
         * Language Manager digunakan jika sudah
         * tersedia, tetapi Utils tidak bergantung
         * kepadanya saat pertama dimuat.
         */
        try {
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
        } catch (_error) {
            /*
             * Gunakan fallback di bawah.
             */
        }

        const documentLanguage =
            normalizeText(
                document
                    .documentElement
                    ?.lang
            ).toLowerCase();

        if (
            getSupportedLanguages()
                .includes(
                    documentLanguage
                )
        ) {
            return documentLanguage;
        }

        return getDefaultLanguage();
    }


    function getLocalizedText(
        value,
        language =
            getCurrentLanguage(),
        fallback = ""
    ) {
        if (
            value === null ||
            value === undefined
        ) {
            return String(
                fallback ?? ""
            );
        }

        if (
            typeof value !==
                "object" ||
            Array.isArray(value)
        ) {
            return String(value);
        }

        const normalizedLanguage =
            normalizeLanguage(
                language
            );

        /*
         * Mandarin menjadi fallback pertama
         * setelah bahasa aktif karena Gomai
         * menggunakan Mandarin-first.
         */
        const candidates = [
            normalizedLanguage,
            getDefaultLanguage(),
            "zh",
            "id"
        ];

        for (
            const key
            of candidates
        ) {
            const localizedValue =
                value?.[key];

            if (
                localizedValue !==
                    null &&
                localizedValue !==
                    undefined &&
                String(
                    localizedValue
                ).trim() !== ""
            ) {
                return String(
                    localizedValue
                );
            }
        }

        return String(
            fallback ?? ""
        );
    }


    function interpolate(
        text,
        parameters = {}
    ) {
        let result =
            String(
                text ?? ""
            );

        if (
            !isPlainObject(
                parameters
            )
        ) {
            return result;
        }

        Object.entries(
            parameters
        ).forEach(
            ([
                key,
                value
            ]) => {

                result =
                    result.replaceAll(
                        `{{${key}}}`,
                        String(
                            value ?? ""
                        )
                    );

            }
        );

        return result;
    }


    /* ======================================================
       FORMATTERS
    ====================================================== */

    function formatCurrency(
        value,
        options = {}
    ) {
        const normalizedOptions =
            isPlainObject(options)
                ? options
                : {};

        const config =
            getConfig()
                .currency ||
            {};

        const number =
            Number(value);

        const safeValue =
            Number.isFinite(number)
                ? number
                : 0;

        const currency =
            normalizeText(
                normalizedOptions
                    .currency ||
                config.code ||
                "IDR"
            ) ||
            "IDR";

        /*
         * Harga Gomai menggunakan Rupiah,
         * sehingga locale angka tetap id-ID
         * walaupun bahasa UI Mandarin.
         */
        const locale =
            normalizeText(
                normalizedOptions
                    .locale ||
                config.locale ||
                "id-ID"
            ) ||
            "id-ID";

        const minimumFractionDigits =
            Number.isInteger(
                normalizedOptions
                    .minimumFractionDigits
            )
                ? normalizedOptions
                    .minimumFractionDigits
                : Number.isInteger(
                    config
                        .minimumFractionDigits
                )
                    ? config
                        .minimumFractionDigits
                    : 0;

        const maximumFractionDigits =
            Number.isInteger(
                normalizedOptions
                    .maximumFractionDigits
            )
                ? normalizedOptions
                    .maximumFractionDigits
                : Number.isInteger(
                    config
                        .maximumFractionDigits
                )
                    ? config
                        .maximumFractionDigits
                    : 0;

        try {
            return new Intl.NumberFormat(
                locale,
                {
                    style:
                        "currency",

                    currency,

                    minimumFractionDigits,

                    maximumFractionDigits
                }
            ).format(
                safeValue
            );
        } catch (error) {
            console.warn(
                "GomaiUtils: format mata uang gagal.",
                error
            );

            const symbol =
                normalizeText(
                    config.symbol ||
                    currency
                );

            return (
                `${symbol} ` +
                safeValue
                    .toLocaleString(
                        "id-ID"
                    )
            );
        }
    }


    function formatRupiah(value) {
        return formatCurrency(
            value,
            {
                currency:
                    "IDR",

                locale:
                    getConfig()
                        .currency
                        ?.locale ||
                    "id-ID",

                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    0
            }
        );
    }


    function formatNumber(
        value,
        locale = "id-ID"
    ) {
        const number =
            Number(value);

        const safeValue =
            Number.isFinite(number)
                ? number
                : 0;

        try {
            return new Intl.NumberFormat(
                locale
            ).format(
                safeValue
            );
        } catch (_error) {
            return String(
                safeValue
            );
        }
    }


    /* ======================================================
       HTML SAFETY
    ====================================================== */

    function escapeHTML(value) {
        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }


    function escapeAttribute(value) {
        return escapeHTML(
            value
        );
    }


    /* ======================================================
       TIMING HELPERS
    ====================================================== */

    function debounce(
        callback,
        delay = 200
    ) {
        if (
            typeof callback !==
            "function"
        ) {
            throw new TypeError(
                "GomaiUtils.debounce(): callback harus berupa function."
            );
        }

        const wait =
            Math.max(
                0,
                Number(delay) ||
                0
            );

        let timer = null;
        let lastArguments = null;
        let lastThis = null;


        function invoke() {
            const args =
                lastArguments ||
                [];

            const context =
                lastThis;

            timer = null;
            lastArguments = null;
            lastThis = null;

            return callback.apply(
                context,
                args
            );
        }


        function debounced(
            ...args
        ) {
            lastArguments =
                args;

            lastThis =
                this;

            if (
                timer !== null
            ) {
                window.clearTimeout(
                    timer
                );
            }

            timer =
                window.setTimeout(
                    invoke,
                    wait
                );
        }


        debounced.cancel =
            () => {

                if (
                    timer !== null
                ) {
                    window.clearTimeout(
                        timer
                    );
                }

                timer = null;
                lastArguments = null;
                lastThis = null;

            };


        debounced.flush =
            () => {

                if (
                    timer === null
                ) {
                    return undefined;
                }

                window.clearTimeout(
                    timer
                );

                return invoke();

            };


        debounced.pending =
            () =>
                timer !== null;


        return debounced;
    }


    function throttle(
        callback,
        delay = 200
    ) {
        if (
            typeof callback !==
            "function"
        ) {
            throw new TypeError(
                "GomaiUtils.throttle(): callback harus berupa function."
            );
        }

        const wait =
            Math.max(
                0,
                Number(delay) ||
                0
            );

        let lastRun = 0;
        let timer = null;

        let pendingArguments =
            null;

        let pendingThis =
            null;


        function run() {
            lastRun =
                Date.now();

            timer =
                null;

            const args =
                pendingArguments ||
                [];

            const context =
                pendingThis;

            pendingArguments =
                null;

            pendingThis =
                null;

            callback.apply(
                context,
                args
            );
        }


        function throttled(
            ...args
        ) {
            pendingArguments =
                args;

            pendingThis =
                this;

            const elapsed =
                Date.now() -
                lastRun;

            const remaining =
                wait -
                elapsed;

            if (
                lastRun === 0 ||
                remaining <= 0
            ) {
                if (
                    timer !== null
                ) {
                    window.clearTimeout(
                        timer
                    );

                    timer =
                        null;
                }

                run();

                return;
            }

            if (
                timer === null
            ) {
                timer =
                    window.setTimeout(
                        run,
                        remaining
                    );
            }
        }


        throttled.cancel =
            () => {

                if (
                    timer !== null
                ) {
                    window.clearTimeout(
                        timer
                    );
                }

                timer =
                    null;

                pendingArguments =
                    null;

                pendingThis =
                    null;

                lastRun =
                    0;

            };


        return throttled;
    }


    /* ======================================================
       BROWSER / ACCESSIBILITY HELPERS
    ====================================================== */

    function prefersReducedMotion() {
        try {
            return window
                .matchMedia(
                    "(prefers-reduced-motion: reduce)"
                )
                .matches;
        } catch (_error) {
            return false;
        }
    }


    function dispatch(
        eventName,
        detail = {},
        target = document
    ) {
        const name =
            normalizeText(
                eventName
            );

        if (
            !name ||
            !target ||
            typeof target
                .dispatchEvent !==
                "function"
        ) {
            return false;
        }

        return target.dispatchEvent(
            new CustomEvent(
                name,
                {
                    detail:
                        isPlainObject(
                            detail
                        )
                            ? detail
                            : {
                                value:
                                    detail
                            }
                }
            )
        );
    }


    /* ======================================================
       PUBLIC API
    ====================================================== */

    return Object.freeze({

        version:
            VERSION,

        getConfig,

        isPlainObject,
        normalizeText,
        normalizeIdentifier,
        cloneData,
        clamp,

        isInsidePagesDirectory,
        getBasePath,
        resolveProjectPath,
        resolveAssetPath,

        getDataPath,
        getRoute,
        buildRoute,
        appendQueryParameters,
        getQueryParameter,
        getQueryParameters,

        fetchJSON,

        saveLocalData,
        readLocalData,
        removeLocalData,

        saveSessionData,
        readSessionData,
        removeSessionData,

        getSupportedLanguages,
        getDefaultLanguage,
        normalizeLanguage,
        getCurrentLanguage,
        getLocalizedText,
        interpolate,

        formatCurrency,
        formatRupiah,
        formatNumber,

        escapeHTML,
        escapeAttribute,

        debounce,
        throttle,

        prefersReducedMotion,
        dispatch

    });

})();


window.GomaiUtils =
    GomaiUtils;