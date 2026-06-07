# Veni Vidi Viz

Academic **Data Visualization** project developed in **2026**.

This repository contains a story-driven data visualization focused on the relationship between economic inequality, education, childhood, and migration.  
The website is built as a static application with interactive charts created mainly with **HTML**, **CSS**, **JavaScript**, and **D3.js**.

## Project

- **Project name:** Veni Vidi Viz
- **Scope:** academic project for the Data Visualization course
- **Year:** 2026
- **Team:** Veni Vidi Viz
- **Team members:**
  - Giorgio Acossi
  - Eleonora Ventura

## Objective

The project presents a narrative in four acts:

1. economic context and inequality
2. education and the gender gap
3. the human cost of poverty
4. migration as a systemic consequence

The technical goal is not only to show charts, but also to build a clear pipeline that transforms heterogeneous sources into consistent datasets ready for the frontend.

## Tech Stack

- **Frontend**
  - HTML
  - CSS
  - JavaScript
  - D3.js

- **Data pipeline**
  - Python
  - pandas
  - openpyxl

- **Local run**
  - `live-server`

## Local Setup

The project is static: the HTML/CSS/JS files are served locally without a build step.

### Requirements

- Node.js
- Python

### Run the website

```bash
npm start
```

The script opens the website at:

```text
http://localhost:5500/src/
```

If you prefer to start it manually:

```bash
npx live-server --port=5500 --open=/src/
```

## ETL

The **processed datasets are already versioned** in the repository under `src/datasets/processed/`, so for normal use you do not need to run the ETL again.

If you want to regenerate the pipeline, you can run the Python script:

```bash
python scripts/etl.py
```

### What the script does

- reads the raw files from `src/datasets/raw/`
- cleans and harmonizes the variables
- normalizes country codes and geographic labels
- produces the final CSV files in `src/datasets/processed/`

### Operational note

The ETL script overwrites the existing processed files.  
If you want to rebuild the full pipeline, make sure the required Python dependencies are installed:

```bash
pip install pandas openpyxl
```

## Repository Structure

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

### Folder Details

- `src/`
  - contains the static website
  - includes the main HTML pages
  - includes the global styling
  - includes visual assets and images

- `src/js/`
  - contains the frontend application logic
  - `main.js` handles interactions, narrative flow, and general behavior
  - `common.js` centralizes the color palette used by the charts
  - `charts/` contains the individual D3 modules for each visualization

- `src/datasets/raw/`
  - contains the original raw data sources
  - available formats: CSV and XLSX

- `src/datasets/processed/`
  - contains datasets that have already been transformed and are ready for the frontend
  - these are the files consumed by the charts

- `scripts/`
  - contains the data preparation scripts
  - currently the main entry point is `etl.py`

## Data Pipeline

The pipeline follows a simple logic:

1. **Extract**: read the sources from `src/datasets/raw/`
2. **Transform**: cleaning, standardization, country mapping, and temporal coverage checks
3. **Load**: write the final CSV files to `src/datasets/processed/`
