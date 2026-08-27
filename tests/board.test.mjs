// The rule from #21: a whole column missing → the HIDDEN tray. Cards missing inside
// the columns → the chip row. Every assertion here is one half of that sentence.
import { snapshot } from "./fixture.mjs";
import { group, eq } from "./assert.mjs";

async function clickTray(page, text) {
  await page.locator(".hidden-col").filter({ hasText: text }).click();
  await page.waitForTimeout(150);
}
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
    await clickTray(p, "Done");
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
    await clickTray(p, "Done");
    const s = await snapshot(p);
    eq(s.columns.includes("Done"), true, "ETT klick räcker — växeln och termen lagas ihop");
    eq(s.query, null, "termen är borta");
  }
}
