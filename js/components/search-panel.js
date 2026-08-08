"use strict";

/* ==========================================================
   GOMAI SEARCH PANEL COMPONENT
   js/components/search-panel.js

   Tanggung jawab:
   - Merender UI pencarian global Gomai.
   - Menangani input, submit, clear, open, dan close.
   - Mencari produk + brand untuk suggestion global.
   - Mengarahkan submit ke halaman semua produk dengan q=...
   - Mengarahkan suggestion produk/brand ke halaman terkait.
   - Mendukung keyboard, loading, result count, dan bilingual.
   - Aman dihancurkan lalu dirender ulang.

   Sumber data:
   - ProductsModel.search()
   - BrandsModel.search()

   SearchPanel tidak membaca JSON secara langsung.
========================================================== */

const SearchPanelComponent = (() => {
    const VERSION = "3.0.0";
    const DEFAULT_TARGET_ID = "search-panel";

    const EVENTS = Object.freeze({
        RENDERED: "gomai:search-rendered",
        OPEN: "gomai:search-open",
        CLOSE: "gomai:search-close",
        INPUT: "gomai:search-input",
        SUBMIT: "gomai:search-submit",
        INVALID: "gomai:search-invalid",
        CLEAR: "gomai:search-clear",
        FOCUS: "gomai:search-focus",
        BLUR: "gomai:search-blur",
        LOADING: "gomai:search-loading",
        RESULTS: "gomai:search-results",
        SEARCH_ERROR: "gomai:search-error",
        SELECT: "gomai:search-select",
        SUGGESTIONS_UPDATED: "gomai:search-suggestions-updated",
        SUGGESTIONS_CLEARED: "gomai:search-suggestions-cleared",
        LANGUAGE_REFRESHED: "gomai:search-language-refreshed",
        DESTROYED: "gomai:search-destroyed"
    });

    const DEFAULT_OPTIONS = Object.freeze({
        targetId: DEFAULT_TARGET_ID,
        mode: "inline",

        openOnRender: true,
        closeOnSubmit: false,
        closeOnSelect: true,
        closeOnOutsideClick: false,
        closeOnEscape: true,

        clearOnSubmit: false,
        clearOnSelect: false,
        submitEmptyQuery: false,

        autoSearch: true,
        navigateOnSubmit: true,
        navigateOnSelect: true,

        minQueryLength: 1,
        maxSuggestions: 8,
        productSuggestionLimit: 6,
        brandSuggestionLimit: 4,
        debounce: 180,

        showSubmitButton: true,
        showClearButton: true,
        showCloseButton: false,
        showResultCount: true,
        showSuggestions: true,
        showLoading: true,

        autocomplete: "off",
        inputName: "q",
        inputId: "gomai-search-input",

        className: "",
        panelClassName: "",
        formClassName: "",
        inputClassName: "",
        suggestionClassName: "",
        resultCountClassName: "",

        initialValue: "",
        ariaLive: "polite",
        eventTarget: document,

        onSubmit: null,
        onSelect: null
    });

    let options = {
        ...DEFAULT_OPTIONS
    };

    let rootElement = null;
    let panelElement = null;
    let core = null;

    let rendered = false;
    let opened = false;
    let loading = false;
    let enabled = true;

    let suggestions = [];
    let suggestionSource = [];

    let activeSuggestionIndex = -1;

    let resultCount = null;
    let resultCountText = "";
    let loadingText = "";

    let debounceTimer = null;
    let searchSequence = 0;

    const elements = {
        form: null,
        inputWrap: null,
        input: null,

        searchIcon: null,
        submitButton: null,
        clearButton: null,
        closeButton: null,

        feedback: null,
        loading: null,
        loadingLabel: null,
        resultCount: null,

        suggestions: null,
        suggestionList: null,
        emptySuggestion: null
    };


    /* ======================================================
       COMPONENT CORE
    ====================================================== */

    function ensureCore() {
        validateCoreDependency();

        if (
            core &&
            !core.isDestroyed()
        ) {
            return core;
        }

        core =
            window.ComponentCore.create({
                name:
                    "searchPanel",

                languageAware:
                    true,

                visible:
                    true,

                enabled:
                    true,

                eventTarget:
                    options.eventTarget ||
                    document,

                data: {
                    query:
                        "",

                    loading:
                        false,

                    resultCount:
                        null,

                    suggestions:
                        []
                },

                onLanguageChange:
                    handleCoreLanguageChange
            });

        return core;
    }


    /* ======================================================
       RENDER
    ====================================================== */

    function render(
        customOptions = {}
    ) {
        validateDependencies();

        if (
            hasRendered()
        ) {
            return panelElement;
        }

        if (
            rendered
        ) {
            resetRuntimeReferences();
        }

        options =
            normalizeOptions(
                customOptions
            );

        rootElement =
            resolveTarget(
                options.targetId
            );

        if (
            !rootElement
        ) {
            console.warn(
                `SearchPanelComponent: target "${String(
                    options.targetId
                )}" tidak ditemukan.`
            );

            return null;
        }

        removeExistingMarkup();

        panelElement =
            createPanelMarkup();

        rootElement.append(
            panelElement
        );

        cacheElements();

        const componentCore =
            ensureCore();

        componentCore.mount(
            panelElement
        );

        componentCore.setManyData({
            query:
                options.initialValue,

            loading:
                false,

            resultCount:
                null,

            suggestions:
                []
        });

        rendered =
            true;

        opened =
            false;

        loading =
            false;

        enabled =
            true;

        suggestions =
            [];

        suggestionSource =
            [];

        activeSuggestionIndex =
            -1;

        resultCount =
            null;

        resultCountText =
            "";

        loadingText =
            "";

        bindEvents();

        setValue(
            options.initialValue,
            {
                emit:
                    false,

                focus:
                    false
            }
        );

        refreshLanguage();

        if (
            options.openOnRender
        ) {
            open({
                focus:
                    false
            });
        } else {
            close({
                blur:
                    false
            });
        }

        dispatch(
            EVENTS.RENDERED,
            {
                target:
                    rootElement,

                element:
                    panelElement
            }
        );

        return panelElement;
    }


    /* ======================================================
       PANEL MARKUP
    ====================================================== */

    function createPanelMarkup() {
        const panel =
            document.createElement(
                "section"
            );

        panel.className =
            buildClassName(
                "search-panel",
                "gomai-search-panel",
                `search-panel--${options.mode}`,
                options.className,
                options.panelClassName
            );

        panel.dataset.searchPanel =
            "true";

        panel.dataset.searchMode =
            options.mode;

        panel.setAttribute(
            "role",
            "search"
        );

        panel.append(
            createFormMarkup(),
            createFeedbackMarkup(),
            createSuggestionsMarkup()
        );

        return panel;
    }


    /* ======================================================
       FORM MARKUP
    ====================================================== */

    function createFormMarkup() {
        const form =
            document.createElement(
                "form"
            );

        const inputWrap =
            document.createElement(
                "div"
            );

        const searchIcon =
            document.createElement(
                "span"
            );

        const input =
            document.createElement(
                "input"
            );

        form.className =
            buildClassName(
                "search-panel-form",
                options.formClassName
            );

        form.noValidate =
            true;

        form.setAttribute(
            "role",
            "search"
        );

        inputWrap.className =
            "search-panel-input-wrap";

        searchIcon.className =
            "search-panel-icon";

        searchIcon.setAttribute(
            "aria-hidden",
            "true"
        );

        searchIcon.textContent =
            "⌕";

        input.id =
            options.inputId;

        input.className =
            buildClassName(
                "search-panel-input",
                options.inputClassName
            );

        input.type =
            "search";

        input.name =
            options.inputName;

        input.autocomplete =
            options.autocomplete;

        input.spellcheck =
            false;

        input.enterKeyHint =
            "search";

        input.setAttribute(
            "aria-autocomplete",
            "list"
        );

        input.setAttribute(
            "aria-controls",
            `${options.inputId}-suggestions`
        );

        input.setAttribute(
            "aria-expanded",
            "false"
        );

        input.setAttribute(
            "aria-activedescendant",
            ""
        );

        inputWrap.append(
            searchIcon,
            input
        );

        if (
            options.showClearButton
        ) {
            inputWrap.append(
                createClearButton()
            );
        }

        if (
            options.showSubmitButton
        ) {
            inputWrap.append(
                createSubmitButton()
            );
        }

        if (
            options.showCloseButton
        ) {
            inputWrap.append(
                createCloseButton()
            );
        }

        form.append(
            inputWrap
        );

        return form;
    }


    /* ======================================================
       CLEAR BUTTON
    ====================================================== */

    function createClearButton() {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "search-panel-clear-button";

        button.dataset.searchAction =
            "clear";

        button.hidden =
            true;

        button.textContent =
            "×";

        return button;
    }


    /* ======================================================
       SUBMIT BUTTON
    ====================================================== */

    function createSubmitButton() {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "submit";

        button.className =
            "btn btn-primary search-panel-submit-button";

        button.dataset.searchAction =
            "submit";

        return button;
    }


    /* ======================================================
       CLOSE BUTTON
    ====================================================== */

    function createCloseButton() {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "search-panel-close-button";

        button.dataset.searchAction =
            "close";

        button.textContent =
            "×";

        return button;
    }


    /* ======================================================
       FEEDBACK MARKUP
    ====================================================== */

    function createFeedbackMarkup() {
        const feedback =
            document.createElement(
                "div"
            );

        const loadingElement =
            document.createElement(
                "div"
            );

        const spinner =
            document.createElement(
                "span"
            );

        const loadingLabel =
            document.createElement(
                "span"
            );

        const result =
            document.createElement(
                "p"
            );

        feedback.className =
            "search-panel-feedback";

        feedback.setAttribute(
            "aria-live",
            options.ariaLive
        );

        feedback.setAttribute(
            "aria-atomic",
            "true"
        );

        loadingElement.className =
            "search-panel-loading";

        loadingElement.hidden =
            true;

        spinner.className =
            "loading-spinner";

        spinner.setAttribute(
            "aria-hidden",
            "true"
        );

        loadingLabel.className =
            "search-panel-loading-label";

        loadingElement.append(
            spinner,
            loadingLabel
        );

        result.className =
            buildClassName(
                "search-panel-result-count",
                options.resultCountClassName
            );

        result.hidden =
            true;

        feedback.append(
            loadingElement,
            result
        );

        return feedback;
    }


    /* ======================================================
       SUGGESTIONS MARKUP
    ====================================================== */

    function createSuggestionsMarkup() {
        const container =
            document.createElement(
                "div"
            );

        const list =
            document.createElement(
                "ul"
            );

        const empty =
            document.createElement(
                "p"
            );

        container.className =
            buildClassName(
                "search-panel-suggestions",
                options.suggestionClassName
            );

        container.id =
            `${options.inputId}-suggestions`;

        container.hidden =
            true;

        list.className =
            "search-panel-suggestion-list";

        list.setAttribute(
            "role",
            "listbox"
        );

        empty.className =
            "search-panel-suggestion-empty";

        empty.hidden =
            true;

        container.append(
            list,
            empty
        );

        return container;
    }


    /* ======================================================
       ELEMENT CACHE
    ====================================================== */

    function cacheElements() {
        elements.form =
            panelElement?.querySelector(
                ".search-panel-form"
            ) ||
            null;

        elements.inputWrap =
            panelElement?.querySelector(
                ".search-panel-input-wrap"
            ) ||
            null;

        elements.input =
            panelElement?.querySelector(
                ".search-panel-input"
            ) ||
            null;

        elements.searchIcon =
            panelElement?.querySelector(
                ".search-panel-icon"
            ) ||
            null;

        elements.submitButton =
            panelElement?.querySelector(
                ".search-panel-submit-button"
            ) ||
            null;

        elements.clearButton =
            panelElement?.querySelector(
                ".search-panel-clear-button"
            ) ||
            null;

        elements.closeButton =
            panelElement?.querySelector(
                ".search-panel-close-button"
            ) ||
            null;

        elements.feedback =
            panelElement?.querySelector(
                ".search-panel-feedback"
            ) ||
            null;

        elements.loading =
            panelElement?.querySelector(
                ".search-panel-loading"
            ) ||
            null;

        elements.loadingLabel =
            panelElement?.querySelector(
                ".search-panel-loading-label"
            ) ||
            null;

        elements.resultCount =
            panelElement?.querySelector(
                ".search-panel-result-count"
            ) ||
            null;

        elements.suggestions =
            panelElement?.querySelector(
                ".search-panel-suggestions"
            ) ||
            null;

        elements.suggestionList =
            panelElement?.querySelector(
                ".search-panel-suggestion-list"
            ) ||
            null;

        elements.emptySuggestion =
            panelElement?.querySelector(
                ".search-panel-suggestion-empty"
            ) ||
            null;
    }


    /* ======================================================
       EVENT BINDING
    ====================================================== */

    function bindEvents() {
        const componentCore =
            ensureCore();

        if (
            !elements.form ||
            !elements.input
        ) {
            return;
        }

        componentCore.on(
            elements.form,
            "submit",
            handleSubmit
        );

        componentCore.on(
            elements.input,
            "input",
            handleInput
        );

        componentCore.on(
            elements.input,
            "keydown",
            handleKeydown
        );

        componentCore.on(
            elements.input,
            "focus",
            handleFocus
        );

        componentCore.on(
            elements.input,
            "blur",
            handleBlur
        );

        if (
            elements.clearButton
        ) {
            componentCore.on(
                elements.clearButton,
                "click",
                handleClearClick
            );
        }

        if (
            elements.closeButton
        ) {
            componentCore.on(
                elements.closeButton,
                "click",
                handleCloseClick
            );
        }

        if (
            elements.suggestionList
        ) {
            componentCore.on(
                elements.suggestionList,
                "mousedown",
                handleSuggestionMouseDown
            );

            componentCore.on(
                elements.suggestionList,
                "click",
                handleSuggestionClick
            );
        }

        componentCore.on(
            document,
            "click",
            handleDocumentClick
        );
    }


    /* ======================================================
       INPUT
    ====================================================== */

    function handleInput(
        event
    ) {
        if (
            !enabled
        ) {
            return;
        }

        const query =
            normalizeQuery(
                event.target?.value
            );

        ensureCore().setData(
            "query",
            query
        );

        updateClearButton();
        resetActiveSuggestion();

        dispatch(
            EVENTS.INPUT,
            {
                query,

                valid:
                    isQueryValid(
                        query
                    ),

                source:
                    "input"
            }
        );

        cancelDebounce();

        if (
            !options.autoSearch
        ) {
            return;
        }

        if (
            !isQueryValid(
                query
            )
        ) {
            invalidateSearch();

            clearSuggestions({
                emit:
                    false
            });

            clearResultCount();
            hideLoading();

            return;
        }

        debounceTimer =
            window.setTimeout(
                () => {
                    debounceTimer =
                        null;

                    void search(
                        query,
                        {
                            source:
                                "input"
                        }
                    );
                },
                options.debounce
            );
    }


    /* ======================================================
       SUBMIT
    ====================================================== */

    async function handleSubmit(
        event
    ) {
        event.preventDefault();

        if (
            !enabled ||
            loading
        ) {
            return;
        }

        if (
            activeSuggestionIndex >= 0 &&
            suggestions[
                activeSuggestionIndex
            ]
        ) {
            await selectSuggestion(
                activeSuggestionIndex,
                "keyboard-submit"
            );

            return;
        }

        const query =
            getValue();

        if (
            !options.submitEmptyQuery &&
            !isQueryValid(
                query
            )
        ) {
            focus();

            dispatch(
                EVENTS.INVALID,
                {
                    query,

                    minQueryLength:
                        options.minQueryLength
                }
            );

            return;
        }

        const destination =
            buildProductsSearchURL(
                query
            );

        const detail = {
            query,
            source:
                "form",
            destination
        };

        dispatch(
            EVENTS.SUBMIT,
            detail
        );

        if (
            typeof options.onSubmit ===
            "function"
        ) {
            try {
                const result =
                    await options.onSubmit(
                        detail
                    );

                if (
                    result ===
                    false
                ) {
                    return;
                }
            } catch (error) {
                reportError(
                    error,
                    "submit",
                    detail
                );

                return;
            }
        }

        if (
            options.clearOnSubmit
        ) {
            clear({
                emit:
                    false,

                focus:
                    false
            });
        }

        if (
            options.closeOnSubmit
        ) {
            close();
        }

        if (
            options.navigateOnSubmit &&
            destination
        ) {
            window.location.assign(
                destination
            );
        }
    }


    /* ======================================================
       KEYBOARD
    ====================================================== */

    function handleKeydown(
        event
    ) {
        if (
            !enabled
        ) {
            return;
        }

        switch (
            event.key
        ) {
            case "ArrowDown":
                if (
                    hasVisibleSuggestions()
                ) {
                    event.preventDefault();

                    moveActiveSuggestion(
                        1
                    );
                }

                break;

            case "ArrowUp":
                if (
                    hasVisibleSuggestions()
                ) {
                    event.preventDefault();

                    moveActiveSuggestion(
                        -1
                    );
                }

                break;

            case "Enter":
                if (
                    activeSuggestionIndex >=
                        0 &&
                    suggestions[
                        activeSuggestionIndex
                    ]
                ) {
                    event.preventDefault();

                    void selectSuggestion(
                        activeSuggestionIndex,
                        "keyboard"
                    );
                }

                break;

            case "Escape":
                if (
                    !options.closeOnEscape
                ) {
                    break;
                }

                event.preventDefault();

                if (
                    hasVisibleSuggestions()
                ) {
                    clearSuggestions({
                        emit:
                            false
                    });
                } else {
                    close();
                }

                break;

            case "Tab":
                resetActiveSuggestion();
                break;

            default:
                break;
        }
    }


    /* ======================================================
       FOCUS
    ====================================================== */

    function handleFocus() {
        dispatch(
            EVENTS.FOCUS,
            {
                query:
                    getValue()
            }
        );

        if (
            suggestions.length >
            0
        ) {
            showSuggestionsContainer();
        }
    }


    function handleBlur() {
        window.setTimeout(
            () => {
                dispatch(
                    EVENTS.BLUR,
                    {
                        query:
                            getValue()
                    }
                );
            },
            0
        );
    }


    /* ======================================================
       BUTTON EVENTS
    ====================================================== */

    function handleClearClick() {
        clear({
            emit:
                true,

            focus:
                true
        });
    }


    function handleCloseClick() {
        close();
    }


    /* ======================================================
       SUGGESTION EVENTS
    ====================================================== */

    function handleSuggestionMouseDown(
        event
    ) {
        event.preventDefault();
    }


    function handleSuggestionClick(
        event
    ) {
        const target =
            event.target;

        if (
            !(
                target instanceof
                Element
            )
        ) {
            return;
        }

        const optionElement =
            target.closest(
                "[data-suggestion-index]"
            );

        if (
            !optionElement
        ) {
            return;
        }

        const index =
            Number(
                optionElement.dataset
                    .suggestionIndex
            );

        void selectSuggestion(
            index,
            "pointer"
        );
    }


    /* ======================================================
       OUTSIDE CLICK
    ====================================================== */

    function handleDocumentClick(
        event
    ) {
        if (
            !options.closeOnOutsideClick ||
            !opened ||
            !panelElement
        ) {
            return;
        }

        const target =
            event.target;

        if (
            target instanceof
                Node &&
            panelElement.contains(
                target
            )
        ) {
            return;
        }

        close();
    }


    /* ======================================================
       OPEN
    ====================================================== */

    function open(
        openOptions = {}
    ) {
        if (
            !hasRendered()
        ) {
            return false;
        }

        opened =
            true;

        if (
            rootElement
        ) {
            rootElement.hidden =
                false;

            rootElement.setAttribute(
                "aria-hidden",
                "false"
            );
        }

        panelElement.classList.add(
            "is-open"
        );

        panelElement.classList.remove(
            "is-closed"
        );

        panelElement.setAttribute(
            "aria-hidden",
            "false"
        );

        ensureCore().show();

        if (
            openOptions.focus !==
            false
        ) {
            focus();
        }

        dispatch(
            EVENTS.OPEN,
            {
                query:
                    getValue()
            }
        );

        return true;
    }


    /* ======================================================
       CLOSE
    ====================================================== */

    function close(
        closeOptions = {}
    ) {
        if (
            !hasRendered()
        ) {
            return false;
        }

        opened =
            false;

        clearSuggestions({
            emit:
                false
        });

        panelElement.classList.remove(
            "is-open"
        );

        panelElement.classList.add(
            "is-closed"
        );

        panelElement.setAttribute(
            "aria-hidden",
            "true"
        );

        ensureCore().hide();

        if (
            closeOptions.blur !==
            false
        ) {
            blur();
        }

        dispatch(
            EVENTS.CLOSE,
            {
                query:
                    getValue()
            }
        );

        return true;
    }


    function toggle() {
        return opened
            ? close()
            : open();
    }


    function isOpen() {
        return opened;
    }


    /* ======================================================
       VALUE
    ====================================================== */

    function setValue(
        value,
        setOptions = {}
    ) {
        const query =
            normalizeQuery(
                value
            );

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.setData(
                "query",
                query
            );
        }

        if (
            elements.input
        ) {
            elements.input.value =
                query;
        }

        updateClearButton();

        if (
            setOptions.emit ===
            true
        ) {
            dispatch(
                EVENTS.INPUT,
                {
                    query,

                    valid:
                        isQueryValid(
                            query
                        ),

                    source:
                        setOptions.source ||
                        "api"
                }
            );
        }

        if (
            setOptions.focus ===
            true
        ) {
            focus();
        }

        return query;
    }


    function getValue() {
        return normalizeQuery(
            elements.input?.value ??
            core?.getData(
                "query",
                ""
            ) ??
            ""
        );
    }


    /* ======================================================
       CLEAR VALUE
    ====================================================== */

    function clear(
        clearOptions = {}
    ) {
        const previousQuery =
            getValue();

        cancelDebounce();
        invalidateSearch();

        setValue(
            "",
            {
                emit:
                    false,

                focus:
                    false
            }
        );

        clearSuggestions({
            emit:
                false
        });

        clearResultCount();
        hideLoading();

        if (
            clearOptions.emit !==
            false
        ) {
            dispatch(
                EVENTS.CLEAR,
                {
                    previousQuery
                }
            );
        }

        if (
            clearOptions.focus !==
            false
        ) {
            focus();
        }

        return true;
    }


    function focus() {
        if (
            !enabled ||
            !elements.input
        ) {
            return false;
        }

        elements.input.focus();

        return true;
    }


    function blur() {
        if (
            !elements.input
        ) {
            return false;
        }

        elements.input.blur();

        return true;
    }


    /* ======================================================
       GLOBAL SEARCH
    ====================================================== */

    async function search(
        query = getValue(),
        searchOptions = {}
    ) {
        const normalizedQuery =
            normalizeQuery(
                query
            );

        if (
            !isQueryValid(
                normalizedQuery
            )
        ) {
            clearSuggestions({
                emit:
                    false
            });

            clearResultCount();
            hideLoading();

            return createSearchResult(
                normalizedQuery,
                [],
                [],
                []
            );
        }

        validateSearchDependencies();

        const sequence =
            ++searchSequence;

        const language =
            getCurrentLanguage();

        showLoading();

        try {
            const [
                productResults,
                brandResults,
                allBrands
            ] =
                await Promise.all([
                    window.ProductsModel
                        .search(
                            normalizedQuery,
                            {
                                language
                            }
                        ),

                    window.BrandsModel
                        .search(
                            normalizedQuery,
                            language
                        ),

                    window.BrandsModel
                        .getAll()
                ]);

            if (
                sequence !==
                searchSequence
            ) {
                return null;
            }

            const products =
                Array.isArray(
                    productResults
                )
                    ? productResults
                    : [];

            const brands =
                Array.isArray(
                    brandResults
                )
                    ? brandResults
                    : [];

            const brandMap =
                createBrandMap(
                    allBrands
                );

            const rawSuggestions =
                buildSearchSuggestions(
                    products,
                    brands,
                    brandMap
                );

            const total =
                products.length +
                brands.length;

            setResultCount(
                total
            );

            setSuggestions(
                rawSuggestions,
                {
                    showEmpty:
                        true
                }
            );

            hideLoading();

            const result =
                createSearchResult(
                    normalizedQuery,
                    products,
                    brands,
                    rawSuggestions
                );

            dispatch(
                EVENTS.RESULTS,
                {
                    ...result,

                    source:
                        searchOptions.source ||
                        "api"
                }
            );

            return result;
        } catch (error) {
            if (
                sequence !==
                searchSequence
            ) {
                return null;
            }

            hideLoading();
            clearResultCount();

            clearSuggestions({
                emit:
                    false
            });

            const normalizedError =
                reportError(
                    error,
                    "search",
                    {
                        query:
                            normalizedQuery
                    }
                );

            showEmptySuggestion(
                translate(
                    "searchPanel.error",
                    getCurrentLanguage() ===
                        "zh"
                        ? "搜索失败，请重试。"
                        : "Pencarian gagal. Silakan coba lagi."
                )
            );

            throw normalizedError;
        }
    }


    /* ======================================================
       SEARCH RESULT
    ====================================================== */

    function createSearchResult(
        query,
        products,
        brands,
        rawSuggestions
    ) {
        return {
            query,

            products:
                cloneSafe(
                    products
                ),

            brands:
                cloneSafe(
                    brands
                ),

            suggestions:
                cloneSafe(
                    rawSuggestions
                ),

            count:
                (
                    Array.isArray(
                        products
                    )
                        ? products.length
                        : 0
                ) +
                (
                    Array.isArray(
                        brands
                    )
                        ? brands.length
                        : 0
                )
        };
    }


    /* ======================================================
       BUILD SEARCH SUGGESTIONS
    ====================================================== */

    function buildSearchSuggestions(
        products,
        brands,
        brandMap
    ) {
        const productSuggestions =
            products
                .slice(
                    0,
                    options.productSuggestionLimit
                )
                .map(
                    product =>
                        createProductSuggestion(
                            product,
                            brandMap
                        )
                );

        const brandSuggestions =
            brands
                .slice(
                    0,
                    options.brandSuggestionLimit
                )
                .map(
                    createBrandSuggestion
                );

        return [
            ...productSuggestions,
            ...brandSuggestions
        ].slice(
            0,
            options.maxSuggestions
        );
    }


    /* ======================================================
       PRODUCT SUGGESTION
    ====================================================== */

    function createProductSuggestion(
        product,
        brandMap
    ) {
        const brandId =
            normalizeIdentifier(
                product?.brandId ||
                product?.brand
            );

        const brand =
            brandMap.get(
                brandId
            ) ||
            null;

        const brandName =
            normalizeText(
                brand?.name ||
                brandId
            );

        const productName =
            normalizeLocalizedPair(
                product?.name,
                product?.id ||
                ""
            );

        const labels = {
            id:
                formatBrandFirstName(
                    productName.id,
                    brandName
                ),

            zh:
                formatBrandFirstName(
                    productName.zh,
                    brandName
                )
        };

        return {
            id:
                `product:${
                    product?.id ||
                    product?.slug ||
                    ""
                }`,

            type:
                "product",

            label:
                labels,

            value:
                productName,

            description: {
                id:
                    "Produk",

                zh:
                    "商品"
            },

            meta:
                formatCurrency(
                    product?.price
                ),

            image:
                getProductImage(
                    product
                ),

            icon:
                "□",

            destination:
                buildProductURL(
                    product
                ),

            data: {
                type:
                    "product",

                id:
                    product?.id ||
                    "",

                slug:
                    product?.slug ||
                    "",

                brandId
            }
        };
    }


    /* ======================================================
       BRAND SUGGESTION
    ====================================================== */

    function createBrandSuggestion(
        brand
    ) {
        return {
            id:
                `brand:${
                    brand?.id ||
                    brand?.slug ||
                    ""
                }`,

            type:
                "brand",

            label:
                normalizeText(
                    brand?.name
                ),

            value:
                normalizeText(
                    brand?.name
                ),

            description:
                normalizeLocalizedPair(
                    brand?.description,
                    ""
                ),

            meta: {
                id:
                    "Brand",

                zh:
                    "品牌"
            },

            image:
                normalizeText(
                    brand?.logo ||
                    brand?.assets?.logo
                ),

            icon:
                "◇",

            destination:
                buildBrandURL(
                    brand
                ),

            data: {
                type:
                    "brand",

                id:
                    brand?.id ||
                    "",

                slug:
                    brand?.slug ||
                    ""
            }
        };
    }


    /* ======================================================
       BRAND MAP
    ====================================================== */

    function createBrandMap(
        values
    ) {
        const map =
            new Map();

        if (
            !Array.isArray(
                values
            )
        ) {
            return map;
        }

        values.forEach(
            brand => {
                const id =
                    normalizeIdentifier(
                        brand?.id ||
                        brand?.slug
                    );

                if (
                    id
                ) {
                    map.set(
                        id,
                        brand
                    );
                }
            }
        );

        return map;
    }


    /* ======================================================
       LOADING
    ====================================================== */

    function showLoading(
        label = ""
    ) {
        loading =
            true;

        loadingText =
            normalizeText(
                label
            );

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.setData(
                "loading",
                true
            );
        }

        panelElement?.classList.add(
            "is-loading"
        );

        elements.input?.setAttribute(
            "aria-busy",
            "true"
        );

        if (
            elements.loading
        ) {
            elements.loading.hidden =
                !options.showLoading;
        }

        if (
            elements.loadingLabel
        ) {
            elements.loadingLabel.textContent =
                loadingText ||
                translate(
                    "searchPanel.loading",
                    getCurrentLanguage() ===
                        "zh"
                        ? "搜索中..."
                        : "Mencari..."
                );
        }

        if (
            elements.submitButton
        ) {
            elements.submitButton.disabled =
                true;
        }

        dispatch(
            EVENTS.LOADING,
            {
                loading:
                    true,

                query:
                    getValue()
            }
        );

        return true;
    }


    function hideLoading() {
        loading =
            false;

        loadingText =
            "";

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.setData(
                "loading",
                false
            );
        }

        panelElement?.classList.remove(
            "is-loading"
        );

        elements.input?.setAttribute(
            "aria-busy",
            "false"
        );

        if (
            elements.loading
        ) {
            elements.loading.hidden =
                true;
        }

        if (
            elements.submitButton
        ) {
            elements.submitButton.disabled =
                !enabled;
        }

        dispatch(
            EVENTS.LOADING,
            {
                loading:
                    false,

                query:
                    getValue()
            }
        );

        return true;
    }


    function isLoading() {
        return loading;
    }


    /* ======================================================
       RESULT COUNT
    ====================================================== */

    function setResultCount(
        count,
        countOptions = {}
    ) {
        const normalizedCount =
            Math.max(
                0,
                Number(
                    count
                ) ||
                0
            );

        resultCount =
            normalizedCount;

        resultCountText =
            normalizeText(
                countOptions.text
            );

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.setData(
                "resultCount",
                normalizedCount
            );
        }

        if (
            !elements.resultCount ||
            !options.showResultCount
        ) {
            return normalizedCount;
        }

        const fallback =
            getCurrentLanguage() ===
                "zh"
                ? "找到 {{count}} 个结果"
                : "{{count}} hasil ditemukan";

        const text =
            resultCountText ||
            translate(
                "searchPanel.resultCount",
                fallback,
                {
                    count:
                        normalizedCount
                }
            );

        elements.resultCount.textContent =
            interpolate(
                text,
                {
                    count:
                        normalizedCount,

                    query:
                        getValue()
                }
            );

        elements.resultCount.hidden =
            false;

        return normalizedCount;
    }


    function clearResultCount() {
        resultCount =
            null;

        resultCountText =
            "";

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.setData(
                "resultCount",
                null
            );
        }

        if (
            elements.resultCount
        ) {
            elements.resultCount.hidden =
                true;

            elements.resultCount.textContent =
                "";
        }

        return true;
    }


    function getResultCount() {
        return resultCount;
    }


    /* ======================================================
       SET SUGGESTIONS
    ====================================================== */

    function setSuggestions(
        suggestionList,
        suggestionOptions = {}
    ) {
        const source =
            Array.isArray(
                suggestionList
            )
                ? suggestionList.slice(
                    0,
                    options.maxSuggestions
                )
                : [];

        suggestionSource =
            cloneSafe(
                source
            ) ||
            [];

        suggestions =
            normalizeSuggestions(
                source
            ).slice(
                0,
                options.maxSuggestions
            );

        activeSuggestionIndex =
            -1;

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.setData(
                "suggestions",
                cloneSafe(
                    suggestions
                )
            );
        }

        renderSuggestions(
            suggestionOptions
        );

        dispatch(
            EVENTS.SUGGESTIONS_UPDATED,
            {
                query:
                    getValue(),

                suggestions:
                    cloneSafe(
                        suggestions
                    ),

                count:
                    suggestions.length
            }
        );

        return cloneSafe(
            suggestions
        );
    }


    /* ======================================================
       RENDER SUGGESTIONS
    ====================================================== */

    function renderSuggestions(
        suggestionOptions = {}
    ) {
        if (
            !elements.suggestionList ||
            !elements.suggestions ||
            !elements.emptySuggestion
        ) {
            return;
        }

        elements.suggestionList
            .replaceChildren();

        elements.emptySuggestion.hidden =
            true;

        if (
            suggestions.length ===
            0
        ) {
            if (
                suggestionOptions.showEmpty ===
                true
            ) {
                showEmptySuggestion(
                    suggestionOptions.emptyText
                );
            } else {
                hideSuggestionsContainer();
            }

            return;
        }

        const fragment =
            document.createDocumentFragment();

        suggestions.forEach(
            (
                suggestion,
                index
            ) => {
                fragment.append(
                    createSuggestionElement(
                        suggestion,
                        index
                    )
                );
            }
        );

        elements.suggestionList.append(
            fragment
        );

        showSuggestionsContainer();
    }


    /* ======================================================
       SUGGESTION ELEMENT
    ====================================================== */

    function createSuggestionElement(
        suggestion,
        index
    ) {
        const item =
            document.createElement(
                "li"
            );

        const button =
            document.createElement(
                "button"
            );

        const content =
            document.createElement(
                "span"
            );

        const label =
            document.createElement(
                "span"
            );

        item.className =
            "search-panel-suggestion-item";

        item.setAttribute(
            "role",
            "option"
        );

        item.setAttribute(
            "aria-selected",
            "false"
        );

        item.dataset.suggestionIndex =
            String(
                index
            );

        item.dataset.suggestionType =
            suggestion.type;

        item.id =
            `${options.inputId}-suggestion-${index}`;

        button.type =
            "button";

        button.className =
            "search-panel-suggestion-button";

        button.tabIndex =
            -1;

        const media =
            createSuggestionMedia(
                suggestion
            );

        if (
            media
        ) {
            button.append(
                media
            );
        }

        content.className =
            "search-panel-suggestion-content";

        label.className =
            "search-panel-suggestion-label";

        label.textContent =
            suggestion.label;

        content.append(
            label
        );

        if (
            suggestion.description
        ) {
            const description =
                document.createElement(
                    "span"
                );

            description.className =
                "search-panel-suggestion-description";

            description.textContent =
                suggestion.description;

            content.append(
                description
            );
        }

        button.append(
            content
        );

        if (
            suggestion.meta
        ) {
            const meta =
                document.createElement(
                    "span"
                );

            meta.className =
                "search-panel-suggestion-meta";

            meta.textContent =
                suggestion.meta;

            button.append(
                meta
            );
        }

        item.append(
            button
        );

        return item;
    }


    /* ======================================================
       SUGGESTION MEDIA
    ====================================================== */

    function createSuggestionMedia(
        suggestion
    ) {
        if (
            !suggestion.image &&
            !suggestion.icon
        ) {
            return null;
        }

        const media =
            document.createElement(
                "span"
            );

        media.className =
            "search-panel-suggestion-media";

        media.setAttribute(
            "aria-hidden",
            "true"
        );

        if (
            suggestion.image
        ) {
            const image =
                document.createElement(
                    "img"
                );

            image.src =
                resolveAssetPath(
                    suggestion.image
                );

            image.alt =
                "";

            image.loading =
                "lazy";

            image.decoding =
                "async";

            image.addEventListener(
                "error",
                () => {
                    image.remove();

                    media.textContent =
                        suggestion.icon ||
                        "⌕";
                },
                {
                    once:
                        true
                }
            );

            media.append(
                image
            );

            return media;
        }

        media.textContent =
            suggestion.icon;

        return media;
    }


    /* ======================================================
       EMPTY SUGGESTION
    ====================================================== */

    function showEmptySuggestion(
        customText = ""
    ) {
        elements.suggestionList
            ?.replaceChildren();

        if (
            elements.emptySuggestion
        ) {
            elements.emptySuggestion.textContent =
                normalizeText(
                    customText
                ) ||
                translate(
                    "searchPanel.noSuggestions",
                    getCurrentLanguage() ===
                        "zh"
                        ? "没有搜索建议。"
                        : "Tidak ada saran pencarian."
                );

            elements.emptySuggestion.hidden =
                false;
        }

        showSuggestionsContainer();
    }


    /* ======================================================
       CLEAR SUGGESTIONS
    ====================================================== */

    function clearSuggestions(
        clearOptions = {}
    ) {
        suggestions =
            [];

        suggestionSource =
            [];

        activeSuggestionIndex =
            -1;

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.setData(
                "suggestions",
                []
            );
        }

        elements.suggestionList
            ?.replaceChildren();

        if (
            elements.emptySuggestion
        ) {
            elements.emptySuggestion.hidden =
                true;

            elements.emptySuggestion.textContent =
                "";
        }

        hideSuggestionsContainer();

        if (
            clearOptions.emit ===
            true
        ) {
            dispatch(
                EVENTS.SUGGESTIONS_CLEARED,
                {
                    query:
                        getValue()
                }
            );
        }

        return true;
    }


    function getSuggestions() {
        return cloneSafe(
            suggestions
        );
    }


    /* ======================================================
       SUGGESTION CONTAINER
    ====================================================== */

    function showSuggestionsContainer() {
        if (
            !options.showSuggestions ||
            !elements.suggestions
        ) {
            return false;
        }

        elements.suggestions.hidden =
            false;

        elements.input?.setAttribute(
            "aria-expanded",
            "true"
        );

        return true;
    }


    function hideSuggestionsContainer() {
        if (
            elements.suggestions
        ) {
            elements.suggestions.hidden =
                true;
        }

        elements.input?.setAttribute(
            "aria-expanded",
            "false"
        );

        elements.input?.setAttribute(
            "aria-activedescendant",
            ""
        );

        activeSuggestionIndex =
            -1;

        return true;
    }


    function hasVisibleSuggestions() {
        return Boolean(
            elements.suggestions &&
            !elements.suggestions.hidden &&
            suggestions.length >
                0
        );
    }


    /* ======================================================
       ACTIVE SUGGESTION
    ====================================================== */

    function moveActiveSuggestion(
        direction
    ) {
        if (
            suggestions.length ===
            0
        ) {
            return false;
        }

        const next =
            activeSuggestionIndex +
            direction;

        if (
            next <
            0
        ) {
            activeSuggestionIndex =
                suggestions.length -
                1;
        } else if (
            next >=
            suggestions.length
        ) {
            activeSuggestionIndex =
                0;
        } else {
            activeSuggestionIndex =
                next;
        }

        updateSuggestionSelection();

        return true;
    }


    function updateSuggestionSelection() {
        const items =
            Array.from(
                elements.suggestionList
                    ?.querySelectorAll(
                        "[data-suggestion-index]"
                    ) ||
                []
            );

        items.forEach(
            (
                item,
                index
            ) => {
                const active =
                    index ===
                    activeSuggestionIndex;

                item.classList.toggle(
                    "is-active",
                    active
                );

                item.setAttribute(
                    "aria-selected",
                    String(
                        active
                    )
                );

                if (
                    active
                ) {
                    elements.input?.setAttribute(
                        "aria-activedescendant",
                        item.id
                    );

                    if (
                        typeof item.scrollIntoView ===
                        "function"
                    ) {
                        item.scrollIntoView({
                            block:
                                "nearest"
                        });
                    }
                }
            }
        );
    }


    function resetActiveSuggestion() {
        activeSuggestionIndex =
            -1;

        elements.input?.setAttribute(
            "aria-activedescendant",
            ""
        );

        elements.suggestionList
            ?.querySelectorAll(
                "[data-suggestion-index]"
            )
            .forEach(
                item => {
                    item.classList.remove(
                        "is-active"
                    );

                    item.setAttribute(
                        "aria-selected",
                        "false"
                    );
                }
            );
    }


    /* ======================================================
       SELECT SUGGESTION
    ====================================================== */

    async function selectSuggestion(
        index,
        source = "api"
    ) {
        const suggestion =
            suggestions[
                index
            ];

        if (
            !suggestion
        ) {
            return false;
        }

        setValue(
            suggestion.value ||
            suggestion.label,
            {
                emit:
                    false,

                focus:
                    true
            }
        );

        const destination =
            resolveSuggestionDestination(
                suggestion
            );

        const detail = {
            query:
                getValue(),

            suggestion:
                cloneSafe(
                    suggestion
                ),

            index,

            source,

            destination
        };

        dispatch(
            EVENTS.SELECT,
            detail
        );

        if (
            typeof options.onSelect ===
            "function"
        ) {
            try {
                const result =
                    await options.onSelect(
                        detail
                    );

                if (
                    result ===
                    false
                ) {
                    return true;
                }
            } catch (error) {
                reportError(
                    error,
                    "select",
                    detail
                );

                return false;
            }
        }

        if (
            options.clearOnSelect
        ) {
            clear({
                emit:
                    false,

                focus:
                    false
            });
        } else {
            clearSuggestions({
                emit:
                    false
            });
        }

        if (
            options.closeOnSelect
        ) {
            close();
        }

        if (
            options.navigateOnSelect &&
            destination
        ) {
            window.location.assign(
                destination
            );
        }

        return true;
    }


    /* ======================================================
       NORMALIZE SUGGESTIONS
    ====================================================== */

    function normalizeSuggestions(
        values
    ) {
        if (
            !Array.isArray(
                values
            )
        ) {
            return [];
        }

        return values
            .map(
                normalizeSuggestion
            )
            .filter(
                Boolean
            );
    }


    function normalizeSuggestion(
        suggestion,
        index
    ) {
        if (
            typeof suggestion ===
            "string"
        ) {
            const value =
                normalizeQuery(
                    suggestion
                );

            return value
                ? {
                    id:
                        `suggestion-${index}`,

                    type:
                        "query",

                    value,

                    label:
                        value,

                    description:
                        "",

                    meta:
                        "",

                    image:
                        "",

                    icon:
                        "⌕",

                    destination:
                        "",

                    data:
                        null
                }
                : null;
        }

        if (
            !isPlainObject(
                suggestion
            )
        ) {
            return null;
        }

        const label =
            getLocalizedValue(
                suggestion.label ||
                suggestion.name ||
                suggestion.value
            );

        const value =
            normalizeQuery(
                getLocalizedValue(
                    suggestion.value
                ) ||
                label
            );

        if (
            !value
        ) {
            return null;
        }

        return {
            id:
                normalizeText(
                    suggestion.id ||
                    `suggestion-${index}`
                ),

            type:
                normalizeIdentifier(
                    suggestion.type ||
                    "query"
                ) ||
                "query",

            value,

            label:
                label ||
                value,

            description:
                getLocalizedValue(
                    suggestion.description
                ),

            meta:
                getLocalizedValue(
                    suggestion.meta
                ),

            image:
                normalizeText(
                    suggestion.image ||
                    suggestion.thumbnail
                ),

            icon:
                normalizeText(
                    suggestion.icon
                ),

            destination:
                resolveProjectPath(
                    suggestion.destination ||
                    suggestion.href ||
                    ""
                ),

            data:
                suggestion.data ??
                null
        };
    }


    /* ======================================================
       ENABLE
    ====================================================== */

    function enable() {
        enabled =
            true;

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.enable();
        }

        panelElement?.classList.remove(
            "is-disabled"
        );

        if (
            elements.input
        ) {
            elements.input.disabled =
                false;
        }

        if (
            elements.submitButton
        ) {
            elements.submitButton.disabled =
                loading;
        }

        if (
            elements.clearButton
        ) {
            elements.clearButton.disabled =
                false;
        }

        if (
            elements.closeButton
        ) {
            elements.closeButton.disabled =
                false;
        }

        return true;
    }


    /* ======================================================
       DISABLE
    ====================================================== */

    function disable() {
        enabled =
            false;

        if (
            core &&
            !core.isDestroyed()
        ) {
            core.disable();
        }

        panelElement?.classList.add(
            "is-disabled"
        );

        if (
            elements.input
        ) {
            elements.input.disabled =
                true;
        }

        if (
            elements.submitButton
        ) {
            elements.submitButton.disabled =
                true;
        }

        if (
            elements.clearButton
        ) {
            elements.clearButton.disabled =
                true;
        }

        if (
            elements.closeButton
        ) {
            elements.closeButton.disabled =
                true;
        }

        return true;
    }


    function isEnabled() {
        return enabled;
    }


    /* ======================================================
       LANGUAGE
    ====================================================== */

    function handleCoreLanguageChange() {
        if (
            rendered
        ) {
            refreshLanguage();
        }
    }


    function refreshLanguage() {
        if (
            !hasRendered()
        ) {
            return false;
        }

        const language =
            getCurrentLanguage();

        panelElement.setAttribute(
            "aria-label",
            translate(
                "searchPanel.ariaLabel",
                language ===
                    "zh"
                    ? "Gomai 搜索"
                    : "Pencarian Gomai"
            )
        );

        if (
            elements.input
        ) {
            const placeholder =
                translate(
                    "searchPanel.placeholder",
                    language ===
                        "zh"
                        ? "搜索商品或品牌..."
                        : "Cari produk atau brand..."
                );

            elements.input.placeholder =
                placeholder;

            elements.input.setAttribute(
                "aria-label",
                placeholder
            );
        }

        if (
            elements.submitButton
        ) {
            const label =
                translate(
                    "searchPanel.searchButton",
                    language ===
                        "zh"
                        ? "搜索"
                        : "Cari"
                );

            elements.submitButton.textContent =
                label;

            elements.submitButton.setAttribute(
                "aria-label",
                label
            );
        }

        if (
            elements.clearButton
        ) {
            elements.clearButton.setAttribute(
                "aria-label",
                translate(
                    "searchPanel.clearButton",
                    language ===
                        "zh"
                        ? "清除搜索"
                        : "Hapus pencarian"
                )
            );
        }

        if (
            elements.closeButton
        ) {
            elements.closeButton.setAttribute(
                "aria-label",
                translate(
                    "searchPanel.closeButton",
                    language ===
                        "zh"
                        ? "关闭搜索"
                        : "Tutup pencarian"
                )
            );
        }

        if (
            elements.suggestionList
        ) {
            elements.suggestionList.setAttribute(
                "aria-label",
                translate(
                    "searchPanel.suggestionsLabel",
                    language ===
                        "zh"
                        ? "搜索建议"
                        : "Saran pencarian"
                )
            );
        }

        if (
            loading &&
            elements.loadingLabel
        ) {
            elements.loadingLabel.textContent =
                loadingText ||
                translate(
                    "searchPanel.loading",
                    language ===
                        "zh"
                        ? "搜索中..."
                        : "Mencari..."
                );
        }

        if (
            suggestionSource.length >
                0 &&
            suggestions.length >
                0
        ) {
            const raw =
                cloneSafe(
                    suggestionSource
                );

            suggestions =
                normalizeSuggestions(
                    raw
                ).slice(
                    0,
                    options.maxSuggestions
                );

            renderSuggestions();
        } else if (
            elements.emptySuggestion &&
            !elements.emptySuggestion.hidden
        ) {
            elements.emptySuggestion.textContent =
                translate(
                    "searchPanel.noSuggestions",
                    language ===
                        "zh"
                        ? "没有搜索建议。"
                        : "Tidak ada saran pencarian."
                );
        }

        if (
            resultCount !==
            null
        ) {
            setResultCount(
                resultCount,
                {
                    text:
                        resultCountText
                }
            );
        }

        dispatch(
            EVENTS.LANGUAGE_REFRESHED,
            {
                language
            }
        );

        return true;
    }


    /* ======================================================
       DESTROY
    ====================================================== */

    function destroy(
        destroyOptions = {}
    ) {
        if (
            !rendered &&
            !core
        ) {
            return false;
        }

        cancelDebounce();
        invalidateSearch();

        suggestions =
            [];

        suggestionSource =
            [];

        activeSuggestionIndex =
            -1;

        loading =
            false;

        opened =
            false;

        enabled =
            false;

        resultCount =
            null;

        resultCountText =
            "";

        loadingText =
            "";

        const currentCore =
            core;

        if (
            currentCore &&
            !currentCore.isDestroyed()
        ) {
            /*
             * Listener dilepas lebih dahulu supaya tidak
             * meninggalkan listener document ketika host
             * Header dihancurkan.
             */
            try {
                currentCore
                    .removeAllListeners();
            } catch (_error) {
                /* best effort */
            }

            try {
                currentCore
                    .unbindLanguage();
            } catch (_error) {
                /* best effort */
            }

            try {
                if (
                    currentCore.isMounted()
                ) {
                    currentCore.unmount({
                        preserveListeners:
                            false
                    });
                }
            } catch (_error) {
                /* best effort */
            }

            /*
             * Tetap mencoba destroy agar cleanup internal
             * ComponentCore ikut dijalankan.
             */
            try {
                currentCore.destroy({
                    removeElement:
                        false,

                    clearData:
                        true
                });
            } catch (error) {
                console.warn(
                    "SearchPanelComponent: ComponentCore tidak dapat dihancurkan sepenuhnya.",
                    error
                );
            }
        }

        core =
            null;

        if (
            destroyOptions.removeMarkup !==
            false
        ) {
            panelElement?.remove();
        }

        resetElementCache();

        rootElement =
            null;

        panelElement =
            null;

        rendered =
            false;

        dispatchDirect(
            EVENTS.DESTROYED,
            {}
        );

        return true;
    }


    /* ======================================================
       EXISTING MARKUP
    ====================================================== */

    function removeExistingMarkup() {
        rootElement
            ?.querySelectorAll(
                "[data-search-panel='true']"
            )
            .forEach(
                element => {
                    element.remove();
                }
            );
    }


    function resetElementCache() {
        Object.keys(
            elements
        ).forEach(
            key => {
                elements[
                    key
                ] =
                    null;
            }
        );
    }


    function resetRuntimeReferences() {
        cancelDebounce();

        resetElementCache();

        rootElement =
            null;

        panelElement =
            null;

        rendered =
            false;

        opened =
            false;

        loading =
            false;

        enabled =
            true;

        suggestions =
            [];

        suggestionSource =
            [];

        activeSuggestionIndex =
            -1;

        resultCount =
            null;

        resultCountText =
            "";

        loadingText =
            "";
    }


    /* ======================================================
       PRODUCTS SEARCH URL
    ====================================================== */

    function buildProductsSearchURL(
        query
    ) {
        const queryKey =
            window.GomaiConfig
                ?.query
                ?.search ||
            "q";

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .buildRoute ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .buildRoute(
                        "products",
                        {
                            [queryKey]:
                                query
                        }
                    );
            } catch (error) {
                console.warn(
                    "SearchPanelComponent: gagal membentuk route pencarian.",
                    error
                );
            }
        }

        return resolveProjectPath(
            `pages/products.html?${encodeURIComponent(
                queryKey
            )}=${encodeURIComponent(
                query
            )}`
        );
    }


    /* ======================================================
       PRODUCT URL
    ====================================================== */

    function buildProductURL(
        product
    ) {
        const queryKey =
            window.GomaiConfig
                ?.query
                ?.productId ||
            "id";

        const id =
            normalizeText(
                product?.id ||
                product?.slug
            );

        if (
            !id
        ) {
            return "";
        }

        try {
            return window.GomaiUtils
                .buildRoute(
                    "productDetail",
                    {
                        [queryKey]:
                            id
                    }
                );
        } catch (_error) {
            return resolveProjectPath(
                `pages/product-detail.html?${encodeURIComponent(
                    queryKey
                )}=${encodeURIComponent(
                    id
                )}`
            );
        }
    }


    /* ======================================================
       BRAND URL
    ====================================================== */

    function buildBrandURL(
        brand
    ) {
        const queryKey =
            window.GomaiConfig
                ?.query
                ?.brandId ||
            "id";

        const id =
            normalizeText(
                brand?.id ||
                brand?.slug
            );

        if (
            !id
        ) {
            return "";
        }

        try {
            return window.GomaiUtils
                .buildRoute(
                    "brand",
                    {
                        [queryKey]:
                            id
                    }
                );
        } catch (_error) {
            return resolveProjectPath(
                `pages/brand.html?${encodeURIComponent(
                    queryKey
                )}=${encodeURIComponent(
                    id
                )}`
            );
        }
    }


    /* ======================================================
       SUGGESTION DESTINATION
    ====================================================== */

    function resolveSuggestionDestination(
        suggestion
    ) {
        if (
            suggestion.destination
        ) {
            return suggestion.destination;
        }

        const data =
            suggestion.data;

        if (
            !isPlainObject(
                data
            )
        ) {
            return "";
        }

        if (
            data.type ===
            "product"
        ) {
            return buildProductURL(
                data
            );
        }

        if (
            data.type ===
            "brand"
        ) {
            return buildBrandURL(
                data
            );
        }

        return "";
    }


    /* ======================================================
       PRODUCT IMAGE
    ====================================================== */

    function getProductImage(
        product
    ) {
        const direct =
            normalizeAssetArray(
                product?.images ||
                product?.gallery
            );

        if (
            direct.length >
            0
        ) {
            return direct[
                0
            ];
        }

        if (
            product?.image
        ) {
            return normalizeText(
                product.image
            );
        }

        const colors =
            Array.isArray(
                product?.colors
            )
                ? product.colors
                : [];

        for (
            const color
            of colors
        ) {
            const images =
                normalizeAssetArray(
                    color?.images ||
                    color?.gallery
                );

            if (
                images.length >
                0
            ) {
                return images[
                    0
                ];
            }
        }

        return "";
    }


    /* ======================================================
       BRAND-FIRST NAME
    ====================================================== */

    function formatBrandFirstName(
        productName,
        brandName
    ) {
        const name =
            normalizeText(
                productName
            );

        const brand =
            normalizeText(
                brandName
            );

        if (
            !brand
        ) {
            return name;
        }

        if (
            !name
        ) {
            return brand;
        }

        const normalizedName =
            name.toLocaleLowerCase();

        const normalizedBrand =
            brand.toLocaleLowerCase();

        if (
            normalizedName ===
                normalizedBrand ||
            normalizedName.startsWith(
                `${normalizedBrand} `
            )
        ) {
            return name;
        }

        return `${brand} ${name}`;
    }


    /* ======================================================
       CURRENCY
    ====================================================== */

    function formatCurrency(
        value
    ) {
        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .formatCurrency ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .formatCurrency(
                        value
                    );
            } catch (_error) {
                /* fallback */
            }
        }

        const number =
            Number(
                value
            ) ||
            0;

        return (
            `Rp ${Math.max(
                0,
                number
            ).toLocaleString(
                "id-ID"
            )}`
        );
    }


    /* ======================================================
       OPTIONS
    ====================================================== */

    function normalizeOptions(
        customOptions = {}
    ) {
        const source =
            isPlainObject(
                customOptions
            )
                ? customOptions
                : {};

        const configSearch =
            window.GomaiConfig
                ?.search ||
            {};

        const configUI =
            window.GomaiConfig
                ?.ui ||
            {};

        return {
            ...DEFAULT_OPTIONS,
            ...source,

            targetId:
                source.targetId ||
                source.target ||
                DEFAULT_TARGET_ID,

            mode:
                normalizeMode(
                    source.mode ||
                    DEFAULT_OPTIONS.mode
                ),

            openOnRender:
                source.openOnRender !==
                    undefined
                    ? Boolean(
                        source.openOnRender
                    )
                    : DEFAULT_OPTIONS
                        .openOnRender,

            closeOnSubmit:
                source.closeOnSubmit !==
                    undefined
                    ? Boolean(
                        source.closeOnSubmit
                    )
                    : DEFAULT_OPTIONS
                        .closeOnSubmit,

            closeOnSelect:
                source.closeOnSelect !==
                    undefined
                    ? Boolean(
                        source.closeOnSelect
                    )
                    : DEFAULT_OPTIONS
                        .closeOnSelect,

            closeOnOutsideClick:
                source.closeOnOutsideClick !==
                    undefined
                    ? Boolean(
                        source.closeOnOutsideClick
                    )
                    : DEFAULT_OPTIONS
                        .closeOnOutsideClick,

            closeOnEscape:
                source.closeOnEscape !==
                    undefined
                    ? Boolean(
                        source.closeOnEscape
                    )
                    : DEFAULT_OPTIONS
                        .closeOnEscape,

            clearOnSubmit:
                source.clearOnSubmit ===
                true,

            clearOnSelect:
                source.clearOnSelect ===
                true,

            submitEmptyQuery:
                source.submitEmptyQuery ===
                true,

            autoSearch:
                source.autoSearch !==
                false,

            navigateOnSubmit:
                source.navigateOnSubmit !==
                false,

            navigateOnSelect:
                source.navigateOnSelect !==
                false,

            minQueryLength:
                normalizePositiveInteger(
                    source.minQueryLength ??
                    configSearch
                        .minimumQueryLength,
                    DEFAULT_OPTIONS
                        .minQueryLength
                ),

            maxSuggestions:
                normalizePositiveInteger(
                    source.maxSuggestions ??
                    configSearch
                        .suggestionLimit,
                    DEFAULT_OPTIONS
                        .maxSuggestions
                ),

            productSuggestionLimit:
                normalizePositiveInteger(
                    source
                        .productSuggestionLimit ??
                    configSearch
                        .productSuggestionLimit,
                    DEFAULT_OPTIONS
                        .productSuggestionLimit
                ),

            brandSuggestionLimit:
                normalizePositiveInteger(
                    source
                        .brandSuggestionLimit ??
                    configSearch
                        .brandSuggestionLimit,
                    DEFAULT_OPTIONS
                        .brandSuggestionLimit
                ),

            debounce:
                normalizeNonNegativeInteger(
                    source.debounce ??
                    configUI
                        .searchDebounce,
                    DEFAULT_OPTIONS
                        .debounce
                ),

            showSubmitButton:
                source.showSubmitButton !==
                false,

            showClearButton:
                source.showClearButton !==
                false,

            showCloseButton:
                source.showCloseButton ===
                true,

            showResultCount:
                source.showResultCount !==
                false,

            showSuggestions:
                source.showSuggestions !==
                false,

            showLoading:
                source.showLoading !==
                false,

            autocomplete:
                normalizeAutocomplete(
                    source.autocomplete ||
                    DEFAULT_OPTIONS
                        .autocomplete
                ),

            inputName:
                normalizeText(
                    source.inputName ||
                    window.GomaiConfig
                        ?.query
                        ?.search ||
                    DEFAULT_OPTIONS
                        .inputName
                ) ||
                "q",

            inputId:
                normalizeDomId(
                    source.inputId ||
                    DEFAULT_OPTIONS
                        .inputId
                ),

            className:
                buildClassName(
                    source.className
                ),

            panelClassName:
                buildClassName(
                    source.panelClassName
                ),

            formClassName:
                buildClassName(
                    source.formClassName
                ),

            inputClassName:
                buildClassName(
                    source.inputClassName
                ),

            suggestionClassName:
                buildClassName(
                    source.suggestionClassName
                ),

            resultCountClassName:
                buildClassName(
                    source.resultCountClassName
                ),

            initialValue:
                normalizeQuery(
                    source.initialValue
                ),

            ariaLive:
                normalizeAriaLive(
                    source.ariaLive
                ),

            eventTarget:
                isEventTarget(
                    source.eventTarget
                )
                    ? source.eventTarget
                    : document,

            onSubmit:
                typeof source.onSubmit ===
                    "function"
                    ? source.onSubmit
                    : null,

            onSelect:
                typeof source.onSelect ===
                    "function"
                    ? source.onSelect
                    : null
        };
    }


    /* ======================================================
       MODE
    ====================================================== */

    function normalizeMode(
        value
    ) {
        const mode =
            normalizeText(
                value
            ).toLowerCase();

        return [
            "inline",
            "dropdown",
            "overlay"
        ].includes(
            mode
        )
            ? mode
            : "inline";
    }


    /* ======================================================
       NUMBERS
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
            number >
                0
        )
            ? number
            : fallback;
    }


    function normalizeNonNegativeInteger(
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
            number >=
                0
        )
            ? number
            : fallback;
    }


    /* ======================================================
       ARIA LIVE
    ====================================================== */

    function normalizeAriaLive(
        value
    ) {
        const normalized =
            normalizeText(
                value ||
                "polite"
            ).toLowerCase();

        return [
            "polite",
            "assertive",
            "off"
        ].includes(
            normalized
        )
            ? normalized
            : "polite";
    }


    /* ======================================================
       AUTOCOMPLETE
    ====================================================== */

    function normalizeAutocomplete(
        value
    ) {
        const normalized =
            normalizeText(
                value
            );

        return normalized ||
            "off";
    }


    /* ======================================================
       DOM ID
    ====================================================== */

    function normalizeDomId(
        value
    ) {
        const id =
            normalizeText(
                value
            )
                .replace(
                    /[^a-zA-Z0-9_-]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                );

        return id ||
            DEFAULT_OPTIONS.inputId;
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
            try {
                return normalizeLanguage(
                    window.Language
                        .getLanguage()
                );
            } catch (_error) {
                /* fallback */
            }
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
            normalizeText(
                value
            )
                .toLowerCase()
                .replace(
                    "_",
                    "-"
                )
                .split(
                    "-"
                )[0];

        return language ===
            "id"
                ? "id"
                : "zh";
    }


    /* ======================================================
       LOCALIZED PAIR
    ====================================================== */

    function normalizeLocalizedPair(
        value,
        fallback = ""
    ) {
        const fallbackText =
            normalizeText(
                fallback
            );

        if (
            typeof value ===
                "string" ||
            typeof value ===
                "number"
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
       GET LOCALIZED VALUE
    ====================================================== */

    function getLocalizedValue(
        value
    ) {
        if (
            typeof value ===
                "string" ||
            typeof value ===
                "number"
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

        const language =
            getCurrentLanguage();

        return normalizeText(
            value[
                language
            ] ||
            value.zh ||
            value.id
        );
    }


    /* ======================================================
       TRANSLATE
    ====================================================== */

    function translate(
        key,
        fallback = "",
        parameters = {}
    ) {
        if (
            window.Language &&
            typeof window.Language
                .translate ===
                "function"
        ) {
            try {
                const translated =
                    window.Language
                        .translate(
                            key,
                            fallback,
                            parameters
                        );

                if (
                    translated !==
                        undefined &&
                    translated !==
                        null
                ) {
                    return String(
                        translated
                    );
                }
            } catch (error) {
                console.warn(
                    `SearchPanelComponent: terjemahan "${key}" gagal.`,
                    error
                );
            }
        }

        return interpolate(
            fallback,
            parameters
        );
    }


    /* ======================================================
       INTERPOLATE
    ====================================================== */

    function interpolate(
        text,
        parameters = {}
    ) {
        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .interpolate ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .interpolate(
                        text,
                        parameters
                    );
            } catch (_error) {
                /* fallback */
            }
        }

        if (
            !isPlainObject(
                parameters
            )
        ) {
            return String(
                text ||
                ""
            );
        }

        return Object.entries(
            parameters
        ).reduce(
            (
                result,
                [
                    key,
                    value
                ]
            ) =>
                result.replaceAll(
                    `{{${key}}}`,
                    String(
                        value ??
                        ""
                    )
                ),

            String(
                text ||
                ""
            )
        );
    }


    /* ======================================================
       QUERY
    ====================================================== */

    function normalizeQuery(
        value
    ) {
        return normalizeText(
            value
        ).replace(
            /\s+/g,
            " "
        );
    }


    function isQueryValid(
        query
    ) {
        return (
            normalizeQuery(
                query
            ).length >=
            options.minQueryLength
        );
    }


    /* ======================================================
       IDENTIFIER
    ====================================================== */

    function normalizeIdentifier(
        value
    ) {
        return normalizeText(
            value
        )
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

        return Array.isArray(
            values
        )
            ? [
                ...new Set(
                    values
                        .map(
                            normalizeText
                        )
                        .filter(
                            Boolean
                        )
                )
            ]
            : [];
    }


    /* ======================================================
       CLASS NAMES
    ====================================================== */

    function buildClassName(
        ...values
    ) {
        return [
            ...new Set(
                values
                    .flatMap(
                        value =>
                            Array.isArray(
                                value
                            )
                                ? value
                                : String(
                                    value ??
                                    ""
                                ).split(
                                    /\s+/
                                )
                    )
                    .map(
                        normalizeText
                    )
                    .filter(
                        className =>
                            Boolean(
                                className
                            ) &&
                            /^[a-zA-Z0-9_-]+$/
                                .test(
                                    className
                                )
                    )
            )
        ].join(
            " "
        );
    }


    /* ======================================================
       TARGET
    ====================================================== */

    function resolveTarget(
        target,
        showWarning = false
    ) {
        if (
            target instanceof
            Element
        ) {
            return target;
        }

        const value =
            normalizeText(
                target
            );

        if (
            !value
        ) {
            return null;
        }

        const id =
            value.startsWith(
                "#"
            )
                ? value.slice(
                    1
                )
                : value;

        const byId =
            document.getElementById(
                id
            );

        if (
            byId
        ) {
            return byId;
        }

        let element =
            null;

        try {
            element =
                document.querySelector(
                    value
                );
        } catch (_error) {
            element =
                null;
        }

        if (
            !element &&
            showWarning
        ) {
            console.warn(
                `SearchPanelComponent: target "${value}" tidak ditemukan.`
            );
        }

        return element;
    }


    /* ======================================================
       ASSET PATH
    ====================================================== */

    function resolveAssetPath(
        path
    ) {
        const value =
            normalizeText(
                path
            );

        if (
            !value
        ) {
            return "";
        }

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .resolveAssetPath ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .resolveAssetPath(
                        value
                    );
            } catch (_error) {
                /* fallback */
            }
        }

        return value;
    }


    /* ======================================================
       PROJECT PATH
    ====================================================== */

    function resolveProjectPath(
        path
    ) {
        const value =
            normalizeText(
                path
            );

        if (
            !value
        ) {
            return "";
        }

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .resolveProjectPath ===
                "function"
        ) {
            try {
                return window.GomaiUtils
                    .resolveProjectPath(
                        value
                    );
            } catch (_error) {
                /* fallback */
            }
        }

        return value;
    }


    /* ======================================================
       CLEAR BUTTON STATE
    ====================================================== */

    function updateClearButton() {
        if (
            elements.clearButton
        ) {
            elements.clearButton.hidden =
                getValue().length ===
                0;
        }
    }


    /* ======================================================
       RENDER STATE
    ====================================================== */

    function hasRendered() {
        return Boolean(
            rendered &&
            panelElement
                ?.isConnected
        );
    }


    /* ======================================================
       EVENT TARGET
    ====================================================== */

    function isEventTarget(
        value
    ) {
        return Boolean(
            value &&
            typeof value
                .addEventListener ===
                "function" &&
            typeof value
                .removeEventListener ===
                "function" &&
            typeof value
                .dispatchEvent ===
                "function"
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

    function cloneSafe(
        value
    ) {
        if (
            value ===
            undefined
        ) {
            return undefined;
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
                /* fallback */
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
                /* fallback */
            }
        }

        if (
            Array.isArray(
                value
            )
        ) {
            return [
                ...value
            ];
        }

        if (
            isPlainObject(
                value
            )
        ) {
            return {
                ...value
            };
        }

        return value;
    }


    /* ======================================================
       DEBOUNCE
    ====================================================== */

    function cancelDebounce() {
        if (
            debounceTimer
        ) {
            window.clearTimeout(
                debounceTimer
            );

            debounceTimer =
                null;
        }
    }


    /* ======================================================
       SEARCH INVALIDATION
    ====================================================== */

    function invalidateSearch() {
        searchSequence +=
            1;
    }


    /* ======================================================
       DEPENDENCY VALIDATION
    ====================================================== */

    function validateCoreDependency() {
        if (
            !window.ComponentCore ||
            typeof window.ComponentCore
                .create !==
                "function"
        ) {
            throw new Error(
                "SearchPanelComponent membutuhkan ComponentCore."
            );
        }
    }


    function validateDependencies() {
        validateCoreDependency();

        if (
            !window.GomaiUtils
        ) {
            throw new Error(
                "SearchPanelComponent membutuhkan GomaiUtils."
            );
        }

        if (
            !window.Language
        ) {
            console.warn(
                "SearchPanelComponent: Language belum tersedia. Fallback internal akan digunakan."
            );
        }
    }


    function validateSearchDependencies() {
        if (
            !window.ProductsModel ||
            typeof window.ProductsModel
                .search !==
                "function"
        ) {
            throw new Error(
                "SearchPanelComponent membutuhkan ProductsModel.search()."
            );
        }

        if (
            !window.BrandsModel ||
            typeof window.BrandsModel
                .search !==
                "function"
        ) {
            throw new Error(
                "SearchPanelComponent membutuhkan BrandsModel.search()."
            );
        }

        if (
            typeof window.BrandsModel
                .getAll !==
                "function"
        ) {
            throw new Error(
                "SearchPanelComponent membutuhkan BrandsModel.getAll()."
            );
        }
    }


    /* ======================================================
       ERROR
    ====================================================== */

    function normalizeError(
        error
    ) {
        return error instanceof
            Error
            ? error
            : new Error(
                String(
                    error ||
                    "Terjadi kesalahan pada SearchPanelComponent."
                )
            );
    }


    function reportError(
        error,
        phase,
        detail = {}
    ) {
        const normalizedError =
            normalizeError(
                error
            );

        console.error(
            `SearchPanelComponent: error pada fase "${phase}".`,
            normalizedError
        );

        dispatchDirect(
            EVENTS.SEARCH_ERROR,
            {
                phase,

                error:
                    normalizedError,

                ...(
                    isPlainObject(
                        detail
                    )
                        ? detail
                        : {}
                )
            }
        );

        return normalizedError;
    }


    /* ======================================================
       DISPATCH
    ====================================================== */

    function dispatch(
        eventName,
        detail = {}
    ) {
        if (
            core &&
            !core.isDestroyed()
        ) {
            return core.dispatch(
                eventName,
                {
                    component:
                        publicAPI,

                    version:
                        VERSION,

                    ...detail
                },
                options.eventTarget
            );
        }

        return dispatchDirect(
            eventName,
            detail
        );
    }


    function dispatchDirect(
        eventName,
        detail = {}
    ) {
        const target =
            isEventTarget(
                options.eventTarget
            )
                ? options.eventTarget
                : document;

        return target.dispatchEvent(
            new CustomEvent(
                eventName,
                {
                    detail: {
                        component:
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

            render,
            destroy,

            refreshLanguage,

            open,
            close,
            toggle,

            focus,
            blur,

            setValue,
            getValue,
            clear,

            search,

            showLoading,
            hideLoading,
            isLoading,

            setResultCount,
            clearResultCount,
            getResultCount,

            setSuggestions,
            clearSuggestions,
            getSuggestions,

            enable,
            disable,
            isEnabled,

            isOpen,
            hasRendered,

            getElement() {
                return panelElement;
            },

            getInputElement() {
                return elements.input;
            },

            getCore() {
                return core;
            }
        });

    return publicAPI;
})();


window.SearchPanelComponent =
    SearchPanelComponent;