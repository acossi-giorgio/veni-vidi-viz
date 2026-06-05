# Veni Vidi Viz

Progetto accademico di **Data Visualization** sviluppato nel **2026**.

Il repository raccoglie una story-driven data visualization incentrata sul rapporto tra disuguaglianza economica, istruzione, infanzia e migrazione.  
Il sito è costruito come applicazione statica con grafici interattivi realizzati principalmente con **HTML**, **CSS**, **JavaScript** e **D3.js**.

## Progetto

- **Nome progetto:** Veni Vidi Viz
- **Ambito:** progetto accademico per il corso di Data Visualization
- **Anno:** 2026
- **Team:** Veni Vidi Viz
- **Persone nel team:**
  - Giorgio Acossi
  - Eleonora Ventura

## Obiettivo

Il progetto presenta una narrazione in quattro atti:

1. contesto economico e disuguaglianza
2. istruzione e gap di genere
3. costo umano della povertà
4. migrazione come conseguenza sistemica

L’obiettivo tecnico non è solo mostrare grafici, ma costruire una pipeline chiara che trasformi fonti eterogenee in dataset coerenti e pronti per il frontend.

## Stack Tecnico

- **Frontend**
  - HTML
  - CSS
  - JavaScript
  - D3.js

- **Data pipeline**
  - Python
  - pandas
  - openpyxl

- **Esecuzione locale**
  - `live-server`

## Avvio Locale

Il progetto è statico: i file HTML/CSS/JS vengono serviti localmente senza build step.

### Requisiti

- Node.js
- Python

### Avviare il sito

```bash
npm start
```

Lo script apre il sito su:

```text
http://localhost:5500/src/
```

Se preferisci avviarlo manualmente:

```bash
npx live-server --port=5500 --open=/src/
```

## ETL

I dataset **processati sono già storicizzati** nel repository sotto `src/datasets/processed/`, quindi per la consultazione normale non è necessario rieseguire l’ETL.

Se però vuoi rigenerare la pipeline, puoi lanciare lo script Python:

```bash
python scripts/etl.py
```

### Cosa fa lo script

- legge i file grezzi da `src/datasets/raw/`
- pulisce e armonizza le variabili
- normalizza i codici paese e le etichette geografiche
- produce i CSV finali in `src/datasets/processed/`

### Nota operativa

Lo script ETL sovrascrive i file processati esistenti.  
Se vuoi rifare la pipeline completa, assicurati di avere installato le dipendenze Python richieste:

```bash
pip install pandas openpyxl
```

## Struttura Del Repository

```text
.
├── package.json
├── README.md
├── scripts
│   └── etl.py
└── src
    ├── index.html
    ├── about.html
    ├── datasets.html
    ├── process.html
    ├── style.css
    ├── images
    ├── js
    │   ├── main.js
    │   ├── common.js
    │   └── charts
    └── datasets
        ├── raw
        └── processed
```

### Dettaglio Cartelle

- `src/`
  - contiene il sito statico
  - include le pagine HTML principali
  - include lo stile globale
  - include gli asset grafici e le immagini

- `src/js/`
  - contiene la logica applicativa del frontend
  - `main.js` gestisce interazioni, narrativa e comportamento generale
  - `common.js` centralizza la palette colori usata dai grafici
  - `charts/` contiene i singoli moduli D3 per ciascuna visualizzazione

- `src/datasets/raw/`
  - contiene le fonti grezze originali
  - formati presenti: CSV e XLSX

- `src/datasets/processed/`
  - contiene i dataset già trasformati e pronti per il frontend
  - questi file sono quelli consumati dai grafici

- `scripts/`
  - contiene gli script di preparazione dati
  - al momento il punto centrale è `etl.py`

## Pipeline Dati

La pipeline segue una logica semplice:

1. **Extract**: lettura delle fonti da `src/datasets/raw/`
2. **Transform**: pulizia, standardizzazione, mapping dei paesi, controllo copertura temporale
3. **Load**: scrittura dei CSV finali in `src/datasets/processed/`