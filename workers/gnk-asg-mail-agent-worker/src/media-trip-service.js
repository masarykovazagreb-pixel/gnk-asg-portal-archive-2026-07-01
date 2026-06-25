import { sendManualMail } from './sender.js';
import { writeOperatorAuditLog } from './operator-audit-log.js';

const VERSION = 'GNK_ASG_MEDIA_TRIP_V1_20260626';
const INDEX_KEY = 'media-trip:applications:index';
const CONFIG_KEY = 'media-trip:config';
const MAX_DELEGATES = 3;
const MAX_DOCUMENTS = 12;
const MAX_TOTAL_DOCUMENT_BYTES = 18_000_000;
const ALLOWED_DOCUMENT_TYPES = new Set(['application/pdf','image/jpeg','image/png']);
const STATUS_VALUES = new Set([
  'received','under_review','missing_information','approved','travel_options_pending',
  'offer_received','payment_pending','paid','ticketed','accredited','completed','rejected','cancelled'
]);

const DEFAULT_CONFIG = {
  version: VERSION,
  eventCode: 'new-york-media-visit',
  title: 'GNK ASG – prijava redakcija za New York',
  destination: 'New York, SAD',
  hotel: {
    covered: true,
    dateLabel: 'od 6. do 8. – točan mjesec i godina prema službenom pozivu',
    checkInDay: 6,
    checkOutDay: 8,
    nights: 2,
    roomPolicy: 'Jednokrevetna ili odobrena dvokrevetna soba prema raspoloživosti.'
  },
  travel: {
    covered: true,
    responsibility: 'Redakcija samostalno organizira ili predlaže putovanje. GNK ASG ne organizira putovanje, nego nakon odobrenja kupuje odabrane karte ili izravno plaća odobreni predračun prijevoznika ili putničke agencije.',
    supportedModels: [
      { key:'flight_details', label:'Redakcija dostavlja odabrane letove i brojeve letova; GNK ASG kupuje karte.' },
      { key:'proforma_payment', label:'Redakcija dostavlja predračun prijevoznika ili agencije; GNK ASG plaća dobavljaču.' },
      { key:'self_arranged', label:'Redakcija samostalno rezervira put tek nakon pisanog odobrenja troška i dostavlja dokumentaciju za plaćanje ili povrat.' }
    ]
  },
  maxDelegates: MAX_DELEGATES,
  registrationState: 'open',
  registrationDeadline: null,
  publicFormPath: '/media-trip-registration/',
  adminPath: '/mail-studio-pro/campaign/travel/',
  privacyNotice: 'Podaci se obrađuju isključivo radi provjere redakcije, digitalne akreditacije, hotela, putovanja i plaćanja odobrenih troškova. Podaci o putnim ispravama traže se tek nakon odobrenja i moraju biti ograničeni na podatke potrebne za izdavanje karte.',
  updatedAt: null
};

