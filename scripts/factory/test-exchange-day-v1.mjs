import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {exchangeDataDay,writeExchangeJson} from '../../apps/satellites/lib/razmjena-v1.mjs';

test('dan razmjene ovisi o podacima, a ne o danu gradnje',()=>{
  const root=mkdtempSync(join(tmpdir(),'exchange-day-'));
  try {
    const dir=join(root,'apps/portal/kanal/rim'),out=join(root,'out');mkdirSync(dir,{recursive:true});mkdirSync(out,{recursive:true});
    writeFileSync(join(dir,'feed.json'),JSON.stringify({title:'AKTUAL MEDIA KANAL RIM',home_page_url:'https://gnk-asg.hr/kanal/rim/',language:'it',items:[{url:'https://gnk-asg.hr/kanal/rim/clanak/a/',title:'Jedan naslov',date_published:'2026-10-30T23:30:00-02:00'}]}));
    const NativeDate=globalThis.Date;
    try {
      globalThis.Date=class extends NativeDate { constructor(...args){super(...(args.length?args:['2026-11-01T12:00:00Z']));} };
      writeExchangeJson(out,{root});const a=readFileSync(join(out,'exchange.json'),'utf8');
      globalThis.Date=class extends NativeDate { constructor(...args){super(...(args.length?args:['2026-12-15T12:00:00Z']));} };
      writeExchangeJson(out,{root});const b=readFileSync(join(out,'exchange.json'),'utf8');
      assert.equal(a,b);const parsed=JSON.parse(a);assert.equal(parsed.generated,'2026-10-31');
      assert.equal(parsed.generatedMeaning,'latest-source-date-utc');assert.match(parsed.note,/not the build time/);
    } finally {globalThis.Date=NativeDate;}
  } finally {rmSync(root,{recursive:true,force:true});}
});
test('bez datuma koristi registrirani dan ili prekida bez lažnog datuma',()=>{
  const root=mkdtempSync(join(tmpdir(),'exchange-fallback-'));
  try {
    assert.throws(()=>exchangeDataDay([{date:'bad'}],root),/nema valjan datum/);
    const dir=join(root,'apps/portal/data');mkdirSync(dir,{recursive:true});
    writeFileSync(join(dir,'network-counts-v1.json'),JSON.stringify({dataDay:'2026-10-31'}));
    assert.deepEqual(exchangeDataDay([{date:'bad'}],root),{day:'2026-10-31',meaning:'registered-network-data-day'});
    writeFileSync(join(dir,'network-counts-v1.json'),JSON.stringify({dataDay:'2026-02-30'}));
    assert.throws(()=>exchangeDataDay([{date:'bad'}],root),/nema valjan datum/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
