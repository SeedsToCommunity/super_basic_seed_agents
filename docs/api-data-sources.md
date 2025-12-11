# API & Data Sources Reference

This document describes all external APIs and data sources that the Seed and Species Aggregator accesses.

---

## 1. Google Drive & Sheets API

### Purpose
- **Data Output**: Creates and manages Google Sheets for storing processed botanical data
- **File Management**: Organizes output sheets in designated Google Drive folders
- **Data Persistence**: Provides long-term storage for synthesis results

### Authentication
**Method**: Replit Google Drive Connector (OAuth via environment variables)

**Environment Variables**:
- `REPLIT_CONNECTORS_HOSTNAME` - Connector service hostname
- `REPL_IDENTITY` / `WEB_REPL_RENEWAL` - Authentication tokens

**How it Works**:
- Replit's connector system handles OAuth flow automatically
- Access tokens are obtained through Replit's secure token exchange
- No manual OAuth configuration required in Replit environment

### API Endpoints Used
- `sheets.spreadsheets.create()` - Creates new Google Sheets
- `sheets.spreadsheets.values.append()` - Appends row data to sheets
- `drive.files.list()` - Searches for output folder by name
- `drive.permissions.create()` - Sets sharing permissions on created sheets

### Usage in Codebase
**Files**: `src/output/plant-pipeline.js`, `src/output/process-plant.js`, `src/output/batch-process-plants.js`

**Key Functions**:
- `createPlantSheet(folderId, prefix)` - Creates timestamped Google Sheet
- `appendPlantRows(spreadsheetId, plantRecords)` - Writes plant data rows

### Portability Considerations
✅ **Works in Replit**: Fully integrated via connector  
❌ **Outside Replit**: Requires alternative authentication

**To run outside Replit**, you must:
- Switch to Google Service Account authentication (recommended for automation)
- OR implement OAuth 2.0 client credentials flow (for personal use)
- Update authentication code in `src/output/plant-pipeline.js`

---

## 2. Anthropic Claude API

### Purpose
- **Botanical Validation**: Verifies botanical names and checks nomenclature status
- **Taxonomic Classification**: Retrieves family classification for valid species
- **Native Status Checking**: Determines if species is native to Southeast Michigan
- **Common Name Discovery**: Identifies vernacular names used in regional flora

### Authentication
**Method**: API Key (via environment variable)

**Environment Variable**: `ANTHROPIC_API_KEY`

**Storage**: Replit Secrets (secure encrypted storage)

### Model Used
**Current Model**: `claude-sonnet-4-5`

**Configuration**:
- Botanical validation: 1024 max tokens
- Native status checking: 512 max tokens
- Common names discovery: 1024 max tokens

### API Endpoints Used
- `client.messages.create()` - Sends prompts and receives JSON-structured responses

### Usage in Codebase
**Files**:
- `src/synthesis/process-botanical-name.js`
- `src/synthesis/process-native-checker.js`
- `src/synthesis/process-common-names.js`

**Response Format**: JSON objects with structured botanical data

**Error Handling**:
- Strips markdown code block formatting if present
- Parses multi-block text responses
- Validates JSON structure before returning

### Portability Considerations
✅ **Works in any environment**: Just set `ANTHROPIC_API_KEY`  
✅ **Local development**: Export environment variable  
✅ **No Replit dependencies**: Pure API key authentication

### Rate Limits & Costs
- Usage based on prompt/completion tokens
- Token counts vary by synthesis module (512-1024 max tokens per request)
- See Anthropic pricing for current rates

---

## 3. SerpApi (Google Search API)

### Purpose
- **External Reference URL Discovery**: Finds plant species pages on botanical reference websites
- **Site-Specific Searches**: Uses `site:` operator to target specific domains
- **Result Caching**: Stores discovered URLs locally to minimize API usage

### Authentication
**Method**: API Key (via environment variable)

**Environment Variable**: `SERPAPI_API_KEY`

**Storage**: Replit Secrets (secure encrypted storage)

### Free Tier Details
- **Limit**: 100 searches/month (no credit card required)
- **Signup**: https://serpapi.com/users/sign_up
- **API Key Management**: https://serpapi.com/manage-api-key

