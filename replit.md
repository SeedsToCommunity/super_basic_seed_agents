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
- `production/run-batch.js`: Production batch processor (resumable, outputs to Google Sheets).
- `test/test-single-field.js`: Debug tool for testing individual 3-tier fields.

### Production Deployment
See `docs/replit-batch-deployment.md` for complete instructions on:
- Configuring `production/batch-config.json`
- Setting up Replit Scheduled deployments
- Cron expressions for one-time vs. recurring runs
- Build vs. Run command configuration
- Caching implications for deployed machines

### Data Processing Philosophy
The system employs a "validation-first" approach for data quality, supports configurable merge strategies, outputs synthesized data in JSON, and uses Anthropic Claude API for advanced tasks.

### Configuration
Centralized settings are managed in `config/config.json`, covering Google Drive, output preferences, synthesis parameters, and validation rules. Individual modules may have their own configuration files.

### Caching System
The `cache/` directory stores API results and parsed data to minimize expensive operations, including caches for external references, SerpApi results, raw HTML, parsed page content, GBIF data, Michigan Flora data, iNaturalist data, BONAP data, and synced Google Drive parsed PDFs.

### 3-Tier LLM Prompting System
The project implements a trust-aware 3-tier LLM prompting system for synthesizing botanical guidance across ~26 new columns:

**Source Tiers:**
- **Tier 1 (Trusted)**: Google Drive "Tier 1 Sources" folder, Michigan Flora (CSV + API), Lake County PDFs
- **Tier 2 (Secondary)**: All cached JSON artifacts (GBIF, iNaturalist, BONAP, External References, PageContent, Missouri Seedling Guide) + Tier 1 response for context
- **Tier 3 (Model Knowledge)**: Claude's general botanical knowledge + prior tier responses

**Core Files:**
- `src/synthesis/process-3tier-field.js`: Shared orchestration module with source gatherers and prompt builder
- `src/utils/drive-tier1-sync.js`: Syncs Google Drive "Tier 1 Sources" folder to local cache
- `src/utils/tiered-prompt-cache.js`: MD5-based prompt/response caching to avoid redundant API calls
- `prompts/`: Contains base prompt, tier-specific guidance, and field-specific prompts (e.g., `collection_mature_seed_color.md`)

**Module Pattern:** New 3-tier fields are added by:
1. Creating a field prompt file in `prompts/{field_id}.md`
2. Adding a registry entry in `config/synthesis-registry.json` with `exportName` pointing to the field module

**Output Format:** Each field produces a merged JSON with all 3 tier responses (value + attribution) for downstream display apps.

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