"use strict";

/* ==========================================================
   GOMAI EMPTY STATE COMPONENT
   js/components/empty-state.js

   Tanggung jawab:
   - Membuat empty state reusable
   - Menyediakan preset feedback UI
   - Mendukung Indonesia + Mandarin
   - Mendukung action button / link
   - Mendukung callback action
   - Mendukung route Gomai
   - Menyimpan state render aktif
   - Refresh otomatis ketika bahasa berubah
   - Mengirim event lifecycle

   Komponen ini:
   - Tidak membaca JSON secara langsung
   - Tidak melakukan fetch
   - Tidak bergantung pada model
   - Tidak menangani proses bisnis
========================================================== */

const EmptyStateComponent = (() => {

    const VERSION =
        "2.0.0";


    /* ======================================================
       EVENTS
    ====================================================== */

    const EVENTS =
        Object.freeze({

            RENDERED:
                "gomai:empty-state-rendered",

            CLEARED:
                "gomai:empty-state-cleared",

            ACTION:
                "gomai:empty-state-action",

            ACTION_ERROR:
                "gomai:empty-state-action-error",

            REFRESHED:
                "gomai:empty-state-refreshed"

        });


    /* ======================================================
       PRESETS
    ====================================================== */

    const PRESETS =
        deepFreeze({

            noProducts: {

                icon:
                    "□",

                titleKey:
                    "emptyState.noProducts.title",

                descriptionKey:
                    "emptyState.noProducts.description",

                primaryAction: {

                    labelKey:
                        "emptyState.noProducts.primaryButton",

                    routeKey:
                        "products",

                    action:
                        "view-products",

                    className:
                        "btn btn-primary"

                }

            },


            noBrands: {

                icon:
                    "◇",

                titleKey:
                    "emptyState.noBrands.title",

                descriptionKey:
                    "emptyState.noBrands.description",

                primaryAction: {

                    labelKey:
                        "emptyState.noBrands.primaryButton",

                    routeKey:
                        "home",

                    hash:
                        "brands",

                    action:
                        "view-brands",

                    className:
                        "btn btn-primary"

                }

            },


            noSearch: {

                icon:
                    "⌕",

                titleKey:
                    "emptyState.noSearch.title",

                descriptionKey:
                    "emptyState.noSearch.description",

                primaryAction: {

                    labelKey:
                        "emptyState.noSearch.primaryButton",

                    action:
                        "clear-search",

                    className:
                        "btn btn-primary"

                }

            },


            noCategory: {

                icon:
                    "▦",

                titleKey:
                    "emptyState.noCategory.title",

                descriptionKey:
                    "emptyState.noCategory.description",

                primaryAction: {

                    labelKey:
                        "emptyState.noCategory.primaryButton",

                    action:
                        "clear-filter",

                    className:
                        "btn btn-primary"

                }

            },


            noFavorite: {

                icon:
                    "♡",

                titleKey:
                    "emptyState.noFavorite.title",

                descriptionKey:
                    "emptyState.noFavorite.description",

                primaryAction: {

                    labelKey:
                        "emptyState.noFavorite.primaryButton",

                    routeKey:
                        "products",

                    action:
                        "view-products",

                    className:
                        "btn btn-primary"

                }

            },


            error: {

                icon:
                    "!",

                titleKey:
                    "emptyState.error.title",

                descriptionKey:
                    "emptyState.error.description",

                primaryAction: {

                    labelKey:
                        "emptyState.error.primaryButton",

                    action:
                        "retry",

                    className:
                        "btn btn-primary"

                }

            },


            networkError: {

                icon:
                    "↯",

                titleKey:
                    "emptyState.networkError.title",

                descriptionKey:
                    "emptyState.networkError.description",

                primaryAction: {

                    labelKey:
                        "emptyState.networkError.primaryButton",

                    action:
                        "retry",

                    className:
                        "btn btn-primary"

                }

            },


            notFound: {

                icon:
                    "404",

                titleKey:
                    "emptyState.notFound.title",

                descriptionKey:
                    "emptyState.notFound.description",

                primaryAction: {

                    labelKey:
                        "emptyState.notFound.primaryButton",

                    routeKey:
                        "home",

                    action:
                        "go-home",

                    className:
                        "btn btn-primary"

                },

                secondaryAction: {

                    labelKey:
                        "emptyState.notFound.secondaryButton",

                    routeKey:
                        "products",

                    action:
                        "view-products",

                    className:
                        "btn btn-outline"

                }

            },


            maintenance: {

                icon:
                    "⚙",

                titleKey:
                    "emptyState.maintenance.title",

                descriptionKey:
                    "emptyState.maintenance.description",

                primaryAction: {

                    labelKey:
                        "emptyState.maintenance.primaryButton",

                    routeKey:
                        "home",

                    action:
                        "go-home",

                    className:
                        "btn btn-primary"

                }

            },


            comingSoon: {

                icon:
                    "◷",

                titleKey:
                    "emptyState.comingSoon.title",

                descriptionKey:
                    "emptyState.comingSoon.description",

                primaryAction: {

                    labelKey:
                        "emptyState.comingSoon.primaryButton",

                    routeKey:
                        "home",

                    action:
                        "go-home",

                    className:
                        "btn btn-primary"

                }

            }

        });


    /* ======================================================
       FALLBACK TEXT

       Mandarin menjadi fallback utama Gomai.
       File id.json / zh.json tetap menjadi sumber utama.
    ====================================================== */

    const FALLBACKS =
        deepFreeze({

            zh: {

                noProducts: {

                    title:
                        "暂无商品",

                    description:
                        "目前没有可显示的商品。",

                    primaryButton:
                        "查看全部商品"

                },


                noBrands: {

                    title:
                        "暂无品牌",

                    description:
                        "目前没有可显示的品牌。",

                    primaryButton:
                        "查看品牌"

                },


                noSearch: {

                    title:
                        "未找到结果",

                    description:
                        "没有找到与“{{query}}”匹配的结果。",

                    primaryButton:
                        "清除搜索"

                },


                noCategory: {

                    title:
                        "该分类暂无商品",

                    description:
                        "当前筛选条件下没有可显示的商品。",

                    primaryButton:
                        "清除筛选"

                },


                noFavorite: {

                    title:
                        "暂无收藏商品",

                    description:
                        "您收藏的商品将显示在这里。",

                    primaryButton:
                        "查看商品"

                },


                error: {

                    title:
                        "发生错误",

                    description:
                        "数据加载失败，请重试。",

                    primaryButton:
                        "重试"

                },


                networkError: {

                    title:
                        "网络连接异常",

                    description:
                        "请检查网络连接后重试。",

                    primaryButton:
                        "重试"

                },


                notFound: {

                    title:
                        "页面未找到",

                    description:
                        "您访问的页面不存在或地址无效。",

                    primaryButton:
                        "返回首页",

                    secondaryButton:
                        "查看商品"

                },


                maintenance: {

                    title:
                        "正在维护",

                    description:
                        "此页面正在更新，请稍后再试。",

                    primaryButton:
                        "返回首页"

                },


                comingSoon: {

                    title:
                        "即将上线",

                    description:
                        "此功能正在准备中，敬请期待。",

                    primaryButton:
                        "返回首页"

                }

            },


            id: {

                noProducts: {

                    title:
                        "Produk Belum Tersedia",

                    description:
                        "Belum ada produk yang dapat ditampilkan saat ini.",

                    primaryButton:
                        "Lihat Semua Produk"

                },


                noBrands: {

                    title:
                        "Brand Belum Tersedia",

                    description:
                        "Belum ada brand yang dapat ditampilkan saat ini.",

                    primaryButton:
                        "Lihat Brand"

                },


                noSearch: {

                    title:
                        "Hasil Tidak Ditemukan",

                    description:
                        "Tidak ada hasil yang sesuai dengan pencarian “{{query}}”.",

                    primaryButton:
                        "Hapus Pencarian"

                },


                noCategory: {

                    title:
                        "Produk Tidak Ditemukan",

                    description:
                        "Tidak ada produk yang sesuai dengan filter yang dipilih.",

                    primaryButton:
                        "Hapus Filter"

                },


                noFavorite: {

                    title:
                        "Belum Ada Produk Favorit",

                    description:
                        "Produk yang Anda simpan akan tampil di sini.",

                    primaryButton:
                        "Lihat Produk"

                },


                error: {

                    title:
                        "Terjadi Kesalahan",

                    description:
                        "Data tidak berhasil dimuat. Silakan coba kembali.",

                    primaryButton:
                        "Coba Lagi"

                },


                networkError: {

                    title:
                        "Koneksi Bermasalah",

                    description:
                        "Periksa koneksi internet Anda, lalu coba kembali.",

                    primaryButton:
                        "Coba Lagi"

                },


                notFound: {

                    title:
                        "Halaman Tidak Ditemukan",

                    description:
                        "Halaman yang Anda cari tidak tersedia atau alamatnya tidak valid.",

                    primaryButton:
                        "Kembali ke Beranda",

                    secondaryButton:
                        "Lihat Produk"

                },


                maintenance: {

                    title:
                        "Sedang Dalam Perawatan",

                    description:
                        "Halaman ini sedang diperbarui. Silakan kembali beberapa saat lagi.",

                    primaryButton:
                        "Kembali ke Beranda"

                },


                comingSoon: {

                    title:
                        "Segera Hadir",

                    description:
                        "Fitur ini sedang dipersiapkan dan akan tersedia segera.",

                    primaryButton:
                        "Kembali ke Beranda"

                }

            }

        });


    /* ======================================================
       ACTIVE STATE

       WeakMap mencegah target DOM ditahan oleh registry
       apabila elemen target sudah tidak digunakan.
    ====================================================== */

    const activeStates =
        new WeakMap();


    /* ======================================================
       CREATE
    ====================================================== */

    function create(
        options = {}
    ) {

        const settings =
            normalizeOptions(
                options
            );


        const container =
            document.createElement(
                "div"
            );


        container.className =
            buildClassName(

                "empty-state",

                "gomai-empty-state",

                settings.className

            );


        container.dataset.emptyState =
            "true";


        container.dataset.emptyStatePreset =
            settings.preset;


        container.setAttribute(
            "role",
            settings.role
        );


        container.setAttribute(
            "aria-live",
            settings.ariaLive
        );


        container.setAttribute(
            "aria-atomic",
            "true"
        );


        /* ==============================================
           ICON
        ============================================== */

        if (
            settings.showIcon
        ) {

            container.append(
                createIcon(
                    settings
                )
            );

        }


        /* ==============================================
           CONTENT
        ============================================== */

        const content =
            document.createElement(
                "div"
            );


        content.className =
            "empty-state-content";


        const title =
            document.createElement(
                settings.headingTag
            );


        title.className =
            "empty-state-title";


        title.textContent =
            resolveText({

                text:
                    settings.title,

                translationKey:
                    settings.titleKey,

                fallback:
                    settings.titleFallback,

                parameters:
                    settings.parameters

            });


        const description =
            document.createElement(
                "p"
            );


        description.className =
            "empty-state-description";


        description.textContent =
            resolveText({

                text:
                    settings.description,

                translationKey:
                    settings.descriptionKey,

                fallback:
                    settings.descriptionFallback,

                parameters:
                    settings.parameters

            });


        content.append(
            title,
            description
        );


        container.append(
            content
        );


        /* ==============================================
           ACTIONS
        ============================================== */

        const actions =
            createActions(
                settings
            );


        if (
            actions
        ) {

            container.append(
                actions
            );

        }


        return container;

    }


    /* ======================================================
       RENDER
    ====================================================== */

    function render(
        options = {}
    ) {

        const source =
            isPlainObject(
                options
            )
                ? options
                : {};


        const target =
            resolveTarget(
                source.target
            );


        if (
            !target
        ) {

            return null;

        }


        const element =
            create({

                ...source,

                target

            });


        target.replaceChildren(
            element
        );


        target.hidden =
            false;


        target.setAttribute(
            "aria-busy",
            "false"
        );


        target.dataset.emptyStateActive =
            "true";


        const storedOptions =
            createStoredOptions(
                source,
                target
            );


        activeStates.set(
            target,
            {

                element,

                options:
                    storedOptions

            }
        );


        dispatch(
            EVENTS.RENDERED,
            {

                target,

                element,

                preset:
                    element.dataset
                        .emptyStatePreset

            }
        );


        return element;

    }


    /* ======================================================
       REPLACE
    ====================================================== */

    function replace(
        options = {}
    ) {

        return render(
            options
        );

    }


    /* ======================================================
       CLEAR
    ====================================================== */

    function clear(
        target,
        clearContent = true
    ) {

        const container =
            resolveTarget(
                target,
                false
            );


        if (
            !container
        ) {

            return false;

        }


        const state =
            activeStates.get(
                container
            );


        if (
            clearContent !==
            false
        ) {

            container.replaceChildren();

        } else {

            container
                .querySelectorAll(
                    "[data-empty-state='true']"
                )
                .forEach(
                    element => {

                        element.remove();

                    }
                );

        }


        delete container
            .dataset
            .emptyStateActive;


        activeStates.delete(
            container
        );


        dispatch(
            EVENTS.CLEARED,
            {

                target:
                    container,

                preset:
                    state
                        ?.element
                        ?.dataset
                        ?.emptyStatePreset ||
                    ""

            }
        );


        return true;

    }


    /* ======================================================
       IS VISIBLE
    ====================================================== */

    function isVisible(
        target
    ) {

        const container =
            resolveTarget(
                target,
                false
            );


        if (
            !container
        ) {

            return false;

        }


        const state =
            activeStates.get(
                container
            );


        if (
            state
        ) {

            const valid =
                Boolean(

                    state.element &&

                    state.element
                        .isConnected &&

                    container.contains(
                        state.element
                    )

                );


            if (
                valid
            ) {

                return true;

            }


            /*
             * DOM diubah oleh komponen lain.
             * Hapus state lama agar tidak dianggap aktif.
             */
            activeStates.delete(
                container
            );

        }


        return Boolean(
            container.querySelector(
                "[data-empty-state='true']"
            )
        );

    }


    /* ======================================================
       REFRESH ONE
    ====================================================== */

    function refresh(
        target
    ) {

        const container =
            resolveTarget(
                target,
                false
            );


        if (
            !container
        ) {

            return null;

        }


        const state =
            activeStates.get(
                container
            );


        if (
            !state
        ) {

            return null;

        }


        const element =
            render({

                ...state.options,

                target:
                    container

            });


        if (
            element
        ) {

            dispatch(
                EVENTS.REFRESHED,
                {

                    target:
                        container,

                    element,

                    preset:
                        element.dataset
                            .emptyStatePreset

                }
            );

        }


        return element;

    }


    /* ======================================================
       REFRESH ALL

       Dipanggil ketika bahasa berubah.
    ====================================================== */

    function refreshAll() {

        const containers =
            Array.from(
                document.querySelectorAll(
                    "[data-empty-state-active='true']"
                )
            );


        let refreshed =
            0;


        containers.forEach(
            container => {

                if (
                    !activeStates.has(
                        container
                    )
                ) {

                    return;

                }


                if (
                    refresh(
                        container
                    )
                ) {

                    refreshed +=
                        1;

                }

            }
        );


        return refreshed;

    }


    /* ======================================================
       PRESET HELPERS
    ====================================================== */

    function getPreset(
        presetName
    ) {

        const normalizedName =
            normalizePresetName(
                presetName
            );


        return (
            PRESETS[
                normalizedName
            ] ||
            PRESETS.error
        );

    }


    function getPresetNames() {

        return Object.keys(
            PRESETS
        );

    }


    function hasPreset(
        presetName
    ) {

        return Object.prototype
            .hasOwnProperty
            .call(
                PRESETS,
                normalizePresetName(
                    presetName
                )
            );

    }


    /* ======================================================
       CREATE ICON
    ====================================================== */

    function createIcon(
        settings
    ) {

        const iconContainer =
            document.createElement(
                "div"
            );


        iconContainer.className =
            "empty-state-icon";


        iconContainer.setAttribute(
            "aria-hidden",
            "true"
        );


        /* ==============================================
           CUSTOM ELEMENT
        ============================================== */

        if (
            settings.icon instanceof
            Element
        ) {

            iconContainer.append(
                settings.icon
                    .cloneNode(
                        true
                    )
            );


            return iconContainer;

        }


        /* ==============================================
           IMAGE
        ============================================== */

        if (
            settings.iconImage
        ) {

            const image =
                document.createElement(
                    "img"
                );


            image.src =
                resolveAssetPath(
                    settings.iconImage
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


                    iconContainer.textContent =
                        normalizeText(
                            settings.icon
                        ) ||
                        "•";

                },
                {
                    once:
                        true
                }
            );


            iconContainer.append(
                image
            );


            return iconContainer;

        }


        /* ==============================================
           TEXT / SYMBOL
        ============================================== */

        iconContainer.textContent =
            normalizeText(
                settings.icon
            ) ||
            "•";


        return iconContainer;

    }


    /* ======================================================
       CREATE ACTIONS
    ====================================================== */

    function createActions(
        settings
    ) {

        const actions = [

            {
                type:
                    "primary",

                value:
                    settings
                        .primaryAction
            },

            {
                type:
                    "secondary",

                value:
                    settings
                        .secondaryAction
            }

        ].filter(
            entry =>
                Boolean(
                    entry.value
                )
        );


        if (
            actions.length ===
            0
        ) {

            return null;

        }


        const container =
            document.createElement(
                "div"
            );


        container.className =
            "empty-state-actions";


        actions.forEach(
            entry => {

                const element =
                    createActionElement(

                        entry.value,

                        settings,

                        entry.type

                    );


                if (
                    element
                ) {

                    container.append(
                        element
                    );

                }

            }
        );


        return container
            .children
            .length >
            0
                ? container
                : null;

    }


    /* ======================================================
       CREATE ACTION ELEMENT
    ====================================================== */

    function createActionElement(
        action,
        settings,
        actionType
    ) {

        const normalizedAction =
            normalizeAction(
                action,
                actionType,
                settings.preset
            );


        if (
            !normalizedAction
        ) {

            return null;

        }


        const hasDestination =
            Boolean(

                normalizedAction.href ||

                normalizedAction.routeKey

            );


        const element =
            document.createElement(
                hasDestination
                    ? "a"
                    : "button"
            );


        if (
            element instanceof
            HTMLButtonElement
        ) {

            element.type =
                "button";


            element.disabled =
                normalizedAction
                    .disabled;

        }


        element.className =
            buildClassName(
                normalizedAction
                    .className
            );


        element.textContent =
            resolveText({

                text:
                    normalizedAction.label,

                translationKey:
                    normalizedAction
                        .labelKey,

                fallback:
                    normalizedAction
                        .labelFallback,

                parameters:
                    settings.parameters

            });


        element.dataset.emptyStateAction =
            normalizedAction.action ||
            actionType;


        element.dataset.emptyStateActionType =
            actionType;


        /* ==============================================
           ARIA LABEL
        ============================================== */

        const ariaLabel =
            resolveActionAriaLabel(
                normalizedAction,
                settings
            );


        if (
            ariaLabel
        ) {

            element.setAttribute(
                "aria-label",
                ariaLabel
            );

        }


        /* ==============================================
           LINK
        ============================================== */

        if (
            element instanceof
            HTMLAnchorElement
        ) {

            element.href =
                resolveActionHref(
                    normalizedAction
                );


            if (
                normalizedAction.target
            ) {

                element.target =
                    normalizedAction
                        .target;

            }


            const rel =
                resolveRel(
                    normalizedAction
                );


            if (
                rel
            ) {

                element.rel =
                    rel;

            }


            if (
                normalizedAction.disabled
            ) {

                element.setAttribute(
                    "aria-disabled",
                    "true"
                );


                element.tabIndex =
                    -1;

            }

        }


        /* ==============================================
           CLICK
        ============================================== */

        element.addEventListener(
            "click",
            event => {

                handleActionClick(

                    event,

                    normalizedAction,

                    settings,

                    actionType

                );

            }
        );


        return element;

    }


    /* ======================================================
       ACTION CLICK
    ====================================================== */

    function handleActionClick(
        event,
        action,
        settings,
        actionType
    ) {

        if (
            action.disabled
        ) {

            event.preventDefault();

            return;

        }


        const detail = {

            preset:
                settings.preset,

            action:
                action.action ||
                actionType,

            actionType,

            query:
                settings.query,

            parameters:
                {
                    ...settings.parameters
                },

            target:
                settings.targetElement,

            originalEvent:
                event

        };


        /* ==============================================
           CALLBACK
        ============================================== */

        if (
            typeof action.onClick ===
            "function"
        ) {

            /*
             * Callback action memiliki kontrol navigasi
             * sendiri.
             */
            event.preventDefault();


            try {

                const result =
                    action.onClick(
                        detail
                    );


                if (
                    result &&
                    typeof result
                        .catch ===
                        "function"
                ) {

                    result.catch(
                        error => {

                            handleActionError(
                                error,
                                detail
                            );

                        }
                    );

                }

            } catch (error) {

                handleActionError(
                    error,
                    detail
                );

            }

        }


        dispatch(
            EVENTS.ACTION,
            detail
        );

    }


    /* ======================================================
       ACTION ERROR
    ====================================================== */

    function handleActionError(
        error,
        detail
    ) {

        const normalizedError =
            normalizeError(
                error
            );


        console.error(
            "EmptyStateComponent action gagal:",
            normalizedError
        );


        dispatch(
            EVENTS.ACTION_ERROR,
            {

                ...detail,

                error:
                    normalizedError

            }
        );

    }


    /* ======================================================
       NORMALIZE OPTIONS
    ====================================================== */

    function normalizeOptions(
        options = {}
    ) {

        const source =
            isPlainObject(
                options
            )
                ? options
                : {};


        const presetName =
            normalizePresetName(

                source.preset ||

                source.type ||

                "error"

            );


        const preset =
            getPreset(
                presetName
            );


        const targetElement =
            resolveTarget(
                source.target,
                false
            );


        const query =
            normalizeText(
                source.query
            );


        const customParameters =
            isPlainObject(
                source.parameters
            )
                ? source.parameters
                : {};


        const parameters = {

            query,

            ...customParameters

        };


        return {

            preset:
                presetName,


            targetElement,


            role:
                normalizeRole(

                    source.role ||

                    preset.role ||

                    "status"

                ),


            ariaLive:
                normalizeAriaLive(

                    source.ariaLive ||

                    preset.ariaLive ||

                    "polite"

                ),


            headingTag:
                normalizeHeadingTag(
                    source.headingTag
                ),


            className:
                buildClassName(
                    source.className
                ),


            showIcon:
                source.showIcon !==
                false,


            icon:
                source.icon ??
                preset.icon ??
                "",


            iconImage:
                normalizeText(

                    source.iconImage ||

                    preset.iconImage

                ),


            title:
                source.title ??
                "",


            titleKey:
                source.titleKey ??
                preset.titleKey ??
                "",


            titleFallback:
                source.titleFallback ??
                getDefaultFallback(
                    presetName,
                    "title"
                ),


            description:
                source.description ??
                "",


            descriptionKey:
                source.descriptionKey ??
                preset.descriptionKey ??
                "",


            descriptionFallback:
                source.descriptionFallback ??
                getDefaultFallback(
                    presetName,
                    "description"
                ),


            primaryAction:
                resolveConfiguredAction(

                    source.primaryAction,

                    preset.primaryAction

                ),


            secondaryAction:
                resolveConfiguredAction(

                    source.secondaryAction,

                    preset.secondaryAction

                ),


            query,


            parameters

        };

    }


    /* ======================================================
       CONFIGURED ACTION

       Object custom digabung dengan action preset.
       Dengan demikian controller cukup mengirim:

       primaryAction: {
           onClick: retry
       }

       tanpa kehilangan labelKey dan action "retry".
    ====================================================== */

    function resolveConfiguredAction(
        customAction,
        presetAction
    ) {

        if (
            customAction ===
            false
        ) {

            return null;

        }


        if (
            typeof customAction ===
            "string"
        ) {

            return customAction;

        }


        if (
            isPlainObject(
                customAction
            )
        ) {

            return {

                ...(
                    isPlainObject(
                        presetAction
                    )
                        ? presetAction
                        : {}
                ),

                ...customAction

            };

        }


        if (
            isPlainObject(
                presetAction
            )
        ) {

            return {
                ...presetAction
            };

        }


        return (
            presetAction ||
            null
        );

    }


    /* ======================================================
       NORMALIZE ACTION
    ====================================================== */

    function normalizeAction(
        action,
        actionType,
        presetName
    ) {

        if (
            typeof action ===
            "string"
        ) {

            return {

                label:
                    action,

                labelKey:
                    "",

                labelFallback:
                    action,


                ariaLabel:
                    "",

                ariaLabelKey:
                    "",


                href:
                    "",

                routeKey:
                    "",

                params:
                    {},

                hash:
                    "",


                target:
                    "",

                rel:
                    "",


                action:
                    actionType,


                className:
                    actionType ===
                    "primary"
                        ? "btn btn-primary"
                        : "btn btn-outline",


                disabled:
                    false,


                onClick:
                    null

            };

        }


        if (
            !isPlainObject(
                action
            )
        ) {

            return null;

        }


        const fallbackField =
            actionType ===
            "primary"
                ? "primaryButton"
                : "secondaryButton";


        return {

            label:
                action.label ??
                "",


            labelKey:
                action.labelKey ??
                "",


            labelFallback:
                action.labelFallback ??
                getDefaultFallback(
                    presetName,
                    fallbackField
                ) ??
                getDefaultActionFallback(
                    actionType
                ),


            ariaLabel:
                action.ariaLabel ??
                "",


            ariaLabelKey:
                action.ariaLabelKey ??
                "",


            href:
                normalizeText(
                    action.href
                ),


            routeKey:
                normalizeText(
                    action.routeKey
                ),


            params:
                isPlainObject(
                    action.params
                )
                    ? {
                        ...action.params
                    }
                    : {},


            hash:
                normalizeText(
                    action.hash
                ),


            target:
                normalizeTarget(
                    action.target
                ),


            rel:
                normalizeText(
                    action.rel
                ),


            action:
                normalizeText(
                    action.action
                ) ||
                actionType,


            className:
                buildClassName(

                    action.className ||

                    (
                        actionType ===
                        "primary"
                            ? "btn btn-primary"
                            : "btn btn-outline"
                    )

                ),


            disabled:
                Boolean(
                    action.disabled
                ),


            onClick:
                typeof action.onClick ===
                "function"
                    ? action.onClick
                    : null

        };

    }


    /* ======================================================
       PRESET NAME
    ====================================================== */

    function normalizePresetName(
        value
    ) {

        const source =
            normalizeText(
                value
            );


        if (
            !source
        ) {

            return "error";

        }


        const lower =
            source.toLowerCase();


        const aliasMap = {

            "no-products":
                "noProducts",

            "noproducts":
                "noProducts",


            "no-brands":
                "noBrands",

            "nobrands":
                "noBrands",


            "no-search":
                "noSearch",

            "nosearch":
                "noSearch",


            "no-category":
                "noCategory",

            "nocategory":
                "noCategory",


            "no-favorite":
                "noFavorite",

            "nofavorite":
                "noFavorite",


            "network-error":
                "networkError",

            "networkerror":
                "networkError",


            "404":
                "notFound",

            "not-found":
                "notFound",

            "notfound":
                "notFound",


            "coming-soon":
                "comingSoon",

            "comingsoon":
                "comingSoon",


            "maintenance":
                "maintenance",


            "error":
                "error"

        };


        if (
            aliasMap[
                lower
            ]
        ) {

            return aliasMap[
                lower
            ];

        }


        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    PRESETS,
                    source
                )
        ) {

            return source;

        }


        return "error";

    }


    /* ======================================================
       HEADING
    ====================================================== */

    function normalizeHeadingTag(
        value
    ) {

        const supported = [

            "h1",
            "h2",
            "h3"

        ];


        const tag =
            normalizeText(
                value ||
                "h2"
            )
                .toLowerCase();


        return supported.includes(
            tag
        )
            ? tag
            : "h2";

    }


    /* ======================================================
       ROLE
    ====================================================== */

    function normalizeRole(
        value
    ) {

        const role =
            normalizeText(
                value
            )
                .toLowerCase();


        const supported = [

            "status",
            "alert",
            "region"

        ];


        return supported.includes(
            role
        )
            ? role
            : "status";

    }


    /* ======================================================
       ARIA LIVE
    ====================================================== */

    function normalizeAriaLive(
        value
    ) {

        const ariaLive =
            normalizeText(
                value
            )
                .toLowerCase();


        const supported = [

            "polite",
            "assertive",
            "off"

        ];


        return supported.includes(
            ariaLive
        )
            ? ariaLive
            : "polite";

    }


    /* ======================================================
       LINK TARGET
    ====================================================== */

    function normalizeTarget(
        value
    ) {

        const target =
            normalizeText(
                value
            );


        const supported = [

            "_self",
            "_blank",
            "_parent",
            "_top"

        ];


        return supported.includes(
            target
        )
            ? target
            : "";

    }


    /* ======================================================
       ACTION HREF
    ====================================================== */

    function resolveActionHref(
        action
    ) {

        /* ==============================================
           EXPLICIT HREF
        ============================================== */

        if (
            action.href
        ) {

            return resolveExplicitHref(
                action.href
            );

        }


        /* ==============================================
           GOMAI ROUTE
        ============================================== */

        if (
            !action.routeKey
        ) {

            return "#";

        }


        let route =
            "#";


        try {

            if (
                window.GomaiUtils &&
                typeof window.GomaiUtils
                    .buildRoute ===
                    "function" &&
                Object.keys(
                    action.params
                ).length > 0
            ) {

                route =
                    window.GomaiUtils
                        .buildRoute(
                            action.routeKey,
                            action.params
                        );

            } else if (
                window.GomaiUtils &&
                typeof window.GomaiUtils
                    .getRoute ===
                    "function"
            ) {

                route =
                    window.GomaiUtils
                        .getRoute(
                            action.routeKey
                        );

            }

        } catch (error) {

            console.warn(
                `EmptyStateComponent: route "${action.routeKey}" tidak tersedia.`,
                error
            );


            route =
                "#";

        }


        if (
            action.hash &&
            route !==
                "#"
        ) {

            route =
                appendHash(
                    route,
                    action.hash
                );

        }


        return (
            route ||
            "#"
        );

    }


    /* ======================================================
       EXPLICIT HREF
    ====================================================== */

    function resolveExplicitHref(
        href
    ) {

        const value =
            normalizeText(
                href
            );


        if (
            !value
        ) {

            return "#";

        }


        /*
         * URL berbahaya tidak diperbolehkan.
         */
        if (
            /^(?:javascript|data|vbscript):/i
                .test(
                    value
                )
        ) {

            return "#";

        }


        /*
         * External / protocol / hash.
         */
        if (
            /^(?:https?:|mailto:|tel:|sms:|#|\/\/)/i
                .test(
                    value
                )
        ) {

            return value;

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

                /*
                 * Gunakan value asli.
                 */

            }

        }


        return value;

    }


    /* ======================================================
       APPEND HASH
    ====================================================== */

    function appendHash(
        url,
        hash
    ) {

        const normalizedHash =
            normalizeText(
                hash
            )
                .replace(
                    /^#+/,
                    ""
                );


        if (
            !normalizedHash
        ) {

            return url;

        }


        const base =
            String(
                url
            )
                .split("#")[0];


        return (
            `${base}#${encodeURIComponent(normalizedHash)}`
        );

    }


    /* ======================================================
       REL
    ====================================================== */

    function resolveRel(
        action
    ) {

        if (
            action.rel
        ) {

            return action.rel;

        }


        if (
            action.target ===
            "_blank"
        ) {

            return "noopener noreferrer";

        }


        return "";

    }


    /* ======================================================
       ACTION ARIA LABEL
    ====================================================== */

    function resolveActionAriaLabel(
        action,
        settings
    ) {

        if (
            !action.ariaLabel &&
            !action.ariaLabelKey
        ) {

            return "";

        }


        return resolveText({

            text:
                action.ariaLabel,

            translationKey:
                action.ariaLabelKey,

            fallback:
                action.labelFallback,

            parameters:
                settings.parameters

        });

    }


    /* ======================================================
       RESOLVE TEXT
    ====================================================== */

    function resolveText({
        text,
        translationKey,
        fallback,
        parameters
    }) {

        if (
            text !==
                undefined &&
            text !==
                null &&
            String(
                text
            ).length >
                0
        ) {

            return interpolate(

                String(
                    text
                ),

                parameters

            );

        }


        if (
            translationKey
        ) {

            return translate(

                translationKey,

                fallback,

                parameters

            );

        }


        return interpolate(

            String(
                fallback ||
                ""
            ),

            parameters

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
                    `EmptyStateComponent: terjemahan "${key}" gagal.`,
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

                /*
                 * Gunakan fallback internal.
                 */

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
        )
            .reduce(
                (
                    result,
                    [
                        key,
                        value
                    ]
                ) => {

                    return result
                        .replaceAll(

                            `{{${key}}}`,

                            String(
                                value ??
                                ""
                            )

                        );

                },
                String(
                    text ||
                    ""
                )
            );

    }


    /* ======================================================
       TARGET
    ====================================================== */

    function resolveTarget(
        target,
        showWarning = true
    ) {

        if (
            target instanceof
            Element
        ) {

            return target;

        }


        if (
            typeof target !==
                "string" ||
            !target.trim()
        ) {

            if (
                showWarning
            ) {

                console.warn(
                    "EmptyStateComponent: target tidak valid."
                );

            }


            return null;

        }


        const value =
            target.trim();


        /* ==============================================
           ID FIRST
        ============================================== */

        const id =
            value.startsWith(
                "#"
            )
                ? value.slice(1)
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


        /* ==============================================
           SELECTOR
        ============================================== */

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
                `EmptyStateComponent: target "${value}" tidak ditemukan.`
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

                /*
                 * Gunakan value asli.
                 */

            }

        }


        return value;

    }


    /* ======================================================
       FALLBACK
    ====================================================== */

    function getDefaultFallback(
        preset,
        field
    ) {

        const language =
            getCurrentLanguage();


        return (

            FALLBACKS
                ?.[language]
                ?.[preset]
                ?.[field] ||

            FALLBACKS
                ?.zh
                ?.[preset]
                ?.[field] ||

            FALLBACKS
                ?.id
                ?.[preset]
                ?.[field] ||

            ""

        );

    }


    function getDefaultActionFallback(
        actionType
    ) {

        const language =
            getCurrentLanguage();


        if (
            language ===
            "id"
        ) {

            return actionType ===
                "primary"
                    ? "Lanjutkan"
                    : "Kembali";

        }


        return actionType ===
            "primary"
                ? "继续"
                : "返回";

    }


    /* ======================================================
       LANGUAGE
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

                /*
                 * Gunakan config fallback.
                 */

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


        return language ===
            "id"
                ? "id"
                : "zh";

    }


    /* ======================================================
       LANGUAGE EVENT

       EmptyState adalah utility component dan tidak
       autoInit melalui ComponentRegistry. Karena itu
       active empty state tetap mendengarkan event bahasa
       secara langsung.
    ====================================================== */

    function handleLanguageChanged() {

        refreshAll();

    }


    document.addEventListener(
        "gomai:language-changed",
        handleLanguageChanged
    );


    /* ======================================================
       STORE OPTIONS
    ====================================================== */

    function createStoredOptions(
        options,
        target
    ) {

        return {

            ...options,


            target,


            parameters:
                isPlainObject(
                    options.parameters
                )
                    ? {
                        ...options.parameters
                    }
                    : {},


            primaryAction:
                cloneActionOption(
                    options.primaryAction
                ),


            secondaryAction:
                cloneActionOption(
                    options.secondaryAction
                )

        };

    }


    function cloneActionOption(
        value
    ) {

        if (
            isPlainObject(
                value
            )
        ) {

            return {

                ...value,


                params:
                    isPlainObject(
                        value.params
                    )
                        ? {
                            ...value.params
                        }
                        : value.params

            };

        }


        return value;

    }


    /* ======================================================
       CLASS NAME
    ====================================================== */

    function buildClassName(
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
        ].join(" ");

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
       DEEP FREEZE
    ====================================================== */

    function deepFreeze(
        value
    ) {

        if (
            !value ||
            typeof value !==
                "object" ||
            Object.isFrozen(
                value
            )
        ) {

            return value;

        }


        Reflect.ownKeys(
            value
        )
            .forEach(
                key => {

                    deepFreeze(
                        value[
                            key
                        ]
                    );

                }
            );


        return Object.freeze(
            value
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


        return new Error(
            String(
                error ||
                "Terjadi kesalahan pada EmptyStateComponent."
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


            create,

            render,

            replace,


            clear,


            refresh,

            refreshAll,


            isVisible,


            getPreset,

            getPresetNames,

            hasPreset,


            presets:
                PRESETS

        });


    return publicAPI;

})();


window.EmptyStateComponent =
    EmptyStateComponent;