export async function handleMediaTripRequest(request, env, options = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const isOperator = options.operator === true;

  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:corsHeaders()});

  if (path === '/api/mail-agent/public/media-trip/config' && request.method === 'GET') {
    return json({ ok:true, version:VERSION, config:await getConfig(env) });
  }

  if (path === '/api/mail-agent/public/media-trip/applications' && request.method === 'POST') {
    return createApplication(request,env);
  }

  const publicApplication = path.match(/^\/api\/mail-agent\/public\/media-trip\/applications\/([^/]+)$/);
  if (publicApplication && request.method === 'GET') {
    return publicApplicationStatus(request,env,publicApplication[1]);
  }

  const publicDocuments = path.match(/^\/api\/mail-agent\/public\/media-trip\/applications\/([^/]+)\/documents$/);
  if (publicDocuments && request.method === 'POST') {
    return appendPublicDocuments(request,env,publicDocuments[1]);
  }

  if (!isOperator) return null;

  if (path === '/api/mail-agent/media-trip/config') {
    if (request.method === 'GET') return json({ok:true,version:VERSION,config:await getConfig(env)});
    if (request.method === 'POST') return updateConfig(request,env);
  }

  if (path === '/api/mail-agent/media-trip/summary' && request.method === 'GET') {
    return operatorSummary(env);
  }

  if (path === '/api/mail-agent/media-trip/applications' && request.method === 'GET') {
    return operatorList(request,env);
  }

  if (path === '/api/mail-agent/media-trip/export.csv' && request.method === 'GET') {
    return exportCsv(env);
  }

  const operatorApplication = path.match(/^\/api\/mail-agent\/media-trip\/applications\/([^/]+)$/);
  if (operatorApplication && request.method === 'GET') {
    const application = await readApplication(env,operatorApplication[1]);
    return application ? json({ok:true,version:VERSION,application}) : json({ok:false,error:'application_not_found'},404);
  }

  const statusAction = path.match(/^\/api\/mail-agent\/media-trip\/applications\/([^/]+)\/status$/);
  if (statusAction && request.method === 'POST') return updateApplicationStatus(request,env,statusAction[1]);

  const noteAction = path.match(/^\/api\/mail-agent\/media-trip\/applications\/([^/]+)\/notes$/);
  if (noteAction && request.method === 'POST') return addOperatorNote(request,env,noteAction[1]);

  const paymentAction = path.match(/^\/api\/mail-agent\/media-trip\/applications\/([^/]+)\/payment$/);
  if (paymentAction && request.method === 'POST') return updatePayment(request,env,paymentAction[1]);

  return null;
}

