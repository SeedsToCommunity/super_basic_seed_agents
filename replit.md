# Seed and Species Aggregator

## Overview
The Seed and Species Aggregator is a Node.js backend project designed for processing and validating botanical data. It leverages the Claude API for botanical validation and native status checking, and integrates with Google Sheets for structured data output. The project consists of backend CLI scripts focused on data processing workflows, with a primary goal of creating a scalable system for botanical data synthesis and validation. It aims to support a wide range of botanical data tasks, including name validation, native status determination, and external reference URL discovery, ultimately outputting comprehensive plant records.

## User Preferences
- Preferred communication style: Simple, everyday language
- Demands detailed, explicit task breakdowns before approval - values precision and transparency
- Prefers simple, focused scripts over over-engineered solutions

## System Architecture

### Plug-and-Play Module Registry (Version 2.0)
The project uses a **fully dynamic, plug-and-play module registry architecture** that enables adding new synthesis modules with ZERO pipeline code changes. Simply create a module file and add one registry entry - the system handles everything else automatically.

**Key Features:**
- **Type-safe column contract**: Modules declare columns with stable IDs (`{id, header}` format)
- **Runtime validation**: Automatic validation ensures module outputs match declared columns
- **Generic row construction**: Pipeline uses metadata-driven helpers to flatten any module's output
- **Dependency resolution**: Automatic topological sorting ensures modules run in correct order
- **No hardcoded logic**: Pipeline code has zero module-specific branches

### Module Interface Contract
All synthesis modules must export:

1. **`metadata` object**:
```javascript
{
  id: 'module-identifier',        // Unique ID (kebab-case)
  name: 'Display Name',
  columns: [                       // Column descriptors with stable IDs
    { id: 'columnId', header: 'Display Header' }
  ],
  dependencies: ['other-module'],  // Module IDs this depends on
  description: 'What this module does'
}
```

2. **`run(genus, species, priorResults)` function** that returns:
```javascript
{
  columnValues: {                 // Keys MUST match column IDs from metadata
    columnId: value
  },
  // Optional: internal fields for pipeline logic (status, genus, species, etc.)
}
```

**Runtime Validation:** The pipeline validates that all declared column IDs have values and no extra keys exist, preventing silent data corruption.

