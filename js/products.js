"use strict";

const ProductStore = (() => {

    let products = [];

    /**
     * Memuat products.json
     */
    async function init() {

        try {

            const data = await GomaiUtils.fetchJSON(
                `${GomaiUtils.getBasePath()}data/products.json`
            );

            products = data.products || [];

            console.log(
                `✅ ${products.length} produk berhasil dimuat`
            );

        } catch (error) {

            console.error(
                "Gagal memuat products.json",
                error
            );

        }

    }

    /**
     * Mengambil semua produk
     */
    function getProducts() {

        return products;

    }

    /**
     * Mengambil satu produk berdasarkan id
     */
    function getProduct(id) {

        return products.find(product => product.id === id);

    }

    /**
     * Mengambil semua brand
     */
    function getBrands() {

        return [...new Set(

            products.map(product => product.brand)

        )];

    }

    return {

        init,
        getProducts,
        getProduct,
        getBrands

    };

})();

window.ProductStore = ProductStore;