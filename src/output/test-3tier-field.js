#!/usr/bin/env node

import { process3TierField } from '../synthesis/process-3tier-field.js';

const genus = process.argv[2] || 'Allium';
const species = process.argv[3] || 'cernuum';
const fieldId = process.argv[4] || 'collection_mature_seed_color';
const skipSync = process.argv[5] === '--skip-sync';

console.log(`\n=== Testing 3-Tier Field Processing ===`);
console.log(`Species: ${genus} ${species}`);
console.log(`Field: ${fieldId}`);
console.log(`Skip sync: ${skipSync}`);
console.log(`==========================================\n`);

try {
  const result = await process3TierField(genus, species, fieldId, { 
    verbose: true,
    forceRefresh: false,
    skipSync
  });
  
  console.log('\n=== RESULTS ===\n');
  
  console.log('--- Tier 1 Response ---');
  console.log(JSON.stringify(result.merged.tier1, null, 2));
  
  console.log('\n--- Tier 2 Response ---');
  console.log(JSON.stringify(result.merged.tier2, null, 2));
  
  console.log('\n--- Tier 3 Response ---');
  console.log(JSON.stringify(result.merged.tier3, null, 2));
  
  console.log('\n--- Source Stats ---');
  console.log(`Tier 1 sources: ${result.sourceStats.tier1Count}`);
  console.log(`Tier 2 sources: ${result.sourceStats.tier2Count}`);
  
  console.log('\n--- Merged Output ---');
  console.log(JSON.stringify(result.merged, null, 2));
  
  console.log('\n=== Test Complete ===\n');
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
