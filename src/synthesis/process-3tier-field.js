import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { refreshTier1Cache, readSpeciesTier1Data } from '../utils/drive-tier1-sync.js';
import { refreshParsedPdfCache, readSpeciesParsedPdfs } from '../utils/drive-pdf-sync.js';
import { getCachedTierResponse, cacheTierResponse } from '../utils/tiered-prompt-cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROMPTS_DIR = path.join(__dirname, '../../prompts');
const MICHIGAN_FLORA_CACHE = path.join(__dirname, '../../cache/MichiganFlora/SpeciesData');

const anthropic = new Anthropic();

function readPromptFile(fileName) {
  const filePath = path.join(PROMPTS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

function normalizeGenus(genus) {
  const trimmed = genus.trim();
  let normalized = trimmed.toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    if (/[a-z]/i.test(normalized[i])) {
      normalized = normalized.substring(0, i) + 
                   normalized[i].toUpperCase() + 
                   normalized.substring(i + 1);
      break;
    }
  }
  return normalized;
}

function getMichiganFloraData(genus, species) {
  const normalizedGenus = normalizeGenus(genus);
  const slugSpecies = species.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9×-]/g, '_');
  const filePath = path.join(MICHIGAN_FLORA_CACHE, `${normalizedGenus}_${slugSpecies}_miflora.json`);
  
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.warn(`[3tier] Failed to read Michigan Flora data: ${err.message}`);
    }
  }
  return null;
}

function getSpeciesJsonFromCacheDir(cacheDir, sourceName, genus, species) {
  if (!fs.existsSync(cacheDir)) {
    return [];
  }
  
  const pattern = `${genus}_${species}`.toLowerCase();
  const results = [];
  
  try {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
      if (file.toLowerCase().startsWith(pattern) && file.endsWith('.json')) {
        const content = JSON.parse(fs.readFileSync(path.join(cacheDir, file), 'utf-8'));
        results.push({
          fileName: file,
          source: sourceName,
          content
        });
      }
    }
  } catch (err) {
    console.warn(`[3tier] Failed to read ${sourceName} data: ${err.message}`);
  }
  
  return results;
}

function gatherAllSecondarySourcesForSpecies(genus, species) {
  const sources = [];
  const cacheBase = path.join(__dirname, '../../cache');
  
  // Missouri Seedling Guide (explicit Tier 2 source)
  sources.push(...getSpeciesJsonFromCacheDir(
    path.join(cacheBase, 'MissouriSeedlingGuide'),
    'Missouri Seedling Guide',
    genus, species
  ));
  
  // Page Content cache (validated web pages - contains actual botanical descriptions)
  sources.push(...getSpeciesJsonFromCacheDir(
    path.join(cacheBase, 'PageContent'),
    'Validated Web Pages',
    genus, species
  ));
  
  // Missouri Dept Conservation files from DriveParsedPdfs (Tier 2)
  const allParsedPdfs = readSpeciesParsedPdfs(genus, species);
  for (const item of allParsedPdfs) {
    if (item.fileName.includes('MissouriDepartmentConservation')) {
      sources.push({
        fileName: item.fileName,
        source: 'Missouri Dept Conservation Seedling Guide',
        content: item.content
      });
    }
  }
  
  // NOTE: Excluded from Tier 2 (not useful for seed collection/botanical guidance):
  // - GBIF (taxonomic synonyms only)
  // - iNaturalist (observation histograms only)
  // - BONAP (range map URLs only)
  // - ExternalReferences (just URLs, no content)
  
  return sources;
}

function gatherTier1Sources(genus, species) {
  const sources = [];
  
  const tier1DriveData = readSpeciesTier1Data(genus, species);
  sources.push(...tier1DriveData);
  
  const miFloraData = getMichiganFloraData(genus, species);
  if (miFloraData) {
    sources.push({
      fileName: `${genus}_${species}_miflora.json`,
      source: 'Michigan Flora',
      content: miFloraData
    });
  }
  
  // Lake County files from DriveParsedPdfs (Tier 1 only - filter out Missouri)
  const allParsedPdfs = readSpeciesParsedPdfs(genus, species);
  for (const item of allParsedPdfs) {
    if (item.fileName.includes('LakeCounty') || item.fileName.includes('lakecounty')) {
      sources.push({
        fileName: item.fileName,
        source: 'Lake County Seed Collection Guide',
        content: item.content
      });
    }
  }
  
  return sources;
}

function gatherTier2Sources(genus, species, tier1ResponseObj) {
  const sources = [];
  
  // Gather ALL secondary sources (GBIF, iNaturalist, BONAP, etc.)
  const secondarySources = gatherAllSecondarySourcesForSpecies(genus, species);
  sources.push(...secondarySources);
  
  // Include full Tier 1 response object (value + attribution) for context
  if (tier1ResponseObj) {
    sources.push({
      fileName: 'tier1_response',
      source: 'Tier 1 Response (for context)',
      content: tier1ResponseObj
    });
  }
  
  return sources;
}