### Current Synthesis Modules (11 Total)
-   **`process-botanical-name.js`**: Validates botanical names using Claude API with **strict validation** (fails if name isn't exactly current accepted nomenclature). Acts as critical validation gate.
-   **`process-native-checker.js`**: Determines if plant is native to Southeast Michigan using Claude API, dependent on botanical name validation.
-   **`process-external-reference-urls.js`**: Discovers and caches URLs from botanical reference websites using SerpApi, based on validated botanical name.
-   **`process-common-names.js`**: Identifies all common/vernacular names used in Southeast Michigan and adjacent regions using Claude API. Excludes botanical synonyms and historical scientific names.
-   **`process-previous-botanical.js`**: Retrieves botanical synonyms (legacy binomial names) from GBIF Backbone Taxonomy for cross-reference purposes. Returns comma-separated species-level synonyms only, excluding varieties and subspecies. Uses file-based caching in `cache/GBIF/` with pretty-printed JSON files. No authentication required.
-   **`process-michigan-flora.js`**: Retrieves ecological metrics from the Michigan Flora local CSV dataset (~2,873 species). Outputs 4 columns: Coefficient of Conservatism (C), Coefficient of Wetness (CW), Physiognomy, and Duration. No network requests - reads from `cache/MichiganFlora/`. Depends on botanical-name.
-   **`process-inaturalist.js`**: Enriches plant data from iNaturalist API. **Appends Wikipedia URL** to existing External Reference URLs column. Adds 2 new columns: SE Michigan Monthly Observations (JSON histogram like `{"January": 5, "February": 16, ...}`) and Wikipedia Summary. Uses file-based caching in `cache/iNaturalist/`. Depends on botanical-name AND external-reference-urls.
-   **`process-bonap.js`**: Discovers BONAP (Biota of North America Program) county-level range map image URLs. Uses predictable URL pattern with HEAD request verification, falls back to SerpApi search if needed. Outputs 1 column: BONAP Range Map (direct URL to PNG image). Uses file-based caching in `cache/BONAP/`. Depends on botanical-name.
-   **`process-lakecounty-cache.js`**: Infrastructure module that syncs Google Drive parsed PDF files to `cache/DriveParsedPdfs/`. No output column - provides cached data for downstream modules. Depends on botanical-name.
-   **`process-lakecounty-images.js`**: Extracts image filenames from Lake County parsed PDF JSON files. Reads `species.images` array only (excludes seedGroups images). Outputs 1 column: Lake County Images (comma-separated list of image filenames). Depends on lakecounty-cache.
-   **`process-similar-species.js`**: Extracts similar species and distinguishing features using a tiered data approach. Aggregates data from Google Drive parsed PDFs and PageContent cache, sends to Claude API with structured prompt. Output is a single JSON column with Tier 1 (source-backed) and Tier 2 (LLM-inferred) data, plus known unknowns. Uses reusable data collection utilities (`species-data-collector.js`) and external prompt templates (`prompts/similar-species.md`). Depends on botanical-name and lakecounty-cache.

### Processing Pipeline (`src/output/plant-pipeline.js`)
The pipeline dynamically loads, validates, and executes enabled modules using a dependency graph. It provides:

**Core Functions:**
-   `loadSynthesisModules()`: Loads modules from registry and sorts by dependencies
-   `validateColumnValues(module, columnValues)`: Ensures module output matches metadata
-   `flattenColumnValues(module, columnValues)`: Converts Record to ordered array for Sheets
-   `buildColumnDefinitions(modules)`: Generates dynamic headers from module metadata
-   `getPlantRecord(genus, species)`: Executes all modules to gather complete plant record
-   `createPlantSheet(folderId, prefix)`: Creates timestamped Google Sheets with dynamic headers
-   `appendPlantRows(spreadsheetId, plantRecords)`: Writes plant data using generic flattening

**Error Handling:**
- Stops processing if botanical-name validation fails (status !== 'current')
- Logs non-critical module failures and continues with empty results
- Provides detailed validation errors if columnValues contract is violated

### Adding a New Module (2-Step Process)
1. **Create module file** in `src/synthesis/` following the interface contract
2. **Add registry entry** to `config/synthesis-registry.json`:
```json
{
  "id": "your-module-id",
  "path": "../synthesis/your-module.js",
  "enabled": true,
  "description": "What it does"
}
```

**That's it!** No pipeline code changes needed. The module will automatically:
- Load at startup
- Execute in dependency order
- Validate its output
- Generate its columns in the Google Sheet

See `docs/synthesis-module-interface.md` for complete interface specification and examples.

## Documentation

### Technical Reference Documentation
Comprehensive documentation is maintained in the `docs/` directory and kept synchronized with code changes:

-   **`docs/api-data-sources.md`**: Complete reference for all external APIs and data sources (Google Drive/Sheets, Anthropic Claude, SerpApi, GBIF, iNaturalist). Includes authentication methods, endpoints used, rate limits, caching strategies, and portability considerations.
-   **`docs/synthesis-processes.md`**: Detailed processing guide for each synthesis module. Describes data sources, output columns, high-level processing logic, and error handling for all 8 modules.
-   **`docs/synthesis-module-interface.md`**: Interface specification for creating new synthesis modules.

**Documentation Philosophy**: These are living documents that are proactively updated whenever code changes are made to ensure they reflect the current system state.

### CLI Tools
-   **`src/output/process-plant.js`**: Processes a single plant and outputs to an individual Google Sheet.
-   **`src/output/batch-process-plants.js`**: Processes multiple plants with **incremental save strategy** - creates Google Sheet first, then saves each plant immediately after processing. This preserves partial progress if processing fails, critical for expensive API operations. Skips invalid botanical names.

### Data Processing Philosophy
The system follows a "validation-first" approach, ensuring data quality before further processing. It supports configurable merge strategies and outputs synthesized data in JSON format. AI integration uses Anthropic Claude API for advanced data processing tasks like validation and native status checking.

### Configuration
Centralized system settings are managed in `config/config.json`, covering Google Drive settings, output preferences, synthesis parameters (e.g., native check region, merge strategy), and validation rules. Individual synthesis modules have their own configuration files (e.g., `config/external-reference-urls.json`). 

**Caching System**: The `cache/` directory stores API results to minimize expensive operations:
- `cache/ExternalReferences/`: Folder with individual JSON files per species (`Genus_species_refURLs.json`) containing discovered website URLs from SerpApi. URLs are validated before caching.
- `cache/SerpApi/`: Query-based cache storing SerpApi search results (MD5 hash filenames). Caches ALL search results including empty results to avoid repeated API calls.
- `cache/RawHTML/`: URL-based cache storing raw HTML of every fetched page (MD5 hash filenames). Caches ALL pages regardless of validation result to avoid re-fetching.
- `cache/PageContent/`: Folder with parsed page content per species per source (`Genus_species_source.json`). Contains extracted text content from reference websites using Mozilla's Readability library. Used as data source for future synthesis modules.
- `cache/GBIF/`: Folder with individual pretty-printed JSON files per species (`Genus_species_gbif.json`) containing synonym data
- `cache/MichiganFlora/`: Static 2024 dataset cached locally in CSV format (~2,873 species with ecological data)
- `cache/iNaturalist/`: Folder with individual JSON files per species and endpoint type (`Genus_species_inaturalist_taxa.json`, `Genus_species_inaturalist_histogram.json`)
- `cache/BONAP/`: Folder with individual JSON files per species (`Genus_species_bonap.json`) containing range map URLs with source tracking (direct vs serpapi)
- `cache/DriveParsedPdfs/`: Synced from Google Drive `SpeciesAppDataFiles_DoNotTouch/Parsed PDF Data/`. Contains structured JSON files extracted from seed collection PDFs. Includes `index.json` for freshness tracking. Auto-syncs with modifiedTime comparison.

## External Dependencies

### Third-Party Services
-   **Google Drive API**: For data source synchronization, sheet creation, and output.
-   **Anthropic Claude API**: Used for AI-powered botanical validation, native status checking, and other advanced data processing.
-   **SerpApi**: For external reference URL discovery.
-   **GBIF Species API**: For retrieving botanical synonyms and taxonomic information. No authentication required.
-   **Michigan Flora CSV**: Local dataset (~2,873 species) with ecological data including Coefficient of Conservatism (C), Wetness Indicator (W), native status, and common names. No network required.
-   **iNaturalist API**: For Wikipedia excerpts, taxonomic data, and phenology (observation histograms by month) for SE Michigan. No authentication required.

### Key NPM Packages
-   `@anthropic-ai/sdk`: Integration with Anthropic Claude API.
-   `googleapis`: Google Drive and Sheets API integration.
-   `serpapi`: SerpApi client for Google Search integration.
-   `@mozilla/readability`: Mozilla's Readability library for extracting main content from web pages (same algorithm as Firefox Reader View).
-   `jsdom`: DOM implementation for Node.js, used for HTML parsing and Readability integration.