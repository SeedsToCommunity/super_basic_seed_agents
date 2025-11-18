# Seed and Species Aggregator

A Node.js project for aggregating and processing seed and species data from multiple sources.

## Project Structure

```
project/
├── config/
│   ├── config.json          # Configuration file with Google Drive folder paths
│   └── column-specs/        # Column specification files
├── src/
│   ├── data-sources/        # Data source connectors
│   ├── synthesis/           # Data aggregation and synthesis modules
│   ├── validation/          # Data validation logic
│   └── output/              # Output formatters and exporters
├── tools/                   # Utility scripts
├── docs/                    # Documentation
└── README.md
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   ```

3. Test Claude API connection:
   ```bash
   node test_claude.js
   ```

## Authentication & Environment

**⚠️ Important: This project is currently configured to run only in Replit.**

### Google Drive Authentication

The project uses **Replit's Google Drive connector** for authentication and access to Google Drive and Google Sheets.

**How it works:**
- Authentication is handled automatically through Replit's connector system
- Access tokens are obtained via `REPLIT_CONNECTORS_HOSTNAME` and `REPL_IDENTITY`/`WEB_REPL_RENEWAL` environment variables
- OAuth flow is managed entirely by Replit

**Limitations:**
- ✅ Works seamlessly in Replit environment
- ❌ Will not work outside Replit without modifications
- To run locally or in other environments, you would need to:
  - Switch to Google Service Account authentication (recommended for automation)
  - OR implement OAuth 2.0 client credentials flow (better for personal use)
  - Update authentication code in `src/output/plant-pipeline.js`

### Claude API Authentication

The project uses the **Anthropic Claude API** for botanical validation and native status checking.

**How it works:**
- API key is stored in `ANTHROPIC_API_KEY` environment variable
- Managed through Replit Secrets for security
- Used by validators in `src/synthesis/` folder

**Portability:**
- ✅ Works in any environment with `ANTHROPIC_API_KEY` set
- ✅ Can run locally by setting the environment variable
- No Replit-specific dependencies for Claude API access

### SerpApi Authentication

The project uses **SerpApi** for discovering external reference URLs for botanical species.

**How it works:**
- API key is stored in `SERPAPI_API_KEY` environment variable
- Managed through Replit Secrets for security
- Used by URL discovery module in `src/synthesis/process-external-reference-urls.js`
- Free tier includes 100 searches/month (no credit card required)
- Results are cached locally to minimize API usage

**Getting your API key:**
1. Sign up at https://serpapi.com/users/sign_up
2. Get your key from https://serpapi.com/manage-api-key
3. Add it to Replit Secrets as `SERPAPI_API_KEY`

**Portability:**
- ✅ Works in any environment with `SERPAPI_API_KEY` set
- ✅ Can run locally by setting the environment variable
- No Replit-specific dependencies for SerpApi access

## Configuration

The system uses separate configuration files for different features:

### Main Configuration (`config/config.json`)

**Google Drive Settings:**
- `outputFolder`: Target folder for generated Google Sheets (default: "SpeciesAppDataFiles_DoNotTouch")
- `seedsToCommunity`: Name of Seeds To Community spreadsheet for read-only reference

**Output Settings:**
- `filePrefix`: Prefix for generated Google Sheets (default: "PlantData")

**Synthesis Settings:**
- `nativeCheckRegion`: Region for native status checking (default: "SE Michigan")
- `outputFormat`: Format for synthesized data (default: "json")
- `mergeStrategy`: How to merge data from multiple sources (default: "latest")

**Validation Settings:**
- `strictMode`: Enable strict validation (default: true)
- `requiredFields`: Required fields for data validation

### External Reference URLs Configuration (`config/external-reference-urls.json`)

**Purpose:** Separate config file for URL discovery synthesis module to maintain clean separation of concerns for future synthesis modules.

**Sites Array:**
List of reference websites to search for species information:
- Michigan Flora, Go Botany, Illinois Wildflowers
- Lady Bird Johnson Wildflower Center, Prairie Moon Nursery
- USDA PLANTS, Tropicos, Minnesota Wildflowers
- Google Images (constructed directly, not searched)

Each site can specify:
- `name`: Display name
- `baseUrl`: Base URL for site searches
- `useDirectUrl` (optional): If true, constructs URL directly instead of searching (e.g., Google Images)

**Retry Settings:**
- `startDelayMs`: Initial delay between searches (default: 100ms)
- `maxDelayMs`: Maximum delay for exponential backoff (default: 2000ms)
- Delay doubles on each retry until exceeding maxDelay, then gives up

