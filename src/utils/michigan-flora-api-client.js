/**
 * Michigan Flora REST API Client
 * 
 * Provides utilities for querying the Michigan Flora REST API and caching responses.
 * API Base URL: https://michiganflora.net/api/v1.0/
 * 
 * This client complements the CSV-based client by providing access to:
 * - Species descriptions (spec_text)
 * - Synonyms (synonyms)
 * - County locations (locs_sp)
 * - Real-time species lookup with plant_id
 * 
 * All responses are cached to avoid redundant API calls.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'https://michiganflora.net/api/v1.0';
const CACHE_DIR = path.join(__dirname, '../../cache/MichiganFlora/API');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function normalizeGenus(genus) {
  const trimmed = genus.trim();
  let normalized = trimmed.toLowerCase();
  
  for (let i = 0; i < normalized.length; i++) {
    if (/[a-z]/i.test(normalized[i])) {
      normalized = normalized.substring(0, i) + 
                   normalized[i].toUpperCase() + 
                   normalized.substring(i + 1);
      break;
    }
  }
  
  return normalized;
}

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9×-]/g, '_');
}

function getCachePath(genus, species, endpoint) {
  const normalizedGenus = normalizeGenus(genus);
  const slugSpecies = slugify(species.trim().toLowerCase());
  return path.join(CACHE_DIR, `${normalizedGenus}_${slugSpecies}_${endpoint}.json`);
}

function readCache(genus, species, endpoint) {
  const cachePath = getCachePath(genus, species, endpoint);
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[michigan-flora-api] Error reading cache: ${error.message}`);
      return null;
    }
  }
  return null;
}

function writeCache(genus, species, endpoint, data) {
  ensureCacheDir();
  const cachePath = getCachePath(genus, species, endpoint);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[michigan-flora-api] Cached ${endpoint} for ${genus} ${species}`);
  } catch (error) {
    console.error(`[michigan-flora-api] Error writing cache: ${error.message}`);
  }
}

async function fetchApi(endpoint, params = {}) {
  const url = new URL(`${API_BASE_URL}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BotanicalDataAggregator/1.0'
      }
    });
    
    if (!response.ok) {
      console.log(`[michigan-flora-api] HTTP ${response.status} for ${endpoint}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[michigan-flora-api] Error fetching ${endpoint}: ${error.message}`);
    return null;
  }
}

/**
 * Search for a species by scientific name and return basic data
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<Object|null>} Species data or null if not found
 */
export async function searchSpecies(genus, species) {
  const cached = readCache(genus, species, 'flora');
  if (cached) {
    console.log(`[michigan-flora-api] Cache hit for flora search: ${genus} ${species}`);
    return cached;
  }
  
  const scientificName = `${genus} ${species}`;
  console.log(`[michigan-flora-api] Searching API for: ${scientificName}`);
  
  const result = await fetchApi('flora_search_sp', { scientific_name: scientificName });
  
  if (!result || !Array.isArray(result) || result.length === 0) {
    const emptyResult = { found: false, data: null };
    writeCache(genus, species, 'flora', emptyResult);
    return emptyResult;
  }
  
  const speciesData = result[0];
  const cacheData = {
    found: true,
    data: speciesData,
    fetchedAt: new Date().toISOString()
  };
  
  writeCache(genus, species, 'flora', cacheData);
  return cacheData;
}

/**
 * Get species description text
 * @param {number} plantId - The plant_id from flora search
 * @param {string} genus - Genus name (for caching)
 * @param {string} species - Species epithet (for caching)
 * @returns {Promise<string|null>} Description text or null
 */
export async function getSpeciesText(plantId, genus, species) {
  const cached = readCache(genus, species, 'text');
  if (cached) {
    console.log(`[michigan-flora-api] Cache hit for text: ${genus} ${species}`);
    return cached;
  }
  
  console.log(`[michigan-flora-api] Fetching text for plant_id ${plantId}`);
  const result = await fetchApi('spec_text', { id: plantId });
  
  const cacheData = {
    plantId,
    text: result?.text || null,
    fetchedAt: new Date().toISOString()
  };
  
  writeCache(genus, species, 'text', cacheData);
  return cacheData;
}

