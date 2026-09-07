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
      x: Math.round(document.getElementById("board").scrollLeft),
    }));
    eq(före.ta, "auto", `rutan är inte låst i tavellayouten: ${JSON.stringify(före)}`);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y: 400 }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 300 - Math.round(200 * i / 12), y: 400 - Math.round(30 * i / 12) }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(400);
    const efter = await p.evaluate(() => Math.round(document.getElementById("board").scrollLeft));
    ok(efter > 100, `och kolumnerna går fortfarande att dra i sidled: ${före.x} → ${efter}`);
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
    }
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
}
