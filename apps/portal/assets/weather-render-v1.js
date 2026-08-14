(function(){
'use strict';
// GNK ASG — Weather widget renderer (Zagreb) za AKTUAL MEDIA.
// Defense-in-depth freshness: klijent sam računa starost iz updated_at.
// Time-to-live: fresh <= 180 min, aging 120-180 min, stale > 180 min,
// unavailable ako je timestamp nevažeći ili je snapshot ekstremno star (> 24 h).
function isEnglish(){
  return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ||
    /\/en\//.test(location.pathname) || /\/en$/.test(location.pathname);
}
var en = isEnglish();
var MAX_AGE_MIN = 180;
var AGING_MIN = 120;
var UNAVAILABLE_MIN = 1440;

var WMO_ICON = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',55:'🌦️',56:'🌧️',57:'🌧️',
  61:'🌧️',63:'🌧️',65:'🌧️',66:'🌧️',67:'🌧️',
  71:'🌨️',73:'🌨️',75:'❄️',77:'❄️',
  80:'🌦️',81:'🌧️',82:'⛈️',85:'🌨️',86:'❄️',
  95:'⛈️',96:'⛈️',99:'⛈️'
};
function icon(code){ return WMO_ICON[code] || '🌡️'; }
function ageMinutes(iso){
  var t = Date.parse(iso || '');
  if (!isFinite(t)) return Infinity;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}
function effectiveState(data){
  var age = ageMinutes(data && data.updated_at);
  if (!isFinite(age) || age > UNAVAILABLE_MIN || (data && data.state === 'unavailable')) return 'unavailable';
  if (age > MAX_AGE_MIN || (data && data.state === 'stale')) return 'stale';
  if (age >= AGING_MIN) return 'aging';
  return 'live';
}
function fmtTime(iso){
  try { return new Date(iso).toLocaleString(en ? 'en-GB' : 'hr-HR', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }); }
  catch(e){ return ''; }
}
function fmtDay(dateStr){
  try { return new Date(dateStr + 'T12:00:00').toLocaleDateString(en ? 'en-GB' : 'hr-HR', { weekday:'short' }); }
  catch(e){ return dateStr; }
}
function render(data){
  var root=document.getElementById('akWeather'), body=document.getElementById('akWeatherBody'), updatedEl=document.getElementById('akWeatherUpdated');
  if(!root||!body||!updatedEl)return;
  root.classList.remove('state-stale','state-unavailable','state-aging');
  var state=effectiveState(data||{}), age=ageMinutes(data&&data.updated_at);
  if(state==='unavailable'){
    root.classList.add('state-unavailable');
    updatedEl.textContent=en?'Unavailable — snapshot too old':'Nedostupno — snapshot je prestar';
    body.innerHTML='<span>'+(en?'Weather snapshot is too old to present as current.':'Vremenski snapshot je prestar da bi se prikazivao kao aktualan.')+'</span>';
    return;
  }
  var cur=data.current;
  if(!cur){
    root.classList.add('state-unavailable');
    updatedEl.textContent=en?'Unavailable':'Nedostupno';
    body.innerHTML='<span>'+(en?'Weather data is temporarily unavailable.':'Vremenski podaci trenutno nisu dostupni.')+'</span>';
    return;
  }
  if(state==='stale')root.classList.add('state-stale');
  if(state==='aging')root.classList.add('state-aging');
  var prefix=state==='live'?(en?'Updated: ':'Ažurirano: '):state==='aging'?(en?'Aging snapshot: ':'Snapshot stari: '):(en?'Last known: ':'Zadnje poznato: ');
  updatedEl.textContent=prefix+fmtTime(data.updated_at)+(isFinite(age)?' · '+age+' min':'');
  var forecastHtml=(data.forecast||[]).slice(1).map(function(d){return '<div class="ak-weather-day"><b>'+icon(d.weather_code)+' '+Math.round(d.max_c)+'°</b>'+fmtDay(d.date)+' · '+Math.round(d.min_c)+'°</div>';}).join('');
  body.innerHTML='<span class="ak-weather-temp">'+icon(cur.weather_code)+' '+Math.round(cur.temperature_c)+'°C</span><div><div class="ak-weather-cond">'+(en?cur.condition_en:cur.condition_hr)+'</div><div class="ak-weather-meta"><span>'+(en?'Feels like':'Osjeća se kao')+' '+Math.round(cur.feels_like_c)+'°C</span><span>'+(en?'Humidity':'Vlaga')+' '+cur.humidity_pct+'%</span><span>'+(en?'Wind':'Vjetar')+' '+Math.round(cur.wind_kmh)+' km/h</span></div></div>';
  if(forecastHtml)body.insertAdjacentHTML('beforeend','<div class="ak-weather-forecast" style="width:100%">'+forecastHtml+'</div>');
  body.insertAdjacentHTML('beforeend','<span class="ak-weather-source" style="width:100%">'+(en?'Source: ':'Izvor: ')+'<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a></span>');
}
fetch('/data/weather-zagreb.json?v='+Date.now(),{cache:'no-store'})
.then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
.then(render)
.catch(function(){var root=document.getElementById('akWeather'),body=document.getElementById('akWeatherBody'),updatedEl=document.getElementById('akWeatherUpdated');if(!root||!body||!updatedEl)return;root.classList.add('state-unavailable');updatedEl.textContent=en?'Unavailable':'Nedostupno';body.innerHTML='<span>'+(en?'Weather data is temporarily unavailable. Please check back later.':'Vremenski podaci trenutno nisu dostupni. Pokušajte kasnije.')+'</span>';});
})();
