"""
Veni Vidi Viz — Preprocessing script
Reads raw datasets, produces clean CSVs in src/datasets/processed/
Run from project root: python scripts/preprocess.py
"""

import os
import sys
import pandas as pd
import numpy as np

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "src", "datasets", "raw")
CLEAN = os.path.join(ROOT, "src", "datasets", "clean")
OUT = os.path.join(ROOT, "src", "datasets", "processed")
os.makedirs(OUT, exist_ok=True)

# ── ISO3 → Continent mapping ───────────────────────────────────────────────────
def load_iso3_continent():
    path = os.path.join(RAW, "country-codes", "country-code.csv")
    df = pd.read_csv(path)
    df = df.rename(columns={
        "Three_Letter_Country_Code": "iso3",
        "Continent_Name": "continent"
    })[["iso3", "continent"]].dropna()
    # Standardize continent names
    remap = {
        "Asia": "Asia",
        "Europe": "Europe",
        "Africa": "Africa",
        "North America": "North America",
        "South America": "South America",
        "Oceania": "Oceania",
        "Antarctica": "Oceania",  # keep small, merge into Oceania
    }
    df["continent"] = df["continent"].map(remap).fillna(df["continent"])
    return df.set_index("iso3")["continent"].to_dict()

ISO3_CONTINENT = load_iso3_continent()

# ── SDG Region mapping (approximate, for trends chart) ─────────────────────────
SDG_REGIONS = {
    "Africa": "Sub-Saharan Africa",
    "Asia": "Central and Southern Asia",
    "Europe": "Europe and Northern America",
    "North America": "Europe and Northern America",
    "South America": "Latin America and the Caribbean",
    "Oceania": "Oceania",
}

# ── Helpers ────────────────────────────────────────────────────────────────────
def report(name, df, error=None):
    if error:
        print(f"  [ERR] {name} - {error}")
    else:
        print(f"  [OK]  {name:<40} - {len(df):,} rows")


# ── 01: Income by continent ────────────────────────────────────────────────────
def make_01():
    try:
        df = pd.read_csv(os.path.join(CLEAN, "gdp_per_capita.csv"))
        df = df.rename(columns={
            "Country Name": "country",
            "Code": "iso3",
            "Year": "year",
            "GDP_Per_Capita (USD)": "value",
            "Continent": "continent",
        })
        df = df[df["continent"].notna() & df["year"].between(2000, 2024)]
        agg = (
            df.groupby(["continent", "year"])["value"]
            .mean()
            .reset_index()
        )
        agg.to_csv(os.path.join(OUT, "01_income_continent.csv"), index=False)
        report("01_income_continent.csv", agg)
    except Exception as e:
        report("01_income_continent.csv", pd.DataFrame(), str(e))


# ── 02: Income by country ──────────────────────────────────────────────────────
def make_02():
    try:
        df = pd.read_csv(os.path.join(CLEAN, "gdp_per_capita.csv"))
        df = df.rename(columns={
            "Country Name": "country",
            "Code": "iso3",
            "Year": "year",
            "GDP_Per_Capita (USD)": "value",
            "Continent": "continent",
        })
        df = df[df["year"].between(2000, 2024)][
            ["iso3", "country", "continent", "year", "value"]
        ]
        df.to_csv(os.path.join(OUT, "02_income_country.csv"), index=False)
        report("02_income_country.csv", df)
    except Exception as e:
        report("02_income_country.csv", pd.DataFrame(), str(e))


# ── 03: Life expectancy pivot ──────────────────────────────────────────────────
def make_03():
    try:
        df = pd.read_csv(os.path.join(CLEAN, "life_expectancy.csv"))
        df = df.rename(columns={
            "Entity": "country",
            "Code": "iso3",
            "Year": "year",
            "Life expectancy": "value",
            "Continent": "continent",
        })
        df = df[df["continent"].notna()]

        y2000 = df[df["year"] == 2000][["iso3", "country", "continent", "value"]].rename(columns={"value": "year_2000"})
        y2023 = df[df["year"] == 2023][["iso3", "value"]].rename(columns={"value": "year_2023"})

        merged = y2000.merge(y2023, on="iso3", how="inner")
        merged["delta"] = merged["year_2023"] - merged["year_2000"]

        # Continent-level averages too
        cont = merged.groupby("continent").agg(
            year_2000=("year_2000", "mean"),
            year_2023=("year_2023", "mean"),
            delta=("delta", "mean"),
        ).reset_index()
        cont["iso3"] = cont["continent"].str[:3].str.upper()
        cont["country"] = cont["continent"]

        out = pd.concat([merged, cont], ignore_index=True)
        out.to_csv(os.path.join(OUT, "03_life_expectancy.csv"), index=False)
        report("03_life_expectancy.csv", out)
    except Exception as e:
        report("03_life_expectancy.csv", pd.DataFrame(), str(e))


