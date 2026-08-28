// Creating a puck from a reference picker. The assertions are on what gets
// *committed*, not on what the board renders afterwards — an optimistic UI shows the
// right thing for a moment regardless of whether the file it wrote makes sense.
//
// Membership is authored on the child, which is why the same feature costs a
// different number of commits depending on which end you start from. That difference
// is the thing worth pinning.
import { githubStub } from "./fixture.mjs";
import { group, eq, ok } from "./assert.mjs";

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
    const p = await open("#alpha/a-etapp", { token: true, github: gh.handler });
    await trigger(p, "Add puck").click();
    await p.waitForTimeout(250);
    await typeIn(p, "Login flow");
    eq(await rows(p), ['New puck “Login flow”in Alpha'], "raden namnger repot den skulle skriva i");

    await p.locator(".pick-create").click();
    await p.waitForTimeout(600);
    eq(gh.writes.length, 1, "en commit, inte två");
    const w = gh.writes[0];
    eq(w.path, "acme/alpha:roadmap/login-flow.md", "slugen blir filnamnet");
    ok(w.content.includes("parent: a-etapp"), `relationen står i filen den föds med:\n${w.content}`);
    ok(w.content.includes("status: later"),
      "later, inte inbox — att lägga en puck i en etapp *är* att sortera den");
    eq(await p.evaluate(() => (location.hash || "").slice(1)), "alpha/a-etapp",
      "och man står kvar där man var");
  }

  group("ur pucken: två commits, i ordning");
  {
    // Here the new puck is the *parent*, so the relation is authored on the puck we
    // are standing in — a second file, and therefore a second write.
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler });
    await trigger(p, "Set etapp").click();
    await p.waitForTimeout(250);
    await typeIn(p, "Auth");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(900);

    eq(gh.writes.length, 2, "två commits");
    eq(gh.writes[0].path, "acme/alpha:roadmap/auth.md", "etappen skapas först");
    eq(gh.writes[1].path, "acme/alpha:roadmap/a-now.md", "och länken skrivs på pucken vi stod i");
    ok(gh.writes[1].content.includes("parent: auth"), `länken pekar på den nya etappen:\n${gh.writes[1].content}`);
    ok(!gh.writes[0].content.includes("parent:"),
      "den nya etappen får ingen förälder — den *är* föräldern");
    eq(await p.evaluate(() => (location.hash || "").slice(1)), "alpha/a-now", "man står kvar");
  }

  group("en titel som redan finns erbjuds inte som ny");
  {
    // A row that would make a second "An etapp" beside the "An etapp" listed above it
    // is an invitation to a duplicate, not a shortcut.
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler });
    await trigger(p, "Set etapp").click();
    await p.waitForTimeout(250);
    await typeIn(p, "An etapp");
    eq(await rows(p), ["An etapp"], "bara den befintliga");
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
    eq(await trigger(p, "Set etapp").count(), 0, "skenan är inte ens redigerbar");
  }

  group("dubbletten mäts där filen ska ligga");
  {
    // A puck titled the same in *another* repo neither collides nor confuses — it is a
    // different project's, and the picker's pool is full of them. The old guard asked
    // the whole cross-repo pool and hid the row for exactly that case.
    const gh = githubStub();
    const p = await open("#alpha/a-now", { token: true, github: gh.handler });
    await trigger(p, "Set etapp").click();
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
    const p = await open("#alpha/a-etapp", { token: true, github: gh.handler });
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
    const only = (d) => { d.items = d.items.filter((i) => i.slug === "a-etapp"); d.items[0].children = []; d.total = 1; return d; };
    const gh = githubStub();
    const p = await open("#alpha/a-etapp", { token: true, github: gh.handler, data: only });
    eq(await trigger(p, "Add puck").count(), 1, "väljaren finns fast ingen kandidat gör det");
    await trigger(p, "Add puck").click();
    await p.waitForTimeout(250);
    await typeIn(p, "First member");
    eq(await p.locator(".pick-create").count(), 1, "och den erbjuder att skapa");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(600);
    eq(gh.writes.length, 1, "en commit");
    ok(gh.writes[0].content.includes("parent: a-etapp"), "med relationen i filen");
  }

  group("etappen man står kvar på ritas om");
  {
    // The tests above assert what gets *committed*, and that is exactly why they missed
    // this: with `open: false` the etapp is the page still on screen, and redrawing only
    // the board left its Contains list and its rollup describing the state from before
    // the click. The card behind it updated; the page in front of it did not.
    const gh = githubStub();
    const p = await open("#alpha/a-etapp", { token: true, github: gh.handler });
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
    const p = await open("#alpha/a-etapp", { token: true, github: gh.handler });
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
    eq(after.still, "alpha/a-etapp", "och etappen är fortfarande öppen — inte stängd av felvägen");
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
    const p = await open("#alpha/a-etapp", { token: true, github: gh.handler, data: adapted });
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

    await trigger(p, /^⋯$|^Set etapp$/).click();
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
    eq(await trigger(p, /^Set etapp$/).count(), 1, "skenan är redigerbar till att börja med");
    await trigger(p, /^Set etapp$/).click();
    await p.waitForTimeout(250);
    await typeIn(p, "Doomed");
    await p.locator(".pick-create").click();
    await p.waitForTimeout(1200);
    eq(await trigger(p, /^Set etapp$/).count(), 0,
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
    await trigger(p, /^⋯$|^Set etapp$/).click();
    await p.waitForTimeout(250);
    await typeIn(p, "An etapp");
    await p.locator(".pick-mi").first().click();
    await p.waitForTimeout(1000);
    eq(await flagged(), ["parent-missing"], "och står kvar när skrivningen nekats");
  }
}
