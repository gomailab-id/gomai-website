"use strict";

/**
 * GOMAI SHARED FOOTER
 * Version 4.0.0
 *
 * Focus:
 * - 4 main categories
 * - information pages
 * - WeChat QR + copyable WeChat ID
 * - copyright
 *
 * No duplicated brand list, service explanation, payment logos,
 * location, or operating-hour claims.
 */
const FooterComponent = (() => {
    const VERSION = "4.0.0";
    const DEFAULT_TARGET_ID = "site-footer";

    let rendered = false;
    let rootElement = null;
    let categories = [];
    let eventController = null;
    let lastError = null;

    async function render(options = {}) {
        const targetId =
            options.targetId ||
            DEFAULT_TARGET_ID;

        const target =
            document.getElementById(
                targetId
            );

        if (!target) {
            return null;
        }

        lastError = null;

        try {
            categories =
                await resolveCategories();

            rootElement =
                target;

            rootElement.className =
                "footer shared-footer footer-v4";

            rootElement.dataset.footerRendered =
                "true";

            rootElement.dataset.footerVersion =
                VERSION;

            rootElement.innerHTML =
                buildMarkup();

            createEventController();
            bindEvents();
            refreshLanguage();

            rendered = true;

            return rootElement;
        } catch (error) {
            lastError =
                error instanceof Error
                    ? error
                    : new Error(
                        String(error)
                    );

            console.error(
                "FooterComponent gagal dirender:",
                lastError
            );

            return null;
        }
    }

    async function resolveCategories() {
        const model =
            window.Gomai
                ?.getModel?.(
                    "categories"
                ) ||
            window.ModelRegistry
                ?.get?.(
                    "categories"
                ) ||
            window.CategoriesModel;

        if (
            !model ||
            typeof model.getNavigation !==
                "function"
        ) {
            return [];
        }

        const data =
            await model.getNavigation();

        return Array.isArray(data)
            ? data.slice(0, 4)
            : [];
    }

    function buildMarkup() {
        const categoryLinks =
            categories
                .map(
                    category => `
                        <li>
                            <a
                                href="${escapeAttribute(
                                    buildCategoryRoute(
                                        category?.id
                                    )
                                )}"
                                data-footer-category-id="${escapeAttribute(
                                    category?.id
                                )}"
                            >
                                ${escapeHTML(
                                    localized(
                                        category?.name
                                    )
                                )}
                            </a>
                        </li>
                    `
                )
                .join("");

        return `
            <div class="container footer-v4-grid">

                <div class="footer-v4-identity">
                    <a
                        href="${escapeAttribute(
                            getRoute(
                                "home",
                                "index.html"
                            )
                        )}"
                        class="footer-v4-logo"
                        aria-label="Gomai"
                    >
                        <img
                            src="${escapeAttribute(
                                resolveAsset(
                                    window.GomaiConfig
                                        ?.site
                                        ?.logo
                                        ?.header ||
                                    "assets/gomai/logo-header.png"
                                )
                            )}"
                            alt="Gomai"
                        >
                    </a>

                    <p data-footer-text="footer.description">
                        Belanja mudah untuk olahraga, makanan,
                        bahan segar, dan perlengkapan harian.
                    </p>
                </div>

                <nav
                    class="footer-v4-column"
                    aria-label="Kategori"
                >
                    <h2 data-footer-text="footer.categoryTitle">
                        Kategori
                    </h2>

                    <ul>
                        ${categoryLinks}
                    </ul>
                </nav>

                <nav
                    class="footer-v4-column"
                    aria-label="Informasi"
                >
                    <h2 data-footer-text="footer.informationTitle">
                        Informasi
                    </h2>

                    <ul>
                        <li>
                            <a
                                href="${escapeAttribute(
                                    getRoute(
                                        "howToBuy",
                                        "pages/how-to-buy.html"
                                    )
                                )}"
                                data-footer-text="footer.howToBuy"
                            >
                                Cara Membeli
                            </a>
                        </li>

                        <li>
                            <a
                                href="${escapeAttribute(
                                    getRoute(
                                        "about",
                                        "pages/about.html"
                                    )
                                )}"
                                data-footer-text="footer.about"
                            >
                                Tentang Gomai
                            </a>
                        </li>

                        <li>
                            <a
                                href="${escapeAttribute(
                                    getRoute(
                                        "faq",
                                        "pages/faq.html"
                                    )
                                )}"
                                data-footer-text="footer.faq"
                            >
                                FAQ
                            </a>
                        </li>

                        <li>
                            <a
                                href="${escapeAttribute(
                                    getRoute(
                                        "contact",
                                        "pages/contact.html"
                                    )
                                )}"
                                data-footer-text="footer.contactUs"
                            >
                                Hubungi Gomai
                            </a>
                        </li>
                    </ul>
                </nav>

                <div class="footer-v4-wechat">
                    <div>
                        <h2 data-footer-text="footer.wechatTitle">
                            WeChat Gomai
                        </h2>

                        <p data-footer-text="footer.scanWechat">
                            Scan QR atau salin WeChat ID.
                        </p>
                    </div>

                    <div class="footer-v4-qr">
                        <img
                            src="${escapeAttribute(
                                resolveAsset(
                                    window.GomaiConfig
                                        ?.contact
                                        ?.wechatQr ||
                                    "assets/gomai/wechat-qr.png"
                                )
                            )}"
                            alt="WeChat QR Gomai"
                        >
                    </div>

                    <div class="footer-v4-id-row">
                        <div>
                            <span>WeChat ID</span>
                            <strong data-footer-wechat-id>
                                ${escapeHTML(
                                    getWechatId()
                                )}
                            </strong>
                        </div>

                        <button
                            type="button"
                            data-footer-copy-wechat
                        >
                            <span
                                data-footer-copy-label
                                data-footer-text="footer.copy"
                            >
                                Salin
                            </span>
                        </button>
                    </div>

                    <button
                        type="button"
                        class="footer-v4-open-wechat"
                        data-footer-open-wechat
                        data-footer-text="footer.openWechat"
                    >
                        Buka WeChat
                    </button>
                </div>

            </div>

            <div class="container footer-v4-bottom">
                <p data-footer-copyright>
                    ${escapeHTML(
                        buildCopyright()
                    )}
                </p>
            </div>
        `;
    }

    function createEventController() {
        eventController?.abort();
        eventController =
            new AbortController();
    }

    function bindEvents() {
        rootElement.addEventListener(
            "click",
            event => {
                const target =
                    event.target instanceof Element
                        ? event.target
                        : null;

                const button =
                    target?.closest(
                        "[data-footer-copy-wechat]"
                    );

                if (button) {
                    copyWechatId(
                        button
                    );

                    return;
                }

                const openButton =
                    target?.closest(
                        "[data-footer-open-wechat]"
                    );

                if (openButton) {
                    openWechat(
                        openButton
                    );
                }
            },
            {
                signal:
                    eventController.signal
            }
        );
    }

    async function openWechat(button) {
        await copyText(
            getWechatId()
        );

        button.textContent =
            t(
                "footer.openingWechat",
                "Membuka WeChat…"
            );

        window.location.href =
            "weixin://";

        window.setTimeout(
            () => {
                if (button.isConnected) {
                    button.textContent =
                        t(
                            "footer.openWechat",
                            "Buka WeChat"
                        );
                }
            },
            1800
        );
    }

    async function copyWechatId(
        button
    ) {
        const copied =
            await copyText(
                getWechatId()
            );

        if (!copied) {
            return false;
        }

        const label =
            button.querySelector(
                "[data-footer-copy-label]"
            );

        if (label) {
            label.textContent =
                t(
                    "footer.copied",
                    "Tersalin"
                );
        }

        button.classList.add(
            "is-copied"
        );

        window.setTimeout(
            () => {
                if (!button.isConnected) {
                    return;
                }

                if (label) {
                    label.textContent =
                        t(
                            "footer.copy",
                            "Salin"
                        );
                }

                button.classList.remove(
                    "is-copied"
                );
            },
            1600
        );

        return true;
    }

    async function copyText(value) {
        const text =
            String(value || "");

        try {
            if (
                navigator.clipboard &&
                typeof navigator.clipboard
                    .writeText ===
                    "function"
            ) {
                await navigator.clipboard
                    .writeText(text);

                return true;
            }
        } catch (_error) {
            /* fallback */
        }

        const textarea =
            document.createElement(
                "textarea"
            );

        textarea.value =
            text;

        textarea.setAttribute(
            "readonly",
            ""
        );

        textarea.style.position =
            "fixed";

        textarea.style.opacity =
            "0";

        document.body.append(
            textarea
        );

        textarea.select();

        let copied = false;

        try {
            copied =
                document.execCommand(
                    "copy"
                );
        } catch (_error) {
            copied = false;
        }

        textarea.remove();

        return copied;
    }

    async function refreshLanguage() {
        if (!rootElement) {
            return false;
        }

        rootElement
            .querySelectorAll(
                "[data-footer-text]"
            )
            .forEach(
                element => {
                    const key =
                        element.dataset
                            .footerText;

                    element.textContent =
                        t(
                            key,
                            element.textContent
                                .trim()
                        );
                }
            );

        rootElement
            .querySelectorAll(
                "[data-footer-category-id]"
            )
            .forEach(
                link => {
                    const category =
                        categories.find(
                            item =>
                                String(
                                    item?.id
                                ) ===
                                String(
                                    link.dataset
                                        .footerCategoryId
                                )
                        );

                    if (category) {
                        link.textContent =
                            localized(
                                category.name
                            );
                    }
                }
            );

        const copyright =
            rootElement.querySelector(
                "[data-footer-copyright]"
            );

        if (copyright) {
            copyright.textContent =
                buildCopyright();
        }

        const id =
            rootElement.querySelector(
                "[data-footer-wechat-id]"
            );

        if (id) {
            id.textContent =
                getWechatId();
        }

        return true;
    }

    async function refreshNavigation() {
        return render({
            targetId:
                rootElement?.id ||
                DEFAULT_TARGET_ID
        });
    }

    function getCurrentLanguage() {
        return (
            window.Language
                ?.getLanguage?.() ||
            window.GomaiConfig
                ?.language
                ?.default ||
            "zh"
        );
    }

    function localized(value) {
        if (typeof value === "string") {
            return value;
        }

        const language =
            getCurrentLanguage();

        return String(
            value?.[language] ||
            value?.zh ||
            value?.id ||
            ""
        );
    }

    function t(key, fallback) {
        const value =
            window.Language
                ?.translate?.(
                    key
                ) ||
            window.Language
                ?.t?.(
                    key
                );

        return (
            value &&
            value !== key
        )
            ? value
            : fallback;
    }

    function buildCopyright() {
        const language =
            getCurrentLanguage();

        const year =
            new Date().getFullYear();

        return language === "zh"
            ? `© ${year} Gomai. 保留所有权利。`
            : `© ${year} Gomai. Semua hak dilindungi.`;
    }

    function getWechatId() {
        return (
            window.GomaiConfig
                ?.contact
                ?.wechatId ||
            "Gomai"
        );
    }

    function getRoute(name, fallback) {
        try {
            return (
                window.GomaiUtils
                    ?.getRoute?.(
                        name
                    ) ||
                fallback
            );
        } catch (_error) {
            return fallback;
        }
    }

    function buildCategoryRoute(id) {
        try {
            return (
                window.GomaiUtils
                    ?.buildRoute?.(
                        "products",
                        {
                            category:
                                id
                        }
                    ) ||
                `${getRoute(
                    "products",
                    "pages/products.html"
                )}?category=${encodeURIComponent(id)}`
            );
        } catch (_error) {
            return `${getRoute(
                "products",
                "pages/products.html"
            )}?category=${encodeURIComponent(id)}`;
        }
    }

    function resolveAsset(path) {
        return (
            window.GomaiUtils
                ?.resolveAssetPath?.(
                    path
                ) ||
            path
        );
    }

    function escapeHTML(value) {
        const div =
            document.createElement(
                "div"
            );

        div.textContent =
            String(value || "");

        return div.innerHTML;
    }

    function escapeAttribute(value) {
        return escapeHTML(value)
            .replaceAll(
                '"',
                "&quot;"
            );
    }

    function destroy() {
        eventController?.abort();
        eventController = null;

        if (rootElement) {
            rootElement.replaceChildren();
            rootElement.removeAttribute(
                "data-footer-rendered"
            );
            rootElement.removeAttribute(
                "data-footer-version"
            );
        }

        rootElement = null;
        categories = [];
        rendered = false;

        return true;
    }

    function getNavigationCategories() {
        return JSON.parse(
            JSON.stringify(
                categories
            )
        );
    }

    // Compatibility with older callers.
    function getNavigationBrands() {
        return getNavigationCategories();
    }

    return Object.freeze({
        version: VERSION,
        render,
        destroy,
        refreshLanguage,
        refreshNavigation,
        updateLanguageButtons:
            refreshLanguage,
        getNavigationCategories,
        getNavigationBrands,
        hasRendered:
            () => rendered,
        getElement:
            () => rootElement,
        getLastError:
            () => lastError,
        getCore:
            () => null
    });
})();

window.FooterComponent =
    FooterComponent;
