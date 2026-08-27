// The two parsers that decide what a puck says: the frontmatter reader, and the one
// that turns a typed issue reference into a number. Neither needs a browser, so this
// file ignores the context the runner hands it.
//
// Both bugs here were found in an audit last August (#4) and outlived the branch that
// fixed them, because that branch went stale before it landed. They are re-cut against
// today's code with the checks the old one never had.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { group, eq, ok } from "./assert.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// `parseIssue` sits inside app.js's IIFE and `formatValue` inside the CLI's module
// scope; neither is exported, and parseIssue's only caller writes to GitHub, so the
// board cannot be driven into it from a test without a token.
//
// Asserting against a hand-copied duplicate would be worse than no test: the copy
// keeps passing after the real function changes, which is the exact failure this whole
// suite exists to avoid. So the check lifts each function's *own source* out of the
// file by name and evaluates that. Rename or delete one and `lift` throws with the
// name it could not find, rather than quietly measuring nothing.
async function lift(file, name) {
  const src = await readFile(ROOT + file, "utf8");
  const head = src.indexOf("function " + name + "(");
  if (head === -1) throw new Error(`${name} finns inte längre i ${file}`);
  let i = src.indexOf("{", head), depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) { end = j + 1; break; }
  }
  if (end === -1) throw new Error(`hittade inte slutet på ${name} i ${file}`);
  return new Function("return (" + src.slice(head, end) + ")")();
}

export async function run() {
  const parseIssue = await lift("app.js", "parseIssue");
  const formatValue = await lift("scripts/roadmap.mjs", "formatValue");

  group("frontmatter läses som den skrevs");
  {
    // A BOM does not start with `---`, so the fence check missed and every field
    // became body. Silent, and only on editors that emit one.
    const bom = parseFrontmatter("﻿---\nstatus: now\ntitle: Ett\n---\nbrödtext\n");
    eq(bom.data.status, "now", "BOM före hakarna hindrar inte fälten");
    eq(bom.body.trim(), "brödtext", "och brödtexten är fortfarande brödtext");

    // `#` opens a comment only after whitespace — the narrow rule matters, because the
    // wide one would eat the two values below.
    eq(parseFrontmatter("---\nstatus: now # obs\n---\n").data.status, "now",
      "efterföljande kommentar hör inte till värdet");
    eq(parseFrontmatter("---\ntitle: C# tips\n---\n").data.title, "C# tips",
      "men en brädgård utan blanksteg före är text");
    eq(parseFrontmatter("---\ntitle: #123\n---\n").data.title, "#123",
      "och ett värde som börjar med brädgård är också text");

    eq(parseFrontmatter('---\ntitle: "En \\"sak\\""\n---\n').data.title, 'En "sak"',
      "escaper i dubbelcitat avkodas");
    eq(parseFrontmatter("---\ntitle: 'it''s'\n---\n").data.title, "it's",
      "och YAML:s enda escape i enkelcitat");
    eq(parseFrontmatter('---\ntitle: "[WIP] x"\n---\n').data.title, "[WIP] x",
      "ett citerat värde med hakparentes är en sträng, inte en lista");
    eq(parseFrontmatter("---\ntags: [a, b]\n---\n").data.tags, ["a", "b"],
      "en riktig lista är fortfarande en lista");
  }

  group("skrivaren och läsaren möts");
  {
    // The actual defect: `formatValue` quotes a title with JSON.stringify, and the
    // reader used to slice the quotes off without decoding. Both real functions are
    // used here, so the round trip is the assertion — not either end's own idea of it.
    // The list is chosen against `formatValue`'s own rule, not around it: it quotes
    // only when the title holds a `:` or a `#`. A title with a quote but neither of
    // those is written bare and round-trips even on the broken reader — so a set made
    // only of those passes without proving anything. The first two below are the ones
    // that actually corrupt: quoted *and* carrying a quote to escape.
    const titles = [
      'Puck: en "sak"',
      'C# med "citat"',
      'En "sak"',
      "Puck: med kolon",
      "C# och #123",
      "[WIP] utkast",
      "vanlig titel",
    ];
    for (const t of titles) {
      const written = formatValue("title", t);
      const read = parseFrontmatter("---\ntitle: " + written + "\n---\n").data.title;
      eq(read, t, `rundgång: ${JSON.stringify(t)}`);
    }
  }

  group("issue-referensen läses från rätt siffror");
  {
    const url = "https://github.com/acme/alpha/issues/12";
    eq(parseIssue("42"), 42, "ett blankt tal");
    eq(parseIssue("#42"), 42, "med brädgård");
    eq(parseIssue(url), 12, "en hel URL");
    // The bug: a link copied out of a comment thread carries the comment's id last.
    eq(parseIssue(url + "#issuecomment-345"), 12, "URL med kommentarsfragment");
    eq(parseIssue(url + "?utm=x&n=7"), 12, "URL med frågesträng");
    eq(parseIssue("skräp"), null, "text utan siffror avvisas");
    eq(parseIssue("abc123"), null, "och ett tal som sitter fast i text");
    ok(parseIssue("") === null, "tomt avvisas");
  }
}
