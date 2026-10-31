import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planPublication,planFallback} from './publication-plan-v1.mjs';
const countries=[{cca2:'HR',id:'zagreb',country:'Hrvatska',channelId:'zagreb',status:'live',liveUrl:'https://gnk-asg.hr/kanal/zagreb/'},{cca2:'IT',id:'rim',country:'Italija',channelId:'rim',status:'live',liveUrl:'https://gnk-asg.hr/kanal/rim/'},{cca2:'US',id:'newyork',country:'SAD',channelId:'newyork',status:'preparing'}];
const url='https://gnk-asg.hr/objave/primjer/';
const now=Date.parse('2026-10-31T12:00:00Z');
const item=(id,date)=>({title:'Vijest '+id,url:`https://gnk-asg.hr/kanal/${id}/clanak/primjer/`,date_published:date});
test('HR i svijet su isključivo planovi, uz blokadu nepripremljenih izdanja',()=>{
  const hr=planPublication({scope:'hr',url,countries}), world=planPublication({scope:'svijet',url,countries});
  assert.equal(hr.destinations.length,1);assert.equal(world.destinations.length,3);
  assert.equal(world.status,'plan_only_not_published');assert.equal(world.destinations[2].decision,'not_available');
  assert.equal(world.destinations[0].decision,'candidate_requires_review');
});
test('odbijanje nesigurnih adresa i nedopuštene rute',()=>{
  for(const u of ['https://gnk-asg.hr.evil.test/a/','http://gnk-asg.hr/a/','https://gnk-asg.hr/podijeli/vijest/x/','https://gnk-asg.hr/a/?token=1','https://u@gnk-asg.hr/a/']) assert.throws(()=>planPublication({scope:'hr',url:u,countries}));
});
test('kad je lokalni feed svjež ne predlaže zamjenu',()=>{
  const feeds={zagreb:{items:[item('zagreb','2026-10-31T10:00:00Z')]},rim:{items:[item('rim','2026-10-31T11:00:00Z')]}};
  assert.equal(planFallback({target:'zagreb',countries,feeds,now}).status,'local_fresh');
});
test('zamjena bira samo svježe vlastite izvore iz drugih aktivnih kanala',()=>{
  const feeds={zagreb:{items:[item('zagreb','2026-10-20T10:00:00Z')]},rim:{items:[item('rim','2026-10-31T10:00:00Z'),item('rim','2026-11-01T10:00:00Z')]},newyork:{items:[item('newyork','2026-10-31T11:00:00Z')]}};
  const p=planFallback({target:'zagreb',countries,feeds,now});assert.equal(p.status,'candidates_require_review');assert.equal(p.candidates.length,1);assert.equal(p.candidates[0].channel,'rim');assert.match(p.notice,/nije kopiranje/);
});
test('nema svježih kandidata i nedopušteno odredište',()=>{
  assert.equal(planFallback({target:'zagreb',countries,feeds:{},now}).status,'no_fresh_candidates');
  assert.throws(()=>planFallback({target:'newyork',countries,feeds:{},now}));
});
