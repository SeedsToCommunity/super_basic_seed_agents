# Seed and Species Aggregator

## Overview
The Seed and Species Aggregator is a Node.js backend project that processes and validates botanical data. Its primary goal is to create a scalable system for botanical data synthesis and validation, supporting tasks like name validation, native status determination, and external reference URL discovery. It leverages the Claude API for botanical validation and integrates with Google Sheets for structured data output, ultimately outputting comprehensive plant records.

## User Preferences
- Preferred communication style: Simple, everyday language
- Demands detailed, explicit task breakdowns before approval - values precision and transparency
- Prefers simple, focused scripts over over-engineered solutions

## System Architecture

### Plug-and-Play Module Registry
The project uses a dynamic, plug-and-play module registry architecture allowing new synthesis modules to be added with zero pipeline code changes. Modules declare type-safe columns with stable IDs, and the system handles runtime validation, generic row construction, and dependency resolution.

### Module Interface Contract
All synthesis modules must export a `metadata` object (containing `id`, `name`, `columns` with `id`, `header`, `source`, `algorithmDescription`, `dependencies`, and `description`) and a `run(genus, species, priorResults)` function that returns `columnValues`. The pipeline performs runtime validation to ensure output matches the declared contract.

### Processing Pipeline
The pipeline (`src/output/plant-pipeline.js`) dynamically loads, validates, and executes enabled modules based on their dependency graph. It provides functions for loading modules, validating and flattening column values, building dynamic column definitions and source documentation for Google Sheets, executing modules for a plant record, and creating/appending data to Google Sheets. A "Column Sources" tab is automatically generated in each spreadsheet, documenting data provenance. Error handling includes stopping on critical failures (e.g., botanical name validation) and logging non-critical module failures.

### Adding a New Module
New modules are added by creating a module file following the interface contract and adding a registry entry in `config/synthesis-registry.json`.

### CLI Tools
- `src/output/process-plant.js`: Processes a single plant.
- `src/output/batch-process-plants.js`: Processes multiple plants with an incremental save strategy to preserve partial progress.

### Data Processing Philosophy
The system employs a "validation-first" approach for data quality, supports configurable merge strategies, outputs synthesized data in JSON, and uses Anthropic Claude API for advanced tasks.

### Configuration
Centralized settings are managed in `config/config.json`, covering Google Drive, output preferences, synthesis parameters, and validation rules. Individual modules may have their own configuration files.

### Caching System
The `cache/` directory stores API results and parsed data to minimize expensive operations, including caches for external references, SerpApi results, raw HTML, parsed page content, GBIF data, Michigan Flora data, iNaturalist data, BONAP data, and synced Google Drive parsed PDFs.

## External Dependencies

### Third-Party Services
- **Google Drive API**: For data synchronization, sheet creation, and output.
- **Anthropic Claude API**: For AI-powered botanical validation, native status checking, and advanced data processing.
- **SerpApi**: For external reference URL discovery.
- **GBIF Species API**: For botanical synonyms and taxonomic information.
- **Michigan Flora**: Utilizes a local CSV dataset for ecological metrics and a REST API (https://michiganflora.net/api/v1.0/) for real-time lookups (native status, descriptions, synonyms, county occurrences).
- **iNaturalist API**: For Wikipedia excerpts, taxonomic data, and phenology (observation histograms).

### Key NPM Packages
- `@anthropic-ai/sdk`: Anthropic Claude API integration.
- `googleapis`: Google Drive and Sheets API integration.
- `serpapi`: SerpApi client.
- `@mozilla/readability`: Extracts main content from web pages.
- `jsdom`: DOM implementation for HTML parsing.