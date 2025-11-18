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

### Current Synthesis Modules
-   **`process-botanical-name.js`**: Validates botanical names using Claude API with **strict validation** (fails if name isn't exactly current accepted nomenclature). Acts as critical validation gate.
-   **`process-native-checker.js`**: Determines if plant is native to Southeast Michigan using Claude API, dependent on botanical name validation.
-   **`process-external-reference-urls.js`**: Discovers and caches URLs from botanical reference websites using SerpApi, based on validated botanical name.
-   **`process-common-names.js`**: Identifies all common/vernacular names used in Southeast Michigan and adjacent regions using Claude API. Excludes botanical synonyms and historical scientific names.

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

### CLI Tools
-   **`src/output/process-plant.js`**: Processes a single plant and outputs to an individual Google Sheet.
-   **`src/output/batch-process-plants.js`**: Processes multiple plants with **incremental save strategy** - creates Google Sheet first, then saves each plant immediately after processing. This preserves partial progress if processing fails, critical for expensive API operations. Skips invalid botanical names.

### Data Processing Philosophy
The system follows a "validation-first" approach, ensuring data quality before further processing. It supports configurable merge strategies and outputs synthesized data in JSON format. AI integration uses Anthropic Claude API for advanced data processing tasks like validation and native status checking.

### Configuration
Centralized system settings are managed in `config/config.json`, covering Google Drive settings, output preferences, synthesis parameters (e.g., native check region, merge strategy), and validation rules. Individual synthesis modules have their own configuration files (e.g., `config/external-reference-urls.json`). A `cache/` directory stores results like external reference URLs to minimize API usage.

## External Dependencies

### Third-Party Services
-   **Google Drive API**: For data source synchronization, sheet creation, and output.
-   **Anthropic Claude API**: Used for AI-powered botanical validation, native status checking, and other advanced data processing.
-   **SerpApi**: For external reference URL discovery.

### Key NPM Packages
-   `@anthropic-ai/sdk`: Integration with Anthropic Claude API.
-   `googleapis`: Google Drive and Sheets API integration.