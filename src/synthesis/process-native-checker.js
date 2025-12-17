import Anthropic from '@anthropic-ai/sdk';
import { savePromptDebug } from '../utils/prompt-loader.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Module metadata for registry system
export const metadata = {
  id: 'native-checker',
  name: 'Native Status Checker',
  columns: [
    { id: 'seMiNative', header: 'SE MI Native' },
    { id: 'nativeCheckNotes', header: 'Native Check Notes' }
  ],
  dependencies: ['botanical-name'], // Requires valid botanical name first
  description: 'Determines if a plant species is native to Southeast Michigan region'
};

/**
 * Module runner function for registry system
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @param {Object} priorResults - Results from previously executed modules
 * @returns {Promise<Object>} Object with columnValues Record matching metadata.columns
 */
export async function run(genus, species, priorResults) {
  const result = await checkMichiganNative(genus, species);
  
  return {
    // Column values object (keys match column IDs from metadata.columns)
    columnValues: {
      seMiNative: result.isNative ? 'Yes' : 'No',
      nativeCheckNotes: result.notes || ''
    }
  };
}

/**
 * Checks if a plant species is native to Southeast Michigan
 * @param {string} genus - The genus name (e.g., "Quercus")
 * @param {string} species - The species name (e.g., "alba")
 * @returns {Promise<Object>} Native status result with additional information
 */
export async function checkMichiganNative(genus, species) {
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
    const prompt = `You are a botanist specializing in the flora of the Great Lakes region, specifically Southeast Michigan. I will provide you with a plant's genus and species, and you need to determine if it is native to Southeast Michigan.

Botanical name to check: "${botanicalName}"

Please analyze this plant and respond with a JSON object (and ONLY a JSON object, no other text) with the following structure:

{
  "isNative": true/false,
  "status": "native" | "introduced",
  "notes": "any relevant notes about the plant's status in SE Michigan (optional)"
}

Guidelines:
- Set isNative=true and status="native" if the plant is indigenous to Southeast Michigan
- Set isNative=false and status="introduced" if the plant was brought to the region (non-native)
- Keep notes brief and relevant

Southeast Michigan context:
- Region includes Wayne, Oakland, Macomb, Washtenaw, Livingston, and surrounding counties

Respond with ONLY the JSON object, no markdown, no explanations.`;

    savePromptDebug('native-checker', genus, species, prompt);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
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
    
    return result;
    
  } catch (error) {
    // Handle API errors
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse Claude API response as JSON: ${error.message}`);
    }
    throw new Error(`Claude API call failed: ${error.message}`);
  }
}
