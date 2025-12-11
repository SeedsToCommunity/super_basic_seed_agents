# Synthesis Module Processing Guide

This document describes how each synthesis module builds its output columns, including data sources used and high-level processing logic.

---

## Module Overview

The Seed and Species Aggregator uses **5 synthesis modules** that execute in dependency order:

| Module ID | Module Name | Dependencies | Critical Gate |
|-----------|-------------|--------------|---------------|
| `botanical-name` | Botanical Name Validator | None | ✅ Yes |
| `native-checker` | Native Status Checker | botanical-name | No |
| `external-reference-urls` | External Reference URL Discovery | botanical-name | No |
| `common-names` | Common Names | botanical-name | No |
| `previous-botanical` | Previous Botanical Names | botanical-name | No |

**Pipeline Behavior**: If `botanical-name` validation fails, no other modules execute.

---

## Google Spreadsheet Output Structure

The synthesis pipeline creates Google Sheets with the following column structure. Each module contributes one or more columns:

### Complete Column Layout (9 total columns)

| Column # | Column Header | Source Module | Data Type |
|----------|---------------|---------------|-----------|
| 1 | **Genus** | *(base column)* | String |
| 2 | **Species** | *(base column)* | String |
| 3 | **Family** | botanical-name | String |
| 4 | **Botanical Name Notes** | botanical-name | String |
| 5 | **SE MI Native** | native-checker | "Yes" or "No" |
| 6 | **Native Check Notes** | native-checker | String |
| 7 | **External Reference URLs** | external-reference-urls | JSON Object (stringified) |
| 8 | **Common Names** | common-names | String (comma-separated) |
| 9 | **Previously Known As** | previous-botanical | String (comma-separated) |

### Example Complete Spreadsheet Row

**Quercus alba (White Oak)**:

| Column | Value |
|--------|-------|
| Genus | `Quercus` |
| Species | `alba` |
| Family | `Fagaceae` |
| Botanical Name Notes | *(empty)* |
| SE MI Native | `Yes` |
| Native Check Notes | `Common native tree throughout the region` |
| External Reference URLs | `{"Go Botany":"https://gobotany.nativeplanttrust.org/species/quercus/alba/","Illinois Wildflowers":"https://www.illinoiswildflowers.info/trees/plants/wh_oak.htm","Lady Bird Johnson Wildflower Center":"https://www.wildflower.org/plants/result.php?id_plant=qual","Prairie Moon Nursery":"https://www.prairiemoon.com/quercus-alba-white-oak","USDA PLANTS":"https://plants.usda.gov/plant-profile/QUAL","Tropicos":"https://tropicos.org/...","Minnesota Wildflowers":"https://minnesotawildflowers.info/...","Google Images":"https://www.google.com/search?tbm=isch&q=Quercus%20alba"}` |
| Common Names | `White Oak, Eastern White Oak, Stave Oak, Ridge White Oak` |
| Previously Known As | `Quercus candida, Quercus nigrescens, Quercus ramosa, Quercus repanda, Quercus repanda` |

### Dynamic Column Generation

**Important**: The spreadsheet columns are **dynamically generated** from module metadata:

1. **Module Registration**: Each module declares its columns in `metadata.columns`
2. **Pipeline Aggregation**: Pipeline reads all enabled modules and builds column definitions
3. **Sheet Creation**: Google Sheets are created with headers matching module metadata
4. **Data Writing**: Each row is populated by flattening module `columnValues` in dependency order

**Adding New Modules**: When you add a new synthesis module, its columns automatically appear in the spreadsheet—no manual spreadsheet configuration needed!

---

## 1. Botanical Name Validator (`botanical-name`)

**Module ID**: `botanical-name`  
**Dependencies**: None (executes first)  
**Critical Gate**: ✅ YES - Pipeline stops if validation fails

### Data Sources
- **Primary**: Anthropic Claude API (`claude-sonnet-4-5`)
- **Model Configuration**: 1024 max tokens

