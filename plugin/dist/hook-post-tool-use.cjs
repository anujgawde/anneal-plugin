#!/usr/bin/env node
"use strict";

// src/hooks/post-tool-use.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// src/core/deterministic/quick-checks.ts
var RULES = [
  {
    code: "hardcoded-secret",
    severity: "critical",
    pattern: /\b(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|xox[bpas]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35})\b/,
    label: "Hardcoded API key/secret in source \u2014 move it to an env var",
    scanComments: true
  },
  {
    code: "private-key-committed",
    severity: "critical",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/,
    label: "Private key committed to source",
    scanComments: true
  },
  {
    code: "sql-injection",
    severity: "high",
    pattern: /\b(query|execute|raw)\s*\(\s*(`[^`]*\$\{|['"][^'"]*['"]\s*\+)/,
    label: "SQL built by string concatenation \u2014 use parameterized queries"
  },
  {
    code: "cors-wildcard",
    severity: "high",
    pattern: /origin:\s*['"]\*['"]|origin:\s*true\b|cors\(\s*\)/,
    label: "CORS allows any origin"
  },
  {
    code: "dangerous-html",
    severity: "high",
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=[^=]|document\.write\s*\(/,
    label: "Unescaped HTML from possibly user input \u2014 XSS risk"
  },
  {
    code: "debugger-left",
    severity: "low",
    pattern: /\bdebugger\b/,
    label: "`debugger` statement left in source"
  }
];
function runQuickChecks(file) {
  const findings = [];
  const lines = file.content.split("\n");
  lines.forEach((line, i) => {
    const commented = isCommentLine(line);
    for (const rule of RULES) {
      if (commented && !rule.scanComments) continue;
      if (rule.pattern.test(line)) {
        findings.push({
          code: rule.code,
          severity: rule.severity,
          file: file.path,
          line: i + 1,
          label: rule.label
        });
      }
    }
  });
  return findings;
}
function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("#");
}

// src/hooks/stdin.ts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// src/core/shared/severity.ts
var SEVERITY_ORDER = [
  "critical",
  "high",
  "medium",
  "low"
];

// src/hooks/detect.ts
function summarizeTap(findings) {
  if (findings.length === 0) return null;
  const counts = /* @__PURE__ */ new Map();
  for (const f of findings) counts.set(f.severity, (counts.get(f.severity) ?? 0) + 1);
  const bySeverity = SEVERITY_ORDER.filter((s) => counts.has(s)).map((s) => `${counts.get(s)} ${s}`).join(", ");
  const n = findings.length;
  const where = findings[0].file;
  return `Anneal: ${n} issue${n === 1 ? "" : "s"} (${bySeverity}) starting in ${where}. Ask Anneal to review for details.`;
}

// src/hooks/post-tool-use.ts
var WRITE_TOOLS = /* @__PURE__ */ new Set(["Write", "Edit", "MultiEdit"]);
var SOURCE = /\.(js|jsx|ts|tsx|mjs|cjs|json|env|ya?ml)$/i;
var SKIP = /(^|\/)(node_modules|\.git|dist|build|\.next)(\/|$)/;
function passthrough(extra) {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true, ...extra }));
}
async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    passthrough();
    return;
  }
  const { tool_name, cwd, tool_input } = input;
  const filePath = tool_input?.file_path;
  if (!tool_name || !WRITE_TOOLS.has(tool_name) || !filePath || !SOURCE.test(filePath) || SKIP.test(filePath)) {
    passthrough();
    return;
  }
  const abs = (0, import_node_path.isAbsolute)(filePath) ? filePath : (0, import_node_path.join)(cwd ?? process.cwd(), filePath);
  let content;
  try {
    content = (0, import_node_fs.readFileSync)(abs, "utf8");
  } catch {
    content = tool_input?.content ?? "";
  }
  const message = summarizeTap(runQuickChecks({ path: filePath, content }));
  passthrough(message ? { systemMessage: message } : void 0);
}
main().catch(() => passthrough());
