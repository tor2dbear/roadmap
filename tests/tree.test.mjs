// Listan som träd. `group=parent` är den enda gruppering där nästling betyder något —
// ett träd spänner över statusar, så inuti en statuskolumn finns ingen nivå att rita —
// och det här är den layout som har plats för indrag.
//
// Payloaden nedan lägger till det den delade fixturen saknar: ett barnbarn, och en rot
// med ett namn som är för långt för en telefon. Bägge är fall som fanns i den riktiga
// datan och i ingen kontroll.
import { group, eq, ok } from "./assert.mjs";

const LONG = "Hierarkin på riktigt: parent, nästling och ordning";

// rot (A parent) → b-member → barnbarn. Roten får också det långa namnet, eftersom det
// är rubriken som bär det på tavlan.
const träd = (d) => {
  const rot = d.items.find((i) => i.slug === "a-parent");
  const mitten = d.items.find((i) => i.slug === "b-member");
  rot.title = LONG;
  rot.children = ["beta/b-member"];
  rot.progress = { done: 0, total: 1 };
  mitten.children = ["alpha/a-gc"];
  mitten.progress = { done: 0, total: 1 };
  d.items.push(Object.assign({}, mitten, {
    id: "alpha/a-gc", slug: "a-gc", repo: "acme/alpha", repoName: "Alpha", repoColor: "#e07a5f",
    title: "Barnbarnet", status: "next", parent: "acme/beta#b-member", parentRef: "beta/b-member",
    children: [], progress: null, body: "Body of a-gc",
  }));
  return d;
};

// Ett arkiverat barnbarn i stället för ett öppet: det som håller tillbaka raden är då
// arkivet, inte filtret, och de två har olika mening och olika reparation.
const arkiveratBarnbarn = (d) => {
  const t = träd(d);
  t.items.find((i) => i.slug === "a-gc").status = "done";
  return t;
};

// Sektionerna som text: rubrik, och raderna med sitt djup. Ett träd är en form, så
// kontrollerna läser formen och inte enskilda noder.
const form = (page) => page.evaluate(() =>
  [...document.querySelectorAll(".list-group")].map((s) => ({
    head: (s.querySelector(".lh-label") || {}).textContent,
    mark: (s.querySelector(".col-archived") || {}).textContent,
    warn: !!s.querySelector(".list-head .warn-badge"),
    rows: [...s.querySelectorAll(".list-row, .list-empty")].map((r) => {
      const d = +(getComputedStyle(r).getPropertyValue("--depth") || 0);
      if (r.classList.contains("list-empty")) return d + ":[" + r.textContent.trim() + "]";
      return d + ":" + (r.querySelector(".list-fold") ? "▾" : "·") + r.querySelector(".list-title").textContent;
    }),
  })));