### Search Parameters
**Standard Query Format**: `site:{domain} {genus} {species}`

**Example**: `site:illinoiswildflowers.info Quercus alba`

**Request Configuration**:
```javascript
{
  api_key: process.env.SERPAPI_API_KEY,
  q: searchQuery,
  num: 5  // Return top 5 results for validation
}
```

### URL Validation (New in v2.0)
SerpApi results are validated before caching to ensure pages are about the correct species:

**Validation Checks (in order, first pass wins)**:
1. **URL Path**: Does URL contain genus AND species? (e.g., `/acer/rubrum/`)
2. **Title Element**: Does `<title>` contain genus AND species?
3. **H1 Heading**: Does `<h1>` contain genus AND species?
4. **Schema.org**: Does JSON-LD have matching `scientificName`?

**Process**:
- Request 5 results from SerpApi
- Check each result starting from top
- Accept first URL that passes any validation check
- Skip URLs that fail all checks (may be about related but wrong species)

### Targeted Websites
The module searches 8 botanical reference websites:
1. Michigan Flora (`michiganflora.net`)
2. Go Botany (`gobotany.nativeplanttrust.org`)
3. Illinois Wildflowers (`illinoiswildflowers.info`)
4. Lady Bird Johnson Wildflower Center (`wildflower.org`)
5. Prairie Moon Nursery (`prairiemoon.com`)
6. USDA PLANTS (`plants.usda.gov`)
7. Tropicos (`tropicos.org`)
8. Minnesota Wildflowers (`minnesotawildflowers.info`)

**Plus**:
- Google Images (direct URL construction, no API call required)

### Caching Strategy

#### URL Cache
**Cache Location**: `cache/ExternalReferences/` (per-species JSON files)

**File Naming**: `genus_species_refURLs.json`

**Cache Structure**:
```json
{
  "_meta": {
    "genus": "Acer",
    "species": "rubrum",
    "cachedAt": "2025-12-11T..."
  },
  "urls": {
    "Go Botany": "https://gobotany.nativeplanttrust.org/species/acer/rubrum/",
    "Illinois Wildflowers": "https://www.illinoiswildflowers.info/trees/plants/red_maple.html"
  }
}
```

#### Raw HTML Cache (New in v2.0)
**Cache Location**: `cache/RawHTML/` (URL-based, MD5 hash filenames)

**File Naming**: `{md5-hash-of-url}.json`

**Purpose**: Caches ALL fetched HTML to avoid re-fetching, even for pages that fail species validation

**Cache Structure**:
```json
{
  "url": "https://www.illinoiswildflowers.info/trees/plants/red_maple.html",
  "fetchedAt": "2025-12-11T...",
  "html": "<html>...</html>"
}
```

**Behavior**: Every successful HTTP response is cached immediately after fetch, regardless of whether the page passes species validation. This ensures we never re-fetch the same URL.

#### Page Content Cache (New in v2.0)
**Cache Location**: `cache/PageContent/` (per-species per-source JSON files)

**File Naming**: `Genus_species_source.json` (e.g., `Acer_rubrum_go_botany.json`)

**Purpose**: Stores parsed page content for validated URLs for future data extraction

**Cache Structure**:
```json
{
  "_meta": {
    "genus": "Acer",
    "species": "rubrum",
    "source": "Go Botany",
    "url": "https://gobotany.nativeplanttrust.org/species/acer/rubrum/",
    "fetchedAt": "2025-12-11T...",
    "validatedBy": "url_path"
  },
  "content": {
    "title": "Acer rubrum (red maple): Go Botany",
    "h1": "Acer rubrum",
    "schemaOrg": null,
    "excerpt": "Red maple is a deciduous tree...",
    "textContent": "Full readable text extracted by Mozilla Readability..."
  }
}
```

**Content Extraction**: Uses Mozilla's `@mozilla/readability` library (same algorithm as Firefox Reader View) to extract main page content, stripping navigation, ads, and boilerplate.

**Behavior**:
- Cache hit: Returns all URLs immediately (no API calls)
- Partial cache: Only searches missing sites
- Cache miss: Searches all configured sites
- Empty results NOT cached (allows retry on next run)
- Page content cached after URL validation passes

