import { discoverAllUrls, getCachedUrls, clearCache } from './src/synthesis/process-external-reference-urls.js';

async function testUrlDiscovery() {
  console.log('=== Testing External Reference URL Discovery ===\n');
  
  const testSpecies = [
    { genus: 'Trillium', species: 'grandiflorum' },
    { genus: 'Quercus', species: 'alba' }
  ];
  
  for (const plant of testSpecies) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${plant.genus} ${plant.species}`);
    console.log('='.repeat(60));
    
    // Check cache first
    console.log('\n1. Checking cache...');
    const cached = getCachedUrls(plant.genus, plant.species);
    if (cached) {
      console.log('✓ Found in cache:');
      console.log(JSON.stringify(cached, null, 2));
      console.log('\nSkipping web search (already cached)');
      continue;
    } else {
      console.log('✗ Not in cache, will perform web search');
    }
    
    // Discover URLs
    console.log('\n2. Discovering URLs...');
    const urls = await discoverAllUrls(plant.genus, plant.species);
    
    console.log('\n3. Results:');
    console.log(JSON.stringify(urls, null, 2));
    
    console.log(`\n4. Summary: Found ${Object.keys(urls).length} reference URLs`);
    
    // Verify cache was saved
    console.log('\n5. Verifying cache was saved...');
    const nowCached = getCachedUrls(plant.genus, plant.species);
    if (nowCached) {
      console.log('✓ Successfully cached for future lookups');
    } else {
      console.log('✗ WARNING: Cache not saved properly');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60));
  console.log('\nNote: Subsequent runs will use cached data and not consume SerpApi credits.');
  console.log('To clear cache and re-test: uncomment clearCache() in the test file.');
}

testUrlDiscovery().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