### Output Columns
1. **Family** (`family`) - Taxonomic family name
2. **Botanical Name Notes** (`botanicalNameNotes`) - Validation errors or notes

### Google Spreadsheet Columns
This module populates **2 columns** in the output spreadsheet:

| Column Header | Example Value | Description |
|---------------|---------------|-------------|
| **Family** | `Fagaceae` | Taxonomic family classification |
| **Botanical Name Notes** | *(empty for valid names)* | Error messages or validation notes |

**Example Spreadsheet Row** (Quercus alba):
```
Family: Fagaceae
Botanical Name Notes: [empty]
```

### Processing Logic

#### Step 1: Claude API Validation
Sends botanical name to Claude with structured prompt requesting:
- Nomenclature status (current/updated/likely_misspelled/invalid)
- Family classification
- Current accepted name (if name is a synonym)
- Genus and species (normalized)

#### Step 2: Strict Validation
Enforces exact name matching:
- Status must be `"current"`
- Input genus must exactly match Claude's response (case-sensitive after normalization)
- Input species must exactly match Claude's response (lowercase)

**Normalization Rules**:
- Genus: First letter uppercase, rest lowercase
- Species: All lowercase

#### Step 3: Return Values

**Success Case** (status = `"current"` and exact match):
```javascript
{
  status: 'current',
  genus: 'Quercus',
  species: 'alba',
  columnValues: {
    family: 'Fagaceae',
    botanicalNameNotes: ''
  }
}
```

**Failure Cases**:

*Name is not current*:
```javascript
{
  status: 'updated',  // or 'likely_misspelled', 'invalid'
  columnValues: {
    family: 'Fagaceae',
    botanicalNameNotes: 'Name is not current (status: updated)'
  }
}
```

*Name mismatch* (capitalization/spelling):
```javascript
{
  status: 'mismatch',
  columnValues: {
    family: 'Fagaceae',
    botanicalNameNotes: 'Input "quercus alba" does not exactly match current name "Quercus alba"'
  }
}
```

### Why This Module is Critical
Only plants with status `"current"` proceed to downstream modules. This ensures:
- Data quality and consistency
- Valid names for external searches
- Reliable taxonomic classification

---

## 2. Native Status Checker (`native-checker`)

**Module ID**: `native-checker`  
**Dependencies**: `botanical-name` (requires valid name)  
**Critical Gate**: No

### Data Sources
- **Primary**: Anthropic Claude API (`claude-sonnet-4-5`)
- **Model Configuration**: 512 max tokens

### Output Columns
1. **SE MI Native** (`seMiNative`) - "Yes" or "No"
2. **Native Check Notes** (`nativeCheckNotes`) - Additional context

### Google Spreadsheet Columns
This module populates **2 columns** in the output spreadsheet:

| Column Header | Example Value | Description |
|---------------|---------------|-------------|
| **SE MI Native** | `Yes` or `No` | Native status for Southeast Michigan |
| **Native Check Notes** | `Common native tree throughout the region` | Additional context about native status |

**Example Spreadsheet Row** (Quercus alba):
```
SE MI Native: Yes
Native Check Notes: Common native tree throughout the region
```

### Processing Logic

#### Step 1: Regional Native Status Check
Sends validated botanical name to Claude with prompt specifying:
- **Target Region**: Southeast Michigan (Wayne, Oakland, Macomb, Washtenaw, Livingston counties)
- **Response Format**: JSON with `isNative` boolean and `status` field

#### Step 2: Claude Analysis
Claude determines native status based on:
- Species' natural historical range in Southeast Michigan
- Distinction between native vs. introduced/non-native species

#### Step 3: Format Output
Converts Claude's response to column values:
- `isNative: true` → `"Yes"`
- `isNative: false` → `"No"`
- Notes field populated from Claude's optional notes

### Example Output
```javascript
{
  columnValues: {
    seMiNative: 'Yes',
    nativeCheckNotes: 'Common native tree throughout the region'
  }
}
```

