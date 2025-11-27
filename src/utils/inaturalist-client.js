/**
 * iNaturalist API Client
 * 
 * Provides utilities for querying the iNaturalist API for taxonomic data
 * and observation histograms for Southeast Michigan species.
 * 
 * API Documentation: https://api.inaturalist.org/v1/docs/
 * Rate Limits: 60 requests per minute (be respectful of public infrastructure)
 * 
 * Data Retrieved:
 * - Taxa endpoint: Wikipedia excerpt, taxonomy, conservation status, establishment means, common names
 * - Histogram endpoint: Phenology data (observation counts by month) for SE Michigan region
 * 
 * Caching Strategy:
 * - File-based caching in cache/iNaturalist/
 * - Separate files per endpoint type:
 *   - Taxa: Genus_species_inaturalist_taxa.json
 *   - Histogram: Genus_species_inaturalist_histogram.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../cache/iNaturalist');
const API_BASE = 'https://api.inaturalist.org/v1';

/**
 * Southeast Michigan county place_ids (entire county boundaries)
 * Source: iNaturalist Standard Places from US Census TIGER data
 */
const SE_MICHIGAN_PLACE_IDS = {
  washtenaw: 2649,
  livingston: 2609,
  oakland: 2350,
  wayne: 986,
  monroe: 2009,
  jackson: 2948,
  lenawee: 2608
};

/**
 * Get comma-separated list of all SE Michigan place_ids for API queries
 */
function getSEMichiganPlaceIds() {
  return Object.values(SE_MICHIGAN_PLACE_IDS).join(',');
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Generate cache file path for a species and endpoint type
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @param {string} endpointType - 'taxa' or 'histogram'
 * @returns {string} Full path to cache file
 */
function getCachePath(genus, species, endpointType) {
  const cleanGenus = genus.charAt(0).toUpperCase() + genus.slice(1).toLowerCase();
  const cleanSpecies = species.toLowerCase();
  return path.join(CACHE_DIR, `${cleanGenus}_${cleanSpecies}_inaturalist_${endpointType}.json`);
}

/**
 * Read cached data if available
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @param {string} endpointType - 'taxa' or 'histogram'
 * @returns {Object|null} Cached data or null if not found
 */
function readCache(genus, species, endpointType) {
  const cachePath = getCachePath(genus, species, endpointType);
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[inaturalist-client] Error reading cache: ${error.message}`);
      return null;
    }
  }
  return null;
}

/**
 * Write data to cache
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @param {string} endpointType - 'taxa' or 'histogram'
 * @param {Object} data - Data to cache
 */
function writeCache(genus, species, endpointType, data) {
  ensureCacheDir();
  const cachePath = getCachePath(genus, species, endpointType);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[inaturalist-client] Cached ${endpointType} data for ${genus} ${species}`);
  } catch (error) {
    console.error(`[inaturalist-client] Error writing cache: ${error.message}`);
  }
}

/**
 * Request timeout in milliseconds (30 seconds)
 */
const REQUEST_TIMEOUT = 30000;

/**
 * Make a request to the iNaturalist API with User-Agent header and timeout
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<Object>} API response JSON
 */
async function apiRequest(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SeedAndSpeciesAggregator/1.0 (botanical-data-pipeline)'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`iNaturalist API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`iNaturalist API request timed out after ${REQUEST_TIMEOUT}ms`);
    }
    throw error;
  }
}

/**
 * Search for a taxon by scientific name
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<Object|null>} Taxon result or null if not found
 */
async function searchTaxon(genus, species) {
  const scientificName = `${genus} ${species}`;
  const encoded = encodeURIComponent(scientificName);
  
  const data = await apiRequest(`/taxa?q=${encoded}&rank=species`);
  
  if (!data.results || data.results.length === 0) {
    return null;
  }
  
  const exactMatch = data.results.find(r => 
    r.name.toLowerCase() === scientificName.toLowerCase() && r.rank === 'species'
  );
  
  return exactMatch || data.results[0];
}

