/**
 * Michigan Flora Ecological Metrics Synthesis Module
 * 
 * Retrieves ecological data from:
 * 1. Michigan Flora Online dataset (local CSV cache) - C value, wetness, physiognomy, duration
 * 2. Michigan Flora REST API - native status, description text, record URL
 * 
 * Data Sources:
 * - CSV: MichiganFloraSpeciesDatabase_Michigan_2024.csv (~2,873 species)
 * - API: https://michiganflora.net/api/v1.0/ (real-time lookup with caching)
 * 
 * This module also:
 * - Appends the Michigan Flora record URL to External Reference URLs
 * - Creates a comprehensive JSON file for each species to upload to Google Drive
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findByGenusSpecies } from '../utils/michigan-flora-client.js';
import { 
  searchSpecies, 
  getSpeciesText, 
  getSynonyms, 
  getLocations,
  getRecordUrl,
  getCompleteSpeciesData 
} from '../utils/michigan-flora-api-client.js';
import { uploadJsonToDrive } from '../utils/drive-upload.js';

const DRIVE_SUBFOLDER = 'MichiganFloraData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_OUTPUT_DIR = path.join(__dirname, '../../cache/MichiganFlora/SpeciesData');

function ensureOutputDir() {
  if (!fs.existsSync(JSON_OUTPUT_DIR)) {
    fs.mkdirSync(JSON_OUTPUT_DIR, { recursive: true });
  }
}

function normalizeGenus(genus) {
  const trimmed = genus.trim();
  let normalized = trimmed.toLowerCase();
  
  for (let i = 0; i < normalized.length; i++) {
    if (/[a-z]/i.test(normalized[i])) {
      normalized = normalized.substring(0, i) + 
                   normalized[i].toUpperCase() + 
                   normalized.substring(i + 1);
      break;
    }
  }
  
  return normalized;
}

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9×-]/g, '_');
}

function getJsonOutputPath(genus, species) {
  const normalizedGenus = normalizeGenus(genus);
  const slugSpecies = slugify(species.trim().toLowerCase());
  return path.join(JSON_OUTPUT_DIR, `${normalizedGenus}_${slugSpecies}_miflora.json`);
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&plusmn;/g, '±')
    .replace(/\s+/g, ' ')
    .trim();
}

export const metadata = {
  id: 'michigan-flora',
  name: 'Michigan Flora Ecological Metrics',
  columns: [
    { 
      id: 'coefficientC', 
      header: 'Coefficient of Conservatism (C)',
      source: 'Michigan Flora CSV (2024)',
      algorithmDescription: 'Direct lookup from static CSV dataset (~2,873 species). C values range 0-10, indicating species tolerance to disturbance. Higher values = more conservative species restricted to undisturbed habitats. Falls back to REST API if CSV lookup fails.'
    },
    { 
      id: 'wetlandIndicatorW', 
      header: 'Coefficient of Wetness (CW)',
      source: 'Michigan Flora CSV (2024)',
      algorithmDescription: 'Direct lookup from static CSV dataset. W values range -5 (obligate wetland) to +5 (obligate upland). Falls back to REST API if CSV lookup fails.'
    },
    { 
      id: 'physiognomy', 
      header: 'Physiognomy',
      source: 'Michigan Flora CSV (2024)',
      algorithmDescription: 'Growth form classification from CSV dataset. Values include: Forb, Graminoid, Shrub, Tree, Vine, etc.'
    },
    { 
      id: 'duration', 
      header: 'Duration',
      source: 'Michigan Flora CSV (2024)',
      algorithmDescription: 'Life cycle from CSV dataset. Values: Annual, Biennial, Perennial, or combinations (e.g., "Annual/Biennial").'
    },
    { 
      id: 'nativeMIFlora', 
      header: 'Native-MIFlora',
      source: 'Michigan Flora REST API',
      algorithmDescription: 'Queries /api/v1.0/flora with scientific name, extracts "na" field from response. Returns "Native" (na=N) or "Non-native" (na=A). Uses file-based caching in cache/MichiganFlora/API/.'
    },
    { 
      id: 'miFloraDescription', 
      header: 'Michigan Flora Description',
      source: 'Michigan Flora REST API',
      algorithmDescription: 'Fetches /api/v1.0/spec_text/{plant_id} endpoint using plant_id from flora search. Strips HTML tags and returns plain text description. Caches responses per species.'
    },
    { 
      id: 'externalReferenceUrls', 
      header: 'External Reference URLs',
      source: 'Michigan Flora REST API (appended)',
      algorithmDescription: 'Clones URL object from external-reference-urls module and appends Michigan Flora record URL (e.g., https://michiganflora.net/species.aspx?id=2650). Also creates comprehensive JSON file and uploads to Google Drive MichiganFloraData/ folder.'
    }
  ],
  dependencies: ['botanical-name', 'external-reference-urls'],
  description: 'Retrieves ecological metrics from Michigan Flora: C value, wetness, growth form, life cycle, native status, and description. Appends record URL to External Reference URLs.'
};

/**
 * Module runner function for registry system
 * @param {string} genus - The genus name
 * @param {string} species - The species name
 * @param {Object} priorResults - Results from previously executed modules
 * @returns {Promise<Object>} Object with columnValues Record matching metadata.columns
 */