# ── 04: Education spending (World Bank) ───────────────────────────────────────
def make_04():
    try:
        raw_path = os.path.join(RAW, "edu_spending_raw.csv")
        # World Bank format: skip first 4 rows of metadata, row 5 is header
        df = pd.read_csv(raw_path, skiprows=4, encoding="utf-8-sig")
        df = df.rename(columns={"Country Name": "country", "Country Code": "iso3"})

        # Melt years
        year_cols = [c for c in df.columns if str(c).isdigit() and 2000 <= int(c) <= 2024]
        melted = df.melt(
            id_vars=["iso3", "country"],
            value_vars=year_cols,
            var_name="year",
            value_name="pct_gdp",
        )
        melted["year"] = melted["year"].astype(int)
        melted = melted.dropna(subset=["pct_gdp"])
        melted["continent"] = melted["iso3"].map(ISO3_CONTINENT)

        out = melted[["iso3", "country", "continent", "year", "pct_gdp"]]
        out.to_csv(os.path.join(OUT, "04_edu_spending.csv"), index=False)
        report("04_edu_spending.csv", out)
    except Exception as e:
        report("04_edu_spending.csv", pd.DataFrame(), str(e))


# ── 04b: Education spending by level (UNESCO) ─────────────────────────────────
def make_04b():
    try:
        raw_path = os.path.join(RAW, "edu_spending_level_raw.csv")
        df = pd.read_csv(raw_path)
        df = df.rename(columns={"geoUnit": "iso3", "year": "year", "value": "pct_gdp"})
        df = df[df["year"].between(2000, 2024)][["iso3", "year", "pct_gdp"]]
        df["country"] = df["iso3"]
        df["continent"] = df["iso3"].map(ISO3_CONTINENT)
        df["level"] = "total"  # UNESCO XGOVEXP.IMF = total gov expenditure on education
        df.to_csv(os.path.join(OUT, "04b_edu_spending_level.csv"), index=False)
        report("04b_edu_spending_level.csv", df)
    except Exception as e:
        report("04b_edu_spending_level.csv", pd.DataFrame(), str(e))


# ── 05: Education completion ──────────────────────────────────────────────────
def make_05():
    try:
        df = pd.read_csv(os.path.join(RAW, "edu_completion_raw.csv"))
        df = df.rename(columns={
            "Entity": "country",
            "Code": "iso3",
            "Year": "year",
            df.columns[-1]: "total",
        })
        df = df[df["iso3"].notna() & (df["iso3"] != "")]

        # Keep most recent year per country
        idx = df.groupby("iso3")["year"].idxmax()
        latest = df.loc[idx].copy()
        latest["continent"] = latest["iso3"].map(ISO3_CONTINENT)
        latest["female"] = np.nan
        latest["male"] = np.nan

        out = latest[["iso3", "country", "continent", "year", "total", "female", "male"]]
        out.to_csv(os.path.join(OUT, "05_edu_completion.csv"), index=False)
        report("05_edu_completion.csv", out)
    except Exception as e:
        report("05_edu_completion.csv", pd.DataFrame(), str(e))


