// The Sync now button: dispatch `sync.yml`, wait for the run it made, reload.
//
// The assertions are on the *requests* and on whether the page reloaded — not on the
// toast. A toast says what the board believes; the request says what GitHub was
// actually asked to do, and the reload is the only observable difference between a
// sync that worked and one that quietly gave up.
import { group, eq, ok } from "./assert.mjs";

// A stand-in for the Actions API. `runs` answers newest-first, and the dispatch bumps
// the id — which is exactly the signal `awaitRun` polls for. `stayRunning` holds the
// run at `in_progress` so the waiting state can be observed at all; a run that is born
// completed reloads the page before an assertion can see the button.
function actionsStub(opts = {}) {
  const calls = [];
  let id = 41;
  let done = !opts.stayRunning;
  return {
    calls,
    handler(route) {
      const req = route.request();
      const url = new URL(req.url());
      calls.push({ method: req.method(), path: url.pathname, body: req.postData() || "" });
      const json = (body, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (url.pathname.endsWith("/dispatches")) {
        if (opts.dispatchStatus) return json({ message: "nope" }, opts.dispatchStatus);
        id++;
        return route.fulfill({ status: 204, body: "" });
      }
      if (url.pathname.endsWith("/runs")) {
        return json({ workflow_runs: [{
          id,
          status: done ? "completed" : "in_progress",
          conclusion: done ? (opts.conclusion || "success") : null,
        }] });
      }
      // Everything else the board asks GitHub on boot — the permissions probe.
      return json({ login: "tester", permissions: { push: true } });
    },
  };
}

const syncBtn = (page) => page.locator("#syncNow");
// Measured, not read off the property. The wrapper carries `display: flex` so its
// button and its separator keep the footer's rhythm, and a `display` set in CSS beats
// the browser's own `[hidden] { display: none }` — the board's `!important` override is
// the only thing holding it. Asserting `.hidden` would pass with the button on screen.
const shown = (page) => page.evaluate(() => {
  const b = document.getElementById("syncNow");
  return !!(b && b.getBoundingClientRect().height > 0);
});
// A marker that a reload wipes. Reading it back is how "the page reloaded" is asserted
// without reaching for navigation events, which fire for the board's own hash writes.
const mark = (page) => page.evaluate(() => { window.__stillHere = true; });
const reloaded = (page) => page.evaluate(() => window.__stillHere === undefined);

export async function run({ open }) {
  group("knappen är en skriv-affordans, alltså tokengrindad");
  {
    const p = await open();
    eq(await shown(p), false, "utloggad: ingen synkknapp på skärmen");
    eq(await p.evaluate(() => [...document.querySelectorAll(".foot")]
      .map((f) => f.textContent.replace(/\s+/g, " ").trim())[0]).then((t) => / · · /.test(t)),
      false, "och ingen kvarlämnad avdelare där den skulle ha stått");

    const q = await open("", { token: true, github: actionsStub().handler });
    eq(await shown(q), true, "med token: knappen syns");
    eq((await syncBtn(q).textContent()).trim(), "sync now", "och säger vad den gör");
  }

  group("den skickar EN dispatch, till arbetsflödet i aggregatorrepot");
  {
    const gh = actionsStub({ stayRunning: true });
    const p = await open("", { token: true, github: gh.handler });
    await syncBtn(p).click();
    await p.waitForTimeout(600);

    const posts = gh.calls.filter((c) => c.method === "POST");
    eq(posts.length, 1, "en dispatch, inte en per pollning");
    eq(posts[0].path, "/repos/acme/alpha/actions/workflows/sync.yml/dispatches",
      "mot aggregatorrepot ur board.config.json — inte mot en pucks källrepo");
    eq(JSON.parse(posts[0].body), { ref: "main" }, "med grenen workflow_dispatch kräver");

    // The read before the write is the whole reason the poll can tell the runs apart.
    const firstRuns = gh.calls.findIndex((c) => c.path.endsWith("/runs"));
    const firstPost = gh.calls.findIndex((c) => c.method === "POST");
    ok(firstRuns >= 0 && firstRuns < firstPost,
      "körningarna läses FÖRE dispatchen — annars finns inget id att jämföra mot");
  }

  group("medan den går: låst, och den säger det");
  {
    const gh = actionsStub({ stayRunning: true });
    const p = await open("", { token: true, github: gh.handler });
    await mark(p);
    await syncBtn(p).click();
    await p.waitForTimeout(600);
    eq((await syncBtn(p).textContent()).trim(), "syncing…", "etiketten är hela framstegsindikatorn");
    eq(await syncBtn(p).isDisabled(), true, "och knappen går inte att trycka igen");

    await syncBtn(p).click({ force: true });
    await p.waitForTimeout(300);
    eq(gh.calls.filter((c) => c.method === "POST").length, 1, "ett andra klick startar ingen andra körning");
    eq(await reloaded(p), false, "och sidan står kvar så länge körningen pågår");
  }

  group("klar och grön: sidan laddas om, för tavlan läser sin data en gång");
  {
    const p = await open("", { token: true, github: actionsStub().handler });
    await mark(p);
    eq(await reloaded(p), false, "markören finns innan");
    await syncBtn(p).click();
    await p.waitForFunction(() => window.__stillHere === undefined, null, { timeout: 15000 });
    eq(await reloaded(p), true, "omladdad — annars visar tavlan kvar den gamla skörden");
  }

  group("403: felet namnger behörigheten, inte statuskoden");
  {
    const p = await open("", { token: true, github: actionsStub({ dispatchStatus: 403 }).handler });
    await mark(p);
    await syncBtn(p).click();
    await p.waitForTimeout(800);
    const msg = await p.evaluate(() => (document.querySelector(".toast") || {}).textContent || "");
    ok(/Actions: write/.test(msg), `säger vilken behörighet som saknas: ${JSON.stringify(msg)}`);
    ok(/acme\/alpha/.test(msg), `och på vilket repo: ${JSON.stringify(msg)}`);
    eq(await reloaded(p), false, "ingen omladdning på ett fel — det hade dolt felet");
    eq((await syncBtn(p).textContent()).trim(), "sync now", "och knappen är brukbar igen");
  }

  group("avbruten körning är inte en misslyckad");
  {
    // `sync.yml` kör under concurrency: cancel-in-progress, så en push mitt i avbryter
    // vår körning — och ersättaren skördar samma källor. Inget är förlorat.
    const p = await open("", { token: true, github: actionsStub({ conclusion: "cancelled" }).handler });
    await mark(p);
    await syncBtn(p).click();
    await p.waitForTimeout(1200);
    const msg = await p.evaluate(() => (document.querySelector(".toast") || {}).textContent || "");
    ok(/newer sync/i.test(msg), `säger att en nyare körning tog över: ${JSON.stringify(msg)}`);
    eq(await reloaded(p), false, "och laddar inte om — den nyare körningen har inte deployat än");
  }

  group("⌘K når samma anrop, under samma grind");
  {
    const p = await open();
    const has = async (page) => {
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(250);
      await page.keyboard.type("Sync");
      await page.waitForTimeout(300);
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll(".cmdk-overlay .row, .cmdk-overlay li, .cmdk-box .row")]
          .map((r) => r.textContent.replace(/\s+/g, " ").trim()));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      return rows.some((r) => /Sync now/i.test(r));
    };
    eq(await has(p), false, "utloggad: kommandot erbjuds inte heller i paletten");

    const q = await open("", { token: true, github: actionsStub({ stayRunning: true }).handler });
    eq(await has(q), true, "med token: paletten når det chrome:t når");
  }
}
