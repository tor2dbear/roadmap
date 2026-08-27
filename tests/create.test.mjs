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
}
