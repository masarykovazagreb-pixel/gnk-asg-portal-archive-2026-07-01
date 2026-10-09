#!/usr/bin/env node
import fs from "node:fs";

const required = [
  "config/control-plane/master-asg-autonomous-agent-v1.json",
  "config/control-plane/bot-ownership-v1.json",
  "apps/portal/data/freshness-status.json"
];

const failures = required.filter((p) => !fs.existsSync(p));
if (failures.length) {
  console.error("MASTER ASG agent preflight FAIL:", failures.join(", "));
  process.exit(1);
}

const agent = JSON.parse(fs.readFileSync(required[0], "utf8"));
const ownership = JSON.parse(fs.readFileSync(required[1], "utf8"));
const freshness = JSON.parse(fs.readFileSync(required[2], "utf8"));

const checks = {
  prFirst: agent.guardrails?.prFirst === true,
  directMainDisabled: agent.guardrails?.directMainWrites === false,
  mergeNotLive: agent.guardrails?.mergeIsLive === false,
  exactShaForLive: agent.guardrails?.exactShaRequiredForLive === true,
  humanGate: agent.guardrails?.humanEditorialGate === "Nermin Sefić",
  freshnessKnown: typeof freshness.overall === "string",
  ownershipLoaded: !!ownership && typeof ownership === "object"
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({agent: agent.version, freshness: freshness.overall, checks}, null, 2));
if (failed.length) {
  console.error("MASTER ASG agent guardrail FAIL:", failed.join(", "));
  process.exit(1);
}
