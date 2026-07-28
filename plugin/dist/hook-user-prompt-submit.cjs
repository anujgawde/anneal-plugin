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
1. Call the review tool with mode "build-intent" (project_path = the project root).
2. Surface EVERY requirement that applies to what THIS request is building \u2014 scope them to the request (a whole-app build has app-wide requirements; a single small feature has only that feature's). Never cap at a round number (5, 10, 20): if 13 apply, give all 13; if 4, give 4 \u2014 the count is whatever is actually real. For each: what it is, why it matters, and a concrete failure scenario. No terse lists.
3. Track each one by calling the record tool (state: suggested \u2192 approved when the user chooses it \u2192 done once built & verified / deferred if skipped for now / dismissed if not applicable). Anneal maintains .anneal/findings.md for you \u2014 never edit it by hand.
4. Honor the build mode in .anneal/config.json (findings.mode, default "pause"). In pause mode, ASK which requirements to include and WAIT for the user's answer before building \u2014 mark chosen items approved, the rest deferred. In "auto" mode, build them all with the safeguards baked in. If the user says to just build with safeguards, set findings.mode to "auto" in config.json; if they say ask first, set it back to "pause".
5. When you build, weave each APPROVED requirement INTO the feature it belongs to as you build that feature (e.g. the upload endpoint WITH validation, the AI call WITH the key in env + rate limiting). Do NOT front-load a separate "safeguards phase" or make the user clear requirements before real building starts \u2014 you are building their app *well*, not gating it.`;
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
