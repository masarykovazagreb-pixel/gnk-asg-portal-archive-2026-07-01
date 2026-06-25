const clean=value=>String(value??'').trim();
const value=(form,key)=>clean(form.get(key));
const checked=(form,key)=>['on','yes','true','1'].includes(value(form,key).toLowerCase());

export async function adaptPublicForm(request){
  let form;
  try{form=await request.formData();}
  catch{return{ok:false,status:400,error:'invalid_form',message:'Obrazac nije pravilno poslan.'};}

  const delegates=[];
  for(let index=0;index<3;index+=1){
    const legalName=value(form,`dName${index}`);
    if(!legalName)continue;
    delegates.push({
      legalName,
      accreditationName:value(form,`dBadge${index}`),
      role:value(form,`dRole${index}`),
      customRole:value(form,`dCustomRole${index}`),
      email:value(form,`dEmail${index}`),
      phone:value(form,`dPhone${index}`),
      nationality:value(form,`dNationality${index}`),
      dateOfBirth:value(form,`dBirth${index}`),
      departureAirport:value(form,`dAirport${index}`),
      pressCardNumber:value(form,`dPressCard${index}`),
      dietary:value(form,`dDiet${index}`),
      accessibility:value(form,`dAccess${index}`),
      emergencyContact:value(form,`dEmergency${index}`),
      passportNameConfirmed:checked(form,`dPassportName${index}`)
    });
  }

  let documents=[];
  try{
    const raw=value(form,'documentsJson');
    documents=raw?JSON.parse(raw):[];
  }catch{return{ok:false,status:400,error:'invalid_documents',message:'Popis dokumenata nije ispravan.'};}

  return{ok:true,payload:{
    website:value(form,'website'),
    eventCode:'new-york-media-visit',
    editorial:{
      officialName:value(form,'officialName'),outletName:value(form,'outletName'),mediaType:value(form,'mediaType'),
      country:value(form,'country'),city:value(form,'city'),address:value(form,'address'),website:value(form,'websiteUrl'),
      registrationId:value(form,'registrationId'),taxId:value(form,'taxId'),editorInChief:value(form,'editorInChief'),
      contactPerson:value(form,'contactPerson'),contactEmail:value(form,'contactEmail'),contactPhone:value(form,'contactPhone'),
      newsroomEmail:value(form,'newsroomEmail'),language:value(form,'language'),notes:value(form,'editorialNotes')
    },
    delegates,
    travel:{
      model:value(form,'travelModel'),departureAirport:value(form,'departureAirport'),destination:'New York',
      outboundDate:value(form,'outboundDate'),returnDate:value(form,'returnDate'),
      preferredOutboundTime:value(form,'preferredOutboundTime'),preferredReturnTime:value(form,'preferredReturnTime'),
      airline:value(form,'airline'),flightNumbers:value(form,'flightNumbers'),itinerary:value(form,'itinerary'),
      bookingClass:value(form,'bookingClass'),baggage:value(form,'baggage'),estimatedAmount:value(form,'estimatedAmount'),
      currency:value(form,'currency'),supplierName:value(form,'supplierName'),supplierEmail:value(form,'supplierEmail'),
      offerValidUntil:value(form,'offerValidUntil'),paymentInstruction:value(form,'paymentInstruction')
    },
    accommodation:{
      roomPreference:value(form,'roomPreference'),roommate:value(form,'roommate'),arrivalTime:value(form,'arrivalTime'),
      departureTime:value(form,'departureTime'),accessibility:value(form,'hotelAccessibility'),specialRequests:value(form,'specialRequests')
    },
    accreditation:{
      interviewRequests:value(form,'interviewRequests'),equipment:value(form,'equipment'),
      filmingRequirements:value(form,'filmingRequirements'),publicationPlan:value(form,'publicationPlan'),
      socialChannels:value(form,'socialChannels'),liveBroadcast:checked(form,'liveBroadcast'),photoConsent:checked(form,'photoConsent')
    },
    billing:{
      legalName:value(form,'billingLegalName'),taxId:value(form,'billingTaxId'),address:value(form,'billingAddress'),
      country:value(form,'billingCountry'),contact:value(form,'billingContact'),email:value(form,'billingEmail'),
      iban:value(form,'billingIban'),swift:value(form,'billingSwift'),notes:value(form,'billingNotes')
    },
    declarations:{
      accuracy:checked(form,'accuracy'),privacy:checked(form,'privacy'),travelResponsibility:checked(form,'travelResponsibility'),
      paymentApproval:checked(form,'paymentApproval'),dataRetention:checked(form,'dataRetention'),submittedBy:value(form,'submittedBy')
    },
    documents:Array.isArray(documents)?documents:[]
  }};
}

export function resultPage(data,status=200){
  const ok=Boolean(data?.ok);
  const id=escapeHtml(data?.applicationId||'');
  const access=encodeURIComponent(data?.accessKey||'');
  const statusLink=id&&access?`/media-trip-registration/?application=${encodeURIComponent(id)}&access=${access}`:'/media-trip-registration/';
  const title=ok?'Prijava je zaprimljena':'Prijava nije spremljena';
  const message=ok
    ?`Redakcijska prijava evidentirana je pod brojem <strong>${id}</strong>. Potvrda se šalje na navedeni kontaktni e-mail kada je e-mail usluga dostupna.`
    :escapeHtml(data?.message||data?.error||'Dogodila se pogreška pri spremanju prijave.');
  return new Response(`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 15% 0,#17375f,#06101f 48%,#020812);color:#fff;font-family:Arial}.card{width:min(680px,calc(100% - 30px));padding:28px;border:1px solid #d5aa3d;border-radius:22px;background:#0b1b30;box-shadow:0 30px 90px #0008}h1{color:#f4d37a;font-family:Georgia,serif}p{color:#d5deea;line-height:1.65}.id{padding:14px;border:1px solid #d5aa3d55;border-radius:14px;background:#06101f;word-break:break-word}a{display:inline-flex;margin:9px 8px 0 0;padding:11px 15px;border:1px solid #d5aa3d;border-radius:999px;color:#fff;text-decoration:none;font-weight:800}.primary{background:linear-gradient(135deg,#b88927,#f4d37a);color:#06101f}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p>${ok?`<div class="id"><b>Evidencijski broj:</b> ${id}</div>`:''}<a class="primary" href="${statusLink}">${ok?'Privatni status prijave':'Povratak na obrazac'}</a><a href="/">GNK ASG portal</a></main></body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
}

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
