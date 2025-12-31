import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../cache/TieredPrompts');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function promptToHash(prompt) {
  return crypto.createHash('md5').update(prompt).digest('hex');
}

function getCachePath(genus, species, fieldId, tier, promptHash) {
  const safeGenus = genus.trim();
  const safeSpecies = species.trim().toLowerCase();
  return path.join(CACHE_DIR, `${safeGenus}_${safeSpecies}_${fieldId}_tier${tier}_${promptHash}.json`);
}

export function getCachedTierResponse(genus, species, fieldId, tier, promptText) {
  ensureCacheDir();
  const hash = promptToHash(promptText);
  const cachePath = getCachePath(genus, species, fieldId, tier, hash);
  
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      if (cached.promptHash === hash) {
        return {
          hit: true,
          response: cached.response,
          prompt: cached.prompt,
          cachedAt: cached.cachedAt
        };
      }
    } catch (err) {
      console.warn(`[tiered-prompt-cache] Failed to read cache: ${err.message}`);
    }
  }
  
  return { hit: false };
}

export function cacheTierResponse(genus, species, fieldId, tier, promptText, responseText, sourceFiles = []) {
  ensureCacheDir();
  const hash = promptToHash(promptText);
  const cachePath = getCachePath(genus, species, fieldId, tier, hash);
  
  const cacheEntry = {
    _meta: {
      genus: genus.trim(),
      species: species.trim().toLowerCase(),
      fieldId,
      tier
    },
    promptHash: hash,
    sourceFiles,
    prompt: promptText,
    response: responseText,
    cachedAt: new Date().toISOString()
  };
  
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[tiered-prompt-cache] Failed to write cache: ${err.message}`);
    return false;
  }
}

export function listCachedResponses(genus, species, fieldId) {
  ensureCacheDir();
  const prefix = `${genus.trim()}_${species.trim().toLowerCase()}_${fieldId}_`;
  
  try {
    const files = fs.readdirSync(CACHE_DIR);
    return files
      .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
      .map(f => {
        const match = f.match(/_tier(\d)_/);
        return {
          fileName: f,
          tier: match ? parseInt(match[1]) : null
        };
      });
  } catch (err) {
    return [];
  }
}

export function clearFieldCache(genus, species, fieldId) {
  ensureCacheDir();
  const prefix = `${genus.trim()}_${species.trim().toLowerCase()}_${fieldId}_`;
  
  try {
    const files = fs.readdirSync(CACHE_DIR);
    let deleted = 0;
    for (const f of files) {
      if (f.startsWith(prefix)) {
        fs.unlinkSync(path.join(CACHE_DIR, f));
        deleted++;
      }
    }
    return deleted;
  } catch (err) {
    return 0;
  }
}

export function getCacheStats() {
  ensureCacheDir();
  
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    const byField = {};
    const bySpecies = {};
    
    for (const f of files) {
      const parts = f.split('_');
      if (parts.length >= 4) {
        const speciesKey = `${parts[0]}_${parts[1]}`;
        const fieldId = parts[2];
        
        byField[fieldId] = (byField[fieldId] || 0) + 1;
        bySpecies[speciesKey] = (bySpecies[speciesKey] || 0) + 1;
      }
    }
    
    return {
      totalFiles: files.length,
      byField,
      bySpecies
    };
  } catch (err) {
    return { totalFiles: 0, byField: {}, bySpecies: {} };
  }
}
