// Which properties a view shows. The chooser is a question put to the renderers, so the
// checks are about the *question* — that it is asked in both surfaces, that switching a
// property off takes its grid track with it, and that the automatic date rule keeps its
// place: in the absence of a choice, never over one.
import { group, eq, ok } from "./assert.mjs";

// The row's cells, by class, in DOM order — which is also track order, so this is what
// says whether a column left with its property or stayed behind as reserved width.
// The glyph's classes vary with the puck (`is-parent`, `adapted`), and this is a check
// about which *cells* exist, so it reads the first class only.
const cellsOf = (p) =>
  p.evaluate(() =>
    [...document.querySelectorAll(".list-row")[0].children].map((c) =>
      c.classList.contains("puck-glyph")
        ? "puck-glyph"                                   // its other classes vary per puck
        : [...c.classList].filter((x) => x !== "list-cell").join(" ")));

const tracksOf = (p) =>
  p.evaluate(() => getComputedStyle(document.querySelectorAll(".list-row")[0]).gridTemplateColumns);

export async function run({ open }) {
  group("utan val ritas tavlan som den skeppades");
  {
    // The default is written as *no choice*, not as a list of every property — so this
    // check is also what says the absence still means "everything", rather than freezing
    // today's answer into a stored set that a later property would fall outside of.
    const p = await open("?layout=list&done=1");
    const cells = await cellsOf(p);
    eq(cells, ["puck-glyph", "list-name", "list-pri", "list-agent",
      "list-owner", "list-repo", "list-dt", "list-tags"],
      `varje egenskap har sin cell: ${JSON.stringify(cells)}`);
    eq(await p.evaluate(() => location.search.indexOf("props") !== -1), false,
      "och inget val står i URL:en, för inget val är gjort");
  }

  group("en avstängd egenskap tar sin kolumn med sig");
  {
    // The whole point of building the tracks from the same walk that builds the cells: a
    // property that is off must not leave reserved width behind. Measured as the track
    // count, because that is what an empty-but-present column looks like from the outside.
    const alla = await open("?layout=list&done=1");
    const före = (await tracksOf(alla)).split(" ").length;
    const p = await open("?layout=list&done=1&props=priority,updated");
    const cells = await cellsOf(p);
    eq(cells, ["puck-glyph", "list-name", "list-pri", "list-dt"],
      `bara de valda cellerna ritas: ${JSON.stringify(cells)}`);
    const efter = (await tracksOf(p)).split(" ").length;
    ok(efter < före, `och spåren följer med: ${före} → ${efter}`);
    eq(efter, 4, "glyf, namn och de två valda");
  }

  group("valet gäller kortet också");
  {
    // One list, two surfaces — so the same key has to answer in the board layout, where
    // there are no tracks at all and the question is only "is this on".
    const av = await open("?done=1&props=updated");
    eq(await av.evaluate(() => document.querySelectorAll(".card .card-repo").length), 0,
      "repo-namnet är borta från korten");
    eq(await av.evaluate(() => document.querySelectorAll(".card .card-tags").length), 0,
      "och etiketterna med");
    const på = await open("?done=1&props=repo,tags,updated");
    ok(await på.evaluate(() => document.querySelectorAll(".card .card-repo").length) > 0,
      "påslaget är det tillbaka");
    ok(await på.evaluate(() => document.querySelectorAll(".card .card-tags").length) > 0,
      "och etiketterna också");
  }

  group("⚠ är ingen egenskap att välja bort");
  {
    // The drift signal is not a property: being able to hide it is being able to hide that
    // something is wrong. It is deliberately absent from PROPS, and this is what says so.
    // Nothing in the fixture is flagged — the signals are what the harvester computes and
    // the payload is written for the assertions — so this makes one.
    const p = await open("?done=1&props=none", {
      data: (d) => { d.items[0].signals = [{ type: "stale" }]; return d; },
    });
    ok(await p.evaluate(() => document.querySelectorAll(".card .warn-badge").length) > 0,
      "flaggan står kvar även när allt annat är bortvalt");
    ok(await p.evaluate(() => document.querySelectorAll(".card .card-title").length) > 0,
      "och titeln, som inte heller är ett val");
  }

  group("ett tomt val är ett val");
  {
    // The rule the puck settled: automation applies in the *absence* of a choice, never
    // over one. Without the distinction, ticking every date off would be indistinguishable
    // from never having chosen, and the board would put a date back — a tick that never
    // took effect.
    const p = await open("?layout=list&done=1&props=none");
    eq(await p.evaluate(() => document.querySelectorAll(".list-date").length), 0,
      "inget datum alls när valet är tomt");
    const cells = await cellsOf(p);
    eq(cells, ["puck-glyph", "list-name"], `och inga celler efter namnet: ${JSON.stringify(cells)}`);
    // `none` rather than an empty string, because the comparer reads a missing key and an
    // empty one as the same value — so an empty string would come back as "no choice".
    eq(await p.evaluate(() => location.search.indexOf("props=none") !== -1), true,
      "valet står kvar i URL:en och överlever därmed en delning");
  }

  group("automatiken gäller bara i frånvaro av ett val");
  {
    // Today's rule: show the date the ordering is about. It stays — as the default.
    const auto = await open("?layout=list&done=1&sort=created-desc");
    eq(await auto.evaluate(() => document.querySelector(".list-date").getAttribute("aria-label").slice(0, 7)),
      "Created", "utan val följer datumet sorteringen");
    // And the collision that forced the question: sorted by created, showing updated. With
    // the choice on top you may ask for both and see why the order is what it is.
    const val = await open("?layout=list&done=1&sort=created-desc&props=updated");
    eq(await val.evaluate(() => document.querySelector(".list-date").getAttribute("aria-label").slice(0, 7)),
      "Updated", "med ett val vinner valet");
  }

  group("två datum säger vilket som är vilket");
  {
    // `dateEl` hardcoded "Last updated" into both its tooltip and its accessible name, so
    // a second date was not merely unlabelled — it was read out as the wrong field.
    const p = await open("?layout=list&done=1&props=created,updated");
    const rad = await p.evaluate(() => {
      const d = [...document.querySelectorAll(".list-row")[0].querySelectorAll(".list-date")];
      return d.map((e) => ({ tag: e.querySelector(".date-tag")?.textContent || null, aria: e.getAttribute("aria-label") }));
    });
    eq(rad.length, 2, `bägge datumen ritas: ${JSON.stringify(rad)}`);
    eq(rad.map((r) => r.tag), ["Created", "Updated"], "vart och ett med sitt namn utskrivet");
    ok(rad[0].aria.indexOf("Created") === 0 && rad[1].aria.indexOf("Updated") === 0,
      `och uppläst som rätt fält: ${JSON.stringify(rad.map((r) => r.aria))}`);
    // One date needs no visible name — the sort menu and the modal already say which it is,
    // and a prefix on every row would be clutter for an answer nobody asked twice.
    const en = await open("?layout=list&done=1&props=updated");
    eq(await en.evaluate(() => document.querySelectorAll(".date-tag").length), 0,
      "ett ensamt datum bär inget namn — det finns inget att förväxla det med");
  }

  group("datumcellen hör till vyn, inte till pucken");
  {
    // The register trap: emptiness here is per-item, so skipping the cell for a puck with
    // no target would shift every cell after it one track to the left — one puck without a
    // target would break the alignment of the whole list.
    const p = await open("?layout=list&done=1&props=target,repo");
    // `?.` on the cell, not `.`: the sabotage this check exists for is a row that skips
    // the cell entirely, and reading `textContent` off the absent one threw — which takes
    // the rest of the file down with it instead of failing here, where the sentence is.
    const utan = await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".list-row")];
      const tom = rows.find((r) => !(r.querySelector(".list-dt")?.textContent || "").trim());
      return tom ? [...tom.children].map((c) =>
        c.classList.contains("puck-glyph") ? "puck-glyph"
          : [...c.classList].filter((x) => x !== "list-cell").join(" ")) : null;
    });
    ok(utan, "det finns en puck utan target att mäta på");
    eq(utan, ["puck-glyph", "list-name", "list-repo", "list-dt"],
      `och den behåller sin tomma datumcell: ${JSON.stringify(utan)}`);
    // A view that *asked* for Target gets the truth about a puck that has none. Only the
    // automatic rule falls back to `updated`, because there it picked the field itself.
    eq(await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".list-row")];
      return rows.filter((r) => (r.querySelector(".list-dt")?.textContent || "").trim()).length > 0;
    }), true, "och de som har ett target visar det");
  }

  group("ett namn tavlan inte känner är inget val");
  {
    // A typo, or a key from a newer board. Treated as no choice rather than as the empty
    // one: drawing a bare list is a worse answer to a link we could not read than drawing
    // the board's own default.
    const p = await open("?layout=list&done=1&props=grönsak");
    const cells = await cellsOf(p);
    ok(cells.length > 2, `okända namn faller tillbaka på standarden: ${JSON.stringify(cells)}`);
    // But a name it *does* know, beside one it does not, is still a choice.
    const halv = await open("?layout=list&done=1&props=grönsak,repo");
    eq(await cellsOf(halv), ["puck-glyph", "list-name", "list-repo"],
      "medan ett känt namn bredvid ett okänt är valet");
  }

  group("valet är en del av vyn");
  {
    // The ninth key earns shareable links and saved views for free — that is the whole
    // reason it lives in VIEW_KEYS rather than in a store of its own.
    const p = await open("?done=1");
    await p.evaluate(() => document.getElementById("displayBtn").click());
    await p.waitForTimeout(120);
    await p.getByRole("button", { name: /Properties/ }).click();
    await p.waitForTimeout(120);
    await p.locator('input[data-field="agent"]').click();
    await p.waitForTimeout(200);
    const url = await p.evaluate(() => location.search);
    ok(url.indexOf("props=") !== -1, `en bock skriver valet till URL:en: ${url}`);
    ok(url.indexOf("agent") === -1, "och den avbockade står inte i det");
    eq(await p.evaluate(() => document.querySelectorAll(".card .agent-badge").length), 0,
      "korten tappar märket direkt");
  }

  group("tillbaka till standard är inte samma sak som att bocka i allt");
  {
    // Unticking everything is the *empty* choice; ticking everything is a choice that
    // happens to hold every property. Neither is "no choice", and only the latter would
    // still be following the automatic date rule — so the way back has to be its own row.
    // No other display change on the board: `done=1` is one too, and the dot answers for
    // all of them, so a check that used it would pass whatever this row did.
    const p = await open("?props=repo");
    // The dot says the board stands off its default, and a choice of properties is that
    // kind of change — but it is not in DISPLAY_DEFAULTS, whose loop compares by identity
    // and would read every Set as changed, including one holding every property. Asked
    // here rather than on a board that already carries `done=1`: there it would be lit by
    // the archive toggle whatever this row did, which is a check that cannot fail.
    eq(await p.evaluate(() => document.getElementById("displayDot").hidden), false,
      "ett val tänder pricken, på en tavla som annars står i standardläge");
    await p.evaluate(() => document.getElementById("displayBtn").click());
    await p.waitForTimeout(120);
    await p.getByRole("button", { name: /Properties/ }).click();
    await p.waitForTimeout(120);
    await p.getByRole("button", { name: "Back to default" }).click();
    await p.waitForTimeout(200);
    eq(await p.evaluate(() => location.search.indexOf("props") !== -1), false,
      "valet lämnar URL:en helt");
    eq(await p.evaluate(() => document.getElementById("displayDot").hidden), true,
      "och pricken slocknar");
  }
}
