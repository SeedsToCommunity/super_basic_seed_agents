# Replit Batch Deployment Guide

This document explains how to set up and run the production batch processor on Replit, including scheduled deployments.

## Overview

The batch processor (`production/run-batch.js`) processes a list of plant species and outputs structured botanical data to a Google Sheet. It is designed to be:

- **Resumable**: If interrupted, it picks up where it left off
- **Incremental**: Appends results one species at a time to the sheet
- **Self-documenting**: Automatically creates "Column Sources" and "Prompts" tabs

---

## Files and Configuration

### Key Files

| File | Purpose |
|------|---------|
| `production/run-batch.js` | Main batch processor script |
| `production/batch-config.json` | Configuration (sheet name + species list) |
| `production/species-list-*.txt` | Species list files (one species per line) |
| `config/config.json` | Global config (Google Drive folder name, etc.) |

### batch-config.json

```json
{
  "sheetName": "PlantData_202501_round1",
  "speciesListFile": "production/species-list-basic-4.txt"
}
```

- **sheetName**: Name of the Google Sheet to create or append to
- **speciesListFile**: Path to the species list (relative to project root)

### Species List Format

Simple text file with one species per line (genus + species):

```
Geranium maculatum
Echinacea pallida
Eurybia macrophylla
Fragaria virginiana
```

---

## Running the Batch

### Option 1: Using batch-config.json (Recommended)

```bash
node production/run-batch.js
```

Reads settings from `production/batch-config.json`.

### Option 2: Command Line Arguments

```bash
node production/run-batch.js "MySheetName" production/species-list-sweet-52.txt
```

---

## How the Script Works

1. **Reads species list** from the configured file
2. **Finds or creates** the Google Sheet in your Google Drive output folder
3. **Checks existing species** already in the sheet (case-insensitive)
4. **Filters remaining species** to process only new ones
5. **For each species**:
   - Runs all enabled synthesis modules (26 fields)
   - Appends the row to the sheet immediately
   - Logs progress with processing duration
6. **On completion**: Keeps the process alive to prevent VM restart loops

### Resume Behavior

If the script is interrupted (timeout, error, manual stop):
- Run it again with the same settings
- It reads the existing sheet, skips processed species, and continues

**No duplicate rows will be created.**

---

## Caching Implications

### Development vs. Deployment

The `cache/` directory contains cached API responses, parsed PDFs, and other expensive-to-regenerate data:

| Cache Directory | Contents |
|----------------|----------|
| `cache/external_refs/` | SerpApi search results |
| `cache/gbif/` | GBIF species data |
| `cache/inaturalist/` | iNaturalist data |
| `cache/michigan_flora/` | Michigan Flora API results |
| `cache/page_content/` | Parsed web pages |
| `cache/tiered_prompt_cache/` | LLM prompt/response cache |
| `cache/drive_tier1_parsed/` | Synced Google Drive PDFs |

### Cache Files Are NOT Deployed

**Important**: When you deploy to a Scheduled machine, cache files are NOT transferred. The deployed machine starts with an empty cache.

**Implications**:
- First run on a fresh deployment will be slower (rebuilding caches)
- LLM calls cannot be short-circuited without cached sources
- Subsequent runs on the same VM will benefit from the cache

**Workarounds**:
- Run development batches first to populate caches, then deploy for production runs
- Accept slower first runs on deployed machines
- For large batches, use Replit Object Storage for persistent caches (requires code changes)

---

## Scheduled Deployments

Scheduled deployments run your batch script at a specific time on Replit's cloud infrastructure.

### Setting Up a Scheduled Deployment

1. Go to **Deployments** in the left Tool dock
2. Select **Scheduled**
3. Click **Set up your scheduled app**

### Configuration Fields

#### Build Command

The command that runs **once** when the deployment is created or updated. Used to install dependencies or compile code.

**Value**: Leave empty or use:
```
npm install
```

#### Run Command

The command that runs **each time** the schedule triggers.

**Value**:
```
node production/run-batch.js
```

#### Schedule Description (Cron Expression)

You can enter natural language OR a cron expression.

### Cron Expression Format

