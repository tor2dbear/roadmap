// Minimal, dependency-free YAML-frontmatter parser.
// Handles exactly the subset the roadmap convention uses:
//   scalars (quoted or bare), integers, dates, and inline arrays [a, b, c].
// The body is everything after the closing `---`.

function parseScalar(raw) {
  let v = raw.trim();
  if (v === "") return "";
  // Double-quoted: JSON-decode so escapes (\" \\ …) round-trip with writers that
  // quote via JSON.stringify (the CLI and the board's puck template).
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') {
    try { return JSON.parse(v); } catch { return v.slice(1, -1); }
  }
  // Single-quoted: strip quotes; YAML's only escape inside is '' → '.
  if (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'") {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  // Inline array: [a, b, c] — only for genuinely unquoted values.
  if (v[0] === "[" && v[v.length - 1] === "]") {
    const inner = v.slice(1, -1).trim();
    if (inner === "") return [];
    return inner
      .split(",")
      .map((s) => stripQuotes(s.trim()))
      .filter((s) => s !== "");
  }
  // Bare scalar: strip a trailing YAML comment (a `#` only starts a comment when
  // preceded by whitespace, so `C# tips` and a bare `#123` are left intact).
  const c = v.search(/\s#/);
  if (c !== -1) v = v.slice(0, c).trim();
  return v;
}

function stripQuotes(s) {
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.length >= 2 && s[0] === "'" && s[s.length - 1] === "'") {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

/**
 * @param {string} text  full markdown file contents
 * @returns {{ data: Record<string, any>, body: string }}
 */
export function parseFrontmatter(text) {
  // Strip a leading UTF-8 BOM (Windows editors emit one) before the fence check,
  // otherwise the whole frontmatter block is silently treated as body.
  const normalized = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { data: {}, body: normalized };
  }
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) {
    return { data: {}, body: normalized };
  }
  const block = normalized.slice(4, end);
  // Body starts after the closing fence line.
  const afterFence = normalized.indexOf("\n", end + 1);
  const body = afterFence === -1 ? "" : normalized.slice(afterFence + 1);

  const data = {};
  for (const line of block.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    data[key] = parseScalar(line.slice(idx + 1));
  }
  return { data, body: body.trim() };
}
