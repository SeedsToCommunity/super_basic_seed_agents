#!/usr/bin/env node
import { JSDOM } from 'jsdom';
import { fetchPage } from '../src/utils/page-content-client.js';

async function debugSelectors(url, selectors) {
  console.log(`\nFetching: ${url}`);
  const html = await fetchPage(url);
  if (!html) {
    console.log('Failed to fetch');
    return;
  }
  
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;
  
  console.log(`HTML length: ${html.length}`);
  console.log(`\nTesting selectors:`);
  
  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      console.log(`  "${sel}": ${elements.length} matches`);
      if (elements.length > 0) {
        const textLen = elements[0].textContent?.trim().length || 0;
        console.log(`    First element text length: ${textLen}`);
      }
    } catch (e) {
      console.log(`  "${sel}": ERROR - ${e.message}`);
    }
  }
  
  console.log('\n  Available structural elements:');
  console.log(`    h1: ${document.querySelectorAll('h1').length}`);
  console.log(`    h2: ${document.querySelectorAll('h2').length}`);
  console.log(`    h3: ${document.querySelectorAll('h3').length}`);
  console.log(`    main: ${document.querySelectorAll('main').length}`);
  console.log(`    article: ${document.querySelectorAll('article').length}`);
  console.log(`    #content: ${document.querySelectorAll('#content').length}`);
  console.log(`    .content: ${document.querySelectorAll('.content').length}`);
  console.log(`    table: ${document.querySelectorAll('table').length}`);
  console.log(`    body > div: ${document.querySelectorAll('body > div').length}`);
  
  // Check H4 headers for section titles
  const h4s = document.querySelectorAll('h4');
  if (h4s.length > 0) {
    console.log(`    h4 headers (${h4s.length}):`);
    for (const h4 of Array.from(h4s).slice(0, 5)) {
      console.log(`      - "${h4.textContent?.trim().substring(0, 40)}"`);
    }
  }
}

// Test wildflower.org selectors
await debugSelectors(
  'https://www.wildflower.org/plants/result.php?id_plant=ASTU',
  ['.plant-characteristics', '.bloom-information', '.distribution', '.growing-conditions', '.propagation', '.benefit', 'h4', 'h4 + *']
);

// Test minnesota selectors
await debugSelectors(
  'https://www.minnesotawildflowers.info/flower/wild-bergamot',
  ['main#main', '#main article', '.plant-description', '#main', '.page-content']
);
