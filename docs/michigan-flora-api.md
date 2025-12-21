# Michigan Flora REST API Documentation

Michigan Flora (michiganflora.net) provides a REST API for accessing botanical data about plant species found in Michigan. This document provides complete reference for all discovered endpoints.

**Base URL:** `https://michiganflora.net/api/v1.0/`

**Authentication:** None required (public API)

**Note:** The website itself is a Vue.js SPA that requires JavaScript execution. Direct page fetching returns only the app shell. The REST API provides clean, structured JSON data.

---

## Endpoints

### 1. Species Search - `flora_search_sp`

Search for species by various criteria. Returns basic species data with ecological metrics.

**Endpoint:** `GET /api/v1.0/flora_search_sp`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `plant_id` | integer | Look up by plant ID (primary key) |
| `scientific_name` | string | Search by full scientific name (e.g., "Philadelphus inodorus") |
| `genus` | string | Filter by genus name |
| `species` | string | Filter by species epithet (use with genus) |
| `family` | string | Filter by family name |
| `exact_match_genus` | 0/1 | When 1, requires exact genus match |
| `n_results` | integer | Limit results; use 0 for unlimited |

**Response:** Array of species objects

```json
[
  {
    "plant_id": 2865,
    "scientific_name": "PHILADELPHUS INODORUS",
    "c": "*",
    "st": "NULL",
    "w": 5.0,
    "wet": "UPL",
    "phys": "Ad Shrub",
    "na": "A",
    "family_name": "Hydrangeaceae",
    "author": "L.",
    "acronym": "PHIINO",
    "common_name": ["MOCK-ORANGE"]
  }
]
```

**Field Descriptions:**
| Field | Description |
|-------|-------------|
| `plant_id` | Unique identifier for the species |
| `scientific_name` | Full binomial name (genus + species) |
| `c` | Coefficient of Conservatism (1-10, or "*" for non-native) |
| `st` | State status (T=Threatened, E=Endangered, SC=Special Concern, NULL=none) |
| `w` | Wetness coefficient (numeric -5 to 5) |
| `wet` | Wetness indicator (OBL, FACW, FAC, FACU, UPL) |
| `phys` | Physiognomy (life form: Nt P-Forb, Ad Shrub, etc.) |
| `na` | Native status: N=Native, A=Adventive (non-native) |
| `family_name` | Taxonomic family |
| `author` | Taxonomic authority |
| `acronym` | Standard botanical acronym |
| `common_name` | Array of common names |

**Native Status Interpretation:**
- `na: "N"` = Native to Michigan
- `na: "A"` = Adventive (non-native/introduced)
- `c: "*"` = Non-native species (C-value not applicable)

**Examples:**

```bash
# Search by scientific name (recommended for species lookup)
curl "https://michiganflora.net/api/v1.0/flora_search_sp?scientific_name=Trillium%20grandiflorum"

# Get all species in a genus
curl "https://michiganflora.net/api/v1.0/flora_search_sp?genus=Trillium&exact_match_genus=1&n_results=0"

# Get all species in a family
curl "https://michiganflora.net/api/v1.0/flora_search_sp?family=Trilliaceae&n_results=0"

# Look up by plant_id
curl "https://michiganflora.net/api/v1.0/flora_search_sp?plant_id=2732"
```

---

### 2. Species Text - `spec_text`

Get descriptive text/notes for a species.

**Endpoint:** `GET /api/v1.0/spec_text`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | plant_id (required) |

**Response:**
```json
{
  "text": "<p>Native to the southeastern US, but long cultivated beyond its native range...</p>"
}
```

**Notes:**
- Returns HTML-formatted text describing the species
- Contains ecological notes, distribution, and identification info
- May be empty for some species

---

### 3. Synonyms - `synonyms`

Get botanical synonyms for a species.

**Endpoint:** `GET /api/v1.0/synonyms`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | plant_id (required) |

**Response (with synonyms):**
```json
{
  "synonyms": [
    {
      "syn_species": "parthenium",
      "syn_genus": "Chrysanthemum",
      "syn_notes": "NULL",
      "synonym_id": 94
    }
  ]
}
```

**Response (no synonyms):**
```json
{
  "message": "No synonyms found"
}
```

---

### 4. County Locations - `locs_sp`

Get Michigan counties where the species has been documented.

