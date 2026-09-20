(function(){
'use strict';
// GNK ASG — Weather widget renderer (Zagreb) za AKTUAL MEDIA.
// Čita /data/weather-zagreb.json (kanonski producer četiri puta dnevno),
// uz neovisni preglednički Open-Meteo read-only oporavak kada statični feed zastari.
// Poštena stanja: live / stale / unavailable
// — nikad ne prikazuje "LIVE" oznaku ako podatak nije stvarno svjež.
// Rad na HR i EN stranicama; jezik se određuje iz <html lang> ili putanje.
function isEnglish(){
  return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ||
    /\/en\//.test(location.pathname) || /\/en$/.test(location.pathname);
}
var en = isEnglish();

var WMO_ICON = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',55:'🌦️',56:'🌧️',57:'🌧️',
  61:'🌧️',63:'🌧️',65:'🌧️',66:'🌧️',67:'🌧️',
  71:'🌨️',73:'🌨️',75:'❄️',77:'❄️',
  80:'🌦️',81:'🌧️',82:'⛈️',85:'🌨️',86:'❄️',
  95:'⛈️',96:'⛈️',99:'⛈️',
};
function icon(code){ return WMO_ICON[code] || '🌡️'; }

function fmtTime(iso){
  try {
    return new Date(iso).toLocaleString(en ? 'en-GB' : 'hr-HR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}
function fmtDay(dateStr){
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(en ? 'en-GB' : 'hr-HR', { weekday: 'short' });
  } catch { return dateStr; }
}

function render(data){
  var root = document.getElementById('akWeather');
  var body = document.getElementById('akWeatherBody');
  var updatedEl = document.getElementById('akWeatherUpdated');
  if (!root || !body || !updatedEl) return;

  if (data.state === 'unavailable') {
    root.classList.add('state-unavailable');
    updatedEl.textContent = en ? 'Unavailable' : 'Nedostupno';
    body.innerHTML = '<span>' + (en
      ? 'Weather data is temporarily unavailable. Please check back later.'
      : 'Vremenski podaci trenutno nisu dostupni. Pokušajte kasnije.') + '</span>';
    return;
  }

  var cur = data.current;
  var label = data.state === 'live'
    ? (en ? 'Updated: ' : 'Ažurirano: ') + fmtTime(data.updated_at)
    : (en ? 'Last known: ' : 'Zadnje poznato: ') + fmtTime(data.stale_since || data.updated_at);
  if (data.state === 'stale') root.classList.add('state-stale');
  updatedEl.textContent = label;

  var forecastHtml = (data.forecast || []).slice(1).map(function(d){
    return '<div class="ak-weather-day"><b>' + icon(d.weather_code) + ' ' + Math.round(d.max_c) + '°</b>' + fmtDay(d.date) + ' · ' + Math.round(d.min_c) + '°</div>';
  }).join('');

  body.innerHTML =
    '<span class="ak-weather-temp">' + icon(cur.weather_code) + ' ' + Math.round(cur.temperature_c) + '°C</span>' +
    '<div><div class="ak-weather-cond">' + (en ? cur.condition_en : cur.condition_hr) + '</div>' +
    '<div class="ak-weather-meta">' +
      '<span>' + (en ? 'Feels like' : 'Osjeća se kao') + ' ' + Math.round(cur.feels_like_c) + '°C</span>' +
      '<span>' + (en ? 'Humidity' : 'Vlaga') + ' ' + cur.humidity_pct + '%</span>' +
      '<span>' + (en ? 'Wind' : 'Vjetar') + ' ' + Math.round(cur.wind_kmh) + ' km/h</span>' +
    '</div></div>';
  if (forecastHtml) {
    body.insertAdjacentHTML('beforeend', '<div class="ak-weather-forecast" style="width:100%">' + forecastHtml + '</div>');
  }
  body.insertAdjacentHTML('beforeend', '<span class="ak-weather-source" style="width:100%">' +
    (en ? 'Source: ' : 'Izvor: ') + '<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a></span>');
}


var root = document.getElementById('akWeather');
var body = document.getElementById('akWeatherBody');
var updatedEl = document.getElementById('akWeatherUpdated');
if (!root || !body || !updatedEl) return;
var STATIC_MAX_AGE_MS = 6 * 60 * 60 * 1000;
var SOURCE_MAX_AGE_MS = 90 * 60 * 1000;
var API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=45.815&longitude=15.9819' +
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
  '&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FZagreb&forecast_days=3&timeformat=unixtime';
var descriptions = {
  0:['Vedro','Clear sky'],1:['Pretežno vedro','Mainly clear'],2:['Djelomično oblačno','Partly cloudy'],
  3:['Oblačno','Overcast'],45:['Magla','Fog'],48:['Magla s injem','Depositing rime fog'],
  51:['Slaba rosulja','Light drizzle'],53:['Umjerena rosulja','Moderate drizzle'],55:['Jaka rosulja','Dense drizzle'],
  61:['Slaba kiša','Slight rain'],63:['Umjerena kiša','Moderate rain'],65:['Jaka kiša','Heavy rain'],
  71:['Slab snijeg','Slight snowfall'],73:['Umjeren snijeg','Moderate snowfall'],75:['Jak snijeg','Heavy snowfall'],
  80:['Slabi pljuskovi','Slight rain showers'],81:['Umjereni pljuskovi','Moderate rain showers'],
  82:['Jaki pljuskovi','Violent rain showers'],85:['Slabi snježni pljuskovi','Slight snow showers'],
  86:['Jaki snježni pljuskovi','Heavy snow showers'],95:['Grmljavinsko nevrijeme','Thunderstorm']
};
function goodAge(ms, max) { return Number.isFinite(ms) && ms >= -300000 && ms <= max; }
function clearStale(message) {
  root.classList.remove('state-live');
  root.classList.add('state-unavailable');
  root.classList.remove('state-stale');
  updatedEl.textContent = message;
  // Never display an expired temperature as current or yesterday's forecast as today's.
  body.textContent = en ? 'Current weather is not verified. Please try again later.' :
    'Aktualni vremenski podaci nisu potvrđeni. Pokušajte kasnije.';
}
function verifiedStatic(payload) {
  var age = Date.now() - Date.parse(payload && payload.updated_at);
  return payload && payload.state === 'live' && goodAge(age, STATIC_MAX_AGE_MS) &&
    payload.current && Number.isFinite(payload.current.temperature_c) &&
    Array.isArray(payload.forecast) && payload.forecast.length > 0;
}
function fromSource(data) {
  var cur = data && data.current, daily = data && data.daily;
  var ts = cur && Number(cur.time);
  var observedMs = ts * 1000;
  if (!cur || !daily || !Array.isArray(daily.time) || daily.time.length < 3 ||
      !Number.isFinite(ts) || !goodAge(Date.now() - observedMs, SOURCE_MAX_AGE_MS) ||
      !Number.isFinite(cur.temperature_2m) || !Number.isFinite(cur.apparent_temperature) ||
      !Number.isFinite(cur.relative_humidity_2m) || !Number.isFinite(cur.wind_speed_10m) ||
      !Number.isFinite(cur.weather_code) || !Number.isFinite(data.utc_offset_seconds)) {
    throw new Error('invalid-or-stale-upstream-weather');
  }
  var forecast = daily.time.slice(0, 3).map(function(epoch, index) {
    var localDate = new Date((Number(epoch) + data.utc_offset_seconds) * 1000)
      .toISOString().slice(0, 10);
    var weatherCode = Number(daily.weather_code && daily.weather_code[index]);
    var max = Number(daily.temperature_2m_max && daily.temperature_2m_max[index]);
    var min = Number(daily.temperature_2m_min && daily.temperature_2m_min[index]);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(localDate) || !Number.isFinite(max) ||
        !Number.isFinite(min) || !Number.isFinite(weatherCode)) throw new Error('invalid-upstream-forecast');
    return {date:localDate, max_c:max, min_c:min, weather_code:weatherCode};
  });
  var desc = descriptions[cur.weather_code] || ['Vremenski uvjeti','Weather conditions'];
  return {state:'live', source:'open-meteo.com', updated_at:new Date(observedMs).toISOString(),
    current:{temperature_c:cur.temperature_2m,feels_like_c:cur.apparent_temperature,
      humidity_pct:cur.relative_humidity_2m,wind_kmh:cur.wind_speed_10m,is_day:!!cur.is_day,
      weather_code:cur.weather_code,condition_hr:desc[0],condition_en:desc[1]},forecast:forecast};
}
var inflight = false;
function directRefresh() {
  if (inflight) return;
  inflight = true;
  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var timeout = controller ? setTimeout(function(){ controller.abort(); }, 9000) : null;
  fetch(API_URL, {cache:'no-store',headers:{accept:'application/json'},
    signal:controller ? controller.signal : undefined})
    .then(function(r){ if(!r.ok) throw new Error('weather-api-http-' + r.status); return r.json(); })
    .then(function(data){
      var recovered = fromSource(data); // Source observation timestamp, NOT browser fetch time.
      root.classList.remove('state-unavailable','state-stale');
      render(recovered);
      updatedEl.textContent = (en ? 'Open-Meteo direct · observed: ' : 'Open-Meteo izravno · izmjereno: ') +
        fmtTime(recovered.updated_at);
    })
    .catch(function(){ clearStale(en ? 'Weather source unavailable' : 'Izvor vremena nije dostupan'); })
    .then(function(){ if(timeout) clearTimeout(timeout); inflight = false; });
}
fetch('/data/weather-zagreb.json?v=' + Date.now(), {cache:'no-store'})
  .then(function(r){ if(!r.ok) throw new Error('weather-static-http-' + r.status); return r.json(); })
  .then(function(data) {
    if (verifiedStatic(data)) { render(data); return; }
    clearStale(en ? 'Checking current weather…' : 'Provjera aktualnog vremena…');
    directRefresh(); // Browser-only fallback; no GitHub Actions or repository writes.
  })
  .catch(function(){ clearStale(en ? 'Checking current weather…' : 'Provjera aktualnog vremena…'); directRefresh(); });
window.addEventListener('visibilitychange', function(){
  if (!document.hidden) {
    clearStale(en ? 'Checking current weather…' : 'Provjera aktualnog vremena…');
    directRefresh();
  }
});
setInterval(directRefresh, 15 * 60 * 1000);
})();
