import { getJson } from 'serpapi';

/**
 * Simple integration test for SerpApi connectivity
 * Tests that we can make a basic search request and get results
 */
async function testSerpApi() {
  console.log('='.repeat(80));
  console.log('SerpApi Integration Test');
  console.log('='.repeat(80));
  console.log();
  
  const apiKey = process.env.SERPAPI_API_KEY;
  
  if (!apiKey) {
    console.log('⚠ SERPAPI_API_KEY not found - skipping test');
    console.log('  This test requires a SerpApi API key to run');
    console.log('  Set SERPAPI_API_KEY environment variable to enable this test');
    return;
  }
  
  console.log('✓ API key found');
  console.log();
  
  console.log('Testing basic search for "Trillium grandiflorum Michigan Flora"...');
  
  try {
    const params = {
      api_key: apiKey,
      q: 'Trillium grandiflorum Michigan Flora',
      num: 1
    };
    
    const result = await getJson(params);
    
    if (result && result.organic_results && result.organic_results.length > 0) {
      console.log('✓ Search successful!');
      console.log();
      console.log('First result:');
      console.log(`  Title: ${result.organic_results[0].title}`);
      console.log(`  URL: ${result.organic_results[0].link}`);
      console.log();
      console.log('✓ SerpApi integration test passed');
    } else {
      console.log('✗ Search returned no results');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('✗ Search failed:', error.message);
    if (error.json) {
      console.error('Error details:', JSON.stringify(error.json, null, 2));
    }
    process.exit(1);
  }
}

testSerpApi();
