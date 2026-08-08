"use strict";

/* ==========================================================
   GOMAI COMPONENT CORE
   js/core/component-core.js

   Tanggung jawab:
   - Lifecycle komponen
   - Referensi root element
   - Visibility dan enabled state
   - Data dan state internal
   - Event listener dengan cleanup otomatis
   - CustomEvent dispatcher
   - Cleanup callback
   - Language lifecycle
   - Plugin lifecycle

   Prinsip:
   - Reusable
   - Tidak mengetahui komponen tertentu
   - Tidak melakukan bootstrap aplikasi
   - Tidak bergantung wajib pada Language
   - Aman dihancurkan dan dibuat ulang
========================================================== */

const ComponentCore = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       EVENTS
    ====================================================== */

    const EVENTS =
        Object.freeze({

            MOUNTING:
                "gomai:component-core-mounting",

            MOUNTED:
                "gomai:component-core-mounted",

            UNMOUNTING:
                "gomai:component-core-unmounting",

            UNMOUNTED:
                "gomai:component-core-unmounted",

            DESTROYING:
                "gomai:component-core-destroying",

            DESTROYED:
                "gomai:component-core-destroyed",

            SHOWN:
                "gomai:component-core-shown",

            HIDDEN:
                "gomai:component-core-hidden",

            ENABLED:
                "gomai:component-core-enabled",

            DISABLED:
                "gomai:component-core-disabled",

            DATA_CHANGED:
                "gomai:component-core-data-changed",

            DATA_REMOVED:
                "gomai:component-core-data-removed",

            DATA_CLEARED:
                "gomai:component-core-data-cleared",

            LANGUAGE_REFRESHED:
                "gomai:component-core-language-refreshed",

            PLUGIN_INSTALLED:
                "gomai:component-core-plugin-installed",

            PLUGIN_UNINSTALLED:
                "gomai:component-core-plugin-uninstalled",

            ERROR:
                "gomai:component-core-error"

        });


    let instanceCounter =
        0;


    /* ======================================================
       FACTORY
    ====================================================== */

    function create(
        options = {}
    ) {

        instanceCounter +=
            1;

        const settings =
            normalizeOptions(
                options,
                instanceCounter
            );


        /* ==================================================
           INITIAL STATE
        ================================================== */

        const initialState = {

            visible:
                settings.visible,

            enabled:
                settings.enabled,

            language:
                getCurrentLanguage(),

            data:
                cloneData(
                    settings.data
                )

        };


        const state = {

            id:
                settings.id,

            name:
                settings.name,

            element:
                null,

            mounted:
                false,

            visible:
                initialState.visible,

            enabled:
                initialState.enabled,

            destroyed:
                false,

            destroying:
                false,

            language:
                initialState.language,

            data:
                cloneData(
                    initialState.data
                )

        };


        /* ==================================================
           INTERNAL COLLECTIONS
        ================================================== */

        const listeners =
            new Set();

        const cleanupCallbacks =
            new Set();

        const activePlugins =
            [];

        const controlsDisabledByCore =
            new Set();


        let rootDisabledByCore =
            false;

        let languageEventBound =
            false;


        /* ==================================================
           PUBLIC API
        ================================================== */

        const publicAPI =
            Object.freeze({

                version:
                    VERSION,

                events:
                    EVENTS,

                state,

                mount,
                unmount,
                destroy,

                setElement,
                getElement,
                resolveElement,

                show,
                hide,
                toggleVisibility,

                enable,
                disable,
                toggleEnabled,

                setData,
                setManyData,
                getData,
                getAllData,
                hasData,
                removeData,
                clearData,

                setState,
                getState,
                resetState,

                dispatch,

                on,
                once,
                off,

                removeAllListeners,
                getListenerCount,

                addCleanup,
                removeCleanup,
                runCleanup,

                refreshLanguage,
                bindLanguage,
                unbindLanguage,

                use,
                unuse,
                hasPlugin,
                getPlugins,

                isMounted,
                isVisible,
                isEnabled,
                isDestroyed,
                isDestroying,

                getId,
                getName,
                getLanguage

            });


        initializePlugins();


        if (
            settings.languageAware
        ) {
            bindLanguage();
        }


        if (
            settings.element
        ) {
            mount(
                settings.element
            );
        }


        return publicAPI;


        /* ==================================================
           LIFECYCLE
        ================================================== */

        function mount(
            target
        ) {

            assertUsable(
                "mount"
            );


            const element =
                resolveElement(
                    target
                );


            if (!element) {

                console.warn(
                    `${createLogPrefix()} target mount tidak ditemukan.`
                );

                return null;

            }


            if (
                state.mounted &&
                state.element ===
                    element
            ) {
                return element;
            }


            if (
                state.mounted
            ) {
                unmount();
            }


            dispatch(
                EVENTS.MOUNTING,
                {
                    element
                }
            );


            state.element =
                element;

            state.mounted =
                true;


            applyVisibilityState();
            applyEnabledState();


            callHook(
                settings.onMount,
                {
                    element,

                    state,

                    core:
                        publicAPI
                }
            );


            runPluginHook(
                "onMount",
                {
                    element
                }
            );


            dispatch(
                EVENTS.MOUNTED,
                {
                    element
                }
            );


            return element;

        }


        function unmount(
            unmountOptions = {}
        ) {

            if (
                state.destroyed ||
                !state.mounted
            ) {
                return false;
            }


            const previousElement =
                state.element;


            dispatch(
                EVENTS.UNMOUNTING,
                {
                    element:
                        previousElement
                }
            );


            callHook(
                settings.onUnmount,
                {
                    element:
                        previousElement,

                    state,

                    core:
                        publicAPI
                }
            );


            runPluginHook(
                "onUnmount",
                {
                    element:
                        previousElement
                }
            );


            if (
                unmountOptions
                    .preserveListeners !==
                true
            ) {
                removeListenersForTarget(
                    previousElement
                );
            }


            state.element =
                null;

            state.mounted =
                false;


            controlsDisabledByCore
                .clear();

            rootDisabledByCore =
                false;


            dispatch(
                EVENTS.UNMOUNTED,
                {
                    element:
                        previousElement
                }
            );


            return true;

        }


        function destroy(
            destroyOptions = {}
        ) {

            if (
                state.destroyed ||
                state.destroying
            ) {
                return false;
            }


            state.destroying =
                true;


            const element =
                state.element;


            dispatch(
                EVENTS.DESTROYING,
                {
                    element
                }
            );


            try {

                runPluginHook(
                    "beforeDestroy",
                    {
                        element
                    }
                );


                callHook(
                    settings.onDestroy,
                    {
                        element,

                        state,

                        core:
                            publicAPI
                    }
                );


                unbindLanguage();

                removeAllListeners();

                runCleanup();

                uninstallAllPlugins();


                if (
                    destroyOptions
                        .removeElement ===
                        true &&
                    element &&
                    typeof element.remove ===
                        "function"
                ) {
                    element.remove();
                }


                state.element =
                    null;

                state.mounted =
                    false;

                state.visible =
                    false;

                state.enabled =
                    false;


                if (
                    destroyOptions
                        .clearData !==
                    false
                ) {
                    state.data =
                        {};
                }


                controlsDisabledByCore
                    .clear();

                rootDisabledByCore =
                    false;


                state.destroyed =
                    true;

                state.destroying =
                    false;


                dispatchDirect(
                    settings.eventTarget,
                    EVENTS.DESTROYED,
                    createEventDetail({
                        element
                    })
                );


                return true;

            } catch (error) {

                state.destroying =
                    false;

                reportError(
                    error,
                    "destroy"
                );

                return false;

            }

        }


        /* ==================================================
           ELEMENT
        ================================================== */

        function setElement(
            target
        ) {

            assertUsable(
                "setElement"
            );


            if (
                target === null
            ) {

                state.element =
                    null;

                state.mounted =
                    false;

                controlsDisabledByCore
                    .clear();

                rootDisabledByCore =
                    false;

                return null;

            }


            const element =
                resolveElement(
                    target
                );


            state.element =
                element;

            state.mounted =
                Boolean(
                    element
                );


            controlsDisabledByCore
                .clear();

            rootDisabledByCore =
                false;


            if (element) {

                applyVisibilityState();
                applyEnabledState();

            }


            return element;

        }


        function getElement() {
            return state.element;
        }


        function resolveElement(
            target
        ) {

            if (
                isElement(
                    target
                )
            ) {
                return target;
            }


            if (
                typeof target !==
                    "string"
            ) {
                return null;
            }


            const value =
                target.trim();


            if (!value) {
                return null;
            }


            try {

                if (
                    value.startsWith("#") ||
                    value.startsWith(".") ||
                    value.startsWith("[") ||
                    value.includes(" ") ||
                    value.includes(">") ||
                    value.includes(":")
                ) {
                    return document
                        .querySelector(
                            value
                        );
                }


                return (
                    document
                        .getElementById(
                            value
                        ) ||
                    document
                        .querySelector(
                            value
                        )
                );

            } catch (error) {

                console.warn(
                    `${createLogPrefix()} selector "${value}" tidak valid.`,
                    error
                );

                return null;

            }

        }


        /* ==================================================
           VISIBILITY
        ================================================== */

        function show() {

            assertUsable(
                "show"
            );


            state.visible =
                true;

            applyVisibilityState();


            runPluginHook(
                "onShow"
            );


            dispatch(
                EVENTS.SHOWN
            );


            return true;

        }


        function hide() {

            assertUsable(
                "hide"
            );


            state.visible =
                false;

            applyVisibilityState();


            runPluginHook(
                "onHide"
            );


            dispatch(
                EVENTS.HIDDEN
            );


            return true;

        }


        function toggleVisibility(
            force = null
        ) {

            const nextState =
                typeof force ===
                    "boolean"
                    ? force
                    : !state.visible;


            return nextState
                ? show()
                : hide();

        }


        function applyVisibilityState() {

            const element =
                state.element;


            if (!element) {
                return;
            }


            element.hidden =
                !state.visible;


            element.setAttribute(
                "aria-hidden",
                String(
                    !state.visible
                )
            );


            element.classList
                .toggle(
                    "is-hidden",
                    !state.visible
                );


            element.classList
                .toggle(
                    "is-visible",
                    state.visible
                );

        }


        /* ==================================================
           ENABLED STATE
        ================================================== */

        function enable() {

            assertUsable(
                "enable"
            );


            state.enabled =
                true;

            applyEnabledState();


            runPluginHook(
                "onEnable"
            );


            dispatch(
                EVENTS.ENABLED
            );


            return true;

        }


        function disable() {

            assertUsable(
                "disable"
            );


            state.enabled =
                false;

            applyEnabledState();


            runPluginHook(
                "onDisable"
            );


            dispatch(
                EVENTS.DISABLED
            );


            return true;

        }


        function toggleEnabled(
            force = null
        ) {

            const nextState =
                typeof force ===
                    "boolean"
                    ? force
                    : !state.enabled;


            return nextState
                ? enable()
                : disable();

        }


        function applyEnabledState() {

            const element =
                state.element;


            if (!element) {
                return;
            }


            element.classList
                .toggle(
                    "is-disabled",
                    !state.enabled
                );


            element.setAttribute(
                "aria-disabled",
                String(
                    !state.enabled
                )
            );


            if (
                !state.enabled
            ) {

                if (
                    "disabled" in
                    element &&
                    !element.disabled
                ) {

                    element.disabled =
                        true;

                    rootDisabledByCore =
                        true;

                }


                element
                    .querySelectorAll?.(
                        "button, input, select, textarea, fieldset"
                    )
                    .forEach(
                        control => {

                            if (
                                control.dataset
                                    .coreIgnoreDisabled ===
                                "true"
                            ) {
                                return;
                            }


                            if (
                                !control.disabled
                            ) {

                                control.disabled =
                                    true;

                                controlsDisabledByCore
                                    .add(
                                        control
                                    );

                            }

                        }
                    );


                return;

            }


            if (
                rootDisabledByCore &&
                "disabled" in
                element
            ) {

                element.disabled =
                    false;

                rootDisabledByCore =
                    false;

            }


            controlsDisabledByCore
                .forEach(
                    control => {

                        if (
                            control &&
                            control.isConnected
                        ) {
                            control.disabled =
                                false;
                        }

                    }
                );


            controlsDisabledByCore
                .clear();

        }


        /* ==================================================
           DATA
        ================================================== */

        function setData(
            key,
            value,
            dataOptions = {}
        ) {

            assertUsable(
                "setData"
            );


            const normalizedKey =
                normalizeKey(
                    key
                );


            if (!normalizedKey) {

                throw new Error(
                    `${createLogPrefix()} key data tidak valid.`
                );

            }


            const previousValue =
                state.data[
                    normalizedKey
                ];


            state.data[
                normalizedKey
            ] =
                value;


            if (
                dataOptions.emit !==
                    false
            ) {

                dispatch(
                    EVENTS.DATA_CHANGED,
                    {
                        key:
                            normalizedKey,

                        value,

                        previousValue,

                        data:
                            getAllData()
                    }
                );

            }


            return value;

        }


        function setManyData(
            values,
            dataOptions = {}
        ) {

            assertUsable(
                "setManyData"
            );


            if (
                !isPlainObject(
                    values
                )
            ) {

                throw new TypeError(
                    `${createLogPrefix()} setManyData() membutuhkan plain object.`
                );

            }


            const previousData =
                getAllData();


            Object.entries(
                values
            )
                .forEach(
                    ([
                        key,
                        value
                    ]) => {

                        const normalizedKey =
                            normalizeKey(
                                key
                            );


                        if (!normalizedKey) {
                            return;
                        }


                        state.data[
                            normalizedKey
                        ] =
                            value;

                    }
                );


            if (
                dataOptions.emit !==
                    false
            ) {

                dispatch(
                    EVENTS.DATA_CHANGED,
                    {
                        multiple:
                            true,

                        values:
                            cloneData(
                                values
                            ),

                        previousData,

                        data:
                            getAllData()
                    }
                );

            }


            return getAllData();

        }


        function getData(
            key,
            fallback = undefined
        ) {

            const normalizedKey =
                normalizeKey(
                    key
                );


            if (
                !normalizedKey ||
                !Object.prototype
                    .hasOwnProperty
                    .call(
                        state.data,
                        normalizedKey
                    )
            ) {
                return fallback;
            }


            return state.data[
                normalizedKey
            ];

        }


        function getAllData() {

            return cloneData(
                state.data
            );

        }


        function hasData(
            key
        ) {

            const normalizedKey =
                normalizeKey(
                    key
                );


            return Boolean(
                normalizedKey &&
                Object.prototype
                    .hasOwnProperty
                    .call(
                        state.data,
                        normalizedKey
                    )
            );

        }


        function removeData(
            key,
            dataOptions = {}
        ) {

            assertUsable(
                "removeData"
            );


            const normalizedKey =
                normalizeKey(
                    key
                );


            if (
                !normalizedKey ||
                !hasData(
                    normalizedKey
                )
            ) {
                return false;
            }


            const previousValue =
                state.data[
                    normalizedKey
                ];


            delete state.data[
                normalizedKey
            ];


            if (
                dataOptions.emit !==
                    false
            ) {

                dispatch(
                    EVENTS.DATA_REMOVED,
                    {
                        key:
                            normalizedKey,

                        previousValue,

                        data:
                            getAllData()
                    }
                );

            }


            return true;

        }


        function clearData(
            dataOptions = {}
        ) {

            if (
                state.destroyed &&
                dataOptions.force !==
                    true
            ) {
                return false;
            }


            const previousData =
                getAllData();


            state.data =
                {};


            if (
                dataOptions.emit !==
                    false &&
                !state.destroyed &&
                !state.destroying
            ) {

                dispatch(
                    EVENTS.DATA_CLEARED,
                    {
                        previousData
                    }
                );

            }


            return true;

        }


        /* ==================================================
           STATE
        ================================================== */

        function setState(
            values,
            stateOptions = {}
        ) {

            assertUsable(
                "setState"
            );


            if (
                !isPlainObject(
                    values
                )
            ) {

                throw new TypeError(
                    `${createLogPrefix()} setState() membutuhkan plain object.`
                );

            }


            const previousState =
                getState();


            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        values,
                        "visible"
                    )
            ) {

                state.visible =
                    Boolean(
                        values.visible
                    );

                applyVisibilityState();

            }


            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        values,
                        "enabled"
                    )
            ) {

                state.enabled =
                    Boolean(
                        values.enabled
                    );

                applyEnabledState();

            }


            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        values,
                        "language"
                    )
            ) {

                state.language =
                    normalizeLanguage(
                        values.language
                    );

            }


            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        values,
                        "data"
                    ) &&
                isPlainObject(
                    values.data
                )
            ) {

                if (
                    stateOptions
                        .replaceData ===
                    true
                ) {

                    state.data =
                        cloneData(
                            values.data
                        );

                } else {

                    Object.assign(
                        state.data,
                        cloneData(
                            values.data
                        )
                    );

                }

            }


            if (
                stateOptions.emit !==
                    false
            ) {

                dispatch(
                    EVENTS.DATA_CHANGED,
                    {
                        stateChanged:
                            true,

                        previousState,

                        state:
                            getState()
                    }
                );

            }


            return getState();

        }


        function getState() {

            return Object.freeze({

                id:
                    state.id,

                name:
                    state.name,

                mounted:
                    state.mounted,

                visible:
                    state.visible,

                enabled:
                    state.enabled,

                destroyed:
                    state.destroyed,

                destroying:
                    state.destroying,

                language:
                    state.language,

                element:
                    state.element,

                data:
                    getAllData()

            });

        }


        function resetState(
            resetOptions = {}
        ) {

            assertUsable(
                "resetState"
            );


            state.visible =
                initialState.visible;

            state.enabled =
                initialState.enabled;

            state.language =
                initialState.language;

            state.data =
                cloneData(
                    initialState.data
                );


            applyVisibilityState();
            applyEnabledState();


            if (
                resetOptions.emit !==
                    false
            ) {

                dispatch(
                    EVENTS.DATA_CHANGED,
                    {
                        reset:
                            true,

                        state:
                            getState()
                    }
                );

            }


            return getState();

        }


        /* ==================================================
           EVENT DISPATCH
        ================================================== */

        function dispatch(
            eventName,
            detail = {},
            targetOrOptions = null
        ) {

            assertUsable(
                "dispatch"
            );


            const eventOptions =
                normalizeDispatchOptions(
                    targetOrOptions,
                    settings.eventTarget
                );


            return dispatchDirect(
                eventOptions.target,
                eventName,
                createEventDetail(
                    detail
                ),
                eventOptions
            );

        }


        /* ==================================================
           EVENT LISTENERS
        ================================================== */

        function on(
            targetOrEvent,
            eventOrHandler,
            handlerOrOptions,
            listenerOptions
        ) {

            assertUsable(
                "on"
            );


            const config =
                normalizeListenerArguments(
                    targetOrEvent,
                    eventOrHandler,
                    handlerOrOptions,
                    listenerOptions,
                    settings.eventTarget
                );


            const duplicate =
                findExactListener(
                    config.target,
                    config.eventName,
                    config.handler,
                    config.options
                );


            if (duplicate) {

                return () => {

                    removeListenerRecord(
                        duplicate
                    );

                };

            }


            config.target
                .addEventListener(
                    config.eventName,
                    config.handler,
                    config.options
                );


            const record = {

                target:
                    config.target,

                eventName:
                    config.eventName,

                handler:
                    config.handler,

                options:
                    config.options,

                capture:
                    getCaptureValue(
                        config.options
                    )

            };


            listeners.add(
                record
            );


            return () => {

                removeListenerRecord(
                    record
                );

            };

        }


        function once(
            targetOrEvent,
            eventOrHandler,
            handlerOrOptions,
            listenerOptions
        ) {

            /*
             * once("event", handler, options)
             */
            if (
                typeof targetOrEvent ===
                    "string" &&
                typeof eventOrHandler ===
                    "function"
            ) {

                const options =
                    normalizeListenerOptions(
                        handlerOrOptions
                    );


                options.once =
                    true;


                return on(
                    targetOrEvent,
                    eventOrHandler,
                    options
                );

            }


            /*
             * once(target, "event", handler, options)
             */
            const options =
                normalizeListenerOptions(
                    listenerOptions
                );


            options.once =
                true;


            return on(
                targetOrEvent,
                eventOrHandler,
                handlerOrOptions,
                options
            );

        }


        function off(
            targetOrEvent,
            eventOrHandler = null,
            handler = null
        ) {

            const matches =
                findListenerRecords(
                    targetOrEvent,
                    eventOrHandler,
                    handler
                );


            matches.forEach(
                record => {

                    removeListenerRecord(
                        record
                    );

                }
            );


            return matches.length;

        }


        function removeAllListeners() {

            const records =
                Array.from(
                    listeners
                );


            records.forEach(
                record => {

                    removeListenerRecord(
                        record
                    );

                }
            );


            return records.length;

        }


        function removeListenersForTarget(
            target
        ) {

            if (
                !isEventTarget(
                    target
                )
            ) {
                return 0;
            }


            const matches =
                Array.from(
                    listeners
                )
                    .filter(
                        record =>
                            record.target ===
                            target
                    );


            matches.forEach(
                record => {

                    removeListenerRecord(
                        record
                    );

                }
            );


            return matches.length;

        }


        function getListenerCount() {
            return listeners.size;
        }


        function findListenerRecords(
            targetOrEvent,
            eventOrHandler,
            handler
        ) {

            const records =
                Array.from(
                    listeners
                );


            /*
             * off("event")
             * off("event", handler)
             */
            if (
                typeof targetOrEvent ===
                    "string"
            ) {

                const eventName =
                    normalizeEventName(
                        targetOrEvent
                    );


                const expectedHandler =
                    typeof eventOrHandler ===
                        "function"
                        ? eventOrHandler
                        : null;


                return records.filter(
                    record => {

                        if (
                            record.target !==
                            settings.eventTarget
                        ) {
                            return false;
                        }


                        if (
                            record.eventName !==
                            eventName
                        ) {
                            return false;
                        }


                        if (
                            expectedHandler &&
                            record.handler !==
                                expectedHandler
                        ) {
                            return false;
                        }


                        return true;

                    }
                );

            }


            /*
             * off(target)
             * off(target, "event")
             * off(target, "event", handler)
             */
            if (
                isEventTarget(
                    targetOrEvent
                )
            ) {

                const eventName =
                    typeof eventOrHandler ===
                        "string"
                        ? normalizeEventName(
                            eventOrHandler
                        )
                        : "";


                const expectedHandler =
                    typeof handler ===
                        "function"
                        ? handler
                        : (
                            typeof eventOrHandler ===
                                "function"
                                ? eventOrHandler
                                : null
                        );


                return records.filter(
                    record => {

                        if (
                            record.target !==
                            targetOrEvent
                        ) {
                            return false;
                        }


                        if (
                            eventName &&
                            record.eventName !==
                                eventName
                        ) {
                            return false;
                        }


                        if (
                            expectedHandler &&
                            record.handler !==
                                expectedHandler
                        ) {
                            return false;
                        }


                        return true;

                    }
                );

            }


            return [];

        }


        function findExactListener(
            target,
            eventName,
            handler,
            options
        ) {

            const capture =
                getCaptureValue(
                    options
                );


            return (
                Array.from(
                    listeners
                )
                    .find(
                        record =>
                            record.target ===
                                target &&
                            record.eventName ===
                                eventName &&
                            record.handler ===
                                handler &&
                            record.capture ===
                                capture
                    ) ||
                null
            );

        }


        function removeListenerRecord(
            record
        ) {

            if (
                !record ||
                !listeners.has(
                    record
                )
            ) {
                return false;
            }


            try {

                record.target
                    .removeEventListener(
                        record.eventName,
                        record.handler,
                        record.capture
                    );

            } catch (error) {

                console.warn(
                    `${createLogPrefix()} gagal melepas listener "${record.eventName}".`,
                    error
                );

            }


            listeners.delete(
                record
            );


            return true;

        }


        /* ==================================================
           CLEANUP
        ================================================== */

        function addCleanup(
            callback
        ) {

            assertUsable(
                "addCleanup"
            );


            if (
                typeof callback !==
                    "function"
            ) {

                throw new TypeError(
                    `${createLogPrefix()} cleanup harus berupa function.`
                );

            }


            cleanupCallbacks.add(
                callback
            );


            return () => {

                removeCleanup(
                    callback
                );

            };

        }


        function removeCleanup(
            callback
        ) {

            return cleanupCallbacks
                .delete(
                    callback
                );

        }


        function runCleanup() {

            const callbacks =
                Array.from(
                    cleanupCallbacks
                );


            cleanupCallbacks
                .clear();


            callbacks.forEach(
                callback => {

                    try {

                        callback({
                            state,
                            core:
                                publicAPI
                        });

                    } catch (error) {

                        reportError(
                            error,
                            "cleanup"
                        );

                    }

                }
            );


            return callbacks.length;

        }


        /* ==================================================
           LANGUAGE
        ================================================== */

        function refreshLanguage(
            context = {}
        ) {

            if (
                state.destroyed ||
                state.destroying
            ) {
                return false;
            }


            let language =
                getCurrentLanguage();


            if (
                typeof context ===
                    "string"
            ) {

                language =
                    context;

            } else if (
                context &&
                typeof context ===
                    "object"
            ) {

                language =
                    context.language ||
                    context.detail
                        ?.language ||
                    context.event
                        ?.detail
                        ?.language ||
                    language;

            }


            state.language =
                normalizeLanguage(
                    language
                );


            const payload = {

                language:
                    state.language,

                context,

                state,

                core:
                    publicAPI

            };


            callHook(
                settings.onLanguageChange,
                payload
            );


            runPluginHook(
                "onLanguageChange",
                payload
            );


            dispatch(
                EVENTS.LANGUAGE_REFRESHED,
                {
                    language:
                        state.language
                }
            );


            return true;

        }


        function bindLanguage() {

            if (
                languageEventBound ||
                state.destroyed ||
                state.destroying
            ) {
                return false;
            }


            on(
                document,
                "gomai:language-changed",
                handleLanguageChanged
            );


            languageEventBound =
                true;


            return true;

        }


        function unbindLanguage() {

            if (
                !languageEventBound
            ) {
                return false;
            }


            off(
                document,
                "gomai:language-changed",
                handleLanguageChanged
            );


            languageEventBound =
                false;


            return true;

        }


        function handleLanguageChanged(
            event
        ) {

            refreshLanguage({
                language:
                    event?.detail?.language ||
                    getCurrentLanguage(),

                event
            });

        }


        /* ==================================================
           PLUGINS
        ================================================== */

        function use(
            plugin
        ) {

            assertUsable(
                "use"
            );


            if (
                !plugin ||
                typeof plugin !==
                    "object"
            ) {
                return false;
            }


            const pluginName =
                normalizePluginName(
                    plugin.name
                );


            if (
                pluginName &&
                hasPlugin(
                    pluginName
                )
            ) {
                return false;
            }


            try {

                if (
                    typeof plugin.install ===
                        "function"
                ) {

                    plugin.install(
                        publicAPI
                    );

                }


                activePlugins.push(
                    plugin
                );


                dispatch(
                    EVENTS.PLUGIN_INSTALLED,
                    {
                        plugin:
                            pluginName ||
                            "anonymous"
                    }
                );


                return true;

            } catch (error) {

                reportError(
                    error,
                    "plugin-install"
                );

                return false;

            }

        }


        function unuse(
            pluginName
        ) {

            const normalizedName =
                normalizePluginName(
                    pluginName
                );


            const index =
                activePlugins
                    .findIndex(
                        plugin =>
                            normalizePluginName(
                                plugin.name
                            ) ===
                            normalizedName
                    );


            if (
                index < 0
            ) {
                return false;
            }


            const plugin =
                activePlugins[
                    index
                ];


            try {

                if (
                    typeof plugin.uninstall ===
                        "function"
                ) {

                    plugin.uninstall(
                        publicAPI
                    );

                }

            } catch (error) {

                reportError(
                    error,
                    "plugin-uninstall"
                );

            }


            activePlugins.splice(
                index,
                1
            );


            if (
                !state.destroyed &&
                !state.destroying
            ) {

                dispatch(
                    EVENTS.PLUGIN_UNINSTALLED,
                    {
                        plugin:
                            normalizedName ||
                            "anonymous"
                    }
                );

            }


            return true;

        }


        function uninstallAllPlugins() {

            const plugins =
                [...activePlugins];


            activePlugins.length =
                0;


            plugins
                .reverse()
                .forEach(
                    plugin => {

                        try {

                            if (
                                typeof plugin
                                    .uninstall ===
                                    "function"
                            ) {

                                plugin.uninstall(
                                    publicAPI
                                );

                            }

                        } catch (error) {

                            reportError(
                                error,
                                "plugin-uninstall"
                            );

                        }

                    }
                );

        }


        function initializePlugins() {

            settings.plugins
                .forEach(
                    plugin => {

                        use(
                            plugin
                        );

                    }
                );

        }


        function runPluginHook(
            hook,
            payload = {}
        ) {

            activePlugins
                .forEach(
                    plugin => {

                        const method =
                            plugin?.[
                                hook
                            ];


                        if (
                            typeof method !==
                                "function"
                        ) {
                            return;
                        }


                        try {

                            method.call(
                                plugin,
                                publicAPI,
                                payload
                            );

                        } catch (error) {

                            reportError(
                                error,
                                `plugin-${hook}`
                            );

                        }

                    }
                );

        }


        function hasPlugin(
            pluginName
        ) {

            const normalizedName =
                normalizePluginName(
                    pluginName
                );


            if (!normalizedName) {
                return false;
            }


            return activePlugins
                .some(
                    plugin =>
                        normalizePluginName(
                            plugin.name
                        ) ===
                        normalizedName
                );

        }


        function getPlugins() {

            return [
                ...activePlugins
            ];

        }


        /* ==================================================
           STATUS
        ================================================== */

        function isMounted() {
            return state.mounted;
        }


        function isVisible() {
            return state.visible;
        }


        function isEnabled() {
            return state.enabled;
        }


        function isDestroyed() {
            return state.destroyed;
        }


        function isDestroying() {
            return state.destroying;
        }


        function getId() {
            return state.id;
        }


        function getName() {
            return state.name;
        }


        function getLanguage() {
            return state.language;
        }


        /* ==================================================
           INSTANCE HELPERS
        ================================================== */

        function createEventDetail(
            detail = {}
        ) {

            const normalizedDetail =
                detail &&
                typeof detail ===
                    "object" &&
                !Array.isArray(
                    detail
                )
                    ? detail
                    : {
                        value:
                            detail
                    };


            return {

                core:
                    publicAPI,

                componentId:
                    state.id,

                componentName:
                    state.name,

                timestamp:
                    Date.now(),

                ...normalizedDetail

            };

        }


        function createLogPrefix() {

            return (
                `[ComponentCore:${state.name}:${state.id}]`
            );

        }


        function assertUsable(
            methodName
        ) {

            if (
                state.destroyed
            ) {

                throw new Error(
                    `${createLogPrefix()} tidak dapat menjalankan ${methodName}() karena instance sudah dihancurkan.`
                );

            }


            if (
                state.destroying
            ) {

                throw new Error(
                    `${createLogPrefix()} tidak dapat menjalankan ${methodName}() karena instance sedang dihancurkan.`
                );

            }

        }


        function reportError(
            error,
            phase = "unknown"
        ) {

            const normalizedError =
                normalizeError(
                    error
                );


            console.error(
                `${createLogPrefix()} error pada fase "${phase}".`,
                normalizedError
            );


            try {

                dispatchDirect(
                    settings.eventTarget,
                    EVENTS.ERROR,
                    createEventDetail({
                        phase,

                        error:
                            normalizedError
                    })
                );

            } catch (_dispatchError) {
                /*
                 * Error reporter tidak boleh membuat
                 * error kedua.
                 */
            }


            return normalizedError;

        }

    }


    /* ======================================================
       OPTION NORMALIZATION
    ====================================================== */

    function normalizeOptions(
        options,
        counter
    ) {

        const source =
            isPlainObject(
                options
            )
                ? options
                : {};


        const name =
            normalizeName(
                source.name ||
                `component${counter}`
            );


        const id =
            String(
                source.id ||
                `${name}-${counter}`
            ).trim();


        return {

            id:
                id ||
                `component-${counter}`,

            name,

            element:
                source.element ||
                null,

            visible:
                source.visible !==
                false,

            enabled:
                source.enabled !==
                false,

            languageAware:
                source.languageAware ===
                true,

            data:
                isPlainObject(
                    source.data
                )
                    ? cloneData(
                        source.data
                    )
                    : {},

            plugins:
                Array.isArray(
                    source.plugins
                )
                    ? [
                        ...source.plugins
                    ]
                    : [],

            eventTarget:
                isEventTarget(
                    source.eventTarget
                )
                    ? source.eventTarget
                    : document,

            onMount:
                normalizeHook(
                    source.onMount
                ),

            onUnmount:
                normalizeHook(
                    source.onUnmount
                ),

            onDestroy:
                normalizeHook(
                    source.onDestroy
                ),

            onLanguageChange:
                normalizeHook(
                    source.onLanguageChange
                )

        };

    }


    function normalizeName(
        value
    ) {

        const text =
            String(
                value ||
                ""
            ).trim();


        if (!text) {
            return "component";
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


    function normalizeKey(
        value
    ) {

        return String(
            value ??
            ""
        ).trim();

    }


    function normalizePluginName(
        value
    ) {

        return String(
            value ??
            ""
        )
            .trim()
            .toLowerCase();

    }


    function normalizeHook(
        value
    ) {

        return typeof value ===
            "function"
            ? value
            : null;

    }


    /* ======================================================
       EVENT ARGUMENT NORMALIZATION
    ====================================================== */

    function normalizeListenerArguments(
        targetOrEvent,
        eventOrHandler,
        handlerOrOptions,
        listenerOptions,
        defaultTarget
    ) {

        /*
         * core.on(
         *     "gomai:event",
         *     handler,
         *     options
         * )
         */
        if (
            typeof targetOrEvent ===
                "string" &&
            typeof eventOrHandler ===
                "function"
        ) {

            return {

                target:
                    defaultTarget,

                eventName:
                    normalizeEventName(
                        targetOrEvent
                    ),

                handler:
                    eventOrHandler,

                options:
                    normalizeListenerOptions(
                        handlerOrOptions
                    )

            };

        }


        /*
         * core.on(
         *     target,
         *     "click",
         *     handler,
         *     options
         * )
         */
        if (
            isEventTarget(
                targetOrEvent
            ) &&
            typeof eventOrHandler ===
                "string" &&
            typeof handlerOrOptions ===
                "function"
        ) {

            return {

                target:
                    targetOrEvent,

                eventName:
                    normalizeEventName(
                        eventOrHandler
                    ),

                handler:
                    handlerOrOptions,

                options:
                    normalizeListenerOptions(
                        listenerOptions
                    )

            };

        }


        throw new TypeError(
            "ComponentCore.on(): argumen listener tidak valid."
        );

    }


    function normalizeListenerOptions(
        value
    ) {

        if (
            typeof value ===
                "boolean"
        ) {

            return {
                capture:
                    value
            };

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


        return {};

    }


    function getCaptureValue(
        options
    ) {

        if (
            typeof options ===
                "boolean"
        ) {
            return options;
        }


        return Boolean(
            options?.capture
        );

    }


    function normalizeEventName(
        value
    ) {

        const eventName =
            String(
                value ||
                ""
            ).trim();


        if (!eventName) {

            throw new Error(
                "ComponentCore: nama event tidak valid."
            );

        }


        return eventName;

    }


    function normalizeDispatchOptions(
        targetOrOptions,
        defaultTarget
    ) {

        if (
            isEventTarget(
                targetOrOptions
            )
        ) {

            return {

                target:
                    targetOrOptions,

                bubbles:
                    false,

                cancelable:
                    false,

                composed:
                    false

            };

        }


        if (
            isPlainObject(
                targetOrOptions
            )
        ) {

            return {

                target:
                    isEventTarget(
                        targetOrOptions
                            .target
                    )
                        ? targetOrOptions
                            .target
                        : defaultTarget,

                bubbles:
                    Boolean(
                        targetOrOptions
                            .bubbles
                    ),

                cancelable:
                    Boolean(
                        targetOrOptions
                            .cancelable
                    ),

                composed:
                    Boolean(
                        targetOrOptions
                            .composed
                    )

            };

        }


        return {

            target:
                defaultTarget,

            bubbles:
                false,

            cancelable:
                false,

            composed:
                false

        };

    }


    /* ======================================================
       DIRECT EVENT DISPATCH
    ====================================================== */

    function dispatchDirect(
        target,
        eventName,
        detail = {},
        options = {}
    ) {

        if (
            !isEventTarget(
                target
            )
        ) {
            return false;
        }


        const event =
            new CustomEvent(
                normalizeEventName(
                    eventName
                ),
                {
                    detail,

                    bubbles:
                        Boolean(
                            options.bubbles
                        ),

                    cancelable:
                        Boolean(
                            options.cancelable
                        ),

                    composed:
                        Boolean(
                            options.composed
                        )
                }
            );


        return target.dispatchEvent(
            event
        );

    }


    /* ======================================================
       HOOKS
    ====================================================== */

    function callHook(
        hook,
        context = {}
    ) {

        if (
            typeof hook !==
                "function"
        ) {
            return undefined;
        }


        try {

            return hook(
                context
            );

        } catch (error) {

            console.error(
                "ComponentCore lifecycle hook gagal.",
                error
            );

            return undefined;

        }

    }


    /* ======================================================
       LANGUAGE
    ====================================================== */

    function getCurrentLanguage() {

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
             * Gunakan fallback.
             */
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
                "zh"
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
            supported.length > 0
        ) {

            return supported
                .includes(
                    language
                )
                    ? language
                    : (
                        window.GomaiConfig
                            ?.language
                            ?.default ||
                        "zh"
                    );

        }


        return (
            language === "id" ||
            language === "zh"
        )
            ? language
            : "zh";

    }


    /* ======================================================
       TYPE HELPERS
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


    function isElement(
        value
    ) {

        return Boolean(
            value &&
            typeof value ===
                "object" &&
            value.nodeType ===
                1 &&
            typeof value.nodeName ===
                "string"
        );

    }


    /* ======================================================
       CLONE
    ====================================================== */

    function cloneData(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return value;
        }


        if (
            typeof window.GomaiUtils
                ?.cloneData ===
                "function"
        ) {

            try {

                return window.GomaiUtils
                    .cloneData(
                        value
                    );

            } catch (_error) {
                /*
                 * Gunakan fallback.
                 */
            }

        }


        if (
            typeof value ===
                "function" ||
            isElement(
                value
            ) ||
            isEventTarget(
                value
            )
        ) {
            return value;
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
                 * Gunakan fallback manual.
                 */
            }

        }


        if (
            Array.isArray(
                value
            )
        ) {

            return value.map(
                cloneData
            );

        }


        if (
            isPlainObject(
                value
            )
        ) {

            const result =
                {};


            Object.entries(
                value
            )
                .forEach(
                    ([
                        key,
                        item
                    ]) => {

                        result[key] =
                            cloneData(
                                item
                            );

                    }
                );


            return result;

        }


        return value;

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

            const normalizedError =
                new Error(
                    error.message
                );


            if (
                error.name
            ) {

                normalizedError.name =
                    String(
                        error.name
                    );

            }


            return normalizedError;

        }


        return new Error(
            String(
                error ||
                "Unknown ComponentCore error"
            )
        );

    }


    /* ======================================================
       PUBLIC MODULE API
    ====================================================== */

    const publicAPI =
        Object.freeze({

            version:
                VERSION,

            events:
                EVENTS,

            create,

            getInstanceCount() {
                return instanceCounter;
            }

        });


    return publicAPI;

})();


window.ComponentCore =
    ComponentCore;