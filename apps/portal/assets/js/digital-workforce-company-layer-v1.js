(()=>{
'use strict';
const base=window.GNKDigitalWorkforceDirectory;
if(!base||!Array.isArray(base.profiles)||window.__GNK_COMPANY_LAYER_V1__)return;
window.__GNK_COMPANY_LAYER_V1__=true;
const companies=[
['Ljubljana','Slovenia','Europe','Europe/Ljubljana','Slovenian, English'],['Budapest','Hungary','Europe','Europe/Budapest','Hungarian, English'],['Belgrade 1','Serbia','Europe','Europe/Belgrade','Serbian, English'],['Belgrade 2','Serbia','Europe','Europe/Belgrade','Serbian, English'],['Belgrade 3','Serbia','Europe','Europe/Belgrade','Serbian, English'],['Belgrade 4','Serbia','Europe','Europe/Belgrade','Serbian, English'],['Vancouver','Canada','North America','America/Vancouver','English, French'],['Toronto','Canada','North America','America/Toronto','English, French'],['Mexico City','Mexico','North America','America/Mexico_City','Spanish, English'],['Panama City','Panama','North America','America/Panama','Spanish, English'],['Bogotá','Colombia','South America','America/Bogota','Spanish, English'],['Lima','Peru','South America','America/Lima','Spanish, English'],['Santiago','Chile','South America','America/Santiago','Spanish, English'],['São Paulo','Brazil','South America','America/Sao_Paulo','Portuguese, English'],['Buenos Aires','Argentina','South America','America/Argentina/Buenos_Aires','Spanish, English'],['Dubai','United Arab Emirates','Asia','Asia/Dubai','Arabic, English'],['Mumbai','India','Asia','Asia/Kolkata','Hindi, English'],['Singapore','Singapore','Asia','Asia/Singapore','English'],['Jakarta','Indonesia','Asia','Asia/Jakarta','Indonesian, English'],['Beijing','China','Asia','Asia/Shanghai','Chinese, English'],['Seoul','South Korea','Asia','Asia/Seoul','Korean, English'],['Tokyo','Japan','Asia','Asia/Tokyo','Japanese, English'],['Kuala Lumpur','Malaysia','Asia','Asia/Kuala_Lumpur','Malay, English'],['Hong Kong','Hong Kong','Asia','Asia/Hong_Kong','Chinese, English'],['Casablanca','Morocco','Africa','Africa/Casablanca','Arabic, French, English'],['Lagos','Nigeria','Africa','Africa/Lagos','English'],['Nairobi','Kenya','Africa','Africa/Nairobi','English, Swahili'],['Johannesburg','South Africa','Africa','Africa/Johannesburg','English'],['Cape Town','South Africa','Africa','Africa/Johannesburg','English'],['Sydney','Australia','Oceania','Australia/Sydney','English'],['Auckland','New Zealand','Oceania','Pacific/Auckland','English'],['San José','Costa Rica','North America','America/Costa_Rica','Spanish, English'],['Quito','Ecuador','South America','America/Guayaquil','Spanish, English'],['Montevideo','Uruguay','South America','America/Montevideo','Spanish, English'],['Doha','Qatar','Asia','Asia/Qatar','Arabic, English'],['Bangkok','Thailand','Asia','Asia/Bangkok','Thai, English'],['Manila','Philippines','Asia','Asia/Manila','Filipino, English'],['Ho Chi Minh','Vietnam','Asia','Asia/Ho_Chi_Minh','Vietnamese, English'],['Accra','Ghana','Africa','Africa/Accra','English'],['Kigali','Rwanda','Africa','Africa/Kigali','English, French'],['Port Louis','Mauritius','Africa','Indian/Mauritius','English, French'],['Dar es Salaam','Tanzania','Africa','Africa/Dar_es_Salaam','English, Swahili'],['Perth','Australia','Oceania','Australia/Perth','English']
].map((row,index)=>{
 const slot=`GNK${String(index+1).padStart(2,'0')}`;
 const code=row[0]==='Singapore'?'3047':null;
 return Object.freeze({slot,city:row[0],country:row[1],region:row[2],timezone:row[3],languages:row[4],verifiedCode:code,codeStatus:code?'verified':'not-set',publicName:code?`GNK ${code} ${row[0]}`:`GNK [CODE NOT SET] ${row[0]}`});
});
const companyBySlot=new Map(companies.map(item=>[item.slot,item]));
const parts=timezone=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(item=>item.type!=='literal').map(item=>[item.type,item.value]));
function availability(timezone,operatingStatus){
 const value=parts(timezone),hour=Number(value.hour),weekend=['Sat','Sun'].includes(value.weekday),onCall=['active','busy'].includes(String(operatingStatus));
 let status='offline';
 if(!weekend&&hour>=8&&hour<18)status='available';
 else if(!weekend&&((hour>=7&&hour<8)||(hour>=18&&hour<20)))status='limited';
 else if(onCall)status='on-call';
 const next=status==='available'||status==='limited'?'now':weekend?'next business day 08:00':'08:00 local';
 return{status,localTime:`${value.weekday} ${value.hour}:${value.minute}`,nextAvailability:next};
}
const profiles=base.profiles.map(profile=>{
 const company=companyBySlot.get(profile.entitySlot)||companies[0],live=availability(company.timezone,profile.status);
 return Object.freeze({...profile,companyPublicName:company.publicName,companyCode:company.verifiedCode,companyCodeStatus:company.codeStatus,companyCity:company.city,companyCountry:company.country,companyRegion:company.region,timezone:company.timezone,languages:company.languages,countryRegion:`${company.country} · ${company.region}`,localTime:live.localTime,availability:live.status,nextAvailability:live.nextAvailability,proposalCapability:'enabled',delegatedDecisionCapability:'routine-and-managed',companyPublicationCapability:'approval-gated',counterpartyVisibility:'hidden',privateAssignmentVisibility:'hidden'});
});
window.GNKDigitalWorkforceDirectory=Object.freeze({...base,version:`${base.version}+company-layer-v1`,companyCount:45,operatingCompanyCount:43,companies:Object.freeze(companies),specialEntities:Object.freeze([{publicName:'GNK DINAMO Ltd. Group',type:'group',city:'Boulder',country:'United States'},{publicName:'GNK ASG d.o.o.',type:'named operating company',city:'Zagreb',country:'Croatia'}]),availabilityFor:availability,profiles:Object.freeze(profiles)});
})();