async function createApplication(request,env) {
  const rate = await rateLimit(request,env);
  if (!rate.ok) return json({ok:false,error:'rate_limited',message:'Previše pokušaja prijave. Pokušajte kasnije.'},429);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ok:false,error:'invalid_json'},400); }

  if (clean(payload.website)) return json({ok:true,message:'Prijava je zaprimljena.'});

  const validation = validateApplicationPayload(payload);
  if (!validation.ok) return json({ok:false,error:'validation_failed',fields:validation.fields},400);

  const now = new Date().toISOString();
  const id = `NYM-${now.slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const accessKey = randomAccessKey();
  const accessHash = await sha256(accessKey);
  const documents = await storeDocuments(env,id,payload.documents || [],'initial');

  const application = {
    id,
    version: VERSION,
    eventCode: clean(payload.eventCode) || 'new-york-media-visit',
    createdAt: now,
    updatedAt: now,
    status: 'received',
    statusHistory: [{status:'received',at:now,source:'public-form'}],
    accessHash,
    editorial: normalizeEditorial(payload.editorial),
    delegates: normalizeDelegates(payload.delegates),
    travel: normalizeTravel(payload.travel),
    accommodation: normalizeAccommodation(payload.accommodation),
    accreditation: normalizeAccreditation(payload.accreditation),
    billing: normalizeBilling(payload.billing),
    declarations: normalizeDeclarations(payload.declarations),
    documents,
    missingItems: initialMissingItems(payload),
    operatorNotes: [],
    payment: {
      status:'not_started',
      model:clean(payload.travel?.model),
      supplier:null,
      reference:null,
      amount:null,
      currency:clean(payload.travel?.currency)||'EUR',
      approvedAt:null,
      paidAt:null,
      note:null
    },
    notifications: {},
    source: 'public-media-trip-form'
  };

  await saveApplication(env,application);
  const receipt = buildReceiptPdf(application);
  application.notifications = await sendRegistrationNotifications(env,application,receipt);
  await saveApplication(env,application);
  await audit(env,'media-trip.application.create',id,'success',{editorial:application.editorial.outletName,delegates:application.delegates.length,travelModel:application.travel.model});

  return json({
    ok:true,
    version:VERSION,
    applicationId:id,
    accessKey,
    status:application.status,
    statusUrl:`/media-trip-registration/?application=${encodeURIComponent(id)}&access=${encodeURIComponent(accessKey)}`,
    receiptFilename:receipt.filename,
    message:'Prijava redakcije je zaprimljena.'
  },201);
}

function validateApplicationPayload(payload) {
  const fields = [];
  const editorial = payload?.editorial || {};
  const delegates = Array.isArray(payload?.delegates) ? payload.delegates : [];
  const travel = payload?.travel || {};
  const declarations = payload?.declarations || {};
  if (!clean(editorial.officialName)) fields.push('editorial.officialName');
  if (!clean(editorial.outletName)) fields.push('editorial.outletName');
  if (!validEmail(editorial.contactEmail)) fields.push('editorial.contactEmail');
  if (!clean(editorial.contactPerson)) fields.push('editorial.contactPerson');
  if (!clean(editorial.country)) fields.push('editorial.country');
  if (!delegates.length || delegates.length > MAX_DELEGATES) fields.push('delegates');
  delegates.slice(0,MAX_DELEGATES).forEach((delegate,index)=>{
    if (!clean(delegate.legalName)) fields.push(`delegates.${index}.legalName`);
    if (!clean(delegate.role)) fields.push(`delegates.${index}.role`);
    if (!validEmail(delegate.email)) fields.push(`delegates.${index}.email`);
    if (!clean(delegate.nationality)) fields.push(`delegates.${index}.nationality`);
  });
  if (!['flight_details','proforma_payment','self_arranged'].includes(clean(travel.model))) fields.push('travel.model');
  if (!clean(travel.departureAirport)) fields.push('travel.departureAirport');
  if (!declarations.accuracy) fields.push('declarations.accuracy');
  if (!declarations.privacy) fields.push('declarations.privacy');
  if (!declarations.travelResponsibility) fields.push('declarations.travelResponsibility');
  return {ok:fields.length===0,fields};
}

function normalizeEditorial(value={}) {
  return {
    officialName:clean(value.officialName),outletName:clean(value.outletName),mediaType:clean(value.mediaType),
    country:clean(value.country),city:clean(value.city),address:clean(value.address),website:clean(value.website),
    registrationId:clean(value.registrationId),taxId:clean(value.taxId),editorInChief:clean(value.editorInChief),
    contactPerson:clean(value.contactPerson),contactEmail:clean(value.contactEmail).toLowerCase(),contactPhone:clean(value.contactPhone),
    newsroomEmail:clean(value.newsroomEmail).toLowerCase(),language:clean(value.language)||'hr',notes:clean(value.notes)
  };
}

function normalizeDelegates(items=[]) {
  return items.slice(0,MAX_DELEGATES).map((value,index)=>({
    number:index+1,
    legalName:clean(value.legalName),
    accreditationName:clean(value.accreditationName)||clean(value.legalName),
    role:clean(value.role),
    customRole:clean(value.customRole),
    email:clean(value.email).toLowerCase(),phone:clean(value.phone),nationality:clean(value.nationality),
    dateOfBirth:clean(value.dateOfBirth),passportNameConfirmed:Boolean(value.passportNameConfirmed),
    departureAirport:clean(value.departureAirport),pressCardNumber:clean(value.pressCardNumber),
    dietary:clean(value.dietary),accessibility:clean(value.accessibility),emergencyContact:clean(value.emergencyContact),
    digitalAccreditationStatus:'pending',ticketStatus:'pending',hotelStatus:'pending'
  }));
}

function normalizeTravel(value={}) {
  return {
    model:clean(value.model),departureAirport:clean(value.departureAirport),destination:clean(value.destination)||'New York',
    outboundDate:clean(value.outboundDate),returnDate:clean(value.returnDate),preferredOutboundTime:clean(value.preferredOutboundTime),
    preferredReturnTime:clean(value.preferredReturnTime),airline:clean(value.airline),flightNumbers:clean(value.flightNumbers),
    itinerary:clean(value.itinerary),bookingClass:clean(value.bookingClass)||'Economy',baggage:clean(value.baggage),
    estimatedAmount:numberOrNull(value.estimatedAmount),currency:clean(value.currency)||'EUR',
    supplierName:clean(value.supplierName),supplierEmail:clean(value.supplierEmail),offerValidUntil:clean(value.offerValidUntil),
    paymentInstruction:clean(value.paymentInstruction),approvalRequired:true,
    organizerStatement:'Redakcija organizira ili predlaže put. GNK ASG kupuje odobrene karte ili plaća odobreni predračun; GNK ASG nije organizator putovanja.'
  };
}

function normalizeAccommodation(value={}) {
  return {
    hotelCovered:true,dateLabel:'od 6. do 8. – prema službenom pozivu',roomPreference:clean(value.roomPreference)||'single',
    roommate:clean(value.roommate),arrivalTime:clean(value.arrivalTime),departureTime:clean(value.departureTime),
    accessibility:clean(value.accessibility),specialRequests:clean(value.specialRequests)
  };
}

function normalizeAccreditation(value={}) {
  return {
    interviewRequests:clean(value.interviewRequests),equipment:clean(value.equipment),liveBroadcast:Boolean(value.liveBroadcast),
    filmingRequirements:clean(value.filmingRequirements),publicationPlan:clean(value.publicationPlan),socialChannels:clean(value.socialChannels),
    photoConsent:Boolean(value.photoConsent),pressLetterStatus:'pending',portraitStatus:'pending'
  };
}

function normalizeBilling(value={}) {
  return {
    legalName:clean(value.legalName),address:clean(value.address),taxId:clean(value.taxId),country:clean(value.country),
    contact:clean(value.contact),email:clean(value.email).toLowerCase(),iban:clean(value.iban),swift:clean(value.swift),notes:clean(value.notes)
  };
}

function normalizeDeclarations(value={}) {
  return {
    accuracy:Boolean(value.accuracy),privacy:Boolean(value.privacy),travelResponsibility:Boolean(value.travelResponsibility),
    paymentApproval:Boolean(value.paymentApproval),dataRetention:Boolean(value.dataRetention),submittedBy:clean(value.submittedBy)
  };
}

function initialMissingItems(payload) {
  const missing=[];
  const travel=payload?.travel||{};
  if (travel.model==='flight_details' && !clean(travel.flightNumbers) && !clean(travel.itinerary)) missing.push('Brojevi letova ili odabrani itinerar.');
  if (travel.model==='proforma_payment' && !(payload.documents||[]).some(d=>clean(d.category)==='proforma')) missing.push('Predračun prijevoznika ili agencije.');
  if (!clean(payload?.billing?.legalName)) missing.push('Podaci za plaćanje ili račun, ako je primjenjivo.');
  missing.push('Podaci putnih isprava tražit će se sigurnim putem tek nakon odobrenja prijave.');
  return missing;
}

async function publicApplicationStatus(request,env,id) {
  const application=await readApplication(env,id);
  if (!application) return json({ok:false,error:'application_not_found'},404);
  if (!await publicAccessAllowed(request,application)) return json({ok:false,error:'invalid_access_key'},401);
  return json({ok:true,version:VERSION,application:publicApplicationView(application)});
}

async function appendPublicDocuments(request,env,id) {
  const application=await readApplication(env,id);
  if (!application) return json({ok:false,error:'application_not_found'},404);
  if (!await publicAccessAllowed(request,application)) return json({ok:false,error:'invalid_access_key'},401);
  let payload;try{payload=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const stored=await storeDocuments(env,id,payload.documents||[],'supplement');
  application.documents=[...(application.documents||[]),...stored].slice(0,MAX_DOCUMENTS);
  application.updatedAt=new Date().toISOString();
  application.statusHistory.push({status:application.status,at:application.updatedAt,source:'public-document-upload',documents:stored.map(d=>d.category)});
  await saveApplication(env,application);
  await audit(env,'media-trip.documents.add',id,'success',{count:stored.length});
  return json({ok:true,version:VERSION,application:publicApplicationView(application),stored});
}

async function operatorList(request,env) {
  const url=new URL(request.url);
  const status=clean(url.searchParams.get('status'));
  const query=clean(url.searchParams.get('q')).toLowerCase();
  const index=await readIndex(env);
  let items=index;
  if (status) items=items.filter(item=>item.status===status);
  if (query) items=items.filter(item=>JSON.stringify(item).toLowerCase().includes(query));
  return json({ok:true,version:VERSION,count:items.length,items});
}

async function operatorSummary(env) {
  const items=await readIndex(env);
  const byStatus={};
  for(const item of items)byStatus[item.status]=(byStatus[item.status]||0)+1;
  return json({ok:true,version:VERSION,total:items.length,byStatus,maxDelegates:MAX_DELEGATES,hotelCovered:true,travelCovered:true,updatedAt:new Date().toISOString()});
}

async function updateApplicationStatus(request,env,id) {
  const application=await readApplication(env,id);
  if(!application)return json({ok:false,error:'application_not_found'},404);
  let payload;try{payload=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const status=clean(payload.status);
  if(!STATUS_VALUES.has(status))return json({ok:false,error:'invalid_status',allowed:[...STATUS_VALUES]},400);
  const now=new Date().toISOString();
  application.status=status;
  application.updatedAt=now;
  application.missingItems=Array.isArray(payload.missingItems)?payload.missingItems.map(clean).filter(Boolean).slice(0,30):application.missingItems;
  application.statusHistory.push({status,at:now,source:'operator',note:clean(payload.note)});
  await saveApplication(env,application);
  let notification=null;
  if(payload.notify===true)notification=await sendStatusNotification(env,application,clean(payload.message));
  await audit(env,'media-trip.application.status',id,'success',{status,notify:Boolean(payload.notify)});
  return json({ok:true,version:VERSION,application,notification});
}

async function addOperatorNote(request,env,id) {
  const application=await readApplication(env,id);
  if(!application)return json({ok:false,error:'application_not_found'},404);
  let payload;try{payload=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const note=clean(payload.note);
  if(!note)return json({ok:false,error:'note_required'},400);
  application.operatorNotes.push({id:crypto.randomUUID(),at:new Date().toISOString(),author:clean(payload.author)||'GNK ASG operator',note});
  application.updatedAt=new Date().toISOString();
  await saveApplication(env,application);
  await audit(env,'media-trip.application.note',id,'success',{});
  return json({ok:true,application});
}

async function updatePayment(request,env,id) {
  const application=await readApplication(env,id);
  if(!application)return json({ok:false,error:'application_not_found'},404);
  let payload;try{payload=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  application.payment={
    ...application.payment,
    status:clean(payload.status)||application.payment.status,
    model:clean(payload.model)||application.payment.model,
    supplier:clean(payload.supplier)||application.payment.supplier,
    reference:clean(payload.reference)||application.payment.reference,
    amount:numberOrNull(payload.amount)??application.payment.amount,
    currency:clean(payload.currency)||application.payment.currency,
    approvedAt:clean(payload.approvedAt)||application.payment.approvedAt,
    paidAt:clean(payload.paidAt)||application.payment.paidAt,
    note:clean(payload.note)||application.payment.note
  };
  application.updatedAt=new Date().toISOString();
  if(application.payment.status==='paid'&&!application.payment.paidAt)application.payment.paidAt=application.updatedAt;
  await saveApplication(env,application);
  await audit(env,'media-trip.application.payment',id,'success',{status:application.payment.status,amount:application.payment.amount,currency:application.payment.currency});
  return json({ok:true,application});
}

async function updateConfig(request,env) {
  let payload;try{payload=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const current=await getConfig(env);
  const next={...current,...payload,hotel:{...current.hotel,...(payload.hotel||{})},travel:{...current.travel,...(payload.travel||{})},maxDelegates:MAX_DELEGATES,updatedAt:new Date().toISOString()};
  await env.GNK_ASG_KV?.put(CONFIG_KEY,JSON.stringify(next));
  await audit(env,'media-trip.config.update','new-york-media-visit','success',{});
  return json({ok:true,config:next});
}

async function getConfig(env) {
  try{const raw=await env.GNK_ASG_KV?.get(CONFIG_KEY);if(raw)return{...DEFAULT_CONFIG,...JSON.parse(raw)};}catch{}
  return {...DEFAULT_CONFIG,updatedAt:null};
}

async function storeDocuments(env,applicationId,documents,phase) {
  const source=Array.isArray(documents)?documents.slice(0,MAX_DOCUMENTS):[];
  let total=0;
  const stored=[];
  for(const item of source){
    const base64=clean(item.base64).replace(/\s+/g,'');
    if(!base64)continue;
    const type=clean(item.mimeType||item.type).toLowerCase();
    const filename=safeFilename(item.filename||item.name||'document');
    const size=Number(item.size||Math.floor(base64.length*0.75));
    if(!ALLOWED_DOCUMENT_TYPES.has(type))throw new Error(`Nedopuštena vrsta dokumenta: ${type}`);
    total+=size;
    if(total>MAX_TOTAL_DOCUMENT_BYTES)throw new Error('Ukupna veličina dokumenata prelazi 18 MB.');
    const key=`media-trip/${applicationId}/${phase}/${crypto.randomUUID()}-${filename}`;
    if(!env.GNK_ASG_MEDIA_ASSETS?.put)throw new Error('R2 spremište nije dostupno.');
    await env.GNK_ASG_MEDIA_ASSETS.put(key,base64ToBytes(base64),{httpMetadata:{contentType:type},customMetadata:{applicationId,phase,category:clean(item.category)||'other',uploadedAt:new Date().toISOString()}});
    stored.push({id:crypto.randomUUID(),category:clean(item.category)||'other',filename,type,size,key,phase,uploadedAt:new Date().toISOString()});
  }
  return stored;
}

async function saveApplication(env,application) {
  if(!env.GNK_ASG_KV?.put)throw new Error('GNK_ASG_KV nije dostupan.');
  await env.GNK_ASG_KV.put(`media-trip:application:${application.id}`,JSON.stringify(application));
  const index=await readIndex(env);
  const summary=applicationSummary(application);
  const next=[summary,...index.filter(item=>item.id!==application.id)].slice(0,2000);
  await env.GNK_ASG_KV.put(INDEX_KEY,JSON.stringify(next));
}

async function readApplication(env,id) {
  try{const raw=await env.GNK_ASG_KV?.get(`media-trip:application:${id}`);return raw?JSON.parse(raw):null;}catch{return null;}
}

async function readIndex(env) {
  try{const raw=await env.GNK_ASG_KV?.get(INDEX_KEY);return raw?JSON.parse(raw):[];}catch{return[];}
}

function applicationSummary(a) {
  return {id:a.id,createdAt:a.createdAt,updatedAt:a.updatedAt,status:a.status,outletName:a.editorial.outletName,officialName:a.editorial.officialName,country:a.editorial.country,contactPerson:a.editorial.contactPerson,contactEmail:a.editorial.contactEmail,delegates:a.delegates.length,travelModel:a.travel.model,departureAirport:a.travel.departureAirport,estimatedAmount:a.travel.estimatedAmount,currency:a.travel.currency,paymentStatus:a.payment.status,missingItems:a.missingItems.length};
}

function publicApplicationView(a) {
  return {id:a.id,createdAt:a.createdAt,updatedAt:a.updatedAt,status:a.status,outletName:a.editorial.outletName,delegates:a.delegates.map(d=>({legalName:d.legalName,role:d.role,digitalAccreditationStatus:d.digitalAccreditationStatus,ticketStatus:d.ticketStatus,hotelStatus:d.hotelStatus})),travel:{model:a.travel.model,departureAirport:a.travel.departureAirport,outboundDate:a.travel.outboundDate,returnDate:a.travel.returnDate},hotel:a.accommodation,payment:{status:a.payment.status,amount:a.payment.amount,currency:a.payment.currency},missingItems:a.missingItems,documents:(a.documents||[]).map(d=>({category:d.category,filename:d.filename,uploadedAt:d.uploadedAt}))};
}

async function publicAccessAllowed(request,application) {
  const url=new URL(request.url);
  const access=clean(url.searchParams.get('access')||request.headers.get('x-application-access'));
  return Boolean(access&&safeEqual(await sha256(access),application.accessHash));
}

async function sendRegistrationNotifications(env,application,receipt) {
  const internalTo=clean(env.MEDIA_TRIP_INTERNAL_TO)||'rht@gmx.com';
  const publicLink=`https://gnk-asg.hr/media-trip-registration/?application=${encodeURIComponent(application.id)}`;
  const internalBody=[
    'Zaprimljena je nova prijava redakcije za New York.',
    '',`Evidencijski broj: ${application.id}`,`Redakcija: ${application.editorial.outletName}`,`Službeni naziv: ${application.editorial.officialName}`,`Država: ${application.editorial.country}`,`Kontakt: ${application.editorial.contactPerson} <${application.editorial.contactEmail}>`,`Broj osoba: ${application.delegates.length}`,`Model putovanja: ${application.travel.model}`,`Polazna zračna luka: ${application.travel.departureAirport}`,`Procijenjeni trošak: ${application.travel.estimatedAmount??'-'} ${application.travel.currency}`,`Dokumenti: ${(application.documents||[]).map(d=>d.category+': '+d.filename).join(', ')||'nema'}`,`Administracija: ${publicLink}`
  ].join('\n');
  const applicantBody=[
    `Poštovani/Poštovana ${application.editorial.contactPerson},`,'',
    `zaprimili smo prijavu redakcije ${application.editorial.outletName} za program u New Yorku.`,
    '',`Evidencijski broj: ${application.id}`,
    `Prijavljene osobe: ${application.delegates.length}`,
    'Hotel je osiguran od 6. do 8., prema datumima iz službenog poziva.',
    'Redakcija samostalno organizira ili predlaže putovanje. Nakon odobrenja GNK ASG kupuje odabrane karte ili izravno plaća odobreni predračun prijevoznika ili agencije.',
    '',
    'Ne kupujte nepovratne karte bez pisanog odobrenja troška.',
    'Podatke putnih isprava dostavljat ćete sigurnim putem tek nakon odobrenja.',
    '',
    'U privitku se nalazi PDF potvrda prijave.'
  ].join('\n');
  const attachment={filename:receipt.filename,mimeType:'application/pdf',size:receipt.size,base64:receipt.base64};
  const result={internal:null,applicant:null};
  try{result.internal=await sendManualMail(env,{from:'media@gnk-asg.hr',fromName:'GNK ASG Media Desk',to:internalTo,subject:`[${application.id}] Nova prijava redakcije – ${application.editorial.outletName}`,body:internalBody,language:'hr',signatureProfile:'media',caseId:application.id,attachments:[attachment]});}catch(error){result.internal={ok:false,error:String(error?.message||error)};}
  try{result.applicant=await sendManualMail(env,{from:'media@gnk-asg.hr',fromName:'GNK ASG Media Desk',to:application.editorial.contactEmail,subject:`[${application.id}] Potvrda prijave redakcije za New York`,body:applicantBody,language:application.editorial.language||'hr',signatureProfile:'media',caseId:application.id,attachments:[attachment]});}catch(error){result.applicant={ok:false,error:String(error?.message||error)};}
  return result;
}

