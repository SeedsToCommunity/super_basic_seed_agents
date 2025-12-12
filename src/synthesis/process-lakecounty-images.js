import { readSpeciesParsedPdfs } from '../utils/drive-pdf-sync.js';

export const metadata = {
  id: 'lakecounty-images',
  name: 'Lake County Images',
  columns: [
    { id: 'lakeCountyImages', header: 'Lake County Images' }
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
    
    if (content?.seedGroups && Array.isArray(content.seedGroups)) {
      for (const group of content.seedGroups) {
        if (group.images && Array.isArray(group.images)) {
          allImages.push(...group.images);
        }
      }
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
