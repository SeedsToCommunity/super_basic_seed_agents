/**
 * Michigan Flora Ecological Metrics Synthesis Module
 * 
 * Retrieves ecological data from the Michigan Flora Online dataset (local CSV cache)
 * including Coefficient of Conservatism, Wetland Indicator, Physiognomy, and Duration.
 * 
 * Data Source: MichiganFloraSpeciesDatabase_Michigan_2024.csv (~2,873 species)
 * No network requests required - uses locally cached static dataset.
 */

import { findByGenusSpecies } from '../utils/michigan-flora-client.js';

// Module metadata for registry system
export const metadata = {
  id: 'michigan-flora',
  name: 'Michigan Flora Ecological Metrics',
  columns: [
    { id: 'coefficientC', header: 'Coefficient of Conservatism (C)' },
    { id: 'wetlandIndicatorW', header: 'Wetland Indicator (W)' },
    { id: 'physiognomy', header: 'Physiognomy' },
    { id: 'duration', header: 'Duration' }
  ],
  dependencies: ['botanical-name'],
  description: 'Retrieves ecological metrics from Michigan Flora dataset: C value, wetness, growth form, and life cycle'
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
    console.log(`[process-michigan-flora] Looking up ${genus} ${species}`);
    
    const record = await findByGenusSpecies(genus, species);
    
    if (!record) {
      console.log(`[process-michigan-flora] Species not found in Michigan Flora dataset: ${genus} ${species}`);
      return {
        columnValues: {
          coefficientC: '',
          wetlandIndicatorW: '',
          physiognomy: '',
          duration: ''
        }
      };
    }
    
    console.log(`[process-michigan-flora] Found: C=${record.coefficientC}, W=${record.wetnessW}, ${record.physiognomy}, ${record.duration}`);
    
    return {
      columnValues: {
        coefficientC: String(record.coefficientC),
        wetlandIndicatorW: String(record.wetnessW),
        physiognomy: record.physiognomy || '',
        duration: record.duration || ''
      }
    };
    
  } catch (error) {
    console.error(`[process-michigan-flora] Error processing ${genus} ${species}:`, error.message);
    
    return {
      columnValues: {
        coefficientC: '',
        wetlandIndicatorW: '',
        physiognomy: '',
        duration: ''
      }
    };
  }
}
