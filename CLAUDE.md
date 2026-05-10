# Veni Vidi Viz — Documento di analisi del sito

> **Scopo del documento:** definire in modo univoco cosa va costruito, con quali dati, con quali interazioni e in che ordine. Questo documento è l'input ufficiale per l'implementazione (fase Claude Code). Tutte le decisioni qui dentro sono già discusse e validate dal team — l'implementatore deve seguirle, non re-discuterle.

---

## ⚠️ ISTRUZIONI CRITICHE PER L'AGENTE

**Prima di toccare qualsiasi codice, l'agente deve:**

1. **Ispezionare il codebase esistente.** Il sito è già parzialmente costruito. I grafici 1, 2, 3 sono implementati. Leggi tutta la struttura del progetto (`index.html`, `css/`, `js/`) prima di scrivere una sola riga.
2. **Adattarsi allo stile esistente.** Non riscrivere da zero ciò che funziona. Estendi pattern e convenzioni già presenti nel codice.
3. **Scaricare i dataset** seguendo le istruzioni del §10. I link sono diretti e funzionanti — usa `curl` o `wget` per scaricarli nella cartella `/data/raw/`. Non chiedere all'utente di farlo manualmente.
4. **Eseguire il preprocessing** prima di toccare i grafici. I dati grezzi vanno in `/data/raw/`, i dati pronti per i grafici in `/data/processed/`.
5. **Lavorare in ordine di sprint** (§12). Non saltare avanti.

---

## 0. Sommario esecutivo

- **Tesi:** Dove il reddito è basso e l'istruzione fallisce, l'infanzia paga il prezzo più alto: lavoro minorile, matrimoni precoci, vite spezzate. Quando il contesto non offre più niente, l'unica via d'uscita è la migrazione.
- **Format:** sito web a scroll verticale normale, 10 grafici interattivi suddivisi in 4 atti narrativi.
- **Pattern visivo (v3 — semplificato):** layout a due colonne per ogni sezione grafico — testo a sinistra (sempre visibile, nel normale flusso del documento), grafico sticky a destra. Niente overlay card, niente slide-mode, niente custom scroll container. Lo scroll è quello nativo del browser.
- **Stack:** HTML5 + CSS3 + Vanilla JS (ES6+), D3.js v7. Nessun framework. Niente scrollama.
- **Mobile:** fuori scope per questa iterazione.
- **Stato attuale:** grafici 1, 2, 3 già implementati. L'agente deve integrare i grafici 4–10 nel codebase esistente.
- **Dati:** scaricati dall'agente via link diretti in `/data/raw/`, preprocessati in `/data/processed/` (lista completa al §10).

### ⚠️ DECISIONE DI DESIGN — Luglio 2025
Il sistema scrollytelling complesso (slide-mode, overlay card fisso, setActiveStage con animazioni) è stato **rimosso** perché instabile e difficile da debuggare. Il nuovo approccio è:
- Testo sempre visibile nel flusso normale del documento
- Grafico sticky CSS-only (`position: sticky`) nella colonna destra
- Niente JS per mostrare/nascondere card o grafici
- Progress bar aggiornata con `window.scrollY` (non custom scroll container)


---

## 1. Tesi narrativa

### 1.1 Frase tesi
> *Dove il reddito è basso e l'istruzione fallisce, l'infanzia paga il prezzo più alto: lavoro minorile, matrimoni precoci, vite spezzate. Quando il contesto non offre più niente, l'unica via d'uscita è andarsene.*

### 1.2 Argomentazione in 4 atti
1. **Atto I — Il contesto.** Il mondo non parte uguale: il reddito si concentra in poche regioni, e con esso anche la longevità.
2. **Atto II — La barriera.** Dove c'è meno reddito si investe meno in istruzione, e l'istruzione che c'è funziona peggio. Generazioni intere restano indietro.
3. **Atto III — Il costo umano.** Il prezzo di questo divario lo pagano i bambini: lavoro precoce, matrimoni infantili, perdita di scuola.
4. **Atto IV — La fuga.** Chi può, parte. I paesi di origine restano più poveri di prima.

### 1.3 Cosa NON è il progetto (scope guard)
- Non è uno studio causale (correlazioni, non causalità).
- Non propone soluzioni politiche.
- Non si focalizza solo sui bambini: il taglio è generalista, ma i bambini sono un *focal point* ricorrente perché incarnano il costo umano.

---

## 2. Target geografico e temporale

### 2.1 Strategia
**Vista globale di default in tutti i grafici** (continenti o tutti i paesi). Nei testi narrativi e nelle annotazioni si usano **paesi di riferimento** ricorrenti per dare concretezza alla storia.

