#!/usr/bin/env node
/**
 * Controlled partner adapter for Hardwareschotte product pages.
 * Reads an explicit allow-list from config/hardwareschotte-products.json,
 * extracts JSON-LD and conservative HTML fallbacks, and optionally posts
 * normalized products to GNK ASG's bulk catalog endpoint.
 *
 * Required for API upload: WEBSHOP_API_KEY environment variable.
 * Dry run: node scripts/hardwareschotte-adapter-v1.mjs
 * Upload:  WEBSHOP_API_KEY=... node scripts/hardwareschotte-adapter-v1.mjs --push
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const configPath=path.join(root,'config/hardwareschotte-products.json');
const outputPath=path.join(root,'apps/portal/data/hardwareschotte-adapter-preview.json');
const cfg=JSON.parse(fs.readFileSync(configPath,'utf8'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const text=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
function jsonLd(html){const out=[];for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const v=JSON.parse(m[1]);out.push(...(Array.isArray(v)?v:[v]));}catch{}}return out.flatMap(x=>x?.['@graph']||x);}
function findProduct(nodes){return nodes.find(x=>String(x?.['@type']||'').toLowerCase().includes('product'))||{};}
function skuFrom(seed,p){return String(seed.sku||p.sku||p.mpn||p.gtin13||'').toUpperCase().replace(/[^A-Z0-9-]/g,'-').slice(0,64);}
async function fetchPage(url){const c=new AbortController();const t=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{signal:c.signal,headers:{'user-agent':cfg.userAgent||'GNK-ASG-Partner-Catalog/1.0','accept':'text/html,application/xhtml+xml'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text();}finally{clearTimeout(t);}}
function normalize(seed,html){const p=findProduct(jsonLd(html));const offers=Array.isArray(p.offers)?p.offers:(p.offers?[p.offers]:[]);const offer=offers.find(o=>o?.price)||offers[0]||{};const price=Number(String(offer.price||'').replace(',','.'));const title=text(p.name)||text((html.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]);const image=Array.isArray(p.image)?p.image[0]:p.image;return {sku:skuFrom(seed,p),name:title||seed.name||'Hardver proizvod',category:seed.category||'Hardver',description:text(p.description)||seed.description||'',brand:text(p.brand?.name||p.brand)||seed.brand||'',mpn:text(p.mpn)||'',ean:text(p.gtin13||p.gtin||p.gtin12)||'',priceEur:Number.isFinite(price)?Math.round(price*100)/100:null,shippingEur:null,availability:/instock/i.test(String(offer.availability||''))?'in_stock':/outofstock/i.test(String(offer.availability||''))?'out_of_stock':'unknown',image:image||'',sourceUrl:seed.url,sourceLabel:'Hardwareschotte partnerski prikaz',merchant:text(offer.seller?.name||offer.seller)||'',checkedAt:new Date().toISOString(),tags:[seed.category||'Hardver',text(p.brand?.name||p.brand)].filter(Boolean)};}
const products=[];
for(const seed of cfg.products||[]){try{const html=await fetchPage(seed.url);const p=normalize(seed,html);if(!p.sku||!p.name)throw new Error('missing sku/name');products.push(p);console.log('OK',p.sku,p.name);}catch(e){console.error('FAIL',seed.url,e.message);}await sleep(Math.max(1000,Number(cfg.delayMs)||2500));}
const payload={schemaVersion:'hardwareschotte-adapter-preview-v1',generatedAt:new Date().toISOString(),source:'Hardwareschotte',products};
fs.writeFileSync(outputPath,JSON.stringify(payload,null,2));
console.log('Preview written:',outputPath,'products:',products.length);
if(process.argv.includes('--push')){const key=process.env.WEBSHOP_API_KEY;if(!key)throw new Error('WEBSHOP_API_KEY missing');const endpoint=cfg.catalogEndpoint||'https://gnk-asg.hr/api/v1/products/bulk';const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-api-key':key},body:JSON.stringify({products})});const body=await r.text();console.log('Push status:',r.status,body);if(!r.ok)process.exitCode=1;}
