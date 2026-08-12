"use strict";

/**
 * GOMAI CATEGORIES MODEL
 * Four main categories only. No subcategory hierarchy.
 */
const CategoriesModel = (() => {
    const VERSION = "1.0.0";

    let categories = [];
    let loaded = false;
    let loadingPromise = null;

    async function init() {
        return load();
    }

    async function load(options = {}) {
        if (loaded && options?.force !== true) {
            return getActive();
        }

        if (loadingPromise) {
            return loadingPromise;
        }

        loadingPromise = loadInternal();

        try {
            return await loadingPromise;
        } finally {
            loadingPromise = null;
        }
    }

    async function loadInternal() {
        const path =
            window.GomaiUtils?.getDataPath?.("categories") ||
            resolveFallbackPath(
                window.GomaiConfig?.data?.categories ||
                "data/categories.json"
            );

        const response = await fetch(path, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `CategoriesModel gagal memuat kategori (${response.status}).`
            );
        }

        const payload = await response.json();

        categories = (
            Array.isArray(payload?.categories)
                ? payload.categories
                : []
        )
            .map(normalizeCategory)
            .filter(category => category.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);

        loaded = true;

        return getActive();
    }

    function normalizeCategory(category = {}) {
        return {
            id: normalizeId(category.id || category.slug),
            slug: normalizeId(category.slug || category.id),
            name: normalizeLocalized(category.name),
            description: normalizeLocalized(category.description),
            icon: String(category.icon || "").trim(),
            active: category.active !== false,
            sortOrder: Number.isFinite(Number(category.sortOrder))
                ? Number(category.sortOrder)
                : 999
        };
    }

    function normalizeLocalized(value) {
        if (typeof value === "string") {
            return {
                id: value.trim(),
                zh: value.trim()
            };
        }

        return {
            id: String(value?.id || value?.zh || "").trim(),
            zh: String(value?.zh || value?.id || "").trim()
        };
    }

    function normalizeId(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function resolveFallbackPath(path) {
        const inPages =
            window.location.pathname.includes("/pages/");

        return inPages && !path.startsWith("../")
            ? `../${path}`
            : path;
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getCurrentLanguage() {
        return window.Language?.getLanguage?.() || "zh";
    }

    function getLocalizedValue(value, language = getCurrentLanguage()) {
        return String(
            value?.[language] ||
            value?.zh ||
            value?.id ||
            ""
        ).trim();
    }

    async function getAll() {
        await load();
        return clone(categories);
    }

    async function getActive() {
        if (!loaded) {
            await load();
        }

        return clone(
            categories.filter(category => category.active)
        );
    }

    async function getNavigation() {
        return getActive();
    }

    async function getById(id) {
        if (!loaded) {
            await load();
        }

        const normalized = normalizeId(id);

        const found = categories.find(
            category => category.id === normalized
        );

        return found ? clone(found) : null;
    }

    async function getName(id, language = getCurrentLanguage()) {
        const category = await getById(id);
        return category
            ? getLocalizedValue(category.name, language)
            : "";
    }

    async function getDescription(id, language = getCurrentLanguage()) {
        const category = await getById(id);
        return category
            ? getLocalizedValue(category.description, language)
            : "";
    }

    function isLoaded() {
        return loaded;
    }

    function clear() {
        categories = [];
        loaded = false;
        loadingPromise = null;
        return true;
    }

    return Object.freeze({
        version: VERSION,
        init,
        load,
        reload: () => load({ force: true }),
        clear,
        getAll,
        getActive,
        getNavigation,
        getById,
        getName,
        getDescription,
        isLoaded
    });
})();

window.CategoriesModel = CategoriesModel;
