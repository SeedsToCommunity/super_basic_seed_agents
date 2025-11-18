import { getPlantRecord, createPlantSheet, appendPlantRows, findFolderByName, getOutputFolderName } from './plant-pipeline.js';

/**
 * Process multiple plants and save to a single Google Sheet
 * @param {Array<{genus: string, species: string}>} plants - Array of plant objects
 */
async function batchProcessPlants(plants) {
  console.log('='.repeat(80));
  console.log('Batch Plant Processing Pipeline');
  console.log('='.repeat(80));
  console.log(`Processing ${plants.length} plants`);
  console.log();
  
  // Step 1: Gather data for all plants
  console.log(`Step 1: Gathering data for all plants...`);
  console.log();
  
  const plantRecords = [];
  const failures = [];
  
  for (let i = 0; i < plants.length; i++) {
    const { genus, species } = plants[i];
    console.log(`  [${i + 1}/${plants.length}] Processing ${genus} ${species}...`);
    
    try {
      const record = await getPlantRecord(genus, species);
      
      if (record) {
        plantRecords.push(record);
        console.log(`    ✓ Success - Native: ${record.isNative}, Family: ${record.family}`);
      } else {
        failures.push({ genus, species, reason: 'Not a current botanical name' });
        console.log(`    ✗ Skipped - Not a current botanical name`);
      }
    } catch (error) {
      failures.push({ genus, species, reason: error.message });
      console.log(`    ✗ Failed - ${error.message}`);
    }
  }
  
  console.log();
  console.log(`Data gathering complete:`);
  console.log(`  ✓ Successful: ${plantRecords.length}`);
  console.log(`  ✗ Failed/Skipped: ${failures.length}`);
  console.log();
  
  if (failures.length > 0) {
    console.log(`Failed/Skipped plants:`);
    failures.forEach(f => {
      console.log(`  - ${f.genus} ${f.species}: ${f.reason}`);
    });
    console.log();
  }
  
  if (plantRecords.length === 0) {
    console.log(`No valid plant records to save. Exiting.`);
    return;
  }
  
  // Step 2: Save to Google Sheets
  console.log(`Step 2: Saving ${plantRecords.length} plants to Google Sheets...`);
  
  try {
    // Find the folder using config
    const folderName = getOutputFolderName();
    console.log(`  Finding folder "${folderName}"...`);
    const folderId = await findFolderByName(folderName);
    
    if (!folderId) {
      throw new Error(`Folder "${folderName}" not found in Google Drive`);
    }
    
    console.log(`  ✓ Found folder (ID: ${folderId})`);
    
    // Create the sheet
    console.log(`  Creating new Google Sheet...`);
    const { spreadsheetId, spreadsheetUrl } = await createPlantSheet(folderId);
    console.log(`  ✓ Created sheet (ID: ${spreadsheetId})`);
    
    // Write all data rows
    console.log(`  Writing ${plantRecords.length} rows to sheet...`);
    await appendPlantRows(spreadsheetId, plantRecords);
    
    console.log(`  ✓ Data written successfully`);
    console.log();
    console.log(`✓ Batch processing complete!`);
    console.log(`  View sheet: ${spreadsheetUrl}`);
    console.log(`  Total plants saved: ${plantRecords.length}`);
    
  } catch (error) {
    console.error(`✗ Google Sheets operation failed: ${error.message}`);
    process.exit(1);
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.length % 2 !== 0) {
  console.error('Usage: node src/output/batch-process-plants.js <genus1> <species1> <genus2> <species2> ...');
  console.error('Example: node src/output/batch-process-plants.js Quercus alba Acer rubrum Carya ovata');
  process.exit(1);
}

// Parse plant pairs
const plants = [];
for (let i = 0; i < args.length; i += 2) {
  plants.push({
    genus: args[i],
    species: args[i + 1]
  });
}

batchProcessPlants(plants);
