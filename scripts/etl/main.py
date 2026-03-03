import os
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_DIR = os.path.join(BASE_DIR, '../../dataset/raw')
CLEAN_DATA_DIR = os.path.join(BASE_DIR, '../../dataset/clean')

os.makedirs(CLEAN_DATA_DIR, exist_ok=True)

LIFE_EXPECTANCY_PATH = os.path.join(RAW_DATA_DIR, 'life-expectancy/life-expectancy.csv')
COUNTRY_CODE_PATH = os.path.join(RAW_DATA_DIR, 'country-codes/country-code.csv')
GDP_PATH = os.path.join(RAW_DATA_DIR, 'gdp-per-capita/gdp-per-capita.csv')

def process_life_expectancy():
    logging.info("Processing Life Expectancy...")
    life_expectancy_df = pd.read_csv(LIFE_EXPECTANCY_PATH)
    country_codes = pd.read_csv(COUNTRY_CODE_PATH)
    country_codes_prep = country_codes[['Three_Letter_Country_Code', 'Continent_Name']].copy()
    country_codes_prep.columns = ['Code', 'Continent']
    country_codes_prep = country_codes_prep[country_codes_prep['Code'].notna() & (country_codes_prep['Code'] != '')]
    life_expectancy_merged = life_expectancy_df.merge(
        country_codes_prep,
        left_on='Code',
        right_on='Code',
        how='left'
    )
    life_expectancy_merged = life_expectancy_merged.drop_duplicates(subset=['Code', 'Year'])
    life_expectancy_merged = life_expectancy_merged[life_expectancy_merged['Code'].notna()].copy()
    life_exp_filtered = life_expectancy_merged[
        (life_expectancy_merged['Continent'].notna()) &
        (life_expectancy_merged['Year'] >= 2000) &
        (life_expectancy_merged['Year'] <= 2025)
    ].copy()
    output_path = os.path.join(CLEAN_DATA_DIR, 'life_expectancy.csv')
    life_exp_filtered.to_csv(output_path, index=False)
    logging.info(f"Life Expectancy saved to {output_path}")


def process_gdp():
    logging.info("\nProcessing GDP Per Capita...")
    gdp_df = pd.read_csv(GDP_PATH, skiprows=4)
    year_columns = [str(year) for year in range(1960, 2026) if str(year) in gdp_df.columns]
    gdp_melted = gdp_df[['Country Name', 'Country Code'] + year_columns].copy()
    gdp_long = gdp_melted.melt(id_vars=['Country Name', 'Country Code'], 
                               var_name='Year', 
                               value_name='GDP_Per_Capita')
    gdp_long['Year'] = pd.to_numeric(gdp_long['Year'], errors='coerce')
    gdp_long['GDP_Per_Capita'] = pd.to_numeric(gdp_long['GDP_Per_Capita'], errors='coerce')
    gdp_long = gdp_long[(gdp_long['Year'] >= 2000) & (gdp_long['Year'] <= 2025)]
    gdp_long = gdp_long[gdp_long['GDP_Per_Capita'].notna()].reset_index(drop=True)
    gdp_long = gdp_long.rename(columns={'Country Code': 'Code', 'GDP_Per_Capita': 'GDP_Per_Capita (USD)'})
    country_codes_full = pd.read_csv(COUNTRY_CODE_PATH)
    country_regions = country_codes_full[['Three_Letter_Country_Code', 'Continent_Name']].rename(columns={'Three_Letter_Country_Code': 'Code', 'Continent_Name': 'Continent'})
    country_regions = country_regions.drop_duplicates(subset=['Code'])
    gdp_with_region = gdp_long.merge(country_regions, on='Code', how='left')
    gdp_with_region = gdp_with_region[gdp_with_region['Continent'].notna()].copy()
    gdp_long_path = os.path.join(CLEAN_DATA_DIR, 'gdp_per_capita.csv')
    gdp_with_region.to_csv(gdp_long_path, index=False)
    logging.info(f"GDP Per Capita saved to {gdp_long_path}")


if __name__ == '__main__':
    logging.info("Starting ETL pipeline...\n")
    try:
        process_life_expectancy()
        process_gdp()
        logging.info("All ETL processing completed successfully")
        logging.info(f"Files for charts are available in the directory: {CLEAN_DATA_DIR}")
    except Exception as e:
        logging.error(f"An error occurred during the ETL execution: {e}")
