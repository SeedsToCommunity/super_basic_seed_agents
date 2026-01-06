import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, '../config/config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const batchConfigPath = join(__dirname, 'batch-config.json');

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

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
    throw new Error('X_REPLIT_TOKEN not found');
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

async function getDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function getSheetsClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

async function findFolderByName(folderName) {
  const drive = await getDriveClient();
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  return response.data.files?.[0]?.id || null;
}

async function findSheetByName(sheetName, folderId) {
  const drive = await getDriveClient();
  const response = await drive.files.list({
    q: `name='${sheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  return response.data.files?.[0] || null;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getExistingSpecies(spreadsheetId, maxRetries = 3) {
  const sheets = await getSheetsClient();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Plant Data!A:B'
      });
      
      const rows = response.data.values || [];
      const species = new Set();
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][0] && rows[i][1]) {
          const speciesName = `${rows[i][0]} ${rows[i][1]}`.toLowerCase().trim();
          species.add(speciesName);
        }
      }
      
      return species;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.status,
        attempt
      };
      console.warn(`[WARN] Sheet read failed (attempt ${attempt}/${maxRetries}):`, JSON.stringify(errorDetails));
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[WARN] Retrying in ${delay/1000}s...`);
        await sleep(delay);
      } else {
        console.error(`[FATAL] Failed to read existing species after ${maxRetries} attempts`);
        throw new Error(`Cannot read sheet to check existing species: ${error.message}. Stopping to prevent duplicate processing.`);
      }
    }
  }
}

async function createNewSheet(sheetName, folderId) {
  const { createPlantSheet } = await import('../src/output/plant-pipeline.js');
  
  const sheets = await getSheetsClient();
  const drive = await getDriveClient();
  
  const { PLANT_COLUMNS } = await import('../src/output/plant-pipeline.js');
  
  const registryPath = join(__dirname, '../config/synthesis-registry.json');
  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
  
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: sheetName },
      sheets: [
        { properties: { title: 'Plant Data', index: 0 } },
        { properties: { title: 'Column Sources', index: 1 } }
      ]
    }
  });
  
  const spreadsheetId = createResponse.data.spreadsheetId;
  
  const fileResponse = await drive.files.get({
    fileId: spreadsheetId,
    fields: 'parents'
  });
  
  const previousParents = fileResponse.data.parents ? fileResponse.data.parents.join(',') : '';
  
  await drive.files.update({
    fileId: spreadsheetId,
    addParents: folderId,
    removeParents: previousParents,
    fields: 'id, parents'
  });
  
  const headersWithDuration = [...PLANT_COLUMNS.HEADERS, 'Processing Duration'];
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Plant Data!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [headersWithDuration] }
  });
  
  return {
    spreadsheetId,
    spreadsheetUrl: createResponse.data.spreadsheetUrl
  };
}

function parseSpeciesList(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { genus: parts[0], species: parts[1] };
    }
    return null;
  }).filter(Boolean);
}

async function ensureDurationHeader(spreadsheetId) {
  const sheets = await getSheetsClient();
  const { PLANT_COLUMNS } = await import('../src/output/plant-pipeline.js');
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Plant Data!1:1'
  });
  
  const headers = response.data.values?.[0] || [];
  const expectedColumns = PLANT_COLUMNS.HEADERS.length + 1;
  
  if (headers.length < expectedColumns || headers[headers.length - 1] !== 'Processing Duration') {
    const durationColLetter = String.fromCharCode(65 + PLANT_COLUMNS.HEADERS.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Plant Data!${durationColLetter}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['Processing Duration']] }
    });
    console.log('Added Processing Duration header to existing sheet');
  }
}

async function appendPlantRowWithDuration(spreadsheetId, record) {
  const sheets = await getSheetsClient();
  const { PLANT_COLUMNS } = await import('../src/output/plant-pipeline.js');
  
  const row = [];
  
  row.push(record.genus);
  row.push(record.species);
  
  for (const columnId of PLANT_COLUMNS.COLUMN_ORDER) {
    const { moduleId } = PLANT_COLUMNS.COLUMN_REGISTRY.get(columnId);
    const moduleResult = record.moduleResults[moduleId];
    
    if (moduleResult && moduleResult.columnValues && columnId in moduleResult.columnValues) {
      const value = moduleResult.columnValues[columnId];
      
      if (value !== null && typeof value === 'object') {
        row.push(JSON.stringify(value, null, 2));
      } else if (value == null) {
        row.push('');
      } else {
        row.push(value);
      }
    } else {
      row.push('');
    }
  }
  
  row.push(record.processingDuration || '');
  
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Plant Data!A2',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row]
    }
  });
}