# ── 06: Literacy ──────────────────────────────────────────────────────────────
def make_06():
    try:
        df = pd.read_csv(os.path.join(RAW, "literacy_raw.csv"))
        df = df.rename(columns={
            "Entity": "country",
            "Code": "iso3",
            "Year": "year",
            df.columns[-1]: "adult_total",
        })
        df = df[df["iso3"].notna() & (df["iso3"] != "")]
        df["continent"] = df["iso3"].map(ISO3_CONTINENT)

        # Fill missing sex-disaggregated columns with nan
        for col in ["adult_female", "adult_male", "youth_total", "youth_female", "youth_male"]:
            df[col] = np.nan

        out = df[["iso3", "country", "continent", "year",
                  "adult_total", "adult_female", "adult_male",
                  "youth_total", "youth_female", "youth_male"]]
        out = out[out["year"].between(1990, 2024)]
        out.to_csv(os.path.join(OUT, "06_literacy.csv"), index=False)
        report("06_literacy.csv", out)
    except Exception as e:
        report("06_literacy.csv", pd.DataFrame(), str(e))


# ── 07: Bubble chart (income + child labor + population) ──────────────────────
def make_07():
    try:
        # Income
        income = pd.read_csv(os.path.join(CLEAN, "gdp_per_capita.csv"))
        income = income.rename(columns={
            "Country Name": "country",
            "Code": "iso3",
            "Year": "year",
            "GDP_Per_Capita (USD)": "income",
            "Continent": "continent",
        })[["iso3", "country", "continent", "year", "income"]]
        income = income[income["year"].between(2000, 2023)]

        # Child labor
        labor = pd.read_csv(os.path.join(RAW, "child_labor_raw.csv"))
        labor = labor.rename(columns={
            "Entity": "country",
            "Code": "iso3",
            "Year": "year",
            labor.columns[-1]: "child_labor_pct",
        })[["iso3", "year", "child_labor_pct"]]
        labor = labor[labor["iso3"].notna() & (labor["iso3"] != "")]

        # Population 5-17 from UN WPP
        pop = _load_wpp_pop()

        # Merge: use child labor years, join nearest income year, join pop
        merged = labor.merge(income, on=["iso3", "year"], how="left")
        # For countries where income year doesn't match, try the closest year
        # Simple approach: just merge on exact year first, then fill with country mean
        merged = merged.merge(pop, on=["iso3", "year"], how="left")
        merged = merged.dropna(subset=["income", "child_labor_pct"])

        # Fill missing continent from iso3 map
        mask = merged["continent"].isna()
        merged.loc[mask, "continent"] = merged.loc[mask, "iso3"].map(ISO3_CONTINENT)

        out = merged[["iso3", "country", "continent", "year", "income", "child_labor_pct", "pop_5_17"]]
        out.to_csv(os.path.join(OUT, "07_bubble.csv"), index=False)
        report("07_bubble.csv", out)
    except Exception as e:
        report("07_bubble.csv", pd.DataFrame(), str(e))


def _load_wpp_pop():
    try:
        # Read with pandas - skip 16 metadata rows, header is row 17 (0-indexed: 16)
        df = pd.read_excel(
            os.path.join(RAW, "child_population_raw.xlsx"),
            sheet_name="Estimates",
            header=16,  # row 17 is header (0-indexed = 16)
            usecols=[1, 5, 10, 12, 13, 14],  # Variant, ISO3, Year, 5-9, 10-14, 15-19
        )
        df.columns = ["variant", "iso3", "year", "pop_5_9", "pop_10_14", "pop_15_19"]
        df = df[df["variant"] == "Estimates"].copy()
        df = df[df["iso3"].notna() & (df["iso3"] != "")]
        df["pop_5_17"] = (
            df["pop_5_9"].fillna(0) +
            df["pop_10_14"].fillna(0) +
            df["pop_15_19"].fillna(0) * 0.6
        ) * 1000  # WPP in thousands
        df["year"] = df["year"].astype(int)
        return df[["iso3", "year", "pop_5_17"]].reset_index(drop=True)
    except Exception as e:
        print(f"    [warn] WPP population load failed: {str(e)[:120]}")
        return pd.DataFrame(columns=["iso3", "year", "pop_5_17"])