### Retry & Rate Limiting
**Exponential Backoff**:
- Start delay: 10ms
- Max delay: 1000ms
- Doubles on rate limit errors (429)
- Maximum attempts until max delay exceeded

### Usage in Codebase
**Files**: `src/synthesis/process-external-reference-urls.js`

**Key Functions**:
- `discoverAllUrls(genus, species)` - Main discovery function with caching
- `searchWithRetry(searchQuery, site)` - Retry logic for individual sites
- `normalizeSpeciesKey(genus, species)` - Ensures consistent cache keys

### Portability Considerations
✅ **Works in any environment**: Just set `SERPAPI_API_KEY`  
✅ **Local development**: Export environment variable  
✅ **Cache persists**: Results stored in JSON file (portable across systems)  
✅ **Graceful degradation**: Works without API key (direct URLs still generated)

---

## 4. GBIF Species API

### Purpose
- **Botanical Synonym Retrieval**: Finds historical scientific names for species
- **Taxonomic Matching**: Resolves species names to GBIF Backbone Taxonomy
- **Cross-Reference Support**: Provides "previously known as" names for literature searches

### Authentication
**Method**: None required (public API)

**Base URL**: `https://api.gbif.org/v1/species`

### API Endpoints Used

#### 1. Species Match
**Endpoint**: `GET /species/match`

**Purpose**: Matches botanical name to GBIF taxonomy database

**Parameters**:
```javascript
{
  name: "Genus species",  // Full binomial name
  verbose: false           // Compact response
}
```

**Response Fields Used**:
- `usageKey` - Unique identifier for this taxon
- `scientificName` - Accepted scientific name
- `canonicalName` - Name without author citation
- `rank` - Taxonomic rank (SPECIES, GENUS, etc.)
- `matchType` - Match confidence (EXACT, FUZZY, HIGHERRANK)
- `status` - Nomenclatural status (ACCEPTED, SYNONYM, etc.)

#### 2. Name Usage Synonyms
**Endpoint**: `GET /species/{usageKey}/synonyms`

**Purpose**: Retrieves all synonyms for a given taxon

**Response**: Array of synonym objects with:
- `key` - Synonym usage key
- `scientificName` - Full synonym with author
- `canonicalName` - Synonym without author
- `rank` - Taxonomic rank

### Data Processing Rules

**Species-Level Filtering**:
- Only includes synonyms with rank = "SPECIES"
- Excludes varieties (`var.`) and subspecies (`subsp.`)
- Returns binomial names only (genus + species epithet)

**Output Format**: Comma-separated binomial names  
**Example**: `"Eupatorium fistulosum, Eupatoriadelphus fistulosus"`

### Caching Strategy
**Cache Location**: `cache/GBIF/` (folder with individual files per species)

**File Naming**: `Genus_species_gbif.json`  
**Examples**:
- `Acer_saccharum_gbif.json`
- `Quercus_alba_gbif.json`
- `Eutrochium_fistulosum_gbif.json`

**Cache Structure** (pretty-printed JSON for human readability):
```json
{
  "genus": "Acer",
  "species": "saccharum",
  "matched": true,
  "usageKey": 3189859,
  "acceptedName": "Acer saccharum Marshall",
  "synonyms": [
    {
      "scientificName": "Acer saccharophorum K.Koch & Fintelm.",
      "canonicalName": "Acer saccharophorum",
      "genus": "Acer",
      "species": "saccharophorum",
      "binomial": "Acer saccharophorum",
      "status": "PROPARTE_SYNONYM",
      "publishedIn": "K. Koch & Fintelm. (1859). In: Wochenschr. 349."
    }
  ],
  "cachedAt": "2025-11-27T18:24:17.105Z"
}
```

**Behavior**:
- Cache hit: Returns all synonyms immediately (no API calls)
- Cache miss: Fetches from GBIF API and saves to cache file
- Failed matches: Cached as empty results to avoid repeated failed lookups
- JSON is pretty-printed with 2-space indentation for human browsing

**Benefits**:
- ✅ Human-readable cache files (easy to inspect per-species data)
- ✅ Git-friendly (individual file changes show up cleanly)
- ✅ Memory efficient (only load species data when needed)
- ✅ Scales to hundreds of species without performance degradation

