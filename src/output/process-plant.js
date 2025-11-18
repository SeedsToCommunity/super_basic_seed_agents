import { getPlantRecord, createPlantSheet, appendPlantRows, findFolderByName, getOutputFolderName } from './plant-pipeline.js';

/**
 * Process a single plant: validate, check native status, discover URLs, and save to Google Sheets
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 */
async function processPlant(genus, species) {
  console.log('='.repeat(80));
  console.log('Plant Processing Pipeline');
  console.log('='.repeat(80));
  console.log(`Processing: ${genus} ${species}`);
  console.log();
  
  // Step 1: Gather all plant data (validation + native check + URL discovery)
  console.log(`Step 1: Gathering plant data...`);
  
  let plantRecord;
  try {
    plantRecord = await getPlantRecord(genus, species);
  } catch (error) {
    console.error(`✗ Data gathering failed: ${error.message}`);
    process.exit(1);
  }
  
  if (!plantRecord) {
    console.log(`✗ Plant name is not current. Stopping pipeline.`);
    process.exit(1);
  }
  
  console.log(`✓ Data gathered successfully`);
  console.log(`  Family: ${plantRecord.family}`);
  console.log(`  Native to SE Michigan: ${plantRecord.isNative}`);
  console.log(`  External URLs found: ${Object.keys(plantRecord.externalUrls || {}).length}`);
  console.log();
  
  // Step 2: Save to Google Sheets
  console.log(`Step 2: Saving to Google Sheets...`);
  
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
    
    // Write the data
    console.log(`  Writing data to sheet...`);
    await appendPlantRows(spreadsheetId, [plantRecord]);
    
    console.log(`  ✓ Data written successfully`);
    console.log();
    console.log(`✓ Processing complete!`);
    console.log(`  View sheet: ${spreadsheetUrl}`);
    
  } catch (error) {
    console.error(`✗ Google Sheets operation failed: ${error.message}`);
    process.exit(1);
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: node src/output/process-plant.js <genus> <species>');
  console.error('Example: node src/output/process-plant.js Quercus alba');
  process.exit(1);
}

const [genus, species] = args;

processPlant(genus, species);
