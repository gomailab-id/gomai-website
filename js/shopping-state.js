"use strict";

/* Keranjang V7.3 dipisahkan berdasarkan model layanan. */
const GomaiShoppingState = (() => {
    const VERSION = "7.0.0-rc.1";
    const EXPRESS = "express";
    const OFFICIAL = "official-order";
    const SERVICES = Object.freeze([EXPRESS, OFFICIAL]);
    const EVENTS = Object.freeze({ CART_CHANGED:"gomai:cart-changed", WISHLIST_CHANGED:"gomai:wishlist-changed", CHECKOUT_DRAFT_CHANGED:"gomai:checkout-draft-changed" });
    const fallbackKeys = Object.freeze({ cart:"gomai-cart-v2", wishlist:"gomai-wishlist-v1", checkoutDraft:"gomai-checkout-draft-v1", checkoutOrder:"gomai-checkout-order-v1" });
    const getKey = name => window.GomaiConfig?.storage?.[name] || fallbackKeys[name];
    const text = value => String(value ?? "").trim();
    const clone = value => JSON.parse(JSON.stringify(value));
    const positiveInteger = (value, fallback=1) => { const parsed=Math.floor(Number(value)); return Number.isFinite(parsed)&&parsed>0?parsed:fallback; };
    function normalizeServiceType(value) { return text(value).toLowerCase()===EXPRESS?EXPRESS:OFFICIAL; }
    function readJSON(key,fallback){try{const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):clone(fallback);}catch(error){console.warn("GomaiShoppingState: gagal membaca storage.",error);return clone(fallback);}}
    function writeJSON(key,value){try{window.localStorage.setItem(key,JSON.stringify(value));return true;}catch(error){console.warn("GomaiShoppingState: gagal menyimpan storage.",error);return false;}}
    function normalizeCartItem(input={}){const productId=text(input.productId||input.id);if(!productId)throw new Error("Cart item membutuhkan productId.");return{serviceType:normalizeServiceType(input.serviceType),productId,colorId:text(input.colorId),sizeId:text(input.sizeId||input.size),quantity:positiveInteger(input.quantity,1)};}
    function itemKey(item){const n=normalizeCartItem(item);return[n.serviceType,n.productId,n.colorId||"-",n.sizeId||"-"].join("::");}
    function emptyCartState(){return{version:2,services:{[EXPRESS]:[],[OFFICIAL]:[]}};}
    function readCartState(){let raw=readJSON(getKey("cart"),null);if(!raw)raw=readJSON("gomai-cart-v1",emptyCartState());const state=emptyCartState();if(Array.isArray(raw)){raw.forEach(item=>{try{state.services[OFFICIAL].push(normalizeCartItem({...item,serviceType:OFFICIAL}));}catch(_){}});return state;}SERVICES.forEach(service=>{const source=raw?.services?.[service]||raw?.[service]||[];if(Array.isArray(source))source.forEach(item=>{try{state.services[service].push(normalizeCartItem({...item,serviceType:service}));}catch(_){}});});return state;}
    const flatten = state => SERVICES.flatMap(service=>state.services[service]);
    function getCart(serviceType){const state=readCartState();return clone(serviceType?state.services[normalizeServiceType(serviceType)]:flatten(state));}
    function getCartGroups(){const state=readCartState();return Object.freeze({[EXPRESS]:Object.freeze(clone(state.services[EXPRESS])),[OFFICIAL]:Object.freeze(clone(state.services[OFFICIAL]))});}
    function saveCart(items,reason="update"){const state=emptyCartState();(Array.isArray(items)?items:[]).forEach(item=>{try{const clean=normalizeCartItem(item);state.services[clean.serviceType].push(clean);}catch(_){}});writeJSON(getKey("cart"),state);const all=flatten(state);dispatch(EVENTS.CART_CHANGED,{reason,items:clone(all),groups:clone(state.services),count:all.reduce((sum,item)=>sum+item.quantity,0)});return clone(all);}
    function addToCart(input={}){const incoming=normalizeCartItem(input),items=getCart(),existing=items.find(item=>itemKey(item)===itemKey(incoming));if(existing)existing.quantity+=incoming.quantity;else items.push(incoming);return saveCart(items,"add");}
    function setQuantity(keyOrInput,quantity){const key=typeof keyOrInput==="string"?keyOrInput:itemKey(keyOrInput),items=getCart(),item=items.find(entry=>itemKey(entry)===key);if(item)item.quantity=positiveInteger(quantity,1);return saveCart(items,"quantity");}
    function removeFromCart(keyOrInput){const key=typeof keyOrInput==="string"?keyOrInput:itemKey(keyOrInput);return saveCart(getCart().filter(item=>itemKey(item)!==key),"remove");}
    function clearCart(serviceType){if(!serviceType)return saveCart([],"clear");const service=normalizeServiceType(serviceType);return saveCart(getCart().filter(item=>item.serviceType!==service),"clear-service");}
    const getCartCount = serviceType => getCart(serviceType).reduce((sum,item)=>sum+item.quantity,0);
    function getWishlist(){const raw=readJSON(getKey("wishlist"),[]);return Array.isArray(raw)?[...new Set(raw.map(text).filter(Boolean))]:[];}
    function saveWishlist(ids,reason="update"){const clean=[...new Set((Array.isArray(ids)?ids:[]).map(text).filter(Boolean))];writeJSON(getKey("wishlist"),clean);dispatch(EVENTS.WISHLIST_CHANGED,{reason,productIds:clone(clean),count:clean.length});return clone(clean);}
    const isWishlisted=productId=>getWishlist().includes(text(productId));
    function addToWishlist(productId){const id=text(productId),ids=getWishlist();if(id&&!ids.includes(id))ids.push(id);return saveWishlist(ids,"add");}
    function removeFromWishlist(productId){const id=text(productId);return saveWishlist(getWishlist().filter(entry=>entry!==id),"remove");}
    function toggleWishlist(productId){const id=text(productId);if(!id)return false;if(isWishlisted(id)){removeFromWishlist(id);return false;}addToWishlist(id);return true;}
    const clearWishlist=()=>saveWishlist([],"clear");
    const getWishlistCount=()=>getWishlist().length;
    function getCheckoutDraft(){const raw=readJSON(getKey("checkoutDraft"),{});return raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};}
    function saveCheckoutDraft(draft={}){const clean=draft&&typeof draft==="object"&&!Array.isArray(draft)?{...draft}:{};writeJSON(getKey("checkoutDraft"),clean);dispatch(EVENTS.CHECKOUT_DRAFT_CHANGED,{draft:clone(clean)});return clone(clean);}
    const orderStorageKey=serviceType=>`${getKey("checkoutOrder")}:${normalizeServiceType(serviceType)}`;
    function getOrCreateCheckoutOrderId(serviceType=OFFICIAL){const key=orderStorageKey(serviceType);let existing="";try{existing=text(window.sessionStorage.getItem(key));}catch(_){}if(/^GM-\d{4}$/.test(existing))return existing;let random=Math.floor(Math.random()*10000);if(window.crypto?.getRandomValues){const b=new Uint32Array(1);window.crypto.getRandomValues(b);random=b[0]%10000;}const id=`GM-${String(random).padStart(4,"0")}`;try{window.sessionStorage.setItem(key,id);}catch(_){}return id;}
    function resetCheckoutOrderId(serviceType=OFFICIAL){try{window.sessionStorage.removeItem(orderStorageKey(serviceType));}catch(_){}}
    function getDefaultSelection(product={}){const colors=Array.isArray(product.colors)?product.colors.filter(Boolean):[],color=colors.find(entry=>entry?.inStock!==false)||colors[0]||null,colorSizes=Array.isArray(color?.sizes)?color.sizes.filter(Boolean):[],productSizes=Array.isArray(product.sizes)?product.sizes.filter(Boolean):[],sizes=colorSizes.length?colorSizes:productSizes,size=sizes.find(entry=>typeof entry==="string"||entry?.inStock!==false)||sizes[0]||null;return{serviceType:normalizeServiceType(product.serviceType),productId:text(product.id||product.slug),colorId:text(color?.id),sizeId:typeof size==="string"?size:text(size?.id||size?.name||size?.size),quantity:1};}
    function canQuickAdd(product={}){const colors=Array.isArray(product.colors)?product.colors.filter(Boolean):[];if(colors.length>1)return false;const cs=Array.isArray(colors[0]?.sizes)?colors[0].sizes.filter(Boolean):[],ps=Array.isArray(product.sizes)?product.sizes.filter(Boolean):[];return(cs.length||ps.length)<=1;}
    function dispatch(name,detail={}){document.dispatchEvent(new CustomEvent(name,{detail:{version:VERSION,timestamp:Date.now(),...detail}}));}
    window.addEventListener("storage",event=>{if(event.key===getKey("cart"))dispatch(EVENTS.CART_CHANGED,{reason:"storage",items:getCart(),groups:getCartGroups(),count:getCartCount()});if(event.key===getKey("wishlist"))dispatch(EVENTS.WISHLIST_CHANGED,{reason:"storage",productIds:getWishlist(),count:getWishlistCount()});});
    return Object.freeze({version:VERSION,services:Object.freeze({EXPRESS,OFFICIAL}),events:EVENTS,normalizeServiceType,itemKey,getCart,getCartGroups,addToCart,setQuantity,removeFromCart,clearCart,getCartCount,getWishlist,isWishlisted,addToWishlist,removeFromWishlist,toggleWishlist,clearWishlist,getWishlistCount,getCheckoutDraft,saveCheckoutDraft,getOrCreateCheckoutOrderId,resetCheckoutOrderId,getDefaultSelection,canQuickAdd});
})();
window.GomaiShoppingState=GomaiShoppingState;
