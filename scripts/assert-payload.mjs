// Guard the generated payload before it deploys (prod: sync.yml) or merges
// (PR: pr-preview.yml). Exits nonzero — so the deploy/merge is blocked — when the
// aggregate is unusable: no items, or any configured source failed to harvest.
// The harvester deliberately records a per-source failure in sources[].error and
// keeps going (so one flaky source doesn't kill the whole run), which means a
// missing/misspelled path would otherwise publish a board with that repo silently
// dropped. This is the one place that turns that recorded error into a hard stop.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(path.join(ROOT, "data", "roadmap.json"), "utf8"));

if (!Array.isArray(data.items) || data.items.length === 0) {
  console.error("✗ roadmap.json has no items");
  process.exit(1);
}
const failed = (data.sources || []).filter((s) => s && s.error);
if (failed.length) {
  console.error("✗ source(s) failed to harvest:\n  " + failed.map((s) => `${s.repo} — ${s.error}`).join("\n  "));
  process.exit(1);
}
console.log(`✓ payload ok: ${data.items.length} items across ${(data.sources || []).length} sources`);
