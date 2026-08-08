"use strict";

/* ==========================================================
   GOMAI PRODUCTS MODEL
   js/models/products.js

   Tanggung jawab:
   - Membaca data/products.json
   - Memvalidasi dan menormalisasi produk
   - Menyimpan cache produk
   - Mencegah request load ganda
   - Menangani stale request setelah clearCache()
   - Menyediakan filter brand dan kategori
   - Menyediakan pencarian bilingual
   - Menyediakan sorting produk
   - Menyediakan produk featured/homepage/newest
   - Menyediakan produk terkait
   - Menjadi sumber data tunggal seluruh UI produk

   Struktur utama:

   {
       id,
       slug,

       brandId,
       categoryIds,

       name,
       description,
       shortDescription,

       price,
       compareAtPrice,
       currency,

       active,

       inventory,

       colors,
       sizes,

       display,

       tags,
       keywords,

       specifications,

       sortOrder,
       createdAt,
       updatedAt
   }

   Compatibility properties:

   product.brand
   product.category
   product.stock
   product.featured
   product.showOnHomepage
   product.featuredOrder
   product.homepageOrder
========================================================== */

const ProductsModel = (() => {

    const VERSION =
        "3.1.0";


    /* ======================================================
       CONSTANTS
    ====================================================== */

    const DEFAULT_SORT_ORDER =
        9999;


    const DEFAULT_CATEGORY =
        "uncategorized";


    const DEFAULT_CURRENCY =
        "IDR";


    const DEFAULT_RELATED_LIMIT =
        4;


    const EVENTS =
        Object.freeze({

            LOADING:
                "gomai:products-model-loading",

            LOADED:
                "gomai:products-model-loaded",

            ERROR:
                "gomai:products-model-error",

            CACHE_CLEARED:
                "gomai:products-model-cache-cleared",

            STALE_LOAD:
                "gomai:products-model-stale-load"

        });


    /* ======================================================
       INTERNAL STATE
    ====================================================== */

    let products =
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
     * Setiap clearCache() menaikkan generation.
     *
     * Request yang dimulai pada generation lama tidak
     * diperbolehkan mengisi kembali cache setelah clear.
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
         * Load biasa cukup menunggu request yang sedang aktif.
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
         * load lama untuk menghindari race condition.
         */
        if (
            loadingPromise &&
            force
        ) {

            try {

                await loadingPromise;

            } catch (_error) {

                /*
                 * Reload paksa tetap dilanjutkan apabila
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
                                "products"
                            )
                    );


            const rawProducts =
                extractRawProducts(
                    data
                );


            const normalizedProducts =
                normalizeProductCollection(
                    rawProducts
                );


            /*
             * Cache telah berubah sejak request dimulai.
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


            products =
                normalizedProducts;


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
                        products.length,


                    activeCount:
                        products.filter(
                            product =>
                                product.active
                        ).length,


                    inStockCount:
                        products.filter(
                            product =>
                                product.active &&
                                product.stock
                        ).length,


                    featuredCount:
                        products.filter(
                            product =>
                                product.active &&
                                product.featured
                        ).length,


                    homepageCount:
                        products.filter(
                            product =>
                                product.active &&
                                product
                                    .showOnHomepage
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
             * Error dari request yang sudah stale tidak
             * diperbolehkan mengubah state terbaru.
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


            products =
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
       RAW DATA EXTRACTION
    ====================================================== */

    function extractRawProducts(
        data
    ) {

        /*
         * Format resmi:
         *
         * {
         *     "products": [...]
         * }
         */
        if (
            isPlainObject(
                data
            ) &&
            Array.isArray(
                data.products
            )
        ) {

            return data.products;

        }


        /*
         * Compatibility untuk JSON lama yang langsung
         * berbentuk array.
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

    function normalizeProductCollection(
        rawProducts
    ) {

        if (
            !Array.isArray(
                rawProducts
            )
        ) {

            return [];

        }


        const normalizedProducts =
            [];


        const usedIds =
            new Set();


        const usedSlugs =
            new Set();


        rawProducts.forEach(
            (
                rawProduct,
                index
            ) => {

                if (
                    !isValidRawProduct(
                        rawProduct
                    )
                ) {

                    console.warn(
                        `ProductsModel: produk pada index ${index} tidak valid dan dilewati.`,
                        rawProduct
                    );


                    return;

                }


                const product =
                    normalizeProduct(
                        rawProduct
                    );


                const idKey =
                    product.id
                        .toLowerCase();


                const slugKey =
                    product.slug
                        .toLowerCase();


                if (
                    usedIds.has(
                        idKey
                    )
                ) {

                    console.warn(
                        `ProductsModel: ID produk duplikat "${product.id}" dilewati.`
                    );


                    return;

                }


                if (
                    usedSlugs.has(
                        slugKey
                    )
                ) {

                    console.warn(
                        `ProductsModel: slug produk duplikat "${product.slug}" dilewati.`
                    );


                    return;

                }


                usedIds.add(
                    idKey
                );


                usedSlugs.add(
                    slugKey
                );


                normalizedProducts.push(
                    product
                );

            }
        );


        return normalizedProducts.sort(
            compareBySortOrder
        );

    }


    /* ======================================================
       RAW PRODUCT VALIDATION
    ====================================================== */

    function isValidRawProduct(
        product
    ) {

        if (
            !isPlainObject(
                product
            )
        ) {

            return false;

        }


        const id =
            normalizeIdentifier(
                product.id
            );


        const brandId =
            normalizeIdentifier(
                product.brandId ||
                product.brand
            );


        return Boolean(
            id &&
            brandId
        );

    }


    /* ======================================================
       NORMALIZE PRODUCT
    ====================================================== */

    function normalizeProduct(
        product
    ) {

        const id =
            normalizeIdentifier(
                product.id
            );


        const slug =
            normalizeIdentifier(
                product.slug ||
                id
            );


        const brandId =
            normalizeIdentifier(
                product.brandId ||
                product.brand
            );


        const categoryIds =
            normalizeCategoryIds(
                product
            );


        const name =
            normalizeLocalizedText(
                product.name,
                id
            );


        const description =
            normalizeLocalizedText(
                product.description
            );


        const shortDescription =
            normalizeLocalizedText(
                product.shortDescription
            );


        const price =
            normalizePrice(
                product.price
            );


        const compareAtPrice =
            normalizeOptionalPrice(
                product.compareAtPrice
            );


        const currency =
            normalizeCurrency(
                product.currency
            );


        const colors =
            normalizeColors(
                product.colors
            );


        const sizes =
            normalizeGlobalSizes(
                product.sizes
            );


        const inventory =
            normalizeInventory(
                product,
                colors,
                sizes
            );


        const display =
            normalizeDisplay(
                product
            );


        const tags =
            normalizeStringArray(
                product.tags
            );


        const keywords =
            normalizeStringArray(
                product.keywords
            );


        const specifications =
            normalizeSpecifications(
                product.specifications ||
                product.specification
            );


        const active =
            normalizeBoolean(
                product.active,
                true
            );


        const sortOrder =
            normalizeOrder(
                product.sortOrder
            );


        const createdAt =
            normalizeDateValue(
                product.createdAt
            );


        const updatedAt =
            normalizeDateValue(
                product.updatedAt
            );


        return Object.freeze({

            id,


            slug,


            brandId,


            categoryIds:
                Object.freeze([
                    ...categoryIds
                ]),


            name:
                Object.freeze({

                    ...name

                }),


            description:
                Object.freeze({

                    ...description

                }),


            shortDescription:
                Object.freeze({

                    ...shortDescription

                }),


            price,


            compareAtPrice,


            currency,


            active,


            inventory:
                freezeInventory(
                    inventory
                ),


            colors:
                Object.freeze(
                    colors.map(
                        freezeColor
                    )
                ),


            sizes:
                Object.freeze([
                    ...sizes
                ]),


            display:
                Object.freeze({

                    ...display

                }),


            tags:
                Object.freeze([
                    ...tags
                ]),


            keywords:
                Object.freeze([
                    ...keywords
                ]),


            specifications:
                Object.freeze(
                    specifications.map(
                        freezeSpecification
                    )
                ),


            sortOrder,


            createdAt,


            updatedAt,


            /* ==========================================
               BACKWARD COMPATIBILITY
            ========================================== */

            brand:
                brandId,


            category:
                categoryIds[0] ||
                DEFAULT_CATEGORY,


            stock:
                inventory.inStock,


            featured:
                display.featured,


            showOnHomepage:
                display.showOnHomepage,


            featuredOrder:
                display.featuredOrder,


            homepageOrder:
                display.homepageOrder,


            newArrival:
                display.newArrival,


            popular:
                display.popular

        });

    }


    /* ======================================================
       CATEGORY IDS
    ====================================================== */

    function normalizeCategoryIds(
        product
    ) {

        let values =
            [];


        if (
            Array.isArray(
                product.categoryIds
            )
        ) {

            values =
                product.categoryIds;

        } else if (
            Array.isArray(
                product.categories
            )
        ) {

            values =
                product.categories;

        } else if (
            product.category
        ) {

            values = [
                product.category
            ];

        }


        const normalized =
            normalizeIdentifierArray(
                values
            );


        return normalized.length >
            0
                ? normalized
                : [
                    DEFAULT_CATEGORY
                ];

    }


    /* ======================================================
       COLORS
    ====================================================== */

    function normalizeColors(
        values
    ) {

        if (
            !Array.isArray(
                values
            )
        ) {

            return [];

        }


        const result =
            [];


        const usedIds =
            new Set();


        values.forEach(
            (
                value,
                index
            ) => {

                const color =
                    normalizeColorVariant(
                        value,
                        index
                    );


                if (
                    !color.id
                ) {

                    return;

                }


                const key =
                    color.id
                        .toLowerCase();


                if (
                    usedIds.has(
                        key
                    )
                ) {

                    return;

                }


                usedIds.add(
                    key
                );


                result.push(
                    color
                );

            }
        );


        return result;

    }


    /* ======================================================
       COLOR VARIANT
    ====================================================== */

    function normalizeColorVariant(
        color,
        index = 0
    ) {

        /*
         * Compatibility:
         *
         * "black"
         */
        if (
            typeof color ===
            "string"
        ) {

            const id =
                normalizeIdentifier(
                    color
                );


            return {

                id,


                name:
                    normalizeLocalizedText(
                        color,
                        id
                    ),


                hex:
                    "",


                images:
                    [],


                sizes:
                    [],


                quantity:
                    0,


                inStock:
                    false,


                sortOrder:
                    index

            };

        }


        const source =
            isPlainObject(
                color
            )
                ? color
                : {};


        const id =
            normalizeIdentifier(

                source.id ||

                source.slug ||

                (
                    isPlainObject(
                        source.name
                    )
                        ? (
                            source.name.id ||
                            source.name.zh
                        )
                        : source.name
                )

            );


        const name =
            normalizeLocalizedText(
                source.name,
                id
            );


        const images =
            normalizeAssetArray(
                source.images ||
                source.gallery
            );


        const sizes =
            normalizeVariantSizes(
                source.sizes
            );


        const quantityFromSizes =
            sizes.reduce(
                (
                    total,
                    size
                ) =>
                    total +
                    size.quantity,
                0
            );


        const explicitQuantity =
            normalizeOptionalNonNegativeNumber(
                source.quantity
            );


        const quantity =
            explicitQuantity !==
            null
                ? explicitQuantity
                : quantityFromSizes;


        const inferredStock =
            quantity > 0 ||
            sizes.some(
                size =>
                    size.inStock
            );


        const inStock =
            normalizeBoolean(
                source.inStock,
                inferredStock
            );


        return {

            id,


            name,


            hex:
                normalizeText(

                    source.hex ||

                    source.color ||

                    source.value

                ),


            images,


            sizes,


            quantity,


            inStock,


            sortOrder:
                normalizeOrder(
                    source.sortOrder,
                    index
                )

        };

    }


    /* ======================================================
       VARIANT SIZES
    ====================================================== */

    function normalizeVariantSizes(
        values
    ) {

        if (
            !Array.isArray(
                values
            )
        ) {

            return [];

        }


        const result =
            [];


        const usedIds =
            new Set();


        values.forEach(
            (
                value,
                index
            ) => {

                const size =
                    normalizeVariantSize(
                        value,
                        index
                    );


                if (
                    !size.id
                ) {

                    return;

                }


                const key =
                    size.id
                        .toLowerCase();


                if (
                    usedIds.has(
                        key
                    )
                ) {

                    return;

                }


                usedIds.add(
                    key
                );


                result.push(
                    size
                );

            }
        );


        return result;

    }


    /* ======================================================
       VARIANT SIZE
    ====================================================== */

    function normalizeVariantSize(
        value,
        index = 0
    ) {

        if (
            typeof value ===
                "string" ||
            typeof value ===
                "number"
        ) {

            const id =
                normalizeText(
                    value
                );


            return {

                id,


                quantity:
                    0,


                inStock:
                    false,


                sortOrder:
                    index

            };

        }


        const source =
            isPlainObject(
                value
            )
                ? value
                : {};


        const id =
            normalizeText(

                source.id ||

                source.name ||

                source.size

            );


        const quantity =
            normalizeNonNegativeNumber(
                source.quantity
            );


        const inStock =
            normalizeBoolean(
                source.inStock,
                quantity > 0
            );


        return {

            id,


            quantity,


            inStock,


            sortOrder:
                normalizeOrder(
                    source.sortOrder,
                    index
                )

        };

    }


    /* ======================================================
       GLOBAL SIZES
    ====================================================== */

    function normalizeGlobalSizes(
        values
    ) {

        if (
            !Array.isArray(
                values
            )
        ) {

            return [];

        }


        const result =
            [];


        const used =
            new Set();


        values.forEach(
            value => {

                let size =
                    "";


                if (
                    typeof value ===
                        "string" ||
                    typeof value ===
                        "number"
                ) {

                    size =
                        normalizeText(
                            value
                        );

                } else if (
                    isPlainObject(
                        value
                    )
                ) {

                    size =
                        normalizeText(

                            value.id ||

                            value.name ||

                            value.size

                        );

                }


                if (!size) {

                    return;

                }


                const key =
                    size.toLowerCase();


                if (
                    used.has(
                        key
                    )
                ) {

                    return;

                }


                used.add(
                    key
                );


                result.push(
                    size
                );

            }
        );


        return result;

    }


    /* ======================================================
       INVENTORY
    ====================================================== */

    function normalizeInventory(
        product,
        colors,
        sizes
    ) {

        const source =
            isPlainObject(
                product.inventory
            )
                ? product.inventory
                : {};


        const variantQuantity =
            colors.reduce(
                (
                    total,
                    color
                ) =>
                    total +
                    normalizeNonNegativeNumber(
                        color.quantity
                    ),
                0
            );


        const explicitQuantity =
            normalizeOptionalNonNegativeNumber(
                source.quantity
            );


        const quantity =
            explicitQuantity !==
            null
                ? explicitQuantity
                : variantQuantity;


        const variantStock =
            colors.some(
                color =>
                    color.inStock
            );


        let inStock;


        if (
            source.inStock !==
            undefined
        ) {

            inStock =
                normalizeBoolean(
                    source.inStock,
                    false
                );

        } else if (
            product.stock !==
            undefined
        ) {

            inStock =
                normalizeBoolean(
                    product.stock,
                    false
                );

        } else {

            inStock =
                quantity > 0 ||
                variantStock;

        }


        const trackQuantity =
            normalizeBoolean(
                source.trackQuantity,
                explicitQuantity !==
                    null ||
                variantQuantity > 0
            );


        const allowBackorder =
            normalizeBoolean(
                source.allowBackorder,
                false
            );


        return {

            inStock,


            quantity,


            trackQuantity,


            allowBackorder,


            status:
                normalizeInventoryStatus(
                    source.status,
                    inStock
                ),


            hasVariants:
                colors.length > 0 ||
                sizes.length > 0

        };

    }


    /* ======================================================
       INVENTORY STATUS
    ====================================================== */

    function normalizeInventoryStatus(
        status,
        inStock
    ) {

        const normalized =
            normalizeIdentifier(
                status
            );


        if (
            normalized
        ) {

            return normalized;

        }


        return inStock
            ? "in-stock"
            : "out-of-stock";

    }


    /* ======================================================
       DISPLAY
    ====================================================== */

    function normalizeDisplay(
        product
    ) {

        const source =
            isPlainObject(
                product.display
            )
                ? product.display
                : {};


        const fallbackOrder =
            normalizeOrder(
                product.sortOrder
            );


        const featured =
            normalizeBoolean(
                source.featured,
                normalizeBoolean(
                    product.featured,
                    false
                )
            );


        const showOnHomepage =
            normalizeBoolean(
                source.showOnHomepage,
                featured
            );


        const newArrival =
            normalizeBoolean(
                source.newArrival,
                normalizeBoolean(
                    product.newArrival,
                    false
                )
            );


        const popular =
            normalizeBoolean(
                source.popular,
                normalizeBoolean(
                    product.popular,
                    false
                )
            );


        return {

            featured,


            featuredOrder:
                normalizeOrder(
                    source.featuredOrder,
                    normalizeOrder(
                        product.featuredOrder,
                        fallbackOrder
                    )
                ),


            showOnHomepage,


            homepageOrder:
                normalizeOrder(
                    source.homepageOrder,
                    normalizeOrder(
                        product.homepageOrder,
                        fallbackOrder
                    )
                ),


            newArrival,


            popular

        };

    }


    /* ======================================================
       SPECIFICATIONS
    ====================================================== */

    function normalizeSpecifications(
        values
    ) {

        if (
            !values
        ) {

            return [];

        }


        /*
         * Format array:
         *
         * [
         *   {
         *      label: { id, zh },
         *      value: { id, zh }
         *   }
         * ]
         */
        if (
            Array.isArray(
                values
            )
        ) {

            return values
                .map(
                    normalizeSpecification
                )
                .filter(
                    specification =>
                        Boolean(
                            specification.label.id ||
                            specification.label.zh
                        )
                );

        }


        /*
         * Compatibility format object:
         *
         * {
         *    material: "Polyester",
         *    fit: "Regular"
         * }
         */
        if (
            isPlainObject(
                values
            )
        ) {

            return Object.entries(
                values
            )
                .map(
                    ([
                        key,
                        value
                    ]) =>
                        normalizeSpecification({

                            key,

                            label:
                                key,

                            value

                        })
                )
                .filter(
                    specification =>
                        Boolean(
                            specification.label.id ||
                            specification.label.zh
                        )
                );

        }


        return [];

    }


    /* ======================================================
       SPECIFICATION
    ====================================================== */

    function normalizeSpecification(
        value
    ) {

        const source =
            isPlainObject(
                value
            )
                ? value
                : {};


        const key =
            normalizeIdentifier(

                source.key ||

                source.id ||

                (
                    typeof source.label ===
                    "string"
                        ? source.label
                        : ""
                )

            );


        const label =
            normalizeLocalizedText(
                source.label ||
                source.name ||
                source.key ||
                source.id
            );


        const specificationValue =
            normalizeLocalizedText(
                source.value ||
                source.description
            );


        return {

            key,


            label,


            value:
                specificationValue

        };

    }


    /* ======================================================
       PUBLIC: GET ALL
    ====================================================== */

    async function getAll() {

        await ensureLoaded();


        return getActiveSnapshot();

    }


    /* ======================================================
       PUBLIC: GET ACTIVE
    ====================================================== */

    async function getActive(
        limit = null
    ) {

        await ensureLoaded();


        return applyLimit(
            products
                .filter(
                    product =>
                        product.active
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
            products
                .filter(
                    product =>
                        product.active
                )
                .sort(
                    compareBySortOrder
                )
        );

    }


    /* ======================================================
       PUBLIC: GET BY ID
    ====================================================== */

    async function getById(
        productId
    ) {

        await ensureLoaded();


        const lookup =
            normalizeIdentifier(
                productId
            );


        if (
            !lookup
        ) {

            return null;

        }


        const product =
            products.find(
                item =>
                    item.active &&
                    item.id ===
                        lookup
            );


        return product
            ? cloneData(
                product
            )
            : null;

    }


    /* ======================================================
       PUBLIC: GET BY SLUG
    ====================================================== */

    async function getBySlug(
        slug
    ) {

        await ensureLoaded();


        const lookup =
            normalizeIdentifier(
                slug
            );


        if (
            !lookup
        ) {

            return null;

        }


        const product =
            products.find(
                item =>
                    item.active &&
                    item.slug ===
                        lookup
            );


        return product
            ? cloneData(
                product
            )
            : null;

    }


    /* ======================================================
       PUBLIC: FIND
    ====================================================== */

    async function find(
        value
    ) {

        await ensureLoaded();


        const lookup =
            normalizeIdentifier(
                value
            );


        if (
            !lookup
        ) {

            return null;

        }


        const product =
            products.find(
                item =>
                    item.active &&
                    (
                        item.id ===
                            lookup ||
                        item.slug ===
                            lookup
                    )
            );


        return product
            ? cloneData(
                product
            )
            : null;

    }


    /* ======================================================
       PUBLIC: GET BY BRAND
    ====================================================== */

    async function getByBrand(
        brandId,
        options = {}
    ) {

        await ensureLoaded();


        const normalizedBrand =
            normalizeIdentifier(
                brandId
            );


        if (
            !normalizedBrand
        ) {

            return [];

        }


        const settings =
            isPlainObject(
                options
            )
                ? options
                : {};


        const category =
            normalizeIdentifier(

                settings.categoryId ||

                settings.category

            );


        let results =
            products.filter(
                product => {

                    if (
                        !product.active
                    ) {

                        return false;

                    }


                    if (
                        product.brandId !==
                        normalizedBrand
                    ) {

                        return false;

                    }


                    if (
                        category &&
                        !product
                            .categoryIds
                            .includes(
                                category
                            )
                    ) {

                        return false;

                    }


                    if (
                        settings.stockOnly ===
                        true &&
                        !product.stock
                    ) {

                        return false;

                    }


                    if (
                        settings.featuredOnly ===
                        true &&
                        !product.featured
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        results =
            sort(
                results,
                settings.sort ||
                    "default",
                settings.language ||
                    getCurrentLanguage()
            );


        return applyLimit(
            results,
            settings.limit
        );

    }


    /* ======================================================
       PUBLIC: GET BY CATEGORY
    ====================================================== */

    async function getByCategory(
        categoryId,
        options = {}
    ) {

        await ensureLoaded();


        const normalizedCategory =
            normalizeIdentifier(
                categoryId
            );


        if (
            !normalizedCategory
        ) {

            return [];

        }


        const settings =
            isPlainObject(
                options
            )
                ? options
                : {};


        const brandId =
            normalizeIdentifier(

                settings.brandId ||

                settings.brand

            );


        let results =
            products.filter(
                product => {

                    if (
                        !product.active
                    ) {

                        return false;

                    }


                    if (
                        brandId &&
                        product.brandId !==
                            brandId
                    ) {

                        return false;

                    }


                    if (
                        !product
                            .categoryIds
                            .includes(
                                normalizedCategory
                            )
                    ) {

                        return false;

                    }


                    if (
                        settings.stockOnly ===
                        true &&
                        !product.stock
                    ) {

                        return false;

                    }


                    if (
                        settings.featuredOnly ===
                        true &&
                        !product.featured
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        results =
            sort(
                results,
                settings.sort ||
                    "default",
                settings.language ||
                    getCurrentLanguage()
            );


        return applyLimit(
            results,
            settings.limit
        );

    }


    /* ======================================================
       PUBLIC: FEATURED
    ====================================================== */

    async function getFeatured(
        limit = null
    ) {

        await ensureLoaded();


        const results =
            products
                .filter(
                    product =>
                        product.active &&
                        product.display
                            .featured
                )
                .sort(
                    (
                        firstProduct,
                        secondProduct
                    ) =>
                        compareByDisplayOrder(
                            firstProduct,
                            secondProduct,
                            "featuredOrder"
                        )
                );


        return applyLimit(
            results,
            limit
        );

    }


    /* ======================================================
       PUBLIC: HOMEPAGE
    ====================================================== */

    async function getHomepage(
        limit = null
    ) {

        await ensureLoaded();


        const results =
            products
                .filter(
                    product =>
                        product.active &&
                        product.display
                            .showOnHomepage
                )
                .sort(
                    (
                        firstProduct,
                        secondProduct
                    ) =>
                        compareByDisplayOrder(
                            firstProduct,
                            secondProduct,
                            "homepageOrder"
                        )
                );


        return applyLimit(
            results,
            limit
        );

    }


    /* ======================================================
       PUBLIC: IN STOCK
    ====================================================== */

    async function getInStock(
        limit = null
    ) {

        await ensureLoaded();


        const results =
            products
                .filter(
                    product =>
                        product.active &&
                        product.inventory
                            .inStock
                )
                .sort(
                    compareBySortOrder
                );


        return applyLimit(
            results,
            limit
        );

    }


    /* ======================================================
       PUBLIC: NEWEST
    ====================================================== */

    async function getNewest(
        limit = null
    ) {

        await ensureLoaded();


        const activeProducts =
            products.filter(
                product =>
                    product.active
            );


        const explicitlyMarked =
            activeProducts.filter(
                product =>
                    product.display
                        .newArrival
            );


        const source =
            explicitlyMarked.length >
            0
                ? explicitlyMarked
                : activeProducts;


        const results =
            [
                ...source
            ].sort(
                (
                    firstProduct,
                    secondProduct
                ) => {

                    const firstDate =
                        firstProduct
                            .createdAt ||
                        0;


                    const secondDate =
                        secondProduct
                            .createdAt ||
                        0;


                    const difference =
                        secondDate -
                        firstDate;


                    if (
                        difference !==
                        0
                    ) {

                        return difference;

                    }


                    return compareBySortOrder(
                        firstProduct,
                        secondProduct
                    );

                }
            );


        return applyLimit(
            results,
            limit
        );

    }


    /* ======================================================
       PUBLIC: GET CATEGORIES

       Tidak membutuhkan CategoriesModel.

       Kategori dihasilkan langsung dari categoryIds
       seluruh produk aktif.
    ====================================================== */

    async function getCategories(
        brandId = null
    ) {

        await ensureLoaded();


        const normalizedBrand =
            normalizeIdentifier(
                brandId
            );


        const categories =
            new Set();


        products.forEach(
            product => {

                if (
                    !product.active
                ) {

                    return;

                }


                if (
                    normalizedBrand &&
                    product.brandId !==
                        normalizedBrand
                ) {

                    return;

                }


                product.categoryIds
                    .forEach(
                        categoryId => {

                            if (
                                categoryId
                            ) {

                                categories.add(
                                    categoryId
                                );

                            }

                        }
                    );

            }
        );


        return Array.from(
            categories
        ).sort(
            (
                first,
                second
            ) =>
                first.localeCompare(
                    second,
                    undefined,
                    {

                        sensitivity:
                            "base",

                        numeric:
                            true

                    }
                )
        );

    }


    /* ======================================================
       PUBLIC: SEARCH
    ====================================================== */

    async function search(
        query,
        options = {}
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


        const settings =
            isPlainObject(
                options
            )
                ? options
                : {};


        const language =
            normalizeLanguage(
                settings.language ||
                getCurrentLanguage()
            );


        const brandFilter =
            normalizeIdentifier(

                settings.brandId ||

                settings.brand

            );


        const categoryFilter =
            normalizeIdentifier(

                settings.categoryId ||

                settings.category

            );


        const stockOnly =
            settings.stockOnly ===
            true;


        const featuredOnly =
            settings.featuredOnly ===
            true;


        let results =
            products.filter(
                product => {

                    if (
                        !product.active
                    ) {

                        return false;

                    }


                    if (
                        brandFilter &&
                        product.brandId !==
                            brandFilter
                    ) {

                        return false;

                    }


                    if (
                        categoryFilter &&
                        !product
                            .categoryIds
                            .includes(
                                categoryFilter
                            )
                    ) {

                        return false;

                    }


                    if (
                        stockOnly &&
                        !product.stock
                    ) {

                        return false;

                    }


                    if (
                        featuredOnly &&
                        !product.featured
                    ) {

                        return false;

                    }


                    return buildSearchText(
                        product,
                        language
                    )
                        .includes(
                            keyword
                        );

                }
            );


        results =
            sort(
                results,
                settings.sort ||
                    "default",
                language
            );


        return applyLimit(
            results,
            settings.limit
        );

    }


    /* ======================================================
       BUILD SEARCH TEXT
    ====================================================== */

    function buildSearchText(
        product,
        language
    ) {

        const localizedName =
            getLocalizedValue(
                product.name,
                language
            );


        const localizedDescription =
            getLocalizedValue(
                product.description,
                language
            );


        const localizedShortDescription =
            getLocalizedValue(
                product.shortDescription,
                language
            );


        const colorText =
            product.colors
                .flatMap(
                    color => [

                        color.id,

                        color.name.id,

                        color.name.zh

                    ]
                )
                .join(" ");


        const specificationText =
            product.specifications
                .flatMap(
                    specification => [

                        specification.key,

                        specification.label.id,

                        specification.label.zh,

                        specification.value.id,

                        specification.value.zh

                    ]
                )
                .join(" ");


        /*
         * Kedua bahasa tetap dimasukkan ke indeks.
         *
         * Ini penting karena pengguna dapat mengetik nama
         * Indonesia walaupun UI sedang Mandarin, atau
         * sebaliknya.
         */
        return [

            product.id,

            product.slug,

            product.brandId,

            product.categoryIds
                .join(" "),

            localizedName,

            product.name.id,

            product.name.zh,

            localizedDescription,

            product.description.id,

            product.description.zh,

            localizedShortDescription,

            product.shortDescription.id,

            product.shortDescription.zh,

            colorText,

            product.sizes
                .join(" "),

            product.tags
                .join(" "),

            product.keywords
                .join(" "),

            specificationText

        ]
            .map(
                normalizeSearchText
            )
            .filter(
                Boolean
            )
            .join(" ");

    }


    /* ======================================================
       PUBLIC: SORT
    ====================================================== */

    function sort(
        productList,
        sortType = "default",
        language =
            getCurrentLanguage()
    ) {

        const normalizedLanguage =
            normalizeLanguage(
                language
            );


        const type =
            normalizeIdentifier(
                sortType
            );


        const sortedProducts =
            cloneData(
                Array.isArray(
                    productList
                )
                    ? productList
                    : []
            );


        switch (
            type
        ) {

            case "price-low":

                return sortedProducts
                    .sort(
                        (
                            firstProduct,
                            secondProduct
                        ) => {

                            const difference =
                                normalizePrice(
                                    firstProduct
                                        .price
                                ) -
                                normalizePrice(
                                    secondProduct
                                        .price
                                );


                            if (
                                difference !==
                                0
                            ) {

                                return difference;

                            }


                            return compareBySortOrder(
                                firstProduct,
                                secondProduct
                            );

                        }
                    );


            case "price-high":

                return sortedProducts
                    .sort(
                        (
                            firstProduct,
                            secondProduct
                        ) => {

                            const difference =
                                normalizePrice(
                                    secondProduct
                                        .price
                                ) -
                                normalizePrice(
                                    firstProduct
                                        .price
                                );


                            if (
                                difference !==
                                0
                            ) {

                                return difference;

                            }


                            return compareBySortOrder(
                                firstProduct,
                                secondProduct
                            );

                        }
                    );


            case "name-asc":

                return sortedProducts
                    .sort(
                        (
                            firstProduct,
                            secondProduct
                        ) =>
                            compareProductNames(
                                firstProduct,
                                secondProduct,
                                normalizedLanguage
                            )
                    );


            case "name-desc":

                return sortedProducts
                    .sort(
                        (
                            firstProduct,
                            secondProduct
                        ) =>
                            compareProductNames(
                                secondProduct,
                                firstProduct,
                                normalizedLanguage
                            )
                    );


            case "newest":

                return sortedProducts
                    .sort(
                        compareNewest
                    );


            case "featured":

                return sortedProducts
                    .sort(
                        (
                            firstProduct,
                            secondProduct
                        ) => {

                            if (
                                firstProduct
                                    .featured !==
                                secondProduct
                                    .featured
                            ) {

                                return firstProduct
                                    .featured
                                    ? -1
                                    : 1;

                            }


                            return compareByDisplayOrder(
                                firstProduct,
                                secondProduct,
                                "featuredOrder"
                            );

                        }
                    );


            case "homepage":

                return sortedProducts
                    .sort(
                        (
                            firstProduct,
                            secondProduct
                        ) =>
                            compareByDisplayOrder(
                                firstProduct,
                                secondProduct,
                                "homepageOrder"
                            )
                    );


            case "stock":

            case "in-stock":

                return sortedProducts
                    .sort(
                        (
                            firstProduct,
                            secondProduct
                        ) => {

                            if (
                                firstProduct
                                    .stock !==
                                secondProduct
                                    .stock
                            ) {

                                return firstProduct
                                    .stock
                                    ? -1
                                    : 1;

                            }


                            return compareBySortOrder(
                                firstProduct,
                                secondProduct
                            );

                        }
                    );


            case "default":

            default:

                return sortedProducts
                    .sort(
                        compareBySortOrder
                    );

        }

    }


    /* ======================================================
       RELATED PRODUCTS
    ====================================================== */

    async function getRelated(
        productId,
        limit =
            DEFAULT_RELATED_LIMIT
    ) {

        await ensureLoaded();


        const lookup =
            normalizeIdentifier(
                productId
            );


        if (
            !lookup
        ) {

            return [];

        }


        /*
         * Cari langsung pada cache supaya tidak perlu
         * memanggil find() dan ensureLoaded() lagi.
         */
        const currentProduct =
            products.find(
                product =>
                    product.active &&
                    (
                        product.id ===
                            lookup ||
                        product.slug ===
                            lookup
                    )
            );


        if (
            !currentProduct
        ) {

            return [];

        }


        const scoredProducts =
            products
                .filter(
                    product =>
                        product.active &&
                        product.id !==
                            currentProduct.id
                )
                .map(
                    product => ({

                        product,


                        score:
                            calculateRelatedScore(
                                product,
                                currentProduct
                            )

                    })
                )
                .filter(
                    item =>
                        item.score >
                        0
                )
                .sort(
                    (
                        firstItem,
                        secondItem
                    ) => {

                        const scoreDifference =
                            secondItem.score -
                            firstItem.score;


                        if (
                            scoreDifference !==
                            0
                        ) {

                            return scoreDifference;

                        }


                        return compareBySortOrder(
                            firstItem.product,
                            secondItem.product
                        );

                    }
                )
                .map(
                    item =>
                        item.product
                );


        return applyLimit(
            scoredProducts,
            normalizePositiveInteger(
                limit,
                DEFAULT_RELATED_LIMIT
            )
        );

    }


    /* ======================================================
       RELATED SCORE
    ====================================================== */

    function calculateRelatedScore(
        product,
        currentProduct
    ) {

        let score =
            0;


        /* ==============================================
           SAME BRAND
        ============================================== */

        if (
            product.brandId ===
            currentProduct.brandId
        ) {

            score +=
                4;

        }


        /* ==============================================
           SHARED CATEGORIES
        ============================================== */

        const sharedCategories =
            product.categoryIds
                .filter(
                    categoryId =>
                        currentProduct
                            .categoryIds
                            .includes(
                                categoryId
                            )
                );


        score +=
            sharedCategories.length *
            3;


        /* ==============================================
           SHARED TAGS
        ============================================== */

        const currentTags =
            new Set(
                currentProduct.tags
                    .map(
                        value =>
                            value
                                .toLowerCase()
                    )
            );


        const sharedTags =
            product.tags
                .filter(
                    tag =>
                        currentTags.has(
                            tag.toLowerCase()
                        )
                );


        score +=
            sharedTags.length;


        /* ==============================================
           FEATURED
        ============================================== */

        if (
            product.featured
        ) {

            score +=
                1;

        }


        /* ==============================================
           STOCK
        ============================================== */

        if (
            product.stock
        ) {

            score +=
                1;

        }


        return score;

    }


    /* ======================================================
       STATUS
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

        cacheGeneration +=
            1;


        products =
            [];


        isLoaded =
            false;


        /*
         * Promise lama tetap boleh selesai, tetapi generation
         * check akan mencegah hasilnya menulis cache.
         */
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
                "ProductsModel membutuhkan GomaiUtils."
            );

        }


        if (
            typeof window.GomaiUtils
                .fetchJSON !==
                "function"
        ) {

            throw new Error(
                "ProductsModel membutuhkan GomaiUtils.fetchJSON()."
            );

        }


        if (
            typeof window.GomaiUtils
                .getDataPath !==
                "function"
        ) {

            throw new Error(
                "ProductsModel membutuhkan GomaiUtils.getDataPath()."
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

       Gomai final menggunakan:
       - zh
       - id

       Mandarin menjadi fallback utama.
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
       LOCALIZED VALUE
    ====================================================== */

    function getLocalizedValue(
        value,
        language =
            getCurrentLanguage()
    ) {

        if (
            typeof value ===
            "string"
        ) {

            return normalizeText(
                value
            );

        }


        if (
            !isPlainObject(
                value
            )
        ) {

            return "";

        }


        const normalizedLanguage =
            normalizeLanguage(
                language
            );


        return normalizeText(

            value[
                normalizedLanguage
            ] ||

            value.zh ||

            value.id

        );

    }


    /* ======================================================
       LOCALIZED PRODUCT NAME
    ====================================================== */

    function getLocalizedProductName(
        product,
        language
    ) {

        return (
            getLocalizedValue(
                product?.name,
                language
            ) ||
            normalizeText(
                product?.id
            )
        );

    }


    /* ======================================================
       NORMALIZE LOCALIZED TEXT
    ====================================================== */

    function normalizeLocalizedText(
        value,
        fallback = ""
    ) {

        const fallbackText =
            normalizeText(
                fallback
            );


        if (
            typeof value ===
            "string"
        ) {

            const text =
                normalizeText(
                    value
                ) ||
                fallbackText;


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


        return {

            id:
                idText ||
                zhText ||
                fallbackText,


            zh:
                zhText ||
                idText ||
                fallbackText

        };

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
       IDENTIFIER ARRAY
    ====================================================== */

    function normalizeIdentifierArray(
        values
    ) {

        if (
            !Array.isArray(
                values
            )
        ) {

            return [];

        }


        const result =
            [];


        const used =
            new Set();


        values.forEach(
            value => {

                const identifier =
                    normalizeIdentifier(
                        value
                    );


                if (
                    !identifier ||
                    used.has(
                        identifier
                    )
                ) {

                    return;

                }


                used.add(
                    identifier
                );


                result.push(
                    identifier
                );

            }
        );


        return result;

    }


    /* ======================================================
       STRING ARRAY
    ====================================================== */

    function normalizeStringArray(
        values
    ) {

        if (
            !Array.isArray(
                values
            )
        ) {

            return [];

        }


        const result =
            [];


        const used =
            new Set();


        values.forEach(
            value => {

                const text =
                    normalizeText(
                        value
                    );


                if (
                    !text
                ) {

                    return;

                }


                const key =
                    text.toLowerCase();


                if (
                    used.has(
                        key
                    )
                ) {

                    return;

                }


                used.add(
                    key
                );


                result.push(
                    text
                );

            }
        );


        return result;

    }


    /* ======================================================
       ASSET ARRAY
    ====================================================== */

    function normalizeAssetArray(
        values
    ) {

        if (
            typeof values ===
            "string"
        ) {

            values = [
                values
            ];

        }


        if (
            !Array.isArray(
                values
            )
        ) {

            return [];

        }


        const result =
            [];


        const used =
            new Set();


        values.forEach(
            value => {

                const path =
                    normalizeAssetPath(
                        value
                    );


                if (
                    !path ||
                    used.has(
                        path
                    )
                ) {

                    return;

                }


                used.add(
                    path
                );


                result.push(
                    path
                );

            }
        );


        return result;

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
         * URL eksternal dan data/blob URL tidak diubah.
         */
        if (
            /^(?:https?:|data:|blob:)/i
                .test(
                    path
                )
        ) {

            return path;

        }


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
       BOOLEAN
    ====================================================== */

    function normalizeBoolean(
        value,
        fallback = false
    ) {

        if (
            value === undefined ||
            value === null ||
            value === ""
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
                    "off",
                    "inactive"
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
                    "on",
                    "active"
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
       PRICE
    ====================================================== */

    function normalizePrice(
        value
    ) {

        const number =
            Number(
                value
            );


        return (
            Number.isFinite(
                number
            ) &&
            number >= 0
        )
            ? number
            : 0;

    }


    /* ======================================================
       OPTIONAL PRICE
    ====================================================== */

    function normalizeOptionalPrice(
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
            Number.isFinite(
                number
            ) &&
            number >= 0
        )
            ? number
            : null;

    }


    /* ======================================================
       CURRENCY
    ====================================================== */

    function normalizeCurrency(
        value
    ) {

        const currency =
            normalizeText(
                value
            )
                .toUpperCase();


        return (

            currency ||

            normalizeText(
                window.GomaiConfig
                    ?.currency
                    ?.code
            )
                .toUpperCase() ||

            DEFAULT_CURRENCY

        );

    }


    /* ======================================================
       NON-NEGATIVE NUMBER
    ====================================================== */

    function normalizeNonNegativeNumber(
        value,
        fallback = 0
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


        return (
            Number.isFinite(
                number
            ) &&
            number >= 0
        )
            ? number
            : fallback;

    }


    /* ======================================================
       OPTIONAL NON-NEGATIVE NUMBER
    ====================================================== */

    function normalizeOptionalNonNegativeNumber(
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
            Number.isFinite(
                number
            ) &&
            number >= 0
        )
            ? number
            : null;

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
       POSITIVE INTEGER
    ====================================================== */

    function normalizePositiveInteger(
        value,
        fallback
    ) {

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
            : fallback;

    }


    /* ======================================================
       DATE
    ====================================================== */

    function normalizeDateValue(
        value
    ) {

        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {

            return null;

        }


        if (
            typeof value ===
                "number" &&
            Number.isFinite(
                value
            )
        ) {

            return value;

        }


        const timestamp =
            Date.parse(
                String(
                    value
                )
            );


        return Number.isFinite(
            timestamp
        )
            ? timestamp
            : null;

    }


    /* ======================================================
       FREEZE COLOR
    ====================================================== */

    function freezeColor(
        color
    ) {

        return Object.freeze({

            ...color,


            name:
                Object.freeze({

                    ...color.name

                }),


            images:
                Object.freeze([
                    ...color.images
                ]),


            sizes:
                Object.freeze(
                    color.sizes.map(
                        size =>
                            Object.freeze({

                                ...size

                            })
                    )
                )

        });

    }


    /* ======================================================
       FREEZE INVENTORY
    ====================================================== */

    function freezeInventory(
        inventory
    ) {

        return Object.freeze({

            ...inventory

        });

    }


    /* ======================================================
       FREEZE SPECIFICATION
    ====================================================== */

    function freezeSpecification(
        specification
    ) {

        return Object.freeze({

            ...specification,


            label:
                Object.freeze({

                    ...specification.label

                }),


            value:
                Object.freeze({

                    ...specification.value

                })

        });

    }


    /* ======================================================
       SORT ORDER COMPARATOR
    ====================================================== */

    function compareBySortOrder(
        firstProduct,
        secondProduct
    ) {

        const firstOrder =
            normalizeOrder(
                firstProduct
                    ?.sortOrder
            );


        const secondOrder =
            normalizeOrder(
                secondProduct
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


        return normalizeText(
            firstProduct
                ?.id
        )
            .localeCompare(
                normalizeText(
                    secondProduct
                        ?.id
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
       DISPLAY ORDER COMPARATOR
    ====================================================== */

    function compareByDisplayOrder(
        firstProduct,
        secondProduct,
        orderKey
    ) {

        const firstOrder =
            normalizeOrder(
                firstProduct
                    ?.display
                    ?.[orderKey],
                firstProduct
                    ?.sortOrder
            );


        const secondOrder =
            normalizeOrder(
                secondProduct
                    ?.display
                    ?.[orderKey],
                secondProduct
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
            firstProduct,
            secondProduct
        );

    }


    /* ======================================================
       PRODUCT NAME COMPARATOR
    ====================================================== */

    function compareProductNames(
        firstProduct,
        secondProduct,
        language
    ) {

        const firstName =
            getLocalizedProductName(
                firstProduct,
                language
            );


        const secondName =
            getLocalizedProductName(
                secondProduct,
                language
            );


        const comparison =
            firstName.localeCompare(
                secondName,
                language ===
                    "zh"
                    ? "zh-CN"
                    : "id-ID",
                {

                    sensitivity:
                        "base",

                    numeric:
                        true

                }
            );


        if (
            comparison !==
            0
        ) {

            return comparison;

        }


        return compareBySortOrder(
            firstProduct,
            secondProduct
        );

    }


    /* ======================================================
       NEWEST COMPARATOR
    ====================================================== */

    function compareNewest(
        firstProduct,
        secondProduct
    ) {

        const firstDate =
            firstProduct
                ?.createdAt ||
            0;


        const secondDate =
            secondProduct
                ?.createdAt ||
            0;


        const difference =
            secondDate -
            firstDate;


        if (
            difference !==
            0
        ) {

            return difference;

        }


        return compareBySortOrder(
            firstProduct,
            secondProduct
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
            (
                Number.isInteger(
                    normalizedLimit
                ) &&
                normalizedLimit > 0
            )
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
       CLONE
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
                 * Fallback ke structuredClone.
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
                 * Fallback ke JSON clone.
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
                "Terjadi kesalahan pada ProductsModel."
            )
        );

    }


    /* ======================================================
       EVENT
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


            getByBrand,

            getByCategory,


            getFeatured,

            getHomepage,

            getInStock,

            getNewest,


            getCategories,

            getRelated,


            search,

            sort,


            hasLoaded,

            getLastLoadedAt,

            getLastError,


            clearCache

        });


    return publicAPI;

})();


window.ProductsModel =
    ProductsModel;