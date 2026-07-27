#!/usr/bin/env node
import assert from 'node:assert/strict';
import {handleBestBuyProvider,normalizeBestBuyProduct,VERSION} from '../src/bestbuy-provider-adapter-v1.js';

const normalized=normalizeBestBuyProduct({sku:1234567,name:'Test Laptop',manufacturer:'Test Brand',salePrice:999.99,onlineAvailability:true,categoryPath:[{name:'Computers'},{name:'Laptops'}]});
assert.equal(normalized.sku,'BBY-1234567');
assert.equal(normalized.currency,'USD');
assert.equal(normalized.priceEur,null);
assert.equal(normalized.market,'US');
assert.match(normalized.legalNote,/američko tržište/i);

const mockResponse=await handleBestBuyProvider(new Request('https://gnk-asg.hr/api/commerce/bestbuy/products?q=laptop'),{BESTBUY_MODE:'review'});
assert.equal(mockResponse.status,200);
const mockBody=await mockResponse.json();
assert.equal(mockBody.mode,'mock-review');
assert.ok(mockBody.products.length>=2);
assert.ok(mockBody.products.every(product=>product.currency==='USD'&&product.priceEur===null));

const pendingResponse=await handleBestBuyProvider(new Request('https://gnk-asg.hr/api/commerce/bestbuy/products'),{});
assert.equal(pendingResponse.status,503);
const pendingText=await pendingResponse.text();
assert.doesNotMatch(pendingText,/apiKey/i);
assert.doesNotMatch(pendingText,/BESTBUY_API_KEY\s*[:=]\s*[^"\s]+/i);

const invalidSku=await handleBestBuyProvider(new Request('https://gnk-asg.hr/api/commerce/bestbuy/product/not-a-sku'),{BESTBUY_MODE:'review'});
assert.equal(invalidSku.status,400);
console.log('Best Buy provider contract OK:',VERSION);
