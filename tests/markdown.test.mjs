// Vad tavlan lovar att rendera ur en puck-kropp, och vad den lovar att *inte* göra
// med resten. Behöver ingen webbläsare och ignorerar därför kontexten den får.
//
// Måttet som satte omfattningen: 162 puckar (filerna på disk plus snapshotens övriga
// repon) svepta efter varje drag. Tabeller fanns i 17, nästlad emfas i 7, nästlade
// listor i 7, blockcitat i 7, bara URL:er i 4 — allihop trasiga före det här. `---`
// fanns i noll och renderas därför fortfarande som text, men som *egen* rad.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { group, eq, ok } from "./assert.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// renderMd står inte ensam — den delar esc(), mdInline() och tabellreglerna med
// resten av avsnittet — så här lyfts hela avsnittet ut och evalueras, av samma skäl
// som parse.test.mjs lyfter enskilda funktioner: en handkopierad dubblett fortsätter
// vara grön efter att originalet ändrats, vilket är precis det sviten finns för att
// undvika. Flyttas eller döps ankarna om kastar den här med namnet den inte hittade.
async function liftRenderMd() {
  const src = await readFile(ROOT + "app.js", "utf8");
  const head = "  // ── tiny, safe markdown";
  const tail = "  // ── query model";
  const a = src.indexOf(head), b = src.indexOf(tail);
  if (a === -1) throw new Error(`hittade inte "${head}" i app.js`);
  if (b === -1 || b < a) throw new Error(`hittade inte "${tail}" efter markdown-avsnittet i app.js`);
  return new Function(src.slice(a, b) + "\nreturn renderMd;")();
}

