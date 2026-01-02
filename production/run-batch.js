import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, '../config/config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

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

async function getExistingSpecies(spreadsheetId) {
  const sheets = await getSheetsClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Plant Data!A:B'
    });
    
    const rows = response.data.values || [];
    const species = new Set();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] && rows[i][1]) {
        species.add(`${rows[i][0]} ${rows[i][1]}`);
      }
    }
    
    return species;
  } catch (error) {
    return new Set();
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
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Plant Data!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [PLANT_COLUMNS.HEADERS] }
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
  
  const remainingSpecies = allSpecies.filter(s => !existingSpecies.has(`${s.genus} ${s.species}`));
  
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
    
    console.log(`[${overallIndex}/${allSpecies.length}] Processing ${genus} ${species}...`);
    
    try {
      const record = await getPlantRecord(genus, species);
      
      if (record) {
        await appendPlantRows(spreadsheetId, [record]);
        successCount++;
        console.log(`  ✓ Saved (Native: ${record.isNative}, Family: ${record.family})`);
      } else {
        failures.push({ genus, species, reason: 'Not a current botanical name' });
        console.log(`  ✗ Skipped - Not a current botanical name`);
      }
    } catch (error) {
      failures.push({ genus, species, reason: error.message });
      console.log(`  ✗ Failed - ${error.message}`);
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

if (args.length !== 2) {
  console.error('Usage: node production/run-batch.js <sheet-name> <species-list-file>');
  console.error('');
  console.error('Example:');
  console.error('  node production/run-batch.js "Presentation_2026" production/species-list-presentation.txt');
  console.error('');
  console.error('The script will:');
  console.error('  - Find or create a Google Sheet with the given name');
  console.error('  - Check which species are already in the sheet');
  console.error('  - Process only the remaining species');
  console.error('  - Append results incrementally (safe to interrupt and resume)');
  process.exit(1);
}

const [sheetName, speciesListFile] = args;
runBatch(sheetName, speciesListFile);
