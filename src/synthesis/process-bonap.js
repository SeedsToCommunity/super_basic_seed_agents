/**
 * BONAP Range Map Synthesis Module
 * 
 * Discovers BONAP (Biota of North America Program) county-level range map
 * image URLs for plant species.
 * 
 * Output Column:
 * - BONAP Range Map: Direct URL to PNG image, empty if not found
 * 
 * Data Source: bonap.net via direct URL verification or SerpApi search
 * Dependencies: botanical-name (requires validated species name)
 */

import { getBONAPMapUrl } from '../utils/bonap-client.js';

export const metadata = {
  id: 'bonap-range-map',
  name: 'BONAP Range Map',
  columns: [
    { 
      id: 'bonapRangeMap', 
      header: 'BONAP Range Map',
      source: 'BONAP (bonap.net) + SerpApi fallback',
      algorithmDescription: 'First attempts predictable BONAP image URL pattern (http://bonap.net/MapGallery/County/{Genus}%20{species}.png) with HEAD request verification. If direct URL fails (404), falls back to SerpApi search for "bonap {genus} {species} range map". Returns direct PNG image URL.'
    }
  ],
  dependencies: ['botanical-name'],
  description: 'Discovers BONAP county-level range map image URL'
};

/**
 * Module runner function for registry system
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @param {Object} priorResults - Results from previously executed modules
 * @returns {Promise<Object>} Object with columnValues Record matching metadata.columns
 */
export async function run(genus, species, priorResults) {
  try {
    console.log(`[process-bonap] Processing ${genus} ${species}`);
    
    const url = await getBONAPMapUrl(genus, species);
    
    if (url) {
      console.log(`[process-bonap] Found BONAP map: ${url}`);
    } else {
      console.log(`[process-bonap] No BONAP map found for ${genus} ${species}`);
    }
    
    return {
      columnValues: {
        bonapRangeMap: url || ''
      }
    };
    
  } catch (error) {
    console.error(`[process-bonap] Error processing ${genus} ${species}:`, error.message);
    
    return {
      columnValues: {
        bonapRangeMap: ''
      }
    };
  }
}
