import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../cache/PageContent');
const DOMAIN_CONFIG_PATH = path.join(__dirname, '../../config/domain-extraction-config.json');

let domainConfig = null;

function loadDomainConfig() {
  if (!domainConfig) {
    try {
      const configData = fs.readFileSync(DOMAIN_CONFIG_PATH, 'utf-8');
      domainConfig = JSON.parse(configData);
    } catch (error) {
      console.warn(`[page-content] Could not load domain config: ${error.message}`);
      domainConfig = { domains: {}, defaultExtraction: {}, whitespaceNormalization: {} };
    }
  }
  return domainConfig;
}

function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function getDomainExtraction(url) {
  const config = loadDomainConfig();
  const hostname = getDomainFromUrl(url);
  if (!hostname) return config.defaultExtraction || {};
  
  for (const [domain, domainCfg] of Object.entries(config.domains)) {
    const normalizedDomain = domain.replace(/^www\./, '');
    if (hostname === normalizedDomain || hostname.endsWith('.' + normalizedDomain)) {
      return domainCfg.extraction || config.defaultExtraction || {};
    }
  }
  return config.defaultExtraction || {};
}

function getWhitespaceConfig() {
  const config = loadDomainConfig();
  return config.whitespaceNormalization || {
    maxConsecutiveNewlines: 2,
    trimLines: true,
    collapseSpaces: true
  };
}

function normalizeWhitespace(text) {
  if (!text) return '';
  
  const wsConfig = getWhitespaceConfig();
  let result = text;
  
  if (wsConfig.collapseSpaces) {
    result = result.replace(/[ \t]+/g, ' ');
  }
  
  if (wsConfig.trimLines) {
    result = result.split('\n').map(line => line.trim()).join('\n');
  }
  
  if (wsConfig.maxConsecutiveNewlines) {
    const maxNewlines = wsConfig.maxConsecutiveNewlines;
    const pattern = new RegExp(`\n{${maxNewlines + 1},}`, 'g');
    result = result.replace(pattern, '\n'.repeat(maxNewlines));
  }
  
  return result.trim();
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9×-]/g, '_');
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

function slugifySource(sourceName) {
  return sourceName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function getCachePath(genus, species, source) {
  const normalizedGenus = normalizeGenus(genus);
  const slugSpecies = slugify(species.trim().toLowerCase());
  const slugSource = slugifySource(source);
  return path.join(CACHE_DIR, `${normalizedGenus}_${slugSpecies}_${slugSource}.json`);
}

export function readPageCache(genus, species, source) {
  const cachePath = getCachePath(genus, species, source);
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[page-content] Error reading cache: ${error.message}`);
      return null;
    }
  }
  return null;
}

function writePageCache(genus, species, source, data) {
  ensureCacheDir();
  const cachePath = getCachePath(genus, species, source);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[page-content] Cached content for ${genus} ${species} from ${source}`);
  } catch (error) {
    console.error(`[page-content] Error writing cache: ${error.message}`);
  }
}