### 2.2 Paesi di riferimento (per le citazioni nei testi)
- **Benchmark alti:** Norvegia, Germania.
- **Benchmark medi:** Italia, Brasile.
- **Casi critici:** Niger, Ciad, Bangladesh, Afghanistan.

Questi 8 paesi vanno menzionati ricorrentemente nelle card di testo per creare riconoscibilità. Nei grafici interattivi, l'utente può comunque selezionare qualsiasi altro paese.

### 2.3 Finestra temporale
**2000–2024** come default per le serie temporali. Dove il dato non arriva al 2024, si usa l'anno più recente disponibile e si esplicita nel grafico.

---

## 3. Stack tecnologico

### 3.1 Tecnologie scelte
- **HTML5** — markup semantico (`<section>`, `<article>`, `<figure>`).
- **CSS3** — vanilla, con CSS custom properties (variabili) per design tokens. **Nessun framework CSS.**
- **JavaScript ES6+** — vanilla, organizzato in moduli (`type="module"`).
- **D3.js v7** — unica libreria per la visualizzazione. Non si usa Chart.js, Plotly o altre librerie alto-livello.
- **scrollama** — engine di scrollytelling (intersection observer wrapper, ~3KB).
- **d3-sankey** — plugin separato di D3, serve per i grafici 8 e 10.
- **topojson-client** — per parsing del world atlas (grafici 2 e 10).

### 3.2 Tecnologie escluse esplicitamente
- ❌ React, Vue, Svelte o qualsiasi framework JS.
- ❌ Bootstrap, Tailwind, Bulma o qualsiasi framework CSS.
- ❌ jQuery.
- ❌ Build tool complessi (Webpack, Vite con plugin custom).

### 3.3 Setup di sviluppo
- **Server di sviluppo:** `npx live-server` o `python3 -m http.server` per servire i file localmente.
- **Distribuzione:** cartella statica, deployabile su GitHub Pages o Netlify senza build.
- **Dipendenze:** caricate da CDN via `<script type="module">` con import map, oppure scaricate localmente in `vendor/`.

### 3.4 CDN suggeriti
```html
<!-- in <head> -->
<script type="importmap">
{
  "imports": {
    "d3": "https://cdn.jsdelivr.net/npm/d3@7/+esm",
    "d3-sankey": "https://cdn.jsdelivr.net/npm/d3-sankey@0.12/+esm",
    "topojson-client": "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm",
    "scrollama": "https://cdn.jsdelivr.net/npm/scrollama@3/+esm"
  }
}
</script>
```

---

## 4. Architettura del sito

### 4.1 Struttura cartelle

> L'agente deve ispezionare la struttura esistente prima di qualsiasi modifica. La struttura sotto è quella target — adattarla a ciò che è già presente nel repo.

```
/
├── index.html                       # ESISTE GIÀ — modificare con cautela
├── css/
│   ├── tokens.css                   # design tokens — variabili CSS
│   ├── base.css                     # reset, base typography
│   ├── layout.css                   # grid scrollytelling + sezioni
│   ├── components.css               # card, controlli, indicatore progresso
│   └── charts.css                   # stili specifici dei chart
├── js/
│   ├── main.js                      # entry point, orchestra scrollama e i chart
│   ├── scrollytelling.js            # engine wrapping di scrollama
│   ├── charts/
│   │   ├── 01-income-multiline.js   # GIÀ IMPLEMENTATO — non toccare
│   │   ├── 02-income-choropleth.js  # GIÀ IMPLEMENTATO — non toccare
│   │   ├── 03-life-dumbbell.js      # GIÀ IMPLEMENTATO — non toccare
│   │   ├── 04-edu-treemap.js        # da implementare
│   │   ├── 05-completion-waffle.js  # da implementare
│   │   ├── 06-literacy-slope.js     # da implementare
│   │   ├── 07-childlabor-bubble.js  # da implementare
│   │   ├── 08-marriage-sankey.js    # da implementare
│   │   ├── 09-trends-multimode.js   # da implementare
│   │   └── 10-migration-chord.js    # da implementare
│   └── utils/
│       ├── dataLoader.js            # caricamento e parsing CSV
│       ├── colorScales.js           # scale di colore condivise
│       └── continents.js            # mapping ISO3 → continente
├── data/
│   ├── raw/                         # file scaricati dall'agente — non modificare
│   └── processed/                   # output dello script di preprocessing
├── scripts/
│   └── preprocess.py                # script di preprocessing (da creare)
└── README.md
```

> **Regola per l'agente:** se un file esiste già con un nome diverso da quello atteso, non crearne un duplicato — adatta i riferimenti nel codice al nome esistente.

