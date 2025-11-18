import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const configPath = join(__dirname, '../../config/config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

// Load synthesis registry
const registryPath = join(__dirname, '../../config/synthesis-registry.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));

let connectionSettings;
let folderCache = {}; // Cache for folder IDs to avoid repeated Drive API calls
let loadedModules = null; // Cache for loaded synthesis modules

/**
 * Topological sort to resolve module dependencies
 * @param {Array<Object>} modules - Array of module metadata
 * @returns {Array<Object>} Sorted modules in dependency order
 */
function sortModulesByDependencies(modules) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();
  
  function visit(moduleId) {
    if (visited.has(moduleId)) return;
    if (visiting.has(moduleId)) {
      throw new Error(`Circular dependency detected involving module: ${moduleId}`);
    }
    
    visiting.add(moduleId);
    
    const module = modules.find(m => m.metadata.id === moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }
    
    // Visit dependencies first
    for (const depId of module.metadata.dependencies || []) {
      visit(depId);
    }
    
    visiting.delete(moduleId);
    visited.add(moduleId);
    sorted.push(module);
  }
  
  // Visit all modules
  for (const module of modules) {
    visit(module.metadata.id);
  }
  
  return sorted;
}

/**
 * Dynamically load synthesis modules from registry
 * @returns {Promise<Array<Object>>} Sorted array of loaded modules
 */
async function loadSynthesisModules() {
  if (loadedModules) {
    return loadedModules;
  }
  
  const modules = [];
  
  for (const registryEntry of registry.modules) {
    if (!registryEntry.enabled) continue;
    
    const modulePath = join(__dirname, registryEntry.path);
    const module = await import(modulePath);
    
    if (!module.metadata || !module.run) {
      throw new Error(`Invalid synthesis module: ${registryEntry.id} (missing metadata or run function)`);
    }
    
    modules.push({
      metadata: module.metadata,
      run: module.run,
      registryEntry
    });
  }
  
  // Sort modules by dependencies
  loadedModules = sortModulesByDependencies(modules);
  return loadedModules;
}

/**
 * Build column definitions from loaded modules
 * @param {Array<Object>} modules - Array of loaded synthesis modules
 * @returns {Object} Column definitions object
 */
function buildColumnDefinitions(modules) {
  const headers = ['Genus', 'Species']; // Base columns always first
  let columnIndex = 2;
  const columnMap = {
    GENUS: 0,
    SPECIES: 1
  };
  
  for (const module of modules) {
    for (const columnName of module.metadata.columns) {
      headers.push(columnName);
      // Create constant name from column name (e.g., "SE MI Native" -> "SE_MI_NATIVE")
      const constName = columnName.toUpperCase().replace(/\s+/g, '_');
      columnMap[constName] = columnIndex;
      columnIndex++;
    }
  }
  
  return {
    HEADERS: headers,
    ...columnMap
  };
}

// Dynamically build column definitions from registry
const modules = await loadSynthesisModules();
export const PLANT_COLUMNS = buildColumnDefinitions(modules);

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
 * Gather all plant data by executing synthesis modules in dependency order
 * Returns null if botanical name validation fails (status !== 'current')
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @returns {Promise<Object|null>} Plant record object or null if validation failed
 */
export async function getPlantRecord(genus, species) {
  const modules = await loadSynthesisModules();
  const results = {};
  
  // Execute modules in dependency order
  for (const module of modules) {
    try {
      console.log(`Executing module: ${module.metadata.id} for ${genus} ${species}`);
      
      const moduleResult = await module.run(genus, species, results);
      
      // Store results for dependent modules
      results[module.metadata.id] = moduleResult;
      
      // Special handling for botanical-name module (validation gate)
      if (module.metadata.id === 'botanical-name') {
        if (moduleResult.status !== 'current') {
          console.log(`${genus} ${species} is not a current botanical name (status: ${moduleResult.status})`);
          return null; // Stop processing if not current
        }
      }
      
    } catch (error) {
      const errorMsg = `Module ${module.metadata.id} failed for ${genus} ${species}: ${error.message}`;
      
      // Check if we should stop on critical failure
      if (registry.config.stopOnCriticalFailure && module.metadata.id === 'botanical-name') {
        throw new Error(errorMsg);
      }
      
      console.error(errorMsg);
      // Continue with empty result for non-critical failures
      results[module.metadata.id] = {};
    }
  }
  
  // Build final plant record from all module results
  return buildPlantRecord(results);
}

/**
 * Build final plant record object from module results
 * @param {Object} moduleResults - Results from all executed modules
 * @returns {Object} Formatted plant record
 */
function buildPlantRecord(moduleResults) {
  const botanicalResult = moduleResults['botanical-name'] || {};
  const nativeResult = moduleResults['native-checker'] || {};
  const urlResult = moduleResults['external-reference-urls'] || {};
  
  return {
    genus: botanicalResult.genus || '',
    species: botanicalResult.species || '',
    family: botanicalResult.family || '',
    isNative: nativeResult.isNative || false,
    validationNotes: botanicalResult.notes || '',
    nativeCheckNotes: nativeResult.nativeCheckNotes || '',
    externalUrls: urlResult.externalUrls || {},
    // Include status fields for reference
    validationStatus: botanicalResult.status || '',
    nativeStatus: nativeResult.status || ''
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
