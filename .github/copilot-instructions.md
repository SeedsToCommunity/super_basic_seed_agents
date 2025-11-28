# Copilot Instructions

This repository contains the **Seed and Species Aggregator**, a Node.js project for aggregating and processing seed and species botanical data from multiple sources.

## Project Overview

- **Language**: JavaScript (ES modules with `"type": "module"` in package.json)
- **Runtime**: Node.js
- **Primary Environment**: Replit (Google Drive authentication requires Replit connectors)
- **APIs Used**: Anthropic Claude API, SerpApi, Google Drive/Sheets API

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Required environment variables:
   - `ANTHROPIC_API_KEY` - For Claude API (botanical validation, native status checking)
   - `SERPAPI_API_KEY` - For external reference URL discovery
   - Replit-specific: `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, `WEB_REPL_RENEWAL` for Google Drive access

## Project Structure

```
├── .github/                   # GitHub configuration (issues, PR templates, Copilot instructions)
├── config/                    # Configuration files
│   ├── config.json            # Main config (Google Drive, output settings)
│   ├── synthesis-registry.json # Registered synthesis modules
│   └── external-reference-urls.json # URL discovery config
├── src/
│   ├── output/                # Output processors (Google Sheets integration)
│   ├── synthesis/             # Data synthesis modules (plug-and-play architecture)
│   └── utils/                 # Utility functions
├── test/
│   ├── synthesis/             # Synthesis module tests
│   └── external/              # External integration tests
├── cache/                     # Local cache files (GBIF, URLs, etc.) - committed to repo
├── docs/                      # Technical documentation
│   └── synthesis-module-interface.md # Module interface specification
└── scripts/                   # Migration and utility scripts
```

## Coding Standards

### ES Modules
- Use `import`/`export` syntax (not `require`)
- File extensions in imports: `import { func } from './module.js'`
- Use `export const` for named exports

### Synthesis Module Pattern
All synthesis modules in `src/synthesis/` must follow the interface in `docs/synthesis-module-interface.md`:

```javascript
export const metadata = {
  id: 'module-id',           // Unique kebab-case identifier
  name: 'Human-Readable Name',
  columns: [
    { id: 'columnId', header: 'Display Header' }
  ],
  dependencies: [],          // IDs of prerequisite modules
  description: 'What this module does'
};

export async function run(genus, species, priorResults) {
  // Return columnValues matching declared column IDs
  return {
    columnValues: {
      columnId: value
    }
  };
}
```

### Error Handling
- Return partial results rather than throwing errors
- Use try/catch blocks for API calls
- Log errors with context for debugging

### Caching
- Cache API responses locally in `cache/` directory
- Check cache before making external API calls
- Cache files should be JSON format

## Testing

- Test files are in `test/` directory
- Run individual tests with `node test/<test-file>.js`
- Tests for synthesis modules go in `test/synthesis/`
- External integration tests go in `test/external/`

## Configuration

- Main configuration: `config/config.json`
- Each synthesis module can have its own config file in `config/`
- Google Drive folder names and file prefixes are configurable, not hardcoded

## Key Files

- `src/output/plant-pipeline.js` - Core pipeline with shared functions
- `src/output/process-plant.js` - Single plant processing CLI
- `src/output/batch-process-plants.js` - Batch plant processing CLI
- `config/synthesis-registry.json` - Registered synthesis modules

## Adding New Features

### New Synthesis Module
1. Create module in `src/synthesis/` following the interface
2. Add config file to `config/` if needed
3. Register in `config/synthesis-registry.json`
4. Add tests to `test/synthesis/`

### New Data Column
1. Add column descriptor to synthesis module metadata
2. Return value in `columnValues` object
3. Pipeline automatically picks up new columns

## Important Notes

- This project is currently designed to run in Replit
- Google Drive authentication uses Replit connectors (not portable without modifications)
- Claude API and SerpApi work in any environment with proper API keys set
- Cache files in `cache/` are included in the repository to minimize API usage
