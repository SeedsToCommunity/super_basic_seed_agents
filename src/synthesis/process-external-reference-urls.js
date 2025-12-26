import { getJson } from 'serpapi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findValidUrl } from '../utils/species-url-validator.js';
import { fetchAndCachePageContent } from '../utils/page-content-client.js';
import { readSerpCache, writeSerpCache } from '../utils/serpapi-cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '../../config/external-reference-urls.json');
const CACHE_DIR = path.join(__dirname, '../../cache/ExternalReferences');

// Module metadata for registry system
export const metadata = {
  id: 'external-reference-urls',
  name: 'External Reference URL Discovery',
  columns: [
    { 
      id: 'externalReferenceUrls', 
      header: 'External Reference URLs',
      source: 'SerpApi + HTTP validation',
      algorithmDescription: 'Searches SerpApi for "{Genus} {species} site:{domain}" for each configured botanical reference site. Fetches HTML from results, validates with Mozilla Readability that content relates to target species. Caches validated URLs per-species. Downstream modules (michigan-flora, inaturalist) append additional URLs.'
    }
  ],
  dependencies: ['botanical-name'], // Requires valid botanical name for searching
  description: 'Discovers URLs for plant species across botanical reference websites with caching'
};

/**
 * Module runner function for registry system
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @param {Object} priorResults - Results from previously executed modules
 * @returns {Promise<Object>} Object with columnValues Record matching metadata.columns
 */
export async function run(genus, species, priorResults) {
  const urls = await discoverAllUrls(genus, species);
  
  return {
    // Column values object (keys match column IDs from metadata.columns)
    columnValues: {
      externalReferenceUrls: urls
    }
  };
}

let config = null;

function loadConfig() {
  if (!config) {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    config = JSON.parse(configData);
  }
  return config;
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
 * Slugify a botanical name component for use in filenames
 * Preserves hybrid markers (×) and handles special characters safely
 * @param {string} name - The name component to slugify
 * @returns {string} Filesystem-safe slug
 */
function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/[^a-z0-9×-]/g, '_');  // other special chars to underscores, keep × and -
}

/**
 * Normalize genus name: capitalize first alphabetic character, lowercase rest
 * Handles hybrid markers (×) at the start of genus names
 * @param {string} genus - The genus name
 * @returns {string} Normalized genus
 */
function normalizeGenus(genus) {
  const trimmed = genus.trim();
  let normalized = trimmed.toLowerCase();
  
  // Find first alphabetic character and uppercase it
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

/**
 * Generate cache file path for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {string} Full path to cache file
 */
function getCachePath(genus, species) {
  const slugGenus = slugify(normalizeGenus(genus));
  const slugSpecies = slugify(species.trim().toLowerCase());
  return path.join(CACHE_DIR, `${slugGenus}_${slugSpecies}_refURLs.json`);
}

/**
 * Read cached data for a species if available
 * Handles both old format (flat URLs object) and new format (with _meta)
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Object|null} Cached URLs or null if not found
 */
function readSpeciesCache(genus, species) {
  const cachePath = getCachePath(genus, species);
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Handle new format with _meta
      if (data._meta && data.urls) {
        return data.urls;
      }
      
      // Handle old format (flat URLs object)
      return data;
    } catch (error) {
      console.error(`[external-reference-urls] Error reading cache: ${error.message}`);
      return null;
    }
  }
  return null;
}

/**
 * Write cached data for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @param {Object} urls - URLs data to cache
 */
function writeSpeciesCache(genus, species, urls) {
  ensureCacheDir();
  const cachePath = getCachePath(genus, species);
  try {
    // Sort site keys alphabetically for consistent output
    const sortedUrls = {};
    const siteKeys = Object.keys(urls).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    for (const key of siteKeys) {
      sortedUrls[key] = urls[key];
    }
    
    // Store with metadata for reliable parsing
    const cacheData = {
      _meta: {
        genus: normalizeGenus(genus),
        species: species.trim().toLowerCase(),
        cachedAt: new Date().toISOString()
      },
      urls: sortedUrls
    };
    
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
    console.log(`[external-reference-urls] Cached URLs for ${genus} ${species}`);
  } catch (error) {
    console.error(`[external-reference-urls] Error writing cache: ${error.message}`);
  }
}