### 4.2 Sezioni del sito (top to bottom)
1. **Hero** — titolo, sottotitolo/tesi, scroll prompt.
2. **Atto I — Il contesto** (3 grafici: 1, 2, 3).
3. **Atto II — La barriera** (3 grafici: 4, 5, 6).
4. **Atto III — Il costo umano** (3 grafici: 7, 8, 9).
5. **Atto IV — La fuga** (1 grafico: 10).
6. **About** — 7 card finali (vedi §10).

---

## 5. Sistema di design

### 5.1 Tipografia
- **Display (titoli)**: serif (es. *Playfair Display* o *Source Serif*).
- **Body**: sans-serif neutra (es. *Inter*, *Source Sans Pro*).
- **Mono** (per dati/numeri): mono geometrica (es. *JetBrains Mono*).

### 5.2 Palette
**Base neutra (sempre presente):**
- `--bg`: #fafafa (sfondo)
- `--surface`: #ffffff (card)
- `--ink`: #1a1a1a (testo primario)
- `--ink-muted`: #6b6b6b (testo secondario)
- `--border`: #e5e5e5

**Accenti per atto** (variazioni *molto leggere* dello sfondo, non saturi):
- Atto I — Il contesto: `--accent-1: #4a6fa5` (blu freddo)
- Atto II — La barriera: `--accent-2: #c97c3e` (arancio terra)
- Atto III — Il costo umano: `--accent-3: #b04a4a` (rosso desaturato)
- Atto IV — La fuga: `--accent-4: #5a8a6e` (verde salvia)

**Uso:** lo sfondo della sezione vira di un'inezia verso l'accento dell'atto (es. tinta a 5% di opacity); l'indicatore di progresso usa il colore pieno; nei grafici l'accento è il colore di evidenziazione.

### 5.3 Spacing
Scala su base 8px: `4, 8, 16, 24, 32, 48, 64, 96, 128`.

### 5.4 Layout grid scrollytelling
- **Container:** max-width 1280px, centrato.
- **Grid 12 colonne** desktop:
  - Card di testo: colonne 2–6 (sinistra)
  - Container grafico: colonne 7–12 (destra), `position: sticky; top: 10vh`
- **Altezza minima per "step" di scroll:** 80vh per ogni card di testo (assicura tempo di lettura prima della transizione).

### 5.5 Indicatore di progresso narrativo
- Posizione: fixed top, sottile barra orizzontale a tutta larghezza.
- Visualizza 4 segmenti (uno per atto), ognuno colorato con il proprio accento.
- Il segmento attivo è opaco, gli altri al 30%.
- Click su un segmento → scroll smooth all'inizio dell'atto.

### 5.6 Card di testo (sinistra)
- Sfondo bianco, ombra molto soft (`0 2px 8px rgba(0,0,0,0.04)`).
- Padding interno 32px.
- Border-radius 4px.
- **Card attiva** (in viewport): opacità 100%, leggero scale-up (1.02).
- **Card inattive**: opacità 30%, no scale.
- Transizione: 300ms ease.

---

## 6. Pattern di interazione

### 6.1 Doppia fase per ogni grafico
Ogni sezione di grafico ha due fasi sequenziali:

1. **Fase narrativa** (durante lo scroll della sezione)
   - Grafico sticky a destra.
   - Stati del grafico legati allo scroll (un trigger per ogni card di testo a sinistra).
   - Animazioni di transizione tra stati: 600ms ease-in-out.
   - **Controlli interattivi non visibili**.

