import { getJson } from 'serpapi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '../../config/external-reference-urls.json');
const CACHE_PATH = path.join(__dirname, '../../cache/external-reference-urls.json');

let config = null;
let cache = null;

function loadConfig() {
  if (!config) {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    config = JSON.parse(configData);
  }
  return config;
}

function loadCache() {
  try {
    if (!cache) {
      const cacheData = fs.readFileSync(CACHE_PATH, 'utf-8');
      cache = JSON.parse(cacheData);
    }
    return cache;
  } catch (error) {
    console.warn('Cache file not found or invalid, starting with empty cache');
    cache = {};
    return cache;
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    console.log('Cache saved successfully');
  } catch (error) {
    console.error('Failed to save cache:', error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchWithRetry(searchQuery, site) {
  const cfg = loadConfig();
  const { startDelayMs, maxDelayMs } = cfg.retrySettings;
  
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
        num: 1
      };
      
      const result = await getJson(params);
      
      if (result.organic_results && result.organic_results.length > 0) {
        const topResult = result.organic_results[0];
        console.log(`  ✓ Found URL for ${site.name}: ${topResult.link}`);
        return topResult.link;
      } else {
        console.log(`  ✗ No results found for ${site.name}`);
        return null;
      }
      
    } catch (error) {
      console.error(`  Error searching ${site.name}:`, error.message);
      
      if (error.message.includes('rate limit') || error.message.includes('429')) {
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
  const currentCache = loadCache();
  
  const speciesKey = `${genus} ${species}`;
  
  if (currentCache[speciesKey]) {
    console.log(`\nCache hit for ${speciesKey}`);
    return currentCache[speciesKey];
  }
  
  console.log(`\nDiscovering URLs for ${speciesKey}...`);
  const urls = {};
  let successfulSearches = 0;
  const apiKey = process.env.SERPAPI_API_KEY;
  
  // Warn if API key is missing but continue (direct URLs will still work)
  if (!apiKey) {
    console.warn('\n⚠️  SERPAPI_API_KEY not set - web searches will be skipped');
    console.warn('   Only direct URLs (e.g., Google Images) will be generated');
  }
  
  for (const site of cfg.sites) {
    let url;
    
    if (site.useDirectUrl) {
      // Construct URL directly (e.g., for Google Images) - no API key needed
      const searchTerm = encodeURIComponent(`${genus} ${species}`);
      url = `https://www.${site.baseUrl}&q=${searchTerm}`;
      console.log(`Constructing direct URL for ${site.name}: ${url}`);
    } else {
      // Use SerpApi to search for the URL - requires API key
      if (!apiKey) {
        console.log(`Skipping ${site.name} (requires SERPAPI_API_KEY)`);
        continue;
      }
      
      const searchQuery = `site:${site.baseUrl} ${genus} ${species}`;
      console.log(`Searching: ${searchQuery}`);
      
      url = await searchWithRetry(searchQuery, site);
    }
    
    if (url) {
      urls[site.name] = url;
      successfulSearches++;
    }
  }
  
  if (successfulSearches > 0) {
    currentCache[speciesKey] = urls;
    cache = currentCache;
    saveCache();
    console.log(`\nDiscovered ${Object.keys(urls).length}/${cfg.sites.length} URLs for ${speciesKey}`);
  } else {
    console.log(`\n⚠️  No URLs discovered for ${speciesKey} - not caching empty result`);
    console.log('   This allows retry on next run if issues are resolved');
  }
  
  return urls;
}

export function getCachedUrls(genus, species) {
  const currentCache = loadCache();
  const speciesKey = `${genus} ${species}`;
  return currentCache[speciesKey] || null;
}

export function clearCache() {
  cache = {};
  saveCache();
  console.log('Cache cleared');
}
