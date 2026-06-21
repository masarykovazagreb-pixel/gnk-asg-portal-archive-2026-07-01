const TIME_ZONE = 'Europe/Zagreb';
const SLOTS = [
  { label: '09:15', hour: 9, minute: 15 },
  { label: '13:00', hour: 13, minute: 0 },
  { label: '17:00', hour: 17, minute: 0 }
];
const STATE_KEY = 'auto-editor:v2:state';
const LOG_KEY = 'auto-editor:v2:log';

export function localParts(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value || '';
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    timeZone: TIME_ZONE
  };
}

export function editorialSlot(input = new Date()) {
  const local = localParts(input);
  const match = SLOTS.find(slot => {
    if (local.hour !== slot.hour) return false;
    return local.minute >= slot.minute && local.minute < slot.minute + 10;
  });
  return match ? `${local.ymd}@${match.label}` : '';
}

export async function runEditorialSchedule({ env, now = new Date(), execute } = {}) {
  const store = storage(env);
  if (!store) return { ok: false, blocked: true, reason: 'storage_missing', writes: false };
  const slot = editorialSlot(now);
  const state = await readJson(store, STATE_KEY, {});

  if (!slot) {
    const result = { ok: true, executed: false, reason: 'outside_editorial_window', slot: '' };
    await appendLog(store, { ...result, checkedAt: new Date(now).toISOString() });
    return result;
  }

  if (state.lastCompletedSlot === slot) {
    const result = { ok: true, executed: false, reason: 'slot_already_completed', slot };
    await appendLog(store, { ...result, checkedAt: new Date(now).toISOString() });
    return result;
  }

  if (typeof execute !== 'function') {
    return { ok: false, executed: false, reason: 'executor_missing', slot };
  }

  const startedAt = new Date(now).toISOString();
  try {
    const output = await execute({ slot, now: new Date(now) });
    const ok = output?.ok !== false;
    if (ok) {
      state.lastCompletedSlot = slot;
      state.lastCompletedAt = startedAt;
      state.timeZone = TIME_ZONE;
      await store.put(STATE_KEY, JSON.stringify(state));
    }
    const result = { ok, executed: true, slot, startedAt, output };
    await appendLog(store, result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      executed: true,
      slot,
      startedAt,
      error: String(error?.message || error)
    };
    await appendLog(store, result);
    return result;
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
  const next = [item, ...(Array.isArray(current) ? current : [])].slice(0, 200);
  await store.put(LOG_KEY, JSON.stringify(next));
}

export const AUTO_EDITOR_SCHEDULE = Object.freeze({
  timeZone: TIME_ZONE,
  localTimes: SLOTS.map(item => item.label),
  stateKey: STATE_KEY,
  logKey: LOG_KEY
});