2. **Fase esplorativa** (alla fine della sezione, prima del passaggio all'atto successivo)
   - Card di testo finale: "Esplora i dati liberamente" (o simile).
   - I controlli (toggle, filtri, scrubber) appaiono in fade-in sotto/sopra il grafico.
   - L'utente può modificare la vista. Quando scrolla via, i controlli scompaiono e il grafico passa al successivo.

### 6.2 I 5 pattern di interazione disponibili
| Pattern | Quando | Implementazione |
|---|---|---|
| **Mode toggle** (Line ↔ Stacked Area ↔ Streamgraph ↔ 100%) | Stesso dato, encoding diverso | Bottoni segmento. D3 transition tra `area.curve()` diverse. |
| **Dimension filter** (Aggregate / per categoria) | Subset del dato | Radio button. Filtra il dataset, ridisegna. |
| **Temporal scrubber + play** | Vedere evoluzione nel tempo | Slider HTML range + play button. Su input → ridisegna. |
| **Drill-down / aggregation** | Continente → Paese → Livello | Click su elemento → zoom (D3 zoom o filter ricorsivo). |
| **Event annotations** | Layer narrativo su serie temporale | **Non priorità per questa iterazione**, ma struttura il codice per poterle aggiungere dopo. |

### 6.3 Animazioni di scroll
Le animazioni del grafico devono essere **deterministiche**: dato uno step di scroll, lo stato del grafico è univoco. Non usare animazioni cumulative o stateful tra step. Ogni step di scroll chiama una funzione `chart.goToState(stepIndex)` che imposta lo stato finale corretto.

---

## 7. Schede dei 10 grafici

> **Convenzione:** ogni scheda specifica (a) il dato e la fonte, (b) la vista narrativa di default che parte allo scroll, (c) gli stati narrativi sequenziali, (d) i controlli della fase esplorativa.

---

### Grafico 1 — Reddito medio per continente (multi-line) — *GIÀ FATTO*
**Atto:** I · **Tipo:** multi-line chart · **Dato:** GDP per capita o reddito mediano giornaliero, per continente, 2000–2024 · **File:** `01_income-continent.csv`

- **Vista narrativa default:** linee dei 5 continenti, focus su Europa e Africa.
- **Stati narrativi:** (1) tutti i continenti grigi; (2) Europa evidenziata; (3) Africa evidenziata; (4) entrambe evidenziate, area di gap colorata in mezzo.
- **Fase esplorativa:** toggle scala lineare/log; toggle "tutti i continenti / solo Europa+Africa".

---

### Grafico 2 — Reddito per paese (choropleth animata) — *GIÀ FATTO*
**Atto:** I · **Tipo:** choropleth con scrubber temporale · **Dato:** GDP per capita per paese, 1990–2024 · **File:** `02_income-country.csv` + `world-atlas-110m.json`

- **Vista narrativa default:** mappa al 2024, scala di colore in classi di reddito.
- **Stati narrativi:** (1) anno 2000; (2) anno 2010; (3) anno 2024 — il sistema scrolla automaticamente l'anno.
- **Fase esplorativa:** scrubber temporale + play/pause (già implementato).

---

### Grafico 3 — Aspettativa di vita (dumbbell plot) — *GIÀ FATTO*
**Atto:** I · **Tipo:** dumbbell plot · **Dato:** aspettativa di vita per continente/paese, 2000 vs 2023 · **File:** `03_life-expectancy.csv`

- **Vista narrativa default:** dumbbell per continenti, anni 2000 e 2023.
- **Stati narrativi:** (1) solo punto 2000; (2) appare punto 2023 e si tira la linea di guadagno; (3) etichette di guadagno assoluto.
- **Fase esplorativa:** toggle continenti/paesi target; picker dei due anni di confronto.

---

### Grafico 4 — Spesa pubblica in istruzione (treemap ↔ sunburst)
**Atto:** II · **Tipo:** treemap con mode toggle a sunburst · **Dato:** spesa pubblica per istruzione per continente → paese, % di GDP · **File:** `04_education-spending.csv`

- **Vista narrativa default:** treemap globale per continente, area = spesa totale, colore = % di GDP.
- **Stati narrativi:** (1) treemap solo continenti; (2) zoom su Europa, espansione paesi; (3) zoom su Africa, espansione paesi (contrasto).
- **Fase esplorativa:**
  - Toggle Treemap ↔ Sunburst (mode toggle).
  - Toggle metrica: % GDP / USD assoluti / per studente iscritto.
  - Click su continente → drill-down ai paesi.
- **Note tecniche:** D3 `treemap()` + `partition()` (sunburst). Layout calcolato una volta, re-rendering su mode change con transizione.

---

### Grafico 5 — Tasso di completamento scolastico (waffle comparativo)
**Atto:** II · **Tipo:** waffle chart, 4 paesi affiancati · **Dato:** % completamento secondaria superiore, ultimi dati disponibili · **File:** `05_education-completion.csv`

- **Vista narrativa default:** 4 waffle 10×10 affiancati: Norvegia, Italia, India, Niger. Ogni quadratino = 1 bambino su 100.
- **Stati narrativi:** (1) solo Norvegia, popola progressivamente; (2) appaiono Italia e India; (3) appare Niger, gap visivamente shock.
- **Fase esplorativa:**
  - Selettore: l'utente sceglie 4 paesi qualunque dalla lista.
  - Toggle livello: Primaria / Secondaria inferiore / Secondaria superiore.
  - Toggle: Totale / Femmine / Maschi.
- **Note tecniche:** SVG con 100 `<rect>` per waffle. No D3 layout speciale, solo loop.

---

### Grafico 6 — Tasso di alfabetizzazione (slope chart)
**Atto:** II · **Tipo:** slope chart, due punti nel tempo · **Dato:** alfabetizzazione adulti (15+) per paese, 2 anni a scelta dell'utente · **File:** `06_literacy.csv`

- **Vista narrativa default:** slope 2000 → 2020, focus sui paesi target.
- **Stati narrativi:** (1) solo punto 2000; (2) si materializzano i punti 2020 e le linee; (3) evidenziati i paesi che hanno fatto progressi vs quelli stagnanti.
- **Fase esplorativa:**
  - Due slider: anno A e anno B (range 1990–2024).
  - Toggle Adulti (15+) / Giovani (15–24).
  - Toggle Totale / Femmine / Maschi.
- **Note tecniche:** D3 con 2 colonne di punti + linee tra di loro. Calcolare collisioni delle label.

---

### Grafico 7 — Reddito vs lavoro minorile (bubble animato Gapminder)
**Atto:** III · **Tipo:** scatter animato con play/pause · **Dato:** GDP per capita (X) vs % lavoro minorile 5–17 anni (Y), bolle = popolazione 5–17, colore = continente · **File:** `07_child-labor.csv` + `02_income-country.csv` + popolazione

- **Vista narrativa default:** scatter al 2000, gioca automaticamente fino al 2020 durante lo scroll della sezione.
- **Stati narrativi:** (1) anno 2000 fermo; (2) play partito, anno 2010; (3) anno 2020, alcune scie di paesi visibili.
- **Fase esplorativa:**
  - Scrubber temporale + play/pause/reset.
  - Toggle: % lavoro minorile / numero assoluto.
  - Click su una bolla → la "scia" temporale del paese rimane visibile.
  - Filtro continente.
- **Note tecniche:** **Grafico più complesso del progetto.** D3 scales lineari/log, transition `t.duration(800)` per ogni step temporale. Trail = polilinea SVG con opacità decrescente. Pre-processare i dati in formato `{country, year, x, y, size}`.

---

### Grafico 8 — Matrimoni precoci (Sankey diagram)
**Atto:** III · **Tipo:** Sankey/Alluvial · **Dato:** flussi 100 ragazze → sposate prima dei 18 → sposate prima dei 15 → con figli prima dei 18 · **File:** `08_child-marriage.csv`

- **Vista narrativa default:** Sankey per Africa Sub-sahariana.
- **Stati narrativi:** (1) solo "100 ragazze"; (2) appare il primo livello (sposate <18); (3) appare il secondo livello (<15); (4) appare il terzo livello (con figli <18).
- **Fase esplorativa:**
  - Selettore regione: Africa Sub-sahariana / Asia Meridionale / Mondo / paese specifico.
  - Toggle Sankey ↔ Alluvial (visualmente diverso, stesso dato).
  - Toggle % / numeri assoluti.
- **Note tecniche:** Plugin `d3-sankey`. Strutturare i dati come `{nodes: [...], links: [{source, target, value}]}`.

---

### Grafico 9 — Trend multi-indicatore (multi-mode time series)
**Atto:** III · **Tipo:** time series con toggle Line/Stacked Area/Streamgraph/100% · **Dato:** lavoro minorile + matrimoni precoci + bambini fuori scuola, per regione SDG, 1990–2024 · **File:** `09a_child-labor-trends.csv`, `09b_child-marriage-trends.csv`, `09c_out-of-school.csv`

- **Vista narrativa default:** Stacked Area per il dato "bambini fuori scuola" per regione SDG.
- **Stati narrativi:** (1) solo "fuori scuola" stacked area; (2) si aggiunge "lavoro minorile"; (3) si aggiunge "matrimoni precoci"; (4) le tre serie si confrontano.
- **Fase esplorativa:**
  - **Mode toggle (4 modalità):** Line / Stacked Area / Streamgraph / 100% Stacked Area.
  - Filtro indicatore: Lavoro minorile / Matrimoni / Fuori scuola / Tutti e 3.
  - Filtro regione SDG.
- **Note tecniche:** Pattern Luca img 1. D3 `area().curve()` con curve diverse per i 4 mode. `stack()` per i tre stacked. Streamgraph = `stack().offset(stackOffsetWiggle)`.

---

### Grafico 10 — Migrazioni internazionali (Chord ↔ Sankey ↔ Mappa)
**Atto:** IV · **Tipo:** Chord diagram con toggle a Sankey e mappa · **Dato:** stock di migranti per coppia origine-destinazione, aggregato a livello continentale, 1990–2024 · **File:** `10_migration-bilateral.xlsx`

- **Vista narrativa default:** Chord diagram dei flussi continentali al 2024.
- **Stati narrativi:** (1) chord al 1990; (2) chord al 2010; (3) chord al 2024 — visivamente i flussi crescono.
- **Fase esplorativa:**
  - Mode toggle: Chord ↔ Sankey ↔ Mappa con frecce.
  - Scrubber temporale 1990–2024 (intervalli di 5 anni, è il dato disponibile).
  - Filtro per continente di origine / destinazione.
- **Note tecniche:** D3 `chord()` per il diagramma. Per la mappa con frecce: `d3.geoPath` + `d3.line()` con curva. Aggregare il bilaterale 233×233 a 6×6 continenti pre-calcolando.

---

## 8. Mappa narrativa di scrollytelling

Per ogni grafico, le **card di testo a sinistra** sono i trigger di scroll. Ogni card → uno stato del grafico. Convenzione: 3–4 card per grafico, 50–80 parole per card.

**Struttura tipo per ogni grafico:**
1. **Card di apertura** — pone la domanda / introduce il fenomeno (50 parole).
2. **Card di osservazione 1** — dirige lo sguardo verso un primo elemento del grafico (60 parole).
3. **Card di osservazione 2** — sposta lo sguardo, contrasto o approfondimento (60 parole).
4. **Card di chiusura/transizione** — sintesi e ponte verso il grafico successivo. *Qui si sblocca la fase esplorativa* (40 parole + invito a esplorare).

**Transizioni tra atti:** sezione "intermezzo" a tutta larghezza con un titolo grande (es. "II. La barriera"), sfondo nell'accento dell'atto entrante, no grafico. ~50vh di altezza.

---

## 9. Sezione "About" finale

Dopo il grafico 10, una sezione con 7 card (layout grid 2 o 3 colonne). Ogni card è un blocco a sé, navigabile.

1. **Tesi** — 2-3 frasi che sintetizzano l'argomento del progetto.
2. **Fonti dati** — lista con link a tutte le fonti (World Bank, UNESCO UIS, ILO, UNICEF, UN DESA, Our World in Data).
3. **Processo metodologico** — come abbiamo selezionato indicatori, paesi, finestra temporale; come abbiamo gestito i dati mancanti.
4. **Limitazioni note** — onestà metodologica (vedi §12).
5. **Stack tecnologico** — librerie usate, scelte di design.
6. **Team** — nomi, ruoli, contatti.
7. **Crediti & licenze** — citazione dei dataset, link ai repository, licenza del progetto.

---

## 10. Dataset — Download e preprocessing

### 10.1 Istruzioni per l'agente

> **L'agente scarica tutti i file in autonomia.** Non chiedere all'utente di farlo. I link sotto sono diretti e funzionanti.

Procedere in questo ordine:
1. Creare `data/raw/` e `data/processed/` se non esistono.
2. Scaricare ogni file con `curl -L -o data/raw/<filename> "<URL>"`.
3. Per i file ZIP: decomprimere, tenere solo il CSV principale, spostarlo in `data/raw/`.
4. Per i file XLSX: convertire in CSV con lo script Python (pandas `read_excel`).
5. Creare ed eseguire `scripts/preprocess.py` per produrre tutti i file in `data/processed/`.
6. Verificare il numero di righe di ogni output prima di procedere con i grafici.

---

### 10.2 File da scaricare — `data/raw/`

#### Già presenti nel progetto (verificare esistenza, non riscaricate se ok)

| Filename raw | Grafico | URL di download | Formato |
|---|---|---|---|
| `income_raw.csv` | 1, 2 | `https://ourworldindata.org/grapher/daily-mean-income.csv?v=1&csvType=full&useColumnShortNames=false` | CSV |
| `life_expectancy_raw.csv` | 3 | `https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full&useColumnShortNames=false` | CSV |

> **Nota su reddito:** lo stesso file `income_raw.csv` (OWID daily-mean-income) viene usato per **entrambi** i grafici 1 e 2. Il grafico 1 lo aggrega per continente, il grafico 2 lo usa a livello paese. Non usare fonti diverse per i due grafici — la metrica deve essere la stessa.

#### Da scaricare

| Filename raw | Grafico | URL di download | Formato | Note |
|---|---|---|---|---|
| `edu_spending_raw.zip` | 4 | `https://api.worldbank.org/v2/en/indicator/SE.XPD.TOTL.GD.ZS?downloadformat=csv` | ZIP→CSV | Estrarre il file `API_SE.XPD*.csv` |
| `edu_spending_by_level_raw.csv` | 4 | `https://api.uis.unesco.org/api/public/data/indicators/export?indicator=XGOVEXP.IMF&start=2000&end=2025&indicatorMetadata=true&footnotes=true&version=20260507-91260335&format=csv` | CSV | Copertura parziale — OK |
| `edu_completion_raw.csv` | 5 | `https://ourworldindata.org/grapher/completion-rate-of-upper-secondary-education-sdg.csv?v=1&csvType=full&useColumnShortNames=false` | CSV | — |
| `literacy_raw.csv` | 6 | `https://ourworldindata.org/grapher/literacy.csv?v=1&csvType=full&useColumnShortNames=false` | CSV | — |
| `child_labor_raw.csv` | 7, 9 | `https://ourworldindata.org/grapher/children-aged-5-17-engaged-in-labor.csv?v=1&csvType=full&useColumnShortNames=false` | CSV | Usato anche per grafico 9 |
| `child_population_raw.xlsx` | 7 | `https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/EXCEL_FILES/2_Population/WPP2024_POP_F02_1_POPULATION_5-YEAR_AGE_GROUPS_BOTH_SEXES.xlsx` | XLSX→CSV | Tenere solo colonne: `Location`, `ISO3_code`, `Time`, `5-9`, `10-14`, `15-19` |
| `child_marriage_raw.xlsx` | 8, 9 | `https://data.unicef.org/wp-content/uploads/2024/10/Child-marriage-dataset-2024.xlsx` | XLSX→CSV | Usato anche per grafico 9 |
| `out_of_school_raw.csv` | 9 | `https://ourworldindata.org/grapher/out-of-school-children-of-primary-school-age-by-world-region.csv?v=1&csvType=full&useColumnShortNames=true` | CSV | — |
| `migration_bilateral_raw.xlsx` | 10 | `https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/undesa_pd_2024_ims_stock_by_sex_and_origin.xlsx` | XLSX→CSV | Matrice 233×233 paesi |
| `world-atlas-110m.json` | 2, 10 | `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json` | TopoJSON | — |
| `iso3_continent.csv` | tutti | `https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv` | CSV | Mapping ISO3 → continente |

**Stima dimensione totale `data/raw/`:** ~20–30 MB.

---

### 10.3 Script di preprocessing — `scripts/preprocess.py`

L'agente **crea ed esegue** questo script. Usa Python con `pandas` e `openpyxl`.

```bash
pip install pandas openpyxl
python scripts/preprocess.py
```

**Output atteso in `data/processed/`:**

| Filename processed | Grafico | Operazioni chiave |
|---|---|---|
| `01_income_continent.csv` | 1 | Aggrega `income_raw.csv` per continente (media ponderata per popolazione) via `iso3_continent.csv`. Colonne: `continent, year, value` |
| `02_income_country.csv` | 2 | Filtra `income_raw.csv` per anni 2000–2024, aggiunge `iso3` e `continent`. Colonne: `iso3, country, continent, year, value` |
| `03_life_expectancy.csv` | 3 | Pivot per continente, anni 2000 e 2023. Colonne: `continent, year_2000, year_2023, delta` |
| `04_edu_spending.csv` | 4 | Join `edu_spending_raw` + `iso3_continent`. Colonne: `iso3, country, continent, year, pct_gdp` |
| `04b_edu_spending_level.csv` | 4 | Pivot `edu_spending_by_level_raw`. Colonne: `iso3, country, year, level, pct_gdp`. Paesi mancanti: valore `null` |
| `05_edu_completion.csv` | 5 | Dato più recente per paese. Colonne: `iso3, country, continent, year, total, female, male` |
| `06_literacy.csv` | 6 | Reshape. Colonne: `iso3, country, continent, year, adult_total, adult_female, adult_male, youth_total, youth_female, youth_male` |
| `07_bubble.csv` | 7 | Join `income_raw` + `child_labor_raw` + `child_population_raw`. `pop_5_17 = (5-9) + (10-14) + (15-19 × 0.6)`. Colonne: `iso3, country, continent, year, income, child_labor_pct, pop_5_17` |
| `08_child_marriage.csv` | 8 | Aggrega per regione SDG. Colonne: `region, country, year, married_before_18, married_before_15, children_before_18` |
| `09_trends.csv` | 9 | Join dei tre raw, formato long. Colonne: `region, year, indicator, value`. `indicator` ∈ {`child_labor`, `child_marriage`, `out_of_school`} |
| `10_migration.csv` | 10 | Aggrega matrice 233×233 a 6×6 continenti via `iso3_continent`. Colonne: `origin_continent, dest_continent, year, stock` |

Lo script stampa un report al termine:
```
✓ 01_income_continent.csv    — 132 righe
✓ 02_income_country.csv      — 4.800 righe
...
✗ 07_bubble.csv — ERRORE: join fallito, controllare colonna iso3 in child_labor_raw
```

Se un file non viene prodotto correttamente, l'agente diagnostica e corregge prima di procedere ai grafici.

---

## 11. Limitazioni metodologiche note

Da menzionare nella card "Limitazioni" della sezione About:

1. **Metrica reddito unica per grafici 1 e 2.** Si usa il reddito mediano giornaliero OWID (daily-mean-income) per entrambi. È il reddito del "cittadino tipico", non il PIL medio che include profitti e capitale. Alcuni paesi mancano di copertura — mostrati come "N/D" nella choropleth.
2. **Comparabilità del lavoro minorile.** I dati ILO/UNICEF derivano da survey nazionali con strumenti diversi. I confronti tra paesi vanno presi con cautela; i trend regionali sono più affidabili.
3. **Buchi nel treemap istruzione.** Non tutti i paesi riportano la spesa per livello scolastico. Per i paesi mancanti si mostra solo l'aggregato.
4. **Stock vs flussi nelle migrazioni.** UN DESA misura lo stock (persone nate all'estero residenti in un paese), non i flussi annuali. La variazione tra anni è una stima indiretta del movimento.
5. **Matrimoni precoci sotto-rilevati.** I dati riguardano donne 20–24 retrospettivamente. I paesi ad alto reddito spesso non riportano il dato (~0%).
6. **Alfabetizzazione self-reported.** Definizioni e metodologie variano tra paesi. OWID applica armonizzazioni, ma le comparazioni vanno lette con cautela.

---

## 12. Roadmap implementativa consigliata

### ⚡ Punto di partenza — prima di tutto
1. Leggi tutta la struttura del progetto esistente.
2. Scarica i dataset mancanti (§10.2).
3. Crea ed esegui `scripts/preprocess.py` (§10.3).
4. Verifica che tutti i file in `data/processed/` siano corretti.

Solo dopo questi 4 passi, procedere agli sprint.

---

### Sprint 1 — Allineamento fondazioni (sul codebase esistente)
- Verifica e allinea `tokens.css` con il design system del §5 (palette, tipografia, spacing).
- Aggiunge l'indicatore di progresso narrativo (4 segmenti colorati per atto, fixed top, navigabile).
- Verifica che il layout grid scrollytelling sia coerente con le specifiche del §5.4.
- Aggiunge le sezioni "intermezzo" tra gli atti (titolo grande, sfondo accento, 50vh).
- **Non toccare i grafici 1, 2, 3 — solo layout e design system.**

### Sprint 2 — Integrazione Atto I nel pattern scrollytelling
- Crea/aggiorna `js/scrollytelling.js` con il wrapper scrollama.
- Definisce l'API standard per tutti i chart: `init()`, `goToState(n)`, `enableExploration()`, `disableExploration()`.
- Adatta i grafici 1, 2, 3 esistenti all'API standard con stati narrativi definiti in §7.
- Implementa la fase esplorativa per i grafici 1, 2, 3 (toggle, scrubber).
- Valida il flusso completo: hero → atto I → intermezzo → atto II (placeholder).

### Sprint 3 — Atto II
- Grafico 4: treemap + sunburst con drill-down.
- Grafico 5: waffle comparativo.
- Grafico 6: slope chart con picker anni.
- Fase esplorativa per ognuno.

### Sprint 4 — Atto III
- Grafico 7: bubble animato Gapminder — **il più complesso, dedicare più tempo**.
- Grafico 8: Sankey matrimoni.
- Grafico 9: multi-mode time series.

### Sprint 5 — Atto IV + About + polishing
- Grafico 10: Chord migrazioni.
- Sezione About con 7 card.
- Pass di polishing: transizioni tra atti, micro-interazioni, accessibilità base (focus visibile, contrasti AA, skip link).
- Test cross-browser desktop (Chrome, Safari, Firefox, ultime versioni).
- Performance: lazy-load dei dati per atto — non caricare tutti i CSV all'avvio.

---

## 13. Convenzioni di codice

- **Nomenclatura file:** `kebab-case` (es. `02-income-choropleth.js`).
- **Nomi variabili JS:** `camelCase`. Costanti `UPPER_SNAKE`.
- **Classi CSS:** `kebab-case`, BEM dove utile (`chart__axis--muted`).
- **Commenti:** in italiano nei file di logica narrativa, in inglese nei file utility.
- **Moduli ES6:** un export di default per ogni chart. Firma standard:
  ```js
  export default function initChart04({ container, data, onStateChange }) {
    return {
      goToState(stepIndex) { /* ... */ },
      enableExploration() { /* ... */ },
      disableExploration() { /* ... */ },
      destroy() { /* ... */ }
    };
  }
  ```
- **No global state.** Stato per chart locale al modulo.
- **Date come stringhe ISO** (`"2024-01-01"`) o anni come numeri (`2024`), mai oggetti `Date` non necessari.

---

## 14. Definizione di "fatto"

Il progetto è considerato completo quando:
- [ ] I 10 grafici sono implementati e accessibili via scrollytelling.
- [ ] Ogni grafico ha la fase narrativa con almeno 3 stati di scroll.
- [ ] Ogni grafico ha la fase esplorativa con i controlli specificati.
- [ ] L'indicatore di progresso funziona e naviga correttamente.
- [ ] La sezione About è popolata con tutte le 7 card.
- [ ] Il sito carica in <3s su connessione standard.
- [ ] Nessun errore in console.
- [ ] Funziona su Chrome, Safari, Firefox (ultime versioni) su desktop.
- [ ] I testi delle card sono scritti (non lorem ipsum).

---

*Fine del documento. Aggiornare questo file se cambiano scope, fonti o decisioni di design.*