/**
 * Normalize botanical name to ensure consistent capitalization
 * Genus: First alphabetic letter uppercase, rest lowercase
 * Species: All lowercase
 * Handles hybrid symbols (×), whitespace, and other botanical variations
 * @param {string} genus - Genus name (required)
 * @param {string} species - Species name (required)
 * @returns {string} Normalized species key in "Genus species" format
 * @throws {Error} If genus or species is missing or not a string
 */
function normalizeSpeciesKey(genus, species) {
  if (!genus || typeof genus !== 'string') {
    throw new Error('Genus must be a non-empty string');
  }
  if (!species || typeof species !== 'string') {
    throw new Error('Species must be a non-empty string');
  }
  
  // Trim whitespace
  const trimmedGenus = genus.trim();
  const trimmedSpecies = species.trim();
  
  if (trimmedGenus.length === 0 || trimmedSpecies.length === 0) {
    throw new Error('Genus and species cannot be empty after trimming');
  }
  
  // Normalize genus: Find first alphabetic character and uppercase it
  // This handles hybrid genera like "×Chitalpa" correctly
  let normalizedGenus = trimmedGenus.toLowerCase();
  for (let i = 0; i < normalizedGenus.length; i++) {
    if (/[a-z]/i.test(normalizedGenus[i])) {
      normalizedGenus = normalizedGenus.substring(0, i) + 
                       normalizedGenus[i].toUpperCase() + 
                       normalizedGenus.substring(i + 1);
      break;
    }
  }
  
  // Normalize species: all lowercase
  const normalizedSpecies = trimmedSpecies.toLowerCase();
  
  return `${normalizedGenus} ${normalizedSpecies}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchWithRetry(searchQuery, site, genus, species) {
  const cfg = loadConfig();
  const { startDelayMs, maxDelayMs } = cfg.retrySettings;
  const numResults = cfg.numSearchResults || 5;
  
  // Check SerpApi cache first
  const cachedResults = readSerpCache(searchQuery);
  if (cachedResults !== null) {
    // Use cached search results
    if (cachedResults.length > 0) {
      console.log(`  Using ${cachedResults.length} cached results for ${site.name}, validating...`);
      const urls = cachedResults.map(r => r.link);
      const validResult = await findValidUrl(urls, genus, species);
      
      if (validResult) {
        console.log(`  ✓ Validated URL for ${site.name}: ${validResult.url}`);
        return {
          url: validResult.url,
          validatedBy: validResult.validatedBy,
          html: validResult.html
        };
      } else {
        console.log(`  ✗ No valid URL found for ${site.name} (all ${urls.length} cached results failed validation)`);
        return null;
      }
    } else {
      console.log(`  ✗ Cached: No results for ${site.name}`);
      return null;
    }
  }
  
  // No cache - call SerpApi
  let delay = startDelayMs;
  let attempts = 0;
  
  while (delay <= maxDelayMs) {
    attempts++;
    const apiKey = process.env.SERPAPI_API_KEY;
    
    if (!apiKey) {
      console.error('SERPAPI_API_KEY environment variable not set');
      return null;
    }
    
    try {
      console.log(`  Attempt ${attempts} for ${site.name} (delay: ${delay}ms)`);
      
      if (delay > startDelayMs) {
        await sleep(delay);
      }
      
      const params = {
        api_key: apiKey,
        q: searchQuery,
        num: numResults
      };
      
      const result = await getJson(params);
      
      // Only cache if we got a valid response structure
      // (result should have organic_results array OR search_information indicating valid search)
      if (!result || typeof result !== 'object') {
        console.log(`  ✗ Invalid response from SerpApi for ${site.name}`);
        delay = delay * 2;
        continue;
      }
      
      // Check for API errors in response
      if (result.error) {
        console.log(`  ✗ SerpApi error for ${site.name}: ${result.error}`);
        delay = delay * 2;
        continue;
      }
      
      const organicResults = result.organic_results || [];
      
      // Cache the search results (safe to cache - this is a valid response)
      writeSerpCache(searchQuery, organicResults, {
        site: site.name,
        genus,
        species
      });
      
      if (organicResults.length > 0) {
        console.log(`  Found ${organicResults.length} results for ${site.name}, validating...`);
        
        const urls = organicResults.map(r => r.link);
        const validResult = await findValidUrl(urls, genus, species);
        
        if (validResult) {
          console.log(`  ✓ Validated URL for ${site.name}: ${validResult.url}`);
          return {
            url: validResult.url,
            validatedBy: validResult.validatedBy,
            html: validResult.html
          };
        } else {
          console.log(`  ✗ No valid URL found for ${site.name} (all ${urls.length} results failed validation)`);
          return null;
        }
      } else {
        console.log(`  ✗ No results found for ${site.name}`);
        return null;
      }
      
    } catch (error) {
      const errorMsg = error?.message || String(error) || 'Unknown error';
      console.error(`  Error searching ${site.name}:`, errorMsg);
      
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        console.log(`  Rate limited, backing off...`);
        delay = delay * 2;
        continue;
      }
      
      delay = delay * 2;
    }
  }
  
  console.log(`  ✗ Giving up on ${site.name} after ${attempts} attempts`);
  return null;
}

export async function discoverAllUrls(genus, species) {
  const cfg = loadConfig();
  
  // Load existing cached URLs for this species (if any)
  const cachedUrls = readSpeciesCache(genus, species) || {};
  const urls = { ...cachedUrls }; // Start with existing cache
  
  // Check which sites are missing from cache
  const sitesToDiscover = cfg.sites.filter(site => !cachedUrls[site.name]);
  
  if (sitesToDiscover.length === 0) {
    console.log(`\nCache hit for ${genus} ${species} (all ${cfg.sites.length} sites cached)`);
    return urls;
  }
  
  const cachedCount = Object.keys(cachedUrls).length;
  console.log(`\nPartial cache for ${genus} ${species}: ${cachedCount}/${cfg.sites.length} sites cached`);
  console.log(`Discovering ${sitesToDiscover.length} missing URLs...`);
  
  let newDiscoveries = 0;
  const apiKey = process.env.SERPAPI_API_KEY;
  
  // Warn if API key is missing but continue (direct URLs will still work)
  if (!apiKey) {
    console.warn('\n⚠️  SERPAPI_API_KEY not set - web searches will be skipped');
    console.warn('   Only direct URLs (e.g., Google Images) will be generated');
  }
  
  for (const site of sitesToDiscover) {
    let url;
    let validatedBy = null;
    let html = null;
    
    if (site.useDirectUrl) {
      const searchTerm = encodeURIComponent(`${genus} ${species}`);
      url = `https://www.${site.baseUrl}&q=${searchTerm}`;
      validatedBy = 'direct_url';
      console.log(`Constructing direct URL for ${site.name}: ${url}`);
    } else {
      if (!apiKey) {
        console.log(`Skipping ${site.name} (requires SERPAPI_API_KEY)`);
        continue;
      }
      
      const searchQuery = `site:${site.baseUrl} ${genus} ${species}`;
      console.log(`Searching: ${searchQuery}`);
      
      const result = await searchWithRetry(searchQuery, site, genus, species);
      
      if (result) {
        url = result.url;
        validatedBy = result.validatedBy;
        html = result.html;
      }
    }
    
    if (url) {
      urls[site.name] = url;
      newDiscoveries++;
      
      if (!site.useDirectUrl && validatedBy) {
        try {
          await fetchAndCachePageContent(genus, species, site.name, url, validatedBy, html);
        } catch (cacheError) {
          console.log(`  Note: Could not cache page content for ${site.name}: ${cacheError.message}`);
        }
      }
    }
  }
  
  // Save updated cache if we discovered any new URLs
  if (newDiscoveries > 0) {
    writeSpeciesCache(genus, species, urls);
    console.log(`\nDiscovered ${newDiscoveries} new URLs for ${genus} ${species}`);
    console.log(`Total: ${Object.keys(urls).length}/${cfg.sites.length} URLs cached`);
  } else if (Object.keys(urls).length === 0) {
    console.log(`\n⚠️  No URLs discovered for ${genus} ${species} - not caching empty result`);
    console.log('   This allows retry on next run if issues are resolved');
  } else {
    console.log(`\nNo new URLs discovered (still have ${Object.keys(urls).length}/${cfg.sites.length} from cache)`);
  }
  
  return urls;
}

