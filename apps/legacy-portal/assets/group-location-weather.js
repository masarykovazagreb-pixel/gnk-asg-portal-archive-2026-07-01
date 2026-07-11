(() => {
  'use strict';
  const state = { network:null, geo:null, facts:null, selected:'boulder', controller:null, cache:new Map() };
  const $ = id => document.getElementById(id);
  const isEnglish = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const tr = () => isEnglish() ? {
    title:'Weather conditions', live:'Live forecast · selected location', source:'Data: Open-Meteo', loading:'Loading local weather…', unavailable:'Weather data is currently unavailable.', retry:'Try again', feels:'Feels like', humidity:'Humidity', wind:'Wind', rain:'Precipitation chance', sunrise:'Sunrise', sunset:'Sunset', forecast:'Next days', today:'Today', updated:'Local forecast time', direction:'Direction', kmh:'km/h'
  } : {
    title:'Vremenske prilike', live:'Aktualna prognoza · odabrana lokacija', source:'Podatci: Open-Meteo', loading:'Učitavanje lokalnih vremenskih prilika…', unavailable:'Vremenski podatci trenutačno nisu dostupni.', retry:'Pokušaj ponovno', feels:'Osjećaj', humidity:'Vlažnost', wind:'Vjetar', rain:'Vjerojatnost oborina', sunrise:'Izlazak sunca', sunset:'Zalazak sunca', forecast:'Sljedeći dani', today:'Danas', updated:'Lokalno vrijeme prognoze', direction:'Smjer', kmh:'km/h'
  };
  async function get(path) {
    try { const response = await fetch(path + '?v=' + Date.now(), { cache:'no-store' }); return response.ok ? response.json() : null; }
    catch (_) { return null; }
  }
  function item(id) { return state.network && [state.network.center].concat(state.network.nodes || []).find(node => node.id === id); }
  function position(id) { return state.geo && (id === 'boulder' ? state.geo.center : state.geo.nodes?.[id]); }
  function fact(id) { return state.facts?.locations?.[id]; }
  function selectedName(id) { const f = fact(id), n = item(id); if (f) return `${f.city}, ${isEnglish() ? f.country_en : f.country_hr}`; if (!n) return ''; return id === 'boulder' ? n.place : (isEnglish() ? n.name_en : n.name_hr); }
  function condition(code, day) {
    const hr = {0:'Vedro',1:'Pretežno vedro',2:'Djelomice oblačno',3:'Oblačno',45:'Magla',48:'Magla s injem',51:'Slaba rosulja',53:'Rosulja',55:'Jaka rosulja',56:'Ledena rosulja',57:'Jaka ledena rosulja',61:'Slaba kiša',63:'Kiša',65:'Jaka kiša',66:'Ledena kiša',67:'Jaka ledena kiša',71:'Slab snijeg',73:'Snijeg',75:'Jak snijeg',77:'Zrnati snijeg',80:'Slabi pljuskovi',81:'Pljuskovi',82:'Jaki pljuskovi',85:'Snježni pljuskovi',86:'Jaki snježni pljuskovi',95:'Grmljavina',96:'Grmljavina s tučom',99:'Jaka grmljavina s tučom'};
    const english = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Dense freezing drizzle',61:'Slight rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Light showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with hail',99:'Severe thunderstorm with hail'};
    const icon = code === 0 ? (day ? '☀' : '☾') : code <= 2 ? (day ? '⛅' : '☁') : code <= 3 ? '☁' : code <= 48 ? '≋' : code <= 67 || (code >= 80 && code <= 82) ? '☔' : code <= 86 ? '❄' : '⚡';
    return { text:(isEnglish() ? english : hr)[code] || (isEnglish() ? 'Variable weather' : 'Promjenjivo vrijeme'), icon };
  }
  function windCompass(degrees) {
    const values = isEnglish() ? ['N','NE','E','SE','S','SW','W','NW'] : ['S','SI','I','JI','J','JZ','Z','SZ'];
    return values[Math.round(((degrees || 0) % 360) / 45) % 8];
  }
  function shortTime(value) { return value ? value.slice(11,16) : '—'; }
  function dateLabel(value, index) {
    if (index === 0) return tr().today;
    try { return new Intl.DateTimeFormat(isEnglish() ? 'en-GB' : 'hr-HR', { weekday:'short', day:'numeric', month:'short' }).format(new Date(`${value}T12:00:00`)); }
    catch (_) { return value; }
  }
  function host() {
    let dock = window.GNK_LOCATION_CONTEXT?.dock?.() || $('networkLocationContext');
    if (!dock) return null;
    dock.classList.add('has-weather');
    let panel = $('locationWeatherPanel');
    if (!panel) { panel = document.createElement('section'); panel.id = 'locationWeatherPanel'; panel.className = 'location-weather-panel'; dock.appendChild(panel); }
    return panel;
  }
  function header(name) { const T = tr(); return `<header class="weather-head"><div><small>${T.live}</small><strong>${T.title} · ${name}</strong></div><a href="https://open-meteo.com/" target="_blank" rel="noopener">${T.source} ↗</a></header>`; }
  function showLoading(id) { const panel = host(); if (!panel) return; panel.innerHTML = `${header(selectedName(id))}<div class="weather-loading"><span></span>${tr().loading}</div>`; }
  function showError(id) { const panel = host(); if (!panel) return; panel.innerHTML = `${header(selectedName(id))}<div class="weather-error"><p>${tr().unavailable}</p><button type="button" data-weather-retry>${tr().retry}</button></div>`; panel.querySelector('[data-weather-retry]')?.addEventListener('click', () => load(id, true)); }
  function forecastCards(daily) {
    if (!daily?.time) return '';
    return daily.time.slice(0, 4).map((day, index) => {
      const status = condition(daily.weather_code[index], true);
      const rain = daily.precipitation_probability_max?.[index];
      return `<article class="weather-day"><small>${dateLabel(day, index)}</small><b>${status.icon}</b><strong>${Math.round(daily.temperature_2m_max[index])}° <i>${Math.round(daily.temperature_2m_min[index])}°</i></strong><span>${status.text}</span><em>☔ ${rain == null ? '—' : Math.round(rain) + '%'}</em></article>`;
    }).join('');
  }
  function showWeather(id, weather) {
    const panel = host(); if (!panel) return;
    const T = tr(), current = weather.current || {}, daily = weather.daily || {}, status = condition(current.weather_code, current.is_day === 1);
    const rainToday = daily.precipitation_probability_max?.[0];
    panel.innerHTML = `${header(selectedName(id))}<div class="weather-now"><div class="weather-condition"><span>${status.icon}</span><div><strong>${Math.round(current.temperature_2m)}°C</strong><p>${status.text}</p><small>${T.updated}: ${current.time ? current.time.replace('T',' ') : '—'} · ${weather.timezone_abbreviation || weather.timezone || ''}</small></div></div><div class="weather-metrics"><div><label>${T.feels}</label><b>${Math.round(current.apparent_temperature)}°C</b></div><div><label>${T.humidity}</label><b>${Math.round(current.relative_humidity_2m)}%</b></div><div><label>${T.wind}</label><b>${Math.round(current.wind_speed_10m)} ${T.kmh}</b><small>${T.direction}: ${windCompass(current.wind_direction_10m)}</small></div><div><label>${T.rain}</label><b>${rainToday == null ? '—' : Math.round(rainToday) + '%'}</b></div><div><label>${T.sunrise}</label><b>${shortTime(daily.sunrise?.[0])}</b></div><div><label>${T.sunset}</label><b>${shortTime(daily.sunset?.[0])}</b></div></div></div><div class="weather-forecast"><h4>${T.forecast}</h4><div>${forecastCards(daily)}</div></div>`;
  }
  async function load(id, force = false) {
    const pos = position(id); if (!pos) return;
    state.selected = id;
    const cached = state.cache.get(id);
    if (!force && cached && Date.now() - cached.at < 10 * 60 * 1000) { showWeather(id, cached.data); return; }
    showLoading(id);
    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    const query = new URL('https://api.open-meteo.com/v1/forecast');
    query.searchParams.set('latitude', pos.lat);
    query.searchParams.set('longitude', pos.lng);
    query.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day');
    query.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset');
    query.searchParams.set('forecast_days', '4');
    query.searchParams.set('timezone', 'auto');
    query.searchParams.set('temperature_unit', 'celsius');
    query.searchParams.set('wind_speed_unit', 'kmh');
    try {
      const response = await fetch(query.toString(), { signal:state.controller.signal, cache:'no-store' });
      if (!response.ok) throw new Error('Weather response failed');
      const weather = await response.json();
      state.cache.set(id, { at:Date.now(), data:weather });
      if (state.selected === id) showWeather(id, weather);
    } catch (error) { if (error.name !== 'AbortError' && state.selected === id) showError(id); }
  }
  async function init() {
    [state.network, state.geo, state.facts] = await Promise.all([get('data/group_network.json'), get('data/group_network_geo.json'), get('data/group_location_facts.json')]);
    if (!state.network || !state.geo) return;
    let attempts = 0; const timer = setInterval(() => {
      if ($('networkLocationContext') || window.GNK_LOCATION_CONTEXT?.dock?.()) { const initial = window.GNK_LOCATION_INSIGHTS?.current?.() || window.GNK_GEO_MAP?.getSelected?.() || window.GNK_GLOBE?.getSelected?.() || 'boulder'; load(initial); clearInterval(timer); }
      else if (++attempts > 220) clearInterval(timer);
    }, 60);
    document.addEventListener('gnk-location-selected', event => { if (event.detail?.id) load(event.detail.id); });
    window.addEventListener('gnk-language-change', () => load(state.selected, true));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