### Usage in Codebase
**Files**:
- `src/utils/gbif-client.js` - API client utility
- `src/synthesis/process-previous-botanical.js` - Synthesis module
- `test/gbif-integration.test.js` - Integration tests

**Key Functions**:
- `matchSpecies(genus, species)` - Matches botanical name to GBIF
- `getSynonyms(usageKey)` - Retrieves species-level synonyms
- `getTaxonDetails(usageKey)` - Gets complete taxon information

### Error Handling
**Module Behavior**:
- Network errors → Returns empty string (maintains column contract)
- No match found → Returns empty string
- Higher-rank match (genus only) → Returns empty string
- Invalid species → Returns empty string

**Philosophy**: Non-critical failures don't stop pipeline processing

### Portability Considerations
✅ **Works anywhere**: Public API, no authentication  
✅ **No API key needed**: Free and open  
✅ **No rate limits**: (Be respectful of public infrastructure)  
✅ **Stable endpoints**: Long-term API stability from GBIF

### API Documentation
**Official Docs**: https://www.gbif.org/developer/species

---

## 5. Michigan Flora Online (Local CSV)

### Purpose
- **Ecological Data**: Provides coefficient of conservatism, wetness indicators, and native status for Michigan plants
- **Species Lookup**: Fast O(1) lookups by scientific name
- **Cross-Validation**: Independent source for native status verification

### Authentication
**Method**: None required (local CSV file)

**Data Location**: `cache/MichiganFlora/MichiganFloraSpeciesDatabase_Michigan_2024.csv`

### Data Source
**Origin**: Michigan Flora Online (michiganflora.net)  
**Year**: 2024  
**Records**: ~2,873 species  
**Provider**: Merjent

### Column Definitions

| Column | Field Name | Type | Description |
|--------|-----------|------|-------------|
| Scientific Name | `scientificName` | string | Full botanical binomial (e.g., "Acer saccharum") |
| Family | `family` | string | Taxonomic family (e.g., "Sapindaceae") |
| Acronym | `acronym` | string | Michigan Flora short code (e.g., "ACESAU") |
| Native? | `isNative` | boolean | true = native to Michigan, false = non-native |
| C | `coefficientC` | number | Coefficient of Conservatism (0-10 scale) |
| CW | `wetnessW` | number | Coefficient of Wetness (-5 to +5 scale) |
| Physiognomy | `physiognomy` | string | Plant growth form (forb, tree, shrub, grass, etc.) |
| Duration | `duration` | string | Life cycle (annual, perennial, biennial) |
| Common Name | `commonName` | string | Vernacular name(s), semicolon-separated if multiple |

### Ecological Indicator Scales

**Coefficient of Conservatism (C)** - Ecological fidelity indicator:
- **0**: Found in any habitat, highly tolerant of disturbance
- **1-3**: Low fidelity, tolerant of moderate disturbance
- **4-6**: Moderate fidelity, found in relatively stable habitats
- **7-9**: High fidelity, found in high-quality natural areas
- **10**: Found only in pristine, undisturbed natural communities

**Coefficient of Wetness (CW)** - Habitat moisture preference:
- **-5**: Obligate Wetland (OBL) - Almost always in wetlands
- **-4 to -3**: Facultative Wetland (FACW) - Usually in wetlands
- **-2 to -1**: Facultative (FAC) - Equally in wetland/upland
- **0**: Facultative (FAC) - No strong preference
- **+1 to +2**: Facultative Upland (FACU) - Usually in uplands
- **+3 to +5**: Obligate Upland (UPL) - Almost never in wetlands

### Dataset Statistics
From the 2024 Michigan Flora dataset:
- **Total Species**: 2,873
- **Native Species**: 1,810 (63%)
- **Non-native Species**: 1,063 (37%)
- **Native Mean C**: 6.5
- **Total Mean C**: 4.1

### Usage in Codebase
**Files**:
- `src/utils/michigan-flora-client.js` - Data client utility
- `test/test-michigan-flora-client.js` - Integration tests

