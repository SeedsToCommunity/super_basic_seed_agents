import { refreshParsedPdfCache, getSpeciesParsedPdfPaths } from '../utils/drive-pdf-sync.js';

export const metadata = {
  id: 'lakecounty-cache',
  name: 'Lake County Cache',
  columns: [],  // Infrastructure module - no output columns
  dependencies: ['botanical-name'],
  description: 'Syncs Google Drive parsed PDF files to local cache for Lake County data. Infrastructure module that provides cached data for downstream modules (lakecounty-images, similar-species).'
};

export async function run(genus, species, priorResults) {
  await refreshParsedPdfCache({ force: false, verbose: false });
  
  const matchingFiles = getSpeciesParsedPdfPaths(genus, species);
  
  if (matchingFiles.length > 0) {
    console.log(`  Lake County cache: ${matchingFiles.length} file(s) for ${genus} ${species}`);
  }
  
  return {
    columnValues: {},
    cachedFileCount: matchingFiles.length
  };
}
