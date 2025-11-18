import { google } from 'googleapis';
import { validateBotanicalName } from '../common/botanical-validator.js';
import { checkMichiganNative } from '../common/michigan-native-checker.js';

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function getUncachableGoogleSheetsClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

/**
 * Find a folder by name in Google Drive
 * @param {string} folderName - The name of the folder to find
 * @returns {Promise<string|null>} The folder ID or null if not found
 */
async function findFolderByName(folderName) {
  const drive = await getUncachableGoogleDriveClient();
  
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }
  
  return null;
}

/**
 * Create a new Google Sheet with datetime-stamped name
 * @param {string} folderId - The ID of the folder to create the sheet in
 * @returns {Promise<Object>} Object with spreadsheetId and spreadsheetUrl
 */
async function createPlantDataSheet(folderId) {
  const sheets = await getUncachableGoogleSheetsClient();
  
  // Generate datetime stamp
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const sheetName = `PlantData_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  
  // Create the spreadsheet
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: sheetName
      },
      sheets: [{
        properties: {
          title: 'Plant Data'
        }
      }]
    }
  });
  
  const spreadsheetId = createResponse.data.spreadsheetId;
  
  // Move to the specified folder and remove from root
  const drive = await getUncachableGoogleDriveClient();
  
  // Get current parents
  const fileResponse = await drive.files.get({
    fileId: spreadsheetId,
    fields: 'parents'
  });
  
  const previousParents = fileResponse.data.parents ? fileResponse.data.parents.join(',') : '';
  
  // Move file to target folder and remove from previous parents
  await drive.files.update({
    fileId: spreadsheetId,
    addParents: folderId,
    removeParents: previousParents,
    fields: 'id, parents'
  });
  
  return {
    spreadsheetId,
    spreadsheetUrl: createResponse.data.spreadsheetUrl
  };
}

/**
 * Write headers and data row to the Google Sheet
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {Object} data - The plant data to write
 */
async function writeDataToSheet(spreadsheetId, data) {
  const sheets = await getUncachableGoogleSheetsClient();
  
  const headers = ['Genus', 'Species', 'Family', 'SE MI Native', 'Botanical Name Notes', 'Native Check Notes'];
  
  const dataRow = [
    data.genus,
    data.species,
    data.family,
    data.isNative ? 'Yes' : 'No',
    data.validationNotes || '',
    data.nativeCheckNotes || ''
  ];
  
  // Write headers and data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Plant Data!A1:F2',
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers, dataRow]
    }
  });
}

/**
 * Process a plant: validate, check native status, and save to Google Sheets
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 */
async function processPlant(genus, species) {
  console.log('='.repeat(80));
  console.log('Plant Processing Pipeline');
  console.log('='.repeat(80));
  console.log();
  
  // Step 1: Validate botanical name : Columns: Genus, Species, Family, Validation Notes.
  console.log(`Step 1: Validating botanical name "${genus} ${species}"...`);
  
  let validationResult;
  try {
    validationResult = await validateBotanicalName(`${genus} ${species}`);
  } catch (error) {
    console.error(`✗ Validation failed: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`  Status: ${validationResult.status}`);
  
  if (validationResult.status !== 'current') {
    console.log(`✗ Plant name is not current (status: ${validationResult.status}). Stopping pipeline.`);
    if (validationResult.currentName) {
      console.log(`  Current name: ${validationResult.currentName}`);
    }
    if (validationResult.error) {
      console.log(`  Error: ${validationResult.error}`);
    }
    process.exit(1);
  }
  
  console.log(`✓ Botanical name is current`);
  console.log(`  Family: ${validationResult.family}`);
  console.log();
  
  // Step 2: Check native status : Columns: SE MI Native, Native Check Notes.
  console.log(`Step 2: Checking if native to SE Michigan...`);
  
  let nativeResult;
  try {
    nativeResult = await checkMichiganNative(genus, species);
  } catch (error) {
    console.error(`✗ Native check failed: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`  Native to SE Michigan: ${nativeResult.isNative}`);
  console.log(`  Status: ${nativeResult.status}`);
  if (nativeResult.notes) {
    console.log(`  Notes: ${nativeResult.notes}`);
  }
  console.log();
  
  // Step 3: Save to Google Sheets
  console.log(`Step 3: Saving to Google Sheets...`);
  
  try {
    // Find the folder
    console.log(`  Finding folder "SpeciesAppDataFiles_DoNotTouch"...`);
    const folderId = await findFolderByName('SpeciesAppDataFiles_DoNotTouch');
    
    if (!folderId) {
      throw new Error('Folder "SpeciesAppDataFiles_DoNotTouch" not found in Google Drive');
    }
    
    console.log(`  ✓ Found folder (ID: ${folderId})`);
    
    // Create the sheet
    console.log(`  Creating new Google Sheet...`);
    const { spreadsheetId, spreadsheetUrl } = await createPlantDataSheet(folderId);
    console.log(`  ✓ Created sheet (ID: ${spreadsheetId})`);
    
    // Write the data
    console.log(`  Writing data to sheet...`);
    await writeDataToSheet(spreadsheetId, {
      genus,
      species,
      family: validationResult.family,
      isNative: nativeResult.isNative,
      validationNotes: validationResult.error || '',
      nativeCheckNotes: nativeResult.notes || ''
    });
    
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