**Key Functions**:
- `loadDataset()` - Loads and caches the full dataset (lazy, idempotent)
- `findByScientificName(name)` - Lookup by full scientific name
- `findByGenusSpecies(genus, species)` - Lookup by genus + species
- `isNative(genus, species)` - Quick native/non-native check
- `getCoefficient(genus, species)` - Get C value
- `getWetness(genus, species)` - Get W value
- `getCommonName(genus, species)` - Get common name(s)
- `getDatasetStats()` - Get summary statistics

### Caching Strategy
**In-Memory Cache**: Dataset loaded once on first access, then cached for O(1) lookups

**Lookup Keys**: Case-insensitive scientific names stored in Map for instant retrieval

**Behavior**:
- First call to any lookup function triggers full dataset load
- Subsequent calls return cached data instantly
- No external API calls - all data is local

### Notes on Scientific Names
Some entries contain taxonomic annotations:
- `"Acer nigrum; a. saccharum"` - Indicates taxonomic notes or synonymy
- These are parsed using the primary name (before semicolon) for lookups

### Portability Considerations
✅ **Works anywhere**: Local CSV file, no network required  
✅ **No API key needed**: Static data file  
✅ **Fast lookups**: O(1) after initial load  
✅ **Portable**: Copy CSV file to any environment

---

## 6. iNaturalist API

### Purpose
- **Wikipedia Excerpts**: Retrieves Wikipedia summaries for species descriptions
- **Taxonomic Data**: Gets taxonomy, conservation status, and observation counts
- **Phenology Data**: Provides observation histograms by month for Southeast Michigan
- **Common Names**: Retrieves preferred and alternative common names

### Authentication
**Method**: None required (public API)

**Rate Limits**: 60 requests per minute (be respectful of public infrastructure)

**Recommended**: Custom User-Agent header for identification

### API Base URL
```
https://api.inaturalist.org/v1
```

### Endpoints Used

#### Taxa Endpoint (`/taxa`)
Retrieves taxonomic information including Wikipedia excerpts.

**Search by Name**:
```
GET /taxa?q={scientific_name}&rank=species
```

**Get by ID**:
```
GET /taxa/{taxon_id}
```

**Response Fields Used**:
- `wikipedia_summary` - Wikipedia excerpt (HTML)
- `wikipedia_url` - Link to full Wikipedia article
- `preferred_common_name` - Primary common name
- `names` - Array of all common names by locale
- `conservation_status` - IUCN status if applicable
- `listed_taxa` - Establishment means by place
- `observations_count` - Global observation count
- `default_photo` - Representative photo URL

#### Histogram Endpoint (`/observations/histogram`)
Returns observation counts by time interval for phenology analysis.

```
GET /observations/histogram?taxon_id={id}&place_id={ids}&interval=month_of_year
```

**Response Format**:
```json
{
  "results": {
    "month_of_year": {
      "1": 5,    // January
      "2": 16,   // February
      ...
      "12": 9    // December
    }
  }
}
```

### Southeast Michigan Place IDs
The client uses iNaturalist Standard Places (from US Census TIGER data) for complete county boundaries:

| County | place_id |
|--------|----------|
| Washtenaw | 2649 |
| Livingston | 2609 |
| Oakland | 2350 |
| Wayne | 986 |
| Monroe | 2009 |
| Jackson | 2948 |
| Lenawee | 2608 |

These IDs cover the **entire official county boundary** as defined by US Census data.

### Usage in Codebase
**Files**:
- `src/utils/inaturalist-client.js` - API client utility
- `test/test-inaturalist-client.js` - Integration tests

**Key Functions**:
- `getTaxaData(genus, species)` - Get Wikipedia excerpt, taxonomy, conservation status
- `getHistogramData(genus, species)` - Get phenology data for SE Michigan
- `getFullSpeciesData(genus, species)` - Get both taxa and histogram data
- `getPlaceIds()` - Get SE Michigan county place_id configuration
- `clearSpeciesCache(genus, species)` - Remove cached data for a species
- `listCachedSpecies()` - List all cached species

### Caching Strategy
**File-Based Cache**: Separate JSON files per endpoint type in `cache/iNaturalist/`

**File Naming Convention**:
- Taxa: `Genus_species_inaturalist_taxa.json`
- Histogram: `Genus_species_inaturalist_histogram.json`

