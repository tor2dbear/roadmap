// The chrome around the board: the sidebar's own state, the theme, the puck page, and
// where a menu lands. Two of the six review findings this session were here.
import { snapshot, githubStub } from "./fixture.mjs";
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

  group("listan scrollar i sidled, hela raden med");
  {
    // Modellen är Notions: raden behåller varje kolumn och lådan scrollar, i stället för
    // att kolumner faller bort när det blir trångt. Det som stod här förut vaktade den
    // motsatta regeln — nivåer som droppade agent, sedan repo — och det var talen som
    // var problemet: 560/720 för en platt rad, sedan 652/812 när trädets indrag visade
    // sig krympa en rad container-frågan inte kunde se. Två omgångar aritmetik, en av dem
    // fel, för en regel vars hela syfte var att bestämma vad som skulle kastas bort.
    //
    // Hela raden scrollar, titeln med. Frysningen av glyf och namn var första svaret och
    // mätningen tog bort den: på 390px var det frysta blocket 288px platt och 368px med
    // trädets indrag i sig, alltså 102 respektive *22* pixlar kvar att se metadatan i.
    // En fryst kolumn som lämnar 6% av skärmen håller inte din plats, den tar skärmen.
    const mät = (p) => p.evaluate(() => {
      const board = document.getElementById("work"); // the scrollport is the shell's, not the board's
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

    // Raden följer med, hela vägen: namnet flyttar sig exakt lika långt som scrollen.
    // Begärt, inte antaget: rullbredden beror på fixturen, så det som jämförs är hur
    // långt rutan *faktiskt* gick.
    const rulla = async (x) => {
      const gick = await p.evaluate((n) => { const w = document.getElementById("work"); w.scrollLeft = n; return w.scrollLeft; }, x);
      await p.waitForTimeout(150);
      return { gick, ...(await mät(p)) };
    };
    const vid200 = await rulla(200);
    const vid400 = await rulla(400);
    eq(före.namn - vid200.namn, vid200.gick, `namnet följer scrollen (${före.namn} → ${vid200.namn}, rullade ${vid200.gick})`);
    eq(före.namn - vid400.namn, vid400.gick, `och fortsätter följa den: ${vid400.namn} efter ${vid400.gick}`);
    ok(vid400.datum < före.datum - 300, `medan metadatan kommer in från höger (${före.datum} → ${vid400.datum})`);
    eq(vid400.doc, vid400.vy, "och sidan står fortfarande stilla");

    // Det frysningen kostade, och som var skälet att ta bort den: fönstret mot metadatan.
    // Med glyf och namn frysta gick 288 av 390 pixlar åt platt, 368 med trädets indrag.
    const fönster = await p.evaluate(() => {
      const work = document.getElementById("work");
      const port = work.getBoundingClientRect();
      const namn = document.querySelector(".list-row .list-name").getBoundingClientRect();
      return { vy: Math.round(port.width), kvar: Math.round(port.right - Math.max(namn.right, port.left)) };
    });
    ok(fönster.kvar > fönster.vy * 0.5, `mer än halva skärmen är rullbar vid full scroll: ${JSON.stringify(fönster)}`);

    // Och läckan som frysningen bar med sig: två frysta celler med ett rutnätsglapp
    // mellan sig är två ogenomskinliga lådor och ett 14px-fack som tillhör ingen, så
    // prioritetsstaplar och agentbrickor gled igenom det och la sig bredvid glyfen.
    // Mätt som lådor, inte som `elementFromPoint`: punkten träffar raden själv oavsett,
    // och frågan är om någon *cell* har hamnat i ett fack som inte är dess.
    const glapp = await p.evaluate(() => {
      const rad = document.querySelector(".list-row");
      const g = rad.querySelector(".puck-glyph").getBoundingClientRect();
      const n = rad.querySelector(".list-name").getBoundingClientRect();
      const inkräktare = [...rad.querySelectorAll(":scope > .list-cell")]
        .filter((c) => { const r = c.getBoundingClientRect(); return r.right > g.right + 1 && r.left < n.left - 1; })
        .map((c) => c.className + ":" + c.textContent.trim().slice(0, 12));
      return { bredd: Math.round(n.left - g.right), inkräktare };
    });
    ok(glapp.bredd > 0, `det finns ett glapp att läcka genom: ${JSON.stringify(glapp)}`);
    eq(glapp.inkräktare.length, 0, `men ingen cell ligger i det: ${JSON.stringify(glapp)}`);
  }

  group("en lång titel bestämmer inte radens bredd");
  {
    // Codex, #48. Radens minimum måste komma från *kolumnerna*, aldrig från innehållet.
    // Med `min-width: max-content` läste den den längsta titeln i stället, och på en
    // telefon är det inte en skönhetsfläck: mätt med en 120 tecken lång titel blev
    // namncellen 851px bred på en 390px-skärm — en enda pucks namn satte scrollbredden
    // för varje rad i listan. Det var värre medan cellen var fryst (ogenomskinlig och
    // bredare än skärmen la den sig *över* metadatan), och det är borta med frysningen;
    // golvet står kvar för att en rads minimum ska komma från dess kolumner ändå.
    const långTitel = (d) => {
      d.items.find((i) => i.slug === "a-now").title =
        "En puck med ett orimligt långt namn som ingen skulle skriva men som formatet tillåter och som därför bestämmer radens bredd";
      return d;
    };
    const p = await open("?layout=list", { data: långTitel, viewport: { width: 390, height: 800 }, hasTouch: true });
    await p.evaluate(() => { document.getElementById("work").scrollLeft = 500; });
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
    await p.evaluate(() => { document.getElementById("work").scrollLeft = 400; });
    await p.waitForTimeout(150);
    const efter = await rubriker(p);
    ok(före.length > 1, `flera rubriker att mäta: ${JSON.stringify(före)}`);
    ok(efter.every((x) => x >= 0), `ingen rubrik har åkt ut åt vänster: ${JSON.stringify(efter)}`);
    // Och inte en pixel åt vänster heller: rubriken fäster där den redan står, inte vid
    // rutans kant. Med `left: 0` gled varje rubrik 26px innan den fastnade, vilket är
    // varför listan läste som om den scrollade i alla led på en gång.
    eq(JSON.stringify(efter), JSON.stringify(före), `rubrikerna rör sig inte alls: ${JSON.stringify(före)} → ${JSON.stringify(efter)}`);

    // Rubrikens bakgrund blöder över rännan till vänster om den, annars syns den
    // scrollade raden i tavlans egen marginal. Mätt som *vad som ligger överst* i
    // rännan, inte som en färg: en täckning som ritas under raden är ingen.
    const ränna = await p.evaluate(() => {
      const rubrik = document.querySelector(".lh-inner").getBoundingClientRect();
      const e = document.elementFromPoint(6, rubrik.top + rubrik.height / 2);
      return e ? String(e.className) : "?";
    });
    ok(/lh-inner/.test(ränna), `rubrikens ränna täcks av rubriken: ${ränna}`);
  }

  group("skalet har en scrollruta, och rubriken klibbar i båda axlarna");
  {
    // Det sidledsscrollen kostade, tillbaka. En låda som scrollar i sidled är
    // scrollcontainer i *båda* axlarna, så gruppens rubrik klibbade mot en port som
    // aldrig rörde sig vertikalt — mätt −575, −521, −468 medan man skrollade nedåt.
    // Nu är skalet en fast höjd med `.work` som enda scrollruta: sidan scrollar inte
    // alls, och rubriken har en riktig port att fästa i.
    //
    // Två sticky-lådor, en per axel, för att axlarna vill ha motsatta former: en
    // sticky-box kan bara röra sig *inuti* sitt containing block, så vertikalt behövs ett
    // element kortare än sin behållare (rubriken i den höga gruppen) och horisontellt ett
    // smalare (den inre lådan i den fullbreda rubriken).
    // Låg vyport med flit: fixturen är liten, och en ruta som inte scrollar mäter
    // ingenting om det som ska mätas är vad som händer när man scrollar.
    const p = await open("?layout=list&group=parent&done=1", { viewport: { width: 390, height: 420 }, hasTouch: true });
    const läs = () => p.evaluate(() => {
      const work = document.getElementById("work");
      const port = work.getBoundingClientRect();
      const rad = document.querySelector(".list-row");
      return {
        sidanScrollar: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
        portScrollar: work.scrollHeight > work.clientHeight,
        fastnad: [...document.querySelectorAll(".list-head")]
          .some((e) => Math.abs(e.getBoundingClientRect().top - port.top) < 2),
        namn: Math.round(rad.querySelector(".list-name").getBoundingClientRect().left),
      };
    });
    const före = await läs();
    eq(före.sidanScrollar, false, `sidan scrollar inte — skalet har en fast höjd: ${JSON.stringify(före)}`);
    ok(före.portScrollar, "rutan gör det i stället");

    // Bägge axlarna på en gång: ner *och* i sidled.
    await p.evaluate(() => { const w = document.getElementById("work"); w.scrollTop = 200; w.scrollLeft = 400; });
    await p.waitForTimeout(200);
    const efter = await läs();
    eq(efter.fastnad, true, `en rubrik står fast vid rutans överkant: ${JSON.stringify(efter)}`);
    ok(efter.namn < före.namn, `medan raden följer med i sidled: ${före.namn} → ${efter.namn}`);
    eq(efter.sidanScrollar, false, "sidan står fortfarande stilla");
  }

  group("scrollrutan går att nå från tangentbordet");
  {
    // Codex, #49. Med skalet på en fast höjd scrollar dokumentet inte längre, så Page Down
    // och mellanslag från topbaren eller chipparaden hade ingenting att flytta: rutan är en
    // vanlig div. Chrome lägger scrollcontainrar i tab-ordningen själv, Safari inte — och
    // det är där skillnaden går mellan en tavla ett tangentbord kan läsa och en det inte kan.
    const p = await open("?layout=list&done=1", { viewport: { width: 900, height: 500 } });
    await p.waitForSelector(".list-row");
    await p.evaluate(() => document.body.focus());
    let steg = null;
    for (let i = 1; i <= 30 && steg == null; i++) {
      await p.keyboard.press("Tab");
      if (await p.evaluate(() => document.activeElement === document.getElementById("work"))) steg = i;
    }
    ok(steg != null, `rutan går att tabba till (steg ${steg})`);
    const rullade = await p.evaluate(() => document.getElementById("work").scrollTop);
    await p.keyboard.press("PageDown");
    await p.waitForTimeout(200);
    const efter = await p.evaluate(() => document.getElementById("work").scrollTop);
    ok(efter > rullade, `och Page Down flyttar den när den har fokus: ${rullade} → ${efter}`);

    // Namnet följer det rutan håller: en region utan namn säger ingenting, och ett namn
    // som säger "Board" på en puck-sida säger fel.
    const namn = () => p.evaluate(() => {
      const w = document.getElementById("work");
      return { roll: w.getAttribute("role"), namn: w.getAttribute("aria-label") };
    });
    eq(JSON.stringify(await namn()), JSON.stringify({ roll: "region", namn: "Board" }), "på tavlan heter regionen Board");
    await p.evaluate(() => document.querySelector(".list-row").click());
    await p.waitForTimeout(200);
    eq((await namn()).namn, "Puck", "och på en puck-sida heter den Puck");
  }

  group("en fällning lämnar kontrollen där du tryckte på den");
  {
    // Att fälla bygger om tavlan, och en ombyggd tavla börjar överst: mätt 262 → 0, så
    // raden man just tryckt på scrollade ut ur bild och det man fällde låg utanför
    // skärmen när det var klart. Kontrollen är därför ankaret — dess avstånd till rutans
    // överkant läses före renderingen och läggs tillbaka efter.
    const p = await open("?layout=list&done=1", { viewport: { width: 390, height: 380 }, hasTouch: true });
    await p.waitForSelector(".list-head");
    const välj = () => p.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollTop = Math.round((w.scrollHeight - w.clientHeight) * 0.4);
      const top = w.getBoundingClientRect().top;
      const t = [...document.querySelectorAll("[data-fold]")].filter((e) => e.getBoundingClientRect().top - top >= 0)[0];
      return t ? { scrollTop: Math.round(w.scrollTop), y: Math.round(t.getBoundingClientRect().top - top), k: t.getAttribute("data-fold") } : null;
    });
    const tryck = (k) => p.evaluate((k) => {
      [...document.querySelectorAll("[data-fold]")].find((e) => e.getAttribute("data-fold") === k).click();
    }, k);
    const läs = (k) => p.evaluate((k) => {
      const w = document.getElementById("work");
      const top = w.getBoundingClientRect().top;
      const t = [...document.querySelectorAll("[data-fold]")].find((e) => e.getAttribute("data-fold") === k);
      return { scrollTop: Math.round(w.scrollTop), y: t ? Math.round(t.getBoundingClientRect().top - top) : null };
    }, k);

    const före = await välj();
    ok(före && före.scrollTop > 0, `det finns en kontroll i bild, en bit ner: ${JSON.stringify(före)}`);
    await tryck(före.k);
    await p.waitForTimeout(150);
    const fälld = await läs(före.k);
    eq(fälld.y, före.y, `kontrollen står kvar på sin plats när gruppen fälls: ${JSON.stringify({ före, fälld })}`);
    ok(fälld.scrollTop !== före.scrollTop, `och rutan har flyttat sig för att hålla den där: ${före.scrollTop} → ${fälld.scrollTop}`);

    await tryck(före.k);
    await p.waitForTimeout(150);
    const utfälld = await läs(före.k);
    eq(utfälld.y, före.y, `och när den fälls ut igen: ${JSON.stringify({ före, utfälld })}`);
  }

  group("en dragning håller sig till en axel");
  {
    // Rutan scrollar i båda axlarna i listan — priset för en klibbig gruppubrik — och en
    // dragning på en telefon är aldrig rak, så en flick nedför listan med några graders
    // drift flyttade kolumnerna i sidled också.
    //
    // Första svaret läste den scroll webbläsaren redan gjort och la tillbaka off-axeln.
    // Det klarade ett syntetiskt test och gjorde ingenting på en riktig telefon: **en
    // iOS-touchscroll körs på kompositorn, och att skriva `scrollTop` medan fingret är
    // nere når inte dit.** Ett test som flyttar offseten själv rör aldrig den mekanismen.
    // Därför riktiga gester här, genom webbläsarens egen inmatningskedja (CDP), som är
    // det enda som låter `touch-action` och `preventDefault` betyda något.
    const p = await open("?layout=list&done=1", { viewport: { width: 390, height: 600 }, hasTouch: true });
    await p.waitForSelector(".list-row");
    const cdp = await p.context().newCDPSession(p);
    const dra = async (x, y, dx, dy) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 12; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove",
          touchPoints: [{ x: Math.round(x + dx * i / 12), y: Math.round(y + dy * i / 12) }] });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await p.waitForTimeout(400);
      return p.evaluate(() => {
        const w = document.getElementById("work");
        return { x: Math.round(w.scrollLeft), y: Math.round(w.scrollTop) };
      });
    };
    const nolla = () => p.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollLeft = 0; w.scrollTop = 0; window.__nekade = 0;
    });
    // Registrerad *efter* låsets egen lyssnare på samma element och fas, alltså kör den
    // sist och ser vad låset gjorde. Det här är enda sättet att mäta refuseringen här:
    // Chromium har ett eget axellås som redan dämpar vertikalen i en sidledsgest, så
    // offseten skulle se likadan ut med och utan `preventDefault`. På iOS finns inget
    // sådant lås, och då är refuseringen det enda som håller.
    await p.evaluate(() => {
      window.__nekade = 0;
      document.getElementById("work").addEventListener("touchmove", (e) => { if (e.defaultPrevented) window.__nekade++; });
    });

    // Vinkeln är vald, inte gissad: Chromium har ett eget axellås som håller upp till
    // ungefär 36 grader, så en svag drift mäter ingenting här — den skulle passera även
    // utan regeln. Vid 42 grader släpper det egna låset och tar hela sidledsvidden med
    // sig (mätt: x = 352 av 352), vilket är det tal sabotaget lämnar efter sig. iOS låser
    // inte alls, vilket är varför regeln behövs för mildare vinklar också.
    await nolla();
    const nedåt = await dra(200, 400, -200, -220);
    eq(nedåt.x, 0, `en brant diagonal nedåt rör inte sidleds: ${JSON.stringify(nedåt)} — utan regeln 352`);
    ok(nedåt.y > 100, `men går nedåt, med momentum: ${nedåt.y}`);
    eq(await p.evaluate(() => window.__nekade), 0, "och en dragning nedåt tas aldrig ifrån webbläsaren");

    await nolla();
    const sidled = await dra(200, 400, -220, -60);
    eq(sidled.y, 0, `och en dragning i sidled med 60px drift nedåt rör inte vertikalen: ${JSON.stringify(sidled)}`);
    ok(sidled.x > 100, `men går i sidled: ${sidled.x}`);
    ok(await p.evaluate(() => window.__nekade) > 0, "och den vertikala panoreringen nekas webbläsaren under tiden");

    // Vid kanten, riktad bortom den, finns ingen sidled att ta: att ändå göra anspråk på
    // x nekade webbläsarens lodräta panorering och skrev sedan ett `scrollLeft` som
    // klampade, alltså rörde gesten ingen axel alls. Anspråket är det enda som går att
    // observera här — Chromiums eget axellås vägrar panorera lodrätt för en
    // sidledsdominant gest ändå, medan iOS, som inte låser, får den lodräta i stället.
    // Vänta ut föregående kast först: `nolla()` nollställer offseten, men ett glid som
    // fortfarande lever hinner flytta den innan nästa gest börjar — och då *finns* det rum
    // åt höger, så anspråket blir korrekt men kontrollen mäter något annat än den tror.
    // (Det förklarar också ett enstaka fel jag såg utan att kunna återskapa det.)
    await p.waitForTimeout(700);
    await nolla();
    await dra(150, 400, 200, -80);   // vid vänsterkanten, fingret åt höger
    eq(await p.evaluate(() => window.__nekade), 0,
      "vid kanten tas gesten inte ifrån webbläsaren");
    await nolla();
    await p.evaluate(() => { document.getElementById("work").scrollLeft = 120; });
    await dra(150, 400, 200, -80);   // en bit in, samma gest
    ok(await p.evaluate(() => window.__nekade) > 0,
      "men en bit in, med rum åt det hållet, gör den det");
  }

  group("listan studsar inte i sidled, men gör det i höjdled");
  {
    // Från telefonen: kedjar man ett svep nedåt direkt in i ett åt höger drar hela listan
    // förbi sin egen vänsterkant — rubriker och rader ~180px till höger om där de hör
    // hemma, med de klibbiga lådorna på compositorns resa medan `scrollLeft` står på 0 och
    // inte kan säga något om det. `touch-action` hindrar webbläsaren från att *starta* en
    // sidledspanorering men omprövar inte en scroll som redan är igång, så den halvan är
    // inte vår att ta tillbaka. Kanten är det.
    //
    // `-x` och inte bägge: den lodräta studsen är den en lång lista faktiskt läses med.
    // `none` och inte `contain`: `contain` stoppar kedjningen ut till sidan men behåller
    // studsen på plats, vilket är precis det som ska bort.
    const p = await open("?layout=list&group=parent&done=1", { viewport: { width: 390, height: 800 }, hasTouch: true });
    await p.waitForSelector(".list-row");
    const lista = await p.evaluate(() => {
      const cs = getComputedStyle(document.getElementById("work"));
      return { x: cs.overscrollBehaviorX, y: cs.overscrollBehaviorY };
    });
    eq(lista.x, "none", `sidled studsar inte: ${JSON.stringify(lista)}`);
    eq(lista.y, "auto", `men höjdled gör det: ${JSON.stringify(lista)}`);
    // Och sidledsscrollen finns fortfarande — en regel som köpte lugnet genom att ta bort
    // resan hade "lyckats" utan att lösa något.
    eq(await p.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollLeft = 99999;
      return Math.round(w.scrollLeft) === Math.round(w.scrollWidth - w.clientWidth) && w.scrollLeft > 0;
    }), true, "och listan går fortfarande att scrolla hela vägen i sidled");

    // Samma två undantag som låset har, och av samma skäl: brädan är sin egen
    // sidledsscroller, och en puck som öppnats *ur* listan är ingen lista.
    const bräda = await open("?done=1");
    eq(await bräda.evaluate(() => getComputedStyle(document.getElementById("work")).overscrollBehaviorX),
      "auto", "kolumnläget rör den inte");
    await p.evaluate(() => document.querySelector(".list-row").click());
    await p.waitForTimeout(400);
    eq(await p.evaluate(() => document.body.classList.contains("viewing-puck")), true, "pucken är öppen");
    eq(await p.evaluate(() => getComputedStyle(document.getElementById("work")).overscrollBehaviorX),
      "auto", "och en puck ur listan bär inte listans regel");
  }

  group("en gest webbläsaren redan äger tar vi inte halva");
  {
    // Rapporterat från en telefon, ordagrant: "Jag skrollar ner. Sidan är i rörelse. Sätter
    // ner fingret och drar igen. Sidan skrollar i både X och y."
    //
    // En touchmove är *inte avbrytbar* precis när webbläsaren redan bestämt sig för att
    // scrolla — vilket är exakt det läget. Vi kunde alltså inte neka dess lodräta
    // panorering, men körde vår sidled ändå. Att ta om en lista som rör sig gör de första
    // pixlarna ryckiga, så 8px-tröskeln kan läsa det som sidled.
    //
    // `cancelable` är den enda skillnaden mellan de två gesterna här, och det är den enda
    // vägen att mäta det: CDP:s beröringar är alltid avbrytbara, så en riktig gest genom
    // riggen kan inte skilja fallen åt. Syntetiska `TouchEvent` når samma lyssnare med
    // samma `passive: false`.
    const p = await open("?layout=list&done=1", { viewport: { width: 390, height: 600 }, hasTouch: true });
    await p.waitForSelector(".list-row");
    const dra = (cancelable) => p.evaluate((cx) => {
      const w = document.getElementById("work");
      w.scrollLeft = 0; w.scrollTop = 0;
      const el = document.elementFromPoint(200, 400);
      const t = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      const send = (type, pt, can) => {
        const ev = new TouchEvent(type, { bubbles: true, cancelable: can,
          touches: pt ? [pt] : [], targetTouches: pt ? [pt] : [], changedTouches: pt ? [pt] : [] });
        el.dispatchEvent(ev);
        return ev.defaultPrevented;
      };
      send("touchstart", t(200, 400), true);
      let nekade = 0;
      for (let i = 1; i <= 10; i++) if (send("touchmove", t(200 - 20 * i, 400 - 2 * i), cx)) nekade++;
      send("touchend", null, true);
      return { x: Math.round(w.scrollLeft), nekade };
    }, cancelable);

    const vanlig = await dra(true);
    ok(vanlig.x > 100, `en vanlig gest driver sidleds: ${JSON.stringify(vanlig)}`);
    eq(vanlig.nekade, 10, "och nekar webbläsaren dess lodräta panorering hela vägen");

    const ägd = await dra(false);
    eq(ägd.nekade, 0, "en gest webbläsaren äger går inte att neka");
    eq(ägd.x, 0, `så vi tar inte heller dess andra axel: ${JSON.stringify(ägd)} (utan regeln 200)`);

    // Och överlämnandet gäller *gesten*, inte den enskilda händelsen — vilket är det
    // blandade fallet: de första pixlarna hinner före webbläsarens beslut, resten inte.
    // Två saker faller ut ur det, och ingen av dem syns i provet ovan: en avbrytbar
    // händelse efter en icke avbrytbar får inte ta tillbaka axeln, och hastigheten som
    // hann samlas får inte kastas iväg av ett `touchend` på en gest vi slutat styra.
    const blandad = await p.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollLeft = 0; w.scrollTop = 0;
      const el = document.elementFromPoint(200, 400);
      const t = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      const send = (type, pt, can) => el.dispatchEvent(new TouchEvent(type, { bubbles: true,
        cancelable: can, touches: pt ? [pt] : [], targetTouches: pt ? [pt] : [], changedTouches: pt ? [pt] : [] }));
      send("touchstart", t(200, 400), true);
      for (let i = 1; i <= 5; i++) send("touchmove", t(200 - 20 * i, 400 - 2 * i), true);   // vi styr
      const vidÖvertag = Math.round(w.scrollLeft);
      for (let i = 6; i <= 10; i++) send("touchmove", t(200 - 20 * i, 400 - 2 * i), false); // webbläsaren tar över
      send("touchmove", t(200 - 20 * 11, 400 - 2 * 11), true);                              // avbrytbar igen
      const efterÖvertag = Math.round(w.scrollLeft);
      send("touchend", null, true);
      return { vidÖvertag, efterÖvertag };
    });
    ok(blandad.vidÖvertag > 50, `vi styrde tills webbläsaren tog över: ${JSON.stringify(blandad)}`);
    eq(blandad.efterÖvertag, blandad.vidÖvertag,
      `och tar inte tillbaka axeln när en avbrytbar händelse kommer igen: ${JSON.stringify(blandad)}`);
    await p.waitForTimeout(700);
    eq(await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft)), blandad.vidÖvertag,
      "och inget kast sjösätts ur en gest vi slutat styra");
  }

  group("sidledsdragningen har ett kast");
  {
    // `touch-action: pan-y` ger bort webbläsarens sidledsscroll, och därmed dess momentum.
    // Utan ett eget kast läste axeln som stum: 1:1 med fingret och tvärstopp när det lyfts,
    // vilket ingen annan scroll på telefonen gör. Hastigheten mäts utjämnad — en enda
    // hackig bildruta i slutet av en svep skulle annars avgöra hela kastet — och en
    // dragning som *stannat* innan fingret lyfts kastas inte alls.
    const p = await open("?layout=list&done=1", { viewport: { width: 390, height: 600 }, hasTouch: true });
    await p.waitForSelector(".list-row");
    const cdp = await p.context().newCDPSession(p);
    // `paus` är fingret som stannar innan det lyfts — den enda skillnaden mellan de två
    // fallen, och det som gör det andra deterministiskt: annars avgör den sista
    // bildrutans hastighet, och 200 → 271 är lika mycket "glid" som "flake".
    const dra = async (ms, paus) => {
      await p.evaluate(() => { const w = document.getElementById("work"); w.scrollLeft = 0; w.scrollTop = 0; });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - 20 * i, y: 400 - 3 * i }] });
        await new Promise((r) => setTimeout(r, ms / 10));
      }
      if (paus) await new Promise((r) => setTimeout(r, paus));
      const släpp = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await p.waitForTimeout(700);
      const efter = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
      return { släpp, efter };
    };
    const flick = await dra(100, 0);
    ok(flick.efter > flick.släpp, `en snabb flick fortsätter efter att fingret lyfts: ${flick.släpp} → ${flick.efter}`);
    const stannat = await dra(300, 250);
    eq(stannat.efter, stannat.släpp, `men en dragning som stannat innan fingret lyfts står stilla: ${JSON.stringify(stannat)}`);

    // Codex, #49: ett avbrutet fling är inget fling. Ställs sidan åt sidan står
    // `requestAnimationFrame` stilla, och att bara klippa gapet hade låtit trögheten
    // överleva pausen och rulla vidare när man kommer tillbaka. Här härmas pausen med en
    // blockerad huvudtråd, vilket ger samma sak: ett bildrutegap på hundratals ms.
    // Mätt utan regeln: 100 → 174. Med: 100 → 103, alltså bara den bildruta som hann före.
    await p.evaluate(() => { const w = document.getElementById("work"); w.scrollLeft = 0; w.scrollTop = 0; });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - 10 * i, y: 400 - 2 * i }] });
      await new Promise((r) => setTimeout(r, 15));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const föreBlock = await p.evaluate(() => {
      const w = document.getElementById("work");
      const x = Math.round(w.scrollLeft);
      const t = Date.now();
      while (Date.now() - t < 350) {}          // sidan "åt sidan"
      return x;
    });
    await p.waitForTimeout(800);
    const efterBlock = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
    ok(föreBlock > 40, `glidet var på väg när sidan pausades: ${föreBlock}`);
    ok(efterBlock - föreBlock < 15,
      `och återupptas inte efteråt: ${föreBlock} → ${efterBlock} (utan regeln 100 → 174)`);

    // Codex, #49: en avbruten gest är ingen avslutad. `touchcancel` betyder att systemet
    // tog gesten ifrån oss — ett samtal, ett kantsvep, en scroll webbläsaren bestämde sig
    // för att äga — och att avsluta den genom samma väg som ett lyft finger kastade listan
    // på styrkan hos ett svep användaren aldrig slutförde. Samma svep, två slut: mätt
    // 100 → 174 för `touchEnd`, 100 → 100 för `touchCancel`.
    const slut = async (typ) => {
      await p.evaluate(() => { const w = document.getElementById("work"); w.scrollLeft = 0; w.scrollTop = 0; });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - 10 * i, y: 400 - 2 * i }] });
        await new Promise((r) => setTimeout(r, 15));
      }
      const vid = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
      await cdp.send("Input.dispatchTouchEvent", { type: typ, touchPoints: [] });
      await p.waitForTimeout(800);
      return { vid, efter: await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft)) };
    };
    const lyft = await slut("touchEnd");
    ok(lyft.efter - lyft.vid > 40, `ett lyft finger kastar: ${lyft.vid} → ${lyft.efter}`);
    const avbrutet = await slut("touchCancel");
    eq(avbrutet.efter, avbrutet.vid,
      `men en avbruten gest står stilla: ${avbrutet.vid} → ${avbrutet.efter} (utan regeln lika långt som lyftet)`);
  }

  group("att fånga ett glid öppnar ingen puck");
  {
    // Codex, #49. Ett finger ner stoppar glidet — men utan rörelse syntetiserar
    // webbläsaren ett klick efteråt, så att fånga en glidande lista öppnade pucken under
    // tummen. Mätt: glidande på 246, tappat för att stoppa, puck-sidan öppnades.
    const p = await open("?layout=list&done=1", { viewport: { width: 390, height: 600 }, hasTouch: true });
    await p.waitForSelector(".list-row");
    const cdp = await p.context().newCDPSession(p);
    const flick = async () => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - 20 * i, y: 400 - 3 * i }] });
        await new Promise((r) => setTimeout(r, 10));
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    const tapp = async () => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 400 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await p.waitForTimeout(400);
      return p.evaluate(() => ({
        puck: document.body.classList.contains("viewing-puck"),
        x: Math.round(document.getElementById("work").scrollLeft),
      }));
    };

    await flick();
    await p.waitForTimeout(80); // mitt i glidet
    const under = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
    ok(under > 100, `listan glider fortfarande: ${under}`);
    const fångat = await tapp();
    eq(fångat.puck, false, `tappet stoppar glidet utan att öppna något: ${JSON.stringify(fångat)}`);
    // Två prov *efter* tappet, inte ett före och ett efter. Glidet rör sig ju mellan
    // mätningen och beröringen, så en jämförelse över den luckan mäter maskinens tempo
    // lika mycket som koden — den varianten föll ungefär var tredje körning (248 → 295).
    // Står det still efter tappet är det stoppat, och det är hela påståendet.
    const stilla1 = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
    await p.waitForTimeout(400);
    const stilla2 = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
    eq(stilla2, stilla1, `och glidet står stilla efteråt: ${stilla1} → ${stilla2}`);

    // Men ett tapp är fortfarande ett tapp — vakten får inte äta ett riktigt klick.
    eq((await tapp()).puck, true, "ett vanligt tapp öppnar pucken");
    await p.goBack();
    await p.waitForTimeout(300);
    await flick();
    await p.waitForTimeout(1200); // glidet tar slut av sig självt
    eq((await tapp()).puck, true, "och ett tapp efter ett avslutat glid också");

    // Och fångsten får inte överleva sin egen gest: fångar man ett glid och *drar* i
    // stället för att släppa kommer inget klick att äta, så flaggan måste falla av sig
    // själv — annars äts nästa riktiga tryck i stället.
    await p.goBack();
    await p.waitForTimeout(300);
    // Nollställ först, och kolla att det *finns* ett glid att fånga. Listan står vid
    // högerkanten efter allt ovan, och där ber fingret om ett håll som inte finns —
    // `flick()` gör då inget glid alls, `caught` sätts aldrig, och kontrollen påstår
    // ingenting. Mätt: 352 av 352 vid den här punkten, alltså grön mot vilket sabotage
    // som helst. Det är samma slags fel som resten av filen letar efter, en våning upp.
    const glidande = async () => {
      await p.evaluate(() => { const w = document.getElementById("work"); w.scrollLeft = 0; w.scrollTop = 0; });
      await flick();
      await p.waitForTimeout(80);
      ok(await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft)) > 100,
        "listan glider när gesten fångas");
    };
    const fångaOchDra = async () => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 400 }] });
      for (let i = 1; i <= 6; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 200 - 15 * i, y: 400 }] });
        await new Promise((r) => setTimeout(r, 20));
      }
      await new Promise((r) => setTimeout(r, 250));
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await p.waitForTimeout(600);
    };
    await glidande();
    await fångaOchDra();
    eq((await tapp()).puck, true, "ett tapp efter en fångad-och-dragen gest öppnar pucken");

    // Codex, #49: och den kontrollen kan inte se hela saken, för *tappet* är en beröring
    // och dess egen `touchstart` nollar flaggan på vägen in. Ett klick som kommer utan
    // beröring — en mus på en hybrid, eller ett klick från hjälpmedel — gör inte det, och
    // åt det ligger flaggan kvar från draget och äter det. Mätt: ett rent musklick öppnar
    // pucken, samma klick efter en fångad-och-dragen gest gjorde det inte.
    const musklick = async () => {
      await p.mouse.click(200, 400);
      await p.waitForTimeout(400);
      return p.evaluate(() => document.body.classList.contains("viewing-puck"));
    };
    await p.goBack();
    await p.waitForTimeout(300);
    eq(await musklick(), true, "ett rent musklick öppnar pucken");
    await p.goBack();
    await p.waitForTimeout(300);
    await glidande();
    await fångaOchDra();
    eq(await musklick(), true, "och ett musklick efter en fångad-och-dragen gest också");

    // Codex, #49: glidet hör till sin gest, och allt som tar över rutan avslutar det. Ett
    // tapp på Filter startar *utanför* `.work`, så portens egen `touchstart` såg det
    // aldrig — och `lockScroll` gömmer bara överflödet, vilket inte hindrar våra egna
    // `scrollLeft`-skrivningar. Mätt: glidande på 229, ytan öppnad vid 271, listan stod
    // still först på 352 — under en öppen sheet.
    await p.goBack();
    await p.waitForTimeout(300);
    // En *neutral* punkt i chromet, inte Filter: på en telefon öppnar Filter en sheet, och
    // sheetens lås stoppar glidet ändå — så en kontroll som tappar där mäter låset och
    // inte lyssnaren. `.vhead`s tomma yta öppnar ingenting.
    const knapp = { x: 340, y: 66 };
    ok(await p.evaluate(({ x, y }) => {
      const e = document.elementFromPoint(x, y);
      return !!e && !e.closest("button, a") && !document.getElementById("work").contains(e);
    }, knapp), "punkten ligger i chromet och är ingen kontroll");
    // En mjukare flick än `flick()`, med flit: den hårda når sidledskanten på ett par
    // hundra millisekunder, och ett glid som redan stannat vid kanten kan inte visa om
    // något stoppade det. Den här glider 100 → 172 av sig själv, alltså finns det ett
    // fönster att mäta i.
    await p.evaluate(() => { const w = document.getElementById("work"); w.scrollLeft = 0; w.scrollTop = 0; });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - 10 * i, y: 400 - 2 * i }] });
      await new Promise((r) => setTimeout(r, 15));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: knapp.x, y: knapp.y }] });
    const vidTapp = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(800);
    const efterYta = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
    ok(vidTapp > 40 && vidTapp < 200, `glidet är på väg när fingret rör chromet: ${vidTapp}`);
    ok(efterYta - vidTapp < 15,
      `och listan står stilla därifrån: ${vidTapp} → ${efterYta} (ostoppad glider den vidare ~70px)`);

    // Och en yta som öppnas *utan* en beröring — här från tangentbordet — når aldrig
    // lyssnaren ovan. `lockScroll` gömmer bara överflödet, vilket håller användarens
    // scrollande men inte våra egna skrivningar, så låset måste stoppa glidet självt.
    await p.keyboard.press("Escape");
    await p.waitForTimeout(200);
    await p.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollLeft = 0; w.scrollTop = 0;
      document.getElementById("displayBtn").focus();
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - 10 * i, y: 400 - 2 * i }] });
      await new Promise((r) => setTimeout(r, 15));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.keyboard.press("Enter");
    const vidLås = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
    await p.waitForTimeout(800);
    const efterLås = await p.evaluate(() => ({
      x: Math.round(document.getElementById("work").scrollLeft),
      låst: getComputedStyle(document.getElementById("work")).overflow,
      yta: !!document.querySelector(".sheet, .pop"),
    }));
    eq(efterLås.yta, true, "ytan öppnades från tangentbordet");
    eq(efterLås.låst, "hidden", "och rutan är låst");
    ok(efterLås.x - vidLås < 15, `en låst ruta glider inte vidare: ${vidLås} → ${efterLås.x}`);

    // Tredje vägen: tavlan byts ut under glidet. Ingen beröring, inget lås — bara en ny
    // lista, som ett glid som lever vidare skulle fortsätta flytta.
    await p.keyboard.press("Escape");
    await p.waitForTimeout(200);
    await p.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollLeft = 0; w.scrollTop = 0;
      [...document.querySelectorAll(".focusbtn")].find((e) => /Ready/.test(e.textContent)).focus();
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - 10 * i, y: 400 - 2 * i }] });
      await new Promise((r) => setTimeout(r, 15));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.keyboard.press("Enter");
    const vidByte = await p.evaluate(() => Math.round(document.getElementById("work").scrollLeft));
    await p.waitForTimeout(800);
    const efterByte = await p.evaluate(() => ({
      x: Math.round(document.getElementById("work").scrollLeft),
      rader: document.querySelectorAll(".list-row, .card").length,
    }));
    // Kort *eller* rader: layouten hör till vyn sedan `vyn-minns-sin-egen-display`, och
    // `?layout=list` kom från länken — alltså skrevs den aldrig in i Readys minne, och
    // Ready öppnar som bräda. Det kontrollen är om är att tavlan byttes ut under glidet,
    // inte vilken av de två som ritades.
    ok(efterByte.rader > 0, `den nya tavlan är ritad: ${JSON.stringify(efterByte)}`);
    ok(efterByte.x - vidByte < 15, `och glidet flyttar den inte: ${vidByte} → ${efterByte.x}`);
  }

  group("telefonen ritar inga scrollindikatorer i listan");
  {
    // Rapporterat från en riktig telefon, tre symptom av en orsak: den lodräta stapeln
    // målas *under* de klibbiga gruppubrikerna, den följer med i sidled i stället för att
    // stå vid rutans kant, och en vanlig flick nedåt blinkar fram den vågräta också — en
    // indikator för en axel webbläsaren inte ens scrollar, eftersom `armAxisLock` driver
    // den. Bara touch: på en dator är stapeln hur man lär sig att listan går i sidled alls.
    const läs = async (url, opts) => {
      const p = await open(url, opts);
      await p.waitForSelector(".list-row, .column");
      return p.evaluate(() => ({
        work: getComputedStyle(document.getElementById("work")).scrollbarWidth,
        board: getComputedStyle(document.getElementById("board")).scrollbarWidth,
      }));
    };
    const telefon = await läs("?layout=list&done=1", { viewport: { width: 390, height: 600 }, hasTouch: true });
    eq(telefon.work, "none", `listan på telefon ritar ingen: ${JSON.stringify(telefon)}`);
    const tavla = await läs("?layout=board&done=1", { viewport: { width: 390, height: 600 }, hasTouch: true });
    eq(tavla.work, "auto", `men tavlan rörs inte — den scrollar i sin egen låda: ${JSON.stringify(tavla)}`);
    const desktop = await läs("?layout=list&done=1", { viewport: { width: 1200, height: 700 } });
    eq(desktop.work, "auto", `och en dator behåller sin: ${JSON.stringify(desktop)}`);

    // Codex, #49: en gömd `#board` behåller sin `as-list`, så en puck öppnad *ur* listan
    // bar med sig listans regler in på en sida som inte är en lista — axellåset förbjuder
    // sidledspanorering i puckens egna kodblock och tabeller, och indikatorerna göms på en
    // sida som bara har en axel. Samma puck nådd från tavlan hade ingetdera. Mätt i
    // Chromium som en asymmetri, inte som en tappad gest: motorn låter den inre scrollern
    // ta sin egen sidled ändå. Regeln är ändå fel på den sidan, och den skillnaden är vad
    // som vaktas här.
    const puck = async (layout) => {
      const p = await open("?layout=" + layout + "&done=1", { viewport: { width: 390, height: 600 }, hasTouch: true });
      await p.waitForSelector(".card, .list-row");
      const id = await p.evaluate(() => window.__ROADMAP__.items[0].id);
      await p.evaluate((i) => { location.hash = "#" + encodeURIComponent(i); }, id);
      await p.waitForTimeout(400);
      return p.evaluate(() => {
        const w = document.getElementById("work");
        const cs = getComputedStyle(w);
        return { puck: document.body.classList.contains("viewing-puck"),
                 asList: document.getElementById("board").classList.contains("as-list"),
                 ta: cs.touchAction, bar: cs.scrollbarWidth };
      });
    };
    const urListan = await puck("list");
    eq(urListan.puck, true, "pucken är öppen");
    eq(urListan.asList, true, "och den gömda brädan bär fortfarande sin listklass");
    eq(urListan.ta, "auto", `men puck-sidan har inget axellås: ${JSON.stringify(urListan)}`);
    const urTavlan = await puck("board");
    eq(urTavlan.ta, urListan.ta, "samma puck beter sig lika oavsett vilken layout man kom ifrån");
    eq(urTavlan.bar, urListan.bar, "och ritar sina indikatorer lika");
  }

  group("tavlans egen sidled tas inte av låset");
  {
    // `pan-y` på en förfader förbjuder sidled för allt under den, och kanban-tavlan är sin
    // egen sidledsscroller. Regeln är därför hängd på klassen renderaren redan sätter, och
    // det här är kontrollen som säger att avgränsningen finns.
    const p = await open("?layout=board", { viewport: { width: 390, height: 600 }, hasTouch: true });
    await p.waitForSelector(".column");
    const cdp = await p.context().newCDPSession(p);
    const före = await p.evaluate(() => ({
      ta: getComputedStyle(document.getElementById("work")).touchAction,
      x: Math.round(document.getElementById("port").scrollLeft),
    }));
    eq(före.ta, "auto", `rutan är inte låst i tavellayouten: ${JSON.stringify(före)}`);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - Math.round(200 * i / 12), y: 400 - Math.round(30 * i / 12) }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(400);
    const efter = await p.evaluate(() => Math.round(document.getElementById("port").scrollLeft));
    ok(efter > 100, `och kolumnerna går fortfarande att dra i sidled: ${före.x} → ${efter}`);
  }

  group("ett zoomhjul scrollar inte tavlan");
  {
    // Codex, #49. En trackpad-nypning kommer fram som ett hjul med `ctrlKey` — samma
    // gest webbläsaren zoomar med — så att vidarebefordra dess delta skulle scrolla
    // tavlan bort under någon som bara försöker göra den större.
    const p = await open("?layout=list&done=1", { viewport: { width: 900, height: 500 } });
    await p.waitForSelector(".list-row");
    const pt = await p.evaluate(() => {
      const r = document.querySelector(".topbar").getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    await p.mouse.move(pt.x, pt.y);
    await p.keyboard.down("Control");
    await p.mouse.wheel(0, 200);
    await p.keyboard.up("Control");
    await p.waitForTimeout(250);
    eq(await p.evaluate(() => Math.round(document.getElementById("work").scrollTop)), 0,
      "ctrl+hjul över topbaren rör inte tavlan");
    // Och vidarebefordran lever — annars vaktar kontrollen ovan bara en död lyssnare.
    await p.mouse.wheel(0, 200);
    await p.waitForTimeout(250);
    ok(await p.evaluate(() => document.getElementById("work").scrollTop) > 100,
      "medan ett vanligt hjul direkt efteråt fortfarande gör det");
  }

  group("listan står kvar där den stod när man kommer tillbaka från en puck");
  {
    // Codex, #49. `body.viewing-puck` gömmer `#board`, alltså tar rutans scrollvidd bort,
    // alltså klampas bägge offseten till 0 — och tillbaka på tavlan landar man på listans
    // övre vänstra hörn. Mätt: 150/250 → 0/0. Det går inte att lösa som fällningen (samma
    // task), för brädan är gömd över godtyckligt många renderingstillfällen; platsen måste
    // sparas på vägen in.
    const p = await open("?layout=list&done=1", { viewport: { width: 390, height: 500 } });
    await p.waitForSelector(".list-row");
    const före = await p.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollTop = 250; w.scrollLeft = 150;
      return { x: Math.round(w.scrollLeft), y: Math.round(w.scrollTop) };
    });
    ok(före.x > 0 && före.y > 0, `listan är scrollad i bägge led: ${JSON.stringify(före)}`);
    await p.evaluate(() => {
      const w = document.getElementById("work");
      [...document.querySelectorAll(".list-row")]
        .find((r) => r.getBoundingClientRect().top > w.getBoundingClientRect().top + 40).click();
    });
    await p.waitForTimeout(300);
    eq(await p.evaluate(() => document.body.classList.contains("viewing-puck")), true, "en puck är öppen");
    await p.goBack();
    await p.waitForTimeout(400);
    const efter = await p.evaluate(() => {
      const w = document.getElementById("work");
      return { x: Math.round(w.scrollLeft), y: Math.round(w.scrollTop) };
    });
    eq(JSON.stringify(efter), JSON.stringify(före), `och platsen är tillbaka: ${JSON.stringify({ före, efter })}`);

    // Men platsen hör till *den* tavlan. Går man ur pucken via sidomenyn byts tavlan ut,
    // och då ärvde den nya offseten: mätt öppnade en fyraradersvy på `scrollLeft: 150`
    // med titlarna utanför skärmen, för att en längre lista lästs där innan.
    await p.evaluate(() => { const w = document.getElementById("work"); w.scrollTop = 240; w.scrollLeft = 150; });
    await p.evaluate(() => {
      const w = document.getElementById("work");
      [...document.querySelectorAll(".list-row")].find((r) => r.getBoundingClientRect().top > w.getBoundingClientRect().top + 40).click();
    });
    await p.waitForTimeout(400);
    eq(await p.evaluate(() => document.body.classList.contains("viewing-puck")), true, "en puck är öppen igen");
    await p.evaluate(() => [...document.querySelectorAll(".focusbtn")].find((b) => /Ready/.test(b.textContent)).click());
    await p.waitForTimeout(500);
    const nyVy = await p.evaluate(() => {
      const w = document.getElementById("work");
      return { x: Math.round(w.scrollLeft), y: Math.round(w.scrollTop), puck: document.body.classList.contains("viewing-puck") };
    });
    eq(nyVy.puck, false, "vybytet lämnar pucken");
    eq(nyVy.x, 0, `och den nya tavlan börjar vid titlarna, inte i metadatan: ${JSON.stringify(nyVy)}`);
    eq(nyVy.y, 0, `och överst: ${JSON.stringify(nyVy)}`);

    // Codex, #49: den sparade platsen är inte den enda. `openDetail` nollar rutan på vägen
    // in, men *läsaren* kan ha scrollat puck-sidan sedan dess — och den offseten står kvar
    // i porten när tavlan byts. Att släppa den sparade utan den levande flyttar bara
    // problemet: mätt öppnade en vy 186px ner efter att pucken lästs 300px in.
    // Egen sida med en lång puck-text: fixturens pucksidor är 43px höga, och en sida som
    // inte kan scrollas kan inte bära en läsares offset in i nästa tavla.
    const lång = (d) => { d.items.forEach((it) => { it.body = ("Ett stycke text som gör sidan hög.\n\n").repeat(40); }); return d; };
    const q2 = await open("?layout=list&done=1", { viewport: { width: 390, height: 500 }, data: lång });
    await q2.waitForSelector(".list-row");
    await q2.evaluate(() => document.querySelector(".list-row").click());
    await q2.waitForTimeout(400);
    const läst = await q2.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollTop = 300;
      return { puck: document.body.classList.contains("viewing-puck"), y: Math.round(w.scrollTop),
               max: w.scrollHeight - w.clientHeight };
    });
    eq(läst.puck, true, "en puck är öppen");
    ok(läst.y > 100, `och läsaren har scrollat ner i den: ${JSON.stringify(läst)}`);
    await q2.evaluate(() => [...document.querySelectorAll(".focusbtn")].find((b) => /Ready/.test(b.textContent)).click());
    await q2.waitForTimeout(500);
    const efterLäst = await q2.evaluate(() => {
      const w = document.getElementById("work");
      return { x: Math.round(w.scrollLeft), y: Math.round(w.scrollTop),
               rader: document.querySelectorAll(".list-row, .card").length };
    });
    // Samma skäl som ovan: Ready har inget eget minne, så den öppnar som bräda. Frågan
    // här är om läsarens offset från pucken följde med in i den.
    ok(efterLäst.rader > 0, `den nya tavlan är ritad: ${JSON.stringify(efterLäst)}`);
    eq(efterLäst.y, 0, `och börjar överst, inte där pucken lästes: ${JSON.stringify(efterLäst)}`);
  }

  group("en omritning i bakgrunden flyttar inte läsaren");
  {
    // Codex, #49. `loadWritableRepos()` ritar om tavlan när behörighetsfrågorna landar,
    // alltså långt efter att sidan lästs — och att tömma en scrollports höga barn *skulle*
    // klampa dess offset till origo. Men klampningen sker vid layout, och `renderBoard`
    // läser ingen geometri mellan sin `innerHTML = ""` och sina appends, så lådan mäts
    // aldrig medan den är tom. Mätt med en påtvingad reflow inlagd i det glappet: 150/200
    // → 0/0. Kontrollen finns för att den dagen någon lägger ett
    // `getBoundingClientRect()` där inne ska det synas här och inte som ett hopp under
    // fingret.
    const gh = githubStub();
    const p = await open("?layout=list&done=1", {
      viewport: { width: 390, height: 380 }, token: true,
      // Fördröjt, så scrollen hinner ske medan frågorna är i luften — annars mäter
      // kontrollen en omritning som redan varit.
      github: async (route) => { await new Promise((r) => setTimeout(r, 800)); return gh.handler(route); },
    });
    await p.waitForSelector(".list-row");
    const före = await p.evaluate(() => {
      const w = document.getElementById("work");
      w.scrollTop = 200; w.scrollLeft = 150;
      return { x: w.scrollLeft, y: w.scrollTop };
    });
    await p.waitForTimeout(2000);
    const efter = await p.evaluate(() => {
      const w = document.getElementById("work");
      return { x: Math.round(w.scrollLeft), y: Math.round(w.scrollTop), kort: document.querySelectorAll(".list-row").length };
    });
    ok(efter.kort > 0, `tavlan är ritad: ${JSON.stringify(efter)}`);
    eq(efter.y, före.y, `omritningen flyttar inte den lodräta platsen: ${före.y} → ${efter.y}`);
    eq(efter.x, före.x, `och inte den vågräta heller: ${före.x} → ${efter.x}`);
  }

  group("en popover ryms i skalet");
  {
    // Codex, #49. Med en fast höjd klipper `.app`, och det finns ingen sidscroll kvar —
    // så en popover som går förbi underkanten är inte bara ful: dess nedersta rader går
    // inte att nå alls. Mätt på 1000×420 med etikettlistan öppen: 328px hög, 14 av dem
    // under fönstret. `fitPop` svarade redan på samma fråga i sidled; det här är den
    // andra axeln, och den blev en riktig fråga först när sidan slutade scrolla.
    const fett = (d) => {
      d.items.forEach((it, i) => { it.tags = Array.from({ length: 6 }, (_, k) => "etikett-" + ((i * 6 + k) % 48)); });
      return d;
    };
    const p = await open("?done=1", { viewport: { width: 1000, height: 420 }, data: fett });
    await p.waitForSelector("#filterBtn");
    await p.click("#filterBtn");
    await p.waitForTimeout(250);
    // Etikettraden, som byter listan mot fältets värden — det är den ombyggnaden som gör
    // panelen hög, och som en passning mätt bara vid öppning aldrig ser.
    await p.evaluate(() => {
      const r = [...document.querySelectorAll(".pop .row, .pop button")].find((e) => /^Labels/.test(e.textContent.trim()));
      if (r) r.click();
    });
    await p.waitForTimeout(350);
    const m = await p.evaluate(() => {
      const pop = document.querySelector(".pop");
      const r = pop.getBoundingClientRect();
      pop.scrollTop = pop.scrollHeight; // nåbarhet, inte synlighet
      const sista = pop.querySelector(".surface-body > *:last-child");
      const sr = sista && sista.getBoundingClientRect();
      return {
        höjd: Math.round(r.height), bottom: Math.round(r.bottom), vh: window.innerHeight,
        scrollar: pop.scrollHeight > pop.clientHeight,
        sistaNåbar: sr ? sr.bottom <= r.bottom + 1 : null,
      };
    });
    ok(m.scrollar, `panelen är högre än sitt tak, alltså mäter vi något: ${JSON.stringify(m)}`);
    ok(m.bottom <= m.vh, `och håller sig innanför fönstret: ${JSON.stringify(m)}`);
    eq(m.sistaNåbar, true, "sista raden går att scrolla fram inuti den");

    // Codex, #49, en gång till: vilken *ände* menyn hänger från är inte författad. En
    // railkontroll långt ner på en puck-sida har inget rum under sig på någon bredd, så
    // ett tak räknat nedåt ger en 15px hög meny (mätt: statusväljaren på y=247 i ett
    // 300px fönster) — eller, en rad lägre, ett negativt tak: ogiltig CSS, ignorerad,
    // och menyn hänger utanför igen. Sidan mäts därför också.
    const gh = githubStub();
    const q = await open("?done=1", { viewport: { width: 1000, height: 300 }, token: true, github: gh.handler });
    await q.waitForSelector(".card, .list-row");
    await q.evaluate(() => document.querySelector(".card, .list-row").click());
    await q.waitForTimeout(700);
    const väljare = () => q.evaluate(() =>
      [...document.querySelectorAll(".prop button")].find((e) => /pick-chip/.test(e.className) && !/static/.test(e.className)));
    ok(await väljare() !== null, "det finns en redigerbar railkontroll att öppna");
    const trigger = await q.evaluate(() => {
      const b = [...document.querySelectorAll(".prop button")].find((e) => /pick-chip/.test(e.className) && !/static/.test(e.className));
      return b ? Math.round(b.getBoundingClientRect().top) : null;
    });
    ok(trigger !== null && trigger > 200, `och den sitter långt ner: y=${trigger} av 300`);
    await q.evaluate(() => {
      const b = [...document.querySelectorAll(".prop button")].find((e) => /pick-chip/.test(e.className) && !/static/.test(e.className));
      b.click();
    });
    await q.waitForTimeout(400);
    // Mätt mot **rutan**, inte mot fönstret. Codex igen, och den skarpaste av dem: en
    // railpopover bor i `.work`, vars `overflow: auto` klipper vid sin egen överkant —
    // 52px ner på en puck-sida — så en vändning mätt mot vyporten la menyns första rader
    // bakom topbaren utan scrollvidd ovanför att hämta tillbaka dem med. Den första
    // versionen av den här kontrollen frågade `top >= 0` och passerade medan 44px var
    // borta: fel låda, rätt svar.
    const läge = () => q.evaluate(() => {
      const pop = document.querySelector(".pop");
      if (!pop) return null;
      const r = pop.getBoundingClientRect(), w = document.getElementById("work").getBoundingClientRect();
      return { vänd: pop.classList.contains("pop-flip"), top: Math.round(r.top), bottom: Math.round(r.bottom),
               höjd: Math.round(r.height), portTop: Math.round(w.top), portBottom: Math.round(w.bottom) };
    });
    const f = await läge();
    ok(f, "väljaren öppnas");
    eq(f.vänd, true, `menyn vänder sig ovanför avtryckaren: ${JSON.stringify(f)}`);
    ok(f.top >= f.portTop, `och börjar inne i scrollrutan, inte ovanför den: ${JSON.stringify(f)}`);
    ok(f.bottom <= f.portBottom, `och slutar inne i den: ${JSON.stringify(f)}`);
    ok(f.höjd > 96, `med en användbar höjd — nedåt hade den blivit 15px: ${f.höjd}`);

    // Och när *fönstret* ändras i stället för innehållet: en förkortad vy lämnade
    // vändningen och taket som gällde för den förra, och utan sidscroll fanns ingenting
    // som kunde hämta fram raderna som hamnade utanför.
    await q.setViewportSize({ width: 1000, height: 285 });
    await q.waitForTimeout(300);
    const efterKrymp = await läge();
    ok(efterKrymp, "menyn står kvar öppen så länge avtryckaren gör det");
    ok(efterKrymp.top >= efterKrymp.portTop && efterKrymp.bottom <= efterKrymp.portBottom,
      `och ryms i rutan efteråt: ${JSON.stringify(efterKrymp)}`);

    // Krymper fönstret förbi avtryckaren finns det ingen passning kvar att göra: menyn
    // hänger på en kontroll ingen längre ser. Mätt vid 220px — radens låda ligger på 250,
    // rutan slutar på 220 — så den stängs i stället.
    await q.setViewportSize({ width: 1000, height: 220 });
    await q.waitForTimeout(300);
    eq(await läge(), null, "och stängs när avtryckaren själv hamnar utanför rutan");

    // Codex igen: den närmaste klippande lådan är *olika* på de två axlarna. Kanban-tavlan
    // sätter `overflow-x: auto`, vilket gör dess beräknade `overflow-y` till `auto` också,
    // så en vandring som stannar vid första träffen läste en underkant som ligger där den
    // högsta kolumnen slutar. Mätt på 1000×240: kolumnmenyn gick till 245 medan rutan
    // slutade på 240, utan tak, eftersom tavlans underkant var 473.
    const b = await open("?done=1", { viewport: { width: 1000, height: 240 } });
    await b.waitForSelector(".col-more button");
    await b.evaluate(() => document.querySelector(".col-more button").click());
    await b.waitForTimeout(300);
    const kol = await b.evaluate(() => {
      const pop = document.querySelector(".column .pop");
      if (!pop) return null;
      const r = pop.getBoundingClientRect();
      const k = document.querySelector(".column .cards");
      return { bottom: Math.round(r.bottom), höjd: Math.round(r.height),
               kolSpill: k ? k.scrollHeight - k.clientHeight : 0,
               portBottom: Math.round(document.getElementById("port").getBoundingClientRect().bottom) };
    });
    ok(kol, "kolumnmenyn öppnas");
    // Lådan som klipper är `.port`, och tavlan sticker ut ur den: kolumnerna är
    // innehållshöga och porten är fönsterhög. Det är precis det som gör en vandring som
    // stannar vid första träffen fel — den läser en underkant långt nedanför fönstret
    // (mätt: 473 mot 240) — och därför mäter passningen den *intersekterade* lådan.
    // Tavlan stack ut ur porten i höjdled när den här skrevs, och gör det inte längre —
    // brädan fyller porten och kolumnerna skrollar inuti sig själva. Den fel underkant en
    // första-träff-vandring kan läsa är kolumnens innehållshöjd i stället, som fortfarande
    // ligger långt under fönstret. Regeln är densamma: mät den intersekterade lådan.
    ok(kol.kolSpill > 0,
      `kolumnen har innehåll under sin egen kant, alltså finns en fel underkant att läsa: ${JSON.stringify(kol)}`);
    ok(kol.bottom <= kol.portBottom, `och menyn håller sig innanför porten: ${JSON.stringify(kol)}`);
  }

  group("chromet ovanför rutan är ingen död zon för hjulet");
  {
    // Codex, #49. Topbaren, vyrubriken och chipparaden är *syskon* till rutan, och med
    // dokumentet utan scroll fanns det ingenting för ett hjul över dem att flytta: mätt,
    // 300 hack över topbaren lämnade `.work.scrollTop` på 0. Före den fasta höjden
    // scrollade de sidan, vilket var att scrolla tavlan.
    {
      const p = await open("?layout=list&done=1", { viewport: { width: 900, height: 500 } });
      await p.waitForSelector(".list-row");
      const pt = await p.evaluate(() => {
        const r = document.querySelector(".topbar").getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      });
      await p.mouse.move(pt.x, pt.y);
      await p.mouse.wheel(0, 200);
      await p.waitForTimeout(300);
      const y = await p.evaluate(() => Math.round(document.getElementById("work").scrollTop));
      ok(y > 100, `ett hjul över topbaren flyttar tavlan: 0 → ${y}`);
    }

    // Men chipparaden har första tjing: den scrollar sig själv när en lång fråga radbryter
    // den, och ett hjul som gick förbi den till tavlan hade gjort de nedersta chippen
    // onåbara igen. Vandringen uppåt frågar varje låda om den är en scrollcontainer *och*
    // har rum åt hållet som efterfrågas — överflödet först, för knappen i topbaren mäter
    // 24 mot 21 av ren radhöjd och hade annars svalt varje hjul över den.
    {
      const q = Array.from({ length: 20 }, (_, i) => "-tag:saknas" + i).join(" ");
      const p = await open("?layout=list&q=" + encodeURIComponent(q), { viewport: { width: 390, height: 500 } });
      await p.waitForSelector("#chipRow .fchip");
      const pt = await p.evaluate(() => {
        const r = document.getElementById("chipRow").getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      });
      await p.mouse.move(pt.x, pt.y);
      await p.mouse.wheel(0, 200);
      await p.waitForTimeout(300);
      const m = await p.evaluate(() => ({
        chip: Math.round(document.getElementById("chipRow").scrollTop),
        work: Math.round(document.getElementById("work").scrollTop),
      }));
      ok(m.chip > 100, `chipparaden tar hjulet själv: ${JSON.stringify(m)}`);
      eq(m.work, 0, "och tavlan står stilla under tiden");

      // Men första tjing gäller per axel, och bara där gesten faktiskt bär ett delta.
      // Chipparaden scrollar lodrätt och kan inte ta ett `deltaX` alls — att fråga
      // `deltaY < 0` om ett rent sidledsswipe (`deltaY === 0`) läste det som "nedåt",
      // hittade rum och svalde en gest raden inte hade någon användning för. Mätt: 150px
      // sidledshjul flyttade ingenting, med 352px lista till höger.
      await p.evaluate(() => { document.getElementById("work").scrollLeft = 0; });
      await p.mouse.wheel(150, 0);
      await p.waitForTimeout(300);
      const våg = await p.evaluate(() => ({
        work: Math.round(document.getElementById("work").scrollLeft),
        chip: Math.round(document.getElementById("chipRow").scrollTop),
      }));
      ok(våg.work > 100, `ett rent sidledshjul når listan förbi chipparaden: ${JSON.stringify(våg)}`);

      // Och en diagonal gest är två anspråk, inte ett: chipparaden får den lodräta halvan
      // den kan använda, listan den vågräta den inte kan. Mätt före: chipparaden 120,
      // listan 0 — raden behöll bägge halvorna, varav en den inte kunde göra något med.
      await p.evaluate(() => {
        document.getElementById("work").scrollLeft = 0;
        document.getElementById("chipRow").scrollTop = 0;
      });
      await p.mouse.wheel(120, 120);
      await p.waitForTimeout(300);
      const diag = await p.evaluate(() => ({
        work: Math.round(document.getElementById("work").scrollLeft),
        chip: Math.round(document.getElementById("chipRow").scrollTop),
      }));
      ok(diag.chip > 50, `chipparaden tar den lodräta halvan: ${JSON.stringify(diag)}`);
      ok(diag.work > 50, `och listan den vågräta: ${JSON.stringify(diag)}`);
    }
  }

  group("tavlan svämmar inte ur sin ruta");
  {
    // Rapporterat från en telefon som fotens text mitt inne på brädan, bland korten.
    // `.work` är ett rutnät, och `#board` bär `overflow-x: auto` — vilket gör den till
    // scrollcontainer i *bägge* axlarna, och en scrollcontainer bidrar nästan ingenting
    // till sin rads höjd: den kan ju scrolla. Med `auto`-rader tog rad ett därför bara det
    // som blev över (mätt: 573px) medan brädan själv, `align-self: start` och alltså sin
    // egen innehållshöjd, stod 3019px hög — och de 2446px målades rakt över foten.
    //
    // Bara nåbart sedan skalet fick en bestämd höjd: utan en sådan finns inget överskott
    // att fördela, och raderna storleksätts efter innehållet ändå. Det är alltså det enda
    // den ändringen kostade, och den kostar det bara i kolumnläget.
    // Fixturens elva pucker gör en bräda som är kortare än sin rad, alltså ingen spill —
    // kontrollen var grön mot sitt eget sabotage tills den här kolumnen fanns. Det som
    // mäts är brädan *högre än rutan*, så pucksen mångfaldigas in i en och samma kolumn.
    const hög = (d) => {
      const en = d.items.find((i) => i.status === "now");
      for (let i = 0; i < 40; i++) {
        d.items.push(Object.assign({}, en, { id: "alpha/fyll-" + i, slug: "fyll-" + i, title: "Fyllnad " + i }));
      }
      return d;
    };
    const p = await open("", { viewport: { width: 390, height: 780 }, data: hög });
    await p.waitForSelector(".column");
    // Premissen är en annan sedan kanban fick en egen port, och det är en starkare ordning
    // än den här kontrollen bad om: spillet ligger *inne i* porten i stället för utanför
    // rutan, och foten ligger i samma port efter brädan. En bräda som målar över foten går
    // alltså inte att arrangera längre — inte för att raden lappats, utan för att lådan
    // som kunde göra det inte finns.
    // Spillet flyttade in i kolumnen när varje kolumn blev sin egen scrollruta: porten är
    // enaxlig nu, så den har inget lodrätt spill att måla med. Frågan är densamma — finns
    // det innehåll som *kan* måla utanför? — och den ställs till lådan som faktiskt har det.
    const spill = await p.evaluate(() => {
      const pt = document.getElementById("port");
      const k = [...document.querySelectorAll(".board > .column .cards")]
        .reduce((a, c) => (c.scrollHeight - c.clientHeight) > (a.scrollHeight - a.clientHeight) ? c : a);
      return { höjd: Math.round(pt.getBoundingClientRect().height),
               innehåll: k.scrollHeight, ruta: k.clientHeight };
    });
    ok(spill.innehåll > spill.ruta + 1,
      `det finns spill att måla med — i kolumnens egen scroll: ${JSON.stringify(spill)}`);
    ok(spill.höjd <= 780, `och porten själv ryms i fönstret: ${JSON.stringify(spill)}`);
    // Raden som mätte att foten började där brädan slutade är borta med foten: den flyttade
    // till sidomenyn, och porten håller bara brädan nu. Kvar står frågan den egentligen
    // ställde — målar brädan över något? — och svaret är att det inte finns något under
    // den att måla över. Porten slutar där rutan slutar.
    const m = await p.evaluate(() => {
      const pt = document.getElementById("port").getBoundingClientRect();
      const w = document.querySelector(".work").getBoundingClientRect();
      return { portBotten: Math.round(pt.bottom), arbetsBotten: Math.round(w.bottom) };
    });
    ok(m.portBotten <= m.arbetsBotten + 1,
      `porten svämmar inte ut ur .work: ${JSON.stringify(m)}`);
    // Sidled scrollar fortfarande — fixen får inte köpa ordningen genom att ta bort det
    // kolumnläget bygger på. Det är portens scroll nu, inte brädans.
    ok(await p.evaluate(() => { const pt = document.getElementById("port"); return pt.scrollWidth > pt.clientWidth; }),
      "och kolumnerna scrollar fortfarande i sidled");
  }

  group("banderollen ryms i skalet i stället för att förlänga sidan");
  {
    // Codex, #49. Skalet är inte alltid det enda på sidan: den config-styrda banderollen
    // sätts in som *syskon* till `.app`. Med den fasta höjden på `.app` blev dokumentet
    // banderollhögt plus en hel vyport — alltså sidscroll igen, `.work`s underkant under
    // vikningen, och en sida som kunde röra sig medan en sheet låste bara `.work`.
    // Höjden bor därför på `body` som en kolumn: banderollen tar det den behöver, skalet
    // resten, oavsett hur hög den är och om den ens finns.
    const ribbon = (p) => { p.config = { ...p.config, ribbon: "**live demo** · ändringar stannar i webbläsaren" }; return p; };
    const p = await open("?layout=list", { viewport: { width: 390, height: 420 }, hasTouch: true, data: ribbon });
    const m = await p.evaluate(() => {
      const band = document.querySelector(".demo-ribbon");
      const work = document.getElementById("work");
      const d = document.documentElement;
      return {
        band: band ? Math.round(band.getBoundingClientRect().height) : 0,
        sidanScrollar: d.scrollHeight > d.clientHeight + 1,
        vy: d.clientHeight,
        rutansUnderkant: Math.round(work.getBoundingClientRect().bottom),
        portScrollar: work.scrollHeight > work.clientHeight,
      };
    });
    ok(m.band > 0, `banderollen ritas: ${JSON.stringify(m)}`);
    eq(m.sidanScrollar, false, `och sidan står stilla ändå: ${JSON.stringify(m)}`);
    ok(m.rutansUnderkant <= m.vy + 1, `rutans underkant är inne i vyporten: ${m.rutansUnderkant} mot ${m.vy}`);
    ok(m.portScrollar, "och rutan är den som scrollar");
  }

  group("chromet ovanför rutan kan inte tränga ut den");
  {
    // Codex, #49. Med en fast höjd är chromet ovanför scrollporten det enda som kan
    // trycka ut den ur skalet: en tillräckligt lång fråga radbryter chipparaden över
    // flera rader, och då finns ingen sida kvar att scrolla. Mätt på 390×360 med 20
    // predikat: raden blev 295px, `.work` kollapsade till **noll**, och de sista
    // chippen — bland dem de som tar bort termerna — låg 24px under skärmkanten utan
    // något att scrolla dem fram med.
    // Uteslutande termer för etiketter som inte finns: tjugo chip, och tavlan står kvar
    // som den var — annars mäter kontrollen en tom tavla i stället för en trång rad.
    const q = Array.from({ length: 20 }, (_, i) => "-tag:saknas" + i).join(" ");
    const p = await open("?layout=list&q=" + encodeURIComponent(q), { viewport: { width: 390, height: 360 }, hasTouch: true });
    await p.waitForSelector("#chipRow .fchip");
    const m = await p.evaluate(() => {
      const chip = document.getElementById("chipRow"), work = document.getElementById("work");
      chip.scrollTop = chip.scrollHeight; // nåbarhet, inte synlighet
      const box = chip.getBoundingClientRect(), sista = chip.lastElementChild.getBoundingClientRect();
      return {
        workHöjd: Math.round(work.getBoundingClientRect().height),
        chipHöjd: Math.round(box.height),
        chipScrollar: chip.scrollHeight > chip.clientHeight,
        sistaNåbar: sista.bottom <= box.bottom + 1 && sista.top >= box.top - 1,
      };
    });
    ok(m.workHöjd > 100, `rutan behåller sin del av skalet: ${JSON.stringify(m)}`);
    ok(m.chipScrollar, "chipparaden scrollar i stället för att växa");
    eq(m.sistaNåbar, true, "och det sista chippet går att nå");
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

  // ── which box scrolls ───────────────────────────────────────────────────────
  // The kanban board is its own port again. Four things asked "which box?" and every
  // one of them answered `.work`, so they are asked here together — a fact with four
  // readers is only as true as the reader nobody checked.
  //
  // A tall column, built rather than borrowed: the fixture is twelve pucks and a port
  // has to overflow before any of this is observable.
  const tall = (p) => {
    const seed = p.items.find((i) => i.status === "now");
    for (let n = 0; n < 14; n++) {
      p.items.push({ ...seed, id: seed.id + "-x" + n, slug: seed.slug + "-x" + n, title: "Fyllnad " + n });
    }
    return p;
  };
  const ports = (page) => page.evaluate(() => {
    const w = document.querySelector(".work"), pt = document.getElementById("port");
    const over = (e) => e.scrollHeight > e.clientHeight + 1;
    return { work: over(w), port: over(pt) };
  });

  group("porten skrollar i sidled, kolumnen i höjdled, listan gör bägge i .work");
  {
    // Den gamla formuleringen var "i kanban skrollar porten" utan axel, och det räckte
    // medan porten var tvåaxlig. Det är just tvåaxligheten som togs bort.
    const kanban = await open("?view=all", { data: tall, viewport: { width: 900, height: 500 } });
    eq(await kanban.evaluate(() => {
      const w = document.querySelector(".work"), pt = document.getElementById("port");
      const över = (e, ax) => ax === "x" ? e.scrollWidth > e.clientWidth + 1 : e.scrollHeight > e.clientHeight + 1;
      const kol = [...document.querySelectorAll(".board > .column .cards")].some((k) => över(k, "y"));
      return { workY: över(w, "y"), portX: över(pt, "x"), portY: över(pt, "y"), kolY: kol };
    }), { workY: false, portX: true, portY: false, kolY: true },
      "porten tar sidled, kolumnerna höjdled, och .work står stilla");

    const lista = await open("?view=all&layout=list", { data: tall, viewport: { width: 900, height: 500 } });
    eq(await ports(lista), { work: true, port: false },
      "i listan är det .work som skrollar — `.board.as-list` är ingen scrollruta, vilket är vad grupprubrikens lodräta pinne kostar");
  }

  group("kolumnrubriken står still för att den ligger utanför det som skrollar");
  {
    // Den här gruppen hette "kolumnrubriken fastnar" och mätte en `position: sticky` mot
    // portens överkant, med en läcka i brädans padding och en bakgrund som blödde 8px för
    // att täcka ett bortskrollat korts skugga. Ingen av de mätningarna har något kvar att
    // mäta: rubriken är syskon till `.cards`, inte förälder, så inget kort passerar under
    // den och ingenting behöver pinnas. Regeln som ersätter dem är enklare och starkare —
    // rubriken rör sig inte, oavsett hur långt kolumnen skrollas, och det gäller *varje*
    // kolumn samtidigt.
    const p = await open("?view=all", { data: tall, viewport: { width: 390, height: 700 }, hasTouch: true });
    const m = await p.evaluate(() => {
      const pt = document.getElementById("port"), r = pt.getBoundingClientRect();
      const y = () => [...document.querySelectorAll(".board > .column .col-head")]
        .map((h) => Math.round(h.getBoundingClientRect().top - r.top));
      const kol = [...document.querySelectorAll(".board > .column")]
        .filter((c) => { const k = c.querySelector(".cards"); return k.scrollHeight > k.clientHeight + 1; });
      const före = y();
      kol.forEach((c) => { c.querySelector(".cards").scrollTop = 250; });
      return { rullande: kol.length, alla: document.querySelectorAll(".board > .column").length,
               flyttade: kol.map((c) => Math.round(c.querySelector(".cards").scrollTop)),
               före, efter: y(),
               pin: [...document.querySelectorAll(".board > .column .col-head")]
                 .map((h) => getComputedStyle(h).position) };
    });
    ok(m.rullande > 0, `minst en kolumn rullar, annars mäter resten ingenting: ${JSON.stringify(m)}`);
    ok(m.flyttade.every((v) => v > 100), `och den rullade på riktigt: ${JSON.stringify(m.flyttade)}`);
    eq(m.efter, m.före, `varje rubrik står exakt kvar: ${JSON.stringify(m)}`);
    eq(m.pin.filter((v) => v === "sticky").length, 0,
      `och ingen av dem är pinnad — det är hela poängen: ${JSON.stringify(m.pin)}`);

    // Kolumnerna är olika långa, vilket är vad "Now försvinner upp" handlade om: en kort
    // kolumn tog sin egen rubrik med sig ut ur rutan. Nu är banorna lika höga och rubriken
    // ligger utanför skrollen, så den korta kolumnens rubrik står lika stilla som de andras
    // — vilket raden ovanför redan mätte, för *alla* kolumner på en gång.
    ok(m.alla > 1 && m.rullande < m.alla,
      `och kolumnerna är olika långa, annars mäter det inget: ${m.rullande} av ${m.alla} rullar`);
  }

  group("hjulet över topbaren flyttar den ruta som skrollar");
  {
    const p = await open("?view=all", { data: tall, viewport: { width: 900, height: 500 } });
    const box = await p.locator(".topbar").boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // Sidled är den axel porten har kvar, och den forwardas fortfarande.
    await p.mouse.wheel(300, 0);
    await p.waitForTimeout(200);
    const m = await p.evaluate(() => ({
      x: document.getElementById("port").scrollLeft, work: document.querySelector(".work").scrollTop }));
    ok(m.x > 0, `porten tog hjulets sidled (${m.x} px) — den döda zonen är stängd för den axeln`);
    eq(m.work, 0, "och .work rörde sig inte, för den skrollar inte här");

    // Den lodräta halvan är däremot borta, och det är inte ett fel i forwardingen utan i
    // premissen: brädan har ingen lodrät skroll på brädnivå längre, utan en per kolumn, och
    // pekaren står över topbaren som ligger ovanför ingen av dem. Att välja en åt användaren
    // — den vänstraste, den bredaste — vore att hitta på en destination. Regeln "chromet
    // ovanför porten är ingen död zon" är en regel om listan nu, och den kontrollen står kvar
    // i sin egen grupp.
    await p.mouse.wheel(0, 300);
    await p.waitForTimeout(200);
    eq(await p.evaluate(() => ({
      portY: document.getElementById("port").scrollTop,
      kol: Math.round(document.querySelector(".board > .column .cards").scrollTop) })),
      { portY: 0, kol: 0 },
      "ett lodrätt hjul över krommet har ingen destination i kanban, och tar ingen");

    // Två premissrader låg här och bägges premiss är avskaffad, inte lappad: foten låg *i*
    // porten så att den skulle färdas med korten, och den var pinnad i sidled
    // (`position: sticky; left: 0`) för att porten skrollar sidledes och raden bara är
    // portbred — läst åt höger stod tiden, `sync now` och länkarna utanför skärmen, mätt
    // till left −800. Ingen av frågorna finns kvar: raden bor i sidomenyn nu, och porten
    // håller bara brädan. Kontrollerna flyttade med den, till gruppen längre ner.
    //
    // Kvar här står det som faktiskt handlar om porten: den slutar där rutan slutar, så
    // det som skrollar är kort och inte krom.
    const portRam = await p.locator("#port").boundingBox();
    const arbRam = await p.locator(".work").boundingBox();
    ok(portRam.y + portRam.height <= arbRam.y + arbRam.height + 1,
      `porten fyller .work utan att svämma ur den: port slutar ${Math.round(portRam.y + portRam.height)}, .work ${Math.round(arbRam.y + arbRam.height)}`);
    eq(await p.evaluate(() => !!document.querySelector("#port .foot")), false,
      "och ingen fot ligger kvar i porten");

    // Porten själv är inte vår att flytta: där skrollar webbläsaren.
    //
    // Att ta bort hjulets guard fäller *inte* den här raden, och det är värt att veta
    // innan någon "förenklar" den: det är first refusal-vandringen som håller den —
    // porten är en scrollcontainer med utrymme, alltså tar den axeln och vi skriver
    // ingenting. Guarden är ett tidigt utträde och en avsiktsförklaring, inte det som
    // hindrar dubbelskrollen. Raden står kvar för beteendet, inte för mekanismen.
    // Positionen tas ur *porten*, inte brädan: brädans låda är bredare än fönstret nu
    // (kolumnerna svämmar över den synligt), så dess mittpunkt ligger utanför skärmen och
    // ett hjul där träffar ingenting. Kostade en röd körning.
    // Positionen tas ur en *kolumn* nu, eftersom det är den som skrollar lodrätt — och
    // portens sidledsläge nollas först: hjulraden ovanför flyttade den 300px, så kolumnens
    // ruta låg delvis under sidomenyn och hjulet landade där i stället. Kostade en röd
    // körning, och är samma fälla som "positionen tas ur porten, inte brädan" en gång var.
    await p.evaluate(() => { document.getElementById("port").scrollLeft = 0; });
    await p.waitForTimeout(100);
    const kolRuta = await p.locator(".board > .column .cards").first().boundingBox();
    const innan = await p.evaluate(() => {
      const k = document.querySelector(".board > .column .cards"); k.scrollTop = 0; return k.scrollTop; });
    await p.mouse.move(kolRuta.x + kolRuta.width / 2, kolRuta.y + 60);
    await p.mouse.wheel(0, 200);
    await p.waitForTimeout(200);
    const efter = await p.evaluate(() => Math.round(document.querySelector(".board > .column .cards").scrollTop));
    eq(efter, 200, `ett hjul över en kolumn flyttar den en gång, inte två: ${JSON.stringify({ innan, efter })}`);
  }

  group("en diagonal svep i kanban flyttar bara den axel den bad om");
  {
    // Den regression Codex hittade (#54), och som den här ändringen tar bort genom formen
    // i stället för genom ett lås. Mätt före, med samma gest:
    //
    //   main (innan brädan fick en port)   .work y, #board x  →  board.left 299, work.top 0
    //   grenen med tvåaxlig port           #port  x + y       →  port.left 299, port.top 337
    //   nu                                 port x, kolumn y   →  port.left   0, kolumn 331
    //
    // Axlarna låg på två lådor från början och webbläsaren låste själv, eftersom den väljer
    // *en* box att skrolla. Porten slog ihop dem och lämnade inget att välja mellan.
    //
    // Riktiga gester genom CDP, av samma skäl som listans axellås: en syntetisk `scrollTop`
    // mäter aritmetiken, inte mekanismen. Och 42°, inte 20: Chromium låser axeln själv upp
    // till ~36°, så en flackare diagonal kan inte skilja regeln från dess frånvaro.
    //
    // Vad som håller den här kontrollen är värt att veta innan någon "förenklar" något:
    // **inte** portens `overflow-y: hidden` — sätt tillbaka `overflow: auto` och raden står
    // grön, eftersom gesten träffar den innersta scrollrutan och det är kolumnen. Det som
    // bär är att kolumnen *är* en scrollruta: tas `overflow-y` bort från `.cards` kommer
    // sidledsdriften tillbaka omedelbart (mätt: `portX: 514`), med eller utan portens rad.
    const p = await open("?view=all", { data: tall, viewport: { width: 390, height: 700 }, hasTouch: true });
    await p.waitForSelector(".board .card");
    const kol = await p.locator(".board > .column .cards").first().boundingBox();
    ok(await p.evaluate(() => {
      const k = document.querySelector(".board > .column .cards");
      return k.scrollHeight > k.clientHeight + 1;
    }), "kolumnen under fingret rullar, annars mäter gesten ingenting");
    const cdp = await p.context().newCDPSession(p);
    const x0 = Math.round(kol.x + kol.width / 2), y0 = Math.round(kol.y + kol.height / 2);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove",
        touchPoints: [{ x: x0 - i * 20, y: y0 - i * 22 }] });   // 42°, upp-vänster
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(600);
    const m = await p.evaluate(() => ({
      portX: Math.round(document.getElementById("port").scrollLeft),
      portY: Math.round(document.getElementById("port").scrollTop),
      kol: Math.round(document.querySelector(".board > .column .cards").scrollTop) }));
    ok(m.kol > 100, `kolumnen tog gesten den bad om: ${JSON.stringify(m)}`);
    eq(m.portX, 0, `och ingenting drev i sidled — 299px var vad en tvåaxlig port gav: ${JSON.stringify(m)}`);
    eq(m.portY, 0, `porten har ingen lodrät axel att ta: ${JSON.stringify(m)}`);
  }

  group("låset håller den ruta som skrollar");
  {
    const p = await open("?view=all", { data: tall, viewport: { width: 390, height: 700 }, hasTouch: true });
    await p.evaluate(() => { document.getElementById("port").scrollLeft = 150; });
    await p.locator("#filterBtn").click();
    await p.waitForSelector(".sheet");
    eq(await p.evaluate(() => getComputedStyle(document.getElementById("port")).overflow), "hidden",
      "med ett ark uppe är portens overflow dold");
    // Och kolumnerna, som är där den lodräta skrollen bor sedan varje kolumn blev sin egen
    // ruta. Den mäts som beräknad stil och inte som en flyttad offset, eftersom arkets
    // scrim ändå ligger över dem: sabotage av regeln fäller *inte* ett hjulprov, vilket är
    // hur man upptäcker att den är försvar på djupet och inte mekanismen.
    eq(await p.evaluate(() => getComputedStyle(document.querySelector(".board > .column .cards")).overflowY),
      "hidden", "och kolumnerna med, eftersom det är de som skrollar");
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    eq(await p.evaluate(() => document.getElementById("port").scrollLeft), 150,
      "och platsen är tillbaka när arket stängs");
    eq(await p.evaluate(() => getComputedStyle(document.querySelector(".board > .column .cards")).overflowY),
      "auto", "kolumnerna skrollar igen");
  }

  group("brädans plats överlever en puck, och lämnas när man byter tavla");
  {
    // Sabotaget av den första halvan går igenom, och det är ett fynd värt att skriva ut:
    // i kanban är `#board` *själv* porten, och Chromium lägger tillbaka en gömd
    // scrollcontainers offset när den visas igen — mätt utan någon kod inblandad:
    // 180 → gömd 0 → åter 180. Sparandet är alltså bälte och hängslen här, medan det i
    // listan är bärande (`.work` klampas på riktigt; den kontrollen står en bit upp).
    // Raden nedan är därför en regressionsvakt för löftet, inte ett bevis för mekanismen.
    //
    // Det som *är* vårt i kanban är den andra halvan: att gå ur pucken via sidomenyn är
    // en navigering till en annan tavla, och då ska platsen släppas i bägge lådorna.
    const p = await open("?view=all", { data: tall, viewport: { width: 900, height: 500 } });
    // Ett kort som redan syns: låter man webbläsaren skrolla dit försvinner det som mäts.
    await p.evaluate(() => {
      // Lodrätt bor i kolumnen sedan varje kolumn blev sin egen ruta; porten håller sidled.
      const bd = document.querySelector(".board > .column .cards"); bd.scrollTop = 180;
      const r = bd.getBoundingClientRect();
      const c = [...document.querySelectorAll(".card")].find((c) => {
        const b = c.getBoundingClientRect(); return b.top > r.top + 10 && b.bottom < r.bottom - 10; });
      c.dataset.probe = "1";
    });
    await p.locator("[data-probe='1']").click();
    await p.waitForTimeout(350);
    eq(await p.evaluate(() => document.body.classList.contains("viewing-puck")), true, "pucken är öppen");
    await p.locator(".crumb-back").first().click();
    await p.waitForTimeout(400);
    eq(await p.evaluate(() => Math.round(document.querySelector(".board > .column .cards").scrollTop)), 180,
      "tillbaka på brädan står kolumnen där den stod");

    // Ur pucken via sidomenyn i stället: en annan tavla, alltså ingen plats att ärva.
    // Mätt före `exitPuckView`s nollning: den nya vyn öppnade 180px ner i en lista som
    // inte var densamma.
    await p.evaluate(() => { document.querySelector(".board > .column .cards").scrollTop = 180;
      document.getElementById("port").scrollLeft = 120; });
    await p.locator("[data-probe='1']").click();
    await p.waitForTimeout(350);
    await p.getByRole("button", { name: /^Ready/ }).first().click();
    await p.waitForTimeout(400);
    const ut = await p.evaluate(() => ({
      puck: document.body.classList.contains("viewing-puck"),
      portX: document.getElementById("port").scrollLeft,
      kol: Math.round(document.querySelector(".board > .column .cards").scrollTop),
      work: document.querySelector(".work").scrollTop }));
    eq(ut.puck, false, "sidomenyn stänger pucken");
    eq({ portX: ut.portX, kol: ut.kol, work: ut.work }, { portX: 0, kol: 0, work: 0 },
      "och den nya tavlan ärver ingen plats — i alla tre lådorna: portens sidled, kolumnens höjdled, och .work som höll puckens egen offset");
  }

  group("låset släpper den låda det tog, inte den frågan svarar med nu");
  {
    // Codex, #54. Layoutsegmentet ligger överst i samma ark, så ett byte till List med
    // arket uppe flyttade porten ur låset: `unlockScroll` rensade `.work` och lämnade
    // `#board` med en inline `overflow: hidden` ingen skulle ta bort igen.
    const p = await open("?view=all", { data: tall, viewport: { width: 390, height: 700 }, hasTouch: true });
    const stil = () => p.evaluate(() => ({
      port: document.getElementById("port").style.overflow || "",
      work: document.querySelector(".work").style.overflow || "" }));

    await p.locator("#displayBtn").click();
    await p.waitForSelector(".sheet");
    eq(await stil(), { port: "hidden", work: "" }, "arket låser porten, som är den som skrollar i kanban");

    await p.locator(".sheet").getByText("List", { exact: true }).click();
    await p.waitForTimeout(350);
    eq(await p.evaluate(() => !!document.querySelector(".sheet")), true, "arket står kvar över bytet");
    eq(await stil(), { port: "", work: "hidden" },
      "och låset följer med porten — kanbanporten släppt, listans ruta hållen");

    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    eq(await stil(), { port: "", work: "" }, "när arket stängs är bägge lådorna rena");

    // Det läsaren märker, och det enda som mäter det: `overflow: hidden` stoppar aldrig
    // våra egna `scrollTop`-skrivningar, så en kontroll som skrollar själv ser ingenting.
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".sheet");
    await p.locator(".sheet").getByText("Board", { exact: true }).click();
    await p.waitForTimeout(350);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    // Kolumnen, inte porten: den lodräta skrollen bor där sedan varje kolumn blev sin egen
    // ruta, så ett fastnat lås märks som en kolumn som inte går att skrolla.
    const box = await p.locator(".board > .column .cards").first().boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + 60);
    await p.mouse.wheel(0, 300);
    await p.waitForTimeout(250);
    ok(await p.evaluate(() => document.querySelector(".board > .column .cards").scrollTop) > 0,
      "och kolumnen går att skrolla med hjulet efteråt — 0px är hur det fastnade tillståndet läses");
  }

  group("foten bor i sidomenyn, pinnad i den ände brand-bandet inte tar");
  {
    // Foten var vågrät möblering på det enda ställe där lodrätt utrymme är dyrt: mätt på
    // 390×844 tog den 114px av fönstret i tre rader, med en föräldralös "·" på den sista.
    // Sidomenyn är en lodrät spalt där utrymmet är billigt, och på en telefon ligger den
    // bakom menyknappen — där kostar den noll.
    const p = await open("", { viewport: { width: 1400, height: 380 } });
    await p.waitForSelector(".column");
    eq(await p.evaluate(() => !!document.querySelector(".foot")), false,
      "den gamla foten finns inte kvar någonstans");
    const band = await p.evaluate(() => {
      const sf = document.querySelector(".side-foot");
      return { finns: !!sf, höjd: sf ? Math.round(sf.getBoundingClientRect().height) : 0,
               text: sf ? sf.textContent.replace(/\s+/g, " ").trim() : "" };
    });
    ok(band.finns && band.höjd > 0, `bandet står i sidomenyn: ${JSON.stringify(band)}`);
    ok(/pucks · generated /.test(band.text) && /flat digest/.test(band.text) && /roadmap\.json/.test(band.text)
       && /source/.test(band.text), `och bär skördens datum och de tre länkarna: ${band.text}`);

    // Pinnen, och den är `.side-brand`s regel speglad: bägge banden ligger *inne i*
    // sidomenyns egen scrollruta, så "först" och "sist" håller bara vid var sin ände av
    // scrollen om ingen av dem pinnas. Ett kort fönster är vad som får listan att svämma
    // över — utan spill mäter den här kontrollen ingenting alls, vilket är hur en
    // pinnregel kan se rätt ut och vara död.
    const pin = await p.evaluate(() => {
      const sb = document.querySelector(".sidebar"), sf = document.querySelector(".side-foot");
      const brand = document.querySelector(".side-brand");
      const spill = sb.scrollHeight - sb.clientHeight;
      const av = () => Math.round(sb.getBoundingClientRect().bottom - sf.getBoundingClientRect().bottom);
      const före = av();
      sb.scrollTop = sb.scrollHeight;
      return { spill, före, efter: av(),
               brandAv: Math.round(brand.getBoundingClientRect().top - sb.getBoundingClientRect().top) };
    });
    ok(pin.spill > 20, `sidomenyn skrollar verkligen, annars mäter pinnen ingenting: ${JSON.stringify(pin)}`);
    eq(pin.efter, pin.före, `bandet står kvar vid sidomenyns underkant genom hela scrollen: ${JSON.stringify(pin)}`);
    // Och *vid* kanten, inte bara stilla. Den här raden kom av ett sabotage som inte fällde
    // något: `.sidebar` bar `padding-bottom: 16px` för att sista reporaden inte skulle ligga
    // dikt an, och med ett band där nere lade den en remsa *under* det som utger sig för att
    // vara underkanten — en `bottom: 0`-pinne som stannar 16px för högt ser fastnad ut i
    // stället för pinnad. Att bara mäta att den inte rör sig missar det helt.
    eq(pin.efter, 0, `och dikt an mot den, inte en remsa ovanför: ${JSON.stringify(pin)}`);
    eq(pin.brandAv, 0, "och brand-bandet står kvar vid överkanten samtidigt — en pinne i var ände");

    // Datumet är en token hur många bindestreck det än har. I en 240px-spalt bröt
    // webbläsaren efter månaden och lade "16 18:29 UTC" på nästa rad, vilket läses som
    // två tal och inte ett datum.
    eq(await p.evaluate(() => getComputedStyle(document.querySelector(".fm-stamp")).whiteSpace),
      "nowrap", "och skördestämpeln bryts inte mitt i");
  }

  group("bandet överlever en puckssida, vilket den gamla foten inte gjorde");
  {
    // Den gamla foten låg i `.maincol` och var med i `body.viewing-puck`s gömlista, så
    // skördens datum och `sync now` försvann så fort man öppnade en puck — `sync.test`
    // dokumenterade det som en begränsning syncbaren fick kompensera för. Sidomenyn är en
    // annan kolumn och står kvar.
    const p = await open("", { viewport: { width: 1400, height: 900 } });
    await p.waitForSelector(".column");
    const före = await p.evaluate(() => document.querySelector(".side-foot").getBoundingClientRect().height);
    await p.evaluate(() => { location.hash = "alpha/a-now"; });
    await p.waitForFunction(() => document.body.classList.contains("viewing-puck"));
    const efter = await p.evaluate(() => document.querySelector(".side-foot").getBoundingClientRect().height);
    ok(före > 0 && efter > 0 && Math.abs(efter - före) < 2,
      `bandet är oförändrat på puckssidan: ${före} → ${efter}`);
  }

  group("en omritning tappar inte läsarens plats i kolumnen");
  {
    // Codex, #54. Regeln stod redan skriven i `renderBoard` — "inget mäter brädan medan den
    // är tom", så en asynkron omritning kastar inte tillbaka läsaren — men den höll för en
    // låda som *överlever* rensningen, och kolumnerna gör inte det: `.cards` är brädans
    // lodräta port nu och `innerHTML = ""` tar den med sig.
    //
    // Fallet drivs på riktigt och inte genom att anropa `renderBoard` själv: en inloggad
    // bräda kör `loadWritableRepos()`, och när behörighetssonden landar ritas identiskt
    // innehåll om. Stubben svarar långsamt nog att brädan hinner ritas, skrollas och ritas
    // om — vilket är precis sekvensen en läsare möter.
    let släpp;
    const spärr = new Promise((ok) => { släpp = ok; });
    const p = await open("?view=all", {
      data: tall, viewport: { width: 900, height: 600 }, token: true,
      github: async (route) => {
        const u = route.request().url();
        if (/\/repos\//.test(u)) {
          await spärr;   // håll sonden tills vi har skrollat
          return route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify({ permissions: { push: true } }) });
        }
        return route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ login: "tester", permissions: { push: true } }) });
      },
    });
    await p.waitForSelector(".board .card");
    const läs = () => p.evaluate(() => [...document.querySelectorAll(".board > .column .cards")]
      .map((k) => Math.round(k.scrollTop)));
    await p.evaluate(() => {
      document.querySelectorAll(".board > .column .cards").forEach((k) => { k.scrollTop = 240; });
      document.getElementById("port").scrollLeft = 90;
    });
    await p.waitForTimeout(120);
    const före = await läs();
    ok(före.some((v) => v > 100), `en kolumn står skrollad innan sonden landar: ${JSON.stringify(före)}`);

    släpp();
    // Vänta på att omritningen faktiskt skett: korten blir dragbara när skrivrätt landat.
    await p.waitForFunction(() => !!document.querySelector('.card[draggable="true"]'), null, { timeout: 8000 });
    await p.waitForTimeout(200);
    const efter = await läs();
    eq(efter, före, `och står kvar efter omritningen: ${JSON.stringify({ före, efter })}`);
    eq(await p.evaluate(() => document.getElementById("port").scrollLeft), 90,
      "portens sidled överlever av sig själv — den lådan byts inte ut");

    // Och en grupperingsändring ska *inte* ärva platsen: nycklarna är grupperingens egna
    // värden, så ett annat arrangemang av samma pucker öppnar överst. Samma mekanism som
    // `collapsed`, och samma skäl.
    await p.evaluate(() => { document.querySelectorAll(".board > .column .cards").forEach((k) => { k.scrollTop = 200; }); });
    const q = await open("?view=all&group=repo", { data: tall, viewport: { width: 900, height: 600 } });
    await q.waitForSelector(".board .card");
    eq(await q.evaluate(() => [...document.querySelectorAll(".board > .column .cards")]
      .every((k) => k.scrollTop === 0)), true, "en annan gruppering öppnar överst");
  }

  group("ingen låda på brädan skrollar åt två håll");
  {
    // Målets invariant, och den enda leveransen i `listans-motmedel-foljde-inte-med-till-kanban`:
    // den pucken fanns för att lägga listans tre motmedel — axellås, ingen sidledsstuds,
    // gömda indikatorer — på kanbanporten också. Scroll per kolumn gjorde dem obehövliga i
    // stället, så det som står kvar är att mäta att det förblir så. En regel som bara gäller
    // så länge ingen råkar lägga tillbaka en axel är ingen regel.
    //
    // Mätt när den skrevs: .work skrollar ingenting, porten x, kolumnen y. Listan är
    // undantaget och behåller sina motmedel, eftersom `.work` där är tvåaxlig på riktigt.
    const p = await open("?view=all", { data: tall, viewport: { width: 390, height: 700 }, hasTouch: true });
    await p.waitForSelector(".board .card");
    const lådor = await p.evaluate(() => {
      const ax = (e) => [e.scrollWidth > e.clientWidth + 1 ? "x" : null,
                         e.scrollHeight > e.clientHeight + 1 ? "y" : null].filter(Boolean);
      const ut = { work: ax(document.querySelector(".work")), port: ax(document.getElementById("port")) };
      ut.kolumner = [...document.querySelectorAll(".board > .column .cards")].map(ax);
      return ut;
    });
    eq(lådor.work, [], "`.work` skrollar ingenting i kanban");
    eq(lådor.port, ["x"], `porten tar sidled och bara den: ${JSON.stringify(lådor.port)}`);
    ok(lådor.kolumner.some((a) => a.length), `minst en kolumn skrollar, annars mäter det här ingenting: ${JSON.stringify(lådor.kolumner)}`);
    eq(lådor.kolumner.filter((a) => a.length > 1).length, 0,
      `och ingen kolumn tar mer än en axel: ${JSON.stringify(lådor.kolumner)}`);
    eq(lådor.kolumner.filter((a) => a.includes("x")).length, 0,
      `ingen kolumn skrollar i sidled — det är portens axel: ${JSON.stringify(lådor.kolumner)}`);

    // Och med något obrytbart i ett kort, vilket är det fall vakten ovanför inte kan se:
    // fixturens titlar bryts alla, så den mäter en bräda där frågan aldrig ställs. Codex
    // hittade det (#54): `overflow-y: auto` med `overflow-x: visible` beräknas till `auto`
    // på bägge axlarna — samma regel som tvingar `#board` att inte vara scrollcontainer,
    // åt andra hållet. Mätt med en URL i en titel, före reglerna: 414px sidled jämte 1337
    // lodrätt, i just den låda hela arrangemanget finns för att hålla enaxlig.
    const bred = (d) => {
      const en = d.items.find((i) => i.status === "now");
      d.items.push(Object.assign({}, en, { id: "alpha/bred", slug: "bred",
        title: "https://example.com/en/mycket/lang/och/obrytbar/adress/som/ingen/radbrytning/klarar" }));
      return d;
    };
    const w = await open("?view=all", { data: (d) => bred(tall(d)), viewport: { width: 900, height: 600 } });
    await w.waitForSelector(".board .card");
    const m = await w.evaluate(() => [...document.querySelectorAll(".board > .column .cards")]
      .map((k) => ({ ox: getComputedStyle(k).overflowX, spill: k.scrollWidth - k.clientWidth })));
    eq(m.filter((k) => k.spill > 0).length, 0,
      `en obrytbar titel ger ingen kolumn sidledsspill — ombrytningen tar bort det: ${JSON.stringify(m)}`);
    eq(m.filter((k) => k.ox === "visible" || k.ox === "auto" || k.ox === "scroll").length, 0,
      `och sidledsaxeln är stängd oavsett, för nästa sak som råkar svämma över: ${JSON.stringify(m)}`);

    // Och motmedlen ligger kvar där de hör hemma. Det är den andra halvan: att kanban klarar
    // sig utan dem betyder inte att listan gör det, och en svepande borttagning är precis vad
    // den här kontrollen finns för att stoppa.
    const lista = await open("?view=all&layout=list&done=1", { viewport: { width: 390, height: 700 }, hasTouch: true });
    await lista.waitForSelector(".list-row");
    const l = await lista.evaluate(() => {
      const w = document.querySelector(".work"), c = getComputedStyle(w);
      return { ta: c.touchAction, obX: c.overscrollBehaviorX,
               axlar: [w.scrollWidth > w.clientWidth + 1 ? "x" : null,
                       w.scrollHeight > w.clientHeight + 1 ? "y" : null].filter(Boolean) };
    });
    eq(l.axlar, ["x", "y"], "listans `.work` är tvåaxlig — det är därför den behöver motmedel");
    eq(l.ta, "pan-y pinch-zoom", "och har dem: axellåset");
    eq(l.obX, "none", "och sidledsstudsen avstängd");
  }

  group("tabbstoppet följer porten över ett layoutbyte");
  {
    const p = await open("?view=all&layout=list", { data: tall, viewport: { width: 900, height: 500 } });
    const marks = () => p.evaluate(() => [...document.querySelectorAll("#work, #port")]
      .map((e) => e.id + ":" + (e.getAttribute("tabindex") ?? "-") + ":" + (e.getAttribute("aria-label") ?? "-")));
    eq(await marks(), ["work:0:Board", "port:-:-"], "i listan är .work stoppet");
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByText("Board", { exact: true }).click();
    await p.waitForTimeout(300);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(200);
    eq(await marks(), ["work:-:-", "port:0:Board"],
      "efter bytet till kanban har stoppet och namnet flyttat till porten — utan omladdning");
  }
}
