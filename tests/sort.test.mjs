// Ordningen är en kedja av nycklar, inte ett läge. `sort=priority,target,updated-desc`
// går igenom nycklarna i tur och ordning tills en av dem svarar — så manuell rank blir
// *en nyckel bland andra* i stället för det enda läge som utesluter resten. Klagomålet
// var att `order:` känns klumpig; den var det för att den var förvalet man inte kunde
// kombinera med något, inte för att idén var fel.
//
// Kontrollerna nedan är tre: att kedjan faktiskt kedjar (nyckel två avgör där nyckel ett
// är lika), att de nio gamla lägena ritar samma tavla som förut (de ligger i länkar och
// sparade vyer som redan är skickade), och att menyn bygger kedjan.
import { group, eq, ok } from "./assert.mjs";

const titlar = (p) => p.evaluate(() =>
  [...document.querySelectorAll(".list-row .list-name")].map((e) => e.textContent.trim()));
const url = (p) => new URL(p.url()).search;

// Fyra puckar med avsiktligt överlappande fält: `priority` skiljer två par åt, och inom
// varje par pekar `order`, `updated` och titeln åt *olika* håll. Det sista är inte pynt —
// första versionen gav rank 10 åt samma puck som titeln satte först, så `priority,order`
// och `priority,title` ritade samma rad och kontrollen kunde inte se vilken nyckel som
// avgjorde. En fixtur där nycklarna sammanfaller mäter ingenting.
const fyra = (d) => {
  const bas = d.items[0];
  d.items = [
    { ...bas, id: "r/d", slug: "d", title: "D", status: "now", priority: "high",   order: 10, updated: "2026-01-04", created: "2026-01-01", target: null, parent: null, parentRef: null, children: [], depends: [], blockedBy: [], blocks: [], signals: [], tags: [] },
    { ...bas, id: "r/c", slug: "c", title: "C", status: "now", priority: "high",   order: 20, updated: "2026-01-03", created: "2026-01-02", target: null, parent: null, parentRef: null, children: [], depends: [], blockedBy: [], blocks: [], signals: [], tags: [] },
    { ...bas, id: "r/b", slug: "b", title: "B", status: "now", priority: "low",    order: 10, updated: "2026-01-02", created: "2026-01-03", target: null, parent: null, parentRef: null, children: [], depends: [], blockedBy: [], blocks: [], signals: [], tags: [] },
    { ...bas, id: "r/a", slug: "a", title: "A", status: "now", priority: "low",    order: 20, updated: "2026-01-01", created: "2026-01-04", target: null, parent: null, parentRef: null, children: [], depends: [], blockedBy: [], blocks: [], signals: [], tags: [] },
  ];
  return d;
};

