"use strict";
const WishlistController = (() => {
    const VERSION = "1.0.0";
    let products = new Map(); let brands = new Map(); let bound = false;
    const t=(k,f)=>window.Language?.translate?.(k,f)||f;
    const money=v=>window.GomaiUtils?.formatCurrency?.(Number(v)||0)||`Rp${Number(v||0).toLocaleString("id-ID")}`;
    const route=(n,q={})=>window.GomaiUtils?.buildRoute?.(n,q)||`${n}.html`;
    const lang=()=>window.Language?.getCurrentLanguage?.()||"zh";
    const local=v=>v&&typeof v==="object"?(v[lang()]||v.id||v.zh||""):String(v||"");
    async function init(){await Promise.all([window.ProductsModel.load(),window.BrandsModel.load()]);products=new Map((await window.ProductsModel.getAll()).map(p=>[p.id,p]));brands=new Map((await window.BrandsModel.getAll()).map(b=>[b.id,b]));bind();render();return{version:VERSION};}
    function bind(){if(bound)return;bound=true;document.addEventListener("click",handleClick);document.addEventListener("gomai:wishlist-changed",render);document.addEventListener("gomai:cart-changed",render);}
    function destroy(){if(bound)document.removeEventListener("click",handleClick);bound=false;}
    function refreshLanguage(){render();}
    function imageOf(p){const c=(Array.isArray(p.colors)?p.colors:[])[0];return (Array.isArray(c?.images)?c.images:[])[0]||(Array.isArray(p.images)?p.images:[])[0]||"";}
    function render(){const ids=window.GomaiShoppingState.getWishlist();const list=ids.map(id=>products.get(id)).filter(Boolean);const count=document.getElementById("wishlist-count");if(count)count.textContent=String(list.length);const grid=document.getElementById("wishlist-grid"),empty=document.getElementById("wishlist-empty"),clear=document.getElementById("wishlist-clear");if(!grid||!empty)return;if(clear)clear.hidden=!list.length;if(!list.length){grid.innerHTML="";empty.hidden=false;empty.innerHTML=`<h2>${esc(t("wishlist.emptyTitle","Wishlist Anda masih kosong"))}</h2><p>${esc(t("wishlist.emptyDescription","Simpan produk yang menarik."))}</p><a class="btn btn-primary" href="${esc(route("products"))}">${esc(t("cart.continueShopping","Lanjut Belanja"))}</a>`;return;}empty.hidden=true;grid.innerHTML=list.map(card).join("");}
    function card(p){const img=imageOf(p),brand=brands.get(p.brandId),quick=window.GomaiShoppingState.canQuickAdd(p),dest=route("productDetail",{id:p.id});return `<article class="wishlist-card" data-wishlist-product="${esc(p.id)}"><a class="wishlist-image" href="${esc(dest)}">${img?`<img src="${esc(window.GomaiUtils.resolveAssetPath(img))}" alt="${esc(local(p.name))}">`:""}</a><div class="wishlist-body"><p class="wishlist-brand">${esc(brand?.name||p.brandId||"")}</p><h2 class="wishlist-name">${esc(local(p.name))}</h2><p class="wishlist-price">${esc(money(p.price))}</p><p class="wishlist-stock">● ${esc(t("common.available","Tersedia"))}</p><div class="wishlist-actions"><button class="btn btn-primary" type="button" data-wishlist-action="${quick?"cart":"detail"}">${esc(t(quick?"wishlist.moveToCart":"cart.chooseVariant",quick?"Ke Keranjang":"Pilih Varian"))}</button><button class="wishlist-remove" type="button" data-wishlist-action="remove" aria-label="${esc(t("wishlist.remove","Hapus dari Wishlist"))}">✕</button></div></div></article>`;}
    function handleClick(e){if(e.target.closest?.("#wishlist-clear")){window.GomaiShoppingState.clearWishlist();return;}const b=e.target.closest?.("[data-wishlist-action]");if(!b)return;const card=b.closest("[data-wishlist-product]");if(!card)return;const id=card.dataset.wishlistProduct,p=products.get(id);if(!p)return;const a=b.dataset.wishlistAction;if(a==="remove")window.GomaiShoppingState.removeFromWishlist(id);if(a==="detail")window.location.href=route("productDetail",{id});if(a==="cart"){window.GomaiShoppingState.addToCart(window.GomaiShoppingState.getDefaultSelection(p));window.GomaiShoppingState.removeFromWishlist(id);}}
    function esc(v){const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML;}
    return Object.freeze({version:VERSION,init,destroy,refreshLanguage});
})();
window.WishlistController=WishlistController;