export async function run() {
  const renderMd = await liftRenderMd();
  const fixture = await readFile(ROOT + "tests/markdown.fixture.md", "utf8");
  const html = renderMd(fixture);
  // Utan mellanslag är det enklare att skriva förväntningar som inte handlar om
  // var radbrytningarna råkar hamna.
  const flat = html.replace(/\n/g, "");
  // Mätt per stycke, för flera av kontrollerna handlar om att ett stycke inte svalde
  // något som skulle stått för sig självt.
  const avkoda = (t) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const paras = (flat.match(/<p>[\s\S]*?<\/p>/g) || [])
    .map((p) => avkoda(p.replace(/<[^>]+>/g, "")).trim());

  group("emfas");
  {
    ok(flat.includes("<strong>fet med <em>kursiv</em> inuti</strong>"),
      "nästlad emfas blir nästlade taggar, inte asterisker på skärmen");
    ok(!/\*\*/.test(flat.replace(/<code>[^<]*<\/code>/g, "")),
      "inga kvarlämnade ** utanför kodspann");
    ok(flat.includes("<code>**inte fet**</code>"), "** inuti ett kodspann rörs inte");
    ok(flat.includes("<code>*inte kursiv*</code>"), "* inuti ett kodspann rörs inte");
  }

  group("länkar");
  {
    ok(flat.includes('<a href="https://roadmap.tor2dbear.com" target="_blank" rel="noopener">tavlan</a>'),
      "en skriven länk ser ut som förr");
    ok(flat.includes('<a href="https://roadmap.tor2dbear.com/" target="_blank" rel="noopener">https://roadmap.tor2dbear.com/</a>'),
      "en bar URL blir en länk");
    ok(flat.includes('>https://example.com/a</a>.'),
      "punkten efter en bar URL hamnar utanför länken");
    ok(flat.includes("<code>https://inte-en-lank.example</code>"),
      "en URL i ett kodspann länkas inte");
    // Den här missen är osynlig i utseendet och syns bara i href:en.
    eq((flat.match(/href="https:\/\/roadmap\.tor2dbear\.com"/g) || []).length, 1,
      "den skrivna länkens href länkas inte en andra gång");
  }

  group("listor");
  {
    ok(flat.includes("<li>Andra punkten, mjukbruten över två rader</li>"),
      "en mjukbruten punkt blir en punkt");
    ok(/<li>Tredje punkten<ul><li>En nivå in<\/li><li>Och en till på samma nivå<ul><li>Två nivåer in<\/li><\/ul><\/li><\/ul><\/li>/.test(flat),
      "indenterade punkter blir nästlade listor, inte syskon");
    ok(flat.includes("<li>Tillbaka på toppnivån</li>"),
      "och nivån tas tillbaka efteråt");
    ok(/<li>Två<ul><li>En osorterad under en sorterad<\/li><\/ul><\/li>/.test(flat),
      "en osorterad lista nästlas under en sorterad");
    ok(flat.includes('<ol start="3">'), "en lista som återupptar vid tre gör det");
    // Öppnade och stängda taggar ska gå jämnt ut — en nästlad lista är lätt att
    // stänga en gång för lite och då tar resten av sidan plats inne i listan.
    for (const tag of ["ul", "ol", "li", "p", "blockquote", "table"]) {
      eq((flat.match(new RegExp("<" + tag + "[ >]", "g")) || []).length,
        (flat.match(new RegExp("</" + tag + ">", "g")) || []).length,
        `<${tag}> öppnas och stängs lika många gånger`);
    }
  }

  group("kodblock");
  {
    const pre = /<pre><code>([\s\S]*?)<\/code><\/pre>/.exec(flat);
    ok(pre && pre[1].includes("| en tabellrad i ett kodblock |"),
      "en tabellrad i ett kodblock förblir text");
    ok(pre && pre[1].includes("&gt; ett blockcitat i ett kodblock"),
      "ett blockcitat i ett kodblock förblir text");
    ok(pre && pre[1].includes("**inte fet**"),
      "emfas i ett kodblock förblir text");
  }

  group("tabeller");
  {
    ok(flat.includes('<div class="md-table"><table><thead><tr><th>Drag</th>'),
      "rubrikraden blir th i en egen scroll-låda");
    ok(flat.includes('<th style="text-align:right">Förekomster</th>'),
      "---: ger högerställd kolumn");
    ok(flat.includes('<th style="text-align:center">Status</th>'),
      ":---: ger centrerad kolumn");
    ok(flat.includes("<td><code>nästlad emfas</code></td>"),
      "inline-markdown fungerar i en cell");
    ok(flat.includes('<td style="text-align:right">17</td>'),
      "kroppscellerna ärver kolumnens ställning");
    ok(flat.includes("<th></th><th></th>"),
      "den tomma rubrikformen | | | blir två tomma rubrikceller");
    ok(flat.includes("<td>fixturens ålder</td>"),
      "och dess kropp blir rader");
    eq((flat.match(/<table>/g) || []).length, 2, "exakt två tabeller — den tredje är ingen tabell");
  }

  group("det vi inte renderar blir platt, inte hopklistrat");
  {
    // Regressionen som startade allt: varje rad som inte kändes igen föll i
    // paragrafbufferten, som fogar ihop mjukbrutna rader med mellanslag — så en hel
    // tabell blev en mening. Mätt per stycke, för det är stycket som var för långt;
    // att platta ut taggarna till text först hade tagit bort just den gränsen.
    ok(paras.includes("| a | b |") && paras.includes("| c | d |"),
      "en tabell utan avgränsarrad står kvar en rad per stycke");
    ok(!paras.some((p) => p.includes("| a | b |") && p.includes("| c | d |")),
      "och aldrig två rader i samma stycke");
    ok(flat.includes("<blockquote>Ett blockcitat över två rader.</blockquote>"),
      "ett blockcitat blir ett blockcitat, och dess två rader en mening");
    ok(paras.includes("---"),
      "en tematisk brytning står kvar som text, men på egen rad");
    ok(!paras.some((p) => p !== "---" && p.includes("---")),
      "och sugs inte in i ett stycke med annan text");
  }

  group("en URL får aldrig bli markup");
  {
    // Hittat av Codex på PR #40, och det var ingen teoretisk träff: `esc()` escapade
    // `&`, `<` och `>` men inte `"`. En bar URL går in i `href="…"` och resultatet går
    // genom `innerHTML`, så ett citattecken i adressen stänger attributet och resten
    // blir markup — på vår origin, där GitHub-token ligger. renderMd ritar dessutom
    // issue-kroppar och kommentarer, så den som skriver URL:en behöver inte vara den
    // som äger tavlan.
    // Mätt på *taggarna*, inte på texten: adressen syns förstås som text i länkens
    // etikett, och en kontroll som bara letar efter strängen fäller på fel sak.
    // Blanksteg räcker inte som avgränsare: angreppet stänger href:en med ett
    // citattecken och skriver `"onpointerenter=` utan mellanrum, så en regex som kräver
    // blanksteg före `on` missar precis det den finns för.
    ok(!/["'\s]on[a-z]+\s*=/i.test(html),
      `ingen tagg bär en händelsehanterare:\n${(html.match(/<a[^>]*>/) || [""])[0]}`);
    ok(html.includes('href="https://safe.example&quot;onpointerenter=&quot;alert"'),
      "citattecknet står escapat inne i href:en i stället för att stänga den");

    ok(flat.includes('>https://example.com/a*b*c</a>'),
      "asterisker i en sökväg äts inte av emfasen — hela adressen är länken");
    ok(!/<em>b<\/em>/.test(flat), "och blir inte kursiv text mitt i URL:en");

    ok(/<a[^>]*><strong>viktigt<\/strong><\/a>/.test(flat),
      "en formaterad etikett i en skriven länk renderas, inte som asterisker");
    ok(/<a[^>]*><code>kod<\/code><\/a>/.test(flat),
      "och ett kodspann i en etikett likaså");
  }

  group("det dokumentationen lovar om det vi inte tolkar");
  {
    // CONVENTION säger att rå HTML och bilder står kvar *på egen rad*. BLOCKISH täckte
    // tabellrader, blockcitat och brytningar och stannade precis där texten fortsatte.
    ok(paras.some((p) => p === '<div class="inte-en-tagg">'),
      `en rå tagg står ensam i sitt stycke: ${JSON.stringify(paras.filter((p) => p.includes("inte-en-tagg")))}`);
    ok(paras.some((p) => p === "Ett stycke direkt efter."),
      "och raden efter dem börjar ett eget stycke");
    // Bildsyntaxen åt sig själv innan den här: länkregeln matchade `[alt](url)` inuti
    // `![alt](url)` och lämnade ett ensamt `!` framför en länk till bildfilen.
    ok(paras.some((p) => p === "![en bild](https://example.com/b.png)"),
      `en bild står kvar precis som den skrevs: ${JSON.stringify(paras.filter((p) => p.includes("bild")))}`);
    ok(!paras.some((p) => p.includes("inte-en-tagg") && p.includes("bild")),
      "och de två klistras inte ihop med varandra eller med stycket efter");
  }

  group("escaping");
  {
    ok(!/<script/i.test(html), "en tagg i brödtexten blir aldrig en tagg");
    ok(flat.includes("&lt;script&gt;"), "den syns som text");
    ok(flat.includes("A &amp; B"), "en ampersand escapas");
    // Kommentaren överst i fixturen är HTML och ska synas, inte försvinna: det är
    // beviset för att esc() kommer först.
    ok(flat.includes("&lt;!--"), "en HTML-kommentar renderas som text");
  }
}
