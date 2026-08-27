// The phone sheet, measured against the *page* rather than against itself. Every number
// here comes from a token, never a literal: `margin: 0 -10px` is a value whose result you
// have to derive from two others, while `calc(var(--sheet-gap) - var(--pad))` is the claim.
//
// There is no separate pixel-reading file, and that is a decision rather than an omission.
// `polering-av-egenskapsskenan` describes a `paint.mjs` that screenshots and reads colours,
// written after a green test measured a row that *lay* at 8 and was *painted* at 22 —
// `getBoundingClientRect()` cannot see an ancestor clipping. That lesson is kept, but as
// the `clipLeft`/`clipRight` reads below: the scroller's padding box *is* its clip edge,
// so asking for it answers the same question a screenshot would.
//
// One was written anyway, to check. It could not reach anything worth measuring: the only
// row highlight a sheet paints without a write token turned out to be `:hover`, which
// Playwright leaves behind after a click and which no phone has. It passed by measuring an
// artefact — the exact failure the lesson is about — so it was deleted rather than kept
// for the sake of the prose that named it. If a sheet ever paints a real selected state,
// a pixel read is the right way to prove it and this comment is where to start.
import { group, eq, ok, near } from "./assert.mjs";

const PHONE = { width: 390, height: 780 };

async function openSheet(page, name) {
  await page.getByRole("button", { name }).first().click();
  await page.waitForSelector(".sheet .surface-body", { timeout: 5000 });
  await page.waitForTimeout(200);
}

export async function run({ open }) {
  // Three variants deliberately, not two: Filter and Display are built from `.fp-*`
  // rows, and a first draft that measured only those never touched `.sheet .row` at
  // all — the rule those two sabotages were written for. The puck's ⋯ is the sheet
  // that uses it, and it needs no token.
  const VARIANTS = [
    { name: "Filter", open: (p) => openSheet(p, /^Filter/) },
    { name: "Display", open: (p) => openSheet(p, /^Display/) },
    {
      name: "puck ⋯",
      open: async (p) => {
        await p.locator(".card, .list-row").first().click();
        await p.waitForTimeout(300);
        await openSheet(p, /^More actions/);
      },
    },
  ];

  group("arkets innehåll står på sidans linje");
  for (const variant of VARIANTS) {
    const which = variant.name;
    const p = await open("", { viewport: PHONE });
    await variant.open(p);
    const m = await p.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const num = (v) => parseFloat(css.getPropertyValue(v));
      const sheet = document.querySelector(".sheet");
      const body = document.querySelector(".sheet .surface-body");
      const b = body.getBoundingClientRect();
      const bs = getComputedStyle(body);
      const rows = [...document.querySelectorAll(".sheet .row, .sheet .fp-val, .sheet .fp-row")]
        .filter((e) => e.getBoundingClientRect().height > 0);
      const sr = sheet.getBoundingClientRect();
      return {
        pad: num("--pad"),
        gap: num("--sheet-gap"),
        sheetLeft: sr.left,
        sheetRight: sr.right,
        // The scroller's *content* edge is also its clip edge: a row drawn outside it is
        // painted away no matter what its layout box says.
        clipLeft: b.left + parseFloat(bs.paddingLeft),
        clipRight: b.right - parseFloat(bs.paddingRight),
        rows: rows.map((e) => {
          const r = e.getBoundingClientRect();
          // The row's first child, not its first <span>: a row that leads with an icon
          // puts the icon on the content line and indents the label past it, so reading
          // the label would call a correct row wrong by exactly one icon.
          const first = e.firstElementChild || e;
          return { left: r.left, right: r.right, textLeft: first.getBoundingClientRect().left };
        }),
      };
    });
    eq(m.sheetLeft, 0, `${which}: arket spänner fönstret`);
    ok(m.rows.length > 0, `${which}: det finns rader att mäta`);
    // The sheet's own edge is --sheet-gap; the content column adds the rest up to --pad.
    near(m.clipLeft, m.pad, 1, `${which}: klippkanten ligger på --pad (${m.pad}px)`);
    for (const [i, r] of m.rows.entries()) {
      near(r.textLeft, m.pad, 2, `${which}: rad ${i} har sin TEXT på sidans linje`);
      // The bleed is stated as an equality against the *sheet*, not as a tolerance
      // against the clip box. A first draft allowed ±(pad - gap) either way, which is
      // wider than the bug it was written for: `width: 100%` shifts the row 14px left
      // instead of widening it by 14px on each side, and both ends still sat inside
      // that slack. Measuring both edges against `--sheet-gap` catches a shift, because
      // a shift moves them the same way while a bleed moves them apart.
      near(r.left, m.sheetLeft + m.gap, 1.5, `${which}: rad ${i} lämnar --sheet-gap åt vänster`);
      near(r.right, m.sheetRight - m.gap, 1.5, `${which}: rad ${i} lämnar --sheet-gap åt höger`);
    }
  }

  group("sista kontrollen når inte skärmkanten");
  {
    const p = await open("", { viewport: PHONE });
    await openSheet(p, /^Display/);
    const bottom = await p.evaluate(() => {
      const body = document.querySelector(".sheet .surface-body");
      const kids = [...body.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().height > 0);
      const last = kids[kids.length - 1];
      return { gap: window.innerHeight - last.getBoundingClientRect().bottom };
    });
    ok(bottom.gap >= 20, `botten lämnar plats för tummen (fick ${Math.round(bottom.gap)}px)`);
  }

  group("allt i ett ark är tumstort");
  // Across every variant, for the same reason the bleed is: the sheet that uses
  // `.sheet .row` is the puck's ⋯, and a check that only opened Display would never
  // see that rule at all.
  for (const variant of VARIANTS) {
    const p = await open("", { viewport: PHONE });
    await variant.open(p);
    const small = await p.evaluate(() =>
      [...document.querySelectorAll(".sheet button, .sheet label, .sheet a.row")]
        .map((e) => ({ t: e.textContent.trim().slice(0, 24), h: Math.round(e.getBoundingClientRect().height) }))
        .filter((x) => x.h > 0 && x.h < 30));
    eq(small, [], `${variant.name}: ingen kontroll under 30px hög`);
  }
}
