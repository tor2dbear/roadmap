// Display hör till den vy man gjorde den i. Grupperingen, ordningen, egenskaperna,
// fällningarna och de två helbrädesväxlarna följde förr med överallt: ställde man om
// `All pucks` till gruppering på repo blev Ready och Inbox omgrupperade med den — och i
// Inbox kunde URL:en inte ens säga det, för `effectiveParams` stryker en `group` som vyn
// redan har låst. En inställning osynlig i länken och synlig på skärmen.
//
// Tre nivåer, och ordningen är kontraktet: **URL:en vinner, sedan vyns minne, sedan
// tavlans standard.** Kontrollerna nedan är en per nivå plus en per gräns mellan dem.
//
// Allt här sker på *en* sida. `open()` ger varje anrop en egen browser-kontext, alltså
// en egen localStorage — så ett minne som ska överleva en omladdning måste laddas om med
// `page.goto` i samma sida, och en navigering mellan vyer måste vara ett riktigt klick i
// sidomenyn. Det är dessutom den väg som *skriver*, vilket är halva poängen.
import { group, eq, ok } from "./assert.mjs";

const url = (p) => new URL(p.url()).search;
const kolumner = (p) => p.evaluate(() =>
  [...document.querySelectorAll(".board > .column:not(.hidden-cols) .col-head h2")]
    .map((e) => e.textContent.trim()));
const minne = (p) => p.evaluate(() => localStorage.getItem("roadmap-display"));

// Display → <fält> → <värde>. Menyn stängs inte av ett val (man vill ofta ändra mer än
// en sak), så nästa nivå plockas i samma öppna yta.
async function välj(p, fält, värde) {
  await p.locator("#displayBtn").click();
  await p.waitForSelector(".pop, .sheet");
  await p.locator(".pop, .sheet").getByText(fält, { exact: true }).click();
  await p.locator(".pop, .sheet").getByText(värde, { exact: true }).first().click();
  await p.waitForTimeout(250);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(150);
}

// Ordningen är inte ett värde ur en lista längre: den är en kedja, och en nyckel läggs
// till bakom `Add a key`. Raderna heter dessutom sitt *fält* sedan riktningen blev en egen
// kontroll, så `Title A–Z` finns inte att klicka på.
async function läggTillNyckel(p, fält) {
  await p.locator("#displayBtn").click();
  await p.waitForSelector(".pop, .sheet");
  await p.locator(".pop, .sheet").getByText("Ordering", { exact: true }).click();
  await p.locator(".pop, .sheet").getByText("Add a key", { exact: true }).click();
  await p.locator(".pop, .sheet").getByText(fält, { exact: true }).click();
  await p.waitForTimeout(250);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(150);
}

async function gåTill(p, namn) {
  await p.getByRole("button", { name: new RegExp("^" + namn) }).first().click();
  await p.waitForTimeout(250);
}

