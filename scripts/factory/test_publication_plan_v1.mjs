import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planPublication,planFallback} from './publication-plan-v1.mjs';
const countries=[{cca2:'HR',id:'zagreb',country:'Hrvatska',channelId:'zagreb',status:'live',liveUrl:'https://gnk-asg.hr/kanal/zagreb/'},{cca2:'IT',id:'rim',country:'Italija',channelId:'rim',status:'live',liveUrl:'https://gnk-asg.hr/kanal/rim/'},{cca2:'US',id:'newyork',country:'SAD',channelId:'newyork',status:'preparing'}];
const url='https://gnk-asg.hr/objave/primjer/';
const editorialRegistry={generatedAt:'2026-10-31',items:[{url,status:'published'}]};
const now=Date.parse('2026-10-31T12:00:00Z');
const item=(id,date)=>({title:'Vijest '+id,url:`https://gnk-asg.hr/kanal/${id}/clanak/primjer/`,date_published:date});
test('HR i svijet su isključivo planovi, uz blokadu nepripremljenih izdanja',()=>{
  const hr=planPublication({scope:'hr',url,countries,editorialRegistry}), world=planPublication({scope:'svijet',url,countries,editorialRegistry});
  assert.equal(hr.destinations.length,1);assert.equal(world.destinations.length,3);
  assert.equal(world.status,'plan_only_not_published');assert.equal(world.destinations[2].decision,'not_available');
  assert.equal(world.destinations[0].decision,'candidate_requires_review');
});
test('odbijanje nesigurnih adresa i nedopuštene rute',()=>{
  for(const u of ['https://gnk-asg.hr.evil.test/a/','http://gnk-asg.hr/a/','https://gnk-asg.hr/podijeli/vijest/x/','https://gnk-asg.hr/a/?token=1','https://u@gnk-asg.hr/a/']) assert.throws(()=>planPublication({scope:'hr',url:u,countries}));
});
test('samo objavljeni zapis iz registra postaje kandidat za daljnji pregled',()=>{
  const missing=planPublication({scope:'hr',url,countries,editorialRegistry:{items:[]}});
  assert.equal(missing.evidence,'not_found_in_editorial_registry');
  assert.equal(missing.destinations[0].decision,'article_not_in_registry');
  const draft=planPublication({scope:'hr',url,countries,editorialRegistry:{items:[{url,status:'draft'}]}});
  assert.equal(draft.destinations[0].decision,'article_not_in_registry');
  assert.throws(()=>planPublication({scope:'hr',url,countries}));
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

test('interaktivni obrazac prikazuje plan HR i svijet bez objavljivanja',async()=>{
  const {mountPublicationPlan}=await import('../../apps/portal/assets/publication-plan-ui-v1.mjs');
  const events={};
  const form={hidden:true,elements:{scope:{value:'hr'},url:{value:url}},addEventListener:(name,fn)=>events[name]=fn};
  const data={textContent:JSON.stringify(countries)};
  const result={children:[],replaceChildren(){this.children=[]},append(...x){this.children.push(...x)}};
  const doc={getElementById:id=>({'factory-publication-plan':form,'factory-plan-countries':data,'factory-plan-result':result}[id]),createElement:tag=>({tag,textContent:'',children:[],append(...x){this.children.push(...x)}})};
  const fetcher=async (path)=>{assert.equal(path,'/data/editorial-registry.json'); return {ok:true,json:async()=>editorialRegistry}};
  assert.equal(mountPublicationPlan(doc,fetcher),true);assert.equal(form.hidden,false);
  await events.submit({preventDefault(){}});
  assert.match(result.children[0].textContent,/PLAN, NIJE OBJAVLJENO/);
  assert.equal(result.children[2].children.length,1);
  form.elements.scope.value='svijet'; await events.submit({preventDefault(){}});
  assert.equal(result.children[2].children.length,3);assert.match(result.children[0].textContent,/2 kandidata/);
  form.elements.url.value='https://zlonamjerno.test/';await events.submit({preventDefault(){}});
  assert.match(result.children[0].textContent,/Plan nije izrađen/);
});
test('neispravan ili nedostajući registar ne aktivira obrazac',async()=>{
  const {mountPublicationPlan}=await import('../../apps/portal/assets/publication-plan-ui-v1.mjs');
  const form={hidden:true};
  const doc={getElementById:id=>({'factory-publication-plan':form,'factory-plan-countries':{textContent:'{}'},'factory-plan-result':{}}[id])};
  assert.equal(mountPublicationPlan(doc),false);assert.equal(form.hidden,true);
});

test('nedostupan urednički registar zaustavlja plan',async()=>{
  const {mountPublicationPlan}=await import('../../apps/portal/assets/publication-plan-ui-v1.mjs');
  let handler;const form={hidden:true,elements:{scope:{value:'hr'},url:{value:url}},addEventListener:(_,f)=>handler=f};
  const result={children:[],replaceChildren(){this.children=[]},append(...xs){this.children.push(...xs)}};
  const doc={getElementById:id=>({'factory-publication-plan':form,'factory-plan-countries':{textContent:JSON.stringify(countries)},'factory-plan-result':result}[id]),createElement:()=>({textContent:''})};
  mountPublicationPlan(doc,async()=>({ok:false}));await handler({preventDefault(){}});
  assert.match(result.children[0].textContent,/registar nije dostupan/);
});
test('stariji asinkroni odgovor ne prepisuje noviji zahtjev',async()=>{
  const {mountPublicationPlan}=await import('../../apps/portal/assets/publication-plan-ui-v1.mjs');
  let handler;const form={hidden:true,elements:{scope:{value:'hr'},url:{value:url}},addEventListener:(_,f)=>handler=f};
  const result={children:[],replaceChildren(){this.children=[]},append(...xs){this.children.push(...xs)}};
  const doc={getElementById:id=>({'factory-publication-plan':form,'factory-plan-countries':{textContent:JSON.stringify(countries)},'factory-plan-result':result}[id]),createElement:tag=>({tag,textContent:'',children:[],append(...xs){this.children.push(...xs)}})};
  let firstResolve;let call=0;
  const fetcher=()=>{call++;return call===1?new Promise(resolve=>firstResolve=resolve):Promise.resolve({ok:true,json:async()=>editorialRegistry});};
  mountPublicationPlan(doc,fetcher);
  const first=handler({preventDefault(){}});form.elements.scope.value='svijet';
  await handler({preventDefault(){}});
  firstResolve({ok:true,json:async()=>editorialRegistry});await first;
  assert.equal(result.children[2].children.length,3);
});
