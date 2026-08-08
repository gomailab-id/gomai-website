"use strict";

/* ==========================================================
   GOMAI LANGUAGE MANAGER
   js/language.js

   Tanggung jawab:
   - Mandarin sebagai bahasa utama
   - Memuat kamus zh / id
   - Menyimpan pilihan bahasa
   - Menerapkan data-lang ke DOM
   - Placeholder, title, aria-label, alt
   - Template {{parameter}}
   - Sinkronisasi tombol bahasa
   - Mengirim event perubahan bahasa
   - Mencegah race condition saat bahasa diganti cepat

   Prinsip:
   - Mandarin-first
   - Tidak mengetahui controller halaman tertentu
   - ControllerRegistry dan ComponentRegistry menerima
     perubahan bahasa melalui event global
========================================================== */

const Language = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       STATE
    ====================================================== */

    let currentLanguage =
        "zh";

    let dictionary =
        {};

    let isInitialized =
        false;

    let isLoading =
        false;

    let initializationPromise =
        null;

    let activeLoadPromise =
        null;

    let activeLoadLanguage =
        "";

    let loadSequence =
        0;


    /* ======================================================
       BUTTON BINDING

       WeakSet mencegah listener yang sama dipasang dua kali
       pada tombol statis yang memang dikelola Language.

       Header/Footer baru juga dapat memanggil setLanguage()
       sendiri. Request dengan bahasa sama akan digabung oleh
       activeLoadPromise sehingga tidak melakukan fetch ganda.
    ====================================================== */

    const boundButtons =
        new WeakSet();


    /* ======================================================
       CONTROL DATA ATTRIBUTES
    ====================================================== */

    const CONTROL_DATASET_KEYS =
        new Set([
            "lang",
            "langPlaceholder",
            "langTitle",
            "langAriaLabel",
            "langAlt",
            "langValue",

            "langFallbackText",
            "langFallbackPlaceholder",
            "langFallbackTitle",
            "langFallbackAriaLabel",
            "langFallbackAlt",
            "langFallbackValue"
        ]);


    /* ======================================================
       INITIALIZATION
    ====================================================== */

    async function init() {

        if (isInitialized) {
            apply();
            bindButtons();

            return true;
        }

        if (initializationPromise) {
            return initializationPromise;
        }

        initializationPromise =
            initializeLanguage();

        try {
            return await initializationPromise;
        } finally {
            initializationPromise =
                null;
        }

    }


    async function initializeLanguage() {

        validateDependencies();

        const defaultLanguage =
            getDefaultLanguage();

        const storedLanguage =
            getStoredLanguage();

        currentLanguage =
            isSupportedLanguage(
                storedLanguage
            )
                ? storedLanguage
                : defaultLanguage;

        let loaded =
            await load(
                currentLanguage,
                {
                    refreshPage:
                        false,

                    persist:
                        false,

                    source:
                        "init"
                }
            );

        /*
         * Bila bahasa yang tersimpan gagal dimuat,
         * coba bahasa default.
         */
        if (
            !loaded &&
            currentLanguage !==
                defaultLanguage
        ) {
            loaded =
                await load(
                    defaultLanguage,
                    {
                        refreshPage:
                            false,

                        persist:
                            true,

                        force:
                            true,

                        source:
                            "init-fallback"
                    }
                );
        }

        /*
         * DOM tetap mendapatkan atribut bahasa
         * meskipun file JSON gagal dimuat.
         */
        applyDocumentLanguage();

        bindButtons();
        updateButtons();

        isInitialized =
            true;

        dispatchEvent(
            "gomai:language-ready",
            {
                language:
                    currentLanguage,

                loaded
            }
        );

        return loaded;

    }


    /* ======================================================
       DEPENDENCIES
    ====================================================== */

    function validateDependencies() {

        if (!window.GomaiUtils) {
            throw new Error(
                "Language membutuhkan GomaiUtils."
            );
        }

        if (
            typeof window.GomaiUtils
                .fetchJSON !==
                "function"
        ) {
            throw new Error(
                "Language membutuhkan GomaiUtils.fetchJSON()."
            );
        }

        if (
            typeof window.GomaiUtils
                .getDataPath !==
                "function"
        ) {
            throw new Error(
                "Language membutuhkan GomaiUtils.getDataPath()."
            );
        }

    }


    /* ======================================================
       LANGUAGE SWITCH
    ====================================================== */

    async function setLanguage(
        language,
        options = {}
    ) {

        const normalizedLanguage =
            normalizeLanguageInput(
                language
            );

        if (
            !isSupportedLanguage(
                normalizedLanguage
            )
        ) {
            console.warn(
                `Language: bahasa "${normalizedLanguage}" tidak didukung.`
            );

            return false;
        }

        /*
         * Tidak perlu fetch ulang bila bahasa sudah aktif
         * dan kamus tersedia.
         */
        if (
            normalizedLanguage ===
                currentLanguage &&
            hasDictionary() &&
            options.force !== true
        ) {
            apply();
            updateButtons();

            return true;
        }

        return load(
            normalizedLanguage,
            {
                ...options,

                refreshPage:
                    options
                        .refreshPage !==
                    false,

                persist:
                    options.persist !==
                    false,

                source:
                    options.source ||
                    "setLanguage"
            }
        );

    }


    /* ======================================================
       LOAD DICTIONARY
    ====================================================== */

    async function load(
        language,
        options = {}
    ) {

        validateDependencies();

        const {
            refreshPage = true,
            persist = true,
            force = false,
            source = "load"
        } = options;

        const normalizedLanguage =
            normalizeLanguageInput(
                language
            );

        if (
            !isSupportedLanguage(
                normalizedLanguage
            )
        ) {
            console.warn(
                `Language: bahasa "${normalizedLanguage}" tidak didukung.`
            );

            return false;
        }

        /*
         * Dua pemanggilan bersamaan untuk bahasa yang sama
         * menggunakan Promise yang sama.
         */
        if (
            activeLoadPromise &&
            activeLoadLanguage ===
                normalizedLanguage &&
            !force
        ) {
            return activeLoadPromise;
        }

        const requestSequence =
            ++loadSequence;

        const previousLanguage =
            currentLanguage;

        activeLoadLanguage =
            normalizedLanguage;

        activeLoadPromise =
            performLoad(
                normalizedLanguage,
                {
                    refreshPage,
                    persist,
                    source,
                    previousLanguage,
                    requestSequence
                }
            );

        try {
            return await activeLoadPromise;
        } finally {

            if (
                requestSequence ===
                    loadSequence
            ) {
                activeLoadPromise =
                    null;

                activeLoadLanguage =
                    "";
            }

        }

    }


    async function performLoad(
        language,
        options
    ) {

        const {
            refreshPage,
            persist,
            source,
            previousLanguage,
            requestSequence
        } = options;

        isLoading =
            true;

        setButtonsDisabled(
            true
        );

        dispatchEvent(
            "gomai:language-loading",
            {
                language,
                previousLanguage,
                source
            }
        );

        try {

            const languagePath =
                getLanguagePath(
                    language
                );

            if (!languagePath) {
                throw new Error(
                    `Path bahasa "${language}" tidak ditemukan.`
                );
            }

            const loadedDictionary =
                await window.GomaiUtils
                    .fetchJSON(
                        languagePath
                    );

            /*
             * Request lama tidak boleh menimpa request baru
             * bila pengguna mengganti bahasa dengan cepat.
             */
            if (
                requestSequence !==
                    loadSequence
            ) {
                return false;
            }

            if (
                !isPlainObject(
                    loadedDictionary
                )
            ) {
                throw new Error(
                    `Kamus bahasa "${language}" bukan object JSON yang valid.`
                );
            }

            dictionary =
                loadedDictionary;

            currentLanguage =
                language;

            if (persist) {
                saveLanguage(
                    currentLanguage
                );
            }

            apply();

            if (refreshPage) {
                notifyLanguageChanged(
                    previousLanguage,
                    source
                );
            }

            return true;

        } catch (error) {

            if (
                requestSequence ===
                    loadSequence
            ) {
                console.error(
                    `Language: gagal memuat bahasa "${language}".`,
                    error
                );

                dispatchEvent(
                    "gomai:language-error",
                    {
                        language,
                        previousLanguage,
                        source,
                        error
                    }
                );
            }

            return false;

        } finally {

            if (
                requestSequence ===
                    loadSequence
            ) {
                isLoading =
                    false;

                setButtonsDisabled(
                    false
                );

                updateButtons();
            }

        }

    }


    /* ======================================================
       RELOAD CURRENT LANGUAGE
    ====================================================== */

    async function reload(
        options = {}
    ) {

        return load(
            currentLanguage,
            {
                ...options,

                force:
                    true,

                refreshPage:
                    options
                        .refreshPage !==
                    false,

                persist:
                    options.persist !==
                    false,

                source:
                    options.source ||
                    "reload"
            }
        );

    }


    /* ======================================================
       LANGUAGE PATH
    ====================================================== */

    function getLanguagePath(
        language
    ) {

        const normalizedLanguage =
            normalizeLanguageInput(
                language
            );

        const pathKey =
            normalizedLanguage ===
                "zh"
                ? "languageZh"
                : "languageId";

        return window.GomaiUtils
            .getDataPath(
                pathKey
            );

    }


    /* ======================================================
       APPLY ALL TRANSLATIONS
    ====================================================== */

    function apply(
        root = document
    ) {

        applyDocumentLanguage();

        if (
            !root ||
            typeof root
                .querySelectorAll !==
                "function"
        ) {
            return false;
        }

        applyTextContent(
            root
        );

        applyPlaceholders(
            root
        );

        applyTitles(
            root
        );

        applyAriaLabels(
            root
        );

        applyAltText(
            root
        );

        applyValues(
            root
        );

        updateButtons();

        return true;

    }


    /* ======================================================
       DOCUMENT LANGUAGE
    ====================================================== */

    function applyDocumentLanguage() {

        const html =
            document.documentElement;

        if (!html) {
            return;
        }

        html.lang =
            currentLanguage;

        html.dir =
            "ltr";

        const locale =
            window.GomaiConfig
                ?.site
                ?.locale
                ?.[currentLanguage];

        if (locale) {
            html.dataset.locale =
                locale;
        } else {
            delete html.dataset
                .locale;
        }

    }


    /* ======================================================
       TEXT CONTENT
    ====================================================== */

    function applyTextContent(
        root
    ) {

        getTranslatableElements(
            root,
            "[data-lang]"
        )
            .forEach(
                element => {

                    const key =
                        element.dataset
                            .lang;

                    rememberFallback(
                        element,
                        "langFallbackText",
                        element.textContent
                    );

                    const fallback =
                        element.dataset
                            .langFallbackText ||
                        "";

                    element.textContent =
                        translate(
                            key,
                            fallback,
                            getElementTemplateParams(
                                element
                            )
                        );

                }
            );

    }


    /* ======================================================
       PLACEHOLDER
    ====================================================== */

    function applyPlaceholders(
        root
    ) {

        getTranslatableElements(
            root,
            "[data-lang-placeholder]"
        )
            .forEach(
                element => {

                    const key =
                        element.dataset
                            .langPlaceholder;

                    rememberFallback(
                        element,
                        "langFallbackPlaceholder",
                        element.getAttribute(
                            "placeholder"
                        ) ||
                        ""
                    );

                    element.setAttribute(
                        "placeholder",
                        translate(
                            key,
                            element.dataset
                                .langFallbackPlaceholder ||
                            "",
                            getElementTemplateParams(
                                element
                            )
                        )
                    );

                }
            );

    }


    /* ======================================================
       TITLE
    ====================================================== */

    function applyTitles(
        root
    ) {

        getTranslatableElements(
            root,
            "[data-lang-title]"
        )
            .forEach(
                element => {

                    const key =
                        element.dataset
                            .langTitle;

                    rememberFallback(
                        element,
                        "langFallbackTitle",
                        element.getAttribute(
                            "title"
                        ) ||
                        ""
                    );

                    element.setAttribute(
                        "title",
                        translate(
                            key,
                            element.dataset
                                .langFallbackTitle ||
                            "",
                            getElementTemplateParams(
                                element
                            )
                        )
                    );

                }
            );

    }


    /* ======================================================
       ARIA LABEL
    ====================================================== */

    function applyAriaLabels(
        root
    ) {

        getTranslatableElements(
            root,
            "[data-lang-aria-label]"
        )
            .forEach(
                element => {

                    const key =
                        element.dataset
                            .langAriaLabel;

                    rememberFallback(
                        element,
                        "langFallbackAriaLabel",
                        element.getAttribute(
                            "aria-label"
                        ) ||
                        ""
                    );

                    element.setAttribute(
                        "aria-label",
                        translate(
                            key,
                            element.dataset
                                .langFallbackAriaLabel ||
                            "",
                            getElementTemplateParams(
                                element
                            )
                        )
                    );

                }
            );

    }


    /* ======================================================
       ALT TEXT
    ====================================================== */

    function applyAltText(
        root
    ) {

        getTranslatableElements(
            root,
            "[data-lang-alt]"
        )
            .forEach(
                element => {

                    const key =
                        element.dataset
                            .langAlt;

                    rememberFallback(
                        element,
                        "langFallbackAlt",
                        element.getAttribute(
                            "alt"
                        ) ||
                        ""
                    );

                    element.setAttribute(
                        "alt",
                        translate(
                            key,
                            element.dataset
                                .langFallbackAlt ||
                            "",
                            getElementTemplateParams(
                                element
                            )
                        )
                    );

                }
            );

    }


    /* ======================================================
       VALUE

       Hanya digunakan untuk elemen yang memang menandai
       data-lang-value secara eksplisit.
    ====================================================== */

    function applyValues(
        root
    ) {

        getTranslatableElements(
            root,
            "[data-lang-value]"
        )
            .forEach(
                element => {

                    const key =
                        element.dataset
                            .langValue;

                    rememberFallback(
                        element,
                        "langFallbackValue",
                        element.value ||
                        ""
                    );

                    element.value =
                        translate(
                            key,
                            element.dataset
                                .langFallbackValue ||
                            "",
                            getElementTemplateParams(
                                element
                            )
                        );

                }
            );

    }


    /* ======================================================
       ELEMENT QUERY HELPER
    ====================================================== */

    function getTranslatableElements(
        root,
        selector
    ) {

        const elements =
            [];

        /*
         * Bila root sendiri cocok, sertakan juga.
         */
        if (
            root !== document &&
            typeof root.matches ===
                "function" &&
            root.matches(
                selector
            )
        ) {
            elements.push(
                root
            );
        }

        elements.push(
            ...root.querySelectorAll(
                selector
            )
        );

        return elements;

    }


    /* ======================================================
       FALLBACK PRESERVATION

       Fallback asli hanya disimpan sekali agar pergantian
       zh -> id -> zh tidak menggunakan hasil terjemahan
       sebelumnya sebagai fallback baru.
    ====================================================== */

    function rememberFallback(
        element,
        datasetKey,
        value
    ) {

        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    element.dataset,
                    datasetKey
                )
        ) {
            return;
        }

        element.dataset[
            datasetKey
        ] =
            String(
                value ?? ""
            );

    }


    /* ======================================================
       TRANSLATION LOOKUP
    ====================================================== */

    function translate(
        key,
        fallback = "",
        params = {}
    ) {

        const value =
            getNestedValue(
                key
            );

        const baseText =
            typeof value ===
                "string"
                ? value
                : String(
                    fallback ??
                    ""
                );

        return replaceTemplateParams(
            baseText,
            params
        );

    }


    function hasTranslation(
        key
    ) {

        return (
            typeof getNestedValue(
                key
            ) ===
            "string"
        );

    }


    function getNestedValue(
        key
    ) {

        const normalizedKey =
            String(
                key ||
                ""
            ).trim();

        if (!normalizedKey) {
            return undefined;
        }

        const parts =
            normalizedKey.split(
                "."
            );

        let value =
            dictionary;

        for (
            const part
            of parts
        ) {

            if (
                !part ||
                part === "__proto__" ||
                part === "prototype" ||
                part === "constructor"
            ) {
                return undefined;
            }

            if (
                value === null ||
                value === undefined ||
                typeof value !==
                    "object" ||
                !Object.prototype
                    .hasOwnProperty
                    .call(
                        value,
                        part
                    )
            ) {
                return undefined;
            }

            value =
                value[part];

        }

        return value;

    }


    /* ======================================================
       TEMPLATE PARAMETERS
    ====================================================== */

    function replaceTemplateParams(
        template,
        params = {}
    ) {

        const safeParams =
            isPlainObject(
                params
            )
                ? params
                : {};

        return String(
            template ??
            ""
        ).replace(
            /\{\{\s*([\w.-]+)\s*\}\}/g,
            (
                match,
                key
            ) => {

                if (
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            safeParams,
                            key
                        )
                ) {
                    return String(
                        safeParams[key] ??
                        ""
                    );
                }

                return match;

            }
        );

    }


    function getElementTemplateParams(
        element
    ) {

        const params = {};

        if (
            !element ||
            !element.dataset
        ) {
            return params;
        }

        Object.entries(
            element.dataset
        )
            .forEach(
                ([
                    key,
                    value
                ]) => {

                    if (
                        !key.startsWith(
                            "lang"
                        ) ||
                        CONTROL_DATASET_KEYS
                            .has(
                                key
                            )
                    ) {
                        return;
                    }

                    const parameterName =
                        key
                            .replace(
                                /^lang/,
                                ""
                            )
                            .replace(
                                /^./,
                                character =>
                                    character
                                        .toLowerCase()
                            );

                    if (!parameterName) {
                        return;
                    }

                    params[
                        parameterName
                    ] =
                        value;

                }
            );

        return params;

    }


    /* ======================================================
       BUTTONS
    ====================================================== */

    function bindButtons(
        root = document
    ) {

        if (
            !root ||
            typeof root
                .querySelectorAll !==
                "function"
        ) {
            return;
        }

        const buttons =
            [];

        if (
            root !== document &&
            typeof root.matches ===
                "function" &&
            root.matches(
                "[data-language]"
            )
        ) {
            buttons.push(
                root
            );
        }

        buttons.push(
            ...root.querySelectorAll(
                "[data-language]"
            )
        );

        buttons.forEach(
            button => {

                if (
                    boundButtons.has(
                        button
                    )
                ) {
                    return;
                }

                /*
                 * Tombol yang dikelola oleh Header/Footer
                 * tetap aman karena setLanguage() menggabung
                 * request bahasa yang sama.
                 */
                button.addEventListener(
                    "click",
                    handleLanguageButtonClick
                );

                boundButtons.add(
                    button
                );

            }
        );

        updateButtons();

    }


    async function handleLanguageButtonClick(
        event
    ) {

        const button =
            event.currentTarget;

        const selectedLanguage =
            normalizeLanguageInput(
                button
                    ?.dataset
                    ?.language
            );

        if (
            !selectedLanguage ||
            !isSupportedLanguage(
                selectedLanguage
            )
        ) {
            return;
        }

        if (
            selectedLanguage ===
                currentLanguage &&
            !isLoading
        ) {
            updateButtons();
            return;
        }

        await setLanguage(
            selectedLanguage,
            {
                source:
                    "language-button"
            }
        );

    }


    function updateButtons(
        root = document
    ) {

        if (
            !root ||
            typeof root
                .querySelectorAll !==
                "function"
        ) {
            return;
        }

        const buttons =
            [];

        if (
            root !== document &&
            typeof root.matches ===
                "function" &&
            root.matches(
                "[data-language]"
            )
        ) {
            buttons.push(
                root
            );
        }

        buttons.push(
            ...root.querySelectorAll(
                "[data-language]"
            )
        );

        buttons.forEach(
            button => {

                const buttonLanguage =
                    normalizeLanguageInput(
                        button.dataset
                            .language
                    );

                const active =
                    buttonLanguage ===
                    currentLanguage;

                button.classList
                    .toggle(
                        "active",
                        active
                    );

                button.classList
                    .toggle(
                        "is-active",
                        active
                    );

                button.setAttribute(
                    "aria-pressed",
                    String(
                        active
                    )
                );

                if (active) {
                    button.dataset
                        .active =
                        "true";
                } else {
                    delete button.dataset
                        .active;
                }

            }
        );

    }


    function setButtonsDisabled(
        disabled
    ) {

        document
            .querySelectorAll(
                "[data-language]"
            )
            .forEach(
                button => {

                    if (
                        !(
                            button instanceof
                            HTMLButtonElement
                        )
                    ) {
                        return;
                    }

                    button.disabled =
                        Boolean(
                            disabled
                        );

                    button.setAttribute(
                        "aria-busy",
                        String(
                            Boolean(
                                disabled
                            )
                        )
                    );

                }
            );

    }


    /* ======================================================
       LANGUAGE CHANGED EVENT

       Language Manager tidak memanggil HomePage,
       BrandPage, ProductsPage, ProductDetailPage, atau
       InformationPage secara langsung.

       ControllerRegistry dan ComponentRegistry menerima
       event yang sama dan mengelola lifecycle masing-masing.
    ====================================================== */

    function notifyLanguageChanged(
        previousLanguage,
        source
    ) {

        dispatchEvent(
            "gomai:language-changed",
            {
                language:
                    currentLanguage,

                previousLanguage,

                source
            }
        );

    }


    function dispatchEvent(
        eventName,
        detail = {}
    ) {

        const eventDetail = {
            ...detail,

            timestamp:
                Date.now(),

            manager:
                publicAPI
        };

        document.dispatchEvent(
            new CustomEvent(
                eventName,
                {
                    detail:
                        eventDetail
                }
            )
        );

    }


    /* ======================================================
       STORAGE
    ====================================================== */

    function getStoredLanguage() {

        const defaultLanguage =
            getDefaultLanguage();

        const storageKey =
            getStorageKey();

        const storedLanguage =
            window.GomaiUtils
                .readLocalData(
                    storageKey,
                    defaultLanguage
                );

        const normalized =
            normalizeLanguageInput(
                storedLanguage
            );

        return isSupportedLanguage(
            normalized
        )
            ? normalized
            : defaultLanguage;

    }


    function saveLanguage(
        language
    ) {

        return window.GomaiUtils
            .saveLocalData(
                getStorageKey(),
                language
            );

    }


    function clearStoredLanguage() {

        if (
            typeof window.GomaiUtils
                .removeLocalData !==
                "function"
        ) {
            return false;
        }

        return window.GomaiUtils
            .removeLocalData(
                getStorageKey()
            );

    }


    function getStorageKey() {

        return (
            window.GomaiConfig
                ?.storage
                ?.language ||
            "gomai-language"
        );

    }


    /* ======================================================
       SUPPORTED LANGUAGES
    ====================================================== */

    function getSupportedLanguages() {

        const configured =
            window.GomaiConfig
                ?.language
                ?.supported;

        if (
            Array.isArray(
                configured
            ) &&
            configured.length > 0
        ) {
            return configured
                .map(
                    normalizeLanguageInput
                )
                .filter(Boolean);
        }

        return [
            "zh",
            "id"
        ];

    }


    function isSupportedLanguage(
        language
    ) {

        const normalizedLanguage =
            normalizeLanguageInput(
                language
            );

        return getSupportedLanguages()
            .includes(
                normalizedLanguage
            );

    }


    function getDefaultLanguage() {

        const configured =
            normalizeLanguageInput(
                window.GomaiConfig
                    ?.language
                    ?.default
            );

        return isSupportedLanguage(
            configured
        )
            ? configured
            : "zh";

    }


    function getFallbackLanguage() {

        const configured =
            normalizeLanguageInput(
                window.GomaiConfig
                    ?.language
                    ?.fallback
            );

        return isSupportedLanguage(
            configured
        )
            ? configured
            : getDefaultLanguage();

    }


    function normalizeLanguageInput(
        value
    ) {

        return String(
            value ??
            ""
        )
            .trim()
            .toLowerCase()
            .replace(
                "_",
                "-"
            )
            .split("-")[0];

    }


    /* ======================================================
       DICTIONARY HELPERS
    ====================================================== */

    function hasDictionary() {

        return (
            dictionary &&
            typeof dictionary ===
                "object" &&
            !Array.isArray(
                dictionary
            ) &&
            Object.keys(
                dictionary
            ).length > 0
        );

    }


    function getDictionary(
        options = {}
    ) {

        if (
            options.clone ===
            false
        ) {
            return dictionary;
        }

        if (
            typeof window.GomaiUtils
                ?.cloneData ===
                "function"
        ) {
            return window.GomaiUtils
                .cloneData(
                    dictionary
                );
        }

        return {
            ...dictionary
        };

    }


    function isPlainObject(
        value
    ) {

        if (
            typeof window.GomaiUtils
                ?.isPlainObject ===
                "function"
        ) {
            return window.GomaiUtils
                .isPlainObject(
                    value
                );
        }

        return Boolean(
            value &&
            typeof value ===
                "object" &&
            !Array.isArray(
                value
            )
        );

    }


    /* ======================================================
       PUBLIC STATE
    ====================================================== */

    function getLanguage() {
        return currentLanguage;
    }


    function hasInitialized() {
        return isInitialized;
    }


    function getLoadingState() {
        return isLoading;
    }


    /* ======================================================
       PUBLIC API
    ====================================================== */

    const publicAPI =
        Object.freeze({

            version:
                VERSION,

            init,

            load,
            reload,
            setLanguage,

            apply,
            bindButtons,
            updateButtons,

            getLanguage,

            getDefaultLanguage,
            getFallbackLanguage,
            getSupportedLanguages,
            isSupportedLanguage,

            translate,
            hasTranslation,
            replaceTemplateParams,

            getDictionary,

            clearStoredLanguage,

            hasInitialized,

            isLoading:
                getLoadingState

        });


    return publicAPI;

})();


window.Language =
    Language;