```
┌───────────── minute (0-59)
│ ┌─────────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌─────── month (1-12)
│ │ │ │ ┌───── day of week (0-6, 0=Sunday)
│ │ │ │ │
* * * * *
```

### Examples

#### Run Once: January 6th at 3 PM

```
0 15 6 1 *
```
- `0` = minute 0
- `15` = 3 PM (15:00 in 24-hour format)
- `6` = 6th day of the month
- `1` = January
- `*` = any day of week

**Note**: This will run every year on January 6th at 3 PM. To truly run once, disable or delete the deployment after it completes.

#### Run Each of the Next Three Days at 8 PM

If today is January 6th and you want to run January 6th, 7th, and 8th at 8 PM:

```
0 20 6-8 1 *
```
- `0` = minute 0
- `20` = 8 PM (20:00)
- `6-8` = days 6, 7, and 8
- `1` = January
- `*` = any day of week

**Alternative**: Create separate scheduled deployments with different dates:
- January 6th: `0 20 6 1 *`
- January 7th: `0 20 7 1 *`
- January 8th: `0 20 8 1 *`

#### Natural Language (Replit AI converts it)

Instead of cron, you can type:
- `"January 10th at 8 PM"`
- `"Every Monday at 10 AM"`
- `"Tomorrow at 2 AM"`

Replit's AI converts this to a cron expression automatically.

### Job Timeout

The maximum time the script can run before being terminated.

**Recommendations**:
- 4 species: 1,800 seconds (30 minutes)
- 52 species: 18,000 seconds (5 hours)
- 166 species: 36,000 seconds (10 hours)

Formula: ~3-5 minutes per species with empty cache, ~1-2 minutes with warm cache.

---

## When Does the VM Shut Down?

The scheduled deployment VM shuts down when:

1. **Script exits normally** (process.exit() or end of main function)
2. **Job timeout exceeded** - Replit terminates the process
3. **Uncaught exception** - If not handled, process crashes

### Stay-Alive Behavior

The batch script includes a "stay-alive" mechanism:

```javascript
runBatch(...).then(() => {
  console.log('[STAY-ALIVE] Batch complete. Keeping process alive...');
  setInterval(() => {}, 60000);  // Keep alive indefinitely
});
```

**Why?** If the script exits immediately after completing, and the cron schedule triggers again, it might start a new run. The stay-alive prevents this until you manually stop the deployment.

**To stop**: Go to Deployments → Scheduled → Stop or Delete the deployment.

---

## Build Command vs. Run Command

| | Build Command | Run Command |
|---|---------------|-------------|
| **When** | Once, when deployment is created/updated | Each time schedule triggers |
| **Purpose** | Install dependencies, compile | Execute your script |
| **Typical Value** | `npm install` or empty | `node production/run-batch.js` |
| **Runs in** | Build environment | Runtime environment |

### For This Project

- **Build Command**: `npm install` (or leave empty if dependencies are already installed)
- **Run Command**: `node production/run-batch.js`

---

## Recommended Workflow

1. **Test locally first**: Run on 4-species list to verify everything works
2. **Update batch-config.json**: Set the sheet name and species list for production
3. **Create Scheduled deployment**:
   - Build: `npm install`
   - Run: `node production/run-batch.js`
   - Schedule: Specific date/time (e.g., `0 15 6 1 *`)
   - Timeout: Generous buffer (e.g., 10 hours for 166 species)
4. **Monitor**: Check the deployment logs periodically
5. **After completion**: Stop/delete the scheduled deployment to prevent re-runs

---

## Troubleshooting

### "Google Drive not connected"

The Google Drive integration token may have expired. Re-authorize in the Replit integrations panel.

### "Cannot read sheet to check existing species"

Google Sheets API rate limiting. The script has retry logic, but if it fails after 3 attempts, check your API quotas.

### Script keeps restarting

If the script exits immediately, the scheduler might trigger again. The stay-alive mechanism prevents this, but ensure you're using the latest version of `run-batch.js`.

### Slow processing on deployed machine

Expected for first run—cache is empty. Subsequent runs on the same VM will be faster if the VM persists.
