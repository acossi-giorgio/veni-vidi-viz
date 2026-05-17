"""
Veni Vidi Viz -- Preprocessing pipeline
Schema standard: [code, country, continent, year, value]
- Tutti i CSV sono a livello paese (granularita' minima)
- Aggregazioni regionali avvengono a livello di grafico, non qui
- 'value' cambia significato per file (documentato per ciascuno)

Output -> src/datasets/processed/
Run: python scripts/preprocess.py
"""

import os
import unicodedata
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW  = os.path.join(ROOT, "src", "datasets", "raw")
OUT  = os.path.join(ROOT, "src", "datasets", "processed")
os.makedirs(OUT, exist_ok=True)

MIN_YEAR, MAX_YEAR = 2000, 2025


# ── Mappings ──────────────────────────────────────────────────────────────────
def load_mappings():
    path = os.path.join(RAW, "country-code.csv")
    df = pd.read_csv(path).rename(columns={
        "Three_Letter_Country_Code": "code",
        "Continent_Name":            "continent",
        "Country_Name":              "country_official",
    })[["code", "country_official", "continent"]].dropna()
    remap = {
        "Asia": "Asia", "Europe": "Europe", "Africa": "Africa",
        "North America": "North America", "South America": "South America",
        "Oceania": "Oceania", "Antarctica": "Oceania",
    }
    df["continent"] = df["continent"].map(remap).fillna(df["continent"])
    code_continent = df.set_index("code")["continent"].to_dict()
    code_name      = df.set_index("code")["country_official"].to_dict()
    # name -> code for migration matching (normalised lowercase)
    name_code = {
        unicodedata.normalize("NFKD", str(v)).lower(): k
        for k, v in code_name.items()
    }
    return code_continent, code_name, name_code

CODE_CONTINENT, CODE_NAME, NAME_CODE = load_mappings()


# ── Helpers ───────────────────────────────────────────────────────────────────
def report(name, df, error=None):
    if error:
        print(f"  [ERR] {name} -- {error}")
    else:
        print(f"  [OK]  {name:<45} {len(df):>6} rows")

def save(name, df):
    path = os.path.join(OUT, name)
    df.to_csv(path, index=False)
    report(name, df)

def owid_rename(df):
    """Rename standard OWID columns: Entity->country, Code->code, Year->year, last->value."""
    return df.rename(columns={
        df.columns[0]: "country",
        df.columns[1]: "code",
        df.columns[2]: "year",
        df.columns[3]: "value",
    })

def filter_countries(df):
    """Keep only real country rows (3-char ISO code, has continent mapping)."""
    df = df[df["code"].notna() & df["code"].str.len().eq(3) & (df["code"] != "")].copy()
    df["continent"] = df["code"].map(CODE_CONTINENT)
    return df[df["continent"].notna()]

def year_range(df, lo=MIN_YEAR, hi=MAX_YEAR):
    df = df.copy()
    df["year"] = df["year"].astype(int)
    return df[df["year"].between(lo, hi)]

def normalise(s):
    return unicodedata.normalize("NFKD", str(s)).lower().strip()


