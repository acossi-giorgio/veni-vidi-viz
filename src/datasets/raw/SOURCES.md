# Raw Dataset Sources

Each file listed here is used directly by `scripts/preprocess.py` to generate the processed datasets in `src/datasets/processed/`.

| File | Metric | Source | Download URL |
|---|---|---|---|
| `country-code.csv` | ISO 3166 country codes + continent mapping | GitHub / lukes | https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv |
| `gdp_per_capita.csv` | GDP per capita (USD, current prices) | World Bank WDI — NY.GDP.PCAP.CD | https://api.worldbank.org/v2/en/indicator/NY.GDP.PCAP.CD?downloadformat=csv |
| `life_expectancy.csv` | Life expectancy at birth (years) | Our World in Data / UN WPP | https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full&useColumnShortNames=false |
| `edu_spending.csv` | Government expenditure on education, total (% of GDP) | World Bank WDI — SE.XPD.TOTL.GD.ZS | https://api.worldbank.org/v2/en/indicator/SE.XPD.TOTL.GD.ZS?downloadformat=csv |
| `edu_spending_level.csv` | Government expenditure on education as % of GDP (UNESCO/IMF) | UNESCO UIS API — XGOVEXP.IMF | https://api.uis.unesco.org/api/public/data/indicators/export?indicator=XGOVEXP.IMF&start=2000&end=2025&format=csv |
| `edu_completion.csv` | Completion rate, upper secondary education, both sexes (%) | Our World in Data / SDG 4.1.2 | https://ourworldindata.org/grapher/completion-rate-of-upper-secondary-education-sdg.csv?v=1&csvType=full&useColumnShortNames=false |
| `literacy.csv` | Literacy rate, adult total (% of people ages 15+) | Our World in Data / UNESCO UIS | https://ourworldindata.org/grapher/literacy.csv?v=1&csvType=full&useColumnShortNames=false |
| `child_labor_raw.csv` | Share of children (5-17) engaged in economic activity (%) | Our World in Data / ILO-UNICEF | https://ourworldindata.org/grapher/children-aged-5-17-engaged-in-labor.csv?v=1&csvType=full&useColumnShortNames=false |
| `child_marriage_raw.csv` | Women first married by age 18 (% of women ages 20-24) | UNICEF — Child Marriage Dataset 2024 | https://data.unicef.org/wp-content/uploads/2024/10/Child-marriage-dataset-2024.xlsx |
| `child_population_raw.xlsx` | Population by 5-year age groups, both sexes | UN World Population Prospects 2024 | https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/EXCEL_FILES/2_Population/WPP2024_POP_F02_1_POPULATION_5-YEAR_AGE_GROUPS_BOTH_SEXES.xlsx |
| `out_of_school_raw.csv` | Children out of primary school, both sexes (number) | Our World in Data / UNESCO UIS | https://ourworldindata.org/grapher/out-of-school-children-of-primary-school-age-by-world-region.csv?v=1&csvType=full&useColumnShortNames=true |
| `migration_bilateral_raw.xlsx` | International migrant stock by sex and origin (UN DESA 2024) | UN DESA — International Migrant Stock | https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/undesa_pd_2024_ims_stock_by_sex_and_origin.xlsx |
