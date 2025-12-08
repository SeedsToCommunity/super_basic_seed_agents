/**
 * Test batch processing with 4 SE Michigan native spring herbaceous plants
 * 
 * This script tests the batch-process-plants.js with a collection of
 * spring ephemerals that are native to Southeast Michigan.
 * 
 * Usage: node test-batch-process.js
 */

import { execSync } from 'child_process';

console.log('Testing batch plant processing with SE Michigan spring ephemerals');
console.log('='.repeat(80));
console.log();

const testPlants = [
  { genus: 'Trillium', species: 'grandiflorum'},
  { genus: 'Sanguinaria', species: 'canadensis'},
  { genus: 'Claytonia', species: 'virginica'},
  { genus: 'Geranium', species: 'maculatum'},
  { genus: 'Carex', species: 'pensylvanica'},
  { genus: 'Chelone', species: 'glabra'},
  { genus: 'Coreopsis', species: 'lanceolata'},
  { genus: 'Erythronium', species: 'americanum'}
];

console.log('Test plants:');
testPlants.forEach((plant, i) => {
  console.log(`  ${i + 1}. ${plant.genus} ${plant.species}`);
});
console.log();
console.log('='.repeat(80));
console.log();

// Build command
const args = testPlants.flatMap(p => [p.genus, p.species]).join(' ');
const command = `node src/output/batch-process-plants.js ${args}`;

console.log('Running batch processor...');
console.log();

try {
  const output = execSync(command, { 
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  
  console.log();
  console.log('✓ Batch processing test completed successfully!');
  
} catch (error) {
  console.error('✗ Batch processing test failed');
  console.error(error.message);
  process.exit(1);
}
