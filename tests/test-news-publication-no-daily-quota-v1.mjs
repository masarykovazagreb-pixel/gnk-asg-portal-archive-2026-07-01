import test from 'node:test';
import assert from 'node:assert/strict';
import {handleNewsAutoPublication} from '../workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js';
import {buildContentProvenance} from '../workers/gnk-asg-direct-operator/src/content-source-policy-v1.js';
test('publication has no daily category ceiling or complete-group dependency, while review remains enforced',async()=>{
 const map=new Map(), day=new Date().toISOString().slice(0,10);
 const store={get:async k=>map.get(k)??null,put:async(k,v)=>map.set(k,v),delete:async k=>map.delete(k)};
 const put=(k,v)=>map.set(k,JSON.stringify(v));
 const ids=[];
 const provenance=buildContentProvenance({sourceClass:'first-party'},{category:'official-update'}).provenance;
 for(let i=0;i<20;i++){
   const id='item-'+i;ids.push(id);
   put('news:auto:post:'+id,{id,category:i<12?'official-update':'commentary',title:'Community programme update '+i,summary:'New verified programme details',provenance,status:'published'});
 }
 put('news:auto:published:'+day,ids);
 put('news:auto:queue',['single','held']);
 put('news:auto:post:single',{id:'single',category:'official-update',title:'Community programme update',summary:'New verified programme details',provenance,status:'queued',batchId:'legacy-incomplete',batchSize:13,batchIndex:0});
 put('news:auto:post:held',{id:'held',category:'official-update',title:'Court lawsuit',summary:'Pending review',provenance,status:'queued'});
 const response=await handleNewsAutoPublication(new Request('https://example.test/api/news-auto-publication/publish-allowed',{method:'POST'}),{GNK_ASG_KV:store});
 const result=await response.json();
 assert.equal(result.ok,true);
 assert.equal(result.published.length,1);
 assert.equal(result.published[0].id,'single');
 assert.equal(result.dailyPosts,13);
 assert.equal(result.dailyCommentaries,8);
 assert.equal(result.dailyQuota,null);
 assert.equal(JSON.parse(map.get('news:auto:post:held')).status,'manual_review');
});
