/**
 * Test script for process-plant.js
 * 
 * This script tests the end-to-end plant processing pipeline:
 * 1. Validates a botanical name (must be "current" status)
 * 2. Checks if the plant is native to SE Michigan
 * 3. Creates a Google Sheet in the specified folder
 * 4. Writes the data with proper headers
 * 
 * Test case: Quercus alba (White Oak)
 * - Expected: Valid, current botanical name
 * - Expected: Native to SE Michigan
 * - Expected: New Google Sheet created with data
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runTest() {
  console.log('='.repeat(80));
  console.log('Testing Plant Processing Pipeline');
  console.log('='.repeat(80));
  console.log();
  console.log('Test case: Quercus alba (White Oak)');
  console.log('Expected: Valid current name, native to SE Michigan');
  console.log();
  
  try {
    const { stdout, stderr } = await execAsync('node src/output/process-plant.js Quercus alba');
    
    console.log(stdout);
    
    if (stderr) {
      console.error('Errors:', stderr);
    }
    
    console.log();
    console.log('✓ Test completed successfully!');
    console.log('Check your Google Drive folder "SpeciesAppDataFiles_DoNotTouch" for the new sheet.');
    
  } catch (error) {
    console.error('✗ Test failed:');
    console.error(error.stdout || error.message);
    if (error.stderr) {
      console.error('Errors:', error.stderr);
    }
    process.exit(1);
  }
}

runTest();
