/**
 * GBIF Species API Client
 * Provides utilities for matching botanical names and retrieving taxonomic information
 * including synonyms from the GBIF Backbone Taxonomy.
 * 
 * API Documentation: https://techdocs.gbif.org/en/openapi/v1/species
 * No authentication required for species lookup endpoints.
 */

const GBIF_BASE_URL = 'https://api.gbif.org/v1/species';

/**
 * Matches a botanical name to the GBIF Backbone Taxonomy
 * @param {string} genus - The genus name (e.g., "Quercus")
 * @param {string} species - The species name (e.g., "alba")
 * @returns {Promise<Object>} Match result containing usageKey, scientificName, family, etc.
 */
export async function matchSpecies(genus, species) {
  if (!genus || typeof genus !== 'string' || genus.trim() === '') {
    throw new Error('Genus must be a non-empty string');
  }
  
  if (!species || typeof species !== 'string' || species.trim() === '') {
    throw new Error('Species must be a non-empty string');
  }
  
  const scientificName = `${genus} ${species}`;
  
  try {
    const url = new URL(`${GBIF_BASE_URL}/match`);
    url.searchParams.append('name', scientificName);
    url.searchParams.append('kingdom', 'Plantae'); // Restrict to plants
    url.searchParams.append('verbose', 'true'); // Include matching details
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`GBIF API returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if we got a valid match
    if (!data.usageKey) {
      return {
        matched: false,
        matchType: data.matchType || 'NONE',
        note: data.note || 'No match found in GBIF Backbone Taxonomy'
      };
    }
    
    return {
      matched: true,
      usageKey: data.usageKey,
      scientificName: data.scientificName,
      canonicalName: data.canonicalName,
      rank: data.rank,
      status: data.status, // ACCEPTED, SYNONYM, DOUBTFUL
      matchType: data.matchType, // EXACT, FUZZY, HIGHERRANK
      confidence: data.confidence,
      family: data.family,
      genus: data.genus,
      species: data.species,
      kingdom: data.kingdom,
      isSynonym: data.synonym || false,
      acceptedUsageKey: data.acceptedUsageKey // Present if this is a synonym
    };
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Failed to connect to GBIF API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Retrieves all taxonomic synonyms for a given GBIF taxon
 * @param {number} usageKey - The GBIF usage key (taxon identifier)
 * @returns {Promise<Array>} Array of synonym objects
 */
export async function getSynonyms(usageKey) {
  if (!usageKey || typeof usageKey !== 'number') {
    throw new Error('Usage key must be a valid number');
  }
  
  try {
    const url = `${GBIF_BASE_URL}/${usageKey}/synonyms`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`GBIF API returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // GBIF returns paginated results
    const results = data.results || [];
    
    // Extract binomial names only (genus + species)
    const synonyms = results
      .filter(syn => {
        // Only include species-rank synonyms (exclude subspecies, varieties, etc.)
        return syn.rank === 'SPECIES' && syn.canonicalName;
      })
      .map(syn => {
        // Parse the binomial from canonicalName (e.g., "Acer saccharophorum" -> genus: Acer, species: saccharophorum)
        const parts = syn.canonicalName.split(' ');
        const genusName = parts[0];
        const speciesName = parts[1] || '';
        
        return {
          scientificName: syn.scientificName,
          canonicalName: syn.canonicalName,
          genus: genusName,
          species: speciesName,
          binomial: syn.canonicalName, // Use canonicalName as the clean binomial
          status: syn.taxonomicStatus,
          publishedIn: syn.publishedIn
        };
      });
    
    return synonyms;
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Failed to connect to GBIF API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Gets full details for a taxon by its GBIF usage key
 * @param {number} usageKey - The GBIF usage key
 * @returns {Promise<Object>} Complete taxon details
 */
export async function getTaxonDetails(usageKey) {
  if (!usageKey || typeof usageKey !== 'number') {
    throw new Error('Usage key must be a valid number');
  }
  
  try {
    const url = `${GBIF_BASE_URL}/${usageKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`GBIF API returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Failed to connect to GBIF API: ${error.message}`);
    }
    throw error;
  }
}
