"use strict";

/**
 * Mengambil satu elemen dari halaman.
 * @param {string} selector
 * @param {ParentNode} parent
 * @returns {Element|null}
 */
function getElement(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * Mengambil semua elemen yang cocok sebagai array.
 * @param {string} selector
 * @param {ParentNode} parent
 * @returns {Element[]}
 */
function getElements(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
}

/**
 * Mengambil dan membaca file JSON.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Gagal memuat data: ${response.status} ${response.statusText}`
        );
    }

    return response.json();
}

/**
 * Menentukan awalan path berdasarkan lokasi halaman.
 * Halaman di folder /pages memerlukan ../
 * @returns {string}
 */
function getBasePath() {
    return window.location.pathname.includes("/pages/") ? "../" : "";
}

/**
 * Memformat harga dalam rupiah.
 * @param {number} value
 * @returns {string}
 */
function formatRupiah(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "Rp0";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Mengamankan teks sebelum dimasukkan ke HTML.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Mengambil parameter dari URL.
 * Contoh: product-detail.html?id=atalon-critical-running-tshirt
 * @param {string} name
 * @returns {string|null}
 */
function getQueryParameter(name) {
    return new URLSearchParams(window.location.search).get(name);
}

/**
 * Menunda eksekusi fungsi sampai pengguna berhenti mengetik.
 * @param {Function} callback
 * @param {number} delay
 * @returns {Function}
 */
function debounce(callback, delay = 300) {
    let timer;

    return (...args) => {
        window.clearTimeout(timer);

        timer = window.setTimeout(() => {
            callback(...args);
        }, delay);
    };
}

/**
 * Menyimpan data sederhana ke localStorage.
 * @param {string} key
 * @param {unknown} value
 */
function saveLocalData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn("Data lokal tidak berhasil disimpan:", error);
    }
}

/**
 * Membaca data sederhana dari localStorage.
 * @param {string} key
 * @param {unknown} fallback
 * @returns {unknown}
 */
function readLocalData(key, fallback = null) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch (error) {
        console.warn("Data lokal tidak berhasil dibaca:", error);
        return fallback;
    }
}

window.GomaiUtils = {
    getElement,
    getElements,
    fetchJSON,
    getBasePath,
    formatRupiah,
    escapeHTML,
    getQueryParameter,
    debounce,
    saveLocalData,
    readLocalData
};