function formatSourcesForPrompt(sources) {
  if (sources.length === 0) {
    return 'No source data available for this species.';
  }
  
  const parts = [];
  for (const src of sources) {
    parts.push(`--- Source: ${src.source} (${src.fileName}) ---`);
    parts.push(JSON.stringify(src.content, null, 2));
    parts.push('');
  }
  return parts.join('\n');
}

function buildTierPrompt(tier, genus, species, fieldPromptContent, sources, priorTierResponses = {}) {
  const basePrompt = readPromptFile('tiered_base_prompt.md') || '';
  const tierGuidance = readPromptFile(`tier${tier}_prompt_guidance.md`) || '';
  
  let prompt = `${basePrompt}\n\n`;
  prompt += `${tierGuidance}\n\n`;
  prompt += `## Species\n\n`;
  prompt += `Genus: ${genus}\n`;
  prompt += `Species: ${species}\n\n`;
  prompt += `## Field-Specific Guidance\n\n`;
  prompt += `${fieldPromptContent}\n\n`;
  
  // Format prior tier responses as JSON for transparency (includes value + attribution)
  function formatTierResponse(tierObj) {
    if (!tierObj) return 'No response available.';
    return JSON.stringify(tierObj, null, 2);
  }
  
  if (tier === 1) {
    prompt += `## Tier 1 Source Data\n\n`;
    prompt += formatSourcesForPrompt(sources);
  } else if (tier === 2) {
    prompt += `## Tier 1 Response (for reference)\n\n`;
    prompt += `${formatTierResponse(priorTierResponses.tier1)}\n\n`;
    prompt += `## Tier 2 Additional Source Data\n\n`;
    prompt += formatSourcesForPrompt(sources);
  } else if (tier === 3) {
    prompt += `## Tier 1 Response (for reference)\n\n`;
    prompt += `${formatTierResponse(priorTierResponses.tier1)}\n\n`;
    prompt += `## Tier 2 Response (for reference)\n\n`;
    prompt += `${formatTierResponse(priorTierResponses.tier2)}\n\n`;
    prompt += `## Your Task\n\n`;
    prompt += `Using your general botanical knowledge and the context from Tier 1 and Tier 2, provide additional information to complete the response for this field.\n`;
  }
  
  prompt += `\n## Output Format\n\n`;
  prompt += `Respond with valid JSON matching this structure:\n`;
  prompt += `{\n`;
  prompt += `  "value": "Your response text here",\n`;
  prompt += `  "attribution": "Description of sources used"\n`;
  prompt += `}\n`;
  
  return prompt;
}

async function callClaudeAPI(prompt) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    if (response.content && response.content.length > 0) {
      return response.content[0].text;
    }
    return null;
  } catch (error) {
    console.error(`[3tier] Claude API error: ${error.message}`);
    throw error;
  }
}

function parseResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.warn(`[3tier] Failed to parse response as JSON: ${err.message}`);
  }
  
  return {
    value: responseText,
    attribution: 'Response not in expected JSON format'
  };
}