### Regional Context
**Coverage Area**:
- Southeast Michigan core counties
- Reflects species indigenous to Great Lakes region
- Excludes cultivated/introduced species

---

## 3. External Reference URL Discovery (`external-reference-urls`)

**Module ID**: `external-reference-urls`  
**Dependencies**: `botanical-name` (requires valid name for searches)  
**Critical Gate**: No

### Data Sources
- **Primary**: SerpApi (Google Search API)
- **Secondary**: Local JSON cache (`cache/external-reference-urls.json`)
- **Fallback**: Direct URL construction (Google Images)

### Output Columns
1. **External Reference URLs** (`externalReferenceUrls`) - Object/Record with site names as keys

### Google Spreadsheet Columns
This module populates **1 column** in the output spreadsheet:

| Column Header | Example Value | Description |
|---------------|---------------|-------------|
| **External Reference URLs** | `{"Go Botany":"https://...","USDA PLANTS":"https://..."}` | JSON object containing all discovered URLs |

**Example Spreadsheet Cell** (Quercus alba):
```json
{
  "Go Botany": "https://gobotany.nativeplanttrust.org/species/quercus/alba/",
  "Illinois Wildflowers": "https://www.illinoiswildflowers.info/trees/plants/wh_oak.htm",
  "Lady Bird Johnson Wildflower Center": "https://www.wildflower.org/plants/result.php?id_plant=qual",
  "Prairie Moon Nursery": "https://www.prairiemoon.com/quercus-alba-white-oak",
  "USDA PLANTS": "https://plants.usda.gov/plant-profile/QUAL",
  "Tropicos": "https://tropicos.org/...",
  "Minnesota Wildflowers": "https://minnesotawildflowers.info/...",
  "Google Images": "https://www.google.com/search?tbm=isch&q=Quercus%20alba"
}
```

**Note**: The URLs are stored as a JSON-stringified object in a single spreadsheet cell. Each reference website name becomes a key in the object, with the discovered URL as the value. Missing URLs are simply not included in the object.

### Targeted Reference Websites (8 search-based + 1 direct)
1. Michigan Flora
2. Go Botany
3. Illinois Wildflowers
4. Lady Bird Johnson Wildflower Center
5. Prairie Moon Nursery
6. USDA PLANTS
7. Tropicos
8. Minnesota Wildflowers
9. Google Images (direct URL, no search)

### Processing Logic

#### Step 1: Cache Lookup
- Normalize species key: `"Genus species"` (proper capitalization)
- Check if any URLs exist in cache for this species
- Identify which sites are missing from cache

#### Step 2: URL Discovery with Validation (v2.0)

**For Cached Sites**: Return immediately (no API call)

**For Missing Sites**:

*Search-Based Sites (requires SerpApi)*:
```javascript
searchQuery = `site:${domain} ${genus} ${species}`
// Example: "site:illinoiswildflowers.info Quercus alba"
// Request 5 results instead of 1
```

