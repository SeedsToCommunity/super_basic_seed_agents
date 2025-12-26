import Anthropic from '@anthropic-ai/sdk';
import { getClaudePayload } from '../utils/species-data-collector.js';
import { renderPrompt, savePromptDebug } from '../utils/prompt-loader.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const metadata = {
  id: 'similar-species',
  name: 'Similar Species',
  columns: [
    { 
      id: 'similarSpeciesJson', 
      header: 'Similar Species JSON',
      source: 'Google Drive Parsed PDFs + PageContent cache + Claude API',
      algorithmDescription: 'Tiered data approach: (1) Aggregates source-backed data from cached Lake County parsed PDFs and PageContent cache (validated reference website text) using species-data-collector utility; (2) Sends aggregated data to Claude API with structured prompt from prompts/similar-species.md; (3) Returns JSON with Tier 1 (source-backed similarities with citations), Tier 2 (LLM-inferred similarities), and known_unknowns (data gaps where sources were insufficient).'
    }
  ],
  dependencies: ['botanical-name', 'lakecounty-cache'],
  description: 'Identifies similar species and distinguishing features using tiered source-backed and inferred data'
};

export async function run(genus, species, priorResults) {
  const result = await findSimilarSpecies(genus, species);
  
  return {
    columnValues: {
      similarSpeciesJson: JSON.stringify(result, null, 2)
    }
  };
}

export async function findSimilarSpecies(genus, species) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  
  if (!genus || typeof genus !== 'string' || genus.trim() === '') {
    throw new Error('Genus must be a non-empty string');
  }
  
  if (!species || typeof species !== 'string' || species.trim() === '') {
    throw new Error('Species must be a non-empty string');
  }
  
  const speciesName = `${genus} ${species}`;
  
  console.log(`  Collecting data sources for ${speciesName}...`);
  const payload = await getClaudePayload(genus, species, { syncDrive: false, verbose: false });
  
  console.log(`  Found ${payload.summary.parsedPdfCount} parsed PDFs, ${payload.summary.pageContentCount} web pages`);
  
  const prompt = renderPrompt('similar-species', {
    species_name: speciesName,
    data_inputs: payload.formattedText
  });
  
  savePromptDebug('similar-species', genus, species, prompt);
  
  console.log(`  Sending to Claude API...`);
  
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    let responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim();
    
    responseText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    
    try {
      const parsed = JSON.parse(responseText);
      console.log(`  ✓ Extracted ${parsed.similar_species?.length || 0} similar species`);
      return parsed;
    } catch (parseError) {
      console.error(`  ✗ Failed to parse Claude response as JSON`);
      return {
        species: speciesName,
        topic: 'similar_species',
        error: 'Failed to parse response',
        raw_response: responseText.substring(0, 500)
      };
    }
  } catch (error) {
    console.error(`  ✗ Claude API error: ${error.message}`);
    return {
      species: speciesName,
      topic: 'similar_species',
      error: error.message,
      similar_species: [],
      known_unknowns: ['API call failed']
    };
  }
}
