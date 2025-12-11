import fs from 'fs';
import path from 'path';
import { readSpeciesParsedPdfs, refreshParsedPdfCache, getCacheStats } from './drive-pdf-sync.js';

const PAGE_CONTENT_DIR = 'cache/PageContent';

export function getSpeciesPageContent(genus, species) {
  const pattern = `${genus}_${species}_`;
  const results = [];
  
  if (!fs.existsSync(PAGE_CONTENT_DIR)) {
    return results;
  }
  
  const files = fs.readdirSync(PAGE_CONTENT_DIR);
  const matchingFiles = files.filter(name => name.startsWith(pattern) && name.endsWith('.json'));
  
  for (const fileName of matchingFiles) {
    const filePath = path.join(PAGE_CONTENT_DIR, fileName);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const sourceName = fileName
        .replace(pattern, '')
        .replace('.json', '')
        .replace(/_/g, ' ');
      
      results.push({
        source: content._meta?.source || sourceName,
        url: content._meta?.url || null,
        fetchedAt: content._meta?.fetchedAt || null,
        title: content.content?.title || null,
        textContent: content.content?.textContent || null,
        excerpt: content.content?.excerpt || null
      });
    } catch (err) {
      console.warn(`Failed to read page content ${filePath}: ${err.message}`);
    }
  }
  
  return results;
}

export async function collectSpeciesData(genus, species, options = {}) {
  const { syncDrive = true, verbose = false } = options;
  
  if (syncDrive) {
    const stats = getCacheStats();
    if (stats.fileCount === 0) {
      await refreshParsedPdfCache({ verbose });
    }
  }
  
  const parsedPdfs = readSpeciesParsedPdfs(genus, species);
  const pageContent = getSpeciesPageContent(genus, species);
  
  return {
    species: `${genus} ${species}`,
    genus,
    speciesEpithet: species,
    sources: {
      parsedPdfs: parsedPdfs.map(pdf => ({
        fileName: pdf.fileName,
        content: pdf.content
      })),
      pageContent: pageContent
    },
    summary: {
      parsedPdfCount: parsedPdfs.length,
      pageContentCount: pageContent.length,
      totalSources: parsedPdfs.length + pageContent.length
    }
  };
}

export function formatDataForClaude(speciesData) {
  const sections = [];
  
  sections.push(`SPECIES: ${speciesData.species}\n`);
  sections.push('=' .repeat(60));
  
  if (speciesData.sources.parsedPdfs.length > 0) {
    sections.push('\n## PARSED PDF SOURCES\n');
    
    for (const pdf of speciesData.sources.parsedPdfs) {
      sections.push(`### Source: ${pdf.fileName}`);
      sections.push('-'.repeat(40));
      
      if (typeof pdf.content === 'object') {
        sections.push(JSON.stringify(pdf.content, null, 2));
      } else {
        sections.push(String(pdf.content));
      }
      sections.push('\n');
    }
  }
  
  if (speciesData.sources.pageContent.length > 0) {
    sections.push('\n## WEB PAGE SOURCES\n');
    
    for (const page of speciesData.sources.pageContent) {
      sections.push(`### Source: ${page.source}`);
      if (page.url) {
        sections.push(`URL: ${page.url}`);
      }
      sections.push('-'.repeat(40));
      
      if (page.textContent) {
        const truncated = page.textContent.length > 8000 
          ? page.textContent.substring(0, 8000) + '\n[... content truncated ...]'
          : page.textContent;
        sections.push(truncated);
      } else if (page.excerpt) {
        sections.push(page.excerpt);
      }
      sections.push('\n');
    }
  }
  
  if (speciesData.summary.totalSources === 0) {
    sections.push('\n[NO DATA SOURCES AVAILABLE FOR THIS SPECIES]\n');
  }
  
  return sections.join('\n');
}

export async function getClaudePayload(genus, species, options = {}) {
  const speciesData = await collectSpeciesData(genus, species, options);
  const formattedData = formatDataForClaude(speciesData);
  
  return {
    speciesData,
    formattedText: formattedData,
    summary: speciesData.summary
  };
}
