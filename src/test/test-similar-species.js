#!/usr/bin/env node

import { findSimilarSpecies } from '../synthesis/process-similar-species.js';
import { refreshParsedPdfCache, getCacheStats } from '../utils/drive-pdf-sync.js';
import { collectSpeciesData } from '../utils/species-data-collector.js';

const TEST_SPECIES = [
  { genus: 'Trillium', species: 'grandiflorum' },
  { genus: 'Geranium', species: 'maculatum' },
  { genus: 'Sanguinaria', species: 'canadensis' }
];

async function runTest() {
  console.log('='.repeat(60));
  console.log('Similar Species Module - Test Suite');
  console.log('='.repeat(60));
  
  const args = process.argv.slice(2);
  const syncOnly = args.includes('--sync-only');
  const dataOnly = args.includes('--data-only');
  const speciesArg = args.find(a => !a.startsWith('--'));
  
  console.log('\n1. Syncing Google Drive parsed PDFs...');
  try {
    const syncResult = await refreshParsedPdfCache({ verbose: true });
    console.log(`   Sync complete: ${syncResult.total} files in cache`);
  } catch (err) {
    console.error(`   Sync failed: ${err.message}`);
    console.log('   Continuing with existing cache...');
  }
  
  if (syncOnly) {
    console.log('\n--sync-only flag set, stopping here.');
    return;
  }
  
  const cacheStats = getCacheStats();
  console.log(`\n2. Cache Status:`);
  console.log(`   - Parsed PDFs: ${cacheStats.fileCount} files`);
  console.log(`   - Last sync: ${cacheStats.lastSync || 'never'}`);
  
  let speciesToTest = TEST_SPECIES;
  if (speciesArg) {
    const [genus, species] = speciesArg.split(/[_\s]+/);
    if (genus && species) {
      speciesToTest = [{ genus, species }];
      console.log(`\n   Testing single species: ${genus} ${species}`);
    }
  }
  
  for (const { genus, species } of speciesToTest) {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing: ${genus} ${species}`);
    console.log('='.repeat(60));
    
    console.log('\n3. Collecting data sources...');
    const data = await collectSpeciesData(genus, species, { syncDrive: false });
    console.log(`   - Parsed PDFs: ${data.summary.parsedPdfCount}`);
    console.log(`   - Web pages: ${data.summary.pageContentCount}`);
    console.log(`   - Total sources: ${data.summary.totalSources}`);
    
    if (data.sources.parsedPdfs.length > 0) {
      console.log('\n   Parsed PDF files:');
      for (const pdf of data.sources.parsedPdfs) {
        console.log(`     - ${pdf.fileName}`);
      }
    }
    
    if (data.sources.pageContent.length > 0) {
      console.log('\n   Web page sources:');
      for (const page of data.sources.pageContent) {
        console.log(`     - ${page.source} (${page.url || 'no url'})`);
      }
    }
    
    if (dataOnly) {
      console.log('\n--data-only flag set, skipping Claude API call.');
      continue;
    }
    
    console.log('\n4. Calling Claude API for similar species extraction...');
    try {
      const result = await findSimilarSpecies(genus, species);
      
      console.log('\n5. Results:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.similar_species && result.similar_species.length > 0) {
        console.log('\n   Summary:');
        for (const sp of result.similar_species) {
          const tier1 = sp.tier1_source_backed?.distinguishing_features?.confidence || 'none';
          const tier2 = sp.tier2_inferred?.additional_distinctions?.confidence || 'none';
          console.log(`     - ${sp.name}: Tier1=${tier1}, Tier2=${tier2}`);
        }
      }
      
      if (result.known_unknowns && result.known_unknowns.length > 0) {
        console.log('\n   Known Unknowns:');
        for (const unknown of result.known_unknowns) {
          console.log(`     - ${unknown}`);
        }
      }
    } catch (err) {
      console.error(`\n   Error: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60));
}

runTest().catch(console.error);