function cloneUrlsObject(priorUrls) {
  if (!priorUrls || typeof priorUrls !== 'object') {
    return {};
  }
  return { ...priorUrls };
}

export async function run(genus, species, priorResults) {
  try {
    console.log(`[process-michigan-flora] Processing ${genus} ${species}`);
    
    const priorUrlData = priorResults?.['external-reference-urls']?.columnValues?.externalReferenceUrls;
    const urlsObject = cloneUrlsObject(priorUrlData);
    
    const csvRecord = await findByGenusSpecies(genus, species);
    
    let coefficientC = '';
    let wetlandIndicatorW = '';
    let physiognomy = '';
    let duration = '';
    
    if (csvRecord) {
      console.log(`[process-michigan-flora] CSV: C=${csvRecord.coefficientC}, W=${csvRecord.wetnessW}`);
      coefficientC = csvRecord.coefficientC;
      wetlandIndicatorW = csvRecord.wetnessW;
      physiognomy = csvRecord.physiognomy || '';
      duration = csvRecord.duration || '';
    } else {
      console.log(`[process-michigan-flora] Not found in CSV dataset`);
    }
    
    const apiResult = await searchSpecies(genus, species);
    
    let nativeMIFlora = '';
    let miFloraDescription = '';
    let recordUrl = null;
    let plantId = null;
    let apiData = null;
    
    if (apiResult.found && apiResult.data) {
      apiData = apiResult.data;
      plantId = apiData.plant_id;
      recordUrl = getRecordUrl(plantId);
      
      if (apiData.na === 'N') {
        nativeMIFlora = 'Native';
      } else if (apiData.na === 'A') {
        nativeMIFlora = 'Non-native';
      } else {
        nativeMIFlora = apiData.na || '';
      }
      
      console.log(`[process-michigan-flora] API: native=${nativeMIFlora}, plant_id=${plantId}`);
      
      if (!csvRecord) {
        if (apiData.c && apiData.c !== '*') {
          coefficientC = apiData.c;
        }
        if (apiData.w !== undefined) {
          wetlandIndicatorW = apiData.w;
        }
        if (apiData.phys) {
          physiognomy = apiData.phys;
        }
      }
      
      const textResult = await getSpeciesText(plantId, genus, species);
      if (textResult?.text) {
        miFloraDescription = stripHtml(textResult.text);
      }
      
      const [synonymsResult, locationsResult] = await Promise.all([
        getSynonyms(plantId, genus, species),
        getLocations(plantId, genus, species)
      ]);
      
      ensureOutputDir();
      const jsonOutput = {
        _meta: {
          genus: normalizeGenus(genus),
          species: species.toLowerCase().trim(),
          source: 'Michigan Flora',
          recordUrl,
          plantId,
          fetchedAt: new Date().toISOString()
        },
        basicData: {
          scientificName: apiData.scientific_name,
          familyName: apiData.family_name,
          author: apiData.author,
          acronym: apiData.acronym,
          commonNames: apiData.common_name || []
        },
        ecologicalData: {
          coefficientC: apiData.c,
          wetnessCoefficient: apiData.w,
          wetnessIndicator: apiData.wet,
          physiognomy: apiData.phys,
          nativeStatus: apiData.na,
          stateStatus: apiData.st
        },
        description: textResult?.text ? stripHtml(textResult.text) : null,
        descriptionHtml: textResult?.text || null,
        synonyms: synonymsResult?.synonyms || [],
        counties: locationsResult?.counties || []
      };
      
      const jsonPath = getJsonOutputPath(genus, species);
      const jsonContent = JSON.stringify(jsonOutput, null, 2);
      fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
      console.log(`[process-michigan-flora] Wrote JSON: ${path.basename(jsonPath)}`);
      
      try {
        const fileName = path.basename(jsonPath);
        await uploadJsonToDrive(jsonContent, fileName, DRIVE_SUBFOLDER);
        console.log(`[process-michigan-flora] Uploaded to Drive: ${DRIVE_SUBFOLDER}/${fileName}`);
      } catch (uploadError) {
        console.warn(`[process-michigan-flora] Drive upload failed (non-fatal): ${uploadError.message}`);
      }
      
    } else {
      console.log(`[process-michigan-flora] Not found in API`);
    }
    
    if (recordUrl && !urlsObject['Michigan Flora']) {
      urlsObject['Michigan Flora'] = recordUrl;
    }
    
    return {
      columnValues: {
        coefficientC: String(coefficientC),
        wetlandIndicatorW: String(wetlandIndicatorW),
        physiognomy,
        duration,
        nativeMIFlora,
        miFloraDescription,
        externalReferenceUrls: urlsObject
      },
      miFloraJsonPath: plantId ? getJsonOutputPath(genus, species) : null
    };
    
  } catch (error) {
    console.error(`[process-michigan-flora] Error processing ${genus} ${species}:`, error.message);
    
    const priorUrlData = priorResults?.['external-reference-urls']?.columnValues?.externalReferenceUrls;
    const urlsObject = cloneUrlsObject(priorUrlData);
    
    return {
      columnValues: {
        coefficientC: '',
        wetlandIndicatorW: '',
        physiognomy: '',
        duration: '',
        nativeMIFlora: '',
        miFloraDescription: '',
        externalReferenceUrls: urlsObject
      }
    };
  }
}
