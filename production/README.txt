================================================================================
PRODUCTION BATCH PROCESSING - README
================================================================================

This folder contains everything needed to run large-scale batch processing of
plant species through the 3-tier LLM synthesis pipeline.

--------------------------------------------------------------------------------
FILES IN THIS FOLDER
--------------------------------------------------------------------------------

batch-config.json
  Default configuration file. Contains:
  - sheetName: Name of the Google Sheet to create/update
  - speciesListFile: Path to the species list file to process

species-list-basic-4.txt (4 species)
  Quick test list with 4 species for validating the pipeline works.
  Use this for initial testing before running larger batches.

species-list-sweet-52.txt (52 species)
  Original "sweet" presentation list of 52 native species.

species-list-2026jan.txt (166 species)
  Combined list: sweet-52 merged with 114 additional species.
  Deduplicated and sorted alphabetically.

run-batch.js
  The main production batch processing script.

--------------------------------------------------------------------------------
HOW TO RUN
--------------------------------------------------------------------------------

OPTION 1: Use Config File (Default)
-----------------------------------
If batch-config.json is configured, simply run:

  node production/run-batch.js

The script reads sheetName and speciesListFile from the config.

OPTION 2: Command Line Arguments
--------------------------------
Override the config with explicit arguments:

  node production/run-batch.js "MySheetName" production/species-list-sweet-52.txt

Examples:
  node production/run-batch.js "PlantData_Test" production/species-list-basic-4.txt
  node production/run-batch.js "PlantData_Full" production/species-list-2026jan.txt

--------------------------------------------------------------------------------
WHAT THE SCRIPT DOES
--------------------------------------------------------------------------------

1. FINDS OR CREATES the Google Sheet in your configured output folder
2. CHECKS which species are already processed (reads columns A:B)
3. SKIPS species already in the sheet (safe to interrupt and resume)
4. PROCESSES remaining species through all 26 synthesis modules
5. APPENDS each species immediately after processing (incremental save)
6. ADDS "Processing Duration" as the final column (human-readable: Xh Xm Xs)

Resume Capability:
  If the script stops (crash, timeout, manual stop), just run it again.
  It will pick up where it left off, skipping already-processed species.

--------------------------------------------------------------------------------
WHY A RESERVED VM IS REQUIRED
--------------------------------------------------------------------------------

Processing 166 species with 26 LLM-powered fields takes several hours.
The development environment has limitations:

PROBLEM: Browser Connection Required
  In the development Shell, your browser must stay connected.
  If your device locks, loses focus, or disconnects, the script stops.

PROBLEM: Agent Timeout
  The AI agent has a 10-minute command timeout.
  Large batch runs cannot complete within this limit.

SOLUTION: Reserved VM Deployment
  A Reserved VM runs continuously on Replit's cloud infrastructure.
  - No browser connection required
  - No timeout limits
  - Script runs to completion even if you close everything
  - You can monitor progress via the Deployment logs panel

--------------------------------------------------------------------------------
HOW TO DEPLOY TO RESERVED VM
--------------------------------------------------------------------------------

1. Click the Deploy button (rocket icon) in the left panel
2. Select "Reserved VM"
3. Choose the smallest option (0.5 vCPU / 2GB RAM is sufficient)
   - This app is I/O bound (waiting on API calls), not CPU bound
   - Larger VMs provide no performance benefit
4. Configure:
   - Build command: npm install
   - Run command: node production/run-batch.js
5. Click Deploy

The script starts automatically. Monitor progress in Deployment > Logs.

--------------------------------------------------------------------------------
SWITCHING BETWEEN BATCH RUNS (WITHOUT REDEPLOYING)
--------------------------------------------------------------------------------

Redeploying destroys the cache (all cached API responses lost).
To preserve cache while running different batches:

1. Access the Reserved VM shell (via Deployment panel or SSH)
2. Run with command line arguments:

   node production/run-batch.js "NewSheetName" production/species-list-sweet-52.txt

This uses the existing deployment without losing cached data.

--------------------------------------------------------------------------------
COST CONSIDERATIONS
--------------------------------------------------------------------------------

Reserved VM: ~$7/month for smallest option
  - You can cancel after batch processing completes
  - Or keep running for future batch runs

API Costs:
  - Anthropic Claude API calls (26 fields x 3 tiers per species)
  - Most responses are cached after first run
  - Changing prompts invalidates cache (MD5 hash of prompt)

--------------------------------------------------------------------------------
OUTPUT
--------------------------------------------------------------------------------

Google Sheet: Created in your configured output folder
  - "Plant Data" tab: All species with 26+ columns of synthesized data
  - "Column Sources" tab: Documentation of each column's source and algorithm
  - "Processing Duration" column: Time taken for each species

Console Logs: Progress displayed during processing
  [1/166] Processing Achillea millefolium...
    Executed: module-name
    Saved [0h 2m 34s]

--------------------------------------------------------------------------------
TROUBLESHOOTING
--------------------------------------------------------------------------------

"Google Drive not connected"
  Ensure the Google Drive integration is set up and authorized.

"Folder not found"
  Check config/config.json for the correct outputFolder name.
  Create the folder in Google Drive if it doesn't exist.

Script stops mid-run
  Just run again. Resume capability will skip completed species.

Cache invalidated unexpectedly
  Prompt files changed (prompts/*.md) - this is expected behavior.
  Cache uses MD5 hash of the full prompt including all tier guidance.

================================================================================
