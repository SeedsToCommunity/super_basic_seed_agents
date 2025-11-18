import { google } from 'googleapis';

/**
 * Simple integration test for Google Drive connectivity
 * Tests that we can connect to Google Drive and access the output folder
 */
async function testGoogleDrive() {
  console.log('='.repeat(80));
  console.log('Google Drive Integration Test');
  console.log('='.repeat(80));
  console.log();
  
  // Get access token
  console.log('Step 1: Getting access token...');
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.log('⚠ Replit token not found - skipping test');
    console.log('  This test requires Replit environment variables');
    return;
  }

  let connectionSettings;
  try {
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
      console.log('⚠ Google Drive not connected - skipping test');
      console.log('  Connect Google Drive in the Replit environment to enable this test');
      return;
    }
    
    console.log('✓ Access token retrieved');
    console.log();
    
  } catch (error) {
    console.error('✗ Failed to get access token:', error.message);
    process.exit(1);
  }
  
  // Create Drive client
  console.log('Step 2: Creating Google Drive client...');
  
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  console.log('✓ Drive client created');
  console.log();
  
  // Find the output folder
  console.log('Step 3: Finding "SpeciesAppDataFiles_DoNotTouch" folder...');
  
  try {
    const response = await drive.files.list({
      q: `name='SpeciesAppDataFiles_DoNotTouch' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });
    
    if (response.data.files && response.data.files.length > 0) {
      const folder = response.data.files[0];
      console.log('✓ Folder found!');
      console.log(`  Name: ${folder.name}`);
      console.log(`  ID: ${folder.id}`);
      console.log();
      
      // List some files in the folder
      console.log('Step 4: Listing recent files in folder...');
      const filesResponse = await drive.files.list({
        q: `'${folder.id}' in parents and trashed=false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
        pageSize: 5
      });
      
      if (filesResponse.data.files && filesResponse.data.files.length > 0) {
        console.log(`✓ Found ${filesResponse.data.files.length} recent files:`);
        filesResponse.data.files.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (${new Date(file.createdTime).toLocaleString()})`);
        });
      } else {
        console.log('✓ Folder is empty (no files found)');
      }
      
      console.log();
      console.log('✓ Google Drive integration test passed');
      
    } else {
      console.log('✗ Folder "SpeciesAppDataFiles_DoNotTouch" not found');
      console.log('  Create this folder in your Google Drive to fully test the integration');
    }
    
  } catch (error) {
    console.error('✗ Failed to access Google Drive:', error.message);
    process.exit(1);
  }
}

testGoogleDrive();
