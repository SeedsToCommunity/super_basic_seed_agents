import { checkMichiganNative } from "./src/synthesis/process-native-checker.js";

const testCases = [
  // Native SE Michigan herbaceous plants
  {
    name: "Native herbaceous plant - Tall Tickseed",
    genus: "Coreopsis",
    species: "tripteris",
    expectedNative: true,
  },
  {
    name: "Native herbaceous plant - Virginia Mountain Mint",
    genus: "Pycnanthemum",
    species: "virginianum",
    expectedNative: true,
  },
  
  // Non-native plant
  {
    name: "Non-native plant - Common Dandelion",
    genus: "Taraxacum",
    species: "officinale",
    expectedNative: false,
  },
];

async function runTests() {
  console.log("=".repeat(80));
  console.log("Michigan Native Plant Checker - Test Suite");
  console.log("=".repeat(80));
  console.log();

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i + 1}: ${testCase.name}`);
    console.log(`  Genus: ${testCase.genus}, Species: ${testCase.species}`);

    try {
      const result = await checkMichiganNative(testCase.genus, testCase.species);

      // Display the result
      console.log(`  Native to SE Michigan: ${result.isNative}`);
      console.log(`  Status: ${result.status}`);
      
      if (result.notes) {
        console.log(`  Notes: ${result.notes}`);
      }

      // Check if the result matches expected
      const passed = result.isNative === testCase.expectedNative;

      if (passed) {
        console.log("  ✓ PASSED");
        passCount++;
      } else {
        console.log("  ✗ FAILED");
        console.log(`    Expected isNative: ${testCase.expectedNative}`);
        console.log(`    Got isNative: ${result.isNative}`);
        failCount++;
      }
    } catch (error) {
      console.log("  ✗ ERROR");
      console.log(`    ${error.message}`);
      failCount++;
    }

    console.log();
  }

  // Print summary
  console.log("=".repeat(80));
  console.log("Test Summary");
  console.log("=".repeat(80));
  console.log(`Total: ${testCases.length}`);
  console.log(`Passed: ${passCount} (${((passCount / testCases.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failCount}`);
  console.log();

  if (passCount === testCases.length) {
    console.log("✓ All tests passed!");
  } else {
    console.log(`✗ ${failCount} test(s) failed`);
  }
}

runTests();
