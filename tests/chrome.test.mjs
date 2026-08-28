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

  group("räknaren har en storlek");
  {
    // "How many cards are behind this label" is one sentence, and it was drawn in four
    // sizes: 11px beside the view title and on the sidebar's view rows, 12px on the
    // column heads, 13px inherited in the HIDDEN tray. The proof that no rule explained
    // it: a sidebar row and a column head are *both* --fs-md, and their counts still
    // disagreed — same label size, same mark, two answers. The biggest heading on the
    // board carried the smallest number.
    // Asked one selector at a time, not as one comma-joined sweep. Three of the five
    // share the class `count`, so a single pass cannot tell them apart — and a selector
    // that silently stopped matching would let the whole thing pass on what was left.
    const MARKS = [".view-count", ".col-head .count", ".list-head .count", ".hidden-col .count", ".focus-n"];
    const sizes = (p, sel) => p.evaluate((s) =>
      [...document.querySelectorAll(s)]
        .filter((e) => e.getBoundingClientRect().height > 0)
        .map((e) => getComputedStyle(e).fontSize), sel);

    // `.list-head` only exists in the list layout; everything else is on the board.
    const board = await open();
    const list = await open("?layout=list");
    const found = {};
    for (const sel of MARKS) {
      const hits = (await sizes(board, sel)).concat(await sizes(list, sel));
      found[sel] = hits;
      ok(hits.length > 0, `${sel} ritas någonstans att mäta (${hits.length} st)`);
    }
    const seen = [...new Set([].concat(...Object.values(found)))].sort();
    eq(seen, ["12px"], `och alla fem märkena är 12px — storlekar sedda: ${JSON.stringify(seen)}`);
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
    eq(m.n, "12px", "och räknaren står kvar på 12px, som på brädan");
  }
}