*Direct URL Sites (no API call)*:
```javascript
url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(genus + ' ' + species)}`
```

#### Step 3: URL Validation (New in v2.0)
For each SerpApi result (starting from top), validate that the page is about the correct species:

**Validation Checks (first pass wins)**:
1. **URL Path Check** (no fetch required):
   - Does URL contain genus AND species?
   - Checks variations: `/acer/rubrum/`, `acer-rubrum`, `acer_rubrum`

2. **Title Check** (requires page fetch):
   - Does `<title>` element contain genus AND species?
   - Example: `<title>Acer rubrum (red maple): Go Botany</title>` → ✓ PASS

3. **H1 Check** (uses same fetched page):
   - Does `<h1>` element contain genus AND species?
   - Example: `<h1>Acer rubrum</h1>` → ✓ PASS

4. **Schema.org Check** (uses same fetched page):
   - Does JSON-LD structured data have matching `scientificName`?
   - Looks for `@type: "Taxon"` with matching name

**Result**: First URL that passes any check is accepted. If all 5 results fail, no URL is cached for that site.

#### Step 4: Page Content Extraction (New in v2.0)
When a URL passes validation:
1. Use already-fetched HTML (if available) or fetch the page
2. Extract content using Mozilla's `@mozilla/readability` library
3. Cache to `cache/PageContent/Genus_species_source.json`

**Extracted Content**:
- `title`: Page title element
- `h1`: Main heading
- `schemaOrg`: Structured data (if present)
- `excerpt`: Brief summary from Readability
- `textContent`: Full readable text content

#### Step 5: Retry Logic
For each missing site:
- Start with 10ms delay
- Exponential backoff on errors: 10ms → 20ms → 40ms → 80ms → 160ms → 320ms → 640ms
- Stop at 1000ms max delay
- Handle rate limits (HTTP 429) with backoff

#### Step 6: Cache Update
If new URLs discovered:
- Save URL to `cache/ExternalReferences/genus_species_refURLs.json`
- Save page content to `cache/PageContent/Genus_species_source.json`
- Sort alphabetically (site names)

#### Step 7: Return Combined Results
Merge cached URLs + newly discovered URLs

### Example Output
```javascript
{
  columnValues: {
    externalReferenceUrls: {
      "Go Botany": "https://gobotany.nativeplanttrust.org/species/quercus/alba/",
      "Illinois Wildflowers": "https://www.illinoiswildflowers.info/trees/plants/wh_oak.htm",
      "USDA PLANTS": "https://plants.usda.gov/plant-profile/QUAL",
      "Google Images": "https://www.google.com/search?tbm=isch&q=Quercus%20alba"
      // ... (up to 9 sites)
    }
  }
}
```

### Cache Structure
```json
{
  "Quercus alba": {
    "Go Botany": "https://...",
    "Illinois Wildflowers": "https://..."
  },
  "Acer saccharum": {
    "Michigan Flora": "https://...",
    "USDA PLANTS": "https://..."
  }
}
```

### Error Handling
- Network failures → Site skipped, empty entry NOT cached
- No results found → Site marked as not found, not cached
- API key missing → Search-based sites skipped, direct URLs still work
- Rate limits → Exponential backoff retry

### Efficiency Strategy
- **Cache-first**: Minimizes API calls
- **Incremental discovery**: Only searches missing sites
- **Persistent cache**: Preserves results across runs
- **Empty result handling**: Allows retry on future runs

---

## 4. Common Names (`common-names`)

**Module ID**: `common-names`  
**Dependencies**: `botanical-name` (requires valid botanical name)  
**Critical Gate**: No

### Data Sources
- **Primary**: Anthropic Claude API (`claude-sonnet-4-5`)
- **Model Configuration**: 1024 max tokens

### Output Columns
1. **Common Names** (`commonNames`) - Comma-separated vernacular names

### Google Spreadsheet Columns
This module populates **1 column** in the output spreadsheet:

| Column Header | Example Value | Description |
|---------------|---------------|-------------|
| **Common Names** | `White Oak, Eastern White Oak, Stave Oak` | Comma-separated vernacular names |

**Example Spreadsheet Row** (Quercus alba):
```
Common Names: White Oak, Eastern White Oak, Stave Oak, Ridge White Oak
```

**Example Spreadsheet Row** (Acer saccharum):
```
Common Names: Sugar Maple, Hard Maple, Rock Maple, Sugar Tree
```

### Processing Logic

#### Step 1: Regional Common Name Discovery
Sends validated botanical name to Claude with prompt specifying:
- **Target Region**: Southeast Michigan and adjacent regions (Great Lakes area)
- **Geographic Scope**: SE Michigan, Ohio, Indiana, Illinois, Wisconsin, southern Ontario
- **Name Types**: Vernacular/colloquial names only

#### Step 2: Claude Analysis
Claude identifies all common names used in the target region, ordered by usage frequency.

**Inclusion Rules**:
- ✅ Widely used regional common names
- ✅ Regional variations
- ✅ Everyday vernacular names

**Exclusion Rules**:
- ❌ Botanical synonyms (former scientific names)
- ❌ Cultivar names
- ❌ Latin names or nomenclature
- ❌ Subspecies/variety names

#### Step 3: Format Output
Converts array of names to comma-separated string:
```javascript
["White Oak", "Eastern White Oak", "Stave Oak"]
→ "White Oak, Eastern White Oak, Stave Oak"
```

### Example Outputs

**Quercus alba**:
```
"White Oak, Eastern White Oak, Stave Oak, Ridge White Oak"
```

**Acer saccharum**:
```
"Sugar Maple, Hard Maple, Rock Maple, Sugar Tree"
```

**Eutrochium fistulosum**:
```
"hollow Joe-Pye weed, trumpetweed, trumpet weed, hollow-stemmed Joe-Pye weed, queen-of-the-meadow"
```

### Name Ordering
Names listed from most common → least common based on regional usage.

### Empty Results
If no common names exist or are in use:
```javascript
{
  columnValues: {
    commonNames: ''
  }
}
```

---

## 5. Previous Botanical Names (`previous-botanical`)

**Module ID**: `previous-botanical`  
**Dependencies**: `botanical-name` (requires valid name for GBIF lookup)  
**Critical Gate**: No

### Data Sources
- **Primary**: GBIF Species API (Global Biodiversity Information Facility)
- **Endpoints**:
  - `GET /species/match` - Species matching
  - `GET /species/{usageKey}/synonyms` - Synonym retrieval

### Output Columns
1. **Previously Known As** (`previouslyKnownAs`) - Comma-separated botanical synonyms

### Google Spreadsheet Columns
This module populates **1 column** in the output spreadsheet:

| Column Header | Example Value | Description |
|---------------|---------------|-------------|
| **Previously Known As** | `Acer saccharophorum, Acer palmifolium` | Comma-separated botanical synonyms |

**Example Spreadsheet Row** (Acer saccharum):
```
Previously Known As: Acer hispidum, Acer palmifolium, Acer saccharinum, Acer saccharophorum
```

**Example Spreadsheet Row** (Eutrochium fistulosum):
```
Previously Known As: Eupatoriadelphus fistulosus, Eupatorium fistulosum
```

**Example Spreadsheet Row** (species with no synonyms):
```
Previously Known As: [empty]
```

### Processing Logic

#### Step 1: Species Matching
Send genus + species to GBIF match endpoint:
```
GET https://api.gbif.org/v1/species/match?name=Genus+species&verbose=false
```

**Response Analysis**:
- Extract `usageKey` (unique taxon identifier)
- Verify `rank` = "SPECIES" (not genus, variety, or subspecies)
- Check `matchType` (EXACT preferred, FUZZY acceptable)

**Early Exit Conditions**:
- No match found → Return empty string
- Match rank is not SPECIES → Return empty string (e.g., HIGHERRANK = genus only)

#### Step 2: Synonym Retrieval
If species-level match found, retrieve synonyms:
```
GET https://api.gbif.org/v1/species/{usageKey}/synonyms
```

**Response Processing**:
- Filter to species-level synonyms only (`rank: "SPECIES"`)
- Exclude varieties (containing `var.`)
- Exclude subspecies (containing `subsp.`)
- Extract binomial names (genus + species epithet)

#### Step 3: Format Output
Convert synonym array to comma-separated string:
```javascript
[
  { canonicalName: "Acer saccharophorum", rank: "SPECIES" },
  { canonicalName: "Acer palmifolium", rank: "SPECIES" }
]
→ "Acer saccharophorum, Acer palmifolium"
```

### Example Outputs

**Acer saccharum** (4 synonyms):
```
"Acer hispidum, Acer palmifolium, Acer saccharinum, Acer saccharophorum"
```

**Quercus alba** (5 synonyms):
```
"Quercus candida, Quercus nigrescens, Quercus ramosa, Quercus repanda, Quercus repanda"
```

**Eutrochium fistulosum** (2 synonyms showing genus reclassification):
```
"Eupatoriadelphus fistulosus, Eupatorium fistulosum"
```

### Historical Context
Many species have been reclassified over time:
- **Genus changes**: Eupatorium → Eupatoriadelphus → Eutrochium
- **Epithet changes**: Different species names applied historically
- **Taxonomic revisions**: Modern DNA analysis causes reclassification

### Error Handling
**Module Philosophy**: Non-critical failures don't stop pipeline

**Error Cases**:
- GBIF API unreachable → Return empty string
- No match found → Return empty string
- Network timeout → Return empty string
- Invalid species → Return empty string

**Logging**: Errors logged to console but don't populate `botanicalNameNotes`

### Why This Data Matters
- **Literature searches**: Find papers using old nomenclature
- **Herbarium records**: Cross-reference historical specimens
- **Field guides**: Recognize outdated names in older publications
- **Taxonomic history**: Understand classification changes

---

## Processing Pipeline Flow

```
Input: Genus + Species
     ↓
