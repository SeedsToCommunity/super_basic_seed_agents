import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Validates a botanical name and returns its current nomenclature status
 * @param {string} botanicalName - The botanical name to validate (e.g., "Quercus robur")
 * @returns {Promise<Object>} Validation result with status and taxonomic information
 */
export async function validateBotanicalName(botanicalName) {
  // Validate inputs
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  
  if (!botanicalName || typeof botanicalName !== 'string' || botanicalName.trim() === '') {
    throw new Error('Botanical name must be a non-empty string');
  }
  
  try {
    const prompt = `You are a botanical nomenclature expert. I will provide you with a botanical name (genus and species), and you need to validate it and provide its current taxonomic status.

Botanical name to validate: "${botanicalName}"

Please analyze this name and respond with a JSON object (and ONLY a JSON object, no other text) with the following structure:

{
  "valid": true/false,
  "status": "current" | "updated" | "likely_misspelled" | "invalid",
  "error": "error message if invalid, otherwise null",
  "currentName": "accepted botanical name if status is 'updated', otherwise same as input",
  "suggestedName": "suggested correct spelling if status is 'likely_misspelled', otherwise null",
  "family": "family name if valid",
  "genus": "genus name if valid",
  "species": "species name if valid"
}

Rules:
- If the name is current and accepted, set valid=true, status="current"
- If the name has been updated/changed (is an official synonym in botanical nomenclature), set valid=true, status="updated", and provide the current accepted name in "currentName"
- If the name appears to be a misspelling of a known botanical name (e.g., "Quercus robor" instead of "Quercus robur"), set valid=false, status="likely_misspelled", provide the suggested correct spelling in "suggestedName", and include an error message explaining the misspelling
- If the name is completely unrecognized or fabricated, set valid=false, status="invalid", and provide an error message
- Always provide family, genus, and species for valid names (status "current" or "updated")
- For likely misspellings, provide the family, genus, and species of the SUGGESTED name

Important: Distinguish carefully between:
  - Official botanical synonyms (old scientific names that were formally renamed) → status="updated"
  - Likely misspellings (typos or minor spelling errors) → status="likely_misspelled"

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
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Parse the JSON response
    const result = JSON.parse(responseText.trim());
    
    // Ensure genus starts with capital letter
    if (result.genus && typeof result.genus === 'string') {
      result.genus = result.genus.charAt(0).toUpperCase() + result.genus.slice(1).toLowerCase();
    }
    
    // Ensure species is all lowercase
    if (result.species && typeof result.species === 'string') {
      result.species = result.species.toLowerCase();
    }
    
    return result;
    
  } catch (error) {
    // Handle API errors
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse Claude API response as JSON: ${error.message}`);
    }
    throw new Error(`Claude API call failed: ${error.message}`);
  }
}
