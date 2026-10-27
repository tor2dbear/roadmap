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
    await tick(p, "Is a parent");
    eq(await cards(p), 1, "en etapp");
    await tick(p, "Standalone");
    eq(await cards(p), 6, "etappen *och* de fem fristående — inte noll");
    eq(queryOf(p), "is:parent,standalone", "skrivet som ett term med två värden");
  }

  group("unionen överlever en länk");
  {
    // The serialization half: before the fix `is:parent,standalone` was not a known
    // state, so the whole token fell through to free text and matched nothing.
    const p = await open("?q=is:parent,standalone");
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
    // pucks and Has a parent is one; a union would be four, and this question — "redo,
    // och inne i en etapp" — would have been lost to fix the one above.
    const p = await open("?q=is:ready");
    eq(await cards(p), 4, "redo på egen hand");
    const q = await open("?q=is:member");
    eq(await cards(q), 1, "i en etapp på egen hand");
    const both = await open("?q=is:ready is:member");
    eq(await cards(both), 1, "tillsammans: snittet, inte unionen");
  }

  group("siffran säger hur många som bär värdet");
  {
    // One sentence per row, the same whether it is ticked or not. The sharpest form of
    // that is stability: the number beside a row must not move when you tick the row.
    // It used to model the *click* — for a ticked row, "how many if you unticked" — so
    // ticking Is a parent on this seven-card board sent its own number from 1 to 7,
    // which read as a claim about how many etapps there are.
    const p = await open();
    await openFacet(p, "Membership");
    eq(await countOf(p, "Is a parent"), "1", "en etapp finns");
    eq(await countOf(p, "Standalone"), "5", "och fem står utanför");

    await tick(p, "Is a parent");
    eq(await countOf(p, "Is a parent"), "1", "siffran rör sig inte när raden kryssas i");
    eq(await countOf(p, "Standalone"), "5", "och syskonets siffra är sig lik");
    eq(await cards(p), 1, "brädan är det som ändras");

    await tick(p, "Standalone");
    eq(await cards(p), 6, "två kryss ger unionen");
    // The values overlap in general, so the numbers are not a sum — 1 + 5 landing on 6
    // here is these values being disjoint, not a promise the panel makes.
    eq(await countOf(p, "Is a parent"), "1", "och siffrorna står stilla genom hela turen");
  }

  group("räkningen ser de andra facetterna");
  {
    // Only *this* section's ticks are lifted; every other section still applies, or the
    // numbers would describe a board nobody is looking at.
    const p = await open("?q=is:ready");
    await openFacet(p, "Membership");
    eq(await countOf(p, "Is a parent"), "0", "etappen är inte redo, så ingen redo etapp finns");
    eq(await countOf(p, "Has a parent"), "1", "medlemmen är redo, så där finns ett kort");
  }

  group("ett skrivet is:-term och panelens kryss är samma fråga");
  {
    // Kvar av fyra grupper som stod här. De tre andra mätte samma sak genom tavlans
    // kolumnmeny och fack — "Hide column" på `No parent` skrev `is:member`, facket
    // listade kolumnen, ögat tömde termet — och den vägen finns inte längre: en
    // hierarki grupperar inte kolumner, och facket är en plats på tavlan. `is:` som
    // *kolumnterm* är därmed inte längre observerbart någonstans, vilket är värt att
    // veta innan någon "förenklar" `termAboutGroup`: grenen är kvar därför att
    // `columnExcluded` fortfarande frågar den i listan, inte för att den är vaktad.
    //
    // Det som återstår är den halva som fortfarande går att se: ett term skrivet
    // utanför panelen och panelens kryss måste vara samma fråga, eller visar panelen
    // ett kryss som inte matchar det tavlan kör.
    const p = await open("?q=is:member");
    await openFacet(p, "Membership");
    const on = await valRow(p, "Has a parent").locator("input").isChecked();
    ok(on, "panelen visar det skrivna termet som ikryssat — en fråga, ett term");
    eq(await cards(p), 1, "och boarden kör samma fråga");
  }
}
