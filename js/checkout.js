"use strict";
const CheckoutController = (() => {
    const VERSION="1.1.0";
    let products=new Map(),brands=new Map(),resolved=[],orderId="",bound=false;
    const t=(k,f)=>window.Language?.translate?.(k,f)||f;
    const money=v=>window.GomaiUtils?.formatCurrency?.(Number(v)||0)||`Rp${Number(v||0).toLocaleString("id-ID")}`;
    const route=(n,q={})=>window.GomaiUtils?.buildRoute?.(n,q)||`${n}.html`;
    const lang=()=>window.Language?.getCurrentLanguage?.()||"zh";
    const local=(v,l=lang())=>v&&typeof v==="object"?(v[l]||v.id||v.zh||""):String(v||"");
    async function init(){await Promise.all([window.ProductsModel.load(),window.BrandsModel.load()]);products=new Map((await window.ProductsModel.getAll()).map(p=>[p.id,p]));brands=new Map((await window.BrandsModel.getAll()).map(b=>[b.id,b]));orderId=window.GomaiShoppingState.getOrCreateCheckoutOrderId();restoreDraft();bind();render();return{version:VERSION};}
    function bind(){if(bound)return;bound=true;document.addEventListener("input",handleInput);document.addEventListener("click",handleClick);document.addEventListener("gomai:cart-changed",render);}
    function destroy(){if(bound){document.removeEventListener("input",handleInput);document.removeEventListener("click",handleClick);}bound=false;}
    function refreshLanguage(){render();}
    function itemData(item){const p=products.get(item.productId);if(!p)return null;const c=(Array.isArray(p.colors)?p.colors:[]).find(x=>String(x?.id||"")===String(item.colorId||""))||null;return{item,product:p,color:c};}
    function img(entry){return (Array.isArray(entry.color?.images)?entry.color.images:[])[0]||(Array.isArray(entry.product?.images)?entry.product.images:[])[0]||"";}
    function restoreDraft(){const d=window.GomaiShoppingState.getCheckoutDraft();for(const [id,key] of [["checkout-name","name"],["checkout-wechat","wechat"],["checkout-location","location"],["checkout-schedule","schedule"],["checkout-notes","notes"]]){const el=document.getElementById(id);if(el&&d[key])el.value=d[key];}}
    function draft(){return{name:document.getElementById("checkout-name")?.value.trim()||"",wechat:document.getElementById("checkout-wechat")?.value.trim()||"",location:document.getElementById("checkout-location")?.value.trim()||"",schedule:document.getElementById("checkout-schedule")?.value.trim()||"",notes:document.getElementById("checkout-notes")?.value.trim()||""};}
    function subtotal(){return resolved.reduce((sum,e)=>sum+Number(e.product.price||0)*e.item.quantity,0);}
    function render(){resolved=window.GomaiShoppingState.getCart().map(itemData).filter(Boolean);const empty=document.getElementById("checkout-empty"),content=document.getElementById("checkout-content");if(!empty||!content)return;if(!resolved.length){content.hidden=true;empty.hidden=false;empty.innerHTML=`<h2>${esc(t("checkout.emptyTitle","Belum ada barang untuk diringkas"))}</h2><p>${esc(t("checkout.emptyDescription","Tambahkan barang ke keranjang."))}</p><a class="btn btn-primary" href="${esc(route("cart"))}">${esc(t("checkout.backToCart","Kembali ke Keranjang"))}</a>`;return;}empty.hidden=true;content.hidden=false;renderOrder();renderPreview();}
    function renderOrder(){const list=document.getElementById("checkout-order-list"),total=document.getElementById("checkout-total");if(!list||!total)return;list.innerHTML=resolved.map(e=>{const src=img(e),variant=[e.color?local(e.color.name):"",e.item.sizeId].filter(Boolean).join(" · ");return `<div class="checkout-order-item">${src?`<img src="${esc(window.GomaiUtils.resolveAssetPath(src))}" alt="">`:`<span></span>`}<div><strong>${esc(local(e.product.name))}</strong><small>${esc(variant||`${e.item.quantity} × ${money(e.product.price)}`)}</small></div><div class="checkout-price">${esc(money(Number(e.product.price||0)*e.item.quantity))}</div></div>`;}).join("");total.innerHTML=`<span>${esc(t("cart.temporaryTotal","Total Sementara"))}</span><strong>${esc(money(subtotal()))}</strong>`;}
    function renderPreview(){const root=document.getElementById("checkout-preview");if(!root)return;const d=draft();root.innerHTML=`<div class="checkout-card-preview-header"><img src="${esc(window.GomaiUtils.resolveAssetPath(window.GomaiConfig.site.logo.header))}" alt="Gomai"></div><div class="checkout-card-preview-body"><h3>${esc(t("checkout.cardTitle","RINGKASAN PESANAN"))}</h3><span class="checkout-order-code">${esc(orderId)}</span><div class="checkout-preview-total"><span>${esc(t("checkout.temporarySubtotal","SUBTOTAL SEMENTARA"))}</span><strong>${esc(money(subtotal()))}</strong></div><div class="checkout-preview-note">${esc(t("checkout.confirmation","Harga dan ketersediaan barang akan dikonfirmasi oleh Gomai."))}</div>${d.name||d.location?`<p style="margin:14px 0 0;color:#666;font-size:.84rem">${esc([d.name,d.location].filter(Boolean).join(" · "))}</p>`:""}</div>`;}
    function handleInput(e){if(!e.target.closest?.("#checkout-form"))return;window.GomaiShoppingState.saveCheckoutDraft(draft());renderPreview();}
    async function handleClick(e){const id=e.target.closest?.("#download-order-id");const zh=e.target.closest?.("#download-order-zh");if(!id&&!zh)return;await downloadCard(zh?"zh":"id");}
    function setMessage(message){const el=document.getElementById("checkout-message");if(el)el.textContent=message||"";}
    async function downloadCard(cardLang){const d=draft();if(!d.name||!d.location){setMessage(t("checkout.validation","Lengkapi nama dan lokasi pengantaran terlebih dahulu."));return;}setMessage("");const canvas=await buildCanvas(cardLang,d);const link=document.createElement("a");link.download=`gomai-order-${orderId}-${cardLang}.png`;link.href=canvas.toDataURL("image/png",1);document.body.append(link);link.click();link.remove();setMessage(cardLang===lang()?t("checkout.downloaded","Kartu pesanan berhasil diunduh."):(cardLang==="zh"?"订单图片已成功下载。":"Kartu pesanan berhasil diunduh."));}

    async function buildCanvas(cardLang,d){
        const W=1080;
        const pad=54;
        const yellow="#f5b400";
        const black="#111111";
        const white="#ffffff";
        const muted="#6d6d68";
        const line="#e7e4db";
        const soft="#f7f5ef";

        const L=(id,zh)=>
            cardLang==="zh"
                ?zh
                :id;

        const measureCanvas=
            document.createElement(
                "canvas"
            );

        const measure=
            measureCanvas.getContext(
                "2d"
            );

        const itemLayouts=
            resolved.map(entry=>
                measureItemLayout(
                    measure,
                    entry,
                    cardLang,
                    W,
                    pad
                )
            );

        const infoRows=[
            [
                L("Nama","姓名"),
                d.name
            ],
            [
                "WeChat",
                d.wechat||"-"
            ],
            [
                L("Lokasi","地址"),
                d.location
            ],
            [
                L("Waktu","时间"),
                d.schedule||"-"
            ],
            [
                L("Catatan","备注"),
                d.notes||"-"
            ]
        ];

        const infoLayout=
            measureInfoLayout(
                measure,
                infoRows,
                W,
                pad
            );

        const headerH=162;
        const listHeadingH=118;
        const subtotalH=92;
        const noticeH=78;
        const footerH=150;

        const itemsH=
            itemLayouts.reduce(
                (sum,item)=>
                    sum+
                    item.height,
                0
            );

        const H=
            headerH+
            listHeadingH+
            itemsH+
            subtotalH+
            infoLayout.height+
            noticeH+
            footerH;

        const c=
            document.createElement(
                "canvas"
            );

        c.width=W;
        c.height=H;

        const x=
            c.getContext(
                "2d"
            );

        x.fillStyle=soft;
        x.fillRect(
            0,
            0,
            W,
            H
        );

        /* HEADER — compact */
        x.fillStyle=white;
        x.fillRect(
            0,
            0,
            W,
            headerH
        );

        x.fillStyle=yellow;
        x.fillRect(
            0,
            headerH-6,
            W,
            6
        );

        const logo=
            await loadImage(
                window.GomaiUtils
                    .resolveAssetPath(
                        window.GomaiConfig
                            .site
                            .logo
                            .header
                    )
            );

        if(logo){
            const maxW=280;
            const maxH=72;

            const sc=
                Math.min(
                    maxW/logo.width,
                    maxH/logo.height
                );

            x.drawImage(
                logo,
                pad,
                38,
                logo.width*sc,
                logo.height*sc
            );
        }

        x.textAlign="right";

        x.fillStyle=muted;
        x.font=
            '700 20px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            L(
                "RINGKASAN PESANAN",
                "订单清单"
            ),
            W-pad,
            58
        );

        x.fillStyle=black;
        x.font=
            '900 34px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            orderId,
            W-pad,
            103
        );

        x.textAlign="left";

        /* LIST HEADING */
        let y=
            headerH+
            36;

        x.fillStyle=black;
        x.font=
            '900 31px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            L(
                "DAFTAR BELANJA",
                "商品清单"
            ),
            pad,
            y
        );

        y+=42;

        const totalQuantity=
            resolved.reduce(
                (sum,e)=>
                    sum+
                    Number(
                        e.item.quantity||
                        0
                    ),
                0
            );

        x.fillStyle=muted;
        x.font=
            '500 20px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            cardLang==="zh"
                ?`共 ${totalQuantity} 件商品`
                :`${totalQuantity} barang`,
            pad,
            y
        );

        y=
            headerH+
            listHeadingH;

        /* ITEMS — all visible, no truncation */
        for(
            let index=0;
            index<resolved.length;
            index++
        ){
            const e=
                resolved[index];

            const layout=
                itemLayouts[index];

            x.strokeStyle=line;
            x.lineWidth=1.5;

            x.beginPath();
            x.moveTo(
                pad,
                y
            );
            x.lineTo(
                W-pad,
                y
            );
            x.stroke();

            y+=16;

            const src=
                img(e);

            const im=
                src
                    ?await loadImage(
                        window.GomaiUtils
                            .resolveAssetPath(
                                src
                            )
                    )
                    :null;

            if(im){
                drawCover(
                    x,
                    im,
                    pad,
                    y,
                    94,
                    94,
                    12
                );
            }else{
                rounded(
                    x,
                    pad,
                    y,
                    94,
                    94,
                    12,
                    "#eceae3"
                );
            }

            const tx=
                pad+
                116;

            const priceArea=
                210;

            const textMax=
                W-
                pad-
                tx-
                priceArea;

            const brandName=
                String(
                    brands.get(
                        e.product
                            .brandId
                    )?.name||
                    e.product
                        .brandId||
                    ""
                ).toUpperCase();

            x.fillStyle=muted;
            x.font=
                '800 16px Arial,"Microsoft YaHei",sans-serif';

            x.fillText(
                brandName,
                tx,
                y+18
            );

            x.fillStyle=black;
            x.font=
                '800 23px Arial,"Microsoft YaHei",sans-serif';

            let textY=
                y+
                48;

            const productLines=
                wrapLines(
                    x,
                    local(
                        e.product.name,
                        cardLang
                    ),
                    textMax
                );

            for(
                const lineText
                of productLines
            ){
                x.fillText(
                    lineText,
                    tx,
                    textY
                );

                textY+=27;
            }

            const variant=[
                e.color
                    ?local(
                        e.color.name,
                        cardLang
                    )
                    :"",
                e.item.sizeId
            ]
                .filter(Boolean)
                .join(" · ");

            if(variant){
                x.fillStyle=muted;
                x.font=
                    '500 18px Arial,"Microsoft YaHei",sans-serif';

                const variantLines=
                    wrapLines(
                        x,
                        variant,
                        textMax
                    );

                for(
                    const lineText
                    of variantLines
                ){
                    x.fillText(
                        lineText,
                        tx,
                        textY
                    );

                    textY+=22;
                }
            }

            x.fillStyle=black;
            x.font=
                '700 18px Arial,"Microsoft YaHei",sans-serif';

            x.fillText(
                `${e.item.quantity} × ${money(
                    e.product.price
                )}`,
                tx,
                textY+
                3
            );

            x.textAlign="right";

            x.font=
                '900 23px Arial,"Microsoft YaHei",sans-serif';

            x.fillText(
                money(
                    Number(
                        e.product.price||
                        0
                    )*
                    e.item.quantity
                ),
                W-pad,
                y+49
            );

            x.textAlign="left";

            y+=
                layout.height-
                16;
        }

        /* SUBTOTAL */
        x.strokeStyle=line;
        x.beginPath();
        x.moveTo(
            pad,
            y
        );
        x.lineTo(
            W-pad,
            y
        );
        x.stroke();

        y+=34;

        x.fillStyle=muted;
        x.font=
            '800 19px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            L(
                "SUBTOTAL SEMENTARA",
                "商品小计"
            ),
            pad,
            y
        );

        x.textAlign="right";

        x.fillStyle=black;
        x.font=
            '900 32px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            money(
                subtotal()
            ),
            W-pad,
            y+3
        );

        x.textAlign="left";

        y+=
            subtotalH-
            34;

        /* DELIVERY INFO — fully dynamic */
        rounded(
            x,
            pad,
            y,
            W-pad*2,
            infoLayout.height-18,
            18,
            white
        );

        let iy=
            y+
            38;

        x.fillStyle=black;
        x.font=
            '900 22px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            L(
                "INFORMASI PENGANTARAN",
                "配送信息"
            ),
            pad+24,
            iy
        );

        iy+=34;

        const labelX=
            pad+
            24;

        const valueX=
            pad+
            190;

        const valueMax=
            W-
            pad-
            valueX-
            24;

        for(
            const row
            of infoLayout.rows
        ){
            x.fillStyle=muted;
            x.font=
                '500 18px Arial,"Microsoft YaHei",sans-serif';

            x.fillText(
                row.label,
                labelX,
                iy
            );

            x.fillStyle=black;
            x.font=
                '500 18px Arial,"Microsoft YaHei",sans-serif';

            let vy=iy;

            for(
                const valueLine
                of row.lines
            ){
                x.fillText(
                    valueLine,
                    valueX,
                    vy
                );

                vy+=22;
            }

            iy+=
                row.height;
        }

        y+=
            infoLayout.height;

        /* COMPACT DISCLAIMER */
        x.fillStyle="#fff3bf";
        x.fillRect(
            pad,
            y,
            W-pad*2,
            54
        );

        x.fillStyle=black;
        x.font=
            '600 17px Arial,"Microsoft YaHei",sans-serif';

        const noticeLines=
            wrapLines(
                x,
                L(
                    "Harga dan ketersediaan barang akan dikonfirmasi oleh Gomai.",
                    "商品库存及最终价格将由 Gomai 确认。"
                ),
                W-pad*2-36
            );

        let ny=
            y+
            22;

        for(
            const notice
            of noticeLines
        ){
            x.fillText(
                notice,
                pad+18,
                ny
            );

            ny+=20;
        }

        y+=noticeH;

        /* FOOTER — compact */
        x.fillStyle=black;
        x.fillRect(
            0,
            y,
            W,
            footerH
        );

        x.fillStyle=yellow;
        x.font=
            '900 22px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            L(
                "KIRIM GAMBAR INI KE WECHAT GOMAI",
                "请将此图片发送至 GOMAI 微信"
            ),
            pad,
            y+42
        );

        x.fillStyle=white;
        x.font=
            '600 18px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            `WeChat ID: ${
                window.GomaiConfig
                    ?.contact
                    ?.wechatId||
                "Gomai"
            }`,
            pad,
            y+76
        );

        const now=
            new Date();

        x.fillStyle="#b8b8b8";
        x.font=
            '500 16px Arial,"Microsoft YaHei",sans-serif';

        x.fillText(
            formatCardDate(
                now,
                cardLang
            ),
            pad,
            y+108
        );

        x.fillStyle=yellow;
        x.fillRect(
            pad,
            y+
            footerH-
            18,
            W-
            pad*2,
            3
        );

        return c;
    }

    function measureItemLayout(
        ctx,
        entry,
        cardLang,
        W,
        pad
    ){
        const tx=
            pad+
            116;

        const textMax=
            W-
            pad-
            tx-
            210;

        ctx.font=
            '800 23px Arial,"Microsoft YaHei",sans-serif';

        const productLines=
            wrapLines(
                ctx,
                local(
                    entry.product.name,
                    cardLang
                ),
                textMax
            );

        const variant=[
            entry.color
                ?local(
                    entry.color.name,
                    cardLang
                )
                :"",
            entry.item.sizeId
        ]
            .filter(Boolean)
            .join(" · ");

        let variantLines=[];

        if(variant){
            ctx.font=
                '500 18px Arial,"Microsoft YaHei",sans-serif';

            variantLines=
                wrapLines(
                    ctx,
                    variant,
                    textMax
                );
        }

        const textHeight=
            18+
            productLines.length*27+
            variantLines.length*22+
            28;

        return{
            productLines,
            variantLines,
            height:
                Math.max(
                    126,
                    textHeight+
                    28
                )
        };
    }

    function measureInfoLayout(
        ctx,
        rows,
        W,
        pad
    ){
        const valueX=
            pad+
            190;

        const valueMax=
            W-
            pad-
            valueX-
            24;

        const measured=
            rows.map(
                ([label,value])=>{
                    ctx.font=
                        '500 18px Arial,"Microsoft YaHei",sans-serif';

                    const lines=
                        wrapLines(
                            ctx,
                            value||"-",
                            valueMax
                        );

                    return{
                        label,
                        lines,
                        height:
                            Math.max(
                                30,
                                lines.length*
                                22+
                                8
                            )
                    };
                }
            );

        return{
            rows:
                measured,
            height:
                68+
                measured.reduce(
                    (sum,row)=>
                        sum+
                        row.height,
                    0
                )+
                22
        };
    }

    function wrapLines(
        ctx,
        text,
        maxWidth
    ){
        const value=
            String(
                text||
                "-"
            );

        if(
            ctx.measureText(
                value
            ).width<=maxWidth
        ){
            return[
                value
            ];
        }

        const words=
            /[\s·]/.test(value)
                ?value.split(/(\s+|·)/)
                :Array.from(value);

        const lines=[];
        let line="";

        for(
            const token
            of words
        ){
            const next=
                line+
                token;

            if(
                line &&
                ctx.measureText(
                    next
                ).width>
                maxWidth
            ){
                lines.push(
                    line.trim()
                );

                line=
                    token.trimStart();
            }else{
                line=
                    next;
            }
        }

        if(
            line.trim()
        ){
            lines.push(
                line.trim()
            );
        }

        return lines.length
            ?lines
            :["-"];
    }

    function formatCardDate(
        date,
        cardLang
    ){
        const hours=
            String(
                date.getHours()
            ).padStart(
                2,
                "0"
            );

        const minutes=
            String(
                date.getMinutes()
            ).padStart(
                2,
                "0"
            );

        if(
            cardLang==="zh"
        ){
            return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 · ${hours}:${minutes}`;
        }

        const months=[
            "Januari",
            "Februari",
            "Maret",
            "April",
            "Mei",
            "Juni",
            "Juli",
            "Agustus",
            "September",
            "Oktober",
            "November",
            "Desember"
        ];

        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} · ${hours}:${minutes}`;
    }

    function rounded(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
    function drawCover(ctx,img,x,y,w,h,r){const sr=img.width/img.height,tr=w/h;let sx=0,sy=0,sw=img.width,sh=img.height;if(sr>tr){sw=img.height*tr;sx=(img.width-sw)/2;}else{sh=img.width/tr;sy=(img.height-sh)/2;}ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);ctx.restore();}
    function loadImage(src){return new Promise(resolve=>{if(!src){resolve(null);return;}const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src;});}
    function esc(v){const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML;}
    return Object.freeze({version:VERSION,init,destroy,refreshLanguage});
})();
window.CheckoutController=CheckoutController;