export async function run({ open, origin }) {
  group("en gruppering gjord i en vy följer inte med till nästa");
  {
    // Reproduktionen ur pucken, ordagrant — och med Display-menyn, inte med en länk,
    // eftersom det är den vägen som sparar.
    const p = await open("", { token: true });
    await välj(p, "Grouping", "Repo");
    eq(url(p), "?group=repo", "grupperingen slår igenom på All pucks");
    const repoKol = await kolumner(p);
    ok(repoKol.length > 1 && repoKol.indexOf("Now") === -1,
      `och tavlan är repokolumner: ${JSON.stringify(repoKol)}`);

    await gåTill(p, "Ready");
    eq(url(p), "?view=ready", "Ready öppnar utan den");
    eq(await kolumner(p), ["Now", "Next"], "med sina egna statuskolumner");

    // Och tillbaka: en inställning är fortfarande en inställning, den hör bara till en vy.
    await gåTill(p, "All pucks");
    eq(url(p), "?group=repo", "All pucks minns sin egen");
    eq(await kolumner(p), repoKol, "och ritar samma kolumner som när man lämnade den");
  }

  group("en vy man aldrig ställt in öppnar på standard, inte på den senaste");
  {
    // Arv vore mjukare men fortfarande smittsamt, och värst just första gången — det är
    // den enda gång det inte finns något på skärmen som kan rätta en. Samma resonemang
    // som `goToView` redan för om filtret.
    const p = await open("", { token: true });
    // Ordningen är en kedja sedan `sortering-ar-en-kedja`, så att välja en nyckel *lägger
    // till* den sist i stället för att byta läge — standarden `order,updated` står kvar
    // framför. Det är kedjan som mäts på riktigt i `tests/sort.test.mjs`; här är den bara
    // ett andra vred, så att gruppen inte är en kopia av den ovanför.
    await läggTillNyckel(p, "Title");
    eq(url(p), "?sort=order,updated,title", "sorteringen sitter i All pucks");
    await gåTill(p, "Inbox");
    eq(url(p), "?view=inbox", "Inbox ärver den inte");
    await gåTill(p, "Standalone");
    eq(url(p), "?view=standalone", "och inte Standalone heller");
  }

  group("URL:en vinner över minnet — och skrivs inte in i det");
  {
    // Den delade länken är hela produktens kontrakt: den måste rita samma tavla för den
    // som öppnar den. Men den får inte bli ditt minne, för då hade någon annans vy tyst
    // blivit din.
    const p = await open("", { token: true });
    await välj(p, "Grouping", "Repo");
    eq(JSON.parse(await minne(p)).all.group, "repo", "minnet står i store:n");

    await p.goto(origin + "/index.html?view=all&group=agent");
    await p.waitForSelector(".board");
    await p.waitForTimeout(250);
    const kol = await kolumner(p);
    ok(kol.indexOf("Now") === -1, `länken vinner över minnet: ${JSON.stringify(kol)}`);
    eq(JSON.parse(await minne(p)).all.group, "repo", "men den skriver inte om det");

    // Ren omladdning: nu är det minnet som gäller igen.
    await p.goto(origin + "/index.html");
    await p.waitForSelector(".board");
    await p.waitForTimeout(250);
    eq(url(p), "?group=repo", "och en bar adress öppnar på det som är ditt");
  }

  group("en fällning hör till grupperingen den gjordes i");
  {
    // Pucken kallade det värsta fallet, och det är det: nycklarna är grupperingens egna
    // värden, så en fällning gjord under en gruppering bär över till en vy som grupperar
    // på något annat — där den matchar ingenting, eller värre, matchar `NO_VALUE`-hinken.
    // `setDisplay` nollade redan vid grupperingsbyte av exakt det skälet; en navigering
    // hade ingen motsvarighet.
    const p = await open("?layout=list&done=1", { token: true });
    await p.waitForSelector(".list-group");
    await p.evaluate(() => document.querySelector("[data-fold]").click());
    await p.waitForTimeout(250);
    const fälld = await p.evaluate(() =>
      new URLSearchParams(location.search).get("collapsed"));
    ok(fälld, `en grupp är fälld: ${JSON.stringify(fälld)}`);

    await gåTill(p, "Ready");
    eq(await p.evaluate(() => new URLSearchParams(location.search).get("collapsed")), null,
      "Ready får den inte med sig");
  }

  group("en plats är ingen vy — den landar i All pucks och läser dess minne");
  {
    // `goToPlace` sätter `focus = "all"` och är navigering på samma sätt. Ett minne per
    // repo vore mer än någon bett om; det som ska hända är att man landar på `all`.
    const p = await open("", { token: true });
    await välj(p, "Grouping", "Priority");
    eq(url(p), "?group=priority", "grupperingen sitter i All pucks");
    await gåTill(p, "Inbox");
    eq(url(p), "?view=inbox", "Inbox är ren");
    const repo = await p.evaluate(() =>
      (document.querySelector(".chip.repo") || {}).textContent);
    ok(repo, `sidomenyn har en repo-rad att gå till: ${JSON.stringify(repo)}`);
    await p.evaluate(() => document.querySelector(".chip.repo").click());
    await p.waitForTimeout(300);
    const efter = await p.evaluate(() => new URLSearchParams(location.search).get("group"));
    eq(efter, "priority",
      "en plats öppnar med All pucks minne, inte med den vy man kom från");
  }

  group("Reset glömmer vyn, den lagrar ingen kopia av standarden");
  {
    const p = await open("", { token: true });
    await välj(p, "Grouping", "Repo");
    ok(await minne(p), "något är lagrat");
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByRole("button", { name: /Reset to default/ }).click();
    await p.waitForTimeout(300);
    eq(url(p), "", "brädan är tillbaka på standard");
    eq(JSON.parse(await minne(p)).all, undefined,
      "och vyn har ingen post kvar — en tom post vore ett minne av att inte ha ändrat något");
  }

  group("en sparad vy är sin egen post och skriver inget lokalt minne");
  {
    // En sparad vy ligger i `board.config.json`, och vägen att spara en ändring i den är
    // `Update "<namn>"` i chip-raden. Ett lokalt minne ovanpå skulle vinna på vägen in
    // och vyn läste som *(edited)* i samma stund den öppnades — samma form som
    // `etapps`-buggen. Det får inte heller falla igenom till den inbyggda vyn under.
    const sparad = (d) => {
      d.config = d.config || {};
      d.config.views = [{ name: "Redo per repo", view: "ready", group: "repo" }];
      return d;
    };
    const p = await open("", { token: true, data: sparad });
    await p.getByRole("button", { name: /Redo per repo/ }).first().click();
    await p.waitForTimeout(300);
    eq(JSON.parse((await minne(p)) || "{}").ready, undefined, "att gå in i den skriver inget");

    await läggTillNyckel(p, "Title");
    eq(JSON.parse((await minne(p)) || "{}").ready, undefined,
      "och att ändra i den skriver inte heller — Update är vägen");
    await gåTill(p, "Ready");
    eq(url(p), "?view=ready", "den inbyggda vyn under är orörd");
  }

  group("lagrade sorteringsord uppgraderas en gång, inte varje gång");
  {
    // Codex, tredje varvet på samma fynd — och det första med en riktig instans. `priority`
    // och `status` var hela värden i den *släppta* menyn, så en webbläsare som varit här
    // förut kan ha dem i `roadmap-display`. Sedan ordningen blev en kedja betyder de inte
    // längre sina gamla kedjor, så tavlan hade tyst bytt tiebreak under en återvändare.
    //
    // Kompatibiliteten ligger i migreringen och inte i `parseSort`: en migrering körs en
    // gång och sedan är grammatiken ren, medan en expansion i parsern är för alltid — och
    // tar enkelnyckel-kedjans stavning med sig.
    const p = await open("", { token: true });
    await p.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("roadmap-display", JSON.stringify({ all: { sort: "priority" } }));
    });
    await p.goto(origin + "/index.html");
    await p.waitForSelector(".board");
    await p.waitForTimeout(250);
    eq(url(p), "?sort=priority,updated", "det lagrade ordet betyder fortfarande sin gamla kedja");
    eq(await p.evaluate(() => JSON.parse(localStorage.getItem("roadmap-display"))),
      { all: { sort: "priority,updated" }, __v: 2 }, "och skrivs tillbaka stämplad");

    // Stämpeln är hela poängen: utan den hade en kedja man *avsiktligt* smalnat av till bara
    // `priority` skrivits om vid nästa laddning — rundgångsbuggen en våning upp.
    await p.evaluate(() => {
      localStorage.setItem("roadmap-display", JSON.stringify({ all: { sort: "priority" }, __v: 2 }));
    });
    await p.goto(origin + "/index.html");
    await p.waitForSelector(".board");
    await p.waitForTimeout(250);
    eq(url(p), "?sort=priority", "en redan uppgraderad butik rörs inte");

    // Och den gamla platta nyckeln bär samma två ord.
    await p.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("roadmap-sort", "status");
    });
    await p.goto(origin + "/index.html");
    await p.waitForSelector(".board");
    await p.waitForTimeout(250);
    eq(url(p), "?sort=status,order", "roadmap-sort med `status` blir kedjan den betydde");
  }

  group("en rads siffra är vad klicket landar i, inte vad brädan står på");
  {
    // Codex, #51. Både `viewCounts` och `placeCounts` säger i sina egna kommentarer att
    // en rads siffra är vad klicket visar. Det höll gratis så länge `showDone` var *ett*
    // värde för hela brädan — det aktuella värdet var varje destinations värde. Per vy är
    // det inte det, och att läsa `state.showDone` för en rad man inte står på gör siffran
    // till ett löfte klicket omedelbart bryter. Precis det fel `goToPlace` redan namnger
    // en skärm ner, om att nolla disciplinen när man landar på ett repo.
    const p = await open("", { token: true });
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator('label.fp-toggle[data-key="showDone"]').click();
    await p.waitForTimeout(250);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(150);
    const räknat = (p) => p.evaluate(() => ({
      all: Number((document.querySelector(".focusbtn.focus-all .focus-n") || {}).textContent || 0),
      repo: [...document.querySelectorAll(".chip.repo .n")].map((e) => Number(e.textContent)),
    }));
    const medArkiv = await räknat(p);
    ok(medArkiv.all > 0, `All pucks räknar med arkivet på: ${JSON.stringify(medArkiv)}`);

    await gåTill(p, "Ready");
    const iReady = await räknat(p);
    eq(iReady.all, medArkiv.all,
      "All pucks-raden räknar med sitt eget arkivminne, inte med Readys");
    eq(iReady.repo, medArkiv.repo,
      "och repo-raderna med `all`:s — det är dit de landar, en plats är ingen egen vy");

    // Och löftet infrias: raden sa ett tal, klicket ger det.
    await gåTill(p, "All pucks");
    eq(await p.evaluate(() => document.querySelectorAll(".card").length), medArkiv.all,
      "klicket ger precis så många kort som raden lovade");
  }

  group("det gamla platta formatet läses in en gång, in i All pucks");
  {
    // Annars tappar alla sin nuvarande inställning vid uppgraderingen. In i `all`: det är
    // den vy de gjordes i, eftersom det är brädan man landar på — att så alla sex vore
    // att frysa en olycka till sex minnen, vilket är smittan som tas bort.
    const p = await open("", { token: true });
    await p.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("roadmap-group", "repo");
      localStorage.setItem("roadmap-view", "list");
      localStorage.setItem("roadmap-done", "0"); // ett lagrat "av" är inget minne
    });
    await p.goto(origin + "/index.html");
    await p.waitForSelector(".board");
    await p.waitForTimeout(250);
    eq(url(p), "?group=repo&layout=list", "de gamla nycklarna blev All pucks minne");
    const efter = await p.evaluate(() => ({
      store: JSON.parse(localStorage.getItem("roadmap-display")),
      gamla: ["group", "view", "done"].map((k) => localStorage.getItem("roadmap-" + k)),
    }));
    eq(efter.store, { all: { layout: "list", group: "repo" }, __v: 2 },
      `bara det som skiljer sig från standard: ${JSON.stringify(efter.store)}`);
    eq(efter.gamla, [null, null, null], "och de gamla nycklarna är borta, så inget kan läsa dem igen");

    // Och den smittar inte vidare: migreringen är ett minne för `all`, inte en global
    // preferens under ett nytt namn.
    await gåTill(p, "Ready");
    eq(url(p), "?view=ready", "Ready ärver inget ur migreringen");

    // Kör den inte en andra gång heller. Ett tomt objekt är en riktig store, inte en
    // saknad — annars hade en nollställd vy fått tillbaka sitt gamla minne vid nästa
    // laddning.
    await gåTill(p, "All pucks");
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByRole("button", { name: /Reset to default/ }).click();
    await p.waitForTimeout(300);
    await p.goto(origin + "/index.html");
    await p.waitForSelector(".board");
    await p.waitForTimeout(250);
    // `?layout=list`, inte `""`: Reset återställer inte längre vytypen (se gruppen nedan),
    // så det migrerade som ska vara borta är *grupperingen*. Beviset är oförändrat — hade
    // migreringen kört en andra gång vore `group=repo` tillbaka — men strängen flyttade med
    // regeln, och att inte flytta den hade varit att låta en check koda ett övergivet
    // beteende.
    eq(url(p), "?layout=list", "det migrerade kommer inte tillbaka vid nästa laddning");
  }

  group("layouten är inte en display-ändring, varken för pricken eller för Reset");
  {
    // Rapporterat: pricken tändes av board → list. Layouten är inget *arrangemang* av
    // brädan utan ett val om hur man läser den — menyn säger det redan med sin form, en
    // segmentkontroll överst, ovanför och skild från fältraderna. Filen medgav det när
    // displayen blev per vy ("den som läses som en inställning om enheten") och behöll den
    // ändå, bara för att de inbyggda vyerna inte skulle skilja sig från de sparade i exakt
    // en nyckel.
    //
    // Pricken och Reset är *ett* beslut, inte två: koden skriver ut invarianten själv en
    // rad ner — "annars skulle Reset to default ändra något pricken nyss kallade förval".
    // Kontrollen mäter därför bägge, och sabotaget måste fälla bägge halvorna var för sig.
    const prick = (p) => p.evaluate(() => !document.getElementById("displayDot")?.hidden);

    const p = await open("");
    eq(await prick(p), false, "förvalsbrädet: ingen prick");

    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByText("List", { exact: true }).click();
    await p.waitForTimeout(300);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(150);
    eq(url(p), "?layout=list", "layouten står i länken");
    eq(await prick(p), false, "men tänder inte pricken");

    // En riktig display-ändring gör det fortfarande.
    await välj(p, "Grouping", "Repo");
    eq(url(p), "?group=repo&layout=list", "grupperingen står också i länken");
    eq(await prick(p), true, "och den tänder pricken");

    // Och Reset släpper grupperingen men behåller vytypen.
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".dp-reset").click();
    await p.waitForTimeout(300);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(150);
    eq(url(p), "?layout=list", "Reset behåller layouten och slänger grupperingen");
    eq(await prick(p), false, "och pricken slocknar med den");
  }

  group("ett layoutbyte i en öppen meny gör om nivån, inte bara växlarna");
  {
    // Codex P2. `groupOffered` läser `state.view` sedan None togs bort från brädet, och
    // layout-återanropet ritade bara om helhetsväxlarna. Undermenyn klarar sig — nivå 2
    // kallar `f.options()` när man går *in* i den — men den här nivåns rader ritas en gång,
    // och deras värde är `displayLabel(f)`. Mätt: stod man i listan under `group=none` och
    // tryckte Board sa raden `Grouping · None` över en bräda som ritade Now / Next / Later.
    // En meny som påstår en gruppering brädan inte ritar är samma fel som den saknade `✕`
    // i sorteringsmenyn finns för att förhindra, en nyckel bort.
    const p = await open("?layout=list&group=none", { token: true });
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    const rad = () => p.evaluate(() => {
      const r = [...document.querySelectorAll(".dp-row")].find((e) => /Grouping/.test(e.textContent));
      return r ? r.textContent.replace(/\s+/g, " ").trim() : null;
    });
    eq(await rad(), "GroupingNone", "i listan säger raden None");

    await p.locator(".pop, .sheet").getByText("Board", { exact: true }).click();
    await p.waitForTimeout(350);
    eq(await rad(), "GroupingStatus", "efter Board säger den vad brädan ritar");
    eq(await p.evaluate(() =>
      [...document.querySelectorAll(".board > .column:not(.hidden-cols) .col-head h2")]
        .map((e) => e.textContent.trim())), ["Now", "Next", "Later"],
      "och brädan ritar det");

    // Ombyggnaden kostar den tryckta knappen sin fokus, så den läggs tillbaka — på den
    // knapp `segmented()` faktiskt märker, inte på ett `data-value` hjälparen inte sätter.
    eq(await p.evaluate(() => {
      const a = document.activeElement;
      return { text: a && a.textContent.trim(), iSegmentet: !!(a && a.closest && a.closest(".dp-seg")) };
    }), { text: "Board", iSegmentet: true }, "och fokus står kvar på segmentet man tryckte");
    await p.keyboard.press("Escape");
  }

  group("växeln definierar ordet märkena använder");
  {
    // Det finns ingen `archived`-status — `TERMINAL` är `done` eller `cancelled` — så
    // märkena ("137 archived 👁") namnger en kategori datan inte har. Växeln är det enda
    // stället som kan definiera den, och gör det nu, så varje märke kan stanna kort och
    // ändå gå att slå upp.
    const p = await open("");
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    const rad = await p.evaluate(() => {
      const r = document.querySelector('label.fp-toggle[data-key="showDone"]');
      const cb = r && r.querySelector("input");
      const byId = (a) => {
        const id = cb && cb.getAttribute(a);
        const e = id && document.getElementById(id);
        return e ? e.textContent.trim() : null;
      };
      // Null-tåligt hellre än direkt uppslag: backar man till en tooltip finns hint-noden
      // inte, och en kontroll som kastar säger inte vad den såg — den säger bara att den
      // dog. Diffen är hela poängen med att sabotera.
      const txt = (sel) => { const e = r.querySelector(sel); return e ? e.textContent.trim() : null; };
      return {
        namn: txt(".fp-toggle-name"),
        synligHint: txt(".fp-toggle-hint"),
        // Fyndet: en `title` når varken en telefon eller en skärmläsare, och arket *är*
        // telefonen. Namnet måste dessutom smalnas av uttryckligen — en label som lindar
        // sin kontroll lämnar över all sin text, så utan `aria-labelledby` blir det
        // tillgängliga namnet "Show archived Done and cancelled pucks.", vilket är
        // parentesen tillbaka och uppläst varje gång.
        aNamn: byId("aria-labelledby"),
        aBeskrivning: byId("aria-describedby"),
        tooltip: r.title,
      };
    });
    eq(rad, {
      namn: "Show archived",
      synligHint: "Done and cancelled pucks.",
      aNamn: "Show archived",
      aBeskrivning: "Done and cancelled pucks.",
      tooltip: "",
    }, "namnet är namnet, definitionen är en egen rad — synlig utan hover och uppläst som beskrivning");
    await p.keyboard.press("Escape");
  }
}
