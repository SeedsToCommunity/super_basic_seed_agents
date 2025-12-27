import { refreshParsedPdfCache, getSpeciesParsedPdfPaths } from '../utils/drive-pdf-sync.js';

export const metadata = {
  id: 'lakecounty-cache',
  name: 'Lake County Cache',
  columns: [],  // Infrastructure module - no output columns
  dependencies: ['botanical-name'],
  description: 'Syncs Google Drive parsed PDF files to local cache for Lake County data. Infrastructure module that provides cached data for downstream modules (lakecounty-images, similar-species).'
};

export async function run(genus, species, priorResults) {
  // Add timeout to prevent Drive sync from hanging indefinitely
  // 90 seconds should be enough for 200+ JSON files
  const timeoutMs = 90000;
  try {
    await Promise.race([
      refreshParsedPdfCache({ force: false, verbose: false }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Drive sync timed out after 90s')), timeoutMs)
      )
    ]);
  } catch (err) {
    console.log(`  [lakecounty-cache] ${err.message} - using existing cache`);
  }
  
  const matchingFiles = getSpeciesParsedPdfPaths(genus, species);
  
  if (matchingFiles.length > 0) {
    console.log(`  Lake County cache: ${matchingFiles.length} file(s) for ${genus} ${species}`);
  }
  
  return {
    columnValues: {},
    cachedFileCount: matchingFiles.length
  };
}
