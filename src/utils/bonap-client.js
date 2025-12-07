/**
 * BONAP (Biota of North America Program) Client
 * 
 * Provides utilities for discovering BONAP county-level range map image URLs.
 * 
 * BONAP URL Pattern: http://bonap.net/MapGallery/County/Genus%20species.png
 * 
 * Discovery Strategy:
 * 1. Check file-based cache first
 * 2. Construct predictable URL and verify with HEAD request
 * 3. If HEAD fails, use SerpApi to search for the image
 * 4. Cache result to avoid repeat lookups
 * 
 * Caching Strategy:
 * - File-based caching in cache/BONAP/
 * - Files named: Genus_species_bonap.json
 * - Caches both found URLs and "not found" results to prevent repeat searches
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJson } from 'serpapi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../cache/BONAP');
const BONAP_BASE_URL = 'http://bonap.net/MapGallery/County';

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Normalize genus name: capitalize first letter, lowercase rest
 * @param {string} genus - The genus name
 * @returns {string} Normalized genus
 */
function normalizeGenus(genus) {
  const trimmed = genus.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Generate cache file path for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {string} Full path to cache file
 */
function getCachePath(genus, species) {
  const cleanGenus = normalizeGenus(genus);
  const cleanSpecies = species.trim().toLowerCase();
  return path.join(CACHE_DIR, `${cleanGenus}_${cleanSpecies}_bonap.json`);
}

/**
 * Read cached data if available
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Object|null} Cached data or null if not found
 */
function readCache(genus, species) {
  const cachePath = getCachePath(genus, species);
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[bonap-client] Error reading cache: ${error.message}`);
      return null;
    }
  }
  return null;
}

/**
 * Write data to cache
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @param {Object} data - Data to cache
 */
function writeCache(genus, species, data) {
  ensureCacheDir();
  const cachePath = getCachePath(genus, species);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[bonap-client] Error writing cache: ${error.message}`);
  }
}

/**
 * Construct the predictable BONAP URL for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {string} The constructed URL
 */
function constructBONAPUrl(genus, species) {
  const cleanGenus = normalizeGenus(genus);
  const cleanSpecies = species.trim().toLowerCase();
  const encodedName = encodeURIComponent(`${cleanGenus} ${cleanSpecies}`);
  return `${BONAP_BASE_URL}/${encodedName}.png`;
}

/**
 * Verify if a URL returns a valid image (200 status)
 * @param {string} url - URL to verify
 * @returns {Promise<boolean>} True if URL is valid
 */
async function verifyUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.log(`[bonap-client] HEAD request failed for ${url}: ${error.message}`);
    return false;
  }
}

/**
 * Verify a URL is a valid BONAP PNG image
 * Checks that URL returns 200 and content-type is image/png
 * @param {string} url - URL to verify
 * @returns {Promise<boolean>} True if valid PNG image
 */
async function verifyBONAPImage(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('image/png')) {
      return true;
    }
    
    console.log(`[bonap-client] URL ${url} is not a PNG (content-type: ${contentType})`);
    return false;
  } catch (error) {
    console.log(`[bonap-client] Verification failed for ${url}: ${error.message}`);
    return false;
  }
}

/**
 * Check if URL matches expected BONAP MapGallery pattern
 * @param {string} url - URL to check
 * @returns {boolean} True if matches expected pattern
 */
function isBONAPMapGalleryUrl(url) {
  return url.includes('bonap.net') && 
         url.includes('/MapGallery/') && 
         url.endsWith('.png');
}

/**
 * Search for BONAP range map using SerpApi
 * Verifies candidate URLs before returning to ensure they are valid PNG images
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<string|null>} Verified URL if found, null otherwise
 */
