import { google } from 'googleapis';
import { validateBotanicalName } from '../synthesis/process-botanical-name.js';
import { checkMichiganNative } from '../synthesis/process-native-checker.js';
import { discoverAllUrls } from '../synthesis/process-external-reference-urls.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const configPath = join(__dirname, '../../config/config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

let connectionSettings;
let folderCache = {}; // Cache for folder IDs to avoid repeated Drive API calls

// Column definitions - single source of truth for all plant data columns
export const PLANT_COLUMNS = {
  HEADERS: ['Genus', 'Species', 'Family', 'SE MI Native', 'Botanical Name Notes', 'Native Check Notes', 'External Reference URLs'],
  GENUS: 0,
  SPECIES: 1,
  FAMILY: 2,
  SE_MI_NATIVE: 3,
  BOTANICAL_NOTES: 4,
  NATIVE_NOTES: 5,
  EXTERNAL_URLS: 6
};

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
 * Find a folder by name in Google Drive (with caching to avoid repeated API calls)
 * @param {string} folderName - The name of the folder to find
 * @returns {Promise<string|null>} The folder ID or null if not found
 */
export async function findFolderByName(folderName) {
  // Check cache first
  if (folderCache[folderName]) {
    return folderCache[folderName];
  }
  
  const drive = await getUncachableGoogleDriveClient();
  
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (response.data.files && response.data.files.length > 0) {
    const folderId = response.data.files[0].id;
    // Cache the result
    folderCache[folderName] = folderId;
    return folderId;
  }
  
  return null;
}

/**
 * Gather all plant data (validation + native check + URL discovery)
 * Returns null if validation fails (status !== 'current')
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @returns {Promise<Object|null>} Plant record object or null if validation failed
 */
export async function getPlantRecord(genus, species) {
  // Step 1: Validate botanical name
  let validationResult;
  try {
    validationResult = await validateBotanicalName(`${genus} ${species}`);
  } catch (error) {
    throw new Error(`Validation failed for ${genus} ${species}: ${error.message}`);
  }
  
  // Only proceed if status is 'current'
  if (validationResult.status !== 'current') {
    return null; // Indicates validation failed (not a current name)
  }
  
  // Step 2: Check native status
  let nativeResult;
  try {
    nativeResult = await checkMichiganNative(genus, species);
  } catch (error) {
    throw new Error(`Native check failed for ${genus} ${species}: ${error.message}`);
  }
  
  // Step 3: Discover external reference URLs
  let externalUrls;
  try {
    externalUrls = await discoverAllUrls(genus, species);
  } catch (error) {
    console.error(`URL discovery failed for ${genus} ${species}:`, error.message);
    externalUrls = {}; // Continue with empty URLs on failure
  }
  
  // Return the complete plant record
  return {
    genus: validationResult.genus,
    species: validationResult.species,
    family: validationResult.family,
    isNative: nativeResult.isNative,
    validationNotes: validationResult.error || '',
    nativeCheckNotes: nativeResult.notes || '',
    externalUrls: externalUrls,
    // Include validation status for reference
    validationStatus: validationResult.status,
    nativeStatus: nativeResult.status
  };
}

/**
 * Create a new Google Sheet with datetime-stamped name
 * Always appends timestamp to ensure unique sheet names
 * @param {string} folderId - The ID of the folder to create the sheet in
 * @param {string} [prefix] - Optional prefix for sheet name (defaults to config value)
 * @returns {Promise<Object>} Object with spreadsheetId and spreadsheetUrl
 */
export async function createPlantSheet(folderId, prefix = config.output.filePrefix) {
  const sheets = await getUncachableGoogleSheetsClient();
  
  // Generate datetime stamp (always included for uniqueness)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const sheetName = `${prefix}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  
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
  
  // Write headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Plant Data!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [PLANT_COLUMNS.HEADERS]
    }
  });
  
  return {
    spreadsheetId,
    spreadsheetUrl: createResponse.data.spreadsheetUrl
  };
}

/**
 * Append plant data rows to an existing Google Sheet
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {Array<Object>} plantRecords - Array of plant record objects from getPlantRecord()
 */
export async function appendPlantRows(spreadsheetId, plantRecords) {
  if (!plantRecords || plantRecords.length === 0) {
    return;
  }
  
  const sheets = await getUncachableGoogleSheetsClient();
  
  // Convert plant records to rows
  const rows = plantRecords.map(record => [
    record.genus,
    record.species,
    record.family,
    record.isNative ? 'Yes' : 'No',
    record.validationNotes || '',
    record.nativeCheckNotes || '',
    JSON.stringify(record.externalUrls || {})
  ]);
  
  // Append rows
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Plant Data!A2', // Start from row 2 (after headers)
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows
    }
  });
}

/**
 * Get the output folder name from configuration
 * @returns {string} The configured output folder name
 */
export function getOutputFolderName() {
  return config.googleDrive.folders.outputFolder;
}
