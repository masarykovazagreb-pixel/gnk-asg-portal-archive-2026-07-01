export const VERSION='GNK_ASG_EMAIL_STATUS_DATE_WINDOW_V1_20260703';
export const DEFAULT_TIME_ZONE='Europe/Zagreb';

function zonedParts(date,timeZone=DEFAULT_TIME_ZONE){
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const parts=Object.fromEntries(formatter.formatToParts(date).filter(item=>item.type!=='literal').map(item=>[item.type,Number(item.value)]));
 return{year:parts.year,month:parts.month,day:parts.day,hour:parts.hour,minute:parts.minute,second:parts.second};
}
function zoneOffsetMs(date,timeZone=DEFAULT_TIME_ZONE){
 const value=new Date(Math.floor(date.getTime()/1000)*1000),parts=zonedParts(value,timeZone);
 return Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)-value.getTime();
}
function localMidnightUtc(year,month,day,timeZone=DEFAULT_TIME_ZONE){
 const target=Date.UTC(year,month-1,day,0,0,0);let instant=target;
 for(let attempt=0;attempt<3;attempt+=1)instant=target-zoneOffsetMs(new Date(instant),timeZone);
 return new Date(instant);
}
export function emailStatusDayWindow(reference=new Date(),timeZone=DEFAULT_TIME_ZONE){
 const current=zonedParts(reference,timeZone),nextDate=new Date(Date.UTC(current.year,current.month-1,current.day)+86400000);
 const start=localMidnightUtc(current.year,current.month,current.day,timeZone),end=localMidnightUtc(nextDate.getUTCFullYear(),nextDate.getUTCMonth()+1,nextDate.getUTCDate(),timeZone);
 return{key:'today',timeZone,localDate:`${current.year}-${String(current.month).padStart(2,'0')}-${String(current.day).padStart(2,'0')}`,start:start.toISOString(),end:end.toISOString()};
}