export async function fetchPage(url, timeoutMs = 10000) {
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
      console.log(`[page-content] HTTP ${response.status} for ${url}`);
      return null;
    }
    
    const html = await response.text();
    return html;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[page-content] Timeout fetching ${url}`);
    } else {
      console.log(`[page-content] Error fetching ${url}: ${error.message}`);
    }
    return null;
  }
}

function extractWithDomainSelectors(document, extractionConfig) {
  const { captureSelectors = [], excludeSelectors = [] } = extractionConfig;
  
  for (const excludeSelector of excludeSelectors) {
    try {
      const elements = document.querySelectorAll(excludeSelector);
      for (const el of elements) {
        el.remove();
      }
    } catch (e) {
    }
  }
  
  for (const captureSelector of captureSelectors) {
    try {
      const element = document.querySelector(captureSelector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length > 100) {
          return text;
        }
      }
    } catch (e) {
    }
  }
  
  return null;
}

export function parseWithReadability(html, url) {
  try {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    const title = document.querySelector('title')?.textContent?.trim() || '';
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    
    let schemaOrg = null;
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'Taxon' || 
            (Array.isArray(data['@type']) && data['@type'].includes('Taxon'))) {
          schemaOrg = data;
          break;
        }
        if (Array.isArray(data)) {
          const taxon = data.find(d => d['@type'] === 'Taxon');
          if (taxon) {
            schemaOrg = taxon;
            break;
          }
        }
      } catch (e) {
      }
    }
    
    const extractionConfig = getDomainExtraction(url);
    let textContent = null;
    let extractionMethod = 'readability';
    
    if (extractionConfig.captureSelectors && extractionConfig.captureSelectors.length > 0) {
      const domainExtracted = extractWithDomainSelectors(document.cloneNode(true), extractionConfig);
      if (domainExtracted) {
        textContent = normalizeWhitespace(domainExtracted);
        extractionMethod = 'domain-specific';
        console.log(`[page-content] Used domain-specific extraction for ${getDomainFromUrl(url)}`);
      }
    }
    
    if (!textContent) {
      const documentClone = document.cloneNode(true);
      const defaultConfig = loadDomainConfig().defaultExtraction || {};
      for (const excludeSelector of (defaultConfig.excludeSelectors || [])) {
        try {
          const elements = documentClone.querySelectorAll(excludeSelector);
          for (const el of elements) {
            el.remove();
          }
        } catch (e) {
        }
      }
      
      const reader = new Readability(documentClone);
      const article = reader.parse();
      textContent = normalizeWhitespace(article?.textContent?.substring(0, 50000) || '');
    }
    
    return {
      title,
      h1,
      schemaOrg,
      extractionMethod,
      readability: {
        title,
        excerpt: '',
        textContent
      }
    };
  } catch (error) {
    console.error(`[page-content] Error parsing HTML: ${error.message}`);
    return null;
  }
}

export async function fetchAndCachePageContent(genus, species, source, url, validatedBy, prefetchedHtml = null) {
  const existingCache = readPageCache(genus, species, source);
  if (existingCache) {
    console.log(`[page-content] Cache hit for ${genus} ${species} from ${source}`);
    return existingCache;
  }
  
  let html = prefetchedHtml;
  if (!html) {
    console.log(`[page-content] Fetching ${url}...`);
    html = await fetchPage(url);
  } else {
    console.log(`[page-content] Using pre-fetched HTML for ${source}`);
  }
  
  if (!html) {
    return null;
  }
  
  const parsed = parseWithReadability(html, url);
  
  if (!parsed) {
    return null;
  }
  
  const cacheData = {
    _meta: {
      genus: normalizeGenus(genus),
      species: species.trim().toLowerCase(),
      source,
      url,
      fetchedAt: new Date().toISOString(),
      validatedBy,
      extractionMethod: parsed.extractionMethod || 'readability'
    },
    content: {
      title: parsed.title,
      h1: parsed.h1,
      schemaOrg: parsed.schemaOrg,
      excerpt: parsed.readability?.excerpt || '',
      textContent: parsed.readability?.textContent || ''
    }
  };
  
  writePageCache(genus, species, source, cacheData);
  
  return cacheData;
}

export function listCachedPages() {
  ensureCacheDir();
  
  const files = fs.readdirSync(CACHE_DIR);
  const pages = [];
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    try {
      const filePath = path.join(CACHE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data._meta) {
        pages.push({
          genus: data._meta.genus,
          species: data._meta.species,
          source: data._meta.source,
          url: data._meta.url,
          fetchedAt: data._meta.fetchedAt,
          validatedBy: data._meta.validatedBy
        });
      }
    } catch (error) {
      console.warn(`[page-content] Could not parse ${file}: ${error.message}`);
    }
  }
  
  return pages;
}

export function clearAllPageCache() {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR);
  let count = 0;
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
      count++;
    }
  }
  
  console.log(`[page-content] Cleared ${count} cached pages`);
}
