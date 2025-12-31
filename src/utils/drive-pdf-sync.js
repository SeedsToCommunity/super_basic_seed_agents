import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = 'cache/DriveParsedPdfs';
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const PARENT_FOLDER_NAME = 'SpeciesAppDataFiles_DoNotTouch';
const SUBFOLDER_NAME = 'Parsed PDF Data';

let connectionSettings = null;

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

async function getDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function findFolderByName(drive, folderName, parentId = null) {
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }
  return null;
}

async function listFilesInFolder(drive, folderId) {
  const files = [];
  let pageToken = null;
  
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, modifiedTime, size, mimeType)',
      spaces: 'drive',
      pageSize: 100,
      pageToken: pageToken
    });
    
    files.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  
  return files;
}

const GOOGLE_DOC_MIME_TYPES = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain'
};

async function downloadFile(drive, fileId, destPath, mimeType) {
  const isGoogleDoc = mimeType && mimeType.startsWith('application/vnd.google-apps.');
  
  if (isGoogleDoc) {
    const exportMime = GOOGLE_DOC_MIME_TYPES[mimeType] || 'text/plain';
    const response = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: 'stream' }
    );
    
    return new Promise((resolve, reject) => {
      const dest = fs.createWriteStream(destPath);
      response.data
        .on('error', reject)
        .pipe(dest)
        .on('finish', resolve)
        .on('error', reject);
    });
  } else {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    
    return new Promise((resolve, reject) => {
      const dest = fs.createWriteStream(destPath);
      response.data
        .on('error', reject)
        .pipe(dest)
        .on('finish', resolve)
        .on('error', reject);
    });
  }
}

function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    } catch (e) {
      console.warn('Failed to read index file, starting fresh');
    }
  }
  return { files: {}, lastSync: null };
}

function saveIndex(index) {
  index.lastSync = new Date().toISOString();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

export async function refreshParsedPdfCache(options = {}) {
  const { force = false, verbose = true } = options;
  
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  const log = verbose ? console.log : () => {};
  
  log('\n📂 Syncing parsed PDF files from Google Drive...');
  
  const drive = await getDriveClient();
  
  const parentFolderId = await findFolderByName(drive, PARENT_FOLDER_NAME);
  if (!parentFolderId) {
    throw new Error(`Parent folder '${PARENT_FOLDER_NAME}' not found in Google Drive`);
  }
  
  const subfolderId = await findFolderByName(drive, SUBFOLDER_NAME, parentFolderId);
  if (!subfolderId) {
    throw new Error(`Subfolder '${SUBFOLDER_NAME}' not found in '${PARENT_FOLDER_NAME}'`);
  }
  
  log(`   Found folder: ${PARENT_FOLDER_NAME}/${SUBFOLDER_NAME}`);
  
  async function collectFilesRecursive(folderId, depth = 0) {
    const items = await listFilesInFolder(drive, folderId);
    let files = [];
    
    for (const item of items) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        if (depth < 5) {
          const subFiles = await collectFilesRecursive(item.id, depth + 1);
          files = files.concat(subFiles);
        }
      } else {
        files.push(item);
      }
    }
    
    return files;
  }
  
  log(`   Scanning folder recursively...`);
  const allDriveFiles = await collectFilesRecursive(subfolderId);
  
  // Filter to JSON files only - we don't need image files
  const driveFiles = allDriveFiles.filter(f => f.name.endsWith('.json'));
  
  log(`   Found ${driveFiles.length} JSON files (${allDriveFiles.length - driveFiles.length} images skipped)`);
  
  const index = loadIndex();
  let downloaded = 0;
  let skipped = 0;
  let deleted = 0;
  
  const driveFileNames = new Set(driveFiles.map(f => f.name));
  for (const cachedName of Object.keys(index.files)) {
    if (!driveFileNames.has(cachedName)) {
      const cachedPath = path.join(CACHE_DIR, cachedName);
      if (fs.existsSync(cachedPath)) {
        fs.unlinkSync(cachedPath);
        log(`   🗑️  Deleted removed file: ${cachedName}`);
      }
      delete index.files[cachedName];
      deleted++;
    }
  }
  
  for (const file of driveFiles) {
    const cachedEntry = index.files[file.name];
    const localPath = path.join(CACHE_DIR, file.name);
    
    const needsDownload = force || 
      !cachedEntry || 
      cachedEntry.modifiedTime !== file.modifiedTime ||
      !fs.existsSync(localPath);
    
    if (needsDownload) {
      log(`   ⬇️  Downloading: ${file.name}`);
      try {
        await downloadFile(drive, file.id, localPath, file.mimeType);
        index.files[file.name] = {
          id: file.id,
          modifiedTime: file.modifiedTime,
          size: file.size,
          mimeType: file.mimeType,
          downloadedAt: new Date().toISOString()
        };
        downloaded++;
      } catch (err) {
        console.error(`   ❌ Failed to download ${file.name}: ${err.message}`);
      }
    } else {
      skipped++;
    }
  }
  
  saveIndex(index);
  
  log(`\n   ✅ Sync complete: ${downloaded} downloaded, ${skipped} up-to-date, ${deleted} removed`);
  
  return {
    downloaded,
    skipped,
    deleted,
    total: driveFiles.length
  };
}

export function listCachedParsedPdfs() {
  if (!fs.existsSync(CACHE_DIR)) {
    return [];
  }
  // Scan actual filesystem (not just index) to pick up all JSON files including manually added ones
  return fs.readdirSync(CACHE_DIR)
    .filter(name => name.endsWith('.json') && name !== 'index.json');
}

export function getSpeciesParsedPdfPaths(genus, species) {
  const pattern = `${genus}_${species}_`.toLowerCase();
  const allFiles = listCachedParsedPdfs();
  return allFiles
    .filter(name => name.toLowerCase().startsWith(pattern))
    .map(name => path.join(CACHE_DIR, name));
}

export function readSpeciesParsedPdfs(genus, species) {
  const paths = getSpeciesParsedPdfPaths(genus, species);
  const results = [];
  
  for (const filePath of paths) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      results.push({
        filePath,
        fileName: path.basename(filePath),
        content
      });
    } catch (err) {
      console.warn(`Failed to read ${filePath}: ${err.message}`);
    }
  }
  
  return results;
}

export function getCacheStats() {
  const index = loadIndex();
  return {
    fileCount: Object.keys(index.files).length,
    lastSync: index.lastSync,
    files: Object.keys(index.files)
  };
}
