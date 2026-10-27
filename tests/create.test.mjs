// Creating a puck from a reference picker. The assertions are on what gets
// *committed*, not on what the board renders afterwards — an optimistic UI shows the
// right thing for a moment regardless of whether the file it wrote makes sense.
//
// Membership is authored on the child, which is why the same feature costs a
// different number of commits depending on which end you start from. That difference
// is the thing worth pinning.
import { githubStub } from "./fixture.mjs";
import { readFile } from "node:fs/promises";
import { group, eq, ok, near } from "./assert.mjs";

const trigger = (page, text) => page.locator(".prop-trigger", { hasText: text });

async function typeIn(page, text) {
  await page.locator(".pick-find input").fill(text);
  await page.waitForTimeout(250);
}
const rows = (page) => page.evaluate(() =>
  [...document.querySelectorAll(".pick-list .row")].map((r) => r.textContent.replace(/\s+/g, " ").trim()));

export async function run({ open }) {
  group("ur etappen: en fil, en commit");
  {
    // The child is the thing being made, so the relation fits in the template.
    const gh = githubStub();
    const p = await open("#alpha/a-parent", { token: true, github: gh.handler });
    await trigger(p, "Add puck").click();
    await p.waitForTimeout(250);
    await typeIn(p, "Login flow");
    eq(await rows(p), ['New puck “Login flow”in Alpha'], "raden namnger repot den skulle skriva i");

    await p.locator(".pick-create").click();
    await p.waitForTimeout(600);
    eq(gh.writes.length, 1, "en commit, inte två");
    const w = gh.writes[0];
    eq(w.path, "acme/alpha:roadmap/login-flow.md", "slugen blir filnamnet");
    ok(w.content.includes("parent: a-parent"), `relationen står i filen den föds med:\n${w.content}`);
    ok(w.content.includes("status: later"),
      "later, inte inbox — att lägga en puck i en etapp *är* att sortera den");
    eq(await p.evaluate(() => (location.hash || "").slice(1)), "alpha/a-parent",
      "och man står kvar där man var");
  }

  group("ur pucken: två commits, i ordning");
  {
    // Here the new puck is the *parent*, so the relation is authored on the puck we
    // are standing in — a second file, and therefore a second write.
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler });
    await trigger(p, "Set parent").click();
    await p.waitForTimeout(250);
    await typeIn(p, "Auth");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(900);

    eq(gh.writes.length, 2, "två commits");
    eq(gh.writes[0].path, "acme/alpha:roadmap/auth.md", "etappen skapas först");
    eq(gh.writes[1].path, "acme/alpha:roadmap/a-now.md", "och länken skrivs på pucken vi stod i");
    ok(gh.writes[1].content.includes("parent: auth"), `länken pekar på den nya föräldern:\n${gh.writes[1].content}`);
    ok(!gh.writes[0].content.includes("parent:"),
      "den nya föräldern får ingen förälder — den *är* föräldern");
    eq(await p.evaluate(() => (location.hash || "").slice(1)), "alpha/a-now", "man står kvar");
  }

  group("en titel som redan finns erbjuds inte som ny");
  {
    // A row that would make a second "A parent" beside the "A parent" listed above it
    // is an invitation to a duplicate, not a shortcut.
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler });
    await trigger(p, "Set parent").click();
    await p.waitForTimeout(250);
    await typeIn(p, "A parent");
    eq(await rows(p), ["A parent"], "bara den befintliga");
    eq(await p.locator(".pick-create").count(), 0, "ingen skaparad");

    // And the guard is about an exact title, not about having found something.
    await typeIn(p, "An eta");
    eq(await p.locator(".pick-create").count(), 1, "en delträff hindrar den inte");
  }

  group("utan token finns ingen skaparad");
  {
    // Every write path re-asks for the token, so nothing breaks without one — but a
    // control that only fails when you press it is decoration, not a gate.
    const p = await open("#alpha/a-now");
    eq(await trigger(p, "Set parent").count(), 0, "skenan är inte ens redigerbar");
  }

  group("dubbletten mäts där filen ska ligga");
  {
    // A puck titled the same in *another* repo neither collides nor confuses — it is a
    // different project's, and the picker's pool is full of them. The old guard asked
    // the whole cross-repo pool and hid the row for exactly that case.
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler });
    await trigger(p, "Set parent").click();
    await p.waitForTimeout(250);
    await typeIn(p, "b-later");
    ok((await rows(p)).some((r) => r.startsWith("b-later")), "den finns i listan, från beta");
    eq(await p.locator(".pick-create").count(), 1, "men den hindrar inte ett alpha med samma namn");
  }

  group("ett skrivskyddat mål erbjuder inget skapande");
  {
    // `canAddMember` opens the picker deliberately when a *foreign* child can be added
    // to an etapp in a repo one cannot write. Creating always writes to the etapp's own
    // repo, so the row would promise a commit that is rejected on arrival.
    const gh = githubStub({ readOnly: ["acme/alpha"] });
    const p = await open("#alpha/a-parent", { token: true, github: gh.handler });
    await p.waitForTimeout(700); // the permissions probe is a fetch; before it lands, unknown means writable
    eq(await trigger(p, "Add puck").count(), 1, "väljaren står kvar — ett barn i beta går att lägga till");
    await trigger(p, "Add puck").click();
    await p.waitForTimeout(250);
    await typeIn(p, "Something new");
    eq(await p.locator(".pick-create").count(), 0, "men ingen skaparad mot ett repo som säger nej");
    eq(gh.writes.length, 0, "och ingenting skrevs");
  }

  group("en tom etapp kan få sin första medlem");
  {
    // The old condition needed an existing candidate, so an etapp with none had no
    // picker — and therefore no way to make the very first one.
    const only = (d) => { d.items = d.items.filter((i) => i.slug === "a-parent"); d.items[0].children = []; d.total = 1; return d; };
    const gh = githubStub();
    const p = await open("#alpha/a-parent", { token: true, github: gh.handler, data: only });
    eq(await trigger(p, "Add puck").count(), 1, "väljaren finns fast ingen kandidat gör det");
    await trigger(p, "Add puck").click();
    await p.waitForTimeout(250);
    await typeIn(p, "First member");
    eq(await p.locator(".pick-create").count(), 1, "och den erbjuder att skapa");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(600);
    eq(gh.writes.length, 1, "en commit");
    ok(gh.writes[0].content.includes("parent: a-parent"), "med relationen i filen");
  }

  group("etappen man står kvar på ritas om");
  {
    // The tests above assert what gets *committed*, and that is exactly why they missed
    // this: with `open: false` the etapp is the page still on screen, and redrawing only
    // the board left its Contains list and its rollup describing the state from before
    // the click. The card behind it updated; the page in front of it did not.
    const gh = githubStub();
    const p = await open("#alpha/a-parent", { token: true, github: gh.handler });
    const page = () => p.evaluate(() => ({
      contains: [...document.querySelectorAll(".members .row, .members a, .member-row")]
        .map((e) => e.textContent.replace(/\s+/g, " ").trim()),
      rollup: [...document.querySelectorAll(".rollup")].map((e) => e.textContent.trim()),
    }));
    const before = await page();
    eq(before.contains.length, 1, "en medlem till att börja med");

    await trigger(p, "Add puck").click();
    await p.waitForTimeout(250);
    await typeIn(p, "Fresh member");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(700);

    const after = await page();
    eq(after.contains.length, 2, `Contains växte: ${JSON.stringify(after.contains)}`);
    ok(after.contains.some((c) => c.startsWith("Fresh member")), "och den nya står i den");
    ok(after.rollup.every((r) => r === "0/2"), `bägge brickorna räknar om: ${JSON.stringify(after.rollup)}`);
  }

  group("och ritas om igen när skrivningen faller");
  {
    // The rollback is as visible as the addition was, and only a rejected write shows it.
    const gh = githubStub({ failWrites: true });
    const p = await open("#alpha/a-parent", { token: true, github: gh.handler });
    // A failed write must not also be a thrown one. `＋ Add puck` fires and forgets, so
    // a rejecting promise would land in the console as an uncaught error on top of the
    // toast — this group ran green through exactly that, because it never looked.
    const loud = [];
    p.on("pageerror", (e) => loud.push(String(e)));
    await trigger(p, "Add puck").click();
    await p.waitForTimeout(250);
    await typeIn(p, "Doomed member");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(900);

    const after = await p.evaluate(() => ({
      contains: [...document.querySelectorAll(".members .row, .members a, .member-row")]
        .map((e) => e.textContent.replace(/\s+/g, " ").trim()),
      rollup: [...document.querySelectorAll(".rollup")].map((e) => e.textContent.trim()),
      still: (location.hash || "").slice(1),
    }));
    eq(after.contains.length, 1, `Contains är tillbaka: ${JSON.stringify(after.contains)}`);
    ok(after.rollup.every((r) => r === "0/1"), `och siffran med: ${JSON.stringify(after.rollup)}`);
    eq(after.still, "alpha/a-parent", "och etappen är fortfarande öppen — inte stängd av felvägen");
    eq(loud, [], "och ingenting kastades obehandlat");
  }

  group("en anpassad källa går att skriva i men inte att skapa i");
  {
    // A `checklist`/`prose` repo can be perfectly writable, and its items can be picked
    // as children. But the harvester runs *that repo's* adapter, which reads one file
    // and one section and has never heard of `roadmap/<slug>.md` — so a puck created
    // there would commit, sit on the board, and be gone at the next sync. The closed-set
    // rule again, one layer down: a write that looks like it worked and vanishes.
    const adapted = (d) => {
      d.sources = d.sources.map((s) => (s.repo === "acme/alpha" ? { ...s, adapter: "checklist" } : s));
      d.items = d.items.map((i) => (i.repo === "acme/alpha" ? { ...i, native: false } : i));
      return d;
    };
    const gh = githubStub();
    const p = await open("#alpha/a-parent", { token: true, github: gh.handler, data: adapted });
    eq(await trigger(p, "Add puck").count(), 1, "väljaren står kvar — ett barn i beta går att lägga till");
    await trigger(p, "Add puck").click();
    await p.waitForTimeout(250);
    await typeIn(p, "Would vanish");
    eq(await p.locator(".pick-create").count(), 0, "men ingen skaparad mot en anpassad källa");
    eq(gh.writes.length, 0, "och ingenting skrevs");
  }

  group("en blockerare skapas och länkas");
  {
    // The ordinary Blocked by case: the new puck is the blocker, so the reference is
    // authored on the puck we are standing in — two writes, like the etapp.
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler });
    await trigger(p, /^Add$/).click();
    await p.waitForTimeout(250);
    await typeIn(p, "Needs a decision");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(900);
    eq(gh.writes.length, 2, "två commits");
    eq(gh.writes[0].path, "acme/alpha:roadmap/needs-a-decision.md", "blockeraren skapas först");
    ok(gh.writes[1].content.includes("depends: [needs-a-decision]"),
      `och refereras från pucken vi stod i:\n${gh.writes[1].content}`);
  }

  group("en hängande referens repareras, inte dubbleras");
  {
    // `depends-missing` flags a reference to something not on the board, and creating
    // that thing is exactly the repair it asks for — the reference was right, the file
    // was missing. Appending it again would commit `depends: [foo, foo]` and draw the
    // same relationship twice.
    const dangling = (d) => {
      const a = d.items.find((i) => i.slug === "a-now");
      a.depends = ["foo"]; a.missingDepends = ["foo"]; a.blockedBy = ["foo"];
      a.signals = [{ type: "depends-missing" }]; // the flag the repair is answering
      return d;
    };
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler, data: dangling });
    const said = () => p.evaluate(() =>
      document.body.innerText.split("\n").filter((l) => l.includes("which doesn")).map((l) => l.trim()));
    // Without this the check below passes on a board that never complained in the first
    // place — which is exactly what it did until a sabotage failed one assertion short.
    eq((await said()).length, 1, "klagan står där innan reparationen");
    await trigger(p, /^Add$/).click();
    await p.waitForTimeout(250);
    await typeIn(p, "Foo");
    eq(await p.locator(".pick-create").count(), 1, "raden erbjuds — pucken finns ju inte");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(900);

    eq(gh.writes.length, 1, "bara filen skapas — referensen fanns redan");
    eq(gh.writes[0].path, "acme/alpha:roadmap/foo.md", "och det är den som saknades");
    eq(await p.locator(".dep-chip").count(), 1, "en relation, ett chip");

    // The derived edges, read off the board's own model (`DATA` *is* `window.__ROADMAP__`,
    // line 5). They have no picture on this page — the chip renders from the authored
    // `depends:`, not from these — so the model is where the assertion has to go, and
    // the rule it guards is the codebase's own: an optimistic edit must never leave the
    // two directions disagreeing. Without the recompute the reference stays dangling in
    // `blockedBy` and the new puck blocks nobody, until the next harvest says otherwise.
    const edges = await p.evaluate(() => {
      const by = (s) => window.__ROADMAP__.items.find((i) => i.slug === s);
      return { blockedBy: by("a-now").blockedBy, blocks: by("foo") && by("foo").blocks };
    });
    eq(edges.blockedBy, ["alpha/foo"], "referensen pekar på en puck som finns nu");
    eq(edges.blocks, ["alpha/a-now"], "och den nya pucken vet att den blockerar");

    // The signal is derived from `missingDepends`, and the note is built by joining that
    // list — out of step, the puck says "Depends on , which doesn't exist", missing the
    // very name it complains about. Asserted on the rendered sentence rather than on the
    // signal array, because the empty join is what the reader would actually meet.
    const complaint = await said();
    eq(complaint, [], `ingen kvarglömd klagan: ${JSON.stringify(complaint)}`);
  }

  group("och samma klagan försvinner när referensen tas bort");
  {
    // The other door to the same room, and it predates this work: removing a broken
    // reference empties `missingDepends` the same way. Both go through `recomputeDeps`,
    // which is why the fix lives there and not in either caller.
    const dangling = (d) => {
      const a = d.items.find((i) => i.slug === "a-now");
      a.depends = ["foo"]; a.missingDepends = ["foo"]; a.blockedBy = ["foo"];
      a.signals = [{ type: "depends-missing" }];
      return d;
    };
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler, data: dangling });
    const said = () => p.evaluate(() =>
      document.body.innerText.split("\n").filter((l) => l.includes("which doesn")).map((l) => l.trim()));
    eq((await said()).length, 1, "klagan står där till att börja med");
    await p.locator(".dep-x").first().click();
    await p.waitForTimeout(900);
    eq(await said(), [], "och är borta när det den gällde är borta");
  }

  group("en saknad etapp som skapas slutar vara saknad");
  {
    // Symmetric to the dangling dependency: `parent: foo` naming nothing is what
    // `parent-missing` flags, and creating that etapp is the repair it asks for. The
    // note names the raw reference, so left alone it insists a puck that is now on the
    // board does not exist.
    const dangling = (d) => {
      const a = d.items.find((i) => i.slug === "a-now");
      a.parent = "foo"; a.parentRef = null;
      a.signals = [{ type: "parent-missing" }];
      return d;
    };
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler, data: dangling });
    const said = () => p.evaluate(() =>
      document.body.innerText.split("\n").filter((l) => l.includes("doesn’t exist")).map((l) => l.trim()));
    eq((await said()).length, 1, "klagan står där först");

    await trigger(p, /^⋯$|^Set parent$/).click();
    await p.waitForTimeout(250);
    await typeIn(p, "Foo");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(900);
    eq(await said(), [], "och är borta när etappen finns");
  }

  group("en nekad skrivning ritar om pucken man står i");
  {
    // The permissions probe can say yes and the write still come back 403 — that is the
    // case `readOnlyRepos` exists to learn. Creating from the Etapp picker has no parent
    // to refresh, so the rollback passed `null` and left the rail offering the very
    // controls that had just proved they do not work.
    const gh = githubStub({ failWrites: true });
    const p = await open("#alpha/a-now", { token: true, github: gh.handler });
    eq(await trigger(p, /^Set parent$/).count(), 1, "skenan är redigerbar till att börja med");
    await trigger(p, /^Set parent$/).click();
    await p.waitForTimeout(250);
    await typeIn(p, "Doomed");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(1200);
    eq(await trigger(p, /^Set parent$/).count(), 0,
      "och kontrollerna är borta när repot visat sig skrivskyddat");
  }

  group("och kommer tillbaka när länkningen faller");
  {
    // The other half of clearing it: `relink` never raises `parent-missing`, so a
    // rollback that restores the unresolved `parent:` would leave the puck quietly
    // un-flagged — out of Needs attention, with nothing explaining its broken link
    // until the next harvest. The rollback restores the flag it saved rather than
    // deciding which one to raise; a rollback knows, a recompute would have to guess
    // between a typo and a loop.
    const dangling = (d) => {
      const a = d.items.find((i) => i.slug === "a-now");
      a.parent = "foo"; a.parentRef = null;
      a.signals = [{ type: "parent-missing" }];
      return d;
    };
    const gh = githubStub({ failWrites: true });
    const p = await open("#alpha/a-now", { token: true, github: gh.handler, data: dangling });
    const flagged = () => p.evaluate(() =>
      window.__ROADMAP__.items.find((i) => i.slug === "a-now").signals.map((g) => g.type));
    eq(await flagged(), ["parent-missing"], "flaggan står där först");

    // Pick the existing etapp rather than creating one: the create would fail on its own
    // first write, and the flag we are chasing is restored by the *link's* rollback.
    await trigger(p, /^⋯$|^Set parent$/).click();
    await p.waitForTimeout(250);
    await typeIn(p, "A parent");
    await p.locator(".pick-mi").first().click();
    await p.waitForTimeout(1000);
    eq(await flagged(), ["parent-missing"], "och står kvar när skrivningen nekats");
  }

  group("demoläget låser upp brädan och skriver ingenting");
  {
    // The public demo is logged out, so every write affordance is gated off and a
    // visitor sees the read half of a product whose claim is read *and* write. Demo
    // mode opens the interface and answers GitHub inside the page.
    //
    // The strongest assertion available is a negative one: the stub is installed and
    // never sees a request. `page.route` intercepts the *network*; the seam replaces
    // `window.fetch`, so a captured write would mean the seam had been bypassed.
    const demo = (d) => { d.config = Object.assign({}, d.config, { demo: true }); return d; };
    const affordances = (p) => p.evaluate(() => ({
      kolumnPlus: document.querySelectorAll(".col-add").length,
      band: ((document.querySelector(".demo-ribbon") || {}).textContent || "").trim(),
      redigerbara: document.querySelectorAll(".prop button").length,
    }));

    // Without the flag and without a token, nothing is offered. This is the state the
    // live demo was in, and the half of the pair that makes the other half mean
    // something.
    const plain = await open("");
    eq((await affordances(plain)).kolumnPlus, 0, "utloggad utan flaggan: inget att skriva med");

    const gh = githubStub();
    const p = await open("", { data: demo, github: gh.handler });
    const a = await affordances(p);
    ok(a.kolumnPlus > 0, `demoläget låser upp kolumnernas + (${a.kolumnPlus})`);
    ok(/nothing is committed/.test(a.band), `bandet säger vad som gäller: ${JSON.stringify(a.band)}`);
    // The rail only exists inside an open puck, so it has to be asked there — measuring
    // the board found nothing and said the rail was locked, which was my mistake, not
    // the feature's.
    await p.locator(".card").first().click();
    await p.waitForTimeout(400);
    const rail = await p.evaluate(() =>
      [...document.querySelectorAll(".prop")].filter((r) => r.querySelector("button"))
        .map((r) => (r.querySelector(".prop-k") || {}).textContent));
    ok(rail.length > 4, `och egenskapsskenan: ${JSON.stringify(rail)}`);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);

    // Create one, for real, through the ordinary path.
    await p.locator(".col-add").first().click();
    await p.waitForTimeout(300);
    await p.locator('input[placeholder="Title"]').fill("Skapad i demoläget");
    await p.getByRole("button", { name: /^Create$/ }).click();
    await p.waitForTimeout(600);
    const after = await p.evaluate(() => ({
      finns: [...document.querySelectorAll(".card")].some((c) => /Skapad i demoläget/.test(c.textContent)),
      toast: ((document.querySelector(".toast") || {}).textContent || "").trim(),
    }));
    eq(after.finns, true, "kortet står på brädan");
    ok(/in this browser only/.test(after.toast), `och toasten lovar inget mer: ${JSON.stringify(after.toast)}`);
    // The point of the whole thing.
    eq(gh.writes, [], `ingenting nådde GitHub — stubben såg ${gh.writes.length} skrivningar`);
  }

  group("demostubben svarar per ändpunkt, och säger nej till resten");
  {
    // The first stub matched "a repo URL without /contents/" and answered it with the
    // permissions probe. That is every *other* endpoint the board calls: Activity reads
    // /commits, Discussion reads /issues/:n and its comments, and Link issue POSTs to
    // /issues. All three got {permissions:{push:true}} with a 200 on it, so Activity
    // said "no history", Discussion drew "undefined #undefined", and creating an issue
    // resolved to nothing and left the puck silently unlinked.
    //
    // A catch-all that returns a *success* shape is the shape of the bug: the next
    // endpoint the board learns to call would fail the same silent way. So the default
    // is now a 404, and that is what the last assertion here holds.
    const demoIssue = (d) => {
      d.config = Object.assign({}, d.config, { demo: true });
      d.items = d.items.map((it) => (it.slug === "a-now" ? Object.assign({}, it, { issue: 42, issueState: "open" }) : it));
      return d;
    };
    const gh = githubStub();
    // Named rather than "the first card": which puck lands first depends on the
    // fixture's titles sorting against each other, so renaming an unrelated one used
    // to open a different puck here and the failure read as a missing Discussion tab.
    const p = await open("#alpha/a-now", { data: demoIssue, github: gh.handler });
    await p.waitForSelector(".tab-btn");

    const tabs = await p.$$eval(".tab-btn", (n) => n.map((b) => b.textContent.trim()));
    eq(tabs, ["Overview", "Activity", "Discussion"], `pucken har alla tre flikarna: ${JSON.stringify(tabs)}`);

    await p.locator('.tab-btn:has-text("Activity")').click();
    await p.waitForTimeout(700);
    const akt = await p.evaluate(() => ({
      rader: document.querySelectorAll(".activity-item").length,
      tomt: !!document.querySelector(".activity-empty"),
      text: ((document.querySelector(".tab-panel:not([hidden])") || {}).textContent || "").trim().slice(0, 80),
    }));
    ok(akt.rader > 0, `Activity visar historik i stället för tomhet: ${JSON.stringify(akt)}`);
    eq(akt.tomt, false, "och påstår inte att pucken saknar historik");

    await p.locator('.tab-btn:has-text("Discussion")').click();
    await p.waitForTimeout(700);
    const disk = await p.evaluate(() => ({
      titel: ((document.querySelector(".disc-title") || {}).textContent || "").trim(),
      state: ((document.querySelector(".disc-state") || {}).textContent || "").trim(),
    }));
    eq(disk.titel, "a-now #42", `Discussion har puckens titel och nummer: ${JSON.stringify(disk.titel)}`);
    eq(disk.state, "Open", "och den state pucken påstår");

    // The third caller: POST /issues. It resolved to `{permissions:…}` before, so
    // `data.number` was undefined and the puck was left unlinked with no toast — the
    // quietest of the three failures, and the one a screenshot would never show.
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    p.on("dialog", (d) => d.accept());
    // Named, for the same reason as above: this half needs a puck *without* an issue,
    // and "the second card" only happened to be one.
    await p.locator(".card").filter({ hasText: "a-now-2" }).first().click();
    await p.waitForSelector('.prop[data-field="issue"]');
    await p.locator('.prop[data-field="issue"] button').first().click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByText(/New issue in/).first().click();
    await p.waitForTimeout(1200);
    const länkad = await p.evaluate(() => ({
      cell: ((document.querySelector('.prop[data-field="issue"] .prop-v') || {}).textContent || "").trim(),
      toast: ((document.querySelector(".toast") || {}).textContent || "").trim(),
    }));
    ok(/#\d+/.test(länkad.cell), `Create issue länkar pucken: ${JSON.stringify(länkad)}`);

    // The structural half: an endpoint the stub does not know must fail loudly.
    const okänd = await p.evaluate(() =>
      fetch("https://api.github.com/repos/acme/alpha/pulls").then((r) => r.status));
    eq(okänd, 404, `en okänd ändpunkt får 404, inte behörighetssvaret (${okänd})`);

    eq(gh.writes, [], `fortfarande ingenting mot GitHub — stubben såg ${gh.writes.length} skrivningar`);
  }

  group("inget kvitto i demot lovar att något blir live");
  {
    // The first rewrite covered `— live in ~1 min` and stopped there. Deleting a puck and
    // saving Workspace settings say `— live after next sync` instead, and the Settings
    // note says in prose that it writes board.config.json — so the two writes a visitor
    // hesitates over most were also the two that still promised a commit. Reported by
    // Codex.
    //
    // Asked of the source rather than of a list of strings I keep by hand: that list is
    // exactly what went stale, and a seventeenth call site can be added without anyone
    // noticing. Every literal that makes the promise has to be reachable by the one
    // rewrite in `toast`, or be guarded by DEMO where it stands.
    const lines = (await readFile(new URL("../app.js", import.meta.url), "utf8")).split("\n");
    const claims = lines
      .map((line, i) => ({ n: i + 1, line, near: lines.slice(Math.max(0, i - 3), i + 2).join("\n") }))
      .filter(({ line }) => / — live (in ~1 min|after next sync|after the next sync)/.test(line))
      .filter(({ line }) => !/DEMO_PROMISE/.test(line));
    // Either it goes through `toast()`, which rewrites it, or a DEMO branch stands close
    // enough above it to be the thing choosing the wording. Anything else is a promise
    // the demo would make and not keep.
    const utanför = claims.filter(({ line, near }) => !/toast\(/.test(line) && !/\bDEMO\b/.test(near));
    eq(utanför.map((c) => c.n), [],
      `varje löfte om att något blir live går genom toast() eller står i en DEMO-gren — dessa gör ingetdera: ${JSON.stringify(utanför.map((c) => c.line.trim().slice(0, 70)))}`);
    ok(claims.length > 10, `och det finns faktiskt löften att räkna (${claims.length})`);

    // Then the behaviour, through the real path: delete a puck in demo mode.
    const demo = (d) => { d.config = Object.assign({}, d.config, { demo: true }); return d; };
    const gh2 = githubStub();
    const p2 = await open("", { data: demo, github: gh2.handler });
    p2.on("dialog", (d) => d.accept());
    await p2.locator(".card").first().click();
    await p2.waitForSelector('.prop[data-field="status"]');
    await p2.locator(".puck-more button").first().click();
    await p2.waitForSelector(".pop, .sheet");
    await p2.locator(".pop, .sheet").getByText(/Delete/).first().click();
    await p2.waitForTimeout(900);
    const kvitto = await p2.evaluate(() => ((document.querySelector(".toast") || {}).textContent || "").trim());
    ok(/in this browser only/.test(kvitto), `raderingens kvitto lovar inget mer: ${JSON.stringify(kvitto)}`);
    eq(gh2.writes, [], `och ingenting nådde GitHub (${gh2.writes.length})`);
  }

  group("kroppseditorn lämnar ifrån sig exakt det som öppnades");
  {
    // Den här gruppen bytte innehåll efter ett fynd på enhet, och bytet är poängen.
    //
    // Editorn var en `contenteditable="plaintext-only"` ett tag, för att komma undan
    // iOS 16px-golv. Mätt på telefonen zoomade en 14px editable div sidan med 1,147 —
    // 16/14 är 1,143 — så golvet gäller det fokuserade *redigerbara elementet*, inte
    // taggen. Den ändringen är återställd.
    //
    // Vad den kostade under tiden är den egentliga lärdomen: i Safari stod kroppen som
    // en enda hopklistrad klump, eftersom `white-space: pre-wrap` togs bort efter att
    // ha mätts som verkningslös i Chromium — där sätter motorns egen stilmall den, i
    // Safari inte. Ett Save hade skrivit den klumpen till .md-filen.
    //
    // Den gamla gruppen kunde inte fånga det. Den skrev *ny* text med tangentbordet
    // och kollade en beräknad `white-space`. Det som gick sönder var att öppna en
    // *befintlig* flerradig kropp och spara den orörd — så det är vad som mäts nu,
    // genom commiten. Ett påstående om utfallet överlever ett byte av mekanism; ett
    // påstående om mekanismen gör det inte.
    const gh = githubStub();
    const kropp = "## Goal\nFörsta stycket.\n\n- Punkt\n  - Under, med två inledande blanksteg\n\n## Research\nSista stycket.";
    const data = (d) => { d.items.find((i) => i.slug === "a-now").body = kropp; return d; };
    const p = await open("#alpha/a-now", { token: true, github: gh.handler, data });
    await p.locator(".body-edit").click();
    await p.waitForSelector(".body-editor");

    // Kontraktet är inte ett tal utan en likhet: editorn ska bära texten den ersätter.
    // Mätt mot en riktig `.modal-body` i samma pane, inte mot en hårdkodad siffra —
    // annars mäter kontrollen att någon skrev 16 på två ställen, inte att de hör ihop.
    const mät = (page) => page.evaluate(() => {
      const e = document.querySelector(".body-editor");
      const läst = document.createElement("div");
      läst.className = "modal-body";
      läst.style.position = "absolute";
      document.querySelector(".detail-content").appendChild(läst);
      const r = getComputedStyle(läst);
      const ut = {
        tagg: e.tagName.toLowerCase(),
        storlek: getComputedStyle(e).fontSize,
        familj: getComputedStyle(e).fontFamily,
        radhöjd: getComputedStyle(e).lineHeight,
        rStorlek: r.fontSize, rFamilj: r.fontFamily, rRadhöjd: r.lineHeight,
      };
      läst.remove();
      return ut;
    });

    const box = await mät(p);
    eq(box.tagg, "textarea", "en textarea, som bevarar radbrytningar utan hjälp av CSS");
    eq(box.storlek, box.rStorlek, `samma storlek som texten den ersätter (${box.storlek})`);
    eq(box.familj, box.rFamilj, "och samma typsnitt — mono var andra halvan av hoppet");
    eq(box.radhöjd, box.rRadhöjd, "och samma radhöjd, så texten inte ens flyttar sig");

    // Rör ingenting. Att öppna och spara ska vara en nulloperation.
    await p.locator(".body-edit-actions .primary").click();
    await p.waitForTimeout(600);
    eq(gh.writes.length, 1, "en commit");
    const skrivet = gh.writes[0].content;
    ok(skrivet.includes(kropp),
      `en orörd kropp kommer ut tecken för tecken som den gick in:\n${JSON.stringify(skrivet)}`);
    ok(!/Goal Första/.test(skrivet),
      `raderna klistras inte ihop — det var precis vad Safari gjorde med contenteditable-varianten:\n${JSON.stringify(skrivet)}`);

    // Och på telefon, där hela frågan uppstod. Kroppen är lång här med flit: det är en
    // lång kropp som avslöjar bägge felen nedan, och en kort som döljer dem.
    const lång = Array.from({ length: 40 }, (_, i) => `Stycke ${i + 1} i en puck som är för lång för en skärm.`).join("\n\n");
    const långData = (d) => { d.items.find((i) => i.slug === "a-now").body = lång; return d; };
    const mobil = await open("#alpha/a-now", { token: true, github: gh.handler, data: långData, viewport: { width: 390, height: 844 } });
    await mobil.locator(".body-edit").click();
    await mobil.waitForSelector(".body-editor");
    await mobil.waitForTimeout(200);

    // Likheten ska hålla här också, men *vilket* tal den landar på är inte fritt: iOS
    // zoomar in allt redigerbart under 16px, så det är läsningen som lyfts dit och
    // inte skrivandet som sänks.
    const m = await mät(mobil);
    eq(m.storlek, "16px", "på telefon är editorn 16px — golvet iOS kräver av allt redigerbart");
    eq(m.rStorlek, "16px", "och läsningen är lyft dit, så det inte finns något hopp kvar");
    eq(m.familj, m.rFamilj, "fortfarande samma typsnitt");

    // Och på en bred pekskärm — en iPad, eller en telefon i landskap. Golvet gäller
    // *fokuserad redigering*, inte en viewportbredd, så en regel som bara frågar efter
    // bredd svarar för en telefon i porträtt och för ingenting annat: editorn hade
    // fallit till 14px och zoomat igen, på precis den enhetsklass där läsning och
    // skrivande just blivit samma text. Hittat av Codex på PR #40.
    const platta = await open("#alpha/a-now", {
      token: true, github: gh.handler, data: långData,
      viewport: { width: 1024, height: 768 }, hasTouch: true,
    });
    await platta.locator(".body-edit").click();
    await platta.waitForSelector(".body-editor");
    const t = await mät(platta);
    eq(t.storlek, "16px", "en bred pekskärm får golvet, inte 14px");
    eq(t.rStorlek, t.storlek, "och läsningen följer med, så hoppet inte kommer tillbaka där");

    // Och var den hamnar. Att fokusera ett fält scrollar det i sikte mot *layout*-vyn,
    // som inte vet att ett tangentbord täcker nedre halvan — och autoGrow gör lådan
    // tusentals pixlar hög efter den scrollen. Mätt före fixen: toppen landade 498px
    // ner på en 844px-vy, alltså helt under tangentbordet. Ingen webbläsare här har ett
    // tangentbord, så kontrollen mäter det som *går* att mäta: att toppen står i det
    // översta bandet i stället för långt ner på sidan.
    const plats = await mobil.evaluate(() => ({
      topp: Math.round(document.querySelector(".body-editor").getBoundingClientRect().top),
      barH: Math.round(document.querySelector(".topbar").getBoundingClientRect().height),
      höjd: Math.round(document.querySelector(".body-editor").getBoundingClientRect().height),
    }));
    ok(plats.höjd > 844, `lådan är längre än skärmen, annars mäter kontrollen ingenting (${plats.höjd})`);
    near(plats.topp, plats.barH + 8, 12,
      `editorns topp står strax under topbaren, inte nedanför tangentbordet (${plats.topp})`);
  }

  group("en ändring på ett barnbarn stannar hos dess egen förälder");
  {
    // `progress` räknas på två ställen — i skördaren och optimistiskt här i tavlan — och
    // det som gör kopian farlig är att den kan råka mäta något *annat* utan att någon
    // märker det förrän nästa skörd rättar tavlan en timme senare. Så måttet mäts här:
    // direkta barn, en nod. Ett barnbarn som blir klart flyttar mellannodens tal, för
    // det är mellannodens barn; roten står stilla, för det roten räknar är mellannodens
    // status, och den rörde sig inte.
    //
    // Sabotaget som fäller den här: låt kopian räkna underträdet i stället, så blir
    // roten 1/2 — ett tal som inte går att härleda ur raden under den.
    const träd = (d) => {
      const rot = d.items.find((i) => i.slug === "a-parent");
      const mitten = d.items.find((i) => i.slug === "b-member");
      const barnbarn = Object.assign({}, mitten, {
        id: "alpha/a-gc", slug: "a-gc", repo: "acme/alpha", repoName: "Alpha", title: "Barnbarnet",
        status: "next", parent: "acme/beta#b-member", parentRef: "beta/b-member",
        children: [], progress: null, order: 10,
      });
      mitten.children = ["alpha/a-gc"];
      mitten.progress = { done: 0, total: 1 };
      rot.children = ["beta/b-member"];
      rot.progress = { done: 0, total: 1 }; // ett direkt barn: mitten
      d.items.push(barnbarn);
      return d;
    };
    const gh = githubStub();
    const p = await open("#alpha/a-gc", { token: true, github: gh.handler, data: träd });
    await p.waitForSelector('.prop[data-field="status"]');
    await p.locator('.prop[data-field="status"] button').first().click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByText(/^Done$/).first().click();
    await p.waitForTimeout(700);

    const tal = await p.evaluate(() => {
      const ut = {};
      document.querySelectorAll(".card").forEach((c) => {
        const t = (c.querySelector("h3") || {}).textContent.trim();
        const r = c.querySelector(".rollup");
        if (r) ut[t] = r.textContent.trim();
      });
      return ut;
    });
    eq(tal["b-member"], "1/1",
      `mellannoden räknar om när dess eget barn blir klart: ${JSON.stringify(tal)}`);
    eq(tal["A parent"], "0/1",
      "och roten står stilla — dess enda del är fortfarande öppen, och säger det själv");
  }
}
