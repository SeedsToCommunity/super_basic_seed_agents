import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../cache/RawHTML');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function urlToHash(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function getCachePath(url) {
  const hash = urlToHash(url);
  return path.join(CACHE_DIR, `${hash}.json`);
}

export function readHtmlCache(url) {
  const cachePath = getCachePath(url);
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      const data = JSON.parse(content);
      return data.html;
    } catch (error) {
      return null;
    }
  }
  return null;
}

export function writeHtmlCache(url, html) {
  ensureCacheDir();
  const cachePath = getCachePath(url);
  try {
    const data = {
      url,
      fetchedAt: new Date().toISOString(),
      html
    };
    fs.writeFileSync(cachePath, JSON.stringify(data), 'utf-8');
  } catch (error) {
    console.error(`[html-cache] Error writing cache: ${error.message}`);
  }
}

export async function fetchWithCache(url, timeoutMs = 10000) {
  const cached = readHtmlCache(url);
  if (cached) {
    console.log(`  [cache] Using cached HTML for ${url}`);
    return cached;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BotanicalDataAggregator/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`  ✗ HTTP ${response.status} for ${url}`);
      return null;
    }
    
    const html = await response.text();
    writeHtmlCache(url, html);
    return html;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`  ✗ Timeout fetching ${url}`);
    } else {
      console.log(`  ✗ Error fetching ${url}: ${error.message}`);
    }
    return null;
  }
}

export function clearHtmlCache() {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR);
  let count = 0;
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
      count++;
    }
  }
  
  console.log(`[html-cache] Cleared ${count} cached pages`);
}