export async function process3TierField(genus, species, fieldId, options = {}) {
  const { verbose = true, forceRefresh = false, skipSync = false } = options;
  const log = verbose ? console.log : () => {};
  
  log(`\n[3tier] Processing ${fieldId} for ${genus} ${species}`);
  
  const fieldPromptContent = readPromptFile(`${fieldId}.md`);
  if (!fieldPromptContent) {
    throw new Error(`Field prompt file not found: ${fieldId}.md`);
  }
  
  // Only sync if not skipped (sync happens once per pipeline run via lakecounty-cache module)
  if (!skipSync) {
    try {
      await Promise.race([
        refreshTier1Cache({ force: false, verbose: false }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Tier1 sync timeout')), 30000))
      ]);
    } catch (err) {
      log(`  [3tier] Tier 1 sync: ${err.message} - using existing cache`);
    }
    
    try {
      await Promise.race([
        refreshParsedPdfCache({ force: false, verbose: false }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Lake County sync timeout')), 30000))
      ]);
    } catch (err) {
      log(`  [3tier] Lake County sync: ${err.message} - using existing cache`);
    }
  }
  
  const tier1Sources = gatherTier1Sources(genus, species);
  log(`  [3tier] Tier 1 sources: ${tier1Sources.length} files`);
  
  const results = {
    tier1: null,
    tier2: null,
    tier3: null
  };
  
  const prompts = {};
  
  // Helper to extract filenames from sources array
  const extractSourceFiles = (sources) => sources.map(s => s.fileName);
  
  const tier1Prompt = buildTierPrompt(1, genus, species, fieldPromptContent, tier1Sources);
  prompts.tier1 = tier1Prompt;
  const tier1SourceFiles = extractSourceFiles(tier1Sources);
  
  let tier1CacheResult = getCachedTierResponse(genus, species, fieldId, 1, tier1Prompt);
  if (tier1CacheResult.hit && !forceRefresh) {
    log(`  [3tier] Tier 1: cache hit`);
    results.tier1 = parseResponse(tier1CacheResult.response);
  } else {
    log(`  [3tier] Tier 1: calling Claude API...`);
    const tier1Response = await callClaudeAPI(tier1Prompt);
    cacheTierResponse(genus, species, fieldId, 1, tier1Prompt, tier1Response, tier1SourceFiles);
    results.tier1 = parseResponse(tier1Response);
  }
  
  // Pass full tier 1 response object (value + attribution) for transparency
  const tier2Sources = gatherTier2Sources(genus, species, results.tier1);
  log(`  [3tier] Tier 2 sources: ${tier2Sources.length} files`);
  
  const tier2Prompt = buildTierPrompt(2, genus, species, fieldPromptContent, tier2Sources, { tier1: results.tier1 });
  prompts.tier2 = tier2Prompt;
  const tier2SourceFiles = extractSourceFiles(tier2Sources);
  
  let tier2CacheResult = getCachedTierResponse(genus, species, fieldId, 2, tier2Prompt);
  if (tier2CacheResult.hit && !forceRefresh) {
    log(`  [3tier] Tier 2: cache hit`);
    results.tier2 = parseResponse(tier2CacheResult.response);
  } else {
    log(`  [3tier] Tier 2: calling Claude API...`);
    const tier2Response = await callClaudeAPI(tier2Prompt);
    cacheTierResponse(genus, species, fieldId, 2, tier2Prompt, tier2Response, tier2SourceFiles);
    results.tier2 = parseResponse(tier2Response);
  }
  
  // Pass full tier response objects (value + attribution) for transparency
  const tier3Prompt = buildTierPrompt(3, genus, species, fieldPromptContent, [], { 
    tier1: results.tier1, 
    tier2: results.tier2 
  });
  prompts.tier3 = tier3Prompt;
  
  let tier3CacheResult = getCachedTierResponse(genus, species, fieldId, 3, tier3Prompt);
  if (tier3CacheResult.hit && !forceRefresh) {
    log(`  [3tier] Tier 3: cache hit`);
    results.tier3 = parseResponse(tier3CacheResult.response);
  } else {
    log(`  [3tier] Tier 3: calling Claude API...`);
    const tier3Response = await callClaudeAPI(tier3Prompt);
    cacheTierResponse(genus, species, fieldId, 3, tier3Prompt, tier3Response, ['tier1_response', 'tier2_response']);
    results.tier3 = parseResponse(tier3Response);
  }
  
  const mergedOutput = {
    _meta: {
      genus: normalizeGenus(genus),
      species: species.trim().toLowerCase(),
      fieldId,
      processedAt: new Date().toISOString()
    },
    tier1: results.tier1,
    tier2: results.tier2,
    tier3: results.tier3
  };
  
  log(`  [3tier] Complete: ${fieldId}`);
  
  return {
    merged: mergedOutput,
    prompts,
    sourceStats: {
      tier1Count: tier1Sources.length,
      tier2Count: tier2Sources.length
    }
  };
}

export function createFieldModule(fieldId, columnName, algorithmDescription) {
  return {
    metadata: {
      id: `3tier-${fieldId}`,
      name: `3-Tier: ${columnName}`,
      columns: [
        {
          id: `${fieldId}`,
          header: columnName,
          source: 'Tiered LLM synthesis (Tier 1 trusted sources, Tier 2 secondary sources, Tier 3 model knowledge)',
          algorithmDescription
        }
      ],
      dependencies: ['botanical-name', 'michigan-flora', 'lakecounty-cache'],
      description: `3-tier LLM prompting for ${columnName}. Combines trusted sources (Tier 1), secondary sources (Tier 2), and model knowledge (Tier 3).`
    },
    
    run: async function(genus, species, priorResults) {
      try {
        // Skip sync during pipeline runs - lakecounty-cache module already syncs
        const result = await process3TierField(genus, species, fieldId, { 
          verbose: true,
          skipSync: true
        });
        
        return {
          columnValues: {
            [fieldId]: JSON.stringify(result.merged, null, 2)
          },
          _3tierData: result
        };
      } catch (error) {
        console.error(`[3tier-${fieldId}] Error: ${error.message}`);
        return {
          columnValues: {
            [fieldId]: ''
          }
        };
      }
    }
  };
}

export const seedColorModule = createFieldModule(
  'collection_mature_seed_color',
  'Seed Color at Maturity',
  'Uses 3-tier LLM prompting: Tier 1 uses trusted sources (Google Drive Tier 1 folder, Michigan Flora, Lake County Guide), Tier 2 adds secondary sources (Missouri Seedling Guide) plus Tier 1 output, Tier 3 uses model knowledge plus prior tiers. Returns merged JSON with all three tier responses.'
);

export const missRiskModule = createFieldModule(
  'collection_miss_risk',
  'Collection Miss Risk',
  'Uses 3-tier LLM prompting to assess how easily seeds are lost before collection. Returns Low/Moderate/High enum with brief explanation.'
);