async function searchWithSerpApi(genus, species) {
  const apiKey = process.env.SERPAPI_API_KEY;
  
  if (!apiKey) {
    console.warn('[bonap-client] SERPAPI_API_KEY not set - cannot search for BONAP image');
    return null;
  }
  
  const cleanGenus = normalizeGenus(genus);
  const cleanSpecies = species.trim().toLowerCase();
  const searchQuery = `site:bonap.net "${cleanGenus} ${cleanSpecies}" range map png`;
  
  console.log(`[bonap-client] Searching SerpApi: ${searchQuery}`);
  
  try {
    const result = await getJson({
      engine: 'google',
      q: searchQuery,
      api_key: apiKey,
      num: 5
    });
    
    const candidateUrls = [];
    
    if (result.organic_results && result.organic_results.length > 0) {
      for (const item of result.organic_results) {
        if (item.link && isBONAPMapGalleryUrl(item.link)) {
          candidateUrls.push(item.link);
        }
      }
    }
    
    if (result.images_results && result.images_results.length > 0) {
      for (const item of result.images_results) {
        if (item.original && isBONAPMapGalleryUrl(item.original)) {
          candidateUrls.push(item.original);
        }
      }
    }
    
    for (const url of candidateUrls) {
      console.log(`[bonap-client] Verifying SerpApi candidate: ${url}`);
      const isValid = await verifyBONAPImage(url);
      if (isValid) {
        console.log(`[bonap-client] Verified via SerpApi: ${url}`);
        return url;
      }
    }
    
    console.log('[bonap-client] No valid BONAP image found via SerpApi');
    return null;
    
  } catch (error) {
    console.error(`[bonap-client] SerpApi error: ${error.message}`);
    return null;
  }
}

/**
 * Get BONAP range map URL for a species
 * Checks cache, tries direct URL, falls back to SerpApi search
 * 
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {Promise<string|null>} URL if found, null otherwise
 */
export async function getBONAPMapUrl(genus, species) {
  console.log(`[bonap-client] Looking up BONAP map for ${genus} ${species}`);
  
  const cached = readCache(genus, species);
  if (cached) {
    console.log(`[bonap-client] Using cached result for ${genus} ${species}`);
    return cached.url;
  }
  
  const directUrl = constructBONAPUrl(genus, species);
  console.log(`[bonap-client] Trying direct URL: ${directUrl}`);
  
  const isValid = await verifyUrl(directUrl);
  
  if (isValid) {
    console.log(`[bonap-client] Direct URL verified for ${genus} ${species}`);
    writeCache(genus, species, {
      genus: normalizeGenus(genus),
      species: species.trim().toLowerCase(),
      url: directUrl,
      source: 'direct',
      cachedAt: new Date().toISOString()
    });
    return directUrl;
  }
  
  console.log(`[bonap-client] Direct URL not found, trying SerpApi search...`);
  const searchUrl = await searchWithSerpApi(genus, species);
  
  if (searchUrl) {
    writeCache(genus, species, {
      genus: normalizeGenus(genus),
      species: species.trim().toLowerCase(),
      url: searchUrl,
      source: 'serpapi',
      cachedAt: new Date().toISOString()
    });
    return searchUrl;
  }
  
  writeCache(genus, species, {
    genus: normalizeGenus(genus),
    species: species.trim().toLowerCase(),
    url: null,
    source: 'not_found',
    cachedAt: new Date().toISOString()
  });
  
  console.log(`[bonap-client] No BONAP map found for ${genus} ${species}`);
  return null;
}

/**
 * Get cached BONAP URL without making any network requests
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 * @returns {string|null} Cached URL or null if not cached
 */
export function getCachedBONAPUrl(genus, species) {
  const cached = readCache(genus, species);
  return cached ? cached.url : null;
}

/**
 * Clear cached data for a species
 * @param {string} genus - Genus name
 * @param {string} species - Species epithet
 */
export function clearCache(genus, species) {
  const cachePath = getCachePath(genus, species);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
    console.log(`[bonap-client] Cleared cache for ${genus} ${species}`);
  }
}
