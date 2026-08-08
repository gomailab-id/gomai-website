"use strict";

/* ==========================================================
   GOMAI BASE COMPONENT
   js/core/base-component.js

   Tanggung jawab:
   - Fondasi reusable komponen UI
   - Lifecycle init / render / mount / unmount / destroy
   - Template rendering
   - Data dan state
   - DOM references
   - Event listener
   - Cleanup
   - Language refresh
   - Plugin delegation melalui ComponentCore

   Prinsip:
   - Composition di atas ComponentCore
   - Tidak menangani routing
   - Tidak menangani model bisnis
   - Tidak melakukan bootstrap aplikasi
   - Aman untuk render ulang
========================================================== */

const BaseComponent = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       EVENTS
    ====================================================== */

    const EVENTS =
        Object.freeze({

            INITIALIZING:
                "gomai:base-component-initializing",

            INITIALIZED:
                "gomai:base-component-initialized",

            INIT_ERROR:
                "gomai:base-component-init-error",

            BEFORE_RENDER:
                "gomai:base-component-before-render",

            RENDERING:
                "gomai:base-component-rendering",

            RENDERED:
                "gomai:base-component-rendered",

            RENDER_ERROR:
                "gomai:base-component-render-error",

            BEFORE_MOUNT:
                "gomai:base-component-before-mount",

            MOUNTED:
                "gomai:base-component-mounted",

            UNMOUNTING:
                "gomai:base-component-unmounting",

            UNMOUNTED:
                "gomai:base-component-unmounted",

            LANGUAGE_REFRESHING:
                "gomai:base-component-language-refreshing",

            LANGUAGE_REFRESHED:
                "gomai:base-component-language-refreshed",

            LANGUAGE_ERROR:
                "gomai:base-component-language-error",

            DESTROYING:
                "gomai:base-component-destroying",

            DESTROYED:
                "gomai:base-component-destroyed",

            DESTROY_ERROR:
                "gomai:base-component-destroy-error",

            DATA_CHANGED:
                "gomai:base-component-data-changed",

            STATE_CHANGED:
                "gomai:base-component-state-changed",

            ERROR:
                "gomai:base-component-error"

        });


    /* ======================================================
       DEFAULT OPTIONS
    ====================================================== */

    const DEFAULT_OPTIONS =
        Object.freeze({

            name:
                "component",

            id:
                "",

            target:
                null,

            targetId:
                "",

            rootTag:
                "div",

            rootId:
                "",

            className:
                "",

            attributes:
                {},

            autoRender:
                true,

            autoMount:
                true,

            replaceTargetContent:
                true,

            removeRootOnDestroy:
                false,

            languageAware:
                true,

            rerenderOnLanguageChange:
                false,

            visible:
                true,

            enabled:
                true,

            required:
                false,

            template:
                null,

            data:
                {},

            state:
                {},

            refs:
                {},

            plugins:
                [],

            eventTarget:
                document,

            debug:
                false

        });


    let instanceCounter =
        0;


    /* ======================================================
       FACTORY
    ====================================================== */

    function create(
        definition = {}
    ) {

        validateDefinition(
            definition
        );


        instanceCounter +=
            1;


        const settings =
            normalizeDefinition(
                definition,
                instanceCounter
            );


        /* ==================================================
           INITIAL SNAPSHOT
        ================================================== */

        const initialSnapshot = {

            data:
                cloneData(
                    settings.data
                ),

            state:
                cloneData(
                    settings.state
                ),

            visible:
                settings.visible,

            enabled:
                settings.enabled,

            language:
                getCurrentLanguage()

        };


        /* ==================================================
           LIFECYCLE STATE
        ================================================== */

        const lifecycle = {

            initialized:
                false,

            initializing:
                false,

            rendering:
                false,

            rendered:
                false,

            mounting:
                false,

            mounted:
                false,

            unmounting:
                false,

            destroying:
                false,

            destroyed:
                false,

            initPromise:
                null,

            renderPromise:
                null,

            mountPromise:
                null,

            unmountPromise:
                null,

            destroyPromise:
                null

        };


        /* ==================================================
           INTERNAL STATE
        ================================================== */

        const internalState = {

            id:
                settings.id,

            name:
                settings.name,

            target:
                null,

            root:
                null,

            language:
                initialSnapshot.language,

            visible:
                initialSnapshot.visible,

            enabled:
                initialSnapshot.enabled,

            data:
                cloneData(
                    initialSnapshot.data
                ),

            state:
                cloneData(
                    initialSnapshot.state
                ),

            refs:
                new Map(),

            renderCount:
                0,

            lastRenderedAt:
                null,

            lastInitializedAt:
                null,

            lastDestroyedAt:
                null,

            lastError:
                null

        };


        const cleanupCallbacks =
            new Set();


        let core =
            null;

        let languageEventBound =
            false;


        /* ==================================================
           COMPONENT CONTEXT
        ================================================== */

        const context = {

            component:
                null,

            settings,

            lifecycle,


            get id() {
                return internalState.id;
            },


            get name() {
                return internalState.name;
            },


            get target() {
                return internalState.target;
            },


            get root() {
                return internalState.root;
            },


            get language() {
                return internalState.language;
            },


            get visible() {
                return internalState.visible;
            },


            get enabled() {
                return internalState.enabled;
            },


            get data() {
                return getAllData();
            },


            get state() {
                return getState();
            },


            get refs() {
                return getRefs();
            },


            get core() {
                return core;
            },


            init:
                (...args) =>
                    init(
                        ...args
                    ),

            render:
                (...args) =>
                    render(
                        ...args
                    ),

            rerender:
                (...args) =>
                    rerender(
                        ...args
                    ),

            mount:
                (...args) =>
                    mount(
                        ...args
                    ),

            unmount:
                (...args) =>
                    unmount(
                        ...args
                    ),

            destroy:
                (...args) =>
                    destroy(
                        ...args
                    ),

            refreshLanguage:
                (...args) =>
                    refreshLanguage(
                        ...args
                    ),


            show:
                () =>
                    show(),

            hide:
                () =>
                    hide(),

            toggleVisibility:
                value =>
                    toggleVisibility(
                        value
                    ),

            enable:
                () =>
                    enable(),

            disable:
                () =>
                    disable(),

            toggleEnabled:
                value =>
                    toggleEnabled(
                        value
                    ),


            setData:
                (...args) =>
                    setData(
                        ...args
                    ),

            setManyData:
                (...args) =>
                    setManyData(
                        ...args
                    ),

            getData:
                (...args) =>
                    getData(
                        ...args
                    ),

            getAllData:
                () =>
                    getAllData(),

            hasData:
                key =>
                    hasData(
                        key
                    ),

            removeData:
                (...args) =>
                    removeData(
                        ...args
                    ),

            clearData:
                (...args) =>
                    clearData(
                        ...args
                    ),


            setState:
                (...args) =>
                    setState(
                        ...args
                    ),

            getState:
                () =>
                    getState(),

            resetState:
                (...args) =>
                    resetState(
                        ...args
                    ),


            query:
                (...args) =>
                    query(
                        ...args
                    ),

            queryAll:
                (...args) =>
                    queryAll(
                        ...args
                    ),


            getRef:
                name =>
                    getRef(
                        name
                    ),

            setRef:
                (
                    name,
                    element
                ) =>
                    setRef(
                        name,
                        element
                    ),

            getRefs:
                () =>
                    getRefs(),

            collectRefs:
                (...args) =>
                    collectRefs(
                        ...args
                    ),

            clearRefs:
                () =>
                    clearRefs(),


            on:
                (...args) =>
                    on(
                        ...args
                    ),

            once:
                (...args) =>
                    once(
                        ...args
                    ),

            off:
                (...args) =>
                    off(
                        ...args
                    ),

            dispatch:
                (...args) =>
                    dispatch(
                        ...args
                    ),


            addCleanup:
                callback =>
                    addCleanup(
                        callback
                    ),

            removeCleanup:
                callback =>
                    removeCleanup(
                        callback
                    ),


            resolveTarget:
                value =>
                    resolveTarget(
                        value
                    ),

            resolveElement:
                value =>
                    resolveElement(
                        value
                    ),

            createElement:
                (...args) =>
                    createElement(
                        ...args
                    ),


            translate:
                (
                    key,
                    fallback,
                    parameters
                ) =>
                    translate(
                        key,
                        fallback,
                        parameters
                    ),

            interpolate:
                (
                    text,
                    parameters
                ) =>
                    interpolate(
                        text,
                        parameters
                    ),

            escapeHtml:
                value =>
                    escapeHtml(
                        value
                    ),

            escapeHTML:
                value =>
                    escapeHtml(
                        value
                    ),

            resolveAssetPath:
                value =>
                    resolveAssetPath(
                        value
                    )

        };


        /* ==================================================
           PUBLIC API
        ================================================== */

        const publicAPI =
            Object.freeze({

                version:
                    VERSION,

                events:
                    EVENTS,

                name:
                    settings.name,

                id:
                    settings.id,


                init,
                render,
                rerender,

                mount,
                unmount,
                destroy,

                refreshLanguage,


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


                query,
                queryAll,


                getRef,
                setRef,
                getRefs,
                collectRefs,
                clearRefs,


                on,
                once,
                off,
                dispatch,


                addCleanup,
                removeCleanup,
                runCleanup,


                getElement,
                getTarget,
                getCore,


                hasInitialized,
                hasRendered,
                isMounted,

                isInitializing,
                isRendering,
                isDestroying,
                isDestroyed,


                getRenderCount,
                getLastError,
                getSettings,
                getLifecycle,


                usePlugin,
                removePlugin,
                hasPlugin,
                getPlugins

            });


        context.component =
            publicAPI;


        return publicAPI;


        /* ==================================================
           COMPONENT CORE
        ================================================== */

        function createCore() {

            if (
                core &&
                !core.isDestroyed()
            ) {
                return core;
            }


            if (
                !window.ComponentCore ||
                typeof window.ComponentCore
                    .create !==
                    "function"
            ) {

                throw new Error(
                    `${createLogPrefix()} membutuhkan ComponentCore.`
                );

            }


            core =
                window.ComponentCore
                    .create({

                        name:
                            settings.name,

                        id:
                            settings.id,

                        visible:
                            internalState
                                .visible,

                        enabled:
                            internalState
                                .enabled,

                        languageAware:
                            false,

                        data:
                            cloneData(
                                internalState
                                    .data
                            ),

                        plugins:
                            settings.plugins,

                        eventTarget:
                            settings
                                .eventTarget

                    });


            return core;

        }


        /* ==================================================
           INITIALIZATION
        ================================================== */

        async function init(
            initOptions = {}
        ) {

            assertNotDestroyed(
                "init"
            );


            if (
                lifecycle.initialized &&
                initOptions.force !==
                    true
            ) {
                return createInitializationResult();
            }


            if (
                lifecycle.initializing &&
                lifecycle.initPromise
            ) {
                return lifecycle.initPromise;
            }


            lifecycle.initPromise =
                initializeInternal(
                    initOptions
                );


            try {

                return await lifecycle
                    .initPromise;

            } finally {

                lifecycle.initPromise =
                    null;

            }

        }


        async function initializeInternal(
            initOptions
        ) {

            lifecycle.initializing =
                true;


            internalState.lastError =
                null;


            dispatch(
                EVENTS.INITIALIZING,
                {
                    options:
                        cloneData(
                            initOptions
                        )
                }
            );


            try {

                createCore();


                const targetValue =
                    initOptions.target ??
                    initOptions.targetId ??
                    settings.target ??
                    settings.targetId;


                internalState.target =
                    resolveTarget(
                        targetValue
                    );


                if (
                    settings.required &&
                    !internalState.target
                ) {

                    throw new Error(
                        `${createLogPrefix()} target wajib tidak ditemukan.`
                    );

                }


                if (
                    settings.languageAware
                ) {
                    bindLanguageEvent();
                }


                await callHookAsync(
                    settings.beforeInit,
                    createHookContext({
                        options:
                            initOptions
                    })
                );


                await callHookAsync(
                    settings.init,
                    createHookContext({
                        options:
                            initOptions
                    })
                );


                lifecycle.initialized =
                    true;


                internalState
                    .lastInitializedAt =
                    Date.now();


                await callHookAsync(
                    settings.afterInit,
                    createHookContext({
                        options:
                            initOptions
                    })
                );


                dispatch(
                    EVENTS.INITIALIZED,
                    {
                        initializedAt:
                            internalState
                                .lastInitializedAt
                    }
                );


                if (
                    settings.autoRender &&
                    initOptions.render !==
                        false
                ) {

                    await render({
                        ...initOptions,

                        skipInit:
                            true
                    });

                }


                return createInitializationResult();

            } catch (error) {

                lifecycle.initialized =
                    false;


                internalState.lastError =
                    normalizeError(
                        error
                    );


                dispatch(
                    EVENTS.INIT_ERROR,
                    {
                        error:
                            internalState
                                .lastError
                    }
                );


                reportError(
                    internalState
                        .lastError,
                    "init"
                );


                throw internalState
                    .lastError;

            } finally {

                lifecycle.initializing =
                    false;

            }

        }


        function createInitializationResult() {

            return Object.freeze({

                component:
                    publicAPI,

                name:
                    settings.name,

                id:
                    settings.id,

                initialized:
                    lifecycle
                        .initialized,

                rendered:
                    lifecycle.rendered,

                mounted:
                    lifecycle.mounted,

                target:
                    internalState.target,

                root:
                    internalState.root,

                initializedAt:
                    internalState
                        .lastInitializedAt

            });

        }


        /* ==================================================
           RENDER
        ================================================== */

        async function render(
            renderOptions = {}
        ) {

            assertNotDestroyed(
                "render"
            );


            if (
                !lifecycle.initialized &&
                renderOptions.skipInit !==
                    true
            ) {

                await init({
                    ...renderOptions,

                    render:
                        false
                });

            }


            if (
                lifecycle.rendering &&
                lifecycle.renderPromise
            ) {
                return lifecycle.renderPromise;
            }


            lifecycle.renderPromise =
                renderInternal(
                    renderOptions
                );


            try {

                return await lifecycle
                    .renderPromise;

            } finally {

                lifecycle.renderPromise =
                    null;

            }

        }


        async function renderInternal(
            renderOptions
        ) {

            lifecycle.rendering =
                true;


            internalState.lastError =
                null;


            dispatch(
                EVENTS.BEFORE_RENDER,
                {
                    options:
                        cloneData(
                            renderOptions
                        )
                }
            );


            try {

                createCore();


                const target =
                    resolveTarget(
                        renderOptions.target ??
                        renderOptions.targetId ??
                        internalState.target ??
                        settings.target ??
                        settings.targetId
                    );


                if (target) {

                    internalState.target =
                        target;

                }


                if (
                    settings.required &&
                    !internalState.target
                ) {

                    throw new Error(
                        `${createLogPrefix()} target render wajib tidak ditemukan.`
                    );

                }


                await callHookAsync(
                    settings.beforeRender,
                    createHookContext({
                        options:
                            renderOptions
                    })
                );


                dispatch(
                    EVENTS.RENDERING,
                    {
                        options:
                            cloneData(
                                renderOptions
                            )
                    }
                );


                const templateResult =
                    await resolveTemplate(
                        renderOptions
                    );


                const root =
                    await processTemplateResult(
                        templateResult,
                        renderOptions
                    );


                if (!root) {

                    if (
                        settings.required
                    ) {

                        throw new Error(
                            `${createLogPrefix()} template tidak menghasilkan root element.`
                        );

                    }


                    lifecycle.rendered =
                        false;

                    return null;

                }


                applyRootConfiguration(
                    root,
                    renderOptions
                );


                internalState.root =
                    root;


                if (
                    settings.autoMount &&
                    renderOptions.mount !==
                        false
                ) {

                    await mount(
                        root,
                        {
                            ...renderOptions,

                            target:
                                internalState
                                    .target
                        }
                    );

                } else {

                    createCore()
                        .setElement(
                            root
                        );

                    lifecycle.rendered =
                        true;

                }


                collectRefs();


                lifecycle.rendered =
                    true;


                internalState.renderCount +=
                    1;


                internalState
                    .lastRenderedAt =
                    Date.now();


                await callHookAsync(
                    settings.afterRender,
                    createHookContext({
                        options:
                            renderOptions,

                        root
                    })
                );


                dispatch(
                    EVENTS.RENDERED,
                    {
                        root,

                        renderCount:
                            internalState
                                .renderCount,

                        renderedAt:
                            internalState
                                .lastRenderedAt
                    }
                );


                return root;

            } catch (error) {

                lifecycle.rendered =
                    false;


                internalState.lastError =
                    normalizeError(
                        error
                    );


                dispatch(
                    EVENTS.RENDER_ERROR,
                    {
                        error:
                            internalState
                                .lastError
                    }
                );


                reportError(
                    internalState
                        .lastError,
                    "render"
                );


                throw internalState
                    .lastError;

            } finally {

                lifecycle.rendering =
                    false;

            }

        }


        /* ==================================================
           RERENDER
        ================================================== */

        async function rerender(
            renderOptions = {}
        ) {

            assertNotDestroyed(
                "rerender"
            );


            if (
                lifecycle.rendering &&
                lifecycle.renderPromise
            ) {
                await lifecycle
                    .renderPromise;
            }


            await callHookAsync(
                settings.beforeRerender,
                createHookContext({
                    options:
                        renderOptions
                })
            );


            /*
             * Listener hasil render sebelumnya dibersihkan
             * agar elemen DOM lama tidak tetap direferensikan.
             */
            if (
                core &&
                !core.isDestroyed()
            ) {
                core.removeAllListeners();
            }


            clearRefs();


            const previousRoot =
                internalState.root;

            const previousTarget =
                internalState.target;


            if (
                lifecycle.mounted
            ) {

                await unmount({
                    preserveRoot:
                        false,

                    preserveTarget:
                        true,

                    preserveListeners:
                        false
                });

            } else if (
                previousRoot &&
                previousRoot.parentNode
            ) {

                previousRoot.remove();

                internalState.root =
                    null;

                lifecycle.rendered =
                    false;

            }


            internalState.target =
                previousTarget;


            const result =
                await render({
                    ...renderOptions,

                    force:
                        true,

                    skipInit:
                        false
                });


            await callHookAsync(
                settings.afterRerender,
                createHookContext({
                    options:
                        renderOptions,

                    root:
                        result
                })
            );


            return result;

        }


        /* ==================================================
           TEMPLATE
        ================================================== */

        async function resolveTemplate(
            renderOptions
        ) {

            const template =
                renderOptions.template ??
                settings.template;


            if (
                typeof template ===
                    "function"
            ) {

                return template(
                    createHookContext({
                        options:
                            renderOptions
                    })
                );

            }


            if (
                typeof template ===
                    "string" ||
                isElement(
                    template
                ) ||
                isDocumentFragment(
                    template
                )
            ) {
                return template;
            }


            if (
                isElement(
                    renderOptions.root
                )
            ) {
                return renderOptions.root;
            }


            return createConfiguredRoot(
                renderOptions
            );

        }


        async function processTemplateResult(
            templateResult,
            renderOptions
        ) {

            const result =
                await Promise.resolve(
                    templateResult
                );


            if (
                result === null ||
                result === undefined ||
                result === false
            ) {
                return null;
            }


            if (
                isElement(
                    result
                )
            ) {
                return result;
            }


            if (
                isDocumentFragment(
                    result
                )
            ) {

                const root =
                    createConfiguredRoot(
                        renderOptions
                    );


                root.append(
                    result
                );


                return root;

            }


            if (
                typeof result ===
                    "string"
            ) {

                return createRootFromHTML(
                    result,
                    renderOptions
                );

            }


            throw new TypeError(
                `${createLogPrefix()} template harus menghasilkan string, Element, DocumentFragment, atau null.`
            );

        }


        function createRootFromHTML(
            html,
            renderOptions = {}
        ) {

            const template =
                document.createElement(
                    "template"
                );


            template.innerHTML =
                String(
                    html ?? ""
                ).trim();


            const elementChildren =
                Array.from(
                    template.content
                        .children
                );


            if (
                elementChildren.length ===
                    1 &&
                template.content
                    .childNodes.length ===
                    1
            ) {

                return elementChildren[0];

            }


            const root =
                createConfiguredRoot(
                    renderOptions
                );


            root.append(
                template.content
            );


            return root;

        }


        function createConfiguredRoot(
            renderOptions = {}
        ) {

            const tagName =
                normalizeTagName(
                    renderOptions.rootTag ||
                    settings.rootTag
                );


            return document
                .createElement(
                    tagName
                );

        }


        function applyRootConfiguration(
            root,
            renderOptions = {}
        ) {

            if (!root) {
                return;
            }


            const rootId =
                normalizeText(
                    renderOptions.rootId ||
                    settings.rootId
                );


            if (
                rootId &&
                !root.id
            ) {

                root.id =
                    rootId;

            }


            const classNames =
                normalizeClassNames(
                    settings.className,
                    renderOptions
                        .className
                );


            if (
                classNames.length > 0
            ) {

                root.classList.add(
                    ...classNames
                );

            }


            const attributes = {

                ...settings.attributes,

                ...(
                    isPlainObject(
                        renderOptions
                            .attributes
                    )
                        ? renderOptions
                            .attributes
                        : {}
                )

            };


            applyAttributes(
                root,
                attributes
            );


            root.dataset.component =
                settings.name;


            root.dataset.componentId =
                settings.id;

        }


        /* ==================================================
           MOUNT
        ================================================== */

        async function mount(
            rootOrTarget = null,
            mountOptions = {}
        ) {

            assertNotDestroyed(
                "mount"
            );


            if (
                lifecycle.mounting &&
                lifecycle.mountPromise
            ) {
                return lifecycle.mountPromise;
            }


            lifecycle.mountPromise =
                mountInternal(
                    rootOrTarget,
                    mountOptions
                );


            try {

                return await lifecycle
                    .mountPromise;

            } finally {

                lifecycle.mountPromise =
                    null;

            }

        }


        async function mountInternal(
            rootOrTarget,
            mountOptions
        ) {

            lifecycle.mounting =
                true;


            try {

                const componentCore =
                    createCore();


                let root =
                    internalState.root;


                let target =
                    resolveTarget(
                        mountOptions.target ??
                        mountOptions.targetId ??
                        internalState.target ??
                        settings.target ??
                        settings.targetId
                    );


                if (
                    isElement(
                        rootOrTarget
                    )
                ) {

                    if (
                        !root ||
                        mountOptions.asTarget !==
                            true
                    ) {

                        root =
                            rootOrTarget;

                    } else {

                        target =
                            rootOrTarget;

                    }

                } else if (
                    typeof rootOrTarget ===
                        "string"
                ) {

                    target =
                        resolveTarget(
                            rootOrTarget
                        );

                }


                if (!root) {

                    root =
                        createConfiguredRoot(
                            mountOptions
                        );


                    applyRootConfiguration(
                        root,
                        mountOptions
                    );

                }


                if (
                    settings.required &&
                    !target
                ) {

                    throw new Error(
                        `${createLogPrefix()} target mount wajib tidak ditemukan.`
                    );

                }


                dispatch(
                    EVENTS.BEFORE_MOUNT,
                    {
                        root,
                        target
                    }
                );


                await callHookAsync(
                    settings.beforeMount,
                    createHookContext({
                        root,
                        target,

                        options:
                            mountOptions
                    })
                );


                if (target) {

                    const replaceContent =
                        mountOptions
                            .replaceTargetContent !==
                        undefined
                            ? Boolean(
                                mountOptions
                                    .replaceTargetContent
                            )
                            : settings
                                .replaceTargetContent;


                    if (
                        replaceContent
                    ) {

                        target.replaceChildren(
                            root
                        );

                    } else if (
                        root.parentNode !==
                            target
                    ) {

                        target.append(
                            root
                        );

                    }


                    internalState.target =
                        target;

                }


                internalState.root =
                    root;


                componentCore.mount(
                    root
                );


                lifecycle.mounted =
                    true;

                lifecycle.rendered =
                    true;


                internalState.visible =
                    componentCore
                        .isVisible();

                internalState.enabled =
                    componentCore
                        .isEnabled();


                collectRefs();


                await callHookAsync(
                    settings.onMount,
                    createHookContext({
                        root,
                        target,

                        options:
                            mountOptions
                    })
                );


                await callHookAsync(
                    settings.afterMount,
                    createHookContext({
                        root,
                        target,

                        options:
                            mountOptions
                    })
                );


                dispatch(
                    EVENTS.MOUNTED,
                    {
                        root,
                        target
                    }
                );


                return root;

            } catch (error) {

                internalState.lastError =
                    normalizeError(
                        error
                    );


                reportError(
                    internalState
                        .lastError,
                    "mount"
                );


                throw internalState
                    .lastError;

            } finally {

                lifecycle.mounting =
                    false;

            }

        }


        /* ==================================================
           UNMOUNT
        ================================================== */

        async function unmount(
            unmountOptions = {}
        ) {

            if (
                lifecycle.destroyed ||
                !lifecycle.mounted
            ) {
                return false;
            }


            if (
                lifecycle.unmounting &&
                lifecycle.unmountPromise
            ) {
                return lifecycle
                    .unmountPromise;
            }


            lifecycle.unmountPromise =
                unmountInternal(
                    unmountOptions
                );


            try {

                return await lifecycle
                    .unmountPromise;

            } finally {

                lifecycle.unmountPromise =
                    null;

            }

        }


        async function unmountInternal(
            unmountOptions
        ) {

            lifecycle.unmounting =
                true;


            const root =
                internalState.root;


            const target =
                internalState.target;


            dispatch(
                EVENTS.UNMOUNTING,
                {
                    root,
                    target
                }
            );


            try {

                await callHookAsync(
                    settings.beforeUnmount,
                    createHookContext({
                        root,
                        target,

                        options:
                            unmountOptions
                    })
                );


                await callHookAsync(
                    settings.onUnmount,
                    createHookContext({
                        root,
                        target,

                        options:
                            unmountOptions
                    })
                );


                if (
                    core &&
                    !core.isDestroyed()
                ) {

                    if (
                        unmountOptions
                            .preserveListeners !==
                        true
                    ) {
                        core.removeAllListeners();
                    }


                    if (
                        core.isMounted()
                    ) {

                        core.unmount({
                            preserveListeners:
                                Boolean(
                                    unmountOptions
                                        .preserveListeners
                                )
                        });

                    }

                }


                if (
                    root &&
                    unmountOptions
                        .preserveRoot !==
                    true &&
                    root.parentNode
                ) {

                    root.remove();

                }


                if (
                    unmountOptions
                        .preserveRoot !==
                    true
                ) {

                    internalState.root =
                        null;

                    lifecycle.rendered =
                        false;

                    clearRefs();

                }


                if (
                    unmountOptions
                        .preserveTarget !==
                    true
                ) {

                    internalState.target =
                        null;

                }


                lifecycle.mounted =
                    false;


                await callHookAsync(
                    settings.afterUnmount,
                    createHookContext({
                        root,
                        target,

                        options:
                            unmountOptions
                    })
                );


                dispatch(
                    EVENTS.UNMOUNTED,
                    {
                        root,
                        target
                    }
                );


                return true;

            } catch (error) {

                internalState.lastError =
                    normalizeError(
                        error
                    );


                reportError(
                    internalState
                        .lastError,
                    "unmount"
                );


                throw internalState
                    .lastError;

            } finally {

                lifecycle.unmounting =
                    false;

            }

        }


        /* ==================================================
           DESTROY
        ================================================== */

        async function destroy(
            destroyOptions = {}
        ) {

            if (
                lifecycle.destroyed
            ) {
                return false;
            }


            if (
                lifecycle.destroying &&
                lifecycle.destroyPromise
            ) {
                return lifecycle
                    .destroyPromise;
            }


            lifecycle.destroyPromise =
                destroyInternal(
                    destroyOptions
                );


            try {

                return await lifecycle
                    .destroyPromise;

            } finally {

                lifecycle.destroyPromise =
                    null;

            }

        }


        async function destroyInternal(
            destroyOptions
        ) {

            lifecycle.destroying =
                true;


            const root =
                internalState.root;


            const target =
                internalState.target;


            dispatch(
                EVENTS.DESTROYING,
                {
                    root,
                    target
                }
            );


            try {

                await callHookAsync(
                    settings.beforeDestroy,
                    createHookContext({
                        root,
                        target,

                        options:
                            destroyOptions
                    })
                );


                unbindLanguageEvent();


                await runCleanup();


                if (
                    lifecycle.mounted
                ) {

                    await unmount({
                        preserveRoot:
                            true,

                        preserveTarget:
                            true,

                        preserveListeners:
                            false
                    });

                }


                if (
                    core &&
                    !core.isDestroyed()
                ) {

                    core.destroy({
                        removeElement:
                            false,

                        clearData:
                            true
                    });

                }


                const removeRoot =
                    destroyOptions.removeRoot !==
                    undefined
                        ? Boolean(
                            destroyOptions
                                .removeRoot
                        )
                        : settings
                            .removeRootOnDestroy;


                if (
                    removeRoot &&
                    root &&
                    typeof root.remove ===
                        "function"
                ) {

                    root.remove();

                } else if (
                    root &&
                    destroyOptions.clearRoot ===
                        true
                ) {

                    root.replaceChildren();

                }


                clearRefs();


                internalState.target =
                    null;

                internalState.root =
                    null;

                internalState.data =
                    {};

                internalState.state =
                    {};


                internalState.lastDestroyedAt =
                    Date.now();


                lifecycle.initialized =
                    false;

                lifecycle.initializing =
                    false;

                lifecycle.rendering =
                    false;

                lifecycle.rendered =
                    false;

                lifecycle.mounting =
                    false;

                lifecycle.mounted =
                    false;

                lifecycle.unmounting =
                    false;

                lifecycle.destroyed =
                    true;

                lifecycle.destroying =
                    false;


                await callHookAsync(
                    settings.afterDestroy,
                    createHookContext({
                        root,
                        target,

                        options:
                            destroyOptions
                    })
                );


                dispatchDirect(
                    settings.eventTarget,
                    EVENTS.DESTROYED,
                    createEventDetail({
                        root,
                        target,

                        destroyedAt:
                            internalState
                                .lastDestroyedAt
                    })
                );


                return true;

            } catch (error) {

                lifecycle.destroying =
                    false;


                internalState.lastError =
                    normalizeError(
                        error
                    );


                dispatchDirect(
                    settings.eventTarget,
                    EVENTS.DESTROY_ERROR,
                    createEventDetail({
                        error:
                            internalState
                                .lastError
                    })
                );


                reportError(
                    internalState
                        .lastError,
                    "destroy"
                );


                throw internalState
                    .lastError;

            }

        }


        /* ==================================================
           LANGUAGE
        ================================================== */

        async function refreshLanguage(
            languageContext = {}
        ) {

            if (
                lifecycle.destroyed ||
                lifecycle.destroying
            ) {
                return false;
            }


            const previousLanguage =
                internalState.language;


            const language =
                normalizeLanguage(
                    typeof languageContext ===
                        "string"
                        ? languageContext
                        : (
                            languageContext
                                ?.language ||
                            languageContext
                                ?.detail
                                ?.language ||
                            languageContext
                                ?.event
                                ?.detail
                                ?.language ||
                            getCurrentLanguage()
                        )
                );


            dispatch(
                EVENTS.LANGUAGE_REFRESHING,
                {
                    language,

                    previousLanguage
                }
            );


            try {

                internalState.language =
                    language;


                if (
                    window.Language &&
                    typeof window.Language
                        .apply ===
                        "function" &&
                    internalState.root
                ) {

                    window.Language.apply(
                        internalState.root
                    );

                }


                await callHookAsync(
                    settings.onLanguageChange,
                    createHookContext({
                        language,

                        previousLanguage,

                        languageContext
                    })
                );


                if (
                    settings
                        .rerenderOnLanguageChange &&
                    lifecycle.rendered
                ) {

                    await rerender({
                        reason:
                            "language",

                        language
                    });

                }


                dispatch(
                    EVENTS.LANGUAGE_REFRESHED,
                    {
                        language,

                        previousLanguage
                    }
                );


                return true;

            } catch (error) {

                internalState.lastError =
                    normalizeError(
                        error
                    );


                dispatch(
                    EVENTS.LANGUAGE_ERROR,
                    {
                        language,

                        previousLanguage,

                        error:
                            internalState
                                .lastError
                    }
                );


                reportError(
                    internalState
                        .lastError,
                    "language"
                );


                return false;

            }

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


        function handleLanguageChanged(
            event
        ) {

            refreshLanguage({
                event,

                language:
                    event?.detail?.language ||
                    getCurrentLanguage()
            });

        }


        /* ==================================================
           DATA
        ================================================== */

        function setData(
            key,
            value,
            dataOptions = {}
        ) {

            assertNotDestroyed(
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
                internalState.data[
                    normalizedKey
                ];


            internalState.data[
                normalizedKey
            ] =
                value;


            if (
                core &&
                !core.isDestroyed()
            ) {

                core.setData(
                    normalizedKey,
                    value,
                    {
                        emit:
                            false
                    }
                );

            }


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


            callHook(
                settings.onDataChange,
                createHookContext({
                    key:
                        normalizedKey,

                    value,

                    previousValue,

                    data:
                        getAllData()
                })
            );


            return value;

        }


        function setManyData(
            values,
            dataOptions = {}
        ) {

            assertNotDestroyed(
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


                        if (
                            normalizedKey
                        ) {

                            internalState.data[
                                normalizedKey
                            ] =
                                value;

                        }

                    }
                );


            if (
                core &&
                !core.isDestroyed()
            ) {

                core.setManyData(
                    values,
                    {
                        emit:
                            false
                    }
                );

            }


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


            callHook(
                settings.onDataChange,
                createHookContext({
                    multiple:
                        true,

                    values:
                        cloneData(
                            values
                        ),

                    previousData,

                    data:
                        getAllData()
                })
            );


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
                        internalState.data,
                        normalizedKey
                    )
            ) {
                return fallback;
            }


            return internalState.data[
                normalizedKey
            ];

        }


        function getAllData() {

            return cloneData(
                internalState.data
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
                        internalState.data,
                        normalizedKey
                    )
            );

        }


        function removeData(
            key,
            dataOptions = {}
        ) {

            assertNotDestroyed(
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
                internalState.data[
                    normalizedKey
                ];


            delete internalState.data[
                normalizedKey
            ];


            if (
                core &&
                !core.isDestroyed()
            ) {

                core.removeData(
                    normalizedKey,
                    {
                        emit:
                            false
                    }
                );

            }


            if (
                dataOptions.emit !==
                    false
            ) {

                dispatch(
                    EVENTS.DATA_CHANGED,
                    {
                        removed:
                            true,

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
                lifecycle.destroyed &&
                dataOptions.force !==
                    true
            ) {
                return false;
            }


            const previousData =
                getAllData();


            internalState.data =
                {};


            if (
                core &&
                !core.isDestroyed()
            ) {

                core.clearData({
                    emit:
                        false,

                    force:
                        true
                });

            }


            if (
                dataOptions.emit !==
                    false &&
                !lifecycle.destroyed
            ) {

                dispatch(
                    EVENTS.DATA_CHANGED,
                    {
                        cleared:
                            true,

                        previousData,

                        data:
                            {}
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

            assertNotDestroyed(
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
                stateOptions.replace ===
                true
            ) {

                internalState.state =
                    cloneData(
                        values
                    );

            } else {

                Object.assign(
                    internalState.state,
                    cloneData(
                        values
                    )
                );

            }


            if (
                stateOptions.emit !==
                    false
            ) {

                dispatch(
                    EVENTS.STATE_CHANGED,
                    {
                        values:
                            cloneData(
                                values
                            ),

                        previousState,

                        state:
                            getState()
                    }
                );

            }


            callHook(
                settings.onStateChange,
                createHookContext({
                    values:
                        cloneData(
                            values
                        ),

                    previousState,

                    state:
                        getState()
                })
            );


            return getState();

        }


        function getState() {

            return Object.freeze({

                ...cloneData(
                    internalState.state
                ),

                visible:
                    internalState.visible,

                enabled:
                    internalState.enabled,

                language:
                    internalState.language

            });

        }


        function resetState(
            resetOptions = {}
        ) {

            assertNotDestroyed(
                "resetState"
            );


            internalState.state =
                cloneData(
                    initialSnapshot.state
                );


            internalState.data =
                cloneData(
                    initialSnapshot.data
                );


            internalState.visible =
                initialSnapshot.visible;


            internalState.enabled =
                initialSnapshot.enabled;


            internalState.language =
                initialSnapshot.language;


            if (
                core &&
                !core.isDestroyed()
            ) {

                core.setState(
                    {
                        visible:
                            internalState
                                .visible,

                        enabled:
                            internalState
                                .enabled,

                        language:
                            internalState
                                .language,

                        data:
                            internalState
                                .data
                    },
                    {
                        emit:
                            false,

                        replaceData:
                            true
                    }
                );

            }


            if (
                resetOptions.emit !==
                    false
            ) {

                dispatch(
                    EVENTS.STATE_CHANGED,
                    {
                        reset:
                            true,

                        state:
                            getState(),

                        data:
                            getAllData()
                    }
                );

            }


            return getState();

        }


        /* ==================================================
           VISIBILITY
        ================================================== */

        function show() {

            assertNotDestroyed(
                "show"
            );


            internalState.visible =
                true;


            createCore()
                .show();


            return true;

        }


        function hide() {

            assertNotDestroyed(
                "hide"
            );


            internalState.visible =
                false;


            createCore()
                .hide();


            return true;

        }


        function toggleVisibility(
            force = null
        ) {

            const nextVisible =
                typeof force ===
                    "boolean"
                    ? force
                    : !internalState
                        .visible;


            return nextVisible
                ? show()
                : hide();

        }


        /* ==================================================
           ENABLE / DISABLE
        ================================================== */

        function enable() {

            assertNotDestroyed(
                "enable"
            );


            internalState.enabled =
                true;


            createCore()
                .enable();


            return true;

        }


        function disable() {

            assertNotDestroyed(
                "disable"
            );


            internalState.enabled =
                false;


            createCore()
                .disable();


            return true;

        }


        function toggleEnabled(
            force = null
        ) {

            const nextEnabled =
                typeof force ===
                    "boolean"
                    ? force
                    : !internalState
                        .enabled;


            return nextEnabled
                ? enable()
                : disable();

        }


        /* ==================================================
           DOM QUERY
        ================================================== */

        function query(
            selector,
            scope = null
        ) {

            const target =
                scope ||
                internalState.root;


            if (
                !target ||
                typeof target
                    .querySelector !==
                    "function"
            ) {
                return null;
            }


            try {

                return target
                    .querySelector(
                        selector
                    );

            } catch (error) {

                console.warn(
                    `${createLogPrefix()} selector "${selector}" tidak valid.`,
                    error
                );


                return null;

            }

        }


        function queryAll(
            selector,
            scope = null
        ) {

            const target =
                scope ||
                internalState.root;


            if (
                !target ||
                typeof target
                    .querySelectorAll !==
                    "function"
            ) {
                return [];
            }


            try {

                return Array.from(
                    target.querySelectorAll(
                        selector
                    )
                );

            } catch (error) {

                console.warn(
                    `${createLogPrefix()} selector "${selector}" tidak valid.`,
                    error
                );


                return [];

            }

        }


        /* ==================================================
           DOM ELEMENT CREATION
        ================================================== */

        function createElement(
            tagName = "div",
            elementOptions = {}
        ) {

            const element =
                document.createElement(
                    normalizeTagName(
                        tagName
                    )
                );


            if (
                elementOptions.id
            ) {

                element.id =
                    String(
                        elementOptions.id
                    );

            }


            const classes =
                normalizeClassNames(
                    elementOptions
                        .className,
                    elementOptions
                        .classes
                );


            if (
                classes.length > 0
            ) {

                element.classList.add(
                    ...classes
                );

            }


            if (
                elementOptions.text !==
                    undefined
            ) {

                element.textContent =
                    String(
                        elementOptions
                            .text
                    );

            }


            if (
                elementOptions.html !==
                    undefined
            ) {

                element.innerHTML =
                    String(
                        elementOptions
                            .html
                    );

            }


            if (
                isPlainObject(
                    elementOptions
                        .attributes
                )
            ) {

                applyAttributes(
                    element,
                    elementOptions
                        .attributes
                );

            }


            return element;

        }


        /* ==================================================
           ELEMENT / TARGET
        ================================================== */

        function resolveElement(
            value
        ) {

            if (
                isElement(
                    value
                )
            ) {
                return value;
            }


            if (
                typeof value !==
                    "string"
            ) {
                return null;
            }


            const selector =
                value.trim();


            if (!selector) {
                return null;
            }


            try {

                if (
                    !looksLikeSelector(
                        selector
                    )
                ) {

                    const byId =
                        document
                            .getElementById(
                                selector
                            );


                    if (byId) {
                        return byId;
                    }

                }


                return document
                    .querySelector(
                        selector
                    );

            } catch (_error) {

                return null;

            }

        }


        function resolveTarget(
            value
        ) {

            return resolveElement(
                value
            );

        }


        function getElement() {
            return internalState.root;
        }


        function getTarget() {
            return internalState.target;
        }


        function getCore() {
            return core;
        }


        /* ==================================================
           REFS
        ================================================== */

        function setRef(
            name,
            element
        ) {

            const normalizedName =
                normalizeKey(
                    name
                );


            if (!normalizedName) {
                return null;
            }


            if (!element) {

                internalState.refs
                    .delete(
                        normalizedName
                    );

                return null;

            }


            internalState.refs
                .set(
                    normalizedName,
                    element
                );


            return element;

        }


        function getRef(
            name
        ) {

            return (
                internalState.refs
                    .get(
                        normalizeKey(
                            name
                        )
                    ) ||
                null
            );

        }


        function getRefs() {

            return Object.freeze(
                Object.fromEntries(
                    internalState.refs
                )
            );

        }


        function collectRefs(
            scope = null
        ) {

            clearRefs();


            const root =
                scope ||
                internalState.root;


            if (!root) {
                return getRefs();
            }


            if (
                isElement(
                    root
                ) &&
                root.hasAttribute(
                    "data-ref"
                )
            ) {

                setRef(
                    root.getAttribute(
                        "data-ref"
                    ),
                    root
                );

            }


            queryAll(
                "[data-ref]",
                root
            )
                .forEach(
                    element => {

                        const name =
                            element.getAttribute(
                                "data-ref"
                            );


                        if (name) {

                            setRef(
                                name,
                                element
                            );

                        }

                    }
                );


            Object.entries(
                settings.refs
            )
                .forEach(
                    ([
                        name,
                        selector
                    ]) => {

                        if (
                            typeof selector !==
                                "string"
                        ) {
                            return;
                        }


                        const element =
                            query(
                                selector,
                                root
                            );


                        if (element) {

                            setRef(
                                name,
                                element
                            );

                        }

                    }
                );


            return getRefs();

        }


        function clearRefs() {

            internalState.refs
                .clear();


            return true;

        }


        /* ==================================================
           EVENT HELPERS
        ================================================== */

        function on(
            ...args
        ) {

            assertNotDestroyed(
                "on"
            );


            return createCore()
                .on(
                    ...args
                );

        }


        function once(
            ...args
        ) {

            assertNotDestroyed(
                "once"
            );


            return createCore()
                .once(
                    ...args
                );

        }


        function off(
            ...args
        ) {

            if (
                !core ||
                core.isDestroyed()
            ) {
                return 0;
            }


            return core.off(
                ...args
            );

        }


        function dispatch(
            eventName,
            detail = {},
            targetOrOptions = null
        ) {

            if (
                lifecycle.destroyed
            ) {
                return false;
            }


            const eventDetail =
                createEventDetail(
                    detail
                );


            if (
                core &&
                !core.isDestroyed()
            ) {

                return core.dispatch(
                    eventName,
                    eventDetail,
                    targetOrOptions
                );

            }


            const target =
                isEventTarget(
                    targetOrOptions
                )
                    ? targetOrOptions
                    : (
                        isPlainObject(
                            targetOrOptions
                        ) &&
                        isEventTarget(
                            targetOrOptions
                                .target
                        )
                            ? targetOrOptions
                                .target
                            : settings
                                .eventTarget
                    );


            return dispatchDirect(
                target,
                eventName,
                eventDetail,
                isPlainObject(
                    targetOrOptions
                )
                    ? targetOrOptions
                    : {}
            );

        }


        /* ==================================================
           CLEANUP
        ================================================== */

        function addCleanup(
            callback
        ) {

            assertNotDestroyed(
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


        async function runCleanup() {

            const callbacks =
                Array.from(
                    cleanupCallbacks
                );


            cleanupCallbacks
                .clear();


            let executed =
                0;


            for (
                const callback
                of callbacks
            ) {

                try {

                    await callback(
                        createHookContext()
                    );

                } catch (error) {

                    reportError(
                        error,
                        "cleanup"
                    );

                }


                executed +=
                    1;

            }


            return executed;

        }


        /* ==================================================
           PLUGIN WRAPPERS
        ================================================== */

        function usePlugin(
            plugin
        ) {

            assertNotDestroyed(
                "usePlugin"
            );


            return createCore()
                .use(
                    plugin
                );

        }


        function removePlugin(
            pluginName
        ) {

            if (
                !core ||
                core.isDestroyed()
            ) {
                return false;
            }


            return core.unuse(
                pluginName
            );

        }


        function hasPlugin(
            pluginName
        ) {

            if (
                !core ||
                core.isDestroyed()
            ) {
                return false;
            }


            return core.hasPlugin(
                pluginName
            );

        }


        function getPlugins() {

            if (
                !core ||
                core.isDestroyed()
            ) {
                return [];
            }


            return core.getPlugins();

        }


        /* ==================================================
           STATUS
        ================================================== */

        function hasInitialized() {
            return lifecycle.initialized;
        }


        function hasRendered() {

            return Boolean(
                lifecycle.rendered &&
                internalState.root
            );

        }


        function isMounted() {
            return lifecycle.mounted;
        }


        function isInitializing() {
            return lifecycle.initializing;
        }


        function isRendering() {
            return lifecycle.rendering;
        }


        function isDestroying() {
            return lifecycle.destroying;
        }


        function isDestroyed() {
            return lifecycle.destroyed;
        }


        function getRenderCount() {
            return internalState.renderCount;
        }


        function getLastError() {
            return internalState.lastError;
        }


        function getSettings() {

            return Object.freeze({
                ...settings,

                attributes:
                    cloneData(
                        settings.attributes
                    ),

                data:
                    cloneData(
                        settings.data
                    ),

                state:
                    cloneData(
                        settings.state
                    ),

                refs:
                    cloneData(
                        settings.refs
                    ),

                plugins:
                    [
                        ...settings.plugins
                    ]
            });

        }


        function getLifecycle() {

            return Object.freeze({

                initialized:
                    lifecycle.initialized,

                initializing:
                    lifecycle.initializing,

                rendering:
                    lifecycle.rendering,

                rendered:
                    lifecycle.rendered,

                mounting:
                    lifecycle.mounting,

                mounted:
                    lifecycle.mounted,

                unmounting:
                    lifecycle.unmounting,

                destroying:
                    lifecycle.destroying,

                destroyed:
                    lifecycle.destroyed

            });

        }


        /* ==================================================
           INSTANCE HELPERS
        ================================================== */

        function createHookContext(
            extra = {}
        ) {

            return {

                ...context,

                ...extra

            };

        }


        function createEventDetail(
            detail = {}
        ) {

            const safeDetail =
                isPlainObject(
                    detail
                )
                    ? detail
                    : {
                        value:
                            detail
                    };


            return {

                component:
                    publicAPI,

                componentId:
                    settings.id,

                componentName:
                    settings.name,

                language:
                    internalState.language,

                timestamp:
                    Date.now(),

                ...safeDetail

            };

        }


        function createLogPrefix() {

            return (
                `[BaseComponent:${settings.name}:${settings.id}]`
            );

        }


        function assertNotDestroyed(
            methodName
        ) {

            if (
                lifecycle.destroyed
            ) {

                throw new Error(
                    `${createLogPrefix()} tidak dapat menjalankan ${methodName}() karena komponen sudah dihancurkan.`
                );

            }


            if (
                lifecycle.destroying &&
                methodName !==
                    "destroy"
            ) {

                throw new Error(
                    `${createLogPrefix()} tidak dapat menjalankan ${methodName}() karena komponen sedang dihancurkan.`
                );

            }

        }


        function reportError(
            error,
            phase
        ) {

            const normalizedError =
                normalizeError(
                    error
                );


            internalState.lastError =
                normalizedError;


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

            } catch (_error) {
                /*
                 * Error reporter tidak boleh menghasilkan
                 * error tambahan.
                 */
            }


            return normalizedError;

        }

    }


    /* ======================================================
       DEFINITION NORMALIZATION
    ====================================================== */

    function validateDefinition(
        definition
    ) {

        if (
            !isPlainObject(
                definition
            )
        ) {

            throw new TypeError(
                "BaseComponent.create() membutuhkan plain object."
            );

        }

    }


    function normalizeDefinition(
        definition,
        counter
    ) {

        const name =
            normalizeComponentName(
                definition.name ||
                DEFAULT_OPTIONS.name
            );


        const id =
            normalizeText(
                definition.id
            ) ||
            `${name}-${counter}`;


        const settings = {

            ...DEFAULT_OPTIONS,

            ...definition,

            name,

            id,

            attributes:
                isPlainObject(
                    definition.attributes
                )
                    ? cloneData(
                        definition.attributes
                    )
                    : {},

            data:
                isPlainObject(
                    definition.data
                )
                    ? cloneData(
                        definition.data
                    )
                    : {},

            state:
                isPlainObject(
                    definition.state
                )
                    ? cloneData(
                        definition.state
                    )
                    : {},

            refs:
                isPlainObject(
                    definition.refs
                )
                    ? cloneData(
                        definition.refs
                    )
                    : {},

            plugins:
                Array.isArray(
                    definition.plugins
                )
                    ? [
                        ...definition.plugins
                    ]
                    : [],

            eventTarget:
                isEventTarget(
                    definition.eventTarget
                )
                    ? definition
                        .eventTarget
                    : document

        };


        const hookNames = [

            "beforeInit",
            "init",
            "afterInit",

            "beforeRender",
            "afterRender",

            "beforeRerender",
            "afterRerender",

            "beforeMount",
            "onMount",
            "afterMount",

            "beforeUnmount",
            "onUnmount",
            "afterUnmount",

            "beforeDestroy",
            "afterDestroy",

            "onLanguageChange",

            "onDataChange",
            "onStateChange"

        ];


        hookNames.forEach(
            hookName => {

                settings[
                    hookName
                ] =
                    typeof definition[
                        hookName
                    ] ===
                    "function"
                        ? definition[
                            hookName
                        ]
                        : null;

            }
        );


        settings.autoRender =
            definition.autoRender !==
            false;


        settings.autoMount =
            definition.autoMount !==
            false;


        settings.replaceTargetContent =
            definition
                .replaceTargetContent !==
            false;


        settings.removeRootOnDestroy =
            definition
                .removeRootOnDestroy ===
            true;


        settings.languageAware =
            definition.languageAware !==
            false;


        settings.rerenderOnLanguageChange =
            definition
                .rerenderOnLanguageChange ===
            true;


        settings.visible =
            definition.visible !==
            false;


        settings.enabled =
            definition.enabled !==
            false;


        settings.required =
            definition.required ===
            true;


        return settings;

    }


    /* ======================================================
       LANGUAGE HELPERS
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
            normalizeText(
                value
            )
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
            language === "zh" ||
            language === "id"
        )
            ? language
            : "zh";

    }


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

            return window.Language
                .translate(
                    key,
                    fallback,
                    parameters
                );

        }


        return interpolate(
            fallback,
            parameters
        );

    }


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

            return window.GomaiUtils
                .interpolate(
                    text,
                    parameters
                );

        }


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
        )
            .forEach(
                ([
                    key,
                    value
                ]) => {

                    result =
                        result.replaceAll(
                            `{{${key}}}`,
                            String(
                                value ??
                                ""
                            )
                        );

                }
            );


        return result;

    }


    /* ======================================================
       UTILITY HELPERS
    ====================================================== */

    function escapeHtml(
        value
    ) {

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .escapeHTML ===
                "function"
        ) {

            return window.GomaiUtils
                .escapeHTML(
                    value
                );

        }


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


    function resolveAssetPath(
        value
    ) {

        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils
                .resolveAssetPath ===
                "function"
        ) {

            return window.GomaiUtils
                .resolveAssetPath(
                    value
                );

        }


        return String(
            value ?? ""
        );

    }


    function normalizeText(
        value
    ) {

        return String(
            value ??
            ""
        ).trim();

    }


    function normalizeKey(
        value
    ) {

        return normalizeText(
            value
        );

    }


    function normalizeComponentName(
        value
    ) {

        const text =
            normalizeText(
                value
            );


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


    function normalizeTagName(
        value
    ) {

        const tagName =
            normalizeText(
                value
            )
                .toLowerCase();


        if (
            /^[a-z][a-z0-9-]*$/
                .test(
                    tagName
                )
        ) {
            return tagName;
        }


        return "div";

    }


    function normalizeClassNames(
        ...values
    ) {

        return [
            ...new Set(
                values
                    .flatMap(
                        value => {

                            if (
                                Array.isArray(
                                    value
                                )
                            ) {

                                return value;

                            }


                            return String(
                                value ??
                                ""
                            ).split(
                                /\s+/
                            );

                        }
                    )
                    .map(
                        normalizeText
                    )
                    .filter(
                        Boolean
                    )
            )
        ];

    }


    function looksLikeSelector(
        value
    ) {

        return (
            value.startsWith("#") ||
            value.startsWith(".") ||
            value.startsWith("[") ||
            value.includes(" ") ||
            value.includes(">") ||
            value.includes(":") ||
            value.includes("+") ||
            value.includes("~")
        );

    }


    function applyAttributes(
        element,
        attributes
    ) {

        if (
            !element ||
            !isPlainObject(
                attributes
            )
        ) {
            return;
        }


        Object.entries(
            attributes
        )
            .forEach(
                ([
                    name,
                    value
                ]) => {

                    const attributeName =
                        normalizeText(
                            name
                        );


                    if (!attributeName) {
                        return;
                    }


                    if (
                        value === null ||
                        value === undefined ||
                        value === false
                    ) {

                        element.removeAttribute(
                            attributeName
                        );

                        return;

                    }


                    if (
                        value === true
                    ) {

                        element.setAttribute(
                            attributeName,
                            ""
                        );

                        return;

                    }


                    element.setAttribute(
                        attributeName,
                        String(
                            value
                        )
                    );

                }
            );

    }


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


    function isDocumentFragment(
        value
    ) {

        return Boolean(
            value &&
            typeof value ===
                "object" &&
            value.nodeType ===
                11
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
            isDocumentFragment(
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
                 * Gunakan cloning manual.
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
       EVENT
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


        const normalizedEventName =
            normalizeText(
                eventName
            );


        if (!normalizedEventName) {
            return false;
        }


        return target.dispatchEvent(
            new CustomEvent(
                normalizedEventName,
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
            )
        );

    }


    /* ======================================================
       HOOKS
    ====================================================== */

    function callHook(
        hook,
        context
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
                "BaseComponent lifecycle hook gagal.",
                error
            );


            return undefined;

        }

    }


    async function callHookAsync(
        hook,
        context
    ) {

        if (
            typeof hook !==
                "function"
        ) {
            return undefined;
        }


        return hook(
            context
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
                "Unknown BaseComponent error"
            )
        );

    }


    /* ======================================================
       PUBLIC MODULE API
    ====================================================== */

    return Object.freeze({

        version:
            VERSION,

        events:
            EVENTS,

        defaults:
            DEFAULT_OPTIONS,

        create,

        getInstanceCount() {
            return instanceCounter;
        }

    });

})();


window.BaseComponent =
    BaseComponent;