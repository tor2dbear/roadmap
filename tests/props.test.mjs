// Which properties a view shows. The chooser is a question put to the renderers, so the
// checks are about the *question* — that it is asked in both surfaces, that switching a
// property off takes its grid track with it, and that the automatic date rule keeps its
// place: in the absence of a choice, never over one.
import { group, eq, ok } from "./assert.mjs";
import { githubStub } from "./fixture.mjs";

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
    // The cells are gone; the *tracks* are the second half, and they were not. An empty
    // track string handed to `setProperty` removes the declaration, and a removed custom
    // property is exactly what makes `var(--list-tracks, …)` reach for its fallback — so
    // the emptiest choice on the board drew four columns nobody asked for and reserved
    // 392px for them. Measured as the computed track list, since an empty-but-present
    // column is invisible in the DOM.
    const spår = await tracksOf(p);
    eq(spår.split(" ").length, 2, `bara glyfen och namnet har spår: ${spår}`);
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

  group("datumspåret rymmer det den håller");
  {
    // Found by looking at it on a phone: with `Created` and `Updated` both ticked, the
    // dates printed *over* the repo name beside them. The cell is right-aligned, so a
    // fixed 92px track — sized for one bare date — overflowed leftwards into its
    // neighbour. Asked as a geometry question, because that is what was wrong; the DOM
    // was correct the whole time.
    const p = await open("?layout=list&done=1&props=created,updated,repo",
      { viewport: { width: 390, height: 700 } });
    const m = await p.evaluate(() => {
      const r = document.querySelector(".list-row");
      const repo = r.querySelector(".list-repo").getBoundingClientRect();
      const first = r.querySelector(".list-dt > *").getBoundingClientRect();
      return { repoSlut: Math.round(repo.right), datum: Math.round(first.left) };
    });
    ok(m.datum >= m.repoSlut, `datumen börjar efter repo-cellen: ${JSON.stringify(m)} (med fast spår: 320 mot 450 — 130px överlapp)`);
    // And the page still does not grow — the row scrolls inside the box, which is the
    // whole premise the chooser was built on top of.
    eq(await p.evaluate(() => document.documentElement.scrollWidth), 390,
      "och sidan växer fortfarande inte");
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
    //
    // "A puck without a target" used to be found by an *empty* date cell. It is not empty
    // any more — a missing value draws a mark now — so the row is found by the mark
    // instead. The sentence this check makes is unchanged: the cell belongs to the view,
    // so it stands whatever the puck holds.
    const utan = await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".list-row")];
      const tom = rows.find((r) => r.querySelector(".list-dt .prop-empty"));
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
      return rows.filter((r) => r.querySelector(".list-dt .target-date")).length > 0;
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
    // …och den sparade vyn är den svårare halvan. Tavlan ritar `repo` men vyns egna
    // parametrar bar `grönsak,repo`, så `paramsOf()` jämförde ett värde mot ett annat och
    // vyn läste som *(edited)* i samma stund den öppnades — samma fel som det lagrade
    // `etapps` hade, och samma botemedel: omskrivningen ligger i `effectiveParams`, den
    // ena normaliseraren bägge sidor går genom.
    const nyareTavla = (d) => {
      d.config = d.config || {};
      d.config.views = [{ name: "Bara repo", props: "grönsak,repo", layout: "list" }];
      return d;
    };
    const sv = await open("", { token: true, data: nyareTavla });
    await sv.getByRole("button", { name: /Bara repo/ }).first().click();
    await sv.waitForTimeout(300);
    const sedd = await sv.evaluate(() => ({
      props: new URLSearchParams(location.search).get("props"),
      acts: [...document.querySelectorAll("#viewActs button, #chipRow .fchip-acts button")].map((e) => e.textContent.trim()),
      titel: (document.querySelector("#viewTitleBtn, #topTitleBtn") || {}).textContent.replace(/\s+/g, " ").trim(),
    }));
    eq(sedd.acts, [], `en vy med ett namn tavlan inte känner läser inte som ändrad: ${JSON.stringify(sedd)}`);
    ok(!/edited/.test(sedd.titel), `och titeln säger inte att den är det: ${JSON.stringify(sedd.titel)}`);
    eq(sedd.props, "repo", "parametern är den tavlan faktiskt följer");
  }

  group("en vy väljer ett datum, inte tre");
  {
    // Utan val går datumen inte genom `propOn` alls — `autoDateField` väljer *ett* — så en
    // bock som utgick från `propOn` kopierade in `created`, `updated` och `target` i
    // uppsättningen. Att bocka av Agent på en standardtavla gjorde alltså om radens enda
    // datum till tre, och de tre kryssrutorna stod ibockade över en rad som visade ett.
    const p = await open("?layout=list&done=1");
    eq(await p.evaluate(() => document.querySelectorAll(".list-row")[0].querySelectorAll(".list-date").length), 1,
      "standardtavlan visar ett datum");
    await p.evaluate(() => document.getElementById("displayBtn").click());
    await p.waitForTimeout(120);
    await p.getByRole("button", { name: /Properties/ }).click();
    await p.waitForTimeout(120);
    const bockade = await p.evaluate(() =>
      [...document.querySelectorAll('input[data-field]')].filter((c) => c.checked).map((c) => c.dataset.field));
    eq(bockade.filter((k) => ["created", "updated", "target"].includes(k)), ["updated"],
      `och kryssrutorna säger samma sak: ${JSON.stringify(bockade)}`);
    await p.locator('input[data-field="agent"]').click();
    await p.waitForTimeout(200);
    eq(await p.evaluate(() => document.querySelectorAll(".list-row")[0].querySelectorAll(".list-date").length), 1,
      "och en bock på en helt annan egenskap lämnar datumet i fred");
    const url = await p.evaluate(() => new URLSearchParams(location.search).get("props"));
    ok(url.indexOf("created") === -1 && url.indexOf("target") === -1,
      `valet bär bara det som stod på skärmen: ${url}`);
  }

  group("flera datum ryms i kortet");
  {
    // Listan reserverar ett *bredare* spår för ett andra datum; kortet hade ingenting
    // motsvarande. `.card-meta` är en flexrad som inte bryter och varje datum är `nowrap`,
    // så tre datum på en puck med target sprang 68px förbi kortets högerkant och in i
    // nästa kolumn — mätt i en 280px-kolumn, tavlans smalaste.
    const p = await open("?props=created,updated,target", { viewport: { width: 1000, height: 700 } });
    const kort = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll(".card").forEach((c) => {
        const d = [...c.querySelectorAll(".card-date")];
        if (d.length < 2) return;
        out.push({ titel: c.querySelector(".card-title").textContent, n: d.length,
          sist: Math.round(d[d.length - 1].getBoundingClientRect().right),
          kant: Math.round(c.getBoundingClientRect().right) });
      });
      return out;
    });
    ok(kort.length > 0, `det finns kort med flera datum att mäta: ${JSON.stringify(kort)}`);
    const utanför = kort.filter((k) => k.sist > k.kant);
    eq(utanför.length, 0, `inget datum målar utanför kortet: ${JSON.stringify(utanför)}`);
  }

  group("status är en egenskap, och den fattades");
  {
    // Den enda i pucken mål som *saknades* snarare än bara var ovaljbar. Under varje
    // gruppering utom `status` sa ingenting på ett kort eller en rad vilket läge pucken
    // var i: glyfen bär repofärg och parent-skap, sorteringen har inget statusläge, och
    // dämpningen för terminala pucker hänger på `.col-status-*` — en *kolumnklass*, som
    // alltså bara verkar där kolumnen redan svarar. Mätt på den riktiga tavlan under
    // `group=repo` med arkivet på: en `now`-rad och en `done`-rad identiska i klass,
    // opacity och text, med 131 av 175 pucker klara.
    const p = await open("?layout=list&done=1&group=repo");
    ok(await p.evaluate(() => document.querySelectorAll(".list-row .status-pill").length) > 0,
      "raden säger sitt läge när kolumnen inte gör det");
    const kort = await open("?done=1&group=repo");
    ok(await kort.evaluate(() => document.querySelectorAll(".card .status-pill").length) > 0,
      "och kortet också — en lista, två ytor");
  }

  group("det grupperingen redan säger säger raden inte igen");
  {
    // `autoDateField`s regel en egenskap bort: den avgör *defaulten*, och en bock vinner
    // över den — aldrig tvärtom. Under statusgruppering är kolumnrubriken svaret, så ett
    // chip på varje rad hade varit samma mening en gång per rad.
    const status = await open("?layout=list&done=1");           // grupperar på status
    eq(await status.evaluate(() => document.querySelectorAll(".list-row .status-pill").length), 0,
      "statuschippet uteblir under statusgruppering");
    const repo = await open("?layout=list&done=1&group=repo");
    eq(await repo.evaluate(() => document.querySelectorAll(".list-row .list-repo").length), 0,
      "och repo-cellen uteblir under repo-gruppering, av samma skäl");

    // Bägge riktningarna, för det är det som skiljer en default från en override: en bock
    // hämtar tillbaka det grupperingen säger.
    const bockad = await open("?layout=list&done=1&props=status,updated");
    ok(await bockad.evaluate(() => document.querySelectorAll(".list-row .status-pill").length) > 0,
      "men en bock vinner över defaulten, även under statusgruppering");

    // `parent` gjorde precis det här förut — som en *override*. Bockad eller ej försvann
    // chippet under parent-gruppering, alltså en kontroll som påstod ett val som aldrig
    // trädde i kraft. Nu är den en default som en bock kan slå.
    const föräldrar = await open("?layout=list&done=1&group=parent&props=parent,updated",
      { data: (d) => { const m = d.items.find((i) => i.slug === "b-member"); m.parentRef = "alpha/a-parent"; return d; } });
    ok(await föräldrar.evaluate(() => document.querySelectorAll(".list-row .parent-chip").length) > 0,
      "en ibockad parent-chip syns även under parent-gruppering");
  }

  group("de två automatikerna pekar åt olika håll om target, och den äldre vinner");
  {
    // Första versionen av den här kontrollen var grön mot sitt eget sabotage, och skälet
    // var värt mer än sabotaget: datumen går inte genom `propOn` alls. De går genom
    // `dateFields()` och, i frånvaro av ett val, `autoDateField()` — så `GROUP_SAYS` kan
    // inte nå `target` ens om den nämnde det, och att nämna det hade varit död kod med en
    // motivering på sig.
    //
    // Kvar står två automatiker som pekar åt olika håll på samma puck, och den äldre och
    // smalare har rätt: under target-gruppering visar `autoDateField` target *med flit*,
    // för det är den ordningen handlar om. Det är inte samma mening två gånger — kolumnen
    // hinkar per månad ("Sep 2026"), raden säger "in 5 days".
    const p = await open("?layout=list&done=1&group=target");
    const d = await p.evaluate(() => {
      const e = document.querySelector(".list-row .list-dt > *");
      return e ? { klass: e.className, aria: e.getAttribute("aria-label") } : null;
    });
    ok(d && /target-date/.test(d.klass),
      `raden visar target under target-gruppering, inte uppdaterat: ${JSON.stringify(d)}`);
  }

  group("rubriken delar radens uppsättning");
  {
    // The puck's open question, answered by `rollup`: the badge beside a group's name and
    // the badge on a row are the same property, so a heading with a set of its own would
    // have named it twice and could then disagree with the rows beneath it. One set — and
    // `count`, which only the heading has, is a property like any other.
    // The archive mark carries a `.count` of its own ("2 archived"), and it is *not* a
    // property — so a bare `.count` query would match it and this check would be asking
    // about the wrong span. Counted by exclusion.
    const räknare = (p, sel) => p.evaluate((s) =>
      [...document.querySelectorAll(s + " .count")].filter((c) => !c.closest(".col-archived")).length, sel);
    const av = await open("?layout=list&done=1&group=parent&props=repo");
    eq(await räknare(av, ".list-head"), 0, "räknaren lämnar rubriken");
    eq(await av.evaluate(() => document.querySelectorAll(".list-head .rollup").length), 0,
      "och rollup-brickan med, på samma bock som radens");
    const på = await open("?layout=list&done=1&group=parent&props=count,rollup");
    ok(await räknare(på, ".list-head") > 0, "påslagna är de tillbaka");
    ok(await på.evaluate(() => document.querySelectorAll(".list-head .rollup").length) > 0,
      "bägge två");
    // The same tick, one layout over: a board column head carries both marks too.
    const kol = await open("?done=1&props=repo");
    eq(await räknare(kol, ".col-head"), 0, "och kolumnrubriken följer samma val");
    // Varje rubrik, också stubben. En levande förälder vars alla delar arkivet håller
    // ritas bara genom `archivedOnly`-grenen, som återvänder *före* raden ovan — så den
    // var den enda rubrik där bocken inte sa någonting alls.
    const stubb = await open("?layout=list&group=parent&props=rollup", {
      data: (d) => {
        d.items.forEach((i) => { if (i.id === "beta/b-member") i.status = "done"; });
        return d;
      },
    });
    const stubbar = await stubb.evaluate(() =>
      [...document.querySelectorAll(".list-head")].filter((h) => h.querySelector(".lh-stub"))
        .map((h) => ({ namn: h.querySelector(".lh-label").textContent.trim(),
          rollup: h.querySelector(".rollup")?.textContent.trim() || null })));
    eq(stubbar.length, 1, `en arkivstubb att fråga: ${JSON.stringify(stubbar)}`);
    ok(stubbar[0].rollup, `och den bär sin rollup som varje annan rubrik: ${JSON.stringify(stubbar)}`);
    const utan = await open("?layout=list&group=parent&props=count", {
      data: (d) => {
        d.items.forEach((i) => { if (i.id === "beta/b-member") i.status = "done"; });
        return d;
      },
    });
    eq(await utan.evaluate(() => document.querySelectorAll(".lh-stub").length &&
      document.querySelectorAll(".list-head .rollup").length), 0,
      "avbockad ritar den ingen — bocken styr, inte grenen");
  }

  group("swatchen och arkivmärket är inga egenskaper");
  {
    // The swatch is the heading's puck glyph (it carries the repo colour) and the mark is a
    // repair — it says what is being held back and gets it back in one click. Hiding either
    // is the same mistake as hiding ⚠.
    const p = await open("?layout=list&props=none");
    ok(await p.evaluate(() => document.querySelectorAll(".list-head .swatch").length) > 0,
      "swatchen står kvar när allt är bortvalt");
    ok(await p.evaluate(() => document.querySelectorAll(".list-head .col-archived").length) > 0,
      "och arkivmärket, som är vägen tillbaka till korten det håller");
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
  // ── an empty property draws a mark, and the mark is where you set it ──────────
  // Two things, and they are deliberately different: *readability* (a column with holes
  // in it does not read as a column) and *the write path* (setting a value should not
  // cost opening the puck). The first is for everyone; the second needs write rights.

  group("en egenskap utan värde ritar ett märke");
  {
    const p = await open("?layout=list&done=1&props=priority,agent,target,repo,owner");
    const m = await p.evaluate(() => {
      const row = [...document.querySelectorAll(".list-row")].find((r) => r.getAttribute("data-id") === "alpha/a-parent");
      const mark = (c) => !!row.querySelector("." + c + " .prop-empty");
      return { pri: mark("list-pri"), agent: mark("list-agent"), dt: mark("list-dt"),
               repo: mark("list-repo"), owner: mark("list-owner"),
               // the cells are all still there — the mark is what fills them, not what
               // replaces them
               cells: [...row.children].length };
    });
    ok(m.pri, "prioritet utan värde har ett märke");
    ok(m.agent, "agent likaså");
    ok(m.dt, "och target, vars picker är en kalender och inte en lista");
    eq(m.repo, false, "men inte repo — det är härlett och har ingen skrivare");
    eq(m.owner, false, "och inte owner heller: en platshållare som inte går att fylla är en död ruta");
  }

  group("utan skrivrätt är märket text, och raden öppnas som vanligt");
  {
    // The rail answers this with a disabled button, which is right there and wrong here:
    // a disabled button swallows the click outright, so the mark would be a dead patch in
    // the middle of a row whose whole job is to open the puck. Measured with one: the
    // click left `location.hash` empty. A span has nothing to swallow.
    const p = await open("?layout=list&done=1&props=priority");
    // The sabotage this check exists for is a cell that draws nothing, so the name of the
    // absent node has to be a value and not a throw — the same rule the date-cell check
    // above already follows, for the same reason.
    eq(await p.evaluate(() => {
      const c = document.querySelectorAll(".list-row")[0].querySelector(".list-pri");
      return c && c.firstChild ? c.firstChild.tagName : null;
    }), "SPAN", "utan token är märket ren text");
    eq(await p.evaluate(() => !!document.querySelector(".list-pri .pick-chip")), false,
      "och ingen kontroll alls — den som inte kan skriva får inget som ser tryckbart ut");
    await p.locator(".list-row").nth(0).locator(".list-pri").click();
    await p.waitForTimeout(250);
    ok(await p.evaluate(() => document.body.classList.contains("viewing-puck")),
      "ett tryck på märket öppnar pucken, som varje annan pixel i raden");
  }

  group("med skrivrätt är märket pickern");
  {
    const gh = githubStub();
    const p = await open("?layout=list&done=1&props=priority", { token: true, github: gh.handler });
    await p.waitForTimeout(400); // loadWritableRepos decides whether the chip is drawn
    const chip = await p.evaluate(() => {
      const c = document.querySelectorAll(".list-row")[0].querySelector(".list-pri .pick-chip");
      const r = c.getBoundingClientRect();
      return { aria: c.getAttribute("aria-label"), text: c.textContent.trim(),
               w: Math.round(r.width), rowH: Math.round(document.querySelectorAll(".list-row")[0].getBoundingClientRect().height) };
    });
    eq(chip.text, "\u2014", "chipet visar märket, inte värdets namn");
    // `null` is a real value for priority, so the *menu* ticks "No priority" and is right
    // to — but the chip is a different question. Painted with the value's own label it
    // wrapped to three lines: 58×47 inside a 44px cell, and the row went from 39px to 71.
    ok(chip.w <= 44, `och ryms i sin 44px-cell: ${chip.w}px`);
    ok(chip.rowH < 48, `så raden behåller sin höjd: ${chip.rowH}px`);
    eq(chip.aria, "Priority, not set",
      "med ett namn, eftersom ett tankstreck inte är ett");

    await p.locator(".list-row").nth(0).locator(".list-pri .pick-chip").click();
    await p.waitForTimeout(200);
    eq(await p.evaluate(() => [...document.querySelectorAll(".pop .pick-mi")].map((r) => r.textContent.trim())),
      ["No priority", "Urgent", "High", "Medium", "Low"],
      "och öppnar samma picker som railen");
    await p.locator(".pop .pick-mi").nth(2).click();
    await p.waitForTimeout(500);
    eq(gh.writes.map((w) => w.message), ["roadmap: a-parent priority high"],
      "valet skriver pucken");
    // The popover mounts inside its own anchor, which here sits inside the row. Its rows
    // bubbled straight into the row's handler: the write landed *and* the puck page
    // opened. Stopped at the surface root, so every surface anchored inside something
    // clickable is covered rather than this one picker.
    eq(await p.evaluate(() => document.body.classList.contains("viewing-puck")), false,
      "men öppnar inte pucken — ett val i en yta är inget klick på det den råkar ritas i");
  }

  group("raden man skrev i står kvar under fingret");
  {
    // It does not follow from what was already there. The port keeps its place by itself
    // (`renderBoard` clears and refills without measuring in between) but the row does
    // not: a write bumps `updated`, which is the second key of the default chain, so the
    // row re-sorts under an offset that never moved. Measured without the repair: the
    // port stayed at 400 and the row went from y=220 to y=-241.
    const gh = githubStub();
    const many = (d) => {
      const base = d.items[0];
      for (let i = 0; i < 40; i++) {
        d.items.push({ ...base, id: "alpha/x" + i, slug: "x" + i, title: "Filler " + i,
          priority: null, agent: null, target: null, children: [], progress: null,
          parent: null, parentRef: null });
      }
      return d;
    };
    // `sort=title`, where the write moves nothing: the repair has to be a no-op there, or
    // it is not keeping a place but inventing one.
    const still = await open("?layout=list&done=1&props=priority&sort=title",
      { data: many, token: true, github: gh.handler, viewport: { width: 1200, height: 500 } });
    await still.waitForTimeout(400);
    const a = await rowAt(still, 400);
    await pickHigh(still);
    eq(await rowAt(still, null, a.id), { top: a.top, scroll: 400 },
      `en ordning skrivningen inte rör lämnar allt still: ${JSON.stringify(a)}`);

    // And where it *does* move: a fresh `updated` sorts the row to the head of the whole
    // list, so the port follows it there. It clamps honestly — there is no offset left to
    // hold — and the point is that the row is still on screen at all.
    const gh2 = githubStub();
    const moves = await open("?layout=list&done=1&props=priority",
      { data: many, token: true, github: gh2.handler, viewport: { width: 1200, height: 500 } });
    await moves.waitForTimeout(400);
    const b = await rowAt(moves, 400);
    await pickHigh(moves);
    const after = await rowAt(moves, null, b.id);
    ok(after.top >= 0 && after.top < 500,
      `raden är kvar i fönstret efter omsorteringen: ${b.top} \u2192 ${after.top}`);
  }

  group("kortet får inget märke");
  {
    // The list reserves the date track whatever the puck holds, so a mark there costs no
    // layout. A card has no tracks at all, so every unset property would *add* something
    // to the densest thing the board draws — and the row and the card parting company is
    // the price, written down rather than slipped in.
    const gh = githubStub();
    const p = await open("?done=1&props=priority,agent,target", { token: true, github: gh.handler });
    await p.waitForTimeout(400);
    eq(await p.evaluate(() => document.querySelectorAll(".card .prop-empty").length), 0,
      "inga märken på korten");
    ok(await p.evaluate(() => document.querySelectorAll(".card").length) > 0,
      "på en tavla som faktiskt ritar kort");
  }

  group("det grupperingen redan säger får inget märke heller");
  {
    // `groupSays` sits before `has` in the walk, so the whole cell goes — the mark cannot
    // outlive the column it would have stood in. No `props` here, deliberately: the rule
    // is a *default* and a tick beats it (`propOn` asks the set first), so a board that
    // named `priority` would draw the cell and this check would be measuring the override
    // rather than the rule.
    const p = await open("?layout=list&done=1&group=priority");
    eq(await p.evaluate(() => document.querySelectorAll(".list-row .list-pri").length), 0,
      "under group=priority ritas ingen prioritetscell alls");
    ok(await p.evaluate(() => document.querySelectorAll(".list-row .list-agent .prop-empty").length) > 0,
      "men agentens märke står kvar — regeln gäller den egenskap grupperingen namnger");
  }
}

