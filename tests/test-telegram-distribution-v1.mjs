import assert from 'node:assert/strict';
import {telegramCandidates,telegramMessage} from '../scripts/lib/telegram-distribution-core-v1.mjs';
const now=new Date('2026-11-11T14:00:00Z');
const article={path:'/objave/real-publication/',url:'https://gnk-asg.hr/objave/real-publication/',
  title:'Test & source',description:'Original analysis',publishedAt:'2026-11-11T10:00:00Z',status:'published'};
const list=telegramCandidates({featured:{items:[article]},registry:{items:[article,
 {...article,path:'/objave/draft/',url:'https://gnk-asg.hr/objave/draft/',status:'draft'},
 {...article,path:'/objave/future/',url:'https://gnk-asg.hr/objave/future/',publishedAt:'2026-11-12T00:00:00Z'},
 {...article,path:'/objave/wrong-host/',url:'https://evil.example/objave/wrong-host/'}
]},now});
assert.equal(list.length,1);
assert.equal(list[0].path,article.path);
assert.match(telegramMessage(list[0]),/Test &amp; source/);
assert.match(telegramMessage({...list[0],title:'<b>Test & source</b>'}),/&lt;b&gt;Test &amp; source&lt;\/b&gt;/);
assert.match(telegramMessage(list[0]),/https:\/\/gnk-asg.hr\/objave\/real-publication\//);
assert.equal(telegramCandidates({featured:{items:[article]},posted:{[article.path]:{status:'pending-verification'}},now}).length,0);
assert.equal(telegramCandidates({featured:{items:[article]},now:new Date('2026-11-30T00:00:00Z')}).length,0);
console.log('Telegram offline selector, escaping, date, and dedupe tests passed');
