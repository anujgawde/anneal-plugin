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

// src/hooks/user-prompt-submit.ts
var NUDGE = 'The user is expressing intent to build a feature. Before writing code, call the anneal_review tool with mode "build-intent" (project_path = the project root) and present the production requirements Anneal returns, so nothing important is missed from the start.';
async function main() {
  let prompt = "";
  try {
    prompt = JSON.parse(await readStdin()).prompt ?? "";
  } catch {
  }
  if (detectsBuildIntent(prompt)) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: NUDGE
        }
      })
    );
  }
}
main().catch(() => {
});
