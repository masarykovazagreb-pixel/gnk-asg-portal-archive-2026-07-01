import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const p='artifacts/aktual-editorial-network/daily-weekly-brief.json';
test('daily/weekly desk briefs cannot publish or invent source URLs',()=>{
 const x=JSON.parse(fs.readFileSync(p,'utf8'));
 assert.equal(x.publicationStatus,'HOLD');
 assert.equal(x.safety.noAutoPublish,true);
 assert.equal(x.safety.noExternalComments,true);
 assert.equal(x.safety.verificationRequired,true);
 assert.equal(x.safety.paidCalls,0);
 assert.equal(x.safety.reviewNoticeSent,false);
 assert.equal(x.safety.thirtyMinuteTimerStarted,false);
 assert.ok(x.daily.length<=60 && x.weekly.length<=115);
 const locales=JSON.parse(fs.readFileSync('apps/region/channels.json','utf8')).channels;
 const dict=new Map(locales.map(c=>[c.id,c.lang]));
 for(const type of ['daily','weekly'])for(const c of x[type]){
  assert.equal(c.status,'HOLD');
  assert.equal(c.factCheck,'PENDING');
  assert.equal(c.originalCopy,'NOT_YET_WRITTEN');
  assert.equal(c.personalAuthor,null);
  assert.equal(new URL(c.sourceUrl).protocol,'https:');
  assert.ok(c.sourceHeadline && c.sourcePublisher);
  if(c.edition!=='national')assert.equal(c.language,dict.get(c.edition));
 }
});
