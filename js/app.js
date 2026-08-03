"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    try {

        /*
        ==========================================
        LANGUAGE
        ==========================================
        */

        if (
            window.Language &&
            typeof Language.init === "function"
        ) {
            await Language.init();
        }

        /*
        ==========================================
        PRODUCT STORE
        ==========================================
        */

        if (
            window.ProductStore &&
            typeof ProductStore.init === "function"
        ) {
            await ProductStore.init();
        }

        /*
        ==========================================
        HOME PAGE
        ==========================================
        */

        if (
            window.HomePage &&
            typeof HomePage.init === "function"
        ) {
            await HomePage.init();
        }

    } catch (error) {

        console.error(
            "Gomai initialization failed:",
            error
        );

    }

});