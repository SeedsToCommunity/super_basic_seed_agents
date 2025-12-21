import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const PARENT_FOLDER_NAME = 'SpeciesAppDataFiles_DoNotTouch';

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

async function createFolder(drive, folderName, parentId) {
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : []
  };
  
  const response = await drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  });
  
  return response.data.id;
}

async function findFileByName(drive, fileName, folderId) {
  const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
  
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

export async function uploadJsonToDrive(content, fileName, subfolderName) {
  const drive = await getDriveClient();
  
  const parentFolderId = await findFolderByName(drive, PARENT_FOLDER_NAME);
  if (!parentFolderId) {
    throw new Error(`Parent folder '${PARENT_FOLDER_NAME}' not found in Google Drive`);
  }
  
  let subfolderId = await findFolderByName(drive, subfolderName, parentFolderId);
  if (!subfolderId) {
    console.log(`[drive-upload] Creating subfolder: ${subfolderName}`);
    subfolderId = await createFolder(drive, subfolderName, parentFolderId);
  }
  
  const jsonContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  
  const existingFileId = await findFileByName(drive, fileName, subfolderId);
  
  const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
  
  if (existingFileId) {
    await drive.files.update({
      fileId: existingFileId,
      media: {
        mimeType: 'application/json',
        body: jsonBuffer
      }
    });
    console.log(`[drive-upload] Updated: ${fileName}`);
    return { fileId: existingFileId, action: 'updated' };
  } else {
    const fileMetadata = {
      name: fileName,
      parents: [subfolderId]
    };
    
    const response = await drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: 'application/json',
        body: jsonBuffer
      },
      fields: 'id'
    });
    console.log(`[drive-upload] Created: ${fileName}`);
    return { fileId: response.data.id, action: 'created' };
  }
}

export async function uploadLocalFileToDrive(localPath, subfolderName, mimeType = 'application/json') {
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found: ${localPath}`);
  }
  
  const fileName = path.basename(localPath);
  const content = fs.readFileSync(localPath, 'utf-8');
  
  return uploadJsonToDrive(content, fileName, subfolderName);
}
