# Anneal — Claude Code Plugin

A production-readiness observer for Claude Code. It watches what you build and surfaces what your app _needs_ — the requirements AI code generation doesn't volunteer on its own, like missing consent flows, webhook handling, rate limiting, or account deletion.

## When to use Anneal

Anneal is for anyone building real apps with Claude Code who wants to ship something production-ready without memorizing a security checklist. Use it when you're:

- **Vibe-coding** and want a safety net that catches what you didn't think to ask for
- **Building features that handle sensitive data** — payments, auth, file uploads, user records
- **Preparing to ship** and want to know what's missing before real users hit it
- **Working with AI features** and need guardrails like rate limiting, cost caps, and disclaimers

You don't need to change how you work. Install it and build normally — Anneal observes and chimes in when something matters.

## Features

### Real-time code monitoring

Anneal watches every file you write or edit. When it spots an issue — like a hardcoded API key, a wildcard CORS origin, or SQL string concatenation — it flags it immediately with a one-line notice. No manual scan needed.

### Build intent detection

When you ask Claude to build something ("add Stripe payments", "set up auth", "build a file upload endpoint"), Anneal detects the intent and surfaces the production requirements _before_ any code gets written. This means you build the feature correctly from the start instead of retrofitting safeguards later.

### Production-readiness review

After significant changes, Anneal analyzes your codebase through six lenses:

- **Security & access control** — authorization gaps, hardcoded secrets, CORS issues
- **Privacy, consent & legal** — missing consent flows, data handling obligations
- **Data lifecycle** — retention, deletion, export
- **Failure & edge-case handling** — what breaks when things go wrong
- **Abuse & cost controls** — rate limiting, resource caps
- **User-facing safety** — transparency, disclaimers, error messages

It reports only what's _missing_ — not what you've already handled.

### Plain language explanations

Every requirement comes with a concrete failure scenario explaining why it matters. No jargon — instead of "IDOR vulnerability in resource endpoint," you get "if someone changes the ID in the URL, they can see another user's data."

### Findings tracker

Anneal maintains a local journal in `.anneal/` (gitignored, stays on your machine) that tracks every requirement through its lifecycle:

- **suggested** — surfaced, waiting for your decision
- **approved** — you chose to include it, goes into the build
- **done** — built and verified in the code
- **deferred** — skipped for now, will resurface at the right moment
- **dismissed** — not applicable to your project

Deferred items don't disappear — they come back when you're working on the relevant feature, when you're about to ship, or when you ask what's still open.

### Build mode control

- **pause** (default) — surfaces requirements and waits for your approval before building
- **auto** — builds everything with safeguards included, no confirmation step

Tell Claude "just build it with safeguards" to switch to auto, or "ask me first" to switch back. The setting lives in `.anneal/config.json`.

### Inline safeguards, not a checklist phase

Approved requirements get woven _into_ the feature as Claude builds it — the upload endpoint ships with validation, the AI call ships with the key in an env var and rate limiting. Anneal doesn't gate your build behind a separate "safeguards phase."

## Install

### From the marketplace (recommended)

Works the same across all Claude Code surfaces — terminal, VS Code side panel, desktop app, or web (claude.ai/code):

```
/install anneal
```

Type this in the chat input and confirm when prompted.

### Via the CLI

If you're using the Claude Code CLI directly in your terminal:

```bash
claude plugin install anneal
```

By default, this installs at the **user** scope (available in all your projects). You can also scope it:

```bash
claude plugin install anneal --scope project   # only this project
claude plugin install anneal --scope local      # only this machine, this project
```

## Update

### From the chat input (any surface)

```
/install anneal
```

Re-running the install command pulls the latest version.

### Via the CLI

```bash
claude plugin update anneal
```

## Uninstall

### From the chat input (any surface)

```
/uninstall anneal
```

### Via the CLI

```bash
claude plugin uninstall anneal
```

## Usage

Once installed, Anneal runs automatically. You don't need to invoke it — just build as you normally would.

### Automatic triggers

Anneal activates when you:

- **Ask Claude to build a feature** — "add Stripe payments", "build a login page", "set up file uploads"
- **Write or edit code** — the post-tool-use hook checks every file change in real time
- **Submit a prompt** — the prompt hook detects build intent and triggers a pre-build review

### Manual triggers

You can also invoke Anneal directly:

| What you say | What happens |
|---|---|
| "anneal review" | Full review of recent changes |
| "what's still open?" | Lists all tracked findings that aren't done or dismissed |
| "is this ready to ship?" | Resurfaces deferred items that still apply |
| "just build it with safeguards" | Switches to auto mode — builds everything without asking |
| "ask me first" | Switches back to pause mode |

