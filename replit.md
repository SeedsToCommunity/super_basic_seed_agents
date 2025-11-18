# Seed and Species Aggregator

## Overview
The Seed and Species Aggregator is a Node.js backend project designed for processing and validating botanical data. It leverages the Claude API for botanical validation and native status checking, and integrates with Google Sheets for structured data output. The project consists of backend CLI scripts focused on data processing workflows, with a primary goal of creating a scalable system for botanical data synthesis and validation. It aims to support a wide range of botanical data tasks, including name validation, native status determination, and external reference URL discovery, ultimately outputting comprehensive plant records.

## User Preferences
- Preferred communication style: Simple, everyday language
- Demands detailed, explicit task breakdowns before approval - values precision and transparency
- Prefers simple, focused scripts over over-engineered solutions

## System Architecture

### Dynamic Module Registry
The project utilizes a dynamic module registry architecture to enable easy integration of new synthesis modules without modifying core pipeline code. Modules are registered in `config/synthesis-registry.json`, export standardized `metadata` and a `run()` function, and are executed in dependency order. Column definitions for output are automatically generated from module metadata.

### Current Synthesis Modules
-   **`process-botanical-name.js`**: Validates botanical names using the Claude API, acting as a critical validation gate.
-   **`process-native-checker.js`**: Determines if a plant is native to a specified region (e.g., Southeast Michigan) using the Claude API, dependent on botanical name validation.
-   **`process-external-reference-urls.js`**: Discovers and caches URLs from various botanical reference websites and Google Images, based on the validated botanical name.

### Processing Pipeline (`src/output/plant-pipeline.js`)
This pipeline dynamically loads, validates, and executes enabled synthesis modules based on a dependency graph. It automatically builds output columns and provides core functions for:
-   `getPlantRecord(genus, species)`: Executes modules to gather a complete plant record.
-   `createPlantSheet(folderId, prefix)`: Creates timestamped Google Sheets with dynamic headers.
-   `appendPlantRows(spreadsheetId, plantRecords)`: Writes processed plant data to Google Sheets.
-   Google Drive folder discovery and caching.

Error handling includes stopping processing for critical failures and logging non-critical errors.

### CLI Tools
-   **`src/output/process-plant.js`**: Processes a single plant and outputs to an individual Google Sheet.
-   **`src/output/batch-process-plants.js`**: Processes multiple plants, skipping invalid botanical names, and outputs to a single Google Sheet.

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