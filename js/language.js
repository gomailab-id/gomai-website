"use strict";

const Language = (() => {

    const STORAGE_KEY = "gomai-language";

    let currentLanguage = "zh";
    let dictionary = {};

    async function init() {

        currentLanguage =
            GomaiUtils.readLocalData(STORAGE_KEY, "zh");

        await load(currentLanguage);

        bindButtons();
    }

    async function load(lang) {

        try {

            dictionary = await GomaiUtils.fetchJSON(
                `${GomaiUtils.getBasePath()}data/${lang}.json`
            );

            currentLanguage = lang;

            GomaiUtils.saveLocalData(
                STORAGE_KEY,
                currentLanguage
            );

            apply();

        } catch (error) {

            console.error(error);

        }

    }

    function apply() {

        document.documentElement.lang = currentLanguage;

        document
            .querySelectorAll("[data-lang]")
            .forEach(element => {

                const key = element.dataset.lang;

                if (dictionary[key]) {

                    element.textContent = dictionary[key];

                }

            });

        updateButtons();

    }

    function bindButtons() {

        document
            .querySelectorAll("[data-language]")
            .forEach(button => {

                button.addEventListener("click", () => {

                    load(button.dataset.language);

                });

            });

    }

    function updateButtons() {

        document
            .querySelectorAll("[data-language]")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.language === currentLanguage
                );

            });

    }

    function getLanguage() {

        return currentLanguage;

    }

    return {

        init,
        getLanguage

    };

})();

window.Language = Language;