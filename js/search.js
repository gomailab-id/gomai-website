"use strict";

/**
 * ==========================================================
 * GOMAI SEARCH CONTROLLER
 * Version 1.0.0
 * js/search.js
 * ==========================================================
 *
 * Dedicated search page controller.
 * Search is intentionally separated from the all-products
 * catalog so each page has one clear responsibility.
 * ==========================================================
 */

const SearchController = (() => {
    const VERSION = "1.0.0";

    let initialized = false;
    let eventController = null;
    let currentQuery = "";
    let brandResults = [];
    let productResults = [];
    let lastError = null;

    const elements = {
        page: null,
        form: null,
        input: null,
        resultCount: null,
        state: null,
        stateTitle: null,
        stateDescription: null,
        brandsSection: null,
        brandsGrid: null,
        productsSection: null,
        productsGrid: null,
        metaDescription: null
    };

    async function init(context = {}) {
        if (initialized && context?.force !== true) {
            await refreshLanguage();
            return createResult();
        }

        if (initialized) {
            destroy();
        }

        validateDependencies();
        cacheElements();
        bindEvents();

        currentQuery = readQueryFromURL();
        elements.input.value = currentQuery;

        initialized = true;

        if (currentQuery) {
            await executeSearch(currentQuery, {
                updateURL: false
            });
        } else {
            renderInitialState();
        }

        return createResult();
    }

    function validateDependencies() {
        const missing = [];

        if (!window.ProductsModel?.search) {
            missing.push("ProductsModel.search");
        }

        if (!window.BrandsModel?.search) {
            missing.push("BrandsModel.search");
        }

        if (!window.ProductCardComponent?.render) {
            missing.push("ProductCardComponent.render");
        }

        if (!window.BrandCardComponent?.render) {
            missing.push("BrandCardComponent.render");
        }

        if (!window.Language?.translate) {
            missing.push("Language.translate");
        }

        if (missing.length > 0) {
            throw new Error(
                `SearchController dependency belum tersedia: ${missing.join(", ")}`
            );
        }
    }

    function cacheElements() {
        elements.page = document.getElementById("search-page");
        elements.form = document.getElementById("search-page-form");
        elements.input = document.getElementById("search-page-input");
        elements.resultCount = document.getElementById("search-result-count");
        elements.state = document.getElementById("search-state");
        elements.stateTitle = document.getElementById("search-state-title");
        elements.stateDescription = document.getElementById("search-state-description");
        elements.brandsSection = document.getElementById("search-brands-section");
        elements.brandsGrid = document.getElementById("search-brands-grid");
        elements.productsSection = document.getElementById("search-products-section");
        elements.productsGrid = document.getElementById("search-products-grid");
        elements.metaDescription = document.querySelector("meta[name='description']");

        const required = [
            ["search-page", elements.page],
            ["search-page-form", elements.form],
            ["search-page-input", elements.input],
            ["search-result-count", elements.resultCount],
            ["search-state", elements.state],
            ["search-brands-grid", elements.brandsGrid],
            ["search-products-grid", elements.productsGrid]
        ];

        const missing = required
            .filter(([, value]) => !value)
            .map(([name]) => name);

        if (missing.length > 0) {
            throw new Error(
                `SearchController elemen wajib tidak ditemukan: ${missing.join(", ")}`
            );
        }
    }

    function bindEvents() {
        eventController?.abort();
        eventController = new AbortController();

        elements.form.addEventListener(
            "submit",
            handleSubmit,
            { signal: eventController.signal }
        );
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const query = normalizeText(elements.input.value);
        await executeSearch(query, {
            updateURL: true
        });
    }

    async function executeSearch(query, options = {}) {
        currentQuery = normalizeText(query);
        lastError = null;

        if (options.updateURL !== false) {
            updateURL(currentQuery);
        }

        if (!currentQuery) {
            brandResults = [];
            productResults = [];
            renderInitialState();
            return createResult();
        }

        setBusy(true);
        hideState();

        try {
            [brandResults, productResults] = await Promise.all([
                window.BrandsModel.search(currentQuery),
                window.ProductsModel.search(currentQuery)
            ]);

            renderResults();
        } catch (error) {
            lastError = normalizeError(error);
            console.error("SearchController: pencarian gagal.", lastError);
            brandResults = [];
            productResults = [];
            renderErrorState();
        } finally {
            setBusy(false);
        }

        return createResult();
    }

    function renderResults() {
        const total = brandResults.length + productResults.length;

        elements.resultCount.textContent = translate(
            "search.resultCountTemplate",
            "{{count}} hasil ditemukan",
            { count: total }
        );

        renderBrandResults();
        renderProductResults();

        if (total === 0) {
            showState(
                translate("search.emptyTitle", "Hasil Tidak Ditemukan"),
                translate(
                    "search.emptyDescription",
                    "Tidak ada produk atau brand yang cocok. Coba kata pencarian lain."
                )
            );
        } else {
            hideState();
        }

        updateMetadata();
    }

    function renderBrandResults() {
        const hasResults = brandResults.length > 0;
        elements.brandsSection.hidden = !hasResults;

        if (!hasResults) {
            elements.brandsGrid.replaceChildren();
            return;
        }

        window.BrandCardComponent.render({
            target: elements.brandsGrid,
            brands: brandResults,
            clearTarget: true
        });
    }

    function renderProductResults() {
        const hasResults = productResults.length > 0;
        elements.productsSection.hidden = !hasResults;

        if (!hasResults) {
            elements.productsGrid.replaceChildren();
            return;
        }

        window.ProductCardComponent.render({
            target: elements.productsGrid,
            products: productResults,
            clearTarget: true
        });
    }

    function renderInitialState() {
        elements.resultCount.textContent = "";
        elements.brandsSection.hidden = true;
        elements.productsSection.hidden = true;
        elements.brandsGrid.replaceChildren();
        elements.productsGrid.replaceChildren();

        showState(
            translate("search.startTitle", "Mulai Pencarian"),
            translate(
                "search.startDescription",
                "Masukkan nama produk atau brand yang ingin Anda cari."
            )
        );

        updateMetadata();
    }

    function renderErrorState() {
        elements.resultCount.textContent = "";
        elements.brandsSection.hidden = true;
        elements.productsSection.hidden = true;
        elements.brandsGrid.replaceChildren();
        elements.productsGrid.replaceChildren();

        showState(
            translate("emptyState.error.title", "Terjadi Kesalahan"),
            translate(
                "emptyState.error.description",
                "Terjadi kesalahan saat memuat data. Silakan coba kembali."
            )
        );
    }

    function showState(title, description) {
        elements.state.hidden = false;
        elements.stateTitle.textContent = title;
        elements.stateDescription.textContent = description;
    }

    function hideState() {
        elements.state.hidden = true;
    }

    function setBusy(value) {
        elements.page.setAttribute("aria-busy", String(Boolean(value)));
        elements.form.querySelector("button[type='submit']")?.toggleAttribute(
            "disabled",
            Boolean(value)
        );
    }

    function readQueryFromURL() {
        const key = window.GomaiConfig?.query?.search || "q";
        return normalizeText(
            new URLSearchParams(window.location.search).get(key)
        );
    }

    function updateURL(query) {
        const key = window.GomaiConfig?.query?.search || "q";
        const url = new URL(window.location.href);

        if (query) {
            url.searchParams.set(key, query);
        } else {
            url.searchParams.delete(key);
        }

        window.history.replaceState({}, "", url);
    }

    async function refreshLanguage() {
        if (!initialized) {
            return false;
        }

        if (currentQuery) {
            await executeSearch(currentQuery, {
                updateURL: false
            });
        } else {
            renderInitialState();
        }

        window.BrandCardComponent.refreshAll?.();
        window.ProductCardComponent.refreshAll?.();
        return true;
    }

    function updateMetadata() {
        const title = translate("search.title", "Hasil Pencarian");
        document.title = currentQuery
            ? `${currentQuery} | ${title} | Gomai`
            : `${title} | Gomai`;

        if (elements.metaDescription) {
            elements.metaDescription.content = translate(
                "search.pageDescription",
                "Cari produk dan brand yang tersedia melalui Gomai."
            );
        }
    }

    function translate(key, fallback = "", params = {}) {
        return window.Language.translate(key, fallback, params);
    }

    function normalizeText(value) {
        return String(value ?? "").trim();
    }

    function normalizeError(error) {
        return error instanceof Error ? error : new Error(String(error));
    }

    function destroy() {
        eventController?.abort();
        eventController = null;
        initialized = false;
        currentQuery = "";
        brandResults = [];
        productResults = [];
        lastError = null;
        return true;
    }

    function createResult() {
        return Object.freeze({
            version: VERSION,
            initialized,
            query: currentQuery,
            brandCount: brandResults.length,
            productCount: productResults.length,
            totalCount: brandResults.length + productResults.length
        });
    }

    return Object.freeze({
        version: VERSION,
        init,
        destroy,
        refreshLanguage,
        search: executeSearch,
        getLastError: () => lastError,
        hasInitialized: () => initialized
    });
})();

window.SearchController = SearchController;
window.SearchPage = SearchController;