// The row's distance from the port's top edge, and the port's own offset. Given a
// `scrollTo` it scrolls there first and picks a row below the fold to work on; given an
// `id` it measures that row again.
async function rowAt(p, scrollTo, id) {
  return p.evaluate(([to, want]) => {
    const port = document.querySelector(".work");
    if (to != null) port.scrollTop = to;
    const rows = [...document.querySelectorAll(".list-row")];
    const r = want
      ? rows.find((n) => n.getAttribute("data-id") === want)
      : rows.find((n) => n.getBoundingClientRect().top > 200 && n.querySelector(".list-pri .pick-chip"));
    if (!r) return null;
    return { id: r.getAttribute("data-id"), top: Math.round(r.getBoundingClientRect().top),
             scroll: Math.round(port.scrollTop) };
  }, [scrollTo, id]).then((o) => (id ? { top: o.top, scroll: o.scroll } : o));
}

async function pickHigh(p) {
  await p.evaluate(() => {
    const r = [...document.querySelectorAll(".list-row")].find((n) => n.getBoundingClientRect().top > 200 && n.querySelector(".list-pri .pick-chip"));
    r.querySelector(".list-pri .pick-chip").click();
  });
  await p.waitForTimeout(200);
  await p.locator(".pop .pick-mi").nth(2).click();
  await p.waitForTimeout(600);
}
