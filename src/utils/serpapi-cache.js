import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../cache/SerpApi');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function queryToHash(query) {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

function getCachePath(query) {
  const hash = queryToHash(query);
  return path.join(CACHE_DIR, `${hash}.json`);
}

export function readSerpCache(query) {
  const cachePath = getCachePath(query);
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      const data = JSON.parse(content);
      console.log(`  [serpapi-cache] Cache hit for: ${query}`);
      return data.results || [];
    } catch (error) {
      console.error(`  [serpapi-cache] Error reading cache: ${error.message}`);
      return null;
    }
  }
  return null;
}

export function writeSerpCache(query, results, metadata = {}) {
  ensureCacheDir();
  const cachePath = getCachePath(query);
  try {
    const data = {
      _meta: {
        query,
        cachedAt: new Date().toISOString(),
        numResults: results.length,
        ...metadata
      },
      results
    };
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  [serpapi-cache] Cached ${results.length} results for: ${query}`);
  } catch (error) {
    console.error(`  [serpapi-cache] Error writing cache: ${error.message}`);
  }
}

export function clearSerpCache() {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR);
  let count = 0;
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
      count++;
    }
  }
  
  console.log(`[serpapi-cache] Cleared ${count} cached queries`);
  return count;
}

export function listSerpCache() {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR);
  const entries = [];
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    try {
      const filePath = path.join(CACHE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data._meta) {
        entries.push({
          query: data._meta.query,
          numResults: data._meta.numResults,
          cachedAt: data._meta.cachedAt
        });
      }
    } catch (error) {
      console.warn(`[serpapi-cache] Could not parse ${file}`);
    }
  }
  
  return entries;
}
