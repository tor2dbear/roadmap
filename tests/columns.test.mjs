// What names a column, and who may say it is hidden. Three of the five Codex findings
// in #21–#22 lived here, and each one was a different wrong assumption about the same
// thing — so each gets an assertion in its own words.
import { snapshot, trayEye } from "./fixture.mjs";
import { group, eq } from "./assert.mjs";

const eye = async (page, text) => {
  await page.locator(".hidden-col").filter({ hasText: text }).click();
  await page.waitForTimeout(150);
};

export async function run({ open }) {
  group("gruppering på repo");
  {
    const p = await open("?group=repo");
    const s = await snapshot(p);
    eq(s.columns, ["Alpha", "Beta"], "arkivet av: repon med levande puckar");
    // Landed holds one puck and it is archived, so the toggle takes the whole column.
    eq(s.tray, ["Landed1"], "ett helt arkiverat repo blir en gömd kolumn");
    eq(s.chips, [], "och arkivet får inget chip");
  }
  {
    const p = await open("?group=repo&done=1");
    eq((await snapshot(p)).columns, ["Alpha", "Beta", "Landed"], "arkivet på: alla tre");
  }

  group("ett värde stavas inte alltid som kolumnen är nycklad");
  // `repo:` accepts the canonical name, the short name and the display name — that is
  // FIELDS.repo.vals(), and it is what the filter itself asks. Anything comparing the
  // raw value against the column key asks a narrower question, and the eye goes dead.
  for (const [spelling, label] of [
    ["acme%2Falpha", "kanonisk"],
    ["alpha", "kortnamn"],
    ["Alpha", "visningsnamn"],
  ]) {
    const p = await open(`?group=repo&done=1&q=-repo%3A${spelling}`);
    const before = await snapshot(p);
    eq(before.columns.includes("Alpha"), false, `${label}: kolumnen göms`);
    // 8 pucks in Alpha, less the inbox one: `all` is literally `-status:inbox`.
    eq(before.tray, ["Alpha7"], `${label}: och listas i facket`);
    await trayEye(p, "Alpha");
    const after = await snapshot(p);
    eq(after.columns.includes("Alpha"), true, `${label}: ögat tar tillbaka den`);
    eq(after.query, null, `${label}: termen är borta, inte halvt kvar`);
  }

  group("samma kolumn stavad två gånger i ett term");
  {
    const p = await open("?group=repo&done=1&q=-repo%3Aacme%2Falpha%2Calpha");
    await trayEye(p, "Alpha");
    const s = await snapshot(p);
    eq(s.query, null, "BÅDA stavningarna tas bort, inte bara den första");
    eq(s.columns.includes("Alpha"), true, "annars ritas kolumnen om lika gömd");
  }
  {
    // …and the guard against over-removing: another repo in the same term stays hidden.
    const p = await open("?group=repo&done=1&q=-repo%3Aalpha%2Cacme%2Fbeta");
    await trayEye(p, "Alpha");
    const s = await snapshot(p);
    eq(s.query, "-repo:acme/beta", "bara den gömda kolumnens stavning tas bort");
    eq(s.tray, ["Beta3"], "den andra står kvar gömd");
  }

  group("etappens slug och dess id namnger samma kolumn");
  for (const [spelling, label] of [["a-parent", "bar slug"], ["alpha%2Fa-parent", "fullt id"]]) {
    const p = await open(`?group=parent&done=1&q=-parent%3A${spelling}`);
    eq((await snapshot(p)).tray.length, 1, `${label}: etappen listas i facket`);
    await trayEye(p, "A parent");
    eq((await snapshot(p)).query, null, `${label}: ögat tömmer termen`);
  }

  group("en tom kolumn erbjuds bara när ögat kan ge något");
  {
    // With "Show empty columns" off, restoring a column that turns out empty leaves the
    // board unchanged and the tray row simply vanishes — an affordance that promises a
    // column and then swallows it.
    const noCancelled = (p) => { p.items = p.items.filter((i) => i.status !== "cancelled"); return p; };
    const off = await open("?empty=0", { data: noCancelled });
    eq((await snapshot(off)).tray, ["Done3"], "empty=0: ingen tom rad i facket");
    const on = await open("?empty=1", { data: noCancelled });
    eq((await snapshot(on)).tray, ["Done3", "Cancelled0"], "empty=1: raden står kvar, för klicket ger en kolumn");
  }

  group("en arkivgömd målmånad behöver inget namn");
  {
    // A month is a range over a date — two terms whose conjunction the grammar cannot
    // negate — so `columnTerm` returns null for it. Requiring a nameable term dropped
    // archive-only months from the tray entirely.
    const p = await open("?group=target");
    const s = await snapshot(p);
    eq(s.columns.includes("Mar 2026"), false, "mars har bara arkiverade puckar och saknas");
    eq(s.tray, ["Mar 20262"], "men listas i facket, med sina två");
    await trayEye(p, "Mar 2026");
    const after = await snapshot(p);
    eq(after.columns.includes("Mar 2026"), true, "ögat tänder växeln och månaden kommer fram");
  }

  group("ett kolumnhuvud som namnger en puck är den pucken");
  {
    // Under `group=parent` är rubriken namnet på ett riktigt kort, men den var ren text.
    // Överallt annars på tavlan öppnar en pucks namn den — korttiteln, föräldrachippet,
    // brödsmulan — och det här var det enda stället regeln bröts. Det är dessutom
    // stället där pucken annars *inte finns på skärmen*: den ligger i `No parent`, eller
    // inne i sin egen förälders kolumn.
    const långt = (d) => {
      d.items.find((i) => i.slug === "a-parent").title = "Brand it + split product / instance";
      return d;
    };
    const p = await open("?group=parent", { data: långt });
    const huvuden = await p.evaluate(() =>
      [...document.querySelectorAll(".col-head h2")].map((e) => ({
        text: e.textContent.trim(),
        named: e.classList.contains("named"),
        knapp: !!e.querySelector(".head-open"),
        versaler: getComputedStyle(e).textTransform,
        höjd: Math.round(e.getBoundingClientRect().height),
      })));
    // Läses ur en tom platshållare om filtret inte hittar något: en kontroll som
    // *kastar* när den fäller tar resten av filen med sig, och då rapporteras nio
    // andra grupper som körda när de inte var det.
    const namngivet = huvuden.filter((h) => h.named)[0] || {};
    const kategori = huvuden.filter((h) => !h.named)[0] || {};
    eq(huvuden.filter((h) => h.named).length, 1, `en kolumn namnger en puck: ${JSON.stringify(huvuden.map((h) => h.text))}`);
    eq(namngivet.knapp, true, "och dess namn är en knapp som öppnar den");
    eq(kategori.knapp, false, "medan `No parent` inte namnger någon puck och inte är en knapp");

    // Versalerna är rätt för en kategorietikett och fel för en titel: de kostar
    // 15–20 % av bredden *och* läsbarheten.
    eq(namngivet.versaler, "none", "en titel bär sin egen skiftläge");
    eq(kategori.versaler, "uppercase", "en kategorietikett bär fortfarande ögonbrynet");

    // Och det som faktiskt gick sönder i bilden: `.col-head` är en flex-rad utan
    // `min-width: 0`, så en lång titel radbröt till tre rader och centrerade räknaren
    // och rollup-brickan mot ett treradigt block.
    eq(namngivet.höjd, kategori.höjd,
      `ett långt namn är lika högt som ett kort: ${namngivet.höjd} mot ${kategori.höjd}`);

    await p.locator(".head-open").click();
    await p.waitForTimeout(300);
    eq(await p.evaluate(() => (location.hash || "").slice(1)), "alpha/a-parent",
      "och ett klick öppnar den puck rubriken namnger");
  }

  group("ett långt kolumnnamn gör inte sidan bredare än telefonen");
  {
    // Samma klass som kodraden och tabellen: brett innehåll scrollar i sin egen låda,
    // sidan står stilla. Bara `parent` producerar godtyckligt långa etiketter — status,
    // repo, agent, priority och target är korta av konstruktion — så defekten kom med
    // den grupperingen och blir värre med nästling.
    const långt = (d) => {
      d.items.find((i) => i.slug === "a-parent").title =
        "Ett orimligt långt föräldranamn som ingen skulle skriva men som formatet tillåter";
      return d;
    };
    const p = await open("?group=parent", { data: långt, viewport: { width: 390, height: 844 } });
    const m = await p.evaluate(() => {
      const b = document.querySelector(".head-open");
      return {
        page: document.documentElement.scrollWidth,
        view: window.innerWidth,
        höjd: Math.round(b.getBoundingClientRect().height),
        klippt: b.scrollWidth > b.clientWidth,
      };
    });
    eq(m.page, m.view, `sidan är inte bredare än skärmen (${m.page} mot ${m.view})`);
    eq(m.klippt, true, "namnet klipps i stället för att radbryta");
  }
}
