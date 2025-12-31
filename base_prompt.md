# Google Drive Data Saving - Technical Documentation

## Authentication

The system uses **Replit's Google Drive connector** for authentication rather than raw OAuth credentials.

### Token Retrieval
- Access tokens are fetched from `REPLIT_CONNECTORS_HOSTNAME` API endpoint
- Tokens are cached in memory and refreshed when expired
- Authentication uses `REPL_IDENTITY` or `WEB_REPL_RENEWAL` environment variables

```javascript
const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
const xReplitToken = process.env.REPL_IDENTITY 
  ? 'repl ' + process.env.REPL_IDENTITY 
  : 'depl ' + process.env.WEB_REPL_RENEWAL;

connectionSettings = await fetch(
  'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
  { headers: { 'X_REPLIT_TOKEN': xReplitToken } }
).then(res => res.json());
```

---

## Save Mechanisms

### 1. Google Sheets (Plant Records)

**File:** `src/output/plant-pipeline.js`

**Library:** `googleapis` (Google Sheets v4 API)

#### Spreadsheet Creation
```javascript
const createResponse = await sheets.spreadsheets.create({
  requestBody: {
    properties: { title: sheetName },
    sheets: [
      { properties: { title: 'Plant Data', index: 0 } },
      { properties: { title: 'Column Sources', index: 1 } }
    ]
  }
});
```

#### Structure
- **Tab 1: "Plant Data"** - Contains synthesized plant records
- **Tab 2: "Column Sources"** - Auto-generated documentation explaining data provenance

#### Folder Placement
Files are moved from root to target folder:
```javascript
await drive.files.update({
  fileId: spreadsheetId,
  addParents: folderId,
  removeParents: previousParents
});
```

#### Data Writing
```javascript
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: 'Plant Data!A1',
  valueInputOption: 'RAW',
  requestBody: { values: [PLANT_COLUMNS.HEADERS] }
});
```

#### Naming Convention
Sheets include datetime stamp for uniqueness:
```
PlantData_2025-12-27_13-15-00
```

---

### 2. JSON Files (Cached Data)

**File:** `src/utils/drive-upload.js`

**Library:** `googleapis` (Google Drive v3 API)

#### Upload Process
1. Find or create subfolder
2. Check if file exists by name
3. Create new file or update existing

#### File Creation
```javascript
const jsonBuffer = Buffer.from(jsonContent, 'utf-8');

const response = await drive.files.create({
  resource: { name: fileName, parents: [subfolderId] },
  media: { mimeType: 'application/json', body: jsonBuffer },
  fields: 'id'
});
```

#### File Update
```javascript
await drive.files.update({
  fileId: existingFileId,
  media: { mimeType: 'application/json', body: jsonBuffer }
});
```

#### Important Note
Uses `Buffer.from()` instead of `Readable.from()` to avoid HTTP 411 (Length Required) errors.

---

## Target Folder Structure

All data is stored under:
```
SpeciesAppDataFiles_DoNotTouch/
├── Parsed PDF Data/         # Synced JSON files from PDF parsing
├── Michigan Flora Cache/    # Cached API responses
└── [Spreadsheets]           # Generated plant data sheets
```

---

## Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `getAccessToken()` | drive-upload.js | Retrieve OAuth token via Replit connector |
| `getDriveClient()` | drive-upload.js | Create authenticated Drive client |
| `uploadJsonToDrive()` | drive-upload.js | Upload/update JSON files |
| `createPlantSheet()` | plant-pipeline.js | Create new spreadsheet with 2 tabs |
| `appendToPlantSheet()` | plant-pipeline.js | Add plant records to existing sheet |
| `findFolderByName()` | plant-pipeline.js | Locate folders with caching |
