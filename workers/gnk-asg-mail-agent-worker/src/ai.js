import { classifyRisk } from "./policy.js";
import { buildMailPrompt, MAIL_SYSTEM_PROMPT } from "./prompts.js";
import { mustHoldForApproval } from "./thread-safety.js";

export async function analyseMail(env, mail) {
  const baseline = classifyRisk(mail.subject, mail.body);
  if (!env.AI || typeof env.AI.run !== "function") {
    return heldFallback(baseline, "AI nije dostupan.");
  }

  try {
    const result = await env.AI.run(env.MAIL_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: MAIL_SYSTEM_PROMPT },
        { role: "user", content: buildMailPrompt(mail, baseline) }
      ],
      temperature: 0.2,
      max_tokens: 1200
    });

    const parsed = parseObject(result?.response || result?.result || "");
    if (!parsed || typeof parsed.reply !== "string") {
      return heldFallback(baseline, "AI odgovor nije valjan.");
    }

    const highRisk = baseline.risk === "high" || String(parsed.risk || "").toLowerCase() === "high";
    const decision = {
      category: highRisk ? baseline.category : String(parsed.category || baseline.category),
      risk: highRisk ? "high" : "low",
      autoSend: parsed.autoSend === true && !highRisk,
      summary: String(parsed.summary || "").trim(),
      reply: String(parsed.reply || "").trim()
    };

    return mustHoldForApproval(decision) ? { ...decision, autoSend: false } : decision;
  } catch {
    return heldFallback(baseline, "AI analiza nije uspjela.");
  }
}

function heldFallback(baseline, reason) {
  return {
    ...baseline,
    autoSend: false,
    summary: `${reason} Poruka je zadržana bez automatskog slanja.`,
    reply: ""
  };
}

function parseObject(value) {
  const text = String(value || "").trim();
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}