# ── 08: Child marriage ────────────────────────────────────────────────────────
def make_08():
    try:
        df = pd.read_csv(os.path.join(RAW, "child_marriage_raw.csv"))
        df = df.rename(columns={
            "Entity": "country",
            "Code": "iso3",
            "Year": "year",
            df.columns[-2]: "married_before_18",  # second-to-last col is the value
        })
        # "World region according to OWID" is the last column
        df = df.rename(columns={df.columns[-1]: "owid_region"})

        # Map to SDG region
        region_map = {
            "Sub-Saharan Africa": "Sub-Saharan Africa",
            "South Asia": "Central and Southern Asia",
            "Middle East & North Africa": "Northern Africa and Western Asia",
            "East Asia & Pacific": "Eastern and South-Eastern Asia",
            "Latin America & Caribbean": "Latin America and the Caribbean",
            "Europe & Central Asia": "Europe and Northern America",
            "North America": "Europe and Northern America",
        }
        df["region"] = df["owid_region"].map(region_map).fillna(
            df["iso3"].map(ISO3_CONTINENT).map(SDG_REGIONS)
        )
        df["continent"] = df["iso3"].map(ISO3_CONTINENT)

        # Use most recent available year per country
        idx = df.groupby("iso3")["year"].idxmax()
        latest = df.loc[idx].copy()
        latest["married_before_15"] = np.nan
        latest["children_before_18"] = np.nan

        out = latest[["iso3", "country", "continent", "region", "year",
                       "married_before_18", "married_before_15", "children_before_18"]]
        out.to_csv(os.path.join(OUT, "08_child_marriage.csv"), index=False)
        report("08_child_marriage.csv", out)

        # Also save full time series for chart 9
        full = df[["iso3", "country", "region", "year", "married_before_18"]].copy()
        full.to_csv(os.path.join(OUT, "08_child_marriage_timeseries.csv"), index=False)
    except Exception as e:
        report("08_child_marriage.csv", pd.DataFrame(), str(e))


# ── 09: Trends (child labor + marriage + out-of-school) ───────────────────────
def make_09():
    try:
        # Child labor
        labor = pd.read_csv(os.path.join(RAW, "child_labor_raw.csv"))
        labor = labor.rename(columns={
            "Entity": "country", "Code": "iso3", "Year": "year",
            labor.columns[-1]: "value",
        })
        labor["indicator"] = "child_labor"
        labor["region"] = labor["iso3"].map(ISO3_CONTINENT).map(SDG_REGIONS)
        labor = labor[["iso3", "country", "region", "year", "indicator", "value"]]

        # Child marriage
        marriage_path = os.path.join(OUT, "08_child_marriage_timeseries.csv")
        if os.path.exists(marriage_path):
            marriage = pd.read_csv(marriage_path)
            marriage = marriage.rename(columns={"married_before_18": "value"})
            marriage["indicator"] = "child_marriage"
            marriage = marriage[["iso3", "country", "region", "year", "indicator", "value"]]
        else:
            marriage = pd.DataFrame(columns=["iso3", "country", "region", "year", "indicator", "value"])

        # Out of school
        school = pd.read_csv(os.path.join(RAW, "out_of_school_raw.csv"))
        school = school.rename(columns={
            school.columns[0]: "country",
            school.columns[1]: "iso3",
            school.columns[2]: "year",
            school.columns[3]: "value",
        })
        school["indicator"] = "out_of_school"
        school["region"] = school["iso3"].map(ISO3_CONTINENT).map(SDG_REGIONS)
        school = school[["iso3", "country", "region", "year", "indicator", "value"]]

        out = pd.concat([labor, marriage, school], ignore_index=True)
        out = out[out["year"].between(1990, 2024)].dropna(subset=["value"])

        # Regional aggregates
        reg_agg = (
            out.groupby(["region", "year", "indicator"])["value"]
            .mean()
            .reset_index()
        )
        reg_agg["iso3"] = ""
        reg_agg["country"] = reg_agg["region"]
        out_combined = pd.concat([out, reg_agg], ignore_index=True)

        out_combined.to_csv(os.path.join(OUT, "09_trends.csv"), index=False)
        report("09_trends.csv", out_combined)
    except Exception as e:
        report("09_trends.csv", pd.DataFrame(), str(e))