/**
 * Get full taxon details by ID
 * @param {number} taxonId - iNaturalist taxon ID
 * @returns {Promise<Object|null>} Full taxon details or null
 */
async function getTaxonById(taxonId) {
  const data = await apiRequest(`/taxa/${taxonId}`);
  
  if (!data.results || data.results.length === 0) {
    return null;
  }
  
  return data.results[0];
}

/**
 * Get taxa data for a species (with caching)
 * Returns Wikipedia excerpt, taxonomy, conservation status, establishment means, common names
 * 
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Promise<Object>} Normalized taxa data
 */
export async function getTaxaData(genus, species, useCache = true) {
  if (useCache) {
    const cached = readCache(genus, species, 'taxa');
    if (cached) {
      console.log(`[inaturalist-client] Using cached taxa data for ${genus} ${species}`);
      return cached;
    }
  }
  
  console.log(`[inaturalist-client] Fetching taxa data for ${genus} ${species}`);
  
  try {
    const searchResult = await searchTaxon(genus, species);
    
    if (!searchResult) {
      const emptyResult = {
        found: false,
        scientificName: `${genus} ${species}`,
        taxonId: null,
        wikipediaSummary: '',
        wikipediaUrl: '',
        preferredCommonName: '',
        commonNames: [],
        taxonomy: {},
        conservationStatus: null,
        establishmentMeans: [],
        observationsCount: 0,
        defaultPhotoUrl: null
      };
      writeCache(genus, species, 'taxa', emptyResult);
      return emptyResult;
    }
    
    const fullTaxon = await getTaxonById(searchResult.id);
    const taxon = fullTaxon || searchResult;
    
    const commonNames = [];
    if (taxon.preferred_common_name) {
      commonNames.push(taxon.preferred_common_name);
    }
    if (taxon.names) {
      for (const name of taxon.names) {
        if (name.locale === 'en' && name.name && !commonNames.includes(name.name)) {
          commonNames.push(name.name);
        }
      }
    }
    
    let establishmentMeans = [];
    if (taxon.listed_taxa) {
      const seenMeans = new Set();
      for (const lt of taxon.listed_taxa) {
        if (lt.establishment_means && !seenMeans.has(lt.establishment_means)) {
          seenMeans.add(lt.establishment_means);
          establishmentMeans.push({
            status: lt.establishment_means,
            place: lt.place?.display_name || lt.place?.name || 'Unknown'
          });
        }
      }
    }
    
    const result = {
      found: true,
      scientificName: taxon.name,
      taxonId: taxon.id,
      wikipediaSummary: taxon.wikipedia_summary || '',
      wikipediaUrl: taxon.wikipedia_url || '',
      preferredCommonName: taxon.preferred_common_name || '',
      commonNames: commonNames,
      taxonomy: {
        rank: taxon.rank,
        ancestry: taxon.ancestry,
        iconicTaxonName: taxon.iconic_taxon_name
      },
      conservationStatus: taxon.conservation_status ? {
        authority: taxon.conservation_status.authority,
        status: taxon.conservation_status.status,
        statusName: taxon.conservation_status.status_name,
        iucn: taxon.conservation_status.iucn
      } : null,
      establishmentMeans: establishmentMeans.slice(0, 10),
      observationsCount: taxon.observations_count || 0,
      defaultPhotoUrl: taxon.default_photo?.medium_url || null
    };
    
    writeCache(genus, species, 'taxa', result);
    return result;
    
  } catch (error) {
    console.error(`[inaturalist-client] Error fetching taxa data: ${error.message}`);
    throw error;
  }
}

/**
 * Get observation histogram (phenology) data for SE Michigan region
 * Returns observation counts by month of year
 * 
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Promise<Object>} Histogram data with monthly observation counts
 */
