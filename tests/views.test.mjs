// The chip row's *actions*, and the one question behind all three doors to saving a
// view. The rule the row already stated for saved views — "in a view, untouched →
// nothing. Offering Save view here invites you to save what is already saved" — was
// never extended to the built-in views, so standing in Ready having changed nothing
// still offered to save it.
import { group, eq, ok } from "./assert.mjs";

const acts = (p) => p.evaluate(() => {
  const row = document.getElementById("chipRow");
  return {
    hidden: row.hidden,
    acts: [...row.querySelectorAll(".fchip-acts button")].map((e) => e.textContent.trim()),
  };
});

// The title switcher's entry. It is deliberately ungated — it and ⌘K always offer the
// door and lean on `saveCurrentView`'s refusal — so this is how the write path's own
// answer gets read.
async function saveFromTitle(p) {
  await p.evaluate(() => {
    const b = [...document.querySelectorAll("#viewTitleBtn, #topTitleBtn")]
      .find((e) => e.getBoundingClientRect().height > 0);
    b.click();
  });
  await p.waitForTimeout(250);
  await p.getByRole("button", { name: /Save this view/ }).click();
  await p.waitForTimeout(250);
  return p.evaluate(() => {
    const t = document.querySelector(".toast.show");
    const field = document.querySelector(".inputpop input[placeholder='Name this view']");
    return { toast: t && t.textContent.trim(), named: !!field };
  });
}

export async function run({ open }) {
  group("en orörd inbyggd vy erbjuder inget att spara");
  {
    // Reported from a phone, with a red arrow at the button: standing in "Ready to
    // take" — nothing filtered, nothing regrouped — the chip row offered Save view.
    // Saving it would have committed a board.config.json entry identical to the row
    // already in the sidebar: the same list under two names, which is the exact drift
    // `viewsShown` was written to avoid ("All pucks 31 / Standalone 31").
    const cases = [
      ["", { hidden: true, acts: [] }, "standardbrädan"],
      ["?view=ready", { hidden: true, acts: [] }, "Ready, orörd"],
      ["?view=etapps", { hidden: true, acts: [] }, "Etapps, orörd"],
      // A refinement on top of a built-in view *is* yours, and every kind counts —
      // a view can be nothing but a grouping or a sort.
      ["?view=ready&group=repo", { hidden: false, acts: ["Save view"] }, "Ready + gruppering"],
      ["?view=ready&sort=title", { hidden: false, acts: ["Save view"] }, "Ready + sortering"],
      ["?view=ready&q=priority%3Ahigh", { hidden: false, acts: ["Save view"] }, "Ready + filter"],
      ["?q=priority%3Ahigh", { hidden: false, acts: ["Save view"] }, "filter utan vy"],
    ];
    for (const [url, want, label] of cases) {
      const p = await open(url, { token: true });
      eq(await acts(p), want, `${label} → ${JSON.stringify(want.acts)}`);
    }
  }

  group("knappen och skrivvägen ställer samma fråga");
  {
    // The button is gated; the title switcher and ⌘K are not — they always show the
    // door and lean on the refusal. If the two ever disagreed, the ungated doors would
    // be the ones that actually commit, so the gate would be decoration.
    const plain = await open("?view=ready", { token: true });
    const refused = await saveFromTitle(plain);
    eq(refused.named, false, "orörd Ready: skrivvägen öppnar inget namnfält");
    ok(refused.toast && /already a view/.test(refused.toast),
      `utan att den säger varför: ${JSON.stringify(refused.toast)}`);
    // Named, so the refusal cannot pass by saying the wrong thing — "this is the
    // default board" would be false here and is the message this case used to miss.
    ok(refused.toast && /Ready/.test(refused.toast),
      `och den säger vilken vy: ${JSON.stringify(refused.toast)}`);

    const changed = await open("?view=ready&group=repo", { token: true });
    const allowed = await saveFromTitle(changed);
    eq(allowed.named, true, "Ready + gruppering: samma dörr öppnar namnfältet");
    eq(allowed.toast, null, "och klagar inte");

    const plainBoard = await open("", { token: true });
    const empty = await saveFromTitle(plainBoard);
    eq(empty.named, false, "standardbrädan avvisas fortfarande");
    ok(empty.toast && /default board/.test(empty.toast),
      `med sitt eget besked: ${JSON.stringify(empty.toast)}`);
  }

  group("token-grindad krom finns redan vid första målningen");
  {
    // Found while writing the group above, and it is why that one can assert on a
    // freshly opened URL at all. `TOKEN_KEY` was declared beside `ghToken()`, some
    // thirty lines *below* the top-level `renderBoard()` that paints the first board.
    // `var` hoists the declaration and not the assignment, so at first paint the board
    // asked localStorage for the key `undefined` and answered "" for a browser that
    // had a token — every token-gated affordance missing until something re-rendered.
    // Open a shared link with a filter in it and Save view was not there; click any
    // sidebar row and it appeared.
    const p = await open("?q=priority%3Ahigh", { token: true });
    const atBoot = await acts(p);
    eq(atBoot.acts, ["Save view"], "en delad länk har sin knapp direkt, utan att röras");

    // The same board without a token: the gate is the token, not the URL.
    const anon = await open("?q=priority%3Ahigh");
    const anonActs = await acts(anon);
    eq(anonActs.acts, [], "och utan token erbjuds ingenting");
    eq(anonActs.hidden, false, "fast raden syns ändå, för chippet står kvar");
  }

  group("en flagga som inte gör något räknas inte som en ändring");
  {
    // Found in review, on the fix above. `goToView` keeps the archive toggle across a
    // navigation on purpose — it is a display preference, not a filter — so turning on
    // "Show done & cancelled" in All pucks and clicking Ready carried `done=1` along.
    // Ready is not ARCHIVABLE: the flag cannot change a single card there, and the
    // Display menu does not even offer the row. But `viewParamObject` emitted it
    // anyway, `ownParams` subtracts only `view`, and so the untouched view offered
    // Save view again — by a different door than the one just closed.
    const p = await open("?done=1", { token: true });
    eq((await acts(p)).acts, ["Save view"], "på All pucks är arkivväxeln en riktig ändring");

    await p.getByRole("button", { name: /^Ready/ }).first().click();
    await p.waitForTimeout(250);
    eq(await acts(p), { hidden: true, acts: [] }, "men i Ready är den verkningslös och raden tiger");
    eq(new URL(p.url()).search, "?view=ready",
      `och den skrivs inte till URL:en där den inte gör något (${new URL(p.url()).search})`);

    // Dropping it from the URL must not drop the setting, or the fix trades a false
    // "changed" for a real lost preference. `state.showDone` is what carries it through
    // a navigation, so stepping back has to bring the archive with you.
    // (localStorage is *not* what does it here: `roadmap-done` is written when you flip
    // the switch, not when a link sets it — which is why this asserts the round trip
    // rather than the stored key.)
    await p.getByRole("button", { name: /^All pucks/ }).first().click();
    await p.waitForTimeout(250);
    eq(new URL(p.url()).search, "?done=1", "och den kommer tillbaka i en vy som kan använda den");
    eq((await acts(p)).acts, ["Save view"], "med sin knapp igen");
  }
}
