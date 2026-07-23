---
name: production-readiness
description: How to reason about and present production-readiness gaps — the Anneal methodology, readiness lenses, and findings-journal rules. Use whenever the anneal_review tool returns capabilities or findings, when the user asks to build or add a feature (payments, auth, recording, uploads, email, real-time, AI, …), or when checking whether an app is ready for real users.
---

# Anneal — production-readiness methodology

Anneal is a production-readiness observer running alongside this session. It tells you what the project *does*; you reason about what it *needs* — the production gaps AI code generation didn't volunteer (missing consent flows, webhook handling, account deletion, and the like). Anneal points; you explain and build.

## When to consult Anneal

- **On build intent** — when the user asks to build or add a feature (payments, auth, recording, uploads, email, real-time, AI, …), call `anneal_review` with `mode: "build-intent"` and `project_path` set to the project root **before writing code**. Present the requirements to include from the start.
- **After changes** — after writing significant code, or when the user says "anneal review" / asks what Anneal found, call `anneal_review` with `mode: "review"`.
- The PostToolUse tap may print a one-line notice after a write (e.g. a hardcoded secret). Mention it naturally when it appears.

## How to reason (the readiness lenses)

For each detected capability, apply the readiness lenses to THIS codebase, decide which production requirements are already handled and which are MISSING, and surface only the gaps. For each gap: name it, explain in plain language why it matters with a concrete failure scenario, and offer to build it. Never assume — verify low-confidence capabilities against the code first, and prefer silence over a false alarm.

Lenses to apply to each capability:

- **Security & access control**
- **Privacy, consent & legal obligations**
- **Data lifecycle** — retention, deletion, export
- **Failure & edge-case handling**
- **Abuse, rate-limiting & cost controls**
- **User-facing safety & transparency**

## The review payload

`anneal_review` returns:

- `capabilities` — what the project does, with confidence and the signals that triggered detection. Low-confidence ones are guesses: verify against the code before asserting.
- `directive` — a short pointer describing what to reason about (its `mode` is `build-intent` or `review`).
- `findings` — deterministic code-level issues Anneal verified (hardcoded secrets, CORS wildcards, SQL concatenation…). These are facts, not guesses.

## How to present

- Plain language — the user may not be an engineer. Don't use jargon (OWASP, CWE, "attack vector") without explaining it.
- Explain WHY each gap matters with a concrete scenario ("if someone disputes a charge and you have no webhook handler, you won't know until the money's gone").
- Distinguish deterministic findings (verified in the code) from requirements (things that should exist but might not yet).
- Report only what's MISSING — don't recite what's already handled. Offer to build each gap.

## Maintaining a findings journal (`.anneal/findings.md`)

Keep a running, human-readable journal of what Anneal surfaces, at `.anneal/findings.md` in the project root (create it if missing — the `.anneal/` directory is gitignored, so it stays local). This is a **journal, not a source of truth**: a fresh `anneal_review` is always ground truth. Update the journal, don't treat it as authoritative.

It's a **running document**: each finding is a checklist item whose state you keep current *in place* — check it off when done, uncheck it if it regresses. Don't shuffle items between sections or duplicate them; edit the existing line.

When to update it:
- **After an `anneal_review`** — add any new gaps as unchecked items: severity, capability/area, what's missing, why it matters, and `file:line` for code-level findings.
- **When a finding is resolved** — mark it `[x]` with a short "done <date>", *but only if you've verified it's actually gone in the code*. Never check off a fix you didn't confirm.
- **When a resolved finding regresses** (the issue reappears in a later review) — flip it back to `[ ]` and note it. That's why it's a running doc, not a one-way log.
- **When the user dismisses or accepts a risk** — move that item to **Dismissed / Accepted** with the reason and date.

Keep it concise and readable. Suggested shape:

```markdown
# Anneal — Findings
_Updated 2026-07-22_

## Checklist
- [ ] 🔴 recording — no consent flow before capture (src/lib/recorder.ts) · why: recording people without consent is illegal in many places
- [x] 🔴 secrets — hardcoded API key (src/lib/openai.ts:3) · done 2026-07-22
- [ ] 🟠 payments — no webhook handler for refunds/disputes

## Dismissed / Accepted
- no-tests — accepted: early prototype, 2026-07-22
```

Mention the doc when you create or meaningfully update it, but don't nag about it.
