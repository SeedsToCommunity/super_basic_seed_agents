/**
 * iNaturalist Enrichment Synthesis Module
 * 
 * Retrieves data from iNaturalist API:
 * - Wikipedia URL (appended to existing External Reference URLs)
 * - SE Michigan monthly observation histogram
 * - Wikipedia summary text
 * 
 * Data Source: iNaturalist API (taxa and histogram endpoints)
 * Caching: File-based in cache/iNaturalist/ directory
 * 
 * Dependencies: botanical-name, external-reference-urls
 */

import { getTaxaData, getHistogramData } from '../utils/inaturalist-client.js';

// Module metadata for registry system
export const metadata = {
  id: 'inaturalist-observations',
  name: 'iNaturalist Enrichment',
  columns: [
    { 
      id: 'externalReferenceUrls', 
      header: 'External Reference URLs',
      source: 'Multiple sources (Google Search + Michigan Flora + iNaturalist)',
      algorithmDescription: 'Reference links compiled from three sources: (1) botanical reference websites found via Google search and verified to contain species-specific information; (2) Michigan Flora species page from the University of Michigan Herbarium; (3) Wikipedia article link from iNaturalist.'
    },
    { 
      id: 'seMiMonthlyObservations', 
      header: 'SE Michigan Monthly Observations',
      source: 'iNaturalist (citizen science observations)',
      algorithmDescription: 'Monthly observation counts from iNaturalist for Southeast Michigan (Wayne, Oakland, Macomb, Washtenaw, Livingston counties). Based on verified citizen science observations. Indicates when the species is most visible or identifiable throughout the year.'
    },
    { 
      id: 'wikipediaSummary', 
      header: 'Wikipedia Summary',
      source: 'Wikipedia (via iNaturalist)',
      algorithmDescription: 'Summary text from the Wikipedia article for this species, retrieved through iNaturalist which maintains links to corresponding Wikipedia entries.'
    }
  ],
  dependencies: ['botanical-name', 'external-reference-urls'],
  description: 'Appends Wikipedia URL to references, adds SE Michigan observation histogram and Wikipedia summary from iNaturalist'
};

/**
 * Month names in order for consistent JSON output
 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Clone and extend existing URLs object from the external-reference-urls module
 * The prior module returns an object like { "Site Name": "url", ... }
 * We preserve this format and add Wikipedia if available
 * 
 * @param {Object} priorUrls - URLs object from external-reference-urls module
 * @returns {Object} Cloned URL object to extend
 */
function cloneUrlsObject(priorUrls) {
  if (!priorUrls || typeof priorUrls !== 'object') {
    return {};
  }
  
  // Clone the object to avoid mutating prior results
  return { ...priorUrls };
}

/**
 * Format monthly observations as object with clear month names
 * Input format: { "1": count, "2": count, ... } (from iNaturalist API)
 * Output format: { "January": count, "February": count, ... }
 * 
 * Note: Pipeline's flattenColumnValues() will JSON-stringify objects automatically
 * 
 * @param {Object} monthlyObs - Raw monthly observations from histogram data
 * @returns {Object} Object with month names as keys
 */
function formatMonthlyObservations(monthlyObs) {
  if (!monthlyObs || Object.keys(monthlyObs).length === 0) {
    return {};
  }
  
  const formatted = {};
  for (let i = 0; i < 12; i++) {
    const monthNum = String(i + 1);
    const count = monthlyObs[monthNum] || 0;
    formatted[MONTH_NAMES[i]] = count;
  }
  
  return formatted;
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
    console.log(`[process-inaturalist] Processing ${genus} ${species}`);
    
    // Get existing URLs object from prior modules
    // michigan-flora runs after external-reference-urls and may have added its URL
    // Use michigan-flora's output if available, otherwise fall back to external-reference-urls
    const miFloraUrlData = priorResults?.['michigan-flora']?.columnValues?.externalReferenceUrls;
    const extRefUrlData = priorResults?.['external-reference-urls']?.columnValues?.externalReferenceUrls;
    const priorUrlData = miFloraUrlData || extRefUrlData;
    const urlsObject = cloneUrlsObject(priorUrlData);
    
    // Fetch taxa data (includes Wikipedia URL and summary)
    const taxaData = await getTaxaData(genus, species);
    
    // Fetch histogram data (SE Michigan observations by month)
    const histogramData = await getHistogramData(genus, species);
    
    // Add Wikipedia URL if available and not already present
    if (taxaData.found && taxaData.wikipediaUrl && !urlsObject['Wikipedia']) {
      urlsObject['Wikipedia'] = taxaData.wikipediaUrl;
    }
    
    // Format monthly observations as ordered JSON object
    const monthlyJson = formatMonthlyObservations(histogramData.monthlyObservations);
    
    // Get Wikipedia summary (truncate if extremely long)
    let summary = taxaData.wikipediaSummary || '';
    if (summary.length > 2000) {
      summary = summary.substring(0, 1997) + '...';
    }
    
    console.log(`[process-inaturalist] Found: ${histogramData.totalObservations} total SE MI observations, Wikipedia: ${taxaData.wikipediaUrl ? 'yes' : 'no'}`);
    
    return {
      columnValues: {
        externalReferenceUrls: urlsObject,
        seMiMonthlyObservations: monthlyJson,
        wikipediaSummary: summary
      }
    };
    
  } catch (error) {
    console.error(`[process-inaturalist] Error processing ${genus} ${species}:`, error.message);
    
    // On error, preserve existing URLs object and return empty for new columns
    const miFloraUrlData = priorResults?.['michigan-flora']?.columnValues?.externalReferenceUrls;
    const extRefUrlData = priorResults?.['external-reference-urls']?.columnValues?.externalReferenceUrls;
    const priorUrlData = miFloraUrlData || extRefUrlData;
    const urlsObject = cloneUrlsObject(priorUrlData);
    
    return {
      columnValues: {
        externalReferenceUrls: urlsObject,
        seMiMonthlyObservations: {},
        wikipediaSummary: ''
      }
    };
  }
}
