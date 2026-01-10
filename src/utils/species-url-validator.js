import { JSDOM } from 'jsdom';
import { fetchWithCache } from './html-cache.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN_CONFIG_PATH = path.join(__dirname, '../../config/domain-extraction-config.json');

let domainConfig = null;

function loadDomainConfig() {
  if (!domainConfig) {
    try {
      const configData = fs.readFileSync(DOMAIN_CONFIG_PATH, 'utf-8');
      domainConfig = JSON.parse(configData);
    } catch (error) {
      console.warn(`[validator] Could not load domain config: ${error.message}`);
      domainConfig = { domains: {} };
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

function getDomainConfig(url) {
  const config = loadDomainConfig();
  const hostname = getDomainFromUrl(url);
  if (!hostname) return null;
  
  for (const [domain, domainCfg] of Object.entries(config.domains)) {
    const normalizedDomain = domain.replace(/^www\./, '');
    if (hostname === normalizedDomain || hostname.endsWith('.' + normalizedDomain)) {
      return domainCfg;
    }
  }
  return null;
}

function normalizeForComparison(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function containsSpeciesName(text, genus, species) {
  const normalizedText = normalizeForComparison(text);
  const normalizedGenus = normalizeForComparison(genus);
  const normalizedSpecies = normalizeForComparison(species);
  
  return normalizedText.includes(normalizedGenus) && 
         normalizedText.includes(normalizedSpecies);
}

export function checkUrlPath(url, genus, species) {
  try {
    const urlLower = url.toLowerCase();
    const genusLower = genus.toLowerCase();
    const speciesLower = species.toLowerCase();
    
    if (urlLower.includes(genusLower) && urlLower.includes(speciesLower)) {
      return { passed: true, method: 'url_path' };
    }
    
    const combined = `${genusLower}${speciesLower}`;
    if (urlLower.includes(combined)) {
      return { passed: true, method: 'url_path' };
    }
    
    const hyphenated = `${genusLower}-${speciesLower}`;
    if (urlLower.includes(hyphenated)) {
      return { passed: true, method: 'url_path' };
    }
    
    const underscored = `${genusLower}_${speciesLower}`;
    if (urlLower.includes(underscored)) {
      return { passed: true, method: 'url_path' };
    }
    
    return { passed: false, method: null };
  } catch (error) {
    return { passed: false, method: null };
  }
}

export function checkTitle(html, genus, species) {
  try {
    const dom = new JSDOM(html);
    const title = dom.window.document.querySelector('title')?.textContent || '';
    
    if (containsSpeciesName(title, genus, species)) {
      return { passed: true, method: 'title', value: title.trim() };
    }
    
    return { passed: false, method: null };
  } catch (error) {
    return { passed: false, method: null };
  }
}

export function checkH1(html, genus, species) {
  try {
    const dom = new JSDOM(html);
    const h1Elements = dom.window.document.querySelectorAll('h1');
    
    for (const h1 of h1Elements) {
      const text = h1.textContent || '';
      if (containsSpeciesName(text, genus, species)) {
        return { passed: true, method: 'h1', value: text.trim() };
      }
    }
    
    return { passed: false, method: null };
  } catch (error) {
    return { passed: false, method: null };
  }
}

export function checkCustomSelector(html, genus, species, selector) {
  try {
    const dom = new JSDOM(html);
    const selectors = selector.split(',').map(s => s.trim());
    
    for (const sel of selectors) {
      const elements = dom.window.document.querySelectorAll(sel);
      
      for (const element of elements) {
        const text = element.textContent || '';
        if (containsSpeciesName(text, genus, species)) {
          return { passed: true, method: `selector:${sel}`, value: text.trim().substring(0, 100) };
        }
      }
    }
    
    return { passed: false, method: null };
  } catch (error) {
    return { passed: false, method: null };
  }
}

export function checkSchemaOrg(html, genus, species) {
  try {
    const dom = new JSDOM(html);
    const scripts = dom.window.document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        
        const checkTaxon = (obj) => {
          if (!obj) return false;
          
          const isTaxon = obj['@type'] === 'Taxon' || 
                          (Array.isArray(obj['@type']) && obj['@type'].includes('Taxon'));
          
          if (isTaxon && obj.scientificName) {
            if (containsSpeciesName(obj.scientificName, genus, species)) {
              return true;
            }
          }
          
          if (obj.name && containsSpeciesName(obj.name, genus, species)) {
            return true;
          }
          
          return false;
        };
        
        if (checkTaxon(data)) {
          return { passed: true, method: 'schema_org' };
        }
        
        if (Array.isArray(data)) {
          for (const item of data) {
            if (checkTaxon(item)) {
              return { passed: true, method: 'schema_org' };
            }
          }
        }
        
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          for (const item of data['@graph']) {
            if (checkTaxon(item)) {
              return { passed: true, method: 'schema_org' };
            }
          }
        }
      } catch (e) {
      }
    }
    
    return { passed: false, method: null };
  } catch (error) {
    return { passed: false, method: null };
  }
}

export async function validateUrl(url, genus, species) {
  const urlCheck = checkUrlPath(url, genus, species);
  if (urlCheck.passed) {
    console.log(`  ✓ URL validated by: ${urlCheck.method}`);
    return { valid: true, method: urlCheck.method, html: null };
  }
  
  const html = await fetchWithCache(url);
  
  if (!html) {
    return { valid: false, method: null, html: null };
  }
  
  const domainCfg = getDomainConfig(url);
  
  if (domainCfg && domainCfg.validation) {
    const { primarySelector, fallbackSelectors = [] } = domainCfg.validation;
    const allSelectors = [primarySelector, ...fallbackSelectors];
    
    for (const selector of allSelectors) {
      if (!selector) continue;
      
      if (selector === 'title') {
        const titleCheck = checkTitle(html, genus, species);
        if (titleCheck.passed) {
          console.log(`  ✓ URL validated by: ${titleCheck.method} - "${titleCheck.value}"`);
          return { valid: true, method: titleCheck.method, html };
        }
      } else if (selector === 'h1') {
        const h1Check = checkH1(html, genus, species);
        if (h1Check.passed) {
          console.log(`  ✓ URL validated by: ${h1Check.method} - "${h1Check.value}"`);
          return { valid: true, method: h1Check.method, html };
        }
      } else {
        const customCheck = checkCustomSelector(html, genus, species, selector);
        if (customCheck.passed) {
          console.log(`  ✓ URL validated by: ${customCheck.method} - "${customCheck.value}"`);
          return { valid: true, method: customCheck.method, html };
        }
      }
    }
    
    const schemaCheck = checkSchemaOrg(html, genus, species);
    if (schemaCheck.passed) {
      console.log(`  ✓ URL validated by: ${schemaCheck.method}`);
      return { valid: true, method: schemaCheck.method, html };
    }
    
    console.log(`  ✗ URL failed domain-specific validation for ${domainCfg.name}`);
    return { valid: false, method: null, html };
  }
  
  const titleCheck = checkTitle(html, genus, species);
  if (titleCheck.passed) {
    console.log(`  ✓ URL validated by: ${titleCheck.method} - "${titleCheck.value}"`);
    return { valid: true, method: titleCheck.method, html };
  }
  
  const h1Check = checkH1(html, genus, species);
  if (h1Check.passed) {
    console.log(`  ✓ URL validated by: ${h1Check.method} - "${h1Check.value}"`);
    return { valid: true, method: h1Check.method, html };
  }
  
  const schemaCheck = checkSchemaOrg(html, genus, species);
  if (schemaCheck.passed) {
    console.log(`  ✓ URL validated by: ${schemaCheck.method}`);
    return { valid: true, method: schemaCheck.method, html };
  }
  
  console.log(`  ✗ URL failed all validation checks`);
  return { valid: false, method: null, html };
}

export async function findValidUrl(urls, genus, species) {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`  Checking result ${i + 1}/${urls.length}: ${url}`);
    
    const result = await validateUrl(url, genus, species);
    
    if (result.valid) {
      return {
        url,
        validatedBy: result.method,
        html: result.html,
        resultIndex: i
      };
    }
  }
  
  return null;
}
