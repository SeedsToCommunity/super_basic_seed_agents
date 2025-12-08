/**
 * Michigan Flora Online Data Client
 * 
 * Provides utilities for reading and querying the Michigan Flora species database.
 * Data source: MichiganFloraSpeciesDatabase_Michigan_2024.csv (cached locally)
 * 
 * The dataset contains ~2,873 species records from Michigan Flora Online,
 * including native status, coefficient of conservatism, wetness indicators,
 * and other ecological data.
 * 
 * Data Fields:
 * - scientificName: Full botanical binomial (e.g., "Acer saccharum")
 * - family: Taxonomic family (e.g., "Sapindaceae")
 * - acronym: Michigan Flora short code (e.g., "ACESAC")
 * - isNative: Boolean - true if native to Michigan, false if non-native
 * - coefficientC: Coefficient of Conservatism (0-10 scale)
 *     0 = Found in any habitat, tolerant of disturbance
 *     10 = Found only in high-quality natural areas
 * - wetnessW: Coefficient of Wetness (-5 to +5 scale)
 *     -5 = Obligate wetland species
 *     +5 = Obligate upland species
 *     0 = Facultative (equally likely in wetland or upland)
 * - physiognomy: Plant growth form (forb, tree, shrub, grass, vine, fern, etc.)
 * - duration: Life cycle (annual, perennial, biennial)
 * - commonName: Vernacular name(s), may include multiple separated by semicolons
 * 
 * Note: Some scientific names contain annotations (e.g., "Acer nigrum; a. saccharum")
 * indicating taxonomic notes or synonymy within Michigan Flora's treatment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../../cache/MichiganFlora/MichiganFloraSpeciesDatabase_Michigan_2024.csv');

let cachedDataset = null;
let datasetByName = null;

/**
 * Parse a CSV line handling quoted fields
 * @param {string} line - CSV line to parse
 * @returns {string[]} Array of field values
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
}

/**
 * Parse a single data row into a normalized record
 * @param {string[]} fields - Array of CSV field values
 * @returns {Object} Normalized species record
 */
function parseRecord(fields) {
  const [scientificName, family, acronym, nativeStatus, c, w, physiognomy, duration, commonName] = fields;
  
  return {
    scientificName: scientificName || '',
    family: family || '',
    acronym: acronym || '',
    isNative: nativeStatus?.toLowerCase() === 'native',
    nativeStatus: nativeStatus || '',
    coefficientC: parseInt(c, 10) || 0,
    wetnessW: parseInt(w, 10) || 0,
    physiognomy: physiognomy || '',
    duration: duration || '',
    commonName: commonName || ''
  };
}

/**
 * Extract genus and species from a scientific name
 * Handles annotations like "Acer nigrum; a. saccharum"
 * @param {string} scientificName - Full scientific name
 * @returns {Object} Object with genus and species
 */
function parseScientificName(scientificName) {
  const cleanName = scientificName.split(';')[0].trim();
  const parts = cleanName.split(' ');
  return {
    genus: parts[0] || '',
    species: parts[1] || ''
  };
}

/**
 * Create a normalized lookup key from genus and species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {string} Lowercase lookup key
 */
function createLookupKey(genus, species) {
  return `${genus} ${species}`.toLowerCase().trim();
}

/**
 * Load and parse the Michigan Flora dataset from CSV
 * Results are cached in memory for subsequent calls
 * @returns {Promise<Object[]>} Array of species records
 */
export async function loadDataset() {
  if (cachedDataset) {
    return cachedDataset;
  }
  
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Michigan Flora CSV not found at: ${CSV_PATH}`);
  }
  
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n');
  
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Scientific Name')) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    throw new Error('Could not find header row with "Scientific Name" in CSV');
  }
  
  const dataLines = lines.slice(headerIndex + 1).filter(line => line.trim() !== '');
  
  cachedDataset = dataLines.map(line => {
    const fields = parseCSVLine(line);
    return parseRecord(fields);
  });
  
  datasetByName = new Map();
  for (const record of cachedDataset) {
    const { genus, species } = parseScientificName(record.scientificName);
    const key = createLookupKey(genus, species);
    datasetByName.set(key, record);
    datasetByName.set(record.scientificName.toLowerCase(), record);
  }
  
  console.log(`[michigan-flora-client] Loaded ${cachedDataset.length} species records`);
  
  return cachedDataset;
}

/**
 * Find a species record by scientific name
 * @param {string} scientificName - Full scientific name OR genus + species
 * @returns {Promise<Object|null>} Species record or null if not found
 */
export async function findByScientificName(scientificName) {
  await loadDataset();
  
  const key = scientificName.toLowerCase().trim();
  return datasetByName.get(key) || null;
}

/**
 * Find a species record by genus and species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<Object|null>} Species record or null if not found
 */
export async function findByGenusSpecies(genus, species) {
  await loadDataset();
  
  const key = createLookupKey(genus, species);
  return datasetByName.get(key) || null;
}

/**
 * Check if a species is native to Michigan
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<boolean|null>} true if native, false if non-native, null if not found
 */
export async function isNative(genus, species) {
  const record = await findByGenusSpecies(genus, species);
  return record ? record.isNative : null;
}

/**
 * Get the Coefficient of Conservatism for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<number|null>} C value (0-10) or null if not found
 */
export async function getCoefficient(genus, species) {
  const record = await findByGenusSpecies(genus, species);
  return record ? record.coefficientC : null;
}

/**
 * Get the Wetness Indicator for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<number|null>} W value (-5 to +5) or null if not found
 */
export async function getWetness(genus, species) {
  const record = await findByGenusSpecies(genus, species);
  return record ? record.wetnessW : null;
}

/**
 * Get the common name(s) for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<string|null>} Common name(s) or null if not found
 */
export async function getCommonName(genus, species) {
  const record = await findByGenusSpecies(genus, species);
  return record ? record.commonName : null;
}

/**
 * Get all native species from the dataset
 * @returns {Promise<Object[]>} Array of native species records
 */
export async function getNativeSpecies() {
  const dataset = await loadDataset();
  return dataset.filter(record => record.isNative);
}

/**
 * Get all non-native species from the dataset
 * @returns {Promise<Object[]>} Array of non-native species records
 */
export async function getNonNativeSpecies() {
  const dataset = await loadDataset();
  return dataset.filter(record => !record.isNative);
}

/**
 * Get dataset summary statistics
 * @returns {Promise<Object>} Summary statistics
 */
export async function getDatasetStats() {
  const dataset = await loadDataset();
  
  const native = dataset.filter(r => r.isNative);
  const nonNative = dataset.filter(r => !r.isNative);
  
  const nativeCSum = native.reduce((sum, r) => sum + r.coefficientC, 0);
  const nativeMeanC = native.length > 0 ? (nativeCSum / native.length).toFixed(1) : 0;
  
  const totalCSum = dataset.reduce((sum, r) => sum + r.coefficientC, 0);
  const totalMeanC = dataset.length > 0 ? (totalCSum / dataset.length).toFixed(1) : 0;
  
  return {
    totalSpecies: dataset.length,
    nativeSpecies: native.length,
    nonNativeSpecies: nonNative.length,
    totalMeanC: parseFloat(totalMeanC),
    nativeMeanC: parseFloat(nativeMeanC)
  };
}

/**
 * Clear the cached dataset (useful for testing)
 */
export function clearCache() {
  cachedDataset = null;
  datasetByName = null;
}
