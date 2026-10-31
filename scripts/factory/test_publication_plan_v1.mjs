import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planPublication,planFallback} from './publication-plan-v1.mjs';
const countries=[{cca2:'HR',id:'zagreb',country:'Hrvatska',channelId:'zagreb',status:'live',liveUrl:'https://gnk-asg.hr/kanal/zagreb/'},{cca2:'IT',id:'rim',country:'Italija',channelId:'rim',status:'live',liveUrl:'https://gnk-asg.hr/kanal/rim/'},{cca2:'US',id:'newyork',country:'SAD',channelId:'newyork',status:'preparing'}];
const url='https://gnk-asg.hr/objave/primjer/';
const editorialRegistry={generatedAt:'2026-10-31',items:[{url,status:'published'}]};
const now=Date.parse('2026-10-31T12:00:00Z');
const item=(id,date)=>({title:'Vijest '+id,url:`https://gnk-asg.hr/kanal/${id}/clanak/primjer/`,date_published:date,_region:{channel:id,source:'medij',sourceUrl:'https://news.example/clanak/',status:'auto-critique'}});
const feed=(id,items)=>({home_page_url:`https://gnk-asg.hr/kanal/${id}/`,language:'hr',items});
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
  const feeds={zagreb:feed('zagreb',[item('zagreb','2026-10-31T10:00:00Z')]),rim:feed('rim',[item('rim','2026-10-31T11:00:00Z')])};
  assert.equal(planFallback({target:'zagreb',countries,feeds,now}).status,'local_fresh');
});
test('zamjena bira samo svježe vlastite izvore iz drugih aktivnih kanala',()=>{
  const feeds={zagreb:feed('zagreb',[item('zagreb','2026-10-20T10:00:00Z')]),rim:feed('rim',[item('rim','2026-10-31T10:00:00Z'),item('rim','2026-11-01T10:00:00Z')]),newyork:feed('newyork',[item('newyork','2026-10-31T11:00:00Z')])};
  const p=planFallback({target:'zagreb',countries,feeds,now});assert.equal(p.status,'candidates_require_review');assert.equal(p.candidates.length,1);assert.equal(p.candidates[0].channel,'rim');assert.equal(p.candidates[0].originalSource,'medij');assert.equal(p.candidates[0].originalSourceUrl,'https://news.example/clanak/');assert.match(p.notice,/Nije kopiranje/);
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
test('regionalni feed je samo dokaz zapisa, nikad odobrenje objave',()=>{
  const regionalUrl='https://gnk-asg.hr/kanal/rim/clanak/primjer/';
  const regionalItem={url:regionalUrl,title:'Naslov',_region:{channel:'rim',status:'auto-critique'}};
  const feed={home_page_url:'https://gnk-asg.hr/kanal/rim/',items:[regionalItem]};
  const args={scope:'hr',url:regionalUrl,countries,editorialRegistry:{items:[]}};
  const plan=planPublication({...args,regionalFeed:feed});
  assert.equal(plan.evidence,'listed_in_regional_feed');assert.equal(plan.status,'plan_only_not_published');assert.equal(plan.destinations[0].decision,'candidate_requires_review');
  assert.equal(planPublication({...args,regionalFeed:{...feed,home_page_url:'https://evil.test/'}}).evidence,'not_found_in_editorial_registry');
  assert.equal(planPublication({...args,regionalFeed:{...feed,items:[{...regionalItem,_region:{channel:'zagreb'}}]}}).evidence,'not_found_in_editorial_registry');
  assert.equal(planPublication({...args,regionalFeed:{...feed,items:[{...regionalItem,_region:{channel:'rim',status:'blocked'}}]}}).evidence,'not_found_in_editorial_registry');
  assert.equal(planPublication({...args,regionalFeed:{...feed,items:[]}}).destinations[0].decision,'article_not_in_registry');
});
test('preglednik dohvaća samo lokalni feed aktivnog kanala',async()=>{
  const {mountPublicationPlan}=await import('../../apps/portal/assets/publication-plan-ui-v1.mjs');
  const regionalUrl='https://gnk-asg.hr/kanal/rim/clanak/primjer/';
  let handler;const form={hidden:true,elements:{scope:{value:'hr'},url:{value:regionalUrl}},addEventListener:(_,f)=>handler=f};
  const result={children:[],replaceChildren(){this.children=[]},append(...x){this.children.push(...x)}};
  const doc={getElementById:id=>({'factory-publication-plan':form,'factory-plan-countries':{textContent:JSON.stringify(countries)},'factory-plan-result':result}[id]),createElement:tag=>({tag,textContent:'',children:[],append(...x){this.children.push(...x)}})};
  const paths=[];const fetcher=async path=>{paths.push(path);return {ok:true,json:async()=>path==='/data/editorial-registry.json'?{items:[]}:{home_page_url:'https://gnk-asg.hr/kanal/rim/',items:[{url:regionalUrl,title:'Naslov',_region:{channel:'rim'}}]}}};
  mountPublicationPlan(doc,fetcher);await handler({preventDefault(){}});
  assert.deepEqual(paths,['/data/editorial-registry.json','/kanal/rim/feed.json']);
  assert.match(result.children[1].textContent,/regionalnom feedu/);
  assert.match(result.children[0].textContent,/NIJE OBJAVLJENO/);
});
test('dohvat feeda treće strane, nesigurnih putanja i neaktivnih kanala je zabranjen',async()=>{
  const {regionalFeedPath}=await import('../../apps/portal/assets/publication-plan-core-v1.mjs');
  assert.equal(regionalFeedPath('https://gnk-asg.hr/kanal/rim/clanak/primjer/',countries),'/kanal/rim/feed.json');
  for (const url of ['https://evil.test/kanal/rim/clanak/a/','https://gnk-asg.hr/kanal/newyork/clanak/a/','https://gnk-asg.hr/kanal/rim/clanak/a/?q=1','https://gnk-asg.hr/kanal/rim/clanak/a%2fb/']) assert.equal(regionalFeedPath(url,countries),null);
});
test('rezervna razmjena odbija blokirane i zapise bez provjerljive atribucije',()=>{
  const base=item('rim','2026-10-31T10:00:00Z');
  const run=record=>planFallback({target:'zagreb',countries,feeds:{rim:feed('rim',[record])},now});
  for(const changed of [
    {...base,_region:{...base._region,status:'blocked'}},
    {...base,_region:{...base._region,channel:'zagreb'}},
    {...base,_region:{...base._region,sourceUrl:'javascript:alert(1)'}},
    {...base,_region:{...base._region,source:''}},
    {...base,_region:undefined}
  ]) assert.equal(run(changed).status,'no_fresh_candidates');
  const wrongHome={...feed('rim',[base]),home_page_url:'https://gnk-asg.hr/kanal/zagreb/'};
  assert.equal(planFallback({target:'zagreb',countries,feeds:{rim:wrongHome},now}).status,'no_fresh_candidates');
});