**Why separate configs?** Each synthesis module (botanical validation, native checking, URL discovery, future modules) gets its own input configuration file. This prevents config bloat and makes it easy to add new synthesis topics without affecting existing ones.

## Features

### Botanical Name Validation

Validates plant names against current botanical nomenclature using Claude API:

```bash
node test-botanical-validator.js
```

The validator returns:
- **Status**: `current`, `updated`, `likely_misspelled`, or `invalid`
- **Normalized names**: Genus (capitalized), Species (lowercase)
- **Family classification**
- **Current name** (if status is `updated`)

**Validation Rule**: Only plants with `status: current` proceed to further processing.

### Michigan Native Status Checker

Determines if plants are native to Southeast Michigan:

```bash
node test-michigan-native.js
```

Returns:
- **isNative**: boolean indicating native status
- **Status**: confidence level of the assessment
- **Notes**: Additional context about the plant's nativity

### External Reference URL Discovery

Discovers URLs for botanical species across trusted reference websites:

```bash
node test-url-discovery.js
```

**Features:**
- Searches 8 reference sites via SerpApi (Michigan Flora, Go Botany, USDA PLANTS, etc.)
- Constructs Google Images URLs directly (no search required)
- Smart caching: Results saved to `cache/external-reference-urls.json`
- Cached lookups are instant and don't consume API credits
- Exponential backoff retry logic for rate limiting
- Returns JSON object: `{siteName: url}`

**Output Format:**
```json
{
  "Go Botany": "https://gobotany.nativeplanttrust.org/species/trillium/grandiflorum/",
  "USDA PLANTS": "https://plants.usda.gov/plant-profile/TRGR4",
  ...
}
```

**Cache Management:**
- First lookup performs web searches
- Subsequent lookups use cached data
- Cache persists across runs
- Edit `cache/external-reference-urls.json` to clear specific species

### Single Plant Processing

Process a single plant through the complete pipeline (validation → native check → Google Sheets):

```bash
node src/output/process-plant.js <genus> <species>
```

**Example:**
```bash
node src/output/process-plant.js Quercus alba
```

Creates a new timestamped Google Sheet with:
- Genus, Species, Family
- SE MI Native (Yes/No)
- Botanical Name Notes
- Native Check Notes
- External Reference URLs (JSON format)

### Batch Plant Processing

Process multiple plants and save to a single Google Sheet:

```bash
node src/output/batch-process-plants.js <genus1> <species1> <genus2> <species2> ...
```

**Example:**
```bash
node src/output/batch-process-plants.js Quercus alba Acer rubrum Carya ovata
```

**Batch behavior:**
- Validates all plants before writing to sheet
- Skips plants that are not current botanical names
- Reports success/failure counts
- Creates a single timestamped sheet with all valid plants

**Test batch processing:**
```bash
node test-batch-process.js
```

## Architecture

### Shared Pipeline (`src/output/plant-pipeline.js`)

All data gathering and Google Sheets operations are centralized in the pipeline module to avoid code duplication:

- **`getPlantRecord(genus, species)`**: Validates botanical name, checks native status, discovers URLs
- **`createPlantSheet(folderId, prefix)`**: Creates timestamped Google Sheet with headers
- **`appendPlantRows(spreadsheetId, plantRecords)`**: Writes plant data rows
- **`findFolderByName(folderName)`**: Finds Google Drive folders (with caching)
- **`PLANT_COLUMNS`**: Single source of truth for column definitions

**Core Validators/Synthesis Modules (in `src/synthesis/`):**
- `process-botanical-name.js`: Validates botanical names using Claude API
- `process-native-checker.js`: Checks native status for specified region (configurable)
- `process-external-reference-urls.js`: Discovers URLs across reference websites with caching

**Adding new data columns:**
1. Create new synthesis module in `src/synthesis/` with its own config file in `config/`
2. Update `PLANT_COLUMNS` with new column headers
3. Import and call the new module in `getPlantRecord()`
4. Update the row mapping in `appendPlantRows()`

Both single and batch processors automatically inherit new columns.

**Configuration Integration:**
- Main config (`config/config.json`): Google Drive folders, output settings, validation rules
- Synthesis configs (e.g., `config/external-reference-urls.json`): Each synthesis module has its own config
- Folder names and file prefixes read from config instead of hardcoding
- Cache directory (`cache/`): Stores discovered URLs to minimize API usage
