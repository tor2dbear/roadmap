// The rule from #21: a whole column missing → the HIDDEN tray. Cards missing inside
// the columns → the chip row. Every assertion here is one half of that sentence.
import { snapshot, trayEye } from "./fixture.mjs";
import { group, eq, ok } from "./assert.mjs";

async function hideColumn(page, label) {
  const col = page.locator(".board > .column:not(.hidden-cols)")
    .filter({ has: page.locator(".col-head h2", { hasText: new RegExp(`^${label}$`, "i") }) });
  await col.locator(".col-more button").click({ force: true });
  await page.getByRole("button", { name: "Hide column" }).click();
  await page.waitForTimeout(150);
}

export async function run({ open }) {
  group("standardbräda");
  {
    const p = await open();
    const s = await snapshot(p);
    eq(s.columns, ["Now", "Next", "Later"], "arkivet av visar bara de levande kolumnerna");
    // Done has three pucks in the fixture, Cancelled one — the tray answers for the
    // archive toggle, which is the hole #21 closed.
    eq(s.tray, ["Done3", "Cancelled1"], "facket svarar för arkivväxeln, med antal");
    eq(s.chips, [], "arkivet är inget chip — det är brädans viloläge");
  }

  group("ögat på en arkivkolumn");
  {
    const p = await open();
    await trayEye(p, "Done");
    const s = await snapshot(p);
    eq(s.columns, ["Now", "Next", "Later", "Done", "Cancelled"], "ögat lyfter växeln, inte bara sin egen kolumn");
    eq(s.tray, [], "facket är tomt när ingenting är gömt");
    eq(new URL(p.url()).search, "?done=1", "växeln skrivs till URL:en");
  }

  group("göm en kolumn via ⋯");
  {
    const p = await open("?done=1");
    await hideColumn(p, "Later");
    const s = await snapshot(p);
    eq(s.columns.includes("Later"), false, "kolumnen lämnar brädan");
    eq(s.tray, ["Later2"], "den hamnar i facket, med sitt antal");
    eq(s.chips, [], "och får INGET chip — facket äger kolumnen");
  }

  group("gömma en kolumn vräker inte de andra");
  {
    // The column has to be *empty* for this to bite: the old rule dropped every empty
    // column as soon as the query mentioned the grouping's field at all. A first draft
    // of this test used the fixture as-is, where Cancelled has a puck — so it passed
    // against the bug it was written for. The payload is edited here to produce the
    // shape the rule is actually about.
    const noCancelled = (p) => {
      p.items = p.items.filter((i) => i.status !== "cancelled");
      return p;
    };
    const p = await open("?done=1&empty=1", { data: noCancelled });
    eq((await snapshot(p)).columns.includes("Cancelled"), true, "en tom Cancelled ritas när empty=1");
    await hideColumn(p, "Later");
    const s = await snapshot(p);
    eq(s.tray, ["Later2"], "bara den gömda kolumnen hamnar i facket");
    eq(s.columns.includes("Cancelled"), true, "den tomma kolumnen står kvar där den stod");
  }

  group("list-layouten har inget fack");
  {
    const p = await open("?done=1&layout=list&q=-status%3Alater");
    const s = await snapshot(p);
    eq(s.tray, [], "ingen bricka ritas i listan");
    eq(s.chips, ["Not Status: Later"], "så där är chippet det enda som kan säga det");
  }

  group("ett positivt term är omfång, inte gömma");
  {
    const p = await open("?done=1&q=status%3Anow%2Cnext");
    const s = await snapshot(p);
    eq(s.chips, ["Status: Now, Next"], "chippet står kvar — det är vad du bad om");
    eq(s.tray.length > 0, true, "och facket säger vad som föll utanför");
  }

  group("gömd av både term och arkivet");
  {
    const p = await open("?q=-status%3Adone");
    eq((await snapshot(p)).tray, ["Done3", "Cancelled1"], "facket listar den ändå");
    await trayEye(p, "Done");
    const s = await snapshot(p);
    eq(s.columns.includes("Done"), true, "ETT klick räcker — växeln och termen lagas ihop");
    eq(s.query, null, "termen är borta");
  }

  group("arkivet säger var korten tog vägen, även utanför statusgruppering");
  {
    // The gap the tray rule did not cover, and the reason it stood open: the archive
    // takes *columns* under status grouping — where the tray speaks for it — but under
    // any other grouping it takes cards from *inside* the columns, and nothing said so.
    // The chip row cannot: `viewTerms()` holds the switch as `-is:done`, outside
    // `state.query`, which is exactly what makes it invisible there.
    const heads = (p) => p.evaluate(() =>
      [...document.querySelectorAll(".column:not(.hidden-cols) .col-head")].map((h) => ({
        col: h.querySelector("h2").textContent.trim(),
        n: h.querySelector(".count").textContent.trim(),
        held: h.querySelector(".col-archived") ? h.querySelector(".col-archived").textContent.trim() : null,
      })));

    const repo = await open("?group=repo");
    eq(await heads(repo),
      [{ col: "Alpha", n: "5", held: "2 archived" }, { col: "Beta", n: "2", held: "1 archived" }],
      "varje kolumn säger hur många den håller tillbaka");

    // The numbers have to be the ones the toggle would actually reveal — not a count of
    // all done pucks, which would over-promise wherever a query is also narrowing.
    const lifted = await open("?group=repo&done=1");
    eq(await heads(lifted),
      [{ col: "Alpha", n: "7", held: null }, { col: "Beta", n: "3", held: null }, { col: "Landed", n: "1", held: null }],
      "och 5+2 / 2+1 är precis vad växeln ger");

    // Status grouping keeps its silence, and the tray keeps its rows. Stated as an
    // observation, not as proof of a guard: there is no guard, because an archived card
    // under status grouping is always in Done or Cancelled and those columns are already
    // gone. The tray line below is the load-bearing half — it fails if the tray stops
    // answering — while the line above it holds structurally either way.
    const byStatus = await open("");
    eq((await heads(byStatus)).filter((h) => h.held), [], "under statusgruppering säger facket det i stället");
    const trayLabels = (p) => p.evaluate(() =>
      [...document.querySelectorAll(".hidden-col .hidden-label")].map((e) => e.textContent.trim()));
    eq(await trayLabels(byStatus), ["Done", "Cancelled"], "och facket har sina rader");
  }

  group("märket är repareringen, inte bara en etikett");
  {
    // Same affordance as the tray's eye, in the place where the cards are missing. If it
    // only labelled the absence it would be a fourth explanation of one switch; pressing
    // it makes it the same door in a nearer wall.
    const p = await open("?group=repo");
    const before = await p.evaluate(() => document.querySelectorAll(".card").length);
    await p.locator(".col-archived").first().click();
    await p.waitForTimeout(250);
    const after = await p.evaluate(() => ({
      kort: document.querySelectorAll(".card").length,
      kvar: document.querySelectorAll(".col-archived").length,
      url: location.search,
      lagrat: localStorage.getItem("roadmap-done"),
    }));
    eq(before, 7, "sju kort med arkivet av");
    eq(after.kort, 11, "elva efter ett klick");
    eq(after.kvar, 0, "och inga märken kvar att trycka på");
    eq(after.url, "?group=repo&done=1", "växeln syns i URL:en");
    eq(after.lagrat, "1", "och skrivs till samma localStorage-nyckel som Display-menyn");
  }

  group("listläget var tyst i varje gruppering");
  {
    // Worse than the board, and missed until now: the list has no tray *at all*, so
    // `?layout=list` with the archive off simply had no Done section — in the default
    // grouping — with nothing anywhere saying so.
    const rows = (p) => p.evaluate(() =>
      [...document.querySelectorAll(".list-group")].map((s) => ({
        col: s.querySelector(".lh-label").textContent.trim(),
        n: s.querySelector(".lh-toggle .count") ? s.querySelector(".lh-toggle .count").textContent.trim() : null,
        held: s.querySelector(".col-archived") ? s.querySelector(".col-archived").textContent.trim() : null,
        stub: !!s.querySelector(".lh-stub"),
      })));

    eq(await rows(await open("?layout=list")), [
      { col: "Now", n: "3", held: null, stub: false },
      { col: "Next", n: "2", held: null, stub: false },
      { col: "Later", n: "2", held: null, stub: false },
      { col: "Done", n: null, held: "3 archived", stub: true },
      { col: "Cancelled", n: null, held: "1 archived", stub: true },
    ], "en helt arkiverad grupp kommer tillbaka som en ren rubrik, på sin egen plats");

    eq(await rows(await open("?layout=list&group=repo")), [
      { col: "Alpha", n: "5", held: "2 archived", stub: false },
      { col: "Beta", n: "2", held: "1 archived", stub: false },
      { col: "Landed", n: null, held: "1 archived", stub: true },
    ], "och de två svaren samsas: märke på de som ritas, stubbe på den som tömts");

    // Nothing to say once the toggle is on — the mark is about absence, not a permanent
    // fixture of the head.
    eq((await rows(await open("?layout=list&done=1"))).filter((r) => r.held || r.stub), [],
      "med arkivet på finns varken märke eller stubbe");

    // The stub has to land in its own place, not after everything else — and in the
    // default fixture the archived group is last anyway, so the claim was untested until
    // this case made one that is first. Alpha sorts before Beta and is entirely archived.
    const alphaDone = (d) => {
      d.items.forEach((i) => { if (i.repo === "acme/alpha") i.status = "done"; });
      return d;
    };
    eq(await rows(await open("?layout=list&group=repo", { data: alphaDone })), [
      { col: "Alpha", n: null, held: "8 archived", stub: true },
      { col: "Beta", n: "2", held: "1 archived", stub: false },
      { col: "Landed", n: null, held: "1 archived", stub: true },
    ], "en tömd grupp står på sin plats, inte sist");

    // Only a group the archive actually holds something back from becomes a stub. The
    // key list under status grouping is fixed, so a status with nothing archived in it
    // was still synthesised into a heading with `archivedMark(undefined)` under it —
    // "Cancelled · undefined archived", pointing at nothing and offering an eye that
    // would redraw the same page. Reported by Codex; the filter existed one line above
    // and the map then walked the unfiltered list anyway.
    // Beta has a `done` puck and no `cancelled` one, so scoping to it leaves Cancelled
    // with nothing archived in it — and the key list under status grouping is fixed, so
    // the key is still there to be synthesised from. Measured on the live demo first
    // (`?layout=list&q=repo:aurora` drew `Cancelled · 0 archived`), then reproduced here.
    const grupper = await rows(await open("?layout=list&q=" + encodeURIComponent("repo:acme/beta")));
    eq(grupper.filter((r) => r.stub && !/^[1-9]/.test(String(r.held))), [],
      `ingen stubbe utan något arkiverat att hämta tillbaka: ${JSON.stringify(grupper)}`);
  }

  group("märket fäller ut gruppen det lovar att fylla");
  {
    // In the list a collapsed group still gets the mark — it is short of those cards
    // whether or not it is open. Pressing it lifted the archive and left the group in
    // `state.collapsed`, so the cards it named came back into a section that was still
    // shut: a control whose label is "Show 3 archived pucks in this column" and which
    // visibly shows nothing. Reported by Codex.
    const p = await open("?layout=list&group=repo&collapsed=" + encodeURIComponent("acme/alpha"));
    const före = await p.evaluate(() => ({
      shut: !!document.querySelector(".list-group.shut"),
      märke: !!document.querySelector(".list-group.shut .col-archived"),
      kort: document.querySelectorAll(".list-group .list-row").length,
    }));
    eq(före.shut, true, "gruppen är ihopfälld");
    eq(före.märke, true, "och bär ändå märket — den saknar korten oavsett");

    await p.locator(".list-group.shut .col-archived").click();
    await p.waitForTimeout(400);
    const efter = await p.evaluate(() => ({
      shutKvar: !!document.querySelector(".list-group.shut"),
      kort: document.querySelectorAll(".list-group .list-row").length,
      url: location.search,
    }));
    eq(efter.shutKvar, false, "efter klicket är den utfälld");
    ok(efter.kort > före.kort, `och korten syns: ${före.kort} → ${efter.kort}`);
    ok(!/collapsed=/.test(efter.url), `och URL:en har släppt vecket: ${efter.url}`);
  }
}
