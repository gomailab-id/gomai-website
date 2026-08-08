"use strict";

/* ==========================================================
   GOMAI BRANDS MODEL
   js/models/brands.js

   Tanggung jawab:
   - Membaca data/brands.json
   - Memvalidasi data brand
   - Menormalisasi struktur brand
   - Menyimpan cache data
   - Mencegah request load berjalan ganda
   - Menyediakan brand aktif
   - Menyediakan brand unggulan
   - Menyediakan brand homepage hero
   - Menyediakan brand navigasi
   - Menyediakan pencarian brand
   - Menjadi compatibility layer struktur lama dan baru

   Struktur data utama yang didukung:

   {
       id,
       slug,
       name,
       description,
       active,
       sortOrder,

       assets: {
           logo,
           hero
       },

       theme: {
           primaryColor,
           accentColor
       },

       display: {
           featured,
           featuredOrder,
           showInHero,
           heroOrder,
           showInNavigation,
           navigationOrder
       }
   }

   Compatibility properties:

   brand.logo
   brand.hero
   brand.primaryColor
   brand.accentColor
   brand.featured
   brand.showInHero
   brand.showInNavigation
========================================================== */

const BrandsModel = (() => {

    const VERSION =
        "3.1.0";


    /* ======================================================
       CONSTANTS
    ====================================================== */

    const DEFAULT_SORT_ORDER =
        9999;


    const DEFAULT_PRIMARY_COLOR =
        "#111111";


    const DEFAULT_ACCENT_COLOR =
        "#ffffff";


    const EVENTS =
        Object.freeze({

            LOADING:
                "gomai:brands-model-loading",

            LOADED:
                "gomai:brands-model-loaded",

            ERROR:
                "gomai:brands-model-error",

            CACHE_CLEARED:
                "gomai:brands-model-cache-cleared",

            STALE_LOAD:
                "gomai:brands-model-stale-load"

        });


    /* ======================================================
       INTERNAL STATE
    ====================================================== */

    let brands =
        [];


    let isLoaded =
        false;


    let loadingPromise =
        null;


    let lastLoadedAt =
        null;


    let lastError =
        null;


    /*
     * Digunakan untuk mencegah request lama menulis kembali
     * cache setelah clearCache() dijalankan.
     */
    let cacheGeneration =
        0;


    /* ======================================================
       LOAD
    ====================================================== */

    async function load(
        forceReload = false
    ) {

        validateDependencies();


        const force =
            forceReload ===
            true;


        if (
            isLoaded &&
            !force
        ) {

            return getActiveSnapshot();

        }


        /*
         * Request load biasa cukup menunggu request aktif.
         */
        if (
            loadingPromise &&
            !force
        ) {

            await loadingPromise;


            return getActiveSnapshot();

        }


        /*
         * Force reload tidak dijalankan paralel dengan
         * request lama karena hasil request yang selesai
         * terakhir dapat menimpa cache secara tidak sengaja.
         */
        if (
            loadingPromise &&
            force
        ) {

            try {

                await loadingPromise;

            } catch (_error) {

                /*
                 * Reload paksa tetap dilanjutkan walaupun
                 * request sebelumnya gagal.
                 */

            }

        }


        if (
            isLoaded &&
            !force
        ) {

            return getActiveSnapshot();

        }


        const generation =
            cacheGeneration;


        const operation =
            loadInternal(
                generation
            );


        loadingPromise =
            operation;


        try {

            await operation;


            return getActiveSnapshot();

        } finally {

            /*
             * Jangan menghapus reference promise baru apabila
             * terjadi pergantian operasi sebelum finally ini.
             */
            if (
                loadingPromise ===
                operation
            ) {

                loadingPromise =
                    null;

            }

        }

    }


    /* ======================================================
       LOAD INTERNAL
    ====================================================== */

    async function loadInternal(
        generation
    ) {

        lastError =
            null;


        dispatch(
            EVENTS.LOADING,
            {

                generation

            }
        );


        try {

            const data =
                await window.GomaiUtils
                    .fetchJSON(
                        window.GomaiUtils
                            .getDataPath(
                                "brands"
                            )
                    );


            const rawBrands =
                extractRawBrands(
                    data
                );


            const normalizedBrands =
                normalizeBrandCollection(
                    rawBrands
                );


            /*
             * Cache mungkin telah dibersihkan ketika fetch
             * masih berlangsung. Hasil lama tidak boleh
             * menghidupkan kembali cache tersebut.
             */
            if (
                generation !==
                cacheGeneration
            ) {

                dispatch(
                    EVENTS.STALE_LOAD,
                    {

                        generation,

                        currentGeneration:
                            cacheGeneration

                    }
                );


                return false;

            }


            brands =
                normalizedBrands;


            isLoaded =
                true;


            lastLoadedAt =
                Date.now();


            lastError =
                null;


            dispatch(
                EVENTS.LOADED,
                {

                    count:
                        brands.length,

                    activeCount:
                        brands.filter(
                            brand =>
                                brand.active
                        ).length,

                    featuredCount:
                        brands.filter(
                            brand =>
                                brand.active &&
                                brand.display
                                    .featured
                        ).length,

                    heroCount:
                        brands.filter(
                            brand =>
                                brand.active &&
                                brand.display
                                    .showInHero
                        ).length,

                    navigationCount:
                        brands.filter(
                            brand =>
                                brand.active &&
                                brand.display
                                    .showInNavigation
                        ).length,

                    loadedAt:
                        lastLoadedAt

                }
            );


            return true;

        } catch (error) {

            const normalizedError =
                normalizeError(
                    error
                );


            /*
             * Error request lama yang sudah invalid tidak
             * boleh mengubah state cache generasi baru.
             */
            if (
                generation !==
                cacheGeneration
            ) {

                dispatch(
                    EVENTS.STALE_LOAD,
                    {

                        generation,

                        currentGeneration:
                            cacheGeneration,

                        error:
                            normalizedError

                    }
                );


                return false;

            }


            brands =
                [];


            isLoaded =
                false;


            lastLoadedAt =
                null;


            lastError =
                normalizedError;


            dispatch(
                EVENTS.ERROR,
                {

                    error:
                        normalizedError

                }
            );


            throw normalizedError;

        }

    }


    /* ======================================================
       EXTRACT RAW DATA
    ====================================================== */

    function extractRawBrands(
        data
    ) {

        /*
         * Format utama:
         *
         * {
         *     "brands": [...]
         * }
         */
        if (
            isPlainObject(
                data
            ) &&
            Array.isArray(
                data.brands
            )
        ) {

            return data.brands;

        }


        /*
         * Compatibility untuk file lama yang mungkin
         * langsung menggunakan array.
         */
        if (
            Array.isArray(
                data
            )
        ) {

            return data;

        }


        return [];

    }


    /* ======================================================
       RELOAD
    ====================================================== */

    async function reload() {

        return load(
            true
        );

    }


    /* ======================================================
       ENSURE LOADED
    ====================================================== */

    async function ensureLoaded() {

        if (
            isLoaded
        ) {
            return;
        }


        await load();

    }


    /* ======================================================
       COLLECTION NORMALIZATION
    ====================================================== */

    function normalizeBrandCollection(
        rawBrands
    ) {

        if (
            !Array.isArray(
                rawBrands
            )
        ) {

            return [];

        }


        const normalizedBrands =
            [];


        const usedIds =
            new Set();


        const usedSlugs =
            new Set();


        rawBrands.forEach(
            (
                rawBrand,
                index
            ) => {

                if (
                    !isValidRawBrand(
                        rawBrand
                    )
                ) {

                    console.warn(
                        `BrandsModel: brand pada index ${index} tidak valid dan dilewati.`,
                        rawBrand
                    );


                    return;

                }


                const brand =
                    normalizeBrand(
                        rawBrand
                    );


                if (
                    !brand.id ||
                    !brand.slug
                ) {

                    console.warn(
                        `BrandsModel: brand pada index ${index} tidak memiliki ID atau slug valid.`
                    );


                    return;

                }


                const idKey =
                    brand.id
                        .toLowerCase();


                const slugKey =
                    brand.slug
                        .toLowerCase();


                if (
                    usedIds.has(
                        idKey
                    )
                ) {

                    console.warn(
                        `BrandsModel: ID brand duplikat "${brand.id}" dilewati.`
                    );


                    return;

                }


                if (
                    usedSlugs.has(
                        slugKey
                    )
                ) {

                    console.warn(
                        `BrandsModel: slug brand duplikat "${brand.slug}" dilewati.`
                    );


                    return;

                }


                usedIds.add(
                    idKey
                );


                usedSlugs.add(
                    slugKey
                );


                normalizedBrands.push(
                    brand
                );

            }
        );


        return normalizedBrands.sort(
            compareBySortOrder
        );

    }


    /* ======================================================
       RAW BRAND VALIDATION
    ====================================================== */

    function isValidRawBrand(
        brand
    ) {

        if (
            !isPlainObject(
                brand
            )
        ) {

            return false;

        }


        const id =
            normalizeIdentifier(
                brand.id
            );


        const name =
            normalizeText(
                brand.name
            );


        return Boolean(
            id &&
            name
        );

    }


    /* ======================================================
       NORMALIZE BRAND
    ====================================================== */

    function normalizeBrand(
        brand
    ) {

        const id =
            normalizeIdentifier(
                brand.id
            );


        const slug =
            normalizeIdentifier(
                brand.slug ||
                id
            );


        const name =
            normalizeText(
                brand.name ||
                id
            );


        const description =
            normalizeLocalizedText(
                brand.description
            );


        const assets =
            normalizeAssets(
                brand,
                id
            );


        const theme =
            normalizeTheme(
                brand
            );


        const sortOrder =
            normalizeOrder(
                brand.sortOrder
            );


        const display =
            normalizeDisplay(
                brand,
                sortOrder
            );


        const active =
            brand.active !==
            false;


        /*
         * Domain object sengaja memiliki nested properties
         * sekaligus flat compatibility properties.
         *
         * Dengan begitu controller baru dapat menggunakan:
         *
         * brand.assets.logo
         *
         * sementara kode lama tetap dapat menggunakan:
         *
         * brand.logo
         */
        return Object.freeze({

            id,

            slug,

            name,


            description:
                Object.freeze({

                    ...description

                }),


            active,


            sortOrder,


            website:
                normalizeText(
                    brand.website
                ),


            assets:
                Object.freeze({

                    ...assets

                }),


            theme:
                Object.freeze({

                    ...theme

                }),


            display:
                Object.freeze({

                    ...display

                }),


            /* ==========================================
               COMPATIBILITY PROPERTIES
            ========================================== */

            logo:
                assets.logo,


            hero:
                assets.hero,


            primaryColor:
                theme.primaryColor,


            accentColor:
                theme.accentColor,


            featured:
                display.featured,


            featuredOrder:
                display.featuredOrder,


            showInHero:
                display.showInHero,


            heroOrder:
                display.heroOrder,


            showInNavigation:
                display.showInNavigation,


            navigationOrder:
                display.navigationOrder

        });

    }


    /* ======================================================
       ASSET NORMALIZATION
    ====================================================== */

    function normalizeAssets(
        brand,
        id
    ) {

        const source =
            isPlainObject(
                brand.assets
            )
                ? brand.assets
                : {};


        const logo =
            normalizeAssetPath(
                source.logo ||
                brand.logo
            );


        const hero =
            normalizeAssetPath(
                source.hero ||
                brand.hero
            );


        return {

            logo:
                logo ||
                `assets/brands/${id}/logo.png`,


            hero:
                hero ||
                `assets/brands/${id}/hero.webp`

        };

    }


    /* ======================================================
       THEME NORMALIZATION
    ====================================================== */

    function normalizeTheme(
        brand
    ) {

        const source =
            isPlainObject(
                brand.theme
            )
                ? brand.theme
                : {};


        return {

            primaryColor:
                normalizeColor(
                    source.primaryColor ||
                    brand.primaryColor,
                    DEFAULT_PRIMARY_COLOR
                ),


            accentColor:
                normalizeColor(
                    source.accentColor ||
                    brand.accentColor,
                    DEFAULT_ACCENT_COLOR
                )

        };

    }


    /* ======================================================
       DISPLAY NORMALIZATION
    ====================================================== */

    function normalizeDisplay(
        brand,
        sortOrder
    ) {

        const source =
            isPlainObject(
                brand.display
            )
                ? brand.display
                : {};


        const legacyFeatured =
            normalizeBoolean(
                brand.featured,
                false
            );


        const featured =
            normalizeBoolean(
                source.featured,
                legacyFeatured
            );


        /*
         * Brand featured secara default boleh ikut Hero.
         */
        const showInHero =
            normalizeBoolean(
                source.showInHero,
                featured
            );


        /*
         * Brand aktif secara default dapat muncul
         * pada navigasi kecuali dinonaktifkan eksplisit.
         */
        const showInNavigation =
            normalizeBoolean(
                source.showInNavigation,
                true
            );


        const legacyFeaturedOrder =
            normalizeOrder(
                brand.featuredOrder,
                sortOrder
            );


        const legacyHeroOrder =
            normalizeOrder(
                brand.heroOrder,
                sortOrder
            );


        const legacyNavigationOrder =
            normalizeOrder(
                brand.navigationOrder,
                sortOrder
            );


        return {

            featured,


            featuredOrder:
                normalizeOrder(
                    source.featuredOrder,
                    legacyFeaturedOrder
                ),


            showInHero,


            heroOrder:
                normalizeOrder(
                    source.heroOrder,
                    legacyHeroOrder
                ),


            showInNavigation,


            navigationOrder:
                normalizeOrder(
                    source.navigationOrder,
                    legacyNavigationOrder
                )

        };

    }


    /* ======================================================
       LOCALIZED TEXT
    ====================================================== */

    function normalizeLocalizedText(
        value
    ) {

        if (
            typeof value ===
            "string"
        ) {

            const text =
                normalizeText(
                    value
                );


            return {

                id:
                    text,

                zh:
                    text

            };

        }


        const source =
            isPlainObject(
                value
            )
                ? value
                : {};


        const idText =
            normalizeText(
                source.id
            );


        const zhText =
            normalizeText(
                source.zh
            );


        /*
         * Fallback dibuat dua arah.
         *
         * Dengan demikian bahasa Mandarin tetap mendapat
         * teks apabila hanya versi Indonesia tersedia,
         * dan sebaliknya.
         */
        return {

            id:
                idText ||
                zhText,


            zh:
                zhText ||
                idText

        };

    }


    /* ======================================================
       GET ALL

       getAll() secara historis berarti seluruh brand aktif.
       Perilaku ini dipertahankan agar controller lama tidak
       tiba-tiba menampilkan brand nonaktif.
    ====================================================== */

    async function getAll() {

        await ensureLoaded();


        return getActiveSnapshot();

    }


    /* ======================================================
       GET ACTIVE
    ====================================================== */

    async function getActive(
        limit = null
    ) {

        await ensureLoaded();


        return applyLimit(
            brands
                .filter(
                    brand =>
                        brand.active
                )
                .sort(
                    compareBySortOrder
                ),
            limit
        );

    }


    /* ======================================================
       ACTIVE SNAPSHOT
    ====================================================== */

    function getActiveSnapshot() {

        return cloneData(
            brands
                .filter(
                    brand =>
                        brand.active
                )
                .sort(
                    compareBySortOrder
                )
        );

    }


    /* ======================================================
       GET BY ID
    ====================================================== */

    async function getById(
        brandId
    ) {

        await ensureLoaded();


        const id =
            normalizeIdentifier(
                brandId
            );


        if (!id) {

            return null;

        }


        const lookup =
            id.toLowerCase();


        const brand =
            brands.find(
                item =>
                    item.active &&
                    item.id
                        .toLowerCase() ===
                    lookup
            );


        return brand
            ? cloneData(
                brand
            )
            : null;

    }


    /* ======================================================
       GET BY SLUG
    ====================================================== */

    async function getBySlug(
        slug
    ) {

        await ensureLoaded();


        const normalizedSlug =
            normalizeIdentifier(
                slug
            );


        if (
            !normalizedSlug
        ) {

            return null;

        }


        const lookup =
            normalizedSlug
                .toLowerCase();


        const brand =
            brands.find(
                item =>
                    item.active &&
                    item.slug
                        .toLowerCase() ===
                    lookup
            );


        return brand
            ? cloneData(
                brand
            )
            : null;

    }


    /* ======================================================
       FIND BY ID OR SLUG
    ====================================================== */

    async function find(
        value
    ) {

        await ensureLoaded();


        const identifier =
            normalizeIdentifier(
                value
            );


        if (
            !identifier
        ) {

            return null;

        }


        const lookup =
            identifier
                .toLowerCase();


        const brand =
            brands.find(
                item => {

                    if (
                        !item.active
                    ) {

                        return false;

                    }


                    return (
                        item.id
                            .toLowerCase() ===
                            lookup ||
                        item.slug
                            .toLowerCase() ===
                            lookup
                    );

                }
            );


        return brand
            ? cloneData(
                brand
            )
            : null;

    }


    /* ======================================================
       FEATURED
    ====================================================== */

    async function getFeatured(
        limit = null
    ) {

        await ensureLoaded();


        const results =
            brands
                .filter(
                    brand =>
                        brand.active &&
                        brand.display
                            .featured
                )
                .sort(
                    (
                        firstBrand,
                        secondBrand
                    ) =>
                        compareByDisplayOrder(
                            firstBrand,
                            secondBrand,
                            "featuredOrder"
                        )
                );


        return applyLimit(
            results,
            limit
        );

    }


    /* ======================================================
       HERO
    ====================================================== */

    async function getHero(
        limit = null
    ) {

        await ensureLoaded();


        const results =
            brands
                .filter(
                    brand =>
                        brand.active &&
                        brand.display
                            .showInHero &&
                        Boolean(
                            brand.assets
                                .hero
                        ) &&
                        Boolean(
                            brand.assets
                                .logo
                        )
                )
                .sort(
                    (
                        firstBrand,
                        secondBrand
                    ) =>
                        compareByDisplayOrder(
                            firstBrand,
                            secondBrand,
                            "heroOrder"
                        )
                );


        return applyLimit(
            results,
            limit
        );

    }


    /* ======================================================
       NAVIGATION
    ====================================================== */

    async function getNavigation(
        limit = null
    ) {

        await ensureLoaded();


        const results =
            brands
                .filter(
                    brand =>
                        brand.active &&
                        brand.display
                            .showInNavigation
                )
                .sort(
                    (
                        firstBrand,
                        secondBrand
                    ) =>
                        compareByDisplayOrder(
                            firstBrand,
                            secondBrand,
                            "navigationOrder"
                        )
                );


        return applyLimit(
            results,
            limit
        );

    }


    /* ======================================================
       SEARCH
    ====================================================== */

    async function search(
        query,
        language =
            getCurrentLanguage()
    ) {

        await ensureLoaded();


        const keyword =
            normalizeSearchText(
                query
            );


        if (
            !keyword
        ) {

            return [];

        }


        const normalizedLanguage =
            normalizeLanguage(
                language
            );


        const results =
            brands
                .filter(
                    brand => {

                        if (
                            !brand.active
                        ) {

                            return false;

                        }


                        const localizedDescription =
                            brand.description[
                                normalizedLanguage
                            ] ||
                            "";


                        /*
                         * Kedua bahasa tetap masuk search index.
                         * Jadi pengguna Mandarin masih dapat
                         * menemukan produk dengan kata Indonesia,
                         * dan sebaliknya.
                         */
                        const searchableText = [

                            brand.id,

                            brand.slug,

                            brand.name,

                            brand.website,

                            localizedDescription,

                            brand.description.id,

                            brand.description.zh

                        ]
                            .map(
                                normalizeSearchText
                            )
                            .filter(
                                Boolean
                            )
                            .join(" ");


                        return searchableText
                            .includes(
                                keyword
                            );

                    }
                )
                .sort(
                    compareBySortOrder
                );


        return cloneData(
            results
        );

    }


    /* ======================================================
       CACHE STATUS
    ====================================================== */

    function hasLoaded() {

        return isLoaded;

    }


    function getLastLoadedAt() {

        return lastLoadedAt;

    }


    function getLastError() {

        return lastError;

    }


    /* ======================================================
       CLEAR CACHE
    ====================================================== */

    function clearCache() {

        /*
         * Semua load yang sudah berjalan sebelum nilai ini
         * berubah dianggap stale.
         */
        cacheGeneration +=
            1;


        brands =
            [];


        isLoaded =
            false;


        loadingPromise =
            null;


        lastLoadedAt =
            null;


        lastError =
            null;


        dispatch(
            EVENTS.CACHE_CLEARED,
            {

                generation:
                    cacheGeneration

            }
        );


        return true;

    }


    /* ======================================================
       DEPENDENCY VALIDATION
    ====================================================== */

    function validateDependencies() {

        if (
            !window.GomaiUtils
        ) {

            throw new Error(
                "BrandsModel membutuhkan GomaiUtils."
            );

        }


        if (
            typeof window.GomaiUtils
                .fetchJSON !==
                "function"
        ) {

            throw new Error(
                "BrandsModel membutuhkan GomaiUtils.fetchJSON()."
            );

        }


        if (
            typeof window.GomaiUtils
                .getDataPath !==
                "function"
        ) {

            throw new Error(
                "BrandsModel membutuhkan GomaiUtils.getDataPath()."
            );

        }

    }


    /* ======================================================
       CURRENT LANGUAGE
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


    /* ======================================================
       NORMALIZE LANGUAGE
    ====================================================== */

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


        return language ===
            "id"
                ? "id"
                : "zh";

    }


    /* ======================================================
       IDENTIFIER
    ====================================================== */

    function normalizeIdentifier(
        value
    ) {

        return String(
            value ??
            ""
        )
            .trim()
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );

    }


    /* ======================================================
       TEXT
    ====================================================== */

    function normalizeText(
        value
    ) {

        return String(
            value ??
            ""
        ).trim();

    }


    /* ======================================================
       SEARCH TEXT
    ====================================================== */

    function normalizeSearchText(
        value
    ) {

        return normalizeText(
            value
        )
            .toLocaleLowerCase()
            .replace(
                /\s+/g,
                " "
            );

    }


    /* ======================================================
       ASSET PATH
    ====================================================== */

    function normalizeAssetPath(
        value
    ) {

        const path =
            normalizeText(
                value
            );


        if (!path) {

            return "";

        }


        /*
         * Path disimpan relatif terhadap root website.
         * Resolusi menuju ../ dilakukan oleh GomaiUtils /
         * component saat digunakan pada halaman di /pages.
         */
        return path
            .replace(
                /^\.\/+/,
                ""
            )
            .replace(
                /^\/+/,
                ""
            );

    }


    /* ======================================================
       BOOLEAN
    ====================================================== */

    function normalizeBoolean(
        value,
        fallback = false
    ) {

        if (
            value === undefined ||
            value === null
        ) {

            return Boolean(
                fallback
            );

        }


        if (
            typeof value ===
            "string"
        ) {

            const normalized =
                value
                    .trim()
                    .toLowerCase();


            if (
                [
                    "false",
                    "0",
                    "no",
                    "off"
                ].includes(
                    normalized
                )
            ) {

                return false;

            }


            if (
                [
                    "true",
                    "1",
                    "yes",
                    "on"
                ].includes(
                    normalized
                )
            ) {

                return true;

            }

        }


        return Boolean(
            value
        );

    }


    /* ======================================================
       COLOR
    ====================================================== */

    function normalizeColor(
        value,
        fallback
    ) {

        const color =
            normalizeText(
                value
            );


        return (
            color ||
            fallback
        );

    }


    /* ======================================================
       ORDER
    ====================================================== */

    function normalizeOrder(
        value,
        fallback =
            DEFAULT_SORT_ORDER
    ) {

        if (
            value === "" ||
            value === null ||
            value === undefined
        ) {

            return fallback;

        }


        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : fallback;

    }


    /* ======================================================
       SORT BY GENERAL ORDER
    ====================================================== */

    function compareBySortOrder(
        firstBrand,
        secondBrand
    ) {

        const firstOrder =
            normalizeOrder(
                firstBrand
                    ?.sortOrder
            );


        const secondOrder =
            normalizeOrder(
                secondBrand
                    ?.sortOrder
            );


        const orderDifference =
            firstOrder -
            secondOrder;


        if (
            orderDifference !==
            0
        ) {

            return orderDifference;

        }


        return compareBrandNames(
            firstBrand,
            secondBrand
        );

    }


    /* ======================================================
       SORT BY DISPLAY ORDER
    ====================================================== */

    function compareByDisplayOrder(
        firstBrand,
        secondBrand,
        orderKey
    ) {

        const firstOrder =
            normalizeOrder(
                firstBrand
                    ?.display
                    ?.[orderKey],
                firstBrand
                    ?.sortOrder
            );


        const secondOrder =
            normalizeOrder(
                secondBrand
                    ?.display
                    ?.[orderKey],
                secondBrand
                    ?.sortOrder
            );


        const difference =
            firstOrder -
            secondOrder;


        if (
            difference !==
            0
        ) {

            return difference;

        }


        return compareBySortOrder(
            firstBrand,
            secondBrand
        );

    }


    /* ======================================================
       SORT BRAND NAME
    ====================================================== */

    function compareBrandNames(
        firstBrand,
        secondBrand
    ) {

        return normalizeText(
            firstBrand
                ?.name
        )
            .localeCompare(
                normalizeText(
                    secondBrand
                        ?.name
                ),
                undefined,
                {

                    sensitivity:
                        "base",

                    numeric:
                        true

                }
            );

    }


    /* ======================================================
       APPLY LIMIT
    ====================================================== */

    function applyLimit(
        values,
        limit
    ) {

        const collection =
            Array.isArray(
                values
            )
                ? values
                : [];


        const normalizedLimit =
            Number(
                limit
            );


        const result =
            Number.isInteger(
                normalizedLimit
            ) &&
            normalizedLimit > 0
                ? collection.slice(
                    0,
                    normalizedLimit
                )
                : collection;


        return cloneData(
            result
        );

    }


    /* ======================================================
       PLAIN OBJECT
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


    /* ======================================================
       CLONE DATA
    ====================================================== */

    function cloneData(
        value
    ) {

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
                 * Lanjut ke structuredClone.
                 */

            }

        }


        if (
            typeof structuredClone ===
            "function"
        ) {

            try {

                return structuredClone(
                    value
                );

            } catch (_error) {

                /*
                 * Lanjut ke JSON clone.
                 */

            }

        }


        if (
            value === undefined
        ) {

            return undefined;

        }


        return JSON.parse(
            JSON.stringify(
                value
            )
        );

    }


    /* ======================================================
       ERROR
    ====================================================== */

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
                "Terjadi kesalahan pada BrandsModel."
            )
        );

    }


    /* ======================================================
       EVENT DISPATCH
    ====================================================== */

    function dispatch(
        eventName,
        detail = {}
    ) {

        return document.dispatchEvent(
            new CustomEvent(
                eventName,
                {

                    detail: {

                        model:
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


    /* ======================================================
       PUBLIC API
    ====================================================== */

    const publicAPI =
        Object.freeze({

            version:
                VERSION,


            events:
                EVENTS,


            load,

            reload,


            getAll,

            getActive,


            getById,

            getBySlug,

            find,


            getFeatured,

            getHero,

            getNavigation,


            search,


            hasLoaded,

            getLastLoadedAt,

            getLastError,


            clearCache

        });


    return publicAPI;

})();


window.BrandsModel =
    BrandsModel;