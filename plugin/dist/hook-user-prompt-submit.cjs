#!/usr/bin/env node
"use strict";

// src/hooks/stdin.ts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// src/hooks/detect.ts
var BUILD_VERB = /\b(build|add|implement|create|set\s?up|integrate|make|wire\s?up|hook\s?up)\b/i;
var CAPABILITY_NOUN = /\b(payment|checkout|billing|subscription|invoice|auth|login|sign[\s-]?up|sign[\s-]?in|account|session|record(?:ing)?|upload|file\s?upload|storage|e-?mail|notification|chat|real[\s-]?time|websocket|socket|\bai\b|llm|agent|webhook|password\s?reset)\b/i;
function detectsBuildIntent(prompt) {
  return BUILD_VERB.test(prompt) && CAPABILITY_NOUN.test(prompt);
}
var SHIP_INTENT = /\b(ship(?:ping|\s?it)?|deploy(?:ing|ment)?|launch(?:ing)?|go(?:ing)?[\s-]?live|in?to production|release(?:\s?this)?|ready\s+to\s+(?:ship|launch|deploy|go\s?live)|is\s+(?:this|it)\s+(?:ready|production[\s-]?ready|done))\b/i;
function detectsShipIntent(prompt) {
  return SHIP_INTENT.test(prompt);
}

// src/hooks/user-prompt-submit.ts
var BUILD_NUDGE = `The user wants to build something. Before writing any code:
1. Call the anneal_review tool with mode "build-intent" (project_path = the project root).
2. Present EVERY requirement it surfaces, thoroughly \u2014 for each: what it is, why it matters, and a concrete failure scenario. Do not abbreviate to a terse list.
3. Record them in .anneal/findings.md as a checklist (create it if missing), each with a state: suggested \u2192 approved (user chose to include it) \u2192 done (built & verified) / deferred (user skipped for now) / dismissed (not applicable).
4. Honor the build mode noted in .anneal/findings.md (default: "pause"). In pause mode, ASK which requirements to include and WAIT for the user's answer before building \u2014 mark chosen items approved, the rest deferred. In "auto" mode, build them all with the safeguards baked in. If the user says to just build with safeguards, switch the mode to auto; if they say ask first, switch it back to pause.`;
var SHIP_NUDGE = `The user seems to be wrapping up or heading to production. Before proceeding: read .anneal/findings.md and resurface the still-open items (deferred or unaddressed) that are RELEVANT to going live and still apply to the current code, ordered by severity. Skip items that no longer apply. Lean toward surfacing \u2014 this is the last checkpoint before real users. Ask whether to handle them now or ship without.`;
function inject(context) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: context
      }
    })
  );
}
async function main() {
  let prompt = "";
  try {
    prompt = JSON.parse(await readStdin()).prompt ?? "";
  } catch {
    return;
  }
  if (detectsBuildIntent(prompt)) inject(BUILD_NUDGE);
  else if (detectsShipIntent(prompt)) inject(SHIP_NUDGE);
}
main().catch(() => {
});
