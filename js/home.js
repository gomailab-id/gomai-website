"use strict";

const HomePage = (() => {
    let brands = [];

    /**
     * Menjalankan sistem homepage.
     */
    async function init() {
        const brandGrid = document.getElementById("brand-grid");

        if (!brandGrid) {
            return;
        }

        showLoadingState(brandGrid);

        try {
            const data = await GomaiUtils.fetchJSON(
                `${GomaiUtils.getBasePath()}data/brands.json`
            );

            brands = Array.isArray(data.brands)
                ? data.brands
                : [];

            renderBrands();
        } catch (error) {
            console.error("Gagal memuat data brand:", error);
            showErrorState(brandGrid);
        }
    }

    /**
     * Menampilkan seluruh kartu brand.
     */
    function renderBrands() {
        const brandGrid = document.getElementById("brand-grid");

        if (!brandGrid) {
            return;
        }

        if (brands.length === 0) {
            showEmptyState(brandGrid);
            return;
        }

        const language = getCurrentLanguage();

        brandGrid.innerHTML = brands
            .map(brand => createBrandCard(brand, language))
            .join("");
    }

    /**
     * Membuat satu kartu brand.
     */
    function createBrandCard(brand, language) {
        const brandId = String(brand.id || "").trim();
        const brandName = String(
            brand.name || brandId || "Brand"
        );

        const description =
            brand.description?.[language] ||
            brand.description?.id ||
            "";

        const logo =
            brand.logo ||
            `assets/brands/${brandId}/logo.png`;

        const hero =
            brand.hero ||
            `assets/brands/${brandId}/hero.webp`;

        const url =
            brand.url ||
            `pages/brand.html?id=${encodeURIComponent(brandId)}`;

        const linkText =
            language === "zh"
                ? "查看品牌 →"
                : "Lihat Brand →";

        return `
            <a
                class="card brand-card"
                href="${escapeValue(url)}"
                aria-label="${escapeValue(
                    `${linkText.replace(" →", "")} ${brandName}`
                )}"
            >
                <div class="brand-card-image">
                    <img
                        src="${escapeValue(hero)}"
                        alt="${escapeValue(brandName)}"
                        loading="lazy"
                        decoding="async"
                        onerror="this.closest('.brand-card-image').classList.add('image-error'); this.remove();"
                    >
                </div>

                <div class="brand-card-content">
                    <div class="brand-card-logo-wrap">
                        <img
                            class="brand-card-logo"
                            src="${escapeValue(logo)}"
                            alt="Logo ${escapeValue(brandName)}"
                            loading="lazy"
                            decoding="async"
                            onerror="this.closest('.brand-card-logo-wrap').classList.add('logo-error'); this.remove();"
                        >
                    </div>

                    <div class="brand-card-copy">
                        <h3>
                            ${escapeValue(brandName)}
                        </h3>

                        <p>
                            ${escapeValue(description)}
                        </p>
                    </div>

                    <span class="brand-card-link">
                        ${linkText}
                    </span>
                </div>
            </a>
        `;
    }

    /**
     * Mengambil bahasa aktif.
     */
    function getCurrentLanguage() {
        if (
            window.Language &&
            typeof window.Language.getLanguage === "function"
        ) {
            return window.Language.getLanguage();
        }

        return "id";
    }

    /**
     * Mengamankan teks sebelum dimasukkan ke HTML.
     */
    function escapeValue(value) {
        if (
            window.GomaiUtils &&
            typeof window.GomaiUtils.escapeHTML === "function"
        ) {
            return window.GomaiUtils.escapeHTML(value);
        }

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /**
     * Status ketika data sedang dimuat.
     */
    function showLoadingState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Memuat brand...</p>
            </div>
        `;
    }

    /**
     * Status ketika data brand kosong.
     */
    function showEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Belum ada brand</h3>
                <p>Brand akan ditampilkan setelah datanya tersedia.</p>
            </div>
        `;
    }

    /**
     * Status ketika brands.json gagal dimuat.
     */
    function showErrorState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Data brand gagal dimuat</h3>
                <p>
                    Periksa file data/brands.json dan pastikan
                    website dijalankan melalui Live Server.
                </p>
            </div>
        `;
    }

    /**
     * Merender ulang kartu saat bahasa berubah.
     */
    function refreshLanguage() {
        if (brands.length > 0) {
            renderBrands();
        }
    }

    /**
     * Mengambil seluruh data brand.
     */
    function getBrands() {
        return [...brands];
    }

    return {
        init,
        refreshLanguage,
        getBrands
    };
})();

window.HomePage = HomePage;