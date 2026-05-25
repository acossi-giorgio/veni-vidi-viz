# Veni Vidi Viz — Documento di analisi del sito

> **Scopo del documento:** definire in modo univoco cosa va costruito, con quali dati, con quali interazioni e in che ordine. Questo documento è l'input ufficiale per l'implementazione (fase Codex). Tutte le decisioni qui dentro sono già discusse e validate dal team — l'implementatore deve seguirle, non re-discuterle.

---

## ⚠️ ISTRUZIONI CRITICHE PER L'AGENTE

**Prima di toccare qualsiasi codice, l'agente deve:**

1. **Ispezionare il codebase esistente.** Il sito è già parzialmente costruito. I grafici 1, 2, 3 sono implementati. Leggi tutta la struttura del progetto (`index.html`, `style.css`, `js/`) prima di scrivere una sola riga.
2. **Adattarsi allo stile esistente.** Non riscrivere da zero ciò che funziona. Estendi pattern e convenzioni già presenti nel codice.
3. **I dati processati esistono già** in `src/datasets/processed/`. Verificarne l'esistenza prima di rigenerarli.
4. **Lavorare in ordine di sprint** (§12). Non saltare avanti.

---

## 0. Sommario esecutivo

- **Tesi:** Il mondo non è diviso tra Nord e Sud — è diviso tra chi nasce con una rete di protezione e chi no. Dove quella rete manca, i bambini cadono per primi. E chi sopravvive, parte.
- **Format:** sito web a scroll verticale normale, 10 grafici interattivi suddivisi in 4 atti narrativi.
- **Pattern visivo (v4 — click-narrative):** layout a due colonne per ogni sezione — testo a sinistra con **narrative card cliccabili**, grafico sticky a destra. Niente overlay, niente slide-mode, niente scroll container custom. Lo scroll è quello nativo del browser.
- **Stack:** HTML5 + CSS3 + Vanilla JS (ES6+), D3.js v7. Nessun framework. **Niente scrollama.**
- **Mobile:** fuori scope per questa iterazione.
- **Stato attuale:** grafici 1, 2, 3 implementati con narrative card. Sprint 2 completato. Grafici 4–10 da implementare.
- **Dati:** in `src/datasets/processed/` (già preprocessati). Raw in `src/datasets/raw/`.

### ⚠️ DECISIONI DI DESIGN — aggiornate a Maggio 2026

Il sistema scrollytelling (scrollama, IntersectionObserver, goToState, slide-mode) è stato **definitivamente rimosso**. Il nuovo pattern è:

- **Narrative card cliccabili** a sinistra: ogni `<div class="narrative-card" data-chart="X" data-state="N">` triggera uno stato del grafico al click.
- Grafico **sticky CSS-only** (`position: sticky`) nella colonna destra — nessun JS muove o nasconde il grafico.
- **Nessuna fase "esplorativa" separata** — i grafici sono sempre interattivi (drill-down, tooltip, slider).
- Progress bar aggiornata con `window.scrollY` (non custom scroll container).
- Logica click in `main.js` → funzione `triggerChartState(chartId, state)` → API su DOM element (`_gdpHighlightContinents`, `_gdpUpdate`, ecc.).

---

## 1. Tesi narrativa

### 1.1 Frase tesi
> *Il mondo non è diviso tra Nord e Sud — è diviso tra chi nasce con una rete di protezione e chi no. Dove quella rete manca, i bambini cadono per primi: lavorano, vengono sposati, muoiono di malattie evitabili. E chi sopravvive, parte.*

### 1.2 Argomentazione in 4 atti

1. **Atto I — La mappa della diseguaglianza.** Non è solo quanto guadagna un paese, ma quanto è disuguale. Un PIL medio può nascondere metà della popolazione sotto la soglia di sopravvivenza. La ricchezza si concentra — e con essa la longevità.

2. **Atto II — La scuola che non funziona.** L'istruzione dovrebbe compensare. Non lo fa. Dove i soldi mancano, la scuola esclude — classi sovraffollate, insegnanti assenti, bambine che non entrano mai. Chi non impara non esce dalla povertà.

