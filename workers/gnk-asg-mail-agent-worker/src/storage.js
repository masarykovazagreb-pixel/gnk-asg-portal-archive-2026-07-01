export const MAIL_KEYS = {
  inbox: "mail-agent:inbox:v1",
  outbox: "mail-agent:outbox:v1",
  sent: "mail-agent:sent:v1",
  held: "mail-agent:held:v1"
};

export async function readMailbox(env, box) {
  const key = MAIL_KEYS[box];
  if (!key || !env.GNK_ASG_KV) return [];
  const raw = await env.GNK_ASG_KV.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addMailboxItem(env, box, item, limit = 1000) {
  const key = MAIL_KEYS[box];
  if (!key || !env.GNK_ASG_KV) return item;
  const items = await readMailbox(env, box);
  const next = [item, ...items.filter(entry => entry?.id !== item?.id)].slice(0, limit);
  await env.GNK_ASG_KV.put(key, JSON.stringify(next, null, 2));
  return item;
}
