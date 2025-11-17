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

## Usage

(To be implemented)
