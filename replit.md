# Seed and Species Aggregator

## Overview

The Seed and Species Aggregator is a Node.js backend project for processing and validating botanical data. The system uses Claude API for botanical validation and native status checking, with Google Sheets integration for structured data output. This is a collection of backend CLI scripts designed for data processing workflows.

**Current Status:** Botanical name validation and Michigan native status checking are fully implemented with both single-plant and batch processing capabilities.

## User Preferences

- Preferred communication style: Simple, everyday language
- Demands detailed, explicit task breakdowns before approval - values precision and transparency
- Prefers simple, focused scripts over over-engineered solutions

## System Architecture

### CLI Scripts Architecture

**Core Validators (in `src/synthesis/`):**
- `process-botanical-name.js`: Validates botanical names using Claude API
  - Returns status: current/updated/likely_misspelled/invalid
  - Normalizes genus (capitalized) and species (lowercase)
  - Provides family classification
- `process-native-checker.js`: Determines native status for configured region
  - Returns boolean isNative flag
  - Provides confidence status and contextual notes
  - Region configurable via `config.json` (default: SE Michigan)

**Processing Pipeline:**
- `src/output/plant-pipeline.js`: Shared pipeline functions (single source of truth)
  - `getPlantRecord()`: Orchestrates validation and native checking
  - `createPlantSheet()`: Creates timestamped Google Sheets with headers (uses config for file prefix)
  - `appendPlantRows()`: Writes plant data rows
  - `findFolderByName()`: Google Drive folder discovery with caching
  - `getOutputFolderName()`: Returns output folder name from config
  - `PLANT_COLUMNS`: Centralized column definitions
  - Reads configuration from `config/config.json` for folder names and file prefixes

**CLI Tools:**
- `src/output/process-plant.js`: Single plant processor
  - Validates one plant and creates individual Google Sheet
- `src/output/batch-process-plants.js`: Batch processor
  - Processes multiple plants into single Google Sheet
  - Reports success/failure counts
  - Skips non-current botanical names

**Test Scripts:**
- `test-botanical-validator.js`: Tests botanical validation
- `test-michigan-native.js`: Tests native status checking
- `test-batch-process.js`: Tests batch processing with 4 spring ephemerals

### Data Processing Pipeline

**Data Sources:**
- Google Drive folder integration for multiple botanical data sources
- Configurable folder IDs stored in `config/config.json`
- Manual PDF extraction approach (automation deferred)

**Synthesis & Validation:**
- Validation-first quality gate philosophy before data processing
- Strict mode validation with required field enforcement
- Configurable merge strategies (currently set to "latest")
- JSON output format for synthesized data

**AI Integration:**
- Anthropic Claude API (Claude Sonnet 4.5) for advanced data processing
- API key managed via environment variables
- Test harness provided for API connectivity verification

## Key Workflows & Usage

### Botanical Name Validation Test
```bash
node test-botanical-validator.js
```
Tests validation logic with sample plants (Quercus alba, Acer rubrum, etc.)

### Michigan Native Status Test
```bash
node test-michigan-native.js
```
Tests native status checking with sample SE Michigan plants

### Single Plant Processing
```bash
node src/output/process-plant.js <genus> <species>
```
**Example:**
```bash
node src/output/process-plant.js Quercus alba
```
**Output:** Creates timestamped Google Sheet in "SpeciesAppDataFiles_DoNotTouch" folder with:
- Genus, Species, Family
- SE MI Native (Yes/No)
- Botanical Name Notes
- Native Check Notes

### Batch Plant Processing
```bash
node src/output/batch-process-plants.js <genus1> <species1> <genus2> <species2> ...
```
**Example:**
```bash
node src/output/batch-process-plants.js Quercus alba Acer rubrum Carya ovata
```
**Behavior:**
- Validates all plants before writing
- Skips plants that are not current botanical names
- Creates single timestamped sheet with all valid plants
- Reports success/failure counts

**Test batch processing:**
```bash
node test-batch-process.js
```
Processes 4 SE Michigan spring ephemerals (Trillium grandiflorum, Sanguinaria canadensis, Claytonia virginica, Erythronium americanum)

## Configuration & Environment

### Required Environment Variables
- `ANTHROPIC_API_KEY`: Claude API key for botanical validation and native status checking
- `REPL_IDENTITY` or `WEB_REPL_RENEWAL`: Replit authentication tokens (auto-configured in Replit environment)
- `REPLIT_CONNECTORS_HOSTNAME`: Replit connectors API hostname (auto-configured)

### Google Drive Setup
- Connected via Replit Google Drive connector
- Target folder: "SpeciesAppDataFiles_DoNotTouch"
- Folder ID cached after first lookup to reduce API calls

### Configuration File (`config/config.json`)
Centralized configuration for all system settings:
- **Google Drive**: Output folder name, Seeds To Community spreadsheet reference, data source folder IDs
- **Output**: File prefix for generated Google Sheets
- **Synthesis**: Native check region (default: SE Michigan), output format, merge strategy
- **Validation**: Strict mode, required fields

Configuration is loaded by `plant-pipeline.js` at startup and used throughout the processing pipeline.

## File Reference

| File | Purpose |
|------|---------|
| `src/synthesis/process-botanical-name.js` | Validates botanical names using Claude API |
| `src/synthesis/process-native-checker.js` | Checks native status using Claude API (region configurable) |
| `src/output/plant-pipeline.js` | Shared pipeline functions for data gathering and Google Sheets operations |
| `src/output/process-plant.js` | CLI tool for single plant processing |
| `src/output/batch-process-plants.js` | CLI tool for batch plant processing |
| `test-botanical-validator.js` | Test harness for botanical validation |
| `test-michigan-native.js` | Test harness for native status checking |
| `test-batch-process.js` | Test harness for batch processing with 4 sample plants |
| `config/config.json` | Centralized configuration for all system settings |

## External Dependencies

**Third-Party Services:**
- Google Drive API (for data source synchronization and sheet creation)
- Anthropic Claude API (for AI-powered botanical validation and native status checking)
- Neon Database (PostgreSQL serverless, configured but not yet actively used)

**Key NPM Packages:**
- `@anthropic-ai/sdk`: Claude API integration
- `@octokit/rest`: GitHub API integration (for future features)
- `googleapis`: Google Drive and Sheets API integration
- `@types/node`: TypeScript type definitions for Node.js

**Development Tools:**
- Replit-specific plugins for development environment
- TypeScript compiler with strict mode enabled
- ESBuild for production builds
- PostCSS with Tailwind CSS and Autoprefixer

**Repository & Project Management:**
- GitHub repository: `ScaleNature/super_basic_seed_agents`
- Google Drive for data storage
- GitHub Projects for task management

## Maintenance Notes / Future Enhancements

### Current Architecture Benefits
- **No code duplication**: Single source of truth in `plant-pipeline.js`
- **Easy column additions**: Update `PLANT_COLUMNS` and `getPlantRecord()` to add new data fields
- **Scalable**: Batch processor handles multiple plants efficiently
- **Cached lookups**: Folder discovery cached to reduce Google Drive API calls
- **Unique sheet names**: Timestamps guarantee no naming collisions

### Future Enhancement Opportunities
1. **Additional validation columns**: Habitat, bloom time, growth habit via Claude API
2. **Database integration**: Move from Google Sheets to PostgreSQL for faster queries
3. **CSV/JSON import**: Accept plant lists from files instead of command-line args
4. **Error recovery**: Retry logic for failed Claude API calls
5. **Regional native checkers**: Expand beyond SE Michigan to other regions
6. **Automated PDF extraction**: Extract plant data from PDFs using Claude vision API
