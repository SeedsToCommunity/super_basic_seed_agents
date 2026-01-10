#!/usr/bin/env node
import { validateUrl } from '../src/utils/species-url-validator.js';
import { parseWithReadability, fetchPage } from '../src/utils/page-content-client.js';

const TEST_CASES = [
  {
    domain: 'wildflower.org',
    url: 'https://www.wildflower.org/plants/result.php?id_plant=ASTU',
    genus: 'Asclepias',
    species: 'tuberosa',
    expectedValidation: 'h2'
  },
  {
    domain: 'minnesotawildflowers.info',
    url: 'https://www.minnesotawildflowers.info/flower/wild-bergamot',
    genus: 'Monarda',
    species: 'fistulosa',
    expectedValidation: 'h2'
  },
  {
    domain: 'gobotany.nativeplanttrust.org',
    url: 'https://gobotany.nativeplanttrust.org/species/asclepias/tuberosa/',
    genus: 'Asclepias',
    species: 'tuberosa',
    expectedValidation: 'h1'
  },
  {
    domain: 'illinoiswildflowers.info',
    url: 'https://www.illinoiswildflowers.info/weeds/plants/cm_milkweed.htm',
    genus: 'Asclepias',
    species: 'syriaca',
    expectedValidation: 'title'
  },
  {
    domain: 'prairiemoon.com',
    url: 'https://www.prairiemoon.com/asclepias-tuberosa-butterfly-milkweed.html',
    genus: 'Asclepias',
    species: 'tuberosa',
    expectedValidation: 'h1'
  }
];

async function testValidation(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testCase.domain}`);
  console.log(`URL: ${testCase.url}`);
  console.log(`Species: ${testCase.genus} ${testCase.species}`);
  console.log(`Expected validation: ${testCase.expectedValidation}`);
  console.log('='.repeat(60));
  
  try {
    const result = await validateUrl(testCase.url, testCase.genus, testCase.species);
    
    if (result.valid) {
      console.log(`✓ Validation PASSED`);
      console.log(`  Method: ${result.method}`);
      
      const methodMatches = result.method?.includes(testCase.expectedValidation);
      if (methodMatches) {
        console.log(`  ✓ Method matches expected (${testCase.expectedValidation})`);
      } else {
        console.log(`  ⚠ Method differs from expected (got ${result.method}, expected ${testCase.expectedValidation})`);
      }
      
      return { domain: testCase.domain, passed: true, method: result.method };
    } else {
      console.log(`✗ Validation FAILED`);
      return { domain: testCase.domain, passed: false, method: null };
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return { domain: testCase.domain, passed: false, error: error.message };
  }
}

async function testExtraction(testCase) {
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Testing extraction for: ${testCase.domain}`);
  
  try {
    const html = await fetchPage(testCase.url);
    if (!html) {
      console.log(`✗ Could not fetch page`);
      return { domain: testCase.domain, extracted: false };
    }
    
    const parsed = parseWithReadability(html, testCase.url);
    if (!parsed) {
      console.log(`✗ Could not parse page`);
      return { domain: testCase.domain, extracted: false };
    }
    
    const textContent = parsed.readability?.textContent || '';
    const originalLength = html.length;
    const extractedLength = textContent.length;
    const reduction = ((1 - extractedLength / originalLength) * 100).toFixed(1);
    
    console.log(`✓ Extraction completed`);
    console.log(`  Method: ${parsed.extractionMethod}`);
    console.log(`  Original HTML: ${originalLength.toLocaleString()} chars`);
    console.log(`  Extracted text: ${extractedLength.toLocaleString()} chars`);
    console.log(`  Reduction: ${reduction}%`);
    console.log(`  Preview (first 300 chars):`);
    console.log(`  "${textContent.substring(0, 300).replace(/\n/g, '\\n')}..."`);
    
    return { 
      domain: testCase.domain, 
      extracted: true, 
      method: parsed.extractionMethod,
      originalSize: originalLength,
      extractedSize: extractedLength,
      reduction: parseFloat(reduction)
    };
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return { domain: testCase.domain, extracted: false, error: error.message };
  }
}

async function main() {
  console.log('Domain-Specific Validation & Extraction Test');
  console.log('='.repeat(60));
  
  const validationResults = [];
  const extractionResults = [];
  
  for (const testCase of TEST_CASES) {
    const validationResult = await testValidation(testCase);
    validationResults.push(validationResult);
    
    if (validationResult.passed) {
      const extractionResult = await testExtraction(testCase);
      extractionResults.push(extractionResult);
    }
  }
  
  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\nValidation Results:');
  for (const result of validationResults) {
    const status = result.passed ? '✓' : '✗';
    console.log(`  ${status} ${result.domain}: ${result.passed ? result.method : 'FAILED'}`);
  }
  
  console.log('\nExtraction Results:');
  for (const result of extractionResults) {
    if (result.extracted) {
      console.log(`  ✓ ${result.domain}: ${result.method} (${result.reduction}% reduction)`);
    } else {
      console.log(`  ✗ ${result.domain}: FAILED`);
    }
  }
  
  const validationPassed = validationResults.filter(r => r.passed).length;
  const extractionPassed = extractionResults.filter(r => r.extracted).length;
  
  console.log(`\nTotal: ${validationPassed}/${validationResults.length} validations, ${extractionPassed}/${extractionResults.length} extractions`);
}

main().catch(console.error);
