(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.GNKDigitalWorkforceDirectory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2026-07-04.directory.01';
  const DISCLOSURE='The directory contains digital operations profiles and functional workflow identities. It is not, by itself, a register of natural persons or confirmed employment relationships.';
  const DEPARTMENTS=[
    ['Mission Control','MCO','Operational command intake, prioritisation and cross-department coordination'],
    ['Media Operations','MED','Media requests, accreditation workflow and controlled communications'],
    ['Publishing Operations','PUB','Editorial planning, source tracking and approval-gated publishing'],
    ['SEO Operations','SEO','Metadata, entity, structured-data and internal-link review'],
    ['Registry Operations','REG','Registry evidence, filing preparation and status monitoring'],
    ['Legal Affairs','LEG','Legal research support, issue spotting and escalation preparation'],
    ['Compliance','CMP','Policy, privacy, AML/KYC and approval-control review'],
    ['Finance Operations','FIN','Financial workflow coordination, evidence checks and reporting support'],
    ['Treasury','TRE','Liquidity, payment-control and treasury workflow support'],
    ['Accounting','ACC','Accounting evidence, reconciliation and close-process support'],
    ['Investor Relations','INV','Investor information preparation and disclosure coordination'],
    ['AI Research','AIR','Applied AI research, model evaluation and controlled experimentation'],
    ['Data Engineering','DAT','Data pipelines, quality controls and governed transformations'],
    ['Analytics','ANA','Operational analytics, KPI models and decision-support reporting'],
    ['Translation Center','TRN','Multilingual translation, terminology and quality review'],
    ['CRM Operations','CRM','Contact lifecycle, consent and relationship-workflow support'],
    ['Customer Operations','CUS','Customer inquiry classification and service-workflow support'],
    ['Cyber Security','SEC','Security monitoring, incident triage and escalation support'],
    ['Infrastructure','INF','Platform infrastructure review, resilience and capacity support'],
    ['Cloud Operations','CLD','Cloud service monitoring, configuration review and cost controls'],
    ['DevOps','DEV','Build, test and release-pipeline engineering under approval gates'],
    ['Deployment Operations','DPL','Deployment preparation, preflight checks and controlled execution support'],
    ['Recovery Operations','RCV','Backup, recovery-point and rollback readiness'],
    ['Quality Assurance','QAA','Functional, accessibility, regression and evidence-based quality review'],
    ['THE CODE Operations','COD','THE CODE research, intelligence and editorial operations'],
    ['Regional Operations','REGN','Regional coordination, language coverage and local-source review'],
    ['Administration','ADM','Controlled records, scheduling and operational administration']
  ];
  const COUNTRIES=[
    ['United States','North America','English','America/Denver'],
    ['Croatia','Europe','Croatian, English','Europe/Zagreb'],
    ['Germany','Europe','German, English','Europe/Berlin'],
    ['United Kingdom','Europe','English','Europe/London'],
    ['Canada','North America','English, French','America/Toronto'],
    ['India','Asia','English, Hindi','Asia/Kolkata'],
    ['Australia','Oceania','English','Australia/Sydney'],
    ['Spain','Europe','Spanish, English','Europe/Madrid'],
    ['France','Europe','French, English','Europe/Paris'],
    ['Netherlands','Europe','Dutch, English','Europe/Amsterdam'],
    ['Italy','Europe','Italian, English','Europe/Rome'],
    ['Portugal','Europe','Portuguese, English','Europe/Lisbon'],
    ['Poland','Europe','Polish, English','Europe/Warsaw'],
    ['Japan','Asia','Japanese, English','Asia/Tokyo'],
    ['Brazil','South America','Portuguese, English','America/Sao_Paulo'],
    ['Argentina','South America','Spanish, English','America/Argentina/Buenos_Aires'],
    ['Slovenia','Europe','Slovenian, English','Europe/Ljubljana'],
    ['Serbia','Europe','Serbian, English','Europe/Belgrade']
  ];
  const NAMES=['Sofia','Daniel','Emma','Lucas','Maya','Elena','Oliver','Hana','Mateo','Nora','Liam','Lea','Noah','Mila','Elias','Eva','Adam','Sara','David','Lena','Ivan','Ana','Marko','Laura','Niko','Iva','Theo','Clara','Leo','Marta','Kenji','Aiko','Rafael','Julia','Bruno','Isabel','Amir','Priya','Arjun','Mei','Luka','Petra','Tara','Filip','Dora','Leon','Karla','Mia','Toni','Ema','Jakov','Viktor','Helena','Gabriel','Nina','Klara','Samuel','Maja','Alex','Olivia','Adrian','Bianca','Carmen','Dario','Emilia','Felix','Greta','Hugo','Ines','Jonas','Katarina','Lucia','Martin','Naomi','Oskar','Paula','Ruben','Selma','Tomas','Valentina','Yuki','Zara','Antonia','Boris','Chiara','Denis','Esther','Farah','Goran','Hector','Ilona','Jana','Kamil','Lorena','Milan','Natalia','Orlando','Pia','Renato','Silvia'];
  const INITIALS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const STATUSES=['active','active','active','busy','scheduled','idle','approval-required'];
  function role(index){
    if(index<27)return'Department Manager';
    if(index<54)return'Quality Gate Reviewer';
    if(index<81)return'AI Manager';
    if(index<83)return'AI Director';
    return'Digital Operations Worker';
  }
  const profiles=Array.from({length:1500},(_,index)=>{
    const department=DEPARTMENTS[index%DEPARTMENTS.length];
    const country=COUNTRIES[(index*7)%COUNTRIES.length];
    const entitySlot=`GNK${String((index%43)+1).padStart(2,'0')}`;
    return Object.freeze({
      name:`${NAMES[index%NAMES.length]} ${INITIALS[Math.floor(index/NAMES.length)%INITIALS.length]}.`,
      workerId:`${department[1]}-${entitySlot}-${String(index+1).padStart(4,'0')}`,
      department:department[0],
      role:role(index),
      countryRegion:`${country[0]} · ${country[1]}`,
      languages:country[2],
      timezone:country[3],
      status:STATUSES[index%STATUSES.length],
      entitySlot,
      responsibility:department[2]
    });
  });
  return Object.freeze({
    version:VERSION,
    status:'controlled-review',
    profileType:'digital operations profile',
    disclosure:DISCLOSURE,
    count:profiles.length,
    departments:Object.freeze(DEPARTMENTS.map(item=>item[0])),
    entitySlots:Object.freeze(Array.from({length:43},(_,i)=>`GNK${String(i+1).padStart(2,'0')}`)),
    profiles:Object.freeze(profiles)
  });
});