**Behavior**:
- First API call for a species caches the response
- Subsequent calls return cached data (configurable with `useCache` parameter)
- Cache includes not-found results to avoid repeated API calls
- Pretty-printed JSON for human readability

### Data Retrieved

**From Taxa Endpoint**:
| Field | Description |
|-------|-------------|
| `wikipediaSummary` | HTML excerpt from Wikipedia |
| `wikipediaUrl` | Link to full Wikipedia article |
| `preferredCommonName` | Primary English common name |
| `commonNames` | Array of all English common names |
| `conservationStatus` | IUCN status (authority, status, statusName) |
| `establishmentMeans` | Native/introduced status by place |
| `observationsCount` | Total iNaturalist observations |
| `defaultPhotoUrl` | Representative species photo |

**From Histogram Endpoint**:
| Field | Description |
|-------|-------------|
| `monthlyObservations` | Object with counts per month (1-12) |
| `totalObservations` | Sum of all observations in region |
| `peakMonth` | Month number with most observations |
| `peakMonthName` | Full name of peak month |

### Error Handling
**Module Behavior**:
- Species not found → Returns `found: false` with empty data
- Network errors → Throws error (caller handles)
- Rate limit exceeded → API returns error (respect 60 req/min)

### Portability Considerations
✅ **Works anywhere**: Public API, no authentication  
✅ **No API key needed**: Free and open  
⚠️ **Rate limits**: 60 requests/minute  
✅ **Stable endpoints**: Well-documented API

### API Documentation
**Official Docs**: https://api.inaturalist.org/v1/docs/  
**Recommended Practices**: https://www.inaturalist.org/pages/api+recommended+practices

---

## Summary Table

| API/Service | Auth Method | API Key Required | Portability | Primary Use |
|-------------|-------------|------------------|-------------|-------------|
| **Google Drive/Sheets** | Replit Connector | No (via connector) | ❌ Replit-specific | Sheet creation & output |
| **Anthropic Claude** | API Key | Yes (`ANTHROPIC_API_KEY`) | ✅ Universal | Botanical validation, native status |
| **SerpApi** | API Key | Yes (`SERPAPI_API_KEY`) | ✅ Universal | External reference URLs |
| **GBIF Species** | None | No | ✅ Universal | Botanical synonyms |
| **Michigan Flora** | None (local CSV) | No | ✅ Universal | Ecological data, C/W values |
| **iNaturalist** | None | No | ✅ Universal | Wikipedia excerpts, phenology |

---

## Environment Variable Setup

### Required Secrets (Replit)
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
SERPAPI_API_KEY=xxxxx
```

### Connector Variables (Automatic in Replit)
```bash
REPLIT_CONNECTORS_HOSTNAME=connector-service.replit.com
REPL_IDENTITY=xxxxx
WEB_REPL_RENEWAL=xxxxx
```

### Checking Configuration
All environment variables can be viewed in:
- **Replit**: Secrets tab in left sidebar
- **Local**: Environment variable settings for your OS

---

## Rate Limits & Usage Guidelines

### Claude API
- **Billing**: Token-based usage pricing
- **Limits**: Based on your Anthropic account tier
- **Best Practice**: Cache results when possible

### SerpApi
- **Free Tier**: 100 searches/month
- **Paid Tiers**: Available for higher volumes
- **Caching**: All results cached to minimize usage

### GBIF
- **Rate Limits**: None specified (public API)
- **Best Practice**: Be respectful, don't hammer endpoints
- **Caching**: All species data cached in `cache/GBIF/` to minimize API usage
- **Availability**: High uptime (production-grade infrastructure)

### Google Drive/Sheets
- **Quotas**: Per-user quotas apply
- **Limits**: 300 read requests per minute per user
- **Best Practice**: Batch operations when possible

### iNaturalist
- **Rate Limits**: 60 requests per minute
- **Best Practice**: Use User-Agent header for identification
- **Caching**: All results cached in `cache/iNaturalist/` to minimize API usage
- **Availability**: High uptime (public infrastructure)

---

*Last Updated: November 2025*
*Maintained by: Agent (auto-updated with code changes)*