export function getCachedUrls(genus, species) {
  return readSpeciesCache(genus, species);
}

/**
 * Clear cached URLs for a specific species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 */
export function clearSpeciesCache(genus, species) {
  const cachePath = getCachePath(genus, species);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
    console.log(`[external-reference-urls] Removed cache for ${genus} ${species}`);
  }
}

/**
 * List all cached species
 * Reads metadata from JSON files for accurate genus/species extraction
 * @returns {Array<Object>} Array of {genus, species, urlCount} objects
 */
export function listCachedSpecies() {
  ensureCacheDir();
  
  const files = fs.readdirSync(CACHE_DIR);
  const species = [];
  
  for (const file of files) {
    if (!file.endsWith('_refURLs.json')) continue;
    
    try {
      const filePath = path.join(CACHE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // New format with _meta
      if (data._meta) {
        species.push({
          genus: data._meta.genus,
          species: data._meta.species,
          urlCount: Object.keys(data.urls || {}).length,
          cachedAt: data._meta.cachedAt
        });
      } else {
        // Old format - try to extract from filename
        const match = file.match(/^([^_]+)_(.+)_refURLs\.json$/);
        if (match) {
          species.push({
            genus: match[1],
            species: match[2].replace(/-/g, ' '),
            urlCount: Object.keys(data).length
          });
        }
      }
    } catch (error) {
      console.warn(`[external-reference-urls] Could not parse ${file}: ${error.message}`);
    }
  }
  
  return species;
}

/**
 * Clear all cached URL data
 */
export function clearAllCache() {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR);
  let count = 0;
  
  for (const file of files) {
    if (file.endsWith('_refURLs.json')) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
      count++;
    }
  }
  
  console.log(`[external-reference-urls] Cleared ${count} cached species`);
}