3. **Atto III — L'infanzia rubata.** Il prezzo lo pagano i bambini. Lavorano invece di studiare. Le bambine vengono sposate prima dei 18 anni. Le madri adolescenti muoiono di parto. I bambini nati da loro muoiono nel primo anno di vita.

4. **Atto IV — La fuga e il paradosso.** Chi può, parte. Le rimesse tornano — spesso più degli aiuti internazionali. Ma il paese resta povero, svuotato di chi aveva la forza di andarsene. Il cerchio non si chiude.

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
- **Casi critici:** Niger, Ciad, Bangladesh, Afghanistan, Nepal, Lesotho.

Questi paesi vanno menzionati ricorrentemente nelle card di testo per creare riconoscibilità. Nei grafici interattivi, l'utente può comunque selezionare qualsiasi altro paese.

### 2.3 Finestra temporale
**2000–2024** come default per le serie temporali. Dove il dato non arriva al 2024, si usa l'anno più recente disponibile e si esplicita nel grafico.

---

## 3. Stack tecnologico

### 3.1 Tecnologie scelte
- **HTML5** — markup semantico (`<section>`, `<article>`, `<figure>`).
- **CSS3** — vanilla, con CSS custom properties (variabili) per design tokens. **Nessun framework CSS.**
- **JavaScript ES6+** — vanilla, script globali (non ES6 modules per compatibilità con l'esistente).
- **D3.js v7** — unica libreria per la visualizzazione. Non si usa Chart.js, Plotly o altre librerie alto-livello.
- **d3-sankey** — plugin separato di D3, serve per grafico 8.
- **topojson-client** — per parsing del world atlas (grafici 2 e 10).

### 3.2 Tecnologie escluse esplicitamente
- ❌ React, Vue, Svelte o qualsiasi framework JS.
- ❌ Bootstrap, Tailwind, Bulma o qualsiasi framework CSS.
- ❌ jQuery.
- ❌ scrollama o qualsiasi libreria di scrollytelling.
- ❌ IntersectionObserver per triggering narrativo (rimosso).
- ❌ Build tool complessi (Webpack, Vite con plugin custom).

### 3.3 Setup di sviluppo
- **Server di sviluppo:** `npx live-server` o `python3 -m http.server` dalla cartella `src/`.
- **Distribuzione:** cartella statica, deployabile su GitHub Pages o Netlify senza build.
- **Dipendenze:** caricate da CDN via `<script src="...">` classico (non import map).

### 3.4 CDN usati
```html
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson@3"></script>
<!-- d3-sankey aggiunto quando serve grafico 8 -->
```

---

## 4. Architettura del sito

### 4.1 Struttura cartelle (stato reale)

```
src/
├── index.html                    # pagina principale
├── about.html                    # pagina about
├── datasets.html                 # pagina dataset
├── style.css                     # tutto il CSS (unico file)
├── js/
│   ├── main.js                   # entry point: init charts + progress bar + narrative cards
│   └── charts/
│       ├── gdpLineChart.js       # Grafico 1 — GIÀ IMPLEMENTATO
│       ├── gdpMapChart.js        # Grafico 2 — GIÀ IMPLEMENTATO
│       ├── dumbbellChart.js      # Grafico 3 — GIÀ IMPLEMENTATO
│       ├── eduTreemap.js         # Grafico 4 — da implementare
│       ├── qualityScatter.js     # Grafico 5 — da implementare
│       ├── exclusionChart.js     # Grafico 6 — da implementare
│       ├── childLaborBubble.js   # Grafico 7 — da implementare
│       ├── marriageChart.js      # Grafico 8 — da implementare
│       ├── mortalityChart.js     # Grafico 9 — da implementare
│       └── migrationChord.js     # Grafico 10 — da implementare
├── datasets/
│   ├── raw/                      # file originali scaricati (vedere SOURCES.md)
│   ├── clean/                    # file per grafici 1-3
│   └── processed/                # output preprocessing (tutti schema code,country,continent,year,value)
└── images/                       # immagini di sfondo
```

### 4.2 Sezioni del sito (top to bottom)
1. **Hero** — titolo, sottotitolo/tesi, scroll prompt.
2. **Atto I — La mappa della diseguaglianza** (grafici 1, 2, 3).
3. **Atto II — La scuola che non funziona** (grafici 4, 5, 6).
4. **Atto III — L'infanzia rubata** (grafici 7, 8, 9).
5. **Atto IV — La fuga e il paradosso** (grafico 10).
6. **About** — 7 card finali (vedi §9).

---

## 5. Sistema di design

### 5.1 Tipografia
- **Display (titoli)**: Roboto Slab (serif) — già caricato.
- **Body**: Roboto Slab — già caricato.

### 5.2 Palette
**Base neutra:**
- `--bg`: #f7f7f5
- `--surface`: #ffffff
- `--ink`: #1a1a1a
- `--ink-muted`: #5a5a5a
- `--border`: #e0e0e0

**Accenti per atto:**
- Atto I: `--accent-1: #4a6fa5` (blu freddo)
- Atto II: `--accent-2: #c97c3e` (arancio terra)
- Atto III: `--accent-3: #b04a4a` (rosso desaturato)
- Atto IV: `--accent-4: #5a8a6e` (verde salvia)

### 5.3 Spacing
Scala su base 8px: `4, 8, 16, 24, 32, 48, 64, 96, 128`.

### 5.4 Layout sezioni grafico
- **Container:** max-width 1360px, centrato.
- **Grid desktop:** testo a sinistra (2fr), grafico a destra (3fr). Varianti `layout-reversed` (3fr + 2fr) e `layout-stacked` (1 colonna) già definite in CSS.
- **Grafico sticky:** `position: sticky; top: calc(var(--navbar-h) + var(--bar-h) + 1.5rem)`.
- **Chart-box:** altezza `clamp(360px, 55vh, 700px)`.

### 5.5 Indicatore di progresso narrativo
- Fixed top, 4px di altezza, 4 segmenti colorati (uno per atto).
- Segmento attivo = opaco, inattivi al 25%.
- Click su segmento → scroll smooth all'inizio dell'atto.
- Aggiornato con `window.scrollY` nel listener scroll.

### 5.6 Narrative card (sinistra)
- Classe `.narrative-card`, cliccabile, con `data-chart` e `data-state`.
- **Inattiva:** opacity 0.45, nessun bordo.
- **Hover:** opacity 0.85, sfondo leggerissimo.
- **Attiva (`.is-active`):** opacity 1, bordo sinistro 3px nel colore dell'atto corrente.
- Click → `triggerChartState(chartId, state)` in `main.js`.
- Prima card sempre attiva al caricamento (classe `is-active` nell'HTML).

---

## 6. Pattern di interazione

### 6.1 Modello click-narrative
Ogni sezione grafico ha 3 narrative card cliccabili a sinistra. Cliccando su una card:
1. La card diventa `.is-active` (le altre la perdono).
2. `triggerChartState(chartId, state)` aggiorna il grafico destra.
3. Il grafico rimane sempre visibile e interattivo (drill-down, tooltip, slider interni).

Non esiste una "fase esplorativa" separata — i grafici sono sempre completamente interattivi.

### 6.2 API dei grafici (pattern esistente)
I grafici espongono funzioni direttamente sull'elemento DOM (`container._fn`):
- `container._gdpHighlightContinents(arr|null)` — Chart 1
- `container._gdpUpdate(year)`, `container._gdpClearAnimation()`, `container._gdpZoomToWorld/Europe/Africa/Asia()` — Chart 2
- I nuovi grafici devono seguire lo stesso pattern: esporre funzioni sul DOM element.

### 6.3 Pattern di interazione disponibili
| Pattern | Quando | Implementazione |
|---|---|---|
| **Highlight/focus** | Stesso dato, enfasi diversa | `_highlightFn(subset)` sul DOM. |
| **Mode toggle** | Encoding diverso | Bottoni nel chart, re-render D3. |
| **Temporal scrubber + play** | Evoluzione nel tempo | Slider HTML range + play button. |
| **Drill-down** | Continente → Paese | Click su elemento → filter + re-render. |
| **Zoom geografico** | Enfasi su regione | D3 zoom transform. |

---

## 7. Schede dei 10 grafici

> **Convenzione:** ogni scheda specifica (a) il dato e la fonte, (b) i 3 stati delle narrative card, (c) le interazioni built-in del grafico.

---

### Grafico 1 — Reddito medio per continente (multi-line) — *IMPLEMENTATO*
**Atto:** I · **Tipo:** multi-line chart · **File dati:** `datasets/clean/gdp_per_capita.csv`

**Narrative card → stato grafico:**
- Card 0 "Un mondo che non parte uguale" → tutti i continenti uguali (nessun highlight).
- Card 1 "L'Europa si allontana" → `_gdpHighlightContinents(['Europe'])`.
- Card 2 "L'Africa resta ferma" → `_gdpHighlightContinents(['Africa'])`.

**Interazioni built-in:** click su linea → drill-down paesi del continente (con filtro, zoom Y, crosshair).

---

### Grafico 2 — Reddito per paese (choropleth animata) — *IMPLEMENTATO*
**Atto:** I · **Tipo:** choropleth con scrubber temporale · **File dati:** `datasets/clean/gdp_per_capita.csv` + TopoJSON CDN

**Narrative card → stato grafico:**
- Card 0 "La geografia della ricchezza" → `_gdpUpdate(2000)` + `_gdpZoomToWorld()`.
- Card 1 "Vent'anni di crescita asiatica" → `_gdpUpdate(2015)` + `_gdpZoomToAsia()`.
- Card 2 "Le zone immobili" → `_gdpUpdate(2024)` + `_gdpZoomToWorld()`.

**Interazioni built-in:** slider anno, play/pause, zoom + drag, tooltip per paese.

---

### Grafico 3 — Povertà e disuguaglianza (scatter) — *IMPLEMENTATO come dumbbell*
**Atto:** I · **Tipo:** dumbbell plot · **File dati:** `datasets/clean/life_expectancy.csv`

**Nota:** il grafico mostra aspettativa di vita come proxy del benessere. Le card guidano la lettura testuale senza cambiare lo stato del grafico.

**Narrative card:**
- Card 0 "Non basta guardare la media" — introduce il concetto di disuguaglianza interna.
- Card 1 "Il gap che non si vede nel PIL" — paesi con reddito simile, aspettativa di vita opposta.
- Card 2 "Niger vs Norvegia: 30 anni di differenza" — caso estremo come ancoraggio narrativo.

**Interazioni built-in:** click su continente → drill-down paesi, tooltip.

---

### Grafico 4 — Spesa pubblica in istruzione (bar chart aggregato)
**Atto:** II · **Tipo:** bar chart orizzontale con drill-down · **File dati:** `datasets/processed/edu_spending.csv`

**Narrative card → stato grafico:**
- Card 0 "Quanto vale un'aula?" → vista continenti, nessun highlight.
- Card 1 "L'Europa investe il doppio" → `_treemapHighlight('Europe')`.
- Card 2 "L'Africa sub-sahariana" → `_treemapHighlight('Africa')`.

**Interazioni built-in:** click su continente → drill-down paesi, back button, tooltip.

---

### Grafico 5 — Qualità dell'istruzione (scatter pupil-teacher × completamento)
**Atto:** II · **Tipo:** scatter plot · **File dati:** `datasets/processed/pupil_teacher.csv` + `datasets/processed/edu_completion.csv`

Merge a livello di grafico su `code` + `year` (anno più recente disponibile per paese).

**Narrative card → stato grafico:**
- Card 0 "Spendere non basta" → scatter tutti i paesi, nessun highlight.
- Card 1 "Più alunni per insegnante, meno diplomati" → highlight paesi con ratio >50, annotazione Niger/Chad.
- Card 2 "Le eccezioni che confermano la regola" → highlight paesi con alto ratio ma buon completamento (es. Vietnam, Cuba).

**Interazioni built-in:** hover tooltip (paese, anno, valori), filtro continente, click paese → highlight scia temporale.

---

### Grafico 6 — Esclusione scolastica e gap di genere (small multiples + strip)
**Atto:** II · **Tipo:** small multiples / dot strip · **File dati:** `datasets/processed/out_of_school.csv` + `datasets/processed/gpi_secondary.csv`

**Narrative card → stato grafico:**
- Card 0 "Milioni di bambini fuori dalla scuola" → strip plot `out_of_school` per continente, anno più recente.
- Card 1 "Le bambine escluse per prime" → sovrappone GPI: paesi con GPI <0.9 evidenziati.
- Card 2 "Il progresso c'è, ma è lento" → mostra trend 2000→recente, highlight paesi con maggior miglioramento GPI.

**Interazioni built-in:** slider anno, toggle out_of_school / GPI / entrambi, tooltip, drill-down continente.

---

### Grafico 7 — Reddito vs lavoro minorile (bubble animato Gapminder)
**Atto:** III · **Tipo:** scatter animato · **File dati:** `datasets/processed/income.csv` + `datasets/processed/child_labor.csv` + `datasets/processed/population.csv`

Merge a livello di grafico su `code` + `year`.

**Narrative card → stato grafico:**
- Card 0 "Più sei povero, più i tuoi figli lavorano" → scatter anno più recente, fermo.
- Card 1 "Vent'anni di cambiamento" → play automatico 2000→ultimo anno disponibile.
- Card 2 "Esplora" → pausa, slider libero, filtro continente attivo.

**Interazioni built-in:** play/pause/reset, slider anno, click bolla → scia temporale, filtro continente, tooltip.

---

### Grafico 8 — Matrimoni precoci (mappa + bar chart)
**Atto:** III · **Tipo:** choropleth + bar · **File dati:** `datasets/processed/child_marriage.csv`

**Narrative card → stato grafico:**
- Card 0 "Una su tre: spose prima dei 18 anni" → mappa mondiale, anno più recente.
- Card 1 "Niger, 76%: il caso estremo" → highlight Africa, annotazione paesi critici.
- Card 2 "Il trend scende, ma troppo lento" → switch a bar chart trend temporale per regione.

**Interazioni built-in:** toggle mappa/bar, slider anno (mappa), filtro continente (bar), tooltip paese.

---

### Grafico 9 — Il prezzo biologico (scatter mortalità materna × infantile)
**Atto:** III · **Tipo:** scatter connesso / slope · **File dati:** `datasets/processed/maternal_mortality.csv` + `datasets/processed/child_mortality.csv`

Merge a livello di grafico su `code` + `year`.

**Narrative card → stato grafico:**
- Card 0 "Dove le madri muoiono, i bambini muoiono" → scatter maternal × child mortality, tutti i paesi.
- Card 1 "La catena: matrimonio precoce → gravidanza → morte" → highlight paesi con alto child_marriage, annotazione correlazione.
- Card 2 "Il progresso dal 2000 ad oggi" → slope chart paese-per-paese, 2000 → anno recente.

**Interazioni built-in:** toggle scatter/slope, hover tooltip, filtro continente, click paese → evidenzia.

---

### Grafico 10 — La fuga e il paradosso (chord + pannello rimesse)
**Atto:** IV · **Tipo:** Chord diagram + bar panel · **File dati:** `datasets/processed/migration.csv` + `datasets/processed/remittances.csv`

**Narrative card → stato grafico:**
- Card 0 "Chi parte e dove va" → chord diagram flussi bilaterali aggregati per continente, 2020.
- Card 1 "I flussi crescono" → animazione 2000→2020 o slider quinquennale.
- Card 2 "Le rimesse: soldi che tornano, ma non bastano" → pannello laterale rimesse % PIL top-20 paesi, highlight paesi con rimesse >15% PIL e poverty rate ancora alta.

**Interazioni built-in:** scrubber temporale (intervalli 5 anni), filtro continente origine/destinazione, toggle chord/rimesse.

---

## 8. Struttura HTML delle sezioni grafico

Pattern standard per ogni sezione:

```html
<section class="chart-section [chart-section-alt]" id="section-N" data-act="X">
  <div class="chart-section-inner [layout-reversed|layout-stacked]">

    <!-- Colonna sinistra: testo cliccabile -->
    <div class="chart-text">
      <div class="narrative-card is-active" data-chart="chart-ID" data-state="0">
        <h3>Titolo card 0</h3>
        <p>Testo narrativo...</p>
      </div>
      <div class="narrative-card" data-chart="chart-ID" data-state="1">
        <h3>Titolo card 1</h3>
        <p>Testo narrativo...</p>
      </div>
      <div class="narrative-card" data-chart="chart-ID" data-state="2">
        <h3>Titolo card 2</h3>
        <p>Testo narrativo...</p>
      </div>
    </div>

    <!-- Colonna destra: grafico sticky -->
    <div class="chart-viz">
      <div class="chart-box">
        <button class="chart-fullscreen-btn" ...></button>
        <div id="chart-ID" style="width:100%;height:100%"></div>
      </div>
    </div>

  </div>
</section>
```

---

## 9. Sezione "About" finale

Dopo il grafico 10, una sezione con 7 card (layout grid 2 o 3 colonne).

1. **Tesi** — 2-3 frasi che sintetizzano l'argomento del progetto.
2. **Fonti dati** — lista con link a tutte le fonti (World Bank, UNESCO UIS, ILO, UNICEF, UN DESA, Our World in Data, WHO).
3. **Processo metodologico** — selezione indicatori, finestra temporale, gestione dati mancanti.
4. **Limitazioni note** — onestà metodologica (vedi §11).
5. **Stack tecnologico** — librerie usate, scelte di design.
6. **Team** — nomi, ruoli, contatti.
7. **Crediti & licenze** — citazione dataset, link repository, licenza progetto.

---

## 10. Dataset

### 10.1 Schema standard
Tutti i file processed seguono lo schema: `code, country, continent, year, value`
Eccezione: `migration.csv` → `origin_code, origin_country, origin_continent, dest_code, dest_country, dest_continent, year, stock`

### 10.2 Percorsi dati per grafico

| Grafico | File processed | Metrica |
|---|---|---|
| 1 | `datasets/clean/gdp_per_capita.csv` | PIL pro capite USD |
| 2 | `datasets/clean/gdp_per_capita.csv` + TopoJSON | PIL pro capite USD |
| 3 | `datasets/clean/life_expectancy.csv` | Aspettativa di vita (anni) |
| 4 | `datasets/processed/edu_spending.csv` | Spesa istruzione % PIL |
| 5 | `datasets/processed/pupil_teacher.csv` + `edu_completion.csv` | Alunni/insegnante × completamento % |
| 6 | `datasets/processed/out_of_school.csv` + `gpi_secondary.csv` | N. fuori scuola + GPI |
| 7 | `datasets/processed/income.csv` + `child_labor.csv` + `population.csv` | PIL × % lavoro minorile × pop 5-17 |
| 8 | `datasets/processed/child_marriage.csv` | % donne sposate <18 anni |
| 9 | `datasets/processed/maternal_mortality.csv` + `child_mortality.csv` | Mortalità materna × infantile |
| 10 | `datasets/processed/migration.csv` + `remittances.csv` | Stock migranti bilaterale + rimesse % PIL |

### 10.3 Dataset disponibili ma non usati nei grafici principali
Disponibili per annotazioni, tooltip arricchiti o futura espansione:
- `poverty.csv` — % pop sotto $2.15/giorno
- `gini.csv` — indice Gini
- `literacy.csv` — tasso alfabetizzazione adulti

---

## 11. Limitazioni metodologiche note

Da menzionare nella card "Limitazioni" della sezione About:

1. **PIL pro capite come proxy.** Misura media — nasconde disuguaglianza interna. Usare insieme a Gini per lettura completa.
2. **Lavoro minorile da survey.** Dati ILO/UNICEF da survey nazionali con strumenti diversi. Confronti tra paesi con cautela; trend regionali più affidabili. Solo 93 paesi con dato disponibile.
3. **Matrimoni precoci sotto-rilevati.** Dati retrospettivi su donne 20-24. Paesi ad alto reddito spesso non riportano (~0%). Probabile sotto-stima.
4. **Stock vs flussi nelle migrazioni.** UN DESA misura stock (persone nate all'estero residenti in un paese), non flussi annuali. Dati bilaterali disponibili solo fino al 2020.
5. **Mortalità materna — stime modellate.** In paesi con sistemi sanitari deboli, la mortalità materna è stimata da modelli WHO, non da registri civili.
6. **GPI e completamento scolastico — copertura parziale.** Non tutti i paesi riportano dati annuali. Gap frequenti negli anni 2000-2010.

---

## 12. Roadmap implementativa

### Stato sprint

| Sprint | Contenuto | Stato |
|---|---|---|
| Sprint 1 | Layout, design system, progress bar, act headers | ✅ Completato |
| Sprint 2 | Narrative card cliccabili, triggerChartState, grafici 1-2-3 collegati | ✅ Completato |
| Sprint 3 | Grafici 4, 5, 6 (Atto II) | ⬜ Da fare |
| Sprint 4 | Grafici 7, 8, 9 (Atto III) | ⬜ Da fare |
| Sprint 5 | Grafico 10, sezione About, polishing | ⬜ Da fare |

---

### Sprint 3 — Atto II
- Grafico 4: bar chart spesa istruzione (`eduTreemap.js` — già parzialmente implementato, adattare).
- Grafico 5: scatter pupil_teacher × edu_completion (`qualityScatter.js`).
- Grafico 6: strip plot out_of_school + GPI (`exclusionChart.js`).
- Ogni grafico espone API su DOM element per `triggerChartState`.
- Aggiungere/aggiornare narrative card in `index.html` per sezioni 4, 5, 6.
- Aggiungere i casi `chart-4`, `chart-5`, `chart-6` in `triggerChartState()` in `main.js`.

### Sprint 4 — Atto III
- Grafico 7: bubble animato Gapminder (`childLaborBubble.js`) — merge income + child_labor + population nel JS.
- Grafico 8: mappa + bar matrimoni (`marriageChart.js`).
- Grafico 9: scatter mortalità materna × infantile (`mortalityChart.js`).

### Sprint 5 — Atto IV + About + polishing
- Grafico 10: chord migrazioni + pannello rimesse (`migrationChord.js`).
- Sezione About con 7 card.
- Pass di polishing: transizioni, accessibilità base (focus visibile, contrasti AA, skip link).
- Test cross-browser desktop (Chrome, Safari, Firefox, ultime versioni).

---

## 13. Convenzioni di codice

- **Nomenclatura file JS chart:** camelCase (`eduTreemap.js`, `childLaborBubble.js`).
- **Nomi variabili JS:** `camelCase`. Costanti `UPPER_SNAKE`.
- **Classi CSS:** `kebab-case`.
- **Pattern chart:** funzione globale `async function renderChartXX(selector, isFullscreen)`. Espone API su `container._fnName`. Registra anche nel fullscreen modal in `main.js`.
- **No global state.** Stato per chart locale alla funzione.
- **Date:** anni come numeri (`2024`), mai oggetti `Date` non necessari.
- **triggerChartState:** aggiungere un blocco `if (chartId === 'chart-X-X')` per ogni nuovo grafico.
- **Merge dataset:** avviene sempre nel JS del grafico, mai nel preprocessing.

---

## 14. Definizione di "fatto"

Il progetto è considerato completo quando:
- [ ] I 10 grafici sono implementati e collegati alle narrative card.
- [ ] Ogni grafico ha 3 narrative card che triggherano stati significativi.
- [ ] I grafici sono interattivi (tooltip, drill-down o equivalente built-in).
- [ ] L'indicatore di progresso funziona e naviga correttamente.
- [ ] La sezione About è popolata con tutte le 7 card.
- [ ] Il sito carica in <3s su connessione standard.
- [ ] Nessun errore in console.
- [ ] Funziona su Chrome, Safari, Firefox (ultime versioni) su desktop.
- [ ] I testi delle card sono scritti (non lorem ipsum).

---

*Fine del documento. Aggiornare questo file se cambiano scope, fonti o decisioni di design.*
