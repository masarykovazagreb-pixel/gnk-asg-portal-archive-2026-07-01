import {createHash} from 'node:crypto';
import {safeUrl} from './aktual-world-feed-http-v1.mjs';
// Exact URL identity without exposing credentials or query strings in diagnostics.
export function feedIdentity(value){
 const safe=safeUrl(value);
 return safe?createHash('sha256').update(safe).digest('hex'):null;
}
export function freshFeedObservation(checks,source,now=Date.now()){
 const fingerprint=feedIdentity(source.rss);
 if(!fingerprint||!source.id||!Number.isFinite(now))return null;
 const rows=checks.filter(x=>x.feedId===source.id&&x.feedFingerprint===fingerprint)
 .filter(x=>['headlines','no-eligible-headlines','failed'].includes(x.status))
 .map(x=>({check:x,age:now-Date.parse(x.checkedAt)}))
 .filter(x=>Number.isFinite(x.age)&&x.age>=0&&x.age<86400000)
 .sort((a,b)=>a.age-b.age);
 if(!rows.length)return null;
 if(rows.length>1&&rows[0].age===rows[1].age&&rows[0].check.status!==rows[1].check.status)return null;
 return rows[0].check;
}
