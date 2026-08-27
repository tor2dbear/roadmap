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
  for (const [spelling, label] of [["a-etapp", "bar slug"], ["alpha%2Fa-etapp", "fullt id"]]) {
    const p = await open(`?group=parent&done=1&q=-parent%3A${spelling}`);
    eq((await snapshot(p)).tray.length, 1, `${label}: etappen listas i facket`);
    await trayEye(p, "An etapp");
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
}
