import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Module metadata for registry system
export const metadata = {
  id: 'common-names',
  name: 'Common Names',
  columns: [
    { id: 'commonNames', header: 'Common Names' }
  ],
  dependencies: ['botanical-name'], // Requires valid botanical name first
  description: 'Identifies all common/vernacular names used in Southeast Michigan and adjacent regions'
};

/**
 * Module runner function for registry system
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @param {Object} priorResults - Results from previously executed modules
 * @returns {Promise<Object>} Object with columnValues Record matching metadata.columns
 */
export async function run(genus, species, priorResults) {
  const result = await findCommonNames(genus, species);
  
  return {
    // Column values object (keys match column IDs from metadata.columns)
    columnValues: {
      commonNames: result.names.join(', ')
    }
  };
}

/**
 * Finds all common names for a plant species in Southeast Michigan and adjacent regions
 * @param {string} genus - The genus name (e.g., "Quercus")
 * @param {string} species - The species name (e.g., "alba")
 * @returns {Promise<Object>} Object with array of common names
 */
export async function findCommonNames(genus, species) {
  // Validate inputs
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  
  if (!genus || typeof genus !== 'string' || genus.trim() === '') {
    throw new Error('Genus must be a non-empty string');
  }
  
  if (!species || typeof species !== 'string' || species.trim() === '') {
    throw new Error('Species must be a non-empty string');
  }
  
  const botanicalName = `${genus} ${species}`;
  
  try {
    const prompt = `You are a botanist specializing in the flora of Southeast Michigan and adjacent regions (Great Lakes area). I need you to identify ALL common names (vernacular names) used for the following plant in Southeast Michigan and adjacent regions.

Botanical name: "${botanicalName}"

Please respond with a JSON object (and ONLY a JSON object, no other text) with the following structure:

{
  "names": ["common name 1", "common name 2", "common name 3", ...]
}

Guidelines:
- Include ALL common names used in Southeast Michigan, adjacent states (Ohio, Indiana, Illinois, Wisconsin), and southern Ontario
- Include both widely used and regional variations of common names
- DO NOT include botanical synonyms or previously used scientific names (no Latin names)
- DO NOT include cultivar names
- Only include vernacular/colloquial names that everyday people actually use
- If there are no common names in use, return an empty array
- Order names from most common to least common

Examples of what TO include:
- "White Oak", "Eastern White Oak"
- "Sugar Maple", "Hard Maple", "Rock Maple"
- "Gray's Sedge", "Gray Sedge"

Examples of what NOT to include:
- "Quercus alba var. alba" (botanical variety)
- "Acer saccharum subsp. saccharum" (botanical subspecies)
- Former scientific names like "Acer saccharophorum"

Respond with ONLY the JSON object, no markdown, no explanations.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    // Aggregate all text content blocks (handles multi-block responses)
    let responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim();
    
    if (!responseText) {
      throw new Error('Claude API returned empty response');
    }
    
    // Strip markdown code blocks if present
    responseText = responseText
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    
    // Parse JSON response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse Claude response as JSON: ${parseError.message}\nResponse: ${responseText}`);
    }
    
    // Validate response structure
    if (!Array.isArray(data.names)) {
      throw new Error(`Invalid response structure: expected {names: [...]} but got ${JSON.stringify(data)}`);
    }
    
    // Validate all names are strings
    const invalidNames = data.names.filter(name => typeof name !== 'string');
    if (invalidNames.length > 0) {
      throw new Error(`Invalid common names (must be strings): ${JSON.stringify(invalidNames)}`);
    }
    
    return {
      names: data.names
    };
    
  } catch (error) {
    if (error.message && error.message.includes('Claude')) {
      throw error; // Re-throw Claude-specific errors
    }
    throw new Error(`Failed to get common names from Claude API: ${error.message}`);
  }
}
