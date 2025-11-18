/**
 * Previous Botanical Names (Synonyms) Synthesis Module
 * 
 * Retrieves taxonomic synonyms from GBIF Backbone Taxonomy to provide
 * "previously known as" botanical names for cross-reference and search purposes.
 * 
 * Format: Comma-separated binomial names only (botanical synonyms, excludes varieties/subspecies)
 * Example: "Acer saccharophorum, Acer palmifolium, Acer saccharinum"
 */

import { matchSpecies, getSynonyms } from '../utils/gbif-client.js';

// Module metadata for registry system
export const metadata = {
  id: 'previous-botanical',
  name: 'Previous Botanical Names',
  columns: [
    { id: 'previouslyKnownAs', header: 'Previously Known As' }
  ],
  dependencies: ['botanical-name'], // Requires valid botanical name first
  description: 'Retrieves botanical synonyms (legacy binomial names) from GBIF for cross-reference purposes'
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
    // Step 1: Match the species in GBIF to get the usage key
    const matchResult = await matchSpecies(genus, species);
    
    // If no exact species-level match, return empty
    if (!matchResult.matched || matchResult.rank !== 'SPECIES') {
      return {
        columnValues: {
          previouslyKnownAs: ''
        }
      };
    }
    
    // Step 2: Get synonyms for this species
    const synonyms = await getSynonyms(matchResult.usageKey);
    
    // Step 3: Format as comma-separated binomial names
    const synonymList = synonyms
      .map(syn => syn.binomial)
      .filter(binomial => binomial && binomial.trim() !== '')
      .join(', ');
    
    return {
      columnValues: {
        previouslyKnownAs: synonymList
      }
    };
    
  } catch (error) {
    // Log error but don't fail the entire pipeline
    // Return empty string to maintain column contract (don't pollute data with error messages)
    console.error(`[process-previous-botanical] Error processing ${genus} ${species}:`, error.message);
    
    return {
      columnValues: {
        previouslyKnownAs: ''
      }
    };
  }
}
