// Two ticks in one facet are a union; two ticks in different facets are an
// intersection. That sentence is the whole fix, and it used to be false for `State`:
// `is:` wrote a term per value and `runQuery` ANDs terms, so ticking two rows asked
// for a contradiction and the board went empty.
//
// The fixture's live board is seven pucks (inbox and the archive are outside the
// default view): one etapp, one member of it, and five standalone.
import { trayEye } from "./fixture.mjs";
import { group, eq, ok } from "./assert.mjs";

const cards = (page) => page.evaluate(() => document.querySelectorAll(".board .card").length);
const queryOf = (page) => new URLSearchParams(new URL(page.url()).search).get("q");

async function openFacet(page, label) {
  await page.locator("#filterBtn").click();
  await page.waitForTimeout(200);
  await page.locator(".fp-row").filter({ hasText: new RegExp(`^${label}`) }).click();
  await page.waitForTimeout(150);
}
function valRow(page, label) {
  return page.locator(".fp-val").filter({ has: page.locator(".fp-vlabel", { hasText: new RegExp(`^${label}$`) }) });
}
// `click`, not `check`: check() waits for the box to *stay* ticked, so a bug that
// drops the value on the round trip through the query hangs for thirty seconds and
// reports a timeout on a locator. Clicking states what happened and lets the
// assertions below name what went wrong.
async function tick(page, label) {
  await valRow(page, label).locator("input").click();
  await page.waitForTimeout(200);
}
// The number printed beside a value. Read as text, because that is what the reader is
// being asked to trust before clicking.
const countOf = (page, label) => valRow(page, label).locator(".fp-n").textContent();