export async function run({ open }) {
  group("nyckel två avgör där nyckel ett är lika");
  {
    // Själva poängen. Med bara `priority` faller de lika paren igenom till titeln (kedjans
    // avslutning), och lägger man `order` efter den avgör den inom varje par i stället.
    // Att bägge kedjorna ritas av *samma* fyra puckar är vad som gör skillnaden till ett
    // svar om kedjan och inte om datan.
    const ettLed = await open("?layout=list&sort=priority", { data: fyra });
    eq(await titlar(ettLed), ["C", "D", "A", "B"],
      "bara priority: paren faller igenom till titeln");

    const tvåLed = await open("?layout=list&sort=priority,order", { data: fyra });
    eq(await titlar(tvåLed), ["D", "C", "B", "A"],
      "priority,order: order avgör inom varje prioritet (10 före 20)");

    // Och ordningen mellan nycklarna är betydelsen, inte en uppsättning: vänder man på
    // kedjan byter tavlan skepnad helt.
    const vänt = await open("?layout=list&sort=order,priority", { data: fyra });
    eq(await titlar(vänt), ["D", "B", "C", "A"],
      "order,priority: rank först, prioritet inom varje rank");
  }

  group("en nyckel avgör bara om sig själv — resten är kedjans");
  {
    // `byDate` avslutade sina egna oavgjorda med titeln. En nyckel som gör det kan aldrig
    // stå först i en kedja, för då nås aldrig nyckeln bakom. Två puckar med samma datum
    // och olika rank är exakt det fallet.
    const sammaDag = (d) => {
      const f = fyra(d);
      f.items.forEach((i) => { i.updated = "2026-01-01"; });
      return f;
    };
    const p = await open("?layout=list&sort=updated-desc,order", { data: sammaDag });
    eq(await titlar(p), ["B", "D", "A", "C"],
      "samma datum överallt → order avgör, inte titeln");
  }

  group("de nio gamla lägena ritar samma tavla som förut");
  {
    // De ligger i länkar som kan vara skickade och i sparade vyer som kan vara committade.
    // Sex av nio var redan en enda nyckel under samma stavning; tre var kedjor skrivna som
    // ett ord, och de skrivs ut. `sort=default` *var* "order först, sedan updated".
    const fall = [
      ["default", "order,updated-desc"],
      // `priority` och `status` är nyckelnamn, så de expanderar *inte* — se `LEGACY_SORT`.
      // Deras gamla andra nyckel blir kedjans egen avslutning, titeln. Det är priset för
      // att kedjan `priority` alls ska gå att skriva ner, och det kostar ingenting här: den
      // här brädans sparade vyer bär inget `sort` alls.
      ["priority", "priority"],
      ["status", "status"],
      ["target", "target"],
      ["title", "title"],
      ["updated-desc", "updated-desc"],
      ["updated-asc", "updated-asc"],
      ["created-desc", "created-desc"],
      ["created-asc", "created-asc"],
    ];
    for (const [gammal, kedja] of fall) {
      const p = await open("?layout=list&sort=" + gammal, { data: fyra });
      const ut = await p.evaluate(() => new URLSearchParams(location.search).get("sort"));
      // `default` är standarden, så den skrivs inte ut i URL:en alls — det är samma regel
      // som gäller varje display-nyckel.
      eq(ut, kedja === "order,updated-desc" ? null : kedja,
        `${gammal} → ${kedja}`);
    }

    // Och det gäller åt bägge håll: ett *ord* expanderas, men samma ord inuti en kedja är
    // nyckeln det namnger. Annars hade `priority,target` smugit in `updated` mellan dem.
    const p = await open("?layout=list&sort=priority,target", { data: fyra });
    eq(await p.evaluate(() => new URLSearchParams(location.search).get("sort")), "priority,target",
      "inuti en kedja är `priority` nyckeln, inte det gamla läget");
  }

  group("en okänd nyckel faller bort, en tom kedja finns inte");
  {
    // Samma regel som `parseProps`: en lagrad kedja från en nyare tavla får inte jämföras
    // olika mot den som faktiskt ritas. Och kedjan kan aldrig tömmas — `parseSort` svarar
    // med standarden — så menyn aldrig visar en kedja tavlan inte följer.
    const p = await open("?layout=list&sort=priority,ingenting", { data: fyra });
    eq(await p.evaluate(() => new URLSearchParams(location.search).get("sort")), "priority",
      "namnet tavlan inte känner stryks");
    const tom = await open("?layout=list&sort=ingenting-alls", { data: fyra });
    eq(await tom.evaluate(() => new URLSearchParams(location.search).get("sort")), null,
      "och en kedja utan giltiga nycklar är standarden, inte tomhet");
  }

  group("menyn bygger kedjan, och ordningen är dess innehåll");
  {
    const p = await open("", { data: fyra, token: true });
    const öppna = async () => {
      await p.locator("#displayBtn").click();
      await p.waitForSelector(".pop, .sheet");
      await p.locator(".pop, .sheet").getByText("Ordering", { exact: true }).click();
      await p.waitForTimeout(200);
    };
    await öppna();
    const start = await p.evaluate(() =>
      [...document.querySelectorAll(".dp-chain-label")].map((e) => e.textContent.trim()));
    eq(start, ["Manual", "Recently updated"], "standarden står utskriven som två nycklar");

    // Att välja en nyckel lägger till den sist — den bryter de oavgjorda de ovanför lämnar.
    await p.locator(".pop, .sheet").getByText("Priority (high→low)", { exact: true }).click();
    await p.waitForTimeout(250);
    eq(url(p), "?sort=order,updated-desc,priority", "vald nyckel hamnar sist i kedjan");

    // `↑` flyttar upp den, och det är den enda vägen till en annan ordning: en kryssruta
    // kan säga att `priority` är med, aldrig att den kommer före `updated`.
    await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".dp-chain")];
      rows[2].querySelector(".dp-chain-act").click(); // första knappen på raden är ↑
    });
    await p.waitForTimeout(250);
    eq(url(p), "?sort=order,priority,updated-desc", "↑ flyttar nyckeln uppåt i kedjan");

    // Och `✕` tar bort — utom på den sista kvarvarande, för `parseSort` svarar med
    // standarden på en tom kedja och menyn får aldrig visa en kedja tavlan inte följer.
    const kvar = await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".dp-chain")];
      return { rader: rows.length, knappar: rows.map((r) => r.querySelectorAll(".dp-chain-act").length) };
    });
    eq(kvar.rader, 3, "tre nycklar i kedjan");
    eq(kvar.knappar, [1, 2, 2], "första raden har ingen ↑ — den är redan överst");
  }

  group("den sista nyckeln kan inte tas bort");
  {
    const p = await open("?layout=list&sort=title", { data: fyra, token: true });
    await p.locator("#displayBtn").click();
    await p.waitForSelector(".pop, .sheet");
    await p.locator(".pop, .sheet").getByText("Ordering", { exact: true }).click();
    await p.waitForTimeout(200);
    const en = await p.evaluate(() => {
      const rows = [...document.querySelectorAll(".dp-chain")];
      return { rader: rows.length, knappar: rows[0].querySelectorAll(".dp-chain-act").length };
    });
    eq(en.rader, 1, "en nyckel i kedjan");
    eq(en.knappar, 0,
      "och den har varken ↑ eller ✕ — en kontroll som bara misslyckas när man trycker är inte spärrad, den är dekorerad");
  }

  // Ingen kontroll för `manualRank()` här, och det är avsiktligt: dess enda konsument är
  // rank-släppet *inom* en kolumn, som bara finns som en `dragover`-lyssnare — det syns
  // inte i DOM:en utan en riktig dragning. `draggable` mäter kolumn-släppet, som skriver
  // `status` och enligt pucken inte påverkas alls; en kontroll på det hade mätt fel sak.
  // Standardkedjan har `order` först, så brädans befintliga dragkontroller täcker det
  // fallet; grenen där `order` ligger längre ner är en medveten lucka.

  group("datumet som visas är kedjans första datumnyckel");
  {
    // `autoDateField` visar det datum ordningen *handlar om*. Att bara läsa kedjans första
    // nyckel hade svarat "updated" för den vanliga `order,created-desc` — vilket är precis
    // den skenbart skakade kolumnen regeln finns för att förhindra.
    const p = await open("?layout=list&sort=order,created-desc", { data: fyra });
    eq(await p.evaluate(() => document.querySelector(".list-dt .date-tag, .list-dt")?.textContent.trim()),
      "2026-01-03", "created-desc bakom order → skapandedatumet, inte uppdateringen");
  }
}
