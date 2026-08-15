"use strict";

/** Perhitungan biaya V7.3 yang sadar tipe layanan. */
const GomaiAssistedShopping = (() => {
    const VERSION="7.0.0-rc.1",EXPRESS="express",OFFICIAL="official-order";
    const serviceOf=entry=>String(entry?.item?.serviceType||entry?.product?.serviceType||OFFICIAL).toLowerCase()===EXPRESS?EXPRESS:OFFICIAL;
    const settings=()=>window.GomaiConfig?.assistedShopping||{minimumSubtotal:50000,gomaiDelivery:5000,tiers:[],specialConfirmationFrom:2000000};
    function summarize(entries=[],options={}){
        const all=Array.isArray(entries)?entries:[],serviceType=String(options.serviceType||serviceOf(all[0])).toLowerCase()===EXPRESS?EXPRESS:OFFICIAL;
        const items=all.filter(entry=>serviceOf(entry)===serviceType);
        const subtotal=items.reduce((sum,e)=>sum+Number(e?.product?.price||0)*Number(e?.item?.quantity||0),0);
        const sourceMap=new Map(),missingSources=[];
        if(serviceType===OFFICIAL)items.forEach(entry=>{const product=entry?.product||{},source=product.source;if(!source?.id){missingSources.push(product.id||"unknown");return;}if(!sourceMap.has(source.id))sourceMap.set(source.id,{id:source.id,name:source.name,url:source.url,originCity:source.originCity||"",shipping:normalizeShipping(source.shipping)});});
        const sources=Array.from(sourceMap.values());
        const notApplicable=serviceType===EXPRESS;
        const hasPendingShipping=!notApplicable&&sources.some(s=>s.shipping.status==="pending");
        const hasEstimatedShipping=!notApplicable&&sources.some(s=>s.shipping.status==="estimated");
        const allShippingConfirmed=notApplicable||sources.length>0&&sources.every(s=>s.shipping.status==="confirmed");
        const shippingRangeAvailable=notApplicable||sources.length>0&&!hasPendingShipping;
        const officialShippingStatus=notApplicable?"not-applicable":hasPendingShipping?"pending":hasEstimatedShipping?"estimated":allShippingConfirmed?"confirmed":"pending";
        const officialShippingMinimum=notApplicable?0:shippingRangeAvailable?sources.reduce((sum,s)=>sum+shippingMinimum(s.shipping),0):null;
        const officialShippingMaximum=notApplicable?0:shippingRangeAvailable?sources.reduce((sum,s)=>sum+shippingMaximum(s.shipping),0):null;
        const officialShipping=allShippingConfirmed?officialShippingMinimum:null;
        const cfg=settings(),special=subtotal>=Number(cfg.specialConfirmationFrom||Infinity),tier=special?null:(cfg.tiers||[]).find(x=>subtotal>=Number(x.min)&&subtotal<=Number(x.max))||null;
        const minimumMet=subtotal>=Number(cfg.minimumSubtotal||0),serviceFee=tier?Number(tier.serviceFee||0):0,gomaiDelivery=minimumMet&&!special?Number(cfg.gomaiDelivery||0):0,gomaiCombinedFee=tier?serviceFee+gomaiDelivery:null;
        const estimatedTotal=minimumMet&&!special&&tier&&allShippingConfirmed?subtotal+officialShipping+gomaiCombinedFee:null;
        const estimatedTotalMinimum=minimumMet&&!special&&tier&&shippingRangeAvailable?subtotal+officialShippingMinimum+gomaiCombinedFee:null;
        const estimatedTotalMaximum=minimumMet&&!special&&tier&&shippingRangeAvailable?subtotal+officialShippingMaximum+gomaiCombinedFee:null;
        return Object.freeze({serviceType,hasMixedServices:new Set(all.map(serviceOf)).size>1,subtotal,sources:Object.freeze(sources),officialShipping,officialShippingStatus,officialShippingMinimum,officialShippingMaximum,allShippingConfirmed,shippingRangeAvailable,missingSources:Object.freeze(missingSources),minimumMet,minimumSubtotal:Number(cfg.minimumSubtotal||0),special,tier,serviceFee,gomaiDelivery,gomaiCombinedFee,estimatedTotal,estimatedTotalMinimum,estimatedTotalMaximum});
    }
    function normalizeShipping(value){const s=value&&typeof value==="object"?value:{},status=["pending","estimated","confirmed"].includes(s.status)?s.status:"pending",numberOrNull=input=>{if(input===null||input===undefined||input==="")return null;const n=Number(input);return Number.isFinite(n)?Math.max(0,n):null;};return Object.freeze({status,amount:status==="confirmed"?numberOrNull(s.amount):null,minimum:status==="estimated"?numberOrNull(s.minimum):null,maximum:status==="estimated"?numberOrNull(s.maximum):null,checkedAt:s.checkedAt||null});}
    const shippingMinimum=s=>s.status==="confirmed"?Number(s.amount||0):Number(s.minimum||0);
    const shippingMaximum=s=>s.status==="confirmed"?Number(s.amount||0):Number(s.maximum??s.minimum??0);
    return Object.freeze({version:VERSION,summarize});
})();
window.GomaiAssistedShopping=GomaiAssistedShopping;
