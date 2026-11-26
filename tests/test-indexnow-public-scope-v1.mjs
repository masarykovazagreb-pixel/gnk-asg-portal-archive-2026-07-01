import test from 'node:test';
import assert from 'node:assert/strict';
import {publicUrl,eligiblePage,submitBatches} from '../scripts/gnk-indexnow-submit-v1.mjs';
const url='https://gnk-asg.hr/gnk-aktual/';
const html='<html><head><link rel="canonical" href="'+url+'"></head><body>Article</body></html>';
test('only canonical public content; reject protected, redirect and noindex paths',()=>{
 assert.ok(publicUrl(url));
 for(const value of ['https://operator.gnk-asg.hr/gnk-aktual/','https://gnk-asg.hr/en/admin/newsroom/','https://gnk-asg.hr/gnk-aktual/?q=1','https://gnk-asg.hr/private/','https://gnk-asg.hr/en/webmail/'])assert.equal(publicUrl(value),null,value);
 assert.equal(eligiblePage(html,url),true);
 assert.equal(eligiblePage(html.replace('</head>','<meta content="none" name="googlebot"></head>'),url),false);
 assert.equal(eligiblePage(html.replace('</head>','<meta http-equiv="refresh" content="0"></head>'),url),false);
 assert.equal(eligiblePage(html.replace(url,'https://gnk-asg.hr/other/'),url),false);
});
test('report acceptance separately from pending validation; stop on 429',async()=>{
 const urls=[url,'https://gnk-asg.hr/about/'],key='test-only-key';
 let calls=0;
 const result=await submitBatches(urls,key,{batchSize:1,fetchImpl:async()=>({status:++calls===1?200:202})});
 assert.deepEqual(result,{accepted:1,pendingValidation:1,indexingConfirmed:false});
 calls=0;
 await assert.rejects(submitBatches(urls,key,{batchSize:1,fetchImpl:async()=>{calls++;return {status:429}}}),/HTTP 429/);
 assert.equal(calls,1);
});