async function sendStatusNotification(env,application,customMessage) {
  const body=customMessage||[`Poštovani/Poštovana ${application.editorial.contactPerson},`,'',`status prijave ${application.id} promijenjen je u: ${application.status}.`,'',application.missingItems.length?'Potrebna dopuna:\n- '+application.missingItems.join('\n- '):'Trenutačno nisu evidentirane dodatne obvezne dopune.'].join('\n');
  const receipt=buildReceiptPdf(application);
  try{return await sendManualMail(env,{from:'media@gnk-asg.hr',fromName:'GNK ASG Media Desk',to:application.editorial.contactEmail,subject:`[${application.id}] Status prijave: ${application.status}`,body,language:application.editorial.language||'hr',signatureProfile:'media',caseId:application.id,attachments:[{filename:receipt.filename,mimeType:'application/pdf',size:receipt.size,base64:receipt.base64}]});}catch(error){return{ok:false,error:String(error?.message||error)};}
}

function buildReceiptPdf(application) {
  const lines=[
    'GNK ASG - POTVRDA PRIJAVE REDAKCIJE',
    `Evidencijski broj: ${application.id}`,
    `Redakcija: ${application.editorial.outletName}`,
    `Sluzbeni naziv: ${application.editorial.officialName}`,
    `Kontakt: ${application.editorial.contactPerson}`,
    `Broj prijavljenih osoba: ${application.delegates.length}`,
    `Odrediste: New York`,
    `Hotel: osiguran od 6. do 8. prema sluzbenom pozivu`,
    `Model putovanja: ${application.travel.model}`,
    `Status: ${application.status}`,
    'Redakcija organizira ili predlaze put; GNK ASG kupuje odobrene karte ili placa odobreni predracun.'
  ];
  return simplePdf(lines,`GNK_ASG_${application.id}_potvrda.pdf`);
}