export async function run({ open }) {
  group("barnbarnet står under sin förälder, och föräldern står på ett ställe");
  {
    const p = await open("?layout=list&group=parent", { data: träd });
    const f = await form(p);
    const rot = f.find((s) => s.head === LONG);
    ok(rot, `roten är en rubrik: ${JSON.stringify(f.map((s) => s.head))}`);
    eq(rot.rows, ["0:▾b-member", "1:·Barnbarnet"],
      "mellanpucken är en rad med karet, och barnbarnet ligger ett indrag in under den");
    // Det som *inte* står här är hela poängen: före den här ändringen var mellanpucken
    // två saker på samma sida — en rad i förälderns grupp och en egen rubrik längre ner.
    eq(f.filter((s) => s.head === "b-member").length, 0,
      `mellanpucken har ingen egen rubrik längre: ${JSON.stringify(f.map((s) => s.head))}`);
  }

  group("en toppförälder är en rubrik, inte en rad under No parent");
  {
    const p = await open("?layout=list&group=parent", { data: träd });
    const f = await form(p);
    const none = f.find((s) => s.head === "No parent");
    ok(none, "gruppen finns kvar");
    eq(none.rows.some((r) => r.indexOf(LONG) !== -1), false,
      `roten ritas inte också som en rad: ${JSON.stringify(none.rows)}`);
    // …och den betyder nu det den säger: puckar som inte står i något träd alls.
    ok(none.rows.length > 0, "men gruppen är inte tom — de fristående puckarna bor där");
  }

  group("en förälder vars delar filtret tog säger det");
  {
    // Frågan matchar rotens titel och ingenting under den.
    const p = await open("?layout=list&group=parent&q=" + encodeURIComponent("ordning"), { data: träd });
    const f = await form(p);
    const rot = f.find((s) => s.head === LONG);
    ok(rot, `rubriken står kvar: ${JSON.stringify(f.map((s) => s.head))}`);
    eq(rot.rows, ["0:[No matching parts]"],
      "med en rad som säger varför den ser ut som ett löv");
  }

  group("och en vars delar arkivet håller tillbaka säger något annat");
  {
    const p = await open("?layout=list&group=parent", { data: arkiveratBarnbarn });
    const f = await form(p);
    const rot = f.find((s) => s.head === LONG);
    eq(rot.rows, ["0:·b-member", "1:[1 archived part]"],
      `arkivet svarar för sitt eget hål, med sin egen reparation: ${JSON.stringify(rot.rows)}`);
    // Och reparationen fungerar: ögat lyfter arkivet och barnbarnet kommer tillbaka.
    await p.locator(".list-archived").first().click();
    await p.waitForTimeout(200);
    const efter = await form(p);
    eq(efter.find((s) => s.head === LONG).rows, ["0:▾b-member", "1:·Barnbarnet"],
      "ögat lyfter arkivet på plats");
  }

  group("en fälld nod tar bara sitt eget underträd");
  {
    const p = await open("?layout=list&group=parent", { data: träd });
    await p.locator(".list-fold").first().click();
    await p.waitForTimeout(200);
    const f = await form(p);
    eq(f.find((s) => s.head === LONG).rows, ["0:▾b-member"],
      "barnbarnet försvinner och mellanpucken står kvar");
    // En fälld nod säger heller inget om delar den *avsiktligt* döljer — annars hade
    // "No matching parts" dykt upp i samma stund som man fällde ihop den.
    eq(f.filter((s) => s.head === "No parent").length, 1, "resten av listan rörs inte");
  }

  group("arkivet räknar rader, och en lyft rot är ingen rad");
  {
    // Codex, #46. `archivedPerColumn` grupperar med samma `groupsOf` som tavlan — men
    // trädet lyfter roten ur `No parent`, och märket räknar `count − synliga rader`. Den
    // lyfta roten blev alltså en "arkiverad" puck som inte var arkiverad, och rubriken
    // lovade ett gömt kort mer än den hade.
    const p = await open("?layout=list&group=parent", { data: träd });
    const none = (await form(p)).find((s) => s.head === "No parent");
    eq(none.mark, "4 archived",
      `bara de fyra som verkligen ligger i arkivet: ${JSON.stringify(none.mark)}`);
    // Och siffran är kontrollerbar: ögat lyfter arkivet, och exakt fyra rader kommer till.
    const före = none.rows.length;
    await p.locator(".list-group").filter({ hasText: "No parent" }).locator(".col-archived").click();
    await p.waitForTimeout(200);
    const efter = (await form(p)).find((s) => s.head === "No parent").rows.length;
    eq(efter - före, 4, `ögat ger tillbaka precis så många som märket lovade (${före} → ${efter})`);
  }

  group("en rot som bara finns i arkivet har fortfarande en dörr");
  {
    // Codex, #46, och en regression i fixen ovan: lyftet togs bort ur arkivräkningen
    // *ovillkorligt*, men en rot lyfts ur `No parent` för att den redan står som rubrik.
    // En arkiverad rot står ingenstans — arkivet gömmer själva pucken, inte dess delar —
    // så att lyfta den ur räkningen tog bort det enda som kunde hämta tillbaka den.
    // Mätt: tavlan blev *helt tom*. Inga rader, ingen stump, inget öga.
    const arkiveradRot = (d) => {
      const rot = d.items.find((i) => i.slug === "a-parent");
      const mitten = d.items.find((i) => i.slug === "b-member");
      rot.title = LONG; rot.status = "done"; rot.children = ["beta/b-member"];
      rot.progress = { done: 0, total: 1 };
      mitten.children = []; mitten.progress = null;
      return d;
    };
    // Fångat, för det är just den tomma tavlan som är felet: `open()` väntar på att
    // något ska ritas, och utan fixen väntar den ut sin timeout. Ett sabotage ska säga
    // vad som saknades, inte lämna en stack trace efter tio sekunder.
    const p = await open("?layout=list&group=parent&q=" + encodeURIComponent("ordning"), { data: arkiveradRot })
      .catch(() => null);
    if (!p) {
      ok(false, "tavlan ritade ingenting alls — arkivet lämnade varken rad, stump eller öga");
    } else {
      const f = await form(p);
      eq(f.map((s) => s.head + "|" + s.mark), ["No parent|1 archived"],
        `arkivet svarar för den rot som ingen rubrik täcker: ${JSON.stringify(f)}`);
      await p.locator(".col-archived").first().click();
      await p.waitForTimeout(200);
      const efter = await form(p);
      eq(efter.map((s) => s.head), [LONG], "och ögat öppnar den som rubrik");
      eq(efter[0].rows, ["0:[No matching parts]"], "med sina delar utanför frågan");
    }
  }

  group("en fällning som filtret sprang ifrån låser inte raden");
  {
    // Codex, #46. Fäll en förälder, filtrera sedan bort alla dess delar: `shut` står kvar
    // i `state.collapsed` medan raden inte längre får något karet — så den enda kontroll
    // som kunde lösa fällningen är borta, och raden ritade som ett löv för alltid i den
    // vyn. En puck med delar är en förälder oavsett vilka delar filtret visar.
    const p = await open("?layout=list&group=parent&q=member&collapsed=" + encodeURIComponent("beta/b-member"), { data: träd });
    const f = await form(p);
    eq(f[0].rows, ["0:·b-member", "1:[No matching parts]"],
      `den fällda föräldern säger fortfarande att den har delar: ${JSON.stringify(f[0].rows)}`);
  }

  group("en befordrad rot behåller sin varning");
  {
    // Codex, #46. En rot som befordras till rubrik ritas *bara* som rubrik — raden under
    // `No parent` är precis vad befordran tar bort — och rubriken kallade aldrig
    // `signalMessages`. En `stale` eller `rollup-open` på en toppförälder försvann alltså
    // ur listan medan pucken stod kvar på skärmen. ⚠ är det märke ingenting får dölja:
    // det säger att puckens eget påstående är falskt.
    const flaggadRot = (d) => {
      const t = träd(d);
      t.items.find((i) => i.slug === "a-parent").signals = [{ type: "stale" }];
      return t;
    };
    const p = await open("?layout=list&group=parent", { data: flaggadRot });
    const f = await form(p);
    const rot = f.find((s) => s.head === LONG);
    ok(rot.warn, "rubriken bär puckens flagga");
    // Och det är den enda platsen den kan stå på: roten är ingen rad någonstans.
    const somRad = await p.evaluate((t) => [...document.querySelectorAll(".list-row")]
      .some((r) => (r.querySelector(".list-title") || {}).textContent === t), LONG);
    eq(somRad, false, "roten står inte som rad — därför måste rubriken bära den");
  }

  group("listan spränger inte sidbredden på en telefon");
  {
    // Det här är felet som syntes som "sidbredden breakar": tavlan är ett rutnätsobjekt,
    // och ett rutnätsobjekts automatiska minimum är dess min-content — vilket i
    // kolumnläget är 0 bara därför att `overflow-x: auto` gör den till en scrollbehållare.
    // Listan stänger av det, så det bredaste obrytbara på sidan började bestämma
    // dokumentets bredd: 652px på en 390px-telefon, med topbaren i 60% av sidan.
    const p = await open("?layout=list&group=parent", {
      data: träd, viewport: { width: 390, height: 844 }, hasTouch: true,
    });
    const m = await p.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      vw: document.documentElement.clientWidth,
      // Och ellipsen som alltid var specificerad har äntligen en bredd att arbeta mot.
      klippt: [...document.querySelectorAll(".lh-label")].some((e) => e.scrollWidth > e.clientWidth + 1),
    }));
    eq(m.doc, m.vw, `dokumentet är precis så brett som skärmen (${m.doc} mot ${m.vw})`);
    ok(m.klippt, "och det långa namnet trunkeras i stället för att skjuta ut sidan");
  }
}