export async function run({ open }) {
  group("två kryss i samma facett förenar");
  {
    const p = await open();
    eq(await cards(p), 7, "utgångsläget är sju levande puckar");

    await openFacet(p, "Membership");
    // Each row must be reachable on its own first, or the union below could read as
    // right while one half of it silently matched nothing.
    await tick(p, "Is an etapp");
    eq(await cards(p), 1, "en etapp");
    await tick(p, "In no etapp");
    eq(await cards(p), 6, "etappen *och* de fem fristående — inte noll");
    eq(queryOf(p), "is:etapp,standalone", "skrivet som ett term med två värden");
  }

  group("unionen överlever en länk");
  {
    // The serialization half: before the fix `is:etapp,standalone` was not a known
    // state, so the whole token fell through to free text and matched nothing.
    const p = await open("?q=is:etapp,standalone");
    eq(await cards(p), 6, "samma sex kort ur URL:en");
  }

  group("status-facetten gör likadant");
  {
    // The second facet, so the rule reads as the panel's and not as one section's
    // special case.
    const p = await open();
    await openFacet(p, "Status");
    await tick(p, "Now");
    await tick(p, "Next");
    eq(await cards(p), 5, "tre i Now plus två i Next");
    eq(queryOf(p), "status:now,next", "samma form: ett term, två värden");
  }

  group("olika facetter skär i stället");
  {
    // The reason the fix is three sections and not a flat OR over `is:`. Ready is four
    // pucks and In an etapp is one; a union would be four, and this question — "redo,
    // och inne i en etapp" — would have been lost to fix the one above.
    const p = await open("?q=is:ready");
    eq(await cards(p), 4, "redo på egen hand");
    const q = await open("?q=is:member");
    eq(await cards(q), 1, "i en etapp på egen hand");
    const both = await open("?q=is:ready is:member");
    eq(await cards(both), 1, "tillsammans: snittet, inte unionen");
  }

  group("räkningen ser de andra facetterna");
  {
    // countFor lifts out only *this* section's terms. Lifting every `is:` term would
    // have counted against a board that had forgotten the Readiness tick on screen —
    // and then "Is an etapp" would advertise 1 where clicking it gives 0.
    const p = await open("?q=is:ready");
    await openFacet(p, "Membership");
    eq(await countOf(p, "Is an etapp"), "0", "etappen är inte redo, så klicket ger noll");
    eq(await countOf(p, "In an etapp"), "1", "medlemmen är redo, så det klicket ger ett");
  }

  group("kolumnmenyn skriver samma form");
  {
    // "Hide column" on the No etapp column writes `is:member` from outside the panel.
    // It has to land in the same term the Membership checkboxes keep, or the tick the
    // panel shows stops matching the term the board runs.
    const p = await open("?group=parent");
    const col = p.locator(".board > .column:not(.hidden-cols)")
      .filter({ has: p.locator(".col-head h2", { hasText: /^No etapp$/ }) });
    await col.locator(".col-more button").click({ force: true });
    await p.getByRole("button", { name: "Hide column" }).click();
    await p.waitForTimeout(200);
    eq(queryOf(p), "is:member", "kolumnmenyn skriver ett is:-term");

    await openFacet(p, "Membership");
    const on = await valRow(p, "In an etapp").locator("input").isChecked();
    ok(on, "och panelen visar det som ikryssat — en fråga, ett term");
  }

  group("en facetts värden behöver inte utesluta varandra");
  {
    // Codex asked whether grouping is justified only where the values are mutually
    // exclusive. They are not, anywhere: a puck can be blocked *and* blocking, and an
    // etapp nested in another etapp is `etapp` and `member` both. Union is the facet
    // convention, not a claim about the values — `tags` has always OR'd labels that
    // co-occur — and this pins the decision in code so it cannot drift back quietly.
    //
    // Three edges, injected here rather than in the fixture so the readiness counts the
    // other groups assert stay untouched: a-now blocks a-later, a-later blocks b-later.
    // So a-later is both, and the union is three where the intersection is one.
    const withEdges = (d) => {
      const by = {};
      d.items.forEach((i) => { by[i.slug] = i; });
      by["a-now"].blocks = ["alpha/a-later"];
      by["a-later"].blockedBy = ["alpha/a-now"];
      by["a-later"].blocks = ["beta/b-later"];
      by["b-later"].blockedBy = ["alpha/a-later"];
      return d;
    };
    const p = await open("?q=is:blocked", { data: withEdges });
    eq(await cards(p), 2, "två är blockerade");
    const q = await open("?q=is:blocking", { data: withEdges });
    eq(await cards(q), 2, "två blockerar andra");
    const both = await open("?q=is:blocked,blocking", { data: withEdges });
    eq(await cards(both), 3, "tillsammans tre — unionen, inte den ena som är bägge");
  }

  group("siffran lovar det klicket ger");
  {
    // The invariant, asserted rather than described: the number beside a row is the
    // board you get by clicking it. It broke on a *mixed* term — `is:stale,member`,
    // which the panel does not write but a link or a saved view can carry. countFor
    // lifted the whole term out of its probe, so it counted against no filter at all
    // and advertised 7 where the click gave 0: unticking leaves `is:stale` standing,
    // and nothing in the fixture is stale.
    const p = await open("?q=is:stale,member");
    eq(await cards(p), 1, "det blandade termet visar medlemmen");
    await openFacet(p, "Membership");
    const promised = Number(await countOf(p, "In an etapp"));
    await tick(p, "In an etapp");
    eq(await cards(p), promised, `siffran (${promised}) är brädan man får`);
    eq(queryOf(p), "is:stale", "och klicket rör bara sektionens värde");
  }

  group("dölj kolumn är en begränsning, inte ett kryss");
  {
    // The collision Codex found: a facet tick widens, a column constraint narrows, and
    // the No etapp column is hidden by a *positive* `is:member` — the one place the two
    // meet. Routed through the tick it published `is:standalone,member`, so every
    // standalone puck still matched: the menu left the column it promised to hide and
    // added the etapp columns beside it. The board grew.
    const p = await open("?group=parent&q=is:standalone");
    const cols = () => p.evaluate(() =>
      [...document.querySelectorAll(".board > .column:not(.hidden-cols) .col-head h2")].map((h) => h.textContent.trim()));
    eq(await cols(), ["No etapp"], "bara den kolumnen syns till att börja med");

    const col = p.locator(".board > .column:not(.hidden-cols)")
      .filter({ has: p.locator(".col-head h2", { hasText: /^No etapp$/ }) });
    await col.locator(".col-more button").click({ force: true });
    await p.getByRole("button", { name: "Hide column" }).click();
    await p.waitForTimeout(250);

    eq(queryOf(p), "is:member", "kryssen som höll kolumnen kvar ersätts, inte utökas");
    const after = await cols();
    ok(!after.includes("No etapp"), `kolumnen är borta (kvar: ${JSON.stringify(after)})`);

    // And the mirror still works: the eye drops the term and the column returns.
    await trayEye(p, "No etapp");
    ok((await cols()).includes("No etapp"), "ögat tar tillbaka den");
  }

  group("facket läser hela termet, inte första värdet");
  {
    // The panel writes one section per term, but the grammar does not require it — a
    // typed query or a saved view can mix sections in one `is:`. That is where reading
    // `values[0]` broke: `termAboutGroup` asked whether a term speaks about the etapp
    // grouping by looking at the first value only, so `is:member` answered yes and
    // `is:stale,member` answered no. The tray would then offer an eye that redrew
    // nothing, because the term that hid the column was never touched.
    //
    // Nothing in the fixture is stale, so this query is exactly the member puck — and
    // no visible puck stands outside an etapp, which empties the No etapp column.
    const p = await open("?group=parent&q=is:stale,member");
    eq(await cards(p), 1, "bara medlemmen syns");
    const tray = await p.evaluate(() =>
      [...document.querySelectorAll(".hidden-col")].map((r) => r.textContent.replace(/\s+/g, " ").trim()));
    ok(tray.some((t) => t.startsWith("No etapp")), `No etapp ligger i facket (facket: ${JSON.stringify(tray)})`);

    await trayEye(p, "No etapp");
    const cols = await p.evaluate(() =>
      [...document.querySelectorAll(".board > .column:not(.hidden-cols) .col-head h2")].map((h) => h.textContent.trim()));
    ok(cols.includes("No etapp"), `ögat tar tillbaka kolumnen (kolumner: ${JSON.stringify(cols)})`);
  }
}
