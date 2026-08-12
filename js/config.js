"use strict";

/* ==========================================================
   GOMAI CONFIGURATION
   config.js

   Tanggung jawab:
   - Konfigurasi global aplikasi
   - Bahasa
   - Mata uang
   - Path data
   - Route halaman
   - Query parameter
   - Kontak
   - Selector global
   - Pengaturan UI dasar

   Prinsip:
   - Mandarin-first
   - Mobile-first
   - Tidak menyimpan state aplikasi
   - Tidak melakukan akses DOM
   - Tidak melakukan fetch
   - Tidak bergantung pada file lain
========================================================== */

(() => {

    /* ======================================================
       VERSION
    ====================================================== */

    const VERSION =
        "2.0.0";


    /* ======================================================
       SITE
    ====================================================== */

    const SITE = {

        name:
            "Gomai",

        version:
            VERSION,

        description: {

            zh:
                "轻松购物，我们为您送达。",

            id:
                "Belanja mudah, kami antar."

        },

        logo: {

            master:
                "assets/gomai/logo-master.png",

            header:
                "assets/gomai/logo-header.png"

        },

        locale: {

            zh:
                "zh-CN",

            id:
                "id-ID"

        }

    };


    /* ======================================================
       LANGUAGE

       Mandarin menjadi bahasa utama Gomai.

       Urutan supported juga menempatkan zh terlebih dahulu
       agar seluruh modul yang membaca array ini mengikuti
       prioritas bahasa yang sama.
    ====================================================== */

    const LANGUAGE = {

        default:
            "zh",

        fallback:
            "zh",

        supported: [
            "zh",
            "id"
        ],

        files: {

            zh:
                "data/zh.json",

            id:
                "data/id.json"

        }

    };


    /* ======================================================
       STORAGE

       Semua key localStorage memiliki prefix "gomai-"
       agar tidak bertabrakan dengan data situs lain.
    ====================================================== */

    const STORAGE = {

        language:
            "gomai-language",

        cart:
            "gomai-cart-v1",

        wishlist:
            "gomai-wishlist-v1",

        checkoutDraft:
            "gomai-checkout-draft-v1",

        checkoutOrder:
            "gomai-checkout-order-v1"

    };


    /* ======================================================
       CURRENCY

       Pembayaran dan harga katalog menggunakan Rupiah.

       Locale harga tetap id-ID karena mata uang yang
       ditampilkan adalah IDR, meskipun interface utama
       menggunakan bahasa Mandarin.
    ====================================================== */

    const CURRENCY = {

        code:
            "IDR",

        locale:
            "id-ID",

        symbol:
            "Rp",

        minimumFractionDigits:
            0,

        maximumFractionDigits:
            0

    };


    /* ======================================================
       CONTACT
    ====================================================== */

    const CONTACT = {

        wechatId:
            "Gomai",

        wechatQr:
            "assets/gomai/wechat-qr.png",

        wechatAnchor:
            "wechat"

    };


    /* ======================================================
       ROUTES

       Semua route ditulis dari root project.

       GomaiUtils bertanggung jawab menyesuaikannya ketika
       halaman aktif berada di dalam folder /pages/.
    ====================================================== */

    const ROUTES = {

        home:
            "index.html",

        brand:
            "pages/brand.html",

        products:
            "pages/products.html",

        search:
            "pages/search.html",

        productDetail:
            "pages/product-detail.html",

        cart:
            "pages/cart.html",

        wishlist:
            "pages/wishlist.html",

        checkout:
            "pages/checkout.html",

        about:
            "pages/about.html",

        contact:
            "pages/contact.html",

        faq:
            "pages/faq.html",

        howToBuy:
            "pages/how-to-buy.html",

        notFound:
            "404.html"

    };


    /* ======================================================
       DATA PATHS

       Key berikut dipertahankan sebagai key langsung karena
       GomaiUtils.getDataPath() digunakan oleh model dan
       Language Manager.

       languageZh dan languageId diperlukan oleh
       language.js.
    ====================================================== */

    const DATA = {

        brands:
            "data/brands.json",

        categories:
            "data/categories.json",

        products:
            "data/products.json",

        languageZh:
            "data/zh.json",

        languageId:
            "data/id.json",

        languages: {

            zh:
                "data/zh.json",

            id:
                "data/id.json"

        }

    };


    /* ======================================================
       PROJECT PATHS

       Digunakan sebagai referensi root direktori oleh
       utility dan modul yang membutuhkan path umum.
    ====================================================== */

    const PATHS = {

        assets:
            "assets/",

        brands:
            "assets/brands/",

        products:
            "assets/products/",

        data:
            "data/",

        pages:
            "pages/"

    };


    /* ======================================================
       QUERY PARAMETERS

       brandId dan productId sama-sama menggunakan "id"
       karena halaman brand dan detail produk memiliki URL
       masing-masing.
    ====================================================== */

    const QUERY = {

        brandId:
            "id",

        productId:
            "id",

        search:
            "q",

        brand:
            "brand",

        category:
            "category",

        stock:
            "stock",

        sort:
            "sort"

    };


    /* ======================================================
       GLOBAL SELECTORS
    ====================================================== */

    const SELECTORS = {

        header:
            "#site-header",

        main:
            "#main-content",

        footer:
            "#site-footer",

        wechatAnchor:
            "#wechat"

    };


    /* ======================================================
       SEARCH
    ====================================================== */

    const SEARCH = {

        minimumQueryLength:
            1,

        suggestionLimit:
            8,

        productSuggestionLimit:
            6,

        brandSuggestionLimit:
            4

    };


    /* ======================================================
       CATALOG
    ====================================================== */

    const CATALOG = {

        relatedProductLimit:
            4,

        featuredProductLimit:
            8

    };


    /* ======================================================
       UI

       Nilai berikut adalah konfigurasi perilaku.
       Styling tetap dimiliki CSS.
    ====================================================== */

    const UI = {

        heroInterval:
            7000,

        minimumSwipeDistance:
            48,

        searchDebounce:
            180

    };


    /* ======================================================
       CONFIG OBJECT
    ====================================================== */

    const GomaiConfig = {

        site:
            SITE,

        language:
            LANGUAGE,

        storage:
            STORAGE,

        currency:
            CURRENCY,

        contact:
            CONTACT,

        routes:
            ROUTES,

        data:
            DATA,

        paths:
            PATHS,

        query:
            QUERY,

        selectors:
            SELECTORS,

        search:
            SEARCH,

        catalog:
            CATALOG,

        ui:
            UI

    };


    /* ======================================================
       DEEP FREEZE

       Config hanya boleh dibaca.

       State seperti:
       - bahasa aktif
       - filter
       - produk aktif
       - status komponen

       tidak disimpan di sini.
    ====================================================== */

    function deepFreeze(value) {

        if (
            !value ||
            typeof value !== "object" ||
            Object.isFrozen(value)
        ) {
            return value;
        }

        Reflect
            .ownKeys(value)
            .forEach(key => {

                const child =
                    value[key];

                if (
                    child &&
                    typeof child === "object"
                ) {
                    deepFreeze(child);
                }

            });

        return Object.freeze(value);

    }


    /* ======================================================
       PUBLIC CONFIG
    ====================================================== */

    window.GomaiConfig =
        deepFreeze(GomaiConfig);

})();