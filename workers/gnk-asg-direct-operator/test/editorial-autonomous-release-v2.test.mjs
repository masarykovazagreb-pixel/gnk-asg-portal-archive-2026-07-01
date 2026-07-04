import assert from 'node:assert/strict';
import {__test,VERSION} from '../src/editorial-autonomous-release-v2.js';

const at0800=new Date('2026-07-04T06:00:00.000Z');
const at0802=new Date('2026-07-04T06:02:00.000Z');
const at0803=new Date('2026-07-04T06:03:00.000Z');
const at0859=new Date('2026-07-04T06:59:00.000Z');
const at0900=new Date('2026-07-04T07:00:00.000Z');

const p0800=__test.testV1.localParts(at0800);
const p0802=__test.testV1.localParts(at0802);
const p0803=__test.testV1.localParts(at0803);
const p0859=__test.testV1.localParts(at0859);
const p0900=__test.testV1.localParts(at0900);
assert.deepEqual(p0800,{date:'2026-07-04',hour:8,minute:0,second:0});
assert.equal(__test.onTimePackage(p0800,'2026-07-04'),true);
assert.equal(__test.onTimePackage(p0802,'2026-07-04'),true);
assert.equal(__test.onTimePackage(p0803,'2026-07-04'),false);
assert.equal(__test.deadlineReached(p0859,'2026-07-04'),false);
assert.equal(__test.deadlineReached(p0900,'2026-07-04'),true);
assert.equal(__test.compareDate('2026-07-03','2026-07-04'),-1);
assert.equal(__test.compareDate('2026-07-04','2026-07-04'),0);
assert.equal(__test.compareDate('2026-07-05','2026-07-04'),1);

function memoryKv(initial={}){
  const map=new Map(Object.entries(initial));
  return{
    map,
    async get(key){return map.get(key)??null;},
    async put(key,value){map.set(key,value);}
  };
}
function packageRecord(status='sent',items=[{id:'A'}]){
  return{
    date:'2026-07-04',
    notification:{status},
    items,
    silentConfirmationEligible:false
  };
}
async function normalize(env,local,record){
  const key=__test.testV1.packageKey('2026-07-04');
  env.EDITORIAL_KV=memoryKv({[key]:JSON.stringify(record)});
  const result=await __test.normalizePackageEligibility(env,'2026-07-04',local,{ok:true});
  return result.reviewPackage;
}

const eligible=await normalize({EDITORIAL_AUTONOMY_LIVE:'true'},p0800,packageRecord());
assert.equal(eligible.silentConfirmationEligible,true);
assert.equal(eligible.reviewWindowValid,true);
assert.equal(eligible.reviewWindowMinutes,60);
assert.equal(eligible.silentConfirmationEligibilityVersion,VERSION);

const reviewMode=await normalize({},p0800,packageRecord());
assert.equal(reviewMode.silentConfirmationEligible,false);
assert.ok(reviewMode.silentConfirmationEligibilityReasons.includes('review_mode_not_live'));

const failedNotice=await normalize({EDITORIAL_AUTONOMY_LIVE:'true'},p0800,packageRecord('failed'));
assert.equal(failedNotice.silentConfirmationEligible,false);
assert.ok(failedNotice.silentConfirmationEligibilityReasons.includes('notification_not_delivered'));

const emptyPackage=await normalize({EDITORIAL_AUTONOMY_LIVE:'true'},p0800,packageRecord('sent',[]));
assert.equal(emptyPackage.silentConfirmationEligible,false);
assert.ok(emptyPackage.silentConfirmationEligibilityReasons.includes('no_eligible_items'));

const latePackage=await normalize({EDITORIAL_AUTONOMY_LIVE:'true'},p0803,packageRecord());
assert.equal(latePackage.silentConfirmationEligible,false);
assert.ok(latePackage.silentConfirmationEligibilityReasons.includes('package_not_delivered_by_08_02'));

console.log('EDITORIAL_AUTONOMOUS_RELEASE_V2_OK');
