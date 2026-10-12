#!/usr/bin/env node
// Knowledge Center parity, canonical-route and operator-boundary contract.
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const kb=JSON.parse(read('apps/portal/data/knowledge-base.json'));
const enGroup=(kb.skupine||[]).find(g=>String(g.naslov||'').trim()==='English pages');
if(!enGroup) throw new Error('English pages group missing');
const enQuestions=(enGroup.pitanja||[]).filter(x=>String(x.p||'').trim()&&String(x.o||'').trim());
const en=read('apps/portal/en/knowledge-center/index.html');
const hr=read('apps/portal/knowledge-center/index.html');
const operator=read('workers/gnk-asg-operator-center/src/index.js');

const detailCount=(en.match(/<details\s+data-kc-item/g)||[]).length;
const sourceLinkCount=(en.match(/class="kc-page-link"/g)||[]).length;
if(detailCount!==enQuestions.length) throw new Error(`EN detail count ${detailCount} != source ${enQuestions.length}`);
if(sourceLinkCount!==enQuestions.length) throw new Error(`EN source-link count ${sourceLinkCount} != source ${enQuestions.length}`);
if(en.includes('Stranica:')) throw new Error('Croatian source-page label remains in EN Knowledge Center');
if(enQuestions.length<100) throw new Error('EN knowledge coverage unexpectedly small');
if(!en.includes('<link rel="canonical" href="https://gnk-asg.hr/en/knowledge-center/">')) throw new Error('EN canonical missing');
if(!hr.includes('<link rel="canonical" href="https://gnk-asg.hr/knowledge-center/">')) throw new Error('HR canonical missing');
if(/Aktivno je 37 poslova|15 na rasporedu/.test(JSON.stringify(kb))) throw new Error('Hardcoded automation counts remain in shared knowledge source');
if(/Aktivno je 37 poslova|15 na rasporedu/.test(hr)) throw new Error('Hardcoded automation counts remain in HR Knowledge Center');
const hrRedirect="Response.redirect('https://gnk-asg.hr/knowledge-center/',308)";
const enRedirect="Response.redirect('https://gnk-asg.hr/en/knowledge-center/',308)";
if(!operator.includes(hrRedirect)||!operator.includes(enRedirect)) throw new Error('Operator Center must permanently redirect Knowledge Center aliases to the canonical public host');
if(/knowledge-center[^\n]{0,180}(ASSETS\.fetch|injectSessionPatch)/i.test(operator)) throw new Error('Operator Center must not serve Knowledge Center content');
if(!operator.includes("if (path !== '/operator-dashboard')")) throw new Error('Operator Center route boundary changed unexpectedly');
console.log(JSON.stringify({
  totalQuestions:kb.ukupnoPitanja,
  englishQuestions:enQuestions.length,
  enRenderedQuestions:detailCount,
  enSourceLinks:sourceLinkCount,
  publicHrRoute:'/knowledge-center/',
  publicEnRoute:'/en/knowledge-center/',
  operatorKnowledgeRouteOwned:false,
  operatorKnowledgeAliasMode:'308-canonical-redirect'
},null,2));
