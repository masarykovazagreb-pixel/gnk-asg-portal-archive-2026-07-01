(function(){
'use strict';
var state={geo:null,facts:null,selected:'boulder',weatherController:null};
function byId(id){return document.getElementById(id);}
function english(){return document.documentElement.lang==='en'||/\/en(?:\/|$)/.test(window.location.pathname);}
function label(hr,en){return english()?en:hr;}
function addCss(path){if(document.querySelector('link[href*="'+path+'"]'))return;var link=document.createElement('link');link.rel='stylesheet';link.href='/assets/'+path+'?v=20260526-recovery01';document.head.appendChild(link);}
function json(path){return fetch('/data/'+path+'?v='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});}
function position(id){if(!state.geo)return null;return id==='boulder'?state.geo.center:state.geo.nodes&&state.geo.nodes[id];}
function fact(id){return state.facts&&state.facts.locations&&state.facts.locations[id];}
function dock(){
 var layout=document.querySelector('#global-network .network-layout');
 if(!layout)return null;
 layout.classList.add('has-location-context');
 var host=byId('networkLocationContext');
 if(!host){host=document.createElement('section');host.id='networkLocationContext';host.className='location-context-dock';layout.appendChild(host);}
 host.classList.add('portal-context-grid');
 var demographics=document.querySelector('#global-network .network-sidebar');
 if(demographics&&demographics.parentElement!==host)host.insertBefore(demographics,host.firstChild);
 return host;
}
function mapPanel(){
 var host=dock(); if(!host)return null;
 var map=byId('googleLocationMap');
 if(!map){map=document.createElement('section');map.id='googleLocationMap';map.className='google-location-map';host.appendChild(map);}
 return map;
}
function weatherPanel(){
 var host=dock(); if(!host)return null;
 var panel=byId('locationWeatherPanel');
 if(!panel){panel=document.createElement('section');panel.id='locationWeatherPanel';panel.className='location-weather-panel';host.appendChild(panel);}
 return panel;
}
function order(){
 var host=dock(), demographics=document.querySelector('#global-network .network-sidebar'), map=mapPanel(), weather=weatherPanel();
 if(!host)return;
 if(demographics&&host.firstElementChild!==demographics)host.insertBefore(demographics,host.firstChild);
 if(map&&map.previousElementSibling!==demographics){if(demographics)demographics.insertAdjacentElement('afterend',map);else host.insertBefore(map,host.firstChild);}
 if(weather&&weather.previousElementSibling!==map)map.insertAdjacentElement('afterend',weather);
}
function renderMap(id){
 var map=mapPanel(), pos=position(id), f=fact(id); if(!map)return;
 if(!pos){map.innerHTML='<header class="google-location-head"><div><small>Google Maps</small><strong>'+label('Odabrana lokacija','Selected location')+'</strong></div></header><div class="portal-panel-loading">'+label('Učitavanje Google karte…','Loading Google Maps…')+'</div>';return;}
 var city=f&&f.city?f.city:id, country=f?(english()?f.country_en:f.country_hr):'', coordinates=Number(pos.lat).toFixed(4)+', '+Number(pos.lng).toFixed(4);
 var query=encodeURIComponent(pos.lat+','+pos.lng), external='https://www.google.com/maps/search/?api=1&query='+query, embed='https://www.google.com/maps?q='+query+'&z=13&output=embed';
 map.innerHTML='<header class="google-location-head"><div><small>'+label('Google Maps · Odabrana lokacija','Google Maps · Selected location')+'</small><strong>'+city+'</strong><span>'+country+' · '+label('Geografska pozicija','Geographic position')+': '+coordinates+'</span></div><a href="'+external+'" target="_blank" rel="noopener">'+label('Otvori veću kartu','Open larger map')+' ↗</a></header><iframe class="google-location-frame" title="Google Maps: '+city+'" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen src="'+embed+'"></iframe><p class="google-location-context-note">● '+label('Demografski podatci mijenjaju se svakim odabirom točke u 2D / 3D prikazu.','Demographic context changes with each selected 2D / 3D point.')+'</p>';
}
function weatherCode(code,day){var hr={0:'Vedro',1:'Pretežno vedro',2:'Djelomice oblačno',3:'Oblačno',45:'Magla',51:'Rosulja',61:'Slaba kiša',63:'Kiša',65:'Jaka kiša',71:'Snijeg',80:'Pljuskovi',95:'Grmljavina'};var en={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',51:'Drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Snow',80:'Showers',95:'Thunderstorm'};var icon=code===0?(day?'☀':'☾'):code<=2?'⛅':code<=3?'☁':code<=48?'≋':code<=67||code===80?'☔':code<=77?'❄':'⚡';return {icon:icon,text:(english()?en:hr)[code]||label('Promjenjivo vrijeme','Variable weather')};}
function weatherHeader(city){return '<header class="weather-head"><div><small>'+label('Aktualna prognoza · odabrana lokacija','Live forecast · selected location')+'</small><strong>'+label('Vremenske prilike','Weather conditions')+' · '+city+'</strong></div><a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo ↗</a></header>';}
function weatherLoading(id){var panel=weatherPanel(),f=fact(id),city=f?f.city:id;if(panel)panel.innerHTML=weatherHeader(city)+'<div class="portal-panel-loading">'+label('Učitavanje vremenskih podataka…','Loading local weather…')+'</div>';}
function renderWeather(id,data){
 var panel=weatherPanel(),f=fact(id),city=f?f.city:id;if(!panel)return;
 if(!data||!data.current){panel.innerHTML=weatherHeader(city)+'<div class="portal-panel-loading">'+label('Vremenski podatci trenutačno nisu dostupni.','Weather data is currently unavailable.')+'</div>';return;}
 var c=data.current,d=data.daily||{},condition=weatherCode(c.weather_code,c.is_day===1), rain=d.precipitation_probability_max&&d.precipitation_probability_max[0];
 var days='';if(d.time){for(var i=0;i<Math.min(4,d.time.length);i++){var status=weatherCode(d.weather_code[i],true);days+='<article class="weather-day"><small>'+(i===0?label('Danas','Today'):d.time[i].slice(5))+'</small><b>'+status.icon+'</b><strong>'+Math.round(d.temperature_2m_max[i])+'° <i>'+Math.round(d.temperature_2m_min[i])+'°</i></strong><span>'+status.text+'</span><em>☔ '+(d.precipitation_probability_max[i]==null?'—':Math.round(d.precipitation_probability_max[i])+'%')+'</em></article>';}}
 panel.innerHTML=weatherHeader(city)+'<div class="weather-now"><div class="weather-condition"><span>'+condition.icon+'</span><div><strong>'+Math.round(c.temperature_2m)+'°C</strong><p>'+condition.text+'</p><small>'+label('Lokalno vrijeme prognoze','Local forecast time')+': '+String(c.time||'—').replace('T',' ')+'</small></div></div><div class="weather-metrics"><div><label>'+label('Osjećaj','Feels like')+'</label><b>'+Math.round(c.apparent_temperature)+'°C</b></div><div><label>'+label('Vlažnost','Humidity')+'</label><b>'+Math.round(c.relative_humidity_2m)+'%</b></div><div><label>'+label('Vjetar','Wind')+'</label><b>'+Math.round(c.wind_speed_10m)+' km/h</b></div><div><label>'+label('Oborine','Precipitation')+'</label><b>'+(rain==null?'—':Math.round(rain)+'%')+'</b></div></div></div><div class="weather-forecast"><h4>'+label('Sljedeći dani','Next days')+'</h4><div>'+days+'</div></div>';
}
function loadWeather(id){var pos=position(id);if(!pos){weatherLoading(id);return;}weatherLoading(id);if(state.weatherController)state.weatherController.abort();state.weatherController=new AbortController();var url='https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(pos.lat)+'&longitude='+encodeURIComponent(pos.lng)+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=4&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh';fetch(url,{cache:'no-store',signal:state.weatherController.signal}).then(function(r){return r.ok?r.json():null;}).then(function(data){if(state.selected===id)renderWeather(id,data);}).catch(function(error){if(error.name!=='AbortError'&&state.selected===id)renderWeather(id,null);});}
function select(id){state.selected=id||'boulder';order();renderMap(state.selected);loadWeather(state.selected);}
function start(){
 addCss('portal-integration.css');addCss('portal-status.css');
 Promise.all([json('group_network_geo.json'),json('group_location_facts.json')]).then(function(values){state.geo=values[0];state.facts=values[1];var tries=0;var timer=setInterval(function(){if(document.querySelector('#global-network .network-layout')){clearInterval(timer);select((window.GNK_LOCATION_INSIGHTS&&window.GNK_LOCATION_INSIGHTS.current&&window.GNK_LOCATION_INSIGHTS.current())||'boulder');}else if(++tries>240){clearInterval(timer);}},80);});
 document.addEventListener('gnk-location-selected',function(event){if(event.detail&&event.detail.id)select(event.detail.id);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
}());
