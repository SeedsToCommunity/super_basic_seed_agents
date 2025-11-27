/**
 * Test script for iNaturalist Client
 * 
 * Tests:
 * 1. Taxa data retrieval (Wikipedia excerpt, taxonomy, common names)
 * 2. Histogram data retrieval (phenology for SE Michigan)
 * 3. Caching functionality
 * 4. Unknown species handling
 * 5. Place ID configuration
 */

import {
  getTaxaData,
  getHistogramData,
  getFullSpeciesData,
  getPlaceIds,
  clearSpeciesCache,
  listCachedSpecies
} from '../src/utils/inaturalist-client.js';

async function runTests() {
  console.log('🧪 Testing iNaturalist Client\n');
  
  let passed = 0;
  let failed = 0;
  
  function assert(condition, testName) {
    if (condition) {
      console.log(`   ✅ ${testName}`);
      passed++;
    } else {
      console.log(`   ❌ ${testName}`);
      failed++;
    }
  }
  
  console.log('📍 Test 1: Place ID Configuration\n');
  const placeIds = getPlaceIds();
  assert(placeIds.washtenaw === 2649, 'Washtenaw County ID is 2649');
  assert(placeIds.livingston === 2609, 'Livingston County ID is 2609');
  assert(placeIds.oakland === 2350, 'Oakland County ID is 2350');
  assert(placeIds.wayne === 986, 'Wayne County ID is 986');
  assert(placeIds.monroe === 2009, 'Monroe County ID is 2009');
  assert(placeIds.jackson === 2948, 'Jackson County ID is 2948');
  assert(placeIds.lenawee === 2608, 'Lenawee County ID is 2608');
  assert(Object.keys(placeIds).length === 7, 'All 7 SE Michigan counties configured');
  console.log('');
  
  console.log('🌳 Test 2: Taxa Data - Sugar Maple (Acer saccharum)\n');
  clearSpeciesCache('Acer', 'saccharum');
  const sugarMaple = await getTaxaData('Acer', 'saccharum', false);
  assert(sugarMaple.found === true, 'Species found');
  assert(sugarMaple.scientificName === 'Acer saccharum', 'Correct scientific name');
  assert(typeof sugarMaple.taxonId === 'number', 'Has taxon ID');
  assert(sugarMaple.wikipediaSummary.length > 100, `Has Wikipedia summary (${sugarMaple.wikipediaSummary.length} chars)`);
  assert(sugarMaple.wikipediaUrl.includes('wikipedia.org'), 'Has Wikipedia URL');
  assert(sugarMaple.preferredCommonName.toLowerCase().includes('maple'), 'Has common name with "maple"');
  assert(Array.isArray(sugarMaple.commonNames), 'Common names is array');
  assert(sugarMaple.taxonomy.rank === 'species', 'Correct rank');
  assert(sugarMaple.taxonomy.iconicTaxonName === 'Plantae', 'Iconic taxon is Plantae');
  assert(sugarMaple.observationsCount > 50000, `Has many observations (${sugarMaple.observationsCount})`);
  console.log('');
  
  console.log('📊 Test 3: Histogram Data - Sugar Maple Phenology\n');
  clearSpeciesCache('Acer', 'saccharum');
  const histogram = await getHistogramData('Acer', 'saccharum', false);
  assert(histogram.found === true, 'Histogram data found');
  assert(histogram.region === 'Southeast Michigan', 'Correct region');
  assert(typeof histogram.monthlyObservations === 'object', 'Has monthly observations');
  assert(histogram.totalObservations > 0, `Has observations (${histogram.totalObservations})`);
  assert(histogram.peakMonth >= 1 && histogram.peakMonth <= 12, `Peak month is valid (${histogram.peakMonth})`);
  assert(typeof histogram.peakMonthName === 'string', `Peak month name: ${histogram.peakMonthName}`);
  
  const months = Object.keys(histogram.monthlyObservations);
  assert(months.length > 0, 'Has observation data for multiple months');
  console.log(`   📈 Monthly distribution: ${JSON.stringify(histogram.monthlyObservations)}`);
  console.log('');
  
  console.log('💾 Test 4: Caching Functionality\n');
  const cachedTaxa = await getTaxaData('Acer', 'saccharum', true);
  assert(cachedTaxa.found === true, 'Cached taxa data retrieved');
  assert(cachedTaxa.scientificName === 'Acer saccharum', 'Cached data matches');
  
  const cachedHistogram = await getHistogramData('Acer', 'saccharum', true);
  assert(cachedHistogram.found === true, 'Cached histogram data retrieved');
  
  const cachedSpecies = listCachedSpecies();
  const acerEntry = cachedSpecies.find(s => s.genus === 'Acer' && s.species === 'saccharum');
  assert(acerEntry !== undefined, 'Species appears in cached list');
  assert(acerEntry?.endpoints.includes('taxa'), 'Taxa endpoint cached');
  assert(acerEntry?.endpoints.includes('histogram'), 'Histogram endpoint cached');
  console.log('');
  
  console.log('🔍 Test 5: Full Species Data (Combined)\n');
  const fullData = await getFullSpeciesData('Quercus', 'alba', false);
  assert(fullData.taxa.found === true, 'Full data - taxa found');
  assert(fullData.histogram.found === true, 'Full data - histogram found');
  assert(fullData.taxa.scientificName === 'Quercus alba', 'White oak scientific name correct');
  assert(fullData.taxa.preferredCommonName.toLowerCase().includes('oak'), 'White oak common name');
  console.log('');
  
  console.log('❓ Test 6: Unknown Species Handling\n');
  const unknown = await getTaxaData('Nonexistent', 'species123', false);
  assert(unknown.found === false, 'Unknown species marked as not found');
  assert(unknown.scientificName === 'Nonexistent species123', 'Scientific name preserved');
  assert(unknown.wikipediaSummary === '', 'Empty Wikipedia summary');
  assert(unknown.taxonId === null, 'Null taxon ID');
  
  const unknownHistogram = await getHistogramData('Nonexistent', 'species123', false);
  assert(unknownHistogram.found === false, 'Unknown species histogram not found');
  assert(unknownHistogram.totalObservations === 0, 'Zero observations for unknown');
  console.log('');
  
  console.log('🌿 Test 7: Non-native Species (Norway Maple)\n');
  clearSpeciesCache('Acer', 'platanoides');
  const norwayMaple = await getTaxaData('Acer', 'platanoides', false);
  assert(norwayMaple.found === true, 'Norway maple found');
  assert(norwayMaple.scientificName === 'Acer platanoides', 'Correct scientific name');
  console.log(`   📝 Wikipedia: ${norwayMaple.wikipediaSummary.substring(0, 150)}...`);
  console.log('');
  
  console.log('🧹 Cleanup: Removing all test cache files\n');
  clearSpeciesCache('Acer', 'saccharum');
  clearSpeciesCache('Quercus', 'alba');
  clearSpeciesCache('Nonexistent', 'species123');
  clearSpeciesCache('Acer', 'platanoides');
  
  console.log('═'.repeat(50));
  console.log(`\n🏁 Test Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
