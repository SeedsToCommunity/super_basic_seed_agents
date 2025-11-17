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

## Configuration

Edit `config/config.json` to set:
- Google Drive folder IDs for data sources
- Synthesis output format and merge strategy
- Validation rules and required fields

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

- **`getPlantRecord(genus, species)`**: Validates botanical name and checks native status
- **`createPlantSheet(folderId, prefix)`**: Creates timestamped Google Sheet with headers
- **`appendPlantRows(spreadsheetId, plantRecords)`**: Writes plant data rows
- **`findFolderByName(folderName)`**: Finds Google Drive folders (with caching)
- **`PLANT_COLUMNS`**: Single source of truth for column definitions

**Adding new data columns:**
1. Update `PLANT_COLUMNS` with new column headers
2. Modify `getPlantRecord()` to gather new data
3. Update the row mapping in `appendPlantRows()`

Both single and batch processors automatically inherit new columns.
