#!/usr/bin/env node
/**
 * Test script for running a single 3-tier field prompt
 * Shows all three tier responses for debugging/validation
 * 
 * Usage: node test/test-single-field.js <genus> <species> <field_id> [--force]
 * Example: node test/test-single-field.js Quercus alba collection_tools
 * Example: node test/test-single-field.js Quercus alba collection_tools --force
 * 
 * Available field IDs (check prompts/ directory for full list):
 *   collection_tools, collection_timing, collection_mature_seed_color,
 *   collection_container, collection_technique, processing_method, etc.
 */

import { process3TierField } from '../src/synthesis/process-3tier-field.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const forceRefresh = args.includes('--force');
const positionalArgs = args.filter(a => !a.startsWith('--'));

const [genus, species, fieldId] = positionalArgs;

if (!genus || !species || !fieldId) {
  console.log('Usage: node test/test-single-field.js <genus> <species> <field_id> [--force]');
  console.log('');
  console.log('Options:');
  console.log('  --force    Bypass cache and force fresh API calls');
  console.log('');
  console.log('Example: node test/test-single-field.js Quercus alba collection_tools');
  console.log('');
  
  const promptsDir = path.join(__dirname, '../prompts');
  const promptFiles = fs.readdirSync(promptsDir)
    .filter(f => f.endsWith('.md') && !f.includes('tier') && !f.includes('base'))
    .map(f => f.replace('.md', ''));
  
  console.log('Available field IDs:');
  promptFiles.forEach(f => console.log(`  ${f}`));
  
  process.exit(1);
}

console.log('='.repeat(80));
console.log('3-Tier Field Test');
console.log('='.repeat(80));
console.log(`Species: ${genus} ${species}`);
console.log(`Field: ${fieldId}`);
console.log(`Force refresh: ${forceRefresh}`);
console.log('='.repeat(80));
console.log('');

try {
  const result = await process3TierField(genus, species, fieldId, { 
    verbose: true,
    forceRefresh,
    skipSync: false
  });

  const { merged, sourceStats } = result;

  console.log('\n' + '='.repeat(80));
  console.log('SOURCE STATISTICS');
  console.log('='.repeat(80));
  console.log(`Tier 1 sources found: ${sourceStats.tier1Count}`);
  console.log(`Tier 2 sources found: ${sourceStats.tier2Count}`);

  console.log('\n' + '='.repeat(80));
  console.log('TIER 1 RESPONSE (Trusted Sources: Google Drive, Michigan Flora, Lake County)');
  console.log('='.repeat(80));
  console.log(JSON.stringify(merged.tier1, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('TIER 2 RESPONSE (Secondary Sources: Caches + Tier 1 context)');
  console.log('='.repeat(80));
  console.log(JSON.stringify(merged.tier2, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('TIER 3 RESPONSE (Model Knowledge + Prior Tier context)');
  console.log('='.repeat(80));
  console.log(JSON.stringify(merged.tier3, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
  
} catch (error) {
  console.error('\nError:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}