### Typical workflow

1. You ask Claude to build something ("add user authentication")
2. Anneal detects the intent and surfaces requirements — password hashing, session management, rate limiting on login, account lockout, etc.
3. In **pause** mode, you pick which ones to include. In **auto** mode, they all go in.
4. Claude builds the feature with the safeguards woven in
5. After the build, Anneal reviews the output and flags anything that's still missing
6. Deferred items resurface when you touch the relevant code or prepare to ship

## What Anneal is not

- **Not a linter or static analysis tool.** Anneal doesn't check syntax, formatting, or code style. Tools like ESLint and Prettier already do that.
- **Not a test runner.** It doesn't execute your code or run your test suite. It reasons about what's missing, not whether what's there is correct.
- **Not a CI gate.** It runs locally inside your Claude Code session. There's no CI integration, no build step, no blocking pipeline.
- **Not a vulnerability scanner.** It doesn't scan dependencies or CVE databases. It catches architectural gaps — the missing rate limiter, the absent consent flow, the webhook you forgot to handle.

Anneal is an observer that thinks about what your app needs for production that you didn't explicitly ask for. It complements your existing tools, not replaces them.

## Example output

Here's what `.anneal/findings.md` looks like after Anneal reviews a project with user auth and payments:

```markdown
# Anneal — Findings
_Updated 2026-07-28_

## Open
- [ ] 🔴 user-accounts — Hash passwords with bcrypt or argon2 — never store them reversibly · why: A database leak with plaintext passwords hands the attacker every account, plus every place users reused that password. · suggested
- [ ] 🔴 payments — Never store raw card numbers — tokenize through the provider · why: Touching raw PANs pulls you into full PCI-DSS scope and makes a breach catastrophic. Let the provider hold the card and keep only its token. · suggested
- [ ] 🟠 user-accounts — Rate-limit login attempts and lock accounts after repeated failures · why: Without this, an attacker can brute-force passwords at machine speed. · suggested
- [ ] 🟡 payments — Handle webhook failures with idempotent retries · why: If someone disputes a charge and you have no webhook handler, you won't know until the money's gone. · deferred

## Building
- [ ] 🔴 user-accounts — Authorize resource access by ownership, not just by a valid session · why: A logged-in user changing an id in the URL reaches another user's record unless you check they own it. · approved

## Done
- [x] 🟠 user-accounts — Store session tokens in httpOnly cookies, not localStorage · done
```

This file is generated and maintained by Anneal — you never edit it by hand.

## FAQ

**Does Anneal send my code anywhere?**

No. Everything runs locally inside your Claude Code session. The MCP server, hooks, and skill all execute on your machine. No code or findings leave your environment.

**Does it slow down Claude?**

Minimally. The hooks have a 5-second timeout. The MCP server calls (`review` and `record`) run as part of Claude's normal tool-use flow — they analyze files on disk, not over a network.

**Can I customize the requirements?**

The built-in knowledge base covers common capabilities (payments, auth, uploads, AI, etc.). You can't edit the corpus directly, but Anneal's analysis isn't limited to it — Claude reasons beyond the baseline using the production-readiness skill, so app-specific gaps get caught too.

**Does it work with any language or framework?**

Yes. Anneal analyzes what your code _does_ (handles payments, stores user data, serves files), not how it's written. It works with any stack Claude Code supports.

**What's the `.anneal/` directory?**

A local, gitignored directory where Anneal tracks findings. Contains `findings.md` (human-readable checklist), `store.json` (structured data), and `config.json` (settings like build mode). It stays on your machine and is safe to delete — a fresh review regenerates it.

**Can I use it on an existing project?**

Yes. Say "anneal review" and it will analyze your current codebase. It's not limited to new projects or new code.

## How it works under the hood

Anneal is a Claude Code plugin made up of four components:

| Component | What it does |
|---|---|
| **MCP server** | Exposes two tools — `review` (analyzes your project) and `record` (tracks findings). Claude calls these automatically. |
| **Post-tool-use hook** | Runs after every file write/edit. Flags deterministic issues like hardcoded secrets or CORS wildcards in real time. |
| **Prompt-submit hook** | Runs when you submit a prompt. Detects build intent so Anneal can surface requirements before code gets written. |
| **Production-readiness skill** | Teaches Claude the methodology — how to apply the readiness lenses, present findings, sequence the build, and manage the findings journal. |
| **Knowledge base** | A curated corpus of production requirements mapped to capabilities (payments, auth, uploads, AI, etc.) that sharpens the analysis. |

## License

MIT
