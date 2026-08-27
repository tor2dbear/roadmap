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
}