**Endpoint:** `GET /api/v1.0/locs_sp`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | plant_id (required) |

**Response:**
```json
{
  "locations": ["Benzie", "Calhoun", "Washtenaw"]
}
```

---

### 5. Primary Image Info - `pimage_info`

Get the primary/representative image for a species.

**Endpoint:** `GET /api/v1.0/pimage_info`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | plant_id (required) |

**Response:**
```json
{
  "image_id": 16239,
  "image_name": "Philadelphus inodorus 0708E-.jpg",
  "plant_id": 2865,
  "caption": "",
  "photographer": "R. W. Smith"
}
```

---

### 6. All Images - `allimage_info`

Get all available images for a species.

**Endpoint:** `GET /api/v1.0/allimage_info`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | plant_id (required) |

**Response:**
```json
[
  {
    "image_id": 7142,
    "image_name": "Philadelphus inodorus June 2011.JPG",
    "plant_id": 2865,
    "caption": "flower",
    "photographer": "A. A. Reznicek"
  }
]
```

---

### 7. Genus List - `genus_list`

Get list of all genera, optionally filtered by family.

**Endpoint:** `GET /api/v1.0/genus_list`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `family` | string | Filter by family name (optional) |

**Response:**
```json
{
  "genera": ["Abelmoschus", "Abies", "Abutilon", "Acalypha", ...]
}
```

---

### 8. Family List - `family_list`

Get list of all plant families in the database.

**Endpoint:** `GET /api/v1.0/family_list`

**Response:**
```json
{
  "families": ["Acanthaceae", "Acoraceae", "Adoxaceae", ...]
}
```

---

### 9. Genus Text - `genus_text`

Get descriptive text and identification key for a genus.

**Endpoint:** `GET /api/v1.0/genus_text`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Genus name (required) |

**Response:**
```json
{
  "text": "<p>Fortunately, the trilliums as a group are familiar to most people...</p>"
}
```

**Notes:**
- Returns HTML with embedded Vue.js router-link components for species references
- Contains dichotomous keys and genus-level descriptions

---

### 10. Family Text - `family_text`

Get descriptive text for a family.

**Endpoint:** `GET /api/v1.0/family_text`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Family name (required) |

**Response:**
```json
{
  "text": "<p>Liliaceae here include only <i>Erythronium</i> and <i>Lilium</i>...</p>"
}
```

---

## URL Construction

To construct a direct link to a species page:

```
https://michiganflora.net/record/{plant_id}
```

Example: `https://michiganflora.net/record/2732` for Trillium grandiflorum

---

## Workflow: Genus + Species to Full Data

To get complete data for a species given genus and species epithet:

```javascript
// Step 1: Get plant_id from scientific name search
const searchUrl = `https://michiganflora.net/api/v1.0/flora_search_sp?scientific_name=${genus}%20${species}`;
const searchResult = await fetch(searchUrl).then(r => r.json());
const plantId = searchResult[0]?.plant_id;

// Step 2: Get additional data using plant_id
const specText = await fetch(`/api/v1.0/spec_text?id=${plantId}`).then(r => r.json());
const synonyms = await fetch(`/api/v1.0/synonyms?id=${plantId}`).then(r => r.json());
const locations = await fetch(`/api/v1.0/locs_sp?id=${plantId}`).then(r => r.json());

// Step 3: Construct record URL
const recordUrl = `https://michiganflora.net/record/${plantId}`;
```

---

## Data Quality Notes

1. **Scientific names** are returned in UPPERCASE
2. **Common names** are returned as arrays (species may have multiple common names)
3. **Native status** is reliably indicated by the `na` field (N vs A)
4. **C-values** of `*` indicate non-native species
5. **Wetness indicators** follow standard USFWS wetland indicator categories
6. **State status** codes: T=Threatened, E=Endangered, SC=Special Concern

---

## Rate Limiting

No explicit rate limiting has been observed, but respect reasonable usage:
- Cache responses locally
- Avoid rapid-fire requests
- Consider adding delays between batch requests

---

## Caching Strategy

For the Seed and Species Aggregator project, cache responses in:
- `cache/MichiganFlora/API/{Genus}_{species}_flora.json` - Main species search result
- `cache/MichiganFlora/API/{Genus}_{species}_text.json` - Species description text

This avoids redundant API calls and enables offline processing.
