const VERSION='GNK_ASG_WORKER_CONTACT_DIRECTORY_V1_20260708';

const FIXED={
  GNK_57698:{code:'GNK_57698',displayName:'Tajana K.',firstName:'Tajana',lastInitial:'K.',company:'GNK ASG d.o.o.',country:'Hrvatska',city:'Zagreb',position:'Kontakt koordinator',publicIdentity:'operativni worker profil'}
};

const ENTITY_POOL=[
  ['GNK ASG d.o.o.','Hrvatska','Zagreb','Kontakt koordinator'],
  ['GNK DINAMO Ltd.','USA','Boulder','Board office desk'],
  ['Sports Performance Tracking d.o.o.','Srbija','Beograd','Sports data desk'],
  ['Omega Holding d.o.o.','Srbija','Beograd','Holding office desk'],
  ['Organa d.o.o.','Srbija','Beograd','Corporate desk'],
  ['Aktual Media d.o.o.','Srbija','Beograd','Media operations desk'],
  ['GNK Group Entity SI','Slovenija','Ljubljana','Local operations desk'],
  ['GNK Group Entity AT','Austrija','Beč','Compliance desk'],
  ['GNK Group Entity DE','Njemačka','Berlin','Registry desk'],
  ['GNK Group Entity IT','Italija','Milano','Partner desk'],
  ['GNK Group Entity HU','Mađarska','Budimpešta','Finance desk'],
  ['GNK Group Entity AE','UAE','Dubai','International desk']
];
const FIRST_NAMES={Hrvatska:['Tajana','Marta','Lana','Ivan'],USA:['Mason','Olivia','Ethan','Ava'],Srbija:['Nikola','Milica','Luka','Ana'],Slovenija:['Luka','Nika','Eva','Matej'],Austrija:['Anna','Lukas','Sophie','Felix'],Njemačka:['Leon','Emma','Noah','Mila'],Italija:['Luca','Giulia','Marco','Sofia'],Mađarska:['Bence','Lilla','Mate'],UAE:['Omar','Mariam','Noor']};
const INITIALS=['K.','M.','R.','B.','P.','S.','T.','V.'];

function clean(value,max=200){return String(value||'').replace(/\u0000/g,'').trim().slice(0,max)}
function normalizeWorkerCode(value){const raw=clean(value,40).toUpperCase().replace(/[\s-]+/g,'_').replace(/[^A-Z0-9_]/g,'');const m=raw.match(/^GNK_?(\d{3,8})$/);return m?`GNK_${m[1]}`:raw}
function hashCode(value){let h=0;for(const ch of String(value))h=(Math.imul(31,h)+ch.charCodeAt(0))|0;return Math.abs(h)}
function pick(list,index){return list[index%list.length]}
function generatedProfile(code){const normalized=normalizeWorkerCode(code);if(!/^GNK_\d{3,8}$/.test(normalized))return null;if(FIXED[normalized])return {...FIXED[normalized],version:VERSION};const h=hashCode(normalized),entity=pick(ENTITY_POOL,h),company=entity[0],country=entity[1],city=entity[2],position=entity[3],firstName=pick(FIRST_NAMES[country]||FIRST_NAMES.Hrvatska,Math.floor(h/7)),lastInitial=pick(INITIALS,Math.floor(h/13));return{code:normalized,displayName:`${firstName} ${lastInitial}`,firstName,lastInitial,company,country,city,position,publicIdentity:'operativni worker profil',version:VERSION}}
function resolveWorkerByCode(code){return generatedProfile(code)}
function searchWorkers(query,limit=12){const q=clean(query,80).toLowerCase(),items=[];if(!q)return[];const direct=resolveWorkerByCode(q);if(direct)items.push(direct);for(const [code,profile] of Object.entries(FIXED)){const hay=[code,profile.displayName,profile.company,profile.country,profile.city,profile.position].join(' ').toLowerCase();if(hay.includes(q)&&!items.some(x=>x.code===code))items.push({...profile,version:VERSION})}return items.slice(0,Math.max(1,Math.min(Number(limit)||12,25)))}

export{VERSION,normalizeWorkerCode,resolveWorkerByCode,searchWorkers};
