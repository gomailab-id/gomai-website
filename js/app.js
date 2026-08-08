"use strict";

/**
 * ==========================================================
 * GOMAI APPLICATION BOOTSTRAPPER v2.2
 * ==========================================================
 *
 * Entry point aplikasi Gomai.
 *
 * Tanggung jawab:
 * - Menunggu DOM siap.
 * - Menjalankan Gomai.boot().
 * - Mencegah bootstrap berjalan lebih dari satu kali.
 * - Mengirim event lifecycle bootstrap.
 * - Menampilkan error global tanpa menghapus isi halaman.
 *
 * File ini tidak menangani:
 * - business logic;
 * - model;
 * - komponen;
 * - controller;
 * - rendering halaman utama.
 * ==========================================================
 */

const GomaiApplication = (() => {
    let bootstrapPromise = null;
    let applicationStatus = "idle";

    /**
     * Memulai bootstrap aplikasi satu kali.
     *
     * Pemanggilan berikutnya akan menggunakan Promise
     * bootstrap yang sama.
     *
     * @returns {Promise<object|null>}
     */
    function start() {
        if (bootstrapPromise) {
            return bootstrapPromise;
        }

        bootstrapPromise =
            bootstrapApplication();

        return bootstrapPromise;
    }

    /**
     * Menjalankan bootstrap framework Gomai.
     *
     * @returns {Promise<object|null>}
     */
    async function bootstrapApplication() {
        const startedAt =
            getHighResolutionTime();

        setApplicationStatus(
            "booting"
        );

        dispatchApplicationEvent(
            "gomai:bootstrap-started",
            {
                timestamp:
                    Date.now()
            }
        );

        try {
            validateBootstrapDependencies();

            const rawResult =
                await window.Gomai.boot();

            const result =
                normalizeBootstrapResult(
                    rawResult,
                    startedAt
                );

            removeBootstrapErrorPanel();

            setApplicationStatus(
                "ready"
            );

            console.info(
                `%cGomai ${result.version} siap (${result.duration} ms)`,
                "color:#f4b400;font-weight:700;"
            );

            dispatchApplicationEvent(
                "gomai:bootstrap-completed",
                {
                    result,
                    timestamp:
                        Date.now()
                }
            );

            return result;
        } catch (error) {
            const normalizedError =
                normalizeError(error);

            handleBootstrapError(
                normalizedError
            );

            return null;
        }
    }

    /**
     * Memastikan dependency utama bootstrap tersedia.
     */
    function validateBootstrapDependencies() {
        if (
            !window.Gomai ||
            typeof window.Gomai.boot !==
                "function"
        ) {
            throw new Error(
                "Gomai Framework belum dimuat atau Gomai.boot() tidak tersedia."
            );
        }
    }

    /**
     * Menormalisasi hasil Gomai.boot().
     *
     * Tetap aman apabila Gomai.boot() tidak mengembalikan
     * object, version, atau duration.
     *
     * @param {unknown} result
     * @param {number} startedAt
     * @returns {object}
     */
    function normalizeBootstrapResult(
        result,
        startedAt
    ) {
        const normalizedResult =
            isPlainObject(result)
                ? {
                    ...result
                }
                : {};

        const configuredVersion =
            window.GomaiConfig
                ?.site
                ?.version ||
            "unknown";

        const receivedDuration =
            Number(
                normalizedResult.duration
            );

        const measuredDuration =
            Math.max(
                0,
                Math.round(
                    getHighResolutionTime() -
                    startedAt
                )
            );

        normalizedResult.version =
            String(
                normalizedResult.version ||
                configuredVersion
            );

        normalizedResult.duration =
            Number.isFinite(
                receivedDuration
            )
                ? Math.max(
                    0,
                    Math.round(
                        receivedDuration
                    )
                )
                : measuredDuration;

        return normalizedResult;
    }

    /**
     * Menangani kegagalan bootstrap.
     *
     * @param {Error} error
     */
    function handleBootstrapError(error) {
        setApplicationStatus(
            "failed"
        );

        console.error(
            "Gomai bootstrap gagal:",
            error
        );

        dispatchApplicationEvent(
            "gomai:bootstrap-error",
            {
                error,
                timestamp:
                    Date.now()
            }
        );

        renderBootstrapError(
            error
        );
    }

    /**
     * Menampilkan panel error tanpa mengganti seluruh body.
     *
     * @param {Error} error
     */
    function renderBootstrapError(error) {
        const existingPanel =
            document.getElementById(
                "gomai-bootstrap-error"
            );

        if (existingPanel) {
            updateBootstrapErrorPanel(
                existingPanel,
                error
            );

            return;
        }

        const panel =
            document.createElement(
                "section"
            );

        panel.id =
            "gomai-bootstrap-error";

        panel.className =
            "gomai-bootstrap-error";

        panel.setAttribute(
            "role",
            "alert"
        );

        panel.setAttribute(
            "aria-live",
            "assertive"
        );

        panel.setAttribute(
            "aria-atomic",
            "true"
        );

        const container =
            document.createElement(
                "div"
            );

        container.className =
            "gomai-bootstrap-error__container";

        const title =
            document.createElement(
                "h1"
            );

        title.className =
            "gomai-bootstrap-error__title";

        title.textContent =
            translate(
                "errors.bootstrap.title",
                "Gomai tidak dapat dimulai"
            );

        const description =
            document.createElement(
                "p"
            );

        description.className =
            "gomai-bootstrap-error__description";

        description.textContent =
            translate(
                "errors.bootstrap.description",
                "Terjadi kesalahan saat memulai aplikasi. Periksa Console untuk informasi lengkap."
            );

        const message =
            document.createElement(
                "pre"
            );

        message.className =
            "gomai-bootstrap-error__message";

        message.textContent =
            error.message;

        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            "gomai-bootstrap-error__actions";

        const reloadButton =
            document.createElement(
                "button"
            );

        reloadButton.type =
            "button";

        reloadButton.className =
            "btn btn-primary";

        reloadButton.textContent =
            translate(
                "errors.bootstrap.reload",
                "Muat Ulang"
            );

        reloadButton.addEventListener(
            "click",
            () => {
                window.location.reload();
            }
        );

        actions.append(
            reloadButton
        );

        container.append(
            title,
            description,
            message,
            actions
        );

        panel.append(
            container
        );

        document.body.prepend(
            panel
        );
    }

    /**
     * Memperbarui panel error yang sudah tersedia.
     *
     * @param {HTMLElement} panel
     * @param {Error} error
     */
    function updateBootstrapErrorPanel(
        panel,
        error
    ) {
        const title =
            panel.querySelector(
                ".gomai-bootstrap-error__title"
            );

        const description =
            panel.querySelector(
                ".gomai-bootstrap-error__description"
            );

        const message =
            panel.querySelector(
                ".gomai-bootstrap-error__message"
            );

        const reloadButton =
            panel.querySelector(
                ".gomai-bootstrap-error__actions button"
            );

        if (title) {
            title.textContent =
                translate(
                    "errors.bootstrap.title",
                    "Gomai tidak dapat dimulai"
                );
        }

        if (description) {
            description.textContent =
                translate(
                    "errors.bootstrap.description",
                    "Terjadi kesalahan saat memulai aplikasi. Periksa Console untuk informasi lengkap."
                );
        }

        if (message) {
            message.textContent =
                error.message;
        }

        if (reloadButton) {
            reloadButton.textContent =
                translate(
                    "errors.bootstrap.reload",
                    "Muat Ulang"
                );
        }

        panel.hidden =
            false;
    }

    /**
     * Menghapus panel error setelah bootstrap berhasil.
     */
    function removeBootstrapErrorPanel() {
        document
            .getElementById(
                "gomai-bootstrap-error"
            )
            ?.remove();
    }

    /**
     * Mengatur status aplikasi pada elemen HTML.
     *
     * Status:
     * - idle
     * - booting
     * - ready
     * - failed
     *
     * @param {string} status
     */
    function setApplicationStatus(status) {
        applicationStatus =
            status;

        const root =
            document.documentElement;

        root.classList.remove(
            "gomai-is-booting",
            "gomai-is-ready",
            "gomai-bootstrap-failed"
        );

        if (status === "booting") {
            root.classList.add(
                "gomai-is-booting"
            );
        }

        if (status === "ready") {
            root.classList.add(
                "gomai-is-ready"
            );
        }

        if (status === "failed") {
            root.classList.add(
                "gomai-bootstrap-failed"
            );
        }

        root.dataset.gomaiStatus =
            status;
    }

    /**
     * Mengirim event lifecycle aplikasi.
     *
     * @param {string} eventName
     * @param {Record<string, unknown>} detail
     */
    function dispatchApplicationEvent(
        eventName,
        detail = {}
    ) {
        document.dispatchEvent(
            new CustomEvent(
                eventName,
                {
                    detail
                }
            )
        );
    }

    /**
     * Menormalisasi nilai error.
     *
     * @param {unknown} error
     * @returns {Error}
     */
    function normalizeError(error) {
        if (error instanceof Error) {
            return error;
        }

        if (
            isPlainObject(error) &&
            typeof error.message ===
                "string"
        ) {
            return new Error(
                error.message
            );
        }

        return new Error(
            String(
                error ??
                "Unknown bootstrap error"
            )
        );
    }

    /**
     * Mengambil terjemahan dengan fallback.
     *
     * Helper ini tidak boleh membuat error baru ketika
     * sistem bahasa belum siap atau sedang bermasalah.
     *
     * @param {string} key
     * @param {string} fallback
     * @returns {string}
     */
    function translate(
        key,
        fallback
    ) {
        try {
            if (
                window.Language &&
                typeof window
                    .Language
                    .translate ===
                    "function"
            ) {
                return window.Language
                    .translate(
                        key,
                        fallback
                    );
            }
        } catch (error) {
            console.warn(
                "Terjemahan panel bootstrap gagal:",
                error
            );
        }

        return fallback;
    }

    /**
     * Memeriksa plain object.
     *
     * @param {unknown} value
     * @returns {boolean}
     */
    function isPlainObject(value) {
        if (
            window.GomaiUtils &&
            typeof window
                .GomaiUtils
                .isObject ===
                "function"
        ) {
            return window
                .GomaiUtils
                .isObject(
                    value
                );
        }

        return (
            value !== null &&
            typeof value ===
                "object" &&
            !Array.isArray(value)
        );
    }

    /**
     * Mengambil waktu resolusi tinggi ketika tersedia.
     *
     * @returns {number}
     */
    function getHighResolutionTime() {
        if (
            window.performance &&
            typeof window
                .performance
                .now ===
                "function"
        ) {
            return window
                .performance
                .now();
        }

        return Date.now();
    }

    /**
     * Mengambil status aplikasi saat ini.
     *
     * @returns {string}
     */
    function getStatus() {
        return applicationStatus;
    }

    return Object.freeze({
        start,
        getStatus
    });
})();

window.GomaiApplication =
    GomaiApplication;

/**
 * app.js biasanya dimuat sebagai script terakhir.
 * Pemeriksaan readyState membuat bootstrap tetap aman
 * jika file ini nanti dimuat memakai defer atau secara dinamis.
 */
if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            void GomaiApplication
                .start();
        },
        {
            once: true
        }
    );
} else {
    queueMicrotask(
        () => {
            void GomaiApplication
                .start();
        }
    );
}