async function runBatch(sheetName, speciesListFile) {
  console.log('='.repeat(80));
  console.log('Production Batch Processor (Resumable)');
  console.log('='.repeat(80));
  console.log(`Sheet name: ${sheetName}`);
  console.log(`Species list: ${speciesListFile}`);
  console.log();
  
  if (!existsSync(speciesListFile)) {
    console.error(`Error: Species list file not found: ${speciesListFile}`);
    process.exit(1);
  }
  
  const allSpecies = parseSpeciesList(speciesListFile);
  console.log(`Total species in input file: ${allSpecies.length}`);
  
  const folderName = config.googleDrive.folders.outputFolder;
  console.log(`\nLooking for folder: ${folderName}`);
  
  const folderId = await findFolderByName(folderName);
  if (!folderId) {
    console.error(`Error: Folder "${folderName}" not found in Google Drive`);
    process.exit(1);
  }
  console.log(`Found folder (ID: ${folderId})`);
  
  let spreadsheetId, spreadsheetUrl;
  let existingSpecies = new Set();
  
  const existingSheet = await findSheetByName(sheetName, folderId);
  
  if (existingSheet) {
    console.log(`\nFound existing sheet: ${sheetName}`);
    spreadsheetId = existingSheet.id;
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    await ensureDurationHeader(spreadsheetId);
    
    existingSpecies = await getExistingSpecies(spreadsheetId);
    console.log(`Species already in sheet: ${existingSpecies.size}`);
  } else {
    console.log(`\nSheet not found. Creating new sheet: ${sheetName}`);
    const sheetInfo = await createNewSheet(sheetName, folderId);
    spreadsheetId = sheetInfo.spreadsheetId;
    spreadsheetUrl = sheetInfo.spreadsheetUrl;
    console.log(`Created new sheet (ID: ${spreadsheetId})`);
  }
  
  console.log(`Sheet URL: ${spreadsheetUrl}`);
  
  const remainingSpecies = allSpecies.filter(s => {
    const speciesKey = `${s.genus} ${s.species}`.toLowerCase().trim();
    return !existingSpecies.has(speciesKey);
  });
  
  console.log(`\nRemaining species to process: ${remainingSpecies.length}`);
  
  if (remainingSpecies.length === 0) {
    console.log('\nAll species already processed!');
    return;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Starting processing...');
  console.log('='.repeat(80) + '\n');
  
  const { getPlantRecord, appendPlantRows } = await import('../src/output/plant-pipeline.js');
  
  let successCount = 0;
  const failures = [];
  
  for (let i = 0; i < remainingSpecies.length; i++) {
    const { genus, species } = remainingSpecies[i];
    const overallIndex = allSpecies.findIndex(s => s.genus === genus && s.species === species) + 1;
    
    const startTime = Date.now();
    console.log(`[${overallIndex}/${allSpecies.length}] Processing ${genus} ${species}...`);
    
    try {
      const record = await getPlantRecord(genus, species);
      const duration = Date.now() - startTime;
      const durationStr = formatDuration(duration);
      
      if (record) {
        record.processingDuration = durationStr;
        await appendPlantRowWithDuration(spreadsheetId, record);
        successCount++;
        console.log(`  ✓ Saved (Native: ${record.isNative}, Family: ${record.family}) [${durationStr}]`);
      } else {
        failures.push({ genus, species, reason: 'Not a current botanical name' });
        console.log(`  ✗ Skipped - Not a current botanical name [${durationStr}]`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const durationStr = formatDuration(duration);
      failures.push({ genus, species, reason: error.message });
      console.log(`  ✗ Failed - ${error.message} [${durationStr}]`);
    }
    
    console.log();
  }
  
  console.log('='.repeat(80));
  console.log('Batch Complete');
  console.log('='.repeat(80));
  console.log(`Processed this run: ${successCount + failures.length}`);
  console.log(`  ✓ Successful: ${successCount}`);
  console.log(`  ✗ Failed/Skipped: ${failures.length}`);
  console.log(`Total in sheet: ${existingSpecies.size + successCount}`);
  console.log();
  
  if (failures.length > 0) {
    console.log('Failed/Skipped species:');
    failures.forEach(f => console.log(`  - ${f.genus} ${f.species}: ${f.reason}`));
    console.log();
  }
  
  console.log(`Sheet URL: ${spreadsheetUrl}`);
}

const args = process.argv.slice(2);

let sheetName, speciesListFile;

if (args.length === 2) {
  [sheetName, speciesListFile] = args;
} else if (args.length === 0 && existsSync(batchConfigPath)) {
  const batchConfig = JSON.parse(readFileSync(batchConfigPath, 'utf-8'));
  sheetName = batchConfig.sheetName;
  speciesListFile = batchConfig.speciesListFile;
  console.log('Using batch-config.json settings');
} else {
  console.error('Usage: node production/run-batch.js [<sheet-name> <species-list-file>]');
  console.error('');
  console.error('If no arguments provided, reads from production/batch-config.json');
  console.error('');
  console.error('Example:');
  console.error('  node production/run-batch.js "Presentation_2026" production/species-list-presentation.txt');
  console.error('  node production/run-batch.js  # uses batch-config.json');
  console.error('');
  console.error('The script will:');
  console.error('  - Find or create a Google Sheet with the given name');
  console.error('  - Check which species are already in the sheet');
  console.error('  - Process only the remaining species');
  console.error('  - Append results incrementally (safe to interrupt and resume)');
  process.exit(1);
}

runBatch(sheetName, speciesListFile).then(() => {
  console.log('\n[STAY-ALIVE] Batch complete. Keeping process alive to prevent VM restart...');
  console.log('[STAY-ALIVE] Press Ctrl+C or stop the deployment to exit.\n');
  
  setInterval(() => {
    // Keep process alive - do nothing
  }, 60000);
}).catch(error => {
  console.error('[FATAL] Batch failed:', error.message);
  console.log('\n[STAY-ALIVE] Error occurred. Keeping process alive to prevent restart loop...');
  console.log('[STAY-ALIVE] Fix the issue and redeploy, or stop this deployment.\n');
  
  setInterval(() => {
    // Keep process alive even on error - do nothing
  }, 60000);
});