export async function getHistogramData(genus, species, useCache = true) {
  if (useCache) {
    const cached = readCache(genus, species, 'histogram');
    if (cached) {
      console.log(`[inaturalist-client] Using cached histogram data for ${genus} ${species}`);
      return cached;
    }
  }
  
  console.log(`[inaturalist-client] Fetching histogram data for ${genus} ${species}`);
  
  try {
    const searchResult = await searchTaxon(genus, species);
    
    if (!searchResult) {
      const emptyResult = {
        found: false,
        scientificName: `${genus} ${species}`,
        taxonId: null,
        region: 'Southeast Michigan',
        placeIds: SE_MICHIGAN_PLACE_IDS,
        monthlyObservations: {},
        totalObservations: 0,
        peakMonth: null,
        peakMonthName: null
      };
      writeCache(genus, species, 'histogram', emptyResult);
      return emptyResult;
    }
    
    const placeIds = getSEMichiganPlaceIds();
    const data = await apiRequest(
      `/observations/histogram?taxon_id=${searchResult.id}&place_id=${placeIds}&interval=month_of_year`
    );
    
    const monthlyObs = data.results?.month_of_year || {};
    
    let totalObs = 0;
    let peakMonth = null;
    let peakCount = 0;
    
    for (const [month, count] of Object.entries(monthlyObs)) {
      totalObs += count;
      if (count > peakCount) {
        peakCount = count;
        peakMonth = parseInt(month, 10);
      }
    }
    
    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const result = {
      found: true,
      scientificName: `${genus} ${species}`,
      taxonId: searchResult.id,
      region: 'Southeast Michigan',
      placeIds: SE_MICHIGAN_PLACE_IDS,
      monthlyObservations: monthlyObs,
      totalObservations: totalObs,
      peakMonth: peakMonth,
      peakMonthName: peakMonth ? monthNames[peakMonth] : null
    };
    
    writeCache(genus, species, 'histogram', result);
    return result;
    
  } catch (error) {
    console.error(`[inaturalist-client] Error fetching histogram data: ${error.message}`);
    throw error;
  }
}

/**
 * Get both taxa and histogram data in one call
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Promise<Object>} Combined taxa and histogram data
 */
export async function getFullSpeciesData(genus, species, useCache = true) {
  const [taxa, histogram] = await Promise.all([
    getTaxaData(genus, species, useCache),
    getHistogramData(genus, species, useCache)
  ]);
  
  return {
    taxa,
    histogram
  };
}

/**
 * Get the SE Michigan place ID configuration
 * @returns {Object} Object with county names as keys and place_ids as values
 */
export function getPlaceIds() {
  return { ...SE_MICHIGAN_PLACE_IDS };
}

/**
 * Clear all cached data for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 */
export function clearSpeciesCache(genus, species) {
  const taxaPath = getCachePath(genus, species, 'taxa');
  const histogramPath = getCachePath(genus, species, 'histogram');
  
  if (fs.existsSync(taxaPath)) {
    fs.unlinkSync(taxaPath);
    console.log(`[inaturalist-client] Removed taxa cache for ${genus} ${species}`);
  }
  
  if (fs.existsSync(histogramPath)) {
    fs.unlinkSync(histogramPath);
    console.log(`[inaturalist-client] Removed histogram cache for ${genus} ${species}`);
  }
}

/**
 * List all cached species
 * @returns {Array<Object>} Array of {genus, species, endpoints} objects
 */
export function listCachedSpecies() {
  ensureCacheDir();
  
  const files = fs.readdirSync(CACHE_DIR);
  const speciesMap = new Map();
  
  for (const file of files) {
    const match = file.match(/^([A-Z][a-z]+)_([a-z]+)_inaturalist_(taxa|histogram)\.json$/);
    if (match) {
      const [, genus, species, endpoint] = match;
      const key = `${genus}_${species}`;
      
      if (!speciesMap.has(key)) {
        speciesMap.set(key, { genus, species, endpoints: [] });
      }
      speciesMap.get(key).endpoints.push(endpoint);
    }
  }
  
  return Array.from(speciesMap.values());
}