/**
 * Get species synonyms
 * @param {number} plantId - The plant_id from flora search
 * @param {string} genus - Genus name (for caching)
 * @param {string} species - Species epithet (for caching)
 * @returns {Promise<Object>} Synonyms data
 */
export async function getSynonyms(plantId, genus, species) {
  const cached = readCache(genus, species, 'synonyms');
  if (cached) {
    console.log(`[michigan-flora-api] Cache hit for synonyms: ${genus} ${species}`);
    return cached;
  }
  
  console.log(`[michigan-flora-api] Fetching synonyms for plant_id ${plantId}`);
  const result = await fetchApi('synonyms', { id: plantId });
  
  const synonyms = result?.synonyms || [];
  const cacheData = {
    plantId,
    synonyms,
    hasSynonyms: synonyms.length > 0,
    fetchedAt: new Date().toISOString()
  };
  
  writeCache(genus, species, 'synonyms', cacheData);
  return cacheData;
}

/**
 * Get county locations where species has been documented
 * @param {number} plantId - The plant_id from flora search
 * @param {string} genus - Genus name (for caching)
 * @param {string} species - Species epithet (for caching)
 * @returns {Promise<Object>} Locations data
 */
export async function getLocations(plantId, genus, species) {
  const cached = readCache(genus, species, 'locations');
  if (cached) {
    console.log(`[michigan-flora-api] Cache hit for locations: ${genus} ${species}`);
    return cached;
  }
  
  console.log(`[michigan-flora-api] Fetching locations for plant_id ${plantId}`);
  const result = await fetchApi('locs_sp', { id: plantId });
  
  const locations = result?.locations || [];
  const cacheData = {
    plantId,
    counties: locations,
    countyCount: locations.length,
    fetchedAt: new Date().toISOString()
  };
  
  writeCache(genus, species, 'locations', cacheData);
  return cacheData;
}

/**
 * Get primary image info
 * @param {number} plantId - The plant_id from flora search
 * @param {string} genus - Genus name (for caching)
 * @param {string} species - Species epithet (for caching)
 * @returns {Promise<Object>} Image data
 */
export async function getPrimaryImage(plantId, genus, species) {
  const cached = readCache(genus, species, 'image');
  if (cached) {
    console.log(`[michigan-flora-api] Cache hit for image: ${genus} ${species}`);
    return cached;
  }
  
  console.log(`[michigan-flora-api] Fetching primary image for plant_id ${plantId}`);
  const result = await fetchApi('pimage_info', { id: plantId });
  
  const cacheData = {
    plantId,
    image: result?.image_id ? result : null,
    fetchedAt: new Date().toISOString()
  };
  
  writeCache(genus, species, 'image', cacheData);
  return cacheData;
}

/**
 * Construct the Michigan Flora record URL for a species
 * @param {number} plantId - The plant_id
 * @returns {string} Full URL to the species page
 */
export function getRecordUrl(plantId) {
  return `https://michiganflora.net/record/${plantId}`;
}

/**
 * Get complete species data from the API
 * Fetches all available data for a species in one call
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<Object>} Complete species data
 */
export async function getCompleteSpeciesData(genus, species) {
  const searchResult = await searchSpecies(genus, species);
  
  if (!searchResult.found || !searchResult.data) {
    return {
      found: false,
      genus,
      species,
      data: null
    };
  }
  
  const plantId = searchResult.data.plant_id;
  const recordUrl = getRecordUrl(plantId);
  
  const [textResult, synonymsResult, locationsResult] = await Promise.all([
    getSpeciesText(plantId, genus, species),
    getSynonyms(plantId, genus, species),
    getLocations(plantId, genus, species)
  ]);
  
  return {
    found: true,
    genus,
    species,
    plantId,
    recordUrl,
    data: {
      ...searchResult.data,
      description: textResult?.text || null,
      synonyms: synonymsResult?.synonyms || [],
      counties: locationsResult?.counties || []
    },
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Clear all cached API responses
 */
export function clearApiCache() {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR);
  let count = 0;
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
      count++;
    }
  }
  
  console.log(`[michigan-flora-api] Cleared ${count} cached API responses`);
}

/**
 * List all cached API responses
 * @returns {string[]} Array of cache file names
 */
export function listCachedResponses() {
  ensureCacheDir();
  return fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
}
