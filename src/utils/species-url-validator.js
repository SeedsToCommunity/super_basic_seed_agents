import { JSDOM } from 'jsdom';

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

export async function validateUrl(url, genus, species, fetchHtml = null) {
  const urlCheck = checkUrlPath(url, genus, species);
  if (urlCheck.passed) {
    console.log(`  ✓ URL validated by: ${urlCheck.method}`);
    return { valid: true, method: urlCheck.method, html: null };
  }
  
  let html;
  if (fetchHtml) {
    html = await fetchHtml(url);
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
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
        return { valid: false, method: null, html: null };
      }
      
      html = await response.text();
    } catch (error) {
      console.log(`  ✗ Failed to fetch ${url}: ${error.message}`);
      return { valid: false, method: null, html: null };
    }
  }
  
  if (!html) {
    return { valid: false, method: null, html: null };
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
