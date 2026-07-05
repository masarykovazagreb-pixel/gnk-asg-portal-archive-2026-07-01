(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.GNKDigitalWorkforceDirectory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2026-07-05.directory.03';
  const DISCLOSURE='The directory contains operational profiles and functional workflow identities. It is not, by itself, a register of natural persons or confirmed employment relationships.';
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
    ['United States','North America','English','America/Denver'],['Croatia','Europe','Croatian, English','Europe/Zagreb'],
    ['Germany','Europe','German, English','Europe/Berlin'],['United Kingdom','Europe','English','Europe/London'],
    ['Canada','North America','English, French','America/Toronto'],['India','Asia','English, Hindi','Asia/Kolkata'],
    ['Australia','Oceania','English','Australia/Sydney'],['Spain','Europe','Spanish, English','Europe/Madrid'],
    ['France','Europe','French, English','Europe/Paris'],['Netherlands','Europe','Dutch, English','Europe/Amsterdam'],
    ['Italy','Europe','Italian, English','Europe/Rome'],['Portugal','Europe','Portuguese, English','Europe/Lisbon'],
    ['Poland','Europe','Polish, English','Europe/Warsaw'],['Japan','Asia','Japanese, English','Asia/Tokyo'],
    ['Brazil','South America','Portuguese, English','America/Sao_Paulo'],['Argentina','South America','Spanish, English','America/Argentina/Buenos_Aires'],
    ['Slovenia','Europe','Slovenian, English','Europe/Ljubljana'],['Serbia','Europe','Serbian, English','Europe/Belgrade']
  ];
  const NAMES=['Sofia','Daniel','Emma','Lucas','Maya','Elena','Oliver','Hana','Mateo','Nora','Liam','Lea','Noah','Mila','Elias','Eva','Adam','Sara','David','Lena','Ivan','Ana','Marko','Laura','Niko','Iva','Theo','Clara','Leo','Marta','Kenji','Aiko','Rafael','Julia','Bruno','Isabel','Amir','Priya','Arjun','Mei','Luka','Petra','Tara','Filip','Dora','Leon','Karla','Mia','Toni','Ema','Jakov','Viktor','Helena','Gabriel','Nina','Klara','Samuel','Maja','Alex','Olivia','Adrian','Bianca','Carmen','Dario','Emilia','Felix','Greta','Hugo','Ines','Jonas','Katarina','Lucia','Martin','Naomi','Oskar','Paula','Ruben','Selma','Tomas','Valentina','Yuki','Zara','Antonia','Boris','Chiara','Denis','Esther','Farah','Goran','Hector','Ilona','Jana','Kamil','Lorena','Milan','Natalia','Orlando','Pia','Renato','Silvia'];
  const INITIALS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const STATUSES=['active','active','active','busy','scheduled','idle','approval-required'];
  const FINANCIAL_BASES=Object.freeze([
    'GNK ASG d.o.o. standalone FY2025 + 30.6.2026 management input',
    'GNK DINAMO Ltd. Group consolidated FY2025 + 30.6.2026 management input'
  ]);
  const PROTOCOLS=Object.freeze(['P01 Intake and classification','P02 Source and evidence control','P03 Two-option proposal','P04 Risk and escalation','P05 Peer quality review','P06 Decision-rights gate','P07 Stop and rollback','P08 Audit record']);
  const TASKS={
    MCO:['Classify new work and assign accountable department','Monitor cross-department deadlines and blockers','Prepare two operating options for unresolved priority conflicts','Escalate critical dependencies with a complete audit record'],
    MED:['Classify media inquiries and accreditation requests','Verify approved corporate facts before response preparation','Prepare multilingual response drafts and evidence packs','Track response status and escalate reputational risk'],
    PUB:['Prepare source-backed publication drafts','Maintain daily editorial queue and content freeze hashes','Run fact-check, attribution and metadata checks','Route completed packages into the 08:00 Executive Office review window'],
    SEO:['Validate canonical, robots, hreflang and structured data','Map real Organization and Person relationships','Test internal links and sitemap eligibility','Stop indexing when factual or approval evidence is incomplete'],
    REG:['Monitor registry status, deadlines and official evidence','Prepare filing checklists without submitting autonomously','Compare submitted, approved and legally effective states','Escalate jurisdictional conflicts or missing extracts'],
    LEG:['Research applicable legal sources and jurisdictions','Separate factual record from legal interpretation','Prepare at least two defensible legal-operational options','Escalate final legal positions for accountable approval'],
    CMP:['Review privacy, AML/KYC and policy requirements','Check decision rights and separation of duties','Monitor exceptions, conflicts and mandatory controls','Preserve an evidence-based compliance audit trail'],
    FIN:['Maintain separate GNK ASG and GNK DINAMO financial bases','Calculate conservative, base and accelerated projections','Compare actual, management-input and scenario layers','Prepare department planning envelopes without creating payment authority'],
    TRE:['Monitor liquidity inputs, commitments and payment controls','Prepare treasury scenarios and cash-risk alerts','Reconcile planned uses with approved ceilings','Escalate every payment or financial commitment beyond delegated authority'],
    ACC:['Reconcile source records and period classifications','Support close-process evidence and variance checks','Maintain standalone versus consolidated scope separation','Flag missing documentation before any financial publication'],
    INV:['Prepare source-backed investor information','Maintain disclosure consistency across entity scopes','Model scenario impacts without presenting forecasts as guarantees','Escalate material statements before release'],
    AIR:['Evaluate models and controlled automation use cases','Document limitations, evidence and failure modes','Run comparison tests and safety checks','Recommend deployment only after review and rollback readiness'],
    DAT:['Maintain governed data pipelines and lineage','Validate schema, quality and completeness','Separate source data from transformations and projections','Stop downstream use when integrity controls fail'],
    ANA:['Build KPI and projection models from approved inputs','Compare trends across entity, period and scenario layers','Publish internal decision-support dashboards','Explain assumptions, uncertainty and data limitations'],
    TRN:['Translate approved content while preserving meaning','Maintain terminology by jurisdiction and entity','Run second-person language quality review','Escalate ambiguity that could change legal or financial meaning'],
    CRM:['Maintain consent-aware contact lifecycle records','Classify relationship stage and required follow-up','Detect duplicates and conflicting contact data','Escalate restricted communication or privacy issues'],
    CUS:['Classify inquiries and service requests','Prepare evidence-based response options','Track handling time and unresolved issues','Escalate commitments, complaints and reputational risks'],
    SEC:['Monitor security events and suspicious activity','Triage severity and preserve evidence','Apply approved containment playbooks','Escalate incidents, credential exposure and production risk'],
    INF:['Monitor capacity, resilience and service dependencies','Prepare infrastructure change plans and rollback steps','Validate configuration evidence before change','Escalate production-impacting work'],
    CLD:['Monitor cloud health, configuration and cost signals','Prepare optimization recommendations','Validate route, binding and environment separation','Escalate DNS, secret and production configuration changes'],
    DEV:['Maintain build, test and release pipelines','Run syntax, unit and contract checks','Prepare controlled patches with rollback references','Never merge or deploy without the required release authority'],
    DPL:['Run deployment preflight and recovery checks','Confirm exact revision and change scope','Prepare deployment and rollback commands','Execute only under the approved deployment token rule'],
    RCV:['Maintain recovery points and backup evidence','Test rollback procedures in non-production conditions','Track restoration dependencies and verification steps','Escalate missing recovery evidence'],
    QAA:['Run functional, responsive and accessibility tests','Validate data contracts and regression protections','Record reproducible defects and evidence','Block release when critical acceptance criteria fail'],
    COD:['Research THE CODE topics and source evidence','Prepare articles, commentary and strategic analysis','Maintain author, editor and publisher separation','Route completed work through the daily review and release policy'],
    REGN:['Monitor regional sources, languages and local context','Coordinate jurisdiction-specific operating tasks','Validate that local claims match primary evidence','Escalate cross-border legal, financial or reputational conflicts'],
    ADM:['Maintain controlled records and schedules','Track task ownership, deadlines and evidence','Prepare daily summaries and unresolved-action lists','Escalate missing approvals or incomplete audit records']
  };
  const CADENCE={FIN:'daily 06:00–07:30 Europe/Zagreb projection cycle',TRE:'continuous liquidity queue + daily 07:15 summary',ACC:'daily reconciliation + month-end close cycle',PUB:'continuous editorial queue + 08:00 review package',COD:'continuous research queue + 08:00 review package',MCO:'continuous priority queue + hourly control scan',SEC:'continuous monitoring + immediate incident escalation',DPL:'event-driven preflight only',RCV:'daily recovery evidence scan',QAA:'continuous regression queue'};
  function role(index){
    const rank=index%100;
    if(rank===0)return'AI Director';
    if(rank<4)return'AI Manager';
    if(rank<10)return'Department Manager';
    if(rank<18)return'Quality Gate Reviewer';
    if(rank<45)return'Senior Operations Specialist';
    return'Operations Worker';
  }
  function authority(position){
    if(position==='AI Director')return'Cross-department orchestration, exception routing and recommendation; no unapproved binding commitment.';
    if(position==='AI Manager')return'Department planning, workload allocation and low-risk operational decisions within policy.';
    if(position==='Department Manager')return'Task routing, quality gate and policy-compliant low-risk execution.';
    if(position==='Quality Gate Reviewer')return'Independent evidence, source, quality and readiness review.';
    return'Background task execution, research, analysis and proposal drafting within assigned policy.';
  }
  const profiles=Array.from({length:1537},(_,index)=>{
    const department=DEPARTMENTS[index%DEPARTMENTS.length],country=COUNTRIES[(index*7)%COUNTRIES.length];
    const entitySlot=`GNK${String((index%43)+1).padStart(2,'0')}`,position=role(index),code=department[1];
    return Object.freeze({
      name:`${NAMES[index%NAMES.length]} ${INITIALS[Math.floor(index/NAMES.length)%INITIALS.length]}.`,
      workerId:`${code}-${entitySlot}-${String(index+1).padStart(4,'0')}`,
      department:department[0],role:position,positionTitle:`${position} · ${department[0]}`,
      countryRegion:`${country[0]} · ${country[1]}`,operatingCountry:country[0],operatingRegion:country[1],
      languages:country[2],timezone:country[3],status:STATUSES[index%STATUSES.length],entitySlot,
      responsibility:department[2],authority:authority(position),
      policySet:Object.freeze([...PROTOCOLS,`${code} department operating policy`]),
      workTasks:Object.freeze(TASKS[code]||[department[2]]),
      operatingMode:'background-scheduled',
      backgroundCadence:CADENCE[code]||'continuous governed queue + daily status summary',
      financialPlanningBases:FINANCIAL_BASES,
      budgetEnvelopeKey:`${code}:${entitySlot}`,
      budgetMode:'relative planning envelope; euro ceiling requires an approved expense pool',
      paymentAuthority:false,contractAuthority:false,
      auditRequired:true,peerReviewRequired:true,minimumOptions:2
    });
  });
  return Object.freeze({
    version:VERSION,status:'controlled-review',profileType:'operations profile',disclosure:DISCLOSURE,
    count:profiles.length,departments:Object.freeze(DEPARTMENTS.map(item=>item[0])),
    entitySlots:Object.freeze(Array.from({length:43},(_,i)=>`GNK${String(i+1).padStart(2,'0')}`)),
    financialPlanningBases:FINANCIAL_BASES,protocols:PROTOCOLS,profiles:Object.freeze(profiles)
  });
});