# ── 10: Migration ────────────────────────────────────────────────────────────
# Source: UN DESA 2024 international migrant stock by origin.
# File structure (Table 1): continent rows (ALL CAPS, loc codes 903-935) already
# aggregate their sub-regions and countries — do NOT double-count by summing
# sub-region/country rows on top of them.
# Produces two files:
#   10_migration_continent.csv  — continent-level totals for chord diagram
#   10_migration_country.csv    — country-level rows for drill-down
# NOTE: no bilateral (origin→destination) data in this file. Values = total
# emigrant stock from that origin living anywhere abroad.
def make_10():
    CONTINENT_LOC_CODES = {903, 935, 908, 904, 905, 909}  # AFRICA, ASIA, EUROPE, LATAM, N.AMERICA, OCEANIA
    CONTINENT_NAMES = {
        903: "Africa",
        935: "Asia",
        908: "Europe",
        904: "Latin America and the Caribbean",
        905: "North America",
        909: "Oceania",
    }
    # Country UN numeric codes are < 900 and > 0 (excluding special aggregates)
    SPECIAL_CODES = {900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 935,
                     910, 911, 912, 913, 914, 915,
                     1500, 1501, 1502, 1503, 1517, 1518,
                     1636, 1637, 1829, 1830, 1831, 1832, 1833, 1834, 1835, 1836,
                     2003, 5503, 5504, 941, 934, 948, 1859}

    try:
        import openpyxl
        wb = openpyxl.load_workbook(
            os.path.join(RAW, "migration_bilateral_raw.xlsx"), read_only=True
        )
        ws = wb["Table 1"]
        # Read enough columns: first 13 (Index, Name, Coverage, None, LocCode, then 8 years both sexes)
        rows = list(ws.iter_rows(min_row=11, max_col=13, values_only=True))
        wb.close()

        header = rows[0]
        # Year columns: positions 5-12 = 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024
        years = [c for c in header[5:13] if isinstance(c, int)]

        continent_records = []
        country_records = []

        # Build country → continent map from file structure
        # Track current continent as we iterate
        current_continent = None

        for row in rows[1:]:
            if not isinstance(row[0], int) or row[1] is None:
                continue
            loc = row[4]
            name = str(row[1]).strip()

            if loc in CONTINENT_LOC_CODES:
                current_continent = CONTINENT_NAMES[loc]
                # Continent-level row — save directly
                for i, yr in enumerate(years):
                    val = row[5 + i]
                    if val is not None:
                        continent_records.append({
                            "origin_continent": current_continent,
                            "year": yr,
                            "stock": val,
                        })
            elif isinstance(loc, int) and loc > 0 and loc not in SPECIAL_CODES and loc < 900:
                # Country-level row
                for i, yr in enumerate(years):
                    val = row[5 + i]
                    if val is not None:
                        country_records.append({
                            "un_loc_code": loc,
                            "country": name,
                            "continent": current_continent,
                            "year": yr,
                            "stock": val,
                        })

        # Continent totals
        cont_df = pd.DataFrame(continent_records)
        cont_df["dest_continent"] = "World"  # bilateral not available
        cont_df.to_csv(os.path.join(OUT, "10_migration_continent.csv"), index=False)
        report("10_migration_continent.csv", cont_df)

        # Country-level drill-down
        # Try to add ISO3 via country name matching with our iso3 lookup
        country_df = pd.DataFrame(country_records)
        # Build name → iso3 reverse map from gdp data (has Country Name + Code)
        try:
            gdp_ref = pd.read_csv(os.path.join(CLEAN, "gdp_per_capita.csv"))[
                ["Country Name", "Code"]
            ].drop_duplicates()
            name_to_iso3 = dict(zip(gdp_ref["Country Name"], gdp_ref["Code"]))
            country_df["iso3"] = country_df["country"].map(name_to_iso3)
        except Exception:
            country_df["iso3"] = None

        country_df.to_csv(os.path.join(OUT, "10_migration_country.csv"), index=False)
        report("10_migration_country.csv", country_df)

    except Exception as e:
        report("10_migration.csv", pd.DataFrame(), str(e))


# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\nVeni Vidi Viz - Preprocessing\n" + "=" * 50)

    make_01()
    make_02()
    make_03()
    make_04()
    make_04b()
    make_05()
    make_06()
    make_07()
    make_08()
    make_09()
    make_10()

    print("\nDone. Output -> src/datasets/processed/")
    files = os.listdir(OUT)
    for f in sorted(files):
        size = os.path.getsize(os.path.join(OUT, f))
        print(f"  {f:<45} {size//1024:>5} KB")