┌────────────────────────────────────────┐
│  1. botanical-name (CRITICAL GATE)     │
│     Source: Claude API                 │
│     Validates name, gets family        │
│     ✓ Pass → Continue                  │
│     ✗ Fail → Stop (status ≠ current)   │
└────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────┐
│  2. native-checker                     │
│     Source: Claude API                 │
│     Determines SE Michigan nativity    │
└────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────┐
│  3. external-reference-urls            │
│     Source: SerpApi + Cache            │
│     Discovers 9 reference URLs         │
└────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────┐
│  4. common-names                       │
│     Source: Claude API                 │
│     Finds vernacular names             │
└────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────┐
│  5. previous-botanical                 │
│     Source: GBIF API                   │
│     Retrieves botanical synonyms       │
└────────────────────────────────────────┘
     ↓
Google Sheets Output
```

---

## Column Mapping Summary

| Module | Column ID | Column Header | Data Type |
|--------|-----------|---------------|-----------|
| botanical-name | `family` | Family | String |
| botanical-name | `botanicalNameNotes` | Botanical Name Notes | String |
| native-checker | `seMiNative` | SE MI Native | "Yes"/"No" |
| native-checker | `nativeCheckNotes` | Native Check Notes | String |
| external-reference-urls | `externalReferenceUrls` | External Reference URLs | JSON Object (stringified) |
| common-names | `commonNames` | Common Names | String (comma-separated) |
| previous-botanical | `previouslyKnownAs` | Previously Known As | String (comma-separated) |

**Total: 7 synthesis columns** (plus 2 base columns for Genus/Species = **9 columns total in spreadsheet**)

---

## Error Handling Philosophy

### Critical Module (botanical-name)
- **Validation failure** → Pipeline stops
- **Non-current names** → Documented in notes, pipeline stops
- **API errors** → Throw exception (halts processing)

### Non-Critical Modules
- **API failures** → Log error, return empty values, continue pipeline
- **No results found** → Return empty string, continue
- **Rate limits** → Retry with exponential backoff (external-reference-urls only)

**Rationale**: Maximize data collection even when some sources are unavailable.

---

## Data Quality Guarantees

1. **Botanical Name**: Always validated against current nomenclature (Claude expertise)
2. **Family**: From authoritative source (Claude botanical knowledge)
3. **Native Status**: Regional expert determination (Claude with SE Michigan context)
4. **External URLs**: Cached for consistency, discoverable via search
5. **Common Names**: Regional vernacular only (excludes botanical synonyms)
6. **Previous Names**: GBIF Backbone Taxonomy (authoritative global database)

---

*Last Updated: 2024*  
*Maintained by: Agent (auto-updated with code changes)*
