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

- **Surface everything that applies — no round numbers.** List *every* relevant requirement. Don't stop at a tidy count like 5, 10, or 20; if 13 apply, give all 13; if 4 apply, give 4. The count is whatever's actually real, never a habit.
- **Scope to what's being built.** Match the set to the request: a "build the whole app" prompt surfaces app-wide requirements; "add a login form" surfaces only login's. Don't dump the whole app's concerns onto a small feature.
- Plain language — the user may not be an engineer. Don't use jargon (OWASP, CWE, "attack vector") without explaining it.
- Explain WHY each gap matters with a concrete scenario ("if someone disputes a charge and you have no webhook handler, you won't know until the money's gone").
- Distinguish deterministic findings (verified in the code) from requirements (things that should exist but might not yet).
- Report only what's MISSING — don't recite what's already handled. Offer to build each gap.

## Sequencing the build

You are building the user's app **well** — not gating it. Once requirements are approved, weave each one **into the feature it belongs to as you build that feature**: build the upload endpoint *with* validation, the AI call *with* the key in an env var and rate limiting, the results view *with* the disclaimer. Do **not** front-load a separate "safeguards phase" or make the user clear a checklist before real building starts. The safeguards ship *alongside* the feature, not before it.

## The findings journal (`.anneal/findings.md`)

Maintain a running record at `.anneal/findings.md` (create it if missing — `.anneal/` is gitignored, so it stays local). It's a **working checklist, not a source of truth**: a fresh `anneal_review` is always ground truth. It has two jobs — track each finding's state, and remember the user's build-mode preference.

### Header: build mode
The header records the mode:
```
mode: pause
```
- **pause** (default) — surface requirements, ask which to include, and **wait** for the user before building.
- **auto** — build them all with the safeguards baked in, no confirmation.

If the user says "just build it with safeguards" (or similar), set `mode: auto`. If they say "ask me first," set it back to `mode: pause`. Honor whatever it currently says.

### Each finding has a state
- **suggested** — surfaced, awaiting the user's call
- **approved** — user chose to include it → goes in the build plan → build it
- **done** — built and verified in the code (only mark done once you've confirmed it's actually there)
- **deferred** — user skipped it for now → stays open, resurfaces later (see below)
- **dismissed** — user said not applicable → keep it out of the way

Edit items in place — don't duplicate or shuffle. If a `done` item regresses (reappears in a later review), flip it back to `approved`.

### Suggested shape
```markdown
# Anneal — Findings
mode: pause
_Updated 2026-07-23_

## Open
- [ ] 🔴 recording — no consent flow before capture (src/lib/recorder.ts) · why: illegal to record people without consent in many places · deferred
- [ ] 🟠 payments — no webhook handler for refunds/disputes · suggested

## Building
- [ ] 🔴 secrets — move hardcoded API key to an env var (src/lib/openai.ts:3) · approved

## Done
- [x] 🟠 cors — restrict CORS to known origins (src/server.ts) · done 2026-07-23

## Dismissed
- no-tests — not applicable: early prototype
```

### When deferred items come back (the 3 resurface events)
Deferred items never vanish — they wait in the journal and return when they matter:
1. **Ship gate** — when the user is wrapping up or going to production ("deploy", "ship it", "is this ready"), resurface the deferred items that **still apply to the current code and matter for going live**, ordered by severity. Skip ones that no longer apply, but lean toward surfacing — this is the last checkpoint before real users.
2. **While building** — when you're working on the feature a deferred item belongs to (e.g. building the endpoint that needed rate limiting), bring it up right then, not before.
3. **On request** — when the user asks "what's still open?" / "anneal review", list the open items.

Mention the journal when you create or meaningfully update it, but don't nag about it.
