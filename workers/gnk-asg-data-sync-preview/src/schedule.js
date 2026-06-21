const TIME_ZONE = 'Europe/Zagreb';
const STATE_KEY = 'data-sync:v2:state';
const LOG_KEY = 'data-sync:v2:log';
const LOG_LIMIT = 200;

export function zagrebParts(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const value = name => parts.find(part => part.type === name)?.value || '';
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: Number(value('hour')),
    minute: Number(value('minute')),
    second: Number(value('second')),
    ymd: `${value('year')}-${value('month')}-${value('day')}`,
    timeZone: TIME_ZONE
  };
}

export function newsSlot(input = new Date()) {
  const local = zagrebParts(input);
  if (local.hour === 9 && local.minute < 10) return `${local.ymd}@09:00`;
  if (local.hour === 16 && local.minute < 10) return `${local.ymd}@16:00`;
  return '';
}

export function marketSlot(input = new Date()) {
  const local = zagrebParts(input);
  const quarter = Math.floor(local.minute / 15) * 15;
  return `${local.ymd}@${String(local.hour).padStart(2, '0')}:${String(quarter).padStart(2, '0')}`;
}

export function duePlan(input = new Date(), state = {}) {
  const nextNewsSlot = newsSlot(input);
  const nextMarketSlot = marketSlot(input);
  return {
    timeZone: TIME_ZONE,
    local: zagrebParts(input),
    news: {
      due: Boolean(nextNewsSlot && state.lastNewsSlot !== nextNewsSlot),
      slot: nextNewsSlot,
      previousSlot: state.lastNewsSlot || ''
    },
    market: {
      due: state.lastMarketSlot !== nextMarketSlot,
      slot: nextMarketSlot,
      previousSlot: state.lastMarketSlot || ''
    }
  };
}

export function honestStatus({ sourceStatus, updatedAt, now = new Date(), liveMinutes = 20, delayedMinutes = 90 } = {}) {
  const source = String(sourceStatus || '').toUpperCase();
  if (source === 'SNAPSHOT') return 'SNAPSHOT';
  if (source === 'FALLBACK') return 'FALLBACK';
  const timestamp = Date.parse(updatedAt || '');
  if (!Number.isFinite(timestamp)) return 'FALLBACK';
  const ageMinutes = Math.max(0, (new Date(now).getTime() - timestamp) / 60000);
  if (source === 'LIVE' && ageMinutes <= liveMinutes) return 'LIVE';
  if ((source === 'LIVE' || source === 'DELAYED') && ageMinutes <= delayedMinutes) return 'DELAYED';
  return 'FALLBACK';
}

export async function runScheduledDataSync({ env, now = new Date(), refreshNews, refreshMarket } = {}) {
  const store = storage(env);
  if (!store) {
    return {
      ok: false,
      blocked: true,
      reason: 'storage_missing',
      writes: false,
      timeZone: TIME_ZONE
    };
  }

  const state = await readJson(store, STATE_KEY, {});
  const plan = duePlan(now, state);
  const result = {
    ok: true,
    blocked: false,
    timeZone: TIME_ZONE,
    startedAt: new Date(now).toISOString(),
    plan,
    news: { executed: false },
    market: { executed: false }
  };

  if (plan.market.due) {
    result.market = await execute('market', refreshMarket);
    if (result.market.ok) state.lastMarketSlot = plan.market.slot;
  }

  if (plan.news.due) {
    result.news = await execute('news', refreshNews);
    if (result.news.ok) state.lastNewsSlot = plan.news.slot;
  }

  state.updatedAt = new Date(now).toISOString();
  state.timeZone = TIME_ZONE;
  await store.put(STATE_KEY, JSON.stringify(state));
  await appendLog(store, { ...result, state });
  result.state = state;
  return result;
}

async function execute(module, handler) {
  if (typeof handler !== 'function') {
    return { executed: false, ok: false, module, error: 'handler_missing' };
  }
  try {
    const output = await handler();
    return { executed: true, ok: output?.ok !== false, module, output };
  } catch (error) {
    return { executed: true, ok: false, module, error: String(error?.message || error) };
  }
}

function storage(env = {}) {
  return env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || env.CONTENT_KV || null;
}

async function readJson(store, key, fallback) {
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function appendLog(store, item) {
  const current = await readJson(store, LOG_KEY, []);
  const next = [item, ...(Array.isArray(current) ? current : [])].slice(0, LOG_LIMIT);
  await store.put(LOG_KEY, JSON.stringify(next));
}

export const DATA_SYNC_KEYS = Object.freeze({
  state: STATE_KEY,
  log: LOG_KEY
});