# ── edu_spending.csv ──────────────────────────────────────────────────────────
# value = Government expenditure on education, total (% of GDP)
# Fonte: World Bank SE.XPD.TOTL.GD.ZS
def make_edu_spending():
    try:
        df = pd.read_csv(os.path.join(RAW, "edu_spending.csv"), skiprows=4, encoding="utf-8-sig")
        df = df.rename(columns={"Country Name": "country", "Country Code": "code"})
        df = df[df["code"].str.len() == 3]
        year_cols = [c for c in df.columns if str(c).isdigit() and MIN_YEAR <= int(c) <= MAX_YEAR]
        melted = df.melt(id_vars=["code", "country"], value_vars=year_cols,
                         var_name="year", value_name="value")
        melted["year"] = melted["year"].astype(int)
        melted = melted.dropna(subset=["value"])
        melted["continent"] = melted["code"].map(CODE_CONTINENT)
        melted = melted[melted["continent"].notna()]
        save("edu_spending.csv",
             melted[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("edu_spending.csv", pd.DataFrame(), str(e))


# ── edu_completion.csv ────────────────────────────────────────────────────────
# value = Completion rate, upper secondary education, both sexes (%)
# Fonte: Our World in Data / SDG 4.1.2
def make_edu_completion():
    try:
        df = owid_rename(pd.read_csv(os.path.join(RAW, "edu_completion.csv")))
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("edu_completion.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("edu_completion.csv", pd.DataFrame(), str(e))


# ── literacy.csv ──────────────────────────────────────────────────────────────
# value = Literacy rate, adult total (% of people ages 15+)
# Fonte: Our World in Data / UNESCO UIS
def make_literacy():
    try:
        for fname in ("literacy_raw.csv", "literacy.csv"):
            p = os.path.join(RAW, fname)
            if os.path.exists(p):
                df = pd.read_csv(p)
                break
        else:
            raise FileNotFoundError("literacy raw file not found")
        df = owid_rename(df)
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("literacy.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("literacy.csv", pd.DataFrame(), str(e))


# ── income.csv ────────────────────────────────────────────────────────────────
# value = GDP per capita (USD, current prices)
# Fonte: World Bank / custom CSV
def make_income():
    try:
        df = pd.read_csv(os.path.join(RAW, "gdp_per_capita.csv"))
        df = df.rename(columns={
            "Country Name": "country", "Code": "code",
            "Year": "year", "GDP_Per_Capita (USD)": "value",
        })[["code", "country", "year", "value"]]
        df = df[df["code"].notna() & df["code"].str.len().eq(3)]
        df["continent"] = df["code"].map(CODE_CONTINENT)
        df = df[df["continent"].notna()]
        df["year"] = df["year"].astype(int)
        df = df[df["year"].between(MIN_YEAR, MAX_YEAR)]
        df = df.dropna(subset=["value"])
        save("income.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("income.csv", pd.DataFrame(), str(e))


# ── population.csv ────────────────────────────────────────────────────────────
# value = Population ages 5-17 (estimated)
# Fonte: UN World Population Prospects 2024
def make_population():
    try:
        df = pd.read_excel(
            os.path.join(RAW, "child_population_raw.xlsx"),
            sheet_name="Estimates", header=16,
            usecols=[1, 5, 10, 12, 13, 14],
        )
        df.columns = ["variant", "code", "year", "pop_5_9", "pop_10_14", "pop_15_19"]
        df = df[df["variant"] == "Estimates"].copy()
        df = df[df["code"].notna() & (df["code"] != "")]
        df["value"] = (
            df["pop_5_9"].fillna(0) + df["pop_10_14"].fillna(0) + df["pop_15_19"].fillna(0) * 0.6
        ) * 1000
        df["year"] = df["year"].astype(int)
        df = df[df["year"].between(MIN_YEAR, MAX_YEAR)]
        df["continent"] = df["code"].map(CODE_CONTINENT)
        df["country"]   = df["code"].map(CODE_NAME)
        df = df[df["continent"].notna() & df["country"].notna()]
        save("population.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("population.csv", pd.DataFrame(), str(e))



# ── child_labor.csv ───────────────────────────────────────────────────────────
# value = Share of children engaged in economic activity, ages 5-17 (%)
# Fonte: Our World in Data / ILO-UNICEF
def make_child_labor():
    try:
        df = owid_rename(pd.read_csv(os.path.join(RAW, "child_labor_raw.csv")))
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("child_labor.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("child_labor.csv", pd.DataFrame(), str(e))


# ── child_marriage.csv ────────────────────────────────────────────────────────
# value = Women first married by age 18 (% of women ages 20-24)
# Fonte: Our World in Data / UNICEF
def make_child_marriage():
    try:
        df = pd.read_csv(os.path.join(RAW, "child_marriage_raw.csv"))
        df = df.rename(columns={
            df.columns[0]: "country", df.columns[1]: "code",
            df.columns[2]: "year",    df.columns[3]: "value",
        })
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("child_marriage.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("child_marriage.csv", pd.DataFrame(), str(e))


# ── out_of_school.csv ────────────────────────────────────────────────────────
# value = Children out of primary school, both sexes (absolute number)
# Fonte: Our World in Data / UNESCO UIS
def make_out_of_school():
    try:
        df = pd.read_csv(os.path.join(RAW, "out_of_school_raw.csv"))
        df = df.rename(columns={
            df.columns[0]: "country",
            df.columns[1]: "code",
            df.columns[2]: "year",
            df.columns[3]: "value",
        })
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("out_of_school.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("out_of_school.csv", pd.DataFrame(), str(e))


# ── poverty.csv ──────────────────────────────────────────────────────────────
# value = Share of population living on less than $2.15/day (%)
# Fonte: Our World in Data / World Bank PIP
def make_poverty():
    try:
        df = owid_rename(pd.read_csv(os.path.join(RAW, "poverty_raw.csv")))
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("poverty.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("poverty.csv", pd.DataFrame(), str(e))


# ── gini.csv ──────────────────────────────────────────────────────────────────
# value = Gini coefficient (0=perfect equality, 1=perfect inequality)
# Fonte: Our World in Data / World Bank PIP
def make_gini():
    try:
        df = owid_rename(pd.read_csv(os.path.join(RAW, "gini_raw.csv")))
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("gini.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("gini.csv", pd.DataFrame(), str(e))


# ── gpi_secondary.csv ─────────────────────────────────────────────────────────
# value = Adjusted gender parity index, lower secondary net enrollment
#         (1 = parity, <1 = boys favored, >1 = girls favored)
# Fonte: Our World in Data / UNESCO UIS
def make_gpi_secondary():
    try:
        df = owid_rename(pd.read_csv(os.path.join(RAW, "gpi_secondary_raw.csv")))
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("gpi_secondary.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("gpi_secondary.csv", pd.DataFrame(), str(e))


# ── child_mortality.csv ───────────────────────────────────────────────────────
# value = Under-5 mortality rate (deaths per 1000 live births)
# Fonte: Our World in Data / UN IGME + Gapminder
def make_child_mortality():
    try:
        df = owid_rename(pd.read_csv(os.path.join(RAW, "child_mortality_raw.csv")))
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("child_mortality.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("child_mortality.csv", pd.DataFrame(), str(e))


# ── maternal_mortality.csv ────────────────────────────────────────────────────
# value = Maternal mortality ratio (deaths per 100,000 live births)
# Fonte: Our World in Data / WHO GHO
def make_maternal_mortality():
    try:
        df = owid_rename(pd.read_csv(os.path.join(RAW, "maternal_mortality_raw.csv")))
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("maternal_mortality.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("maternal_mortality.csv", pd.DataFrame(), str(e))


# ── life_expectancy.csv ───────────────────────────────────────────────────────
# value = Life expectancy at birth (years)
# Fonte: Our World in Data / UN WPP
def make_life_expectancy():
    try:
        df = pd.read_csv(os.path.join(RAW, "life_expectancy.csv"))
        # Columns: Entity, Code, Year, Life expectancy, Continent
        df = df.rename(columns={
            "Entity": "country", "Code": "code",
            "Year": "year", "Life expectancy": "value",
        })
        df = df[["code", "country", "year", "value"]].copy()
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("life_expectancy.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("life_expectancy.csv", pd.DataFrame(), str(e))


# ── remittances.csv ───────────────────────────────────────────────────────────
# value = Personal remittances received (% of GDP)
# Fonte: Our World in Data / World Bank (IMF + OECD)
def make_remittances():
    try:
        df = owid_rename(pd.read_csv(os.path.join(RAW, "remittances_raw.csv")))
        df = filter_countries(df)
        df = year_range(df)
        df = df[df["value"].notna()]
        save("remittances.csv",
             df[["code", "country", "continent", "year", "value"]].sort_values(["code", "year"]))
    except Exception as e:
        report("remittances.csv", pd.DataFrame(), str(e))


# ── migration.csv ─────────────────────────────────────────────────────────────
# Flussi bilaterali: stock di migranti per coppia (origine, destinazione)
# Schema: origin_code, origin_country, origin_continent,
#         dest_code, dest_country, dest_continent, year, stock
# Fonte: UN DESA 2020 International Migrant Stock — Destination and Origin, Table 1
# Anni disponibili: 1990, 1995, 2000, 2005, 2010, 2015, 2020 (quinquennali)
def make_migration():
    try:
        import openpyxl

        # Build numeric ISO code -> ISO3 + continent mapping
        cc = pd.read_csv(os.path.join(RAW, "country-code.csv")).rename(columns={
            "Three_Letter_Country_Code": "code",
            "Country_Number": "num",
        })[["code", "num"]].dropna()
        cc["num"] = cc["num"].astype(int)
        num_to_code = cc.set_index("num")["code"].to_dict()

        wb = openpyxl.load_workbook(
            os.path.join(RAW, "migration_bilateral_raw.xlsx"), read_only=True)
        ws = wb["Table 1"]
        header = list(ws.iter_rows(min_row=11, max_row=11, values_only=True))[0]
        # years = first 7 year values after col 7 (both sexes combined)
        years = [v for v in header[7:14] if isinstance(v, int)]

        rows = []
        for r in ws.iter_rows(min_row=12, values_only=True):
            dest_loc = r[3]
            orig_loc = r[6]
            # keep only country-level pairs (ISO numeric 1-899)
            if not (isinstance(dest_loc, int) and 1 <= dest_loc <= 899):
                continue
            if not (isinstance(orig_loc, int) and 1 <= orig_loc <= 899):
                continue
            dest_code = num_to_code.get(dest_loc)
            orig_code = num_to_code.get(orig_loc)
            if not dest_code or not dest_code in CODE_CONTINENT:
                continue
            if not orig_code or not orig_code in CODE_CONTINENT:
                continue
            dest_name = CODE_NAME.get(dest_code, str(r[1]).strip())
            orig_name = CODE_NAME.get(orig_code, str(r[5]).strip())
            for i, yr in enumerate(years):
                val = r[7 + i]
                if val is not None and val > 0:
                    rows.append({
                        "origin_code":      orig_code,
                        "origin_country":   orig_name,
                        "origin_continent": CODE_CONTINENT[orig_code],
                        "dest_code":        dest_code,
                        "dest_country":     dest_name,
                        "dest_continent":   CODE_CONTINENT[dest_code],
                        "year":             yr,
                        "stock":            int(val),
                    })
        wb.close()

        df = pd.DataFrame(rows)
        df = df[df["year"].between(MIN_YEAR, MAX_YEAR)]
        save("migration.csv", df.sort_values(["origin_code", "dest_code", "year"]))
    except Exception as e:
        report("migration.csv", pd.DataFrame(), str(e))


# ── mpi.csv ───────────────────────────────────────────────────────────────────
# value = MPI score (0–1), national level only
# Fonte: OPHI Global MPI via HDX
def make_mpi():
    try:
        df = pd.read_csv(os.path.join(RAW, "multidimensional-poverty-index-mpi.csv"))
        df = df.rename(columns={
            "Code":                                    "code",
            "Entity":                                  "country",
            "Year":                                    "year",
            "Multidimensional Poverty Index (MPI)":    "value",
            "World region according to OWID":          "continent",
        })
        df = df[df["code"].notna() & (df["code"].str.strip() != "")]
        df = df[df["value"].notna() & (df["value"] > 0)]
        out = df[["code", "country", "continent", "year", "value"]].copy()
        out = out.sort_values(["code", "year"])
        save("mpi.csv", out)
    except Exception as e:
        report("mpi.csv", pd.DataFrame(), str(e))


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Remove stale aggregated files
    for stale in ("bubble.csv", "trends.csv", "child_labor_trends.csv",
                  "child_marriage_trends.csv", "out_of_school.csv",
                  "migration_continent.csv", "migration_country.csv"):
        p = os.path.join(OUT, stale)
        if os.path.exists(p):
            os.remove(p)
            print(f"  [DEL] {stale}")

    print("\nVeni Vidi Viz -- Preprocessing\n" + "=" * 55)
    make_life_expectancy()
    make_edu_spending()
    make_edu_completion()
    make_literacy()
    make_income()
    make_population()
    make_child_labor()
    make_child_marriage()
    make_out_of_school()
    make_poverty()
    make_gini()
    make_gpi_secondary()

    make_child_mortality()
    make_maternal_mortality()
    make_remittances()
    make_migration()
    make_mpi()
    print("\nDone -> src/datasets/processed/")
    for f in sorted(os.listdir(OUT)):
        size = os.path.getsize(os.path.join(OUT, f))
        print(f"  {f:<50} {size // 1024:>4} KB")
