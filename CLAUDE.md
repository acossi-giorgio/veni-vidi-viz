# Veni Vidi Viz — Documento di analisi del sito

> **Scopo del documento:** definire in modo univoco cosa va costruito, con quali dati, con quali interazioni e in che ordine. Questo documento è l'input ufficiale per l'implementazione (fase Claude Code). Tutte le decisioni qui dentro sono già discusse e validate dal team — l'implementatore deve seguirle, non re-discuterle.

---

## ⚠️ ISTRUZIONI CRITICHE PER L'AGENTE

**Prima di toccare qualsiasi codice, l'agente deve:**

1. **Ispezionare il codebase esistente.** Il sito è già parzialmente costruito. I grafici 1, 2, 3 sono implementati. Leggi tutta la struttura del progetto (`index.html`, `style.css`, `js/`) prima di scrivere una sola riga.
2. **Adattarsi allo stile esistente.** Non riscrivere da zero ciò che funziona. Estendi pattern e convenzioni già presenti nel codice.
3. **I dati processati esistono già** in `src/datasets/processed/`. Verificarne l'esistenza prima di rigenerarli.
4. **Lavorare in ordine di sprint** (§12). Non saltare avanti.

---

## 0. Sommario esecutivo

- **Tesi:** Dove il reddito è basso e l'istruzione fallisce, l'infanzia paga il prezzo più alto: lavoro minorile, matrimoni precoci, vite spezzate. Quando il contesto non offre più niente, l'unica via d'uscita è la migrazione.
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
- **JavaScript ES6+** — vanilla, script globali (non ES6 modules per compatibilità con l'esistente).
- **D3.js v7** — unica libreria per la visualizzazione. Non si usa Chart.js, Plotly o altre librerie alto-livello.
- **d3-sankey** — plugin separato di D3, serve per i grafici 8 e 10.
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
<!-- d3-sankey aggiunto quando serve grafico 8/10 -->
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
│       ├── completionWaffle.js   # Grafico 5 — da implementare
│       ├── literacySlope.js      # Grafico 6 — da implementare
│       ├── childLaborBubble.js   # Grafico 7 — da implementare
│       ├── marriageSankey.js     # Grafico 8 — da implementare
│       ├── trendsMultimode.js    # Grafico 9 — da implementare
│       └── migrationChord.js     # Grafico 10 — da implementare
├── datasets/
│   ├── raw/                      # file originali scaricati
│   ├── clean/                    # file puliti per grafici 1-3 (esistenti)
│   └── processed/                # output preprocessing per grafici 4-10
└── images/                       # immagini di sfondo
```

> **Regola:** adattare i riferimenti al nome esistente — non creare duplicati con nomi alternativi.

### 4.2 Sezioni del sito (top to bottom)
1. **Hero** — titolo, sottotitolo/tesi, scroll prompt.
2. **Atto I — Il contesto** (3 grafici: 1, 2, 3).
3. **Atto II — La barriera** (3 grafici: 4, 5, 6).
4. **Atto III — Il costo umano** (3 grafici: 7, 8, 9).
5. **Atto IV — La fuga** (1 grafico: 10).
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

### 6.3 Interazioni built-in nei grafici
Ogni grafico ha già interattività propria che NON dipende dalle narrative card:
- **Chart 1:** click su linea → drill-down paesi del continente, crosshair hover.
- **Chart 2:** slider anno, play/pause, zoom con scroll, drag.
- **Chart 3:** click su continente → drill-down paesi.
- **Chart 4–10:** da definire in implementazione.

### 6.4 Pattern di interazione disponibili
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
- Card 1 "L'Europa sale" → `_gdpHighlightContinents(['Europe'])`.
- Card 2 "L'Africa resta indietro" → `_gdpHighlightContinents(['Africa'])`.

**Interazioni built-in:** click su linea → drill-down paesi del continente (con filtro, zoom Y, crosshair).

---

### Grafico 2 — Reddito per paese (choropleth animata) — *IMPLEMENTATO*
**Atto:** I · **Tipo:** choropleth con scrubber temporale · **File dati:** `datasets/clean/gdp_per_capita.csv` + TopoJSON CDN

**Narrative card → stato grafico:**
- Card 0 "Una mappa del divario" → `_gdpUpdate(2000)` + `_gdpZoomToWorld()`.
- Card 1 "La crescita asiatica" → `_gdpUpdate(2010)` + `_gdpZoomToAsia()`.
- Card 2 "Le zone immobili" → `_gdpUpdate(2024)` + `_gdpZoomToWorld()`.

**Interazioni built-in:** slider anno, play/pause, zoom + drag, tooltip per paese.

---

### Grafico 3 — Aspettativa di vita (dumbbell plot) — *IMPLEMENTATO*
**Atto:** I · **Tipo:** dumbbell plot · **File dati:** `datasets/clean/life_expectancy.csv`

**Narrative card:** 3 card presenti nell'HTML, non triggera stati diversi del grafico (il grafico mostra sempre tutto). Le card guidano la lettura testuale.

**Interazioni built-in:** click su continente → drill-down paesi, tooltip.

---

### Grafico 4 — Spesa pubblica in istruzione (treemap)
**Atto:** II · **Tipo:** treemap · **File dati:** `datasets/processed/04_edu_spending.csv`

**Narrative card → stato grafico:**
- Card 0 "Quanto si investe?" → treemap globale per continente.
- Card 1 "L'Europa investe" → highlight continente Europa.
- Card 2 "L'Africa sub-sahariana" → highlight continente Africa.

**Interazioni built-in:** click su continente → drill-down paesi, tooltip.

---

### Grafico 5 — Tasso di completamento scolastico (waffle comparativo)
**Atto:** II · **Tipo:** waffle chart, 4 paesi · **File dati:** `datasets/processed/05_edu_completion.csv`

**Narrative card → stato grafico:**
- Card 0 "Quanti arrivano al diploma?" → 4 waffle: Norvegia, Italia, India, Niger.
- Card 1 "Il confronto che colpisce" → highlight gap Niger vs Norvegia.
- Card 2 "Genere e istruzione" → toggle vista Femmine vs Maschi.

**Interazioni built-in:** toggle Totale/Femmine/Maschi, selettore paese.

---

### Grafico 6 — Tasso di alfabetizzazione (slope chart)
**Atto:** II · **Tipo:** slope chart · **File dati:** `datasets/processed/06_literacy.csv`

**Narrative card → stato grafico:**
- Card 0 "Saper leggere nel 2020" → slope 2000→2020, tutti i paesi.
- Card 1 "Chi ha recuperato" → highlight paesi con maggior progresso.
- Card 2 "Esplora i dati" → reset highlight, slider anni attivo.

**Interazioni built-in:** slider anno A e anno B, toggle adulti/giovani, toggle genere.

---

### Grafico 7 — Reddito vs lavoro minorile (bubble animato Gapminder)
**Atto:** III · **Tipo:** scatter animato · **File dati:** `datasets/processed/07_bubble.csv`

**Narrative card → stato grafico:**
- Card 0 "I bambini al lavoro" → scatter anno 2000, fermo.
- Card 1 "Vent'anni di cambiamento" → play automatico fino al 2020.
- Card 2 "Esplora" → pausa, slider libero.

**Interazioni built-in:** play/pause/reset, slider anno, click bolla → scia temporale, filtro continente.

---

### Grafico 8 — Matrimoni precoci (Sankey diagram)
**Atto:** III · **Tipo:** Sankey · **File dati:** `datasets/processed/08_child_marriage.csv`

**Narrative card → stato grafico:**
- Card 0 "Spose a dodici anni" → Sankey Africa Sub-sahariana.
- Card 1 "Un effetto a cascata" → highlight flusso scuola→matrimonio→gravidanza.
- Card 2 "Esplora per regione" → selettore regione attivo.

**Interazioni built-in:** selettore regione (Africa / Asia Meridionale / Mondo), tooltip flussi.

---

### Grafico 9 — Trend multi-indicatore (multi-mode time series)
**Atto:** III · **Tipo:** time series con toggle · **File dati:** `datasets/processed/09_trends.csv`

**Narrative card → stato grafico:**
- Card 0 "Tre crisi, una storia" → Stacked Area, tutti e 3 gli indicatori.
- Card 1 "Il progresso globale" → Line chart, trend decrescente evidenziato.
- Card 2 "Cambia la vista" → attiva mode toggle visibile.

**Interazioni built-in:** toggle Line/Stacked Area/Streamgraph/100%, filtro indicatore, filtro regione SDG.

---

### Grafico 10 — Migrazioni internazionali (Chord diagram)
**Atto:** IV · **Tipo:** Chord diagram · **File dati:** `datasets/processed/10_migration_continent.csv`

**Narrative card → stato grafico:**
- Card 0 "Chi parte, dove va" → Chord al 2024.
- Card 1 "I flussi crescono" → animazione 1990→2024 o confronto.
- Card 2 "Il costo per chi resta" → highlight flussi Africa/Asia → Europa/Nord America.

**Interazioni built-in:** scrubber temporale (intervalli 5 anni), filtro continente origine/destinazione.

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
2. **Fonti dati** — lista con link a tutte le fonti (World Bank, UNESCO UIS, ILO, UNICEF, UN DESA, Our World in Data).
3. **Processo metodologico** — come abbiamo selezionato indicatori, paesi, finestra temporale; come abbiamo gestito i dati mancanti.
4. **Limitazioni note** — onestà metodologica (vedi §11).
5. **Stack tecnologico** — librerie usate, scelte di design.
6. **Team** — nomi, ruoli, contatti.
7. **Crediti & licenze** — citazione dei dataset, link ai repository, licenza del progetto.

---

## 10. Dataset

### 10.1 Percorsi dati

| File | Grafico | Percorso |
|---|---|---|
| `gdp_per_capita.csv` | 1, 2 | `src/datasets/clean/` |
| `life_expectancy.csv` | 3 | `src/datasets/clean/` |
| `04_edu_spending.csv` | 4 | `src/datasets/processed/` |
| `05_edu_completion.csv` | 5 | `src/datasets/processed/` |
| `06_literacy.csv` | 6 | `src/datasets/processed/` |
| `07_bubble.csv` | 7 | `src/datasets/processed/` |
| `08_child_marriage.csv` | 8 | `src/datasets/processed/` |
| `09_trends.csv` | 9 | `src/datasets/processed/` |
| `10_migration_continent.csv` | 10 | `src/datasets/processed/` |

I file raw sono in `src/datasets/raw/`. Lo script di preprocessing è in `scripts/preprocess.py` (già eseguito).

### 10.2 Colonne attese nei file processed

| File | Colonne |
|---|---|
| `04_edu_spending.csv` | `iso3, country, continent, year, pct_gdp` |
| `05_edu_completion.csv` | `iso3, country, continent, year, total, female, male` |
| `06_literacy.csv` | `iso3, country, continent, year, adult_total, adult_female, adult_male, youth_total, youth_female, youth_male` |
| `07_bubble.csv` | `iso3, country, continent, year, income, child_labor_pct, pop_5_17` |
| `08_child_marriage.csv` | `region, country, year, married_before_18, married_before_15, children_before_18` |
| `09_trends.csv` | `region, year, indicator, value` — indicator ∈ {child_labor, child_marriage, out_of_school} |
| `10_migration_continent.csv` | `origin_continent, dest_continent, year, stock` |

---

## 11. Limitazioni metodologiche note

Da menzionare nella card "Limitazioni" della sezione About:

1. **Metrica reddito unica per grafici 1 e 2.** GDP per capita da World Bank. Alcuni paesi mancano di copertura — mostrati come "N/D" nella choropleth.
2. **Comparabilità del lavoro minorile.** I dati ILO/UNICEF derivano da survey nazionali con strumenti diversi. I confronti tra paesi vanno presi con cautela; i trend regionali sono più affidabili.
3. **Buchi nel treemap istruzione.** Non tutti i paesi riportano la spesa per livello scolastico.
4. **Stock vs flussi nelle migrazioni.** UN DESA misura lo stock (persone nate all'estero residenti in un paese), non i flussi annuali.
5. **Matrimoni precoci sotto-rilevati.** I dati riguardano donne 20–24 retrospettivamente. I paesi ad alto reddito spesso non riportano il dato (~0%).
6. **Alfabetizzazione self-reported.** Definizioni e metodologie variano tra paesi.

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
- Grafico 4: treemap spesa istruzione (`eduTreemap.js`).
- Grafico 5: waffle completamento scolastico (`completionWaffle.js`).
- Grafico 6: slope chart alfabetizzazione (`literacySlope.js`).
- Ogni grafico deve esporre API su DOM element per `triggerChartState`.
- Aggiungere le narrative card in `index.html` per sezioni 4, 5, 6.
- Aggiungere i casi `chart-4`, `chart-5`, `chart-6` in `triggerChartState()` in `main.js`.

### Sprint 4 — Atto III
- Grafico 7: bubble animato Gapminder (`childLaborBubble.js`) — **il più complesso**.
- Grafico 8: Sankey matrimoni (`marriageSankey.js`) — richiede d3-sankey CDN.
- Grafico 9: multi-mode time series (`trendsMultimode.js`).

### Sprint 5 — Atto IV + About + polishing
- Grafico 10: Chord migrazioni (`migrationChord.js`) — richiede d3-chord.
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

#### Datasets

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
