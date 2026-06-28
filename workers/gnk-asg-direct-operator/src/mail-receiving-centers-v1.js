export const VERSION='GNK_ASG_MAIL_RECEIVING_CENTERS_V1_20260628';

export const RECEIVING_CENTERS=Object.freeze([
  {id:'zagreb',code:'ZAG',cityHr:'Zagreb',cityEn:'Zagreb',countryHr:'Hrvatska',countryEn:'Croatia',timeZone:'Europe/Zagreb'},
  {id:'boulder',code:'BOU',cityHr:'Boulder',cityEn:'Boulder',countryHr:'SAD',countryEn:'United States',timeZone:'America/Denver'},
  {id:'budapest',code:'BUD',cityHr:'Budimpešta',cityEn:'Budapest',countryHr:'Mađarska',countryEn:'Hungary',timeZone:'Europe/Budapest'},
  {id:'toronto',code:'TOR',cityHr:'Toronto',cityEn:'Toronto',countryHr:'Kanada',countryEn:'Canada',timeZone:'America/Toronto'},
  {id:'sao-paulo',code:'SAO',cityHr:'São Paulo',cityEn:'São Paulo',countryHr:'Brazil',countryEn:'Brazil',timeZone:'America/Sao_Paulo'},
  {id:'dubai',code:'DXB',cityHr:'Dubai',cityEn:'Dubai',countryHr:'UAE',countryEn:'UAE',timeZone:'Asia/Dubai'},
  {id:'singapore',code:'SIN',cityHr:'Singapur',cityEn:'Singapore',countryHr:'Singapur',countryEn:'Singapore',timeZone:'Asia/Singapore'},
  {id:'tokyo',code:'TYO',cityHr:'Tokio',cityEn:'Tokyo',countryHr:'Japan',countryEn:'Japan',timeZone:'Asia/Tokyo'},
  {id:'nairobi',code:'NBO',cityHr:'Nairobi',cityEn:'Nairobi',countryHr:'Kenija',countryEn:'Kenya',timeZone:'Africa/Nairobi'},
  {id:'sydney',code:'SYD',cityHr:'Sydney',cityEn:'Sydney',countryHr:'Australija',countryEn:'Australia',timeZone:'Australia/Sydney'}
]);

function hashSeed(value){
  let hash=2166136261;
  for(const char of String(value||'GNK-ASG')){
    hash^=char.codePointAt(0);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}

export function assignReceivingCenter(seed){
  const center=RECEIVING_CENTERS[hashSeed(seed)%RECEIVING_CENTERS.length];
  return{...center,type:'digital-communications-node',version:VERSION};
}

export function centerLabel(center,language='hr'){
  const english=String(language).toLowerCase().startsWith('en');
  return english
    ? `${center.cityEn}, ${center.countryEn} · Digital Communications Intake Center ${center.code}`
    : `${center.cityHr}, ${center.countryHr} · Digitalni centar zaprimanja ${center.code}`;
}
