import { readSpeciesParsedPdfs } from '../utils/drive-pdf-sync.js';

export const metadata = {
  id: 'lakecounty-images',
  name: 'Lake County Images',
  columns: [
    { 
      id: 'lakeCountyImages', 
      header: 'Lake County Images',
      source: 'Google Drive Parsed PDFs',
      algorithmDescription: 'Reads parsed PDF JSON files from cache/DriveParsedPdfs/ (synced from Google Drive SpeciesAppDataFiles_DoNotTouch/Parsed PDF Data/). Extracts species.images array from each matching file (excludes seedGroups images). Returns comma-separated list of unique image filenames.'
    }
  ],
  dependencies: ['lakecounty-cache'],
  description: 'Extracts image filenames from Lake County parsed PDF JSON files'
};

export async function run(genus, species, priorResults) {
  const parsedPdfs = readSpeciesParsedPdfs(genus, species);
  
  const allImages = [];
  
  for (const pdf of parsedPdfs) {
    const content = pdf.content;
    
    if (content?.species?.images && Array.isArray(content.species.images)) {
      allImages.push(...content.species.images);
    }
  }
  
  const uniqueImages = [...new Set(allImages)];
  
  if (uniqueImages.length > 0) {
    console.log(`  Lake County images: ${uniqueImages.length} image(s) for ${genus} ${species}`);
  }
  
  return {
    columnValues: {
      lakeCountyImages: uniqueImages.join(', ')
    }
  };
}