/**
 * Migrate from old single-file cache format to per-species files
 * @param {string} oldCachePath - Path to old cache/external-reference-urls.json file
 * @param {boolean} overwrite - Whether to overwrite existing files (default: false)
 * @returns {Object} Migration summary
 */
export function migrateFromSingleFile(oldCachePath, overwrite = false) {
  if (!fs.existsSync(oldCachePath)) {
    console.log('[external-reference-urls] No old cache file found to migrate');
    return { migrated: 0, skipped: 0 };
  }
  
  ensureCacheDir();
  
  try {
    const oldCache = JSON.parse(fs.readFileSync(oldCachePath, 'utf-8'));
    let migrated = 0;
    let skipped = 0;
    
    for (const [speciesKey, urls] of Object.entries(oldCache)) {
      // Parse "Genus species" format (handles multi-word species like "var. dissectum")
      const parts = speciesKey.split(' ');
      if (parts.length < 2) {
        console.warn(`[external-reference-urls] Skipping unparsable key: "${speciesKey}"`);
        skipped++;
        continue;
      }
      
      const genus = parts[0];
      const species = parts.slice(1).join(' ');
      
      // Check if already migrated
      const newPath = getCachePath(genus, species);
      if (fs.existsSync(newPath) && !overwrite) {
        console.log(`[external-reference-urls] Already exists: ${genus} ${species}`);
        skipped++;
        continue;
      }
      
      // Write to new per-species file
      writeSpeciesCache(genus, species, urls);
      migrated++;
    }
    
    console.log(`[external-reference-urls] Migration complete: ${migrated} migrated, ${skipped} skipped`);
    return { migrated, skipped };
    
  } catch (error) {
    console.error(`[external-reference-urls] Migration failed: ${error.message}`);
    throw error;
  }
}