function simplePdf(lines,filename) {
  const ascii=lines.map(v=>asciiText(v).slice(0,110));
  const commands=['BT','/F1 15 Tf','54 785 Td'];
  ascii.forEach((line,index)=>{if(index===1)commands.push('/F1 10 Tf');if(index>0)commands.push('0 -26 Td');commands.push(`(${pdfEscape(line)}) Tj`);});
  commands.push('ET');
  const stream=commands.join('\n');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`];
  let pdf='%PDF-1.4\n';const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(new TextEncoder().encode(pdf).length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=new TextEncoder().encode(pdf).length;
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;offsets.slice(1).forEach(offset=>{pdf+=`${String(offset).padStart(10,'0')} 00000 n \n`;});
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes=new TextEncoder().encode(pdf);return{filename,size:bytes.length,base64:bytesToBase64(bytes)};
}

async function exportCsv(env) {
  const items=await readIndex(env);
  const headers=['id','createdAt','status','outletName','officialName','country','contactPerson','contactEmail','delegates','travelModel','departureAirport','estimatedAmount','currency','paymentStatus','missingItems'];
  const rows=[headers.join(','),...items.map(item=>headers.map(key=>csv(item[key])).join(','))];
  return new Response(rows.join('\r\n'),{status:200,headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="GNK_ASG_New_York_media_applications.csv"','cache-control':'no-store'}});
}

async function rateLimit(request,env) {
  if(!env.GNK_ASG_KV?.get||!env.GNK_ASG_KV?.put)return{ok:true};
  const ip=clean(request.headers.get('cf-connecting-ip')||'unknown');
  const day=new Date().toISOString().slice(0,10);
  const key=`media-trip:rate:${day}:${(await sha256(ip)).slice(0,24)}`;
  const count=Number(await env.GNK_ASG_KV.get(key)||0);
  if(count>=5)return{ok:false,count};
  await env.GNK_ASG_KV.put(key,String(count+1),{expirationTtl:172800});
  return{ok:true,count:count+1};
}

async function audit(env,action,entityId,result,metadata) {
  try{await writeOperatorAuditLog(env,{action,entityType:'media-trip-application',entityId,result,metadata});}catch{}
}

function randomAccessKey(){const bytes=crypto.getRandomValues(new Uint8Array(24));return bytesToBase64(bytes).replace(/[+/=]/g,'').slice(0,32);}
async function sha256(value){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function safeEqual(a,b){a=String(a||'');b=String(b||'');let mismatch=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)mismatch|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return mismatch===0;}
function bytesToBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}
function base64ToBytes(value){const binary=atob(value);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
function safeFilename(value){return clean(value||'document').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,140);}
function clean(value){return String(value??'').trim();}
function numberOrNull(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));}
function asciiText(value){return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,m=>m==='Đ'?'D':'d').replace(/[^\x20-\x7E]/g,' ');}
function pdfEscape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function csv(value){const text=Array.isArray(value)?value.join(' | '):String(value??'');return `"${text.replace(/"/g,'""')}"`;}
function corsHeaders(){return{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-operator-token,x-application-access'};}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...corsHeaders()}});}
