/**
 * Integration Test: GBIF Species API
 * 
 * Tests the GBIF API client to verify connectivity and correct parsing
 * of species matching and synonym retrieval.
 * 
 * Run with: node test/gbif-integration.test.js
 */

import { matchSpecies, getSynonyms } from '../src/utils/gbif-client.js';

// ANSI color codes for test output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`${GREEN}✓${RESET} ${message}`);
    passed++;
  } else {
    console.log(`${RED}✗${RESET} ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

function logSection(title) {
  console.log(`\n${YELLOW}${title}${RESET}`);
}

async function testMatchSpecies() {
  logSection('Test 1: Match species - Quercus alba (White Oak)');
  
  const result = await matchSpecies('Quercus', 'alba');
  
  assert(result.matched === true, 'Should successfully match Quercus alba');
  assert(result.usageKey > 0, 'Should return a valid usage key');
  assert(result.family === 'Fagaceae', 'Should identify correct family (Fagaceae)');
  assert(result.genus === 'Quercus', 'Should identify correct genus');
  assert(result.species === 'Quercus alba', 'Should identify correct species (GBIF returns full binomial)');
  assert(result.matchType === 'EXACT', 'Should be an exact match');
  assert(result.status === 'ACCEPTED', 'Should be an accepted name');
  
  console.log(`  Usage Key: ${result.usageKey}`);
  console.log(`  Scientific Name: ${result.scientificName}`);
}

async function testMatchSpeciesWithSynonyms() {
  logSection('Test 2: Match species with synonyms - Acer saccharum (Sugar Maple)');
  
  const result = await matchSpecies('Acer', 'saccharum');
  
  assert(result.matched === true, 'Should successfully match Acer saccharum');
  assert(result.usageKey > 0, 'Should return a valid usage key');
  assert(result.family === 'Sapindaceae', 'Should identify correct family (Sapindaceae)');
  assert(result.genus === 'Acer', 'Should identify correct genus');
  
  console.log(`  Usage Key: ${result.usageKey}`);
  console.log(`  Scientific Name: ${result.scientificName}`);
  
  return result.usageKey; // Return for synonym test
}

async function testGetSynonyms(usageKey) {
  logSection(`Test 3: Get synonyms for usage key ${usageKey}`);
  
  const synonyms = await getSynonyms(usageKey);
  
  assert(Array.isArray(synonyms), 'Should return an array of synonyms');
  assert(synonyms.length > 0, 'Should return at least one synonym for Acer saccharum');
  
  // Check that synonyms include species-level synonyms (e.g., Acer saccharophorum)
  const hasSpeciesLevelSynonym = synonyms.some(syn => 
    syn.genus === 'Acer' && (syn.species === 'saccharophorum' || syn.species === 'palmifolium')
  );
  
  assert(hasSpeciesLevelSynonym, 'Should include species-level synonyms like Acer saccharophorum');
  
  console.log(`  Found ${synonyms.length} species-level synonym(s):`);
  synonyms.forEach(syn => {
    console.log(`    - ${syn.binomial} (${syn.status || 'N/A'})`);
  });
}

async function testInvalidInput() {
  logSection('Test 4: Invalid input handling');
  
  try {
    await matchSpecies('', 'alba');
    assert(false, 'Should throw error for empty genus');
  } catch (error) {
    assert(error.message.includes('Genus must be a non-empty string'), 
           'Should throw appropriate error for empty genus');
  }
  
  try {
    await matchSpecies('Quercus', '');
    assert(false, 'Should throw error for empty species');
  } catch (error) {
    assert(error.message.includes('Species must be a non-empty string'),
           'Should throw appropriate error for empty species');
  }
  
  try {
    await getSynonyms('invalid');
    assert(false, 'Should throw error for invalid usage key');
  } catch (error) {
    assert(error.message.includes('Usage key must be a valid number'),
           'Should throw appropriate error for invalid usage key type');
  }
}

async function testNoMatch() {
  logSection('Test 5: Non-existent species');
  
  const result = await matchSpecies('Fakeus', 'invalidus');
  
  // GBIF may return a HIGHERRANK match (e.g., to Kingdom Plantae) for unrecognized names
  assert(result.matched === true, 'GBIF returns higher rank match for unrecognized names');
  assert(result.matchType === 'HIGHERRANK', 'Should be a HIGHERRANK match');
  assert(result.rank !== 'SPECIES', 'Should not be a species-level match');
  
  console.log(`  Match Type: ${result.matchType}`);
  console.log(`  Matched Rank: ${result.rank}`);
  console.log(`  Matched Name: ${result.scientificName}`);
}

async function runAllTests() {
  console.log(`${YELLOW}=== GBIF API Integration Tests ===${RESET}\n`);
  
  try {
    await testMatchSpecies();
    const usageKey = await testMatchSpeciesWithSynonyms();
    await testGetSynonyms(usageKey);
    await testInvalidInput();
    await testNoMatch();
    
    console.log(`\n${YELLOW}=== Test Summary ===${RESET}`);
    console.log(`${GREEN}Passed: ${passed}${RESET}`);
    console.log(`${RED}Failed: ${failed}${RESET}`);
    
    if (failed === 0) {
      console.log(`\n${GREEN}All tests passed! ✓${RESET}`);
      process.exit(0);
    } else {
      console.log(`\n${RED}Some tests failed.${RESET}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n${RED}Test execution failed:${RESET}`, error.message);
    console.log(`\n${YELLOW}=== Test Summary ===${RESET}`);
    console.log(`${GREEN}Passed: ${passed}${RESET}`);
    console.log(`${RED}Failed: ${failed}${RESET}`);
    process.exit(1);
  }
}

runAllTests();
