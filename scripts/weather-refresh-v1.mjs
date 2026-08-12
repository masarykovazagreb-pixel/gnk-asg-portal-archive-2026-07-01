// GNK ASG — Weather refresh (Zagreb) za AKTUAL MEDIA.
// Izvor: Open-Meteo (besplatan, bez API ključa, CORS, WMO weather codes).
// https://open-meteo.com/en/docs — CC BY 4.0, bez limita za ovu učestalost (24 poziva/dan).
// Piše /data/weather-zagreb.json koji čita klijentska skripta na AKTUAL stranicama
// (isti obrazac kao /data/market.json — server-side fetch, klijent samo čita JSON).
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const LAT = 45.8150, LON = 15.9819; // Zagreb
const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FZagreb&forecast_days=3`;

// WMO Weather interpretation codes -> HR/EN opis
const WMO = {
  0: { hr: 'Vedro', en: 'Clear sky' },
  1: { hr: 'Pretežno vedro', en: 'Mainly clear' },
  2: { hr: 'Djelomično oblačno', en: 'Partly cloudy' },
  3: { hr: 'Oblačno', en: 'Overcast' },
  45: { hr: 'Magla', en: 'Fog' },
  48: { hr: 'Magla s injem', en: 'Depositing rime fog' },
  51: { hr: 'Slaba kiša', en: 'Light drizzle' },
  53: { hr: 'Umjerena kiša', en: 'Moderate drizzle' },
  55: { hr: 'Jaka kiša', en: 'Dense drizzle' },
  56: { hr: 'Slaba ledena kiša', en: 'Light freezing drizzle' },
  57: { hr: 'Jaka ledena kiša', en: 'Dense freezing drizzle' },
  61: { hr: 'Slaba kiša', en: 'Slight rain' },
  63: { hr: 'Umjerena kiša', en: 'Moderate rain' },
  65: { hr: 'Jaka kiša', en: 'Heavy rain' },
  66: { hr: 'Slaba ledena kiša', en: 'Light freezing rain' },
  67: { hr: 'Jaka ledena kiša', en: 'Heavy freezing rain' },
  71: { hr: 'Slab snijeg', en: 'Slight snow fall' },
  73: { hr: 'Umjeren snijeg', en: 'Moderate snow fall' },
  75: { hr: 'Jak snijeg', en: 'Heavy snow fall' },
  77: { hr: 'Snježna zrnca', en: 'Snow grains' },
  80: { hr: 'Slabi pljuskovi', en: 'Slight rain showers' },
  81: { hr: 'Umjereni pljuskovi', en: 'Moderate rain showers' },
  82: { hr: 'Jaki pljuskovi', en: 'Violent rain showers' },
  85: { hr: 'Slabi snježni pljuskovi', en: 'Slight snow showers' },
  86: { hr: 'Jaki snježni pljuskovi', en: 'Heavy snow showers' },
  95: { hr: 'Grmljavinsko nevrijeme', en: 'Thunderstorm' },
  96: { hr: 'Grmljavina s tučom', en: 'Thunderstorm with slight hail' },
  99: { hr: 'Grmljavina s jakom tučom', en: 'Thunderstorm with heavy hail' },
};
function describe(code) { return WMO[code] || { hr: 'Nepoznato', en: 'Unknown' }; }

async function fetchWeather() {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(URL, { signal: ac.signal, headers: { accept: 'application/json' } });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

const outPath = 'apps/portal/data/weather-zagreb.json';
mkdirSync('apps/portal/data', { recursive: true });

try {
  const data = await fetchWeather();
  const cur = data.current;
  const daily = data.daily;
  const desc = describe(cur.weather_code);
  const payload = {
    city: 'Zagreb',
    lat: LAT, lon: LON,
    updated_at: new Date().toISOString(),
    source: 'open-meteo.com',
    state: 'live',
    current: {
      temperature_c: Math.round(cur.temperature_2m * 10) / 10,
      feels_like_c: Math.round(cur.apparent_temperature * 10) / 10,
      humidity_pct: cur.relative_humidity_2m,
      wind_kmh: Math.round(cur.wind_speed_10m * 10) / 10,
      is_day: !!cur.is_day,
      weather_code: cur.weather_code,
      condition_hr: desc.hr,
      condition_en: desc.en,
    },
    forecast: (daily.time || []).slice(0, 3).map((date, i) => ({
      date,
      max_c: Math.round(daily.temperature_2m_max[i] * 10) / 10,
      min_c: Math.round(daily.temperature_2m_min[i] * 10) / 10,
      weather_code: daily.weather_code[i],
      condition_hr: describe(daily.weather_code[i]).hr,
      condition_en: describe(daily.weather_code[i]).en,
    })),
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, state: 'live', temp: payload.current.temperature_c, condition: desc.hr }, null, 2));
} catch (e) {
  // Fallback: ako postoji prethodni podatak, zadrži ga ali označi kao stale
  // (isti obrazac kao market.js STALE FALLBACK DATA); ako ne postoji ništa,
  // napiši eksplicitno "unavailable" stanje koje UI mora ispravno prikazati
  // umjesto praznog/beskonačnog loadinga.
  let previous = null;
  try {
    previous = JSON.parse(readFileSync(outPath, 'utf8'));
  } catch {}
  const payload = previous
    ? { ...previous, state: 'stale', stale_since: previous.updated_at, checked_at: new Date().toISOString() }
    : { city: 'Zagreb', state: 'unavailable', checked_at: new Date().toISOString(), error: String(e?.message || e).slice(0, 200) };
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(JSON.stringify({ ok: false, state: payload.state, error: String(e?.message || e) }, null, 2));
}
