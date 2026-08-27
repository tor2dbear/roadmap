// Assertions live here and not in the runner on purpose. The runner has a top-level
// `await` (it drives a browser), and a test file that imported its helpers from there
// would deadlock: the runner's dynamic `import()` of the test waits for the test's
// import of the runner, which waits for the runner to finish evaluating. It hangs with
// no output at all, which reads like a broken browser rather than a broken graph.
let failures = 0;
let checks = 0;
let current = "";

export function group(name) { current = name; }

// Print the *values* on failure, never just "expected true". A failing assertion that
// does not say what it saw sends you back to the browser to find out — which is the
// work the test was supposed to have already done.
export function eq(actual, expected, label) {
  checks++;
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) return true;
  failures++;
  console.log(`\n  ✗ ${current ? current + " — " : ""}${label}\n      fick:     ${a}\n      väntade:  ${b}`);
  return false;
}

export function ok(cond, label) { return eq(!!cond, true, label); }
export function near(actual, expected, slack, label) {
  checks++;
  if (Math.abs(actual - expected) <= slack) return true;
  failures++;
  console.log(`\n  ✗ ${current ? current + " — " : ""}${label}\n      fick:     ${actual}\n      väntade:  ${expected} ±${slack}`);
  return false;
}

export const tally = () => ({ checks, failures });
export const failed = () => failures;
