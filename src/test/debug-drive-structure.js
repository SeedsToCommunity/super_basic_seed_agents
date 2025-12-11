import { google } from 'googleapis';

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

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings?.settings?.access_token;
}

async function listRecursive(drive, folderId, depth = 0, maxDepth = 5) {
  const indent = '  '.repeat(depth);
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size)',
    pageSize: 20
  });
  
  for (const f of (res.data.files || [])) {
    const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
    const size = f.size ? ` (${f.size} bytes)` : '';
    console.log(`${indent}- ${f.name} [${f.mimeType}]${size}`);
    
    if (isFolder && depth < maxDepth) {
      await listRecursive(drive, f.id, depth + 1, maxDepth);
    }
  }
}

async function debug() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  // Find parent folder
  let res = await drive.files.list({
    q: "name='SpeciesAppDataFiles_DoNotTouch' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name, mimeType)'
  });
  const parent = res.data.files[0];
  console.log('Parent folder:', parent.name);
  
  // Find subfolder
  res = await drive.files.list({
    q: `'${parent.id}' in parents and name='Parsed PDF Data' and trashed=false`,
    fields: 'files(id, name, mimeType)'
  });
  const sub = res.data.files[0];
  console.log('Parsed PDF Data folder:', sub.name);
  
  console.log('\nRecursive folder structure (max depth 5):');
  await listRecursive(drive, sub.id, 0, 5);
}

debug().catch(console.error);
