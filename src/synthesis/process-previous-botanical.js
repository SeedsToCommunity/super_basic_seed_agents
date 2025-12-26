/**
 * Previous Botanical Names (Synonyms) Synthesis Module
 * 
 * Retrieves taxonomic synonyms from GBIF Backbone Taxonomy to provide
 * "previously known as" botanical names for cross-reference and search purposes.
 * 
 * Format: Comma-separated binomial names only (botanical synonyms, excludes varieties/subspecies)
 * Example: "Acer saccharophorum, Acer palmifolium, Acer saccharinum"
 */

import { matchSpecies, getSynonyms } from '../utils/gbif-client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../cache/GBIF');

// Module metadata for registry system
export const metadata = {
  id: 'previous-botanical',
  name: 'Previous Botanical Names',
  columns: [
    { 
      id: 'previouslyKnownAs', 
      header: 'Previously Known As',
      source: 'GBIF Backbone Taxonomy API',
      algorithmDescription: 'Queries GBIF /species/match to get taxonKey, then fetches /species/{key}/synonyms. Filters to species-level binomials only (excludes varieties, subspecies). Returns comma-separated list of historical scientific names. Uses file-based caching in cache/GBIF/.'
    }
  ],
  dependencies: ['botanical-name'], // Requires valid botanical name first
  description: 'Retrieves botanical synonyms (legacy binomial names) from GBIF for cross-reference purposes'
};

/**
 * Generate cache file path for a species
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @returns {string} Full path to cache file
 */
function getCacheFilePath(genus, species) {
  return path.join(CACHE_DIR, `${genus}_${species}_gbif.json`);
}

/**
 * Load cached GBIF data if it exists
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @returns {Object|null} Cached data or null if not found
 */
function loadCache(genus, species) {
  try {
    const cachePath = getCacheFilePath(genus, species);
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    
    const cacheData = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(cacheData);
  } catch (error) {
    console.warn(`[process-previous-botanical] Cache read error for ${genus} ${species}:`, error.message);
    return null;
  }
}

/**
 * Save GBIF data to cache
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @param {Object} data - The data to cache
 */
function saveCache(genus, species, data) {
  try {
    const cachePath = getCacheFilePath(genus, species);
    
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    // Save with pretty-printing for human readability
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[process-previous-botanical] Cache write error for ${genus} ${species}:`, error.message);
  }
}

/**
 * Module runner function for registry system
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @param {Object} priorResults - Results from previously executed modules
 * @returns {Promise<Object>} Object with columnValues Record matching metadata.columns
 */
export async function run(genus, species, priorResults) {
  try {
    // Check cache first
    const cachedData = loadCache(genus, species);
    if (cachedData) {
      console.log(`[process-previous-botanical] Using cached data for ${genus} ${species}`);
      
      // Format synonyms from cache
      const synonymList = cachedData.synonyms
        .map(syn => syn.binomial)
        .filter(binomial => binomial && binomial.trim() !== '')
        .join(', ');
      
      return {
        columnValues: {
          previouslyKnownAs: synonymList
        }
      };
    }
    
    // Cache miss - fetch from GBIF API
    console.log(`[process-previous-botanical] Cache miss, fetching from GBIF API for ${genus} ${species}`);
    
    // Step 1: Match the species in GBIF to get the usage key
    const matchResult = await matchSpecies(genus, species);
    
    // If no exact species-level match, cache empty result and return
    if (!matchResult.matched || matchResult.rank !== 'SPECIES') {
      const emptyData = {
        genus,
        species,
        matched: false,
        synonyms: [],
        cachedAt: new Date().toISOString()
      };
      saveCache(genus, species, emptyData);
      
      return {
        columnValues: {
          previouslyKnownAs: ''
        }
      };
    }
    
    // Step 2: Get synonyms for this species
    const synonyms = await getSynonyms(matchResult.usageKey);
    
    // Step 3: Cache the result
    const cacheData = {
      genus,
      species,
      matched: true,
      usageKey: matchResult.usageKey,
      acceptedName: matchResult.scientificName,
      synonyms,
      cachedAt: new Date().toISOString()
    };
    saveCache(genus, species, cacheData);
    
    // Step 4: Format as comma-separated binomial names
    const synonymList = synonyms
      .map(syn => syn.binomial)
      .filter(binomial => binomial && binomial.trim() !== '')
      .join(', ');
    
    return {
      columnValues: {
        previouslyKnownAs: synonymList
      }
    };
    
  } catch (error) {
    // Log error but don't fail the entire pipeline
    // Return empty string to maintain column contract (don't pollute data with error messages)
    console.error(`[process-previous-botanical] Error processing ${genus} ${species}:`, error.message);
    
    return {
      columnValues: {
        previouslyKnownAs: ''
      }
    };
  }
}
