// The chrome around the board: the sidebar's own state, the theme, the puck page, and
// where a menu lands. Two of the six review findings this session were here.
import { snapshot } from "./fixture.mjs";
import { group, eq, ok } from "./assert.mjs";

// The palette omits the state you are already in, so a pick is only offered from a
// different one — which is also why the round trip below has to pin first.
async function palettePick(page, label) {
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(250);
  await page.keyboard.type(label);
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
}

export async function run({ open }) {
  group("sidomenyns sektioner fälls");
  {
    const p = await open();
    const heads = await p.evaluate(() =>
      [...document.querySelectorAll(".sidebar .side-eyebrow")].map((e) => ({
        tag: e.tagName, label: e.textContent.trim(), aria: e.getAttribute("aria-expanded"),
      })));
    ok(heads.length >= 2, "det finns rubriker att fälla");
    eq(heads.every((h) => h.tag === "BUTTON"), true, "varje rubrik är en knapp");
    eq(heads.every((h) => h.aria === "true"), true, "och säger att den är utfälld");

    const rows = () => p.evaluate(() =>
      [...document.querySelectorAll("#repoFilters > *")].filter((e) => e.getBoundingClientRect().height > 0).length);
    const before = await rows();
    ok(before > 0, "repo-raderna syns från början");
    // Enter, not click: the heading is a button, and a fold you cannot reach from the
    // keyboard is a fold half the people cannot use.
    await p.getByRole("button", { name: /^Repos/ }).focus();
    await p.keyboard.press("Enter");
    await p.waitForTimeout(150);
    eq(await rows(), 0, "Enter fäller — raderna göms på riktigt, inte bara i klassen");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(150);
    eq(await rows(), before, "och fäller upp igen");
  }

  group("fällningen minns sig men lämnar inte URL:en");
  {
    const p = await open();
    await p.getByRole("button", { name: /^Repos/ }).click();
    await p.waitForTimeout(150);
    eq(await p.evaluate(() => localStorage.getItem("roadmap-sidefold")), "repos", "läget hamnar i localStorage");
    eq(new URL(p.url()).searchParams.has("collapsed"), false,
      "och ALDRIG i URL:en — `collapsed` betyder redan något annat där");
    await p.reload();
    await p.waitForSelector(".sidebar");
    await p.waitForTimeout(250);
    eq(await p.evaluate(() => document.getElementById("repoFilters").hidden), true, "och överlever omladdning");
  }

  group("temat: tre lägen, båda systemscheman");
  // The dark palette lives under `:root[data-theme="auto"]`, so `auto` has to be spelled
  // out — removing the attribute drops a dark device onto the light palette with no rule
  // matching it. That shipped in Settings long before it was noticed.
  for (const [scheme, autoBg, otherBg] of [
    ["dark", "rgb(26, 24, 21)", "rgb(245, 243, 238)"],
    ["light", "rgb(245, 243, 238)", "rgb(26, 24, 21)"],
  ]) {
    const p = await open("", { colorScheme: scheme });
    const bg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    eq(await bg(), autoBg, `${scheme}: auto följer systemet från start`);
    // Through ⌘K, which is one of the two surfaces that actually call `setTheme` — a
    // first draft set `data-theme` by hand here and was therefore green against the very
    // regression the comment above names. Setting the attribute yourself tests the CSS;
    // only the palette tests the writer.
    const pinned = scheme === "dark" ? "Light" : "Dark";
    await palettePick(p, `Theme: ${pinned}`);
    eq(await bg(), otherBg, `${scheme}: ${pinned} nålar fast motsatt palett`);
    await palettePick(p, "Theme: Auto");
    eq(await bg(), autoBg, `${scheme}: tillbaka till auto ger systemets palett igen`);
    await p.emulateMedia({ colorScheme: scheme === "dark" ? "light" : "dark" });
    await p.waitForTimeout(150);
    eq(await bg(), otherBg, `${scheme}: auto följer med när enheten byter schema`);
  }
  {
    const p = await open();
    eq(await p.evaluate(() => !!document.getElementById("theme")), false,
      "sidomenyn bär ingen temaknapp — Settings och ⌘K äger de tre lägena");
  }

  group("chipparaden hör till brädan");
  {
    const p = await open("?q=status%3Anow");
    const seen = () => p.evaluate(() => !!document.getElementById("chipRow")?.offsetParent);
    eq(await seen(), true, "syns på en filtrerad bräda");
    await p.locator(".card, .list-row").first().click();
    await p.waitForTimeout(300);
    eq(await p.evaluate(() => document.body.classList.contains("viewing-puck")), true, "en puck är öppen");
    eq(await seen(), false, "och chipparaden följer inte med in");
    // The content flag must not be what hid it, or a render inside the puck brings it back.
    eq(await p.evaluate(() => document.getElementById("chipRow").hidden), false,
      "gömd av sidan man står på, inte av `hidden` — två flaggor, två frågor");
    await p.goBack();
    await p.waitForTimeout(300);
    eq(await seen(), true, "och är tillbaka efteråt");
  }

  group("kolumnmenyn hamnar innanför fönstret");
  // Mirroring assumes the page's right edge is the one that cuts; for the first column
  // it is the left, where the sticky sidebar paints over the board.
  for (const width of [760, 1024, 1400]) {
    const p = await open("?done=1", { viewport: { width, height: 900 } });
    const menus = p.locator(".col-more button");
    const n = await menus.count();
    for (const i of n > 1 ? [0, n - 1] : [0]) {
      await menus.nth(i).click({ force: true });
      await p.waitForTimeout(200);
      const m = await p.evaluate(() => {
        const pop = document.querySelector(".column .pop");
        if (!pop) return null;
        const r = pop.getBoundingClientRect();
        const side = document.querySelector(".sidebar");
        const sr = side && getComputedStyle(side).display !== "none" ? side.getBoundingClientRect() : null;
        return { left: r.left, right: r.right, sidebarRight: sr ? sr.right : 0, vw: window.innerWidth };
      });
      ok(m, `${width}px kolumn ${i}: menyn ritas`);
      if (!m) continue;
      eq(m.left >= m.sidebarRight - 1, true, `${width}px kolumn ${i}: inte under sidomenyn`);
      eq(m.right <= m.vw + 1, true, `${width}px kolumn ${i}: inte utanför fönstret`);
      await p.keyboard.press("Escape");
      await p.waitForTimeout(120);
    }
  }

  group("rollup-brickan bär ingen andel");
  {
    // The bar is gone, and this guards its absence. Not in pixels: the only mark a
    // 0/1 rollup would paint is a zero-width gradient, invisible to a screenshot but
    // plainly there in the computed style — so asking the style answers the question
    // a picture could not. A restored bar shows up two ways, and both are checked:
    // the rule paints a `background-image`, and the renderer sets `--frac` inline.
    const p = await open();
    const b = await p.evaluate(() => {
      const e = document.querySelector(".rollup");
      if (!e) return null;
      const cs = getComputedStyle(e);
      return {
        text: e.textContent.trim(),
        image: cs.backgroundImage,
        frac: e.style.getPropertyValue("--frac"),
      };
    });
    // Without this the two checks below pass on a board that renders no etapp at all.
    ok(b, "det finns en rollup-bricka att mäta");
    if (b) {
      eq(b.text, "0/1", "och den bär räkningen");
      eq(b.image, "none", "ingen andel målad som bakgrund");
      eq(b.frac, "", "och ingen --frac satt på elementet");
    }
  }

  group("en bred kodrad ger inte sidan en sidled");
  {
    // Reported from a phone: one puck rendered in *larger* text than the one beside it,
    // and the page could be dragged sideways. Two symptoms, one cause — the pane grew
    // wider than the screen, and a mobile browser reads a too-wide layout as a reason to
    // inflate every font on the page. So the assertion is on the width; the text size
    // follows it.
    //
    // A grid item's `min-width` defaults to `auto` — never narrower than its content's
    // minimum — and a `<pre>` is one long line with no minimum to speak of. The
    // `overflow-x: auto` on the block was there all along and was never the missing
    // piece: a scroll container still pushes its content's minimum width upward until an
    // ancestor is allowed to shrink.
    const withCode = (d) => {
      const a = d.items.find((i) => i.slug === "a-now");
      a.body = "Innan\n\n```\n" + "$ brew install cowsay ==> Fetching cowsay ==> Registering: cowsay, cowthink\n" +
        "installed cowsay\n```\n\nEfter\n";
      return d;
    };
    const p = await open("#alpha/a-now", { viewport: { width: 390, height: 844 }, data: withCode });
    const m = await p.evaluate(() => {
      const pre = document.querySelector(".modal-body pre");
      return {
        page: document.documentElement.scrollWidth,
        view: window.innerWidth,
        pre: pre && { client: pre.clientWidth, scroll: pre.scrollWidth, ov: getComputedStyle(pre).overflowX },
      };
    });
    ok(m.pre, "kodblocket ritas");
    eq(m.page, m.view, `sidan är inte bredare än skärmen (${m.page} mot ${m.view})`);
    // The other half, and it is not the same statement: wrapping the code would also
    // stop the page scroll, and would be a worse answer — a transcript's lines are its
    // meaning. The block has to stay too wide *and* be scrollable inside itself.
    ok(m.pre.scroll > m.pre.client,
      `och kodblocket är fortfarande brett, i sin egen scroll (${m.pre.scroll} > ${m.pre.client})`);
    eq(m.pre.ov, "auto", "vilket är vad overflow-x lovar");
  }

  group("en bred tabell ger inte heller sidan en sidled");
  {
    // Same class as the code row above, and the reason it gets its own check: the
    // tables are new, and the answer for them is not obviously the same one. It is —
    // `.md-table` scrolls, `.detail-pane`'s `min-width: 0` is the permission — but a
    // table has a second way to fit that a `<pre>` does not: it can wrap its cells to
    // nothing. `overflow-wrap: normal` on the cells is what refuses that, so this
    // check needs both halves too, for the same reason.
    const withTable = (d) => {
      const a = d.items.find((i) => i.slug === "a-now");
      const cells = ["harvester", "aggregator", "konvention", "beroenden", "signaler", "etapper"];
      a.body = "Innan\n\n| " + cells.join(" | ") + " |\n|" + cells.map(() => "---").join("|") +
        "|\n| " + cells.map(() => "mätvärde").join(" | ") + " |\n\nEfter\n";
      return d;
    };
    const p = await open("#alpha/a-now", { viewport: { width: 390, height: 844 }, data: withTable });
    const m = await p.evaluate(() => {
      const box = document.querySelector(".modal-body .md-table");
      return {
        page: document.documentElement.scrollWidth,
        view: window.innerWidth,
        head: document.querySelectorAll(".modal-body th").length,
        box: box && { client: box.clientWidth, scroll: box.scrollWidth, ov: getComputedStyle(box).overflowX },
      };
    });
    eq(m.head, 6, "tabellen ritas med sina sex rubrikceller");
    eq(m.page, m.view, `sidan är inte bredare än skärmen (${m.page} mot ${m.view})`);
    ok(m.box.scroll > m.box.client,
      `och tabellen är fortfarande bred, i sin egen scroll (${m.box.scroll} > ${m.box.client})`);
    eq(m.box.ov, "auto", "vilket är vad overflow-x lovar");
  }

  group("räknaren har en storlek");
  {
    // "How many cards are behind this label" is one sentence, and it was drawn in four
    // sizes: 11px on the sidebar's repo and agent rows, 11px beside the view title,
    // 12px on the column heads, 13px inherited in the HIDDEN tray. The proof that no
    // rule explained it: a sidebar view row and a column head are *both* --fs-md, and
    // their counts still disagreed.
    //
    // Found by looking, not by listing. The first version of this test named five
    // selectors and passed while a sixth — `.chip .n`, the repo and agent rows, the
    // longest list of counts on the board — sat a pixel smaller and unmatched. A
    // hand-kept list of what to check is a second place to remember, and this is the
    // one that was forgotten. So the sweep asks the DOM instead: every leaf whose whole
    // text is digits and whose face is the mono. A seventh mark cannot hide from that.
    const found = (p) => p.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((e) => !e.children.length && /^\d+$/.test(e.textContent.trim()))
        .filter((e) => e.getBoundingClientRect().height > 0)
        .filter((e) => /Geist Mono|monospace/i.test(getComputedStyle(e).fontFamily))
        .map((e) => ({ cls: e.getAttribute("class") || e.tagName, size: getComputedStyle(e).fontSize })));

    // Several boards, because a mark only renders where its surface does: the tray
    // needs a hidden column, `.list-head` needs the list layout, the repo rows need the
    // sidebar. A token, since some chrome is gated on one.
    const marks = [];
    for (const url of ["", "?layout=list", "?group=repo", "?view=ready", "?done=1"]) {
      marks.push(...await found(await open(url, { token: true })));
    }
    const kinds = [...new Set(marks.map((m) => m.cls))].sort();
    // Named as well as swept: if a selector stops rendering, the sweep would quietly
    // pass on whatever is left, which is exactly the failure mode being fixed.
    eq(kinds, ["count", "focus-n", "n", "view-count"],
      `varje sorts räknare ritas någonstans (${JSON.stringify(kinds)})`);

    const sizes = [...new Set(marks.map((m) => m.size))].sort();
    eq(sizes, ["11px"], `och varenda en är 11px — ${marks.length} märken, storlekar: ${JSON.stringify(sizes)}`);
  }

  group("räknaren växer inte med arkets rader");
  {
    // The sheet is the case a plausible fix gets wrong. `.focus-n` sits in a `.row`,
    // which is --fs-md in the popover and --fs-xl in the sheet, so sizing it in `em`
    // looks right — and the icon beside it seems to set that precedent, since
    // `.focus-icn` asks for 1.15em. It does not: `.pick-menu .row > .icn` outranks it
    // and pins the icon to 15px in the menu. An `em` count would grow past a mark that
    // stayed put, in the one place a thumb reads them side by side.
    const p = await open("", { viewport: { width: 390, height: 844 } });
    await p.evaluate(() => {
      const b = [...document.querySelectorAll("#viewTitleBtn, #topTitleBtn")]
        .find((e) => e.getBoundingClientRect().height > 0);
      b.click();
    });
    await p.waitForTimeout(300);
    const m = await p.evaluate(() => {
      const row = document.querySelector(".view-menu .row");
      const n = row && row.querySelector(".focus-n");
      const i = row && row.querySelector(".focus-icn");
      return {
        sheet: !!document.querySelector(".sheet.view-menu"),
        row: row && getComputedStyle(row).fontSize,
        n: n && getComputedStyle(n).fontSize,
        icn: i && getComputedStyle(i).width,
      };
    });
    eq(m.sheet, true, "vid 390px blir vymenyn ett ark");
    eq(m.row, "15px", "vars rader är --fs-xl");
    eq(m.icn, "15px", "ikonen pinnas till 15px trots sin 1.15em");
    eq(m.n, "11px", "och räknaren står kvar på 11px, som på brädan");
  }

  group("inget märke ritas som ett skrivtecken");
  {
    // Four marks have been caught being typographic characters rather than paths from the
    // set — `⚠`, `✕`, the agent routing `→`, and the urgent priority `!` — and each time
    // for the same reason: a character takes its weight, its optical size and its
    // baseline from whatever font resolves it, so it never matches the marks beside it,
    // and on a machine that renders it as colour emoji the CSS colour does nothing.
    //
    // The fourth is why this sweep is written the way it is. Its first version tested a
    // set of Unicode symbol *ranges*, and `!` is ASCII — so the rule was "not a
    // typographic character" while the test said "not one of these characters", and the
    // urgent mark sat in the gap between them for exactly one commit. The predicate is
    // now the rule itself: a leaf whose entire text is a single non-word character is a
    // mark drawn as text. Prose containing an arrow is not, because it is not alone in
    // its element.
    //
    // Measured against an untouched board before widening: it catches nothing
    // legitimate, so it costs no exemptions.
    const marked = (d) => {
      d.items.forEach((i) => {
        if (i.id === "alpha/a-now") { i.agent = "backend"; i.priority = "urgent"; }
      });
      return d;
    };
    const p = await open("", { data: marked });
    const tecken = await p.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((e) => !e.children.length && /^[^\w\s]$/u.test((e.textContent || "").trim()))
        .map((e) => (e.textContent || "").trim() + " i ." + (e.className || e.tagName)));
    eq(tecken, [], `varje märke är en path ur setet — dessa är tecken: ${JSON.stringify(tecken)}`);

    // And the one this round replaced, specifically: it is an svg from the set, it
    // carries the accent, and it is sized rather than left at the 16px `.icn` default.
    const märke = await p.evaluate(() => {
      const g = document.querySelector(".agent-badge .agent-glyph");
      if (!g) return null;
      const c = getComputedStyle(g);
      return { tagg: g.tagName.toLowerCase(), klasser: g.getAttribute("class"), bredd: c.width, paths: g.querySelectorAll("path").length };
    });
    // Reported, not thrown: when the mark is missing entirely — which is what reverting
    // it to a <span> does — a bare `märke.tagg` takes the whole file down with a
    // TypeError, and a suite that crashes says less than one that fails.
    eq(märke ? märke.tagg : null, "svg", `agentmärket är en svg ur setet: ${JSON.stringify(märke)}`);
    eq(märke ? märke.bredd : null, "12px", "storleksatt, inte kvar på .icn:s 16px");
    ok(märke && märke.paths >= 6, `och ritas ur setet (${märke ? märke.paths : 0} paths)`);

    // Same three questions of the urgent mark, which is the one the widened predicate
    // was written for.
    const brådska = await p.evaluate(() => {
      const g = document.querySelector(".pri-urgent .pri-glyph");
      if (!g) return null;
      return { tagg: g.tagName.toLowerCase(), paths: g.querySelectorAll("path").length,
               bakgrund: getComputedStyle(g.parentElement).backgroundColor };
    });
    eq(brådska ? brådska.tagg : null, "svg", `brådskemärket är en svg ur setet: ${JSON.stringify(brådska)}`);
    eq(brådska ? brådska.paths : 0, 3, "cirkel, streck och punkt");
    // The fill is gone on purpose: an outline glyph inside a filled 13px chip is two
    // containers in the room for one. If a solid ever comes back, this is what says so.
    eq(brådska ? brådska.bakgrund : null, "rgba(0, 0, 0, 0)", "och står utan fylld bricka bakom sig");
  }

  group("puck-sidan säger vilket repo pucken bor i");
  {
    // Uppgiften pucken finns för. Den stod i den inbyggda brödsmulan
    // (`Alpha · a-parent`) tills `body.viewing-puck` gömde den till förmån för
    // topbarens, som bär vyn och titeln och tappade repot — informationen flyttade
    // inte, den försvann i bytet. Kvar var glyfens färg, alltså en kod.
    const p = await open("#alpha/a-parent");
    // Bundet och fångat: utan raden finns inget att vänta på, och en kontroll som
    // *kastar* efter trettio sekunder tar resten av filen med sig och säger "timeout"
    // där den skulle ha sagt vad som saknades.
    const finns = await p.waitForSelector('.prop[data-field="repo"]', { timeout: 4000 })
      .then(() => true).catch(() => false);
    // …och grenat, inte returnerat: ett `return` här hade tagit varje grupp *efter*
    // den här ur körningen och rapporterat dem som gröna.
    if (!finns) ok(false, "puck-sidan har ingen rad som säger vilket repo pucken bor i");
    else await (async () => {
    const rad = await p.evaluate(() => {
      const r = document.querySelector('.prop[data-field="repo"]');
      const rader = [...document.querySelectorAll(".prop")].map((x) => x.dataset.field);
      return {
        värde: r.querySelector(".prop-v").textContent.trim(),
        prick: !!r.querySelector(".repo-dot"),
        först: rader[0],
      };
    });
    eq(rad.värde, "Alpha", `raden säger repots namn: ${JSON.stringify(rad)}`);
    ok(rad.prick, "med samma märke som listraden bär, så färgen får sitt namn bredvid sig");
    eq(rad.först, "repo", "och den står först — puckens hem före dess läge");

    // Inte en väljare (att flytta en puck mellan repon är en git-flytt), men inte död
    // heller: namnet går till det repots puckar, genom samma `goToPlace` som
    // sidomenyns chip — ett svar på "visa mig det här repot", inte två.
    await p.locator(".repo-cell").click();
    await p.waitForTimeout(300);
    const efter = await p.evaluate(() => ({
      q: new URLSearchParams(location.search).get("q"),
      puckÖppen: document.body.classList.contains("viewing-puck"),
    }));
    eq(efter.q, "repo:acme/alpha", `trycket skopar tavlan till repot: ${JSON.stringify(efter)}`);
    eq(efter.puckÖppen, false, "och lämnar puck-vyn, som all annan navigering i sidomenyn");

    // Codex, #47: från en tavla som *redan* står i repot slog samma tryck av skopet,
    // eftersom sidomenyns rad är byggd som en växel — "tryck på den du står i och du
    // kommer ut". En rad i skenan är inte en plats man står i, den är ett mål: den
    // säger "visa det här repots puckar", och svarade med att visa alla.
    const iRepot = await open("?q=repo%3Aacme%2Falpha#alpha/a-parent");
    await iRepot.waitForSelector(".repo-cell");
    await iRepot.locator(".repo-cell").click();
    await iRepot.waitForTimeout(300);
    eq(await iRepot.evaluate(() => new URLSearchParams(location.search).get("q")),
      "repo:acme/alpha", "skopet står kvar när man redan är i det — värdet växlar inte");
    })();
  }

  group("listan scrollar i sidled och titeln följer inte med");
  {
    // Modellen är Notions: raden behåller varje kolumn och lådan scrollar, i stället för
    // att kolumner faller bort när det blir trångt. Det som stod här förut vaktade den
    // motsatta regeln — nivåer som droppade agent, sedan repo — och det var talen som
    // var problemet: 560/720 för en platt rad, sedan 652/812 när trädets indrag visade
    // sig krympa en rad container-frågan inte kunde se. Två omgångar aritmetik, en av dem
    // fel, för en regel vars hela syfte var att bestämma vad som skulle kastas bort.
    //
    // Det som gör det överkomligt är att titeln aldrig scrollar bort under en: glyfen och
    // namnet är frysta vid vänsterkanten. Utan den frysningen är sidledsscroll bara ett
    // sätt att tappa bort vilken rad man läser.
    const mät = (p) => p.evaluate(() => {
      const board = document.querySelector(".board.as-list");
      const rad = document.querySelector(".list-row");
      const v = (sel) => { const e = rad.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().left) : null; };
      const sedd = (sel) => { const e = rad.querySelector(sel); return !!e && getComputedStyle(e).display !== "none"; };
      return {
        vy: document.documentElement.clientWidth,
        doc: document.documentElement.scrollWidth,
        lådaScroll: board.scrollWidth, lådaSynlig: Math.round(board.getBoundingClientRect().width),
        namn: v(".list-name"), datum: v(".list-dt"),
        agent: sedd(".list-agent"), repo: sedd(".list-repo"),
        höjd: Math.round(rad.getBoundingClientRect().height),
      };
    });
    const p = await open("?layout=list", { viewport: { width: 390, height: 800 }, hasTouch: true });
    const före = await mät(p);
    eq(före.doc, före.vy, `sidan står stilla: ${JSON.stringify(före)}`);
    ok(före.lådaScroll > före.lådaSynlig, `lådan är bredare än sin ruta, alltså finns kolumnerna kvar (${före.lådaScroll} mot ${före.lådaSynlig})`);
    eq(före.agent, true, "agenten faller inte bort på en telefon");
    eq(före.repo, true, "och inte repot heller");
    ok(före.höjd < 60, `raden är fortfarande en rad: ${före.höjd}px`);

    // Och det som gör det läsbart: namnet står kvar medan datumet kommer in från höger.
    // "Fryst" är inte "orörligt" — cellen glider med tills den når kanten och fastnar
    // där, så det som mäts är att den *stannar*: 400px till scroll flyttar den inte.
    await p.evaluate(() => { document.querySelector(".board.as-list").scrollLeft = 400; });
    await p.waitForTimeout(150);
    const vid400 = await mät(p);
    await p.evaluate(() => { document.querySelector(".board.as-list").scrollLeft = 800; });
    await p.waitForTimeout(150);
    const vid800 = await mät(p);
    ok(vid400.namn > 0, `namnet är kvar i bild efter 400px (${vid400.namn}) — ofryst hade det legat på ${före.namn - 400}`);
    eq(vid800.namn, vid400.namn, `och står stilla när man scrollar vidare: ${vid400.namn} → ${vid800.namn}`);
    ok(vid400.datum < före.datum - 300, `medan metadatan scrollar in (${före.datum} → ${vid400.datum})`);
    eq(vid400.doc, vid400.vy, "och sidan står fortfarande stilla");
  }

  group("en lång titel breddar inte den frysta kolumnen");
  {
    // Codex, #48. Radens minimum måste komma från *kolumnerna*, aldrig från innehållet.
    // Med `min-width: max-content` läste den den längsta titeln i stället, och på en
    // telefon är det inte en skönhetsfläck: mätt med en 120 tecken lång titel blev
    // namncellen 851px bred på en 390px-skärm — och eftersom den cellen är fryst och
    // ogenomskinlig täckte den hela vyn och la prioritet, agent, repo och datum utom
    // räckhåll bakom sig, för varje rad i listan. En fryst kolumn fungerar bara så länge
    // den är smalare än skärmen.
    const långTitel = (d) => {
      d.items.find((i) => i.slug === "a-now").title =
        "En puck med ett orimligt långt namn som ingen skulle skriva men som formatet tillåter och som därför bestämmer radens bredd";
      return d;
    };
    const p = await open("?layout=list", { data: långTitel, viewport: { width: 390, height: 800 }, hasTouch: true });
    await p.evaluate(() => { document.querySelector(".board.as-list").scrollLeft = 500; });
    await p.waitForTimeout(150);
    const m = await p.evaluate(() => {
      const vy = document.documentElement.clientWidth;
      const rad = [...document.querySelectorAll(".list-row")].find((r) => r.querySelector(".list-title").textContent.length > 60);
      const namn = rad.querySelector(".list-name").getBoundingClientRect();
      // Vad ligger överst vid högerkanten, i den radens höjd? Är det namncellen har den
      // lagt sig över metadatan i stället för bredvid den.
      const överst = document.elementFromPoint(vy - 40, Math.round(namn.top + namn.height / 2));
      return { vy, namnBredd: Math.round(namn.width), täcker: !!överst && !!överst.closest(".list-name"),
        datum: Math.round(rad.querySelector(".list-dt").getBoundingClientRect().left) };
    });
    ok(m.namnBredd < m.vy, `namncellen är smalare än skärmen: ${m.namnBredd} mot ${m.vy}`);
    eq(m.täcker, false, `och ligger inte över metadatan: ${JSON.stringify(m)}`);
    ok(m.datum < m.vy, `datumet går att scrolla fram: ${m.datum}`);
  }

  group("gruppens rubrik står kvar när raden scrollar");
  {
    // Rubriken är två lådor, och den inre är skälet: en sticky-box kan inte förskjutas
    // inuti ett containing block den fyller helt, så en rubrik i full bredd gled bara ut
    // åt vänster (mätt: −376px vid scrollLeft 400). Arkivstumpen — en rubrik utan rader —
    // är samma fråga en gång till: som egen låda var den bara så bred som sitt innehåll
    // och åkte ut ur bild helt, vilket är varför tavlan lägger grupperna i *ett* rutnät
    // med en kolumn som alla sträcks till.
    const p = await open("?layout=list&group=parent&done=1", { viewport: { width: 390, height: 800 }, hasTouch: true });
    const rubriker = (q) => q.evaluate(() => [...document.querySelectorAll(".lh-inner")].map((e) => Math.round(e.getBoundingClientRect().left)));
    const före = await rubriker(p);
    await p.evaluate(() => { document.querySelector(".board.as-list").scrollLeft = 400; });
    await p.waitForTimeout(150);
    const efter = await rubriker(p);
    ok(före.length > 1, `flera rubriker att mäta: ${JSON.stringify(före)}`);
    ok(efter.every((x) => x >= 0), `ingen rubrik har åkt ut åt vänster: ${JSON.stringify(efter)}`);
  }

  group("toasten lägger ut sig på sitt innehåll, inte på halva vyporten");
  {
    // A fixed box with `left` and no `right` shrink-to-fits inside the space from `left`
    // to the containing block's right edge — half the viewport — so `max-width` never
    // decided anything and long messages wrapped into a 50vw column. `translateX(-50%)`
    // then centred the result, which is why it read as a font or copy problem for months
    // rather than as the layout bug it is. The width is therefore the assertion, and it
    // is taken on a phone, where the difference was five lines against two.
    const p = await open("", { viewport: { width: 390, height: 700 } });
    const box = (msg) => p.evaluate((m) => {
      document.querySelectorAll(".toast").forEach((t) => t.remove());
      const el = document.createElement("div");
      el.className = "toast show"; el.textContent = m;
      document.body.appendChild(el);
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left),
               right: Math.round(innerWidth - r.right), vw: innerWidth };
    }, msg);

    const long = await box("Token can’t create issues here — opening GitHub. Paste the number via Link issue.");
    ok(long.w > long.vw * 0.8,
      `en lång toast tar bredden den får (${long.w} av ${long.vw} px) — 50 % betyder att max-width är utanför spel igen`);
    eq(long.left, long.right, "och står centrerad, med lika marginal på båda sidor");
    ok(long.left >= 12, `med en marginal mot kanten (${long.left} px)`);
    ok(long.h < 70, `på två rader, inte fem (${long.h} px hög)`);

    // The short case is what the pill radius was tuned for; it must not have grown a
    // fixed width in the process — a toast is as wide as its sentence.
    const short = await box("✓ Saved");
    ok(short.w < long.w * 0.6, `en kort toast krymper till sitt innehåll (${short.w} px)`);
    eq(short.left, short.right, "och centreras likadant");
  }
}
