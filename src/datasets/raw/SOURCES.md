# Raw Dataset Sources

Each file listed here is used directly by `scripts/preprocess.py` to generate the processed datasets in `src/datasets/processed/`.

| File | Metric | Source | Download URL |
|---|---|---|---|
| `country-code.csv` | ISO 3166 country codes + continent mapping | GitHub / lukes | https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv |
| `gdp_per_capita.csv` | GDP per capita (USD, current prices) | World Bank WDI — NY.GDP.PCAP.CD | https://api.worldbank.org/v2/en/indicator/NY.GDP.PCAP.CD?downloadformat=csv |
| `life_expectancy.csv` | Life expectancy at birth (years) | Our World in Data / UN WPP | https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full&useColumnShortNames=false |
| `edu_spending.csv` | Government expenditure on education, total (% of GDP) | World Bank WDI — SE.XPD.TOTL.GD.ZS | https://api.worldbank.org/v2/en/indicator/SE.XPD.TOTL.GD.ZS?downloadformat=csv |
| `edu_completion.csv` | Completion rate, upper secondary education, both sexes (%) | Our World in Data / SDG 4.1.2 | https://ourworldindata.org/grapher/completion-rate-of-upper-secondary-education-sdg.csv?v=1&csvType=full&useColumnShortNames=false |
| `literacy.csv` | Literacy rate, adult total (% of people ages 15+) | Our World in Data / UNESCO UIS | https://ourworldindata.org/grapher/literacy.csv?v=1&csvType=full&useColumnShortNames=false |
| `child_labor_raw.csv` | Share of children (5-17) engaged in economic activity (%) | Our World in Data / ILO-UNICEF | https://ourworldindata.org/grapher/children-aged-5-17-engaged-in-labor.csv?v=1&csvType=full&useColumnShortNames=false |
| `child_marriage_raw.csv` | Women first married by age 18 (% of women ages 20-24) | UNICEF — Child Marriage Dataset 2024 | https://data.unicef.org/wp-content/uploads/2024/10/Child-marriage-dataset-2024.xlsx |
| `XLS_FGM-Girls-prevalence.xlsx` | Prevalence of FGM among girls aged 0-14, including wealth-quintile breakdowns used for the visualization | HDX / UNICEF — FGM dataset | https://data.humdata.org/dataset/unicef-pt-chld-1-14-ps-psy-v-cgvr |
| `child_population_raw.xlsx` | Population by 5-year age groups, both sexes | UN World Population Prospects 2024 | https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/EXCEL_FILES/2_Population/WPP2024_POP_F02_1_POPULATION_5-YEAR_AGE_GROUPS_BOTH_SEXES.xlsx |
| `out_of_school_raw.csv` | Children out of primary school, both sexes (number) | Our World in Data / UNESCO UIS | https://ourworldindata.org/grapher/out-of-school-children-of-primary-school-age-by-world-region.csv?v=1&csvType=full&useColumnShortNames=true |
| `poverty_raw.csv` | Share of population living on less than $2.15/day (%) | Our World in Data / World Bank PIP | https://ourworldindata.org/grapher/share-of-population-living-in-extreme-poverty-2017-prices.csv?v=1&csvType=full&useColumnShortNames=false |
| `gini_raw.csv` | Gini coefficient (0=equal, 1=fully unequal) | Our World in Data / World Bank PIP | https://ourworldindata.org/grapher/economic-inequality-gini-index.csv?v=1&csvType=full&useColumnShortNames=false |
| `gpi_secondary_raw.csv` | Gender parity index, lower secondary net enrollment (1=parity, <1=boys favored) | Our World in Data / UNESCO UIS | https://ourworldindata.org/grapher/secondary-net-enrollment-gpi.csv?v=1&csvType=full&useColumnShortNames=false |
| `pupil_teacher_raw.csv` | Pupils per qualified teacher, primary education | Our World in Data / UNESCO UIS | https://ourworldindata.org/grapher/pupil-teacher-ratio-for-primary-education-by-country.csv?v=1&csvType=full&useColumnShortNames=false |
| `remittances_raw.csv` | Personal remittances received (% of GDP) | Our World in Data / World Bank (IMF + OECD) | https://ourworldindata.org/grapher/money-sent-or-brought-back-by-migrants-as-a-share-of-gdp.csv?v=1&csvType=full&useColumnShortNames=false |
| `migration_bilateral_raw.xlsx` | International migrant stock bilateral matrix 233×233 countries, 1990–2020 | UN DESA — International Migrant Stock 2020 | https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/undesa_pd_2020_ims_stock_by_sex_destination_and_origin.xlsx |
| `undesa_pd_2019_wmd_marital_status.xlsx` | Marital status distribution by age group, sex, country — 232 countries ca. 1950–2019 | UN DESA — World Marriage Data 2019 | https://www.un.org/development/desa/pd/data/world-marriage-data |
| `CMMM_prevalence.xlsx` | Prevalence and burden of child marriage: % and absolute number of women married by 15 and by 18, disaggregated by residence, wealth and education | Child Marriage Monitoring Mechanism (CMMM) — UNICEF/UNFPA, updated 30 Jun 2025 | https://childmarriagedata.org/data-centre/ |
